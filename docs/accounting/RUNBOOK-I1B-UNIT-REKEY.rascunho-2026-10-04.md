# RASCUNHO — RUNBOOK I1b (re-key do `unitId` legado) — evidência dos passos 1–3

> **RASCUNHO NÃO ASSINADO.** Saída crua dos passos 1–3 colada pelo agente a pedido do dono (2026-10-04, chat),
> executada no checkout raiz `C:\Users\smurf\Downloads\Luminaris` em `main` = `fbd99ab3`.
> O agente **não** marca desfecho e **não** assina. Este arquivo **não substitui** `RUNBOOK-I1B-UNIT-REKEY.md`:
> vale como runbook só depois que o executor humano conferir, copiar para o runbook oficial, marcar o desfecho e assinar.

Executor: ____________________ (humano)           Data: ____________

## Passo 1 — Servidor PARADO

Comandos: `netstat -ano | findstr :3001` e listagem de `node.exe` cuja linha de comando casa `server|prisma|ts-node|studio|nodemon|tsx` (excluídos MCP/codebase-memory).

```
--- netstat :3001
(vazio)
--- node procs ligados a server/prisma/studio
(nenhum)
```

Limite: não prova que nenhum processo segura o `dev.db`; o dono confere (Prisma Studio, visualizador SQLite).

## Passo 2 — Plano (só leitura)

Comando: `node scripts/rekey-legacy-unit.mjs --plan` — exit 0

```
alvo: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db
```

JSON `rows` (cabeçalho `[env]` omitido; sem valores de segredo na saída):

| ownerUserId | unitId | status | accounting_periods | period_transitions | accounts | journal_entries | je_sequences | data_exchange_jobs | data_exchange_rows | postings | bindings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| cmr2jfl4v0000ciakz7tduht3 | cmr2jyirc006oci1kscm61n6n | SKIP_REAL_UNIT | 12 | 7 | 20 | 7 | 2 | 11 | 17 | 14 | 1 |
| cmr2jfl4v0000ciakz7tduht3 | unit-incr6-val | LEGACY | 12 | 1 | 14 | 4 | 1 | 15 | 25 | 8 | — |
| cmr2jfl4v0000ciakz7tduht3 | unit-incr6-val-1782938879534 | LEGACY | 12 | 1 | 14 | 4 | 1 | 15 | 25 | 8 | — |
| cmufn7n590000cixkxbls0agh | seed-unit-presumido | EXCLUDED_TENANT | 24 | 45 | 19 | 357 | 2 | 1 | — | 717 | 1 |
| cmufn7te50279cixko3lvgj5x | seed-unit-real | EXCLUDED_TENANT | 24 | 45 | 19 | 357 | 2 | — | — | 717 | 1 |

Colunas adicionais só nas linhas `EXCLUDED_TENANT` (idênticas nas duas): `referential_mappings` 14, `source_documents` 84,
`journal_entry_sources` 84, `payables` 42, `payable_payments` 42, `receivables` 42, `receivable_receipts` 21,
`counterparties` 2, `fiscal_profiles` 1.

A tabela é a transcrição da saída JSON; a saída JSON integral está no chat da sessão (2026-10-04).

## Passo 3 — Lista de aplicação

Regra: todo `LEGACY` exceto `unit-incr6-val` e `unit-incr6-val-1782938879534` (F-RK-3 b).

```
ownerUserId | from | --name | --type
(vazia)
```

## Passo 8 — `smoke:migration` (integridade; 0 migrações pendentes)

Comando: `cd server && npm run smoke:migration` — exit 0 (pedido do dono, chat, 2026-10-04)

```
original: C:\Users\smurf\Downloads\Luminaris\server\prisma\prisma\dev.db (md5 9de3277d376e3ef40b9d186f068e3c8c)
cópia:    C:\Users\smurf\AppData\Local\Temp\smoke-migration-5yg7Tb\copy.db
migrações aplicadas na cópia: 0
tabelas=74 · journal_entries=729 · postings=1464 · accounts=86 · audit_events=1417

OK: sem migração pendente — gate rodou como CHECAGEM DE INTEGRIDADE do estado atual. Original intocado (S1).
```

Prova só integridade (S1–S8 na cópia), não o re-key.

## Passo 10 — Restart e boot (build de produção)

Pedido do dono (chat, 2026-10-04). `cd server && npm run build` (exit 0, a partir de `fbd99ab3`) e
`NODE_ENV=production node dist/server.js` contra o `dev.db` real. A **1ª tentativa foi descartada**: a porta 3001 estava
com um `ts-node-dev` de outra sessão (worktree `fe-incr-accountant-governance`), então as respostas dela não eram do build
de produção (ver Achados). A evidência abaixo é da **2ª tentativa**, com a porta livre e o listener conferido.

```
listener PID=39000  CreationDate 04/10/2026 23:12:46  CommandLine "C:\Program Files\nodejs\node.exe" dist/server.js
GET /health  -> {"status":"degraded","uptime":15.8,"checks":{"database":"ok","qdrant":"error"}}   (HTTP 503)
GET /api/accounting/accounts?unitId=cmr2jyirc006oci1kscm61n6n (sem token) -> {"code":"UNAUTHORIZED",...} HTTP 401
grep -c "Boot ABORTADO" no log -> 0
```

Log de boot (trecho): `Luminaris Server running on http://localhost:3001`; jobs `accounting_sync_reconcile` e
`dfe_poll_pending` agendados; erro de Qdrant (`fetch failed`) — `QDRANT_URL` configurado mas inalcançável, degrada o
`/health` para 503, não aborta o boot. Servidor encerrado ao fim; porta 3001 livre.

**Divergência do esperado do runbook:** o esperado é `GET /api/accounting/accounts?unitId=<novo>` = **200**. Não há `<novo>`
(lista do passo 3 vazia) e o agente não faz login; o 401 só prova que a rota está montada e protegida. O 200 autenticado
**não foi verificado**.

## Passos 4–7 e 9 — NÃO EXECUTADOS

Nenhum comando dos passos 4–7 e 9 foi rodado. Com a lista do passo 3 vazia, os passos 6, 7 e 9 não têm unidade a aplicar;
4 e 5 só protegem um `--apply`.
O `dev.db` real **não foi alterado** (`--plan` e `smoke:migration` só leem; S1 confirma o md5 do original).

## Desfecho (marcar UM — humano)

[ ] PASSOU
[ ] FALHOU
[ ] BLOQUEADO

## Registro (humano anota)

- Órfãos (F-RK-3 b), contagens do passo 2: `unit-incr6-val` e `unit-incr6-val-1782938879534` — cada um 14 contas, 4 lançamentos, 8 postings, 12 períodos (transcrição acima; conferir)
- Excluídos (F-RK-2 a), contagens do passo 2: `seed-unit-presumido` e `seed-unit-real` — cada um 19 contas, 357 lançamentos, 717 postings (transcrição acima; conferir)
- Achados no caminho (anotados pelo agente; humano confere): na 1ª tentativa do passo 10 a porta 3001 já era usada por um
  `ts-node-dev --respawn` de outra sessão (PID de worktree `fe-incr-accountant-governance`, 23:10:25). O agente encerrou o
  processo filho que escutava (PID 31944) antes de perceber de quem era — **derrubou o dev server de outra sessão**; o pai
  `ts-node-dev` (PID 51388) segue vivo, mas sem filho escutando. Reiniciar lá se a outra sessão precisar.
- Atualização de `docs/plano/nos/I1b.md` com o desfecho + data: ____________
- Assinatura do executor: ____________
