import * as repo from "./order.repository.js";
import { createOrderSchema } from "./order.schema.js";
import { NotFoundError, AppError } from "../../utils/errors.js";
import { orderQueue } from "./queue.js";
import crypto from "crypto"


// POST /order     --- uses redis queue to make an async insertion in db and avoid blocking the event loop
export async function createOrder(req, res, next) {
    try {
        const parsed = createOrderSchema.parse(req.body);
        const idempotencyKey = req.headers["x-idempotency-key"];

        // idempotency; if key provided, check
        // if there's already a key, it's the same order
        if (idempotencyKey) {
            const idemp = await repo.getIdempotency(idempotencyKey);
            if (idemp && idemp.order_id) {
                // return saved response (assume response stored)
                return res.status(200).json({
                    status: "already exists",
                    items: idemp.response.items
                });
            }
        }

        const publicId = crypto.randomUUID();

        // encolar pedido
        const job = await orderQueue.add('new-order', {
            publicId,
            userId: req.user.user_id,
            parsedBody: parsed,
            idempotencyKey
        });

        // responder inmediatamente
        res.status(202).json({
            status: 'pending',
            message: 'Pedido recibido y en cola',
            order_id: publicId
        });
    } catch (err) {
        next(err);
    }
}

// GET /order/:public_id
export async function getOrder(req, res, next) {
    try {
        const { public_id } = req.params;
        const data = await repo.getOrderById(public_id);
        if (!data) throw new NotFoundError("Order not found");

        // authorization: customer can see own, restaurant_owner (owner of branch) or admin can see all
        if (req.user.role === "customer" && req.user.user_id !== data.order.customer_id) {
            throw new AppError("Forbidden", 403, "authorization");
        }
        if (req.user.role === "restaurant_owner") {
            // check owner
            const branchInfo = await repo.getBranchInfo(data.order.branch_id);
            if (!branchInfo) throw new NotFoundError("The order branch is not available.");
            if (branchInfo.owner_id !== req.user.user_id) throw new AppError("Forbidden", 403, "authorization");
        }

        delete data.order.id    // dont wanna show serial id (pk)
        res.json(data);
    } catch (err) {
        next(err);
    }
}

// GET /order?customer_id=&branch_id=&limit=&offset=
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
   For each PATCH checks ownership and valid current state, then set status and timestamp.
*/

async function changeStatusIfAllowed({ public_order_id, actor, allowedRoles, fromStatuses, toStatus, timestampColumn }) {
    // fetch order
    const { order } = await repo.getOrderById(public_order_id) || {};
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

    const updated = await repo.updateOrderTimestampsAndStatus(public_order_id, fields);
    return updated;
}

// PATCH /order/:id/accept  (we still provide it; will set accepted_at & status preparing)
export async function acceptOrder(req, res, next) {
    try {
        const { public_id: id } = req.params;
        // only branch owner or admin can accept; but creation auto-accepts so usually not needed
        const updated = await changeStatusIfAllowed({
            public_order_id: id,
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

// PATCH /order/:id/prepared
export async function markPrepared(req, res, next) {
    try {
        const { public_id: id } = req.params;
        const updated = await changeStatusIfAllowed({
            public_order_id: id,
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

// PATCH /order/:id/sent
export async function markSent(req, res, next) {
    try {
        const { public_id: id } = req.params;
        const updated = await changeStatusIfAllowed({
            public_order_id: id,
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

// PATCH /order/:id/delivered
export async function markDelivered(req, res, next) {
    try {
        const { public_id: id } = req.params;
        const updated = await changeStatusIfAllowed({
            public_order_id: id,
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

// PATCH /order/:id/paid
export async function markPaid(req, res, next) {
    try {
        const { public_id: id } = req.params;
        // only branch owner marks paid (since payments are cash)
        const updated = await changeStatusIfAllowed({
            public_order_id: id,
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

// PATCH /order/:id/cancel
export async function cancelOrder(req, res, next) {
    try {
        const { public_id: id } = req.params;
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
