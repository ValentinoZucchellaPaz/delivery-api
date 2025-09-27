import request from "supertest";
import app from '../app.js'

describe("Server basic health", () => {
    it("should respond to GET / with 200", async () => {
        const res = await request(app).get("/");
        expect(res.status).toBe(200);
    });
});
