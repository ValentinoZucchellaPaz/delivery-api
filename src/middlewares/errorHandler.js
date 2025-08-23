import z from "zod";

// middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
    console.log("Error capturado por errorHandler middleware");
    console.error(err); // log en consola para debugging

    // Zod validation errors
    if (err instanceof z.ZodError) {
        return res.status(400).json({
            status: "error",
            type: "validation",
            details: JSON.parse(err.message)
        });
    }

    // MySQL errors (ex. duplicate entry, foreign key fail)
    if (err?.code) {
        let message = err.message;
        console.log('hay que rico papi');


        switch (err.code) {
            case "ER_DUP_ENTRY":
                message = "Duplicate entry";
                break;
            case "ER_NO_REFERENCED_ROW":
            case "ER_NO_REFERENCED_ROW_2":
                message = "Foreign key constraint failed";
                break;
        }

        return res.status(400).json({
            status: "error",
            type: "database",
            message
        });
    }

    // Auth errors and others
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message
        });
    }

    // Default to 500 server error
    res.status(500).json({
        status: "error",
        message: "Internal server error",
        code: err.code || "INTERNAL_ERROR"
    });
}
