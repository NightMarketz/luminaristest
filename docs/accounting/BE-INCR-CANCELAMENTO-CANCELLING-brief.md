# BE-INCR-CANCELAMENTO-CANCELLING — o cancelamento em dois commits ganha estado persistido, e o item preso volta sozinho

- **Data:** 2026-11-25
- **Nó:** nenhum (a cédula não é nota de nó; ver §7, insumo ausente 9). Família: Onda 2.1 (`ReceivableService`/`PayableService`
  reconcile reverso, `ee93a0984`) e Onda 4 (colunas de retry).
- **Estado:** BRIEF escrito, **sem fork pendente**: F-CX-1(a), F-CX-2(a), F-CX-3(a), F-DR-1(a), F-AR-1(a), F-RD-1(a), F-RD-2(a) e F-RD-3(b) **ratificados (dono, chat, 25/11,
  AskUserQuestion "Ratificar as 8 recomendadas", relatado pela sessão que drenou a caixa)**. Nenhum código. O `executa` vale pela emenda de 21/11 (abaixo).
- **Base:** `origin/main` em `631dd60fe`. A cédula está no PR #1401 (`docs/plano/decisoes/D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA.md`,
  branch `claude/decisao-forks-drenagem-25-11`, **ainda não mergeada**); este BRIEF a cita pelo texto que ela traz.
- **Sessão:** `sessao-planejamento` do grupo.

## TLDR (2 linhas)

`cancelPayable`, `InterestOnEquityService.cancel` e `ProfitDistributionService.cancel` ganham o estado `CANCELLING`, gravado numa
tx **antes** do estorno, e o reconcile conclui `CANCELLING→CANCELLED` repetindo só o que é idempotente; o `BLOCKED` determinístico passa a
ficar na bandeja de pendências com alerta, e um job novo (rodízio, teto, alerta por idade) re-dirige o que hoje só volta por rota manual.
**Risco principal:** `CANCELLING` entra em `PAYABLE_STATUSES` e em todo `status: { not: 'CANCELLED' }` — títulos em cancelamento passam a existir
para leituras fiscais (crédito de PIS/COFINS e IBS/CBS) e para o `reconcilePayables`, que **re-receberia o estoque** de uma compra já desfeita se o
passo 1 não pular o estado (item 0.7). O único DDL do grupo são 2 colunas nullable, ambas no PR-0 (`payables.cancelReversalDate`, `reconcile_pending_items.alertedAt`): o estado é `String`.

---

## 0. Formulário

### 0.1 Contexto fixo

- **Item a planejar:** o grupo "Cancelamento `CANCELLING` + re-drive" da drenagem da caixa de 25/11: lacunas `69c7`
  (`PayableService.cancelPayable`), `c4d3` (JCP e distribuição de lucros), `9d3e` (`BLOCKED` não persistido) e `aaf4`+`72d3` (item preso só volta
  por rota manual); `77aa` avaliada no §0.2.
