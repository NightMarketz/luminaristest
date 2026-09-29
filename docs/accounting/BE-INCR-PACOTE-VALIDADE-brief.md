# BE-INCR-PACOTE-VALIDADE — validade do pacote pré-pago e receita por não uso (PLANO, não executar)

## 0. Cabeçalho

- **Item:** nó [`PACOTE-VALIDADE`](../plano/nos/PACOTE-VALIDADE.md), aberto pela decisão 18 de
  [`D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE`](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md).
- **Autorização:** dono, 29/09/2026, questionário da entrevista: *"Validade por pacote"*. O campo `autorizacao`
  da nota diz: *"decisão de produto; BRIEF próprio (sem 'executa')"*. **Autoriza este BRIEF, não o código.** A
  `sessao-feature` exige, além disto, os forks do §5 ratificados e um "executa" citável (ORCH-006).
- **Decisão de produto, nas palavras da nota:** o pacote ganha prazo. Quando vence, o saldo do passivo 2.1.1
  (Pacotes Pré-pagos) vira receita por não uso. O tratamento contábil do vencido é **pendente de validação
  externa (contador)** e entra no follow-up (§6).
- **Escopo:** backend. A tela (mostrar a validade na venda e no saldo) é nó vizinho de FE e não é planejada
  aqui (§8).
- **Base:** `origin/main` `9dd690b3` + PR #440 (`b5398c87`, a nota do nó e a decisão). Código lido em 29/09.

## 1. Fatos (grau: **V** = lido no código nesta sessão · **I** = inferido da leitura, não executado)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| P1 | **O prazo já tem onde morar, nas duas pontas.** O catálogo de pacotes tem o campo `validityDays` (inteiro, opcional, `minValue: 0`). O saldo tem `expiresAt DateTime?`, com o comentário *"reserved for future expiry; NOT enforced in the G MVP"*. Nenhum código lê nenhum dos dois: a busca por `validityDays` só acha o preset e o teste do preset | `PackageCatalogModule.ts:27-35`; `schema.prisma:893`; `packageCatalog.test.ts:15` | V |
| P2 | O saldo é **um por cliente × pacote**. Duas compras do mesmo pacote somam na mesma linha (`upsert` com `increment`) | `schema.prisma:898`; `PackageBalanceRepository.ts:51-54` | V |
| P3 | O log de movimentos é append-only. Tem `kind` `'credit' \| 'debit'` (coluna `String`) e unique `(userId, unitId, saleId, kind)`, que é o portão de idempotência | `schema.prisma:916-920`; `PackageBalanceService.ts:44-70` | V |
| P4 | Venda de pacote: a ponte posta `sale.package.sold` (D 1.1.2 / C 2.1.1) e **depois** credita o saldo. São dois commits; o reconcile re-dirige os dois | `SalePackageSoldBridge.ts:79-101`; `accountingSyncReconcile.job.ts:1094` | V |
| P5 | Consumo: o pré-check `assertSufficient` roda antes de marcar a venda como Paid. A liquidação (D 2.1.1 / C 1.1.2) é postada **antes** do débito do saldo, e o débito é best-effort e pós-commit | `RegisterPaymentService.ts:103,121,136,141`; `SaleSettledMapper.ts:29-42,83-89` | V |
| P6 | O reconcile já tem os três passes de pacote: origem, consumo sem débito e o tie-out **só de aviso** Σ saldos × saldo de 2.1.1 | `accountingSyncReconcile.job.ts:1094,1215,1305` | V |
| P7 | Em produção, os mappers vêm dos **bindings Active gravados no banco**, não do código. Um evento sem mapper na unidade gera `ValidationError("Nenhum mapper registrado…")`, que não está na lista de skip | `AccountingBindingFeederService.ts:75-97`; `AccountingSyncService.ts:116-120`; `AccountingSyncPort.ts:91` | V |
| P8 | Os 2 fixtures de binding (salão e clínica) declaram **os mesmos 5 `eventKey`**. `activate-default` responde `already-active` sem recompilar. **Nenhum `eventKey` foi acrescentado a um binding já Active até hoje**: este incremento seria o primeiro | `saleBinding.ts:62`; `clinicBinding.ts:41-47`; `BindingActivationService.ts` cabeçalho (passo 3); `git log -S "eventKey: 'sale.cogs'"` (existe desde a prensa) | V |
| P9 | A DRE só enxerga uma conta de receita que tenha regra `codePrefix`. Uma conta 3.x nova sem regra **some da DRE em silêncio** (a lição do 3.3) | `StatementMappingFixture.ts:19-25` | V |
| P10 | A ECF do Presumido aceita receita só em 3.1/3.3. Qualquer outra conta de receita com movimento **reprova o gate de exaustividade**, e reprova alto | `SpedEcfGenerationService.ts:18-27` | V |
| P11 | Emissão de NFS-e de pacote: o perfil fiscal tem `pacoteFatoGerador: 'CONSUMO' \| 'VENDA'`, com default `CONSUMO` e **pendente de contador**. Em `VENDA`, a nota sai na venda do pacote (âncora `sale.package.sold`). Em `CONSUMO`, sai no serviço consumido | `FiscalDocumentEmissionService.ts:433-445`; `BE-INCR-DFE-brief.md:104` | V |
| P12 | Crédito e débito de saldo não emitem evento de auditoria. O `entry.posted` do lançamento já carrega `sourceType`/`sourceId` | `auditCanonical.ts:26`; `PackageBalanceService.ts` (sem `audit`) | V |
| P13 | Não existe canal de notificação de saída (e-mail, SMS, WhatsApp) no `server/` | `grep -rliE "nodemailer\|sendMail\|whatsapp\|twilio" server/src` → só um preset de campanhas | V |
| P14 | A LC 214 art. 10 § 5º (**redação vigente**, LC 227/2026) diz que, se não ocorre o fornecimento a que se refere o pagamento antecipado, aplicam-se "as regras aplicáveis ao cancelamento". **Se o vencimento é "não fornecimento", isso é interpretação**, não fato | `fontes-oficiais/TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md` §1 (errata 29/09) | V (o texto) / I (a aplicação) |
| P15 | Venda, dia e datas: `scopeDay`/`scopeToday` resolvem o dia-calendário no fuso do escopo. Um campo date-only guardado em `DateTime` segue a convenção meia-noite UTC, e a comparação usa `toUtcDayNumber`/`dayNumberFromDateOnly` | `models/dates.ts:44,65,81-96` | V |
| P16 | O I5 (ratificado em 29/09, F-I5-1 a) planeja `NoMapperForUnitError` (`NO_MAPPER_FOR_UNIT`) na lista de skip e no enum `ReconcilePendingReasonCode` | `ONBOARDING-WIZARD-plano-grafo-brief.md:406-407`; nota [`I5`](../plano/nos/I5.md) | V (o plano) |

