# Auditoria de regressão arquitetural — financeiro, contábil, fiscal e CRM × módulos anteriores (2026-10)

**Sem regressão de arquitetura nem de qualidade em B–E em relação aos módulos anteriores (A); R8 é a única erosão nova sem declaração e sem gate:** 15 `throw new Error` crus em services de C, D e E, 11 deles na máquina de estados do DF-e.
**Risco principal:** a cobertura de 85–88 % em B–D não é protegida. O `coverageThreshold` (`server/jest.config.js:78`) só age com `--coverage`, e o CI roda o jest sem a flag (`.github/workflows/ci.yml:153`).

Data: 2026-10-14 · Árvore medida: `233c8a6a` (`main`), worktree `claude-code-tools-audit-9bf728` · Só leitura (nenhum código alterado).
Fases: 0 (régua R1..R24 + grupos, ratificada pelo dono) → 1 (medição) → 2 (diagnóstico).
Grau de cada claim: **[V]** verificado (comando ou arquivo:linha) · **[I]** inferido · **[A]** assumido.

Grupos: **A** anteriores (dynamicTables, users, analytics, reports, sales + my-app dashboard/users) · **B** financeiro (Payable, Receivable, BankSettlement, Reconciliation, PaymentAccount, CollectionCharge, Counterparty, Aging, CashForecast…) · **C** contábil (Posting, Period, Closing, EntryApproval, Review, Audit, Sped, Lalur, Depreciation, FixedAsset, Dimension, Reports/DFC, Inventory, DataExchange, governança, CompanySigner) · **D** fiscal (FiscalDocument, Nfe, NFS-e, FiscalProfile, Mit, TaxAssessment, Simples, PisCofins, Referential, ProductDestination, CompliancePanel) · **E** CRM.

---

## 1. Como foi medido

| Item | Valor |
|---|---|
| Instrumento | `medir.mjs` (ferramenta local do dono, fora do repo), `--tools --coverage`; 2ª rodada após a reclassificação (cache por hash da árvore, HIT em tudo); R23 rodado de novo com `--no-cache` após a correção do predicado |
| Classificação | A 504 · B 138 · C 419 · D 264 · E 105 · fora 456 · não classificado 0 arquivos. `accountingController.ts` fica em C, **misto** (atende rotas de B: `routes/accounting.ts:201-202`, `reports/aging` e `reports/cash-forecast`) |
| Ambiente | `npm ci` + `npx prisma generate`; `OPENAI_API_KEY=ci-dummy-openai-key` (= `ci.yml:28`) e `NODE_OPTIONS=--max-old-space-size=10240`. A suíte inteira com cobertura num processo só, com o heap padrão, estoura (`JavaScript heap out of memory`, exit 134); o CI usa 8 GB (`ci.yml:149-150`) |
| Testes | jest com cobertura: 483 suítes, **5936 testes passaram** (7 skip, 1 todo), exit 0 **[V]** |
| Pré-condição | `tsc --noEmit`: server exit 0 e my-app exit 0, sem erros **[V]** |
| depcruise | sem baseline: server 35 / my-app 18 violações = baseline 35 / 18; `check:arch` 0 novas **[V]** |
| Leitura (células ·L) | janelas do instrumento (R3, R5); R9 por AST (parser do TypeScript) sobre os services de cada grupo; R10 por busca de casos de teste para cada candidato; trechos `arquivo:linha` citados nas células |

---

## 2. Matriz R1..R24 + TSC × A/B/C/D/E

Célula = **status** — predicado/contagem ou arquivo:linha · `decl` = declarada (baseline do depcruise, `[DECLARADO]`, allowlist de gate) · **(L)** = fechada por leitura.

