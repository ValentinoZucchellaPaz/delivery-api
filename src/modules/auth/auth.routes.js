import { Router } from "express";
import { login, logout, refreshToken, registerUser } from "./auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);


export default router;