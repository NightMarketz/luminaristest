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
    3050,3217,3261` — blocos OpenAPI correspondentes. Zero uso destas rotas em `my-app/src` (grep
    vazio) — módulo AP/AR settlement não tem consumidor de frontend hoje (consistente com F-PS6).
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
  - **Não consome nem é consumido por:** frontend (F-PS6 diferido; zero rota chamada em `my-app`),
    `LEDGER_STATUSES` (não muda — são status de `Payable`/`Receivable`, não de `JournalEntry`),
    dimensões (achado fora de escopo, §6 abaixo), period-close (reusado sem mudança).

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
   (`PayableService.ts:505-510`, espelho `ReceivableService.ts:300-303`) ganha um terceiro ramo para
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
17. **[cond:Fork F-PS10]** Rotas: `POST /:id/pay` + `POST /:id/payments/:paymentId/cancel`
    (`server/src/routes/payables.ts`) e espelho AR — a forma exata (renomear para `/:id/settlements`
    + `/:id/settlements/:settlementId/cancel` conforme ACC-016, vs manter as atuais como rota-irmã)
    depende do Fork F-PS10. `docs.paths.ts` atualizado no mesmo PR; `npm run docs:generate`;
    `server/src/__tests__/openapi-paths.test.ts` — guard é `>=BASELINE` (147), path novo nunca
    quebra o teste (só justifica subir o piso se `docs:generate` mudar a contagem).
18. **[direto]** `tsc --noEmit` limpo ×2 (`server/` e `my-app/` — este último não deveria mudar,
    F-PS6 diferido; rodar mesmo assim é o gate padrão do projeto).
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

### F-PS9 — Nome do evento de auditoria e do DTO/método de serviço

O ADR §7 nomeia explicitamente esta lacuna: *"nomes exatos = decisão do BRIEF pós-ADR, prováveis
`payable.settlement_registered`/`payable.settlement_cancelled` renomeando ou complementando
`payment_registered`/`payment_cancelled` — decisão de nomenclatura, não deste ADR."*

- **(a) Renomear** — `payment_registered`→`settlement_registered`, `payment_cancelled`→
  `settlement_cancelled` (espelho AR `receipt_*`→`settlement_*`), acompanhado de renomear
  `registerPayment`→`registerSettlement`/`RegisterPaymentInput`→`RegisterSettlementInput` no
  serviço/DTO para consistência com a rota nova (Fork F-PS10) e com ACC-016 (que já fala em
  "settlements" no nome da rota). Custo de errar: 2 nomes de evento saem da allowlist — todo
  consumidor de log/auditoria histórico que filtrar por `payment_registered` para de bater com
  eventos novos (mitigado: grep confirma zero consumidor fora de `server/src/features/accounting/**`
  e seus testes — sem frontend, sem job externo).
- (b) Complementar — manter `payment_registered`/`payment_cancelled` como estão (primeiro e único
  recibo continua no nome antigo) e não introduzir nomenclatura nova nenhuma; "settlement" fica só
  no nome da rota (se F-PS10→a). Custo de errar: nome do evento (`payment_*`) e nome da rota
  (`/settlements`) divergem permanentemente — próxima pessoa lendo o audit log e a rota vê dois
  vocabulários para o mesmo conceito.
- **Recomendação do BRIEF:** (a) — o blast radius medido é zero fora do próprio módulo (grep
  exaustivo: `payment_registered`/`payment_cancelled`/`receipt_registered`/`receipt_cancelled`
  aparecem só em `auditCanonical.ts` + os 2 repositórios + os 2 serviços + os 4 arquivos de teste
  correspondentes — nenhum consumidor de frontend, job ou relatório), e a consistência de
  vocabulário (rota + evento + DTO todos "settlement") evita a divergência de nome permanente que
  (b) deixaria.

### F-PS10 — Rota: renomear `/:id/pay` → `/:id/settlements` ou manter como rota-irmã

O ADR §7 nomeia esta lacuna: *"`openapi-paths.test.ts` — bump do BASELINE se as rotas `{id}/pay`
viram `{id}/settlements` (ou ganham uma rota irmã) — decisão de nomenclatura de rota é do BRIEF, não
deste ADR."* O ADR §5/ACC-016 já recomenda o padrão de nome (`POST /:id/settlements`, `POST
/:id/settlements/:settlementId/cancel`) como o formato do comando-por-ação, mas não decide se a
rota **atual** (`/:id/pay`, `/:id/payments/:paymentId/cancel`) é substituída ou preservada ao lado.

- **(a) Renomear (substituir), sem rota-irmã** — `payables.ts`/`receivables.ts` passam a expor só
  `/:id/settlements`+`/:id/settlements/:settlementId/cancel` (espelho AR). Custo de errar: qualquer
  chamador externo de `/:id/pay` quebra — **mitigado**: grep em `my-app/src` por estas rotas retorna
  zero ocorrência (nenhum frontend consome o módulo de settlement hoje, F-PS6 confirma que a UI é
  incremento futuro) e não há outro consumidor HTTP conhecido no repo.
- (b) Rota-irmã — mantém `/:id/pay` funcionando (full-payment, sem mudar semântica) e adiciona
  `/:id/settlements` como caminho novo para parcial. Custo de errar: duas rotas fazendo
  essencialmente a mesma coisa (uma é caso particular da outra) — superfície dobrada para manter e
  documentar, sem consumidor que precise da rota antiga preservada.
- **Recomendação do BRIEF:** (a) — zero blast radius medido (grep confirma nenhum consumidor de
  frontend) e evita a superfície duplicada de (b); segue a nomenclatura que o próprio ACC-016 já
  cita como padrão do comando-por-ação.

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
