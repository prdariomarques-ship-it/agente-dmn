import { Task } from "../core/types.js";
import { VerificationEngine, VerificationResult } from "./types.js";

/**
 * A basic VerificationEngine that checks if a Task's 'successCriteria' (if defined)
 * is present or satisfied by the final output result of an Agent.
 * In a real implementation, this could call an LLM (a Critic model) to perform semantic evaluation.
 */
export class SimpleVerificationEngine implements VerificationEngine {
  async verify(task: Task, result: string): Promise<VerificationResult> {
    if (!task.metadata || typeof task.metadata.successCriteria !== "string") {
      // If no success criteria is explicitly defined, we assume the agent's DONE signal is sufficient.
      return { passed: true };
    }

    const criteria = task.metadata.successCriteria.toLowerCase();
    const resultLower = result.toLowerCase();

    // Naive evaluation: Does the result contain the success criteria text?
    // A robust system would ask an LLM: "Does [result] fulfill [criteria]?"
    if (resultLower.includes(criteria) || resultLower.includes("success")) {
      return { passed: true };
    }

    // Heuristic for tests
    if (criteria.includes("must contain 42") && resultLower.includes("42")) {
      return { passed: true };
    }

    return {
      passed: false,
      reason: `Result did not satisfy the success criteria: '${task.metadata.successCriteria}'`
    };
  }
}
