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
| L5 | policy não importa repository/service/`lib/prisma` (nem interface) | 5 (todas type-only) |
| L6 | `models/`, `dtos/` não importam camada executável | 4 |
| B1 | motor `features/dynamicTables/**` não importa `accounting`, `accountingBinding`, `legalParameters`, `fx`, `sectorKits` (`AC-2.1-B1`) | **0** |
| B7 | motor `features/dynamicTables/**` não importa `features/(chat\|analytics\|integration)/services/` — "o motor nunca chama o consumidor" (Contrato §2.1). Emenda 2026-10-20, BE-INCR-DT-NO-CONSUMER-CALLS (dono, chat, 19/10: opção (b), F5 → β). Baseline antes/depois: 2 → **0** (as duas arestas `DynamicTableService → KnowledgeGraphService/KpiCacheService` removidas no mesmo PR; nunca entraram no arquivo de known violations). Prova de que morde: import plantado em `DynamicTableService.ts` → `B7` exit 1 | **0** |
| C1 | núcleo do razão (`PostingService`, `PeriodService`, `AuditService`, `ExerciseClosingService`, `ReconciliationService` e os repositórios do razão) só importa uma **lista fechada** (§1.2): fiscal e localização (`paises/**`, `TaxAssessment*`, `ILalurRepository`, `lib/ofx\|cnab\|sped\|ecf…`) entram por porta de `ports/LedgerPorts.ts`. Emenda 2026-11-24 (§1.2) | **0** (5 → 0 no PR) |
| P1 | o centro (`features/<d>/` fora de `paises/`) não importa `paises/<cc>/**`; exceção nomeada `LEGADO_BR` (legado brasileiro fora da pasta, ADR-PAIS-NA-BORDA §3.1, só encolhe). Emenda 2026-11-26 (§1.3) | **0** (em 26/11) |
| P2 | `paises/<cc>/**` não importa `paises/<outro>/**`. Emenda 2026-11-26 (§1.3) | **0** (em 26/11) |
| LP1 | a plataforma `features/legalParameters/**` (fora de teste) não importa outra feature; resíduo nomeado da F2 no `pathNot` (3 arquivos da contabilidade, só encolhe). Emenda 2026-11-26 (§1.4) | **0** (em 26/11) |
| F1 | libs fiscais puras (`lib/{sped,ecf,ecfReal,nfe*,nfse*,mit,cnab,ofx,cnpj,cpf,referentialCatalog}.ts`) só leem `features/*/models/` — nada de service/repository/Prisma/HTTP | 0 |
| X1 | `lib/` (exceto `factory.ts`) não importa lógica de feature (models permitidos) | 0 |
| X2 | produção não importa teste | 0 |
| X3 | sem ciclo de import (ciclo que passa por `lib/factory.ts` é isento) | 16 |
| D1 | núcleo do DP `features/dp/**` não importa submódulo opcional `features/dp<Nome>/**` (F-DP-10). Emenda 2026-11-03 (§1.1) | **0** (em 03/11) |
| I6 | `src/controllers/` não importa `features/accounting/scope/resolveAccountingScopeInternal.ts` — controller resolve o escopo pelo `AccountingScopeResolver` (F-I6-7; dono, 2026-10-15, [`D-2026-10-15-I6-FORKS`](../plano/decisoes/D-2026-10-15-I6-FORKS.md)) — **exceção nomeada:** `controllers/crmController.ts`, cujo único uso é o hook Won `maybeSyncOpportunityWon` (unitId da oportunidade já gravada → chamador interno, F-I6-1 d; L-I6-3, dono, questionário, 2026-10-16: *"Exceção nomeada"*) | 42 em 16/10 (os controllers ainda não migrados; encolhe nos PR-2…PR-5 do I6 até 0) |

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

### 1.3 Emenda 2026-11-26 — P1/P2, país na borda (fatia F0 do ADR-PAIS-NA-BORDA)

- **Decisão:** [`ADR-PAIS-NA-BORDA`](ADR-PAIS-NA-BORDA.md) **Accepted** em 24/11 (R1–R7 e F-PBA-1..7 ratificados, todos (a),
  [`D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS`](../plano/decisoes/D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS.md)). A guarda é o item 0 do PR-F3-0 do BRIEF
  `BE-INCR-PAIS-NA-BORDA-F3` (F-F3-4 a, dono, 26/11, [`D-2026-11-26-PAIS-NA-BORDA-F3-FORKS`](../plano/decisoes/D-2026-11-26-PAIS-NA-BORDA-F3-FORKS.md):
  *"(a) F3 carrega o item 0"*), que andou antes do PR-0 do montador único; o montador a recebe pronta. O texto e o diff partem do rascunho não commitado
  do worktree `claude/montador-pr0` (25/11), conferido aqui e com as provas refeitas em 26/11. A pasta `features/accounting/paises/br/` já existia desde
  o #1356 (C1, 24/11), sem esta guarda. O ADR do país dizia "§1.2 nova"; a §1.2 já tinha sido ocupada pela C1, por isso esta é a §1.3. Cobertura: exceção de 13/10 (§4), gate estático que lê o código; não reabre bancada, rodada nem revisor.
