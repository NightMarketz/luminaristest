---
id: "D-2026-10-21-TRIAGEM-CONTADOR-F1"
tipo: "decisao"
dominio: "fiscal"
titulo: "Resposta do contador ao pacote F1: F-IBS-8 = (c) fora do resultado; F-RET-6 com mínimo de R$ 10 (RIR 785 II); F-RET-9 = baixa do ISS devido; acúmulo de DARF < R$ 10 (Lei 9.430 art. 68 § 1º); combo = proporcional por padrão; 16% recortado por empresa"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"Faz o que ainda falta\" (gravar as decisões da triagem do pacote F1); combo e 16% respondidos no AskUserQuestion de 21/10 (\"Proporcional como padrão\", \"Texto: recorte por empresa\"). NÃO é BRIEF nem 'executa'"
atualizado: "2026-10-21"
---
# D-2026-10-21-TRIAGEM-CONTADOR-F1

**Estado:** `decided`. **Autorização:** dono, chat, 21/10/2026 — *"Faz o que ainda falta"*, depois da triagem
[`TRIAGEM-RESPOSTA-CONTADOR-2026-10-21-PACOTE-F1.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-10-21-PACOTE-F1.md)
(pedido: [`PEDIDO-CONTADOR-2026-10-21-PACOTE-F1.md`](../../accounting/PEDIDO-CONTADOR-2026-10-21-PACOTE-F1.md)). Citações
conferidas no dossiê `pesquisas-legais/triagem-2026-10-21-contador-pacote-f1` (RIR/2018 e LC 214 no Planalto; Lei 9.250 e
Lei 9.430 no acervo, compiladas). [CTD-002]: a resposta do contador é insumo; o que muda abaixo é decisão do dono.

## O que fica decidido

| Item | Antes | Agora | Fonte |
|---|---|---|---|
| F-IBS-8 classe contábil ([[IBS-CBS-2027]]) | provisório (a) dedução da receita | **(c) fora do resultado**: receita reconhecida líquida; IBS/CBS direto no passivo. O item 12 do BRIEF não roda com a classe (a) — ver EMENDA 1 do BRIEF | contador (P-IBS-4), coerente com LC 214 art. 12 (base "por fora"); **códigos do referencial não conferidos** (DRAFT) |
| F-RET-6 mínimo de R$ 10 ([[RETENCOES-FONTE]]) | reter > 0 e avisar até haver base | dispensa da retenção ≤ R$ 10 **para beneficiário do Lucro Real, Presumido ou Arbitrado**; demais seguem "reter > 0" | RIR/2018 art. 785 II [D05] |
| Recolhimento < R$ 10 (novo, [[RETENCOES-FONTE]]) | — | título de imposto por código com total < R$ 10 no período **soma ao mesmo código nos períodos seguintes** até ≥ R$ 10 | Lei 9.430 art. 68 caput e § 1º [D03] |
| F-RET-9 ISS retido sofrido ([[RETENCOES-FONTE]]) | provisório (a) ativo a compensar | **baixa do ISS devido** da própria nota; sem ativo (restituição só em retenção indevida/duplicada) | contador (P-RET-4); LC 116 art. 6º |
| Combo — critério padrão ([[EFICIENCIA-FISCAL]]) | `CARGA_TRIBUTARIA` (D-2026-10-20, leitura 1 da A1; F-EF-2 a) | **`PROPORCIONAL_CATALOGO` é o padrão**; `CARGA_TRIBUTARIA` só com aceite do contador (F-EF-3) | dono (AskUserQuestion 21/10) + contador (2ª resposta: CTN 148, 149 VII; CC 167) — sem norma específica sobre rateio |
| 16% (Lei 9.250 art. 40) ([[X7]], [[EFICIENCIA-FISCAL]]) | ADR L20: recorte por empresa | **mantido** — recorte por empresa; contador alinhado na 2ª resposta | Lei 9.250 art. 40 p.ú. [D02]; ADN Cosit 22/2000 e Lei 13.643/2018 **não lidos** |

## Confirmações (nada muda)
F-IBS-5 (a) antecipação por parcela — o § 7º do art. 10 (5 dias, corridos) depende de regulamento [D04] · F-RET-5 (a) e D4 ·
F-RET-4 (a) e D2 · F-REINF R-4020 do Simples · F-EF-4 (c) · F-EF-8 (a) · F-EF-10/11 (a) · F-EF-12 (a) · X14 (salão-parceiro).

## Dados que entram como DRAFT (conferir em fonte oficial antes de virar vigente)
cClassTrib/CST (P-IBS-2), lista de uso/consumo (art. 57), natureza do rendimento 13003/13007/15001 e DARF 1708/5952/8045
(P-REINF-2), contas do referencial (P-RET-4, P-IBS-4), lista de cessão de mão de obra (P-RET-5), ICMS-ST NCM×UF (P-EF-6),
valores SUP SP 2026 (P-EF-8).

## Risco novo registrado
Esteticista é profissão regulamentada (Lei 13.643/2018, não lida): salão só de estética pode perder os 16%. O X7 já exige a
confirmação `declaraNaoProfissaoRegulamentada` (F-P16-1); o texto de ajuda deve citar a Lei 13.643.
