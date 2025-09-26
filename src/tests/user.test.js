import request from "supertest";
import app from "../app.js";
import * as userRepo from "../modules/user/user.repository.js";
import { PublicUserSchema } from "../modules/user/user.schema.js";
import { createTokens } from "../utils/jwt.js";

describe("Users Module (unit tests with mocks)", () => {
    // global mocks for db
    jest.mock("../config/db.js", () => ({
        query: jest.fn(),
    }));

    // silence error middleware during tests exe
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        console.error.mockRestore();
    });

    const { accessToken } = createTokens(2, "admin");

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ------------------------
    // GET /users
    // ------------------------
    describe("GET /users", () => {
        it("returns list of users parsed correctly", async () => {
            const mockUsers = [
                { id: 1, name: "Alice", email: "a@test.com", role: "customer", active: true, created_at: new Date() },
                { id: 2, name: "Bob", email: "b@test.com", role: "admin", active: true, created_at: new Date() },
            ];
            jest.spyOn(userRepo, "getAllUsers").mockResolvedValue(mockUsers);

            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.users.length).toBe(2);
            // Validar que respete PublicUserSchema
            res.body.users.forEach(u => expect(PublicUserSchema.parse(u)).toBeDefined());
        });

        it("handles DB errors", async () => {
            jest.spyOn(userRepo, "getAllUsers").mockRejectedValue(new Error("DB error"));
            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${accessToken}`);
            expect(res.status).toBe(500);
        });
    });

    // ------------------------
    // GET /users/:id
    // ------------------------
    describe("GET /users/:id", () => {
        it("returns existing user", async () => {
            const mockUser = { id: 1, name: "Alice", email: "a@test.com", role: "customer", active: true, created_at: new Date() };
            jest.spyOn(userRepo, "getUserById").mockResolvedValue(mockUser);


            const res = await request(app)
                .get("/users/1")
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body.user).toEqual(PublicUserSchema.parse(mockUser));
        });

        it("returns 401 if user doesn't exist", async () => {
            jest.spyOn(userRepo, "getUserById").mockResolvedValue(null);
            const res = await request(app)
                .get("/users/999")
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/Usuario no encontrado/i);
        });
    });

    // ------------------------
    // PATCH /users/:id
    // ------------------------
    describe("PATCH /users/:id", () => {
        it("updates valid user fields", async () => {
            const updatedUser = { id: 1, name: "Alice New", email: "alice@test.com", role: "customer", active: true, created_at: new Date() };
            jest.spyOn(userRepo, "updateUser").mockResolvedValue(updatedUser);

            const res = await request(app)
                .patch("/users/1")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ name: "Alice New" });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({
                id: 1,
                name: "Alice New",
                email: "alice@test.com",
                role: "customer",
                active: true
            });
        });

        it("fails if no update fields specified", async () => {
            const res = await request(app)
                .patch("/users/1")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.details).toMatch(/Must change at least 1 field/i);
        });

        it("returns 404 if user doesn't exists", async () => {
            jest.spyOn(userRepo, "updateUser").mockResolvedValue(null);

            const res = await request(app)
                .patch("/users/999")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ name: "NoUser" });

            expect(res.status).toBe(404);
        });
    });

    // ------------------------
    // PATCH /users/:id/deactivate
    // ------------------------
    describe("PATCH /users/:id/deactivate", () => {
        it("deactive user correctly", async () => {
            const mockUser = { id: 1, active: false };
            jest.spyOn(userRepo, "setUserActive").mockResolvedValue(mockUser);

            const res = await request(app)
                .patch("/users/1/deactivate")
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUser);
        });
    });

    // ------------------------
    // PATCH /users/:id/reactivate
    // ------------------------
    describe("PATCH /users/:id/reactivate", () => {
        it("reactivate user correctly", async () => {
            const mockUser = { id: 1, active: true };
            jest.spyOn(userRepo, "setUserActive").mockResolvedValue(mockUser);

            const res = await request(app)
                .patch("/users/1/reactivate")
                .set("Authorization", `Bearer ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUser);
        });
    });
});
