# BE-INCR-MAQUINA-DE-ESTADOS — máquina de estados pura por agregado, com o repositório fechado (BRIEF)

- **Data:** 2026-11-26
- **Sessão:** `sessao-planejamento` (só este documento; nenhum código, nenhuma branch, nenhum outro doc editado)
- **Status:** BRIEF pronto, **forks F-SM-1..7 RATIFICADOS** (dono, questionário, 26/11, todos na recomendação:
  `docs/plano/decisoes/D-2026-11-26-MAQUINA-DE-ESTADOS-FORKS.md`); nó `docs/plano/nos/MAQUINA-DE-ESTADOS.md`; sem `executa`
- **Classe:** CONVENÇÃO + contrato de repositório. **Não é motor** (`docs/adr/ADR-DOMAIN-MOTOR-rejected.md` §2: "vale uma
  convenção declarada no arquivo e provada por teste").

## TLDR (2 linhas)

Cada agregado com ciclo de vida ganha uma máquina **pura** ao lado do model (estados, tabela, comandos nomeados `{de, para}`),
e o repositório passa a expor **só** métodos de transição cujo `where` vem do comando; a escrita livre de `status` deixa de
compilar. Risco principal: as escritas hoje **incondicionais** (11 só no AP e no AR, fatos 3 e 4) viram condicionais, e cada
uma muda o desfecho de uma corrida (0 linhas ⇒ 409), por isso entram uma a uma, com teste-guarda antes.

---

## 0. Formulário

### 0.1 Contexto fixo

- **Item a planejar:** levar ao fim a fila de `docs/adr/PRE-ADR-LIFECYCLE-TRANSITIONS.md` §4 (itens 2, 3 e 7) no backend e
  fechar a escrita livre de `status` nos repositórios. Nó: `docs/plano/nos/MAQUINA-DE-ESTADOS.md` (criado nesta sessão, F-SM-1 a).
- **Autorização:**
  - `PRE-ADR-LIFECYCLE-TRANSITIONS.md`, ratificado pelo merge do #1148 (`d3cf331e7`; o cabeçalho diz "o merge do PR é a
    ratificação"), §4 "Fila de adoção".
  - dono, chat, 2026-11-26: **"sim, planejar a A com o repositório fechado"**, em resposta à pergunta "Abro o planejamento
    (BRIEF) da máquina de estados por agregado?". A "opção A" foi descrita no mesmo chat: máquina pura por agregado, comandos
    nomeados, guardas puras, tabela alimentando o `where` do CAS, `allowedActions` no DTO de leitura; o serviço segue dono da
    transação, do `postEntry` e do reconcile. "Repositório fechado": o repositório deixa de expor escrita livre de `status`.
  - Cobre **planejar**. Não cobre código: cada PR pede o `executa`.
- **Divergência de escopo, reportada:** a autorização cobre a opção A inteira (fila §4, itens 2 a 7), que inclui front
  (itens 4 e 5) e presets DynamicTable (item 6). Este BRIEF é a **fatia backend Prisma**. As outras duas são fatias do mesmo
  item autorizado, com BRIEF próprio (§10); não são "achados fora de escopo".
- **Insumos existentes (fato consumado):**
  - `server/src/lib/lifecycle.ts` (`TransitionTable`, `canTransition`, `sourcesOf`, `terminalStates`, `assertTransition`).
  - `PAYABLE_TRANSITIONS` (`models/Payable.model.ts:43`), `RECEIVABLE_TRANSITIONS` (`models/Receivable.model.ts:34`) e os
    testes `models/__tests__/{Payable,Receivable}.transitions.test.ts`.
  - `docs/adr/ADR-DOMAIN-MOTOR-rejected.md` (§2 vencedor, §3 gatilhos); Contrato §2.3 (`AC-2.3-1..3`); `server/CLAUDE.md`
    gates 5 e 6.
  - `docs/accounting/BE-INCR-CANCELAMENTO-CANCELLING-brief.md` (§4.2 estados, §4.3 assinaturas, forks F-CX-1..3 e F-AR-1
    ratificados em 25/11; PR-0 mergeado no #1413).
  - `docs/operating-manual/GAP-MAP.md`: SM F-01.2 (`[CORRIGIDO 11/11, #1160]` no AP; AR pendente) e SM F-16.1.
- **Nós vizinhos:**
  - **Consome:** `lib/errors.ts` (`ConflictError`, `:56`); os `*_STATUSES` dos models.
  - **É consumido por:** o front (predicados e `allowedActions`, §10); `backend-repository-generator` e `luminaris-reviewer`
    (regra nova, PR-0).
  - **Divide arquivo com:** BE-INCR-CANCELAMENTO-CANCELLING PR-1 e PR-2 (`PayableService`, `ReceivableService` e os dois
    repositórios); `integration/x10a` e os itens abertos da caixa sobre transições do DF-e (`FiscalDocumentLifecycleService`).

### 0.2 Recorte

**Dentro:** os 9 ciclos de alto fan-out do lado Prisma (`Payable`, `Receivable`, `CollectionCharge`, `BankSettlementItem`,
`JournalEntry`, `FixedAsset`, `AccountingDataExchangeJob`, `AgentTurn`, `FiscalDocument`); a camada de comandos em
`lib/lifecycle.ts`; a regra de geração e de revisão; `allowedActions` no DTO de leitura (último PR, F-SM-4); os cerca de
30 ciclos simples (F-SM-5).

**Fora:** telas (`my-app/`); `lifecycle` em preset DynamicTable; qualquer estado novo, transição nova ou mudança de regra de
negócio; os itens abertos da caixa sobre transições do DF-e (o BRIEF **declara** o que existe, não decide o que falta);
fases, hooks, eventos, registry, fila ou agregado que se persiste (é o motor rejeitado: exige ADR novo com gatilho do §3).

---

## 1. Fatos lidos (grau por linha)

Lidos em 2026-11-26 na `main` `40b6ab8f4`. "Verificado" = li o trecho; "regex" = contagem por `grep`, não conferida sítio a sítio.

| # | Fato | Grau |
|---|---|---|
| 1 | 41 colunas `status String` em `schema.prisma`; 2 `TransitionTable` (AP, AR) e 1 tabela parcial, não exportada, só para resultados da porta (`VALID_RESULT_TRANSITIONS`, `FiscalDocumentLifecycleService.ts:68`) | verificado |
| 2 | `assertTransition` tem 1 sítio de runtime (`assertPayableRecalc`, `PayableService.ts:166-168`); `sourcesOf` tem 0: a tabela só se amarra ao CAS por teste | verificado |
| 3 | **AP, escrita livre:** `PayableRepository.updatePayable` (`:318`) recebe `Prisma.PayableUpdateInput` e faz `update` sem `status` no `where`. Sítios que passam `status`: `PayableService.ts:1351` (recálculo, guardado por `assertPayableRecalc`), `:1355` (`OPEN`, saldo 0 após crash), `:2239-2242` (`CANCELLED` + `deletedAt` + `documentNumber`, `compensateFailedRecognition`); `WithholdingService.ts:399`, `:407` (`DEFERRED`), `:484` (`OPEN` + `amountCents` + `documentNumber`), `:566` (`CANCELLED` + `deletedAt` + `documentNumber`) | verificado (7 sítios) |
| 4 | **AR, escrita livre:** `ReceivableRepository.updateReceivable` (`:202`), mesma forma. Sítios: `ReceivableService.ts:438-442` (`CANCELLED` + `deletedAt` + `cancelledById` + `cancelReason` + `documentNumber`), `:555` (recálculo, **sem** `assertTransition`: é o lado AR do SM F-01.2), `:559` (`OPEN`), `:982-986` (`CANCELLED`, fora de tx, `compensateFailedRecognition`) | verificado (4 sítios) |
| 5 | **CAS com par livre** (o chamador escolhe `de` e `para`): `BankSettlementRepository.compareAndSetStatus` (`:105`), `CollectionChargeRepository.casStatus` (`:105`) | verificado; 4 e 6 chamadores (regex) |
| 6 | **Guarda opcional:** `JournalEntryRepository.setStatus` (`:109`, `status: string`, `expectedStatus?`); `FiscalDocumentRepository.transition` (`:278`, `whenStatusIn?`); `FixedAssetRepository.addAccumulated` (`:174`, `nextStatus?`) | verificado; 5, ~12 e 4 chamadores (regex) |
| 7 | **Sem guarda:** `DataExchangeRepository.updateJob` (`:135`, `updateMany` só por id e escopo); `AgentTurnRepository.finish` (`:23`, `update` por id, `status` tipado `DONE \| FAILED`) | verificado |
| 8 | **Já no formato alvo:** `claimForPayment`, `finalizeIfPaying`, `releaseClaim`, `resolveRevertedClaim`, `casStartCancelling`, `casCompleteCancelling` (AP); os espelhos do AR; `FixedAssetRepository.activate`/`dispose` (CAS por `version` + `status`); `AgentTurnRepository.claim` | verificado |
| 9 | **O `de` de um comando é mais estreito que `sourcesOf(tabela, para)`:** `casCompleteCancelling` só sai de `CANCELLING`; o cancelamento do título de imposto exige `OPEN`; `casStartCancelling` recebe `fromStatuses` do service. `sourcesOf(PAYABLE_TRANSITIONS, 'CANCELLED')` devolve 4 estados | verificado |
| 10 | **X → X é por máquina:** `claimStaleConfirming` grava `CONFIRMING → CONFIRMING` (`BankSettlementRepository.ts:119`); `PROCESSING → PROCESSING` consta na tabela do DF-e; no AP o recálculo que repete o status **não** passa por transição | verificado |
| 11 | `LEDGER_STATUSES = ['Posted','Reconciled','Reversed']` (`models/ledgerStatus.ts:18`) não é `as const`, e o PRE-ADR §1.1 cita também `Draft` e `PendingApproval` | verificado (a divergência é insumo ausente 2) |
| 12 | `ConflictError` existe (`lib/errors.ts:56`); o cancelamento já usa código próprio (`TITULO_MUDOU_DURANTE_O_CANCELAMENTO`, `Payable.model.ts:130`) | verificado |
| 13 | Em voo sobre os mesmos arquivos: PR-1 e PR-2 do CANCELLING (write-set §9 daquele BRIEF); nenhum PR aberto com "CANCELLING" em 26/11 (`gh pr list --search`) | verificado em 26/11 |

---

## 2. Opções (regra do dono de 21/11: estrutural primeiro, versão incremental dela, remendo só como alternativa)

| Opção | O que é | O que deixa aberto |
|---|---|---|
| **Estrutural (recomendada), em etapas** | Comando `{de, para}` declarado no model; repositório só com métodos de transição; tipo do `update` genérico sem `status`; regra no gerador e no revisor para repositório novo nascer fechado. Um agregado por PR, na ordem do §3 | nada da classe; sobra só a ordem de entrada |
| Estrutural de uma vez | os 9 agregados num PR | revisão inviável e conflito certo com o CANCELLING e a `integration/x10a` |
| Remendo | só `assertTransition` nos recálculos (fila §4 item 2) | a escrita livre continua compilando; o próximo sítio novo nasce sem guarda, e o `de` do comando continua só em comentário |

---

## 3. Ordem e precondições

1. **PR-0 (contrato): só `lib/` e docs.** Não toca serviço nem repositório. A parte de `lib/` não tem precondição. A parte de
   docs divide arquivo com PRs abertos em 26/11 (`node scripts/paralelo.mjs plano MAQUINA-DE-ESTADOS`): #1380, #1384 e #1387
   editam `_ARCHITECTURE-CONTRACT.md` (o #1380 também o `backend-repository-generator`, o #1387 o `luminaris-reviewer`) e o
   #1223 edita `TESTES.md`. O item 0.7 rebaseia sobre o que tiver entrado; conferir de novo na abertura do PR.
2. **PR-1: primeiro adotante sem trabalho em voo.** `BankSettlementItem` (6 estados, 4 chamadores, CAS já existente): prova a
   forma num agregado pequeno antes do AP.
3. **PR-2: `CollectionCharge`, `JournalEntry`, `FixedAsset`.** Três commits, um por agregado (regra de 25/11: item = commit).
4. **PR-3: `Payable` e `Receivable`.** **Precondição:** PR-1 e PR-2 do BE-INCR-CANCELAMENTO-CANCELLING mergeados (editam os
   mesmos 4 arquivos). Se o AR ganhar `CANCELLING` até lá, a máquina nasce com ele.
5. **PR-4: `AccountingDataExchangeJob` e `AgentTurn`.**
6. **PR-5: `FiscalDocument`, só declaração.** **Precondição:** `integration/x10a` fechada na `main` e os itens da caixa sobre
   transições do DF-e com destino. Este PR não resolve nenhum deles.
7. **PR-6: `allowedActions` no DTO de leitura** (F-SM-4). Depois de PR-1..PR-5.
8. **PR-7: os ciclos simples** (F-SM-5).

Cada PR vermelho de código passa pelo `revisor-independente`. PRs 1 a 5 vivem em `integration/maquina-de-estados` (2+ PRs do
mesmo tema, regra de 10/11); o PR-0 é contrato e vai direto à `main`.

---

## 4. Checklist (cada item testável sozinho)

### PR-0 — contrato

- **0.1** `lib/lifecycle.ts` ganha `defineLifecycle` (§5.1), **aditivo**: as 4 funções atuais mantêm assinatura e
  comportamento. Teste: os testes de `Payable.transitions` e `Receivable.transitions` seguem verdes sem edição.
- **0.2** `lifecycleProblems(spec)` devolve a lista de inconsistências, e vazio quando: todo estado é chave da tabela; todo
  `de`/`para` de comando é estado; todo par `(de, para)` com `de ≠ para` do produto `from × to` do comando é aresta da
  tabela (comando cujo produto incluiria par ilegal se divide em dois); toda aresta da tabela é coberta por pelo menos um
  comando. Par `de === para` não é problema de declaração: só o `assertCommand` decide, e só aceita com `sameState: true`
  (0.5). Teste: um caso por regra, cada um vermelho ao quebrar a regra.
- **0.3** `sourcesFor(comando)` devolve exatamente o `de` declarado (nunca `sourcesOf(tabela, para)`, fato 9). Teste com a
  tabela do AP: `sourcesFor('completeCancelling')` é `['CANCELLING']`, e `sourcesOf(…, 'CANCELLED')` tem 4.
- **0.4** `allowedCommands(estado)` devolve os comandos cujo `de` contém o estado, em ordem estável (a de declaração). Teste.
- **0.5** `assertCommand(comando, de, para, rótulo)` lança `ValidationError` com o par e o comando nomeados quando `de` ou
  `para` está fora do comando. Mesmo estado sem `sameState` também lança. Teste.
- **0.6** Nenhum I/O, nenhum import fora de `lib/errors`, nenhum efeito no carregamento do módulo (não lança no import: a
  inconsistência é pega pelo teste da máquina). Teste: importar com uma spec inválida não lança.
- **0.7** Docs: emenda **D6 (comandos)** e **D7 (repositório fechado)** no PRE-ADR, conforme F-SM-2; linha nova no Contrato §2
  (repositório de agregado com ciclo de vida não expõe `status` em `update` genérico); regra nova no
  `backend-repository-generator` (próximo id `REPO-` livre) e no `luminaris-reviewer`. Gate: `skill-audit run` com 0 findings.
- **0.8** `docs/operating-manual/TESTES.md`: linha "mudei transição de status → rodo o `<Agregado>.lifecycle.test.ts`".

### PR-1 — `BankSettlementItem` (molde)

- **1.1** Derivar a tabela pela leitura dos 4 chamadores de `compareAndSetStatus` e de `claimStaleConfirming`; declarar
  `BANK_SETTLEMENT_LIFECYCLE` no model, com `CONFIRMING → CONFIRMING` como comando `sameState` (fato 10).
- **1.2** `BankSettlement.lifecycle.test.ts`: `lifecycleProblems` vazio; terminais conferidos; falsificador documentado
  (tirar uma aresta deixa o teste vermelho; restaurar com `git diff` vazio).
- **1.3** `compareAndSetStatus(de, para)` sai da interface; entra um método por comando, com
  `where: { status: { in: sourcesFor(c) } }` e o `para` tipado como união dos destinos do comando. Teste de repositório
  contra SQLite (um arquivo, `--runInBand`): partindo de estado fora do `de`, o método devolve 0 e não grava.
- **1.4** Cada chamador troca a chamada sem mudar o desfecho de hoje (mesmo erro, mesmo código HTTP quando o CAS perde).
  Teste: os testes atuais do `BankSettlementService` seguem verdes sem edição de expectativa.
- **1.5** Cabeçalho `atomicUntil` do `BankSettlementService` intacto e o teste por linha dele verde (Contrato §2.3).

### PR-2 — `CollectionCharge`, `JournalEntry`, `FixedAsset` (um commit cada, itens 1.1 a 1.5 aplicados)

- **2.1** `CollectionCharge`: `casStatus(de, dados)` sai; comandos derivados dos 6 chamadores (webhook e polling incluídos).
- **2.2** `JournalEntry`: `LEDGER_STATUSES` vira `as const` com o tipo; `setStatus(status, expectedStatus?)` sai, e todo
  comando tem `de` obrigatório. **Muda desfecho** onde hoje a chamada não passa `expectedStatus`: cada sítio é item próprio
  (2.2.a, 2.2.b…), listado na abertura do PR, com teste-guarda vermelho antes (corrida simulada por spy, como o
  `reverseEntryStatusCas.integration.test.ts` do SM F-16.1) e desfecho `ConflictError` 409.
- **2.3** `FixedAsset`: `activate` e `dispose` já são comandos; `addAccumulated(nextStatus?)` passa a receber o destino pelo
  comando `depreciate` (`ACTIVE → ACTIVE | FULLY_DEPRECIATED`, com `sameState`). O CAS por `version` não muda.

### PR-3 — `Payable` e `Receivable`

- **3.1** `PAYABLE_LIFECYCLE` e `RECEIVABLE_LIFECYCLE` com os comandos do §5.2; `PAYABLE_TRANSITIONS` e
  `RECEIVABLE_TRANSITIONS` continuam exportadas (são o campo `transitions`). Teste: as constantes de CAS existentes
  (`*_SETTLEABLE_STATUSES`) são **iguais** ao `de` do comando correspondente.
- **3.2** `updatePayable`/`updateReceivable`: o tipo do dado vira `Omit<Prisma.…UpdateInput, 'status'> & { status?: never }`
  (só o `Omit` recusa literal, mas deixa passar variável ou spread que carregue `status`). Teste de tipo no job de `tsc` que
  já roda, com dois casos `// @ts-expect-error`: o literal `{ status: 'OPEN' }` e uma variável tipada
  `Prisma.PayableUpdateInput` com `status`.
- **3.3** Cada escrita livre do fato 3 e do fato 4 vira método de transição com **os campos companheiros na mesma instrução**
  (§5.3). Uma escrita não vira duas.
- **3.4** Sítios que passam a ter `status` no `where` e **mudam desfecho** quando perdem a corrida, um item cada, teste-guarda
  antes: (a) `PayableService:1351` recálculo; (b) `:1355` destrava `PAYING`; (c) `:2239` compensação;
  (d) `WithholdingService:399/407` adiar; (e) `:484` desfazer acúmulo; (f) `:566` cancelar título de imposto;
  (g) `ReceivableService:438` cancelar; (h) `:555` recálculo, que também fecha o lado AR do SM F-01.2; (i) `:559`;
  (j) `:982` compensação (fecha o aberto do PRE-ADR §5, `RECEIVING → CANCELLED`). Desfecho: F-SM-6.
  **400 e 409 não se misturam:** o par ilegal detectado na leitura continua `ValidationError` 400 (`assertPayableRecalc`, e o
  teste-guarda do SM F-01.2 segue verde sem editar expectativa); 409 é só para "a leitura era legal e a escrita gravou 0
  linhas". O código do 409 segue o padrão dos que já existem (`TITULO_MUDOU_DURANTE_O_CANCELAMENTO`): constante no model,
  sem chave de i18n e fora do alfabeto da bandeja (em 26/11 esses códigos não aparecem em `my-app/public/locales` nem em
  `accounting/dtos`).
- **3.5** O recálculo que repete o status continua sem transição e sem escrita de `status` (fato 10); o teste de hoje
  ("estorno de uma de duas baixas") segue verde.
- **3.6** Cabeçalhos `atomicUntil` de `PayableService` e `ReceivableService` intactos; testes por linha verdes.

### PR-4 — `AccountingDataExchangeJob` e `AgentTurn`

- **4.1** Job: tabela derivada dos 5 geradores e de `failStaleProcessing`; `updateJob` perde `status` do tipo; comandos com
  `de`. Sítios que mudam desfecho: item próprio cada, como em 2.2.
- **4.2** `AgentTurn`: `finish` vira comando com `where: { status: 'RUNNING' }`. **Muda desfecho** (turno já finalizado por
  outra via): teste-guarda antes; desfecho conforme F-SM-6.

### PR-5 — `FiscalDocument` (declaração)

- **5.1** `FISCAL_DOCUMENT_LIFECYCLE` no model, derivada dos ~12 chamadores de `transition`; `VALID_RESULT_TRANSITIONS` passa
  a ser lida dela (o comando `applyResult`) e `isValidResultTransition` mantém o resultado para todo par (teste de
  equivalência sobre o produto cartesiano dos estados).
- **5.2** `transition(…, whenStatusIn?)`: `whenStatusIn` vira obrigatório e vem do comando. Sítio que hoje não passa guarda:
  item próprio, teste-guarda antes.
- **5.3** Nenhuma aresta nova. Par que a caixa aponta como faltante (ex.: `CANCELLED` como resultado de consulta) **não entra**.

### PR-6 — `allowedActions` (F-SM-4)

- **6.1** Os DTOs de leitura dos 9 agregados ganham `allowedActions: string[]` = `allowedCommands(status)` filtrado pelos
  comandos expostos por rota. É condição **necessária**, não suficiente: o servidor continua recusando por período, saldo e
  policy. Gates: snapshot de shape dos DTOs (inserir só o campo novo, sem `UPDATE` em massa), tipos gerados do front,
  `public/openapi.json`.

### PR-7 — ciclos simples (F-SM-5)

- **7.1** Tabela + comandos + teste por máquina para os modelos do PRE-ADR §1.1 "Implícito, simples"; repositório fechado onde
  houver `update` genérico que aceite `status`. Sem mudança de desfecho; sítio que mudar sai deste PR e vira item próprio.

---

## 5. Contratos (esboço materializável)

### 5.1 `lib/lifecycle.ts` (acréscimo)

```ts
export type CommandSpec<S extends string> = {
  readonly from: readonly S[];
  readonly to: readonly S[];
  /** true = o comando pode gravar o mesmo estado (ex.: retomada de CONFIRMING preso). */
  readonly sameState?: true;
};
export type CommandTable<S extends string> = Readonly<Record<string, CommandSpec<S>>>;

export interface Lifecycle<S extends string, K extends CommandTable<S>> {
  readonly states: readonly S[];
  readonly transitions: TransitionTable<S>;
  readonly commands: K;
  sourcesFor<C extends keyof K>(command: C): K[C]['from'];
  targetsFor<C extends keyof K>(command: C): K[C]['to'];
  allowedCommands(from: S): (keyof K)[];
  assertCommand<C extends keyof K>(command: C, from: S, to: K[C]['to'][number], label: string): void;
}

export function defineLifecycle<S extends string, const K extends CommandTable<S>>(spec: {
  states: readonly S[];
  transitions: TransitionTable<S>;
  commands: K;
}): Lifecycle<S, K>;

/** Vazio = consistente. Usado pelo teste de cada máquina; nunca chamado no carregamento. */
export function lifecycleProblems<S extends string>(spec: {
  states: readonly S[]; transitions: TransitionTable<S>; commands: CommandTable<S>;
}): string[];
```

### 5.2 Comandos do AP (derivados do JSDoc de `Payable.model.ts:27-41`; conferir sítio a sítio no PR-3)

```ts
export const PAYABLE_LIFECYCLE = defineLifecycle({
  states: PAYABLE_STATUSES,
  transitions: PAYABLE_TRANSITIONS,
  commands: {
    claim:                { from: ['OPEN', 'PARTIALLY_PAID'], to: ['PAYING'] },
    finalize:             { from: ['PAYING'], to: ['PAID', 'PARTIALLY_PAID'] },
    revertClaim:          { from: ['PAYING'], to: ['OPEN', 'PARTIALLY_PAID'] },
    reopenBySettlementReversal: { from: ['PAID', 'PARTIALLY_PAID'], to: ['OPEN', 'PARTIALLY_PAID'] },
    defer:                { from: ['OPEN'], to: ['DEFERRED'] },
    undefer:              { from: ['DEFERRED'], to: ['OPEN'] },
    startCancelling:      { from: ['OPEN', 'PARTIALLY_PAID', 'PAID'], to: ['CANCELLING'] },
    completeCancelling:   { from: ['CANCELLING'], to: ['CANCELLED'] },
    cancelTaxTitle:       { from: ['OPEN'], to: ['CANCELLED'] },
    compensateRecognition:{ from: ['OPEN', 'PARTIALLY_PAID', 'PAID'], to: ['CANCELLED'] },
  },
});
```

`reopenBySettlementReversal` cobre `PARTIALLY_PAID → OPEN`, `PAID → PARTIALLY_PAID`, `PAID → OPEN`; `PAID → PAID` não existe
(o serviço já recusa, `PayableService.ts:1343-1349`), e `PARTIALLY_PAID → PARTIALLY_PAID` não é transição (item 3.5).

### 5.3 Repositório fechado (forma; AP como exemplo)

```ts
// IPayableRepository
type PayableNonStatusUpdate = Omit<Prisma.PayableUpdateInput, 'status'> & { status?: never };
updatePayable(scope, id, data: PayableNonStatusUpdate, tx?): Promise<Payable>;

// uma transição = um updateMany; devolve a contagem; campos companheiros no mesmo statement
recalcAfterSettlementReversal(scope, id, to: 'OPEN' | 'PARTIALLY_PAID', tx): Promise<number>;
defer(scope, id, tx): Promise<number>;
undefer(scope, id, data: { amountCents: bigint; documentNumber: string }, tx): Promise<number>;
cancelTaxTitle(scope, id, data: { deletedAt: Date; documentNumber: string | null }, tx): Promise<number>;
compensateRecognition(scope, id, data: { deletedAt: Date; documentNumber: string | null }, tx?): Promise<number>;
// já existentes, só passam a ler o `from` do comando: claimForPayment, finalizeIfPaying, releaseClaim,
// resolveRevertedClaim, casStartCancelling (deixa de receber `fromStatuses` livre: recebe o subconjunto tipado do comando),
// casCompleteCancelling.
```

Regras da forma: (1) `where` sempre com `status: { in: [...LIFECYCLE.sourcesFor(c)] }`, mais as condições que o método já
tem hoje (saldo, `version`, `deletedAt`); (2) o repositório **não** decide o destino: recebe o `para` tipado; (3) 0 linhas é
devolvido, e quem traduz em erro é o serviço; (4) nenhum método novo abre transação.

### 5.4 Erro de quem perde o CAS (F-SM-6)

```ts
// lib/errors.ts já tem ConflictError (409). Código por agregado, no model:
export const PAYABLE_STATUS_CHANGED_CODE = 'TITULO_MUDOU_DE_STATUS';
```

---

## 6. Forks — RATIFICADOS (dono, questionário, 26/11: todos na recomendação; a coluna "Recomendação" é o que valeu)

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-SM-1** Nota de nó em `docs/plano/nos/` | (a) criar `MAQUINA-DE-ESTADOS` com `autorizacao` de 26/11 ("só BRIEF, sem executa") e `write_set`; (b) seguir sem nó, como a auditoria de estruturas implícitas | **(a)**: sem nó o maestro não roteia (`autorizacao` vazio) e o item entra serial em todo lote. Precedente: `CENTAVOS-EXATOS` (24/11) |
| **F-SM-2** Onde mora a decisão | (a) emendar o PRE-ADR com D6 e D7 e promovê-lo a ADR `Accepted` no PR-0; (b) só neste BRIEF | **(a)**: o D2 do PRE-ADR diz "a execução não muda", e o repositório fechado muda o desfecho de 11 sítios no AP/AR e de outros nos demais agregados; deixar só no BRIEF cria duas fontes |
| **F-SM-3** Guarda da classe para agregado novo | (a) `tsc` + teste por máquina + regra no gerador e no revisor (D5 do PRE-ADR); (b) teste que descobre `status String` no schema e reprova modelo sem máquina, com baseline que só encolhe | **(a)**: (b) é gate novo e a regra ⛔ do `CLAUDE.md` só o admite por exceção sua. Fica aberto: modelo novo pode nascer sem máquina se gerador e revisor falharem |
| **F-SM-4** `allowedActions` no DTO | (a) só por status, último PR; (b) status + guardas puras sobre a linha (saldo, retenções); (c) não fazer agora | **(a)**: (b) duplica regra que hoje é do serviço dentro da tx; o front trata `allowedActions` como "pode tentar", e o 4xx continua valendo |
| **F-SM-5** Os ~30 ciclos simples | (a) entram no PR-7, tabela + comandos + teste, repositório fechado onde houver escrita livre; (b) só os 9 | **(a)**: sem eles 32 das 41 colunas seguem sem grafo, e a regra de geração ficaria sem exemplo nos módulos simples |
| **F-SM-6** Desfecho de quem perde o CAS num sítio hoje incondicional | (a) `ConflictError` 409 com código por agregado (`…_MUDOU_DE_STATUS`); (b) 400 `ValidationError` como o `assertTransition`; (c) silencioso (0 linhas, segue) | **(a)** para chamada de usuário; em job e compensação, 0 linhas vira `BLOCKED`/log pelo caminho que o serviço já tem (nunca silencioso). 400 diz "pedido inválido", e aqui o pedido era válido quando foi lido |
| **F-SM-7** Ordem em relação ao CANCELLING | (a) AP/AR só depois do PR-2 do CANCELLING; (b) AP/AR primeiro, e o CANCELLING rebaseia | **(a)**: o CANCELLING tem forks ratificados e trabalho em voo nos mesmos 4 arquivos |

---

## 7. Pendente de validação externa

Nenhum item. O BRIEF não cria regra contábil, fiscal nem legal: declara transições que o código já faz.

## 8. Insumos ausentes

1. **Função dona de `WithholdingService.ts:566`** e o guard que a precede ("exige OPEN" vem do JSDoc do model, não da leitura
   do serviço). O PR-3 abre lendo `:380-570`.
2. **`JournalEntry`:** onde nascem `Draft` e `PendingApproval` (fato 11) e quais dos 5 chamadores de `setStatus` passam
   `expectedStatus`. O PR-2 abre com essa leitura; a lista de itens 2.2.x sai dela.
3. **`AccountingDataExchangeJob`:** os 8 estados e os sítios de `updateJob` com `status` (não lidos). O PR-4 abre com a leitura.
4. **`CollectionCharge` e `FiscalDocument`:** os chamadores foram contados por regex, não lidos. A derivação é o item 1 de
   cada PR, e o teste de drift é a prova.
5. **`atomicUntil.boundary.test.ts`:** não li se o teste restringe nomes de método de repositório no cabeçalho. Ler antes do
   PR-1.
6. **`BE-INCR-API-ERROR-ENVELOPE`:** se o envelope de erro novo já estiver na `main` quando o PR-1 abrir, o código do F-SM-6
   segue o formato dele.

## 9. Achados fora de escopo

Nenhum defeito achado fora do item. `LACUNAS NA CAIXA: 2` (`L-20261126-181923-c16f`, `L-20261126-181930-5f5d`): são as duas
fatias do §10, registradas como `spec` para terem fila.

## 10. Fatias do mesmo item autorizado, com BRIEF próprio (na caixa)

- **FE-INCR-MAQUINA-DE-ESTADOS** (`L-20261126-181923-c16f`; fila §4, itens 4 e 5): predicados e tons de status no `lib/services/<domínio>.service.ts`,
  união discriminada nos fluxos de tela, consumo de `allowedActions`. Depende do F-SM-4 e do PR-6.
- **Presets DynamicTable** (`L-20261126-181930-5f5d`; fila §4, item 6): `lifecycle` em Sales, Leads, LeadProposals, LeadActivities, Opportunities, Tasks,
  Campaigns e Product. **Muda comportamento**; cada preset precisa da matriz de transições confirmada pelo dono (PRE-ADR D3).
  O insumo que falta é a matriz, não código.

## 11. Write-set (gravado no frontmatter do nó `MAQUINA-DE-ESTADOS`)

| PR | Arquivos |
|---|---|
| PR-0 | `server/src/lib/lifecycle.ts`; `server/src/lib/__tests__/lifecycle.test.ts` (novo); `docs/adr/PRE-ADR-LIFECYCLE-TRANSITIONS.md`; `docs/adr/INDEX.md`; `.claude/skills/_ARCHITECTURE-CONTRACT.md`; `.claude/skills/backend-repository-generator/SKILL.md`; `.claude/skills/luminaris-reviewer/SKILL.md`; `docs/operating-manual/TESTES.md` |
| PR-1 | `server/src/features/accounting/models/BankSettlement.model.ts`; `…/models/__tests__/BankSettlement.lifecycle.test.ts` (novo); `…/repositories/{I,}BankSettlementRepository.ts`; `…/services/BankSettlementService.ts` |
| PR-2 | `…/models/{CollectionCharge.model,ledgerStatus,FixedAsset.model}.ts`; `…/repositories/{I,}{CollectionCharge,JournalEntry,FixedAsset}Repository.ts`; os serviços chamadores (lista fechada na abertura do PR); testes de máquina (novos) |
| PR-3 | `…/models/{Payable,Receivable}.model.ts`; `…/repositories/{I,}{Payable,Receivable}Repository.ts`; `…/services/{PayableService,ReceivableService,WithholdingService}.ts`; testes |
| PR-4 | `…/models/DataExchange.model.ts`; `…/repositories/{I,}DataExchangeRepository.ts`; os 5 geradores; `server/src/features/teammates/{models/AgentTurn.model,repositories/AgentTurnRepository,services/TeammateRunner}.ts` |
| PR-5 | `…/models/` do DF-e; `…/repositories/{I,}FiscalDocumentRepository.ts`; `…/services/FiscalDocumentLifecycleService.ts` e os chamadores de `transition` |
| PR-6 | os DTOs de leitura dos 9 agregados; `…/dtos/__tests__/__dto-shapes__.json`; `my-app/types/contracts/**` (gerados); `server/public/openapi.json` |

**Exatidão:** o write-set é exato para PR-0, PR-1 e PR-3. Em PR-2, PR-4, PR-5 e PR-7 os serviços chamadores só se fecham
na leitura de abertura do PR (insumos ausentes 2 a 4); a sessão que abrir cada um regrava o `write_set` do nó antes de
editar, e até lá o `paralelo.mjs` não enxerga esses arquivos.

**Registros (choke points):** nenhum em PR-0..PR-5 (`factory.ts`, `routes/index.ts`, `schema.prisma` e `auditCanonical.ts`
não são tocados: não há rota, migração nem evento novo). PR-6: `server/public/openapi.json` e o snapshot de DTO.

## 12. Que teste prova o quê

| Afirmação | Teste | Onde roda |
|---|---|---|
| A máquina é consistente (estado, aresta, cobertura) | `<Agregado>.lifecycle.test.ts` com `lifecycleProblems` | unit |
| O CAS do repositório usa o `de` do comando | teste de repositório contra SQLite, um arquivo, `--runInBand` | integração |
| `status` não entra em `update` genérico | `// @ts-expect-error` no teste de tipo | `tsc` |
| Sítio que passou a ser condicional recusa quando perde | teste-guarda por sítio, com spy que troca o status entre leitura e escrita (determinístico, nunca concorrência real) | integração |
| Nenhum desfecho mudou onde o BRIEF diz "sem mudança" | os testes atuais do serviço, sem editar expectativa | unit + integração |

**Caso adversarial tentado contra o desenho:** "o `where` sai de `sourcesOf(tabela, para)`" (era a formulação inicial desta
sessão). Falha no AP: `sourcesOf(…, 'CANCELLED')` admite 4 estados, e `casCompleteCancelling` só pode sair de `CANCELLING`
(fato 9). O contrato passou a ser comando → `{de, para}`. **Checagem que teria falhado se o inventário estivesse errado:** o
`grep` de `updatePayable`/`updateReceivable` com `status` no objeto, com 3 linhas de contexto, que achou os 11 sítios dos
fatos 3 e 4.
