import express from "express";
import { getUsers, login, registerUser } from "../controllers/user.controller.js";

const router = express.Router();

// TODO: write get/post methods in ./db/users.js

router.post("/register", registerUser);
router.post("/login", login);
router.get("/", getUsers);
// TODO: add protected routes via auth middleware and other endpoint

export default router;