- **Autorização:**
  - Cédula `D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA` (PR #1401), linha *"Cancelamento em 2 commits (`69c7`, `c4d3`, `9d3e`)"*: resposta **"Estado
    `CANCELLING` persistido"** — *"Migração: estado/coluna gravado ANTES do estorno; o reconcile re-dirige `CANCELLING→CANCELLED` repetindo só o
    estorno idempotente e pulando efeito físico/estoque já feito; `BLOCKED` passa a ser persistido com alerta (fecha `9d3e`). Etapas: PR-0
    `PayableService`, PR-1 JCP e distribuição de lucros."*
  - Mesma cédula, linha *"Item preso sem re-tentativa (`aaf4`, `72d3`)"*: resposta **"Scheduler com teto"** — *"Job de re-drive com rodízio por
    `updatedAt`, teto por passada e alerta por idade; a rota manual continua; motivo permanente não é re-tentado. Entra no BRIEF do cancelamento
    `CANCELLING`."*
  - `D-2026-11-11-LACUNA-VAI-AO-MAESTRO` §2 (cada lacuna da caixa gera sessão) e a cédula: *"Os BRIEFs saem de `sessao-planejamento` do grupo"*.
  - **`77aa` não está na cédula.** Entra por decisão desta sessão, a pedido do brief do maestro (*"Relacionada: 77aa … decida se entra no grupo"*, 25/11)
    e por `D-2026-11-11-LACUNA-VAI-AO-MAESTRO` §2 (a lacuna `aberta` vira trabalho). Se o dono vetar, o item 2.8 sai do PR-2 sem tocar nos outros.
  - **Cobertura:** cobre escrever este BRIEF. Não é `executa` de PR nenhum (cédula, campo `autorizacao`). **Atualização de 25/11:** os 8 forks do §5 foram
    ratificados pelo dono (as recomendadas), e o BRIEF ficou **sem fork**; a emenda de 21/11 (*"BRIEF de grupo sem fork executa sem ratificação"*) passa a se aplicar. Fork novo que surgir na execução
    para o nó e vira pergunta. A pergunta derivada do F-CX-2 (`cancel()` de JCP/distribuição já `CANCELLED`) **não** foi levada ao dono: vale o padrão do BRIEF (manter o 409 `JCP_NAO_POSTADO`), registrado como tal.
  - **Divergência de escopo, reportada:** a cédula diz *"PR-0 `PayableService`, PR-1 JCP e distribuição"* e *"o re-drive entra neste BRIEF"*, mas o
    `9d3e` fala também do `ReceivableService.completeReceiptCancellation`. Essa metade não tem PR na cédula: vira o fork **F-AR-1** (§5).
- **Insumos (lidos em 25/11 em `631dd60fe`):** `PayableService.ts` (`cancelPayable` ~:942-1042, `cancelPayment` ~:1054-1112,
  `completePaymentCancellation` ~:1120-1182, `reconcilePayables` ~:1194-1437, `estornarRetencoesDoReconhecimento` ~:550-571, `revertClaim`
  ~:1947); `ReceivableService.ts` (`cancelReceivable` ~:372-418, `reconcileReceivables` ~:576-724); `InterestOnEquityService.ts` (`cancel`
  ~:242-271, `assertCancelavel` ~:404-414, `reconcileLancamento` ~:227); `ProfitDistributionService.ts` (`cancel` ~:249-275, `reconcileLancamento`
  ~:238); `Payable.model.ts` (`PAYABLE_STATUSES` :21, `PAYABLE_TRANSITIONS` ~:38-45, `PAYABLE_SETTLEABLE_STATUSES` :49, `PAYABLE_OUTSTANDING_STATUSES`
  :56); `PayableRepository.ts` (:100, :128, :159, :209); `InventoryService.reverseStockForReceipt` :396; `PhysicalStockSync.reversePurchaseInbound` :125;
  `schema.prisma` (`Payable` :1268, `ProfitDistributionEvent` :2118, `InterestOnEquityCalculation` :2162, `ReconcilePendingItem` :2746);
  `ReconcilePendingDto.ts` :17-30; `accountingSyncReconcile.job.ts` (`withReconcileWatermark` :327, `runAccountingSyncReconcile` :1919,
  `retryOneReconcilePendingItem` :2446); `AccountingSyncScheduler.ts`; `jobs/__tests__/schedulerFailureAlert.test.ts`; `server.ts` :58-65;
  migração `20261124130000_add_collection_charge_poll_retry_onda4` (precedente de retry); memória `fila-de-job-com-teto-starvation`.
- **Nós vizinhos:** consome `PostingService.reverseEntry` (idempotente e anterior ao gate de período), `InventoryService.reverseStockForReceipt`
  (replay por `reversalEventId = <payableId>:cancel`), `PhysicalStockSync.reversePurchaseInbound` (`already-reversed` na repetição),
  `AuditService`, `ReconcilePendingService.rescan`. É consumido por `payableController`/rota de cancelamento e pelas telas de AP, JCP e distribuição
  (FE, fora do BRIEF).

### 0.2 Recorte

| Entra | Fica de fora | Por quê |
|---|---|---|
| `cancelPayable` → `CANCELLING` (PR-0) | `cancelPayment`, `cancelReceipt`, `cancelReceivable` | já convergem lendo o razão (Onda 2.1): o estorno não tem efeito físico antes dele, então "razão `Reversed` + subrazão vivo" é detectável. Só o `BLOCKED` deles muda (item 0.10 e F-AR-1) |
| JCP e distribuição de lucros → `CANCELLING` (PR-1) | `reconcileLancamento` (direção de ida, `PENDING_POST`) como driver do job | só ganha a guarda de estado novo (item 1.6); entra no job pelo F-RD-3 (b) |
| `BLOCKED` persistido na bandeja (`9d3e`), AP e (F-AR-1) AR | coluna/status `BLOCKED` nas linhas de pagamento/recibo | F-DR-1 |
| Job de re-drive: AP/AR (título preso, direção reversa), `CANCELLING` de AP/JCP/distribuição, itens transitórios da bandeja (`aaf4`) (PR-2) | apurações (`TaxAssessmentService.reconcileProvisao`) e depreciação; e JCP/distribuição `PENDING_POST` no ramo (a) do F-RD-3 | F-RD-3; resíduo vai à caixa (§8) |
| `77aa` (PR-2, item 2.8) | — | **Decisão desta sessão (a pedido do brief):** entra. O job passa a chamar o passo 2 sem ninguém olhando, e é ali que o `77aa` emite o evento de auditoria sob o recibo errado; consertar o evento depois de automatizar a emissão é publicar o defeito em escala. É o mesmo loop que o item 2.1 refatora, então o custo marginal é 1 predicado |
| — | Tela/FE | `FE-INCR` à parte (§8) |

---

## 1. Fatos lidos que o desenho respeita

1. **O furo do AP não é o do AR.** `cancelPayable` faz, nesta ordem, efeitos físicos e de estoque (`reverseStockForReceipt` :984,
   `reversePurchaseInbound` :993), depois `reverseEntry` (:1010), depois a tx do subrazão (:1020). Crash depois do estoque e antes do estorno deixa **estoque
   desfeito, título `OPEN`, razão intacto — sem marca nenhuma**: nenhuma leitura do razão enxerga isso (o `cancelReceivable` não tem esse problema:
   não há efeito antes do estorno). É o que o estado persistido resolve e a leitura do razão não.
2. **O estoque e o físico são replay-seguros.** `reverseStockForReceipt` devolve o `REVERSAL` existente sem decrementar de novo (:414-428,
   chave `${payableId}:cancel`); `reversePurchaseInbound` devolve `already-reversed`. Logo "pular efeito já feito" da cédula é, no código, **chamar
   de novo** — o replay não duplica. O físico segue best-effort (só log, :997-1002).
3. **`reverseEntry` é idempotente antes do gate de período** (caso `69c7`/`c4d3`, `evidencia`): repetir depois que o período fechou conclui.
4. **`status` do `Payable` é `String`** (`schema.prisma:1286`, comentário "see PAYABLE_STATUSES"): `CANCELLING` **não é DDL**. O que falta é a
   *data do estorno*: `cancelledById` e `cancelReason` já existem (:1297-1298), mas o `dto.reversalDate` só vive no corpo da requisição.
   JCP (`dataCredito`) e distribuição (`dataEvento`, `String`) já carregam a data na linha, e `ProfitDistributionEvent` já tem `cancelReason`.
   **Consequência:** a migração do PR-0 é 1 coluna; a do PR-1 é **nenhuma**.
5. **`PAYABLE_TRANSITIONS` já é tabela** (`Payable.model.ts` ~:38-45; `assertPayableRecalc` :154): `OPEN`, `PARTIALLY_PAID` e `PAID` vão a `CANCELLED`
   (os dois últimos só com baixas sem caixa de retenção). `CANCELLING` entra na tabela, não como `if` solto.
6. **Quem lê `status`.** `findAllActive` (:100, sem filtro de status) alimenta o passo 1 do `reconcilePayables`; `findOutstanding` usa
   `OPEN|PARTIALLY_PAID|PAYING`; `findPisCofinsCredits` (:128) e `findIbsCbsCredits` (:159) usam `{ not: 'CANCELLED' }` — **`CANCELLING` entraria
   como título vivo nos créditos fiscais sem que ninguém decidisse**; settleable (:209) é lista fechada (`CANCELLING` fica de fora sozinho).
   `PAYABLE_STATUSES` alimenta `z.enum` do filtro de listagem (`PayableDto.ts:528`) e o tipo gerado do front (`PayableDto.gen.ts`).
7. **O passo 1 do reconcile re-receberia o estoque.** Para compra de estoque, `reconcilePayables` chama `receiveStock` + `drivePhysicalInbound`
   sempre que o título não é `CANCELLED` (:1220-1286). Um título `CANCELLING` com estoque já desfeito cairia ali e **desfaria o desfazer**.
8. **A bandeja de pendências já tem a forma que o job pede.** `ReconcilePendingItem` (`schema.prisma:2746`): `firstSeenAt`, `lastSeenAt @updatedAt`,
   `attempts`, `reasonCode` (alfabeto com a marca *transitório × poison*, `ReconcilePendingDto.ts:17-30`), `resolvedAt`, `@@unique(userId, unitId,
   sourceType, sourceId)`, e `ReconcilePendingService.rescan` (dono da escrita auditada). `sourceType` é `String` aberta. **Não tem** marca de "alerta
   já enviado". `retryOneReconcilePendingItem` (`accountingSyncReconcile.job.ts:2446`) reusa o mesmo núcleo do tick.
9. **O `9d3e` hoje é só log.** `completePaymentCancellation` lança `PAYMENT_REVERSAL_INVARIANT_CODE` dentro da tx; o `reconcilePayables` o conta
   como `blocked` e `logger.warn` (:1421-1427). Nada fica gravado, e na passada seguinte reaparece. O mesmo vale para `IMPOSTO_JA_RECOLHIDO` e para
   `JCP_JA_PAGO` na 2ª `assertCancelavel` do JCP (:255), que pode lançar **depois** do estorno.
10. **O padrão de job com teto já tem lição.** Memória `fila-de-job-com-teto-starvation`: rodízio por `updatedAt asc`, o job **toca** (adia) o item que não
    sai, alerta sem teto e com janela ancorada no **evento**; testar "N parados + 1 novo" e "1 antigo + N novos" no SQLite real.
11. **Gate de scheduler.** `schedulerFailureAlert.test.ts` descobre `jobs/*Scheduler.ts` em disco e reprova scheduler sem caso (OBS-R11,
    F-OBS-14). `server.ts:58-65` liga e `:130+` desliga cada um. O lock do `AccountingSyncScheduler` é process-local.
12. **Retenção na fonte tem o mesmo desenho de 2 commits dentro do `cancelPayable`.** `estornarRetencoesDoReconhecimento` (:550-571) estorna os
    lançamentos de retenção no razão (commit 1) e depois faz a tx do subrazão; crash entre as duas converge só repetindo o cancelamento. Vira o F-CX-1.
13. **Intenção explícita.** Com `CANCELLING` a intenção "este título/JCP vai ser cancelado" fica gravada; sem ela, o re-drive teria de *inferi-la* do
    razão (um lançamento estornado por outro caminho viraria cancelamento do subrazão). É o ganho que a cédula comprou para JCP e distribuição, onde
    a leitura do razão já bastaria para detectar o crash.

---

## 2. Ordem e precondições

1. **Integração `integration/cancelamento-cancelling`** (3 PRs do mesmo tema, mesmos arquivos comuns: `ReconcilePendingDto.ts`, `auditCanonical.ts`,
   `schema.prisma`): pilha nativa com a integração como base (CLAUDE.md, 10/11). A `main` recebe um PR só quando fechar.
2. **PR-0 → PR-1 → PR-2.** O PR-1 depende do alfabeto de motivos e dos `sourceType` da bandeja (item 0.10) e do helper de "registrar pendência
   permanente"; o PR-2 depende dos dois (os `CANCELLING` de JCP e distribuição são drivers do job).
3. **Precondição:** a cédula #1401 mergeada (o `executa` cita o texto dela). Resposta aos forks do §5.
4. **Classe de risco:** com migração e `PayableService`, `node scripts/classe-risco.mjs pr <n>` deve dar **vermelho** nos três → `revisor-independente`
   e lote do dono.
5. **Gates acionados** (entram no checklist, não na improvisação): snapshot de shape dos DTOs (`PAYABLE_STATUSES`), `PayableDto.gen.ts` regenerado,
   allowlist do `auditCanonical.ts` (eventType novo na mesma mudança), guard de path-count do openapi (**sem rota nova**), paridade i18n (nenhuma
   string de tela neste BRIEF), `node scripts/worktree-deps.mjs` + `prisma generate` em worktree nova, prólogo defensivo na migração SQLite.

---

## 3. Checklist (3 PRs; cada item testável sozinho)

### PR-0 — `PayableService`: `CANCELLING` persistido, bandeja de `BLOCKED`, e a guarda do passo 1

- **0.1 Migrações (2 colunas, 1 arquivo cada).** (i) `20261125xxxxxx_add_payable_cancel_reversal_date`: `ALTER TABLE "payables" ADD COLUMN "cancelReversalDate" TEXT;` — nullable,
  `YYYY-MM-DD` como texto (não `DateTime`: evita o recuo de um dia por ISO UTC, memória `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`),
  sem backfill. (ii) `20261125xxxxxx_add_reconcile_pending_alerted_at`: `ALTER TABLE "reconcile_pending_items" ADD COLUMN "alertedAt" DATETIME;` (NULL = nenhum alerta
  enviado; **vem no PR-0**, não no PR-2, porque o alerta "só na 1ª captura" do item 0.9 depende dele). Prólogo defensivo nos dois (memória `migracao-sqlite-nao-e-transacional`).
  `Payable.cancelReversalDate String?` e `ReconcilePendingItem.alertedAt DateTime?` no `schema.prisma`. Teste: `PRAGMA table_info` mostra as colunas; linha antiga lê `null`.
- **0.2 Modelo e DTO.** `PAYABLE_STATUSES` += `'CANCELLING'`; `PAYABLE_TRANSITIONS`: `OPEN|PARTIALLY_PAID|PAID → CANCELLING` (os dois últimos só no ramo F-CX-1 a);
  `CANCELLING → CANCELLED` e **nenhuma outra** (F-CX-2 a). `PayableDto` (resposta e filtro) com a união nova; `__dto-shapes__.json` regenerado
  (inserir só o novo, não `UPDATE` em massa — memória `dto-snapshot-update-reordena-no-windows`); `PayableDto.gen.ts` regenerado. Teste: tabela
  rejeita `CANCELLING → OPEN`; snapshot muda só no enum.
- **0.3 Repositório.** `IPayableRepository`/`PayableRepository`: `casStartCancelling(scope, id, { fromStatuses, cancelledById, cancelReason, cancelReversalDate },
  tx)` (`updateMany where { id, scope, deletedAt: null, status: { in: fromStatuses } }`, devolve a contagem) e `casCompleteCancelling(scope, id, data, tx)`
  (`where status: 'CANCELLING'`). Nenhum `prisma` no service. Teste de repo no SQLite real: 2ª chamada do CAS devolve 0.
- **0.4 `cancelPayable` reordenado (gate dentro da tx).** (i) gates de leitura atuais, **mais** os pré-cheques de F-CX-2 (período aberto na data do estorno; estoque suficiente para o desfazer) — nada mutou até aqui. Os dois
  pré-cheques são **métodos de leitura novos**, não existem hoje: `PostingService` tem só o preflight **privado** `assertPeriodOpen(scope, dateStr)` (:131, lê `periodRepo.findByYearMonth`;
  o autoritativo é `assertPeriodOpenTx`, dentro da tx) — o PR-0 o expõe como `PostingService.assertPeriodOpenFor(scope, date)`; e `InventoryService.canReverseStockForReceipt(scope, params)`
  (leitura de `findMovementsBySource` + saldo do item, a mesma régua do `decrementForCogs`, sem mutar; ler a régua no PR-0). **Resíduo nomeado:** o pré-cheque não é atômico com o desfazer
  (estoque vendido entre os dois) — ver F-CX-2; (ii) **tx**: re-lê o título, re-checa `OPEN` e ausência de baixa ativa, `casStartCancelling`,
  `auditService.append('payable.cancel_requested')`; contagem 0 ⇒ `ConflictError('TITULO_MUDOU_DURANTE_O_CANCELAMENTO')`; (iii) efeitos, na ordem de hoje: estoque,
  físico, `reverseEntry` (data = a persistida); (iv) `completePayableCancellation` (item 0.6). Falha em (iii) **não compensa**: o título fica `CANCELLING`, o
  `AppError` original sobe (código e status HTTP preservados) e o item 0.9 registra a pendência. Testes: crash simulado após o estoque ⇒ `CANCELLING`
  e estoque desfeito; segundo `cancelPayable` conclui sem 2º decremento, sem 2º estorno e com 1 `payable.cancelled`.
- **0.5 Retomada.** `cancelPayable` sobre `CANCELLING` **retoma** (não recusa, não exige o mesmo corpo): a `reversalDate`/`reason`/`cancelledById`
  **persistidos prevalecem** sobre o `dto` novo (a primeira intenção é a que vale). Sobre `CANCELLED`, devolve (idempotente, como hoje). Teste: retomada com
  `reversalDate` diferente usa a gravada.
- **0.6 `completePayableCancellation(scope, payable, reversalEntryId, reason)`** — compartilhado pelo `cancelPayable` e pelo reconcile (como
  `completePaymentCancellation`): tx única com `casCompleteCancelling` (`status: 'CANCELLED'`, `deletedAt`, rename `deletedDocumentNumber`), `payable.cancelled`
  (payload igual ao de hoje). Contagem 0 ⇒ idempotente (já concluído), sem 2º audit. **Resolve a pendência na mesma tx** (`ReconcilePendingRepository.resolvePending(scope, 'payable.cancel', id, tx)`, `updateMany` idempotente):
  concluir por **qualquer** caminho (retomada do usuário, reconcile manual `/reconcile`, job) fecha o item da bandeja; hoje só o `rescan` resolve (`ReconcilePendingService.rescan` :84-101). O mesmo vale
  para `completePaymentCancellation` (`payment.cancel`) e, no PR-1, para a conclusão de JCP/distribuição. Testes: duas conclusões concorrentes ⇒ 1 `payable.cancelled`; pendência aberta + retomada pelo usuário ⇒ `resolvedAt` preenchido, sem `rescan`.
- **0.7 `reconcilePayables`: guarda do passo 1 e o passo 1b.** Passo 1 **pula** `CANCELLING` (hoje só pula `CANCELLED`, :1210): sem isso, o
  ramo de compra de estoque (:1220-1286) re-recebe. Passo 1b novo: para cada título `CANCELLING` com `updatedAt` mais velho que o `grace` (item 2.4;
  no PR-0 o `grace` é parâmetro com padrão 0 para o teste), roda `driveCancelling`: replay do estoque (`reverseStockForReceipt` com a mesma `reversalEventId`),
  replay do físico, `reverseEntry` da recognition se existir (data persistida), `completePayableCancellation`. Erros: `reconcileBlockedCode` ⇒ `blocked` (e item
  0.9); demais ⇒ `failed`. `reversalsCompleted` conta os concluídos. Testes: (a) **título `CANCELLING` de compra de estoque não recebe estoque de novo no
  passo 1** (falharia hoje se só adicionássemos o estado); (b) estoque desfeito + razão intacto ⇒ conclui; (c) razão já estornado + período fechado ⇒ conclui (replay antes do gate);
  (d) recognition ausente (create pendurado) ⇒ conclui sem estorno.
- **0.8 Escritas novas recusam `CANCELLING`.** `registerPayment` (já recusa por `PAYABLE_SETTLEABLE_STATUSES`; teste de regressão), `receiveInventoryItems` (:677),
  `apropriarCreditoIbsCbs` (:901), `createPayment`/baixa do imposto (`WithholdingService`), `BankSettlementService` (:633) e edição de título: todos respondem
  `409 TITULO_EM_CANCELAMENTO` (`errorCode`). Um teste por escritor. Corrida `registerPayment` × `casStartCancelling`: só um vence (CAS).
- **0.9 `BLOCKED` determinístico vai à bandeja e alerta (`9d3e`, metade AP).** **Um só escritor da tabela:** `ReconcilePendingRepository.upsertPending`/`resolvePending` (o mesmo que o `reportPending`/`reportResolved`
  do job e o `rescan` usam; `upsertPending` **reabre** a linha resolvida e soma `attempts`, e a escrita toca `lastSeenAt @updatedAt`). O helper `recordPendingAndAlert(scope, item, { alert: 'permanent' | 'none' })` **não escreve
  por conta própria**: chama o repositório injetado e decide o alerta. "1ª captura" = a linha devolvida pelo upsert tem `alertedAt == null` ⇒ `sendAlertWebhook` + `alertedAt = agora` (`resolvePending`
  zera `alertedAt`, para um reaparecimento depois de resolvido alertar de novo). Nada de 2ª via de escrita no service. Chamado de `reconcilePayables` nos pontos que hoje só contam `blocked` por código determinístico: `PAYMENT_REVERSAL_INVARIANT_CODE`
  e `IMPOSTO_JA_RECOLHIDO` (`sourceType: 'payment.cancel'`, `sourceId: paymentId`), e do `driveCancelling` para o erro determinístico do estorno/estoque
  (`sourceType: 'payable.cancel'`, `sourceId: payableId`). Transitório (período fechado, estoque insuficiente que pode voltar) **também** registra pendência,
  com `reasonCode` transitório e sem alerta imediato. Testes: 1ª passada grava + alerta; 2ª passada **não** repete o alerta e `attempts` sobe; resolver marca `resolvedAt` e zera `alertedAt`; reaparecer depois de resolvido alerta de novo.
- **0.10 Alfabeto e registro.** `ReconcilePendingReasonCode` += `PAYMENT_REVERSAL_INVARIANT_VIOLATED`, `RECEIPT_REVERSAL_INVARIANT_VIOLATED`, `IMPOSTO_JA_RECOLHIDO`,
  `JCP_JA_PAGO` (poison, até a ação do operador) e `CANCEL_REDRIVE_FAILED` (transitório). Marca transitório × poison no mesmo lugar do `:17-30`. O guard
  `reconcilePendingReasonCodes.guard.test.ts` passa a conhecer os novos. `retryOneReconcilePendingItem` ganha os `sourceType` novos no despacho
  (`payable.cancel`, `payment.cancel`; PR-1 e F-AR-1 acrescentam os seus). Teste: guard verde.
- **0.11 Auditoria.** `auditCanonical.ts`: `payable.cancel_requested` na allowlist (payload `{ payableId, reversalDate, reasonPresent: boolean }` — **sem texto livre**
  além do que o `payable.cancelled` já carrega, para não criar campo com PII, memória `accounting-audit-allowlist-guards`). Teste do guard de allowlist.
- **0.12 Cabeçalho `atomicUntil` e teste por linha** (Contrato §2.3, AC-2.3-2: 5 linhas fixas, "commit 1 — razão", "commit 2 — subrazão: CAS A→B", reconcile, fora da tx): o JSDoc do `PayableService`
  (linhas 11-20) escreve o `cancelPayable` **dentro das cinco linhas, sem sexta**: `commit 1 — razão: reverseEntry (tx raiz do postEntry)`; `commit 2 — subrazão: CAS OPEN→CANCELLING gravado ANTES do commit 1
  (intenção durável, F-CX-2) e CANCELLING→CANCELLED depois`; `reconcile — passo 1b`. Cada linha aponta o teste do 0.4/0.7, e os 3 testes do AC-2.3-2 (gate falha na tx ⇒ nada persiste; commit 2 falha ⇒ razão
  intacto e reconcile converge; reconcile 2× idempotente **asserindo a 2ª chamada**). O CAS de intenção **não** viola o AC-2.3-1 (é CAS com `tx` propagado, não "mesma tx", não compensação por `try/catch`+delete);
  a compensação `CANCELLING→OPEN` do ramo (b) do F-CX-2 é a que o AC-2.3-1 proíbe na letra. `atomicUntil.boundary.test.ts` roda no PR (insumo 2).
- **0.13 Leituras (conforme F-CX-3).** Aplicar a escolha da tabela do F-CX-3 em `findOutstanding`, `findPisCofinsCredits`, `findIbsCbsCredits`, relatórios que
  listam por `status`; teste por superfície com um título `CANCELLING`.

### PR-1 — JCP e distribuição de lucros

- **1.1 Estado.** `CANCELLING` nas constantes de status de `InterestOnEquityCalculation` e `ProfitDistributionEvent` (insumo ausente 5 diz onde moram); **sem DDL**
  (`String`). `JCP.cancelledById` e `PD.cancelledById/cancelReason` já existem; o JCP não tem `cancelReason` e **não ganha** (o motivo é fixo no texto do estorno).
- **1.2 Repositório.** `casStartCancelling(owner, id, actor[, motivo], tx)` (`POSTED → CANCELLING`, `where status: 'POSTED'`) em ambos; `markCancelled` passa a exigir
  `status: 'CANCELLING'` (hoje `POSTED`, `InterestOnEquityRepository.ts:121-127`).
- **1.3 `cancel()` reordenado, gate na tx.** (i) `assertCancelavel` **e** `casStartCancelling` **na mesma tx** (o gate é autoritativo dentro da tx, server/CLAUDE.md
  gate 5) + `jcp.cancel_requested`/`profit_distribution.cancel_requested`; (ii) `reverseEntry` (`dataCredito` / `dataEvento`, razão idempotente); (iii) tx de conclusão: arquivar as
  linhas `system` do Lalur (JCP; já idempotente por `e.deletedAt`), `markCancelled` a partir de `CANCELLING`, audit `JCP_CANCELLED`/`PROFIT_DISTRIBUTION_CANCELLED` (payload igual).
  JCP já pago (`JCP_JA_PAGO`) continua **409 antes de qualquer estorno** (hoje também). Teste por serviço: crash entre (ii) e (iii) ⇒ `CANCELLING`; reconcile conclui sem 2º estorno.
- **1.4 A 2ª `assertCancelavel` (JCP :255) deixa de ser perigosa.** Hoje ela pode lançar `JCP_JA_PAGO` com o razão já estornado e o JCP `POSTED`. Na conclusão do `CANCELLING`
  o erro vira `recordPendingAndAlert('jcp.cancel', 'JCP_JA_PAGO', permanent)` + alerta, **sem** desfazer o estorno; a linha fica `CANCELLING` até o operador estornar a baixa (F-CX-2 a) e **repetir o cancelamento** (retomada, item 1.5) ou chamar `rescan` (manual). **O job não a retoma** (poison, item 2.3).
  Teste: baixa lançada entre o estorno e a conclusão ⇒ pendência poison, nenhum `CANCELLED`, nenhum 2º estorno.
- **1.5 Retomada.** `cancel()` sobre `CANCELLING` retoma (data e motivo da linha); sobre `CANCELLED`, devolve a view (hoje levanta `JCP_NAO_POSTADO`; **muda para idempotente** só se o dono
  quiser — ver F-CX-2, pergunta derivada; o padrão é manter o 409 de hoje). Teste.
- **1.6 Guardas de estado em quem lê.** `InterestOnEquityService.reconcileLancamento` só devolve a view quando `CANCELLED` (:233); com `CANCELLING` **também devolve sem `lancar`**
  (senão relançaria o lançamento de um JCP em cancelamento). `ProfitDistributionService.reconcileLancamento` já sai se `status !== 'PENDING_POST'` — teste de regressão. A regra "só o
  ÚLTIMO evento `POSTED` do `taxId`" (PD `assertCancelavel`) trata `CANCELLING` como ainda o último: **não** libera o cancelamento do anterior. Teste.
- **1.7 Leituras (F-CX-3).** `listDaCompetencia(..., ['PENDING_POST','POSTED'])` (JCP :276) e `STATUS_QUE_SOMAM` (PD) conforme a escolha do F-CX-3; teste de `irrfMensal` com um
  evento `CANCELLING`.
- **1.8 Auditoria + alfabeto.** eventTypes novos na allowlist (`jcp.cancel_requested`, `profit_distribution.cancel_requested`, mesmo formato do 0.11); `sourceType` `jcp.cancel` e
  `profit_distribution.cancel` no despacho do `retryOneReconcilePendingItem`; método público `redriveCancelling(scope, id)` em cada serviço (o que o job chama; **sem rota nova**).
  Teste por serviço do método.

### PR-2 — o job de re-drive (`aaf4`, `72d3`, `77aa`)

- **2.1 Re-drive por item, sem mudar o comportamento.** `reconcilePayables`/`reconcileReceivables` passam a iterar sobre métodos públicos `redriveOne*` (um por título/pagamento/recibo:
  reconhecimento ausente, liquidação ausente + finalize, direção reversa, `CANCELLING`); a assinatura e o retorno dos dois `reconcile*` **não mudam**. O mesmo `redriveOne*` é o que o job chama.
  Teste: a suíte de `SubledgerReversalAtomicity.integration.test.ts` e os testes do reconcile passam sem edição (prova de não-regressão do refator).
- **2.2 Finder de candidatos.** Por driver, 1 consulta nos repos (nunca `findAllActive`): títulos `PAYING` (AP) / `RECEIVING` (AR) com `updatedAt < agora − grace`; `CANCELLING` (AP, JCP, distribuição) com
  `updatedAt < agora − grace`; pagamentos/recibos `ACTIVE` cujo lançamento de liquidação está `Reversed` (insumo ausente 4 — forma da consulta). Cada driver devolve `{ scope, kind, id }`.
- **2.3 Rodízio, teto, bandeja.** Por passada e por driver: candidatos **sem** pendência ⇒ upsert (primeiro registro, `firstSeenAt`); depois os pendentes **transitórios** ordenados por
  `lastSeenAt asc` (rodízio), `take TETO`; cada tentativa que não resolve chama `upsertPending` (a escrita **toca** `lastSeenAt` e soma `attempts` — adia o item que não sai); a que resolve chama
  `resolvePending`. Pendência com `reasonCode` poison **não entra** (`motivo permanente não é re-tentado`). Testes no SQLite real: "N parados + 1 novo" (o novo é tentado na passada) e
  "1 antigo + N novos" (o antigo não some do rodízio); item poison tentado 0 vezes.
- **2.4 Parâmetros** (`readMsEnv`, inválido lança — BRD F-71.1): `SUBLEDGER_REDRIVE_INTERVAL_MS` (300 000), `SUBLEDGER_REDRIVE_INITIAL_DELAY_MS` (90 000), `SUBLEDGER_REDRIVE_GRACE_MS` (120 000, o de
  `DFE_POLL_AFTER_MS`: dá tempo do caminho feliz terminar), `SUBLEDGER_REDRIVE_MAX_PER_PASS` (50 por driver), `SUBLEDGER_REDRIVE_ALERT_AGE_MS` (3 600 000 para dinheiro preso). Direto, ajustável por env.
- **2.5 Alerta por idade.** (A coluna `alertedAt` já veio no PR-0, item 0.1.) Pendência transitória com `firstSeenAt < agora − ALERT_AGE` e `alertedAt` nulo (ou mais velho
  que 24 h) ⇒ `sendAlertWebhook({ source: 'subledger_redrive', event: 'stuck_item_aged', … })` e `alertedAt = agora`. Poison alerta na 1ª captura (item 0.9). **Sem PII** no payload (ids, `sourceType`,
  `reasonCode`, idade). Teste: passa o tempo ⇒ 1 alerta; mais uma passada ⇒ nenhum; 24 h depois ⇒ outro.
- **2.6 Scheduler.** `SubledgerRedriveScheduler.ts` + `subledgerRedrive.job.ts` (fiação de produção, Prisma-direto, regra J1/`lib/factory`), no molde do `AccountingSyncScheduler`/`DfePollScheduler`
  (lock process-local, `runOnce`, `genRunId`, `alert` injetado, eventos do catálogo `job.*`). `server.ts`: `start()` ao subir, `stop()` ao desligar. `schedulerFailureAlert.test.ts` ganha o caso
  `{ file: 'SubledgerRedriveScheduler.ts', source: 'subledger_redrive', … }` (o teste que descobre arquivos **reprova** sem ele). Runbook `docs/runbooks/accounting-sync-reconciliation.md` ganha o job e o aviso do lock.
- **2.7 `aaf4` — itens transitórios da bandeja (driver D5).** O job chama `ReconcilePendingService.rescan(scope, { ids })` para os itens com `reasonCode` transitório
  (`ACCOUNTING_PERIOD_NOT_OPEN`, `OPENING_ENTRY_MISSING`, `PACKAGE_CONSUMPTION_PENDING`, `NO_MAPPER_FOR_UNIT`, `PACKAGE_EXPIRY_NFSE_PENDING`, `FAILED` com teto de `attempts`), no mesmo rodízio/teto — **sem reimplementar** o
  núcleo (`retryOneReconcilePendingItem`, Fork 2-c do C7). `rescan` continua dono da escrita auditada. Teste da lacuna: item `ACCOUNTING_PERIOD_NOT_OPEN` capturado, período reaberto, **próximo tick resolve sem rescan manual**.
- **2.8 `77aa` — emitir o evento sob o recibo em trânsito, sem encalhar o título.** Fatos lidos: `registerPayment` (:843-845) e `registerReceipt` (:329-334) ligam `entryId` **e** fazem o CAS
  `finalizeIfPaying`/`finalizeIfReceiving` na **mesma tx**; logo "ainda sem `entryId` ligado" (`needsEntryLink`) identifica o pagamento/recibo em trânsito. Mas a iteração de um pagamento **já ligado**
  também destrava um título que ficou `PAYING`/`RECEIVING` quando o item em trânsito foi estornado com saldo > 0 (`completePaymentCancellation` :1154-1172 deixa o status por desenho): "só `needsEntryLink`
  finaliza" **encalharia esse título para sempre**. Desenho: o passo 2 roda em **duas fases**. Fase A: pagamentos/recibos com `needsEntryLink` — liga, CAS e **emite o evento com o próprio id** (o evento
  certo). Fase B: os já ligados — só o **CAS de recálculo** (`finalizeIfPaying`/`finalizeIfReceiving`) quando o título ainda está `PAYING`/`RECEIVING`, **sem** emitir `settlement_registered` (a transição foi
  consequência do estorno, que já tem `payable.settlement_cancelled`/`receivable.settlement_cancelled`). A fase A vem **antes** da B para a B não consumir o CAS que a A emitiria. Testes: (a) título
  `PARTIALLY_*` com R1 finalizado + R2 em trânsito ⇒ evento com o id de **R2** (hoje sai com o de R1); (b) R2 em trânsito estornado pela direção reversa com saldo > 0 ⇒ título sai de `PAYING`/`RECEIVING` para
  `PARTIALLY_*` **sem** `settlement_registered`; (c) a ordem de leitura (R1 antes/depois de R2) não muda o resultado.
