import request from "supertest";
import app from "../app.js"; // tu express app
import * as repo from "../modules/order/order.repository.js";
import { orderQueue } from "../modules/order/queue.js";
import { createTokens } from "../utils/jwt.js";

jest.mock("../modules/order/order.repository.js");
jest.mock("../modules/order/queue.js", () => ({
  orderQueue: { add: jest.fn() },
}));

describe("Order Controller (unit tests with mocks)", () => {
  let customerToken;

  beforeAll(() => {
    const { accessToken } = createTokens(1, "customer");
    customerToken = accessToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /order", () => {
    it("should enqueue a new order and return 202", async () => {
      orderQueue.add.mockResolvedValueOnce({ id: "job-123" });

      const res = await request(app)
        .post("/order")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          branch_id: 1,
          delivery_address: "Fake Street 123",
          items: [{ menu_item_id: 10, quantity: 2 }],
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe("pending");
      expect(orderQueue.add).toHaveBeenCalledWith("new-order", expect.any(Object));
    });

    it("should return existing order if idempotency key exists", async () => {
      repo.getIdempotency.mockResolvedValueOnce({
        order_id: 99,
        response: { order: { public_id: "abc" }, items: [] },
      });

      const res = await request(app)
        .post("/order")
        .set("Authorization", `Bearer ${customerToken}`)
        .set("x-idempotency-key", "key123")
        .send({
          branch_id: 1,
          delivery_address: "Fake Street 123",
          items: [{ menu_item_id: 10, quantity: 2 }],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("already exists");
      expect(orderQueue.add).not.toHaveBeenCalled();
    });

    it("should call next with error if request body invalid", async () => {
      const _next = jest.fn();

      await request(app)
        .post("/order")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ invalid: "data" }); // campo inválido
    });

    it("should call next if orderQueue.add fails", async () => {
      orderQueue.add.mockRejectedValueOnce(new Error("Redis down"));

      const res = await request(app)
        .post("/order")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          branch_id: 1,
          delivery_address: "Fake Street 123",
          items: [{ menu_item_id: 10, quantity: 2 }],
        });

      expect(res.status).toBe(500);
    });
  });

  describe("GET /order/:public_id", () => {
    const orderIdMock = crypto.randomUUID();

    it("should return 400 if not pass an UUID in URL params", async () => {
      const res = await request(app)
        .get(`/order/abc`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(400);
    });

    it("should return an order if found", async () => {
      repo.getOrderById.mockResolvedValueOnce({
        order: { public_id: orderIdMock, customer_id: 1, branch_id: 1 },
        items: [],
      });

      const res = await request(app)
        .get(`/order/${orderIdMock}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.order.public_id).toBe(orderIdMock);
      expect(repo.getOrderById).toHaveBeenCalledWith(orderIdMock);
    });

    it("should return 404 if order not found", async () => {
      repo.getOrderById.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/order/${orderIdMock}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(404);
    });

    it("should return 403 if customer tries to access another customer's order", async () => {
      const orderIdMock = crypto.randomUUID();
      repo.getOrderById.mockResolvedValueOnce({
        order: { public_id: orderIdMock, customer_id: 999, branch_id: 1 },
        items: [],
      });

      const res = await request(app)
        .get(`/order/${orderIdMock}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("should return 404 if restaurant_owner accesses order but branch not found", async () => {
      const owner = { user_id: 2, role: "restaurant_owner" };
      const { accessToken } = createTokens(owner.user_id, owner.role);
      const orderIdMock = crypto.randomUUID();

      repo.getOrderById.mockResolvedValueOnce({
        order: { public_id: orderIdMock, customer_id: 1, branch_id: 10 },
        items: [],
      });
      repo.getBranchInfo.mockResolvedValueOnce(null);

      const res = await request(app)
        .get(`/order/${orderIdMock}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("GET /order", () => {
    it("should list orders for a customer", async () => {
      repo.listOrders.mockResolvedValueOnce([{ public_id: "ord1", customer_id: 1, branch_id: 1 }]);

      const res = await request(app).get("/order").set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(repo.listOrders).toHaveBeenCalledWith(
        expect.objectContaining({ customer_id: expect.any(Number) })
      );
    });

    it("should return 400 if restaurant_owner does not provide branch_id", async () => {
      const owner = { user_id: 2, role: "restaurant_owner" };
      const { accessToken } = createTokens(owner.user_id, owner.role);

      const res = await request(app).get("/order").set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Must provide a branch id/i);
    });
  });
});
