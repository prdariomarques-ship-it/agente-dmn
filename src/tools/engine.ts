import { Tool, ToolEngine, ToolEngineConfig, ToolDefinition } from "./types.js";

export class SimpleToolEngine implements ToolEngine {
  private tools: Map<string, Tool> = new Map();

  constructor(private config: ToolEngineConfig = { allowHighRisk: false, allowCriticalRisk: false }) {}

  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      risk: t.risk,
      schema: t.schema
    }));
  }

  async executeTool(name: string, params: Record<string, unknown>): Promise<string | Record<string, unknown>> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    if (tool.risk === "HIGH" && !this.config.allowHighRisk) {
      throw new Error(`Execution of HIGH risk tool '${name}' is not allowed by current policy`);
    }

    if (tool.risk === "CRITICAL" && !this.config.allowCriticalRisk) {
      throw new Error(`Execution of CRITICAL risk tool '${name}' is not allowed by current policy`);
    }

    if (tool.validate && !tool.validate(params)) {
      throw new Error(`Validation failed for tool '${name}' with params ${JSON.stringify(params)}`);
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      throw new Error(`Error executing tool '${name}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
