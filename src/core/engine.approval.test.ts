import { describe, it, expect } from "vitest";
import { TaskEngine, InMemoryTaskStore } from "./engine.js";
import { Agent, Task, TaskExecution } from "./types.js";

/**
 * Regression tests for the approval-gate state-aliasing bug.
 *
 * Before the minimal core patch, an agent that paused its own task inside
 * `act()` was invisible to the execution loop (stale local Task reference),
 * causing the loop to re-run the agent instead of parking in
 * WAITING_APPROVAL. No RC1 test exercised pauseForApproval while a loop was
 * active — these tests close that gap.
 */

class SelfPausingAgent implements Agent {
  id = "self-pausing";
  name = "Self Pausing Agent";
  description = "pauses its own task during act and finalizes after approval";
  public actCalls = 0;

  async observe(): Promise<string> { return "observe"; }
  async think(): Promise<string> { return "think"; }

  async act(task: Task): Promise<string> {
    this.actCalls += 1;
    if (this.actCalls === 1) {
      // First pass: do the work, then park for approval.
      task.metadata = { ...task.metadata, draft: "ready" };
      (this.engine as TaskEngine).pauseForApproval(task.id);
      return "PAUSED_FOR_APPROVAL: draft";
    }
    // Second pass (after resume): finalize.
    return "DONE: finalized";
  }

  constructor(private engine: TaskEngine) {}
}

describe("TaskEngine approval gate (regression)", () => {
  it("parks a running task in PAUSED/WAITING_APPROVAL when the agent pauses itself, then resumes to completion", async () => {
    const engine = new TaskEngine(new InMemoryTaskStore());
    const agent = new SelfPausingAgent(engine);
    engine.registerAgent(agent);

    const task = engine.createTask("needs approval");
    const executionPromise = engine.executeTask(task.id, agent.id, 5000);

    // Wait until the agent parks the task.
    for (let i = 0; i < 200; i++) {
      const t = engine.getTask(task.id);
      if (t?.status === "PAUSED") break;
      await new Promise(r => setTimeout(r, 10));
    }
    const parked = engine.getTask(task.id);
    expect(parked?.status).toBe("PAUSED");

    // The loop must NOT have re-run act while waiting for the human.
    expect(agent.actCalls).toBe(1);

    engine.resumeTask(task.id);
    const done = await executionPromise;
    expect(done.status).toBe("COMPLETED");
    expect(done.result).toBe("finalized");
    expect(agent.actCalls).toBe(2);
  }, 10000);

  it("rejectTask fails the parked task with an explicit REJECTED error", async () => {
    const engine = new TaskEngine(new InMemoryTaskStore());
    const agent = new SelfPausingAgent(engine);
    engine.registerAgent(agent);

    const task = engine.createTask("needs approval");
    const executionPromise = engine.executeTask(task.id, agent.id, 5000);

    for (let i = 0; i < 200; i++) {
      const t = engine.getTask(task.id);
      if (t?.status === "PAUSED") break;
      await new Promise(r => setTimeout(r, 10));
    }
    expect(agent.actCalls).toBe(1);

    engine.rejectTask(task.id, "human said no");
    const done = await executionPromise;
    expect(done.status).toBe("FAILED");
    expect(done.error).toMatch(/REJECTED: human said no/);
  }, 10000);
});
