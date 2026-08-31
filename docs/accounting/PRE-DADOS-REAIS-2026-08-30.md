# Pré-dados-reais — registro do inventário de 16 itens (2026-08-30)

> **Documento REGISTRADOR, não ratificador.** Não edita `ACCOUNTING-MASTER-MAP.md` nem
> `PROXIMOS-PASSOS-2026-08-28.md` — fold desses é decisão do dono. Autorização citável: "Pode
> disparar" (dono, 2026-08-30).

**Data do registro:** 2026-08-30/31. **Base (`git log -1 origin/main`):** `bacdef5b057c73578797fd64e5e25c359bccb7a6`
— PR #243, `feat(accounting): trailing watermark no accountingSyncReconcile.job.ts (BRIEF-W2-F, F6)`,
mergeado `2026-08-31T00:40:18-03:00`.

**As 2 linhas (OPS-001 §5):** de 16 itens do inventário, **11 fecharam via PR mergeado** (SHAs
confirmados 1:1 contra `origin/main`), **1 segue em andamento com trabalho ativo não-commitado**
(A-3/BigInt), **2 são decisão do dono não-código** (B-2, e o não-fold do mapa), e **5 continuam gate
humano ou diferido**. O risco principal agora: **A-3 é o único item vivo fora do controle deste
registro** — o executor W2-B segue escrevendo enquanto este doc existe (worktree de agente com
15+ arquivos modificados no momento em que este registro foi corrigido), então qualquer fold que
trate a linha A-3 como definitiva fica stale assim que a branch for commitada/pushada.

---

## 1. Inventário — os 16 itens