**O que muda na premissa da nota:** "hoje não há vencimento" continua verdade no comportamento, mas os **dois
campos já existem** (P1). O incremento é de **aplicação**, com **zero migração de schema** (`expiresAt`
existe; `kind` é `String`). O que é novo: a regra, o job, o lançamento e o evento.

## 2. Fronteira com o vizinho E-1 (decisão 17: só registro)

O E-1 está no GAP-MAP Nível 5 `[ABERTO]`: cancelar ou devolver uma venda de pacote não estorna
`sale.package.sold`, nem o crédito de saldo (`SaleReversalBridge.ts:74-132`). **Este BRIEF não corrige nem
instrumenta o E-1.** A fronteira:

| Assunto | Dono |
|---|---|
| Estornar `sale.package.sold`, estornar o crédito de saldo, lançar a devolução de pacote | **E-1** (futuro: `sessao-instrumentacao` → `sessao-correcao`, quando o dono autorizar) |
| Vencer um saldo cujo crédito veio de venda **ainda Finalized** | **PACOTE-VALIDADE** |
| Saldo com algum crédito de venda **Cancelled/Returned** | **Nenhum dos dois age.** O job **não vence** esse saldo: pula com código próprio e deixa a pendência visível (F-PV-8). Assim, este incremento não transforma o passivo fantasma do E-1 em receita fantasma, e a correção do E-1 não precisa desfazer vencimentos |

O `SaleReversalBridge`, o `SalesCancellationService` e o `SaleReversalBridge.test.ts` **não são tocados**.

## 3. Checklist (cada item testável sozinho; a forma final segue os forks do §5)

**Regra do prazo (F-PV-1/2/3)**

1. **Cálculo do último dia válido.** Função pura em `features/packages/`: `lastValidDay(saleDate: 'YYYY-MM-DD',
   validityDays: number | null) → 'YYYY-MM-DD' | null`. `null` ou `0` retornam `null` (sem validade). `N ≥ 1`
   retorna `saleDate + N` dias corridos, somados no número de dia UTC (P15), nunca em `Date` local. Teste com
   virada de mês, de ano e 29/02.
2. **O crédito grava a validade.** `creditFromSale` recebe `saleDate` e `validityDays`. Na **mesma tx** do
   movimento `credit`, grava `expiresAt` (date-only, meia-noite UTC) pela regra de junção do F-PV-2(a):
   saldo anterior 0 (ou linha nova) → `expiresAt = lastValidDay`; saldo anterior > 0 → `max(atual, novo)`,
   com `null` = sem limite (vence o `null`). Re-drive do mesmo `saleId` é no-op (portão P3), então a validade
   não se move. Testes: 1ª compra; recompra com saldo > 0 estende; recompra com saldo 0 reinicia; saldo
   legado `null` com saldo > 0 continua `null` (F-PV-3 a).
3. **Uma fonte para o `validityDays`.** Um helper em `sync/bridges/saleItems.ts` lê a linha do catálogo
   (`packages`) pelo repositório de DynamicTable, **nunca** pelo `DynamicTableService` (§2.1). As 2 chamadas
   de crédito usam esse helper: `SalePackageSoldBridge.ts:94-101` e o passe `reconcileSalePackageOrigin`.
   Catálogo sem a linha, ou valor que não é inteiro ≥ 0 → `null` + `logger.warn`. Nunca inventar prazo.
