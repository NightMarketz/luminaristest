# Independent review — "Country at the edge" (PRE-ADR-PAIS-NA-BORDA) + platform law engine (BE-INCR-LEGAL-REGRAS)

Reviewer session, 2026-11-15, read-only. Worktree `claude/personal-dept-coverage-c7fea7`. Lacunas registered: 0 (read-only review; every finding concerns the documents under review and is in this report).

## Verdict (two lines)

**Truth:** the direction is sound and the code evidence is real (the ledger already knows e-Lalur/ECD, and the platform primitives live inside `features/accounting`); a cheap ledger-kernel guard plus moving the primitives out is worth doing now. The law engine, as briefed, is a 6-PR build that replaces ~900 lines of already-pure, already-parametrized payroll code with JSON that agents will write in SQL seed files.
**Main risk:** both documents commit to generalising from a single country and to running two regimes side by side indefinitely (core/edge folders, code/rule calculations). That is the "migration by incident" defect `ADR-DOMAIN-MOTOR-rejected.md` §2 names. It costs most where human validation (PVA, accountant) is the bottleneck, and nothing pays it back before 2027.

## Findings (most severe first)

1. **The law engine changes where a rule is written, not who writes it.** There is no front-end editor (BRIEF §8). Publishing is `PLATFORM_ADMIN` only (`LegalParameterPolicy.ts:12-14`; F-ML-7). The node's write_set includes `server/prisma/data/legal_parameters_lei_regra_v1.sql` (`LEGAL-REGRAS.md:12`). So in practice a "law as data" change is agents writing an `Expr` JSON tree into a SQL file in a reviewed PR. That is code with weaker tooling: no `tsc`, no IDE, and validation only at runtime. The code it replaces is already pure, parametrised and has a proof trail. `horaExtra` is 10 lines that read the bp and the rounding mode from `LegalParameter` and emit a `CalcNode` (`dp/models/folha/variaveis.ts:29-39`). The whole `folha/` + catalogue + rules is 1,268 lines. The BRIEF itself found 3 changes of *form* in history (F-ML-11), and all 3 had known effective dates. — verified by reading (facts); inferred (conclusion).
2. **ML-15 rests on a processor the BRIEF did not read, and the processor contradicts it.** The only consumer of `LegalParameterRecalcJob` is `features/accounting/services/TaxAssessmentRecalcService.ts`, called by `jobs/LegalParamsRecalcScheduler.ts:39`. It routes with a hard-coded `switch` over fiscal tables (`:39-55`) and calls `markDone` on every job (`:103-118`). For any other table `familiasDaLinha` returns `[]`, so a `LEI_REGRA` job would be silently consumed as done and the DP's `recalcular` would never run. Fixing this means a platform dispatcher with per-domain callbacks (ML-9 `recalcular?` + ML-15). That is a plugin registry driven by a queue, which BRIEF §0 says the engine "has none of". — verified by reading.
3. **The mechanical guard (R3/R4 in `check:arch`) cannot see the violation class that motivated it.** The ECD level rule in `PostingService.ts:960-985` is an inline rule built on a constant from `accounting/fixtures/ChartOfAccountsFixture` (`:5`); no edge module is imported. The e-Lalur check (`:1061-1065`) goes through an in-feature repo interface (`:23`). dependency-cruiser rules are path regexes (`server/.dependency-cruiser.cjs:20-128`), so they only catch "core imports a file classified as edge". R4 as a term denylist has a recall problem: see the schema sample below (`Partner.residenteBrasil`, the e-Lalur Part B FK in `AccountingScopeSettings`, eSocial codes stored as String values). — verified by reading.
4. **The schema measure overstates the clean core by about a third.** I sampled 25 domain models from the "no Brazilian term" group (my regex gave 24/34/88 against the PRE-ADR's 19/27/100; that my 88 sit inside their 100 is inferred). Result: **8 Brazil-specific**, 9 universal in shape but with Brazilian value domains, **8 clean**. See the table below. The sample leaves out ~25 platform models (chat, DynamicTable, AI), which are clean. — verified by reading the schema.
5. **The "Fiscal" domain on the map does not exist in the code.** Brazilian tax logic lives inside `features/accounting/models` (~90 files: `ibsCbs*`, `iss*`, `simples*`, `lalur*`, `pisCofins*`, `nfe*`, `reinf*`, `mei*`, `sped*`…). The real and valuable line is **ledger kernel vs Brazilian fiscal inside one feature**. The map does not draw it. — verified (directory listing).
6. **The proposal amends the SDD's P-i18n without saying so.** P-i18n's "preventive law" is "custo zero hoje" (zero cost today), and its trigger is "primeiro tenant não-BR real — nunca por completude de mapa" (first real non-BR tenant, never for map completeness) (`SDD-LUMINARIS.md` ~2178-2206). R4, the F-PB-2 satellite tables and the R6 migration by slices are not zero cost and are driven by map completeness. The owner may override this (14/11: "desacoplado desde já", decoupled from now on), but the ADR should say it amends P-i18n. — verified (text).
7. **Generalising from one instance produces a Brazilian-shaped "universal" core.** Examples: `ConsumptionTaxAssessment.regime` = PRESUMIDO|REAL, monthly `AccountingPeriod`, `JournalEntrySequence.fiscalYear` = calendar year, `'BRL'`/`America/Sao_Paulo` typed as literals in `AccountingScope.ts:24-26` and again in `PLATFORM_AUDIT_SCOPE` (`LegalParameterService.ts:24-31`). The R5 test ("would this exist elsewhere with another value or another name?") is too permissive: almost everything (FGTS ≈ TFR, 13º ≈ 13th-month pay, Simples ≈ small-business regime) has an analogue somewhere. It should ask whether the same *shape* exists, not whether an analogue does. — inferred.
8. **F-PB-1 (c) for existing code plus (a) for new code creates two conventions with no end date.** The ~90 Brazilian files stay where they are, new ones go to `paises/br/`, and agents copy the nearest neighbour. This is the ADR-DOMAIN-MOTOR §2 argument that the BRIEF accepts for F-ML-11 but the PRE-ADR does not apply to itself. — inferred.
9. **The engine misses the most frequent source of variation in payroll form.** Collective agreements (CCT) and company-specific pay items are tenant-scoped (`DpConvencaoParametro` is numeric only: `valorInt`, `chave`, `clausula`). `LEI_REGRA` is platform-scoped. F-ML-4 (b) would put rubrics designed by each tenant into platform law, which breaks the user-designed vs law-designed split in ADR-PERSISTENCE. — verified (schema/policy); inferred (frequency).
10. **ADR-PERSISTENCE §2.1 lists "regra legal codificada com tipo em compilação" (legal rule coded with compile-time types) as a property of the law-designed core.** Moving the form of a rule into runtime-validated JSON gives exactly that up. Today `RUBRICA_CALCULO … satisfies Record<RubricaCodigo,…>` makes an orphan rubric a compile error (`rubricaCalculo.ts:4-5`). — verified (text); inferred (tension).
11. **ML-23 has an undeclared prerequisite.** The core may not import another feature, but it needs `fracao` (`dp/models/folha/fracao.ts`), `dates` (`accounting/models/dates.ts`) and `CalcNode` (dp). PR-0 must first move the platform primitives (lacuna `…-b556`) or duplicate them. — verified (locations); inferred.
12. **The mandatory examples (F-ML-6) are not an independent oracle.** The same author writes the rule and its expected values. Only the ML-20 equivalence test is independent, and it only exists for migrations. New F3 rules (ML-22) get author-written examples only. — inferred.
13. **The claim about platform primitives holds.** `accounting/models/dates` is imported by dp (6), packages (6), legalParameters (2), lib (6 files) and others. `money` by dp (3), packages, lib. `AuditService` by dp (6), legalParameters, teammates (2). `AccountingScope` by dp (9), packages (11), legalParameters, sales, teammates and 7 controllers. The platform `legalParameters` imports 7 accounting model modules (`formatoLinha.ts:2-21`), defines DP formats (`:107-170, 294-327`) and imports `AuditService` and `AccountingScope` (`LegalParameterService.ts:3-4`). This is the cheapest separation with the highest value. — verified.
14. **The SDD's 13/07 claim "ledger core imports nothing from compliance" no longer holds** (`PostingService.ts:23`). An unenforced preventive rule eroded in four months. This is the strongest argument *for* the guard. — verified.

Other claims checked: `simplesCalc.ts:185` `INICIO_LC214 = '2027-01'` ✔; `DynamicTable.model.ts:29` `'cpf'|'cnpj'` ✔; `'BRL'` on 67 non-test lines ✔; 146 models ✔.

## Schema sample (25 models from the "no Brazilian term" group)

| Class | Models |
|---|---|
| Brazil-specific (8) | `ReferentialAccount` (RFB referential chart), `TaxAssessment` (IRPJ/CSLL, Presumido/Real modes, `codigoReceita`), `TaxWithholding` (`natRend`, `codigoReceita`, `dispensa` MINIMO_R10/OPTANTE_SIMPLES, `pfDetalhe` R-4010), `FiscalNumberVoid` (SEFAZ number voiding: `xJust`, `nProt`), `DfeSignerDeviceUnit` (DF-e signer), `Partner` (`residenteBrasil`, `taxId` CPF/CNPJ), `AccountingScopeSettings` (`depreciationParteBAccountId` → e-Lalur Part B), `AccountingDeliveryItem` (`position 0=ECD, 1=ECF`) |
| Universal shape, Brazilian value domains (9) | `ReferentialMapping`, `ConsumptionTaxAssessment`, `FiscalDocumentSequence` (`ambiente`), `CollectionCharge` (BOLETO/PIX), `DpVinculo` (eSocial category, S-2200 `matricula`), `DpAfastamento` (Table 18), `DpLotacao`, `DpJornada` (`tpJornada`), `TaxOptimizationSuggestion` |
| Clean (8) | `PaymentAccount`, `DpConvencaoColetiva`, `DpLancamento`, `FixedAssetClass`, `ServiceCostEvidence`, `BankSettlementChargePart`, `JournalEntrySequence`, `AccountingPeriod` |

## Rules R1–R6: testable? enforceable?

| Rule | Mechanical? | Where it gets ambiguous in a real PR |
|---|---|---|
| R1 core named/typed by concept | No (judgment) | `TaxAssessment` has a universal name but a Brazil-only shape; a reviewer can't tell from the name |
| R2 edge = country | No (classification) | Depends on R5; "texts" (Portuguese messages with CLT citations in `fonte:`) — edge or language? |
| R3 dependencies point inward | Partly (depcruise, path-based) | Only if edge files can be found by path; blind to inline rules (`PostingService:966`) and constants |
| R4 no country-instance columns | Partly (schema denylist) | Recall: `residenteBrasil`, Part B FK, code values in String columns; R4 says "nome", values slip through |
| R5 language ≠ country | No | Test too permissive (finding 7) |
| R6 always, baseline only shrinks | The baseline is; "existing migrates by slices" has no deadline or measure | When is a slice due? Nothing forces it, so the two conventions stay |

## Fork table

| Fork | Verdict | Reason / evidence |
|---|---|---|
| F-PB-1 where the edge lives | **Disagree with (c)+(a)** | Two conventions with no end date (finding 8). Prefer (c) alone, but **list the core, not the edge**: the ledger kernel is ~15 stable files, the edge is ~100s and growing |
| F-PB-2 country fields in the DB | **Disagree with (a) now** | 1:1 satellites on SQLite are technically fine (FK + unique), but the cost is data migrations on fiscal tables (SQLite migrations are not transactional; smoke gate S6 rejects backfills by design), plus DTO snapshot, OpenAPI and repository churn, with zero consumers until a 2nd country. Nearly every reader of the 48 Brazilian `FiscalProfile` fields is Brazilian code anyway. Do (c) + freeze: no new Brazilian column in a model declared core. Declare `FiscalProfile` an edge model instead of splitting it. Split at the P-i18n trigger, with two real instances to generalise from |
| F-PB-3 order | **Agree on guard + new code; disagree on slicing existing code now** | Refactoring fiscal code that feeds PVA/ECF before H1/X2 close adds risk where the oracle is the bottleneck |
| F-PB-4 Portuguese names in the core | **Agree** | R5; renaming buys nothing |
| F-PB-5 identifier + type | **Agree (new models)** | Precedent already exists: `Partner.taxId` + `tipoPessoa` |
| F-PB-6 DP F3+ born by the rule | **Agree, decoupled from the engine** | The Brazilian package can be TS code; F-PB-6 should not depend on F-ML ratification |
| F-ML-1 closed JSON AST | **Agree if built** | No eval, Zod-validatable; but see finding 1 on who authors it |
| F-ML-2 store in `LegalParameter` | **Agree if built** | Full reuse; but platform-only scope rules out CCT/tenant rules (finding 9) |
| F-ML-3 integer `ordem` | **Agree** | Simpler than a DAG; respects R-motor-dominio |
| F-ML-4 pay items as data | **Agree with (a); disagree with (b) as a planned phase** | (b) loses the compile-time exhaustiveness of `RUBRICA_CALCULO … satisfies` (`rubricaCalculo.ts:4-5`). Rubrics that vary are mostly tenant/CCT-designed, which needs a tenant-scoped model, not platform law |
| F-ML-5 F2 continues | **Agree** | Nothing in the engine should block the F2 `executa` |
| F-ML-6 mandatory examples | **Agree** | But they are not an independent oracle (finding 12) |
| F-ML-7 `PLATFORM_ADMIN` publishes | **Agree** | `LegalParameterPolicy.ts:12-14` |
| F-ML-8 new primitive = PR | **Agree** | Corollary: the engine's value is bounded by its primitive list |
| F-ML-9 core in `legalParameters/models/regra` | **Cannot tell / lean disagree** | `legalParameters` already imports accounting (`formatoLinha.ts:2-21`, `LegalParameterService.ts:3-4`); the core needs primitives from dp and accounting (finding 11). A `src/platform/` module holding the moved primitives would be cleaner |
| F-ML-10 retroactivity by snapshot | **Agree** | Same as LEGAL-PARAMS today (`parametrosIds`/`parametrosSha256` on `TaxAssessment`) |
| F-ML-11 fiscal adoption by trigger | **Disagree with (a)** | Within a single Simples calculation, `janelaRbt12` would become data and its siblings would stay code: two regimes inside one calculation that feeds PGDAS/DEFIS. LC 214 is already implemented and tested (`simplesCalc.ts:185-200`). If the engine is built, take (c) DP-only with a named re-evaluation trigger. Fiscal law changes use dated code variants (see alternative A1) |
| F-ML-12 ADR in PR-0 | **Agree, with a condition** | The ADR must be accepted before PR-0 merges and must address finding 2 (registry + queue) and finding 10 |
| F-ML-13 jurisdiction as data | **Agree on the `jurisdicao: 'BR'` field; cannot tell on the minor-unit exponent** | The field is cheap. The exponent-from-context test is speculative under T9 (BRL-only); the SDD defers minor units to the P-i18n ADR |

## Cost and timing (bottleneck = PVA/accountant; go-live 2027; F2 half-built)

- **Now (small, no oracle needed):**
  - (1) `check:arch` rule that allowlists the ~15 ledger-kernel files and forbids them from importing anything fiscal or Brazilian;
  - (2) two ports to remove the known couplings: an account-deletion guard registry (e-Lalur registers into it) and a chart validator port (the ECD level rule registers into it);
  - (3) move `dates`, `money`, the `AccountingScope` type and `AuditService` into a platform module (mechanical; clears lacunas b556/0d37 in part);
  - (4) freeze rule: no new Brazilian column or literal in a model or file declared core; new models use identifier + type.
- **Later (at the P-i18n trigger, or when the owner names a real user for it):** satellite tables, moving the existing Brazilian files, the minor-unit exponent, the `Expr` engine (when an accountant-facing editor is an actual product requirement, so the engine has a user other than agents).
- **Never (until evidence):** rubrics as platform law (F-ML-4 b), bulk migration of fiscal code (F-ML-11 b), a Turing-complete language.

## Alternatives

- **A1 — dated code variants instead of the `Expr` engine.** One primitive: `porVigencia([{ desde: '2027-01', impl: janelaLc214, fonte: 'LC 214 art. 517' }, { desde: null, impl: janelaLc123, fonte: 'LC 123 art. 18 §1º' }])(dataRef)`. The snapshot records the implementation id, alongside the `parametrosIds` it already records. A change in the law's form becomes one new typed TS function, one line and one test. Numbers stay in `LegalParameter`. It covers all three form changes found so far (LC 214, EC 141, Lei 15.371), keeps a single regime everywhere, and costs about one small PR. The `simplesCalc` `Janela.regra` union already works this way.
- **A2 — list the core, not the edge.** Declare the ledger kernel and the platform module as a short, stable path list, guard them with `check:arch`, and treat everything else as "may be Brazilian". This catches drift in the place that matters (finding 14) without moving hundreds of files.

## Contradictions with prior decisions

1. SDD P-i18n: "custo zero" (zero cost) and "nunca por completude de mapa" (never for map completeness) vs R4/F-PB-2/the R6 slices. An implicit amendment (finding 6).
2. `ADR-DOMAIN-MOTOR-rejected.md` §2: two regimes with no end date applies to F-ML-11 (a), which the BRIEF concedes, and to F-PB-1 (c)+(a), which the PRE-ADR does not. BRIEF §0 says the engine has no plugin registry and no queue, but ML-9 + ML-15 are both (finding 2).
3. `ADR-PERSISTENCE` §2.1: "regra legal … com tipo em compilação" (legal rule with compile-time types) vs the form of rules as runtime JSON (finding 10). F-ML-4 (b) would also blur the user-designed vs law-designed split.
4. F-DP-5 / F-PES-9 (owner, 02/11 and 12/10): "fórmula interpretada seria irmão do rejeitado R-motor-regras" (an interpreted formula would be a sibling of the rejected R-motor-regras). Reversed by the owner on 14/11. That is legitimate, but the new ADR must answer the owner's own earlier argument, not only R-motor-regras's posting concern.
5. No contradiction with `ADR-ARCH-BOUNDARIES`: a new rule is allowed under the static-gate exception, by dated amendment with before/after baselines (§5). No contradiction with R-motor-regras: the engine returns values and does not post.

## Open questions for the owner

1. In 2027, who writes a rule change: an accountant in a screen, or agents in a PR? If agents, what does the engine buy over A1?
2. Does "desacoplado desde já" include moving schema (satellite tables) before a second country exists? If yes, should P-i18n's "custo zero" clause be amended explicitly?
3. Is variation from collective agreements (CCT) and company pay items inside "modificar apenas as leis" (modify only the laws)? If yes, it needs a tenant-scoped design that this BRIEF does not have.
4. Do you accept two regimes (code vs rule, old folders vs `paises/br`) with no end date, or do you want one?
5. Should the first cut be "ledger kernel vs Brazilian fiscal" inside `features/accounting`?

## What I did not read

- The whole SDD (only P-i18n §IV.1 and the M4 line through R-motor-regras).
- The BE-INCR-DP-F2 BRIEF; the F-DP-5/F-PES-9 decision files; `SPEC-DP-2026-10-31-katz.md`; `docs/plano/destino/17-…`.
- `legalParameter.ts`, `rubricas/catalogo.ts`, `LegalParameterRecalcJobRepository`.
- The 47 fiscal consumers (only `simplesCalc.ts:175-200` and `TaxAssessmentRecalcService.ts:1-140`).
- The inventory folder (listed only); `my-app`.
- The PRE-ADR's classification script, which is not saved. I rebuilt it with my own regex (24/34/88).
- I did not run `check:arch` (not installable) or any test.