| # | Item | Desfecho | PR / SHA / evidência |
|---|---|---|---|
| A-1 | Contraparte: `nameNormalized` assume `@@unique` + `taxId` opcional | ✅ **FECHADO** | PR #241, `ed71d6a3669b9b3dd5bc88056fcb8c5396deb642` |
| A-2 | `verifyAuditChain` sem chamador de produção | ✅ **FECHADO** | PR #237, `13367a2de0cd9da9a63755380fb8c5bdfef342ee` |
| A-3 | Teto Int32 → BigInt (13 colunas) | 🟡 **EM ANDAMENTO** | trabalho ativo, não-commitado, no worktree do executor W2-B (`agent-a60fd31afa0a89379`, branch `claude/w2b-bigint-cents`) — sem push a `origin`, sem PR aberto; desfecho entra em registro/fold posterior |
| B-1 | Backup do `dev.db` | ✅ **FECHADO** | PR #235, `b37ca9ec47213f358eb43fcedabf29ef4320e35d` |
| B-2 | Sem migração *down* | ⚪ **DIFERIDO por decisão** | não virou código: o backup (B-1) **é** o rollback — já emendado no `RUNBOOK-M2-DEPLOY-SMOKE.md` (item A5-3, PR #236) |
| B-3 | Artefato de deploy sem schema wireado | ✅ **FECHADO** | PR #236, `bcb94131286b6ce12e000fae00a6f791317ca1e7` (reuso de `scripts/migrate-deploy.mjs` já existente, ver §3) |
| B-4 | Ensaio de restauração nunca exercitado | 🔴 **GATE HUMANO** | runbook em branco pronto — `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` (criado no PR #235); agente não assina |
| C-1 | Sem alerta externo em falha | ✅ **FECHADO** | PR #239, `dad96d23c72441fdb15d10a99088cb5963bfb924` |
| C-2 | Sem instrumentação de tempo | ✅ **FECHADO** | PR #242, `035e527969aebc2355e974c6046c902b90cdd499` |
| D-1 | Sem índice em `JournalEntry(date)` | ✅ **FECHADO** | PR #234, `5f88696e1e395e1de4fd6486b4dcc0c80154ee68` |
| D-2 | `autoMatch` em transação única (extrato grande) | ✅ **FECHADO** | PR #240, `d2ab0e43ba99d1a2410aef41fc835afcf11770be` |
| D-3 | `accountingSyncReconcile` sem watermark (full-scan) | ✅ **FECHADO** | PR #243, `bacdef5b057c73578797fd64e5e25c359bccb7a6` |
| E-1 | `coverage().ready` mede presença, não correção | 🔴 **GATE HUMANO** | fecha com X2 (arquivo referencial RFB oficial) — `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md` |
| E-2 | ECD sem oráculo externo | 🔴 **GATE HUMANO** | fecha com H1 (PVA oficial) — `docs/accounting/RUNBOOK-H1-PVA.md` |
| E-3 | `closeExercise` sem tela | ✅ **FECHADO** | PR #238, `177c38ec679dedb4de278f99ee5ee845c61661b3` |
| G | Bloco de diferidos (A7/A8 da auditoria 08-15, LGPD/RBAC item 14, folha, imobilizado, IA/analytics, inbox/outbox) | ⚪ **DIFERIDO** | fora do escopo desta wave; nenhum dos 11 PRs toca esses eixos (confirmado por leitura dos 11 corpos — nenhuma menção) |

11 de 16 fecharam via código nesta rodada. 1 em andamento. 2 são decisão-do-dono/não-código (B-2 e o
não-fold do mapa, que não é item numerado mas é a razão de nenhum destes 11 estar em §5.1 ainda). 4
seguem gate humano fechado (B-4, E-1, E-2 — mais o G, que é decisão de escopo, não gate).

**Divergência com a lista de entrada:** a lista do pedido cita "B-2 sem migração down" como item
separado de B-1/B-3/B-4 — confirmado: **nenhuma migração `down.sql` existe no repo** (checado por
`find server/prisma/migrations -iname "*down*"` → **0 resultados**, nem nesta wave nem antes dela). O
fechamento é textual (RUNBOOK-M2, item A5-3) e não de código, como o pedido já antecipava.

---

## 2. A-3 (BigInt) — em andamento, trabalho ativo em worktree de agente

**Correção sobre a primeira versão deste registro.** A primeira leitura (2026-08-30) só via duas
branches locais paradas no mesmo commit de partida (`ed71d6a3`, a ponta de #241/A-1), sem push a
`origin` e sem PR — e essa leitura ficou datada assim que o executor W2-B voltou a escrever. O
estado real no momento desta correção (2026-08-31): o worktree
`C:\Users\smurf\Downloads\Luminaris\.claude\worktrees\agent-a60fd31afa0a89379` (branch local
`claude/w2b-bigint-cents`) tem **15+ arquivos modificados, não-commitados** — verificado pelo
orquestrador; o isolamento de worktree impede este agente de rodar `git status` diretamente contra
esse diretório (git bloqueado fora do próprio worktree). Artefatos correlatos no scratchpad da
sessão de planejamento (`tsc-baseline.log`, `tsc2.log`, `tsc3.log`, `job-diff.txt`, mtimes
2026-08-30 23:29–23:33) são consistentes com iterações reais de `tsc --noEmit` em curso — sinal de
trabalho ativo, não de branch abandonada.

Continua verdade, e não é sinal de falha: nenhuma das branches (`claude/w2b-bigint-cents` /
`-v2`) foi pushada a `origin` e não há PR aberto com "bigint" no título. Isso é o estado normal de
uma sessão ainda em execução, antes do primeiro commit — **não** leia a ausência de push como
branch parada ou trabalho estagnado.

**Desfecho:** EM ANDAMENTO. Sem branch pushada e sem diff estável para ler, não há base para avaliar
cobertura das 13 colunas nem para especular sobre o resultado — nenhuma tentativa de prever é feita
aqui. O fold real deste item (F-W2B-1 incluso) entra num registro posterior, quando a branch fechar
(commit + push + PR + revisão).

---

## 3. Forks ratificados pelo dono em 2026-08-30

Citados nos corpos dos 11 PRs mergeados **e agora também nos 4 documentos-fonte, commitados
verbatim nesta mesma branch** (ratificação do dono, 2026-08-31): `docs/accounting/BRIEFS-WAVE1.md`,
`BRIEFS-WAVE2-SCHEMA.md`, `BRIEFS-WAVE2-BACKEND.md`, `BRIEFS-WAVE2-FE.md` — cada um com uma nota de
registrador no topo apontando de volta para este documento como a fonte de desfecho real. São
registro histórico congelado: o status de fork e os "pendentes" ali refletem o momento da execução
(2026-08-30), não o resultado final — este §3 e o §1 são a leitura atualizada.

| Fork | Decisão | Onde aparece |
|---|---|---|
| **F1(b)** | `nameNormalized` = trim + fold de caixa + colapso de espaço (SEM accent-folding) | PR #241 |
| **F2 / F-W2B-1** | BigInt "tudo de uma vez" (as 13 colunas numa sessão) | citado no pedido; execução em andamento, sem branch pushada ainda (ver §2) |
| **F3(a)** | Webhook de alerta mínimo, fire-and-forget | PR #239 |
| **F4 (ampla)** | Instrumentação de tempo nas 3 camadas (job/HTTP/relatórios), não só 1 | PR #242 |
| **F5(a)** | `autoMatch` em lotes (chunk) de tamanho fixo | PR #240 |
| **F6 (agora)** | Watermark trailing implementado já, não adiado | PR #243 |
| **F7 (agora)** | Tela de encerramento implementada já | PR #238 |
| **F-W2F-3** | Resíduo aceito: colisão de tumba depende de invariante de aplicação, não de constraint | PR #243 (ver achado §4) |

**Forks de rotina decididos pelo orquestrador e citados nos PRs** (contagem real, não "~15"): **19**
sub-decisões nomeadas — F-C1/F-C2 (#235), F-A1/F-A2 (#237), FORK 1/2/3 (#238), F-W2C-1/F-W2C-2
(#239), F-W2E-1/F-W2E-2 (#240), F-W2A-3/F-W2A-4/F-W2A-5 (#241), F-W2D-1/F-W2D-2 (#242),
F-W2F-1/F-W2F-2/F-W2F-3 (#243). **Divergência com o pedido:** a lista de entrada estimava "~15";
a contagem real nos corpos de PR é 19 — reporto a diferença, não corrijo a estimativa por ela.

---

## 4. Achados não-bloqueantes — confirmados por leitura direta do código (não só do texto do PR)

Cada um abaixo foi **relido no arquivo fonte**, não só extraído do corpo do PR:

- **#242 — requisição abortada pelo cliente não é medida.** `server/src/middleware/httpTiming.ts:22`
  usa só `res.on('finish', ...)`; não há listener em `close`. O próprio docstring do arquivo (linhas
  13-17) documenta que `finish` cobre 2xx/4xx/5xx, mas não menciona abort do cliente — a lacuna não
  está documentada como conhecida, é uma omissão real.
- **#242 — anti-ruído de 403 tem teste explícito em só 1 dos 6 métodos.** Grep por
  `does NOT log the metric` em `server/src/features/accounting/services/__tests__/` retorna **1
  único hit**, em `AccountingReportService.test.ts:363`, para `accountLedger`. Os outros 5
  (`trialBalance`, `balanceSheet`, `incomeStatement` em `AccountingReportService.ts`; `dailyJournal`
  em `DailyJournalReportService.ts`; `cashFlowStatement` em `CashFlowReportService.ts`) **têm o
  comportamento correto por inspeção** — `startTimer` aparece sempre DEPOIS do `if
  (!this.policy.canRead(...))` nos 6 métodos (confirmado por grep de linha) — mas só 1 tem teste que
  afirma isso.
- **#242 — os 3 timers de geração ficaram sem `warnThresholdMs`.** `server/src/lib/reportThresholds.ts`
  só define `REPORT_WARN_THRESHOLDS_MS` (6 relatórios) e `HTTP_WARN_THRESHOLD_MS`; os 3 call sites de
  `metrics.startTimer('sped_ecd_generation'|'sped_ecf_generation'|'data_exchange_export')`
  (`SpedGenerationService.ts:136`, `SpedEcfGenerationService.ts:180`,
  `DataExchangeExportService.ts:148`) chamam `endTimer({...})` sem o campo — confirmado por leitura
  dos 3 arquivos. Decisão do orquestrador citada no PR: threshold só com medição real, `durationMs`
  presente já basta para esta wave.
- **#241 — colisão entre "tumbas" depende de invariante de aplicação, não de constraint.** O
  comentário da própria migração (`20260830160349_counterparty_identity_normalization/migration.sql`,
  linhas 15-19) explica que duas linhas arquivadas nunca colidem porque o prefixo `deleted:<id>:<name>`
  embute um `cuid` globalmente único — mas essa garantia depende de `archiveCounterparty` **sempre**
  escrever esse prefixo exato; não há `CHECK` de schema que force o formato. É uma invariante de
  aplicação documentada, não uma constraint de banco.
- **#241 — docstring de `mintCounterparty` cita a chave antiga.** `counterpartyResolution.ts:81`
  ainda diz `@@unique([userId,unitId,type,name])` — a chave real, desde este PR, é
  `(userId,unitId,type,nameNormalized)`. Comentário morto, confirmado por leitura; não afeta
  comportamento (é só doc inline).
- **#243 — resíduo F-W2F-3 documentado no job e na migração.** Confirmado em dois lugares:
  `server/src/jobs/accountingSyncReconcile.job.ts` (busca por `KNOWN RESIDUAL` retorna hit) e
  `server/prisma/migrations/20260830130000_add_job_watermark/migration.sql`. O resíduo: um item que
  falha isolado (fault-isolated) some do scan da marca depois de `OVERLAP_MS` sem ser retocado — troca
  retry-infinito por retry-com-janela; decisão do dono pendente sobre rescan periódico.
- **#235 — runbook B-4 registra ausência de linha no mapa.** Grep por `B-1|B-4` em
  `docs/accounting/ACCOUNTING-MASTER-MAP.md` → **0 ocorrências**, confirmando o que o PR já
  registrava: não há linha "B-1"/"B-4" no mapa mestre; o runbook aponta isso no campo de rastreio
  para o dono preencher se/quando o mapa ganhar a linha.

---

## 5. Método do pipeline

Executor → revisor independente (worktree separado) → merge serial, um PR por vez, cada branch
nascendo de `origin/main` fresco. Dois desvios de BRIEF foram sancionados pelo orquestrador, não
pelo executor: **#236** reusou `scripts/migrate-deploy.mjs` já existente em vez de criar o script
novo que o BRIEF pedia (achado de "reuse antes de recriar" antes de codar); **#240** introduziu um
cursor efêmero (`afterLineNumber`) não previsto no pseudocódigo do BRIEF, para fechar um loop
infinito que o desenho original do BRIEF teria produzido em lotes com linhas sempre-ambíguas. O
orquestrador relata 3 FAILs de review reais anteriores aos PRs finais (#233 ponteiro morto vizinho,
#239 escape síncrono do webhook, #243 resíduo não documentado) e 1 agente que morreu após pushar sem
perder o trabalho — **nenhum dos dois é verificável por artefato de git**: os PRs mergeados já
representam o estado final pós-correção, e o histórico de review/sessão que precedeu cada PR não
sobrevive no repositório. Registro como relatado pelo orquestrador, grau **informado**, não
verificado.

---

## 6. O que continua sendo gate humano

Nenhum agente substitui estes. Runbooks confirmados **sem nenhuma assinatura**
(`grep -c "\[x\]" docs/accounting/RUNBOOK*.md` → 0 em todos):

| Gate | Runbook | Cobre |
|---|---|---|
| **H1** — sign-off PVA | `docs/accounting/RUNBOOK-H1-PVA.md` | ECD/Apuração/ECF no PVA oficial da RFB (fecha E-2) |
| **H2** — sign-off de browser | `docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md` | app em build de produção contra `dev.db` real |
| **X2** — arquivo RFB | `docs/accounting/RUNBOOK-X2-RFB-REFERENCIAL.md` | referencial oficial "PJ em Geral" (fecha E-1) |
| **M2** — deploy | `docs/accounting/RUNBOOK-M2-DEPLOY-SMOKE.md` | 1º deploy real, host provisionado (ADR-M2 §7 aberto) |
| **B-4** — ensaio de restauração | `docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` | backup → restaurar → validar (nunca exercitado) |

Todos em branco por desenho — agente prepara o runbook, não preenche evidência, não marca desfecho,
não assina. Runbook sem assinatura é nulo.

---

## 7. Proposta, não ratificação

Este documento **não** entra na fila §5.1 do `ACCOUNTING-MASTER-MAP.md` nem dobra o
`PROXIMOS-PASSOS-2026-08-28.md`. Fold é decisão do dono (ORCH-006) — este registro só organiza o que
já está em `origin/main` mais o que ainda falta, para essa decisão ser tomada com o inventário
completo na mão.
