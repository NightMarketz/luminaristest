# RETORNO — RETENCOES-FONTE PR-2 (BE-INCR-RETENCOES-FONTE itens 10–23)

tarefa: PR-2 do BE-INCR-RETENCOES-FONTE pela sessao-feature, sem merge, empilhado no PR-1 (#888).
autorização: dono, chat, 2026-10-24: "executa RETENCOES-FONTE PR-1 e PR-2". PR-3 e PR-4 fora.
decisões do dono que valem aqui (chat, AskUserQuestion, 2026-10-24):
  1. "Seguir com os DRAFT (Recomendado)": o PF soma os pagamentos do mês (F-RET-17 a; P-RET-7 segue com o contador).
  2. "Folhas fora até o P-RET-4": os papéis das retenções não têm folha padrão; conta ausente ⇒ 400 `CONTA_RETENCAO_NAO_CONFIGURADA`.
  3. "Maior bruto que fecha (Recomendado)": item 17. R$ 238,37 pagos fecham com bruto 249,99 e 250,00. O BRIEF dizia
     "menor", mas o exemplo dele (4 parcelas de R$ 250 com R$ 11,63) só fecha com o maior.
base: PR-1 (`claude/retencoes-fonte-pr1-pr2-18d6c9`)
rodadas-de-review: 0. Review independente NÃO despachado (regra ⛔ do CLAUDE.md)
veredicto: PR-2 COMPLETO no escopo; gates verdes (PROVA no PR). NÃO mergear sem OK do dono.

## Checklist (BRIEF §4, PR-2)
| Item | Estado | Onde / teste |
|---|---|---|
| 10 `calcularRetencoes` | feito | `models/withholdingCalc.ts`; `withholdingCalc.test.ts`: uma regra por caso (pagador/beneficiário optante, cooperativa, exterior 400, mínimos, sem perfil, INSS/ISS, sha estável) |
| 11 IRRF de PF | feito | `calcularIrrfPf` (soma do mês e diferença; desconto simplificado × deduções); integração "item 11" (2º pagamento no mês) |
| 12 DTO | feito | `PayableDto`: `withholdings[]` só para menos, com motivo; `pfDeducoes`; `documentoSerie`; integração "item 12" |
| 13 `TaxWithholding` | feito | model + `TaxWithholdingRepository` + migração aditiva + resetDb + reset/re-key classificados |
| 14 kind WITHHOLDING | feito | `SETTLEMENT_KINDS`; `method = 'NONE'` só na baixa sem caixa (o DTO de pagamento recusa NONE); integração "item 14" |
| 15 reconhecimento | feito | tx1: título (`paidCents` = Σ retido) + baixas WITHHOLDING + TaxWithholding + título de imposto + auditoria; depois o `postEntry` `ap.withholding` (D 2.1.2 / C a recolher). Cabeçalho atomicUntil atualizado. Integração "item 15" (R$ 1.000 ⇒ IRRF 15,00, paid 1500, remaining 98500, razão) |
| 16 INSS 11% | feito | base = bruto da NF; competência = mês da emissão; integração "item 16" |
| 17 CSRF na baixa | feito | `brutoDaBaixa` + claim do bruto + PAYMENT(pago) e WITHHOLDING na mesma tx; integração: 1 baixa (46,50), 4×250 (11,63 cada), 5×200 (dispensa) |
| 18 última parcela | feito | o saldo restante tem preferência na derivação; teste unitário e integração 4×250 fechando R$ 1.000 |
| 19 título de imposto | feito | `WithholdingService.upsertTitulo`: UNIAO/INSS/MUNICIPIO:<codMun>, `<código>-<AAAAMM>`, vencimento do item 4 (ISS: dia do perfil ou 10 com aviso), sem reconhecimento, soma enquanto OPEN (CAS), complementar `-C1` depois da baixa; a baixa debita a conta a recolher |
| 20 DARF < R$ 10 | feito | ao abrir o título da competência M, os OPEN anteriores do mesmo código < R$ 10 viram DEFERRED, somam e as linhas são re-apontadas; integração "item 20" (4,50 + 7,00 ⇒ 11,50 vencendo 20/07) |
| 21 estorno e re-drive | feito | `cancelPayment` leva a CSRF da parcela; `cancelPayable` estorna as retenções do reconhecimento; imposto baixado ⇒ 409 `IMPOSTO_JA_RECOLHIDO` (gate antes do razão); `reconcilePayables` refaz o `ap.withholding` faltante, idempotente |
| 22 F7 lado AP | feito sem mudar o F7 | o confirm já chama o `registerPayment` com o valor da linha, e a derivação do item 17 está nele; integração "item 22" (953,50 ⇒ PAYMENT 953,50 + WITHHOLDING 46,50, PAID) |
| 23 leitura das feitas | feito | `GET /api/accounting/withholdings?direction=MADE`, `/withholdings/summary`, porta `getTaxWithholdingReadPort().findMadeForReinf`; o mesmo mapeador (`withholdingView.ts`); integração confere o mesmo conjunto; `taxId` só na linha; auditoria `ap.withholding.recorded/reversed`, `tax_payable.upserted` sem taxId |

## Lacunas de spec / desvios registrados
1. **Perfil ambíguo:** o título não informa a natureza do serviço. Dois perfis vigentes da mesma contraparte na data dão 400
   `PERFIL_RETENCAO_AMBIGUO` (não se escolhe sozinho).
2. **Regime do pagador:** sem perfil fiscal da empresa no ano, e com perfil de retenção aplicável, dá 400
   `REGIME_PAGADOR_AUSENTE` (não se supõe o regime).
3. `TaxWithholding.settlementId` ficou **nullable**: a linha de dispensa (valor 0) não tem baixa. O §5.1 o declarava NOT NULL.
4. **DARF < R$ 10:** o acúmulo acontece quando se abre o título da competência seguinte, porque não há job de "fechamento da
   competência". Até lá, o título < R$ 10 fica OPEN. O `competenciasSomadas` inclui a competência do próprio título.
5. **Re-drive:** a conta da baixa sem caixa vem do perfil fiscal atual, porque a `PayablePayment` não guarda a conta de crédito.
6. **Cancelar o título de imposto direto** dá 400 `TITULO_IMPOSTO_GERIDO_PELAS_RETENCOES` (proteção não prevista no BRIEF).
7. **PF:** a 10002 ficou fora da carga (Emenda item 1). Por isso o perfil de PF só nasce com a natureza em DRAFT (aceita com
   aviso) e grava o código como null.
8. O aviso `SEM_PERFIL_RETENCAO` sai em todo título de despesa a PJ sem perfil, porque o título não distingue serviço de
   outra despesa.
9. O `POST /payables` devolve também `withholdingAvisos`.
10. O claim da baixa (`claimForPayment`) passou a conferir o `amountCents` lido em todo título. Nos títulos comuns isso não
    muda nada (o valor é imutável); no título de imposto fecha a corrida com a soma da retenção (F-RET-11 a).
11. O aging inclui o título de imposto (F-RET-11 a: "reusa F7, aging e agenda"); o tie-out de 2.1.2 o exclui (invariante 3).

## Review independente (25/10) — achados A1–A6 corrigidos
Pedido do dono (chat, 2026-10-25): "Fix A1–A6 in PR-2 (#893) here, with a failing test before each fix. For A1, use the NF
gross proportional to the installment as the CSRF base." Cada achado ganhou um teste em `retencoesFontePr2.integration.test.ts`
("review A1"…"review A6"), rodado VERMELHO antes do conserto (motivo conferido) e verde depois.
| Achado | Conserto |
|---|---|
| A1 (alto) CSRF sobre o saldo líquido | `parcelaComCsrf` (`withholdingCalc.ts`): base = bruto da NF proporcional à parcela; claim = bruto × (T − R)/T = pago + CSRF; o bruto restante da NF (T − Σ bruto das parcelas) tem preferência. Teste: R$ 938,50 ⇒ CSRF 46,50 sobre 1.000, PAID; 2 × 469,25 ⇒ 2 × (bruto 500, CSRF 23,25), PAID |
| A2 (médio) DARF < R$ 10 tardio | título que nasceria < mínimo, de competência JÁ ENCERRADA, soma no título OPEN sem baixa de competência posterior do código (o que a somou ou o seguinte já existente). Competência corrente não estaciona (outra retenção do mês pode passar de R$ 10). Testes: tardia de 05 vai ao `202606+202605`; 08 e 07 encadeiam no complementar de 09 |
| A3 (baixo) `pfDeducoes` ignorado | 400 `PF_DEDUCOES_FORA_DE_PF` sem contraparte PF com perfil de IRRF |
| A4 (baixo) guarda sem teste | teste direto do `claimForPayment` com valor velho ⇒ 0; sabotagem (sem `amountCents,` no `where`) ⇒ o teste fica VERMELHO; restaurado |
| A5 (baixo) numeração do complementar | `findTaxTitleNumbersEver` lê também os cancelados (`deleted:<id>:`); o número é o maior já usado + 1. Teste da sequência do review ⇒ `-C2`, sem P2002 |
| A6 (baixo) conta do re-drive | o re-drive credita o `liabilityAccountId` do título de imposto; sem título, o papel atual. Teste: papel trocado antes do reconcile ⇒ crédito em 2.1.7.03 |
Limite que fica: se uma retenção tardia levar uma competência já estacionada a ≥ R$ 10, ela não volta a ter DARF próprio — a
parte nova abre título dela e a antiga segue no título seguinte (caso raro; registrar com o contador se aparecer).

## Achados fora de escopo
1. `npm run docs:generate` no Windows: argumentos `/api/...` passados ao node pelo Git Bash viram caminho (conversão MSYS) —
   usar `MSYS_NO_PATHCONV=1` e `pwd -W` nos scripts de merge do openapi.
