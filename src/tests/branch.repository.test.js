import * as branchRepo from "../modules/branch/branch.repository.js";
import db from "../config/db.js";

jest.mock("../config/db.js"); // mock db

describe("Branch Repository (unit tests)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createBranch", () => {
    it("should insert a branch and return it", async () => {
      const fakeBranch = { id: 1, restaurant_id: 2, address: "A St", created_at: new Date() };
      db.query.mockResolvedValue({ rows: [fakeBranch] });

      const res = await branchRepo.createBranch({
        restaurant_id: 2,
        address: "A St",
        city: "City",
      });

      expect(res).toEqual(fakeBranch);
      expect(db.query).toHaveBeenCalled();
      expect(db.query.mock.calls[0][0]).toMatch(/INSERT INTO branches/);
    });
  });

  describe("getBranchById", () => {
    it("should return branch by id", async () => {
      const fakeBranch = { id: 1, restaurant_id: 2, address: "A St", created_at: new Date() };
      db.query.mockResolvedValue({ rows: [fakeBranch] });

      const res = await branchRepo.getBranchById(1);
      expect(res).toEqual(fakeBranch);
      expect(db.query).toHaveBeenCalledWith(expect.any(String), [1]);
    });

    it("should return undefined if not found", async () => {
      db.query.mockResolvedValue({ rows: [] });
      const res = await branchRepo.getBranchById(999);
      expect(res).toBeUndefined();
    });
  });

  describe("createMenu", () => {
    it("should insert menu and return it", async () => {
      const fakeMenu = { id: 1, branch_id: 2, name: "Lunch", created_at: new Date() };
      db.query.mockResolvedValue({ rows: [fakeMenu] });

      const res = await branchRepo.createMenu(2, "Lunch");
      expect(res).toEqual(fakeMenu);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO menus"), [
        2,
        "Lunch",
      ]);
    });
  });

  describe("createMenuItems", () => {
    it("should return empty array if items empty", async () => {
      const res = await branchRepo.createMenuItems(1, []);
      expect(res).toEqual([]);
    });

    it("should insert multiple items", async () => {
      const items = [
        { name: "Pizza", price: 10 },
        { name: "Pasta", price: 12 },
      ];
      const returned = items.map((it, idx) => ({ id: idx + 1, ...it, menu_id: 1 }));
      db.query.mockResolvedValue({ rows: returned });

      const res = await branchRepo.createMenuItems(1, items);
      expect(res).toEqual(returned);
      expect(db.query).toHaveBeenCalled();
    });
  });

  describe("getBranchWithOwner", () => {
    it("should return branch owner info", async () => {
      const fake = { branch_id: 1, owner_id: 5 };
      db.query.mockResolvedValue({ rows: [fake] });

      const res = await branchRepo.getBranchWithOwner(1);
      expect(res).toEqual(fake);
    });
  });

  describe("getAllMenusByBranch", () => {
    it("should return menus with items", async () => {
      const menus = [{ id: 1, branch_id: 1, name: "Menu 1" }];
      const items = [{ id: 10, menu_id: 1, name: "Pizza", price: 10 }];
      db.query.mockResolvedValueOnce({ rows: menus }).mockResolvedValueOnce({ rows: items });

      const res = await branchRepo.getAllMenusByBranch(1);
      expect(res).toEqual([{ ...menus[0], items }]);
    });

    it("should return empty array if no menus", async () => {
      db.query.mockResolvedValue({ rows: [] });
      const res = await branchRepo.getAllMenusByBranch(1);
      expect(res).toEqual([]);
    });
  });

  describe("updateBranch", () => {
    it("should update fields and return branch", async () => {
      const updated = { id: 1, address: "New", city: "C", avg_waiting_time: 10 };
      db.query.mockResolvedValue({ rows: [updated] });

      const res = await branchRepo.updateBranch(1, { address: "New", city: "C" });
      expect(res).toEqual(updated);
      expect(db.query).toHaveBeenCalled();
    });

    it("should return null if no fields provided", async () => {
      const res = await branchRepo.updateBranch(1, {});
      expect(res).toBeNull();
    });
  });

  describe("updateMenu", () => {
    it("should update menu and return", async () => {
      const updated = { id: 1, name: "New Menu", active: true };
      db.query.mockResolvedValue({ rows: [updated] });

      const res = await branchRepo.updateMenu(1, { name: "New Menu", active: true });
      expect(res).toEqual(updated);
    });

    it("should return null if no fields provided", async () => {
      const res = await branchRepo.updateMenu(1, {});
      expect(res).toBeNull();
    });
  });

  describe("deleteMenuItems", () => {
    it("should not call db if empty array", async () => {
      await branchRepo.deleteMenuItems([]);
      expect(db.query).not.toHaveBeenCalled();
    });

    it("should call db if items provided", async () => {
      db.query.mockResolvedValue({});
      await branchRepo.deleteMenuItems([1, 2, 3]);
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM menu_items"), [
        [1, 2, 3],
      ]);
    });
  });

  describe("getMenuOwners", () => {
    it("should return owner info", async () => {
      const fake = { branch_id: 1, owner_id: 5 };
      db.query.mockResolvedValue({ rows: [fake] });
      const res = await branchRepo.getMenuOwners(1);
      expect(res).toEqual(fake);
    });

    it("should return undefined if not found", async () => {
      db.query.mockResolvedValue({ rows: [] });
      const res = await branchRepo.getMenuOwners(999);
      expect(res).toBeUndefined();
    });
  });
});