| R | A anteriores | B financeiro | C contábil | D fiscal | E crm |
|---|---|---|---|---|---|
| **TSC** | **PASSA** — server 0 · my-app 0 erros | N/A (global) | N/A | N/A | N/A |
| **R1** cadeia Route→…→Prisma | **FALHA** — 10 (`decl=2`): `DynamicTableService.ts:16,420,593,616,818,931`, `ReportService.ts:7,86` (+2 em README) | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 |
| **R2** policy pura | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 |
| **R3** policy-first | **FALHA (L)** — 6 services sem policy (`AnalyticsService`, `KpiCacheService`, `ModuleInstallService`, `PresetService`, `PresetSyncService`, `ReportService`) | **PASSA (L)** — check antes do 1º dado (ex.: `PayableService.ts:190`; `ReconciliationService.ts:779` < `:782`) | **PASSA (L)** — os 2 hits são módulos de função chamados depois do check do service (`dataExchangeValidators.ts`, `dimensionTagging.ts`); ex.: `PostingService.ts:290` < `:308` | **PASSA (L)** — `ProductRefLookup` (auxiliar), `TaxAssessmentRecalcService` (job de sistema, sem ator); `FiscalProfileService.ts:303` roda depois de `AccountingPolicyVersionService.ts:158` | **FALHA (L)** — `CrmReportService.ts:150-152` `create` sem check (a policy não tem `canCreate`); `CrmAnalyticsService` sem policy |
| **R4** factory | **FALHA** — 9 (`new TransactionalDynamicTableRepository(tx)` em `DynamicTableService.ts` + services fora de `lib/factory.ts`) | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 |
| **R5** DTO Zod no controller | **FALHA (L)** — `analyticsController.ts:13` (`req.query.presetKey` sem schema) | **PASSA (L)** — 0 | **PASSA (L)** — 0 | **PASSA (L)** — 0 | **PASSA (L)** — 0 |
| **R6** soft-delete | **FALHA** — 7 hard deletes (`UserRepository.ts:195`; `DynamicTableRepository.ts:84,88,187`; `TransactionalDynamicTableRepository.ts:99,103,187`) | **PASSA (L)** — 0 hard delete; toda consulta a modelo **com** `deletedAt` filtra no método. As diferenças contadas pelo instrumento são modelos sem a coluna e nunca apagados (`PayablePayment`, `ReconcilePendingItem`, `BankStatementLine`, `ReconciliationMatch`, `Posting`) [V: 0 delete; I: "por desenho"] | **FALHA** — 5 hard deletes (`PostingRepository.ts:42`; `LalurRepository.ts:74,81,88,189`; ver §3 nº 10) + `LalurService.ts:402` devolve ajuste arquivado | **FALHA** — 1 hard delete (`ReferentialMappingRepository.ts:56`, configuração) | **PASSA** — 0 |
| **R7** rota em 2 toques (`docs.paths.ts`) | **PASSA** — 0 | **FALHA** — 14 rotas sem bloco em `docs.paths.ts`. **Declarada em `route-spec-wiring.test.ts:31-35` (`KNOWN_UNDOCUMENTED`) e coberta por gate no CI**: as 4 ausentes do spec gerado (`routes/counterparties.ts:17-20`) estão na allowlist; as outras 10 têm `@openapi` fora de `docs.paths.ts` | **FALHA** — 12 sem bloco em `docs.paths.ts` (`routes/accounting.ts:196-226`). **Declarada em `route-spec-wiring.test.ts:31-35` e coberta por gate no CI**: a única ausente do spec (`PATCH …/requires-dimension`, `accounting.ts:210`) está na allowlist (`:35`) | **PASSA** — 0 | **PASSA** — 0 |
| **R8** erros tipados | **PASSA** — 0 | **PASSA** — 0 | **FALHA** — 1 (`DataExchangeExportService.ts:425`) | **FALHA** — 11 (`FiscalDocumentEmissionService.ts:454,710,841,856,897,902`; `FiscalDocumentLifecycleService.ts:701,745,803,953`; `TaxAssessmentRecalcService.ts:183`) | **FALHA** — 3 (`CrmReportService.ts:242,247,547`) |
| **R9** tx propagada ao repo | **PASSA (L)** — AST: 2 callbacks de tx, 0 chamadas `this.*repo*` sem `tx` | **PASSA (L)** — 39, 0 | **PASSA (L)** — 76, 0 | **PASSA (L)** — 32, 0 | **N/A** — 0 callbacks |
| **R10** gate autoritativo na tx × teste | N/A | **PASSA (L)** — 6/6 com caso (ex.: `PayableService.test.ts` › "TOCTOU: two parallel payments → exactly one succeeds (claimForPayment CAS)"; `bankSettlementController.integration.test.ts:305` › "concorrência (item 15): 2 confirm simultâneos … exatamente 1 efeito") | **PASSA (L)** — 14/17 com caso; os 3 sem caso não têm gate próprio na tx: `DataExchangeImportService` delega a `postEntry`; `SpedEcfGenerationService.ts:222-262` e `SpedEcfRealGenerationService.ts:548` só gravam o status do próprio job. Ex.: `PostingService.test.ts` › "postEntry TOCTOU … authoritative tx-gate fails … — no write" | **PASSA (L)** — 5/5 (ex.: `taxAssessment.integration.test.ts:243` › "a trava nasce na tx — falha forçada depois da trava ⇒ nem apuração nem trava"; `simplesApuracao.integration.test.ts:151` › "gate dentro da tx … nada gravado"). PisCofins só "CAS 409" (`pisCofins.integration.test.ts:93`) [I] | N/A |
| **R11** cabeçalho atomicUntil | N/A | **PASSA** — 0 (conteúdo desatualizado: §3 nº 3) | **PASSA** — 0 | **PASSA** — 0 | N/A |
| **R12** motor DynamicTable × Prisma | **PASSA** — 0 | N/A | N/A | N/A | N/A |
| **R13** `@prisma/client` fora de `lib/prisma.ts` | **PASSA** | **PASSA** | **PASSA** | **PASSA** | **PASSA** |
| **R14** `any` evitável | **FALHA** — 34 (server 23, my-app 11), `decl=16` | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 | **PASSA** — 0 |
| **R15** depcruise sem baseline | **FALHA** — 35 (X3 18, L3 2, U3 13, U7 2), `decl=35` | **FALHA** — 2: L6 `models/outstandingLines.ts:22-23` → `IPayable/IReceivableRepository`, `decl=2` | **FALHA** — 9: L4 `AccountantAssignmentRepository.ts:6` (+ interface) → `IAccountingPolicy`; X3 `IInventoryService↔InventoryService` (`import type`); U7 ×5 (SPED/Review), `decl=9` | **FALHA** — 4: L6 `issLimite.ts:2`, `lc116ListaNacional.ts:13` → `legalParameterCache`; L2 `serviceFiscalSuggestionController.ts:5` → `IAccountingBindingRepository`; U7 1, `decl=4` | **PASSA** — 0 |
| **R16** testes por camada | **FALHA** — 14 (sem teste que referencie 12; repo só unit 2) | **FALHA** — 15 (10; 5) | **FALHA** — 42 (25; 17) | **FALHA** — 33 (30; 3) | **FALHA** — 3 (3; 0) |
| **R17** cobertura de linhas (server) | 62,7 % (4945/7891) | 85,7 % (3055/3564) | 85,1 % (7866/9245) | 87,9 % (6057/6888) | 86,2 % (765/887) |
| R17 my-app | *(não medido, §5)* | *(não medido)* | *(não medido)* | *(não medido)* | *(não medido)* |
| **R18** duplicação / morto | relatório — clones 144 (2341 l), mortos 160 | relatório — 120 (1727 l), mortos 36 | relatório — 208 (2326 l), mortos 71 | relatório — 84 (659 l), mortos 74 | relatório — 46 (657 l), mortos 41 |
| **R19** withAuth + SSR i18n | **PASSA** | N/A (sem página no grupo) | **PASSA** (`pages/accounting/index.tsx`) | N/A | **PASSA** |
| **R20** service layer no FE | **FALHA** — 13 `fetch(` cru | **PASSA** | **PASSA** | **PASSA** | **PASSA** |
| **R21** reuso canônico | **FALHA (L)** — `<table` 12, `router.push` p/ detalhe 2, `users/edit/[id].tsx`, paginador local 1, overlay sem Modal 2 | **FALHA (L)** — 14 `<table>` bespoke em 9 componentes (ex.: `AccountsPayablePanel.tsx:70,439`, `ReconciliationPanel.tsx:186,547,748,808`). Extensão da sanção D-2026-10-13 **não ratificada** (§6) | **FALHA (L)** — 34 `<table>` (ex.: `ChartOfAccountsPanel.tsx:324`, `DeliveryPanel.tsx:125,469,560`) — idem | **FALHA (L)** — 6 (`CompliancePanel.tsx:275`, `NfePanel.tsx:349`, `TaxAssessmentPanel.tsx:139,217`, `ServiceFiscalProfilesPanel.tsx:134`, `dfe/ReleituraView.tsx:29`) — idem | **PASSA (L)** — `CrmReportList.tsx:42` é a lista sancionada por `D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS.md:21`; `pages/crm/leads/[id].tsx` é deep-link standalone: nenhum `router.push`, `Link` ou `pathname` aponta para `/crm/leads/…` (único resultado: comentário em `Lead360Modal.tsx:44`), e o contrato permite (`_ARCHITECTURE-CONTRACT.md:163`) |
| **R22** design system | **FALHA** — 92 (zinc 4, `rounded-xl` em card 59, `bg-white` sem `dark:` 29) | **PASSA** | **PASSA** | **PASSA (L)** — os 2 hits são estilo de botão/input (`dfe/dfeUi.ts:11,17`) | **PASSA (L)** — os 23 hits são controles de formulário, todos com `dark:` |
| **R23** i18n (namespace no SSR, transitivo) | **FALHA (formal)** — 2: `dashboard/setup.tsx` via `Modal.tsx:28`; `dashboard/index.tsx` × `GenericTabbedView.tsx:91` (`crm`), mas as chaves `crm:` só renderizam com `enableOwnerFilter` (`GenericTabbedView.tsx:400-426`), que só `CrmTableScreen.tsx:128` liga | **PASSA** — 0 | **FALHA (formal)** — 1: `pages/accounting/index.tsx` via `Modal.tsx:28` | **PASSA** — 0 | **FALHA** — 3: **1 real**: `pages/crm/activities.tsx` × `StandardPagination.tsx:34`, que renderiza `database:pagination.showing`/`.prev` (`:61,75`), então em pt cai no default em inglês; **2 formais** (`opportunities.tsx`, `leads/[id].tsx`) via `Modal.tsx:28` |
| **R24** contrato gerado no FE | **PASSA (L)** | **PASSA (L)** | **PASSA (L)** — `ReviewDetailModal.tsx:464` é mapeamento de prop | **PASSA (L)** — `dfe/FiscalDocumentsSection.tsx:153` é `.map` de render | **PASSA (L)** |

