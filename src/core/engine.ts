import { randomUUID } from "node:crypto";
import { Agent, Task, TaskStatus, TaskStore } from "./types.js";

export class InMemoryTaskStore implements TaskStore {
  private tasks: Map<string, Task> = new Map();

  save(task: Task): void {
    this.tasks.set(task.id, { ...task });
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(): Task[] {
    return Array.from(this.tasks.values());
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}

export class TaskEngine {
  private store: TaskStore;
  private agents: Map<string, Agent> = new Map();

  constructor(store?: TaskStore) {
    this.store = store || new InMemoryTaskStore();
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  createTask(objective: string, context?: string): Task {
    const task: Task = {
      id: randomUUID(),
      objective,
      status: "PENDING",
      context,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.save(task);
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.store.get(id);
  }

  async executeTask(taskId: string, agentId: string): Promise<Task> {
    const task = this.store.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    if (task.status === "CANCELLED") {
      throw new Error(`Cannot execute a cancelled task`);
    }
    if (task.status === "COMPLETED") {
      throw new Error(`Cannot execute a completed task`);
    }
    if (task.status === "RUNNING") {
      throw new Error(`Task is already running`);
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    // Transition to RUNNING
    task.status = "RUNNING";
    task.agentId = agent.id;
    task.updatedAt = new Date();
    this.store.save(task);

    try {
      const result = await agent.execute(task);
      // Transition to COMPLETED
      task.status = "COMPLETED";
      task.result = result;
      task.updatedAt = new Date();
    } catch (error) {
      // Transition to FAILED
      task.status = "FAILED";
      task.error = error instanceof Error ? error.message : String(error);
      task.updatedAt = new Date();
    }

    this.store.save(task);
    return task;
  }

  cancelTask(taskId: string): Task {
    const task = this.store.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    if (task.status === "COMPLETED" || task.status === "FAILED") {
      throw new Error(`Cannot cancel a task that has already finished`);
    }

    task.status = "CANCELLED";
    task.updatedAt = new Date();
    this.store.save(task);
    return task;
  }
}
