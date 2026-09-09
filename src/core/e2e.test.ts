import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { SQLitePersistentStore } from "./sqlite.js";
import { TaskEngine } from "./engine.js";
import { AutonomousAgent } from "./agent.js";
import { SimpleContextEngine } from "../context/engine.js";
import { InMemoryMemoryStore } from "../memory/engine.js";
import { SimpleModelRouter } from "../model/router.js";
import { MockModelProvider } from "../model/engine.js";
import fs from "fs";

describe("DARIUS End-to-End Execution Flow", () => {
  const dbPath = "e2e-persistence.db";
  let store: SQLitePersistentStore;
  let taskEngine: TaskEngine;
  let memory: InMemoryMemoryStore;
  let contextEngine: SimpleContextEngine;
  let router: SimpleModelRouter;
  let mockProvider: MockModelProvider;
  let agent: AutonomousAgent;

  beforeEach(() => {
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    // 1. Initialize Persistence (Task & Execution)
    store = new SQLitePersistentStore(dbPath);
    taskEngine = new TaskEngine(store, { maxIterations: 5 });

    // 2. Initialize Memory & Context
    memory = new InMemoryMemoryStore();
    contextEngine = new SimpleContextEngine(memory, {
      maxTokens: 1000,
      includeHistory: true,
      maxHistorySteps: 3,
      relevanceThreshold: 0
    }, "System: You are an autonomous E2E agent.");

    // 3. Initialize Model Router & Provider
    router = new SimpleModelRouter();
    mockProvider = new MockModelProvider();
    router.registerProvider(mockProvider);

    // 4. Assemble the Agent
    agent = new AutonomousAgent("e2e-agent", "E2E LLM Agent", contextEngine, router);
    taskEngine.registerAgent(agent);
  });

  afterEach(() => {
    store.close();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it("should complete a full execution flow: Objective -> Context -> Model -> Checkpoint -> Persistence", async () => {
    // Inject a memory to prove memory routing works
    await memory.save({ type: "SEMANTIC", content: "Secret code is 42", relevanceScore: 0.9 });

    // Create a Task that will trigger the 'DONE' condition in our MockModelProvider
    const task = taskEngine.createTask("Test Objective DONE");

    // Execute the E2E flow
    const finishedTask = await taskEngine.executeTask(task.id, agent.id);

    // Assertions on final state
    expect(finishedTask.status).toBe("COMPLETED");
    expect(finishedTask.result).toContain("Task complete");

    // Verify Checkpointing & Persistence
    const executions = store.getByTaskId(task.id);
    expect(executions.length).toBe(1);

    const exec = executions[0];
    expect(exec.state).toBe("DONE");

    // Validate history contains the Observe, Think, Act phases
    const states = exec.history.map(h => h.state);
    expect(states).toContain("OBSERVE");
    expect(states).toContain("THINK");
    expect(states).toContain("ACT");

    // The outputs should come directly from the LLM Mock
    const thinkStep = exec.history.find(h => h.state === "THINK");
    expect(thinkStep?.output).toContain("Simulated response based on context.");
  });
});