Os hits **formais** de R23 vêm de `components/ui/Modal.tsx:28`: o componente declara `useTranslation(['common','database'])` e não usa nenhuma chave `database:`, então não há efeito visível **[V]**.

**Contagem de FALHA (sem R17/R18):** **A 12 · B 4 · C 7 · D 5 · E 4** **[V]** (recontada célula a célula).

---

## 3. Os 10 piores desvios (invariante financeiro/legal > fronteira de camada > qualidade)

> Nenhum quebra invariante financeiro/legal: em todos, o invariante continua imposto (gate na tx, CAS, auditoria).

| # | Gravidade | R | Onde | O quê | Grau |
|---|---|---|---|---|---|
| 1 | fiscal/legal (qualidade) | R8 | `server/src/features/accounting/services/FiscalDocumentLifecycleService.ts:745` (`invalid_transition`), `:701,803,953`; `FiscalDocumentEmissionService.ts:454,710,841,856,897,902` | `throw new Error` cru na máquina de estados do DF-e: 500 genérico em vez de erro tipado (o estado inválido é barrado, mas sem código de resposta) | V |
| 2 | contábil/legal (qualidade) | R6 | `LalurService.ts:402` → `LalurRepository.ts:42-43` | `GET` de ajuste do e-Lalur por id devolve linha **arquivada** (`findEntryById` sem `deletedAt`; os outros callers conferem `existing.deletedAt`, este não) | V |
| 3 | financeiro (evidência) | R11 (conteúdo) | `BankSettlementService.ts:5-12` × `server/src/controllers/__tests__/bankSettlementController.integration.test.ts:258` | O cabeçalho `atomicUntil` declara as 4 linhas `[sem teste — GAP-MAP N3]`, mas o `retry` e a falha entre etapas têm teste. Evidência declarada **desatualizada** | V |
| 4 | fronteira | R15 (L2) | `server/src/controllers/serviceFiscalSuggestionController.ts:5` | Controller importa função de módulo de repository (`resolveBindingScope`) | V |
| 5 | fronteira | R15 (L4) | `repositories/AccountantAssignmentRepository.ts:6`, `IAccountantAssignmentRepository.ts:3` | Repository importa tipo da policy (`ActiveAccountant`) | V |
| 6 | fronteira | R15 (L6) | `models/outstandingLines.ts:22-23`; `models/issLimite.ts:2`, `models/lc116ListaNacional.ts:13` | Model (folha) depende de repository; model fiscal lê cache de parâmetro legal (service) | V |
| 7 | fronteira | R15 (X3/U7) | `services/IInventoryService.ts ↔ InventoryService.ts`; FE `SpedGenerationPanel ↔ SpedEcfRealPanel/QualifAssinanteSelect`, `ReviewPanel ↔ ReviewDetailModal` | Ciclos de import; no server é só `import type` [I: sem ciclo em runtime] | V |
| 8 | qualidade (contrato HTTP) | R7 | `routes/counterparties.ts:17-20`; `routes/accounting.ts:210` | `/api/counterparties` (4 operações) e `PATCH …/requires-dimension` fora do OpenAPI gerado; declaradas em `route-spec-wiring.test.ts:31-35` | V |
| 9 | qualidade (autorização) | R3 | `server/src/features/crm/services/CrmReportService.ts:150-152` | `create` de relatório do CRM grava sem consultar policy | V |
| 10 | qualidade | R6 | `PostingRepository.ts:42` (`deleteByEntryId`, só em Draft: guarda em `EntryApprovalService.ts:130` + CAS de versão + auditoria); `LalurRepository.ts:189` (`deleteClosing`: snapshot derivado, "refechar substitui", `LalurService.ts:1033`); `ReferentialMappingRepository.ts:56` (configuração) | Hard delete em tabelas sem `deletedAt`, sempre em tx com gate | V |

