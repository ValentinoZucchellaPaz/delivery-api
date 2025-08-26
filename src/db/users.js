import pool from "./connection.js";
import { userSchema } from "../schemas/entities.js"
import bcrypt from "bcrypt";

/**
 * Create user in DB
 * @param {object} userData - required fields: name, email, password_hash, role
 */
export async function createUser(userData) {
    const validatedUser = userSchema.parse(userData);

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

    if (res.rows.length === 0) return null;
    return userSchema.parse(res.rows[0]);
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
    if (!isMatch) return null;

    return user;
}

export async function getAllUsers() {
    const res = await pool.query("SELECT id, name, email, role, active, created_at FROM users");
    return res.rows;
}