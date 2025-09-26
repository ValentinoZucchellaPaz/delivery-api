import request from "supertest";
import app from "../app.js";
import { createTokens } from "../utils/jwt.js";

// Mock repos
import * as branchRepo from "../modules/branch/branch.repository.js";
import * as restaurantRepo from "../modules/restaurant/restaurant.repository.js";
jest.mock("../modules/branch/branch.repository.js");
jest.mock("../modules/restaurant/restaurant.repository.js");

describe("Branch Module (unit tests with mocks)", () => {
    let ownerToken;
    let fakeUser;

    beforeAll(() => {
        fakeUser = { user_id: 10, role: "restaurant_owner" };
        const { accessToken } = createTokens(fakeUser.user_id, fakeUser.role)
        ownerToken = `Bearer ${accessToken}`;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /branch", () => {
        it("should create a branch when user is restaurant owner", async () => {
            // set restaurant ownership for sim
            restaurantRepo.getRestaurantById.mockResolvedValue({
                id: 1,
                user_id: fakeUser.user_id,
            });

            // create branch for sim
            branchRepo.createBranch.mockResolvedValue({
                id: 99,
                restaurant_id: 1,
                address: "Fake St",
                city: "Test City",
            });

            const res = await request(app)
                .post("/branch")
                .set("Authorization", ownerToken)
                .send({
                    restaurant_id: 1,
                    address: "Fake St",
                    city: "Test City",
                });

            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("id", 99);
            expect(branchRepo.createBranch).toHaveBeenCalled();
        });

        it("should fail if restaurant does not exist", async () => {
            restaurantRepo.getRestaurantById.mockResolvedValue(null);

            const res = await request(app)
                .post("/branch")
                .set("Authorization", ownerToken)
                .send({
                    restaurant_id: 999,
                    address: "Nowhere",
                    city: "Lost City",
                });

            expect(res.statusCode).toBe(404);
        });

        it("should fail if user is not restaurant owner", async () => {
            // set restaurant ownership for sim
            restaurantRepo.getRestaurantById.mockResolvedValue({
                id: 1,
                user_id: fakeUser.user_id + 1,
            });

            // create branch for sim
            branchRepo.createBranch.mockResolvedValue({
                id: 99,
                restaurant_id: 1,
                address: "Fake St",
                city: "Test City",
            });

            const res = await request(app)
                .post("/branch")
                .set("Authorization", ownerToken)
                .send({
                    restaurant_id: 1,
                    address: "Fake St",
                    city: "Test City",
                });

            expect(res.statusCode).toBe(403);
            expect(res.body.message).toMatch(/You are not the owner of this restaurant/i);
        });
    });

    describe("PATCH /branch/:id", () => {
        it("should update branch if user owns it", async () => {
            branchRepo.getBranchWithOwner.mockResolvedValue({
                branch_id: 99,
                owner_id: fakeUser.user_id,
            });

            branchRepo.updateBranch.mockResolvedValue({
                id: 99,
                restaurant_id: 1,
                address: "New Address",
                city: "New City",
                created_at: new Date().toISOString(),
            });

            const res = await request(app)
                .patch("/branch/99")
                .set("Authorization", ownerToken)
                .send({ address: "New Address", city: "New City" });


            expect(res.statusCode).toBe(200);
            expect(res.body.address).toBe("New Address");
            expect(branchRepo.updateBranch).toHaveBeenCalled();
        });

        it("should return 403 if user is not owner", async () => {
            branchRepo.getBranchWithOwner.mockResolvedValue({
                branch_id: 99,
                owner_id: 999, // diff owner
            });

            const res = await request(app)
                .patch("/branch/99")
                .set("Authorization", ownerToken)
                .send({ address: "Another Address" });

            expect(res.statusCode).toBe(403);
        });
    });

    describe("POST /branch/:id/menu", () => {
        it("should create menu and items", async () => {
            branchRepo.getBranchWithOwner.mockResolvedValue({
                branch_id: 99,
                owner_id: fakeUser.user_id,
            });

            branchRepo.createMenu.mockResolvedValue({
                id: 1,
                branch_id: 99,
                name: "Lunch Menu",
            });

            branchRepo.createMenuItems.mockResolvedValue([
                { id: 1, name: "Pizza", price: 10 },
            ]);

            const res = await request(app)
                .post("/branch/99/menu")
                .set("Authorization", ownerToken)
                .send({
                    name: "Lunch Menu",
                    items: [{ name: "Pizza", price: 10 }],
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.menu.name).toBe("Lunch Menu");
            expect(res.body.items.length).toBe(1);
        });
    });

    describe("GET /branch/:id/menu", () => {
        it("should return menus with items", async () => {
            branchRepo.getAllMenusByBranch.mockResolvedValue([
                {
                    id: 1,
                    branch_id: 99,
                    name: "Lunch Menu",
                    items: [{ id: 1, name: "Pizza", price: 10 }],
                },
            ]);

            const res = await request(app).get("/branch/99/menu");

            expect(res.statusCode).toBe(200);
            expect(res.body[0].items[0].name).toBe("Pizza");
        });
    });
});