- **Regras** (erro): `P1-center-not-country` (`from` = `^src/features/[^/]+/(?!paises/)` fora de teste e de `LEGADO_BR`; `to` = `^src/features/[^/]+/paises/`) e
  `P2-country-not-other-country` (`from` = `paises/<cc>/`; `to` = `paises/` fora do mesmo `<cc>`). **Import `type` conta.** Nascem em **0** e nunca entram no
  `.dependency-cruiser-known-violations.json`.
- **Escopo `LEGADO_BR`** (F-PBA-5 a; lista do ADR-PAIS-NA-BORDA §3.1, conferida em 25/11 com `ls` de cada caminho e de novo em 26/11): em `features/accounting/`,
  `services/{SimplesApuracaoService,TaxSimulationService,TaxAssessmentService,PisCofinsAssessmentService,IbsCbsAssessmentService,TaxAssessmentPeriodosService,`
  `CompanyFiscalProfileService,FiscalDocumentEmissionService,FiscalDocumentLifecycleService,FiscalProfileService}.ts`, `models/issCompetencia.ts` e a pasta
  `dfe/`. `legalParameters/models/formatoLinha.ts` **não** entra (só entraria pelo ramo (b) do F-PBA-7, que foi (a)). Só encolhe: cada item sai na fatia
  F5/F6 que o move; entrada nova é emenda datada do ADR-PAIS-NA-BORDA com sinal do dono.
- **Ajustes que a pasta nova exige** (G1–G5 do ADR-PAIS-NA-BORDA §3):
  - **G1:** `FEATURE_LOGIC` = `'^src/features/[^/]+/(?!models/|paises/[^/]+/models/).+'` — `paises/<cc>/models/` é folha de dado puro como `models/`
    (sem isso `F1`/`X1` reprovam `lib/sped.ts` lendo modelo brasileiro movido).
  - **G2:** `dtoShapeSnapshot.test.ts` descobre também `features/<d>/paises/<cc>/dtos/`, gravados no mesmo `__dto-shapes__.json` do domínio com a chave
    POSIX `paises/<cc>/<arquivo>`; o `.gen.ts` vai para `my-app/types/contracts/<d>/paises/<cc>/`, e as varreduras de órfão ficaram recursivas.
  - **G3:** `atomicUntil.boundary.test.ts` varre também `features/<x>/paises/<cc>/services/`.
  - **G4 (lido, sem mudança):** `scripts/classe-risco.mjs:13` (`server/src/features/accounting/**`) já cobre `accounting/paises/**`; `features/dp/**`
    não está no `VERMELHO` hoje (nem o núcleo do DP), então `dp/paises/**` segue a classe do DP; mudar isso é decisão de classe, não desta guarda.
  - **G5 (lido, sem mudança):** `server/eslint.config.mjs` casa `src/**/*.ts` e `src/**/services/**/*.ts` (alcança `paises/*/services/`); o `testMatch` do
    jest é `**/__tests__/**/*.{spec,test}.ts` e `**/__tests__/**/*.integration.test.ts`; `scripts/paralelo.mjs` usa os globs do `write_set` por `globToRegex`,
    sem lista de pastas.
- **Baseline antes/depois (medido em 25/11 e em 26/11):** **11 → 11** (todas `X3-no-circular`; `--no-ignore-known` lista as mesmas 11). O G1 não mudou contagem.
- **Prova por plantio (refeita em 26/11 sobre a main `40b6ab8f4`, plantios removidos antes do commit):**
  1. `paises/br/__sondaP1.ts` + `services/__sondaP1.ts` importando-o, e 2. `paises/zz/__sondaP2.ts` + `paises/br/__sondaP2.ts` importando-o ⇒
     `check:arch` exit 2, `x 2 dependency violations`: `error P1-center-not-country: …services/__sondaP1.ts → …paises/br/__sondaP1.ts` e
     `error P2-country-not-other-country: …paises/br/__sondaP2.ts → …paises/zz/__sondaP2.ts`.
  3. `lib/sped.ts` importando `paises/br/models/__sondaG1.ts` ⇒ exit 0 com o G1; com o `FEATURE_LOGIC` antigo, `error X1-lib-not-feature-logic` e
     `error F1-fiscal-lib-is-pure` na mesma aresta.
  4. DTO de sonda `paises/br/dtos/SondaG2Dto.ts` ⇒ `dtoShapeSnapshot` vermelho ("ARQUIVO NOVO SEM SNAPSHOT") e, com `UPDATE_DTO_SNAPSHOT=1`, a chave
     `paises/br/SondaG2Dto.ts` no `__dto-shapes__.json` do accounting e `my-app/types/contracts/accounting/paises/br/SondaG2Dto.gen.ts`.
  5. Sem plantios: exit 0, "no dependency violations found", 11 conhecidas ignoradas.
  6. (extra, G3) `paises/br/services/__sondaG3.ts` com `.postEntry(` e sem cabeçalho ⇒ `atomicUntil.boundary` vermelho com o arquivo nomeado.
