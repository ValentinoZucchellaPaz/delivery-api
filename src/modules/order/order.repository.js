import db from "../../config/db.js";

/* TODO: Idempotency helpers
   Table expected:
   CREATE TABLE idempotency_keys (
     key TEXT PRIMARY KEY,
     request_hash TEXT,
     response JSONB,
     order_id INT,
     created_at timestamptz DEFAULT CURRENT_TIMESTAMP
   );
*/
export async function getIdempotency(key) {
    if (!key) return null;
    const { rows } = await db.query(
        `SELECT key, response, order_id FROM idempotency_keys WHERE key = $1`,
        [key]
    );
    return rows[0] || null;
}

export async function saveIdempotency(key, request_hash, order_id, responseBody) {
    if (!key) return;
    await db.query(
        `INSERT INTO idempotency_keys (key, request_hash, order_id, response) VALUES ($1, $2, $3, $4)
     ON CONFLICT (key) DO UPDATE SET request_hash = EXCLUDED.request_hash, order_id = EXCLUDED.order_id, response = EXCLUDED.response`,
        [key, request_hash, order_id, responseBody]
    );
}

// Get branch info (owner id and avg_waiting_time)
export async function getBranchInfo(branch_id) {
    const { rows } = await db.query(
        `SELECT b.id as branch_id, r.user_id as owner_id, b.avg_waiting_time
     FROM branches b
     JOIN restaurants r ON r.id = b.restaurant_id
     WHERE b.id = $1`,
        [branch_id]
    );
    return rows[0] || null;
}

// Get menu_item price & availability
export async function getMenuItemsByIds(menu_item_ids) {
    const { rows } = await db.query(
        `SELECT id, name, price, available FROM menu_items WHERE id = ANY($1::int[])`,
        [menu_item_ids]
    );
    return rows;
}

export async function createOrder({ customer_id, branch_id, delivery_address, total }) {
    const { rows } = await db.query(
        `INSERT INTO orders (customer_id, branch_id, delivery_address, total, status, accepted_at, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     RETURNING id, customer_id, branch_id, delivery_address, total, status, accepted_at, created_at`,
        [customer_id, branch_id, delivery_address, total, 'preparing'] // automatic acceptance => preparing
    );
    return rows[0];
}

export async function createOrderItems(order_id, itemsWithPrice) {
    if (!itemsWithPrice || !itemsWithPrice.length) return [];
    const values = [];
    const placeholders = itemsWithPrice.map((it, i) => {
        const base = i * 4;
        values.push(it.menu_item_id, it.quantity, it.unit_price, order_id);
        // menu_item_id, quantity, unit_price, order_id
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });
    const query = `
    INSERT INTO order_items (menu_item_id, quantity, unit_price, order_id)
    VALUES ${placeholders.join(", ")}
    RETURNING id, menu_item_id, quantity, unit_price, order_id
  `;
    const { rows } = await db.query(query, values);
    return rows;
}

export async function getOrderById(order_id) {
    const { rows: orderRows } = await db.query(
        `SELECT id, customer_id, branch_id, delivery_address, estimated_ready_at, accepted_at,
            prepared_at, sent_at, delivered_at, paid_at, cancelled_at,
            status, total, payment_method, paid, created_at
     FROM orders WHERE id = $1`,
        [order_id]
    );
    const order = orderRows[0];
    if (!order) return null;

    const { rows: items } = await db.query(
        `SELECT id, menu_item_id, quantity, unit_price FROM order_items WHERE order_id = $1`,
        [order_id]
    );

    return { order, items };
}

export async function listOrders({ customer_id, branch_id, limit = 50, offset = 0 }) {
    const conditions = [];
    const vals = [];
    let idx = 1;
    if (customer_id) {
        conditions.push(`customer_id = $${idx++}`);
        vals.push(customer_id);
    }
    if (branch_id) {
        conditions.push(`branch_id = $${idx++}`);
        vals.push(branch_id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await db.query(
        `SELECT id, customer_id, branch_id, status, total, created_at FROM orders ${where}
     ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...vals, limit, offset]
    );
    return rows;
}

export async function updateOrderTimestampsAndStatus(order_id, fields) {
    // fields is object like { status: 'prepared', prepared_at: 'NOW()' } but we'll compute timestamps server-side
    const setParts = [];
    const vals = [];
    let idx = 1;
    for (const k of Object.keys(fields)) {
        setParts.push(`${k} = $${idx}`);
        vals.push(fields[k]);
        idx++;
    }
    if (!setParts.length) return null;
    vals.push(order_id);
    const { rows } = await db.query(
        `UPDATE orders SET ${setParts.join(", ")} WHERE id = $${idx} RETURNING *`,
        vals
    );
    return rows[0];
}