---

## 4. Diagnóstico das FALHAs de B–E (Fase 2)

Colunas: **(a)** A também falha? (padrão herdado) ou A passa? (erosão nova) · **(b)** dívida declarada? · **(c)** gate automático (lido no arquivo) ou só revisor; sem gate → predicado mecânico que fecharia a lacuna (proposta, **não implementada**).

| R | Grupos | (a) A no mesmo item | (b) Declarada? | (c) Gate | Predicado que fecharia (se sem gate) |
|---|---|---|---|---|---|
| **R3** | E | **herdado** — A FALHA (6 services sem policy) **[V]** | não (0 marcas) **[V]** | **só revisor.** `server/eslint.config.mjs` tem só `no-restricted-imports` (R1/R1b, `:58-67`); o depcruise é por import **[V]** | AST: todo método público `async` de escrita em `**/services/*Service.ts` chama `this.policy.*`/`assert*` antes do 1º `this.*repo*`; allowlist para job de sistema |
| **R6** | C, D | **herdado** — A FALHA (7 hard deletes) **[V]** | não **[V]** | **só revisor.** Nenhuma regra de lint/depcruise olha `.delete(` **[V]** | lint `no-restricted-syntax` em `**/repositories/**` para `.delete(`/`.deleteMany(` sobre modelo com coluna `deletedAt` (lida do schema), com allowlist de snapshot/vínculo |
| **R7** | B, C | **erosão nova** — A PASSA (0) **[V]** | **sim**: `KNOWN_UNDOCUMENTED`, `route-spec-wiring.test.ts:31-35` **[V]** | **gate existe:** `route-spec-wiring.test.ts` (rota Express × spec gerado; a allowlist só encolhe e falha se ficar podre, `:102` e `:119`), roda no shard unit do CI **[V]** | — coberto. Ver §6 nº 1: a letra da régua (= contrato §2) diverge do gate |
| **R8** | C, D, E | **erosão nova** — A PASSA (0) **[V]** | não **[V]** | **só revisor.** O lint não proíbe `throw new Error` em services **[V]** | lint `no-restricted-syntax`: `ThrowStatement > NewExpression[callee.name='Error']` em `src/**/services/**` (erro tipado de `lib/errors.ts`) |
| **R15** | B, C, D | **herdado** — A FALHA (35, pior que todos) **[V]** | **sim**, 100 % no baseline (server 35 = 35; my-app 18 = 18) **[V]** | **gate existe:** `check:arch` no CI (`ci.yml:66-67`, `:199-200`), regras L1–L6/B1/F1/X1–X3 (`server/.dependency-cruiser.cjs`) e U1–U7 (`my-app/.dependency-cruiser.cjs`); barra violação **nova**. Nenhum passo verifica se o baseline encolhe (`ci.yml:65` só comenta) **[V]** | (opcional) teste que falha se uma entrada do baseline deixou de ser violação (mesma ideia de `route-spec-wiring.test.ts:119`) |
| **R16** | B, C, D, E | **herdado** — A FALHA (14) **[V]** | parcial: só o GAP-MAP N3 do BankSettlement, e está desatualizado (§3 nº 3) **[V]** | **só revisor.** `atomicUntil.boundary.test.ts:34-40` confere só a **presença** dos 5 marcadores, não a existência dos testes citados; `coverageThreshold` (`jest.config.js:78`) só age com `--coverage`, e o CI roda o jest sem a flag (`ci.yml:153`) **[V]** | (1) teste que exige, para cada `*Service.ts`/`*Controller.ts`, um arquivo de teste que o importe, com baseline que só encolhe; (2) `atomicUntil.boundary.test.ts` resolver cada `teste: X › "nome"` contra o arquivo; (3) um job de CI com `--coverage` |
| **R21** | B, C, D | **herdado** — A FALHA (18) **[V]** | **não**: a sanção D-2026-10-13 cobre só a `CrmReportList`; a extensão a B/C/D está pendente (§6 nº 2) **[V]** | **só revisor.** Nem `my-app/eslint.gate.config.mjs` nem o skill-audit olham `<table>` **[V]** | lint `no-restricted-syntax` para `JSXOpeningElement[name.name='table']` em `features/**` fora de `GenericTable`, com allowlist dos bespoke sancionados por decisão |
| **R23** | C (formal), E (1 real + 2 formais) | **herdado** — A FALHA (2, formais) **[V]** | não **[V]** | **só revisor.** `skill-audit/check-i18n-keys.mjs:26-43` confere só a paridade de chaves **en↔pt**, não o namespace do `serverSideTranslations` **[V]** | o R23 corrigido do instrumento (namespace transitivo por página ⊆ `serverSideTranslations` + `ns` do `next-i18next.config`) como teste ou passo de CI |