- **2.9 `72d3` — prova.** Teste do job: título `PAYING` com liquidação já postada sai `PAID` após **um tick**, sem chamada HTTP; título `RECEIVING` idem. A rota manual (`POST /payables/reconcile`,
  `/receivables/reconcile`) continua e continua testada (regressão).
- **2.11 (F-RD-3 (b), ratificado) Driver JCP/distribuição `PENDING_POST`.** `reconcileLancamento` de cada serviço (já idempotente, read-first) vira driver com finder `status = 'PENDING_POST'` e `updatedAt < agora − grace`;
  `sourceType` `jcp.lancamento`/`profit_distribution.lancamento`; mesmo rodízio e teto. Teste: JCP `PENDING_POST` com o lançamento já no razão sai `POSTED` após um tick, sem HTTP.
- **2.10 Sem mudança de escopo.** Nenhuma rota, DTO, i18n ou tela nova.

---

## 4. Contratos (esboço materializável)

### 4.1 Migrações

```sql
-- PR-0 (dois arquivos)
ALTER TABLE "payables" ADD COLUMN "cancelReversalDate" TEXT;            -- 'YYYY-MM-DD' | NULL
ALTER TABLE "reconcile_pending_items" ADD COLUMN "alertedAt" DATETIME;  -- NULL = sem alerta de idade enviado
```

