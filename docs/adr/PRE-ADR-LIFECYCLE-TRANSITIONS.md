# PRE-ADR-LIFECYCLE-TRANSITIONS — Máquinas de estado implícitas: inventário e forma única

- **Data:** 2026-11-09
- **Status:** **Proposed** — pedido do dono no chat (2026-11-09): "Find all of the implicit state machines in my app. Make the best decision that will elevate all three: UX, DX and AX, without breaking anything". O merge do PR é a ratificação. O piloto não muda o comportamento de nenhum caminho de runtime.
- **Classe:** CONVENÇÃO (declaração + função), **não motor**: compatível com `ADR-DOMAIN-MOTOR-rejected.md` §2 ("vale uma convenção declarada no arquivo e provada por teste").
- **Piloto neste PR:** `server/src/lib/lifecycle.ts`, `PAYABLE_TRANSITIONS` em `server/src/features/accounting/models/Payable.model.ts`, e o teste `models/__tests__/Payable.transitions.test.ts`.

## TLDR

O app tem cerca de **41 ciclos de vida de `status` Prisma**, **9 presets DynamicTable com `status`** e **cerca de 25 fluxos de tela**
(58 arquivos com 3 ou mais flags de ciclo de vida). O **vocabulário** quase sempre está declarado (`*_STATUSES as const`). Já o **grafo**
(quem vai para onde) só está explícito em 4 lugares; no resto, ele vive espalhado em cláusulas `where: { status: { in: [...] } }` de CAS,
em `if (x.status !== 'OPEN')` dos serviços e em JSX. A decisão é uma única forma, `{ de: [para…] }`, que já é a do motor de
DynamicTable, agora tipada e colocada junto do `*_STATUSES`. A corrida continua no CAS do repositório. No front, o ciclo de
vida passa a ser uma união discriminada, e o significado de cada status vem do service do domínio.

## 1. Inventário (grau por linha)

### 1.1 Backend Prisma: vocabulário declarado, grafo implícito

Fonte: `awk` sobre `server/prisma/schema.prisma` (41 colunas `status String`, todas `String` porque o banco é SQLite e não tem enum)
e `grep` das escritas `status: '<LIT>'` fora de teste. **Verificado.**

| Grafo | Modelos |
|---|---|
| **Explícito** (tabela ou máquina no código) | `FiscalDocument` (`VALID_RESULT_TRANSITIONS`, `FiscalDocumentLifecycleService.ts:66`, só os resultados da porta), `AccountingBinding` (máquina em prosa + regra "linha nova", `accountingBindingStatus.ts`), `PaymentAccount` (prosa + `PATCH_TARGETS`, `PaymentAccount.model.ts:6-23`; no front, `patchTargets`) |
| **Implícito, com alto fan-out** (≥ 3 serviços ou ≥ 6 sítios de escrita) | `Payable` (3 serviços, cerca de 12 sítios, incluindo `DEFERRED` vindo de `WithholdingService`): **piloto**. `Receivable` (espelho do AP), `CollectionCharge` (9 estados, webhook), `BankSettlementItem` (6), `AccountingDataExchangeJob` (8, 5 geradores SPED/ECF/Reinf), `JournalEntry` (Draft→PendingApproval→Posted→Reconciled→Reversed), `FixedAsset` (ACC-016: comandos), `AgentTurn` (5) |
| **Implícito, simples** (2–4 estados, quase linear) | `PayablePayment`/`ReceivableReceipt` (ACTIVE→CANCELLED), `TaxWithholding`, `ReceitaFiscalRecebimento`, `Dimension*`, `InventoryItem` (ACTIVE↔ARCHIVED), `TaxAssessment`/`ConsumptionTaxAssessment`/`SimplesApuracao` (CONFIRMED→SUPERSEDED), `ProfitDistributionEvent`/`InterestOnEquityCalculation` (PENDING_POST→POSTED\|CANCELLED), `KitInstallation`, `KitUpgradeRun`, `KitUpgradePending`, `FiscalNumberVoid`, `FiscalDocumentPendingAttachment`, `NfceContingenciaOrfa`, `ReinfBatch`, `AccountingDeliveryLog`, `AccountingReview`, `AccountantAssignment`, `AccountingPolicyVersion`, `LegalParameter`, `LegalParameterRecalcJob`, `TaxOptimizationSuggestion`, `ActionProposal`, `Teammate`, `BankStatementLine`, `AccountingDataExchangeRow` |
| **Sem coluna, derivado** | `AccountingPeriod` (FUTURE/OPEN/SOFT_CLOSED/HARD_CLOSED em `PeriodService`), estágio da entrevista de IA (`InterviewService`) |

