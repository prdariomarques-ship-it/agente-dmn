import { Agent, Task, TaskExecution } from "./types.js";
import { ContextEngine } from "../context/types.js";
import { ModelRouter } from "../model/types.js";

/**
 * AutonomousAgent represents an end-to-end connected Agent that implements the
 * Observe -> Think -> Act loop using the canonical DARIUS components:
 * It pulls Context from the ContextEngine and generates responses via the ModelRouter.
 */
export class AutonomousAgent implements Agent {
  public id: string;
  public name: string;

  constructor(
    id: string,
    name: string,
    private contextEngine: ContextEngine,
    private modelRouter: ModelRouter,
    public description?: string
  ) {
    this.id = id;
    this.name = name;
  }

  async observe(task: Task, context: TaskExecution): Promise<string> {
    // In Phase 5/6, Observe might involve pulling from tools/browser directly.
    // For now, it compiles the environmental state.
    const compiled = await this.contextEngine.buildContext(task, context, "observation");

    // We can query the LLM to summarize the observation, or just return basic state.
    // To save tokens, we simply return the system's current awareness.
    return `Agent ${this.name} initialized observe cycle ${context.iterations}.`;
  }

  async think(task: Task, context: TaskExecution): Promise<string> {
    // Build the context prompt
    const compiledContext = await this.contextEngine.buildContext(task, context, "planning");

    // Use the model to reason about the next step
    const response = await this.modelRouter.route({
      context: compiledContext,
      temperature: 0.7, // Higher temp for creative thinking
    });

    return response.text;
  }

  async act(task: Task, context: TaskExecution): Promise<string> {
    // Build context with strict intent to generate an action/tool call
    const compiledContext = await this.contextEngine.buildContext(task, context, "action");

    // In a future tool implementation, we would append Tool schemas to the context here
    const response = await this.modelRouter.route({
      context: compiledContext,
      temperature: 0.2, // Lower temp for deterministic tool calling/actions
    });

    // If the model decides the objective is met, it should output DONE: <result>
    return response.text;
  }
}