### 4.2 Estados

```ts
// Payable.model.ts
export const PAYABLE_STATUSES = ['OPEN','PARTIALLY_PAID','PAYING','PAID','CANCELLING','CANCELLED','DEFERRED'] as const;
export const PAYABLE_TRANSITIONS = {
  OPEN: ['PAYING','DEFERRED','CANCELLING','CANCELLED'],          // CANCELLED direto só pelo compensateFailedRecognition, que não passa por aqui
  PARTIALLY_PAID: ['PAYING','OPEN','CANCELLING','CANCELLED'],    // CANCELLING só no ramo F-CX-1 a
  PAID: ['PARTIALLY_PAID','OPEN','CANCELLING','CANCELLED'],
  CANCELLING: ['CANCELLED'],                                      // F-CX-2 a: só para frente
  // …
} as const satisfies TransitionTable<PayableStatus>;
// JCP / distribuição: PENDING_POST | POSTED | CANCELLING | CANCELLED
```

### 4.3 Repositório e serviço (assinaturas)

```ts
// IPayableRepository
casStartCancelling(scope: AccountingScope, id: string,
  data: { fromStatuses: readonly PayableStatus[]; cancelledById: string; cancelReason: string | null; cancelReversalDate: string },
  tx: Prisma.TransactionClient): Promise<number>;
casCompleteCancelling(scope: AccountingScope, id: string,
  data: { deletedAt: Date; documentNumber: string }, tx: Prisma.TransactionClient): Promise<number>;
findCancellingOlderThan(scope: AccountingScope, olderThan: Date, take: number): Promise<Payable[]>;

// PayableService (públicos novos; privados do cancelamento)
redriveCancelling(scope: AccountingScope, payableId: string): Promise<{ outcome: 'completed' | 'still_pending' | 'blocked'; code?: string }>;
private completePayableCancellation(scope, payable: Pick<Payable,'id'|'documentNumber'>, reversalEntryId: string | null, reason: string | undefined): Promise<Payable>;
private driveCancelling(scope, payable: Payable): Promise<{ outcome: 'completed' | 'still_pending' | 'blocked'; code?: string }>;
```

