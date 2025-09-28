import db from "../../config/db.js";

export async function createBranch({ restaurant_id, address, city }) {
  const query = `
    INSERT INTO branches (restaurant_id, address, city, created_at)
    VALUES ($1, $2, $3,NOW())
    RETURNING id, restaurant_id, address, created_at
  `;
  const values = [restaurant_id, address, city];
  const { rows } = await db.query(query, values);
  return rows[0];
}

export async function getBranchById(id) {
  const { rows } = await db.query(
    `SELECT id, restaurant_id, address, created_at FROM branches WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function createMenu(branch_id, name) {
  const query = `
    INSERT INTO menus (branch_id, name, created_at)
    VALUES ($1, $2, NOW())
    RETURNING id, branch_id, name, created_at
  `;
  const { rows } = await db.query(query, [branch_id, name]);
  return rows[0];
}

// bulk creation
export async function createMenuItems(menu_id, items, client = null) {
  if (!items || items.length === 0) return [];

  const values = [];
  const placeholders = items
    .map((item, idx) => {
      const i = idx * 5;
      values.push(item.name, item.description || null, item.price, item.available ?? true, menu_id);
      return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`;
    })
    .join(",");

  const query = `
    INSERT INTO menu_items (name, description, price, available, menu_id)
    VALUES ${placeholders}
    RETURNING id, name, description, price, available, menu_id
  `;

  const c = client || db;

  const { rows } = await c.query(query, values);
  return rows;
}

export async function getBranchWithOwner(branch_id) {
  const { rows } = await db.query(
    `
    SELECT b.id as branch_id, r.user_id as owner_id
    FROM branches b
    JOIN restaurants r ON r.id = b.restaurant_id
    WHERE b.id = $1
  `,
    [branch_id]
  );
  return rows[0];
}

export async function getAllMenusByBranch(branch_id) {
  const { rows: menus } = await db.query(
    `SELECT id, branch_id, name, created_at, active
     FROM menus
     WHERE branch_id = $1
     ORDER BY created_at ASC`,
    [branch_id]
  );

  if (!menus.length) return [];
  const menuIds = menus.map((m) => m.id);
  const { rows: items } = await db.query(
    `SELECT id, name, description, price, available, menu_id
     FROM menu_items
     WHERE menu_id = ANY($1::int[])`,
    [menuIds]
  );

  // group by menu  and combine
  const itemsByMenu = {};
  items.forEach((item) => {
    if (!itemsByMenu[item.menu_id]) itemsByMenu[item.menu_id] = [];
    itemsByMenu[item.menu_id].push(item);
  });
  const result = menus.map((menu) => ({
    ...menu,
    items: itemsByMenu[menu.id] || [],
  }));

  return result;
}

export async function updateBranch(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ["address", "active", "city", "avg_waiting_time"]) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (!fields.length) return null;

  values.push(id);
  const { rows } = await db.query(
    `UPDATE branches SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, restaurant_id, address, city, avg_waiting_time, active, created_at`,
    values
  );
  return rows[0];
}

export async function updateMenu(menu_id, data, client = null) {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key of ["name", "active"]) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${idx}`);
      values.push(data[key]);
      idx++;
    }
  }

  if (!fields.length) return null;

  values.push(menu_id);
  const c = client || db;
  const { rows } = await c.query(
    `UPDATE menus SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, branch_id, name, active, created_at`,
    values
  );
  return rows[0];
}

export async function deleteMenuItems(itemIds, client = null) {
  if (!itemIds.length) return;
  const c = client || db;
  await c.query(`DELETE FROM menu_items WHERE id = ANY($1::int[])`, [itemIds]);
}

export async function getMenuOwners(menu_id) {
  const { rows } = await db.query(
    `
      SELECT b.id as branch_id, r.user_id as owner_id
      FROM menus m
      JOIN branches b ON b.id = m.branch_id
      JOIN restaurants r ON r.id = b.restaurant_id
      WHERE m.id = $1
    `,
    [menu_id]
  );

  return rows[0];
}