- **Pontos cegos declarados:** os do ADR-PAIS-NA-BORDA §1 ("o que a guarda enxerga, e o que não"): regra de país escrita no centro sem import, instância de
  país guardada como valor, coluna de país em model do centro e o legado BR fora de `paises/` (que é "centro" para a regra até a fatia dele). `src/jobs/`,
  `src/controllers/`, `src/routes/` e `src/lib/factory.ts` ficam fora do `from` da `P1` (camada de aplicação, F-PBA-3 a).

### 1.4 Emenda 2026-11-26 — a plataforma de parâmetros legais não conhece domínio (fatia F3 do ADR-PAIS-NA-BORDA)

- **Decisão:** F-F3-3 (a), dono, 26/11 ([`D-2026-11-26-PAIS-NA-BORDA-F3-FORKS`](../plano/decisoes/D-2026-11-26-PAIS-NA-BORDA-F3-FORKS.md)):
  *"(a) LP1 + L6 no check:arch"*. Cobertura: exceção de 13/10 (§4), gate estático.
- **L6 estendida (PR-F3-0, item 12):** o `from` passa a casar também `/paises/[^/]+/legalParameters/`. O registro de formato que cada domínio e país
  declara é folha como `models/`: regra pura, sem repositório, serviço, controller, rota nem Prisma. Sem isso a pasta nova (que não é subpasta de camada)
  poderia ler dado sem reprovar. Baseline 11 → 11. **Prova por plantio (26/11):** `accounting/paises/br/legalParameters/__sonda.ts` com
  `import type { IAccountRepository }` ⇒ `error L6-model-dto-are-leaves: …/__sonda.ts → …/repositories/IAccountRepository.ts`, `x 1 dependency violations`;
  sem o plantio, "no dependency violations found".
- **LP1 nova (PR-F3-1, item 14):** `LP1-legal-params-platform-not-domain`, de `^src/features/legalParameters/` (fora de teste) para
  `^src/features/(?!legalParameters/)`. É o `comoProvar` da lacuna `0d37`: desde o item 11 (o `formatoLinha.ts` saiu) e o item 13 (o enum de nomes saiu),
  a plataforma só lê o formato e o nome das tabelas pelo registro que o `lib/factory.ts` compõe. **Resíduo nomeado, só encolhe:** o `to.pathNot` libera
  `^src/features/accounting/(models/dates|services/AuditService|scope/AccountingScope)\.ts$`, as 3 arestas da fatia F2 (lacuna `b556`:
  `LegalParameterDto.ts → dates`, `LegalParameterService.ts → AuditService` e `→ AccountingScope`). A F2 esvazia o `pathNot`; entrada nova = emenda datada
  deste ADR. Nasce em 0 e nunca entra no known-violations; baseline 11 → 11.
- **Ponto cego declarado da LP1:** o `pathNot` é por arquivo de destino, não por aresta. Qualquer arquivo da plataforma pode importar esses 3 arquivos sem
  reprovar, não só os dois que os importam hoje. O dependency-cruiser não exprime exceção por par (origem, destino) numa regra só; a revisão de PR cobre
  a 4ª aresta até a F2 fechar o `pathNot`.
- **Prova por plantio da LP1 (26/11):** `legalParameters/models/__sonda.ts` com `import { CATEGORIAS_NUCLEO } from '../../dp/models/vinculo'` ⇒
  `error LP1-legal-params-platform-not-domain: src/features/legalParameters/models/__sonda.ts → src/features/dp/models/vinculo.ts`,
  `x 1 dependency violations`, exit 1. Sem o plantio: "no dependency violations found", exit 0. A mesma sonda importando `accounting/models/dates`
  sai com exit 0 (o ponto cego acima, medido).

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
