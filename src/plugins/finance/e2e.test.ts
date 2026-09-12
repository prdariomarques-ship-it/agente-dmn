import { describe, it, expect } from "vitest";
import { TaskEngine, InMemoryTaskStore } from "../../core/engine.js";
import { SimpleToolEngine } from "../../tools/engine.js";
import { SimpleSkillEngine } from "../../skills/engine.js";
import { InMemoryMemoryStore } from "../../memory/engine.js";
import { SimpleTelemetryEmitter } from "../../observability/engine.js";
import { DeterministicVerificationEngine } from "../../verification/engine.js";
import { PluginHost } from "../host.js";
import { createFinancePlugin, FinancePlugin } from "./plugin.js";
import { RouteRegistrarLike } from "../contract.js";
import { TelemetryEvent } from "../../observability/types.js";
import { FinanceTaskInput } from "./types.js";

/**
 * Offline E2E: USER OBJECTIVE → FINANCE TASK → PLAN → AGENTS → TOOLS →
 * CRITIC → VERIFY → WAITING_APPROVAL → APPROVE/REJECT → RESULT.
 * No external API, no live model, no network.
 */

function buildRuntime(options?: { withRoutes?: boolean }) {
  const store = new InMemoryTaskStore();
  const taskEngine = new TaskEngine(store);
  const toolEngine = new SimpleToolEngine();
  const skillEngine = new SimpleSkillEngine();
  const memory = new InMemoryMemoryStore();
  const telemetry = new SimpleTelemetryEmitter();
  const verifier = new DeterministicVerificationEngine();

  const telemetryEvents: TelemetryEvent[] = [];
  telemetry.subscribe(e => telemetryEvents.push(e));

  const capturedRoutes: Array<{ method: string; path: string }> = [];
  const registrar: RouteRegistrarLike = {
    get: (path) => capturedRoutes.push({ method: "GET", path }),
    post: (path) => capturedRoutes.push({ method: "POST", path }),
  };

  const host = new PluginHost({
    taskEngine,
    toolEngine,
    skillEngine,
    memory,
    telemetry,
    verifier,
    routes: options?.withRoutes === false ? undefined : registrar,
  });

  return { taskEngine, toolEngine, skillEngine, memory, telemetry, verifier, host, telemetryEvents, capturedRoutes };
}

const input: FinanceTaskInput = {
  portfolio: {
    baseCurrency: "BRL",
    holdings: [
      { symbol: "PETR4", assetClass: "EQUITY", quantity: 100 },     // 3.800
      { symbol: "BTC", assetClass: "CRYPTO", quantity: 0.02 },      // 5.000
      { symbol: "LFT", assetClass: "FIXED_INCOME", quantity: 1 },   // 14.000
      { symbol: "XPTO", assetClass: "OTHER", quantity: 5 },         // sem preço → lacuna
    ],
  },
  riskProfile: { declaredTolerance: "CONSERVATIVE", horizonMonths: 60, constraints: [] },
  questions: ["Estou exposto demais a cripto?"],
};

describe("DARIUS Finance — plugin registration", () => {
  it("registers agents, tools, skills, verifiers and routes on the host engines", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin();
    await rt.host.apply(plugin);

    const agentIds = rt.taskEngine.getAgents().map(a => a.id);
    for (const id of FinancePlugin.agentIds()) expect(agentIds).toContain(id);
    expect(agentIds.filter(id => id.startsWith("finance-")).length).toBe(7);

    const toolNames = rt.toolEngine.listTools().map(t => t.name);
    expect(toolNames).toEqual(expect.arrayContaining([
      "finance_market_data", "finance_economic_data", "finance_portfolio_data",
      "finance_calculator", "finance_scenario_simulator",
    ]));

    expect(rt.skillEngine.listSkills().filter(s => s.id.startsWith("finance-")).length).toBe(8);
    expect(rt.capturedRoutes.map(r => r.path)).toContain("/api/finance/analysis");
  });

  it("plugin can be applied only once; core keeps working without it", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin();
    await rt.host.apply(plugin);
    await expect(rt.host.apply(plugin)).rejects.toThrow(/already applied/);

    // Architectural test: without applying finance, TaskEngine works normally.
    const rt2 = buildRuntime();
    const t = rt2.taskEngine.createTask("objetivo puro do core");
    expect(t.objective).toBe("objetivo puro do core");
    expect(rt2.taskEngine.getAgents().filter(a => a.id.startsWith("finance-"))).toHaveLength(0);
  });

  it("custom verifiers are live in the host verification engine", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin();
    await rt.host.apply(plugin);

    const task = rt.taskEngine.createTask("verifier probe");
    task.metadata = {
      verification: [
        { type: "CUSTOM", value: null, customVerifierId: "finance_report_schema" },
      ],
    };
    const bad = await rt.verifier.verify(task, "no json here");
    expect(bad.passed).toBe(false);
  });
});

