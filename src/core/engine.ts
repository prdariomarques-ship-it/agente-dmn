import { randomUUID } from "node:crypto";
import { Agent, EngineEvent, EngineObserver, ExecutionState, ExecutionStep, Task, TaskExecution, TaskStatus, TaskStore } from "./types.js";

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
  private maxIterations = 10;
  private observers: EngineObserver[] = [];

  constructor(store?: TaskStore, config?: { maxIterations?: number }) {
    this.store = store || new InMemoryTaskStore();
    if (config?.maxIterations) {
      this.maxIterations = config.maxIterations;
    }
  }

  subscribe(observer: EngineObserver) {
    this.observers.push(observer);
  }

  private emit(event: EngineEvent) {
    for (const obs of this.observers) {
      try { obs.onEvent(event); } catch (e) { console.error("Observer error", e); }
    }
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  createTask(objective: string, context?: string, metadata?: Record<string, unknown>): Task {
    const task: Task = {
      id: randomUUID(),
      objective,
      status: "PENDING",
      context,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.store.save(task);
    this.emit({ type: "TASK_CREATED", taskId: task.id, timestamp: new Date(), payload: { objective } });
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.store.get(id);
  }

  private recordStep(execution: TaskExecution, state: ExecutionState, output?: string, error?: string) {
    execution.state = state;
    const step = { state, timestamp: new Date(), output, error };
    execution.history.push(step);
    this.emit({ type: "STATE_CHANGED", taskId: execution.taskId, timestamp: new Date(), payload: { state, output, error } });
  }

  pauseForApproval(taskId: string): void {
    const task = this.store.get(taskId);
    if (task && task.status === "RUNNING") {
      task.status = "PAUSED";
      this.store.save(task);
      this.emit({ type: "APPROVAL_REQUESTED", taskId, timestamp: new Date(), payload: {} });
    }
  }

  resumeTask(taskId: string): void {
    const task = this.store.get(taskId);
    if (task && task.status === "PAUSED") {
      task.status = "RUNNING";
      this.store.save(task);
    }
  }

  async executeTask(taskId: string, agentId: string, timeoutMs: number = 30000): Promise<Task> {
    const task = this.store.get(taskId);
    if (!task) throw new Error(`Task with id ${taskId} not found`);

    if (task.status === "CANCELLED") throw new Error(`Cannot execute a cancelled task`);
    if (task.status === "COMPLETED") throw new Error(`Cannot execute a completed task`);
    if (task.status === "RUNNING") throw new Error(`Task is already running`);

    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent with id ${agentId} not found`);

    task.status = "RUNNING";
    task.agentId = agent.id;
    task.updatedAt = new Date();
    this.store.save(task);

    const execution: TaskExecution = {
      taskId,
      agentId,
      state: "IDLE",
      iterations: 0,
      maxIterations: this.maxIterations,
      history: []
    };

    return new Promise((resolve) => {
      let isTimeout = false;
      let timeoutId: NodeJS.Timeout | null = null;
      let totalRunningTime = 0;
      const pollingInterval = 100;

      const setExecutionTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          isTimeout = true;
          this.failTask(task, execution, "Task execution timed out");
          resolve(task);
        }, timeoutMs - totalRunningTime);
      };

      setExecutionTimeout();

      const runLoop = async () => {
        try {
          if (agent.execute && !agent.observe && !agent.think && !agent.act) {
             const result = await agent.execute(task);
             this.completeTask(task, execution, result);
             if (timeoutId) clearTimeout(timeoutId);
             return resolve(task);
          }

          let wasPaused = false;
          while (execution.iterations < execution.maxIterations && !isTimeout && (task.status === "RUNNING" || task.status === "PAUSED")) {
            if (task.status === "PAUSED") {
              if (!wasPaused) {
                // Pause the timeout
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = null;
                // Only record the step ONCE when it transitions to paused
                this.recordStep(execution, "WAITING_APPROVAL", "Paused waiting for human approval");
                wasPaused = true;
              }
              // Wait without spamming
              await new Promise(r => setTimeout(r, pollingInterval));
              continue;
            }

            if (wasPaused && task.status === "RUNNING") {
              // Resumed
              wasPaused = false;
              setExecutionTimeout();
            }

            const loopStartTime = Date.now();
            execution.iterations++;

            this.recordStep(execution, "OBSERVE");
            if (agent.observe) {
              const obsOutput = await agent.observe(task, execution);
              execution.history[execution.history.length - 1].output = obsOutput;
            }

            this.recordStep(execution, "THINK");
            if (agent.think) {
              const thinkOutput = await agent.think(task, execution);
              execution.history[execution.history.length - 1].output = thinkOutput;
            }

            this.recordStep(execution, "ACT");
            let isDone = false;
            if (agent.act) {
               const actOutput = await agent.act(task, execution);
               execution.history[execution.history.length - 1].output = actOutput;
               if (actOutput && actOutput.startsWith("DONE:")) {
                  isDone = true;
                  this.completeTask(task, execution, actOutput.substring(5).trim());
               }
            } else {
               isDone = true;
               this.completeTask(task, execution, "Agent completed without act phase");
            }

            totalRunningTime += (Date.now() - loopStartTime);
            if (isDone) break;
          }

          if (task.status === "RUNNING" && !isTimeout) {
             this.failTask(task, execution, "Exceeded maximum iterations without completing");
          }

          if (timeoutId) clearTimeout(timeoutId);
          resolve(task);

        } catch (error) {
          if (!isTimeout) {
            this.failTask(task, execution, error instanceof Error ? error.message : String(error));
            if (timeoutId) clearTimeout(timeoutId);
            resolve(task);
          }
        }
      };

      runLoop();
    });
  }

  private completeTask(task: Task, execution: TaskExecution, result: string) {
    this.recordStep(execution, "DONE");
    task.status = "COMPLETED";
    task.result = result;
    task.metadata = { ...task.metadata, executionHistory: execution.history };
    task.updatedAt = new Date();
    this.store.save(task);
    this.emit({ type: "TASK_COMPLETED", taskId: task.id, timestamp: new Date(), payload: { result } });
  }

  private failTask(task: Task, execution: TaskExecution, errorMsg: string) {
    this.recordStep(execution, "ERROR", undefined, errorMsg);
    task.status = "FAILED";
    task.error = errorMsg;
    task.metadata = { ...task.metadata, executionHistory: execution.history };
    task.updatedAt = new Date();
    this.store.save(task);
    this.emit({ type: "TASK_FAILED", taskId: task.id, timestamp: new Date(), payload: { error: errorMsg } });
  }

  cancelTask(taskId: string): Task {
    const task = this.store.get(taskId);
    if (!task) throw new Error(`Task with id ${taskId} not found`);
    if (task.status === "COMPLETED" || task.status === "FAILED") throw new Error(`Cannot cancel a task that has already finished`);

    task.status = "CANCELLED";
    task.updatedAt = new Date();
    this.store.save(task);
    return task;
  }
}
