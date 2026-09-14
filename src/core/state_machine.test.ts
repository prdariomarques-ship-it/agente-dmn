import { describe, it, expect, vi } from "vitest";
import { TaskEngine } from "./engine.js";
import { SQLitePersistentStore } from "./sqlite.js";
import { Task } from "./types.js";
import { InMemoryMemoryStore } from "../memory/engine.js";

describe("DARIUS Core State Machine", () => {
  const store = new SQLitePersistentStore(":memory:");
  const engine = new TaskEngine(store, {} as any, undefined, undefined, new InMemoryMemoryStore());

  it("should not allow resuming a cancelled task", async () => {
    const task = engine.createTask("Test Cancel", "Context");
    engine.cancelTask(task.id);

    const dbTask = store.getTask(task.id)!;
    expect(dbTask.status).toBe("CANCELLED");

    expect(() => engine.resumeTask(task.id)).toThrowError("terminal");
  });

  it("should not allow rejecting a completed task", async () => {
    const task = engine.createTask("Test Complete", "Context");
    task.status = "COMPLETED";
    store.saveTask(task);

    expect(() => engine.rejectTask(task.id, "reason")).toThrowError("Cannot reject a terminal task");
  });
});