4. **Pré-check de consumo recusa saldo vencido.** `assertSufficient` lança `PackageBalanceExpiredError`
   (`AppError`, 400, `errorCode: 'PACKAGE_BALANCE_EXPIRED'`) quando `scopeToday(scope) > expiresAt`. O teste
   HTTP (`RegisterPayment`) pede 400 e prova que nada foi escrito: sem Paid, sem liquidação, sem débito.
5. **O débito pós-commit NÃO confere a validade.** `debitForConsumption` segue igual: um consumo que passou no
   pré-check num dia válido é legítimo, mesmo que o re-drive do débito aconteça depois do vencimento. O
   teste prova isto: débito re-dirigido depois de `expiresAt`, com a venda Paid de antes, é aplicado.

**Vencimento no subrazão (F-PV-2/5/7/8)**

6. **`PackageBalanceService.expireDue(scope, balanceId, today)`**, numa só tx:
   - relê o saldo;
   - confere que está vencido pela regra de carência do item 8;
   - lê `amount = balanceCents > 0`;
   - cria o movimento `kind: 'expiry'`, `saleId: 'expiry:<balanceId>:<expiresOn>'` e `deltaCents: amount`;
   - decrementa com o `tryDecrement` condicional existente.

   Duplicata (P2002) → no-op. Saldo 0 ou `null` → no-op. Retorna `{ movementKey, amountCents, expiresOn } | null`.
   O movimento vem **antes** do lançamento, porque é ele que fixa o valor. O lançamento vem depois e é
   re-dirigível (item 11), o mesmo desenho de 2 commits de hoje (memória `postentry-tx-raiz-subrazao-2-commits`).
7. **`PackageMovementKind` passa a ser `'credit' | 'debit' | 'expiry'`**, e os comentários do schema
   (`schema.prisma:916`, e o sentido de `saleId` para `expiry`) são atualizados. **Sem migração.**
8. **Carência contra a corrida com o consumo.** O job só vence o saldo quando
   `dayNumber(scopeToday) ≥ dayNumber(expiresOn) + 2`. O pré-check recusa a partir de `expiresOn + 1`. Com
   isso, um consumo cujo pré-check passou em `expiresOn` já commitou o Paid (é a mesma requisição HTTP)
   antes de o job poder agir. Teste com relógio injetado nos dias `expiresOn`, `+1` e `+2`.
9. **Guardas antes do efeito irreversível**, em ordem, cada uma com **erro de código próprio** (memória
   `erro-especifico-para-skip-em-job`; nunca capturar `ValidationError` base):
   1. **consumo pendente**: existe venda Finalized+Paid com `paymentMethod = 'Package Balance'` e
      `paidWithPackageId` deste pacote e deste cliente, **sem** movimento `debit` → `PACKAGE_CONSUMPTION_PENDING`
      (transitório). Reusa a mesma listagem do passe de consumo (`accountingSyncReconcile.job.ts:1215`);
   2. **origem estornada** (F-PV-8 a): algum movimento `credit` do saldo aponta para venda
      `Cancelled`/`Returned` → `PACKAGE_ORIGIN_REVERSED` (poison até o E-1);
   3. **o evento não tem mapper na unidade** (F-PV-6 a) → `NO_MAPPER_FOR_UNIT` (o código ratificado do I5;
      ver §4.4). A checagem é uma leitura nova de uma linha, `AccountingSyncService.hasMapper(unitId,
      sourceType)`, com a mesma resolução do `sync()`: chave composta, depois global;
   4. **período da data do lançamento** (F-PV-5) não está OPEN → `ACCOUNTING_PERIOD_NOT_OPEN` (já existe).

   **Residual declarado:** TOCTOU entre a guarda e o commit (o período fecha no meio). Nesse caso o movimento
   fica sem lançamento e o item 11 re-dirige quando o período reabre.

**Lançamento (F-PV-4/5/6)**

10. **Evento `sale.package.expired`**:
    - entra na união `AccountingEvent.sourceType`;
    - tem builder puro `buildSalePackageExpiredEvent`;
    - carrega o valor **já em centavos**, num campo próprio `releasedCents` que só o arquétipo novo lê. O
      precedente é o `costCents` do `sale.cogs` (`AccountingSyncPort.ts:59-65`): o valor sai do subrazão
      exato e nunca cruza float;
    - `sourceId = movementKey`; `occurredAt` pelo F-PV-5.
11. **Re-drive do lançamento.** Passe novo `reconcileSalePackageExpiryPosting`: para cada movimento `expiry`
    sem `JournalEntry` `('sale.package.expired', movementKey)`, sincroniza. É idempotente pelo `@@unique` do
    `postEntry` e reporta pendência com `sourceType: 'sale.package.expired'`.