### 4.4 Bandeja de pendências (reuso, sem tabela nova)

| `sourceType` | `sourceId` | Driver | `reasonCode` (transitório ⟂ poison) |
|---|---|---|---|
| `payable.cancel` | `payableId` | AP `CANCELLING` | transitório: `ACCOUNTING_PERIOD_NOT_OPEN` (período fechado), `CANCEL_REDRIVE_FAILED` (estoque insuficiente e demais) · poison: `IMPOSTO_JA_RECOLHIDO` |
| `payment.cancel` | `paymentId` | AP, direção reversa | poison: `PAYMENT_REVERSAL_INVARIANT_VIOLATED`, `IMPOSTO_JA_RECOLHIDO` |
| `receipt.cancel` (F-AR-1) | `receiptId` | AR, direção reversa | poison: `RECEIPT_REVERSAL_INVARIANT_VIOLATED` |
| `jcp.cancel` | `calculationId` | JCP `CANCELLING` | transitório: `ACCOUNTING_PERIOD_NOT_OPEN`, `CANCEL_REDRIVE_FAILED` · poison: `JCP_JA_PAGO` |
| `profit_distribution.cancel` | `eventId` | distribuição `CANCELLING` | transitório igual · poison: nenhum novo |
| `subledger.settlement` | `payableId`/`receivableId` | título `PAYING`/`RECEIVING` preso | transitório: `CANCEL_REDRIVE_FAILED` (o nome ficou de cancelamento; um `REDRIVE_FAILED` neutro é detalhe de nome do PR-0, não fork) |