describe("DARIUS Finance — E2E workflow (offline)", () => {
  it("runs analysis → critic → report → WAITING_APPROVAL → approve → COMPLETED with verified report", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin({ analysisTimeoutMs: 15000, childTimeoutMs: 8000 });
    await rt.host.apply(plugin);
    const wf = plugin.getWorkflow();

    const { taskId } = wf.start(input, { startedBy: "e2e-test" });

    // 1. Human approval gate: task parks in PAUSED (Core-native).
    const paused = await wf.awaitApprovalRequest(taskId, 20000);
    expect(paused.status).toBe("PAUSED");
    const draft = await wf.getDraft(taskId);
    expect(draft).toBeDefined();
    expect(Array.isArray(draft!.criticObjections)).toBe(true);

    // 2. Human approves → task completes THROUGH the verification hook.
    await wf.approve(taskId, "dario", "concordo com as premissas");
    const done = await wf.awaitCompletion(taskId, 20000);
    expect(done.status).toBe("COMPLETED");

    const report = wf.getReport(taskId);
    expect(report).not.toBeNull();
    expect(report!.taskType).toBe("FINANCE_PORTFOLIO_ANALYSIS");
    expect(report!.dataSource).toBe("MOCK_DEMO_DATA");

    // 3. Missing data declared — never invented.
    expect(report!.portfolioSummary.unpricedSymbols).toContain("XPTO");
    expect(report!.dataGaps.some(g => g.includes("XPTO"))).toBe(true);
    const xpto = report!.portfolioSummary.holdings.find(h => h.symbol === "XPTO");
    expect(xpto?.weight).toBeUndefined();

    // 4. Deterministic math made it through verification.
    expect(report!.portfolioSummary.pricedValue).toBe(22800); // 3800 + 5000 + 14000
    expect(report!.scenarios.some(s => s.id === "CRYPTO_CRASH_50" && s.portfolioImpactValue < 0)).toBe(true);

    // 5. Critic ran as a real stage.
    expect(Array.isArray(report!.criticObjections)).toBe(true);

    // 6. User question propagated.
    expect(report!.openQuestions.some(q => q.includes("cripto"))).toBe(true);

    // 7. Audit trail: tool calls were emitted (no params dump, no CoT).
    expect(rt.telemetryEvents.some(e => e.eventType === "TOOL_CALL")).toBe(true);

    // 8. Memory recorded the analysis + approval decision.
    const decisions = await rt.memory.search({ metadataFilters: { domain: "finance", kind: "APPROVAL_DECISION" } });
    expect(decisions).toHaveLength(1);
    const reports = await rt.memory.search({ metadataFilters: { kind: "ANALYSIS_REPORT" } });
    expect(reports.length).toBeGreaterThanOrEqual(1);
  }, 30000);

  it("REJECTED analysis fails with an explicit REJECTED error and marks proposals rejected", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin({ analysisTimeoutMs: 15000, childTimeoutMs: 8000 });
    await rt.host.apply(plugin);
    const wf = plugin.getWorkflow();

    const { taskId } = wf.start(input);
    await wf.awaitApprovalRequest(taskId, 20000);
    await wf.reject(taskId, "dario", "não quero seguir com isso agora");

    const done = await wf.awaitCompletion(taskId, 20000);
    expect(done.status).toBe("FAILED");
    expect(done.error).toMatch(/REJECTED/);

    const decision = await rt.memory.search({ metadataFilters: { kind: "APPROVAL_DECISION" } });
    expect(decision).toHaveLength(1);
    expect(JSON.parse(decision[0].content).decision).toBe("REJECTED");
  }, 30000);

  it("rejects malformed input synchronously (missing holdings, bad quantity)", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin();
    await rt.host.apply(plugin);
    const wf = plugin.getWorkflow();

    expect(() => wf.start({ portfolio: { baseCurrency: "BRL", holdings: [] }, riskProfile: { declaredTolerance: "MODERATE", constraints: [] } })).toThrow(/non-empty/);
    expect(() => wf.start({
      portfolio: { baseCurrency: "BRL", holdings: [{ symbol: "PETR4", assetClass: "EQUITY", quantity: -1 }] },
      riskProfile: { declaredTolerance: "MODERATE", constraints: [] },
    })).toThrow(/positive quantity/);
    expect(() => wf.start({ portfolio: { baseCurrency: "BRL", holdings: [{ symbol: "A", assetClass: "EQUITY", quantity: 1 }] }, riskProfile: null as never })).toThrow(/riskProfile/);
  });

  it("subtask failure surfaces as a FAILED root task with the stage error (no silent swallowing)", async () => {
    const rt = buildRuntime();
    const plugin = createFinancePlugin({ analysisTimeoutMs: 15000, childTimeoutMs: 8000 });
    await rt.host.apply(plugin);
    const wf = plugin.getWorkflow();

    // Sabotage: break the market research skill so its child task fails.
    const skills = rt.skillEngine as unknown as { skills: Map<string, { execute: (p: unknown, c: unknown) => Promise<unknown> }> };
    const research = skills.skills.get("finance-market-research");
    skills.skills.set("finance-market-research", {
      ...(research as { execute: (p: unknown, c: unknown) => Promise<unknown> }),
      execute: async () => { throw new Error("provider exploded"); },
    });

    const { taskId } = wf.start(input);
    const done = await wf.awaitCompletion(taskId, 20000);
    expect(done.status).toBe("FAILED");
    expect(done.error).toMatch(/market research.*did not complete|provider exploded/s);
  }, 30000);
});
