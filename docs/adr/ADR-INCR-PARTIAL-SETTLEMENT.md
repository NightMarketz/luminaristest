# ADR-INCR-PARTIAL-SETTLEMENT — Baixa parcial em Contas a Pagar / Contas a Receber

- **Data:** 2026-09-07
- **Status:** **Proposed — forks RATIFICAÇÃO PENDENTE.** Este ADR não decide fork nenhum; apresenta
  opções + recomendação do par para o dono ratificar fork-a-fork (via `AskUserQuestion`). **Nunca
  Accepted por este documento.**
- **Autores:** par `luminaris-orchestrator` + `luminaris-accounting-architect`. Parecer de domínio
  separado (arquivo próprio do arquiteto contábil) complementa este ADR e não está fundido aqui.
- **Depende de:** nenhum nó de código aberto (grafo `F3`: `ready`, zero aresta de entrada). Consome
  evidência de `ADR-INCR-AP-accounts-payable.md`, `ADR-INCR-AR-accounts-receivable.md`,
  `ADR-INCR-AP-AR-AGING.md` e `ADR-INCR7-bank-reconciliation.md` (já `Accepted`/mergeados).
- **Nó do master map:** rodada 8 do `docs/accounting/PLANO-SDD-SEQUENCIAL-2026-09-07.md` (nó **F3**
  do `docs/accounting/GRAFO-DEPENDENCIAS-2026-09-07.md`); item **F-M3** (escopo máximo do financeiro)
  e item **14** de `docs/accounting/CEDULA-DECISAO-2026-09-03-modulos.md` §C.2 ("rejeitada
  explicitamente hoje"). Autorização citável: `CEDULA-DECISAO-2026-09-03-modulos.md` §E.2 linha F3 +
  §C.2 item 14. **A cédula autoriza este ADR, não a implementação** ("NÃO autoriza implementar
  F3/F5/X7/X8/X9/X10/C8 sem ADR ratificado fork-a-fork").

## TLDR (2 linhas)

A baixa parcial hoje é **rejeitada por design** (`amountCents !== remaining` → `ValidationError`, é o
guard MVP F2 documentado no AP/AR), e o schema **já é 1:N** na tabela filha (`PayablePayment`/
`ReceivableReceipt` sem `@@unique` de cardinalidade) — a decisão real não é "criar uma tabela nova",
é **relaxar o guard de igualdade para `≤ saldo`** e trocar o gate atômico de status (`OPEN→PAYING→PAID`,
transição única) por um **gate de soma** (`Σrecibos_ativos + novo ≤ amountCents`, re-checado dentro da
tx), com um novo status intermediário — e então propagar "saldo, não total" para aging, CAS/reconcile
e tie-out, que hoje assumem full-only em pontos nomeados (§1).

## 1. Evidência de código (CBM-001 — grau por linha)

| Claim | Grau | Evidência |
|---|---|---|
| Baixa parcial é rejeitada hoje por guard explícito de igualdade — não é lacuna, é decisão MVP ativa | verificado | `PayableService.ts:415-423` (`registerPayment`: `if (dto.amountCents !== remaining) throw new ValidationError('Pagamento parcial não é suportado: informe o saldo integral...')`); espelho `ReceivableService.ts:207-213` |
| `Payable`/`Receivable` não têm campo de saldo (`paidCents`/`balanceCents`) — outstanding por linha é binário (0 ou `amountCents`), premissa que o `AgingReportService` documenta e depende dela | verificado | `Payable.model.ts` / `Receivable.model.ts` (sem campo de saldo); `AgingReportService.ts:88` ("Outstanding da linha = `amountCents` (pagamento full-only, sem saldo parcial)") |
| A tabela filha (`PayablePayment`/`ReceivableReceipt`) **já é 1:N estruturalmente** — só tem `@@index`, não `@@unique`, na FK-pai. A cardinalidade 1-ativo é imposta **só pelo CAS de status do serviço**, não pelo schema | verificado | `schema.prisma:921-938` (`PayablePayment`: `@@index([userId,unitId,payableId])`, sem `@@unique`); `schema.prisma:989-1006` (`ReceivableReceipt`, idêntico) |
| Gate atômico atual é uma **transição de status single-row** (`updateMany WHERE status='OPEN' SET status='PAYING'`, count===1 vence), fora de qualquer `runTransaction` — o `postEntry` abre a SUA PRÓPRIA tx entre o claim e o finalize | verificado | `PayableRepository.ts:104-130` (`claimForPayment`/`markPaidIfPaying`); `PayableService.ts:428-478` (claim pré-post → `postEntry` → `runTransaction` de finalize) |
| `PostingService.postEntry` é idempotente em `sourceId`; o `sourceId` do settlement é **o id do pagamento/recebimento** (nunca o do título) — re-liquidar após estorno não bate no idempotent-hit da reversão | verificado | `Payable.model.ts:64-71` (comentário D3); `PostingService.ts:283-320` (`findBySource`/idempotência); `schema.prisma:534-536` (`@@unique([userId,unitId,sourceType,sourceId])` em `JournalEntry`) |
| `amountCents` é `BigInt` nativo em `Payable`/`PayablePayment`/`Receivable`/`ReceivableReceipt`; `MAX_CENTS` é teto de **política** (DTO), não de persistência, desde a migração BigInt | verificado | `schema.prisma:878,927,959,995`; `models/money.ts:1-20` (`MAX_CENTS = 2_147_483_647`, comentário "POLICY ceiling only") |
| Reconciliação bancária vincula **linha↔posting** (não linha↔título), no máximo 1 match ativo por posting — cada liquidação parcial já posta como `JournalEntry`/`Posting` PRÓPRIO (sourceId=id-do-recibo), logo é candidato de match independente das outras liquidações do mesmo título | verificado | `docs/adr/ADR-INCR7-bank-reconciliation.md` D3 (linha 60-70): "cada posting tem no máximo 1 match ativo"; confirma que N recibos por título = N postings = N candidatos de match, sem redesenho da conciliação |
| `AgingReportService.loadOutstanding` lê `amountCents` diretamente para toda linha em `PAYABLE_OUTSTANDING_STATUSES`/`RECEIVABLE_OUTSTANDING_STATUSES` — **não** existe hoje um caminho de leitura de saldo remanescente | verificado | `AgingReportService.ts:404-426` |
| Allowlist de auditoria é fechada; os 8 eventos atuais (`payable.*`/`receivable.*`) não têm campo de saldo no payload | verificado | `auditCanonical.ts:50-57` |
| Rotas atuais modelam pagamento/recebimento como ação única terminal (`{id}/pay`, `{id}/payments/{paymentId}/cancel`) — semântica "a última baixa" | verificado | `server/src/routes/docs.paths.ts:3006-3028,3050` |
| Precedente de gate de soma re-checado dentro de tx é norma do domínio (`ACC-011`), não invenção deste ADR | verificado | `.claude/skills/luminaris-accounting-architect/SKILL.md` ACC-011/012; memórias `authoritative-gate-inside-tx`, `tx-nao-propagado-ao-repo` |
| Golden ref de teste TOCTOU contra SQLite real (a mesma harness serve para o gate de soma) | verificado | `repositories/__tests__/PayableClaim.integration.test.ts` (WAL serializa writers; N chamadas concorrentes, exatamente 1 vence) |

**Colisões com decisão commitada:** nenhuma — a rejeição de parcial é MVP explícito do AP/AR (F2), não
uma trava arquitetural; reabri-la é exatamente o gatilho que este ADR formaliza.

## 2. Contexto e objetivo

`ReceivableService.ts:213` e `PayableService.ts:316` (citados na autorização) rejeitam qualquer
`amountCents` que não feche o saldo integral. Isso deixa **descoberto** o caso normal de negócio: um
cliente paga 60% agora e 40% em 30 dias; um fornecedor recebe 3 boletos parcelados do mesmo título. A
cédula de 2026-09-03 marcou isso explicitamente como item 14 do escopo financeiro, "rejeitada
explicitamente hoje" — não é bug, é lacuna de escopo.

Este ADR modela a baixa parcial como **N liquidações (recibos) por título**, com saldo derivado, e
propaga a consequência para os três consumidores que hoje assumem full-only por construção: **aging**
(§1, `AgingReportService`), o **gate atômico** (CAS de status → CAS de soma) e o **tie-out**
subledger↔razão (que já é inteiro-exato e não muda de matemática, só de origem do número).

## 3. Decisão recomendada (não ratificada — ver forks §4)

**Modelo: AMBOS — campo de saldo denormalizado no título + child rows por liquidação (F-PS1→c).**
Generalizar `PayablePayment`/`ReceivableReceipt` (que já são 1:N no schema) relaxando o guard de
igualdade para `≤ saldo`, **mais** um campo `paidCents`/`receivedCents BigInt @default(0)` no
`Payable`/`Receivable` que serve dois papéis:

1. **Gate atômico de soma** — um único `UPDATE` condicional faz o papel que `claimForPayment` faz hoje
   para o binário OPEN→PAYING, só que aritmético:
   ```sql
   UPDATE payables
   SET paidCents = paidCents + :novo
   WHERE id = :id AND status IN ('OPEN','PARTIALLY_PAID') AND paidCents + :novo <= amountCents
   ```
   `count === 1` vence a corrida; `count === 0` = perdeu a corrida OU o novo valor estouraria o saldo —
   os dois casos colapsam no mesmo `ValidationError`, exatamente como `claimForPayment` hoje colapsa
   "não está mais OPEN" num único throw. **Nenhuma leitura-depois-escreve fora de uma única instrução
   atômica** — fecha o caso adversarial do gate 3 de OPS-001 (§7) sem exigir lock explícito.
2. **Leitura barata de saldo** — aging e qualquer relatório read outstanding sem precisar agregar N
   filhos por título a cada consulta.

Os child rows (`PayablePayment`/`ReceivableReceipt`, sem rename) continuam existindo para: auditoria
por liquidação (quem, quando, método, `entryId`), estorno individual, e ancoragem de `sourceId` no
`postEntry` (D3 do AP/AR — cada recibo posta o SEU `JournalEntry`, preservando a compatibilidade com o
reconcile bancário citada em §1). O campo é a *view* rápida e atômica; os filhos são a *fonte* auditável
— a mesma dualidade que `JournalEntry.entryNumber`+`Posting` já usa no razão.

**Por que não só o campo, nem só a entidade:** só-campo perde o histórico por liquidação (quem pagou o
quê, estorno seletivo) que o AP/AR já tem hoje via `PayablePayment`; só-entidade (sem o campo) volta a
agregar `SUM()` a cada leitura de saldo E teria de reimplementar o gate atômico como uma leitura+soma+
escrita em `runTransaction` (mais caro, mais superfície de erro) em vez de um `UPDATE` condicional de
uma linha. **Ratificação pendente — ver F-PS1.**

## 4. Forks (dono ratifica fork-a-fork — nenhum decidido aqui)

### F-PS1 — Modelo de dado: entidade vs campo vs ambos
- **(a) Só entidade** — generalizar `PayablePayment`/`ReceivableReceipt` (relaxar guard), saldo sempre
  agregado por `SUM()` no momento da leitura/gate. Zero coluna nova no pai. **Custo de errar:** todo
  gate de soma vira leitura-agregada + escrita dentro de `runTransaction` (mais lento que um `UPDATE`
  condicional; SQLite serializa escritores mas a leitura de agregação ainda precisa estar na MESMA tx
  que o insert do novo recibo para fechar o TOCTOU — mais fácil esquecer um `tx` propagado, a classe
  `tx-nao-propagado-ao-repo`).
- **(b) Só campo** — `paidCents` no pai, sem child rows (substituir os existentes). **Custo de errar:**
  perde o histórico por liquidação que o AP/AR **já tem hoje** (regressão, não lacuna nova); estorno
  seletivo de um recibo entre N fica sem onde gravar método/data/quem; reconciliação bancária perde o
  1-posting-por-liquidação (§1) — provavelmente inviável sem redesenhar a conciliação. **Não
  recomendado por perder capacidade existente.**
- ✅ **(c) Ambos** (recomendado, §3) — campo é o gate+cache, entidade é a fonte/auditoria. **Custo de
  errar:** superfície um pouco maior (uma coluna a manter consistente com `SUM(filhos ativos)`) —
  mitigado se o campo **nunca** é a fonte de verdade para relatório oficial (BP/DRE continuam lendo o
  razão, não este campo) e um teste de invariante (`paidCents === SUM(receipts ACTIVE)`) roda no CI.

### F-PS2 — Status intermediário
- ✅ **(a) Um novo status `PARTIALLY_PAID`/`PARTIALLY_RECEIVED`** entre `OPEN` e `PAID`/`RECEIVED`
  (recomendado). Como a coluna já é `String` (não enum do banco), isto é **zero-migração de schema**
  — só estender `PAYABLE_STATUSES`/`RECEIVABLE_STATUSES` e os `.enum()` do DTO. `PAYING`/`RECEIVING`
  (transiente) precisa de decisão companion: continua existindo como estado transitório da CHAMADA em
  curso (mantém a semântica atual, mas agora "voltar" pode ser para `OPEN` OU `PARTIALLY_PAID`
  dependendo do saldo antes da tentativa), ou é **eliminado** porque o `UPDATE` condicional de soma
  (§3) já é atômico sem precisar de um estado transiente visível — a corrida se resolve no `count` do
  `UPDATE`, não numa janela de status observável. **Custo de errar:** manter `PAYING`/`RECEIVING` sem
  necessidade real é estado morto que a próxima pessoa vai tentar entender; eliminá-lo sem substituto
  quebra o teste golden-ref (`PayableClaim.integration.test.ts`) que hoje afirma a transição por nome.
- (b) Sem status novo — inferir "parcial" só por `paidCents < amountCents && paidCents > 0`. Mais
  simples, mas todo filtro que hoje usa `status IN (...)` (aging outstanding, reconcile, relatórios)
  precisaria trocar para uma expressão sobre dois campos — mais pontos de re-implementar a mesma regra.
  **Custo de errar:** um dos consumidores (aging, reconcile) usa só `status` e esquece o campo →
  título parcialmente pago desaparece ou aparece como totalmente aberto.

### F-PS3 — Regra de estorno de um recibo entre N
- **(a) Estorno de um recibo qualquer, em qualquer ordem** (não só o último) — `reverseEntry` do
  `JournalEntry` daquele recibo específico (já suportado, é por `sourceId`), decrementa `paidCents` pelo
  valor do recibo revertido, recalcula status (`paidCents===0` → `OPEN`; `0<paidCents<amountCents` →
  `PARTIALLY_PAID`; nunca deveria bater `amountCents` de novo por reversão). **Custo de errar:** nenhum
  problema técnico visível (cada recibo já é uma entry isolada), mas é a opção que mais expande o
  espaço de teste (ordem de reversão não importa deveria ser provado, não assumido).
- (b) Só o recibo mais recente pode ser revertido (pilha, LIFO) — mais simples de raciocinar, mas é uma
  restrição de negócio sem pedido do dono; se um recibo do meio precisar ser corrigido (ex.: cheque
  devolvido), força reverter e re-lançar os posteriores só para chegar nele. **Custo de errar:**
  atrito operacional real na primeira exceção (cheque devolvido não é o último a entrar).
- **Recomendação do par:** (a) — o custo técnico de permitir ordem livre é ~zero (o mecanismo já
  suporta), então restringir por (b) sem necessidade é over-engineering na direção errada (nega
  capacidade que o dado já tem).

### F-PS4 — Aging e CAS por saldo remanescente
- ✅ **(a) Saldo remanescente** (recomendado) — `AgingReportService.loadOutstanding` passa a ler
  `amountCents - paidCents` (ou `- receivedCents`) em vez de `amountCents` cru; `AGING_OUTSTANDING_STATUSES`
  ganha `PARTIALLY_PAID`/`PARTIALLY_RECEIVED`. O tie-out (§1, `AGING_CONTROL_ACCOUNT_CODE`) não muda de
  matemática — a conta de controle já reflete cada liquidação como uma entry própria; só o total do lado
  subledger passa a somar saldos em vez de totais cheios, o que é o que TORNA o tie-out correto sob
  parcial (hoje ele já quebraria silenciosamente se alguém forçasse um título "parcial" por fora).
  **Custo de errar:** esquecer este ponto é a lacuna mais perigosa do incremento inteiro — ver §7 risco 1.
- (b) Manter aging por título cheio, ignorar saldo — descartado: o tie-out (`Σ aging == saldo da conta
  de controle`) quebraria pela primeira baixa parcial (o razão reflete o saldo real; o aging mentiria o
  valor cheio). Não é uma opção defensável, listada só para nomear o custo de não fazer (a).

### F-PS5 — Backfill de títulos já `PAID`/`RECEIVED`
- **(a) 1 recibo sintético por título fechado**, valor = `amountCents`, método = `'Cash'` (ou um método
  sentinela `'LEGACY_FULL'` se o DTO permitir), data = a data de pagamento/recebimento já registrada no
  `PayablePayment`/`ReceivableReceipt` existente — **na verdade não é backfill nenhum**: os
  `PayablePayment`/`ReceivableReceipt` JÁ existem como linhas (F-PS1→c não cria tabela nova), então
  `paidCents` é só um `UPDATE ... SET paidCents = amountCents WHERE status='PAID'` sobre dado que já
  está lá. **Custo de errar:** esquecer este passo deixa todo histórico pré-incremento com
  `paidCents=0` num título `PAID` — o gate de soma (§3) leria isso como saldo=`amountCents` inteiro e
  aceitaria um novo recibo sobre um título já quitado.
- (b) Deixar `paidCents` null/0 para histórico e migrar só daqui pra frente — descartado: todo título
  `PAID` anterior ficaria vulnerável ao bug nomeado em (a).
- **Recomendação:** (a), e é migração de dado (`UPDATE`), não estrutural — cabe no mesmo arquivo de
  migração da coluna nova, com o prólogo `IF EXISTS`/idempotência da classe
  `migracao-sqlite-nao-e-transacional` (repetir sem duplicar se re-rodada).

### F-PS6 — UI no mesmo ciclo ou `FE-INCR` separado
- ✅ **(b) `FE-INCR-PARTIAL-SETTLEMENT` separado** (recomendado, padrão do projeto — todo BE-INCR
  recente diferiu FE: AR, AP, Aging). O backend por si prova o invariante mais caro (gate de soma); a
  tela reusa o padrão de formulário existente (`{id}/pay` vira `{id}/settlements` aceitando N chamadas).
- (a) Mesmo ciclo — infla o BRIEF único, quebra o padrão "BE primeiro, FE diferido" sem motivo (não há
  gate humano bloqueando o BE isoladamente).

### F-PS7 — Conciliação bancária casando parcial
- ✅ **(a) Nenhuma mudança na conciliação** (recomendado) — cada recibo já posta como `JournalEntry`
  próprio (`sourceId=recibo`), e a conciliação já casa **posting**, não título (§1, evidência
  `ADR-INCR7`). N recibos de um título = N postings = N candidatos de match independentes; o extrato
  bancário que mostra 3 depósitos parciais já teria 3 linhas para casar com as 3 legs de banco dos 3
  recibos. **Zero mudança em `ReconciliationRepository`/`BankStatementLine`.**
- (b) Alguma forma de "match parcial" onde 1 linha de extrato cobre parte de 1 recibo — fora de escopo:
  isso quebraria a granularidade `linha↔posting` inteira do INCR-7 e não foi pedido; sinalizado só para
  registrar que NÃO é necessário para a baixa parcial funcionar (a decomposição já acontece no lado
  contábil, antes do extrato).

## 5. Invariantes que a implementação DEVE provar (ACC + específicos deste incremento)

- **[ACC-011/012]** Gate de soma re-checado **dentro** da mesma instrução atômica (`UPDATE ... WHERE
  paidCents + novo <= amountCents`), nunca preflight-depois-escreve separado.
- **[ACC-013]** Idempotência do recibo por `sourceId = <id do recibo>` (nunca `<id do título>`) —
  mantém o D3 já ratificado do AP/AR; um recibo estornado e re-lançado é um `id` novo, chave nova.
- **[ACC-014]** `Σ recibos ativos ≤ amountCents` é igualdade/desigualdade **inteira exata** (BigInt/
  centavos), nunca com epsilon; `MAX_CENTS` continua guardando cada `amountCents` de recibo individual
  no DTO.
- **[ACC-016]** Comando por ação (`POST /:id/settlements`, `POST /:id/settlements/:settlementId/cancel`)
  — nunca `PATCH status` genérico nem `PATCH paidCents` direto.
- **[ACC-018]** Estorno de recibo é `reverseEntry` (novo lançamento), nunca edição destrutiva da entry
  original; decrementa `paidCents` na MESMA tx do `reverseEntry` + recomputo de status.
- **[novo, F-PS4]** `Σ aging outstanding de um título === amountCents − paidCents` (ou `receivedCents`)
  em qualquer momento — invariante de leitura que substitui o binário atual "outstanding é 0 ou o
  total".
- **[novo, F-PS1(c)]** `paidCents === SUM(PayablePayment.amountCents WHERE status='ACTIVE')` — invariante
  de consistência campo↔filhos; teste de guarda dedicado (o campo nunca diverge da soma das linhas).
- **Teste de domínio obrigatório (é o caso adversarial deste ADR, §7):** 2 recibos concorrentes cuja
  soma excede `amountCents` → exatamente 1 aceito, o outro recebe `ValidationError` de saldo
  insuficiente — harness real-SQLite, golden ref `PayableClaim.integration.test.ts`.

## 6. Migração (SQLite — não transacional, prólogo obrigatório)

Escopo provável: **1 migração aditiva**, não uma reconstrução de tabela —
- `ALTER TABLE payables ADD COLUMN paidCents BIGINT NOT NULL DEFAULT 0` (coluna nova com `DEFAULT`
  constante é `ALTER TABLE ADD COLUMN` puro no SQLite — mesma classe leve da migração
  `20260903120000_nfe_multi_item_discriminator`, **não** o rebuild de tabela que uma coluna
  `NOT NULL` sem `DEFAULT`, ou uma mudança de tipo, exigiria).
- Espelho em `receivables.receivedCents`.
- **Backfill (F-PS5-a) na MESMA migração**, com prólogo idempotente (`UPDATE ... WHERE paidCents=0
  AND status='PAID'` — re-rodar a migração não duplica porque a condição do `WHERE` já não bate na
  2ª passada; classe `migracao-sqlite-nao-e-transacional`, o precedente é o `INSERT OR IGNORE` +
  `WHERE counterpartyId IS NULL` de `20260814120000_counterparty_notnull/migration.sql`).
- **Smoke-migration-gate obrigatório sobre `server/prisma/prisma/dev.db`** (o dev.db real, não
  sintético — memória `sintetico-nao-cobre-formato-de-dado-real`; AP/AR do dev.db podem estar vazias,
  o que seria PASS vacuoso — memória `smoke-gate-s6-x-migracao-de-dado` já nomeia esta classe
  exatamente).

## 7. Gates que o diff aciona (para a sessão de feature, quando ratificado)

- `LEDGER_STATUSES` (`models/ledgerStatus.ts`) não muda — os novos status são de `Payable`/`Receivable`,
  não de `JournalEntry`.
- `audit/auditCanonical.ts`: allowlist ganha eventos (nomes exatos = decisão do BRIEF pós-ADR, prováveis
  `payable.settlement_registered`/`payable.settlement_cancelled` renomeando ou complementando
  `payment_registered`/`payment_cancelled` — decisão de nomenclatura, não deste ADR) com payload
  incluindo `paidCentsAfter`/`remainingCents` (id-only, money-as-string, sem PII — mesmo padrão do D6
  do AR).
- Snapshot de shape do DTO (`PayableDto.test.ts`/`ReceivableDto.test.ts`) — `RegisterPaymentInput`/
  `RegisterReceiptInput` mudam de "deve igualar o saldo" para "deve ser ≤ saldo, > 0".
- `openapi-paths.test.ts` — bump do `BASELINE` se as rotas `{id}/pay` viram `{id}/settlements` (ou
  ganham uma rota irmã) — decisão de nomenclatura de rota é do BRIEF, não deste ADR.
- `tsc` limpo ×2 é gate, como sempre.

## 8. O que este ADR NÃO é

- **Não é a implementação.** Nenhum arquivo de `server/`/`my-app/` foi tocado; zero código de
  aplicação, conforme a autorização.
- **Não decide nomenclatura final** de rota/evento/status — isso é do BRIEF pós-ratificação
  (`sessao-planejamento`), que herda os forks já fechados aqui.
- **Não cobre juros/multa/desconto por atraso ou antecipação na baixa parcial** — é regra de negócio
  fiscal/financeira sem artefato hoje (§9); um recibo parcial neste ADR é sempre pelo valor informado,
  sem cálculo automático de acréscimo/decréscimo.
- **Não estende conciliação bancária** para "match parcial de linha" (F-PS7-b) — não é necessário
  (§F-PS7) e não está no escopo autorizado.
- **Não reabre o modelo de contraparte, dimensões ou period-close** — nenhum destes é tocado pela
  baixa parcial.
- **Não é ratificação.** Todo fork acima é PENDENTE até o dono responder via `AskUserQuestion`.

## 9. Pendente de validação externa

**Regra de juros/desconto na baixa parcial é regra de negócio sem artefato** — se o contador ou o dono
quiserem que uma baixa parcial em atraso calcule juros/multa automaticamente (ou desconto por
antecipação), isso é um incremento **posterior e distinto** (nenhuma tabela hoje modela taxa de
juros/multa por título ou por cliente/fornecedor). Este ADR modela a baixa parcial "nua" — valor
informado pelo usuário, sem cálculo de acréscimo. Fica nomeado, não fica assumido como incluído.

## 10. Próximo passo

1. Parecer de domínio do `luminaris-accounting-architect` (arquivo separado) sobre este ADR.
2. Ratificação fork-a-fork do dono (F-PS1..F-PS7) via `AskUserQuestion`.
3. `sessao-planejamento` produz o BRIEF (`BRIEF-INCR-PARTIAL-SETTLEMENT.md`) com os contratos Zod e o
   checklist numerado, herdando as decisões ratificadas aqui.
4. `sessao-feature` implementa; `luminaris-reviewer` independente; `sessao-integracao` transporta.

O nó **F3** do grafo permanece `ready`→`blocked-por-ratificação` até o passo 2 fechar; a promoção a
`done` é do closeout da feature, não deste ADR.
