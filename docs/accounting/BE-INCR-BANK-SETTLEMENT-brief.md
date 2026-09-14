# BRIEF — `BE-INCR-BANK-SETTLEMENT` — retorno bancário → item de baixa pendente confirmado por humano (nó F7)

> **Sessão:** `sessao-planejamento`, 2026-09-14. **Saída:** este documento. Nenhum código, nenhuma branch.
> **Autorização citável:** `CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md` — **R9 → tabela irmã** e
> **R6 → financeiro antes de fiscal**; `CEDULA-DECISAO-2026-09-10-entrevista.md` §2 respostas **20**
> ("AP/AR NÃO têm baixa automática") e **22** ("o encargo chega pelo retorno") + §3 **F-BAIXA-1 → (a)
> RATIFICADO** com a correção do review (4 emendas do reuso); `GRAFO-DEPENDENCIAS-2026-09-11.md` §4
> frente #8 "F7 BRIEF com decisão de desenho explícita"; sinal do dono 14/09 "pode invocar sessões".
> **Status dos forks: RATIFICAÇÃO PENDENTE** — nenhum se auto-ratifica.

## 0. Fronteira e desenho já fechado (não rediscutir)

- **Prisma first-class** (Contrato §2.1): item com efeito financeiro e trilha de confirmação humana.
- **Tabela irmã** (R9): `BankSettlementItem`, policy própria. **Não toca** `reconcile_pending_items`,
  `ReconcilePendingService.rescan`, `retryOneReconcilePendingItem` nem `canManageReconcilePending`
  (#296/#308 são fato consumado).
- **Nunca liquida sozinho** (resposta 20): o item **propõe**; só `confirm` humano produz efeito.
- **Encargo pelo retorno** (resposta 22, F-BAIXA-1 a): o valor do encargo não nasce no razão — nasce da
  diferença que o banco informa.
- **Escopo = backend.** A tela (aba Conciliação/AP/AR) é `FE-INCR-BANK-SETTLEMENT`, nó vizinho.

## 0.1 Divergência verificada entre o grafo e o disco

| Afirmação do grafo (§3 F7) | Disco (2026-09-14) |
|---|---|
| "parser CNAB 240 **retorno** ✅ (#61)" | `server/src/lib/cnab.ts` parseia **extrato para conciliação** (registro `3`, Segmento **E**) e emite `date,amountCents,description,externalRef` → `BankStatementLine`. **Não há** parser de retorno de cobrança/pagamento (Segmentos T/U ou J, código de ocorrência, `vlJuros`/`vlMulta`/`vlDesconto`), e esse retorno pressupõe **remessa** (F5, `blocked` por D6) para existir "nosso número" |
| encargo "entra pelo retorno" | `PayableService.registerPayment`/`ReceivableService.registerReceipt` **rejeitam** valor acima do saldo em aberto (DTO :172 "nunca acima dele"); `ADR-INCR-PARTIAL-SETTLEMENT.md:370` "**não cobre juros/multa/desconto**". Logo o encargo é comportamento **novo**, não configuração |
| — | **Nenhuma conta de juros/multa/desconto** existe no chart do salão (13 contas) nem nos modelos (`grep -i juros|multa|financeir src` → 0 fora de KPI). Vira **pendência externa** (§5) |

Consequência: "retorno" neste incremento = **linha de extrato `UNMATCHED`** já importada (CSV/OFX/CNAB-E,
#61). É o Fork **F-F7-1**; o modelo nasce com discriminador de origem para o retorno de cobrança
plugar depois sem migração de chave.

## 1. Checklist de comportamentos (cada um testável)

Legenda: **[direto]** sem fork · **[cond:F-F7-n]** depende do fork n.

1. **[direto]** Model `BankSettlementItem` (Prisma first-class, migração **aditiva**, 1 `CREATE TABLE`,
   zero `ALTER`) com prólogo `DROP TABLE IF EXISTS` (classe `migracao-sqlite-nao-e-transacional`).
   Soft-delete (`deletedAt`), tenancy `userId`+`unitId` (AccountingScope). Testável: `npm run
   smoke:migration` S1–S5/S8 sobre cópia do `dev.db`.
2. **[cond:F-F7-1]** `POST /api/bank-settlements/scan` `{ statementId }` — varre as linhas
   `UNMATCHED` do extrato (extrato ativo, `glAccountId` do escopo) e cria **1 item por linha** com **1
   candidato** quando a regra de candidatura (item 3) devolve exatamente um título; 0 ou >1 candidatos →
   linha ignorada nesta varredura (registrada no sumário como `ambiguous`/`none`). Idempotente: linha que
   já tem item `PENDING`/`CONFIRMED` não gera outro (`@@unique` do §2); linha com item `REJECTED` só gera
   novo item se o candidato for **outro** título. Testável: 2ª chamada devolve `{created: 0}`.
3. **[cond:F-F7-5]** Regra de candidatura (determinística, sem fuzzy): sinal da linha decide o lado —
   `amountCents < 0` → `Payable` `OPEN|PARTIALLY_PAID`; `> 0` → `Receivable` `OPEN|PARTIALLY_RECEIVED`;
   janela `dueDate ∈ [line.date − 30d, line.date + 5d]`; valor: `|line| === saldoAberto` **ou**
   `saldoAberto < |line| ≤ saldoAberto + cap` (encargo, cap do F-F7-5). `proposedCents = min(|line|,
   saldoAberto)`, `chargeCents = max(0, |line| − saldoAberto)`. `|line| < saldoAberto` = baixa **parcial**
   (#307) com `chargeCents = 0`. Testável: fixture com 4 linhas (exata / parcial / com encargo / fora da
   janela) → 3 itens com os valores esperados e 1 `none`.
4. **[direto]** `GET /api/bank-settlements?statementId&status&page&limit` — lista paginada
   (`StandardPagination`), inclui `line` (data, valor, descrição) e o título (tipo, id, saldo aberto
   **recalculado na leitura**, não persistido). Policy `canReadBankSettlement`.
5. **[direto]** `POST /api/bank-settlements/:id/reject` `{ reason }` — `PENDING → REJECTED`; linha continua
   `UNMATCHED`; nenhum efeito contábil. Testável: linha segue elegível ao `manualMatch` existente.
6. **[cond:F-F7-3, F-F7-4]** `POST /api/bank-settlements/:id/confirm` `{ method }` — o **único** efeito
   financeiro. **Pré-cheque autoritativo (leitura em tx)** antes de qualquer efeito (classe
   `efeito-irreversivel-antes-do-gate-autoritativo`, F1 #307): item `PENDING`; linha `UNMATCHED` com 0
   `ReconciliationMatch` ativo; extrato ativo; saldo aberto do título re-lido `≥ proposedCents`;
   `resolveAccount(method).id === statement.glAccountId` (F-F7-3); se `chargeCents > 0` → conta de encargo
   configurada (item 8) e período da `line.date` aberto. Qualquer falha → **400 sem efeito**.
7. **[cond:F-F7-4]** Sequência de efeito do `confirm`, em **etapas idempotentes** com estado gravado no item:
   (i) `registerPayment`/`registerReceipt` (`amountCents = proposedCents`, `paidAt/receivedAt = line.date`
   date-only, `method`) — protocolo próprio do AP/AR (claim → book → finalize), **não** é reaberto; grava
   `settlementId`; (ii) se `chargeCents > 0`, `PostingService.book` de `bank.charge` (item 8), idempotente
   por `@@unique(sourceType, sourceId = item.id)`; grava `chargeEntryId`; (iii) `manualMatch(line,
   [postingBancoDaBaixa, postingBancoDoEncargo])` — Σ dos legs de banco `=== |line|` fecha **exato**
   (100 + 5 = 105) pelo gate já existente de `manualMatch`; (iv) `PENDING → CONFIRMED`, `confirmedById`,
   `confirmedAt`. Falha em (ii)/(iii) → `FAILED` com `failReason`, **ids das etapas feitas preservados**.
   Testável: teste que injeta falha em (iii) e assere `FAILED` + `settlementId` gravado + linha ainda
   `UNMATCHED`.
8. **[cond:F-F7-2]** Lançamento do encargo `bank.charge`: AP → `D despesa de encargo / C banco
   (statement.glAccountId)`; AR → `D banco / C receita de encargo`. Contas vêm de **configuração por escopo**
   (`AccountingSettings`/equivalente existente — insumo ausente §6 item 1), **nunca** hardcoded: sem conta
   configurada e `chargeCents > 0` → 400 no pré-cheque (item 6). Códigos das contas = **pendência externa
   §5**. Testável: teste com conta configurada assere o par de postings e o `sourceType='bank.charge'`.
9. **[direto]** `POST /api/bank-settlements/:id/retry` — só de `FAILED`: re-executa do primeiro passo sem id
   gravado (item 7). `CONFIRMED`/`REJECTED`/`PENDING` → 400. Testável: `FAILED` com `settlementId` e sem
   `chargeEntryId` → retry faz só (ii)–(iv) e não cria 2º pagamento.
10. **[direto]** Item **stale**: se a linha foi conciliada por outro caminho (`manualMatch`/`autoMatch`) ou o
    título foi cancelado/quitado depois do scan, `confirm` cai no pré-cheque (item 6) com 400 nomeando a
    causa; `scan` seguinte marca o item `PENDING` como `STALE` (sem efeito). Testável: `cancelPayable` após
    scan → `confirm` = 400 `title_not_open`.
11. **[direto]** Policy nova em `IAccountingPolicy`/`AccountingPolicy`: `canReadBankSettlement` = `canRead ∧
    canReadReconcile`; `canManageBankSettlement(scope, titleType)` = `canReconcile ∧ (canManagePayable |
    canManageReceivable)` por tipo. **Não** reusa `canManageReconcilePending` (4ª emenda rejeitada, R9).
12. **[direto]** Cadeia completa `Route → Controller → Service → Repository → Prisma` + Factory; DTO Zod
    `.strict()` (`BankSettlementDto.ts`: `ScanSchema`, `ConfirmSchema {method: z.enum(PAYMENT_METHODS)}`,
    `RejectSchema {reason: min(1)}`, `ListQuerySchema` com `queryBoolean` onde houver flag); rota registrada
    em `routes/index.ts` + `docs.paths.ts` (5 paths novos: scan, list, confirm, reject, retry) +
    `npm run docs:generate` com diff vazio + guard de path-count do openapi atualizado.
13. **[direto]** Auditoria: `bank_settlement.scanned` (payload: `statementId`, contagens),
    `bank_settlement.confirmed` (`itemId`, `titleType`, `titleId`, `proposedCents`, `chargeCents`,
    `settlementId`, `chargeEntryId`), `bank_settlement.rejected` (`itemId`, `reason`),
    `bank_settlement.failed` (`itemId`, `step`, `failReason`) — todos na allowlist de `auditCanonical.ts`
    **na mesma mudança**; sem PII (descrição da linha **não** entra no payload — classe
    `accounting-audit-allowlist-guards`).
14. **[direto]** Snapshot de shape dos DTOs (`__dto-shapes__.json`) ganha os 4 schemas; teste de snapshot
    verde por regeneração explícita, nunca por edição manual.
15. **[direto]** Testes de integração (`--runInBand`): scan (item 2/3), confirm exato, confirm parcial,
    confirm com encargo (conta configurada), confirm sem conta de encargo → 400, reject, retry de FAILED,
    stale (item 10), policy 403 por tipo, idempotência do scan, **concorrência**: 2 `confirm` do mesmo item
    → 1 efeito (gate `PENDING → CONFIRMING` por CAS no repo; CI Linux é o oráculo, classe
    `windows-serializa-sqlite`).

## 2. Contratos esboçados

### Prisma — `BankSettlementItem`

```prisma
// F7 / BE-INCR-BANK-SETTLEMENT — item de baixa PROPOSTO pelo retorno bancário, efetivado só por
// confirmação humana (resposta 20). Tabela IRMÃ de reconcile_pending_items (R9): outro produtor
// (extrato, não venda/CRM), outra resolução (confirm/reject humano, não rescan) e outra policy
// (efeito financeiro). Prisma first-class (§2.1). Tenancy = AccountingScope.
model BankSettlementItem {
  id               String    @id @default(cuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade) // operacional; a trilha é AuditEvent
  unitId           String
  origin           String    // 'STATEMENT_LINE' (F-F7-1 a) — 'CNAB_RETURN' reservado para quando F5 existir
  statementLineId  String
  statementLine    BankStatementLine @relation(fields: [statementLineId], references: [id], onDelete: Cascade)
  titleType        String    // 'PAYABLE' | 'RECEIVABLE'
  titleId          String    // payables.id | receivables.id (sem FK polimórfica; validado no serviço)
  proposedCents    BigInt    // min(|line|, saldoAberto no scan) — o saldo é RE-LIDO no confirm
  chargeCents      BigInt    // max(0, |line| − saldoAberto no scan); encargo (resposta 22)
  status           String    // PENDING | CONFIRMING | CONFIRMED | REJECTED | FAILED | STALE
  reason           String?   // reject reason | failReason
  failedStep       String?   // 'SETTLE' | 'CHARGE' | 'MATCH' (item 7)
  settlementId     String?   // payable_payments.id | receivable_receipts.id (etapa i)
  chargeEntryId    String?   // journal_entries.id do bank.charge (etapa ii)
  confirmedById    String?
  confirmedAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?

  @@unique([userId, unitId, statementLineId, titleType, titleId]) // 1 proposta por (linha, título)
  @@index([userId, unitId, status])
  @@index([userId, unitId, statementLineId])
  @@map("bank_settlement_items")
}
```

`BankStatementLine` ganha a relação inversa `settlementItems BankSettlementItem[]` (sem coluna nova —
zero `ALTER`).

### DTOs (`BankSettlementDto.ts`, todos `.strict()`)

```ts
export const ScanBankSettlementsSchema = z.object({ unitId, statementId: z.string().min(1) }).strict();
export const ConfirmBankSettlementSchema = z.object({ unitId, method: z.enum(PAYMENT_METHODS) }).strict();
export const RejectBankSettlementSchema = z.object({ unitId, reason: z.string().min(1).max(500) }).strict();
export const ListBankSettlementsQuerySchema = z.object({
  unitId, statementId: z.string().optional(),
  status: z.enum(['PENDING','CONFIRMING','CONFIRMED','REJECTED','FAILED','STALE']).optional(),
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
```

### Respostas

```ts
type ScanSummary = { created: number; skippedExisting: number; ambiguous: number; none: number };
type BankSettlementItemDto = {
  id; origin; status; titleType; titleId; proposedCents: number; chargeCents: number;
  line: { id; date: 'YYYY-MM-DD'; amountCents: number; description: string; externalRef?: string };
  title: { openCents: number; dueDate: 'YYYY-MM-DD'; counterpartyName: string; status: string }; // recalculado na leitura
  settlementId?; chargeEntryId?; reason?; failedStep?; confirmedAt?;
};
```

### Lançamento `bank.charge` (item 8)

```
sourceType = 'bank.charge', sourceId = item.id, date = line.date, memo = `Encargo bancário — ${titleType} ${titleId}`
AP: D <conta de encargo pago (config)>   chargeCents
    C <statement.glAccountId>            chargeCents
AR: D <statement.glAccountId>            chargeCents
    C <conta de encargo recebido (config)> chargeCents
```

## 3. Forks — RATIFICAÇÃO PENDENTE

### F-F7-1 — O que é "retorno" neste incremento
- **(a) Linha de extrato `UNMATCHED`** (CSV/OFX/CNAB Segmento E, #61) — existe hoje, sem parser novo.
  `origin='STATEMENT_LINE'`. Custo de errar: o encargo é **derivado** (|line| − saldo), não informado
  campo a campo pelo banco — juros e multa saem somados numa linha só.
- (b) Retorno de cobrança/pagamento CNAB 240 (Segmentos T/U ou J: ocorrência 06 liquidação,
  `vlJuros`/`vlMulta`/`vlDesconto` explícitos) — exige parser novo **e** remessa (F5, `blocked` D6) para
  haver "nosso número". Hoje = zero código possível.
- **Recomendação: (a)** com `origin` reservando (b). (b) volta como crescimento do nó quando F5 existir.

### F-F7-2 — Como o encargo entra no razão
- **(a) Lançamento próprio `bank.charge`** no `confirm`, contas por configuração de escopo (item 8);
  AP/AR intocados (baixa = `proposedCents` ≤ saldo, como #307 exige). Custo de errar: 2 lançamentos por
  baixa com encargo (baixa + encargo) — o `manualMatch` já fecha a soma exata.
- (b) Estender `RegisterPaymentInput` com `chargeCents` e a conta — toca o protocolo claim→book→finalize
  do #307 e reabre o ADR-PARTIAL-SETTLEMENT (§"não cobre juros/multa").
- (c) Sem encargo neste incremento: `|line| ≠ saldo` e `> saldo` → sem candidato. Contraria a resposta 22.
- **Recomendação: (a).** Contas = pendência externa (§5); até chegarem, `confirm` com `chargeCents > 0`
  responde 400 nomeado — nunca lança em conta inventada.

### F-F7-3 — Conta bancária da baixa × `method`
- **(a) `method` vem do humano e o pré-cheque exige `resolveAccount(method).id === statement.glAccountId`**
  (mapa fechado `PAYMENT_METHOD_ACCOUNTS`, D2 do AP). Zero mudança no AP/AR. Custo de errar: extrato
  ancorado em conta bancária fora do mapa (ex.: 2ª conta corrente) **não confirma por aqui** — limite
  pré-existente do mapa, nomeado, não criado por este incremento.
- (b) `RegisterPaymentInput.bankAccountId?` sobrescrevendo o mapa — toca #307 e o D2.
- **Recomendação: (a).** (b) é frente própria ("conta bancária como entidade", já `(inferida)` em F5).

### F-F7-4 — Atomicidade do `confirm`
- **(a) Etapas idempotentes com estado gravado no item** (item 7) + pré-cheque autoritativo em leitura
  transacional (item 6) + `retry` (item 9). `registerPayment` **não** aceita `tx` externa (verificado:
  claim CAS fora de tx → `createPayment` → `book` → tx de finalize; `PAYING` é resolvido pelo reconcile) —
  reabrir isso é redesenho do #307. Custo de errar: janela entre (i) e (iii) em que existe pagamento sem
  vínculo — visível (`FAILED`, ids gravados), recuperável por `retry`, nunca silenciosa.
- (b) Uma tx só: `registerPayment(…, { tx })` — exige reescrever o protocolo do AP/AR.
- **Recomendação: (a).** Mesma classe de solução que o próprio AP usa (`PAYING` + finalize).

### F-F7-5 — Cap do encargo na candidatura
- **(a) Cap relativo `chargeCents ≤ 20% × saldoAberto`** — constante nomeada (`BANK_SETTLEMENT_CHARGE_CAP_BP =
  2000`), por escopo depois se pedirem. Acima do cap = `none` (o humano concilia à mão). Custo de errar:
  encargo legítimo acima de 20% não é proposto — só não é automático.
- (b) Sem cap — qualquer `|line| > saldo` é candidato; risco: linha de outro título maior "adota" um título
  menor com encargo absurdo.
- (c) Cap absoluto em centavos — sem fonte para o número.
- **Recomendação: (a).**

## 4. Insumos ausentes (regra 2 — registrados, não varridos)

1. **Onde vive a configuração por escopo** para as contas de encargo (item 8): existe `AccountingSettings`
   ou equivalente com contas configuráveis? Não estava nos insumos listados; o BRIEF assume "configuração
   por escopo existente ou 2 colunas novas nela" — a `sessao-feature` confirma lendo e, se não existir,
   **pausa** (é decisão de modelo, não detalhe).
2. **Referência de documento no título** para casar com `line.externalRef` (nº do boleto/nosso número):
   `Payable`/`Receivable` têm campo assim? Não lido. Se tiverem, entra como **critério extra** de
   candidatura (desempate de `ambiguous`), sem fork.

## 5. Pendente de validação externa (contador)

| # | Pergunta | Por que é externa | Efeito enquanto aberta |
|---|---|---|---|
| 1 | **Códigos das contas** de encargo: juros/multa **pagos** (despesa financeira) e **recebidos** (receita financeira) no chart do salão/clínica — hoje **não existem** (13 contas) | classificação contábil; entra no chart do tenant e no referencial RFB | `confirm` com `chargeCents > 0` → 400 nomeado; baixa exata/parcial funciona |
| 2 | Encargo recebido de cliente (AR) é receita financeira ou redutor de despesa? | regra contábil | idem |
| 3 | Desconto concedido/obtido (linha **menor** que o saldo por desconto, não por parcial) — hoje tratado como **parcial** | regra contábil + política comercial | saldo residual fica aberto até baixa manual (`ADR-PARTIAL-SETTLEMENT` já nomeia) |

Linha nova no **pedido ao contador** (`luminaris-contador-liaison`): itens 1–2 acima.

## 6. Achados fora de escopo (não planejados — exigem autorização própria)

1. **N linhas ↔ 1 título / 1 linha ↔ N títulos** (lote de boletos numa TED só) — v1 é 1:1; a `@@unique`
   já permite N itens por linha, o `confirm` v1 rejeita 2º item da mesma linha.
2. **Conta bancária como entidade** (2ª conta corrente, `bankAccountId` no AP/AR) — já `(inferida)` em F5.
3. **Retorno de cobrança CNAB (Segmentos T/U)** — F-F7-1 (b), cresce o nó quando F5 existir.
4. **Corrida pré-existente `cancelPayable × registerPayment`** (residual do #307 no grafo §4.1) — o item 10
   depende dela estar fechada para o `stale` ser exato; classe a varrer, não deste nó.
5. O grafo §3 F7 cita "parser CNAB 240 retorno ✅" — **corrigir no próximo fold** para "parser de
   extrato CNAB-E ✅; retorno de cobrança inexistente".

## 7. Ordem sugerida para a `sessao-feature`

Fase 0 — model + migração + policy + DTO/snapshot (itens 1, 11, 12, 14) → Fase A — scan/list/reject
(2, 3, 4, 5) → Fase B — confirm/retry/stale (6, 7, 9, 10) → Fase C — encargo (8) **só com** insumo §4.1
resolvido e conta configurável; sem os códigos do contador, Fase C entrega o 400 nomeado. Auditoria (13)
acompanha cada fase. Testes (15) por fase, `--runInBand`.
