# DARIUS OSS - Architecture

DARIUS OSS is an open-source infrastructure for building and executing autonomous AI agents. It is not a mere chatbot or LLM wrapper, but a full Agent Runtime / Operating System. The central principle is the **Task**, not the message.

## High-Level Architecture Map

```text
DARIUS OSS
│
├── DARIUS CORE (Central Supervisor & Orchestrator)
│
├── TASK ENGINE (Core execution loop: Objective -> Task)
│
├── PLANNER (Transforms objectives into a Task Graph)
│
├── CONTEXT ENGINE (Relevance filter, compression, and token budgeting)
│
├── MEMORY ENGINE (Short-term, long-term, semantic, episodic, etc.)
│
├── STATE ENGINE (Tracks runtime and agent states)
│
├── MODEL ROUTER (Model-agnostic abstraction for routing to LLMs)
│
├── TOOL ENGINE (Abstraction for executing, validating, and auditing tools)
│
├── MCP LAYER (Model Context Protocol for external connectivity)
│
├── SKILL SYSTEM (Procedural knowledge loading and execution)
│
├── AGENT SYSTEM (Specialized agent plugins: Research, Coder, Critic, etc.)
│
├── BACKGROUND TASKS (Scheduled, recurring, and event-driven tasks)
│
├── BROWSER ENGINE (Independent capability for web interaction)
│
├── SANDBOX (Isolation for filesystem, network, and commands)
│
├── ARTIFACT ENGINE (Generation and tracking of outputs like code, MD, etc.)
│
├── VERIFICATION / CRITIC (Explicit pass/fail validation of actions)
│
├── SECURITY (Permissions, budgets, sandbox, and secret management)
│
├── OBSERVABILITY (Logs, metrics, traces, and costs)
│
└── PLUGIN SYSTEM (Extensibility)
```

## Core Components

### 1. DARIUS CORE
The supervisor. It receives objectives, creates tasks, selects agents and models, retrieves context, executes plans, verifies results, handles errors, and requests human approval when necessary. It orchestrates without containing specific agent logic.

### 2. TASK
The fundamental unit of execution. A Task contains:
- ID, Objective, Context, State
- Dependencies, Priority, Risk, Budget, Timeout
- Success Criteria, Verification
- Tools, Skills, Agents, Model Selection
- Result and Artifacts

### 3. PLANNER
Transforms an objective into a **Task Graph** allowing for parallel/sequential execution, dependencies, retries, and checkpoints.

### 4. CONTEXT ENGINE
Prevents context overflow via a pipeline: `Raw Context -> Relevance Filter -> Memory Retrieval -> State Retrieval -> Compression -> Task Context -> Model`.

### 5. MEMORY ENGINE
Separates memory conceptually into:
- Short Term, Session, Episodic, Semantic, Procedural, Long Term.
Supports multiple backends (SQLite, Vector DB, etc.) for retrieval, ranking, and deduplication.

### 6. MODEL ROUTER
DARIUS is model-agnostic. The Router considers complexity, latency, cost, privacy, and task type to dynamically select providers (Ollama, DeepSeek, Claude, OpenAI, etc.).

### 7. TOOL ENGINE & MCP
Defines an abstraction for tools (Name, Schema, Permissions, Risk, Execution, Validation). MCP is treated as a connectivity layer through an adapter, not a hard dependency.

### 8. SKILL SYSTEM
Procedural knowledge structured and loaded on demand. Defines purpose, inputs, preconditions, procedure, validation, and success criteria.

### 9. VERIFICATION ENGINE
Explicitly validates outcomes (Tests, Schemas, Outputs) to avoid hallucinated successes.

### 10. SECURITY & SANDBOX
Enforces least privilege, sandbox isolation (filesystem, network), secret management, and approval gates for dangerous actions.

## Principles
- **Modular & Extensible**
- **Model-Agnostic & Tool-Agnostic**
- **Verifiable & Observable**
- **Secure & Local-First (but Cloud-Capable)**
