import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, engine, store } from "./server.js";

describe("API Security and Contract Tests", () => {
    it("should return 404 for nonexistent tasks", async () => {
        const res = await request(app).get("/api/tasks/invalid-id");
        expect(res.status).toBe(404);
    });

    it("should block invalid state transitions on approval", async () => {
        const task = engine.createTask("Complete Task", "Ctx");
        task.status = "COMPLETED";
        store.saveTask(task);

        const res = await request(app).post(`/api/tasks/${task.id}/approve`);
        expect(res.status).toBe(400);
        expect(res.body.error).toContain("terminal");
    });

    it("should allow resuming a paused task", async () => {
        const task = engine.createTask("Paused Task", "Ctx");
        task.status = "PAUSED";
        store.saveTask(task);

        const res = await request(app).post(`/api/tasks/${task.id}/approve`);
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
