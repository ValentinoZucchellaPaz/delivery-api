import express from "express";
import { getUsers, login, registerUser } from "./user.controller.js";
import { authenticateToken, authorizeRoles } from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authenticateToken, authorizeRoles('admin'), getUsers);
router.post("/register", registerUser);
router.post("/login", login);


router.post("/refresh-token", (req, res) => {
}); // todo: get via cookie, validate and retrieve new access token
router.post('/logout', (req, res) => {
}); // todo: delete refresh cookie

export default router;