12. **Arquétipo** `performance_liability_release` no catálogo (`archetypes/catalog.ts`) e no enum
    `ArchetypeKeySchema` (`AccountingBindingDto.ts:28`): D `passivo-diferido` / C `receita-nao-uso`, slot
    `releasedCents` do tipo `moneyCentsExact` (o mesmo do arquétipo `cogs`, `CogsArchetype.ts:23-27`),
    `dimension` opcional. Na **mesma mudança**, nos 2 fixtures (`saleBinding.ts`, `clinicBinding.ts`):
    - o `eventBinding` (`2.1.1` / conta do F-PV-4);
    - a chave em `*_OPERATIONAL_SCHEMA_SNAPSHOT`;
    - a conta nova em `*_CHART_SNAPSHOT`.

    O `compiledFromHash` dos fixtures muda (`saleBinding.ts:77`). O golden da Fase 1 e os testes de
    cobertura de evento são atualizados (`BindingCompileService.eventCoverage.integration.test.ts`,
    `goldenPhase1.test.ts`).
13. **Conta de receita** (F-PV-4 a):
    - folha `3.4 Receita de Pacotes Não Utilizados` (`Revenue`, `acceptsEntries: true`) em
      `CANONICAL_ACCOUNTS`, com criação se faltar (precedente: `1.1.5`/`1.1.6`/`2.1.2`, zero migração);
    - regra DRE `dre.gross_rev_breakage` (`codePrefix: '3.4'`, `grossRevenue`, `credit_positive`), que
      **provisória até o contador** (§6 PE-1);
    - **não** entra em `PRESUNCAO_ACCOUNT_CODES`. Um teste **afirma** que a ECF Presumido com movimento em 3.4
      reprova o gate de exaustividade até o contador decidir (PE-2): falhar alto é o comportamento desejado,
      não um efeito colateral.

**Job, contrato e leitura (F-PV-7/10/11)**

14. **Passe `expirePackageBalances`** no reconcile existente (F-PV-7 a):
    - lista os saldos com `expiresAt` não nulo, `balanceCents > 0` e `deletedAt` nulo;
    - por saldo: guardas do item 9 → `expireDue` → `sync`;
    - isola falhas por item e reporta pendência com o `reasonCode` da guarda;
    - roda **fora** do merge do summary, como o `reconcilePhysicalInventory` (F-W2F-4), para nunca segurar
      a marca d'água;
    - o teto (`ponytail:`) é uma varredura sem índice em `customer_package_balances`. O upgrade é
      `@@index([expiresAt])` se a tabela crescer.
15. **Enum de pendências.** `ReconcilePendingReasonCode` ganha `PACKAGE_CONSUMPTION_PENDING` (transitório) e
    `PACKAGE_ORIGIN_REVERSED` (poison), além de `NO_MAPPER_FOR_UNIT` se o I5 ainda não o trouxe (§4.4). O
    comentário de `sourceType` do `ReconcilePendingItem` ganha `'sale.package.expired'` (`schema.prisma`, só
    comentário). `retryOneReconcilePendingItem` despacha o `sourceType` novo (rescan).
16. **Leitura.** `GET /api/package-balances` já devolve `expiresAt` (P1). Pelo F-PV-11 a, ganha o filtro
    opcional `expiresOnOrBefore` (date-only com `isValidDateOnly`, memória `date-only-regex-nao-valida-calendario`).
    Não é rota nova: o guard de path-count do openapi fica igual. `docs.paths.ts` e `npm run docs:generate`
    ganham o parâmetro.
17. **Tie-out de ponta a ponta.** Teste de integração com SQLite real:
    - vende R$ 100 com `validityDays=30`;
    - consome R$ 30;
    - avança o relógio para `expiresOn + 2`;
    - roda o passe.

    Esperado:
    - saldo = 0;
    - 2.1.1 = 0;
    - 3.4 = R$ 70;
    - movimento `expiry` = 7000;
    - `reconcilePackageBalanceVsLiability` sem divergência;
    - segunda rodada = no-op (idempotência).

    Outro teste: o mesmo cenário com o lançamento falhando (período fechado) deixa o movimento sem
    lançamento, e o passe do item 11 fecha a divergência quando o período reabre.

**Gates que o diff aciona** (pertencem ao checklist, não ao improviso)

18. Snapshot de shape dos DTOs (`dtoShapeSnapshot`): enums `ReconcilePendingReasonCode` e `ArchetypeKeySchema`,
    e a query de package-balances. Os tipos gerados do FE (FE-CONTRACT-TYPES) regeneram.
19. Allowlist do `auditCanonical.ts`: **nenhum eventType novo** pelo F-PV-10 a. Se o dono escolher (b), a
    chave entra na mesma mudança.
20. Paridade i18n: não se aplica. Não há string de FE; as mensagens de erro do server são pt, no padrão.
21. `cd server && npx tsc --noEmit`, `npm test` (unit) e `npm run test:integration` (memória
    `integration-suite-precisa-de-runinband`), todos verdes.
22. Camadas: não há rota nem controller novos. O item 16 estende o controller existente. Serviço, repositório e
    policy do `packages` são **estendidos**, não duplicados (Contrato §0). A policy de mutação é a mesma
    (`canMutate`) para `expireDue`, chamada com o escopo do job.

