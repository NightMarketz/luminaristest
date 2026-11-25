# Núcleo portável — o que vai para outro projeto

BE-INCR-KIT-SETOR PR-5 (itens 41–45, F-KS-6 → a). Guardado por `server/src/features/accounting/__tests__/core-boundary.test.ts`.

## O núcleo (item 41)

Relativo a `server/src/`:

- `features/accounting/**`
- `features/accountingBinding/{archetypes,interpreter,models,dtos}/**`
- `features/legalParameters/**`
- `features/sectorKits/{dtos,models}/**`
- `lib/`: `sped`, `ecf`, `ecfReal`, `nfe`, `nfeSignature`, `nfse`, `nfseSignature`, `nfseEvento`, `nfseReadback`,
  `cnab`, `ofx`, `mit`, `cnpj`, `cpf`, `errors`, `logger`

Nenhum arquivo dele importa `features/{dynamicTables, interview, onboarding, sales, crm, packages, chat*, documents,
dashboardLayout, savedViews, structuredData, analytics, reports}`. Testes (`__tests__`) ficam fora da regra.

## O anel interno: núcleo do razão (Onda 1.2, 24/11/2026)

Dentro do núcleo acima há um anel mais fechado, o **núcleo do razão**: `PostingService`, `PeriodService`, `AuditService`, `ExerciseClosingService`, `ReconciliationService`
e os repositórios do razão (`JournalEntry`, `Posting`, `Account`, `AccountingPeriod`, `Audit`, `Reconciliation`, `SourceProvenance`). Ele **não importa fiscal nem localização** —
regra `C1-ledger-core-not-fiscal` do dependency-cruiser (`ADR-ARCH-BOUNDARIES` §1.2) e a asserção de direção do mesmo `core-boundary.test.ts`. `lib/ofx` e `lib/cnab` continuam
parte do núcleo portável (item 41), mas o núcleo do razão não os importa: entram pela porta `StatementParser`. O que o razão precisa de fora entra por portas de
`features/accounting/ports/LedgerPorts.ts`, com adaptador na borda do país (`features/accounting/paises/br/**`, F-PB-1 a) e montagem só em `lib/factory.ts`:

| Porta do razão | O que o país fornece | Adaptador BR (`paises/br/`) |
|---|---|---|
| `ChartStructureRule` | regra de estrutura do plano de contas (código, nível, conta superior) | `EcdChartStructureRule` — Manual da ECD, REGRA_VALIDA_NIVEL_CONTAS + I050.COD_CTA_SUP |
| `AccountDeletionGuard` | o que mais trava a exclusão de uma conta | `LalurAccountDeletionGuard` — ajuste vivo do e-Lalur/e-Lacs |
| `ClosingGuard` | pré-requisito do encerramento do exercício que vem de fora do razão | `TaxProvisionClosingGuard` — provisão de IRPJ/CSLL/PIS/Cofins pendente |
| `StatementParser` | parser de extrato de formato do país/banco, normalizado para a tabela comum do import | `StatementParserBr` — OFX e CNAB (CSV/XLSX são genéricos e ficam no núcleo) |

Todas são **argumento obrigatório** do construtor. Ao plugar o núcleo em outro projeto, implemente as quatro portas com as regras do país dele (ou adaptadores que aceitam tudo) e monte na factory.

**Resíduo declarado:** o plano de contas padrão (`fixtures/ChartOfAccountsFixture`) ainda é o do Brasil e ainda está no centro; sai para `paises/br/` em fatia própria.

## As portas que a origem implementa

| Porta | Onde está declarada | O que a origem fornece |
|---|---|---|
| `AccountingEvent` (emitido pela origem) | `features/accounting/sync/AccountingSyncPort.ts` | Os fatos de negócio (venda, compra, recebimento…) que o intérprete + binding transformam em lançamento |
| `StockRowPort` / `StockRowWriterPort` | `features/accounting/ports/OriginPorts.ts` | Leitura e escrita do estoque físico (`stockMovements`, `productUnits`). A escrita passa pelas regras da origem (aqui, o plugin que aplica o delta) |
| `ProductRefPort` | `features/accounting/ports/OriginPorts.ts` | Existência de produto no catálogo do dono (`findDataById` é global; o núcleo confere a tabela) |
| `UnitRowPort` | `features/accounting/ports/OriginPorts.ts` | Estado da linha de unidades (`units`) do dono — viva, apagada ou inexistente — para o `AccountingScopeResolver` validar o `unitId` dos controllers HTTP (nó I6) |
| `PackageExpiryPort` | — não é porta | `expiryCompetence`/`parseExpiryMovementKey` são puras e só de data: moram em `features/accounting/models/expiryKey.ts` (item 44). `packages` re-exporta |
| `ActivationChartPort` / `ActivationPeriodPort` | `features/accountingBinding/services/BindingActivationService.ts` | Plano de contas e período do escopo, para a ativação do binding |

Neste app as portas são montadas em `server/src/lib/factory.ts` sobre o `IDynamicTableRepository` (leitura) e o
`DynamicTableService` (escrita `isSystem`).

## Plugar um vertical rígido (passo a passo)

1. Copie os caminhos do núcleo acima.
2. Faça a origem emitir `AccountingEvent` para cada fato de negócio que deve virar lançamento.
3. Implemente `StockRowPort`/`StockRowWriterPort` e `ProductRefPort` sobre as tabelas do vertical (se ele não tem
   estoque físico, `findTableByInternalName` devolve `null` e o espelho físico fica desligado).
4. Implemente `ActivationChartPort`/`ActivationPeriodPort` fechadas sobre o escopo.
5. Monte tudo na factory do projeto e rode o `core-boundary.test.ts` com a lista de módulos de origem do projeto.
