# BRIEF — BE-INCR-PARTIAL-SETTLEMENT (baixa parcial em Contas a Pagar / Contas a Receber)

> Produzido em `sessao-planejamento`, rodada 8 do plano SDD sequencial 2026-09-07. ADR normativo:
> `docs/adr/ADR-INCR-PARTIAL-SETTLEMENT.md` (Status: **Accepted — F-PS1..F-PS7 ratificados POR
> DELEGAÇÃO 2026-09-07**, cédula `docs/accounting/CEDULA-DECISAO-2026-09-07-forks-sdd.md`). Parecer
> de domínio complementar: `docs/adr/PARECER-ARCHITECT-ADR-INCR-PARTIAL-SETTLEMENT.md` — as duas
> emendas do parecer (gate de soma não-literal em Prisma puro; segundo tie-out não nomeado) já
> foram incorporadas ao corpo do ADR e são tratadas aqui como fato consumado, não como achado novo.
> **Este documento NÃO escreve código** (regra 1 do formulário de planejamento) — checklist +
> contratos esboçados + forks NOVOS (os que o ADR explicitamente empurrou para o BRIEF), prontos
> para `sessao-feature` executar item por item.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** Baixa parcial em Contas a Pagar/Receber (N recibos por título, saldo
  denormalizado + gate de soma atômico). `docs/accounting/ACCOUNTING-MASTER-MAP.md` nó **F3**
  (`docs/accounting/GRAFO-DEPENDENCIAS-2026-09-07.md`); rodada 8 de
  `docs/accounting/PLANO-SDD-SEQUENCIAL-2026-09-07.md` ("ADR → parecer → R → S").
- **Autorização:** `docs/accounting/CEDULA-DECISAO-2026-09-07-forks-sdd.md`, sinal literal do dono
  2026-09-07: *"Ratifico as recomendações de todos os forks, segue"*, cobrindo explicitamente a
  linha "Rodada 8 · `ADR-INCR-PARTIAL-SETTLEMENT.md` (#276 `b7a62a73`) · **F-PS1 c, F-PS2 a, F-PS3
  a, F-PS4 a, F-PS5 a, F-PS6 b, F-PS7 a** · ADR → Accepted por delegação, abre `sessao-planejamento`
  do BRIEF". Cobre exatamente a preparação deste BRIEF — **não cobre implementação** (a cédula abre
  `sessao-planejamento`, não `sessao-feature`) nem ratificação de fork **novo** que este documento
  venha a levantar (ORCH-006 permanece de pé para os forks §3 abaixo).
