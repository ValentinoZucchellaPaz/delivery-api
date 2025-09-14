import { createRestaurantSchema } from "./restaurant.schema.js";
import { NotFoundError, AppError } from '../../utils/errors.js'
import {
    createRestaurant as createRestaurantDB,
    getAllRestaurants as getAllRestaurantsDB,
    getRestaurantById as getRestaurantByIdDB,
    getBranchesByRestaurantId as getBranchesByRestaurantIdDB
} from './restaurant.repository.js'
import { getUserById } from '../user/user.repository.js';

export async function createRestaurant(req, res, next) {
    try {
        const parsed = createRestaurantSchema.parse(req.body);

        // validate user
        const user = await getUserById(parsed.user_id);
        if (!user) {
            throw new NotFoundError("User not found");
        }
        if (user.role !== "restaurant_owner") {
            throw new AppError("User must have role restaurant_owner", 400, "authorization");
        }

        const restaurant = await createRestaurantDB(parsed);
        res.status(201).json(restaurant);
    } catch (err) {
        next(err);
    }
}

export async function getAllRestaurants(req, res, next) {
    try {
        const restaurants = await getAllRestaurantsDB();
        res.json(restaurants);
    } catch (err) {
        next(err);
    }
}

export async function getRestaurantById(req, res, next) {
    try {
        const { id } = req.params;
        const restaurant = await getRestaurantByIdDB(id);

        if (!restaurant) throw new NotFoundError("Restaurant not found");

        res.json(restaurant);
    } catch (err) {
        next(err);
    }
}

export async function getBranchesByRestaurantId(req, res, next) {
    try {
        const { id } = req.params;

        // validate restaurant
        const restaurant = await getRestaurantByIdDB(id);
        if (!restaurant) throw new NotFoundError("Restaurant not found");

        const branches = await getBranchesByRestaurantIdDB(id);
        res.json({ restaurant, branches });
    } catch (err) {
        next(err);
    }
}