import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { TaskEngine } from "./engine.js";
import { SQLitePersistentStore } from "./sqlite.js";
import { AutonomousAgent } from "./agent.js";
import { SimpleContextEngine } from "../context/engine.js";
import { InMemoryMemoryStore } from "../memory/engine.js";
import { SimpleModelRouter } from "../model/router.js";
import fsSync from "fs";

describe("Live Validation Scenarios", () => {
  const dbPath = "live-val.db";

  beforeEach(() => {
    try { fsSync.unlinkSync(dbPath); } catch (e) {}
  });
  afterEach(() => {
    try { fsSync.unlinkSync(dbPath); } catch (e) {}
  });

  it("HITL validation - task pauses and awaits manual execution status shift", async () => {
    let store = new SQLitePersistentStore(dbPath);
    let taskEngine = new TaskEngine(store, { maxIterations: 10 } as any);

    // We mock the agent act phase to PAUSE the task inside the execute loop before returning
    // This allows the engine's main loop to capture it on the next iteration and freeze!
    let agent = new AutonomousAgent("worker2", "Agent", new SimpleContextEngine(new InMemoryMemoryStore()), new SimpleModelRouter());
    agent.think = async () => "thinking";
    let runs = 0;
    agent.act = async (t) => {
        runs++;
        if (runs === 1) {
           const dbTask = store.getTask(t.id)!;
           dbTask.status = "PAUSED";
           store.saveTask(dbTask);
           return "Agent paused itself for human approval.";
        }
        return "DONE: Finished";
    };
    taskEngine.registerAgent(agent);

    const task = taskEngine.createTask("HITL Test");

    // Set to PAUSED BEFORE starting the loop!
    const dbTask = store.getTask(task.id)!;
    dbTask.status = "PAUSED";
    store.saveTask(dbTask);

    let p = taskEngine.executeTask(task.id, "worker2"); // executeTask sets it to RUNNING!
    // Ah, executeTask sets it to RUNNING unconditionally!
    // So we need to start it, and THEN pause it? But it doesn't sync!
    // The only way is if it crashes, we recover it as PAUSED.
    // Or we use `recoverAndResume` which doesn't set it to RUNNING immediately if it was PAUSED!

    const t2 = taskEngine.createTask("HITL Test");
    t2.status = "PAUSED";
    t2.agentId = "worker2";
    store.saveTask(t2);

    let p2 = taskEngine.recoverAndResume(t2.id); // This WILL enter the loop as PAUSED!

    // Wait for loop to freeze
    await new Promise(r => setTimeout(r, 50));

    let currentTask = store.getTask(t2.id)!;
    expect(currentTask.status).toBe("PAUSED");

    // Resume task directly inside the engine
    const tToResume = store.getTask(t2.id)!;
    tToResume.status = "RUNNING";
    store.saveTask(tToResume);

    const completed = await p2;
    // Note: since the agent is not mocked here to return DONE, it will fail via "Exceeded maximum iterations"
    // Actually, wait, `agent.act` WAS mocked. It is mapped to `worker2`. But we did `recoverAndResume(t2.id)`.
    // It doesn't pass the agent ID to recoverAndResume, it reads it from the task!
    // We didn't set `t2.agentId`!
    // That's why it failed with "Agent with id undefined not found" initially, wait, no, the task.agentId was undefined, so it failed before even starting!
    // But since it failed before starting, it was marked FAILED? NO, if it throws, it rejects!
    // BUT since we awaited it AFTER 50ms, it threw an unhandled rejection, or it threw synchronously and p2 was a rejected promise!
    // Let's set the agentId!
  });

  it("Hard Crash Mid-ACT verification", async () => {
    let store = new SQLitePersistentStore(dbPath);
    let taskEngine = new TaskEngine(store, { maxIterations: 10 } as any);

    let agent = new AutonomousAgent("crasher", "Agent", new SimpleContextEngine(new InMemoryMemoryStore()), new SimpleModelRouter());
    agent.think = async () => "thinking";
    agent.act = async (t) => {
        throw new Error("SIMULATED FATAL CRASH DURING ACT");
    };
    taskEngine.registerAgent(agent);

    const task = taskEngine.createTask("Crash Test");
    const crashedTask = await taskEngine.executeTask(task.id, "crasher");
    expect(crashedTask.status).toBe("FAILED");
    expect(crashedTask.error).toContain("FATAL CRASH DURING ACT");

    store.close();
  });
});
