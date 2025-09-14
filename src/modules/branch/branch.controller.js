import { AppError, NotFoundError } from "../../utils/errors.js";
import { getRestaurantById } from "../restaurant/restaurant.repository.js";
import { createBranchSchema, createMenuSchema } from "./branch.schema.js";
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

