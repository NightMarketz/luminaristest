# ADR-ARCH-BOUNDARIES — Fronteiras de camada mecanizadas (dependency-cruiser) + código morto e duplicação em modo relatório

- **Data:** 2026-10-13
- **Status:** **Accepted 2026-10-13 (dono, chat)** — fronteiras aprovadas no checkpoint da Fase 1; exceção à regra ⛔ do `CLAUDE.md` raiz ratificada no mesmo checkpoint (§4).
- **Classe:** DECISÃO ARQUITETURAL (gate estático de produtividade)
- **Depende de:** `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2 (cadeia de camadas), §2.1 (`AC-2.1-B1`), §3 (frontend); `PRE-ADR-FE-CONTRACT-TYPES.md` (FE não importa backend).
- **Complementa, não substitui:** o layer-gate do ESLint (`server/eslint.config.mjs` R1/R1b, `my-app/eslint.gate.config.mjs`) + `scripts/debt-ledger-check.mjs`. O ESLint continua dono da trilha de supressão (debt-ledger); o dependency-cruiser cobre o grafo inteiro (todas as camadas, ciclos, fronteira entre features).

## TLDR (2 linhas)

As regras de camada do contrato viraram 12 regras (server, com a C1 de 24/11) + 7 (my-app) no dependency-cruiser; `check:arch` **bloqueia** o CI, mas só para violação **nova** — as 35 (server) e 18 (my-app) existentes estão congeladas no baseline. `check:dead` (knip) e `check:dup` (jscpd) só reportam.

## 1. Fronteiras aprovadas — server (`server/.dependency-cruiser.cjs`)

```
Route → Controller → Service → Repository → Prisma (lib/prisma.ts)
                        ↘ Policy          models/ dtos/ = folhas
