// ./src/controllers/usersController.js
import { z } from "zod";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticateUser, createUser, getUserByEmail } from "../db/users.js";
import pool from "../db/connection.js";

// Schema Zod para request
const createUserRequestSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    password: z.string().min(6),
    role: z.enum(['customer', 'restaurant_owner', 'admin']).optional()
});

const loginRequestSchema = z.object({
    email: z.email(),
    password: z.string().min(6)
});

export async function getUsers(req, res, next) {
    try {
        const [rows] = await pool.execute("SELECT id, name, email, role, active, created_at FROM users");
        res.json(rows);
    } catch (err) {
        next(err); // pasa el error al middleware
    }
}

export async function registerUser(req, res, next) {
    try {
        const { name, email, password, role } = createUserRequestSchema.parse(req.body);

        // Verify existing email
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ status: "error", message: "Email already in use" });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user in DB
        const newUser = await createUser({ name, email, password_hash, role });

        res.status(201).json({ status: "success", user: { id: newUser.id, name, email, role } });
    } catch (err) {
        next(err); // middleware for global error handling
    }
}


export const login = async (req, res) => {
    const { email, password } = loginRequestSchema.parse(req.body);

    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
        { user_id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ token });
};
