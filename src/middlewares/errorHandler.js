import { ZodError } from "zod";
import { AppError, ValidationError } from "../utils/errors.js";

export function errorHandler(err, req, res, next) {
    console.error("Error capturado:", err);

    // validation errors (Zod)
    if (err instanceof ZodError) {
        const details = err.errors?.map(issue => ({
            path: issue.path.join("."),
            message: issue.message,
        })) ?? JSON.parse(err.message);
        const valError = new ValidationError(details);
        return res.status(valError.statusCode).json({
            status: "error",
            type: valError.type,
            message: valError.message,
            details: valError.details,
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: "error",
            type: err.type,
            message: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }

    // db error (Postgres)
    if (err.code) {
        let message = "Database error";
        switch (err.code) {
            case "23505": // unique_violation
                message = "Duplicate entry";
                break;
            case "23503": // foreign_key_violation
                message = "Foreign key constraint failed";
                break;
        }
        //         switch (err.code) {
        //             case "ER_DUP_ENTRY":
        //                 message = "Duplicate entry";
        //                 break;
        //             case "ER_NO_REFERENCED_ROW":
        //             case "ER_NO_REFERENCED_ROW_2":
        //                 message = "Foreign key constraint failed";
        //                 break;
        //         }
        return res.status(400).json({
            status: "error",
            type: "database",
            message,
        });
    }

    // generic error 500
    res.status(500).json({
        status: "error",
        type: "internal",
        message: "Internal server error",
    });
}
