import * as repo from "../modules/order/order.repository.js";
import db from "../config/db.js";

describe("Order Repository - unit tests (db mocked)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ------------------------
  // getIdempotency
  // ------------------------
  test("getIdempotency returns row when key exists", async () => {
    const fakeRow = { key: "k123", response: { order: { public_id: "p1" } }, order_id: 42 };
    jest.spyOn(db, "query").mockResolvedValueOnce({ rows: [fakeRow] });

    const res = await repo.getIdempotency("k123");
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT key, response, order_id FROM idempotency_keys"),
      ["k123"]
    );
    expect(res).toEqual(fakeRow);
  });

  test("getIdempotency returns null when not found", async () => {
    jest.spyOn(db, "query").mockResolvedValueOnce({ rows: [] });

    const res = await repo.getIdempotency("missing");
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(res).toBeNull();
  });

  // ------------------------
  // saveIdempotency
  // ------------------------
  test("saveIdempotency calls db.query with upsert SQL", async () => {
    const spy = jest.spyOn(db, "query").mockResolvedValueOnce({ rows: [] });

    const key = "k-upsert";
    const request_hash = "h";
    const order_id = 99;
    const responseBody = { order: { public_id: "p99" }, items: [] };

    await repo.saveIdempotency(key, request_hash, order_id, responseBody);

    expect(spy).toHaveBeenCalledTimes(1);
    // check that the first arg contains the INSERT INTO idempotency_keys text
    expect(spy.mock.calls[0][0]).toMatch(/INSERT INTO idempotency_keys/i);
    // check that parameters are passed correctly
    expect(spy.mock.calls[0][1]).toEqual([key, request_hash, order_id, responseBody]);
  });

  // ------------------------
  // getMenuItemsByIds
  // ------------------------
  test("getMenuItemsByIds returns rows when ids provided", async () => {
    const fakeRows = [{ id: 10, name: "Pizza", price: "12.50", available: true }];
    jest.spyOn(db, "query").mockResolvedValueOnce({ rows: fakeRows });

    const res = await repo.getMenuItemsByIds([10, 20]);
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(db.query.mock.calls[0][0]).toMatch(/SELECT id, name, price, available FROM menu_items/i);
    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual(fakeRows);
  });

  // ------------------------
  // createOrderItems
  // ------------------------
  test("createOrderItems returns [] when itemsWithPrice empty", async () => {
    const spy = jest.spyOn(db, "query");
    const res = await repo.createOrderItems(1, []);
    expect(spy).not.toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  test("createOrderItems inserts items and returns rows", async () => {
    const returnedRows = [
      { id: 1, menu_item_id: 10, quantity: 2, unit_price: 5, order_id: 7 },
      { id: 2, menu_item_id: 11, quantity: 1, unit_price: 8, order_id: 7 },
    ];
    jest.spyOn(db, "query").mockResolvedValueOnce({ rows: returnedRows });

    const itemsWithPrice = [
      { menu_item_id: 10, quantity: 2, unit_price: 5 },
      { menu_item_id: 11, quantity: 1, unit_price: 8 },
    ];

    const res = await repo.createOrderItems(7, itemsWithPrice);

    expect(db.query).toHaveBeenCalledTimes(1);
    // query should contain INSERT INTO order_items
    expect(db.query.mock.calls[0][0]).toMatch(/INSERT INTO order_items/i);
    // params array length should be 4 * number of items
    expect(db.query.mock.calls[0][1].length).toBe(itemsWithPrice.length * 4);
    expect(res).toEqual(returnedRows);
  });

  // ------------------------
  // getOrderById
  // ------------------------
  test("getOrderById returns order and items when found", async () => {
    const orderRow = {
      id: 55,
      public_id: "pub-55",
      customer_id: 2,
      branch_id: 3,
      delivery_address: "X",
      estimated_ready_at: "2025-01-01",
      accepted_at: null,
      prepared_at: null,
      sent_at: null,
      delivered_at: null,
      paid_at: null,
      cancelled_at: null,
      status: "preparing",
      total: 20,
      payment_method: null,
      paid: false,
      created_at: "2025-01-01",
    };
    const itemRows = [{ id: 1, menu_item_id: 10, quantity: 2, unit_price: 5, order_id: 55 }];

    // make db.query behave differently depending on SQL text
    jest.spyOn(db, "query").mockImplementation((sql, _params) => {
      if (/FROM orders/i.test(sql)) {
        return Promise.resolve({ rows: [orderRow] });
      } else if (/FROM order_items/i.test(sql)) {
        return Promise.resolve({ rows: itemRows });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await repo.getOrderById("pub-55");
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ order: orderRow, items: itemRows });
  });

  test("getOrderById returns null when not found", async () => {
    jest.spyOn(db, "query").mockResolvedValueOnce({ rows: [] });

    const res = await repo.getOrderById("missing");
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(res).toBeNull();
  });

  // ------------------------
  // listOrders
  // ------------------------
  test("listOrders builds correct query and returns rows (with filters)", async () => {
    const returned = [
      { public_id: "o1", customer_id: 2, branch_id: 3, status: "preparing", total: 10 },
    ];
    const spy = jest.spyOn(db, "query").mockResolvedValueOnce({ rows: returned });

    const filters = { customer_id: 2, branch_id: 3, limit: 10, offset: 0 };
    const res = await repo.listOrders(filters);

    expect(spy).toHaveBeenCalledTimes(1);
    // the params passed to db.query should include customer_id, branch_id, then limit, offset
    const callParams = spy.mock.calls[0][1];
    expect(callParams).toEqual([2, 3, 10, 0]);
    expect(res).toEqual(returned);
  });

  test("listOrders without filters still works", async () => {
    const returned = [{ public_id: "o2", customer_id: 4, branch_id: 7 }];
    jest.spyOn(db, "query").mockResolvedValueOnce({ rows: returned });

    const res = await repo.listOrders({}); // default limit/offset inside function
    expect(db.query).toHaveBeenCalledTimes(1);
    expect(Array.isArray(res)).toBe(true);
    expect(res).toEqual(returned);
  });
});
