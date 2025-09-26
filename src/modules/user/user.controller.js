import { NotFoundError, ValidationError } from "../../utils/errors.js";
import { getAllUsers, getUserById, setUserActive, updateUser } from "./user.repository.js";
import { PublicUserSchema, UserUpdateSchema } from "./user.schema.js";

/**
 * ====================================================
 * ------------------  USER METHODS  ------------------
 * ====================================================
 */

export async function getUsers(req, res, next) {
    try {
        const users = await getAllUsers()
        const parsedUsers = users.map(u => PublicUserSchema.parse(u))
        return res.json({ status: "success", users: parsedUsers })
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

export async function editUser(req, res, next) {
    try {
        const parsed = UserUpdateSchema.parse(req.body);
        if (Object.keys(parsed).length == 0) throw new ValidationError('Must change at least 1 field of user: name, email or role')
        const user = await updateUser(Number(req.params.id), parsed);
        if (!user) throw new NotFoundError('User not found')
        res.json(user);
    } catch (err) {
        next(err);
    }
}

export async function deactivateUser(req, res, next) {
    try {
        const user = await setUserActive(Number(req.params.id), false);
        res.json(user);
    } catch (err) {
        next(err);
    }
}

export async function reactivateUser(req, res, next) {
    try {
        const user = await setUserActive(Number(req.params.id), true);
        res.json(user);
    } catch (err) {
        next(err);
    }
}