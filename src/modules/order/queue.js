import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import * as repo from './order.repository.js';
import db from '../../config/db.js'

export const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,
});

// helper to compute estimated_ready_at: NOW() + avg_waiting_time (minutes) + items_count*2 minutes
function computeEstimatedReadyInterval(avg_waiting_time_minutes, items_count) {
    const extraPerItem = 2; // minutes per item (simple heuristic)
    const totalMin = (avg_waiting_time_minutes || 0) + (items_count * extraPerItem);
    return `${totalMin} minutes`;
}

export const orderQueue = new Queue('orders', { connection });

// Worker to process orders as background process
export const orderWorker = new Worker('orders', async job => {
    const { publicId, userId, parsedBody, idempotencyKey } = job.data;
    const client = await db.connect();

    try {
        // transaction: create order and items, set estimated_ready_at and accepted_at (automatic)
        await client.query('BEGIN')

        // validate branch exists and get avg_waiting_time + owner
        const branchInfo = await repo.getBranchInfo(parsedBody.branch_id, client);
        if (!branchInfo) throw new NotFoundError("Branch not found");

        // fetch menu_items info
        const ids = parsedBody.items.map(i => i.menu_item_id);
        const menuItems = await repo.getMenuItemsByIds(ids, client);
        if (menuItems.length !== ids.length) {
            throw new AppError("One or more menu items not found", 400, "validation");
        }

        // ensure availability
        const menuById = {}; // here store db menu items
        for (const mi of menuItems) menuById[mi.id] = mi;
        for (const it of parsedBody.items) { // here check if any of the asked is not in db items
            const mi = menuById[it.menu_item_id];
            if (!mi.available) throw new AppError(`Menu item ${mi.name} is not available`, 400, "validation");
        }

        // compute total and prepare items with price snapshot
        let total = 0;
        const itemsWithPrice = parsedBody.items.map(it => {
            const mi = menuById[it.menu_item_id];
            const unit_price = Number(mi.price);
            const sub = unit_price * it.quantity;
            total += sub;
            return { menu_item_id: it.menu_item_id, quantity: it.quantity, unit_price };
        });

        // compute estimated_ready_at interval
        const interval = computeEstimatedReadyInterval(branchInfo.avg_waiting_time ?? 0, parsedBody.items.length);

        // create order
        const order = await repo.createOrder(
            publicId,
            userId,
            parsedBody.branch_id,
            parsedBody.delivery_address,
            interval, // estimated_ready_at: now() + interval
            total,
            'preparing',
            client
        );

        // create order items
        const createdItems = await repo.createOrderItems(order.id, itemsWithPrice, client);

        // save idempotency
        if (idempotencyKey) {
            const { id, ...orderWithoutSerialId } = order;
            const responseBody = { orderWithoutSerialId, items: createdItems };
            await repo.saveIdempotency(idempotencyKey, null, order.id, responseBody, client);
        }

        await client.query("COMMIT");

        return { order, items: createdItems };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => { });
        throw err; // BullMQ marks job as failed
    } finally {
        client.release();
    }
}, { connection });