import { Agent, Task, TaskStatus, ExecutionState, ExecutionStep } from "../core/types.js";
import { MemoryEntry, MemoryType } from "../memory/types.js";
import { Tool } from "../tools/types.js";

// --- DASHBOARD ---
export interface DashboardMetrics {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  tasks: {
    active: number;
    completed: number;
    failed: number;
  };
  health: {
    status: "HEALTHY" | "DEGRADED" | "DOWN";
    latencyMs: number;
    memoryUsageMB: number;
  };
  recentActivities: ExecutionLogEntry[];
}

// --- AGENTS ---
export interface AgentDetail extends Agent {
  model?: string;
  toolsAttached: Tool[];
  skillsAttached: string[];
  recentTasks: Task[];
}

// --- TASKS & EXECUTION ENGINE ---
// The UI expects an observable pipeline: Goal -> Observe -> Think -> Act -> Result
export interface TaskExecutionUIState {
  taskId: string;
  objective: string;
  status: TaskStatus;
  currentState: ExecutionState | "WAITING_APPROVAL";
  iterations: number;
  tokensUsed?: number;
  elapsedTimeMs?: number;
  trace: ExecutionStep[]; // History of Observe, Think, Act
  errorDetails?: string;
}

// --- MEMORY MANAGER ---
export interface MemoryManagerUIState {
  stats: {
    shortTermCount: number;
    sessionCount: number;
    longTermCount: number;
  };
  recentEntries: MemoryEntry[];
}

// --- SKILLS DIRECTORY ---
export interface SkillUI {
  id: string;
  name: string;
  version: string;
  isActive: boolean;
  dependencies: string[];
}

// --- LOGS & AUDIT TRAIL (TELEMETRY) ---
export interface ExecutionLogEntry {
  id: string;
  taskId: string;
  executionId: string;
  timestamp: Date;
  eventType: "OBSERVE" | "THINK" | "ACT" | "TOOL_CALL" | "ERROR" | "RETRY" | "APPROVAL_REQUEST" | "PENDING";
  status: "SUCCESS" | "FAILED" | "PENDING";
  payload: Record<string, unknown>;
  durationMs?: number;
}
