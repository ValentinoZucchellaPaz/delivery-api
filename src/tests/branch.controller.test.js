import request from "supertest";
import app from "../app.js";
import { createTokens } from "../utils/jwt.js";
import * as branchController from "../modules/branch/branch.controller.js";

// Mock repos and db
import * as branchRepo from "../modules/branch/branch.repository.js";
import * as restaurantRepo from "../modules/restaurant/restaurant.repository.js";
import db from "../config/db.js";

jest.mock("../config/db.js");
jest.mock("../modules/branch/branch.repository.js");
jest.mock("../modules/restaurant/restaurant.repository.js");

describe("Branch Controller (unit tests with mocks)", () => {
  let ownerToken;
  let fakeUser;

  beforeAll(() => {
    fakeUser = { user_id: 10, role: "restaurant_owner" };
    const { accessToken } = createTokens(fakeUser.user_id, fakeUser.role);
    ownerToken = `Bearer ${accessToken}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // mock client
    const clientMock = {
      query: jest.fn(),
      release: jest.fn(),
    };
    db.connect.mockResolvedValue(clientMock);

    // mock repos recieve client
    branchRepo.updateMenu.mockImplementation((menu_id, data, _client = clientMock) =>
      Promise.resolve({ id: menu_id, ...data })
    );
    branchRepo.createMenuItems.mockImplementation((menu_id, items, _client = clientMock) =>
      Promise.resolve(items.map((i, idx) => ({ id: idx + 1, ...i })))
    );
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

      const res = await request(app).post("/branch").set("Authorization", ownerToken).send({
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

      const res = await request(app).post("/branch").set("Authorization", ownerToken).send({
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

      const res = await request(app).post("/branch").set("Authorization", ownerToken).send({
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

      branchRepo.createMenuItems.mockResolvedValue([{ id: 1, name: "Pizza", price: 10 }]);

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

  describe("PATCH /branch/:id/menu/:menu_id - editMenu", () => {
    it("should edit menu and items in a transaction", async () => {
      branchRepo.getMenuOwners.mockResolvedValue({ owner_id: fakeUser.user_id });
      const req = {
        params: { id: "99", menu_id: "1" },
        body: {
          name: "New Menu",
          add: [{ name: "Burger", price: 5 }],
          delete: [],
          active: true,
        },
        user: { user_id: fakeUser.user_id, role: "restaurant_owner" },
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await branchController.editMenu(req, res, next);

      expect(db.connect).toHaveBeenCalled();
      const client = await db.connect.mock.results[0].value;
      expect(client.query).toHaveBeenCalledWith("BEGIN");
      expect(branchRepo.updateMenu).toHaveBeenCalledWith("1", req.body, client);
      expect(branchRepo.createMenuItems).toHaveBeenCalledWith("1", req.body.add, client);
      expect(client.query).toHaveBeenCalledWith("COMMIT");
      expect(client.release).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        menu: { id: "1", ...req.body },
        addedItems: [{ id: 1, name: "Burger", price: 5 }],
      });
    });
  });

  describe("PATCH /branch/:id/menu/:menu_id - editMenu errors", () => {
    it("should return 403 if user is not owner", async () => {
      branchRepo.getMenuOwners.mockResolvedValue({ owner_id: 999 }); // other user
      const req = {
        params: { id: "99", menu_id: "1" },
        body: { name: "New Menu", add: [], delete: [], active: true },
        user: { user_id: fakeUser.user_id, role: "restaurant_owner" },
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await branchController.editMenu(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toHaveProperty("statusCode", 403);
      expect(err.message).toMatch(/You are not the owner of this restaurant/i);
    });

    it("should return 404 if menu not found", async () => {
      branchRepo.getMenuOwners.mockResolvedValue(null);
      const req = {
        params: { id: "99", menu_id: "999" },
        body: { name: "New Menu", add: [], delete: [], active: true },
        user: { user_id: fakeUser.user_id, role: "restaurant_owner" },
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await branchController.editMenu(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toHaveProperty("statusCode", 404);
      expect(err.message).toMatch(/Menu not found/i);
    });

    it("should return 400 if no valid changes are provided", async () => {
      branchRepo.getMenuOwners.mockResolvedValue({ owner_id: fakeUser.user_id }); // correct
      const req = {
        params: { id: "99", menu_id: "1" },
        body: { name: "", add: [], delete: [], active: undefined },
        user: { user_id: fakeUser.user_id, role: "restaurant_owner" },
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await branchController.editMenu(req, res, next);

      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err).toHaveProperty("statusCode", 400);
      expect(err.message).toMatch(/Must change something/i);
    });

    it("should rollback transaction if repo throws", async () => {
      const clientMock = {
        query: jest.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("DB error")),
        release: jest.fn(),
      };
      db.connect.mockResolvedValue(clientMock);

      branchRepo.getMenuOwners.mockResolvedValue({ owner_id: fakeUser.user_id });
      branchRepo.updateMenu.mockRejectedValue(new Error("DB error"));

      const req = {
        params: { id: "99", menu_id: "1" },
        body: { name: "New Menu", add: [{ name: "Burger", price: 5 }], delete: [], active: true },
        user: { user_id: fakeUser.user_id, role: "restaurant_owner" },
      };
      const res = { json: jest.fn() };
      const next = jest.fn();

      await branchController.editMenu(req, res, next);

      expect(clientMock.query).toHaveBeenCalledWith("ROLLBACK");
      expect(clientMock.release).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
      const err = next.mock.calls[0][0];
      expect(err.message).toMatch(/DB error/i);
    });
  });
});
