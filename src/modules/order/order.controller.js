import * as repo from "./order.repository.js";
import db from "../../config/db.js";
import { createOrderSchema } from "./order.schema.js";
import { NotFoundError, AppError } from "../../utils/errors.js";

// helper to compute estimated_ready_at: NOW() + avg_waiting_time (minutes) + items_count*2 minutes
function computeEstimatedReadyInterval(avg_waiting_time_minutes, items_count) {
    const extraPerItem = 2; // minutes per item (simple heuristic)
    const totalMin = (avg_waiting_time_minutes || 0) + (items_count * extraPerItem);
    return `${totalMin} minutes`;
}

// POST /orders
export async function createOrder(req, res, next) {
    const idempotencyKey = req.headers["x-idempotency-key"];
    try {
        const parsed = createOrderSchema.parse(req.body);

        // TODO: idempotency; if key provided, check
        // if (idempotencyKey) {
        //     const idemp = await repo.getIdempotency(idempotencyKey);
        //     if (idemp && idemp.order_id) {
        //         // return saved response (assume response stored)
        //         return res.status(200).json(idemp.response);
        //     }
        // }

        // validate branch exists and get avg_waiting_time + owner
        const branchInfo = await repo.getBranchInfo(parsed.branch_id);
        if (!branchInfo) throw new NotFoundError("Branch not found");

        // fetch menu_items info
        const ids = parsed.items.map(i => i.menu_item_id);
        const menuItems = await repo.getMenuItemsByIds(ids);
        if (menuItems.length !== ids.length) {
            throw new AppError("One or more menu items not found", 400, "validation");
        }

        // ensure availability
        const menuById = {}; // here store db menu items
        for (const mi of menuItems) menuById[mi.id] = mi;
        for (const it of parsed.items) { // here check if any of the asked is not in db items
            const mi = menuById[it.menu_item_id];
            if (!mi.available) throw new AppError(`Menu item ${mi.name} is not available`, 400, "validation");
        }

        // compute total and prepare items with price snapshot
        let total = 0;
        const itemsWithPrice = parsed.items.map(it => {
            const mi = menuById[it.menu_item_id];
            const unit_price = Number(mi.price);
            const sub = unit_price * it.quantity;
            total += sub;
            return { menu_item_id: it.menu_item_id, quantity: it.quantity, unit_price };
        });

        // compute estimated_ready_at interval
        const interval = computeEstimatedReadyInterval(branchInfo.avg_waiting_time ?? 0, parsed.items.length);

        // transaction: create order and items, set estimated_ready_at and accepted_at (automatic)
        await db.query("BEGIN");

        // TODO: make repo method
        // create order with estimated_ready_at calculated via SQL expression (NOW() + interval 'X minutes')
        const insertOrderQuery = `
      INSERT INTO orders (customer_id, branch_id, delivery_address, estimated_ready_at, total, status, accepted_at, created_at)
      VALUES ($1, $2, $3, NOW() + ($4)::interval, $5, $6, NOW(), NOW())
      RETURNING id, customer_id, branch_id, delivery_address, estimated_ready_at, total, status, accepted_at, created_at
    `;
        const { rows: orderRows } = await db.query(insertOrderQuery, [
            req.user.user_id,
            parsed.branch_id,
            parsed.delivery_address,
            interval, // e.g. '25 minutes'
            total,
            'preparing' // automatic acceptance => preparing
        ]);
        const order = orderRows[0];

        // create items
        const createdItems = await repo.createOrderItems(order.id, itemsWithPrice);

        // optional: save idempotency
        // if (idempotencyKey) {
        //     const responseBody = { order, items: createdItems };
        //     await repo.saveIdempotency(idempotencyKey, null, order.id, responseBody);
        // }

        await db.query("COMMIT");

        res.status(201).json({ order, items: createdItems });
    } catch (err) {
        await db.query("ROLLBACK").catch(() => { });
        next(err);
    }
}

// GET /orders/:id
export async function getOrder(req, res, next) {
    try {
        const { id } = req.params;
        const data = await repo.getOrderById(id);
        if (!data) throw new NotFoundError("Order not found");

        // authorization: customer can see own, restaurant_owner (owner of branch) or admin can see all
        const order = data.order;
        if (req.user.role === "customer" && req.user.user_id !== order.customer_id) {
            throw new AppError("Forbidden", 403, "authorization");
        }
        if (req.user.role === "restaurant_owner") {
            // check owner
            const branchInfo = await repo.getBranchInfo(order.branch_id);
            if (!branchInfo) throw new NotFoundError("The order branch is not available.");
            if (branchInfo.owner_id !== req.user.user_id) throw new AppError("Forbidden", 403, "authorization");
        }

        res.json(data);
    } catch (err) {
        next(err);
    }
}

// GET /orders?customer_id=&branch_id=
export async function listOrders(req, res, next) {
    try {
        const filters = {
            customer_id: req.query.customer_id ? Number(req.query.customer_id) : undefined,
            branch_id: req.query.branch_id ? Number(req.query.branch_id) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : 50,
            offset: req.query.offset ? Number(req.query.offset) : 0
        };

        // if not admin, restrict: customer can only list own, restaurant_owner can only list own branch
        if (req.user.role === "customer") {
            filters.customer_id = req.user.user_id;
        } else if (req.user.role === "restaurant_owner") {
            // if branch_id provided, ensure ownership
            if (filters.branch_id) {
                const branchInfo = await repo.getBranchInfo(filters.branch_id);
                if (!branchInfo) throw new NotFoundError("Branch not found");
                if (branchInfo.owner_id !== req.user.user_id) throw new AppError("Forbidden", 403, "authorization");
            } else {
                // not providing branch_id: optional - for simplicity, don't allow listing all branches of owner here
                throw new AppError("Must provide a branch id to look for its orders");
            }
        }

        const rows = await repo.listOrders(filters);
        res.json(rows);
    } catch (err) {
        next(err);
    }
}

