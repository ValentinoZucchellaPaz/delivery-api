import pool from "../../config/db.js";
import { createTokens } from "../../utils/jwt.js";
import { getUserByEmail, getUserById } from "../user/user.repository.js";
import { CreateUserSchema } from "../user/user.schema.js";
import bcrypt from 'bcrypt'

/**
 * Create user in DB
 * @param {object} userData - required fields: name, email, password_hash, role
 * @returns created user
 */
export async function createUser(userData) {
    const validatedUser = CreateUserSchema.parse(userData);

    const res = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [validatedUser.name, validatedUser.email, validatedUser.password_hash, validatedUser.role]
    );

    return { id: res.rows[0].id, ...validatedUser };
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

/**
 * Validate refresh token and create new
 * @param {string} token
 * @returns accessToken, refreshToken or null if validation fails
 */
export async function createNewTokens(user_id, user_role) {

    const { accessToken, refreshToken } = createTokens(user_id, user_role)

    const refresh_expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    // save refresh in db
    await pool.query(
        `INSERT INTO refresh_tokens (user_id, token, created_at, expires_at)
        VALUES ($1, $2, NOW(), $3)`,
        [user_id, refreshToken, refresh_expiration]
    );

    return { accessToken, refreshToken }
}

/**
 * Validate refresh token and create new
 * @param {string} token
 * @returns accessToken, refreshToken or null if validation fails
 */
export async function validateAndRotateToken(token) {
    const result = await pool.query(
        `SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()`,
        [token]
    );
    const row = result.rows[0];
    if (!row) return null;

    // generate new refresh & access tokens
    const user = await getUserById(row.user_id); // get user role
    if (!user) return null;

    const { accessToken, refreshToken } = createTokens(user.id, user.role)
    const refresh_expiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()


    // update token in db
    await pool.query(
        `UPDATE refresh_tokens SET token = $1, created_at = NOW(), expires_at = $2 WHERE id = $3`,
        [refreshToken, refresh_expiration, row.id]
    );

    // Retornar usuario y refresh token actualizado
    return {
        accessToken,
        refreshToken
    };
}

export async function revokeRefreshToken(token) {
    await pool.query(
        `DELETE FROM refresh_tokens WHERE token = $1`,
        [token]
    );
}