# C8 — Plano de execução granular: BE-INCR-FIXED-ASSETS (imobilizado + depreciação + retificação versionada)

> **Estado: plano de execução (granularização do BRIEF), 2026-09-17.** ADR `ADR-INCR-FIXED-ASSETS.md` (Proposed +
> parecer §4); BRIEF `BE-INCR-FIXED-ASSETS-brief.md` com **37 comportamentos**; F-FA1..9 delegados, **F-FA10/12/13 → (a)
> ✅ ratificados 2026-09-16** (`CEDULA-DECISAO-2026-09-16-forks-c11-c12-c6b-c8-seed.md`). **Implementação continua exigindo
> "executa" do dono (ORCH-006)** — este documento NÃO altera o BRIEF: desce-o ao nível de PR/passo/arquivo/teste
> (precedente `BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md` #336 → "executa" no mesmo dia) e registra **2 forks
> novos (F-FA14/F-FA15)** que a leitura do código pós-C6b expôs. Escrito em `sessao-planejamento` (item 5 de
> `PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`, Fork F-PS-3 → a ratificado 17/09).

- **Autorização:** F-Z0 (`CEDULA-DECISAO-2026-09-03-modulos.md`) abriu a frente; BRIEF #330; forks 16/09 (#333);
  `PROXIMOS-PASSOS-2026-09-17.md` passo 5.2 (*"fatiamento é plano, não fork"*) + 5.3 (Anexo III: chave = ordinal, `<STRIKE>`,
  sha256); dono 17/09: *"Pode planejar em 1 única sessão para fechar as pontas que não são implementação de código"* +
  *"Vai na recomendação dos 5"* (F-PS-3 → a). **Granularizar, não executar.**
- **Insumos lidos nesta sessão** (todos em `origin/main` `85378005`): BRIEF C8 inteiro; `PostingService.ts:286-323`
  (`postEntry` abre tx raiz própria, `findBySource` read-first `:305`); `InventoryService.ts:60-80` (padrão 2 txs + reconcile);
  `LalurService.ts:825-885` (`closeParteB`, movimentos `origem='system'` substituídos `:856`); `lib/sped.ts:159-194`
  (`buildI030` já aceita `indFinEsc`/`codHashSub`), `:546-568` (`buildJ930`), `:533` (`buildJ900`) — **sem `J801`/`J932`**;
  `lib/ecf.ts:114-143` (`retificadora`/`numRec` emitidos, default `'N'`); `SpedEcdDto.ts:46-47,74-129` (`indFinEsc`,
  `codHashSub`, `SignerSchema`, `superRefine` existente); `SpedGenerationService.ts:129,366` (job grava `periodStart`;
  `indFinEsc` passa ao I030); `NfeImportService.ts:100-120,233-245` (mapa `cProd→productRef`, `allocate`);
  `PayableDto.ts:93-112` (3 modos XOR no `superRefine`); `schema.prisma:615-638` (`AccountingDataExchangeJob`), `:1345-1360`
  (`AccountingScopeSettings` — só 2 FKs de encargo hoje); `AccountingScopeSettingsDto.ts:12-16`; `audit/auditCanonical.ts:133-138`;
  `lib/factory.ts:1100-1110`; `routes/accounting.ts:151-156` (data-exchange: **sem** `GET /jobs` lista); `openapi-paths.test.ts:69`
  (`BASELINE = 189`); `prisma/migrations/` (última `20260917035133_add_accounting_delivery_items`); `scripts/baixar-fontes-oficiais.mjs:12,446`
  (`--so=<id>`); `scripts/ecf-tabelas-dinamicas-to-catalog.mjs` (molde do parser → fixture com sha); `docs/accounting/fontes-oficiais/MANIFEST.md:12,16,80`
  + `.gitignore:10` (`*-anexos/` **não versionado**).

---

## 0. Achados da leitura que mudam a granularidade (não o BRIEF)

| # | Achado (verificado) | Efeito no plano |
|---|---|---|
| A1 | **Anexo III não está em disco** num worktree novo: `43557-tabela.html` (sha `d526ac53071a`, 464.572 B) está no `MANIFEST.md:80`, mas `*-anexos/` é gitignored (`fontes-oficiais/.gitignore:10`). Idem `Manual-ECD-Leiaute-9.pdf` (`MANIFEST.md:16`, sha `bc63f0a893ce`; só o PDF da ECF L12 está em disco). | PR-1 começa por `node scripts/baixar-fontes-oficiais.mjs --so=in-1700-2017` e **`git checkout -- docs/accounting/fontes-oficiais/MANIFEST.md`** depois (o `--so` reescreve o manifesto — BRIEF §6). O script do fixture **assere o sha** do HTML lido = `d526ac53071a` (falha loud se a RFB republicar). PR-4 idem com `--so=manual-ecd-l9`. |
| A2 | **`GET /api/accounting/data-exchange/jobs` (lista) não existe** — só `/jobs/:jobId`, `/rows`, `/download`, `/commit` (`routes/accounting.ts:151-156`). O BRIEF item 30 diz "**expõe** `supersedesJobId`/`supersededByJobId`" como se a lista existisse. O mesmo endpoint é o Fork **F-FE-RV-1 (a)** do `FE-INCR-REVIEW-brief.md` (e insumo do `FE-INCR-DELIVERY`). | Fork **F-FA15** (quem cria a rota). PR-4 escreve o item 30 como **"criar ou estender"** a lista; choke point `routes/accounting.ts` + `docs.paths.ts` + BASELINE compartilhado com os FE. |
| A3 | `AccountingScopeSettings` tem hoje **2** colunas de conta (`bankCharge*`); o BRIEF item 5 adiciona **3** (+ item 24 pede `depreciationParteBAccountId` FK `LalurParteBAccount` = **4**). `ADD COLUMN` no SQLite **não tem `IF NOT EXISTS`** — review do #340 mandou mover colunas para o **fim** da migração, tabelas com `CREATE TABLE IF NOT EXISTS` antes. | Ordem interna da migração fixada no Passo 1: tabelas novas (3) → índices → colunas (`AccountingScopeSettings` +4, `AccountingDataExchangeJob` +5). `smoke:migration` com abort simulado **entre** tabelas e colunas. |
| A4 | `SpedEcdDto.declarant` **já expõe** `indFinEsc` (default `'0'`) e `codHashSub` (optional, `:46-47`) e `buildI030` **já os emite** (`sped.ts:193-194`) — mas **nada valida** `'1' ⇒ codHashSub` hoje, e `SpedGenerationService.ts:366` só repassa. Não existe `J801`/`J932` em `sped.ts` (só `J900`/`J930`/`J935`? — `J935` também **não** existe). | PR-4 Passo 20: `superRefine` novo no DTO (não um shape paralelo) + emitters `buildJ801`/`buildJ932` no **mesmo** `sped.ts`; `J935` fica fora (só com auditor — BRIEF item 26). |
| A5 | `postEntry` abre tx raiz própria e **não aceita `tx`** (`PostingService.ts:286,323`) — confirmado; o padrão 2-tx + `reconcile` está **escrito** em `InventoryService.ts:60-80` (`recordSaleCogs` tx1 / mapper tx2 / `reconcileInventory`). | PR-3 copia a **forma** (read-first `findBySource` → tx1 `postEntry` → tx2 CAS `addAccumulated` → `reconcile`), não o código. Teste de crash injetado no mesmo molde do estoque. |
| A6 | `LalurService.closeParteB` (`:825`) já **substitui** os movimentos `origem='system'` por indicador (`:856`) — é o gancho do Bloco F; o serviço **não recebe** nada de imobilizado hoje. | PR-3 injeta `IFixedAssetReader` (interface de leitura, não o serviço inteiro — `fanin-do-concreto-le-1-sob-injecao-por-interface`) no `LalurService` via factory; `closeParteB` ganha um passo `depreciationDifference(scope, year, quarter)` **antes** da materialização. |
| A7 | `PayableDto.superRefine` (`:93-112`) é o **único** lugar dos 3 modos XOR — modo 4 (`fixedAssetItems[]`) entra **lá**, combinável só com o 3 (F-FA12 a). `NfeImportService.allocate` (`:120`) já separa `inventoryItems`/`ignoredItems` por item. | PR-5: `allocate` ganha a 3ª saída `fixedAssetItems` por `cfop ∈ {1551, 2551}` (`lib/nfe.ts:236` já parseia `cfop`); `PayableService` debita `class.costAccountId`; **sem** `StockMovement`. |
| A8 | `openapi-paths.test.ts` BASELINE = **189** (floor). Rotas novas do C8: classes (3) + taxas (3) + ativos (list/get/create/put/delete = 3 paths) + activate/dispose/reconcile (3) + depreciation/run (1) + waive (1) + jobs lista (1, se F-FA15 a) = **~15 paths**, não 9. | BASELINE sobe **por PR** (PR-2 +9, PR-3 +2, PR-4 +2/+3, PR-5 0) — cada PR eleva de propósito e registra. |
| A9 | `auditCanonical.ts` allowlist por evento (`:133-138`) tem **teste-guarda** por evento (memória `accounting-audit-allowlist-guards`); o BRIEF nomeia **9** eventos novos (`fixed_asset.created|activated|disposed`, `depreciation.posted`, `depreciation_rate.created|hidden`, `scope_settings.updated` +3/+4 ids, `sped.ecd_substituted`, `sped.ecf_rectified`, `sped.ecf_rectification_waived`). | Cada PR entra com **seus** eventos + teste-guarda no mesmo diff (nunca "depois"). |
| A10 | `dev.db` real: `fixed_assets*`/`depreciation_rates` não existem (S6 do smoke **vacuoso**, declarar); `accounting_scope_settings` pode ter 0–1 linha ⇒ `ADD COLUMN … NULL` é seguro. Seed lazy (A3 do BRIEF): nenhum backfill. | Nenhum passo de migração de **dado**; S6 vacuoso declarado em cada PR com migração (só PR-1). |

Nenhum achado contradiz o BRIEF; A2/A4/A8 corrigem **contagens e pressupostos** (lista de jobs, `J935`, +9 paths).

---

## 1. Forks NOVOS — RATIFICAÇÃO PENDENTE (desdobram A2/A3; não reabrem F-FA1..13)

| Fork | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-FA14** | **Uma migração** para todo o C8 (Fase 0 do `_PARALLELIZATION-CONTRACT.md`) no PR-1, ou **uma por PR** (precedente C6b: migração só no PR-3)? | (a) **única no PR-1** — 3 tabelas + 9 colunas, shapes já fixados pelo BRIEF itens 1–7; PR-2..5 sem migração · (b) por PR (PR-1 tabelas+seed; PR-2 nada; PR-3 nada; PR-4 colunas do job; PR-5 nada) — 2 migrações | **(a)** — o BRIEF fecha os shapes (F-FA10 a decidiu a chave da taxa); uma migração = um `smoke:migration` contra o `dev.db` real, um S6 vacuoso, um review do passo de maior blast radius. (b) vale se o dono quiser o PR-1 mínimo — custo: 2ª migração aditiva no PR-4 |
| **F-FA15** | Quem cria `GET /api/accounting/data-exchange/jobs` (lista): o C8 (item 30, PR-4) ou o `FE-INCR-REVIEW` (F-FE-RV-1 a)? | (a) **regra pré-decidida: quem mergear primeiro cria; o segundo rebaseia e só estende** (C8 acrescenta `supersedesJobId`/`supersededByJobId`; o FE acrescenta nada) — shape único: `{ unitId, direction?, kind?, status?, year?, page, limit }` → `{ items: DataExchangeJob[] (+periodStart/End), total, page, limit }`, policy `canRead` · (b) `BE-INCR-DATA-EXCHANGE-JOBS-LIST` próprio (P, 1 rota) executado **antes** dos dois · (c) C8 sempre cria; FE espera | **(a)** — evita uma 3ª autorização para 1 rota e evita bloquear o FE no C8 (maior peça); o shape fica escrito aqui **e** no BRIEF FE-REVIEW §2.2 para não divergir. (b) é a versão limpa se o dono preferir zero acoplamento |

---

## 2. Fatiamento em PRs (PAR-003 aplicado — tudo same-domain ⇒ serial, PAR-005)

Todos os slices editam arquivos existentes do domínio `accounting` (`routes/accounting.ts`, `docs.paths.ts`, `factory.ts`,
`auditCanonical.ts` são choke points em **todos**) ⇒ **nenhum paralelismo** (PAR-002). Ordem serial, cada PR mergeado
antes do próximo (`squash-merge-quebra-prs-empilhados`: **não** empilhar; PR N+1 nasce de `main` após o merge de N).

| PR | Nome | Itens do BRIEF | Depende | Migração | Gate próprio |
|---|---|---|---|---|---|
| **PR-1** | Schema + seed do Anexo III + taxas (Bloco A + `GET/POST /depreciation-rates`) | 1, 2, 3, 4 (tabela), 5 (colunas), 6, 7 (colunas), 37 | — | **sim** (única, F-FA14 a) | `smoke:migration` (S6 vacuoso) · parser com **contagens exatas** (220 vivas + 2 Notas) · diff vazio ao regerar o fixture · seed 2ª passada = 0 inserts · sha do HTML asserido |
| **PR-2** | Classes + ativos + comandos `activate`/`dispose` + settings DTO (Blocos B + D) | 5 (DTO), 8, 9, 10, 11, 18, 19 | PR-1 | não | 3 casos de baixa (>, =, <) · CAS por `version` · cross-tenant 404 · `MaxCentsExceededError` · BASELINE +9 |
| **PR-3** | Depreciação mensal + reconcile + Parte B no fechamento (Blocos C + F) | 12, 13, 14, 15, 16, 17, 23, 24, 25, 35, 36 | PR-2 | não | falsificadores do BRIEF §8 (Σ12 exato, 33,3 % fecha no mês 37, `runMonth` 2× → `posted=0` **na 2ª**, 4 casos de período, crash tx1/tx2 → `reconcile` 1×) · BP com `1.2.9` subtraindo (item 35 — se falhar, **pausa**) · BASELINE +2 |
| **PR-4** | Retificação versionada ECD/ECF + J801/J932 + dispensa + gate no pacote + lista de jobs (Bloco G) | 26, 27, 28, 29, 30, 31 | PR-1 (colunas do job); **transcrição J801** (insumo) | não (F-FA14 a) | substituta contém `\|J801\|`+`\|J932\|`, original não · `sha256`/`status`/`storageKey` do substituído **inalterados** · 2º substituto → 409 · pacote 400 sem ECF `'S'` e sem dispensa · BASELINE +2 (+1 se F-FA15 a cair aqui) |
| **PR-5** | Entrada por NF-e modo 4 + nota mista + rascunho + re-drive (Bloco E, F-FA12 a) | 20, 21, 22 | PR-2 (rascunho `PENDING_ACTIVATION`), PR-3 (`reconcile` re-drive) | não | re-upload da mesma chave → 409 e 0 rascunhos · crash payable→rascunho → `reconcile` cria 1× · item 1551 sem `classId` → 400 · nota mista = 2 débitos |

**Por que 5 e não 3:** PR-3 (quota + tie-out + Parte B) e PR-4 (SPED substituto) são as duas peças com **regra de domínio
densa** e revisão longa; juntá-las a qualquer outra repete o custo do C11 (15 comportamentos, review FAIL→PASS). PR-5 é
o único que toca o **AP/NF-e** (`PayableDto`, `NfeImportService`) — fica isolado para o revisor ler só essa fronteira.
**Alternativa declarada:** 3 PRs (1+2 · 3 · 4+5) — válida se o dono quiser menos "executa"; custo: PR-3' com ~30 arquivos.
**PR-4 e PR-5 são permutáveis** (write-sets disjuntos fora dos choke points) — a ordem acima segue R6 (contábil/ECD
antes de fiscal/NF-e). **Fatiamento a ratificar junto com o "executa"** (precedente C6b 16/09).

---

## 3. Passos numerados (ordem de implementação dentro de cada PR)

Convenção: **W** = write-set, **T** = teste que falha se o passo estiver errado, **F** = fork/decisão que morde.
Caminhos relativos a `server/src/features/accounting/` salvo indicação. Cada PR pela `sessao-feature` com **BRIEF + este
plano** como spec; worktree novo ⇒ `npm ci` + `.env` (`worktree-deps-stale-prisma-client`).

### PR-1 — Schema + seed do Anexo III + taxas

1. **Corpus em disco.** `node scripts/baixar-fontes-oficiais.mjs --so=in-1700-2017` → `docs/accounting/fontes-oficiais/IN-RFB-1700-2017-anexos/43557-tabela.html`;
   `sha256sum` = `d526ac53071a…` (MANIFEST:80); `git checkout -- docs/accounting/fontes-oficiais/MANIFEST.md`.
   **T:** o script do Passo 3 aborta se o sha divergir (mensagem cita MANIFEST:80).
2. **Migração única** `prisma/migrations/2026MMDD######_add_fixed_assets/migration.sql` (F-FA14 a), ordem interna (A3):
   `CREATE TABLE IF NOT EXISTS fixed_asset_classes`, `depreciation_rates`, `fixed_assets` (BRIEF itens 1, 2, 4; FKs
   `Restrict`; `@@unique([userId,unitId,code])` ×2; `@@unique([userId,unitId,source,sourceRow])` — F-FA10 a) → `CREATE INDEX
   IF NOT EXISTS` → **ao fim** `ALTER TABLE accounting_scope_settings ADD COLUMN depreciationExpenseAccountId /
   disposalGainAccountId / disposalLossAccountId / depreciationParteBAccountId` (4, item 5 + 24) → `ALTER TABLE
   accounting_data_exchange_jobs ADD COLUMN supersedesJobId (UNIQUE), ecfRectificationRequired DEFAULT 0,
   ecfRectificationWaivedAt, ecfRectificationWaiverReason, verificationTermStorageKey` (5, itens 6–7). `schema.prisma`
   espelhando. **W:** `schema.prisma`, migração. **T:** `npm run smoke:migration` contra cópia do `dev.db` real
   (`server/prisma/prisma/dev.db` — `dev-db-real-path-is-nested`), abort simulado após as tabelas e após o 1º `ADD COLUMN`
   (rerun não pode falhar por tabela existente; coluna duplicada é o único ponto não-idempotente — por isso fica no fim);
   S6 vacuoso declarado. `test/helpers/db.ts` — guarda derivada do schema deve pegar as 3 tabelas (item 37; se não, +3
   `deleteMany` na ordem FK).
3. **Parser → fixture.** `scripts/anexo-iii-to-fixture.mjs` (molde `ecf-tabelas-dinamicas-to-catalog.mjs`: lê o HTML do
   corpus, escreve `fixtures/anexo-iii-in-1700-2017.json` com `{ sourceSha256, generatedFrom: 'MANIFEST:80', rows[] }`;
   `--stdout` para o teste comparar com o commitado). Regras (i)–(vii) do BRIEF item 3 **cada uma com caso**: `<STRIKE>`
   descartada (`8517`), sem taxa descartada, `Capítulo NN` com taxa → `ncm=null`, `----` → `ncm=null`, NCM texto, `sourceRow`
   = ordinal da `<TR>`, taxa `'33,3%'` → 3330, `8905` sem `%` com prazo 20 → 500 bp + `justification`. **W:** script, fixture,
   `scripts/__tests__/anexo-iii-to-fixture.test.mjs` (ou jest em `server/`). **T:** contagens **exatas** 220 vivas + 2 Notas
   (`8417` 33,3 % · `null` "indústria química" 20 %); regerar = diff vazio; `8517` ausente; `3926.90` presente **2×** com
   `sourceRow` distintos.
4. **Modelo + repo + seed.** `models/FixedAsset.model.ts` (consts `FIXED_ASSET_STATUSES`, `DEPRECIATION_RATE_SOURCES`, eventos,
   `quotaCumulativa(base, bp, k)` **pura** — item 12, testável sem banco), `repositories/IDepreciationRateRepository.ts` +
   impl, `services/DepreciationRateSeedService.ts` (`seed(scope)` idempotente por `@@unique`, lazy no 1º `GET`). **W:** 4
   arquivos + `lib/factory.ts`. **T:** `seed` 2ª passada = 0 inserts **asserido**; `quotaCumulativa`: 100.000 × 10 % → 833/833/834…,
   Σ12 = 10.000; 33,3 % → mês 37 = resíduo 100.
5. **DTO + rotas de taxas.** `dtos/DepreciationRateDto.ts` (`UpsertDepreciationRateSchema` sempre `CUSTOM`, `HideRateSchema`,
   `ListRatesQuerySchema` com `queryBoolean('includeHidden')`), `controllers/depreciationRateController.ts`, rotas
   `GET/POST /api/accounting/depreciation-rates`, `POST /depreciation-rates/:id/hide` (segmento estático antes de
   `/:unitId/periods`), `docs.paths.ts`, `npm run docs:generate`. Linha `ANEXO_*` em `POST`/edição → 400 (parecer D4).
   **W:** 3 arquivos + `routes/accounting.ts` + `docs.paths.ts` + `public/openapi.json` + `__dto-shapes__.json`. **T:** snapshot
   de shape; `openapi-paths` BASELINE 189 → **192**; policy `canManageFixedAssets` (item 11 — nasce aqui, `IAccountingPolicy`
   + impl, padrão `canManageFiscalProfile`); eventos `depreciation_rate.created|hidden` na allowlist + teste-guarda.
6. **Gates do PR-1:** `tsc` · `test:integration --runInBand` · `docs:generate` diff vazio · `smoke:migration` · review
   independente (foco: migração + parser) · OPS-001 com adversarial = "HTML retocado (1 byte) → script aborta pelo sha".

### PR-2 — Classes + ativos + comandos + settings

7. **Classes.** `dtos/FixedAssetClassDto.ts` (`Create/Update`, `depreciable` ⇒ `accumulatedDepreciationAccountId` obrigatório
   via `superRefine`; `LAND` nasce `depreciable=false`), repo, `services/FixedAssetClassService.ts` (soft-delete bloqueado com
   ativo vivo), controller, rotas `GET/POST /fixed-asset-classes`, `PATCH/DELETE /:id`. **T:** delete com ativo `ACTIVE` → 400;
   cross-tenant → 404.
8. **Ativos.** `dtos/FixedAssetDto.ts` (`CreateFixedAssetSchema` com `rateId` **XOR** `annualRateBp`, `bookAnnualRateBp ⇒
   bookRateJustification`, `costCents: string(BigInt>0)` ≤ `MAX_CENTS`, `residualValueCents < costCents`, `acquiredAt` date-only
   via `isValidDateOnly`), `ActivateFixedAssetSchema { activatedAt, openingAccumulatedCents?, version }`,
   `DisposeFixedAssetSchema { disposedAt, proceedsCents, counterpartAccountId? (obrigatório se proceeds > 0 — F-FA13 a), version }`,
   `ListFixedAssetsQuerySchema`. `repositories/IFixedAssetRepository.ts` + impl (`findByCode`, `addAccumulated` CAS —
   `updateMany where {id, version, accumulatedDepreciationCents}`, 0 linhas ⇒ `ConflictError`; `BigInt` sem `Number()` cego).
   `services/FixedAssetService.ts` (`create` → `PENDING_ACTIVATION`, snapshot `annualRateBp` da `rateId`; `update` só
   `PENDING_ACTIVATION`; `softDelete` só sem quota postada; `activate` — `activatedAt` anterior ao 1º período
   `OPEN/SOFT_CLOSED` **exige** `openingAccumulatedCents`; cross-tenant 404). **T:** matriz de status × comando; `activate`
   retroativo sem opening → 400 nomeado; classe `depreciable=false` ativa sem quota.
9. **Baixa (Bloco D).** `dispose`: exige quota do mês de `disposedAt` postada (ou posta antes — reusa o Passo 11 do PR-3?
   **não** — PR-3 ainda não existe: em PR-2 a baixa **exige** que `accumulatedDepreciationCents` já reflita o mês, senão 400
   "poste a depreciação do mês antes"; PR-3 troca o 400 pela postagem sequencial — registrado como **desvio temporário**
   no PR). Entry `sourceType='fixed_asset.disposal'`, `sourceId=assetId`, 4 pernas (D acumulada / C custo / D contrapartida /
   D perda | C ganho) pelo `postEntry` (tx1) + CAS `status='DISPOSED', disposalEntryId` (tx2). **T:** 3 casos (>, =, <);
   `proceedsCents=0` sem `counterpartAccountId` OK (imprestável); sem `disposalGain/LossAccountId` → 400 nomeando a conta.
10. **Settings DTO** (`AccountingScopeSettingsDto.ts:12-16` +4 ids `nullable().optional()`; serviço valida FK existente
    no escopo; evento `scope_settings.updated` allowlist +4 ids). Rotas + `docs.paths.ts` + factory (`FixedAssetService`
    recebe `PostingService`, `IFixedAssetRepository`, `IAccountingPeriodRepository`, `AccountingScopeSettingsService`).
    Eventos `fixed_asset.created|activated|disposed` + teste-guarda. **T:** snapshot de 4 DTOs; BASELINE 192 → **201**.
11. **Gates do PR-2:** idem PR-1 (sem migração) · adversarial = "`dispose` 2× com mesma `version` → 2ª é 409, 1 entry só".

### PR-3 — Depreciação mensal + reconcile + Parte B

12. **`runMonth`.** `dtos/DepreciationDto.ts` (`RunDepreciationSchema { unitId, yearMonth: /^\d{4}-(0[1-9]|1[0-2])$/ }`),
    `POST /fixed-assets/depreciation/run` (segmento estático **antes** de `/fixed-assets/:id`). Serviço: pré-cheque `settings.
    depreciationExpenseAccountId` + classe `accumulatedDepreciationAccountId` (400 nomeando a conta **antes** de qualquer
    ativo — item 16); para cada `ACTIVE` depreciável com `activatedAt ≤ fim do mês`: `k`, `base`, `bp = book ?? annual`,
    `quota = min(cumulativa(k) − cumulativa(k−1), base − acumulado)`; **read-first** `findBySource('fixed_asset.depreciation',
    `${id}:${yearMonth}`)` → `skipped` (+ predicado barato da tx2 pendente — item 13 [D3]); senão **tx1** `postEntry` (D despesa /
    C acumulada, data = último dia do mês) → **tx2** `addAccumulated` CAS; `acumulado == base` ⇒ `FULLY_DEPRECIATED`.
    `AccountingPeriodNotOpenError` (4 casos) → `failed[]`; **qualquer outro erro aborta** (`erro-especifico-para-skip-em-job`).
    Evento `depreciation.posted` na tx2. **T (falsificadores §8):** 100.000 × 10 % → Σ12 = 10.000 exato, mês 120 fecha, 121º
    `posted=0` **sem** o ativo no loop; 33,3 % → mês 37 resíduo 100; `runMonth` 2× → **2ª** chamada `skipped=n, posted=0`
    (asserir a segunda — memória `comentario-de-teste-afirma-o-que-nao-assere`); `LAND` → 0 entries; 4 casos de período →
    `failed[]` com 0 entries; mês de ativação inteiro (art. 123 §2).
13. **`reconcile`.** `POST /fixed-assets/reconcile { unitId }`: recomputa `accumulated = opening + Σ créditos das linhas
    `fixed_asset.depreciation` do ativo` e repara drift com `logger.warn` (molde `reconcileInventory`); também re-drive dos
    payables com `fixedAssetItems` sem rascunho (**vazio até PR-5** — deixar o gancho com teste que o chama e espera 0).
    **T:** tie-out Σ créditos === `accumulated − opening`; crash injetado entre tx1 e tx2 (mock do repo lança na CAS) →
    `reconcile` fecha o drift **1×** (2ª chamada = 0 reparos).
14. **Baixa sequencial.** Troca o 400 temporário do Passo 9 pela postagem da quota do mês de `disposedAt` (idempotente pelo
    Passo 12) antes do entry de baixa. **T:** `dispose` em mês sem quota posta 2 entries (quota + baixa) na ordem.
15. **Parte B (Bloco F).** `IFixedAssetReader` (interface: `listForParteB(scope, year, quarter)`) injetada no `LalurService`;
    em `closeParteB` (`:825`), antes de materializar: `Σ(quota fiscal − quota contábil)` do trimestre para ativos com
    `bookAnnualRateBp ≠ null` **ou** `residualValueCents > 0` (status `ACTIVE`/`FULLY_DEPRECIATED` com saldo ≠ 0 — S4); > 0
    exclusão, < 0 adição; fiscal atingiu `costCents` → adição do excedente; movimento `origem='system'` na
    `depreciationParteBAccountId` (400 nomeando `COD_PB_RFB` esperado se ausente com diferença ≠ 0); vínculo M312 para os entries
    de quota do trimestre. **T:** default (sem override, residual 0) → **0 movimentos novos** (item 25); override contábil 20 %
    × fiscal 10 % → exclusão = diferença exata; cauda S4 (contábil termina antes) → movimentos até o fiscal fechar.
16. **BP com retificadora (item 35).** Teste de `balanceSheet` com `1.2.9.x` credora subtraindo do ativo — **se falhar, é
    lacuna do INCR-4: registrar no GAP-MAP e pausar o passo** (regra 4), não corrigir aqui. **Fluxo de caixa (item 36):** teste
    de que a aquisição em `1.2.x` cai em *investing* (`INVESTING_ASSET_CODE_PREFIXES`) sem código novo.
17. **Gates do PR-3:** BASELINE 201 → **203** (`run`, `reconcile`); eventos + teste-guarda; review independente com **as
    contas** (o revisor refaz 833/833/834 à mão) · adversarial = "quota com `base − acumulado` < cumulativa no mês 37".

### PR-4 — Retificação versionada + J801/J932 + dispensa + gate no pacote + lista de jobs

18. **Insumo antes de codar:** `node scripts/baixar-fontes-oficiais.mjs --so=manual-ecd-l9` (+ `git checkout -- MANIFEST.md`);
    transcrever **J801** (campos, tamanhos, `COD_MOT_SUBS` 001..005/099) e **J932** (Manual ECD L9 pp. 193–204) para
    `docs/accounting/BE-INCR-SPED-ECD-layout-transcription-J801-J932.md` com sha256 do PDF (`bc63f0a893ce`) — padrão da
    transcrição J930/0930 (#339). **Sem transcrição, o passo 20 não abre** (regra 3 da sessão).
19. **DTOs.** `SpedEcdDto.ts`: `superRefine` no `declarant` (`indFinEsc='1'` ⇒ `codHashSub` **40 hex** obrigatório +
    `body.supersedesJobId` + `body.verificationTerm { codMotSubs: enum, descRtf?, signers: SignerSchema[] (reuso `:74`),
    deadlineJustification? }`; `'0'` ⇒ todos proibidos); `.rtf` via **multipart** na rota de geração (`makeUploadMiddleware`,
    padrão do XML da NF-e) → `verificationTermStorageKey`. `SpedEcfDto`/`SpedEcfRealDto`: `retificadora: 'N'|'S'` (`'F'` → 400
    de propósito), `numRec` C 40 (obrigatório ⇔ `'S'`), `supersedesJobId` (obrigatório ⇔ `'S'`). Prazo (art. 8º §4): exercício
    `< ano−2` → 400; `= ano−2` → aviso + `deadlineJustification` obrigatória. **T:** snapshot de 3 DTOs; matriz `'0'/'1'` ×
    presença de cada campo.
20. **Emitters.** `lib/sped.ts`: `buildJ801` (`TIPO_DOC='001'`, `DESC_RTF`, `COD_MOT_SUBS`, `ARQ_RTF` bytes) e `buildJ932`
    (signatários do Termo — reusa `RegJ930Signer` shape) **no mesmo arquivo**; `J935` não (só com auditor). `lib/ecf.ts` já
    emite `retificadora`/`numRec` (`:142-143`) — só passar. **T:** substituta contém `|J801|` e `|J932|`; original não contém
    nenhum; contagem de registros (`countRegisters`) bate.
21. **Serviço de geração (ACC-011, gate dentro da tx).** `SpedGenerationService`/`SpedEcf(Real)GenerationService`: dentro da
    `runTransaction`: `supersedesJobId` existe no escopo, mesmo `kind`, mesmos `periodStart/End` (o job já grava —
    `SpedGenerationService.ts:129`), `EXPORTED`, **sem sucessor** (`@unique` → P2002 = `ConflictError`); grava `supersedesJobId`
    no job novo; ECD substituta ⇒ `ecfRectificationRequired=true` **no job substituto**; ECF `'S'` do mesmo ano zera a flag.
    Substituído **inalterado** (asserir `status/sha256/storageKey` após). Eventos `sped.ecd_substituted` / `sped.ecf_rectified`.
    **T:** 2º substituto do mesmo job → 409; `sha256` novo ≠ antigo; substituído inalterado.
22. **Dispensa + gate no pacote.** `POST /data-exchange/jobs/:id/waive-ecf-rectification { unitId, justification ≥ 20 }`
    (evento `sped.ecf_rectification_waived` allowlist `jobId, year` — **sem** o texto); `AccountingDeliveryService.buildDeliveryPackage`
    lê o **último** job ECD do ano e recusa (400 nomeado) enquanto `required && !waivedAt`. **T:** sem ECF `'S'` e sem dispensa →
    400; com dispensa → pacote sai; com ECF `'S'` → sai.
23. **Lista de jobs (item 30, F-FA15).** Se `GET /data-exchange/jobs` **já existir** em `main` (FE-REVIEW mergeou antes): estender
    com `supersedesJobId` + `supersededByJobId` (derivado por consulta inversa) — sem novo path. Se não: criar com o shape do
    F-FA15 (a) e registrar no BRIEF FE-REVIEW que o endpoint nasceu aqui. O anterior fica baixável (`/download` inalterado).
    **T:** lista devolve o par (antigo com `supersededByJobId`, novo com `supersedesJobId`).
24. **Runbook em branco** `docs/runbooks/RUNBOOK-ECD-SUBSTITUTA.md` (`RUNBOOK-FORMAT.md`): pré-condições (ITG 2000 31–36; prazo
    do ano subsequente), insumos (`.rtf` do Termo, `COD_MOT_SUBS`, signatários, `codHashSub` do recibo), assinatura. **Agente
    prepara; não preenche.**
25. **Gates do PR-4:** BASELINE 203 → **205** (`waive`, jobs lista se criada aqui) · `docs:generate` · snapshots · eventos +
    guarda · review independente (foco: gate in-tx + imutabilidade do substituído) · adversarial = "substituir job de outro
    tenant → 404, nunca 403; `codHashSub` com 39 chars → 400".

### PR-5 — Entrada por NF-e modo 4 + nota mista + rascunho + re-drive

26. **`NfeImportService.allocate`** ganha a 3ª saída `fixedAssetItems[]` por `cfop ∈ {1551, 2551}` (`lib/nfe.ts:236`); custo
    D3 por item (ICMS incluído no MVP — §5 do BRIEF); `itemMappings[]` ganha `classId?` (obrigatório para 1551/2551 — 400 se
    ausente; `productRef` **proibido** nesse item). **T:** nota com 2 itens estoque + 1 item 1551 → `inventoryItems=2`,
    `fixedAssetItems=1`; item 1551 sem `classId` → 400; com `productRef` → 400.
27. **`PayableDto` modo 4** (`fixedAssetItems[] { classId, cProd, costCents, ncm? }`) no `superRefine` (`:93-112`): combinável
    **só** com o modo 3 (F-FA12 a); `PayableService` debita `class.costAccountId` por item; **nenhum** `StockMovement`.
    **T:** snapshot do DTO; modo 4 + modo 1 → 400; nota mista → entry com 2 débitos (1.1.6 + 1.2.x).
28. **Rascunho.** `FixedAssetService.createDraftFromPayable` (após a tx do `createPayable`): 1 `FixedAsset PENDING_ACTIVATION`
    por item (`quantity` = qCom inteiro, `payableId`, `sourceDocumentId` = NF-e, `acquiredAt = dhEmi`), keyed por
    `@@unique([payableId, sourceItemRef])` — **coluna nova?** Sim: `sourceItemRef` no `FixedAsset` (**cabe na migração do PR-1**
    sob F-FA14 a — adicionar ao Passo 2 desde já; sob (b), migração aditiva aqui). Read-first. **T:** re-upload da mesma chave
    → 409 do `@@unique` do `Payable` e **0** rascunhos novos; crash entre payable e rascunho (mock) → `reconcile` (Passo 13,
    gancho de re-drive) cria o rascunho **1×**.
29. **Gates do PR-5:** BASELINE inalterado · snapshot `PayableDto`/`NfeDto` · review independente (foco: fronteira AP/NF-e,
    `param-aceito-e-ignorado`: `classId` em item não-1551 → 400) · adversarial = "CFOP 1551 com `productRef` mapeado → 400,
    não estoque".

---

## 4. Write-set consolidado (PAR-001 — choke points em negrito)

| Arquivo | PR-1 | PR-2 | PR-3 | PR-4 | PR-5 |
|---|---|---|---|---|---|
| `server/prisma/schema.prisma` + migração única | ✎ | | | | |
| `scripts/anexo-iii-to-fixture.mjs` + teste · `fixtures/anexo-iii-in-1700-2017.json` | ✚ | | | | |
| `models/FixedAsset.model.ts` (consts, `quotaCumulativa`) | ✚ | ✎ | ✎ | | |
| `dtos/DepreciationRateDto.ts` · `FixedAssetClassDto.ts` · `FixedAssetDto.ts` · `DepreciationDto.ts` | ✚ | ✚ | ✚ | | |
| `dtos/AccountingScopeSettingsDto.ts` | | ✎ | | | |
| `dtos/SpedEcdDto.ts` · `SpedEcfDto.ts` · `SpedEcfRealDto.ts` | | | | ✎ | |
| `dtos/PayableDto.ts` · `NfeDto.ts` | | | | | ✎ |
| `dtos/__tests__/__dto-shapes__.json` | ✎ | ✎ | ✎ | ✎ | ✎ |
| `repositories/IDepreciationRateRepository` · `IFixedAssetClassRepository` · `IFixedAssetRepository` (+impl) | ✚ | ✚ | ✎ | | |
| `services/DepreciationRateSeedService.ts` · `FixedAssetClassService.ts` · `FixedAssetService.ts` · `DepreciationService.ts` | ✚ | ✚ | ✚ | | ✎ |
| `services/AccountingScopeSettingsService.ts` | | ✎ | | | |
| **`services/LalurService.ts`** (+ `IFixedAssetReader`) | | | ✎ | | |
| `services/SpedGenerationService.ts` · `SpedEcfGenerationService.ts` · `SpedEcfRealGenerationService.ts` | | | | ✎ | |
| **`services/AccountingDeliveryService.ts`** | | | | ✎ | |
| `services/NfeImportService.ts` · `PayableService.ts` | | | | | ✎ |
| `server/src/lib/sped.ts` (J801/J932) · `lib/ecf.ts` | | | | ✎ | |
| `audit/auditCanonical.ts` (+ teste-guarda por evento) | ✎ | ✎ | ✎ | ✎ | |
| `policies/IAccountingPolicy.ts` + `AccountingPolicy.ts` (`canManageFixedAssets`) | ✎ | | | | |
| **`server/src/lib/factory.ts`** | ✎ | ✎ | ✎ | ✎ | ✎ |
| **`server/src/routes/accounting.ts`** | ✎ | ✎ | ✎ | ✎ | |
| **`server/src/routes/docs.paths.ts`** + `public/openapi.json` | ✎ | ✎ | ✎ | ✎ | ✎ |
| `server/src/controllers/depreciationRateController.ts` · `fixedAssetController.ts` · `dataExchangeController.ts` · `spedController.ts` | ✚ | ✚ | ✎ | ✎ | |
| `server/src/__tests__/openapi-paths.test.ts` (BASELINE) | ✎ 192 | ✎ 201 | ✎ 203 | ✎ 205 | |
| `server/test/helpers/db.ts` (se a guarda derivada não pegar) | ✎ | | | | |
| `docs/accounting/BE-INCR-SPED-ECD-layout-transcription-J801-J932.md` · `docs/runbooks/RUNBOOK-ECD-SUBSTITUTA.md` | | | | ✚ | |
| `docs/adr/ADR-INCR-FIXED-ASSETS.md` (Proposed → **Accepted**) | ✎ | | | | |

Nenhum arquivo de `my-app/` (FE = `FE-INCR-FIXED-ASSETS`, nó vizinho, fora da régua até BRIEF próprio — F-PS-4 → a: espera o
merge do BE).

---

## 5. Achados fora de escopo (não planejar — autorização própria)

1. **`FE-INCR-FIXED-ASSETS`** (tela: tabela de taxas com `sourceUrl`, ativos, rodar mês) — BRIEF só após PR-2/PR-3 mergearem
   (contrato = fato consumado; F-PS-4 a).
2. **Relatório de imobilizado** (`EXPORT_FIXED_ASSETS`) como extra do pacote C6b — aditivo em `DELIVERABLE_EXPORT_KINDS`;
   depende de PR-3 (acumulado por bem).
3. **Lista de jobs** (A2/F-FA15) — compartilhada com `FE-INCR-REVIEW`/`FE-INCR-DELIVERY`; a regra de "quem cria" está no fork.
4. **BP com retificadora** (item 35) — se o teste do Passo 16 falhar, é lacuna do INCR-4 (`sessao-instrumentacao` própria).
5. `J935` (auditor independente), amortização de intangível, CIAP, impairment, cron de posting — inalterados (BRIEF §7).

## 6. Pendente de validação externa / insumos ausentes

1. **Contas do plano** (`1.2.x` por classe, `1.2.9.x` acumulada, despesa `4.x`, ganho/perda) e **`COD_PB_RFB`** da Parte B —
   contador (#331 item h). O sistema só exige que existam; enquanto ausentes: `runMonth` → 400 nomeado (item 16); fechamento
   com diferença ≠ 0 → 400 nomeando o COD_PB_RFB (item 24).
2. **Anexo III em disco** (A1) e **Manual ECD L9 em disco** (Passo 18) — 2 comandos, antes de PR-1 e PR-4.
3. **Transcrição J801/J932** (Passo 18) — pré-condição documental do PR-4; sem ela o passo 20 não abre.
4. `dev.db` real com 0 ativos — tie-out e depreciação provados só em fixture (S6 vacuoso); o **ensaio humano** (rodar 12 meses
   sobre um bem real do salão) é runbook, não teste.

## 7. Estimativa de tamanho (para o "executa")

| PR | Arquivos | Testes novos/alterados | Migração | Paths (BASELINE) |
|---|---|---|---|---|
| PR-1 | ~14 | ~12 casos + script | **sim** (única) | 189 → 192 |
| PR-2 | ~16 | ~18 casos | não | 192 → 201 |
| PR-3 | ~12 | ~16 casos (falsificadores §8) | não | 201 → 203 |
| PR-4 | ~14 + 2 docs | ~14 casos | não | 203 → 205 |
| PR-5 | ~8 | ~8 casos | não | 205 |

Ordem obrigatória PR-1 → PR-2 → PR-3 → PR-4 → PR-5 (PR-4 ⇄ PR-5 permutáveis). Cada um pela `sessao-feature` em agente próprio,
serial (PR-N+1 só abre após merge de PR-N), review independente em worktree separado (`reviewer-independence-separate-agent`).
**Fatiamento + F-FA14/F-FA15 a ratificar junto com o "executa"** (precedente C6b: plano → ratificação → "executa" no mesmo dia).
