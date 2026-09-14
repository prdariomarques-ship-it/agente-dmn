import "dotenv/config";
import express from "express";
import cors from "cors";
import { TaskEngine } from "./core/engine.js";
import { SQLitePersistentStore } from "./core/sqlite.js";
import { AutonomousAgent } from "./core/agent.js";
import { SimpleContextEngine } from "./context/engine.js";
import { InMemoryMemoryStore } from "./memory/engine.js";
import { SimpleModelRouter } from "./model/router.js";
import { OllamaProvider } from "./model/ollama.js";
import { DeterministicVerificationEngine } from "./verification/engine.js";
import { DARIUSUIAdapter } from "./api/adapter.js";
import { randomUUID } from "node:crypto";
import { Task } from "./core/types.js";

const app = express();

// SECURITY: Strict CORS for localhost UI explicitly. Do not expose to LAN by default.
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// 1. Instanciar dependencias globais
const dbPath = process.env.DB_PATH || "darius_live.db";
const store = new SQLitePersistentStore(dbPath);
const memory = new InMemoryMemoryStore();
const contextEngine = new SimpleContextEngine(memory);
const router = new SimpleModelRouter();

const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
router.registerProvider(new OllamaProvider(ollamaUrl));

const verifier = new DeterministicVerificationEngine();
const agent = new AutonomousAgent("agent-cli-1", "DARIUS_General_Agent", contextEngine, router);
const engine = new TaskEngine(store, { verifier }, undefined, undefined, memory, verifier);
engine.registerAgent(agent);

const dummyToolEngine: any = { listTools: () => [] };
const uiAdapter = new DARIUSUIAdapter(engine, memory, dummyToolEngine, undefined);

// 2. Definir contratos de API (completos, sem inventar fake methods no adapter)
app.get("/api/health", (req, res) => res.json(uiAdapter.getDashboardMetrics().health));
app.get("/api/dashboard", (req, res) => res.json(uiAdapter.getDashboardMetrics()));
app.get("/api/tasks", (req, res) => res.json(store.listTasks()));
app.post("/api/tasks", async (req, res) => {
  const { objective, modelName } = req.body;
  if (!objective) return res.status(400).json({ error: "Missing objective" });
  const task: Task = { id: randomUUID(), objective, status: "PENDING", agentId: agent.id, metadata: { successCriteria: "Done", modelName: modelName || "nemotron-3.5-lightning:latest" }, createdAt: new Date(), updatedAt: new Date() };
  store.saveTask(task);
  engine.executeTask(task.id, agent.id).catch(err => console.error("Background execution error:", err));
  res.json(task);
});

app.get("/api/tasks/:id", (req, res) => {
  const state = uiAdapter.getTaskState(req.params.id);
  if (!state) return res.status(404).json({ error: "Not found" });
  res.json(state);
});

app.get("/api/agents", (req, res) => res.json(engine.getAgents()));

app.get("/api/agents/:id", (req, res) => {
  // We don't have getAgentDetails natively on UIAdapter in the base code.
  // We use the TaskEngine's native getter.
  const agents = engine.getAgents();
  const agent = agents.find((a: any) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Not found" });
  res.json(agent);
});

// Marking API GAPs
app.get("/api/memory", async (req, res) => res.status(501).json({ error: "API GAP - Memory Explorer endpoint not implemented natively on adapter yet." }));
app.get("/api/skills", (req, res) => res.status(501).json({ error: "API GAP - Skills registry endpoint not implemented natively on adapter yet." }));

app.get("/api/logs", (req, res) => res.json(uiAdapter.getDashboardMetrics().recentActivities || []));

app.post("/api/tasks/:id/approve", (req, res) => {
    try {
        engine.resumeTask(req.params.id);
        res.json({ success: true, message: "Task approved and resumed" });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
app.post("/api/tasks/:id/reject", (req, res) => {
    try {
        engine.rejectTask(req.params.id, "Human rejection via API");
        res.json({ success: true, message: "Task rejected" });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
app.post("/api/tasks/:id/cancel", (req, res) => {
    try {
        engine.cancelTask(req.params.id);
        res.json({ success: true, message: "Task cancelled" });
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});
app.get("/api/finance/portfolio", (req, res) => res.status(501).json({ error: "Not implemented. Requires Finance Plugin." }));

export { app, engine, store };

if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, "127.0.0.1", () => {
        console.log(`DARIUS API Server is running on http://127.0.0.1:${PORT}`);
        console.log(`SECURITY: CORS is restricted to localhost web instances.`);
    });
}
