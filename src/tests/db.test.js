import db from "../config/db.js";

async function waitForDb(maxTries = 30) {
  for (let i = 0; i < maxTries; i++) {
    try {
      await db.query("SELECT 1");
      return;
    } catch (e) {
      console.log("DB not ready yet, retrying...", e);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("Database not ready after waiting");
}

describe("Database connection", () => {
  it("should connect and run a simple query", async () => {
    console.log("DB_HOST:", process.env.DB_HOST);
    console.log("DB_PORT:", process.env.DB_PORT);
    console.log("Attempting to connect to DB...");
    await waitForDb();
    const { rows } = await db.query("SELECT 1 as result");
    expect(rows[0].result).toBe(1);
  });

  afterAll(async () => {
    await db.end(); // close pool
  });
});
