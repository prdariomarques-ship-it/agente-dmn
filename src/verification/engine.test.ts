import { describe, expect, it } from "vitest";
import { SimpleVerificationEngine } from "./engine.js";
import { Task } from "../core/types.js";

describe("SimpleVerificationEngine", () => {
  const verifier = new SimpleVerificationEngine();

  const dummyTask: Task = {
    id: "task-verify",
    objective: "Do a thing",
    status: "RUNNING",
    createdAt: new Date(),
    updatedAt: new Date()
  };

  it("should pass automatically if no success criteria is provided", async () => {
    const result = await verifier.verify(dummyTask, "I did a thing");
    expect(result.passed).toBe(true);
  });

  it("should pass if the result satisfies the success criteria text", async () => {
    const taskWithCriteria: Task = {
      ...dummyTask,
      metadata: { successCriteria: "The secret code must contain 42" }
    };

    // Heuristic string matching built into the SimpleVerifier MVP
    const result = await verifier.verify(taskWithCriteria, "The answer is 42");
    expect(result.passed).toBe(true);
  });

  it("should fail if the result does not satisfy the criteria", async () => {
    const taskWithCriteria: Task = {
      ...dummyTask,
      metadata: { successCriteria: "must contain 42" }
    };

    const result = await verifier.verify(taskWithCriteria, "The answer is banana");
    expect(result.passed).toBe(false);
    expect(result.reason).toContain("did not satisfy the success criteria");
  });
});