Achados de classe (**verificados**):
- A coluna é `String` no Prisma, então `data: { status: 'PAYNG' }` compila. Só o `*_STATUSES` tipa a leitura, não a escrita.
- O grafo do AP só se reconstrói lendo `PayableRepository` (CAS), `PayableService` (cancelar, estornar, reverter o claim, compensar) e `WithholdingService` (`DEFERRED`↔`OPEN`). Um agente que lê só o model vê `PAID`/`CANCELLED` "terminais" (o JSDoc diz isso), mas o estorno leva `PAID → PARTIALLY_PAID|OPEN`, e a compensação leva `PAID → CANCELLED`. **O comentário estava incompleto, e a tabela do piloto corrige isso.**
- As escritas não condicionais por recálculo (`updatePayable({ status: payableStatusForBalance(...) })`, em 4 sítios) não passam por guarda de transição.

### 1.2 Backend DynamicTable: a forma já existe, mas pouco usada

`ILifecycleRule.transitions: Record<string, string[]>` (`dynamicTables/models/DynamicTable.model.ts:135`) é aplicado pelo motor.
**Quem declara:** `AppointmentsModule` e `CommissionsModule`. **Quem tem `status` sem `lifecycle`:** Sales, Leads, LeadProposals,
LeadActivities, Opportunities, Tasks, Campaigns, Product (**verificado**, `grep -L "lifecycle:"`). Venda tem `draft/finalized/cancelled/returned`,
comparados em minúsculas no front (§1.3).

### 1.3 Frontend (`my-app/`)

Varredura por subagente; o grau é **inferido por regex**, e os números são aproximados.
- **58 arquivos** com 3 ou mais flags de ciclo de vida (`loading/busy/saving/error/…`). Os piores: `useAiInterview.ts:82-107` (18 `useState`, estágio `string` cru), `TotalControlSetup.tsx`, `ReconciliationPanel.tsx`, `DeliveryPanel.tsx` (wizard implícito: manifest→confirm→busy→receipt/error, com `receipt` e `error` possíveis ao mesmo tempo), `EntryApprovalsPanel.tsx`, `useGovernedSave.ts` (`proposed` e `savedDirect`, desfechos exclusivos, podem coexistir), `CrmReportBuilder.tsx`, `AssinadorLocalSection.tsx` (pareamento reconciliado por effect + polling de 30 s).
- **45 literais de status do backend em 32 arquivos**, sem predicado compartilhado. A mesma máquina AP/AR foi copiada em `AccountsPayablePanel`/`AccountsReceivablePanel`. `SENT||PROCESSING` aparece duplicado em `FiscalDocumentsSection` e `FichaModal`. O status de venda é `String(s).toLowerCase() === 'finalized'` em 5 arquivos. Há cerca de 12 mapas `STATUS_TONE/LABEL/CHIP` locais.
- **O canônico já existe:** a união discriminada de `features/accounting/hooks/useUnitKit.ts` (`{ state: 'loading'|'none'|'error'|'loaded' }` + guarda de resposta velha), `useValidityNotice.ts` (`idle|loading|ready|error`), os predicados no service (`lib/services/paymentAccounts.service.ts` `patchTargets`, `collectionCharges.service.ts:107`, `accountsReceivable.service.ts` `CHARGEABLE_RECEIVABLE_STATUSES`) e `dfeLabels.ts`. Não há xstate, SWR nem react-query, e não precisa haver.

## 2. Decisão

**D1 — Prisma: a tabela fica junto do vocabulário.** Cada ciclo de vida com fan-out ganha
`export const <X>_TRANSITIONS = { … } as const satisfies TransitionTable<XStatus>` no mesmo model do `<X>_STATUSES`
(`lib/lifecycle.ts`). O `satisfies` reprova estado esquecido ou digitado errado no `tsc`. Terminal = `[]`. `X → X` só vale se constar
(o `PaymentAccount` recusa o mesmo status com 409, dono 03/10).

**D2 — A execução não muda.** A transição continua no CAS do repositório (`updateMany where status …`), dentro da tx quando o gate
é autoritativo (`server/CLAUDE.md` gate 5). A tabela alimenta o CAS (`status: { in: sourcesOf(T, 'PAYING') }`), ou um teste amarra o
subconjunto existente à tabela (`PAYABLE_SETTLEABLE_STATUSES == sourcesOf(T,'PAYING')`). Escrita **não condicional** (recálculo)
passa a chamar `assertTransition(T, de, para, rótulo)`, que dá 400 com o par nomeado. Sem fase, fila, efeito, hook nem registry:
**não é o motor rejeitado.**

**D3 — DynamicTable: mesma forma, já existente.** `schema.lifecycle.transitions` é o lugar do grafo de preset. Não se cria um segundo mecanismo.
Declarar `lifecycle` num preset que hoje não tem (Sales, Leads, Opportunities…) **muda o comportamento** (passa a recusar transições
que a tela faz hoje, como lead voltando de etapa no kanban). Por isso fica fora do piloto, e cada preset é um PR com a matriz de
transições confirmada pelo dono.

**D4 — Front: ciclo de vida = união discriminada; significado de status = service do domínio.**
- Fluxo de tela novo, ou fluxo tocado: `type S = { state: 'idle' } | { state: 'busy' } | { state: 'done'; receipt } | { state: 'error'; message }`
  (o padrão de `useUnitKit`), no lugar de N booleans. Assim, "receipt e error juntos" fica irrepresentável.
