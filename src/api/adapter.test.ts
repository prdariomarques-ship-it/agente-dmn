import { describe, expect, it, beforeEach } from "vitest";
import { DARIUSUIAdapter } from "./adapter.js";
import { TaskEngine } from "../core/engine.js";
import { InMemoryMemoryStore } from "../memory/engine.js";
import { SimpleToolEngine } from "../tools/engine.js";
import { Agent } from "../core/types.js";

describe("DARIUSUIAdapter", () => {
  let adapter: DARIUSUIAdapter;
  let taskEngine: TaskEngine;

  const dummyAgent: Agent = {
    id: "ui-agent",
    name: "UI Agent",
    observe: async () => "observed UI",
    think: async () => {
      // Add artificial delay to give us time to pause
      await new Promise(r => setTimeout(r, 50));
      return "thinking UI";
    },
    act: async (t, ctx) => {
      if (ctx.iterations === 1) return "DONE: UI Done";
      return "acted";
    }
  };

  beforeEach(() => {
    taskEngine = new TaskEngine(undefined, { maxIterations: 5 });
    taskEngine.registerAgent(dummyAgent);
    const memory = new InMemoryMemoryStore();
    const tools = new SimpleToolEngine();

    adapter = new DARIUSUIAdapter(taskEngine, memory, tools);
  });

  it("should capture execution logs when a task runs", async () => {
    const task = taskEngine.createTask("UI Test");

    // We expect the adapter to capture TASK_CREATED event immediately
    const metricsBefore = adapter.getDashboardMetrics();
    expect(metricsBefore.recentActivities.length).toBeGreaterThan(0);
    expect(metricsBefore.recentActivities[0].payload.objective).toBe("UI Test");

    await taskEngine.executeTask(task.id, dummyAgent.id);

    const metricsAfter = adapter.getDashboardMetrics();
    // Should have captured Observe, Think, Act, Done, etc.
    const activities = metricsAfter.recentActivities;

    const hasObserve = activities.some(a => a.eventType === "OBSERVE");
    const hasThink = activities.some(a => a.eventType === "THINK");
    const hasAct = activities.some(a => a.eventType === "ACT");

    expect(hasObserve).toBe(true);
    expect(hasThink).toBe(true);
    expect(hasAct).toBe(true);

    const hasFinished = activities.some(a => a.eventType === "FINISHED");
    expect(hasFinished).toBe(true);
  });

  it("should not expose mocked data in dashboard metrics", () => {
    const metrics = adapter.getDashboardMetrics();
    expect(metrics.health.status).toBe("UNKNOWN");
    expect(metrics.health.latencyMs).toBeUndefined();
    expect(metrics.health.memoryUsageMB).toBeUndefined();
    expect(metrics.activeAgents).toBeUndefined();
    expect(metrics.pausedAgents).toBeUndefined();
  });

  it("should correctly associate tasks strictly by agentId", async () => {
    const task = taskEngine.createTask("Agent Assoc Test");
    await taskEngine.executeTask(task.id, dummyAgent.id);

    const agentDetails = adapter.getAgentDetails(dummyAgent.id);
    expect(agentDetails).toBeDefined();

    // Explicitly confirm it is NOT returning mocked skills array
    expect(agentDetails?.skillsAttached).toEqual([]);

    expect(agentDetails?.recentTasks.length).toBe(1);
    expect(agentDetails?.recentTasks[0].id).toBe(task.id);
  });

  it("should support pause and resume for human approval", async () => {
    const task = taskEngine.createTask("Approval Test");

    // We start execution, but immediately pause it
    const execPromise = taskEngine.executeTask(task.id, dummyAgent.id);

    // Slight delay to ensure it's in RUNNING state but caught before completion
    await new Promise(r => setTimeout(r, 10));
    adapter.pauseTask(task.id);

    const state = adapter.getTaskState(task.id);
    expect(state?.status).toBe("PAUSED");

    adapter.resumeTask(task.id);
    const finishedTask = await execPromise;
    expect(finishedTask.status).toBe("COMPLETED");
  });
});
