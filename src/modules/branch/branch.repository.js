import pool from '../../config/db.js'

export async function createBranch({ restaurant_id, address, city }) {
  const query = `
    INSERT INTO branches (restaurant_id, address, city, created_at)
    VALUES ($1, $2, $3,NOW())
    RETURNING id, restaurant_id, address, created_at
  `;
  const values = [restaurant_id, address, city];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function getBranchById(id) {
  const { rows } = await pool.query(
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
  const { rows } = await pool.query(query, [branch_id, name]);
  return rows[0];
}

// Crear items en bulk
export async function createMenuItems(menu_id, items) {
  if (!items || items.length === 0) return [];

  const values = [];
  const placeholders = items.map((item, idx) => {
    const i = idx * 5;
    values.push(item.name, item.description || null, item.price, item.available ?? true, menu_id);
    return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`;
  }).join(",");

  const query = `
    INSERT INTO menu_items (name, description, price, available, menu_id)
    VALUES ${placeholders}
    RETURNING id, name, description, price, available, menu_id
  `;

  const { rows } = await pool.query(query, values);
  return rows;
}

export async function getBranchWithOwner(branch_id) {
  const { rows } = await pool.query(`
    SELECT b.id as branch_id, r.user_id as owner_id
    FROM branches b
    JOIN restaurants r ON r.id = b.restaurant_id
    WHERE b.id = $1
  `, [branch_id]);
  return rows[0];
}

export async function getAllMenusByBranch(branch_id) {
  const { rows: menus } = await pool.query(
    `SELECT id, branch_id, name, created_at
     FROM menus
     WHERE branch_id = $1
     ORDER BY created_at ASC`,
    [branch_id]
  );

  if (!menus.length) return [];
  const menuIds = menus.map(m => m.id);
  const { rows: items } = await pool.query(
    `SELECT id, name, description, price, available, menu_id
     FROM menu_items
     WHERE menu_id = ANY($1::int[])`,
    [menuIds]
  );

  // group by menu  and combine
  const itemsByMenu = {};
  items.forEach(item => {
    if (!itemsByMenu[item.menu_id]) itemsByMenu[item.menu_id] = [];
    itemsByMenu[item.menu_id].push(item);
  });
  const result = menus.map(menu => ({
    ...menu,
    items: itemsByMenu[menu.id] || []
  }));

  return result;
}
