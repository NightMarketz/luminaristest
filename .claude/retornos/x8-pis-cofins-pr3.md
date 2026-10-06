# RETORNO — X8 PR-3 (BE-INCR-PIS-COFINS itens 17–19)

tarefa: executar o PR-3 do X8 (F-PCB-4 a) — provisão de PIS/Cofins no razão, reconcile, encerramento × provisão pendente
autorização: dono, chat, 2026-10-06 — "Executa o PR-3 do X8 em opus médio" (via orquestrador). PR-2 (#554) e PR-3 entram
  em main JUNTOS (decisão do dono 06/10, risco D6) ⇒ este PR é EMPILHADO sobre `claude/x8-pis-cofins-pr2`.
  O campo `autorizacao` de `docs/plano/nos/X8.md` ainda não cita esta autorização (fold pós-merge; vault fora do diff).
agente: subagente (sessao-feature), worktree agent-a263424acc7694473, branch `claude/x8-pis-cofins-pr3`
base: `origin/claude/x8-pis-cofins-pr2` `bec77ac1` (PR-2 do X8, sobre main `6ac4381d`; X7 PR-3 #509 em main)
modelo: opus-5.5
rodadas-de-review: 0 — review independente NÃO despachado (regra ⛔ do CLAUDE.md; o dono decide)
veredicto: fatia completa + rodadas 2 (L-2) e 3 (L-4 ratificado; L-5 lança outros créditos — reabre em parte o F-PCB-3 a), gates verdes; NÃO mergear sem OK do dono
rodada 2: dono, chat, 2026-10-06, questionário — L-1 (a), L-2 "Baixar também o saldo usado", L-3 ratificado
  ([[D-2026-10-06-X8-PR3-LACUNAS]]; EMENDA §8 do BRIEF); base rebaseada em `e1d7321c` (docs do #554)

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
| 17 / L-2 (rodada 2): + D a recolher / C a recuperar = saldo credor anterior consumido (parcial ⇒ só o usado; sem débito ⇒ 0; só não cumulativo) | feito | `saldoAnteriorAproveitado`; testes "item 17 (não cumulativo)" (6 pernas, a recolher = DARF), "item 17 / L-2 (saldo parcialmente consumido)"; unit `pisCofinsProvisaoConsumo.test.ts` |

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

## Lacunas de spec — rodada 1 (DECIDIDAS pelo dono 06/10: L-1 (a), L-2 "baixar também o saldo usado" — implementado na rodada 2, L-3 ratificado)
1. **L-1** "crédito da NF-e aproveitado no mês (a parte do item 6 efetivamente usada)" = `min(CREDITO_NFE +
   CREDITO_NFE_DERIVADO, débito)` — a NF-e é consumida ANTES dos outros créditos e do saldo credor anterior (ordem da
   memória). Alternativa: FIFO (saldo anterior primeiro), que baixaria menos do ativo no mês. (I)
2. **L-2** O saldo credor anterior consumido no mês NÃO é baixado do "a recuperar" (o BRIEF só fala da "parte do item 6").
   Efeito: a parte NF-e do saldo credor transportado fica no ativo para sempre e o "a recolher" fica acima do DARF por esse
   valor (o teste "item 17 (não cumulativo)" mostra 835 centavos). Coerente com a letra; o contador decide (P-1/P-5). (I)
3. **L-3** A provisão de cada tributo é UM lançamento de 2 ou 4 pernas (a conta a recolher aparece a débito e a crédito no
   não cumulativo), porque `sourceId` = id da linha é a chave de idempotência — 1 entry por fonte. (V: o `postEntry` aceita)

## Lacunas da rodada 2 — DECIDIDAS na rodada 3 (dono 06/10: L-4 (a); L-5 "Lançar outros créditos no PR-3")
4. **L-4** (I) ordem de consumo = a da memória: NF-e do mês → outros créditos do mês → saldo anterior. Com outros créditos
   no mês, baixa-se menos saldo (unit "L-4"). Alternativa: saldo antes dos outros.
5. **L-5** (I, risco) o saldo credor anterior pode conter crédito de "outros" (energia/aluguel) de meses anteriores, que
   nunca passou pelo "a recuperar" — a baixa pode deixar a conta credora. Contador (P-1/P-5).

## Achados fora de escopo
- (f) e (g) do PR-2 seguem com lançamento manual no lugar da provisão (provam a natureza `Expense`, que é a mesma).
- P-1..P-6 do BRIEF §4 seguem abertos; um teste verde prova a aritmética, não a lei.

## Linha de fold (pós-merge, não aplicada)
`id: X8` · `estado: done` (se PR-2 e PR-3 mergearem juntos; X9 consome) · `estado_detalhe: + "06/10: PR-2 #554 + PR-3 #<n>
MERGEADOS juntos — itens 7–23; L-4/L-5 abertas"` · `prs: + #554, #556`. Já aplicado no branch (rodada 2, a pedido do
coordenador): autorização do PR-3 e a decisão L-1..L-3 na nota X8 + `D-2026-10-06-X8-PR3-LACUNAS` + EMENDA §8; `prs`/`estado` ficam para o fold pós-merge.

## Arquivos
- novos: `server/src/__tests__/pisCofinsProvision.integration.test.ts`, `server/src/features/accounting/services/__tests__/pisCofinsProvisaoConsumo.test.ts`,
  `docs/plano/decisoes/D-2026-10-06-X8-PR3-LACUNAS.md`; alterados na rodada 2: BRIEF (EMENDA §8), `docs/plano/nos/X8.md`, `_INDEX.md`
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

### PROVA — rodada 2 (L-2)
```
$ cd server && npx tsc --noEmit                                   → exit 0
$ cd server && npx jest --selectProjects unit --forceExit         → exit 0 (285 suites, 4016 passed, 3 skipped, 1 todo)
$ cd server && npx jest --selectProjects integration --runInBand --forceExit --testPathPatterns pisCofinsProvision → 7 passed
$ cd server && npm run test:integration                           → exit 0 (116 suites, 948 passed)
$ node scripts/plano-vault.mjs index                              → exit 0 ("índice regenerado")
$ node scripts/plano-vault.mjs check                              → exit 0 ("vault íntegro")
```
Lançamento no cenário do 835 (PIS M02, Real): 6 pernas — D 4.9.3 165.000 / C 2.1.9.3 165.000; D 2.1.9.3 16.500 / C 1.1.9
16.500 (NF-e); D 2.1.9.3 835 / C 1.1.9 835 (saldo de janeiro) ⇒ "a recolher" líquido 147.665 = a pagar (DARF).
Saldo parcial (M01, saldo informado PIS 100 / Cofins 1.000, débito 165 / 760): baixa 100 / 760; a recolher 65 / 0 = DARF;
reconcile repetido não duplica.
Sabotagem 3 (verificado, revertida; grep SABOTAGEM = 0): saldo consumido zerado ⇒ integração 2 falhas / 5 passes
("item 17 (não cumulativo)", "item 17 / L-2 (saldo parcialmente consumido)") e unit 2 falhas / 3 passes ("parcial", "L-4").

## Rodada 3 — L-5 (dono, chat, 06/10, questionário: L-4 (a); L-5 "Lançar outros créditos no PR-3")
Reabre em parte o F-PCB-3 (a); fonte do dono: prática contábil citando o ADI SRF 3/2007 (D a recuperar / C despesa, nunca receita).
- **Lançamento (não cumulativo), um por tributo/mês, até 6 pernas, linha zerada omitida:** D despesa / C a recolher = débito;
  D PIS/COFINS a recuperar / C redutora (`pisCofinsCreditoOutrosAccountId`) = outros créditos do mês; D a recolher / C a
  recuperar = crédito consumido (NF-e + outros + saldo anterior, nessa ordem — `consumoPisCofins`). A baixa virou UM par
  (antes, um por origem) para caber nas 6 pernas da L-3.
- **Pendência:** `provisaoPendente` também é true num mês sem débito com outros créditos (há o reconhecimento a lançar) —
  senão o saldo credor que eles geram seria baixado depois sem nunca ter entrado no ativo. Vale para o encerramento (item 19).
- **Contrato (V):** campo novo `pisCofinsCreditoOutrosAccountId` no perfil fiscal da unidade — `UpsertFiscalProfileSchema`,
  `FiscalProfileView`, `assertExpenseAccount`, allowlist `fiscal_profile.updated`, `ACCOUNT_KEYS` da policy version,
  `__dto-shapes__.json` (accounting) + `FiscalProfileDto.gen.ts`/`AccountingPolicyVersionDto.gen.ts`; migração aditiva
  `20261006120000_add_pis_cofins_credito_outros_account` (1 `ADD COLUMN`, FK Restrict; SQLite não tem `ADD COLUMN IF NOT
  EXISTS` — 1 statement, sem meio-aplicado; precedente do PR-1). openapi sem mudança (o perfil não é enumerado; diff só CRLF descartado).
- `provisaoContasConfiguradas` exige a redutora quando o mês tem outros créditos > 0 (teste L-5).

Lançamentos no teste L-5 (Real, aluguel R$ 1.000,00 em janeiro; débito jan 165 / 760; fev 1.650 / 7.600):
- PIS M01: D 4.9.3 165 / C 2.1.9.3 165; D 1.1.9 1.650 / C 4.9.5 1.650; D 2.1.9.3 165 / C 1.1.9 165 — saldo credor 1.485.
- PIS M02: D 4.9.3 1.650 / C 2.1.9.3 1.650; D 2.1.9.3 1.485 / C 1.1.9 1.485 ⇒ a recolher 165 = DARF; Cofins 760 = DARF.
- "a recuperar" (1.1.9) somado nos 2 meses e 2 tributos = 0 (nunca credor).
Cenário do 835 (PIS M02): D 4.9.3 165.000 / C 2.1.9.3 165.000; D 2.1.9.3 17.335 / C 1.1.9 17.335 ⇒ a recolher 147.665 = DARF.

Residuais (I): (1) saldo credor anterior INFORMADO no 1º mês (F-PCB-2 a) nunca passou pelo razão do sistema — a baixa só
não deixa o "a recuperar" credor se o saldo de abertura o pôs no ativo; (2) retenções seguem fora do razão (parte não
reaberta do F-PCB-3 a) ⇒ "a recolher" acima do DARF pelo valor delas; (3) `npm run smoke:migration` NÃO rodado (exige
cópia do dev.db real; a instrução desta tarefa veda o dev.db real) — migração = 1 coluna nullable aditiva.

### PROVA — rodada 3
```
$ cd server && npx tsc --noEmit                                   → exit 0
$ cd server && UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot → 203 passed (diff só no accounting; os outros 15 __dto-shapes__ só CRLF, descartados)
$ cd server && npx jest --selectProjects unit --forceExit         → exit 0 (285 suites, 4018 passed, 3 skipped, 1 todo)
$ cd server && npx jest --selectProjects integration --runInBand --forceExit --testPathPatterns pisCofins → 19 passed
$ cd server && npm run test:integration                           → exit 0 (116 suites, 949 passed)
$ cd server && npm run docs:generate                              → Paths 249, Operations 307 (sem diff de conteúdo)
$ cd my-app && npx tsc --noEmit                                   → exit 0
$ cd my-app && npm run test:types                                 → exit 0
$ node scripts/plano-vault.mjs index && node scripts/plano-vault.mjs check → "índice regenerado" / "vault íntegro" (exit 0)
```
Sabotagem 4 (verificado, revertida; grep SABOTAGEM = 0): reconhecimento dos outros créditos desligado ⇒ `pisCofinsProvision`
1 falha / 7 passes ("item 17 / L-5 …": as pernas a recuperar/redutora somem).