- **Insumos existentes (lidos nesta sessão, CBM-001 — confirmados arquivo:linha, não de memória):**
  - `docs/adr/ADR-INCR-PARTIAL-SETTLEMENT.md` — corpo inteiro, com as emendas pós-parecer já
    incorporadas inline (§3 gate de soma reformulado; §5/§7 os DOIS tie-outs; §4 F-PS2 os TRÊS sites
    do status novo).
  - `docs/adr/PARECER-ARCHITECT-ADR-INCR-PARTIAL-SETTLEMENT.md` — achados CRÍTICO/ALTO/MÉDIO, já
    refletidos no ADR; usado aqui só para confirmar que nenhum achado ficou órfão do corpo do ADR.
  - `docs/adr/ADR-INCR-AP-accounts-payable.md:183` / `docs/adr/ADR-INCR-AR-accounts-receivable.md:194`
    — F2 (pagamento/recebimento integral único) ratificado `→(b)` em ambos, com o texto "modelo
    preparado para parcial — F2"; este incremento é a reabertura prevista, não uma reversão de
    decisão.
  - `docs/adr/ADR-INCR-AP-AR-AGING.md` — precedente de status como `String` livre (zero migração de
    enum) e de "ratificado por delegação" como carimbo de Status válido (linha 3-6 do próprio doc).
  - `server/src/features/accounting/services/PayableService.ts` — `registerPayment` (guard de
    igualdade `:411-423`), `cancelPayable` (branch de mensagem `:505-510`), `claimForPayment`/
    `markPaidIfPaying` chamados em `:429,461`, `sumActivePayments` (`:840-844`).
  - `server/src/features/accounting/services/ReceivableService.ts` — espelho exato:
    `registerReceipt` guard `:203-213`, `cancelReceivable` branch `:300-303`.
  - `server/src/features/accounting/repositories/PayableRepository.ts:104-133` /
    `ReceivableRepository.ts:121-149` — `claimForPayment`/`markPaidIfPaying` e espelho AR, os DOIS
    únicos gates atômicos do domínio hoje, ambos filtro-por-igualdade-de-string.
  - `server/prisma/schema.prisma` — `model Payable` (867-910), `model PayablePayment` (921-937),
    `model Receivable` (948-980), `model ReceivableReceipt` (989-1006): confirmado que
    `PayablePayment`/`ReceivableReceipt` só têm `@@index([userId,unitId,payableId|receivableId])`,
    **sem** `@@unique` de cardinalidade — 1:N já estrutural, nenhuma migração de tabela nova.
  - `server/src/features/accounting/models/Payable.model.ts:14,23` / `Receivable.model.ts:14,23` —
    `PAYABLE_STATUSES`/`RECEIVABLE_STATUSES`/`*_OUTSTANDING_STATUSES` são arrays de `string` puro
    (não enum de banco) — confirma zero-migração para o status novo.
  - `server/src/features/accounting/models/money.ts` — `MAX_CENTS` (teto de política, BigInt já é a
    persistência) e `centsFromDb`/`centsFromDbNullable`.
  - `server/src/features/accounting/services/AgingReportService.ts:88,404-426` —
    `loadOutstanding`/comentário "Outstanding da linha = amountCents (pagamento full-only)".
  - `server/src/features/accounting/services/TieOutDiagnosticService.ts:125-192` — `tieOut()`,
    `arOpenCents`/`apOpenCents` nas linhas **169** e **182** (confirmado por leitura — o segundo
    consumidor que o ADR original não citava, achado §1.2 do parecer, já incorporado ao corpo).
  - `server/src/features/accounting/audit/auditCanonical.ts:50-57` — allowlist fechada com os 8
    eventos `payable.*`/`receivable.*` atuais.
  - `server/src/features/accounting/dtos/PayableDto.ts` (`cents` helper `:16-20`, `RegisterPaymentSchema`
    `:172-181`) / `ReceivableDto.ts` (espelho) — `.strict()`, `cents = int().positive().max(MAX_CENTS)`.
  - `server/src/routes/payables.ts` — rotas atuais: `POST /:id/pay`, `POST /:id/cancel`,
    `POST /:id/payments/:paymentId/cancel`; `server/src/routes/receivables.ts` espelho
    (`/:id/receive`, `/:id/receipts/:receiptId/cancel`); `server/src/routes/docs.paths.ts:3006-3028,
    3050,3217,3261` — blocos OpenAPI correspondentes. **[CORRIGIDO pós-review PR #291]** A árvore real
    do frontend é `my-app/{lib,features,pages,components}` — **`my-app/src` não existe**; o grep
    original mirou caminho errado e a conclusão "zero consumidor" estava FALSA. Consumidores reais,
    confirmados por leitura: `my-app/lib/services/accountsPayable.service.ts:185`
    (`registerPayment` → `POST /payables/:id/pay`), `:209` (`cancelPayment` →
    `POST /payables/:id/payments/:paymentId/cancel`); espelho `accountsReceivable.service.ts:172`
    (`registerReceipt` → `POST /receivables/:id/receive`), `:196` (`cancelReceipt`). Chamados
    diretamente por `my-app/features/accounting/components/AccountsPayablePanel.tsx:332,339,345` e
    `AccountsReceivablePanel.tsx:326,333,339` — telas JÁ em produção para pagamento/recebimento
    INTEGRAL (F-PS6 diferiu a UI de **parcial**, não a UI de integral, que já existe e não pode
    quebrar). Nenhum consumidor de frontend lê os *nomes de evento* de auditoria
    (`payment_registered`/`payment_cancelled`/`receipt_registered`/`receipt_cancelled`) — grep
    dedicado nesta árvore real retorna vazio para esses 4 literais.
  - `server/src/features/accounting/repositories/__tests__/PayableClaim.integration.test.ts` (131
    linhas) / `ReceivableClaim.integration.test.ts` (126 linhas) — golden ref real-SQLite (WAL) para
    o teste de concorrência que este incremento estende.
  - `server/src/__tests__/openapi-paths.test.ts:48` — `BASELINE = 147`, guard é `>=` (piso, não
    igualdade) — path novo nunca quebra o teste, só justifica subir o piso.
  - `server/prisma/migrations/20260903120000_nfe_multi_item_discriminator/` — precedente de coluna
    aditiva nullable/`DEFAULT` recente (mesma classe leve de migração que este incremento usa).
- **Nós vizinhos:**
  - **Consome:** `PostingService.postEntry`/`reverseEntry` (idempotência por `sourceId`, gate de
    período já reusado por `reverseEntry:515-525`), `IPayableRepository`/`IReceivableRepository`
    (`runTransaction`, `updateMany` condicional), `AuditService.append`, `AccountingScope`.
  - **É consumido por:** `AgingReportService.loadOutstanding` (F-PS4), `TieOutDiagnosticService.tieOut`
    (F-PS4, segundo site), `ADR-INCR7-bank-reconciliation` (F-PS7, zero mudança — cada recibo já
    posta como `JournalEntry` próprio, granularidade linha↔posting intacta).
  - **Não consome nem é consumido por:** `LEDGER_STATUSES` (não muda — são status de
    `Payable`/`Receivable`, não de `JournalEntry`), dimensões (achado fora de escopo, §6 abaixo),
    period-close (reusado sem mudança). **Frontend NÃO está fora do blast radius** — ver correção
    acima: `AccountsPayablePanel.tsx`/`AccountsReceivablePanel.tsx` consomem as rotas de pagamento/
    recebimento INTEGRAL hoje; só a UI de baixa PARCIAL está diferida (F-PS6).

## Definição de pronto

Igual ao formulário: checklist numerado + contratos esboçados + forks (só os NOVOS — F-PS1..F-PS7
já vieram ratificados do ADR) listados, não decididos.

---

## 1. Checklist de comportamentos

Tags: **[direto]** — implementável sem depender de fork novo (os 7 forks do ADR já resolvidos por
delegação); **[cond:Fork N]** — pausa até um fork **NOVO** (§3) ser ratificado; **[pendente-externa]**
— vai só para §4.

### Fase 0 — Schema (serial, bloqueia tudo abaixo)

1. **[direto]** Migração aditiva `ALTER TABLE payables ADD COLUMN paidCents BIGINT NOT NULL DEFAULT 0`
   + espelho `ALTER TABLE receivables ADD COLUMN receivedCents BIGINT NOT NULL DEFAULT 0` — coluna
   nova com `DEFAULT` constante é `ADD COLUMN` puro no SQLite (mesma classe leve de
   `20260903120000_nfe_multi_item_discriminator`), **não** o rebuild de tabela que uma `NOT NULL`
   sem `DEFAULT` ou mudança de tipo exigiria. Testável: `prisma migrate diff` confirma 1
   `ALTER TABLE ADD COLUMN` por tabela, nenhum `DROP`/`CREATE TABLE` gerado.
2. **[direto]** Backfill na MESMA migração, prólogo idempotente: `UPDATE payables SET paidCents =
   amountCents WHERE status = 'PAID' AND paidCents = 0` (espelho `receivables`/`RECEIVED`) — não é
   backfill de tabela nova, é `UPDATE` sobre `PayablePayment`/`ReceivableReceipt` que **já existem**
   como linhas (F-PS5-a). Testável: rodar a migração 2× não duplica nem quebra (a condição
   `paidCents = 0` já não bate na 2ª passada — classe `migracao-sqlite-nao-e-transacional`).
3. **[direto]** `PAYABLE_STATUSES`/`RECEIVABLE_STATUSES` ganham `'PARTIALLY_PAID'`/
   `'PARTIALLY_RECEIVED'` entre `OPEN`/`PAYING` e `PAID` (`Payable.model.ts:14`/`Receivable.model.ts:14`);
   `PAYABLE_OUTSTANDING_STATUSES`/`RECEIVABLE_OUTSTANDING_STATUSES` ganham o status novo (F-PS4).
   Testável: teste de shape do array + teste negativo (status desconhecido continua rejeitado onde
   já era validado por enum, ex. DTO de filtro).
4. **[direto] Smoke-migration-gate sobre `server/prisma/prisma/dev.db` real** — confirmar volume
   não-vazio em `payables`/`receivables` ANTES de aceitar como prova (o ADR não confirmou o volume
   neste worktree — grau assumido; memória `smoke-gate-s6-x-migracao-de-dado` nomeia exatamente o
   risco de PASS vacuoso se a tabela estiver vazia).

### Gate de soma atômico (a instrução exata, não a pseudo-SQL original do ADR)

5. **[direto]** `PayableRepository.claimForPayment`/`ReceivableRepository.claimForReceipt`
   substituídos (ou acompanhados — ver Fork F-PS8 sobre `PAYING`/`RECEIVING`) pela CAS aritmética:
   `payableRepo.updateMany({ where: { id, ...accountingScopeWhere(scope), status: { in: [...OUTSTANDING] },
   paidCents: { lte: amountCentsLido - novo } }, data: { paidCents: { increment: novo } } })`, com
   `amountCentsLido` **lido FORA da tx, antes desta chamada** (seguro — `amountCents` é imutável após
   a criação, confirmado: nenhum `updatePayable`/`updateReceivable` grava `amountCents` no `data`
   hoje). `count===1` vence; `count===0` colapsa "perdeu a corrida" e "estouraria o saldo" no mesmo
   `ValidationError`, como o CAS atual já faz. **Nunca** `paidCents + novo <= amountCents` como
   filtro (não expressável em Prisma puro sem `previewFeatures` de field-reference, ausentes do
   `schema.prisma` deste projeto — achado CRÍTICO do parecer §1.1). Testável: teste de unidade do
   repo confirma o `where` literal (sem coluna-a-coluna); teste de concorrência (item 16) prova a
   atomicidade real.
6. **[direto]** Guard defensivo pré-CAS em `registerPayment`/`registerReceipt`
   (`PayableService.ts:411`/`ReceivableService.ts:203`) passa de `status !== 'OPEN'` para
   `!['OPEN','PARTIALLY_PAID'].includes(status)` (espelho `PARTIALLY_RECEIVED`) — sem esta mudança
   um título parcialmente pago nunca chega ao `UPDATE` novo (achado MÉDIO do parecer §1.3, já
   incorporado ao ADR §4/F-PS2). Testável: teste de serviço registra 2 recibos em sequência no mesmo
   título (1º deixa `PARTIALLY_PAID`, 2º deve ser aceito, não rejeitado pelo guard antigo).
7. **[direto]** Branch de mensagem em `cancelPayable`/`cancelPayment`
   (`PayableService.ts:505-510`, espelho `ReceivableService.ts:301,303-305`) ganha um terceiro ramo para
   `PARTIALLY_PAID`/`PARTIALLY_RECEIVED` ("desfaça as baixas ativas antes de cancelar"), coerente com
   a defesa `findActivePayment`/equivalente já existente. Testável: teste negativo — cancelar um
   título `PARTIALLY_PAID` retorna a mensagem nova, não a genérica de "status atual".
8. **[direto]** `RegisterPaymentInput`/`RegisterReceiptInput` (ou seus sucessores, ver Fork F-PS9)
   trocam de "deve igualar o saldo" para `.refine`/`.superRefine`: `amountCents > 0 && amountCents <=
   remaining` — `remaining` calculado do lado do serviço (`amountCents - paidCents`), não no DTO puro
   (o DTO não tem acesso ao registro). Testável: teste de **comportamento** do serviço (não snapshot
   de shape — `dto-shape-snapshot-nao-cobre-logica-fina`): recibo de 60% aceito, recibo de 110% do
   saldo remanescente rejeitado com `ValidationError`.

### Estorno de recibo individual (F-PS3)

9. **[direto]** Estorno de UM recibo específico (qualquer posição, não só o último): `reverseEntry`
   do `JournalEntry` daquele `sourceId=<id do recibo>` (já suportado — D3), decrementa `paidCents`
   pelo valor revertido na MESMA tx do `reverseEntry`, recomputa status (`paidCents===0` → `OPEN`;
   `0<paidCents<amountCents` → `PARTIALLY_PAID`; nunca deveria re-bater `amountCents` por reversão —
   guarda defensiva, não apenas confiança). Testável: 3 recibos, estorna o do meio, saldo e status
   recalculam corretamente; ordem de reversão não afeta o resultado final (prova, não assume —
   parte do "custo de errar" nomeado no próprio ADR F-PS3).
10. **[direto]** Idempotência do estorno por `sourceId=<id do recibo>` (ACC-013) — nunca
    `<id do título>` — mantém D3 já ratificado; um recibo estornado e re-lançado é um `id` novo.
    Testável: reusa o padrão de teste já existente para o AP/AR full-payment, adaptado a N recibos.

### Aging + tie-out por saldo (F-PS4 — os DOIS consumidores)

11. **[direto]** `AgingReportService.loadOutstanding` (`:404-426`) troca `amountCents` cru por
    `amountCents - paidCents`/`amountCents - receivedCents`. Testável: fixture com um título
    `PARTIALLY_PAID` — o outstanding da linha reflete o saldo, não o total.
12. **[direto] (achado ALTO do parecer §1.2, já no corpo do ADR)** `TieOutDiagnosticService.tieOut()`
    — `arOpenCents` (`:169`) e `apOpenCents` (`:182`) trocam `centsFromDb(r.amountCents)` por
    `centsFromDb(r.amountCents) - centsFromDb(r.paidCents|r.receivedCents)`. **Tratar como gate
    distinto do item 11** — corrigir só o Aging e esquecer este é o modo de falha silenciosa que o
    parecer nomeia (o diagnóstico acusaria divergência a mais, exatamente pelo valor já pago, onde
    não há erro). Testável: mesma fixture do item 11, mas rodada contra `TieOutDiagnosticService` —
    `tiesOut === true` mesmo com títulos `PARTIALLY_PAID`/`PARTIALLY_RECEIVED` na mistura.
13. **[direto]** Teste de tie-out com fixture que MISTURA título `PARTIALLY_PAID`/`OPEN`/`PAID` no
    mesmo scope, rodado contra AMBOS os serviços (item 11 e 12) — uma fixture de status único
    deixaria a guarda recíproca quebrada passar (mesma classe `bp-dre-diagnostics-test-must-mix-natures`).
14. **[direto]** Teste de invariante dedicado: `paidCents === SUM(PayablePayment.amountCents WHERE
    status='ACTIVE')` (espelho AR) — primeiro campo denormalizado-como-cache neste subrazão, sem
    precedente direto no repo; roda após cada cenário do item 9/16.

### Auditoria, DTO, rotas, OpenAPI (gates que o diff aciona)

15. **[cond:Fork F-PS9]** Allowlist de `auditCanonical.ts` — nome exato do(s) evento(s) de recibo
    parcial depende do Fork F-PS9 (renomear `payment_registered`/`payment_cancelled` vs complementar
    com eventos novos). Em QUALQUER direção: payload ganha `paidCentsAfter`/`remainingCents`
    (id-only, money-as-string, sem PII — mesmo padrão dos 8 eventos atuais). Testável: teste-guarda
    do padrão #255/#258 (nenhum campo fora da allowlist) cobre o(s) evento(s) novo(s)/renomeado(s)
    sem exceção.
16. **[direto] Teste de domínio obrigatório (caso adversarial do ADR §7):** N recibos concorrentes
    cuja soma excede `amountCents` → exatamente os que cabem no saldo vencem, os demais recebem
    `ValidationError` — extensão de `PayableClaim.integration.test.ts`/`ReceivableClaim.integration.test.ts`
    (real-SQLite, WAL) usando a fórmula do item 5 (literal pré-lido), não a forma coluna-a-coluna do
    rascunho original do ADR. **Windows serializa SQLite por processo único; a CI Linux não**
    (memória `windows-serializa-sqlite-ci-linux-nao`) — verde local não fecha este invariante
    sozinho, só a CI é o oráculo.
17. **[cond:Fork F-PS10] [RECALCULADO pós-review PR #291]** Rotas: `POST /:id/pay` +
    `POST /:id/payments/:paymentId/cancel` (`server/src/routes/payables.ts`) e espelho AR **têm
    consumidor real de frontend** (`my-app/lib/services/accountsPayable.service.ts:185,209` +
    `accountsReceivable.service.ts:172,196`, chamados por `AccountsPayablePanel.tsx`/
    `AccountsReceivablePanel.tsx` já em produção) — a recomendação recalculada de F-PS10 é
    **(b) rota-irmã**: as rotas atuais NÃO mudam; `/:id/settlements`+
    `/:id/settlements/:settlementId/cancel` nascem como superfície nova (ACC-016), sem tocar
    `payables.ts`/`receivables.ts`/os 2 serviços de frontend. Se F-PS10 for ratificado (a) em vez
    disso, este item passa a incluir, no MESMO PR: `accountsPayable.service.ts`,
    `accountsReceivable.service.ts`, e os testes que os exercitam (`accountsPayable.service.test.ts`,
    `AccountsPayablePanel.test.tsx`, espelho AR) — nomeado explicitamente para não ser descoberto
    tarde. `docs.paths.ts` atualizado no mesmo PR; `npm run docs:generate`;
    `server/src/__tests__/openapi-paths.test.ts` — guard é `>=BASELINE` (147), path novo nunca
    quebra o teste (só justifica subir o piso).
18. **[direto] [CORRIGIDO pós-review PR #291]** `tsc --noEmit` limpo ×2 (`server/` e `my-app/`).
    **Se F-PS10→(b) (recomendado):** `my-app/` não deveria mudar (rota-irmã, FE de parcial diferida
    por F-PS6). **Se F-PS10→(a):** `my-app/` MUDA (item 17) e este gate passa a cobrir a mudança
    real, não uma formalidade — rodar mesmo assim nunca foi opcional, mas a expectativa de "não
    deveria mudar" só vale sob (b).
19. **[direto]** Fatoria (`lib/factory.ts`) — nenhuma injeção nova (mesmos repositórios/serviços já
    wireados); confirmar que a mudança de assinatura interna de `claimForPayment`/`claimForReceipt`
    (novo parâmetro `novo`/`amountCentsLido`) não quebra nenhum outro call site — grep de chamada
    antes de fechar o diff.

---

## 2. Contratos esboçados (schema Zod-like)

### Entrada — registrar um recibo parcial (nome exato do tipo depende do Fork F-PS9)

```ts
// server/src/features/accounting/dtos/PayableDto.ts — substitui RegisterPaymentSchema
// (ou nasce como RegisterSettlementSchema — Fork F-PS9)
export const RegisterPaymentSchema = z
  .object({
    unitId: z.string().min(1),
    method: z.enum(PAYMENT_METHODS),
    paidAt: dateOnly('paidAt'),
    amountCents: cents, // > 0, <= MAX_CENTS — teto por RECIBO, não por título
  })
  .strict();
// A checagem "<= saldo remanescente" NÃO cabe no DTO puro (precisa do registro) — vive no
// serviço via .refine no ponto de chamada OU um segundo schema client-side; o schema acima
// só valida forma. Documentar isso explicitamente no comentário de topo do arquivo (a MUDANÇA
// de "deve igualar" para "deve ser <= saldo" é lógica fina, invisível a snapshot de shape).
```

Espelho `RegisterReceiptSchema` em `ReceivableDto.ts`, idêntico.

### Saída — recibo individual (shape do child row, sem mudança de forma)

```ts
// PayablePayment / ReceivableReceipt — NENHUM campo novo no shape retornado (F-PS1: sem rename,
// sem coluna nova nos filhos). O campo novo (paidCents/receivedCents) vive só no PAI.
interface PayablePaymentDto {
  id: string;
  payableId: string;
  amountCents: string;   // money-as-string na fronteira (padrão já em vigor)
  method: string;
  paidAt: string;        // date-only
  status: 'ACTIVE' | 'CANCELLED';
  entryId: string | null;
}
```

### Saída — título com saldo (o pai ganha 2 campos derivados na leitura, não no DTO de escrita)

```ts
interface PayableWithBalanceDto {
  // ...campos existentes...
  amountCents: string;
  paidCents: string;       // NOVO — persistido, cache do Σ recibos ACTIVE
  remainingCents: string;  // NOVO — derivado na leitura (amountCents - paidCents), nunca persistido 2x
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAYING' | 'PAID' | 'CANCELLED'; // ordem ilustrativa, não migração de enum
}
```

### Auditoria — payload do evento de recibo (nome do eventType depende do Fork F-PS9)

```ts
// auditCanonical.ts — allowlist, forma do payload (nome da chave é FIXO independente do fork de nome do evento)
'payable.payment_registered' /* ou 'payable.settlement_registered', Fork F-PS9 */: [
  'payableId', 'paymentId', 'amountCents', 'method', 'entryId',
  'paidCentsAfter',     // NOVO — string, saldo pago após este recibo
  'remainingCents',     // NOVO — string, saldo restante após este recibo
],
```

---

## 3. Forks NOVOS (o ADR explicitamente empurrou para o BRIEF — RATIFICAÇÃO PENDENTE)

Os 7 forks do ADR (F-PS1..F-PS7) já vieram ratificados por delegação e **não são reabertos aqui**.
Os três abaixo são decisões que o próprio ADR nomeia como fora do seu escopo ("decisão do BRIEF",
"decisão de nomenclatura, não deste ADR") — nenhum se auto-ratifica.

### F-PS8 — `PAYING`/`RECEIVING` (transiente): manter ou eliminar

O ADR §3/F-PS2 introduz o gate de soma como um `UPDATE` condicional atômico que **não precisa** de
um estado transitório visível para fechar a corrida (o `count` do `UPDATE` já resolve). Isso deixa
aberto se os status transientes atuais (`PAYING`/`RECEIVING`) continuam existindo como etapa entre
"claim" e "finalize" (padrão atual: `registerPayment` faz `OPEN→PAYING` antes de postar, depois
`PAYING→PAID` no finalize) ou são eliminados (o `UPDATE` de soma já cobre atomicidade sem uma janela
de status observável).

- **(a) Manter `PAYING`/`RECEIVING` como estado transitório** (recomendado pelo próprio ADR, emenda
  pós-parecer §4/F-PS2): preserva o golden ref (`PayableClaim.integration.test.ts`,
  `ReceivableClaim.integration.test.ts`) sem reescrevê-lo — menor blast radius para a primeira
  versão. O CAS de soma some do meio do caminho (item 5 do checklist) e substitui só o `claimForPayment`
  binário por um que soma; a fase PAYING→finalize continua igual.
- (b) Eliminar `PAYING`/`RECEIVING`, tornando o `UPDATE` de soma a ÚNICA operação atômica (soma +
  posta em uma passada, sem estado intermediário) — tecnicamente viável (o parecer confirma), mas
  reescreve os dois golden refs de concorrência do zero e muda a forma de `registerPayment`/
  `registerReceipt` (não há mais "claim, depois post, depois finalize" — vira "post, depois soma
  atômica"). Custo de errar: perde o teste golden-ref existente sem substituto provado no mesmo PR.
- **Recomendação do BRIEF:** (a) — é a recomendação que o próprio ADR já registra por nome
  ("Recomendação de ordem [emenda pós-parecer]: manter PAYING/RECEIVING... decidir a eliminação é
  do BRIEF"); ratificar aqui só formaliza o que o ADR já apontou como caminho de menor risco.

### F-PS9 — Nome do evento de auditoria e do DTO/método de serviço — **RECALCULADO pós-review PR #291**

O ADR §7 nomeia explicitamente esta lacuna: *"nomes exatos = decisão do BRIEF pós-ADR, prováveis
`payable.settlement_registered`/`payable.settlement_cancelled` renomeando ou complementando
`payment_registered`/`payment_cancelled` — decisão de nomenclatura, não deste ADR."*

**Evidência corrigida (a recomendação original citava "zero consumidor" apontando para
`my-app/src`, que não existe — árvore real é `my-app/{lib,features,pages,components}`, ver
"Insumos existentes" acima).** Consumidores reais confirmados: grep dedicado pelos 4 literais
(`payment_registered`, `payment_cancelled`, `receipt_registered`, `receipt_cancelled`) na árvore
real do frontend retorna **zero** ocorrência — nenhuma tela lê o nome do EVENTO de auditoria. O que
a árvore real tem, e o grep original não viu, é `AccountsPayablePanel.tsx`/
`AccountsReceivablePanel.tsx` chamando `accountsPayable.service.ts`/`accountsReceivable.service.ts`
(`registerPayment`/`registerReceipt`, nomes de MÉTODO, não de evento) — que batem nas ROTAS
(`/pay`, `/receive`), não na allowlist de auditoria. **Ou seja: o nome do EVENTO de auditoria
continua com blast radius zero de frontend; o nome do MÉTODO/DTO de serviço, se acoplado ao rename
do evento, herdaria o blast radius da rota (ver F-PS10 abaixo) — os dois planos de nomenclatura
precisam ser tratados separadamente, não como um pacote único.**

- **(a) Renomear só o evento de auditoria** (`payment_registered`→`settlement_registered`, etc.,
  espelho AR) **sem** renomear `registerPayment`/`RegisterPaymentInput` no código do serviço/DTO.
  Custo de errar: nome do evento e nome do método divergem (`registerPayment` emite
  `settlement_registered`) — pequena dissonância de leitura, mas sem quebra de contrato externo
  (o payload da allowlist é interno ao backend; zero consumidor de frontend/job confirmado).
- (b) Renomear evento E método/DTO juntos (`registerPayment`→`registerSettlement`,
  `RegisterPaymentInput`→`RegisterSettlementInput`) — mais consistente, mas **NÃO pode ser feito sem
  também tocar a rota** (a) do serviço frontend `accountsPayable.service.ts:185,209` chama a rota
  por string literal, não pelo nome do método TS do backend, então renomear só o backend não quebra
  a FE em si — mas se o método/DTO renomeado vier acoplado a uma mudança de ROTA (F-PS10), a FE
  quebra em silêncio se não for atualizada no mesmo ciclo. Custo de errar: alto SE combinado com
  F-PS10→renomear sem tocar a FE.
- (c) Não renomear nada agora — manter `payment_registered`/`payment_cancelled`/`registerPayment`/
  `RegisterPaymentInput` como estão; "settlement" fica só como vocabulário de documentação/BRIEF,
  não de código. Custo de errar: nenhum imediato; a única perda é consistência de nome com a rota
  se F-PS10 escolher renomear a rota.
- **Recomendação recalculada do BRIEF:** **(a)** para o evento de auditoria (zero blast radius
  medido, nome interno) **combinada com (c) para o método/DTO se F-PS10→(b) mantém a rota atual**,
  ou combinada com (b) para o método/DTO **somente se** F-PS10→(a) renomear a rota **e** a FE for
  atualizada no MESMO PR (violação deliberada e explícita de F-PS6-(b) "FE em incremento separado" —
  ver nota de custo em F-PS10). Custo de errar de tratar isso como pacote único: acoplar o rename do
  método/DTO a uma mudança de rota sem atualizar a FE quebra o pagamento/recebimento INTEGRAL em
  produção — **silenciosamente**, porque o erro só aparece em runtime (404 na chamada), não em
  `tsc` (o TS do frontend não importa os types do backend por essa rota).

### F-PS10 — Rota: renomear `/:id/pay` → `/:id/settlements` ou manter como rota-irmã — **RECALCULADO pós-review PR #291**

O ADR §7 nomeia esta lacuna: *"`openapi-paths.test.ts` — bump do BASELINE se as rotas `{id}/pay`
viram `{id}/settlements` (ou ganham uma rota irmã) — decisão de nomenclatura de rota é do BRIEF, não
deste ADR."* O ADR §5/ACC-016 já recomenda o padrão de nome (`POST /:id/settlements`, `POST
/:id/settlements/:settlementId/cancel`) como o formato do comando-por-ação, mas não decide se a
rota **atual** (`/:id/pay`, `/:id/payments/:paymentId/cancel`) é substituída ou preservada ao lado.

**A recomendação original (a, renomear sem rota-irmã) estava fundamentada em "zero consumidor de
frontend", achado FALSO** (review independente da PR #291, achado ALTO): o grep mirou
`my-app/src`, que não existe — a árvore real é `my-app/{lib,features,pages,components}`. Consumidores
reais, confirmados por leitura: `my-app/lib/services/accountsPayable.service.ts:185`
(`registerPayment` → `POST /payables/:id/pay`), `:209` (`cancelPayment` →
`POST /payables/:id/payments/:paymentId/cancel`); espelho `accountsReceivable.service.ts:172,196`
— chamados por `AccountsPayablePanel.tsx:332,339,345`/`AccountsReceivablePanel.tsx:326,333,339`,
telas JÁ em produção para pagamento/recebimento INTEGRAL. Renomear a rota sem atualizar esses dois
arquivos de serviço no MESMO PR quebra o fluxo de pagamento/recebimento integral em produção —
**em silêncio** (a chamada HTTP responde 404, não um erro de compilação; nenhum `tsc` pega isso,
porque o path é uma string literal, não um type compartilhado).

- (a) Renomear (substituir), sem rota-irmã — **custo de errar recalculado: ALTO**, não zero. Só é
  seguro se a atualização de `accountsPayable.service.ts`/`accountsReceivable.service.ts` (e os
  testes que os mockam — `accountsPayable.service.test.ts`, `AccountsPayablePanel.test.tsx`,
  espelho AR) entrar no MESMO ciclo/PR do backend. Isso **fere F-PS6-(b)** ("`FE-INCR-PARTIAL-SETTLEMENT`
  separado... o backend por si prova o invariante mais caro... a tela reusa o padrão de formulário
  existente") na leitura estrita — mas F-PS6 diferiu a UI de baixa **parcial** (tela nova), não a
  manutenção da UI de pagamento **integral** já existente; atualizar 2 arquivos de serviço (só a URL
  chamada, não a UI) para não quebrar em produção é diferente de construir a tela de parcial. Ainda
  assim é trabalho de frontend fora do escopo original deste BRIEF backend-only — precisa estar
  explícito no PR da `sessao-feature`, não descoberto tarde.
- ✅ **(b) Rota-irmã** (recomendação recalculada) — mantém `/:id/pay` e
  `/:id/payments/:paymentId/cancel` funcionando exatamente como hoje (full-payment via CAS de soma
  com `novo === remaining`, que é um caso particular do gate novo — nenhuma duplicação de lógica de
  domínio, só de rota) e adiciona `/:id/settlements`+`/:id/settlements/:settlementId/cancel` como
  superfície nova para parcial, alinhada a ACC-016. Custo de errar: 2 rotas HTTP para o mesmo
  serviço de domínio (uma é caso particular da outra) — superfície um pouco maior para documentar,
  mas **zero mudança na FE existente** e **zero risco de quebra silenciosa**; a FE de parcial
  (F-PS6 diferida) chama a rota nova quando for construída, sem pressa de coordenar com o backend.
- **Recomendação recalculada do BRIEF:** **(b)** — o custo de (a) (coordenar 2 repositórios/times no
  mesmo PR para não quebrar produção) supera o custo de manter uma rota-irmã por um ciclo; (b)
  também desacopla o timing do backend do timing do FE-INCR-PARTIAL-SETTLEMENT (F-PS6), que é
  exatamente o que F-PS6 pretendia ao diferir a UI.

---

## 4. Pendente de validação externa

**Regra de juros/desconto/multa na baixa parcial** — nenhuma tabela hoje modela taxa de juros/multa
por título ou por contraparte; se o contador ou o dono quiserem cálculo automático de acréscimo por
atraso ou desconto por antecipação numa baixa parcial, é um incremento **posterior e distinto**
(já nomeado assim pelo ADR §9). Este BRIEF modela a baixa parcial "nua" — valor informado pelo
usuário, sem cálculo de acréscimo/decréscimo. Não entra no checklist como se fosse decidido.

---

## 5. Insumos ausentes

- **Volume real de `payables`/`receivables` no `dev.db`** — nem o ADR nem esta sessão de
  planejamento confirmaram se as tabelas estão populadas no `server/prisma/prisma/dev.db` real deste
  worktree (path aninhado, memória `dev-db-real-path-is-nested`). O smoke-migration-gate (item 4 do
  checklist) precisa confirmar isso ANTES de aceitar o smoke como prova — se as tabelas estiverem
  vazias, é PASS vacuoso (memória `smoke-gate-s6-x-migracao-de-dado`), e quem rodar a `sessao-feature`
  deve popular ou nomear a lacuna, não assumir cobertura.

## 6. Achados fora de escopo

**Baixa parcial × dimensão obrigatória** — já registrado como achado pré-existente, não agravado,
no próprio ADR (§ "Achados fora de escopo", achado do parecer §1.4): `RegisterPaymentInput`/
`RegisterReceiptInput` não carregam `dimensions` hoje, e a liquidação já falharia em pagamento
integral se a conta de controle/método exigisse dimensão (`ADR-INCR-DIM-COMPLETENESS`). A baixa
parcial não piora nem resolve isso — não vira fork nem comportamento deste BRIEF. Se o dono quiser
dimensão na liquidação, é incremento à parte (`dimensions?: string[]` no DTO + repasse ao
`postEntry`), fora do escopo autorizado aqui (ORCH-006 — frente nova exige nova autorização).

Nenhum achado NOVO surgiu na leitura desta sessão além do que o ADR/parecer já registraram.

---

## 7. Plano de execução por fatias (para a `sessao-feature`)

**Fase 0 — Schema (serial, bloqueia todo o resto):** itens 1-4 do checklist. Uma única migração
Prisma (coluna aditiva ×2 + backfill idempotente ×2), rodada e confirmada contra o `dev.db` real
antes de qualquer fatia de código abrir. Nenhuma fatia da Fase A pode escrever teste que dependa das
colunas novas antes desta fase fechar.

**Fase A — Corpos (pode paralelizar por módulo, AP e AR são espelhos independentes):**
- **Fatia AP:** itens 5-10, 14, 16 aplicados a `PayableService`/`PayableRepository`/`PayableDto`.
- **Fatia AR:** itens 5-10, 14, 16 aplicados a `ReceivableService`/`ReceivableRepository`/
  `ReceivableDto` (espelho exato — mesma ordem, mesmos testes, nomes trocados).
- **Fatia Aging+TieOut:** itens 11-13 — depende das Fases AP e AR terem os campos `paidCents`/
  `receivedCents` gravando corretamente (mas não depende de auditoria/rotas), pode rodar em paralelo
  às duas fatias acima assim que a Fase 0 fechar, usando o schema novo diretamente.

**Fase B — Superfície (serial, depende dos forks F-PS8/F-PS9/F-PS10 ratificados E das Fases A/Aging
fechadas):** itens 15 (auditoria), 17 (rotas/openapi), 18 (tsc), 19 (factory/wiring). Esta fase é a
única que muda nome de evento/rota — não pode abrir antes da ratificação dos 3 forks novos (§3).

**Ordem recomendada:** Fase 0 → (Fatia AP ‖ Fatia AR ‖ Fatia Aging+TieOut, em paralelo) → Fase B.
`luminaris-reviewer` roda uma vez ao final de cada fase, não só no fim do incremento inteiro —
follow-on do padrão já em uso nos incrementos anteriores (AR/AP/Aging todos passaram por review
faseado).

---

## 8. Gates de envio [OPS-001] — lição registrada pós-review (PR #291)

1. **Objetivo:** a frase que responde ao pedido do review é a correção de F-PS9/F-PS10 acima — as
   duas recomendações mudaram de "renomear sem custo" para "manter/isolar por causa de um consumidor
   real de frontend".
2. **Grau:** achado ALTO do `luminaris-reviewer` independente
   (https://github.com/NightMarketz/luminaristest/pull/291#issuecomment-5578071221) — **verificado**
   por leitura direta nesta sessão: `AccountsPayablePanel.tsx:332,339,345` /
   `AccountsReceivablePanel.tsx:326,333,339` chamam `accountsPayable.service.ts:185,209` /
   `accountsReceivable.service.ts:172,196`, que batem `POST /payables/:id/pay`,
   `POST /payables/:id/payments/:paymentId/cancel` e o espelho AR.
3. **Caso adversarial que faltou na primeira passada e o que aconteceu quando rodado certo:** a
   sessão original rodou `grep ... my-app/src` — caminho que **não existe neste repo** — e leu o
   resultado vazio como "zero consumidor", sem verificar primeiro que o caminho existia. Rodado
   contra a árvore real (`my-app/{lib,features,pages,components}`), o mesmo grep retorna 4
   consumidores reais e ativos.
4. **Checagem que teria falhado, e agora falharia se a premissa voltasse a ser falsa:** `ls my-app/src`
   (retorna "No such type of file or directory") deveria ter sido o primeiro comando, antes de
   qualquer grep de blast radius de frontend neste repo — não depois. Registrado aqui como regra
   permanente para qualquer fork futuro deste projeto que meça "consumo de frontend": **grep de
   blast radius de FE mira `my-app/{lib,features,pages,components}`, nunca `my-app/src`** (este
   projeto não usa a convenção `src/` no frontend — `server/` também não usa `src/` como raiz de
   busca ingênua sem checar primeiro, mas lá `server/src` de fato existe, o que tornou o engano
   fácil de cometer por analogia).
5. **Risco principal (repetido):** um grep de blast radius contra um caminho inexistente sempre
   retorna vazio — é indistinguível de "busquei e não achei" na saída, mas significa "não busquei
   nada". Todo claim de "zero consumidor"/"blast radius zero" neste projeto (ou qualquer outro)
   precisa confirmar que o caminho buscado existe (`ls`/`test -d`) ANTES de aceitar um grep vazio
   como evidência negativa — o viés a declarar é a tentação de tratar silêncio de grep como prova
   de ausência sem checar a premissa do próprio comando.
