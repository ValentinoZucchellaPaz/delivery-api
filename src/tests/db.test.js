import db from "../config/db.js";

describe("Database connection", () => {
    it("should connect and run a simple query", async () => {
        const { rows } = await db.query("SELECT 1 as result");
        expect(rows[0].result).toBe(1);
    });

    afterAll(async () => {
        await db.end(); // close pool
    });
});
