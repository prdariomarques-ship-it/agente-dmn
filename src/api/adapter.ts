import { TaskEngine } from "../core/engine.js";
import { TelemetryEmitter } from "../observability/types.js";
import { EngineEvent, EngineObserver } from "../core/types.js";
import { MemoryStore } from "../memory/types.js";
import { ToolEngine } from "../tools/types.js";
import { DashboardMetrics, ExecutionLogEntry, TaskExecutionUIState, MemoryManagerUIState, AgentDetail, SkillUI } from "./contracts.js";

export class DARIUSUIAdapter implements EngineObserver {
  private logs: ExecutionLogEntry[] = [];

  constructor(
    private taskEngine: TaskEngine,
    private memoryStore: MemoryStore,
    private toolEngine: ToolEngine,
    private telemetry?: TelemetryEmitter
  ) {
    this.taskEngine.subscribe(this);
    if (this.telemetry) {
      this.telemetry.subscribe((event) => {
         // Map TelemetryEvent to ExecutionLogEntry
         this.logs.unshift({
           id: event.id,
           taskId: event.taskId,
           executionId: event.executionId || event.taskId,
           timestamp: event.timestamp,
           eventType: event.eventType as any,
           status: event.eventType.includes("FAILED") ? "FAILED" : "SUCCESS",
           payload: event.payload
         });
         if (this.logs.length > 100) this.logs.pop();
      });
    }
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
        else if (event.payload.state === "VERIFY") eventType = "VERIFY";
        else if (event.payload.state === "DONE") eventType = "DONE";
        else if (event.payload.state === "ERROR") { eventType = "ERROR"; status = "FAILED"; }
        else if (event.payload.state === "WAITING_APPROVAL") { eventType = "APPROVAL_REQUEST"; status = "PENDING"; }
        else eventType = "PENDING";
        break;
      case "TASK_COMPLETED": eventType = "DONE"; break;
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
    // Assuming tasks can be derived from logs since TaskEngine doesn't expose listTasks
    const activeTasksIds = new Set(this.logs.filter(l => l.eventType !== "DONE" && l.eventType !== "ERROR").map(l => l.taskId));
    const completedTasksIds = new Set(this.logs.filter(l => l.eventType === "DONE").map(l => l.taskId));
    const failedTasksIds = new Set(this.logs.filter(l => l.eventType === "ERROR").map(l => l.taskId));

    const activeTasksCount = activeTasksIds.size;
    const completedTasksCount = completedTasksIds.size;
    const failedTasksCount = failedTasksIds.size;

    const agents = this.taskEngine.getAgents();

    return {
      totalAgents: agents.length,
      activeAgents: agents.length, // Simplify: all registered agents are active
      pausedAgents: 0,
      tasks: {
        active: activeTasksCount,
        completed: completedTasksCount,
        failed: failedTasksCount
      },
      health: {
        status: "HEALTHY",
        latencyMs: 15,
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      recentActivities: this.logs.slice(0, 10)
    };
  }

  getTaskState(taskId: string): TaskExecutionUIState | null {
    const task = this.taskEngine.getTask(taskId);
    if (!task) return null;

    const taskLogs = this.logs.filter(l => l.taskId === taskId);
    const executionHistories = Array.isArray(task.metadata?.executionHistory) ? task.metadata?.executionHistory : [];

    let currentState: TaskExecutionUIState["currentState"] = "IDLE";
    if (taskLogs.length > 0) {
       // Latest state from logs
       const latestStateEvent = taskLogs.find(l =>
          l.eventType === "OBSERVE" || l.eventType === "THINK" || l.eventType === "ACT" ||
          l.eventType === "VERIFY" || l.eventType === "APPROVAL_REQUEST" || l.eventType === "ERROR" || l.eventType === "DONE"
       );

       if (latestStateEvent) {
          if (latestStateEvent.eventType === "APPROVAL_REQUEST") currentState = "WAITING_APPROVAL";
          else if (latestStateEvent.eventType === "DONE") currentState = "DONE";
          else currentState = latestStateEvent.eventType as any;
       }
    }

    return {
      taskId: task.id,
      objective: task.objective,
      status: task.status,
      currentState: currentState,
      iterations: typeof task.metadata?.iterations === 'number' ? task.metadata.iterations : 0,
      trace: executionHistories as any || []
    };
  }

  pauseTask(taskId: string): void {
    this.taskEngine.pauseForApproval(taskId);
  }

  resumeTask(taskId: string): void {
    this.taskEngine.resumeTask(taskId);
  }

  getAgentDetails(agentId: string): AgentDetail | null {
    const agents = this.taskEngine.getAgents();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return null;

    const recentTaskIds = new Set(this.logs.filter(l => l.payload?.agentId === agentId || l.eventType === "OBSERVE" || l.eventType === "ACT").map(l => l.taskId));
    const recentTasks = Array.from(recentTaskIds).map(id => this.taskEngine.getTask(id)).filter(Boolean) as any[];

    return {
      ...agent,
      toolsAttached: this.toolEngine.listTools ? this.toolEngine.listTools() as any : [],
      skillsAttached: [], // Skills engine not yet directly integrated into adapter
      recentTasks
    };
  }

  async getMemoryManagerUIState(): Promise<MemoryManagerUIState> {
    // Note: this implementation requires async but adapter methods might be used synchronously by the UI depending on the framework.
    // We provide a best-effort async method mapping to the store.
    const shortTerm = await this.memoryStore.search({ type: "SHORT_TERM" });
    const session = await this.memoryStore.search({ type: "SESSION" });
    const longTerm = await this.memoryStore.search({ type: "LONG_TERM" });

    const all = [...shortTerm, ...session, ...longTerm].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      stats: {
        shortTermCount: shortTerm.length,
        sessionCount: session.length,
        longTermCount: longTerm.length
      },
      recentEntries: all.slice(0, 50)
    };
  }

  getSkillsDirectory(): SkillUI[] {
    return []; // Placeholder for Skills Engine integration.
  }
}
