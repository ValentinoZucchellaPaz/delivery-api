import express from "express";
import { getUser, getUsers, login, logout, refreshToken, registerUser } from "./user.controller.js";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware.js";
import { validateParams } from "../../middlewares/validate.js";
import { userIdParamSchema } from "./user.schema.js";

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles('admin'), getUsers);
router.get("/:id", authenticateToken, authorizeRoles('admin'), validateParams(userIdParamSchema), getUser)
router.post("/register", registerUser);
router.post("/login", login);


router.post("/refresh-token", refreshToken);
router.post('/logout', logout);

export default router;
