# DARIUS OSS - Architecture

DARIUS OSS is an open-source infrastructure for building and executing autonomous AI agents. It is not a mere chatbot or LLM wrapper, but a full Agent Runtime / Operating System. The central principle is the **Task**, not the message.

## High-Level Target Architecture Map

```text
                    DARIUS CORE
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       TASK          PLANNER         STATE
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                    EXECUTION
                         │
          ┌──────────────┼──────────────┐
          ↓              ↓              ↓
       MODEL           TOOLS          CONTEXT
                         │
                         ↓
                        MCP

├── PERSISTENCE & RECOVERY
│   ├── TaskStore
│   ├── ExecutionStore
│   ├── EventStore
│   ├── CheckpointStore
│   ├── Recovery
│   └── Idempotency / Action Records
│
├── MEMORY
│   ├── Short Term
│   ├── Session
│   ├── Episodic
│   ├── Semantic
│   └── Procedural / Long Term
│
├── SECURITY & SANDBOX
│
├── VERIFICATION / CRITIC
│
└── OBSERVABILITY
```

## Core Components

### 1. DARIUS CORE
The supervisor. It receives objectives, creates tasks, selects agents and models, retrieves context, executes plans, verifies results, handles errors, and requests human approval when necessary.

### 2. TASK & EXECUTION
- **TASK**: The fundamental unit of execution (what needs to be done).
- **EXECUTION**: A specific runtime attempt of a task.
- **STATE**: Current execution state tracking (`OBSERVE`, `THINK`, `ACT`).

### 3. PERSISTENCE & RECOVERY
Crucial separation from Memory. The runtime relies on checkpointing the execution state durably (via `ExecutionStore` and `TaskStore`) to survive process death, resume work, and enforce idempotency boundaries (preventing blind retry of external actions).

### 4. PLANNER
Transforms an objective into a **Task Graph** allowing for parallel/sequential execution, dependencies, retries, and cycle detection.

### 5. CONTEXT ENGINE
Prevents context overflow via a pipeline: `Raw Context -> Relevance Filter -> Memory Retrieval -> Compression -> Task Context`.

### 6. MEMORY ENGINE
Separates persistent learned agent knowledge/experience from runtime execution state.

### 7. MODEL ROUTER
DARIUS is model-agnostic. Dynamically routes to Ollama, DeepSeek, Claude, etc.

### 8. TOOL ENGINE & MCP
Defines abstractions for tools (Schema, Permissions, Risk, Execution).

### 9. SKILL SYSTEM
Procedural knowledge structured and loaded on demand.

### 10. VERIFICATION & SECURITY
Explicitly validates outcomes and enforces Least Privilege, sandbox isolation, and Human-in-the-Loop (HITL) approval gates.

## Principles
- **Modular & Extensible**
- **Model-Agnostic & Tool-Agnostic**
- **Verifiable & Observable**
- **Secure & Local-First (but Cloud-Capable)**
