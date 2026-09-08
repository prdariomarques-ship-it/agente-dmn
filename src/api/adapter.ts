import { TaskEngine } from "../core/engine.js";
import { EngineEvent, EngineObserver } from "../core/types.js";
import { MemoryStore } from "../memory/types.js";
import { ToolEngine } from "../tools/types.js";
import { DashboardMetrics, ExecutionLogEntry, TaskExecutionUIState, MemoryManagerUIState } from "./contracts.js";

export class DARIUSUIAdapter implements EngineObserver {
  private logs: ExecutionLogEntry[] = [];

  constructor(
    private taskEngine: TaskEngine,
    private memoryStore: MemoryStore,
    private toolEngine: ToolEngine
  ) {
    this.taskEngine.subscribe(this);
  }

  onEvent(event: EngineEvent): void {
    let eventType: ExecutionLogEntry["eventType"] = "PENDING";
    let status: ExecutionLogEntry["status"] = "SUCCESS";

    switch (event.type) {
      case "TASK_CREATED": eventType = "PENDING"; break;
      case "STATE_CHANGED":
        if (event.payload.state === "OBSERVE") eventType = "OBSERVE";
        else if (event.payload.state === "THINK") eventType = "THINK";
        else if (event.payload.state === "ACT") eventType = "ACT";
        else if (event.payload.state === "ERROR") { eventType = "ERROR"; status = "FAILED"; }
        else if (event.payload.state === "WAITING_APPROVAL") { eventType = "APPROVAL_REQUEST"; status = "PENDING"; }
        else eventType = "PENDING";
        break;
      case "TASK_COMPLETED": eventType = "PENDING"; break;
      case "TASK_FAILED": eventType = "ERROR"; status = "FAILED"; break;
      case "APPROVAL_REQUESTED": eventType = "APPROVAL_REQUEST"; status = "PENDING"; break;
    }

    this.logs.unshift({
      id: Math.random().toString(36).substring(7),
      taskId: event.taskId,
      executionId: event.taskId, // Simplified for now
      timestamp: event.timestamp,
      eventType,
      status,
      payload: event.payload
    });

    // Keep only last 100 logs
    if (this.logs.length > 100) this.logs.pop();
  }

  getDashboardMetrics(): DashboardMetrics {
    // In a real scenario, these would be aggregated from DB/Stores
    return {
      totalAgents: 1, // Hardcoded placeholder until Agent registry is expanded
      activeAgents: 1,
      pausedAgents: 0,
      tasks: {
        active: this.logs.filter(l => l.eventType !== "PENDING" && l.eventType !== "ERROR").length,
        completed: 0, // Placeholder
        failed: this.logs.filter(l => l.eventType === "ERROR").length
      },
      health: {
        status: "HEALTHY",
        latencyMs: 15,
        memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024
      },
      recentActivities: this.logs.slice(0, 10)
    };
  }

  getTaskState(taskId: string): TaskExecutionUIState | null {
    const task = this.taskEngine.getTask(taskId);
    if (!task) return null;

    const taskLogs = this.logs.filter(l => l.taskId === taskId).reverse();

    // We would map history here, simplifying for adapter
    return {
      taskId: task.id,
      objective: task.objective,
      status: task.status,
      currentState: "IDLE", // Would be derived from latest log
      iterations: 0,
      trace: task.metadata?.executionHistory as any || []
    };
  }

  pauseTask(taskId: string): void {
    this.taskEngine.pauseForApproval(taskId);
  }

  resumeTask(taskId: string): void {
    this.taskEngine.resumeTask(taskId);
  }
}
