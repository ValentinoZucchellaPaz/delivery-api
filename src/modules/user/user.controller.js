import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authenticateUser, createUser, getAllUsers, getUserByEmail } from "./user.repository.js";
import { UserRegisterRequest, UserLoginRequest } from "./user.schema.js";

export async function getUsers(req, res, next) {
    try {
        return await getAllUsers()
            .then(users => res.json({ status: "success", users }))
    } catch (err) {
        next(err); // pasa el error al middleware
    }
}

export async function registerUser(req, res, next) {
    try {
        const { name, email, password, role } = UserRegisterRequest.parse(req.body);

        // Verify existing email
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ status: "error", message: "Email already in use" });
        }

        // Hash password
        const saltRounds = process.env.SALT_ROUNDS || 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user in DB
        const newUser = await createUser({ name, email, password_hash, role });

        res.status(201).json({ status: "success", user: { id: newUser.id, name, email, role } });
    } catch (err) {
        next(err); // middleware for global error handling
    }
}


export const login = async (req, res) => {
    const { email, password } = UserLoginRequest.parse(req.body);

    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
        { user_id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ token });
};
