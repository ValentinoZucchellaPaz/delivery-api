import { getUserByEmail } from "../user/user.repository.js";
import {
  UserLoginRequest,
  UserRegisterRequest,
  UserRegisterResponse,
} from "../user/user.schema.js";
import bcrypt from "bcrypt";
import {
  authenticateUser,
  createNewTokens,
  createUser,
  revokeRefreshToken,
  validateAndRotateToken,
} from "./auth.repository.js";
import { AuthError, ConflictError } from "../../utils/errors.js";

export async function registerUser(req, res, next) {
  try {
    const { name, email, password, role } = UserRegisterRequest.parse(req.body);

    // Verify existing email
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      // return res.status(400).json({ status: "error", message: "Email already in use" });
      throw new ConflictError("Email already in use");
    }

    // Hash password
    const saltRounds = process.env.SALT_ROUNDS || 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user in DB
    const newUser = await createUser({ name, email, password_hash, role });
    const parsedUser = UserRegisterResponse.parse({ id: newUser.id, name, email, role });

    res.status(201).json({ status: "success", user: parsedUser });
  } catch (err) {
    next(err); // middleware for global error handling
  }
}

export const login = async (req, res) => {
  const { email, password } = UserLoginRequest.parse(req.body);

  const user = await authenticateUser(email, password);
  if (!user) throw new AuthError("Invalid credentials");
  // if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const { accessToken, refreshToken } = await createNewTokens(user.id, user.role);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.json({ accessToken });
};

export const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AuthError("No refresh token provided");
  // if (!token) return res.status(401).json({ message: "No refresh token provided" })

  // validate refresh and get new tokens
  const tokens = await validateAndRotateToken(token);
  if (!tokens) {
    throw new AuthError("Invalid or expired refresh token");
  }

  // return access token (body) y cookie w refresh
  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  res.json(tokens.accessToken);
};

export const logout = async (req, res) => {
  const token = req.cookies.refreshToken;

  if (token) {
    // delete from DB
    await revokeRefreshToken(token);
  }

  // clear cookie
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  res.json({ message: "Logged out successfully" });
};