## 4. Contratos (esboço materializável)

### 4.1 Pacotes

```ts
// features/packages/repositories/IPackageBalanceRepository.ts
export type PackageMovementKind = 'credit' | 'debit' | 'expiry';

// features/packages/services/PackageBalanceService.ts
export interface PackageCreditCommand extends PackageMovementCommand {
  saleDate: string;             // 'YYYY-MM-DD' — sale.data.date (já é date-only no preset)
  validityDays: number | null;  // do catálogo; null/0 = sem validade
}
export interface ExpireDueResult {
  movementKey: string;          // 'expiry:<balanceId>:<expiresOn>' — gravado em PackageBalanceMovement.saleId
  amountCents: number;          // > 0, inteiro seguro
  expiresOn: string;            // 'YYYY-MM-DD' (último dia válido)
}
expireDue(scope: AccountingScope, balanceId: string, today: string): Promise<ExpireDueResult | null>;

// features/packages/models/validity.ts (puro)
export function lastValidDay(saleDate: string, validityDays: number | null): string | null;
export function isExpiredForConsumption(expiresOn: string | null, today: string): boolean; // today > expiresOn
export function isDueForExpiry(expiresOn: string | null, today: string): boolean;          // today ≥ expiresOn + 2

// features/packages/dtos/PackageBalanceDto.ts — HTTP (o único input externo novo)
export const ListPackageBalancesQuerySchema = z.object({
  unitId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  expiresOnOrBefore: z.string().refine(isValidDateOnly, 'data YYYY-MM-DD real').optional(), // F-PV-11 a
});
// Leitura, não .strict(): endurecer é achado fora de escopo (§8), para não quebrar quem chama hoje.
```

### 4.2 Erros (código próprio, pela memória `erro-especifico-para-skip-em-job`)

```ts
// lib/errors.ts
export class PackageBalanceExpiredError extends AppError {      // pré-check de consumo → 400
  constructor(customerId: string, packageId: string, expiresOn: string) {
    super(`Saldo de pacote vencido em ${expiresOn} (cliente ${customerId}, pacote ${packageId}).`, 400, 'PACKAGE_BALANCE_EXPIRED');
  }
}
export class PackageConsumptionPendingError extends AppError {  // guarda do job → pendência transitória
  constructor(balanceId: string, saleId: string) {
    super(`Vencimento adiado: consumo da venda ${saleId} ainda sem débito no saldo ${balanceId}.`, 409, 'PACKAGE_CONSUMPTION_PENDING');
  }
}
export class PackageOriginReversedError extends AppError {      // guarda do job → pendência poison (E-1)
  constructor(balanceId: string, saleId: string) {
    super(`Vencimento bloqueado: a venda de origem ${saleId} do saldo ${balanceId} foi cancelada/devolvida (E-1).`, 409, 'PACKAGE_ORIGIN_REVERSED');
  }
}
```

### 4.3 Sync e binding

```ts
// sync/AccountingSyncPort.ts
sourceType: 'sale.finalized' | 'sale.cogs' | 'sale.returned' | 'sale.settled' | 'sale.package.sold' | 'sale.package.expired';
/** Só 'sale.package.expired': valor liberado do passivo, JÁ em centavos (do movimento 'expiry'). */
releasedCents?: number;
export function buildSalePackageExpiredEvent(f: {
  movementKey: string; unitId: string; releasedCents: number; occurredAt: string; label: string;
}): AccountingEvent; // amount: 0 (não lido), currency 'BRL'

// sync/AccountingSyncService.ts — leitura, sem efeito
hasMapper(unitId: string, sourceType: AccountingEvent['sourceType']): boolean;

// accountingBinding/archetypes/PerformanceLiabilityReleaseArchetype.ts
export const performanceLiabilityReleaseArchetype: LancamentoArchetype = {
  kind: 'postEntry', name: 'passivo-performance-baixa', sourceType: 'sale.package.expired',
  slots: [
    { name: 'releasedCents', type: 'moneyCentsExact', guards: ['isSafeInteger', 'positive', 'maxCents'] }, // = CogsArchetype.ts:23-27
    { name: 'dimension', type: 'string', guards: ['dimensionOptionalPassthrough'] },
  ],
  lines: [
    { role: 'passivo-diferido', side: 'debit',  amountSlot: 'releasedCents' },
    { role: 'receita-nao-uso',  side: 'credit', amountSlot: 'releasedCents' },
  ],
  invariants: ['breakage-releases-deferred-liability', 'money-exact-cents-no-float', 'dimension-slot-optional'],
};

// fixtures/saleBinding.ts e clinicBinding.ts — eventBindings[]
{
  eventKey: 'sale.package.expired',
  archetypeKey: 'performance_liability_release',
  descriptionTemplate: 'Pacote vencido sem uso — {sourceId}',        // clínica: mesmo texto
  fieldSlots: [
    { slotName: 'releasedCents', sourceField: 'event.releasedCents', transform: 'identity' },
    { slotName: 'dimension',     sourceField: 'event.dimension',     transform: 'identity' },
  ],
  roleSlots: [
    { role: 'passivo-diferido', accountCode: '2.1.1' },
    { role: 'receita-nao-uso',  accountCode: '3.4' },                 // F-PV-4
  ],
}
// *_OPERATIONAL_SCHEMA_SNAPSHOT: 'sale.package.expired': ['releasedCents', 'dimension']
```