**Itens sem FALHA em B–E, com observação de gate:**
- **R17:** B–E têm 85–88 % de linhas, mas **não há gate de cobertura no CI** **[V]**: `ci.yml:153` sem `--coverage`; `jest.config.js:61`, "collected … when run with --coverage".
- **R14:** `no-explicit-any` desligado no lint (`server/eslint.config.mjs:41-43`). B–E estão em 0 sem gate **[V]**.
- **R22:** só o `zinc-` novo tem gate (`ci.yml:299-318`, diff contra a base). `rounded-xl` em card e `bg-white` sem `dark:` dependem de revisor **[V]**.
- **R18:** `check:dup`/`check:dead` são **advisory** no CI (`ci.yml:70-76`, `:202-208`) **[V]**. O total do repo, 3,5 % (server) / 4,17 % (my-app), está abaixo da referência do `ADR-ARCH-BOUNDARIES` §3 (3,53 / 4,29).

### Conclusão
**Não há regressão** de arquitetura nem de qualidade em B, C, D e E em relação a A. B–D passam em sete itens em que A falha (R1, R3, R4, R5, R14, R20, R22) e têm mais cobertura (85–88 % × 63 %). As FALHAs restantes são padrão herdado de A (R3-E, R6, R15, R16, R21, R23) ou dívida declarada com gate (R7). A única erosão nova sem declaração e sem gate é R8 **[V]**.
**Risco principal:** a qualidade de B–D se apoia em revisor. R6, R8, R16, R21 e R23 não têm gate, e a cobertura alta não é protegida porque o CI roda o jest sem `--coverage` **[V]**.