lib/factory.ts = composition root (única peça de lib/ que conhece features)
```

| ID | Regra | Baseline 13/10 |
|---|---|---|
| L1 | `routes/` não importa service/repository/`lib/prisma` | 0 |
| L2 | controller não importa repository nem `lib/prisma` | 3 (interface `IAccountingBindingRepository`) |
| L3 | service não importa controller/route/Express/`lib/prisma` | 3 (= as 3 supressões do ESLint: 1 SANCTIONED `DynamicTableService`, 2 DEBT) |
| L4 | repository não importa service/controller/route/policy | 4 |
| L5 | policy não importa repository/service/`lib/prisma` (nem interface). Emenda 2026-11-24 (§8): nem arquivo executável de `features/<x>/public/` (o `*.types.ts` passa; o que ele pode importar é a `M4`) | 5 (todas type-only) |
| L6 | `models/`, `dtos/` não importam camada executável. Emenda 2026-11-24 (§8): nem arquivo executável de `features/<x>/public/` (o `*.types.ts` passa) | 4 |
| B1 | motor `features/dynamicTables/**` não importa `accounting`, `accountingBinding`, `legalParameters`, `fx`, `sectorKits` (`AC-2.1-B1`) | **0** |
| B7 | motor `features/dynamicTables/**` não importa `features/(chat\|analytics\|integration)/services/` — "o motor nunca chama o consumidor" (Contrato §2.1). Emenda 2026-10-20, BE-INCR-DT-NO-CONSUMER-CALLS (dono, chat, 19/10: opção (b), F5 → β). Baseline antes/depois: 2 → **0** (as duas arestas `DynamicTableService → KnowledgeGraphService/KpiCacheService` removidas no mesmo PR; nunca entraram no arquivo de known violations). Prova de que morde: import plantado em `DynamicTableService.ts` → `B7` exit 1 | **0** |
| C1 | núcleo do razão (`PostingService`, `PeriodService`, `AuditService`, `ExerciseClosingService`, `ReconciliationService` e os repositórios do razão) só importa uma **lista fechada** (§1.2): fiscal e localização (`paises/**`, `TaxAssessment*`, `ILalurRepository`, `lib/ofx\|cnab\|sped\|ecf…`) entram por porta de `ports/LedgerPorts.ts`. Emenda 2026-11-24 (§1.2) | **0** (5 → 0 no PR) |
| F1 | libs fiscais puras (`lib/{sped,ecf,ecfReal,nfe*,nfse*,mit,cnab,ofx,cnpj,cpf,referentialCatalog}.ts`) só leem `features/*/models/` — nada de service/repository/Prisma/HTTP | 0 |
| X1 | `lib/` (exceto `factory.ts`) não importa lógica de feature (models permitidos) | 0 |
| X2 | produção não importa teste | 0 |
| X3 | sem ciclo de import (ciclo que passa por `lib/factory.ts` é isento) | 16 |
| D1 | núcleo do DP `features/dp/**` não importa submódulo opcional `features/dp<Nome>/**` (F-DP-10). Emenda 2026-11-03 (§1.1) | **0** (em 03/11) |
| I6 | `src/controllers/` não importa `features/accounting/scope/resolveAccountingScopeInternal.ts` — controller resolve o escopo pelo `AccountingScopeResolver` (F-I6-7; dono, 2026-10-15, [`D-2026-10-15-I6-FORKS`](../plano/decisoes/D-2026-10-15-I6-FORKS.md)) — **exceção nomeada:** `controllers/crmController.ts`, cujo único uso é o hook Won `maybeSyncOpportunityWon` (unitId da oportunidade já gravada → chamador interno, F-I6-1 d; L-I6-3, dono, questionário, 2026-10-16: *"Exceção nomeada"*) | 42 em 16/10 (os controllers ainda não migrados; encolhe nos PR-2…PR-5 do I6 até 0) |
| M1a | feature não importa `repositories/` de outra feature, nem a interface, nem por `import type`. Emenda 2026-11-24 (§8) | 36 (em 24/11) |
| M1 | feature só importa outra por `features/<x>/public/`. Controller, route, job e `lib/factory.ts` ficam fora do `from`. Emenda 2026-11-24 (§8) | 378 (em 24/11); 359 depois da emenda §8.1; 322 depois da §8.2 |
| M3 | `features/<x>/public/` não importa nem reexporta `repositories/` (F-MBE-3 a). Emenda 2026-11-24 (§8) | **0** |
| D2 | `domain/` é pura: não importa repository, service, controller, route, `lib/prisma` nem Express (F-MBE-4 a). Emenda 2026-11-24 (§8) | **0** |
| J1 | `src/jobs/` não importa repository nem `lib/prisma`; fora da regra: `jobs/repositories/` e as CLIs `migratePlano4NiveisCli`, `rekeyLegacyUnitCli`, `seedAccountingFixtureCli`. Emenda 2026-11-24 (§8) | 16 (em 24/11) |
| M4 | `features/<x>/public/<nome>.types.ts` só importa `models/` e `dtos/` da própria feature: carrega tipo, enum e constante, nada executável (dono, questionário, 24/11: "Tudo em user.types.ts"). Emenda 2026-11-24 (§8.1) | **0** |
| M2 | peça de feature mora em pasta de camada (`services`, `repositories`, `policies`, `models`, `dtos`, `controllers`, `domain`, `ports`, `adapters`, `public`); sem exceção para `index.ts`; `dynamicTables/rules/` isenta por nome. Vale por feature (F-MBE-2 c): hoje `dynamicTables`. Emenda 2026-11-24 (§8.2) | **0** |

**Imports `type`-only contam.** Interface de repository dentro de policy é exatamente o sinal de policy impura que L5 quer ver.

### 1.1 Emenda 2026-11-03 — D1 (F-DP-10)

- **Decisão:** F-DP-10 → (a), dono, questionário, 02/11/2026: *"Cria a trava"*
  ([`D-2026-11-02-DP-PRE-ADR`](../plano/decisoes/D-2026-11-02-DP-PRE-ADR.md)). Executada pelo item 6 do
  [`BE-INCR-DP-F0-F1`](../accounting/BE-INCR-DP-F0-F1-brief.md), no primeiro PR de código do nó PES-4.
- **Regra:** `D1-dp-core-not-optional`, severidade de erro: `from ^src/features/dp/` (fora testes) →
  `to ^src/features/dp[A-Z][A-Za-z0-9]*/`. O núcleo do DP nunca importa um submódulo opcional; o opcional entra por porta
  com adaptador nulo, e só o `lib/factory.ts` (composition root, X1) importa `features/dp<Nome>/`.
- **Cobertura:** a exceção de 13/10 (§4), como a `B7`: gate estático que lê o código; não é bancada, rodada nem revisor.
- **Baseline antes/depois:** 28 violações conhecidas antes e 28 depois (o `.dependency-cruiser-known-violations.json` não
  mudou); a `D1` nasce com 0 e não entra no arquivo.
- **Prova de que morde (condição que falha, 03/11):** plantados `src/features/dpSondaD1/x.ts` e
  `src/features/dp/__sondaD1.ts`, este importando aquele ⇒ `npm run check:arch` exit 1 com
  `error D1-dp-core-not-optional: src/features/dp/__sondaD1.ts → src/features/dpSondaD1/x.ts`. Sem o plantio: exit 0
  ("no dependency violations found", 28 conhecidas ignoradas). Plantio removido.
- **Ponto cego declarado:** a regra olha `features/dp/`. Controller e rota do núcleo (`src/controllers/dp*.ts`,
  `src/routes/dp.ts`) ficam fora e falam só com o `getFactory()`; se um deles passar a chamar serviço de opcional, nenhuma
  regra pega. A regra entre opcionais (opcional só importa outro opcional declarado em `dependsOn`) também não existe.

### 1.2 Emenda 2026-11-24 — C1, núcleo do razão fechado para fiscal/localização (Onda 1.2)

- **Decisão:** plano de correção de 24/11/2026 (dono, chat, via sessão-mãe; item 1.2 da auditoria fiscal/contábil read-only do mesmo dia) +
  F-PB-1 a ([`ADR-PAIS-NA-BORDA`](ADR-PAIS-NA-BORDA.md), 24/11): o centro é o conceito; o país mora na borda (`features/<domínio>/paises/br/**`).
  O `ADR-MODULE-BOUNDARIES` (Accepted em 24/11; "executa" do BRIEF inteiro dado pelo dono no mesmo dia, PR-0 a PR-1b já na main pelo #1375) trata de fronteira **entre** features; a C1 é o anel **dentro** de `features/accounting`, sem sobreposição de regra: nenhuma regra dele (M1/M1a…) está ligada no `.dependency-cruiser.cjs` e esta emenda não liga nenhuma.
- **Regra:** `C1-ledger-core-not-fiscal` (erro). `from` = `services/{PostingService,PeriodService,AuditService,ExerciseClosingService,ReconciliationService}`
  e `repositories/I?{JournalEntry,Posting,Account,AccountingPeriod,Audit,Reconciliation,SourceProvenance}Repository` de `features/accounting`.
  `to` = **tudo em `src/` fora da lista fechada** `LEDGER_CORE_ALLOWED`: `audit/`, `dtos/{Posting,Reconciliation}Dto`, `models/{AccountantAssignment.model,Reconciliation.model,closing,dates,ledgerStatus,money}`,
  `policies/IAccountingPolicy`, `ports/LedgerPorts`, os repositórios do razão (+ `AccountantAssignment`, `Counterparty`, `Dimension`), `scope/`,
  `services/{AuditService,PostingService,dimensionTagging}`, `fixtures/ChartOfAccountsFixture` (resíduo, abaixo) e `lib/{errors,logger,prisma,spreadsheet}`.
  Allowlist (e não denylist por prefixo) porque o levantamento das arestas de saída do conjunto deu uma lista curta e porque denylist por nome de arquivo
  não pega o fiscal que ainda vai ser escrito. **Import `type` conta.** Precisar de algo novo no núcleo = emenda datada aqui com a porta, não item na lista.
  Emenda de manutenção (24/11, ao atualizar o #1356 sobre a main com o PR-1a do MODULE-BOUNDARIES, #1375): `ActiveAccountant` (contador responsável por escopo, GOV-CONTADOR — núcleo, não fiscal) passou de `policies/IAccountingPolicy` para `models/AccountantAssignment.model`, e o `PeriodService` o importa de lá; a lista ganhou esse modelo (a regra é allowlist: caminho movido e não listado vira erro). O `core-boundary.test.ts` ganhou a trava "todo import relativo do núcleo do razão cai na lista fechada", que acusa essa deriva no jest.
- **Portas** (`features/accounting/ports/LedgerPorts.ts`; todas **argumento obrigatório** do construtor — porta opcional esquecida na factory compila e
  desliga a regra em silêncio): `ChartStructureRule` (BR: Manual da ECD, nível ≥ 4 + conta superior — `paises/br/EcdChartStructureRule`),
  `AccountDeletionGuard` (BR: ajuste vivo do e-Lalur — `LalurAccountDeletionGuard`), `ClosingGuard` (BR: provisão de IRPJ/CSLL/PIS/Cofins pendente —
  `TaxProvisionClosingGuard`), `StatementParser` (OFX/CNAB — `StatementParserBr`). Adaptadores montados só em `lib/factory.ts`.
  `provisaoPendente`/`valorProvisao`/`consumoPisCofins` (puras) foram para `models/taxAssessmentProvisao.ts`; `TaxAssessmentService` as reexporta.
  `StatementFormat` mora em `models/Reconciliation.model.ts`; `lib/ofx` o reexporta.
- **Baseline antes/depois:** **5 → 0** violações da C1 (medidas com a regra final sobre o código do `origin/main` em cópia fora do repo:
  `ReconciliationService → lib/ofx`, `→ lib/cnab`; `PostingService → ILalurRepository`; `ExerciseClosingService → TaxAssessmentService`, `→ ITaxAssessmentRepository`;
  as 4 conhecidas do levantamento + o repositório de apuração, que só o grafo mostrou). O `.dependency-cruiser-known-violations.json` **não mudou**
  (medido pelo autor na base antiga: 24 ativas ignoradas, 27 obsoletas, antes e depois; após o #1375 o baseline da main é 11 ativas / 11 obsoletas, e o PR não o altera); a C1 nasce com 0 e não entra no arquivo.
- **Prova de que morde (condição que falha, 24/11):** seis `import` plantados de uma vez, um por família de alvo — `PostingService → ITaxAssessmentRepository` (`import type`),
  `PeriodService → paises/br/EcdChartStructureRule` (`import type`), `AuditService → lib/ofx`, `ReconciliationService → lib/cnab`, `ExerciseClosingService → LalurService`
  (`import type`), `IPostingRepository → models/taxAssessmentProvisao` (`import type`) ⇒ `npm run check:arch` **exit 6**, `x 6 dependency violations`, cada uma como
  `error C1-ledger-core-not-fiscal: <from> → <to>`; o `core-boundary.test.ts` (detector independente, lista de famílias) acusou os mesmos 6. Plantios removidos:
  `check:arch` exit 0 ("no dependency violations found", 24 conhecidas ignoradas na base de então; hoje, na main pós-#1375, são 11 ativas / 11 obsoletas).
- **Teste de direção:** `features/accounting/__tests__/core-boundary.test.ts` manteve a asserção de módulos de **origem** (item 42 do KIT-SETOR) e ganhou a de
  **direção**: cada arquivo do núcleo do razão existe (renomear fica vermelho, não vácuo), o detector tem autoteste (inclusive `import type` plantado em memória), a regra
  C1 existe no `.cjs` com severidade erro e seu `from` casa todos os arquivos, e a lista de permitidos nunca contém fiscal/`paises/`.
- **Pontos cegos declarados:**
  1. **Resíduo no núcleo:** `fixtures/ChartOfAccountsFixture` (`CANONICAL_ACCOUNTS`, `RETAINED_EARNINGS_CODE`, `isCodigoDoPlanoPadrao`) continua importado pelo `PostingService` e pelo
     `ExerciseClosingService`: é o plano de contas padrão **do Brasil**, ainda dentro do centro. As regras da ECD saíram dele (para `paises/br/EcdChartStructureRule`); o plano em si vai
     para `paises/br/` em fatia própria (lacuna na caixa). Enquanto isso está na lista de permitidos, nomeado.
  2. A regra olha **só os arquivos listados**. Outros serviços do razão (`EntryApprovalService`, `AccountingReportService`, `AccountingSyncService`…) e o resto de `features/accounting` ficam fora;
     estender o `from` é emenda.
  3. A regra lê **import**, não texto: comentários e nomes de domínio brasileiros (NF-e na proveniência, "ECD/I350" no cabeçalho do encerramento) permanecem no núcleo, e a lógica que passou
     para a porta só é protegida contra regressão pelos testes (`ledgerPortsBr.test.ts`, `PostingService.test.ts`, as integrações), não pelo depcruise.

## 2. Fronteiras aprovadas — my-app (`my-app/.dependency-cruiser.cjs`)

| ID | Regra | Baseline 13/10 |
|---|---|---|
| U1 | `pages/`, `features/`, `components/` não importam `lib/api/api-client` (só `lib/services/*.service.ts`) | 0 |
| U2 | `lib/` não importa `features/`, `components/`, `pages/` | 1 (`ToastContext` → `components/ui/feedback/Toast`) |
| U3 | `components/` não importa `features/`, `pages/` | 13 (`ErpViewWidget`, `AnalyticsWidget`, `GoldKpiWidgetView`) |
| U4 | `features/` não importa `pages/` | 0 |
| U5 | nada importa de `server/` | 0 |
| U6 | produção não importa teste | 0 |
| U7 | sem ciclo de import | 4 |
| U8 | `components/` não importa `lib/services/` (componente é só o visual; a lógica mora em `features/<x>/`). Emenda 2026-11-24 (§8) | 11 (em 24/11) |
| U9 | feature só importa outra por `features/<x>/public/`. Emenda 2026-11-24 (§8) | 45 (em 24/11) |

**Ponto cego declarado:** `fetch()` cru é global, não import — o dependency-cruiser **não** o vê. Em 13/10 havia 24 chamadas em `features/`/`components/` (fora `features/dev/`). Mecanizar isso é regra ESLint (`no-restricted-globals`), fatia própria.

**Emenda 2026-10-20 (dono, chat: "cria a regra de ESLint contra fetch cru") — ponto cego fechado no lint.** Regra
**R2b** no `my-app/eslint.gate.config.mjs` (`no-restricted-globals` + `no-restricted-properties` de
`window`/`globalThis`/`self.fetch`, em `pages/`, `features/`, `components/`, fora testes); spec em
`docs/architecture/lint-layer-gate.md` §R2b. Baseline antes/depois: 24 sites sem regra (+3 em `features/dev/`, fora da
contagem de 13/10) → **27 marcados `DEBT: fetch`** e declarados no bloco `debt-ledger` (que passou a contar
`no-restricted-globals`/`-properties` como regra de camada). Só encolhe. Prova de que morde: sem os marcadores, o
lint gate dá exit 1 com exatamente esses 27. Fica fora: `lib/context/AuthContext.tsx` (2 `fetch` em `lib/`).

## 3. Mecânica do gate

- `npm run check:arch` (em `server/` e `my-app/`) — `depcruise … --ignore-known .dependency-cruiser-known-violations.json`. Exit ≠ 0 só com violação fora do baseline.
- `npm run check:arch:baseline` — regenera o baseline. **Só ao PAGAR dívida** (o arquivo encolhe). Regenerar para engolir violação nova é burlar o gate; o diff do baseline aparece no PR.
- `npm run check:dead` (knip, `--no-exit-code`) e `npm run check:dup` (jscpd, `--exitCode 0`) — CI com `continue-on-error`. Promover a bloqueante = decisão nova.
- Prova de que o gate morde (13/10, condição que falha): controller plantado importando `PayableRepository` → `L2` exit 1; componente plantado importando `api-client` → `U1` exit 1; arquivo em `dynamicTables/services/` importando `PostingService` → `B1` exit 1. Sem o plantio: exit 0 com "35/18 known violations ignored".

Números de referência em 13/10 (relatório, não meta): duplicação server 3,53% / my-app 4,29% (jscpd, sem testes e sem `*.gen.ts`); knip server 19 arquivos não usados em `src/`, my-app 24 (contratos `*.gen.ts` ignorados).

## 4. Exceção à regra ⛔ do CLAUDE.md raiz

A regra "não monte aparato de auditoria novo — nem gate" (bancada desligada em 2026-08-09) foi levantada no checkpoint. Decisão do dono (chat, 13/10): **exceção explícita** — gate estático que lê o código (como o `tsc` e o lint de camada) é ferramenta de produtividade, não bancada de auditoria (rodada/revisor). A exceção cobre **este** gate; não reabre a bancada nem autoriza revisor/rodada nova.

## 5. Mudar uma fronteira

Mexer em regra, severidade ou escopo (inclusive promover `check:dead`/`check:dup`) = ADR novo ou emenda datada aqui, com o número do baseline antes/depois.

## 6. Fase 3 — mutation testing (Stryker, fiscal/contábil) — emenda 2026-10-14

_Pendente: rodada em andamento; resultado entra aqui ao terminar._

## 7. Fase 4 — hook PostToolUse de fronteira (PROPOSTA, não ligada) — emenda 2026-10-14

**Status: proposta.** Nada foi gravado em `.claude/settings.json`; ligar é decisão do dono.

Feedback de fronteira no momento da edição, em vez de só no `check:arch` do CI. O script
`scripts/arch-hook.mjs` lê o JSON do hook no stdin (`tool_input.file_path`), decide o pacote pelo caminho,
roda o dependency-cruiser **só nesse arquivo** com a config e o baseline do pacote
(`--ignore-known`), e devolve as violações novas cujo `from` é o arquivo (ou ciclo que passa por ele) como
`hookSpecificOutput.additionalContext`. **Sai 0 sempre**, inclusive em erro interno, que vira texto.
Ignora: arquivo fora de `server/src/` ou de `my-app/{pages,features,components,lib,types}/`, testes
(`__tests__`, `*.test.*`, `*.spec.*`), `.d.ts` e não-código. Chama o binário com `process.execPath`, sem shell,
então roda igual no Git Bash/Windows e no Linux.

JSON proposto para `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "node \"$CLAUDE_PROJECT_DIR/scripts/arch-hook.mjs\"", "timeout": 30 }
        ]
      }
    ]
  }
}
```

**Ponto cego declarado:** cruza a partir do arquivo editado. Vê o que ele importa e o ciclo que passa por ele,
mas **não** vê quem passou a importá-lo. O gate continua sendo `npm run check:arch`.

**Prova em seco (14/10, `printf '{"tool_name":"Edit","tool_input":{"file_path":"<abs>"}}' | node scripts/arch-hook.mjs`):**

| Caso | Exit | Saída |
|---|---|---|
| my-app: `features/__archhook_probe/Probe.ts` plantado importando `lib/api/api-client` | 0 | `U1-no-direct-api-client: features/__archhook_probe/Probe.ts → lib/api/api-client.ts` |
| my-app: ciclo plantado `A.ts ↔ B.ts` | 0 | `U7-no-circular: …/A.ts → …/B.ts (ciclo: …/B.ts → …/A.ts)` |
| my-app: `components/ui/feedback/Toast.tsx` (limpo) | 0 | vazio (0 bytes) |
| my-app: `lib/context/ToastContext.tsx` (U2 **no baseline**) | 0 | vazio |
| server: `src/controllers/__archhookProbeController.ts` plantado importando `PayableRepository` | 0 | `L2-controller-not-repository: src/controllers/__archhookProbeController.ts → src/features/accounting/repositories/PayableRepository.ts` |
| server: `src/controllers/accountantAssignmentController.ts` (limpo) | 0 | vazio |
| server: `AccountingBindingPolicy.ts` (L5 **no baseline**) | 0 | vazio; o mesmo arquivo **sem** `--ignore-known` → depcruise exit 2 com L5 |
| arquivo de teste / `scripts/plano-vault.mjs` (fora de escopo) | 0 | vazio |
| stdin não-JSON | 0 | `[arch-hook] erro interno (edição não bloqueada): …` |

Concordância com o gate: com os plantios presentes, `npm run check:arch` deu exit 2 (my-app: U1 + U7) e exit 1
(server: L2), as mesmas violações que o hook apontou. Tempo por chamada: 1,0–1,5 s. Plantios removidos
(`git status` limpo).

## 8. Emenda 2026-11-24 — fronteira entre features (regras do `ADR-MODULE-BOUNDARIES.md`)

- **Decisão:** [`ADR-MODULE-BOUNDARIES.md`](ADR-MODULE-BOUNDARIES.md) §10 (dono, questionário, 24/11/2026: F-MB-8 (a),
  "tudo ligado já, com baseline") e os forks de execução F-MBE-3 (a) e F-MBE-4 (a)
  ([`D-2026-11-24-MODULE-BOUNDARIES-BRIEF-FORKS`](../plano/decisoes/D-2026-11-24-MODULE-BOUNDARIES-BRIEF-FORKS.md)).
  Executada pelo PR-2 do [`MODULE-BOUNDARIES-brief.md`](../architecture/MODULE-BOUNDARIES-brief.md).
- **Onde vale:** as regras entram na branch `integration/module-boundaries-be`. A `main` só as recebe no PR de
  fechamento da integração, que mede de novo e grava o baseline daquele dia.
- **Regras novas no server:** `M1a-no-foreign-repository`, `M1-cross-feature-via-public`, `M3-public-no-repository`,
  `D2-domain-is-pure`, `J1-job-is-entrypoint`. **No my-app:** `U8-components-no-domain-service`,
  `U9-cross-feature-via-public`. Todas com severidade de erro; o texto de cada uma está nas tabelas do §1 e do §2.
- **Regras alteradas:** `L5` e `L6` ganham no `to` a constante `PUBLIC_EXEC`
  (`^src/features/[^/]+/public/(?!.*\.types\.ts$)`): policy, model e dto não importam arquivo executável de `public/`;
  o `public/<nome>.types.ts` passa.
- **Não entra aqui:** a `M2` (peça de feature em pasta de camada) liga por feature, no PR que move as pastas de cada
  uma (F-MBE-2 c).
- **Cobertura:** a exceção de 13/10 (§4): gate estático que lê o código; não é bancada, rodada nem revisor.
- **Uso do `check:arch:baseline` (§3):** o comando rodou duas vezes neste PR. Primeiro só para trocar o formato do
  arquivo (o depcruise instalado grava `unresolvedTo` e `dependencyTypes` em toda entrada), com o mesmo conjunto de
  entradas; some o aviso `stale known violations`. Depois para gravar as entradas das regras novas, que é o que o §5
  pede de quem liga regra. Nenhuma entrada das regras antigas foi acrescentada.

**Baseline antes/depois (arquivo `.dependency-cruiser-known-violations.json`):**

| Pacote | Antes | Depois | O que entrou |
|---|---|---|---|
| server | 11 (`X3` 11) | 441 | `M1` 378 · `M1a` 36 · `J1` 16. `M3`, `D2`, `L5` e `L6` medem 0 e não entram |
| my-app | 23 (`U2` 1 · `U3` 18 · `U7` 4) | 79 | `U9` 45 · `U8` 11 |

O "antes" do server é o da ponta da pilha: 27 na `main` de 24/11 (`d3f3a201c`), 20 depois do PR-0 (`L5` 4 → 0 e 3
`X3` já pagas) e 11 depois do PR-1a e do PR-1b (`L4` 4 → 0, `L6` 4 → 0, `X3` −1). O diff do baseline neste PR só
acrescenta: 430 entradas no server e 56 no my-app, 0 removidas.

**Prova de que morde (condição que falha, 24/11):** um plantio por regra dá exit ≠ 0 citando a regra, e a contraprova
dá exit 0. A saída literal dos 19 casos está no `ADR-MODULE-BOUNDARIES.md` §11.3. Plantios removidos (`git status`
sem arquivo de sonda).

**Pontos cegos declarados:**

- A `M1` olha só `src/features/`. Controller, route, job e `lib/` importam qualquer pasta de feature; para eles valem
  `L2`, `I6`, `X1` e `J1`.
- `PUBLIC_EXEC` não distingue a feature de origem: uma policy que importa o `public/` executável da **própria** feature
  também reprova (medido no plantio). Dentro da feature o import vai direto ao arquivo de camada.
- `export *` e import por efeito colateral em `public/` não são vistos aqui: o dependency-cruiser enxerga a aresta,
  não a forma do `export`. Quem barra é o lint do server, regra R6 de `server/eslint.config.mjs`
  (`docs/architecture/lint-layer-gate.md` §R6; F-MBE-3 a; dono, questionário, 24/11: "No PR-2").
- O baseline do my-app foi gerado no Windows, com o `node_modules` resolvido pela junção do depósito. O resultado que
  vale é o do CI (Linux).

### 8.1 Emenda 2026-11-24 — `M4` e `users/public/user.types.ts`

- **Decisão:** dono, questionário, 24/11/2026: "Tudo em user.types.ts" (como a feature `users` expõe `IUser` e `Role`)
  e "Mover BindingScope já" (o que fazer com a única aresta que a regra nova media). Detalhe, os 7 plantios e os pontos
  declarados estão no [`ADR-MODULE-BOUNDARIES.md`](ADR-MODULE-BOUNDARIES.md) §11.5.
- **Regra nova:** `M4-public-types-only-models-dtos`, severidade de erro:
  `from ^src/features/([^/]+)/public/.*\.types\.ts$` (fora testes) → `to` com
  `pathNot ^src/features/$1/(models|dtos)/`. O `public/<nome>.types.ts` carrega tipo, enum e constante de `models/` e
  `dtos/` da própria feature e não importa mais nada.
- **Onde vale:** como o §8, na branch `integration/module-boundaries-be`.
- **Cobertura:** a exceção de 13/10 (§4): gate estático que lê o código; não é bancada, rodada nem revisor.
- **Baseline antes/depois:** server 441 → **422**, só remoção (`M1` 378 → 359: 17 arestas para
  `users/models/User.model` e 2 para `accountingBinding/scope/BindingScope`, arquivo que foi para `models/`). A `M4`
  nasce em 0 e não entra no arquivo. my-app sem mudança (79).
- **Prova de que morde (condição que falha, 24/11):** `fx/public/__sondaM4.types.ts` reexportando
  `../services/PtaxSyncService` ⇒ exit 1 com `error M4-public-types-only-models-dtos:
  src/features/fx/public/__sondaM4.types.ts → src/features/fx/services/PtaxSyncService.ts`; reexportando
  `../models/ptax` ⇒ exit 0 ("no dependency violations found", 422 conhecidas ignoradas). Sondas removidas.
- **Ponto cego declarado:** a regra olha a aresta, não o símbolo. Função definida em `models/` passa pelo `*.types.ts`;
  `models/` é folha pela `L6`.

### 8.2 Emenda 2026-11-24 — `M2` ligada para `dynamicTables` (primeiro PR de renome)

- **Decisão:** dono, chat, 24/11/2026: "Executa o BRIEF inteiro"; F-MBE-2 (c), a `M2` entra por feature. Questionário
  de 24/11 sobre as 45 entradas do baseline que o renome deslocava: "Extrair para models/", "Quebrar os ciclos" e
  "Porta em analytics/public". Detalhe, os 7 plantios e os pontos declarados estão no
  [`ADR-MODULE-BOUNDARIES.md`](ADR-MODULE-BOUNDARIES.md) §11.6.
- **Regra nova:** `M2-feature-code-in-layer-folder`, severidade de erro: `from ^src/` (fora testes) → `to`
  `^src/features/(dynamicTables)/.+\.ts$` com `pathNot` em
  `/(services|repositories|policies|models|dtos|controllers|domain|ports|adapters|public)/`,
  `^src/features/dynamicTables/rules/` e testes. A lista de features (`M2_FEATURES`) cresce a cada PR de renome e
  termina como `[^/]+`.
- **Onde vale:** como o §8, na branch `integration/module-boundaries-be`.
- **Cobertura:** a exceção de 13/10 (§4): gate estático que lê o código; não é bancada, rodada nem revisor.
- **Baseline antes/depois:** server 421 → **376**, só remoção (`M1` 359 → 322, `X3` 11 → 3; `M1a` 36 e `J1` 15 sem
  mudança). A `M2` nasce em 0 para `dynamicTables` e não entra no arquivo. my-app sem mudança (79).
- **Prova de que morde (condição que falha, 24/11):** `dynamicTables/__sondaM2.ts` importado por
  `dynamicTables/services/__sondaM2Importer.ts` ⇒ exit 1 com `error M2-feature-code-in-layer-folder:
  src/features/dynamicTables/services/__sondaM2Importer.ts → src/features/dynamicTables/__sondaM2.ts`; a mesma sonda em
  `dynamicTables/domain/` ⇒ exit 0 ("no dependency violations found", 376 conhecidas ignoradas). Sondas removidas.
- **Ponto cego declarado:** a regra casa pelo `to`. Arquivo fora de pasta de camada que ninguém importa não aparece
  (lacuna `L-20261124-222007-2aaa`).
