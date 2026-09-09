import { Task } from "../core/types.js";

export interface VerificationResult {
  passed: boolean;
  reason?: string;
}

export interface VerificationEngine {
  verify(task: Task, result: string): Promise<VerificationResult>;
}