### 4.5 Job

```ts
export interface SubledgerRedriveSummary {
  scanned: number; resolved: number; stillPending: number; skippedPermanent: number;
  aged: number; alerted: number; failed: number;
  byDriver: Record<'ap_cancelling'|'ap_paying'|'ar_receiving'|'reverse_direction'|'jcp_cancelling'|'pd_cancelling'|'pending_transient', number>;
}
export async function runSubledgerRedrive(deps?: Partial<SubledgerRedriveDeps>): Promise<SubledgerRedriveSummary>;
// scheduler: new SubledgerRedriveScheduler({ run?, log?, genRunId?, now?, alert? })  // AlertPayload.source = 'subledger_redrive'
```

Alerta (sem PII): `{ source: 'subledger_redrive', event: 'stuck_item_aged' | 'blocked_permanent' | 'job_failed', sourceType, reasonCode, ageMs, timestamp }`.

---

## 5. Forks — RATIFICADOS (dono, chat, 25/11)

A recomendação é a estrutural (D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL). Esta sessão não ratificou nenhum fork; o dono ratificou as 8 recomendadas em 25/11 (coluna Fork). **Não** reabro as quatro respostas da cédula (estado persistido, `BLOCKED` persistido com alerta, scheduler com teto, ordem PR-0/PR-1).

