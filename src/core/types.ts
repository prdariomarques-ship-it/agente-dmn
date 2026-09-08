export type TaskStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "PAUSED"; // Added for Human-in-the-loop

export type ExecutionState =
  | "IDLE"
  | "OBSERVE"
  | "THINK"
  | "ACT"
  | "DONE"
  | "ERROR"
  | "WAITING_APPROVAL"; // Added for Human-in-the-loop

export interface Task {
  id: string;
  objective: string;
  status: TaskStatus;
  context?: string;
  result?: string;
  error?: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExecutionStep {
  state: ExecutionState;
  timestamp: Date;
  output?: string;
  error?: string;
}

export interface TaskExecution {
  taskId: string;
  agentId: string;
  state: ExecutionState;
  iterations: number;
  maxIterations: number;
  history: ExecutionStep[];
}

export interface Agent {
  id: string;
  name: string;
  description?: string;

  // Agent loop phases
  observe?: (task: Task, context: TaskExecution) => Promise<string>;
  think?: (task: Task, context: TaskExecution) => Promise<string>;
  act?: (task: Task, context: TaskExecution) => Promise<string>;

  // Simple execution (for basic agents)
  execute?: (task: Task) => Promise<string>;
}

export interface TaskStore {
  save(task: Task): void;
  get(id: string): Task | undefined;
  list(): Task[];
  delete(id: string): boolean;
}

// Added for Telemetry/UI streams
export interface EngineEvent {
  type: "TASK_CREATED" | "STATE_CHANGED" | "TASK_COMPLETED" | "TASK_FAILED" | "APPROVAL_REQUESTED";
  taskId: string;
  timestamp: Date;
  payload: Record<string, any>;
}

export interface EngineObserver {
  onEvent(event: EngineEvent): void;
}
