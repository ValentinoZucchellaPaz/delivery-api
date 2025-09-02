import bcrypt from "bcrypt";
import { authenticateUser, createUser, getAllUsers, getUserByEmail, getUserById, revokeRefreshToken, validateAndRotateToken } from "./user.repository.js";
import { UserRegisterRequest, UserLoginRequest, PublicUserSchema, UserRegisterResponse } from "./user.schema.js";
import { createAccessToken, signJwt } from "../../utils/jwt.js";

export async function getUsers(req, res, next) {
    try {
        const users = await getAllUsers()
        const parsedUsers = users.map(u => PublicUserSchema.parse(u))
        return res.json({ status: "success", parsedUsers })
    } catch (err) {
        next(err);
    }
}

export async function getUser(req, res, next) {
    try {
        const { id } = req.params;
        const user = await getUserById(id)

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

        const parsedUser = PublicUserSchema.parse(user);

        res.json({ status: 'success', user: parsedUser });
    } catch (err) {
        next(err)
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
        const parsedUser = UserRegisterResponse.parse({ id: newUser.id, name, email, role })


        res.status(201).json({ status: "success", user: parsedUser });
    } catch (err) {
        next(err); // middleware for global error handling
    }
}


export const login = async (req, res) => {
    const { email, password } = UserLoginRequest.parse(req.body);

    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const accessToken = createAccessToken(user.id, user.role)

    res.json({ accessToken });
};

export const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: "No refresh token provided" })

    // validate refresh and get new tokens
    const tokens = await validateAndRotateToken(token);
    if (!tokens) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }

    // return access token (body) y cookie w refresh
    res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json(tokens.accessToken);
}

export const logout = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (token) {
        // delete from DB
        await revokeRefreshToken(token);
    }

    // clear cookie
    res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    });

    res.json({ message: 'Logged out successfully' });
}