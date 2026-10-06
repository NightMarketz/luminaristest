# RETORNO — X8 PR-2 (BE-INCR-PIS-COFINS itens 7–16 e 20–23)

tarefa: executar o PR-2 do X8 (F-PCB-4 a) — persistência e fluxo da apuração mensal de PIS/Cofins; PR-3 (itens 17–19) FORA
autorização: dono, chat, 2026-10-06 — "Executa o PR-2 do X8 (BE-INCR-PIS-COFINS) — sessao-feature; PR-3 fora; merge só com meu OK"
  (ratificado com "Dispara em sequencia aqui tudo em opus medio"). A nota `docs/plano/nos/X8.md` ainda não cita esta
  autorização no campo `autorizacao` (fold é pós-merge — sem edição do vault neste PR).
agente: subagente (sessao-feature), worktree agent-a4506e96f1fff8a24, branch `claude/x8-pis-cofins-pr2`
base: origin/main 6ac4381d (06/10; PR-1 #521 `76d1a432` em main)
modelo: opus-5.5
rodadas-de-review: 0 — review independente NÃO despachado nesta sessão (regra ⛔ do CLAUDE.md: sem revisor novo
  enquanto o Bloco A tiver oráculo aberto; o dono decide se pede um antes do merge)
veredicto: implementação completa da fatia, gates verdes; NÃO mergear sem OK do dono

## Passo 0 (verificado)
- `gh pr list --state all --search X8`: #473 (ADR/BRIEF), #521 (PR-1, MERGED), #544 (snapshot), #546 (fold). Nenhum PR-2.
- `git log origin/main`: `76d1a432` (#521) e `6ac4381d` (#546) em main.

## Checklist (BRIEF §1)
| Item | Estado | Onde / teste |
|---|---|---|
| 7 débito: receita do mês pelo `receitaBrutaPorAtividade` (gate intocado), ajustes ≤ receita da atividade, cota-parte exige documento | feito | `models/pisCofinsCalc.ts`; `pisCofinsCalc.test.ts` "item 7"; integração "item 8 / 23 (d)" |
| 8 créditos só no NAO_CUMULATIVO (NF-e + outros incisos + saldo anterior); a pagar / saldo credor / excedente de retenção | feito | unit "23 (a) Real", "23 (b)", "item 8"; integração "Real …" e "item 8 / 23 (d)" |
| 9 recusas: SIMPLES/MEI, ≥ 2027-01, perfil ausente, caixa, `pisCofinsRegime` divergente (inclui REAL+CUMULATIVO), multiunidade | feito | integração "23 (e) / item 9" |
| 10 retenções do payload, uma linha cada | feito | unit "item 8" |
| 11 saldo credor transportado (lê M(x−1); janeiro lê dezembro anterior); ordem 409; `saldoCredorAnterior` só no 1º mês | feito | integração "Real …" |
| 12 reuso do `TaxAssessment` sem migração (PIS/COFINS, MENSAL, M01..M12, modos, códigos); leitura alargada | feito | integração "23 (a) …" (linhas gravadas) |
| 13 `POST /tax-assessments/pis-cofins/preview` (+ `provisaoContasConfiguradas`, avisos) | feito | integração "23 (a) …", "item 8 / 23 (d)" |
| 14 `POST /tax-assessments/pis-cofins` commit 1: CAS, um-só-CONFIRMED, ordem, "de trás para frente", substituição, audit | feito | integração "23 (a) …" e "Real …" |
| 15 policy `canRead/ManageTaxAssessment` | feito (reuso) | — |
| 16 GET do X7 servem; filtro `tributo` | feito (filtro NÃO existia — ver divergência D1) | integração "23 (a) …" |
| 20 +2 paths (2 toques: `routes/taxAssessments.ts` + `docs.paths.ts`); BASELINE 247 → 249 | feito | `openapi-paths.test.ts` |
| 21 snapshot: `PisCofinsPreviewSchema`, `PisCofinsConfirmSchema`, ListQuery alargado (+ `.gen.ts` do FE) | feito | `dtoShapeSnapshot.test.ts` |
| 22 allowlist: nenhum eventType novo; payload = o do X7 | feito | integração "23 (a) …" (chaves = allowlist) |
| 23 (a)–(e) | feito | unit + integração |
| 23 (f) ECF Presumido gera com a despesa de PIS/Cofins lançada | feito com lançamento MANUAL no lugar da provisão do PR-3 | integração "23 (f)" |
| 23 (g) LAIR do X7 inclui a despesa de PIS/Cofins | feito com lançamento MANUAL | integração "23 (g)" |

## Divergências BRIEF × código real do X7 (BRIEF §5 item 1 mandou reler)
- **D1** (V) O ListQuery do X7 não tinha filtro `tributo` (BRIEF item 16 o pressupunha). Adicionado `tributo` opcional
  (IRPJ|CSLL|PIS|COFINS) e `periodo` alargado com `M01..M12` (`TaxAssessmentDto.ts`; repo `findMany`).
- **D2** (V) Não existe "DTO de leitura" Zod do X7 — a vista é tipo TS (`TaxAssessmentView`); alargado `tributo` no tipo e
  `toView` exportada para reuso.
- **D3** (V) `findConfirmedByYear` devolve TODOS os tributos e é lido pelo X7 em `confirm`/`calcular`: as linhas de PIS
  (`ordem('M01') = -1`) entravam em `anteriores` (409 STALE espúrio sob concorrência) e no gate de regime. Filtro
  `doIrpjCsll` no `TaxAssessmentService`. `SpedEcfRealGenerationService` filtra por `A0m` (sem colisão — por isso `M` ≠ `A`).
- **D4** (V) O reconcile do X7 (`POST /:id/provisao`) postaria uma linha de PIS/COFINS nas contas da CSLL (ramo `else`).
  Guarda fail-closed: 400 "provisão de PIS/Cofins … PR-3" — o PR-3 (item 18) a substitui.
- **D5** (V) O X7 tem CASCATA na substituição (decisão do dono 04/10); o BRIEF X8 item 14 pede 409 "substitua de trás para
  frente". Implementado o do BRIEF X8 (sem cascata).
- **D6** (V) `ExerciseClosingService` conta como pendente toda linha CONFIRMED com valor ≠ 0 e sem `provisaoEntryId` —
  inclusive PIS/COFINS. Até o PR-3, **uma apuração de PIS/Cofins confirmada com débito > 0 bloqueia o encerramento do
  ano** e o reconcile a recusa (D4). Coerente com o item 19, mas sem saída operacional enquanto o PR-3 não existir.
- **D7** (V) Allowlist de `tax.assessment.confirmed` cresceu na Fase B (`modo`, `diferencaPostergadaCents`): PIS grava `'0'`.

## Lacunas de spec — decididas fail-closed nesta sessão (ratificar)
1. "1º mês apurado" (item 11): M(x−1) não confirmado E nenhum mês anterior confirmado no MESMO ano. Janeiro sem dezembro
   anterior conta como 1º mês (operador informa o saldo). Confirmar um mês ANTERIOR a um já confirmado (não só
   substituir) também ⇒ 409 "de trás para frente" (generalização do item 14). (I)
2. Ordem (409) também na PRÉVIA, não só na confirmação (sem M(x−1) não há saldo credor para calcular). (I)
3. Perfil fiscal da UNIDADE ausente ⇒ 400 (o BRIEF lista só o da PJ). (I)
4. `provisaoContasConfiguradas` = 4 contas + `pisCofinsRecuperavelAccountId` no não cumulativo (o PR-3 credita essa conta). (I)
5. Cumulativo com `saldoCredorAnterior` informado > 0 ⇒ 400; saldo LIDO > 0 no cumulativo (troca de regime entre anos) é
   ignorado com aviso. (I)
6. Memória: `AJUSTE_*_n`, `CREDITO_<INCISO>_n`, `RETENCAO_n`, `RETENCAO_EXCEDENTE` (nome não listado no §2), `CREDITO_NFE`
   agregado (contagem de notas na descrição, não 1 linha por nota). `deducoesCents` = créditos + retenções. (I)
7. Resposta da prévia/confirmação com chaves `pis`/`cofins` (o BRIEF não fixou o shape; o X7 usa `irpj`/`csll`). (I)
8. `TaxAssessment.regime` = regime da PJ do ano; `tabelaVersao` = `pis-cofins-2026-10-06` (constante nova). (I)

## Achados fora de escopo
- O vault (`docs/plano/nos/X8.md`) não traz a autorização do PR-2 — entra no fold pós-merge.
- P-1..P-6 do BRIEF §4 seguem abertos (oráculo = contador; um teste verde prova a aritmética, não a lei).

## Arquivos
- novos: `server/src/features/accounting/models/pisCofinsCalc.ts`, `.../dtos/PisCofinsDto.ts`,
  `.../services/PisCofinsAssessmentService.ts`, testes `models/__tests__/pisCofinsCalc.test.ts`,
  `dtos/__tests__/PisCofinsDto.test.ts`, `controllers/__tests__/pisCofins.integration.test.ts`,
  `my-app/types/contracts/accounting/PisCofinsDto.gen.ts`
- alterados: `TaxAssessmentDto.ts`, `TaxAssessmentService.ts`, `(I)TaxAssessmentRepository.ts`,
  `taxAssessmentController.ts`, `routes/taxAssessments.ts`, `routes/docs.paths.ts`, `lib/factory.ts`,
  `public/openapi.json`, `openapi-paths.test.ts`, `__dto-shapes__.json`, `TaxAssessmentDto.gen.ts`

## PROVA
```
$ cd server && npx tsc --noEmit                                  → exit 0
$ cd server && npx jest --selectProjects unit --forceExit        → exit 0 (284 suites, 4011 passed, 3 skipped, 1 todo)
$ cd server && npx jest --selectProjects integration --runInBand --forceExit \
    --testPathPatterns "(pisCofins|taxAssessment|ecfReal|SpedEcfGenerationService.closing|xerciseClosing|companyFiscalProfile|purchase.regime)"
                                                                 → exit 0 (12 suites, 78 passed)
$ cd server && npm run test:integration                          → exit 0 (115 suites, 941 passed)
$ cd my-app && npx tsc --noEmit                                  → exit 0
$ cd my-app && npm run test:types                                → exit 0
$ cd server && npm run docs:generate                             → Paths 249 (main 247), JSON válido
```
Falsificador rodado (verificado): desligar o gate "de trás para frente" e a guarda D4 ⇒ `pisCofins.integration.test.ts`
2 falhas / 4 passes; restaurado ⇒ 6/6.