---

## 5. Não medido

1. **R17 my-app:** `npx vitest run --coverage` → `MISSING DEPENDENCY  Cannot find dependency '@vitest/coverage-v8'`. Instalar muda `package.json`/lock, fora de uma auditoria só de leitura.
2. **R18 status:** a régua não fixa limiar, então fica como "relatório". Concentração conhecida: espelho AP/AR no FE de B (`AccountsReceivablePanel`/`AccountsPayablePanel`, ~380 linhas duplicadas cada) **[V]**.
3. **R10:** existência e título do caso **[V]**; o que cada assert prova **[I]** (corpos não lidos).
4. **R16:** o predicado conta interfaces `I*Repository` e mede referência por nome; exercício real não é medido por ele. Complemento (merge de cobertura unit + integração): todo repositório dos grupos é exercitado contra o banco real **[V]**.

## 6. Achados fora da régua · decisões

**Achados fora da régua**
1. **Contrato §2 defasado em relação ao próprio gate.** `.claude/skills/_ARCHITECTURE-CONTRACT.md:67-69` define o 2º toque do registro de rota como "bloco `@openapi` em `server/src/routes/docs.paths.ts`". O gate do projeto (`server/src/__tests__/route-spec-wiring.test.ts` + `scripts/generate-openapi.js`) aceita bloco em controllers, routes e dtos e mede o spec gerado inteiro. Por isso R7 dá FALHA pela letra em B/C mesmo com o gate verde. Emenda de uma linha no contrato, **fora deste PR**.
2. **Evidência declarada desatualizada:** o cabeçalho `atomicUntil` de `BankSettlementService.ts:5-12` diz "sem teste" e o teste existe (§3 nº 3). O gate (`atomicUntil.boundary.test.ts`) não pega isso porque só confere a presença dos marcadores. Vale conferir os outros `[sem teste — GAP-MAP]` (AccountingReview, DataExchangeImport, Depreciation).
3. **Namespace morto:** `components/ui/Modal.tsx:28` declara `database` sem usar nenhuma chave dele, e isso gera todos os hits formais de R23.