### 4.4 Plano de contas, demonstrativos e pendências

```ts
// fixtures/ChartOfAccountsFixture.ts
{ code: '3.4', name: 'Receita de Pacotes Não Utilizados', nature: 'Revenue', acceptsEntries: true },
export const RECEITA_NAO_USO_CODE = '3.4';

// services/StatementMappingFixture.ts (STATEMENT_MAPPING_VERSION → 'statement-mapping.v4')
{ id: 'dre.gross_rev_breakage', statement: 'DRE', match: { nature: 'Revenue', codePrefix: '3.4' },
  section: 'grossRevenue', sign: 'credit_positive', order: 106 },           // provisória — PE-1

// dtos/ReconcilePendingDto.ts
export const ReconcilePendingReasonCode = z.enum([
  'FAILED', 'ACCOUNTING_PERIOD_NOT_OPEN', 'MAX_CENTS_EXCEEDED', 'OPENING_ENTRY_MISSING', 'MISSING_PAID_WITH_PACKAGE_ID', // existentes
  'NO_MAPPER_FOR_UNIT',          // do I5 (F-I5-1 a) — quem executar primeiro acrescenta; o outro reusa o MESMO nome
  'PACKAGE_CONSUMPTION_PENDING', // transitório — resolve quando o débito do consumo aplicar
  'PACKAGE_ORIGIN_REVERSED',     // poison — resolve só com a correção do E-1
]);
```

**Lançamento resultante** (valor = saldo remanescente do cliente × pacote):

| Conta | D | C |
|---|---|---|
| 2.1.1 Pacotes Pré-pagos | `releasedCents` | |
| 3.4 Receita de Pacotes Não Utilizados | | `releasedCents` |

`sourceType: 'sale.package.expired'` · `sourceId: 'expiry:<balanceId>:<expiresOn>'` · data pelo F-PV-5.

## 5. Forks — RATIFICAÇÃO PENDENTE

