import pool from "../../config/db.js";

/**
 * Gets all users in DB
 * @returns list of users: {id, name, email, role, active, created_at}[]
 */
export async function getAllUsers() {
  const res = await pool.query("SELECT id, name, email, role, active, created_at FROM users");
  return res.rows;
}

/**
 * Get an user by its Id
 * @param {int} id
 * @return userData: {id, name, email, role, active, created_at}
 */
export async function getUserById(id) {
  const res = await pool.query(
    `SELECT id, name, email, role, active, created_at 
        FROM users WHERE id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

/**
 * Get user by email
 * @param {string} email
 * @returns user object or null if not found
 */
export async function getUserByEmail(email) {
  const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

  return res.rows[0] || null;
}

export async function updateUser(id, fields) {
  const updates = Object.keys(fields)
    .map((key, i) => `${key} = $${i + 2}`)
    .join(", ");
  const values = [id, ...Object.values(fields)];

  const query = `
    UPDATE users
    SET ${updates}
    WHERE id = $1
    RETURNING id, name, email, role, active, created_at
  `;
  const { rows } = await pool.query(query, values);
  return rows[0];
}

export async function setUserActive(id, active) {
  const { rows } = await pool.query(
    `UPDATE users SET active = $2 WHERE id = $1 RETURNING id, name, email, role, active`,
    [id, active]
  );
  return rows[0];
}
