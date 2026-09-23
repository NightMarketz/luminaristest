# Próximos passos — 2026-09-17 — prompt de orquestração pós-C6b (sucede o de 14/09)

> **Uso:** cole o bloco "PROMPT" numa sessão nova com `luminaris-orchestrator`. Autocontido: cita as
> autorizações, fixa a ordem (R6) e diz o que NÃO fazer. **Uma sessão executora de código por vez** —
> hoje há uma viva no C6b PR-2 (#338, worktree `agent-a3bb9869f94170417`); quem colar isto **não abre
> segunda sessão de código** enquanto ela existir (PAR-005: mesmo domínio ⇒ serial).
>
> **[Fold 2026-09-17, preflight da 1ª sessão que colou este prompt]** #338 **mergeado** (`15c8bf53`, 03:40Z); a
> sessão de código viva agora é a do **C6b PR-3 = #340** (`claude/c6b-pr3-delivery-items`, `71b87c63`, worktree
> `agent-ab9c16574065aa80c`) com review independente em voo em `review-pr3` (`agent-a996900b13769c688`). A
> coluna Estado abaixo foi atualizada; o resto do texto segue como escrito.
>
> **[Fold 2026-09-18 — X10b executado e FECHADO fora deste doc.]** BE-INCR-DFE rodou por sessão separada
> depois deste plano: PR-1 #348 `f00b304a`, PR-2 #349 `0dcbb22b`, PR-3 #350 `e61c0f6d`, os 3 MERGEADOS em
> `main` (confirmado por `git merge-base --is-ancestor` + `gh pr view`, 18/09). A linha 94 ("Não fazer:
> X10b/emissão — espera D1f + D5") está **HISTÓRICA** — D1f virou config no próprio BRIEF (§0 D-X10b-2),
> D5 segue sem parceiro real (porta com `Null`/`File`, decisão do BRIEF, não um bloqueio que sobrou).
> Detalhe do fold em [`ACCOUNTING-MASTER-MAP.md`](ACCOUNTING-MASTER-MAP.md) (régua 45/57, fiscal 9/16).
>
> **[Fold 2026-09-21 — Trecho A da CADEIA-A em voo; dois itens novos de motor (fora da régua).]** Verificado
> em `origin/main` **`0548d19a`** (`gh pr list --state merged` + corpo dos PRs): **"executa C12"** e **"executa C8"**
> dados pelo dono em **18/09** (citados nos corpos de #353 e #354) — o `STOP` do `CADEIA-A.md` §4 é **HISTÓRICO**.
> **C12 ✅ #353 `edb80ec8`** (passo 4 fecha). **C8: PR-1 ✅ #354 `077cbdbe` · PR-2 ✅ #355 `5f9c71d7` · PR-3 ✅ #356
> `0548d19a`**; PR-4 (retificação versionada, Bloco G) e PR-5 (NF-e modo 4) **não abertos** — a dependência
> C12 → PR-4 (`SignerSchema`, CADEIA-A §3) está **satisfeita**. Nenhum PR aberto em 21/09. **Master map NÃO
> foldado desde #351** (banner 45/57, linha do C12 ainda "falta executa") — é o passo 9, pendente. **Novo:** a
> leitura do motor DynamicTable ao avaliar "contabilidade em `DynamicTableData`" achou 2 lacunas de **classe**
> (não contábeis) e 1 erro de texto no Contrato §2.1/§2.2 (dizia "impossível"/"scan em JS" onde é
> `json_extract` antes da tx sem gate) → passos **10** (PR docs desta branch), **11** e **12** (GAP-MAP fila 7/8,
> só com "instrumenta"). Linhas 4/5 da tabela e Detalhamento atualizados; o resto do texto segue como escrito.
> **[22/09]** Decisão do **motor de domínio** (MutationEngine + OrchestrationEngine + fila), tomada em **21/09** e encaixada nos docs em 22/09: **REJEITADA** — `docs/adr/ADR-DOMAIN-MOTOR-rejected.md`
> (primeiro ADR `Rejected`), master map §4. Vencedor = Contrato **§2.3** (`[AC-2.3-1..3]`) + cabeçalho `atomicUntil` cobrado por
> `SVC-008`/`REV-008`; primitiva `commitThenReconcile` só por incidente. Docs entram no passo **10**; boundary test + retrofit dos
> 8 chamadores de `postEntry` = passo **13** (PR-B, [H]).
>
> **Por que este doc existe:** o de 14/09 fechou **11 de 12 passos** (fold 16/09) e não tinha sucessor — a
> "fila" seguinte vivia só na tabela "O que esta cédula destrava" da `CEDULA-DECISAO-2026-09-16-…`. Este
> doc é essa fila, com o algoritmo do grafo 09-14 §4 aplicado sobre `origin/main` **`daf76279`** (#337).
> Autorização para escrevê-lo: dono, em sessão, 2026-09-17 — *"Faz os dois: corrige o GAP-MAP e escreve o
> PROXIMOS-PASSOS-2026-09-17"*. **Escrevê-lo não autoriza executar nada** — cada nó de código abaixo
> continua exigindo "executa" (ORCH-006), exceto onde a coluna Autorização cita um já dado.

---

## PROMPT

Você é o orquestrador do Luminaris (`luminaris-orchestrator`). Toda tarefa abaixo roda **pela sessão
correspondente** (`sessao-planejamento` / `sessao-feature` / `sessao-instrumentacao` /
`sessao-correcao` / `sessao-integracao`), com o formulário preenchido; executar de mão livre é violação
de escopo. Review independente = agente separado em worktree (`reviewer-independence-separate-agent`).
Merge só após PASS + `tsc`×2 + CI verde (`loop-auto-merge-after-review`). Gate humano e dado externo
(B-4, X2, H1 2ª passada, H2, H3, M2, contador, parceiro D5, convênio D6) **não têm sessão** — prepare
runbook em branco, nunca preencha.

### Autorizações citáveis (todas em `main` `daf76279`, salvo onde marcado)

- `CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md` — 20/20 forks C11·C12·C6b·C8·SEED-MY → (a);
  adendo do mesmo dia: **"executa C11"** (✅ #334) e **"executa C6b"** (PR-1 ✅ #337, PR-2 🔄 #338, PR-3 ⬜).
  **Adendo 16/09 (tarde), em voo neste worktree:** F-C12-5/6/7 → (i)/(a)/(a).
- `BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md` (#336) — 3 PRs seriais, passos 1–14; é a spec do
  C6b junto com o BRIEF.
- `BE-INCR-SPED-IDENTITY-MASKS-brief.md` + `…-transcription-J930-0930.md` (transcrição 16/09, sha256
  conferidos) — C12 `ready`, **11 comportamentos**, sem "executa".
- `ADR-INCR-FIXED-ASSETS.md` (Proposed) + `BE-INCR-FIXED-ASSETS-brief.md` — C8 `ready`, sem "executa".
- `FE-INCR-LALUR-brief.md` §3 — PR 2 `ready` (F-FE-4 → a), sem "executa".
- `SEED-MULTI-EXERCICIO-brief.md` — forks ✅; **bloqueado por B-4 assinado** (stop humano).
- Algoritmo de escolha do próximo nó: `GRAFO-DEPENDENCIAS-2026-09-14.md` §4, R6 aplicado. Contagem da
  régua: §7.1 do master map (tela de nó existente = crescimento, não nó).

### Passo 0 — preflight (obrigatório, `verify-write-context-before-writing`)

1. `git fetch origin main`; `merge-base --is-ancestor` de **`daf76279`** (#337). Se `main` avançou,
   releia `gh pr list --state merged --limit 5` antes de citar qualquer estado desta tabela.
2. `gh pr list --state open` — esperado hoje: **#338** (código, C6b PR-2). Qualquer outro PR de código =
   **pare e pergunte**.
3. Zero jest concorrente (`tasklist | grep -i node`; classe `jest-concorrente-windows-ebusy`).
4. `git worktree list` — worktrees que tocam `docs/accounting/`: `agent-a3bb9869f94170417` (#338),
   `blissful-antonelli-4bfd90` (C12 transcrição + este doc, branch `claude/pos-c6b-queue-blockers-35f6f9`).
   Não edite o BRIEF C12 nem a cédula 16/09 fora dessa branch até o PR dela mergear.

### Ordem de execução (R6: contábil → financeiro → fiscal; inflight → spec+forks → BRIEF → ADR; docs-only intercalável)

| # | Nó | Módulo | Sessão | Entrada / regra | Saída esperada | Autorização | Estado (17/09) |
|---|---|---|---|---|---|---|---|
| 1 | **C6b PR-2** (#338) | contábil | review independente → `sessao-integracao` | Passos 8–10 do plano (`EXPORT_BANK_RECONCILIATION`, `EXPORT_ENTRY_SAMPLE`, F-C6b-5/8 → a); CI 5/5 verde, MERGEABLE, **0 reviews** | PASS + merge (squash) | "executa C6b" 16/09 | ✅ #338 `15c8bf53` (17/09) — fold 1.3 neste PR |
| 2 | **C6b PR-3** ✅ #340 `373d00d4` | contábil | `sessao-feature` | Passos 11–14: `AccountingDeliveryItem` + `packageProfile` (1 migração, 2 tabelas, prólogo `IF NOT EXISTS`), manifesto N-ário, backfill, extras; 14 arquivos, ~20 casos + `smoke:migration` | PR + review + merge; **C6b `done`** | "executa C6b" 16/09 | 🔄 **#340** `71b87c63` (review independente em voo; CI server pending 17/09) |
| 3 | **Docs C12 + GAP-MAP + este doc** | docs | `sessao-integracao` docs (PR docs-only) | branch `claude/pos-c6b-queue-blockers-35f6f9`: transcrição J930/0930, BRIEF C12 (item 11, F-C12-5..7), adendo da cédula 16/09, GAP-MAP l.39 `[FECHADO #267]`, este doc | merge; C12 `ready` citável em `main` | dono 17/09 ("faz os dois") | 🔄 (este worktree) |
| 4 | **C12** máscaras de identidade no SPED | contábil | `sessao-feature` | BRIEF itens 1–11; write-set = `SpedEcdDto/SpedEcfDto/SpedEcfRealDto`, const nova `models/spedQualifAssinante.ts`, serviço de geração (resolução de `contactId`), snapshots; **disjunto do C6b** (PAR-001) — pode correr em worktree paralelo ao passo 2 se o dono autorizar 2 sessões | PR + review + merge; contábil ~~18→19/22~~ **19→20/22** (o 19 veio do C6b em 17/09; corrigido 22/09) | ~~falta "executa"~~ **"Executa C12" 18/09** (corpo do #353) | ✅ **#353 `edb80ec8`** (20/09) — ✅ foldado no master map 22/09 (passo 9; contábil 20/22) |
| 5 | **C8** imobilizado + depreciação | contábil | `sessao-feature` | 37 comportamentos; ADR Proposed → Accepted no PR de código; 2 txs (`postentry-tx-raiz-subrazao-2-commits`); J801/J932; quota cumulativa; Anexo III do corpus (chave = ordinal da fonte) | PR(s) + review + merge; contábil +1 | ~~falta "executa"~~ **"Executa C8" 18/09** (corpo do #354; F-FA14 → b, F-FA15 → a em `CADEIA-A.md` §1) | 🔄 **PR-1 ✅ #354 · PR-2 ✅ #355 · PR-3 ✅ #356** · **PR-4 ⬜ · PR-5 ⬜** (permutáveis; PR-4 destravado pelo #353) — **5.2 ✅ plano granular 17/09** (`BE-INCR-FIXED-ASSETS-execution-plan.md`, 5 PRs); 5.3 ✅ sha no plano (arquivo **não em disco**: A1) |
| 6 | **FE-INCR-LALUR PR 2** (M410 + fechar trimestre + diagnóstico na tela) | contábil (crescimento X4) | `sessao-feature` | BRIEF FE-LALUR §3; `withAuth` ⇒ verificar contra build de produção; vitest com shim `React` global | PR + review + merge; numerador inalterado | **falta "executa"** | ⬜ [H] |
| 7 | **FE-INCR-BANK-SETTLEMENT** (tela do F7) | financeiro (crescimento F7) | `sessao-planejamento` | insumos: `BE-INCR-BANK-SETTLEMENT-brief.md`, 5 rotas do #326, aba Conciliação existente (reuse canônico: GenericTable/Modal/StandardPagination) | BRIEF + forks PENDENTES | dono 17/09 (`PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`, F-PS-1 → a) | ✅ **BRIEF 17/09 (sessão 6)** — `FE-INCR-BANK-SETTLEMENT-brief.md`, F-FE-BS-1..4 [H] |
| 8 | **SEED-MY** | pré-gate | `job-generator` | BRIEF ✅; forks ✅ (F-SEED-2 a · F-SEED-3 b) | seed 2025+2026; `RUNBOOK-H1` P0 | **B-4 assinado** (`RUNBOOK-B4`: 0 `[x]` hoje) | ⬜ [H] gate |
| 9 | **Fold** | docs | `sessao-integracao` docs | master map §5.1/§7.1 + grafo §4.2 + este doc (coluna Estado) após cada merge de código | régua atualizada | — | contínuo — ~~⬜ atrasado em 21/09~~ **✅ fold 22/09:** #352–#356 foldados (banner **46/57**, contábil 19→**20/22** pelo C12; C8 conta no PR-5, alternativa 47/57 declarada); `GRAFO-DEPENDENCIAS-2026-09-14.md` corrigido (C9 absorvido no C8). Próximo fold: quando PR-4/PR-5 do C8 mergearem |
| 10 | **Docs: Contrato §2.1/§2.2 + GAP-MAP 7/8** | docs (motor) | `sessao-integracao` docs (PR docs-only) | branch `claude/domain-motor-architecture-7ec49d`: `_ARCHITECTURE-CONTRACT.md` (4 trechos, IDs preservados — "impossível em `data: Json`" → custo sem invariante; `[AC-2.1-B5]`/`[AC-2.2-2]` mecanismo real = `json_extract` antes da tx, `compositeUnique` full scan, upgrade (b) = padrão do `noOverlap`), `GAP-MAP.md` (célula `noOverlap` → FECHADO `93945426`; linhas novas Nível 4 e Nível 3; fila 7/8), este fold. **+ 22/09, encaixe da decisão do motor (tomada 21/09):** Contrato **§2.3** novo (`[AC-2.3-1..3]` + template), `ADR-DOMAIN-MOTOR-rejected.md` + `INDEX.md`, master map §4 (linha, sem régua), GAP-MAP Nível 3 (`[PAPEL]`, comando → 8) + fila 9, skills (`SVC-008` + etapa 9 + governance/eval/controls; `REV-008` + governance/eval; linha em `sessao-feature`; cláusula em `SEL-004`), `server/CLAUDE.md` gate 6, `governance/coverage.md` (3 linhas), PLAYBOOK §0, READMEs. Gate: `skill-audit run --all` 0 findings **após** as skills | merge; GAP-MAP 7/8/9 + §2.3 citáveis em `main` | dono 21/09 ("atualiza o plano…") + 22/09 (plano de encaixe aprovado, 4 forks fechados) — **commit/PR ainda não pedido** | 🔄 (este worktree, sem commit) |
| 11 | **GAP-MAP 7 — `unique`/`compositeUnique` sem gate in-tx** | motor DynamicTable (fora da régua; beneficia CRM/vendas) | `sessao-instrumentacao` → `sessao-correcao` | `validateAdvancedRules` (`json_extract`) roda **antes** de `prisma.$transaction`; só `enforceNoOverlap` re-checa dentro; `runSerializedIfNoOverlap` só arma `withTableWriteLock` com regra `noOverlap`. Teste = gêmeo `it.failing` do `NoOverlapConcurrency.integration.test.ts` (N writes da mesma chave → 1 persistido). **Só a CI Linux prova o vermelho** (`windows-serializa-sqlite-ci-linux-nao`) | teste-guarda vermelho na CI → fix pelo padrão `93945426` (lock + re-check in-tx com repo tx-bound) | **falta "instrumenta"** | ⬜ [H] |
| 12 | **GAP-MAP 8 — `deleteTableData` ignora `immutableAfter`/`lifecycle`** | motor DynamicTable (fora da régua) | `sessao-instrumentacao`; fix só após fork | Guards 2/3 rodam só em `updateTableData`; delete = `beforeDelete` → `deleteConstraints` → soft delete. Teste = `immutableAfter scope:'all'` satisfeito → `deleteTableData` deve lançar. **Fork do fix é do dono:** (a) guard no delete × (b) `deleteConstraints` RESTRICT no pai | teste-guarda vermelho; fork ratificado; depois `sessao-correcao` | **falta "instrumenta"** + fork | ⬜ [H] |
| 13 | **PR-B — `atomicUntil` boundary test + retrofit dos 8** | motor contábil (fora da régua) | `sessao-instrumentacao` (teste vermelho: 8 ofensores) → `sessao-correcao` (8 cabeçalhos) no **mesmo PR** | Contrato `[AC-2.3-2]`; população calculada pelo próprio teste (`grep .postEntry(` em `features/*/services`, exclui `PostingService`) — sem registro a manter; cada linha cita teste existente; linha sem teste escreve `[sem teste — GAP-MAP]`, **não** inventa teste de comportamento; 0 lógica tocada | teste verde; GAP-MAP Nível 3 `[PAPEL]→[COBERTO]`; `governance.md` de `backend-service-generator` ganha gate `type: static`; `coverage.md` `AC-2.3-2` ✅ | **falta "executa"** (ADR-DOMAIN-MOTOR §2 item 4) | ⬜ [H] |

Fora da régua e sem fila própria (só quando o dono chamar): `FE-INCR-REVIEW` (aba do C11) — **✅ BRIEF 17/09 sessão 6,
F-FE-RV-1..4 [H]**; `FE-INCR-DELIVERY` (consome C6b; `files[].kind` = `ExportKind` **registrado como contrato**) — **✅ BRIEF
17/09 sessão 6, F-FE-DL-1..4 [H]**; `FE-INCR-FIXED-ASSETS` (tela do C8) e `FE-INCR-SPED-SIGNERS` (combobox de qualificação,
BRIEF C12 §6.3 — rota nova) **esperam o merge do BE** (F-PS-4 → a). **Insumo comum dos 3 BRIEFs de FE + C8 item 30:**
`GET /api/accounting/data-exchange/jobs` (lista) — não existe; quem mergear primeiro cria (F-FE-RV-1 a / F-FA15 a).

**Cadeia crítica:** emissão 01/10 ← D1f · D5 · **M2** (~~D-NFSE~~ saiu 17/09 — no corpus desde 10/09, `MANIFEST.md` l.21–29; grafo §0.4). Nenhum passo desta
tabela a move. Gates humanos abertos e **em branco** (0 checkbox nos 5 runbooks, verificado 17/09): B-4 →
SEED-MY → H1 2ª passada; H2; X2 (executável desde 31/08, arquivo no corpus); M2. Dado externo: **envio do
pedido ao contador** (#331, itens 6–13 — dono envia), D2, D5, D6.

Regras de fila: passo 1 antes do 2 (serial obrigatório, plano §7); 3 intercala enquanto 1 espera review;
4/5/6 só com "executa" — a ordem entre eles é sugestão (C12 é o menor e tem transcrição fresca; C8 é a
maior peça contábil restante); 7 só com autorização citável de BRIEF. **Nada abaixo do passo 3 roda sem
sinal do dono.** **[21/09]** Com 4 ✅ e 5 em PR-4/PR-5, a ordem sugerida agora é: **9** (fold atrasado, docs) →
**10** (PR docs deste worktree) → **5 PR-4/PR-5** (já autorizados, serial no domínio contábil) → 6 [H]. **11/12 são
motor, não contábil** (write-set `DynamicTableService.ts` + teste de integração; disjunto do C8, PAR-001) — podem
correr em paralelo ao C8 se o dono der "instrumenta", mas **não contam na régua** e não se somam ao
"aparato de auditoria" (bancada desligada 2026-08-09): são a Fase 3 do GAP-MAP aplicada à regra vizinha.
**[22/09]** 13 depende de 10 mergeado (cita a §2.3); write-set = 8 JSDocs + 1 teste novo, disjunto do C8 PR-4/PR-5 —
pode correr em paralelo se o dono der "executa"; também fora da régua.

### Não fazer

- **Não** dar "executa" por conta própria a C12/C8/FE-LALUR-2 nem abrir o BRIEF do passo 7 sem citação.
- **Não** abrir segunda sessão de código no domínio contábil enquanto o C6b PR-2/PR-3 estiver em voo
  (PAR-005) — exceção só se o dono autorizar C12 em paralelo (write-set disjunto declarado no passo 4).
- **Não** tocar `reconcile_pending_items` (R9), **não** reabrir P-IA (R10), **não** Serpro (R5), **não**
  aparato de auditoria (bancada desligada 2026-08-09). ~~X10b/emissão (espera D1f + D5...)~~ — **HISTÓRICO,
  ver fold 2026-09-18 acima: X10b já rodou e fechou (#348/#349/#350).**
- **Não** preencher evidência, marcar desfecho ou assinar runbook (B-4, X2, H1, H2, H3, M2).
- **Não** reabrir F-C12-3 (a) — o achado dos exemplos `1SP123456` (transcrição §5.4) está registrado com o
  risco que o fork já declarava; reabrir é decisão do dono, não do executor.

### Gates de envio por PR (OPS-001)

`cd server && npx tsc --noEmit && npm run test:integration` · `cd my-app && npx tsc --noEmit` ·
`npm run docs:generate` diff vazio se tocou rota/DTO · `npm run smoke:migration` se trouxe migração (PR-3
do C6b: **sim**) · snapshot de DTO regenerado (C12: 3 DTOs) · allowlist de auditoria · guard de path-count ·
review independente PASS · relatório com as 5 perguntas do OPS-001 e o caso adversarial nomeado.

Comece pelo **passo 0** e reporte o estado dele antes do passo 1.

---

## Detalhamento por passo (granularidade para a sessão executora)

> Convenção: ✅ feito · 🔄 em voo · ⬜ aberto · [H] espera o dono. Cada sub-passo tem comando ou artefato.

### Passo 1 — C6b PR-2 (#338) ✅ #338 `15c8bf53`

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 1.1 | Review independente em worktree separado; sondas mínimas: `perAccount`/`seed` rejeitados fora do kind (`param-aceito-e-ignorado`) · código da conta bancária via `IAccountReader`, não via `trialBalance` (F1 do review PR-1) · determinismo da amostra pelo `seed` (mesma entrada ⇒ mesma saída, 2ª chamada) · snapshot de DTO regenerado | relatório PASS/FAIL no PR | ✅ (mergeado 17/09 03:40Z — relatório no PR) |
| 1.2 | CI verde no SHA revisado (5 checks já verdes em `2e0c8244`); **um** rerun se instável | `gh pr checks 338` | ✅ (17/09) |
| 1.3 | Merge squash + linha no master map §5.1 (C6b "PR-2 ✅") | commit de fold | ✅ merge `15c8bf53` · linha do master map neste PR (#339) |

### Passo 2 — C6b PR-3 🔄 #340

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 2.1 | `sessao-feature` com BRIEF + plano §PR-3 (passos 11–14); worktree novo ⇒ `npm ci` + `.env` (`worktree-deps-stale-prisma-client`) | formulário preenchido | ✅ (#340 aberto 17/09, Passos 1–4 + 11–14) |
| 2.2 | Migração aditiva única (2 tabelas) com prólogo `IF NOT EXISTS`; backfill idempotente; `npm run smoke:migration` contra cópia do `dev.db` real (`server/prisma/prisma/dev.db` — `dev-db-real-path-is-nested`); S6 reprova backfill por desenho — declarar | relatório do smoke no PR | ✅ smoke 5 migrações OK, S6 vacuoso (logs = 0); **review pegou `ADD COLUMN` sem guarda como 1ª instrução** (SQLite sem `IF NOT EXISTS` p/ coluna) → movido p/ o fim (`63f02b04`), abort/retry simulado em 2 pontos |
| 2.3 | `resetDb()` cobre a tabela nova por derivação do schema — confirmar com o teste-guarda existente | `npx jest resetDb` | ✅ `test/helpers/db.ts` +1 `deleteMany` (item antes do log, FK Restrict) |
| 2.4 | Review independente + CI + merge; fold: C6b `done`, contábil 18→19/22 (C6b é nó — grafo §1) | master map §5.1/§7.1 | ✅ review FAIL→fix→PASS · CI 5/5 · **merge `373d00d4`** · fold neste PR |

### Passo 3 — PR docs (C12 transcrição + GAP-MAP + este doc) 🔄 #339

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 3.1 | Commit na branch `claude/pos-c6b-queue-blockers-35f6f9` (4 docs + este) | `git status` → 5 arquivos | ✅ `c5264820` (8 arquivos) |
| 3.2 | PR docs-only; conflito previsível **só** na cédula 16/09 se outra sessão a anotar — quem mergear segundo rebaseia | `gh pr create` | ✅ #339 (CI 5/5 verde) |
| 3.3 | Ponteiros: `docs/README.md:16,28` e `docs/accounting/README.md:17` apontam para o 09-14 → trocar para este doc (09-14 vira histórico, como 09-02) | diff nos 2 READMEs | ✅ (mesmo PR) |

### Passo 4 — C12 ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 4.1 | **[H] "executa C12"** | citação do dono | [H] |
| 4.2 | Item 1: consts copiadas da transcrição §1.2 (19) e §2.2 (17), cabeçalho com pp. 201-202 / p. 105 + sha256; teste-guarda (900 nas duas, `^\d{3}$`, sem duplicata, `305` ausente) | `models/spedQualifAssinante.ts` + teste | ⬜ |
| 4.3 | Itens 2–7, 9, 11 nos 3 DTOs; item 3 com a exceção `900 → 'Contador'` (F-C12-5 i) e snapshot da linha `\|J930\|` | `__dto-shapes__.json` regenerado (3 DTOs) | ⬜ |
| 4.4 | Item 8 (`contactId` → `contactTo*Signer` no serviço, 404 cross-tenant, 400 arquivado) | teste de integração | ⬜ |
| 4.5 | Adversarial obrigatório (BRIEF §7): `codAssin='900'` + CNPJ 14 → 400; `contactId` de outro tenant → 404 nunca 403; **novo:** contador `900` com `indRespLegal='S'` → 400 (o exemplo oficial p. 203 viola a regra — o teste cita isso) | relatório OPS-001 | ⬜ |
| 4.6 | `npm run docs:generate` (paths inalterados, componentes mudam) · review independente · merge · fold (contábil +1) | — | ⬜ |

### Passo 5 — C8 ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 5.1 | **[H] "executa C8"** — o ADR vai a Accepted no PR de código | citação do dono | [H] |
| 5.2 | Fatiamento: o BRIEF tem 37 comportamentos — a `sessao-feature` propõe PRs seriais por bloco (modelo+migração+Anexo III seed → aquisição/baixa → depreciação/quota → ECD J801/J932 → import NF-e modo 4) **antes** de codar; fatiamento é plano, não fork | plano granular (precedente C6b #336) | ✅ `BE-INCR-FIXED-ASSETS-execution-plan.md` (17/09 sessão 6): PR-1 schema+seed · PR-2 ativos/baixa · PR-3 depreciação+Parte B · PR-4 retificação/J801/J932 · PR-5 NF-e modo 4; F-FA14 (migração única) / F-FA15 (lista de jobs) [H] |
| 5.3 | Anexo III: chave = ordinal da fonte; conferir redação vigente + `<STRIKE>` (`tabela-transcrita-de-lei-conferir-redacao-vigente`) | transcrição com sha256 do `43557` | ✅ sha `d526ac53071a` (MANIFEST:80) citado no plano; **arquivo não em disco** num worktree novo (`*-anexos/` gitignored) — plano PR-1 Passo 1 baixa e assere o sha |

### Passo 6 — FE-INCR-LALUR PR 2 ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 6.1 | **[H] "executa"** | citação do dono | [H] |
| 6.2 | `sessao-feature` pelo BRIEF FE-LALUR §3; tela atrás de `withAuth` ⇒ `npm run build` de produção antes do PR; i18n pt/en paridade | vitest + build | ⬜ |

### Passo 7 — FE-INCR-BANK-SETTLEMENT BRIEF ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 7.1 | **[H] autorização citável para o BRIEF** — o fold 16/09 só **nomeou** o item (grafo §4.2, contagem = crescimento do F7); sem citação, `sessao-planejamento` recusa | citação do dono | ✅ dono 17/09 (F-PS-1 → a) |
| 7.2 | `sessao-planejamento`: comportamentos = scan → candidatura → confirm/reject → encargo (400 nomeado até o contador, BRIEF F7 §5) na aba Conciliação; forks previsíveis: aba própria × sub-aba · confirmar em lote × um a um | BRIEF + forks PENDENTES | ✅ `FE-INCR-BANK-SETTLEMENT-brief.md` (15 comportamentos; F-FE-BS-1 sub-aba · BS-2 um a um · BS-3 default PENDING · BS-4 encargo = 400 do BE) |

### Passo 8 — SEED-MY ⬜ [H] gate

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 8.1 | **[H] B-4 assinado?** | `grep -c "^- \[x\]" docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` → hoje **0** | [H] |
| 8.2 | `job-generator` → seed 2025+2026 com `--i-have-a-backup` (F-SEED-2 a), 2 tenants (F-SEED-3 b); **não** tocar `db:seed` do admin (`parked-unmerged-worktrees`: upsert de senha) | fixture + `trial-balance` balanceado nos 2 exercícios | ⬜ bloqueado |
| 8.3 | `RUNBOOK-H1-PVA.md` P0 → alvo = seed; sem tocar evidência/desfecho/assinatura | diff só em P0 | ⬜ bloqueado |

### Passo 10 — PR docs: Contrato §2.1/§2.2 + GAP-MAP 7/8 🔄 (21/09)

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 10.1 | Diff aplicado neste worktree (`claude/domain-motor-architecture-7ec49d`): contrato (4 trechos), GAP-MAP (3 trechos), este fold, `README.md` da pasta, nota em `CADEIA-A.md` §4 | `git status` → 5 arquivos | ✅ |
| 10.2 | Gate de skill: `node .claude/skills/skill-audit/skill-audit.mjs run --all` → 0 findings; `tsc` não se aplica (markdown) | saída do audit no PR | ✅ rodado na leitura de 21/09 (re-rodar no commit) |
| 10.3 | Adversarial já feito: "`noOverlap` está mesmo fechado antes de escrever FECHADO?" → `git log -S withTableWriteLock` = `93945426`; teste é `it`, não `it.failing`, lock em `create` e `update` (linhas 592/816) | citado na célula do GAP-MAP | ✅ |
| 10.4 | **[H] commit + PR** (`docs(contract): corrige mecanismo do unique de preset + abre GAP-MAP 7/8`) — o dono ainda não pediu | `gh pr create` | [H] |
| 10.5 | **[22/09] Decisão do motor encaixada** (plano aprovado pelo dono, 4 forks fechados por questionário): §2.3 + ADR + INDEX + master map §4 + GAP-MAP Nível 3/fila 9 + `SVC-008`/`REV-008` (SKILL + governance + eval + controls) + `sessao-feature` + `SEL-004` + `server/CLAUDE.md` gate 6 + `coverage.md` + PLAYBOOK + READMEs. IDs `AC-2.1-*`/`AC-2.2-*` intactos; em skill governada o contrato é citado **sem colchetes** (o `RULE_ID_RE` do skill-audit leria `[AC-2.3-x]` como regra da skill) | `git status` → 22 entradas (21 M + 1 novo, `ADR-DOMAIN-MOTOR-rejected.md`); `grep -c "AC-2.3-"` ≥1 em contrato/coverage/reviewer | ✅ |
| 10.6 | Re-rodar `node .claude/skills/skill-audit/skill-audit.mjs run --all` **depois** das skills (o 10.2 foi antes) → 0 findings; `skill-audit.mjs coverage` regenera `governance/coverage-auto.md` (já dirty por CRLF) com `SVC-008`/`REV-008`; comando da célula nova do GAP-MAP → 8 | saída dos 3 comandos no PR | ✅ 22/09: `run --all` → **0 finding(s)**, self-check íntegro; comando do GAP-MAP → **8**; `coverage` regenerado; 9 IDs `AC-2.1/2.2` preservados; 0 `[AC-2.3-*]` com colchetes em skill governada |

### Passo 11 — GAP-MAP 7: `unique`/`compositeUnique` sem gate in-tx ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 11.1 | **[H] "instrumenta"** | citação do dono | [H] |
| 11.2 | `sessao-instrumentacao`: teste de integração gêmeo do `NoOverlapConcurrency` — preset com `unique` num campo, N `createTableData` concorrentes com o mesmo valor via `Promise.all`, assere `count === 1`; marca `it.failing` e cita a célula do GAP-MAP. Zero código de aplicação | `cd server && npx jest --selectProjects integration -t "unique.*concorr"` | ⬜ |
| 11.3 | Vermelho **só conta na CI Linux** — Windows serializa SQLite e o teste passa verde localmente (`windows-serializa-sqlite-ci-linux-nao`). Relatório declara isso; não "confirma" a lacuna por run local | `gh pr checks` do PR de instrumentação | ⬜ |
| 11.4 | `sessao-correcao` (autorização própria): estender `runSerializedIfNoOverlap` para armar `withTableWriteLock` também com `unique`/`compositeUnique` + re-rodar `validateAdvancedRules` dentro da tx com o repo tx-bound (padrão `93945426`); `it.failing` → `it` no mesmo PR; `compositeUnique` segue full scan (dívida declarada no Contrato `[AC-2.2-2]`) | par vermelho→verde no mesmo PR (`protocolo-conserto-de-gate`) | ⬜ |

### Passo 12 — GAP-MAP 8: `deleteTableData` × `immutableAfter`/`lifecycle` ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 12.1 | **[H] "instrumenta"** | citação do dono | [H] |
| 12.2 | `sessao-instrumentacao`: preset com `immutableAfter { scope:'all' }` satisfeito (ex.: status `Paid`) → `deleteTableData` **deve** lançar; hoje faz soft delete. `it.failing`, cita a célula. Comando da célula prova a ausência: `awk '/async deleteTableData\(/,/^  }$/' …/DynamicTableService.ts \| grep -c immutableAfter` → 0 | teste vermelho (aqui o vermelho é local, não depende de concorrência) | ⬜ |
| 12.3 | **[H] fork do fix** — (a) guard `immutableAfter`/`lifecycle` no `deleteTableData` (mesmo helper dos Guards 2/3 do update) × (b) `deleteConstraints` RESTRICT declarado no preset pai. Recomendação: (a) — a regra está no schema do próprio registro, e (b) não cobre tabela sem pai. Custo de errar: (b) deixa a lacuna aberta em preset raiz | `AskUserQuestion` com contexto (§57) | [H] |
| 12.4 | `sessao-correcao` após fork; `it.failing` → `it` | par vermelho→verde no mesmo PR | ⬜ |

### Passo 13 — PR-B: `atomicUntil` boundary test + retrofit dos 8 ⬜ [H]

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 13.1 | **[H] "executa"** (ADR-DOMAIN-MOTOR §2 item 4; depende do passo 10 em `main`) | citação do dono | [H] |
| 13.2 | `sessao-instrumentacao`: `server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts` (~35 linhas, molde `dynamicTables/__tests__/no-accounting-imports.boundary.test.ts`): varre `features/**/services/*.ts` (exclui `__tests__`, `PostingService.ts`), população = fonte casa `/\.postEntry\(/`, ofensor = arquivo cujo **primeiro** bloco `/** … */` (em qualquer posição — os 8 têm `import` na linha 1, verificado 22/09) não contém `atomicUntil:` **ou** não tem os 4 rótulos (`commit 1`, `commit 2`, `reconcile`, `fora da tx`); `expect(offenders).toEqual([])`. Vermelho esperado: **8** (se o scan der outro número, esse é o número — reportar) | `cd server && npx jest atomicUntil.boundary` → 8 ofensores | ⬜ |
| 13.3 | `sessao-correcao` no mesmo PR: **inserir** o cabeçalho da §2.3 **acima da linha 1** (antes do 1º `import`) nos 8 e enxugar o comentário de padrão já existente, que hoje fica **depois** dos imports (por isso não conta como "primeiro JSDoc"), **só comentário, 0 lógica** — `PayableService.ts:40-58`, `ReceivableService.ts:50-54`, `DepreciationService.ts:40-52`, `FixedAssetService.ts` (`:272/:283` tx1/tx2), `AccountingReviewService.ts:67-84`, `BankSettlementService.ts:66-75` (fora da tx = nada), `DataExchangeImportService.ts`, `ExerciseClosingService.ts` (`commit 2 — nenhum`). Cada linha cita teste existente (`arquivo › caso`); sem teste ⇒ `[sem teste — GAP-MAP]` + linha nova no GAP-MAP Nível 3 por lacuna achada. `InventoryService`/`PhysicalStockSync` não chamam `postEntry`: cabeçalho recomendado, fora do gate | teste verde; `git diff --stat` **em código** = 8 arquivos de service + 1 teste (docs de 13.4/13.5 à parte) | ⬜ |
| 13.4 | Gates: `npx tsc --noEmit`; `npm run test:integration` sem regressão; `skill-audit run --all` 0 findings (governance de `backend-service-generator` ganha `- type: static target: ../../../server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts` em `SVC-008`); review independente em worktree; par vermelho→verde nos commits do PR (`protocolo-conserto-de-gate`) | relatório OPS-001 | ⬜ |
| 13.5 | Fold: GAP-MAP Nível 3 `[PAPEL]→[COBERTO]` + comando → 0; `coverage.md` `AC-2.3-2` ✅; esta linha ✅; ADR §2 item 4 ganha `EMENDA <data>` com os SHAs | diff docs no mesmo PR | ⬜ |

---

## Estado no momento da escrita (verificado 2026-09-17)

- `origin/main` = **`daf76279`** (#337, C6b PR-1). PR de código aberto: **#338** (C6b PR-2, `2e0c8244`, MERGEABLE,
  CI 5/5, sem review). Nenhum PR docs aberto.
  **[Fold 17/09, mais tarde]** `origin/main` = **`15c8bf53`** (#338 mergeado). PR de código aberto: **#340** (C6b PR-3,
  `71b87c63`, MERGEABLE, CI 4/5 + server pending, review em voo). PR docs aberto: **#339** (este).
- Régua **43/57** (contábil 18/22 · financeiro 17/19 · fiscal 8/16) — inalterada desde o fold de #335; C6b
  conta quando PR-3 mergear.
- **Ready sem "executa":** C12 (11 comportamentos, transcrição ✅ neste worktree) · C8 · FE-LALUR PR 2.
  **Sem BRIEF:** FE-INCR-BANK-SETTLEMENT. **Bloqueado por gate:** SEED-MY (B-4).
- Gates humanos: B-4, H1, H2, X2, M2 — **0 checkbox** nos 5 runbooks. Dado externo: pedido ao contador (#331)
  **não enviado** (sem registro de envio no repo); D2/D5/D6 abertos (D-NFSE ✅ corpus 10/09 — corrigido 17/09).
- GAP-MAP: célula "colisão semântica rebase × gate novo" corrigida para `[FECHADO #267]` (comando da célula
  rodado: 2 passed). Nenhuma célula `[INSTRUMENTADO]` pendente de correção.
- Vieses desta leitura (T8): escrita pela mesma sessão que fez a transcrição C12 — a ordem sugerida 4 < 5 < 6
  favorece o item que ela conhece; a alternativa (C8 primeiro, maior valor contábil) está declarada e é
  igualmente válida sob R6.

## Estado em 2026-09-21 (fold, verificado)

- `origin/main` = **`0548d19a`** (#356, C8 PR-3). **0 PRs abertos** (`gh pr list --state open`). Últimos merges:
  #351 fold 18/09 · #352 CADEIA-A A-00 · #353 **C12** · #354/#355/#356 **C8 PR-1/2/3** (18–20/09).
- **Autorizações novas em `main`:** "Executa C12" e "Executa C8" (18/09, corpos de #353/#354). Sobra do C8:
  **PR-4** (retificação versionada + J801/J932 + lista de jobs — F-FA15 a: quem mergear primeiro cria
  `GET /data-exchange/jobs`) e **PR-5** (NF-e modo 4), já autorizados, serial no domínio contábil.
- **Régua:** banner do master map segue **45/57** — fold de #352–#356 **não feito** (passo 9). Leitura esperada
  ao foldar: contábil 19→20/22 pelo C12 (nó); C8 conta quando PR-5 fechar (ou declarar alternativa 47/57).
- **Ready sem "executa":** FE-LALUR PR 2 (passo 6). **BRIEFs prontos sem chamada:** FE-INCR-BANK-SETTLEMENT,
  FE-INCR-REVIEW, FE-INCR-DELIVERY; FE-INCR-FIXED-ASSETS/FE-INCR-SPED-SIGNERS esperam o resto do C8.
  **Bloqueado por gate:** SEED-MY (B-4, 0 checkbox). Gates humanos e dado externo: inalterados desde 17/09.
- **Motor (fora da régua), 21/09:** GAP-MAP fila **7** (`unique`/`compositeUnique` sem gate in-tx, Nível 4) e
  **8** (`deleteTableData` ignora `immutableAfter`/`lifecycle`, Nível 3) — ambos `[ABERTO]`, sem teste-guarda,
  esperam "instrumenta". Contrato §2.1/§2.2 corrigido no mesmo diff (passo 10, sem commit).
- Vieses desta leitura (T8): quem achou 7/8 é quem os põe na fila — o peso "beneficia CRM/vendas" é inferido
  (nenhum incidente registrado); a alternativa é deixá-los no GAP-MAP sem passo aqui até um caso real. E o
  fold do master map (passo 9) é a única linha desta seção que muda a régua — este doc não a altera.

## Estado em 2026-09-22 (fold, verificado)

- `origin/main` = **`be80ea47`** (#359). Merges desde 21/09: #358/#359 (harness — cerca de execução, `prova-runner`; fora da
  régua). PR aberto: **#357** (docs motor — conteúdo já em `main` via #358, `ADR-DOMAIN-MOTOR-rejected.md` presente; pode fechar).
- **Passo 9 ✅ feito:** master map banner **46/57 — contábil 20/22 · financeiro 17/19 · fiscal 9/16** (C12 #353 = nó; C8
  PR-1..3 em `main`, conta no PR-5; alternativa declarada 47/57). §5.1 linhas C12/C8 e §7.1 atualizadas; grafo 09-14 corrigido
  (C9 absorvido no C8 Bloco G).
- **Passo 10 ✅** (`4b5b04c5` → em `main`). **Passos 11/12** esperam "instrumenta"; **13** espera "executa" (`ORQUESTRADOR-PASSOS-9-13.md`).
- Sobra do C8: PR-4 (retificação versionada + J801/J932 + `GET /data-exchange/jobs`) e PR-5 (NF-e modo 4) — autorizados
  ("Executa C8" 18/09), nenhum aberto. Gates humanos, SEED-MY (B-4) e dado externo: inalterados.
- Vieses desta leitura (T8): a escolha 46 (não 47) segue a regra 1 do §7.1 à letra; quem discordar tem a alternativa declarada
  no banner. Fold feito pela mesma sessão que atualizou `main` local — nenhum revisor independente sobre docs.
