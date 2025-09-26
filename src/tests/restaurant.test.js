import request from "supertest";
import app from "../app.js"; // your Express app
import * as repo from "../modules/restaurant/restaurant.repository.js";
import * as userRepo from "../modules/user/user.repository.js";
import { createTokens } from "../utils/jwt.js";


describe("Restaurants Module (unit tests with mocks)", () => {
    // global mocks for db
    jest.mock("../config/db.js", () => ({
        query: jest.fn(),
    }));

    // silence error middleware during tests exe and logs
    beforeAll(() => {
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterAll(() => {
        console.error.mockRestore();
    });

    const { accessToken } = createTokens(1, "admin")

    // Clear mocks after each test
    afterEach(() => jest.clearAllMocks());

    // ------------------------
    // POST /restaurant
    // ------------------------
    describe("POST /restaurant", () => {
        it("should create a new restaurant when user exists and has proper role", async () => {
            const mockUser = { id: 1, role: "restaurant_owner" };
            const mockRestaurant = {
                id: 1,
                user_id: 1,
                name: "Test Restaurant",
                description: "Test Description",
                created_at: new Date().toISOString(),
            };

            jest.spyOn(userRepo, "getUserById").mockResolvedValue(mockUser);
            jest.spyOn(repo, "createRestaurant").mockResolvedValue(mockRestaurant);

            const res = await request(app)
                .post("/restaurant")
                .set("Authorization", `Bearer: ${accessToken}`)
                .send({ user_id: 1, name: "Test Restaurant", description: "Test Description" });

            expect(res.status).toBe(201);
            expect(res.body).toEqual(mockRestaurant);
        });

        it("should return 404 if user does not exist", async () => {
            jest.spyOn(userRepo, "getUserById").mockResolvedValue(null);

            const res = await request(app)
                .post("/restaurant")
                .set("Authorization", `Bearer: ${accessToken}`)
                .send({ user_id: 999, name: "Name" });

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/User not found/i);
        });

        it("should return 400 if user does not have restaurant_owner role", async () => {
            jest.spyOn(userRepo, "getUserById").mockResolvedValue({ id: 2, role: "user" });

            const res = await request(app)
                .post("/restaurant")
                .set("Authorization", `Bearer: ${accessToken}`)
                .send({ user_id: 2, name: "Name" });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/User must have role restaurant_owner/i);
        });
    });

    // ------------------------
    // GET /restaurant
    // ------------------------
    describe("GET /restaurant", () => {
        it("should return a list of restaurants", async () => {
            const mockRestaurants = [
                { id: 1, user_id: 1, name: "R1", description: "D1", created_at: new Date().toISOString() },
                { id: 2, user_id: 2, name: "R2", description: "D2", created_at: new Date().toISOString() },
            ];

            jest.spyOn(repo, "getAllRestaurants").mockResolvedValue(mockRestaurants);

            const res = await request(app)
                .get("/restaurant")
                .set("Authorization", `Bearer: ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockRestaurants);
        });
    });

    // ------------------------
    // GET /restaurant/:id
    // ------------------------
    describe("GET /restaurant/:id", () => {
        it("should return a restaurant by id", async () => {
            const mockRestaurant = { id: 1, user_id: 1, name: "R1", description: "D1", created_at: new Date().toISOString() };
            jest.spyOn(repo, "getRestaurantById").mockResolvedValue(mockRestaurant);

            const res = await request(app)
                .get("/restaurant/1")
                .set("Authorization", `Bearer: ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockRestaurant);
        });

        it("should return 404 if restaurant not found", async () => {
            jest.spyOn(repo, "getRestaurantById").mockResolvedValue(null);

            const res = await request(app)
                .get("/restaurant/999")
                .set("Authorization", `Bearer: ${accessToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/Restaurant not found/i);
        });
    });

    // ------------------------
    // GET /restaurant/:id/branches
    // ------------------------
    describe("GET /restaurant/:id/branches", () => {
        it("should return restaurant with its branches", async () => {
            const mockRestaurant = { id: 1, user_id: 1, name: "R1", description: "D1", created_at: new Date().toISOString() };
            const mockBranches = [
                { id: 1, restaurant_id: 1, address: "Addr1", city: "City1", created_at: new Date().toISOString() },
            ];

            jest.spyOn(repo, "getRestaurantById").mockResolvedValue(mockRestaurant);
            jest.spyOn(repo, "getBranchesByRestaurantId").mockResolvedValue(mockBranches);

            const res = await request(app)
                .get("/restaurant/1/branches")
                .set("Authorization", `Bearer: ${accessToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ restaurant: mockRestaurant, branches: mockBranches });
        });

        it("should return 404 if restaurant not found", async () => {
            jest.spyOn(repo, "getRestaurantById").mockResolvedValue(null);

            const res = await request(app)
                .get("/restaurant/999/branches")
                .set("Authorization", `Bearer: ${accessToken}`);

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/Restaurant not found/i);
        });
    });

    // ------------------------
    // PATCH /restaurant/:id
    // ------------------------
    describe("PATCH /restaurant/:id", () => {
        it("should update restaurant fields successfully", async () => {
            const mockUpdated = { id: 1, user_id: 1, name: "R1 Updated", description: "New Desc", created_at: new Date().toISOString() };
            jest.spyOn(repo, "updateRestaurant").mockResolvedValue(mockUpdated);

            const res = await request(app)
                .patch("/restaurant/1")
                .set("Authorization", `Bearer: ${accessToken}`)
                .send({ name: "R1 Updated", description: "New Desc" });

            expect(res.status).toBe(200);
            expect(res.body).toEqual(mockUpdated);
        });

        it("should return 400 if no fields to update provided", async () => {
            const res = await request(app)
                .patch("/restaurant/1")
                .set("Authorization", `Bearer: ${accessToken}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/Must change something/i);
        });

        it("should return 404 if restaurant does not exist", async () => {
            jest.spyOn(repo, "updateRestaurant").mockResolvedValue(null);

            const res = await request(app)
                .patch("/restaurant/999")
                .set("Authorization", `Bearer: ${accessToken}`)
                .send({ name: "Name" });

            expect(res.status).toBe(404);
            expect(res.body.message).toMatch(/Restaurant not found/i);
        });
    });
});
