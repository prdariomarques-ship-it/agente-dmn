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