| Fork | Evidência | Caminhos | Recomendação | Trava |
|---|---|---|---|---|
| **F-CX-1 — RATIFICADO (a), dono 25/11** As retenções do reconhecimento entram no `CANCELLING`? | Fato 12: `estornarRetencoesDoReconhecimento` (:550-571) estorna as baixas sem caixa da retenção no razão (commit 1) e só depois a tx do subrazão, **antes** de `cancelPayable` chegar ao estorno do título. Crash entre elas converge só se o usuário repetir. É o mesmo furo de `69c7`, numa 2ª camada do mesmo método | **(a)** o `CANCELLING` abre antes das retenções: `fromStatuses = OPEN|PARTIALLY_PAID|PAID` (só se todas as baixas ativas são de retenção); o `driveCancelling` repete `reverterLancamentosDeRetencao` (idempotente) e `reverterNaTx` na tx de conclusão. **(b)** PR-0 deixa a retenção antes do CAS, como hoje, e a lacuna do 2º commit dela vai à caixa. **(c)** igual (b) e as retenções ganham o próprio `CANCELLING` de baixa (mais estado) | **(a).** Fecha o método inteiro numa mudança e o reconcile cobre o que o usuário não repetiu. Custo: a tabela de transições e o teste de retenção (item 0.4/0.7) crescem; é a única versão em que `cancelPayable` não tem um commit 1 sem marca. A **versão incremental** é (b) com a lacuna aberta, nomeando o que deixa aberto: título com retenção estornada no razão e título ainda vivo | itens 0.2, 0.3, 0.4, 0.7 |
| **F-CX-2 — RATIFICADO (a), dono 25/11** Falha depois do `CANCELLING`: para frente, para trás, ou rota | Fato 1: depois do estoque desfeito não existe volta sem re-receber. Fato 9: o `JCP_JA_PAGO` pode aparecer depois do estorno. Contrato AC-2.3-1: *"Proibido … compensar com `try/catch` + delete"* | **(a)** só para frente: a linha fica `CANCELLING`, o `AppError` original sobe, o job re-tenta, e o operador remove a causa (reabre o período, estorna a baixa). **Pré-cheques de leitura** (período aberto, estoque suficiente, imposto não recolhido) rodam **antes** do CAS para o `CANCELLING` evitável quase não acontecer. **Resíduo nomeado, que (a) deixa aberto:** estoque vendido entre o pré-cheque e o desfazer (os dois não são atômicos) deixa o título `CANCELLING`, sem baixa possível (item 0.8), sem volta; o alerta por idade o expõe e a saída é repor o estoque. **(b)** compensação estreita: só quando o **1º efeito** (o desfazer do estoque, uma tx que ou muta tudo ou lança) falha de forma determinística — nada mutou — `CANCELLING → OPEN` por CAS, numa transição só desse caminho; elimina o resíduo, mas é compensação e o AC-2.3-1 a proíbe na letra (precisaria de emenda). **(c)** rota explícita "reabrir cancelamento", permitida só com razão e estoque intactos (rota nova e tela: rule 5) | **(a)** + pré-cheques. A **versão incremental** que fecha o resíduo é (b) com a emenda do AC-2.3-1, ou (c) numa fatia depois; ambas deixam o `CANCELLING → OPEN` na tabela de transições. Pergunta derivada (**não levada ao dono; vale o padrão: manter o 409**): `cancel()` de JCP/distribuição já `CANCELLED` dá 409 (`JCP_NAO_POSTADO`) e continua dando. | itens 0.2, 0.4, 0.7, 1.4, 1.5 |
| **F-CX-3 — RATIFICADO (a), dono 25/11** `CANCELLING` é título vivo ou morto para leitura? | Fato 6: `not CANCELLED` (créditos PIS/COFINS e IBS/CBS) o conta como vivo **sem decisão**; `findOutstanding`/settleable o excluem. JCP/PD: `listDaCompetencia`/`STATUS_QUE_SOMAM` alimentam o DARF de IRRF | **(a)** vivo para toda leitura **fiscal e de razão** (crédito de imposto, DARF de IRRF, tie-out) até virar `CANCELLED`; **morto** para toda **escrita nova** (baixa, recebimento de estoque, edição, novo cancelamento); `findOutstanding` inclui `CANCELLING` com o saldo, sem ações. **(b)** morto para tudo (some de aging e de DARF assim que o CAS grava). **(c)** vivo só para o que a lei lê; operacional morto | **(a).** O estado é transitório (segundos) e, quando trava, o razão ainda contém o passivo/IRRF até o estorno; esconder da leitura fiscal antes do estorno faria o relatório divergir do razão. (b) é o mais simples e deixa um DARF/crédito subdeclarado enquanto o item está preso. Não há norma que decida: é escolha operacional (§6) | itens 0.13, 1.7 |
| **F-DR-1 — RATIFICADO (a), dono 25/11** Onde mora o `BLOCKED` persistido e a escrituração do job | Fatos 8-9: `ReconcilePendingItem` já tem `firstSeenAt`, `lastSeenAt @updatedAt`, `attempts`, `reasonCode` transitório×poison, `resolvedAt`, `rescan`; a cédula pediu *"rodízio por `updatedAt`, teto, alerta por idade"* e *"motivo permanente não é re-tentado"*, que são exatamente esses campos | **(a)** reuso da bandeja (+1 coluna `alertedAt`): poison = `BLOCKED` persistido e visível na tela de pendências já existente; transitório = fila do job. Linhas de pagamento/recibo não mudam. **(b)** colunas por tabela (`blockedAt`, `blockedCode`, `redriveAttempts`, `nextRedriveAt`, `alertedAt`) em 6 tabelas: Payable, PayablePayment, Receivable, Receipt, JCP, PD (6 migrações). **(c)** status `BLOCKED` no pagamento/recibo | **(a).** É o canônico (Critério de reuso: mesmo objeto, vivo dos dois lados) e tira o `BLOCKED` das linhas de dinheiro. (c) é o pior: o status `ACTIVE` é lido por `SUM`/CAS que mantêm `paidCents`; tirar o pagamento de `ACTIVE` quebra o invariante. (b) copia o desenho 6 vezes e deixa as telas sem lugar único para o operador | itens 0.9, 0.10, 2.3, 2.5 |
| **F-AR-1 — RATIFICADO (a), dono 25/11** A metade AR do `9d3e` e o espelho do `cancelReceivable` | Cédula: etapas só citam AP e JCP/PD. `ReceivableService.completeReceiptCancellation` tem o mesmo `BLOCKED` não persistido; `cancelReceivable` não tem o furo do estoque (§1, fato 1) | **(a)** o `BLOCKED` do AR entra no **PR-0** (mesmo helper, 1 chamada em `reconcileReceivables`, `sourceType: 'receipt.cancel'`); `cancelReceivable` **não** ganha `CANCELLING`. **(b)** igual a (a) mas num PR-0b separado, depois do PR-0. **(c)** o AR espelha tudo (`CANCELLING` em `Receivable`) | **(a).** O desenho do `BLOCKED` é um só e o AR é o consumidor mais simples; sem o AR, a bandeja nasce assimétrica. O espelho `CANCELLING` no AR não tem o que fechar: antes do estorno não há efeito, então o re-drive por leitura do razão já converge; (c) é mais estado em `Receivable` sem ganho de detectabilidade. (b) é válida se o PR-0 ficar grande | itens 0.9, 0.10 |
| **F-RD-1 — RATIFICADO (a), dono 25/11** Unidade de trabalho do job: item ou escopo | Fato 10 + rodízio por item; `reconcilePayables`/`reconcileReceivables` varrem o escopo **inteiro** (`findAllActive`), e `ReconcileSummary` só tem contadores | **(a)** por item: refator `redriveOne*` (item 2.1) + finder por driver, sem mudar a assinatura dos `reconcile*`. **(b)** por escopo: o job chama `reconcilePayables(scope)` nos escopos com candidato, teto = nº de escopos | **(a).** É a única que mede "alerta por idade" e "motivo permanente" **por item**, e o `77aa` (2.8) cai no mesmo refator. (b) é menor e não consegue o teto por item que a cédula pede (um escopo grande é uma passada inteira) | itens 2.1-2.3 |
| **F-RD-2 — RATIFICADO (a), dono 25/11** Onde o job roda | `AccountingSyncScheduler` roda com marca d'água e `ReconcileSummary` próprios; o `72d3` sugeriu *"o tick … ou job próprio via lib/factory"* | **(a)** job e scheduler próprios (`SubledgerRedriveScheduler`). **(b)** nova passada dentro do tick do `AccountingSyncScheduler`, fora do `reduce` (como o check físico e o vencimento de pacote) | **(a).** Cadência, teto e alerta de falha independentes; o tick de sync não segura a marca d'água por causa de um re-drive e vice-versa. Custo: +1 scheduler no `server.ts`, no teste de alerta e no runbook. (b) é válida e evita o arquivo novo, mas mistura duas políticas de teto no mesmo lock | item 2.6 |
| **F-RD-3 — RATIFICADO (b), dono 25/11** Quais `reconcile*` só-por-rota entram como driver agora | Li: `InterestOnEquityService.reconcileLancamento` (`interestOnEquityController.ts:79`), `ProfitDistributionService.reconcileLancamento` (`profitDistributionController.ts:79`) e `TaxAssessmentService.reconcileProvisao` (`taxAssessmentController.ts:97`) têm **só** chamador de rota; `grep reconcileProvisao|reconcileLancamento server/src/jobs`: vazio. A `72d3` cita as apurações; a cédula decidiu o scheduler, não a lista | **(a)** só os drivers do §4.4 (AP, AR, `CANCELLING` ×3, bandeja); JCP/distribuição `PENDING_POST` e apurações viram fatia própria (lacuna `L-20261125-110303-8ec2`). **(b)** os de **JCP/distribuição `PENDING_POST` entram** (item 2.11; os serviços estão abertos no PR-1 e li o método); apurações ficam fora. **(c)** tudo, com `TaxAssessmentService` como driver 7 | **(b).** O `reconcileLancamento` de JCP/distribuição é o mesmo débito (item preso só volta por rota) no serviço que o PR-1 já altera, e custa 1 finder + 1 teste; as apurações são outro nó e outro serviço que **não li** a fundo (insumo 7). O registro de drivers (2.2) aceita o 7º sem refator | itens 2.2, 2.3, 2.11 |

