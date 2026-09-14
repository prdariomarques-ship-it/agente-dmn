export type ToolRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ToolDefinition {
  name: string;
  description: string;
  risk: ToolRisk;
  schema: Record<string, any>; // JSON Schema format simplified
}

export interface Tool extends ToolDefinition {
  execute(params: Record<string, unknown>, context?: { taskId?: string; executionId?: string }): Promise<string | Record<string, unknown>>;
  validate?(params: Record<string, unknown>): boolean;
}

export interface ToolEngineConfig {
  allowHighRisk?: boolean;
  allowCriticalRisk?: boolean;
}

export interface ToolEngine {
  register(tool: Tool): void;
  getTool(name: string): Tool | undefined;
  executeTool(name: string, params: Record<string, unknown>, context?: { taskId?: string; executionId?: string }): Promise<string | Record<string, unknown>>;
  listTools?(): ToolDefinition[];
}
