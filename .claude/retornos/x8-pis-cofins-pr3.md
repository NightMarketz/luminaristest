# RETORNO — X8 PR-3 (BE-INCR-PIS-COFINS itens 17–19)

tarefa: executar o PR-3 do X8 (F-PCB-4 a) — provisão de PIS/Cofins no razão, reconcile, encerramento × provisão pendente
autorização: dono, chat, 2026-10-06 — "Executa o PR-3 do X8 em opus médio" (via orquestrador). PR-2 (#554) e PR-3 entram
  em main JUNTOS (decisão do dono 06/10, risco D6) ⇒ este PR é EMPILHADO sobre `claude/x8-pis-cofins-pr2`.
  O campo `autorizacao` de `docs/plano/nos/X8.md` ainda não cita esta autorização (fold pós-merge; vault fora do diff).
agente: subagente (sessao-feature), worktree agent-a263424acc7694473, branch `claude/x8-pis-cofins-pr3`
base: `origin/claude/x8-pis-cofins-pr2` `bec77ac1` (PR-2 do X8, sobre main `6ac4381d`; X7 PR-3 #509 em main)
modelo: opus-5.5
rodadas-de-review: 0 — review independente NÃO despachado (regra ⛔ do CLAUDE.md; o dono decide)
veredicto: fatia completa, gates verdes; NÃO mergear sem OK do dono

## Checklist (BRIEF §1)
| Item | Estado | Onde / teste |
|---|---|---|
| 17 provisão commit 2, bridge do X7 item 15, `sourceType='tax.assessment.provision'`, `sourceId` = id, data = último dia do mês | feito | `TaxAssessmentService.provisionar` + `linhasPisCofins` + `fimDoPeriodo` (M01..M12); `pisCofinsProvision.integration.test.ts` "item 17 (cumulativo)" |
| 17 D despesa (`Expense`) / C a recolher = débito bruto | feito | idem |
| 17 não cumulativo: + D a recolher / C `pisCofinsRecuperavelAccountId` = crédito da NF-e aproveitado | feito (leitura L-1) | `creditoNfeAproveitado`; teste "item 17 (não cumulativo)" |
| 17 outros créditos e retenções NÃO lançados (F-PCB-3 a) | feito | teste "item 17 (não cumulativo)" assere a diferença a recolher × DARF |
| 17 falha ⇒ pendente, commit 1 intacto; CAS do `provisaoEntryId`; substituição = reverseEntry + postEntry; `atomicUntil` | feito (reuso do mecanismo do X7, sem 2ª cópia) | testes "commit 2 — CAS", "substituição", "F-TA-7"; cabeçalho do `TaxAssessmentService` com as linhas X8 |
| 18 reconcile = rota do X7; 2ª chamada asserida (sem lançamento novo, mesmo `provisaoEntryId`) | feito | teste "itens 18 + 19" |
| 19 encerramento × provisão pendente cobre linha PIS | feito | teste "itens 18 + 19" (ids PIS/COFINS no `details.taxAssessmentIds`; encerra depois do reconcile) |

Contratos: nenhum DTO novo nem alterado (o reconcile e a confirmação devolvem a mesma `TaxAssessmentView`); snapshot de
shape e tipos gerados intactos. openapi: só a descrição do `POST /tax-assessments/{id}/provisao` (paths 249, sem mudança).
Allowlist: nenhum eventType novo (o `postEntry` audita como no X7).

## D4 e D6 do PR-2 — como fecharam
- **D4** (V): a guarda `!doIrpjCsll(row) ⇒ 400 "PR-3"` saiu do `reconcileProvisao`; `provisionar` escolhe as linhas pelo
  tributo (`linhasIrpjCsll` × `linhasPisCofins`) — uma linha de PIS nunca cai nas contas da CSLL. Sem conta ⇒ o 400 é o do
  F-TA-7 ("Conta de despesa de PIS não configurada"). O teste do PR-2 que assertava "PR-3" foi ajustado para esse 400.
- **D6** (V): a confirmação de PIS/Cofins agora provisiona (best-effort) e o reconcile completa a pendente; o
  `ExerciseClosingService` (inalterado na regra, só a mensagem passou a dizer "IRPJ/CSLL/PIS/Cofins") deixa de bloquear
  assim que `provisaoEntryId` é gravado. Teste: mês confirmado com débito > 0 sem contas ⇒ encerramento 400 com os ids;
  contas + reconcile 2× ⇒ encerra.

## Desenho
- `TaxAssessmentService.provisionarAposConfirmacao(scope, cair, novas)` (público): estorno best-effort de tudo que caiu +
  `provisionar` das novas — extraído do `confirm` do X7 (que passou a chamá-lo) e injetado no `PisCofinsAssessmentService`
  (`Pick<…>`; factory: `TaxAssessmentService` virou const antes do objeto de serviços). Único chamador de `postEntry`
  continua o `TaxAssessmentService` (o teste `atomicUntil.boundary` não ganha população nova).
- `provisaoPendente`/`valorProvisao` do X7 servem sem mudança (PIS: devido + diferença postergada 0 = débito).

## Divergências BRIEF × código
- **E1** (V) O BRIEF item 17 descreve o bridge "no molde do X7 item 15" como se fosse do X8; no código o mecanismo inteiro
  (estorno pela fonte, CAS, best-effort) mora no `TaxAssessmentService` — reusado, não copiado.
- **E2** (V) `fimDoPeriodo` do X7 não conhecia `M01..M12` (cairia no ramo trimestral). Alargado.
- **E3** (V) A mensagem do encerramento dizia só "IRPJ/CSLL". Alargada (texto; nenhum teste assertava o texto).

## Lacunas de spec — decididas nesta sessão (ratificar)
1. **L-1** "crédito da NF-e aproveitado no mês (a parte do item 6 efetivamente usada)" = `min(CREDITO_NFE +
   CREDITO_NFE_DERIVADO, débito)` — a NF-e é consumida ANTES dos outros créditos e do saldo credor anterior (ordem da
   memória). Alternativa: FIFO (saldo anterior primeiro), que baixaria menos do ativo no mês. (I)
2. **L-2** O saldo credor anterior consumido no mês NÃO é baixado do "a recuperar" (o BRIEF só fala da "parte do item 6").
   Efeito: a parte NF-e do saldo credor transportado fica no ativo para sempre e o "a recolher" fica acima do DARF por esse
   valor (o teste "item 17 (não cumulativo)" mostra 835 centavos). Coerente com a letra; o contador decide (P-1/P-5). (I)
3. **L-3** A provisão de cada tributo é UM lançamento de 2 ou 4 pernas (a conta a recolher aparece a débito e a crédito no
   não cumulativo), porque `sourceId` = id da linha é a chave de idempotência — 1 entry por fonte. (V: o `postEntry` aceita)

## Achados fora de escopo
- (f) e (g) do PR-2 seguem com lançamento manual no lugar da provisão (provam a natureza `Expense`, que é a mesma).
- P-1..P-6 do BRIEF §4 seguem abertos; um teste verde prova a aritmética, não a lei.

## Linha de fold (pós-merge, não aplicada)
`id: X8` · `estado: done` (se PR-2 e PR-3 mergearem juntos; X9 consome) · `estado_detalhe: + "06/10: PR-2 #554 + PR-3 #<n>
MERGEADOS juntos — itens 7–23; L-1..L-3 do PR-3 a ratificar"` · `prs: + #554, #<n>`

## Arquivos
- novo: `server/src/__tests__/pisCofinsProvision.integration.test.ts`
- alterados: `TaxAssessmentService.ts`, `PisCofinsAssessmentService.ts`, `ExerciseClosingService.ts`, `lib/factory.ts`,
  `routes/docs.paths.ts`, `public/openapi.json`, `controllers/__tests__/pisCofins.integration.test.ts`

## PROVA
```
$ cd server && npx tsc --noEmit                                   → exit 0
$ cd server && npx jest --selectProjects unit --forceExit         → exit 0 (284 suites, 4011 passed, 3 skipped, 1 todo)
$ cd server && npx jest --selectProjects integration --runInBand --forceExit --testPathPatterns "(pisCofins|taxAssessment)"
                                                                  → exit 0 (7 suites, 51 passed)  [após a correção do helper]
$ cd server && npm run test:integration                           → exit 0 (116 suites, 947 passed)
$ cd server && npm run docs:generate                              → Paths 249, Operations 307, JSON válido
$ cd server && npx jest --selectProjects unit openapi             → 3 passed
my-app: não tocado (nenhum DTO/contrato gerado mudou) — tsc/test:types não rodados nesta fatia.
```
Sabotagens rodadas (verificado), cada uma revertida depois (grep SABOTAGEM = 0):
1. `creditoNfeAproveitado` sempre 0 ⇒ `pisCofinsProvision` 2 falhas / 4 passes ("item 17 (não cumulativo)", "F-TA-7").
2. guarda D4 reposta no `reconcileProvisao` ⇒ 3 falhas / 3 passes ("F-TA-7", "itens 18 + 19", "commit 2 — CAS").
Restaurado ⇒ 6/6.