- Predicados e tons de status (`isAwaitingReturn`, `canCancel`, `STATUS_TONE`) moram no `lib/services/<domínio>.service.ts` ao lado
  da união de status, como `patchTargets` já faz. Componente não compara literal de backend.
- Nada de lib nova (xstate e afins): o padrão já está na casa (`_REUSE-CRITERION`: reusa o canônico vivo).

**D5 — Sem gate novo.** Regra ⛔ do CLAUDE.md: a convenção é cobrada pelo `tsc` (`satisfies`) e por um teste por máquina, no job
de teste que já roda. Não se cria lint de "status sem tabela".

### Por que eleva os três

| | Hoje | Com D1–D4 |
|---|---|---|
| **UX** | Transição ilegal vira 400 genérico, ou passa calada em escrita de recálculo; na tela, estados contraditórios (erro + recibo, botão ativo durante busy) | Recusa com o par `de → para` nomeado; a tela só oferece ações que a tabela permite, e as combinações impossíveis deixam de existir |
| **DX** | Reconstruir o grafo exige ler 3 serviços; literal digitado errado compila | Um objeto por máquina; o `tsc` pega estado faltando; o teste pega divergência entre a tabela e as constantes do CAS |
| **AX** | O agente lê o model, vê "PAID terminal" e erra (o comentário estava incompleto) | A tabela é a resposta citável em um `Read`; o teste de drift avisa o agente que mudou um sítio sem mudar a tabela |

## 3. O que este PR faz (e o que não faz)

- **Faz:** `lib/lifecycle.ts` (4 funções puras), `PAYABLE_TRANSITIONS` (derivada da leitura dos sítios listados no JSDoc), e 6 testes.
- **Não faz:** não muda nenhum caminho de runtime, nenhum `where`, nenhuma escrita, nenhum preset nem nenhuma tela. Por isso "sem quebrar nada" vale
  por construção: o diff só adiciona uma constante, um arquivo de lib e um teste.

**Caso adversarial tentado:** "`X → X` sempre permitido" (primeira versão do helper) contradiz o `PaymentAccount` (mesmo status
dá 409). O helper ficou estrito. **Falsificador:** tirar `PAYING` de `PARTIALLY_PAID` na tabela deixa o teste vermelho (1 falha,
"claim do sum-CAS parte exatamente de PAYABLE_SETTLEABLE_STATUSES"); o arquivo foi restaurado e conferido com `grep`.

## 4. Fila de adoção (um PR por item, na ordem; cada um "sem mudança de comportamento" salvo o marcado)

1. ✅ `Receivable` (espelho do AP): tabela + teste, e o CAS `RECEIVABLE_SETTLEABLE_STATUSES` amarrado. Feito em `RECEIVABLE_TRANSITIONS` + `Receivable.transitions.test.ts`; o JSDoc também deixou de chamar `RECEIVED` de terminal. Diferença do AP: o título nasce sempre `OPEN`, então só `OPEN → CANCELLED`.
2. AP/AR: `assertTransition` nos 4 recálculos não condicionais. **Pode mudar o comportamento** se algum recálculo hoje produzir um par fora da tabela, e isso seria bug revelado. Fazer pela `sessao-instrumentacao` primeiro.
3. `CollectionCharge`, `BankSettlementItem`, `AccountingDataExchangeJob`, `JournalEntry`, `FixedAsset`, `AgentTurn`.
4. Front: `AccountsPayablePanel`/`AccountsReceivablePanel` e `FiscalDocumentsSection`/`FichaModal` passam a ler predicados do service; `DeliveryPanel`, `useGovernedSave` e `useAiInterview` passam para união discriminada (o estágio da entrevista vira união tipada).
5. Status de venda: união tipada `draft|finalized|cancelled|returned` + predicado único (5 arquivos).
6. Presets DynamicTable com `lifecycle` (D3): **muda o comportamento**, então só com a matriz ratificada pelo dono, preset a preset.
7. Expor no DTO de leitura as ações permitidas (`allowedActions`) derivadas da tabela, para a tela não espelhar regra. Avaliar depois do item 4.

## 5. Aberto

- A tabela do AP foi **derivada pela leitura**, não por execução. As escritas por recálculo (`payableStatusForBalance`) podem produzir pares que a leitura
  não enxergou (ex.: `OPEN → PARTIALLY_PAID` num recálculo após estorno de retenção sobre um título já parcialmente baixado). O item 2 da fila
  é o que converte isso em prova. Grau: **inferido**.
- AR (revisão independente do #1150): o `compensateFailedRecognition` do `ReceivableService` grava `CANCELLED` sem condição de status.
  Se um claim concorrente entrar entre o commit da criação e a falha do reconhecimento, o resultado é `RECEIVING → CANCELLED`, par fora da
  tabela. A tabela acerta ao não legalizá-lo; o item 2 decide entre CAS `where status: 'OPEN'` e `assertTransition`. Grau: **inferido** (leitura, não execução).
