import request from "supertest";
import app from "../app.js";
import bcrypt from "bcrypt";

// Mock repos
import * as authRepo from "../modules/auth/auth.repository.js";
import * as userRepo from "../modules/user/user.repository.js";

describe("Auth Module (unit tests with mocks)", () => {
  // global mocks for db
  jest.mock("../config/db.js", () => ({
    query: jest.fn(),
  }));

  // silence error middleware during tests exe and logs
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------
  // REGISTER
  // ------------------------
  describe("POST /auth/register", () => {
    it("creates an user correctly", async () => {
      const newUser = { id: 1, name: "Test", email: "test@test.com", role: "customer" };

      jest.spyOn(userRepo, "getUserByEmail").mockResolvedValue(null);
      jest.spyOn(authRepo, "createUser").mockResolvedValue(newUser);
      jest.spyOn(bcrypt, "hash").mockResolvedValue("hashedpassword");

      const res = await request(app)
        .post("/auth/register")
        .send({ name: "Test", email: "test@test.com", password: "123456", role: "customer" });

      expect(res.status).toBe(201);
      expect(res.body.user).toEqual({
        id: 1,
        name: "Test",
        email: "test@test.com",
        role: "customer",
      });
    });

    it("fails if the mail already exists", async () => {
      jest.spyOn(userRepo, "getUserByEmail").mockResolvedValue({ id: 1 });

      const res = await request(app)
        .post("/auth/register")
        .send({ name: "Test", email: "exist@test.com", password: "123456", role: "customer" });

      expect(res.status).toBe(409); // ConflictError
      expect(res.body.message).toMatch(/Email already in use/i);
    });

    it("fails if body doesn't fullfill zod schema", async () => {
      const res = await request(app)
        .post("/auth/register")
        .send({ email: "invalidemail", password: "123456" }); // needs name and role

      expect(res.status).toBe(400);
    });
  });

  // ------------------------
  // LOGIN
  // ------------------------
  describe("POST /auth/login", () => {
    it("returns tokens if credentials are correct", async () => {
      const user = {
        id: 1,
        email: "test@test.com",
        password_hash: "hashedpassword",
        role: "customer",
      };
      jest.spyOn(userRepo, "getUserByEmail").mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
      jest.spyOn(authRepo, "createNewTokens").mockResolvedValue({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@test.com", password: "123456" });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe("access-token");
      expect(res.headers["set-cookie"][0]).toMatch(/refresh-token/);
    });

    it("fails if the user doesn't exists", async () => {
      jest.spyOn(userRepo, "getUserByEmail").mockResolvedValue(null);

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "notfound@test.com", password: "123456" });

      expect(res.status).toBe(401);
    });

    it("fails if the password is incorrect", async () => {
      const user = {
        id: 1,
        email: "test@test.com",
        password_hash: "hashedpassword",
        role: "customer",
      };
      jest.spyOn(userRepo, "getUserByEmail").mockResolvedValue(user);
      jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

      const res = await request(app)
        .post("/auth/login")
        .send({ email: "test@test.com", password: "wrongpass" });

      expect(res.status).toBe(401);
    });
  });

  // ------------------------
  // REFRESH
  // ------------------------
  describe("POST /auth/refresh-token", () => {
    it("returns new accessToken and refreshToken if valid refresh", async () => {
      jest.spyOn(authRepo, "validateAndRotateToken").mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      const res = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", ["refreshToken=valid-refresh"]);

      expect(res.status).toBe(200);
      expect(res.body).toBe("new-access");
      expect(res.headers["set-cookie"][0]).toMatch(/new-refresh/);
    });

    it("fails if the refresh token doesn't exists", async () => {
      const res = await request(app).post("/auth/refresh-token");
      expect(res.status).toBe(401);
    });

    it("fails if refresh token is invalid", async () => {
      jest.spyOn(authRepo, "validateAndRotateToken").mockResolvedValue(null);
      const res = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", ["refreshToken=invalid-refresh"]);
      expect(res.status).toBe(401);
    });
  });

  // ------------------------
  // LOGOUT
  // ------------------------
  describe("POST /auth/logout", () => {
    it("clears refresh token and returns message", async () => {
      jest.spyOn(authRepo, "revokeRefreshToken").mockResolvedValue();

      const res = await request(app)
        .post("/auth/logout")
        .set("Cookie", ["refreshToken=some-refresh"]);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Logged out successfully/i);
      expect(res.headers["set-cookie"][0]).toMatch(/refreshToken=;/); // cookie cleared
    });

    it("returns 200 even if there's no cookie", async () => {
      const res = await request(app).post("/auth/logout");
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Logged out successfully/i);
    });
  });
});