/* State transitions helpers:
   For each PATCH we check ownership and valid current state, then set status and timestamp.
*/

async function changeStatusIfAllowed({ order_id, actor, allowedRoles, fromStatuses, toStatus, timestampColumn }) {
    // fetch order
    const { order } = await repo.getOrderById(order_id) || {};
    if (!order) throw new NotFoundError("Order not found");

    // authorization
    if (actor.role === "customer") {
        // only certain actions allowed for customer (cancel)
        // handled by controllers
    } else if (actor.role === "restaurant_owner") {
        const branchInfo = await repo.getBranchInfo(order.branch_id);
        if (!branchInfo) throw new NotFoundError("Branch not found");
        if (branchInfo.owner_id !== actor.user_id) throw new AppError("Forbidden", 403, "authorization");
    }

    if (fromStatuses && !fromStatuses.includes(order.status)) {
        throw new AppError(`Invalid transition from ${order.status} to ${toStatus}`, 400, "state");
    }

    const fields = { status: toStatus };
    if (timestampColumn) fields[timestampColumn] = new Date().toISOString();

    const updated = await repo.updateOrderTimestampsAndStatus(order_id, fields);
    return updated;
}

// PATCH /orders/:id/accept  (we still provide it; will set accepted_at & status preparing)
export async function acceptOrder(req, res, next) {
    try {
        const { id } = req.params;
        // only branch owner or admin can accept; but creation auto-accepts so usually not needed
        const updated = await changeStatusIfAllowed({
            order_id: id,
            actor: req.user,
            allowedRoles: ["restaurant_owner", "admin"],
            fromStatuses: ["pending"],
            toStatus: "preparing",
            timestampColumn: "accepted_at"
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

// PATCH /orders/:id/prepared
export async function markPrepared(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await changeStatusIfAllowed({
            order_id: id,
            actor: req.user,
            fromStatuses: ["preparing"],
            toStatus: "on_the_way", // assume prepared triggers sent to deliver; alternatively separate step
            timestampColumn: "prepared_at"
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

// PATCH /orders/:id/sent
export async function markSent(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await changeStatusIfAllowed({
            order_id: id,
            actor: req.user,
            fromStatuses: ["preparing", "on_the_way"],
            toStatus: "on_the_way",
            timestampColumn: "sent_at"
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

// PATCH /orders/:id/delivered
export async function markDelivered(req, res, next) {
    try {
        const { id } = req.params;
        const updated = await changeStatusIfAllowed({
            order_id: id,
            actor: req.user,
            fromStatuses: ["on_the_way"],
            toStatus: "delivered",
            timestampColumn: "delivered_at"
        });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

// PATCH /orders/:id/paid
export async function markPaid(req, res, next) {
    try {
        const { id } = req.params;
        // only branch owner marks paid (since payments are cash)
        const updated = await changeStatusIfAllowed({
            order_id: id,
            actor: req.user,
            fromStatuses: ["delivered"],
            toStatus: "delivered", // status stays delivered, but we set paid_at and paid=true
            timestampColumn: "paid_at"
        });
        // also set paid boolean
        await repo.updateOrderTimestampsAndStatus(id, { paid: true, paid_at: new Date().toISOString() });
        const data = await repo.getOrderById(id);
        res.json(data);
    } catch (err) {
        next(err);
    }
}

// PATCH /orders/:id/cancel
export async function cancelOrder(req, res, next) {
    try {
        const { id } = req.params;
        // rules:
        // - customer can cancel only if status = pending
        // - branch can cancel if status = preparing || pending
        const data = await repo.getOrderById(id);
        if (!data) throw new NotFoundError("Order not found");
        const order = data.order;

        if (req.user.role === "customer") {
            if (order.status !== "pending") throw new AppError("Customer can cancel only pending orders", 400, "state");
            const updated = await repo.updateOrderTimestampsAndStatus(id, { status: "cancelled", cancelled_at: new Date().toISOString() });
            return res.json(updated);
        }

        if (req.user.role === "restaurant_owner") {
            const branchInfo = await repo.getBranchInfo(order.branch_id);
            if (!branchInfo) throw new NotFoundError("Branch not found");
            if (branchInfo.owner_id !== req.user.user_id) throw new AppError("Forbidden", 403, "authorization");
            if (!["preparing", "pending"].includes(order.status)) throw new AppError("Branch can cancel only pending or preparing orders", 400, "state");
            const updated = await repo.updateOrderTimestampsAndStatus(id, { status: "cancelled", cancelled_at: new Date().toISOString() });
            return res.json(updated);
        }

        // admins can cancel anything
        if (req.user.role === "admin") {
            const updated = await repo.updateOrderTimestampsAndStatus(id, { status: "cancelled", cancelled_at: new Date().toISOString() });
            return res.json(updated);
        }

        throw new AppError("Forbidden", 403, "authorization");
    } catch (err) {
        next(err);
    }
}
