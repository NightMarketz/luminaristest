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
| 4 | **C12** máscaras de identidade no SPED | contábil | `sessao-feature` | BRIEF itens 1–11; write-set = `SpedEcdDto/SpedEcfDto/SpedEcfRealDto`, const nova `models/spedQualifAssinante.ts`, serviço de geração (resolução de `contactId`), snapshots; **disjunto do C6b** (PAR-001) — pode correr em worktree paralelo ao passo 2 se o dono autorizar 2 sessões | PR + review + merge; contábil 18→19/22 | **falta "executa"** | ⬜ [H] |
| 5 | **C8** imobilizado + depreciação | contábil | `sessao-feature` | 37 comportamentos; ADR Proposed → Accepted no PR de código; 2 txs (`postentry-tx-raiz-subrazao-2-commits`); J801/J932; quota cumulativa; Anexo III do corpus (chave = ordinal da fonte) | PR(s) + review + merge; contábil +1 | **falta "executa"** | ⬜ [H] — **5.2 ✅ plano granular 17/09** (`BE-INCR-FIXED-ASSETS-execution-plan.md`, 5 PRs; F-FA14/15 [H]); 5.3 ✅ sha no plano (arquivo **não em disco**: A1) |
| 6 | **FE-INCR-LALUR PR 2** (M410 + fechar trimestre + diagnóstico na tela) | contábil (crescimento X4) | `sessao-feature` | BRIEF FE-LALUR §3; `withAuth` ⇒ verificar contra build de produção; vitest com shim `React` global | PR + review + merge; numerador inalterado | **falta "executa"** | ⬜ [H] |
| 7 | **FE-INCR-BANK-SETTLEMENT** (tela do F7) | financeiro (crescimento F7) | `sessao-planejamento` | insumos: `BE-INCR-BANK-SETTLEMENT-brief.md`, 5 rotas do #326, aba Conciliação existente (reuse canônico: GenericTable/Modal/StandardPagination) | BRIEF + forks PENDENTES | dono 17/09 (`PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`, F-PS-1 → a) | ✅ **BRIEF 17/09 (sessão 6)** — `FE-INCR-BANK-SETTLEMENT-brief.md`, F-FE-BS-1..4 [H] |
| 8 | **SEED-MY** | pré-gate | `job-generator` | BRIEF ✅; forks ✅ (F-SEED-2 a · F-SEED-3 b) | seed 2025+2026; `RUNBOOK-H1` P0 | **B-4 assinado** (`RUNBOOK-B4`: 0 `[x]` hoje) | ⬜ [H] gate |
| 9 | **Fold** | docs | `sessao-integracao` docs | master map §5.1/§7.1 + grafo §4.2 + este doc (coluna Estado) após cada merge de código | régua atualizada | — | contínuo |

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
sinal do dono.**

### Não fazer

- **Não** dar "executa" por conta própria a C12/C8/FE-LALUR-2 nem abrir o BRIEF do passo 7 sem citação.
- **Não** abrir segunda sessão de código no domínio contábil enquanto o C6b PR-2/PR-3 estiver em voo
  (PAR-005) — exceção só se o dono autorizar C12 em paralelo (write-set disjunto declarado no passo 4).
- **Não** tocar `reconcile_pending_items` (R9), **não** reabrir P-IA (R10), **não** Serpro (R5), **não**
  X10b/emissão (espera D1f + D5 — D-NFSE já está no corpus; regra só o dono reverte; D1f (item LC 116, alíquota ISS, `cClassTrib` do 1b) pode virar campo obrigatório do `FiscalProfile` (técnica X6 — dado configurável em vez de espera) — **decisão do dono**), **não** aparato de auditoria (bancada desligada 2026-08-09).
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