---

## 6. Pendente de validação externa

Nenhuma regra contábil, fiscal ou legal nova entra no checklist. A única escolha com efeito fiscal (F-CX-3: o que o crédito de PIS/COFINS, o de IBS/CBS e o DARF de IRRF leem enquanto o item está `CANCELLING`) **não tem artefato normativo** que a decida — nenhuma norma trata de estado transitório de sistema — e por isso é fork do dono, não pendência de contador. Se o dono quiser, a pergunta ao contador seria: *"Enquanto um título ou evento está em cancelamento e o estorno ainda não foi lançado, o crédito/IRRF dele conta no período?"*; a resposta só importa se o estado travar (a recomendação mantém o valor contado, o lado conservador para o crédito a menos e o do IRRF a mais).

## 7. Insumos ausentes

1. **Régua de saldo do `decrementForCogs`** (item 0.4 i): `InventoryService.canReverseStockForReceipt` replica a condição que o `decrementForCogs` aplica em `reverseStockForReceipt`; não li o repositório de estoque. O PR-0 abre lendo-o.
2. **`atomicUntil.boundary.test.ts`** (item 0.12): li o Contrato §2.3 (5 linhas fixas); não li o teste que o executa. O PR-0 o lê antes de escrever o cabeçalho; se ele recusar o CAS de intenção na linha do commit 2, o PR-0 propõe a emenda de texto (não é fork).
3. **Escritores que recusam `CANCELLING`** (item 0.8): li `registerPayment` e `PAYABLE_SETTLEABLE_STATUSES`; **não** li `receiveInventoryItems` (:677), `apropriarCreditoIbsCbs` (:901) nem `WithholdingService` por inteiro. O item 0.8 é "teste primeiro, depois corrige o que passar".
4. **Forma do finder do sentido reverso** (item 2.2): a relação Prisma entre `PayablePayment.entryId`/`ReceivableReceipt.entryId` e o lançamento `Reversed` não foi lida; pode ser relação, `entryId IN (...)` em lotes ou `$queryRaw`. A escolha é do PR-2 (e do teste no SQLite real).
5. **Onde moram as constantes de status do JCP e da distribuição** (item 1.1): vi os literais `PENDING_POST|POSTED|CANCELLED` nos comentários do schema e nos serviços, não a constante exportada.
6. **`SubledgerReversalAtomicity.integration.test.ts`** foi lido só pelos nomes que os cabeçalhos citam; o refator do item 2.1 depende de ele continuar passando sem edição.
7. **Policies com o escopo interno do job** (`resolveAccountingScopeInternal`, ator = dono): o `reconcileInventory` o usa, mas não li a política do AP/AR/JCP/PD para esse ator. O PR-2 abre com um teste de política.
8. **Front:** só localizei por `grep` onde `PARTIALLY_PAID` aparece (§8); não li o painel.
9. **Nó e write-set no vault:** esta cédula não tem nota em `docs/plano/nos/`. O frontmatter `write_set`/`registros` fica para o maestro apontar o nó (ou criá-lo) quando houver `executa`; o §9 é o rascunho.

## 8. Achados fora de escopo (na caixa)

- `L-20261125-110302-e397` (feature): FE-INCR — o painel de AP e as telas de JCP/distribuição não conhecem `CANCELLING` nem os `sourceType` novos da bandeja; o tipo gerado ganha a união e qualquer `Record<Status, …>` quebra o `tsc`.
- `L-20261125-110303-8ec2` (débito, `--pai 72d3`): o resíduo da `72d3` — `reconcileProvisao`/`reconcileLancamento` das apurações (e a depreciação) continuam só por rota; fora deste BRIEF pelo F-RD-3.

## 9. Write-set

| PR | Edita / cria |
|---|---|
| PR-0 | `server/prisma/schema.prisma`; `server/prisma/migrations/2026112500xxxx_add_payable_cancel_reversal_date/migration.sql` e `…_add_reconcile_pending_alerted_at/migration.sql` (novos); `server/src/features/accounting/services/{PostingService,InventoryService}.ts` (os 2 pré-cheques de leitura do item 0.4); `server/src/features/accounting/models/Payable.model.ts`; `server/src/features/accounting/dtos/PayableDto.ts`; `server/src/features/accounting/dtos/ReconcilePendingDto.ts`; `server/src/features/accounting/repositories/{IPayableRepository,PayableRepository,ReconcilePendingRepository}.ts`; `server/src/features/accounting/services/{PayableService,ReceivableService,WithholdingService,BankSettlementService}.ts` (os dois últimos só se o item 0.8 achar buraco); `server/src/features/accounting/services/reconcilePendingRecorder.ts` (novo, helper do item 0.9); `server/src/jobs/accountingSyncReconcile.job.ts` (despacho do `retryOneReconcilePendingItem`); `server/src/features/accounting/audit/auditCanonical.ts`; `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json`; `my-app/types/contracts/accounting/PayableDto.gen.ts`; `server/src/**/__tests__/{PayableService.cancelling,SubledgerReversalAtomicity,reconcilePendingReasonCodes.guard}*.test.ts` |
| PR-1 | `server/src/features/accounting/services/{InterestOnEquityService,ProfitDistributionService}.ts`; `server/src/features/accounting/repositories/{InterestOnEquityRepository,ProfitDistributionRepository}.ts` (+ interfaces); `server/src/features/accounting/models/**` (constantes de status dos dois, insumo 5); `server/src/features/accounting/audit/auditCanonical.ts`; `server/src/jobs/accountingSyncReconcile.job.ts` (despacho); `server/src/**/__tests__/{InterestOnEquity,ProfitDistribution}*.test.ts` |
| PR-2 | `server/src/jobs/{SubledgerRedriveScheduler,subledgerRedrive.job}.ts` (novos); `server/src/server.ts`; `server/src/lib/factory.ts`; `server/src/features/accounting/services/{PayableService,ReceivableService,ReconcilePendingService,InterestOnEquityService,ProfitDistributionService}.ts`; `server/src/features/accounting/repositories/{PayableRepository,ReceivableRepository,ReconcilePendingRepository,InterestOnEquityRepository,ProfitDistributionRepository}.ts`; `server/src/jobs/__tests__/{schedulerFailureAlert,subledgerRedrive}*.test.ts`; `docs/runbooks/accounting-sync-reconciliation.md` |

**Choke points (PAR-001):** `server/prisma/schema.prisma` (PR-0), `server/src/lib/factory.ts` (PR-0, injeção do repositório de pendências no `PayableService`, e PR-2), `server/src/server.ts` (PR-2),
`server/src/features/accounting/audit/auditCanonical.ts` (PR-0 e PR-1), `server/src/features/accounting/dtos/ReconcilePendingDto.ts` (PR-0, o alfabeto),
`server/src/jobs/accountingSyncReconcile.job.ts` (PR-0, PR-1). **Dois PRs mexem em `PayableService.ts` e `ReceivableService.ts`** (PR-0 e PR-2): na integração, em série.
