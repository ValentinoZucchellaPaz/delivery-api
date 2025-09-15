import { AppError, NotFoundError } from "../../utils/errors.js";
import { getRestaurantById } from "../restaurant/restaurant.repository.js";
import { createBranchSchema, createMenuSchema, editMenuSchema, publicBranchSchema, updateBranchSchema } from "./branch.schema.js";
import * as repo from './branch.repository.js'
import pool from "../../config/db.js";

export async function createBranch(req, res, next) {
    try {
        const parsed = createBranchSchema.parse(req.body);

        // validate restaurant
        const restaurant = await getRestaurantById(parsed.restaurant_id);
        if (!restaurant) throw new NotFoundError("Restaurant not found");
        if (restaurant.user_id !== req.user.user_id) {
            throw new AppError("You are not the owner of this restaurant", 403, "authorization");
        }

        const branch = await repo.createBranch(parsed);
        res.status(201).json(branch);
    } catch (err) {
        next(err);
    }
}

export async function createMenuWithItems(req, res, next) {
    try {
        const { id: branch_id } = req.params;
        const parsed = createMenuSchema.parse(req.body);

        // validate branch and user is owner of restaurant
        const branch = await repo.getBranchWithOwner(branch_id);
        if (!branch) throw new NotFoundError("Branch not found");
        if (branch.owner_id !== req.user.user_id) {
            throw new AppError("You are not the owner of this restaurant", 403, "authorization");
        }


        // create menu and items in transaction
        await pool.query("BEGIN");
        const menu = await repo.createMenu(branch_id, parsed.name);
        const items = await repo.createMenuItems(menu.id, parsed.items);
        await pool.query("COMMIT");

        res.status(201).json({ menu, items });
    } catch (err) {
        await pool.query("ROLLBACK").catch(() => { });
        next(err);
    }
}

export async function getMenusWithItems(req, res, next) {
    try {
        const { id: branch_id } = req.params;

        const menus = await repo.getAllMenusByBranch(branch_id);
        if (!menus.length) throw new NotFoundError("No menus found for this branch");

        res.json(menus);
    } catch (err) {
        next(err);
    }
}

export async function updateBranch(req, res, next) {
    try {
        const { id } = req.params;
        const parsed = updateBranchSchema.parse(req.body);
        if (Object.keys(parsed).length == 0) throw new AppError("Must change something (address, city, avg_waiting_time)", 400, "params")

        // check ownership
        const branchInfo = await repo.getBranchWithOwner(id);
        if (!branchInfo) throw new NotFoundError("Branch not found");
        if (branchInfo.owner_id !== req.user.user_id) {
            throw new AppError("You are not the owner of this restaurant", 403, "authorization");
        }

        const branch = await repo.updateBranch(id, parsed);

        res.json(publicBranchSchema.parse(branch));
    } catch (err) {
        next(err);
    }
}

export async function editMenu(req, res, next) {
    const { menu_id } = req.params;

    try {
        const parsed = editMenuSchema.parse(req.body);

        if (!parsed.name && parsed.active == undefined && parsed.delete.length == 0 && parsed.add.length == 0) throw new AppError("Must change something (name, add[item], delete[item]; item:{ name, description, price, available })", 400, "params")

        // check ownership
        const menuOwners = await repo.getMenuOwners(menu_id);
        if (!menuOwners) throw new NotFoundError("Menu not found");
        if (menuOwners.owner_id !== req.user.user_id) {
            throw new AppError("You are not the owner of this restaurant", 403, "authorization");
        }

        await pool.query("BEGIN");

        // update title and active
        const menu = await repo.updateMenu(menu_id, parsed) ?? menu_id;

        // delete items
        if (parsed.delete.length) await repo.deleteMenuItems(parsed.delete);

        // add items
        const addedItems = await repo.createMenuItems(menu_id, parsed.add);

        await pool.query("COMMIT");

        res.json({ menu, addedItems });
    } catch (err) {
        await pool.query("ROLLBACK").catch(() => { });
        if (err.code == 23505) {
            next(new AppError("Cannot have duplicate entry", 400, "items params"))
        }
        next(err);
    }
}

export async function toggleBranchActive(req, res, next) {
    try {
        const { id: branch_id } = req.params;
        const { active } = req.body; // boolean

        if (typeof active !== "boolean") {
            throw new AppError("Field 'active' must be boolean", 400, "validation");
        }

        // verificar ownership
        const branch = await repo.getBranchWithOwner(branch_id);
        if (!branch) throw new NotFoundError("Branch not found");
        if (branch.owner_id !== req.user.user_id) {
            throw new AppError("You are not the owner of this restaurant", 403, "authorization");
        }

        const updated = await repo.updateBranch(branch_id, { active });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}

export async function toggleMenuActive(req, res, next) {
    try {
        const { menu_id } = req.params;
        const { active } = req.body; // boolean

        if (typeof active !== "boolean") {
            throw new AppError("Field 'active' must be boolean", 400, "validation");
        }

        // verificar ownership: obtener branch y dueño
        const menuOwners = await repo.getMenuOwners(menu_id);
        if (!menuOwners) throw new NotFoundError("Menu not found");
        if (menuOwners.owner_id !== req.user.user_id) {
            throw new AppError("You are not the owner of this restaurant", 403, "authorization");
        }

        const updated = await repo.updateMenu(menu_id, { active });
        res.json(updated);
    } catch (err) {
        next(err);
    }
}
