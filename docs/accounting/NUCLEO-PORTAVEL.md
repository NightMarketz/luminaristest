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

## As portas que a origem implementa

| Porta | Onde está declarada | O que a origem fornece |
|---|---|---|
| `AccountingEvent` (emitido pela origem) | `features/accounting/sync/AccountingSyncPort.ts` | Os fatos de negócio (venda, compra, recebimento…) que o intérprete + binding transformam em lançamento |
| `StockRowPort` / `StockRowWriterPort` | `features/accounting/ports/OriginPorts.ts` | Leitura e escrita do estoque físico (`stockMovements`, `productUnits`). A escrita passa pelas regras da origem (aqui, o plugin que aplica o delta) |
| `ProductRefPort` | `features/accounting/ports/OriginPorts.ts` | Existência de produto no catálogo do dono (`findDataById` é global; o núcleo confere a tabela) |
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
