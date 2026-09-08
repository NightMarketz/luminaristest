> **PARECER DE DOMÍNIO** (`luminaris-accounting-architect`) — não é BRIEF nem ADR; não ratifica fork
> nenhum (ACC-001/ACC-003). Complementa `ADR-INCR-PARTIAL-SETTLEMENT.md` (rodada 8 SDD, PR #276).
> Todo claim de código foi verificado por leitura real (`Read`/`Grep`) nesta sessão; grau declarado
> em cada linha. Autorização citável: plano SDD 2026-09-07 rodada 8, disparo do dono no chat.

---

## 0. Sumário executivo (as duas primeiras linhas, OPS-001 gate 5)

**Verdade:** o ADR está corretamente ancorado — o schema já é 1:N, o guard de igualdade é MVP
explícito (F2→(b) do AP/AR), e os 7 forks têm custo de errar nomeado. **Risco principal (silencioso):**
o `UPDATE` condicional aritmético do §3 (`WHERE paidCents + :novo <= amountCents`) **não é expressável
como escrito** pela API fluente do Prisma Client neste projeto (sem `previewFeatures` de field-reference
no `schema.prisma` — verificado) e um **segundo consumidor de tie-out não nomeado no ADR**
(`TieOutDiagnosticService.tieOut`) vai divergir silenciosamente na primeira baixa parcial real, porque
soma `amountCents` cru dos mesmos status "em aberto" — exatamente como `AgingReportService`, mas em
arquivo diferente do único citado no ADR.

---

## 1. Invariantes — evidência, modo de falha, grau

### 1.1 [CRÍTICO] O gate de soma proposto não é literal no Prisma — precisa de reformulação, não de raw SQL

**Claim do ADR (§3):** `UPDATE payables SET paidCents = paidCents + :novo WHERE id=:id AND status IN
(...) AND paidCents + :novo <= amountCents` seria "um único `UPDATE` condicional" equivalente ao
`claimForPayment` atual.

**Verificado:**
- `server/prisma/schema.prisma:1-14` — bloco `generator client` sem `previewFeatures`. Nenhuma feature
  de comparação campo-a-campo (`fieldReference`) está habilitada no projeto.
- `PayableRepository.claimForPayment` (`PayableRepository.ts:104-117`) e `markPaidIfPaying`
  (`:119-133`), e o espelho em `ReceivableRepository.ts:121-149`, são os ÚNICOS gates atômicos do
  domínio hoje — todos filtram por **igualdade de string num único campo** (`status: 'OPEN'`),
  nunca aritmética nem comparação entre duas colunas.
- `PayableClaim.integration.test.ts:22-28` (o golden ref que o próprio ADR cita para o novo teste de
  concorrência) reproduz esse mesmo padrão: `where: { status: 'OPEN' }, data: { status: 'PAYING' }` —
  literal, sem expressão.
- Grep exaustivo por `executeRaw|queryRaw` em `server/src/features/accounting/**` fora de
  `__tests__/`: **zero ocorrência** em código de aplicação — todo uso de SQL cru hoje é migração/teste
  de infraestrutura (`CounterpartyBackfill`, `EntryNumberingMigration`, `renameDataMigrationGuard`),
  nunca um caminho de escrita de domínio em produção.

**Por que a letra do ADR falha:** a API `Prisma.updateMany({ where })` aceita comparar uma coluna a um
**literal** (`{ paidCents: { lte: X } }`) ou, com a preview feature ligada (não é o caso aqui), uma
coluna a **outra coluna sem aritmética** — mas não aceita `coluna_A + parâmetro <= coluna_B` numa única
expressão de filtro. Como está escrito, §3 exigiria `$executeRaw` para ser literal — o que introduziria
uma exceção sem precedente ao padrão "repositório só fala com `prisma.<model>.*`" que todo o resto do
AP/AR/aging segue.

**Correção que FECHA a mesma atomicidade sem SQL cru (grau: inferido, não implementado nesta sessão):**
`amountCents` é **imutável após a criação** — verificado por leitura completa de `PayableService.ts` e
`PayableRepository.ts`: nenhum caminho chama `updatePayable`/`update` com `amountCents` no `data`, e o
`@@unique`/ciclo de vida (D3) nunca reescreve o total. Logo é seguro **ler `amountCents` FORA da tx**
(sem TOCTOU — o valor não muda) e usar esse valor já conhecido como **literal** no filtro:

```
UPDATE payables SET paidCents = paidCents + :novo
WHERE id=:id AND status IN ('OPEN','PARTIALLY_PAID') AND paidCents <= (:amountCentsLido - :novo)
```
— que É expressável em Prisma puro: `payableRepo.updateMany({ where: { id, status: {in:[...]},
paidCents: { lte: amountCentsLido - novo } }, data: { paidCents: { increment: novo } } })`. **O ADR
precisa registrar esta reformulação explicitamente antes do BRIEF** — a pseudo-SQL atual, lida ao pé da
letra por quem implementa, tentaria compilar uma expressão que a ORM não produz e ou (a) descobriria o
problema tarde (na sessão de feature, não no ADR) ou (b) escaparia para `$executeRawUnsafe` sem que
isso tenha sido uma decisão ratificada.

**Caso adversarial tentado:** procurei ativamente um precedente de comparação-entre-colunas ou raw SQL
em caminho de escrita de produção que invalidasse este achado — não encontrado (busca exaustiva acima).
Também verifiquei se `amountCents` poderia mudar por edição (o que quebraria a correção proposta) —
não há DTO nem service method de "editar valor de um título aberto"; a única forma de zerar um título é
`cancelPayable`/`cancelPayment`, que não alteram `amountCents`. **Achado se sustenta.**

### 1.2 [ALTO] Segundo consumidor de tie-out não nomeado no ADR

**Verificado:** `TieOutDiagnosticService.ts:169` (`arOpenCents = openReceivables.reduce((acc, r) => acc
+ centsFromDb(r.amountCents), 0)`) e `:182` (idem para `apOpenCents`), sobre
`this.receivableRepo.findOutstanding(scope)` / `this.payableRepo.findOutstanding(scope)` — **o mesmo
método de repositório que `AgingReportService.loadOutstanding` usa**, mas um **arquivo de serviço
inteiramente distinto**, com seu próprio check `receivables`/`payables` contra as contas-controle
1.1.5/2.1.2 (`TieOutDiagnosticService.ts:104-109`).

O ADR (§1 evidência, §5 invariantes, §7 gates) cita **só** `AgingReportService.ts:404-426` como o ponto
que lê `amountCents` cru. `TieOutDiagnosticService` não aparece em nenhuma das três listas. **Modo de
falha concreto:** no dia em que a primeira baixa parcial for registrada, o razão (2.1.2/1.1.5) reflete
corretamente o saldo remanescente (cada recibo é uma entry real), mas `TieOutDiagnosticService.tieOut()`
continua somando `amountCents` INTEIRO de toda linha `PARTIALLY_PAID` (que entra em
`PAYABLE_OUTSTANDING_STATUSES`/`RECEIVABLE_OUTSTANDING_STATUSES` — F-PS4 já propõe incluir o novo status
aí) — o subrazão reportaria a mais exatamente o valor já pago, e o diagnóstico de amarração acusaria
divergência onde não há nenhuma. **Isto é o mesmo bug que F-PS4(a) já previne para o Aging, só que num
segundo lugar que o ADR não olhou.** Precisa entrar no §5 (invariante) e no §7 (gate) como um segundo
site, não uma extensão implícita de F-PS4.

**Grau:** verificado (leitura de `TieOutDiagnosticService.ts:125-192`).

### 1.3 [MÉDIO] Gate defensivo pré-CAS em `registerPayment`/`registerReceipt` precisa da mesma expansão de status, num ponto que o ADR não versiona

**Verificado:** antes de chegar ao `claimForPayment` (a CAS que §3 substitui), `PayableService.ts:411`
já rejeita com `if (payable.status !== 'OPEN')` (mensagem "Conta a pagar não está aberta para
pagamento"); espelho em `ReceivableService.ts:203`. O §3 do ADR só reescreve o `WHERE` do `updateMany`
de `claimForPayment` — não menciona este SEGUNDO ponto de checagem de status, que roda ANTES e hoje
rejeitaria `PARTIALLY_PAID` mesmo que o gate de soma novo aceitasse. Sem editar as duas linhas em
lockstep, um título parcialmente pago nunca chegaria ao `UPDATE` novo — ficaria preso no guard antigo.
Mesma classe em `cancelPayable`/`cancelPayment`: `PayableService.ts:505-510` só distingue hoje
`PAID` vs "outro status" na mensagem de erro; precisa de um terceiro ramo para `PARTIALLY_PAID`
("desfaça as baixas ativas antes de cancelar"), coerente com a defesa `findActivePayment` já existente
(`:513-516`).

**Grau:** verificado (leitura direta das duas linhas + espelho AR).

### 1.4 [BAIXO/pré-existente, não agravado] Baixa parcial × dimensão obrigatória — a settlement leg já não suporta dimensão hoje, com ou sem parcial

**Verificado:** `RegisterPaymentInput`/`RegisterReceiptInput` (`PayableDto.ts`, `ReceivableDto.ts`) não
têm campo `dimensions` em nenhum shape — grep confirma zero ocorrência de `dimension` nesses dois
arquivos. `PostEntryInput.lines[].dimensions` existe como capacidade do núcleo
(`PostingDto.ts:24-26,64-67`), mas `PayableService.buildSettlementInput`/`buildSettlementInputFromRow`
(`PayableService.ts:946-986`) nunca populam esse array. **Consequência:** se `FORNECEDORES_A_PAGAR_CODE`
ou a conta de método de pagamento estiverem marcadas `requiresDimension: true`
(`ADR-INCR-DIM-COMPLETENESS`, B1, posting-time em `postEntry`), a liquidação **já falha hoje**, em
pagamento integral, antes deste ADR existir. A baixa parcial **não piora nem resolve** essa lacuna — N
recibos herdam a mesma limitação que 1 recibo já tinha. Não é um invariante NOVO deste incremento;
registro aqui só porque o setup pediu a checagem explícita. Se o dono quiser dimensão na liquidação,
isso é um incremento à parte (adicionar `dimensions?: string[]` ao DTO + repassar), não um fork deste ADR.

### 1.5 [Confirma o ADR, sem achado novo] Concorrência, idempotência, BigInt, reconciliação bancária

- `PayableService.ts:419-423` (`if (dto.amountCents !== remaining) throw ValidationError`) —
  **verificado**, guard de igualdade ativo, exatamente como o ADR cita (linha real 419, ADR aponta
  415-423 — dentro do bloco, ok).
- `schema.prisma` — `Payable`/`Receivable`/`PayablePayment`/`ReceivableReceipt` todos com
  `amountCents BigInt`; `PayablePayment`/`ReceivableReceipt` têm só `@@index([userId,unitId,payableId|
  receivableId])`, **sem** `@@unique` de cardinalidade — **verificado**, confirma a leitura do ADR de
  que o schema já é 1:N estrutural.
- `money.ts:1-20` — `MAX_CENTS = 2_147_483_647` como **teto de política** (comentário explícito "POLICY
  ceiling only"), guardado em `PayableDto.ts:20`/`ReceivableDto.ts:18` via `.max(MAX_CENTS)` —
  **verificado**, cada recibo individual continua sob o mesmo teto de DTO independente do total do
  título (que já pode ser BigInt maior, herdado).
- `ADR-INCR7-bank-reconciliation.md:59-66` (D3) — granularidade linha↔posting, "N postings ↔ 1 linha"
  permitido, "1 posting ↔ N linhas" (split) diferido — **verificado**: confirma F-PS7(a) exatamente
  como o ADR descreve (N recibos = N postings = N candidatos independentes; nenhuma mudança necessária).
- `ADR-INCR-AP-accounts-payable.md:183` / `ADR-INCR-AR-accounts-receivable.md:194` — F2 ratificado como
  **(b)** em ambos, com o texto "pagamento/recebimento integral único (modelo preparado para parcial —
  F2)" — **verificado**. Ponto de precisão (não de mérito): o ADR sob parecer nunca escreve a frase
  "revoga F2→(b) de ADR-INCR-AP/AR" — trata a colisão como "nenhuma" (§1, linha final) porque F2 já
  previa a reabertura. Tecnicamente correto, mas por rastreabilidade **recomendo** que o BRIEF cite F2
  por nome como "superado por F-PS2" nos dois ADRs pai, não só neste documento.
- `PAYABLE_STATUSES`/`RECEIVABLE_STATUSES`/`PAYABLE_OUTSTANDING_STATUSES` (`Payable.model.ts:14,23`,
  `Receivable.model.ts:14,23`) — strings simples, sem enum de banco — **verificado**: confirma "zero
  migração de schema" do F-PS2(a) para adicionar `PARTIALLY_PAID`/`PARTIALLY_RECEIVED`.
- `ledgerStatus.ts` (`LEDGER_STATUSES`) — não referencia `Payable`/`Receivable` — **verificado**: §7 do
  ADR está correto ao dizer que este arquivo não muda.
- `auditCanonical.ts:50-57` — 8 eventos `payable.*`/`receivable.*`, todos id-only/money-as-string, sem
  nome de contraparte — **verificado**: base para os novos payloads (`paidCentsAfter`/`remainingCents`)
  seguir o mesmo padrão PII-safe é uma extensão segura, não uma mudança de política.

---

## 2. Tradução do doc/ADR aspiracional → realidade do projeto

- ADR §3 diz "um único `UPDATE` condicional" — **na prática**, precisa ser "um único `UPDATE`
  condicional cujo limite é um LITERAL pré-lido de um campo imutável", não uma expressão de duas
  colunas (§1.1 acima). Sem essa frase, a sessão de feature pode implementar incorretamente (tentar
  `fieldReference`/raw SQL) ou descobrir o obstáculo tarde.
- ADR §5/§7 falam de "o tie-out" no singular — **na prática**, são DOIS serviços
  (`AgingReportService.computeTieOut` E `TieOutDiagnosticService.tieOut`) que leem o mesmo
  `findOutstanding()` e precisam da MESMA correção (`amountCents - paidCents`), não um.

---

## 3. Forks — concordo/discordo por linha

- **F-PS1 (ambos: campo + entidade) → concordo.** Custo de errar da opção (a) (só-entidade) está
  subestimado no texto: "mais fácil esquecer um `tx` propagado" é citado, mas o custo real maior é
  **performance de leitura** — todo `loadOutstanding`/tie-out passaria a exigir `SUM()` agregado por
  título a cada chamada de relatório (hoje `findOutstanding` é um `findMany` simples); em N títulos
  com M recibos cada isso é uma agregação por linha, não um campo já pronto. Não muda a recomendação,
  mas o custo de (a) é maior do que o texto sugere.
- **F-PS2 (status novo `PARTIALLY_PAID`) → concordo.** Reforço com achado §1.3: a introdução do status
  exige tocar TRÊS pontos, não um — o `WHERE` da CAS (§3, já nomeado), o guard pré-CAS em
  `registerPayment`/`registerReceipt` (`:411`/`:203`, não nomeado), e a branch de mensagem em
  `cancelPayable`/`cancelPayment` (`:505-510`, não nomeada). O sub-fork "`PAYING` eliminado vs mantido"
  — concordo que eliminar é viável tecnicamente (o `UPDATE` condicional não precisa de estado
  transiente visível), mas **discordo em ordem de prioridade**: decidir isso é do BRIEF, e manter
  `PAYING` como estado transitório é a opção que preserva o golden ref
  (`PayableClaim.integration.test.ts`) sem reescrevê-lo — menor blast radius para a primeira versão.
- **F-PS3 (estorno em qualquer ordem) → concordo.** Custo técnico real é zero (cada recibo já é uma
  entry isolada por `sourceId`), e a restrição LIFO da opção (b) é a que o texto já identifica
  corretamente como atrito sem motivo.
- **F-PS4 (aging/CAS por saldo remanescente) → concordo, com a emenda do achado §1.2.** A opção (a) é
  a única defensável; o texto já nomeia isso como "a lacuna mais perigosa do incremento inteiro" — a
  única correção que faço é que são DOIS lugares a consertar, não um.
- **F-PS5 (backfill como recibo sintético) → concordo.** A observação de que "não é backfill, é
  `UPDATE` sobre dado que já existe" está correta e verificada (`PayablePayment`/`ReceivableReceipt`
  já persistem o histórico de pagamento integral). Prólogo idempotente é obrigatório, como o texto diz.
- **F-PS6 (FE separado) → concordo.** Consistente com o padrão do projeto (AR/AP/Aging todos
  diferiram FE); nenhum gate humano bloqueia o BE isolado.
- **F-PS7 (zero mudança na conciliação) → concordo.** Verificado contra `ADR-INCR7 D3` (§1.5 acima) —
  N recibos = N postings = N candidatos independentes, granularidade linha↔posting já suporta o caso
  sem redesenho.

---

## 4. Gates de domínio que a implementação deve acender

- **Teste de concorrência real-SQLite** (extensão de `PayableClaim.integration.test.ts`, WAL): N
  chamadas simultâneas cuja soma excede `amountCents` → exatamente as que cabem no saldo vencem,
  `count===0` para o resto — usando a fórmula de literal pré-lido do §1.1, não uma expressão de duas
  colunas. **Windows serializa SQLite por padrão de processo único; a CI Linux não** — um verde local
  não é evidência de que a corrida real (múltiplos processos/workers) está fechada; só a CI conta.
- **Teste de invariante `paidCents === SUM(receipts ACTIVE)`** (F-PS1-c, já nomeado no ADR) — golden
  ref novo, sem precedente direto no repo (é o primeiro campo denormalizado-como-cache neste subrazão).
- **Teste de tie-out em AMBOS os serviços** (`AgingReportService` E `TieOutDiagnosticService`, achado
  §1.2) com uma fixture que mistura título `PARTIALLY_PAID`/`OPEN`/`PAID` no mesmo scope — uma fixture
  de um único status deixaria a guarda recíproca quebrada passar (mesma classe de
  `bp-dre-diagnostics-test-must-mix-natures`).
- **Smoke-migration-gate sobre `server/prisma/prisma/dev.db` real.** Não pude confirmar volume de
  linhas em `payables`/`receivables` do dev.db real nesta sessão — este worktree não carrega o arquivo
  (`dev-db-real-path-is-nested`: populado é `server/prisma/prisma/dev.db`, ausente aqui por ser
  worktree novo). **Grau: assumido, não verificado** — quem rodar o gate precisa confirmar que AP/AR
  não estão vazias antes de aceitar o smoke como prova (`smoke-gate-s6-x-migracao-de-dado`), senão é
  PASS vacuoso.
- **DTO snapshot** (`PayableDto.test.ts`/`ReceivableDto.test.ts`) — mudança de shape "igual ao saldo"
  → "≤ saldo, > 0" é lógica fina (`.refine`/`.superRefine`), invisível a um snapshot de shape puro
  (`dto-shape-snapshot-nao-cobre-logica-fina`) — precisa de teste de comportamento, não só de shape.

---

## 5. O que este parecer NÃO decide

- Não ratifica F-PS1..F-PS7 (ACC-003) — cabe ao dono via `AskUserQuestion`.
- Não decide a reformulação exata do `UPDATE` (§1.1) em código — nomeia o obstáculo e uma direção
  verificada como viável; a redação final do gate atômico é do BRIEF (`sessao-planejamento`).
- Não decide nomenclatura de rota/evento/status (já fora de escopo do próprio ADR, §8).
- Não cobre juros/desconto/multa (§9 do ADR) — concordo que é "pendente de validação externa: contador",
  sem artefato hoje.
- Não audita o frontend (F-PS6 diferido) nem estende a auditoria além de nomear que os 2 novos eventos
  seguem o padrão PII-safe já em vigor.

## Gates de envio [OPS-001]

1. **Objetivo:** a frase que responde ao pedido é o Sumário Executivo (§0) — invariantes com evidência
   e modo de falha, forks avaliados, gates nomeados.
2. **Grau:** toda linha de evidência em §1/§1.5 é **verificada** (arquivo:linha lido nesta sessão); a
   correção proposta em §1.1 é **inferida** (decorre de fato verificado — imutabilidade de
   `amountCents` — mas não foi implementada/testada); o volume do dev.db real é **assumido** (arquivo
   ausente neste worktree).
3. **Caso adversarial tentado:** busquei um precedente de comparação-entre-colunas/raw SQL em caminho
   de escrita de produção que invalidasse §1.1 — não encontrado (grep exaustivo, resultado colado em
   §1.1). Busquei também uma segunda leitura de `amountCents` cru fora dos dois tie-outs achados —
   não[-exaustivo]: não varri `my-app` nem rotas de relatório fora de `features/accounting/services/`;
   declarado como limite de escopo, não como "zero achado adicional garantido".
4. **Checagem falseável:** se `previewFeatures` incluísse `fieldReference` no `schema.prisma`, ou se
   existisse qualquer `$executeRaw` de domínio hoje, §1.1 estaria errado — a leitura direta do arquivo
   (colada acima) é a checagem, e ela teria falhado se a premissa fosse falsa.
5. **Risco principal (repetido do §0):** o gate de soma, se implementado ao pé da letra do §3 do ADR,
   não compila como Prisma puro — e o segundo tie-out (`TieOutDiagnosticService`) é o achado mais caro
   de ficar esquecido, porque falha **em silêncio** (produz um número "amarrado" que na verdade não
   fecha) em vez de falhar ruidoso (`tsc`/teste vermelho).

**Viés a declarar:** a leitura foi guiada pelos arquivos que o próprio ADR cita — não fiz varredura
independente de TODO `server/src` por outros consumidores de `amountCents`/status de Payable/Receivable
fora de `features/accounting/services/**` e dos dois repositórios. É possível existir mais algum ponto
de leitura crua (ex.: um job de dashboard/KPI) não coberto aqui.
