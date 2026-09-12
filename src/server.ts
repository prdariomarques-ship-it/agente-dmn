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
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// 1. Instanciar as dependências do DARIUS Core globalmente
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
  const detail = uiAdapter.getAgentDetails(req.params.id);
  if (!detail) return res.status(404).json({ error: "Not found" });
  res.json(detail);
});
app.get("/api/memory", async (req, res) => res.json(await uiAdapter.getMemoryManagerUIState()));
app.get("/api/skills", (req, res) => res.json(uiAdapter.getSkillsDirectory()));
app.get("/api/logs", (req, res) => res.json(uiAdapter.getDashboardMetrics().recentActivities || []));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DARIUS API Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Configured Ollama URL: ${ollamaUrl}`);
});