| Ref | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-PV-1** | Onde mora o prazo | No **catálogo** (`validityDays`, que já existe, P1). O prazo **é copiado para o saldo no crédito** (`expiresAt`) | Digitado **na venda** (campo novo no preset de vendas, prazo por venda) | Lido do catálogo **na hora de vencer** | **(a)**: os 2 campos já existem e a decisão é "validade **por pacote**". A cópia no crédito congela a condição da compra: editar o catálogo depois não muda o que já foi vendido. (b) mexe no preset de vendas (`immutableAfter`) e no FE. (c) é retroativo e fica rejeitado. **Sub-pontos:** `null`/`0` = sem validade (o preset já aceita 0; mudar o `minValue` quebraria linha existente). Contagem: último dia válido = data da venda + N (venda 01/03, N=30 → usa até 31/03). A contagem tem de bater com a lei, ver PE-6 |
| **F-PV-2** | Granularidade da validade | **Por saldo** (cliente × pacote), com junção na recompra: saldo 0 → prazo novo; saldo > 0 → vale o **maior** prazo | **Por lote** (cada venda vence sozinha). Consumo FIFO pelo vencimento mais próximo, derivado do log de movimentos | — | **(a)**: usa a coluna reservada, e o consumo segue "saldo ≥ valor" sem FIFO no caminho de dinheiro (P5). **Teto aceito:** recomprar renova a validade do saldo inteiro. (b) é o exato se o dono quiser que cada compra vença sozinha, mas mexe no débito, no pré-check e no tie-out, e o saldo é um só por cliente × pacote (P2) |
| **F-PV-3** | Saldos vendidos **antes** do deploy | **Sem retroatividade.** Ficam sem validade (`expiresAt null`) e, pela junção do F-PV-2 a, continuam sem validade enquanto tiverem saldo | Backfill de `expiresAt` pela data da venda + `validityDays` atual do catálogo | — | **(a)**: o cliente comprou sem prazo informado (PE-6). Backfill = zero |
| **F-PV-4** | Conta da receita por não uso | **Folha nova `3.4`** + regra DRE (receita bruta, provisória) + fora do Presumido (a ECF reprova alto até o contador) | Creditar **`3.1` Receita de Serviços** direto (a mesma conta do consumo) | — | **(a)**: separa o que o contador pode querer tratar diferente (PE-1/2/3). A ACC-018 proíbe reparentar conta com histórico: juntar agora e separar depois viraria lançamento de reclassificação. Custo: a ECF Presumido de quem tiver pacote vencido fica bloqueada até o PE-2; o 1º cliente é Simples, sem ECF. (b) não exige código de DRE/ECF, mas é irreversível na prática |
| **F-PV-5** | Data de competência do lançamento | **`expiresOn + 1`**: o direito acaba às 00:00 do dia seguinte ao último dia válido | `expiresOn` (último dia válido) | Dia em que o job rodou | **(a)**: é o instante do fato, e fica perto da execução (carência de 1 dia, item 8). Por isso quase nunca cai em período fechado. Na virada do ano, pacote válido até 31/12 vira receita de 01/01 (coerente com o fato; contador confirma, PE-1). (c) mistura o fato com o atraso do job |
| **F-PV-6** | Evento de sync e chegada aos bindings já Active | Evento **`sale.package.expired` pelo binding** (arquétipo novo, os 2 fixtures). Os bindings Active existentes **recompilam pelo `POST /accounting-binding/compile` que já existe** (passo de runbook do dono, por unidade). Até isso acontecer, o job pula com `NO_MAPPER_FOR_UNIT` **antes** de mexer no saldo (item 9.3) | Postar **direto no `PostingService`** com contas fixas, como os subrazões AP/AR, fora do binding | Upgrade automático dos bindings Active no boot | **(a)**: os eventos `sale.*` passam pelo binding por desenho (P2 vertical: "o vocabulário `sale.*` já é genérico"). (b) quebra isso e o mapeamento por setor. (c) é mecanismo novo, e este é o 1º `eventKey` acrescentado a binding Active (P8). Se virar rotina, aí sim vale um fluxo de upgrade (§8) |
| **F-PV-7** | Onde roda o job | **Passe novo no reconcile existente** (`runAccountingSyncReconcile`, a cada 5 min), fora do merge do summary | Scheduler próprio, diário (clone do `DfePollScheduler`, registrado no `server.ts`) | — | **(a)**: já tem varredura por escopo, a tabela de pendências e o registro no boot (JOB-003). O re-drive do lançamento (item 11) mora lá de qualquer jeito. Rodar a cada 5 min um fato diário é desperdício desprezível: a consulta é filtrada e a tabela é pequena. (b) é a opção se o dono quiser o vencimento separado do reconcile |
| **F-PV-8** | Saldo com crédito de venda cancelada/devolvida (vizinho E-1) | **Não vence.** Pula com `PACKAGE_ORIGIN_REVERSED` (poison) e a pendência fica visível | Vence normalmente | — | **(a)**: sem a guarda, o vencimento transforma o passivo fantasma do E-1 em receita fantasma, e a correção do E-1 teria de desfazer vencimentos. Custo: uma leitura do status das vendas de origem por saldo vencido. §2 |
| **F-PV-9** | Efeito fiscal do vencimento | **Nenhum documento nem evento fiscal neste incremento.** O efeito vira pendência externa (PE-3/4/5) e insumo do PRE-ADR IBS/CBS da onda 3 | Emitir NFS-e do valor vencido quando o perfil for `CONSUMO` | Bloquear o vencimento de quem tem `pacoteFatoGerador = CONSUMO` até o contador | **(a)**: em `VENDA`, a NFS-e já saiu no valor cheio (P11). Em `CONSUMO`, se o ISS incide sobre serviço não prestado é pergunta municipal e do contador. O IBS/CBS não tem apuração no produto (M5 diferido), e se o § 5º se aplica é interpretação (P14). (b) emitiria documento com base em suposição. (c) deixaria o passivo aberto para sempre, que é o problema que a decisão 18 resolve |
| **F-PV-10** | Evento de auditoria | **Nenhum eventType novo.** O `entry.posted` do lançamento (`sourceType`/`sourceId`) mais o movimento append-only bastam, como no crédito e no débito de hoje (P12) | `package.balance_expired: ['balanceId','expiresOn','amountCents']` na allowlist, na mesma mudança | — | **(a)**: é simétrico com o crédito e o débito, que também não auditam. O `customerId` é id de linha, não PII, mas não há consumidor da trilha para esse evento |
| **F-PV-11** | Aviso ao cliente | **Passivo**: a validade aparece na leitura (`expiresAt`, já existe) + filtro `expiresOnOrBefore` para o operador listar o que vai vencer | Ativo: notificar o cliente antes de vencer (e-mail/WhatsApp) | Nada além do que existe | **(a)**: não existe canal de saída (P13), e criar um é frente nova (§8). O **dever de informar a validade na compra** é obrigação legal a confirmar (PE-6) e mora na tela de venda (nó de FE) |

## 6. Pendente de validação externa (follow-up; nada disto entra no checklist como decidido)

