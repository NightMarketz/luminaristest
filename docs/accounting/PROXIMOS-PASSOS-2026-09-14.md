# Próximos passos — 2026-09-14 — prompt de orquestração pós-decisões

> **Uso:** cole o bloco "PROMPT" numa sessão nova com `luminaris-orchestrator`. Ele é autocontido: cita as
> autorizações, fixa a ordem (R6) e diz o que NÃO fazer. **Uma sessão executora só** — se a sessão
> paralela do PR #318 ainda estiver viva, o dono para uma das duas antes de colar isto.
>
> **🔁 2ª leitura (14/09, noite, `origin/main` `c1e4b7a5`):** passos **0 e 1 fechados** (#315 mergeado); passos
> **2, 3 e 4 em voo** (PR #320, PR #321, PR #322). A coluna **Estado** da tabela e a seção
> [§Detalhamento por passo](#detalhamento-por-passo-granularidade-para-a-sessão-executora) foram
> acrescentadas nessa leitura; o grafo vigente passou a ser
> [`GRAFO-DEPENDENCIAS-2026-09-14.md`](GRAFO-DEPENDENCIAS-2026-09-14.md). O PROMPT continua colável — quem
> colar **começa pelo passo 0 e pula o que a coluna Estado já dá como ✅/em voo**.

---

## PROMPT

Você é o orquestrador do Luminaris (`luminaris-orchestrator`). Toda tarefa abaixo roda **pela sessão
correspondente** (`sessao-planejamento` / `sessao-feature` / `sessao-instrumentacao` /
`sessao-correcao` / `sessao-integracao`), com o formulário preenchido; executar de mão livre é violação
de escopo. Review independente = agente separado em worktree (`reviewer-independence-separate-agent`).
Merge só após PASS + `tsc`×2 + CI verde (`loop-auto-merge-after-review`). Gate humano e dado externo
(B-4, X2, H1 2ª passada, H2, H3, M2, contador, parceiro D5, convênio D6) **não têm sessão** — prepare
runbook em branco, nunca preencha.

### Autorizações citáveis (todas em `main` após os merges do passo 0)

- `docs/accounting/CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md` — **§Reconciliação prevalece** onde
  divergir de `CEDULA-DECISAO-2026-09-14-gates-humanos.md`: R6 financeiro antes de fiscal · R8 instância =
  CNPJ raiz, filiais = unidades · F-X6-1,2,4,5,6 → (a), **F-X6-3 → (b)** · R5 adiar Serpro · R7 emendar
  perímetro (1 símbolo) · R9 tabela irmã · R10 P-IA não abre · SEED-MY, X4-14, #315, C8 (delegação
  condicionada) autorizados.
- Emendas de ADR já commitadas: `ADR-P2-second-vertical.md` (R7, EMENDA 2026-09-14) e
  `ADR-INCR-DFE-EMISSAO-PARCEIRO.md` (R8, EMENDA 2026-09-14 no D2).
- BRIEF novo: `docs/accounting/BE-INCR-BANK-SETTLEMENT-brief.md` (F7) — **5 forks F-F7-1..5 PENDENTES**.
- Algoritmo de escolha do próximo nó: `GRAFO-DEPENDENCIAS-2026-09-14.md` §4 (sucede o de 11/09), com R6 aplicado.

### Passo 0 — preflight (obrigatório, `verify-write-context-before-writing`)

1. `git fetch origin main`; confirme por `merge-base --is-ancestor` que **#319** (cédula + F7 + emendas)
   e **#318** (cédula paralela + runbooks) estão em `main`. Se não: `sessao-integracao` de cada um
   (docs-only; #318 e #319 não se tocam em arquivo). Sem isso, nenhuma autorização abaixo é citável.
2. `gh pr list --state open` — se houver PR de código aberto além dos listados aqui, **pare e pergunte**.
3. Zero jest concorrente (`tasklist | grep node`, classe `jest-concorrente-windows-ebusy`).

### Ordem de execução (R6: contábil → financeiro → fiscal; spec pronta primeiro; docs-only intercalável)

| # | Nó | Sessão | Entrada / regra | Saída esperada | Estado (14/09 noite) |
|---|---|---|---|---|---|
| 1 | **#315** FE-INCR-LALUR PR 1 | `sessao-integracao` | Review PASS já existe no PR. Conflito com #316 em `LalurService.ts` (**PR vence** no `GET /api/lalur/catalog`) e `__dto-shapes__.json` (**main vence**, regenerar snapshot). Baseline no alvo ANTES. | merge; FE-INCR-LALUR PR 2 destravado | ✅ **mergeado** `c1e4b7a5` |
| 2 | **P2 comportamento 11** (T0 da métrica) | `sessao-feature` (BRIEF P2 item 11) | ADR-P2 EMENDA 14/09: marco `onboardingCompletedAt` **na tx** de `installPresetAsSystem`; `proveP2ZeroDiffCli` ganha allowlist de **1 símbolo** + teste-guarda que falha se crescer (par vermelho→verde no mesmo PR). Nada mais no perímetro. | P2 11/11; prova zero-diff segue verde | 🔄 **PR #320** aberto (`670847fa`, CI parcial, sem review) → falta review independente + merge |
| 3 | **C11** revisão profissional editável | `sessao-planejamento` | F-EDIT-1 → a+c (cédula 10/09 resposta 2); insumos: geração SPED ✅, `PostingService` (acerto), C6 #305 | BRIEF + forks pendentes | 🔄 **PR #321** aberto (BRIEF `BE-INCR-REVIEW-LAYER`, **6 forks**) → falta merge + forks ao dono |
| 4 | **C12** máscaras de identidade no SPED | `sessao-planejamento` | J930 `IDENT_QUALIF`/`COD_ASSIN` = enum do Manual ECD L9 (corpus); CPF/CNPJ/UF com máscara; base #305 | BRIEF + forks pendentes | 🔄 **PR #322** aberto (BRIEF `BE-INCR-SPED-IDENTITY-MASKS`, **4 forks** + transcrição) → falta merge + forks ao dono |
| 5 | **C6b** pacote ampliado ao contador | `sessao-planejamento` | tabela filha + migração (`AccountingDeliveryLog` tem hashes/FKs fixos); resposta 8 | BRIEF + forks pendentes | ✅ BRIEF em `main` (#324 `ce0c97e8`); **5 forks F-C6b-1..5 ao dono** |
| 6 | **SEED-MY** seed multi-exercício | `sessao-planejamento` (BRIEF curto) → `job-generator` | 2025 + 2026: períodos, lançamentos, AP/AR, chart com `1.1.6/3.3/4.2`; alvo dos runbooks H1/H2/H3 passa a ser o seed. **Pré-condição do #318: B-4 assinado pelo dono** — se não estiver, deixe o BRIEF pronto e pare aqui. | seed fixture; RUNBOOK-H1 P0 atualizado | ✅ BRIEF em `main` (#325 `dbd5ea83`); execução **bloqueada até B-4 assinado** (stop humano); 3 forks ao dono |
| 7 | **F7** baixa por retorno bancário | **PARE**: apresente F-F7-1..5 ao dono (questionário, recomendação primeiro) → só então `sessao-feature` | BRIEF `BE-INCR-BANK-SETTLEMENT`. Insumos ausentes §4 (config de contas por escopo; `externalRef` no título) são lidos na feature e **pausam** se virarem decisão de modelo. Fase C (encargo) entrega 400 nomeado até o contador dar as contas. | `bank_settlement_items` + 5 rotas + auditoria | ✅ **MERGEADO** #326 `22b97252` (F-F7-1..5 → (a), ratificados 15/09 pelo dono via `AskUserQuestion` — cabeçalho do BRIEF F7); contas de encargo = item 6 do pedido |
| 8 | **X6** custo D3 por regime | `sessao-planejamento` (**emenda** ao BRIEF #309: itens 10/11 sob F-X6-3 b, F-X6-4 ativo, defaults conservadores configuráveis, linha nova ao contador) → `sessao-feature` | Fase 0 `FiscalProfile` (chave = escopo; nasce com `partnerAccountRef` reservado — ADR-DFE emenda R8 item 2) → Fase A fórmula (ICMS por item, grupo N do MOC) | perfil fiscal + custo por regime | ✅ emenda #327 `112366c8` + **feature MERGEADA** #328 `fb7ae649` (review FAIL→fix→PASS; ERRATA: redação vigente da Lei 10.485, 33.06 fora, CST 02 → UNKNOWN) |
| 9 | **X4-14** aviso M312 | `sessao-planejamento` (emenda BRIEF 3C item 14) → `sessao-feature` | 4 agregados `K155`/`K355` por conta/trimestre sobre postings; antes da H1 2ª passada | diagnóstico avisa ajuste parcial sem M312 | ✅ **MERGEADO** #329 `a6783795` (review S1: régua por natureza da conta — resultado = só K355.VL_SLD_FIN, Manual p.253; ERRATA §2.4) |
| 10 | **C8** imobilizado + depreciação | ADR `ADR-INCR-FIXED-ASSETS` → parecer `luminaris-accounting-architect` → forks **com recomendação = ratificados por delegação**, sem recomendação voltam ao dono → `sessao-planejamento` | Anexo III IN 1.700 (corpus) semeado e editável por tenant; retificação ECD/ECF junto (master map §5) | ADR Accepted + BRIEF | ✅ ADR + parecer + BRIEF em `main` (#330 `9b4cb35a`; review FAIL 3 blockers → 2 emendas → PASS limpo); F-FA1..9 delegados; **F-FA10/12/13 ao dono**; implementação NÃO autorizada |
| 11 | **Pedido ao contador** | `luminaris-contador-liaison` (monta; **dono envia**) | linhas novas: contas de encargo pago/recebido e desconto (F7 §5) · 4 exceções PIS/COFINS + monofásico (F-X6-3 b) · linhas `E` do parque (ECF §4 item 7) · itens 1/1b (X7) | pacote de pedido | ✅ montado — EMENDA itens 6–13 em `main` (#331 `3f61c4b0`, review PASS p/ merge e envio); **dono envia** |
| 12 | **Fold** | `sessao-integracao` docs (fold) | master map §5.1/§7.1 + grafo: R5..R10 fechados, X6/F7 estados, **corrigir** "parser CNAB 240 retorno ✅" → "parser de extrato CNAB-E; retorno de cobrança inexistente (F-F7-1)" | régua atualizada | ✅ 2026-09-16 (este PR): master map topo/§5/§7.1 + grafo §0.1/§0.3/§4/§4.2 + esta tabela; régua **42/57**; memória atualizada |

Regras de fila: nó com spec + forks ratificados antes de nó que precisa de BRIEF; BRIEF antes de ADR;
docs-only (3–5, 10–12) pode intercalar enquanto um PR de código espera CI/review. Passos 7 e 6 têm **stop
humano** explícito (forks / B-4) — não os pule nem os "assuma".

### Não fazer

- **Não** ratificar fork nenhum (F-F7-1..5, forks de C11/C12/C6b, forks de C8 sem recomendação).
- **Não** tocar `reconcile_pending_items`, `ReconcilePendingService`, `canManageReconcilePending` (R9).
- **Não** reabrir P-IA (R10), **não** contratar/desenhar port do Serpro (R5), **não** abrir X10b/emissão
  (espera D-NFSE + D1f + D5), **não** montar aparato de auditoria (bancada desligada 2026-08-09).
- **Não** escrever no perímetro zero-diff além do símbolo único da emenda R7.
- **Não** preencher evidência, marcar desfecho ou assinar runbook (B-4, H1, H2, H3, M2).

### Gates de envio por PR (OPS-001)

`cd server && npx tsc --noEmit && npm run test:integration` · `cd my-app && npx tsc --noEmit` ·
`npm run docs:generate` diff vazio se tocou rota/DTO · `npm run smoke:migration` se trouxe migração ·
snapshot de DTO regenerado, allowlist de auditoria, guard de path-count · review independente PASS ·
relatório com as 5 perguntas do OPS-001 respondidas e o caso adversarial nomeado.

Comece pelo **passo 0** e reporte o estado dele antes do passo 1.

---

## Detalhamento por passo (granularidade para a sessão executora)

> Cada passo abaixo tem **pré-condição verificável por comando**, **arquivos que toca**, **gate de saída** e
> **evidência de "feito"**. Sub-passos marcados **[H]** são stop humano: o agente prepara e para. Convenção
> de estado: ✅ feito · 🔄 em voo · ⬜ aberto · [H] espera o dono.

### Passo 0 — preflight

| Sub | O quê | Comando / evidência | Estado |
|---|---|---|---|
| 0.1 | #318, #319 e #315 são ancestrais de `origin/main` | `git fetch origin main && for s in 93e52adb b002f78c c1e4b7a5; do git merge-base --is-ancestor $s origin/main && echo ok $s; done` | ✅ (14/09 noite) |
| 0.2 | Nenhum PR de código aberto além dos listados | `gh pr list --state open` → esperado: **#320** (código) e **#321** (docs) | ✅ — mais que isso = **pare e pergunte** |
| 0.3 | Zero jest concorrente | `tasklist \| grep -i node` sem jest de outra sessão (classe `jest-concorrente-windows-ebusy`) | verificar a cada sessão |
| 0.4 | Worktrees paralelos vivos que tocam `docs/accounting/` | `git worktree list` → `proximos-passos-orchestration-f5934e` (C12) está vivo; **não** edite o BRIEF C12 daqui | ✅ mapeado |

### Passo 1 — #315 ✅ (fechado)

Merge `c1e4b7a5` (14/09). Regra de conflito aplicada (`main` venceu no snapshot; PR venceu no endpoint). Efeito:
**FE-INCR-LALUR PR 2** (M410 + fechar trimestre + diagnóstico na tela, F-FE-4 → a) está `ready` — sem item de fila
próprio; conta como **crescimento do X4** quando o dono chamar.

### Passo 2 — P2 comportamento 11 (PR #320) ✅ `0790dd29`

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 2.1 | Par vermelho→verde no mesmo PR (teste-guarda da allowlist de 1 símbolo) | commits `8af47cb6` (vermelho, TS2305) → `daa5afdc` (verde) citados no corpo do PR | ✅ (declarado no PR; **revisor confirma**) |
| 2.2 | Migração `20260914200000_add_user_onboarding_completed_at` = `ADD COLUMN` puro, sem backfill | `git show 670847fa -- server/prisma/migrations/` | ✅ (declarado) |
| 2.3 | Única escrita no perímetro = `tx.user.update(...)` dentro da `$transaction` de `installPresetAsSystem` | diff de `DynamicTableService.ts` (+4 linhas) | ✅ (declarado) |
| 2.4 | Teste de integração fora do perímetro (T0 gravado; falha no Pass 2 → T0 NULL e 0 tabelas) | `server/src/__tests__/onboardingT0Marker.integration.test.ts` | ✅ (declarado) |
| 2.5 | **Review independente** em worktree separado (`reviewer-independence-separate-agent`), 4 sondas: allowlist cresce → teste falha? · T0 fora da tx? · prova zero-diff ainda verde com o símbolo allowlisted? · `smoke:migration` S1–S5/S8 | relatório PASS/FAIL no PR | ✅ (fold 16/09) |
| 2.6 | CI 5/5 verde no SHA revisado; **um** rerun se instável (`rerun-durante-instabilidade-mata-a-run-boa`) | `gh pr checks 320` | ✅ (fold 16/09) |
| 2.7 | Merge (squash) + fold: master map §5.1 Bloco B "P2" → **11/11**; grafo → C10 `done` pleno | commit de fold docs-only | ✅ apontador §5.1 (`#320 MERGEADO`); a linha longa do P2 no §5.1 segue histórica ("11 PAUSADO") — corrigir no próximo fold do P2 |

### Passo 3 — C11 BRIEF (PR #321) ✅ `8e79b8cb` · 6 forks ao dono

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 3.1 | Merge docs-only (sem conflito previsto: arquivo novo `BE-INCR-REVIEW-LAYER-brief.md`) | `gh pr merge 321 --squash` após CI | ✅ (fold 16/09) |
| 3.2 | **[H]** Apresentar os **6 forks** ao dono por questionário, recomendação primeiro (`duvidas-por-questionario-com-contexto`) | cédula nova ou emenda na de 14/09 | [H] |
| 3.3 | Registrar ratificações no cabeçalho do BRIEF (`PENDENTE` → `RATIFICADO (x)`) | commit docs-only | ⬜ após 3.2 [H] — BRIEF C11 continua "6 forks RATIFICAÇÃO PENDENTE" |
| 3.4 | Só então `sessao-feature` — exige "executa" do dono (ORCH-006) | autorização citável | [H] |

### Passo 4 — C12 BRIEF (PR #322) ✅ `1c469e2f` · 4 forks ao dono

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 4.1 | PR docs-only do `BE-INCR-SPED-IDENTITY-MASKS-brief.md` → merge após CI | **PR #322** aberto | ✅ (fold 16/09) |
| 4.2 | A transcrição obrigatória do §5 (enum J930 do Manual ECD L9) está no corpus? | `grep -n "J930" docs/accounting/fontes-oficiais/*` (Manual ECD é PDF no `MANIFEST.md` — transcrever por script, precedente `transcrever-ecf-lmn.mjs`) | ⬜ PDFs do Manual ECD fora do disco neste worktree (BRIEF C12 §5); rodar `baixar-fontes-oficiais.mjs --so=manual-ecd-l9` e transcrever antes da feature |
| 4.3 | **[H]** 4 forks ao dono → ratificação no cabeçalho | cédula | [H] |

### Passo 5 — C6b BRIEF ✅ #324 `ce0c97e8` · 5 forks ao dono

| Sub | O quê | Insumo | Estado |
|---|---|---|---|
| 5.1 | Ler `AccountingDeliveryLog` (schema) e `BE-INCR-CONTADOR-DELIVERY-brief.md` — 2 hashes + 2 FKs de job + `@@unique([ecdJobId, ecfJobId, contactId])` | `server/prisma/schema.prisma` | ✅ (fold 16/09) |
| 5.2 | BRIEF: tabela filha (itens do pacote: balancete, razão, conciliação, amostra) + migração aditiva com prólogo `IF EXISTS` (`migracao-sqlite-nao-e-transacional`) | `sessao-planejamento` | ✅ (fold 16/09) |
| 5.3 | Forks previsíveis a formular (não ratificar): configurável por contato ou por entrega? · hash por item ou do zip? · período `HARD_CLOSED` obrigatório como no C6? | §3 do BRIEF | ✅ (fold 16/09) |

### Passo 6 — SEED-MY ✅ BRIEF #325 `dbd5ea83` · execução bloqueada até B-4 (stop humano)

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 6.1 | **[H] B-4 assinado?** | `grep -n "^- \[x\]" docs/accounting/RUNBOOK-B4-RESTORE-REHEARSAL.md` → hoje **0** | [H] — sem isso, só o BRIEF |
| 6.2 | BRIEF curto: exercícios 2025+2026 · períodos por mês · lançamentos por natureza (receita/CMV/despesa/AP/AR) · chart completo com `1.1.6/3.3/4.2` · idempotência (re-seed = mesmo estado) | `sessao-planejamento` | ✅ (fold 16/09) |
| 6.3 | `job-generator` → seed fixture; **não** tocar `db:seed` do admin sem ler `parked-unmerged-worktrees` (upsert de senha) | fixture + teste que prova `trial-balance` balanceado nos 2 exercícios | ⬜ bloqueado até B-4 assinado (só o BRIEF está em `main`) |
| 6.4 | Atualizar `RUNBOOK-H1-PVA.md` P0 (alvo = seed) — **sem** tocar evidência/desfecho/assinatura | diff só em P0 | ⬜ bloqueado até B-4 assinado (`RUNBOOK-H1-PVA.md` intocado desde #318) |

### Passo 7 — F7 baixa por retorno bancário ✅ #326 `22b97252` (F-F7-1..5 → (a), ratificados 15/09 pelo dono via `AskUserQuestion` — cabeçalho do BRIEF F7)

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 7.1 | **[H]** Questionário F-F7-1..5 ao dono, recomendação primeiro (BRIEF §3) | cédula | [H] |
| 7.2 | Registrar no BRIEF; se F-F7-1 → (b) (retorno de cobrança T/U) o nó **cresce e espera F5/D6** — pare | cabeçalho do BRIEF | ✅ (fold 16/09) |
| 7.3 | `sessao-feature` na ordem sugerida do BRIEF §7 (model + migração → scan → candidatura → confirm/reject → encargo) | PR | ✅ (fold 16/09) |
| 7.4 | Fase C (encargo) entrega **400 nomeado** enquanto o contador não der as contas (BRIEF §5); não inventar conta | teste-guarda do 400 | ✅ (fold 16/09) |
| 7.5 | Gates: `smoke:migration` (1 `CREATE TABLE`, zero `ALTER`) · allowlist de auditoria · `docs:generate` · review independente | relatório OPS-001 | ✅ (fold 16/09) |
| 7.6 | Fold: contagem de `FE-INCR-BANK-SETTLEMENT` (crescimento × nó novo) decidida aqui, não antes | master map §7.1 | ✅ 16/09: **crescimento do F7** (regra 2; precedente #315), denominador 57; alternativa 58 declarada no grafo §4.2 |

### Passo 8 — X6 custo D3 por regime ✅ #327 `112366c8` + #328 `fb7ae649`

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 8.1 | Emenda do BRIEF #309 (docs-only): itens 10/11 sob **F-X6-3 (b)**; F-X6-4 ativo (monofásico = atributo do produto — decidir preset × `FiscalProfile` pela fronteira §2.1); 4 exceções como dado configurável com default **sem crédito**; linha nova ao contador | commit docs | ✅ (fold 16/09) |
| 8.2 | Fase 0: `FiscalProfile` Prisma por escopo (`userId`+`unitId`), com `partnerAccountRef` **reservado** (ADR-DFE emenda R8 item 2) — migração aditiva | PR 1 | ✅ (fold 16/09) |
| 8.3 | Fase A: parser lê ICMS **por item** (grupo N do MOC) — estender transcrição F0-2; fixture mista obrigatória; import sem perfil → **400** (F-X6-6) | PR 2 | ✅ (fold 16/09) |
| 8.4 | Notas já importadas **não** reprocessam (F-X6-5) — teste-guarda | teste | ✅ (fold 16/09) |
| 8.5 | H2 (parte NF-e) e onboarding I1/W ganham o passo "cadastrar perfil fiscal" — **só** o texto dos runbooks, em branco | diff docs | ⬜ diferido ao plano do wizard (BRIEF X6 §6 "frente do plano do wizard, não deste BRIEF"); runbook H2 sem o passo |

### Passo 9 — X4-14 aviso M312 ✅ #329 `a6783795`

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 9.1 | Emenda ao BRIEF 3C item 14: definir "ajuste parcial" pelos 4 agregados `K155`/`K355` (saldo inicial/débitos/créditos/saldo final) por conta e trimestre **sobre postings** | docs | ✅ (fold 16/09) |
| 9.2 | Feature: diagnóstico (`SpedEcfRealGenerationService`/rota de diagnóstico) avisa, **não bloqueia** | PR | ✅ (fold 16/09) |
| 9.3 | Deve mergear **antes** da H1 2ª passada (cédula) — se a passada começar antes, registrar como leitura 2P-4 extra, em branco | RUNBOOK-H1 | ✅ (fold 16/09) |

### Passo 9b — FE-INCR-LALUR PR 2 (ready, sem item de fila)

Pré-condições ✅ (#315, #316). Escopo do F-FE-4 (a): M410 movimentos · "fechar trimestre" · diagnóstico de saldos na
aba Compliance. Reusa `LalurPanel`/`LalurParteBModal` do PR 1. **Só com "executa" do dono.**

### Passo 10 — C8 imobilizado + depreciação ✅ (#330 `9b4cb35a`, 2026-09-16)

| Sub | O quê | Evidência | Estado |
|---|---|---|---|
| 10.1 | ✅ ADR `docs/adr/ADR-INCR-FIXED-ASSETS.md` (Proposed): Anexo III IN 1.700 (corpus, `fontes-oficiais/IN-RFB-1700-2017.txt`) semeado e **editável por tenant**, link da fonte na tela; depreciação mensal como lançamento; retificação ECD/ECF versionada junto (C9) | ADR | ✅ #330 |
| 10.2 | Parecer `luminaris-accounting-architect` com **recomendação escrita por fork** — fork com recomendação = ratificado por delegação (cédula #319); sem recomendação → dono | parecer | ✅ §4 do ADR (9/9 com recomendação) |
| 10.3 | BRIEF via `sessao-planejamento` | BRIEF | ✅ `BE-INCR-FIXED-ASSETS-brief.md` (37 comportamentos; F-FA10/12/13 pendentes) |
| 10.4 | Review independente (agente isolado): FAIL — B1 forma real do Anexo III (chave = ordinal da fonte, `<STRIKE>`, NCM 5/6, `8905`), B2 J801/J932 obrigatórios na ECD substituta, B3 `postEntry` abre tx raiz (2 txs, padrão estoque) → emendas → PASS limpo | ADR §1 emendado + BRIEF | ✅ |

### Passo 11 — Pedido ao contador ✅ montado (#331 `3f61c4b0`) · [H] envio pendente

| Sub | Linha nova | Origem | Estado |
|---|---|---|---|
| 11.1 | Contas de encargo pago/recebido e desconto (juros/multa) — nenhuma existe no chart de 13 contas | BRIEF F7 §5 | ✅ |
| 11.2 | Defaults do crédito PIS/COFINS: 4 exceções (monofásico, ICMS fora da base — Lei 14.592/23, IPI na base, fornecedor do Simples) | cédula #318 §1 | ✅ |
| 11.3 | Linhas `E` do parque (ECF §4 item 7) | BRIEF 3C | ✅ |
| 11.4 | Itens 1/1b (tributos, X7) — já no `PEDIDO-CONTADOR-2026-09-03.md`, reiterar | pedido 03/09 | ✅ |
| 11.5 | Montar com `luminaris-contador-liaison`; **dono envia**; resposta vira artefato checável, nunca sign-off | pacote | ✅ montado (itens 6–13, com C11/C6b/C8 além dos 4 do plano) · **[H] envio pendente** |

### Passo 12 — Fold ✅ (2026-09-16)

Feito nesta leitura: grafo 09-14 (sucede 11/09), master map §5.1 (SEED-MY, X4-14, F7, C11/C12/C6b/C8 como itens) e
§7.1 (ponteiro do grafo; correção "reusa a tabela da rodada 3" → tabela irmã), cabeçalho com #315. **Falta:** o fold
de #320 (C10 11/11), #321 (C11 BRIEF em `main`) e C12 (BRIEF em `main`) — quem integrar cada um faz a linha.

**Fold 2026-09-16 (sessão 3):** tudo acima mergeado — #320/#321/#322/#323/#324/#325/#326/#327/#328/#329/#330/#331.
Régua **42/57** (financeiro 16→17/19 pelo F7; X6 e X4-14 = crescimento de nó, numerador inalterado). Correção
"parser CNAB 240 retorno ✅" **já estava** no grafo 09-14 §0.4 e no BRIEF F7 §0.1 — nenhum resíduo. R5..R10 fechados
(cédula 14/09; R9 materializado no F7, R10 P-IA segue adiado). Memória: `accounting-increments-rollup` (X6/F7/X4-14),
`accounting-c8-fixed-assets-adr-brief`, + 3 lições ([[tabela-transcrita-de-lei-conferir-redacao-vigente]],
[[postentry-tx-raiz-subrazao-2-commits]], [[parafrase-de-regra-ratificada-perde-ramo]]).

---

## Estado no momento da escrita (verificado 2026-09-14)

- `main` = `7e88fe60` (#317). PRs docs abertos: **#318** (`claude/p0-boot-b4-sql-2ec2d1`), **#319**
  (`claude/decisoes-forks-ratificacoes-804e65`, `6c35c3b1`, MERGEABLE, CI parcial).
- PR de código aberto: **#315** (`d6849094`, CI verde, review PASS, `CONFLICTING` com main).
- Régua 41/57 (fold 14/09). Gates humanos abertos: B-4, X2, H1 2ª passada, H2, H3, M2.

## Estado na 3ª leitura (verificado 2026-09-16, fold)

- `origin/main` = **`3f61c4b0`** (#331). Nenhum PR desta orquestração aberto. Ordem de merge da sessão 3: #328 → #329
  (rebase + review + fix) → #330 → #331.
- Régua **42/57** (contábil 17/22 · financeiro **17/19** · fiscal 8/16).
- **Restos que só o dono/humano fecha:** forks C11 (6) · C12 (4) · C6b (5) · SEED-MY (3) · C8 (F-FA10/12/13) — questionário
  quando pedir; envio do pedido ao contador (#331); gates B-4 (destrava SEED-MY), H1 2ª passada em Real, Termo de
  Verificação (ECD substituta). Nada de código sem "executa" + forks ratificados (ORCH-006).

## Estado na 2ª leitura (verificado 2026-09-14, noite)

- `origin/main` = **`c1e4b7a5`** (#315). #318 `93e52adb` e #319 `b002f78c` ancestrais (`merge-base` = 0).
- Abertos: **#320** (código, `670847fa`, MERGEABLE, CI parcial, 0 reviews) · **#321** (docs, `36c19a51`, BRIEF C11) ·
  **#322** (docs, BRIEF C12) · **#323** (docs, este fold + índices `docs/README.md` e `docs/accounting/README.md`).
- Régua **41/57** inalterada (#315 = crescimento do X4). Gates humanos: B-4 (executado por referência SQL,
  **não assinado**), X2, P4, H1, H1 2ª passada, H2, H3, M2 — **0 checkbox de desfecho marcado nos 7 runbooks**.