**Decisões do dono nesta auditoria (2026-10-14, chat)**
- R7 B/C: mantida **FALHA pela letra da régua**, com a nota "declarada em `route-spec-wiring.test.ts:31-35` (`KNOWN_UNDOCUMENTED`) e coberta por gate no CI".
- Classificação: cashflow/DFC → C, CompanySigner → C, CompliancePanel → D; `accountingController` em C, misto.
- R21 E: `CrmReportList.tsx` sancionada por `docs/plano/decisoes/D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS.md:21`.

**Decisões pendentes**
- **R21 B/C/D:** estender a sanção da D-2026-10-13 item 2 (tabela própria para dado Prisma first-class, divergência de objeto, critério de reuso estágio 1) a financeiro, contábil e fiscal. Resposta do dono em 2026-10-14: "Não ratifico agora". Até lá, R21 B/C/D = FALHA (14 / 34 / 6 `<table>` bespoke).

## 7. Fontes
- Gates lidos: `.github/workflows/ci.yml`; `server/.dependency-cruiser.cjs`; `my-app/.dependency-cruiser.cjs`; `server/eslint.config.mjs`; `my-app/eslint.gate.config.mjs`; `scripts/debt-ledger-check.mjs`; `server/jest.config.js`; `server/src/features/accounting/__tests__/atomicUntil.boundary.test.ts`; `server/src/__tests__/openapi-paths.test.ts`; `server/src/__tests__/route-spec-wiring.test.ts`; `.claude/skills/skill-audit/check-i18n-keys.mjs`.
- Regras citadas: `.claude/skills/_ARCHITECTURE-CONTRACT.md:67-69,163`; `.claude/skills/_REUSE-CRITERION.md:31`; `docs/adr/ADR-ARCH-BOUNDARIES.md` §3; `docs/plano/decisoes/D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS.md:21`.
- Brutos da medição (fora do repo, não versionados): saída e cache do instrumento em `%TEMP%\medicao-luminaris` (`matriz-M.md`, `grupos.md`, `raw/`, `janelas/`); rodada manual de conferência na mesma árvore em `.claude/retornos/arch-regressao-fase1*` do worktree.
