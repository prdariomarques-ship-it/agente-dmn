import { randomUUID } from "node:crypto";
import { Agent, EngineEvent, EngineObserver, ExecutionState, ExecutionStep, ExecutionStore, Task, TaskExecution, TaskStatus, TaskStore } from "./types.js";
import { VerificationEngine } from "../verification/types.js";

export class InMemoryTaskStore implements TaskStore, ExecutionStore {
  private tasks: Map<string, Task> = new Map();
  private executions: Map<string, TaskExecution> = new Map();

  saveTask(task: Task): void {
    this.tasks.set(task.id, { ...task });
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  listTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  saveExecution(execution: TaskExecution): void {
    this.executions.set(execution.id, { ...execution });
  }

  getExecution(id: string): TaskExecution | undefined {
    return this.executions.get(id);
  }

  getByTaskId(taskId: string): TaskExecution[] {
    return Array.from(this.executions.values()).filter(e => e.taskId === taskId).sort((a,b) => b.startedAt.getTime() - a.startedAt.getTime());
  }
}

export class TaskEngine {
  private taskStore: TaskStore;
  private execStore: ExecutionStore;
  private agents: Map<string, Agent> = new Map();
  private maxIterations = 10;
  private observers: EngineObserver[] = [];
  private activeLoops: Set<string> = new Set();

  // Optional verification engine
  private verifier?: VerificationEngine;

