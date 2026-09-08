export type TaskStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface Task {
  id: string;
  objective: string;
  status: TaskStatus;
  context?: string;
  result?: string;
  error?: string;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  execute: (task: Task) => Promise<string>;
}

export interface TaskStore {
  save(task: Task): void;
  get(id: string): Task | undefined;
  list(): Task[];
  delete(id: string): boolean;
}
