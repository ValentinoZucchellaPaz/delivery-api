import db from "../config/db.js";

describe("Database connection", () => {
  it("should connect and run a simple query", async () => {
    console.log("DB_HOST:", process.env.DB_HOST);
    console.log("DB_PORT:", process.env.DB_PORT);
    console.log("Attempting to connect to DB...");
    try {
      const { rows } = await db.query("SELECT 1 as result");
      console.log("Query result:", rows);
      expect(rows[0].result).toBe(1);
    } catch (err) {
      console.error("DB connection error:", err);
      throw err;
    }
  });

  afterAll(async () => {
    await db.end(); // close pool
  });
});
