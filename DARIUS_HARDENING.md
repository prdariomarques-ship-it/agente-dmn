# DARIUS HARDENING REPORT (RC1+ candidate base)

Branch: `feature/darius-finance` (base `724bb7b`, checkpoint local `checkpoint/hardening-start`).
Escopo: endurecimento da base existente. **Sem merge, push, tag ou rebase contra `469e8b1`.**

## 1. Approval Gate — "Store = authoritative state"

O `TaskStore.saveTask` substitui o objeto armazenado por uma cópia; referências locais de Task
ficam stale. Toda transição externa (`pauseForApproval`, `resumeTask`, `rejectTask`, `cancelTask`)
passa pelo store — portanto **o store é a única verdade**.

Correções em `src/core/engine.ts`:

- `syncWithStore(task)`: helper único de re-sincronização autoritativa (usado por todos os pontos
  de decisão/persistência do loop).
- **Bug A (caminho simples)**: o loop de agentes execute-only agora sincroniza o status a cada
  iteração; `PAUSED` registra `WAITING_APPROVAL` e interrompe (resume re-entra pelo store);
  `CANCELLED/FAILED/COMPLETED` interrompem sem nova execução.
- **Bug B (clobber de retry)**: `completeTaskWithVerification` sincroniza antes de completar,
  antes do save de retry e após cada `await` de verificação — `PAUSED` nunca é sobrescrito por
  `RUNNING`/`COMPLETED`.
- `executeTask` recusa task `PAUSED` (só `resumeTask` a retoma).
- `failTask` preserva `CANCELLED` (decisão humana terminal) e registra o erro para auditoria.

Garantias cobertas por testes determinísticos (deferred promises) em
`src/core/engine.approval.test.ts`:

```text
PAUSED não vira RUNNING (exceto via resumeTask)
WAITING_APPROVAL não vira COMPLETED
REJECTED não volta a executar sozinho
CANCELLED não continua execução
resume único (duplo resume é no-op)
pause durante verificação PASS/FAIL (caminhos simples e OOTA)
```

## 2. Server (Opção A — API oficial como adapter)

- Dependências adicionadas: `express`, `cors`, `@types/express`, `@types/cors`.
- `src/server.ts` é **apenas adapter**: HTTP → `DARIUSUIAdapter`/engines do Core; sem lógica de
  negócio; o bot Telegram permanece adapter irmão (não há segundo Core).
- CORS: allowlist por env (`CORS_ORIGIN`, default dev localhost:5173/4173/3000); nunca `*`.
- Bind padrão loopback (`BIND_HOST=0.0.0.0` para Termux/rede local).
- Finance montado via `PluginHost` + `RouteRegistrarLike` (rotas framework-free do plugin).
- Script novo: `npm run server`.

## 3. Web

Restaurado de `DARIUS_WEB_EXPORT.zip` (fonte fora da árvore e apagada no remote) e conectado ao
contract existente: Dashboard, Finance, Tasks (com trace sem chain-of-thought), Agents, Memory,
Skills, Logs. Estados loading/empty/error; nav mobile-first. `tsconfig` adicionado e palette
`dark-*` definida (o build `tsc -b && vite build` agora passa).

## 4. Auditorias

- **Finance**: vertical puro — importa apenas engines/tipos do Core, define zero engines próprios;
  5 tools READ-only (4 LOW, 1 MEDIUM); E2E determinístico inclui `CRYPTO_CRASH_50` e `EQUITY_BEAR_30`.
- **Mobile**: scaffold Expo (2 arquivos) — registrado como tal; nenhum claim de APK.
- **Segurança**: sem secrets no código; `.env.example` sem PII; logs sem dump de parâmetros;
  gate HIGH/CRITICAL ativo; timeouts e budgets existentes preservados.

## 5. Limitações conhecidas (não corrigidas nesta rodada)

- `/api/tasks` (POST) não tem camada de auth (design pré-RC1; o bot tem auth por chat ID).
- Scheduler pode executar o mesmo objective concorrentemente como **tasks distintas** (por design).
- Re-execução explícita de task `FAILED` via `executeTask` permanece possível (semântica de retry).
- Sem E2E real de navegador/Android nesta rodada (build estático + smokes via curl/ts).

## 6. RC Validation (2026-09-13, base `01bd99b` + fix `bd204f4`)

Validação completa de Release Candidate sobre a base endurecida. Sem operação remota.

**Defeitos reais encontrados e corrigidos** (commit `bd204f4`, 4 arquivos, +75/-2):

1. `GET /api/agents` → **500**: instâncias cruas de `AutonomousAgent` serializadas atingem
   estrutura circular (`TaskEngine.observers → UIAdapter → taskEngine`). Corrigido para o
   contrato `AgentSummary { id, name, description }` que o Web já consumia.
2. `GET /api/agents/:id` → **leak de internos**: spread `...agent` expunha `contextEngine`,
   `modelRouter` e (nos agentes Finance) `workflow → engine`. `getAgentDetails` agora constrói
   explicitamente os campos públicos do contrato `AgentDetail`.
3. `workflow.approve/reject` aceitavam task inexistente ou não pausada: o Core trata ids
   desconhecidos como no-op silencioso, então uma decisão era gravada na memória de auditoria
   e a API respondia **200**. `assertDecidable()` valida existência + `PAUSED` antes de gravar
   (rota responde **409**). 3 testes determinísticos novos cobrindo os guards.

**Validado sem defeitos**: máquina de estados (guards em toda transição; store autoritativo em
simples e OOTA), persistence/recovery (crash em VERIFY, restart real de store, boundary ACT),
retry/timeout/budget, races (engine/scheduler/supervisor/stores — nenhuma nova corrigível),
PluginHost (registro, apply-once, verifiers, rotas), Finance E2E approve/reject determinístico
(48/48 plugins), tools audit (4 LOW + 1 MEDIUM, todas READ/auditadas/com timeout), secret/PII
scan limpo, bot Telegram fail-fast (isolado das mudanças), Web build + typecheck (contrato
Web→API 14/14), CORS allowlist/preflight, input inválido e estados de erro (smoke 22/22).

**Totais finais**: 138/138 testes (32 arquivos), `tsc --noEmit` zero erros, server smoke 22/22,
Web build OK.

**Novos WARNINGS (decisão arquitetural — não corrigidos)**:

- Timeout de parede armado antes de um self-pause pode converter `PAUSED → FAILED (timed out)`
  se o `act` em curso consumir o orçamento restante (janela de aprovação perdida). Correção
  exige semântica de suspensão de orçamento — decisão de design.
- `resumeTask` re-arma o timeout com `timeoutMs - totalRunningTime`; com orçamento quase
  exaurido, a task pode falhar imediatamente após aprovação humana. Mesma raiz do anterior.
- `registerCustomVerifier` permite sobrescrever verificador registrado (benigno no uso atual).