  constructor(store?: TaskStore & ExecutionStore, config?: { maxIterations?: number, verifier?: VerificationEngine }, planner?: any, tools?: any, memory?: any, verifier?: VerificationEngine) {
    const inMem = new InMemoryTaskStore();
    this.taskStore = store || inMem;
    this.execStore = store || inMem;
    if (config?.maxIterations) {
      this.maxIterations = config.maxIterations;
    }
    if (config?.verifier) {
      this.verifier = config.verifier;
    }
    if (verifier) {
      this.verifier = verifier;
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

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
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
    this.taskStore.saveTask(task);
    this.emit({ type: "TASK_CREATED", taskId: task.id, timestamp: new Date(), payload: { objective } });
    return task;
  }

  getTask(id: string): Task | undefined {
    return this.taskStore.getTask(id);
  }

  private recordStep(execution: TaskExecution, state: ExecutionState, output?: string, error?: string) {
    execution.state = state;
    const step = { state, timestamp: new Date(), output, error };
    execution.history.push(step);
    execution.updatedAt = new Date();
    this.execStore.saveExecution(execution); // CHECKPOINT
    this.emit({ type: "STATE_CHANGED", taskId: execution.taskId, timestamp: new Date(), payload: { state, output, error } });
  }

  pauseForApproval(taskId: string): void {
    const task = this.taskStore.getTask(taskId);
    if (task && task.status === "RUNNING") {
      task.status = "PAUSED";
      this.taskStore.saveTask(task);
      this.emit({ type: "APPROVAL_REQUESTED", taskId, timestamp: new Date(), payload: {} });
    }
  }

  resumeTask(taskId: string): void {
    const task = this.taskStore.getTask(taskId);
    if (task && task.status === "PAUSED") {
      task.status = "RUNNING";
      this.taskStore.saveTask(task);

      if (!this.activeLoops.has(taskId)) {
        const execs = this.execStore.getByTaskId(taskId);
        let execution = execs.length > 0 ? execs[0] : null;
        if (execution && execution.state !== "DONE" && execution.state !== "ERROR") {
           this.runExecutionLoop(task, execution, 30000);
        }
      }
    }
  }

  rejectTask(taskId: string, reason: string): void {
    const task = this.taskStore.getTask(taskId);
    if (task && task.status === "PAUSED") {
      task.status = "FAILED";
      task.error = `REJECTED: ${reason}`;
      this.taskStore.saveTask(task);
      this.emit({ type: "TASK_FAILED", taskId: task.id, timestamp: new Date(), payload: { error: task.error } });
    } else if (task) {
      throw new Error("Can only reject a task that is PAUSED for approval");
    }
  }

  async recoverAndResume(taskId: string, timeoutMs: number = 30000): Promise<Task> {
    const task = this.taskStore.getTask(taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status === "COMPLETED" || task.status === "FAILED" || task.status === "CANCELLED") {
      return task;
    }

    if (task.status === "PAUSED") {
      return task;
    }

    task.status = "RUNNING";
    this.taskStore.saveTask(task);

    const execs = this.execStore.getByTaskId(taskId);
    let execution = execs.length > 0 ? execs[0] : null;

    if (execution && execution.state === "ACT") {
      this.failTask(task, execution, "CRASH RECOVERY: Ambiguous state interrupted during ACT. Requires human reconciliation.");
      return task;
    }

    if (!execution || execution.state === "DONE" || execution.state === "ERROR") {
      execution = {
        id: randomUUID(),
        taskId,
        agentId: task.agentId || "unknown",
        state: "IDLE",
        iterations: 0,
        maxIterations: this.maxIterations,
        history: [],
        startedAt: new Date(),
        updatedAt: new Date()
      };
    }

    if (task.agentId) {
      execution.agentId = task.agentId;
    }

    return this.runExecutionLoop(task, execution, timeoutMs);
  }

  async executeTask(taskId: string, agentId: string, timeoutMs: number = 30000): Promise<Task> {
    const task = this.taskStore.getTask(taskId);
    if (!task) throw new Error(`Task with id ${taskId} not found`);

    if (task.status === "CANCELLED") throw new Error(`Cannot execute a cancelled task`);
    if (task.status === "COMPLETED") throw new Error(`Cannot execute a completed task`);
    if (task.status === "RUNNING") throw new Error(`Task is already running`);

    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent with id ${agentId} not found`);

    task.status = "RUNNING";
    task.agentId = agent.id;
    task.updatedAt = new Date();
    this.taskStore.saveTask(task);

    const execution: TaskExecution = {
      id: randomUUID(),
      taskId,
      agentId,
      state: "IDLE",
      iterations: 0,
      maxIterations: this.maxIterations,
      history: [],
      startedAt: new Date(),
      updatedAt: new Date()
    };
    this.execStore.saveExecution(execution);

    return this.runExecutionLoop(task, execution, timeoutMs);
  }

  private async runExecutionLoop(task: Task, execution: TaskExecution, timeoutMs: number): Promise<Task> {
    const agent = this.agents.get(execution.agentId);
    if (!agent) throw new Error(`Agent with id ${execution.agentId} not found for recovery`);

    if (this.activeLoops.has(task.id)) {
      return task;
    }

    this.activeLoops.add(task.id);

    return new Promise((resolve) => {
      let isTimeout = false;
      let timeoutId: NodeJS.Timeout | null = null;
      let totalRunningTime = 0;
      const pollingInterval = 50;

      const setExecutionTimeout = () => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          isTimeout = true;
          this.failTask(task, execution, "Task execution timed out");
          this.activeLoops.delete(task.id);
          resolve(task);
        }, timeoutMs - totalRunningTime);
      };

      setExecutionTimeout();

      const runLoop = async () => {
        try {
          if (agent.execute && (!agent.observe || !agent.think || !agent.act)) {
             let isDone = false;
             while (!isDone && (execution.iterations < execution.maxIterations)) {
               execution.iterations++;
               const result = await agent.execute(task);
               isDone = await this.completeTaskWithVerification(task, execution, result);
             }
             if (!isDone && task.status === "RUNNING") {
                this.failTask(task, execution, "Exceeded maximum iterations without completing");
             }
             if (timeoutId) clearTimeout(timeoutId);
             this.activeLoops.delete(task.id);
             return resolve(task);
          }

          let wasPaused = false;
          while (execution.iterations < execution.maxIterations && !isTimeout && (task.status === "RUNNING" || task.status === "PAUSED")) {
            if (task.status === "PAUSED") {
              if (!wasPaused) {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = null;
                if (execution.state !== "WAITING_APPROVAL") {
                  this.recordStep(execution, "WAITING_APPROVAL", "Paused waiting for human approval");
                }
                wasPaused = true;
              }
              await new Promise(r => setTimeout(r, pollingInterval));
              const freshTask = this.taskStore.getTask(task.id);
              if (freshTask && freshTask.status === "FAILED") {
                 task.status = "FAILED";
                 task.error = freshTask.error;
              } else if (freshTask && freshTask.status === "RUNNING") {
                 task.status = "RUNNING";
              }
              continue;
            }

            if (wasPaused && task.status === "RUNNING") {
              wasPaused = false;
              setExecutionTimeout();
            }

            const loopStartTime = Date.now();
            const lastState = execution.state;

            if (lastState === "OBSERVE") {
               // Resume from think
            } else if (lastState === "THINK") {
               // Resume from act
            } else {
               execution.iterations++;
               this.recordStep(execution, "OBSERVE");
               if (agent.observe) {
                 const obsOutput = await agent.observe(task, execution);
                 if (isTimeout) return;
                 execution.history[execution.history.length - 1].output = obsOutput;
                 this.execStore.saveExecution(execution);
               }
            }

            if (lastState !== "THINK" && task.status === "RUNNING" && execution.state !== "ERROR") {
              this.recordStep(execution, "THINK");
              if (agent.think) {
                const thinkOutput = await agent.think(task, execution);
                if (isTimeout) return;
                execution.history[execution.history.length - 1].output = thinkOutput;
                this.execStore.saveExecution(execution);
              }
            }

            let isDone = false;
            let finalResult = "";
            if (task.status === "RUNNING" && execution.state !== "ERROR") {
              this.recordStep(execution, "ACT");
              if (agent.act) {
                 const actOutput = await agent.act(task, execution);
                 if (isTimeout) return;
                 execution.history[execution.history.length - 1].output = actOutput;
                 this.execStore.saveExecution(execution);
                 if (actOutput && actOutput.startsWith("DONE:")) {
                    isDone = true;
                    finalResult = actOutput.substring(5).trim();
                 }
              } else {
                 isDone = true;
                 finalResult = "Agent completed without act phase";
              }
            }

            totalRunningTime += (Date.now() - loopStartTime);

            if (isDone) {
              const shouldTerminate = await this.completeTaskWithVerification(task, execution, finalResult);
              if (shouldTerminate) {
                break;
              } else {
                // Retry scenario: Reset state for next iteration
                execution.state = "IDLE"; // Reset to IDLE so it starts fresh from OBSERVE
                execution.history.push({
                   state: "IDLE",
                   timestamp: new Date()
                });
                task.status = "RUNNING"; // Keep it running if it's a retry
                this.taskStore.saveTask(task);
                // Also reset isDone for the loop
                isDone = false;
              }
            }
          }

          if (task.status === "RUNNING" && !isTimeout) {
             this.failTask(task, execution, "Exceeded maximum iterations without completing");
          }

          if (task.status === "FAILED" && task.error?.startsWith("REJECTED:")) {
             this.recordStep(execution, "ERROR", undefined, task.error);
          }

          if (timeoutId) clearTimeout(timeoutId);
          this.activeLoops.delete(task.id);
          resolve(task);

        } catch (error) {
          if (!isTimeout) {
            this.failTask(task, execution, error instanceof Error ? error.message : String(error));
            if (timeoutId) clearTimeout(timeoutId);
            this.activeLoops.delete(task.id);
            resolve(task);
          }
        }
      };

      runLoop();
    });
  }

  private async completeTaskWithVerification(task: Task, execution: TaskExecution, result: string): Promise<boolean> {
    if (this.verifier) {
      this.recordStep(execution, "VERIFY");
      const vResult = await this.verifier.verify(task, result);
      execution.history[execution.history.length - 1].output = `Verification: ${vResult.passed ? 'PASS' : 'FAIL'}`;
      this.execStore.saveExecution(execution);

      if (!vResult.passed) {
         // Check for retry policy
         const maxRetries = (task.metadata?.maxRetries as number) ?? 0;
         const currentRetries = (task.metadata?.currentRetries as number) ?? 0;

         if (currentRetries < maxRetries) {
           task.metadata = {
             ...task.metadata,
             currentRetries: currentRetries + 1,
             lastVerificationError: vResult.reason
           };
           this.taskStore.saveTask(task);
           return false; // Tells the execution loop to retry
         }

         // Verification failed and no more retries, fail the task
         this.failTask(task, execution, `Verification failed: ${vResult.reason}`);
         return true; // Execution loop should terminate
      }
    }

    this.recordStep(execution, "DONE");
    task.status = "COMPLETED";
    task.result = result;
    task.metadata = { ...task.metadata, executionHistory: execution.history };
    task.updatedAt = new Date();
    this.taskStore.saveTask(task);
    this.emit({ type: "TASK_COMPLETED", taskId: task.id, timestamp: new Date(), payload: { result } });
    return true; // Execution loop should terminate
  }

  private failTask(task: Task, execution: TaskExecution, errorMsg: string) {
    this.recordStep(execution, "ERROR", undefined, errorMsg);
    task.status = "FAILED";
    task.error = errorMsg;
    task.metadata = { ...task.metadata, executionHistory: execution.history };
    task.updatedAt = new Date();
    this.taskStore.saveTask(task);
    this.emit({ type: "TASK_FAILED", taskId: task.id, timestamp: new Date(), payload: { error: errorMsg } });
  }

  cancelTask(taskId: string): Task {
    const task = this.taskStore.getTask(taskId);
    if (!task) throw new Error(`Task with id ${taskId} not found`);
    if (task.status === "COMPLETED" || task.status === "FAILED") throw new Error(`Cannot cancel a task that has already finished`);

    task.status = "CANCELLED";
    task.updatedAt = new Date();
    this.taskStore.saveTask(task);
    return task;
  }
}
