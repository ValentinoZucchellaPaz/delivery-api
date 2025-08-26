import pool from "../../config/db.js";
import bcrypt from "bcrypt";

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
 * @return {object} userData: {id, name, email, role, active, created_at}
 */
export async function getUserById(id) {
    const res = await pool.query(
        `SELECT id, name, email, role, active, created_at 
        FROM users WHERE id = $1`,
        [id]);
    return res.rows[0] || null;
}

/**
 * Create user in DB
 * @param {object} userData - required fields: name, email, password_hash, role
 * @returns created user
 */
export async function createUser(userData) {
    const validatedUser = UserSchema.parse(userData);

    const res = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [validatedUser.name, validatedUser.email, validatedUser.password_hash, validatedUser.role]
    );

    return { id: res.rows[0].id, ...validatedUser };
}

/**
 * Get user by email
 * @param {string} email
 * @returns user object or null if not found
 */
export async function getUserByEmail(email) {
    const res = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    return res.rows[0] || null;
}

/**
 * Authenticate user by email and password
 * @param {string} email
 * @param {string} password_hash
 * @returns user object or null if authentication fails 
 */
export async function authenticateUser(email, password) {
    const user = await getUserByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password_hash);

    return isMatch ? user : null;
}