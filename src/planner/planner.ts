import { randomUUID } from "node:crypto";
import { Planner, TaskGraph, TaskDependency } from "./types.js";
import { Task } from "../core/types.js";

// A basic planner that handles sequential/parallel tasks by relying on a supplied function
// In the future, this would be backed by an LLM parsing the objective into tasks
export class SimplePlanner implements Planner {
  constructor(private engine: { createTask(obj: string): Task }) {}

  async plan(objective: string): Promise<TaskGraph> {
    // For now, MVP: 1 objective = 1 task with no dependencies
    // To allow testing complex graphs, users can inject tasks/dependencies manually after plan
    const task = this.engine.createTask(objective);

    return {
      id: randomUUID(),
      objective,
      tasks: [task],
      dependencies: [],
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  getNextExecutableTasks(graph: TaskGraph): Task[] {
    const executable: Task[] = [];
    const _completedOrFailed = new Set(
      graph.tasks
        .filter(t => t.status === "COMPLETED" || t.status === "FAILED" || t.status === "CANCELLED")
        .map(t => t.id)
    );

    for (const task of graph.tasks) {
      if (task.status !== "PENDING") {
        continue;
      }

      // Check if all dependencies are satisfied (COMPLETED)
      const dependencies = graph.dependencies.filter(d => d.taskId === task.id);
      const allDepsMet = dependencies.every(d => {
        const depTask = graph.tasks.find(t => t.id === d.dependsOnId);
        return depTask && depTask.status === "COMPLETED";
      });

      if (allDepsMet) {
        executable.push(task);
      }
    }

    return executable;
  }

  updateGraphStatus(graph: TaskGraph): void {
    if (graph.tasks.length === 0) {
      graph.status = "COMPLETED";
      return;
    }

    const allCompleted = graph.tasks.every(t => t.status === "COMPLETED");
    if (allCompleted) {
      graph.status = "COMPLETED";
      return;
    }

    const anyFailed = graph.tasks.some(t => t.status === "FAILED" || t.status === "CANCELLED");
    const anyRunningOrCompleted = graph.tasks.some(t => t.status === "RUNNING" || t.status === "COMPLETED");

    if (anyFailed) {
      graph.status = "FAILED";
      // We could also do PARTIAL if some succeeded, but strict for now
    } else if (anyRunningOrCompleted) {
      graph.status = "RUNNING";
    } else {
      graph.status = "PENDING";
    }
  }
}
