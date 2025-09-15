import pool from '../../config/db.js'

export async function createRestaurant({ user_id, name, description }) {
    const query = `
    INSERT INTO restaurants (user_id, name, description, created_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, user_id, name, description, created_at
  `;
    const values = [user_id, name, description || null];
    const { rows } = await pool.query(query, values);
    return rows[0];
}

export async function getRestaurantById(id) {
    const { rows } = await pool.query(
        `SELECT id, user_id, name, description, created_at FROM restaurants WHERE id = $1`,
        [id]
    );
    return rows[0];
}


export async function getAllRestaurants() {
    const { rows } = await pool.query(
        `SELECT id, user_id, name, description, created_at
     FROM restaurants
     ORDER BY created_at DESC`
    );
    return rows;
}

export async function getBranchesByRestaurantId(restaurant_id) {
    const { rows } = await pool.query(
        `SELECT id, restaurant_id, address, city, created_at
     FROM branches
     WHERE restaurant_id = $1
     ORDER BY created_at DESC`,
        [restaurant_id]
    );
    return rows;
}

export async function updateRestaurant(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of ["name", "description"]) {
        if (data[key] !== undefined) {
            fields.push(`${key} = $${idx}`);
            values.push(data[key]);
            idx++;
        }
    }

    if (!fields.length) return null;

    values.push(id);
    const { rows } = await pool.query(
        `UPDATE restaurants SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, user_id, name, description, created_at`,
        values
    );
    return rows[0];
}
