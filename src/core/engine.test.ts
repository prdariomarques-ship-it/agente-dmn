import { describe, expect, it, beforeEach } from "vitest";
import { TaskEngine, InMemoryTaskStore } from "./engine.js";
import { Agent, Task } from "./types.js";

describe("TaskEngine", () => {
  let engine: TaskEngine;
  let store: InMemoryTaskStore;

  const dummyAgent: Agent = {
    id: "agent-1",
    name: "Dummy Agent",
    execute: async (task: Task) => {
      if (task.objective.includes("fail")) {
        throw new Error("Simulated agent failure");
      }
      return `Executed: ${task.objective}`;
    },
  };

  beforeEach(() => {
    store = new InMemoryTaskStore();
    engine = new TaskEngine(store);
    engine.registerAgent(dummyAgent);
  });

  it("should create a pending task", () => {
    const task = engine.createTask("Test objective", "Test context");

    expect(task.id).toBeDefined();
    expect(task.objective).toBe("Test objective");
    expect(task.context).toBe("Test context");
    expect(task.status).toBe("PENDING");

    const storedTask = store.get(task.id);
    expect(storedTask).toEqual(task);
  });

  it("should execute a task successfully", async () => {
    const task = engine.createTask("Test successful objective");

    const executedTask = await engine.executeTask(task.id, dummyAgent.id);

    expect(executedTask.status).toBe("COMPLETED");
    expect(executedTask.result).toBe("Executed: Test successful objective");
    expect(executedTask.agentId).toBe(dummyAgent.id);
    expect(executedTask.error).toBeUndefined();
  });

  it("should handle task execution failure", async () => {
    const task = engine.createTask("This should fail");

    const executedTask = await engine.executeTask(task.id, dummyAgent.id);

    expect(executedTask.status).toBe("FAILED");
    expect(executedTask.result).toBeUndefined();
    expect(executedTask.error).toBe("Simulated agent failure");
  });

  it("should cancel a pending task", () => {
    const task = engine.createTask("To be cancelled");

    const cancelledTask = engine.cancelTask(task.id);

    expect(cancelledTask.status).toBe("CANCELLED");
  });

  it("should not allow cancelling a completed task", async () => {
    const task = engine.createTask("Complete me first");
    await engine.executeTask(task.id, dummyAgent.id);

    expect(() => engine.cancelTask(task.id)).toThrowError(/Cannot cancel a task that has already finished/);
  });

  it("should not allow executing a cancelled task", async () => {
    const task = engine.createTask("To be cancelled and executed");
    engine.cancelTask(task.id);

    await expect(engine.executeTask(task.id, dummyAgent.id)).rejects.toThrowError(/Cannot execute a cancelled task/);
  });
});
