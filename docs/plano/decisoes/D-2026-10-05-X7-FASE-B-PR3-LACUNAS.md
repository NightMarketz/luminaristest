---
id: "D-2026-10-05-X7-FASE-B-PR3-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas de spec que tocam o PR-3 da Fase B do X7 (model/fluxo/provisão) — 4 decididas pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-05 — questionário da sessao-feature do PR-3, antes do código"
atualizado: "2026-10-05"
---
# D-2026-10-05-X7-FASE-B-PR3-LACUNAS — lacunas do PR-3 da Fase B do [[X7]]

**Estado:** `decided`.
**Autorização:** dono, chat, 05/10/2026. Decididas por questionário antes do código do PR-3; a 1 contra a
recomendação.

Origem: lacunas 1–3 de `.claude/retornos/x7-fase-b-pr1.md` e a divergência entre o item 13 do
`docs/accounting/BE-INCR-TAX-ASSESSMENT-B-brief.md` (409) e a cascata da Fase A (decisão do dono de 04/10,
`.claude/retornos/x7-fase-a-pr2.md`).

| # | Lacuna | Decisão |
|---|---|---|
| 1 | Lacuna 1 do PR-1: o mês do excesso m\* (16% do prestador exclusivo, IN RFB 1.700 art. 33 §§ 7º–10) cai num balancete; pela letra do item 9 a diferença postergada só é gravada no modo receita bruta e some | **Contra a recomendação (400 nesse caso):** o balancete em m\* **calcula e grava** `diferencaPostergadaCents` na linha IRPJ, com a mesma conta do item 9, e o valor entra nos "anteriores" dos balancetes seguintes. Se o balancete já absorve a diferença (cobrança em dobro) é o P-B6, do contador |
| 2 | Item 13: substituir `A0k` com meses posteriores confirmados ⇒ 409 (letra) × a cascata que o dono decidiu para os trimestres em 04/10 | **Cascata, como a Fase A:** os posteriores confirmados (e o `A00`) caem para SUPERSEDED, a provisão deles é estornada e a resposta devolve `reconfirmar` |
| 3 | Lacuna 2 do PR-1: `RETIDO_MESES` do ajuste anual soma todas as deduções dos meses (inclui `OUTRA`); o item 10 cita só IRRF/CSLL_RETIDA | **Mantém todas**, para que pago + retido reconstruam o devido de cada mês. O contador valida no P-B10 |
| 4 | Lacuna 3 do PR-1: `estimativasPagas` com o mesmo (mês, tributo) repetido | O DTO do `A00` recusa com **400** citando o par |

Não reabrem nenhum fork F-TB. P-B6 e P-B10 seguem pendentes de validação externa (contador).