| # | Pergunta | A quem | Pesa em |
|---|---|---|---|
| **PE-1** | **Tratamento contábil do vencido** (obrigatório pela decisão 18). O dono decidiu "vencido vira receita" (reconhecer no vencimento). Três perguntas ao contador: (i) confirma esse reconhecimento, ou exige o **método proporcional** de receita por não uso do CPC 47 (o texto não está no corpus, §7)? (ii) Qual conta e seção da DRE: receita bruta, outras receitas operacionais ou outra? (iii) Qual data de competência (F-PV-5)? | contador | F-PV-4, F-PV-5, regra DRE do item 13 |
| **PE-2** | Presumido/Real: a receita por não uso entra na base presumida de **serviços** (32/32) ou como **demais receitas** (100% na base de IRPJ/CSLL)? Qual linha da ECF (P200/P400)? | contador | `PRESUNCAO_ACCOUNT_CODES`; destrava a ECF reprovada pelo item 13 |
| **PE-3** | **Simples Nacional (1º cliente):** a receita por não uso compõe a receita bruta do PGDAS-D? Em qual anexo? | contador | Insumo do PRE-ADR Simples/MEI da onda 3 (decisão 8) |
| **PE-4** | ISS/NFS-e em SP capital com `pacoteFatoGerador = CONSUMO`: o valor vencido (serviço não prestado) gera ISS ou NFS-e? Em `VENDA`, confirmar que nada muda | contador / município | F-PV-9 |
| **PE-5** | IBS/CBS (2027+): o vencimento sem uso é "não ocorra o fornecimento" do art. 10 § 5º (redação vigente → regras do cancelamento, com estorno da antecipação)? Ou o valor retido é contraprestação tributável? | contador (e o PRE-ADR IBS/CBS) | F-PV-9; fork V5 do dossiê §4 |
| **PE-6** | Direito do consumidor: é válida a cláusula de validade em serviço pré-pago? Há prazo mínimo? Como informar na compra? A contagem do prazo está certa (F-PV-1)? **Nenhuma fonte no corpus** | jurídico | F-PV-1, F-PV-3, F-PV-11 |

A skill `luminaris-contador-liaison` monta o pacote do pedido PE-1..PE-5. **O dono envia.**

## 7. Insumos ausentes

- **ADR-G01** (Incremento G). O código cita o ADR (`IPackageBalanceRepository.ts:2`), mas ele não está em
  `docs/`, então não se sabe o que o `expiresAt` reservado pretendia. Este BRIEF parte do comportamento do
  código, não do ADR.
- **Texto do CPC 47** (parágrafos sobre receita por não uso). Não está em `fontes-oficiais/`; o PE-1 depende
  dele ou do contador.
- **Fonte de direito do consumidor** sobre validade de crédito pré-pago (PE-6).
- **Dado real:** quantas linhas do catálogo têm `validityDays` preenchido e quantos saldos estão vivos no
  `dev.db`. Não foi medido (regra 2: sem varredura). Só pesa se o dono escolher o F-PV-3 b.

## 8. Achados fora de escopo (registrados, não planejados)

- **O consumo commita o Paid e a liquidação antes do débito autoritativo** (`RegisterPaymentService.ts:103→121→136→141`).
  É um efeito irreversível antes do gate (memória `efeito-irreversivel-antes-do-gate-autoritativo`) e já
  existia. Este BRIEF só convive com ele (itens 5, 8, 9.1).
- **`ListPackageBalancesQuerySchema` sem `.strict()`**: `?customerID=x` (erro de caixa) é ignorado e devolve
  todos os saldos (classe `param-aceito-e-ignorado-e-bug`).
- **Primeiro `eventKey` acrescentado a binding Active** (P8). Não existe fluxo de upgrade. Se houver outros
  eventos, vale um BRIEF de "upgrade de binding" (F-PV-6 c).
- **Canal de notificação ao cliente** (e-mail/WhatsApp) não existe (F-PV-11 b).
- **FE:** mostrar a validade no cadastro do pacote, na venda e no saldo; listar "vencendo". É nó FE-INCR
  vizinho e não foi aberto.
- **E-1** (§2): segue `[ABERTO]`, só registro (decisão 17).

## 9. Riscos desta entrega (incluindo vieses próprios)

- **Maior risco de produto:** o F-PV-2 a (recompra renova tudo) pode não ser o que o dono imagina por
  "validade por pacote". Por isso é fork, não item.
- **Maior risco contábil:** a conta 3.4 e a seção da DRE são **provisórias** até o PE-1. A escolha (a) do
  F-PV-4 foi feita para que a resposta do contador mude só o mapeamento, sem reclassificar histórico.
- **Viés declarado:** este BRIEF tende a reusar a máquina que existe (binding, reconcile, portão de
  idempotência do movimento), e isso puxa as recomendações F-PV-6/7 para (a). A alternativa (b) de cada uma
  está descrita com o custo, não descartada.
- **Checagem que teria falhado se a premissa estivesse errada:** "zero migração" depende de `expiresAt`
  existir e de `kind` ser `String`. Os dois estão lidos em `schema.prisma:893,916`. A premissa de que "o
  catálogo já tem o prazo" está em `PackageCatalogModule.ts:27-35`, e o teste `packageCatalog.test.ts:15`
  afirma o campo.

## Fontes

- Decisão: `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md` (linhas 17 e 18); dossiê
  `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §9 (E-1, E-2) e §4 (fork V5).
- Lei: `docs/accounting/fontes-oficiais/TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md` (§§ 4º–7º,
  redação vigente, errata de 29/09).
- GAP-MAP Nível 5, linha "Pacote — cancelar ou devolver venda de pacote contabiliza errado" (`[ABERTO]`).
- Código: citado por `arquivo:linha` no §1.
