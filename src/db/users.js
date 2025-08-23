import pool from "./connection.js";
import { userSchema } from "./schemas.js";
import bcrypt from "bcrypt";

/**
 * Create user in DB
 * @param {object} userData - required fields: name, email, password_hash, role
 */
export async function createUser(userData) {
    const validatedUser = userSchema.parse(userData);

    const [result] = await pool.execute(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        [validatedUser.name, validatedUser.email, validatedUser.password_hash, validatedUser.role]
    );

    return { id: result.insertId, ...validatedUser };
}

/**
 * Get user by email
 * @param {string} email
 * @returns user object or null if not found
 */
export async function getUserByEmail(email) {
    const [rows] = await pool.execute(
        "SELECT * FROM users WHERE email = ?",
        [email]
    );

    if (rows.length === 0) return null;
    return userSchema.parse(rows[0]);
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