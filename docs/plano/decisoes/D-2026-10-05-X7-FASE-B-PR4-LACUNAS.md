---
id: "D-2026-10-05-X7-FASE-B-PR4-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas de spec do PR-4 da Fase B do X7 (ECF anual + liberação do ANUAL) — 4 decididas pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-05 — questionário da sessao-feature do PR-4, antes do código (1–3) e depois do review independente (4)"
atualizado: "2026-10-05"
---
# D-2026-10-05-X7-FASE-B-PR4-LACUNAS — lacunas do PR-4 da Fase B do [[X7]]

**Estado:** `decided`.
**Autorização:** dono, chat, 05/10/2026. As decisões 1 a 3 foram tomadas por questionário antes do código, todas na
recomendação. A 4 foi tomada depois do review independente e foi além da recomendação.

Origem: `docs/accounting/BE-INCR-TAX-ASSESSMENT-B-brief.md` §1, itens 2, 18 e 21. Implementado no #539 (`34b254b1`).
Retorno: `.claude/retornos/x7-fase-b-pr4.md`.

| # | Lacuna | Decisão |
|---|---|---|
| 1 | O item 18 deriva o `0010.FORMA_TRIB_PER` do anual (`R` no trimestre com mês em atividade, `0` fora), mas não diz o que fazer com o valor que o chamador manda (campo obrigatório no DTO) | **Derivar e conferir:** valor informado diferente do derivado ⇒ 400 dizendo o esperado. O DTO continua exigindo o campo, então a ECF trimestral não muda |
| 2 | Item 2: o perfil é da empresa, mas o e-Lalur é por unidade. Onde procurar o e-Lalur da forma antiga? | **Em todas as unidades do dono.** A forma vale para a empresa inteira, e uma linha órfã em qualquer unidade quebraria a ECF dessa unidade. Exige um método novo de contagem, só leitura, no repositório do e-Lalur |
| 3 | Linha `n500` num `A0m` marcado `0` (mês fora de atividade) não tem N030 no arquivo, e o montador a descartaria em silêncio. O item 21 cobre só lalur/lacs e n620/n660 | **400 na geração**, mesma família do item 21: linha do e-Lalur num período que o arquivo não emite |
| 4 | Achado do review independente: o gate do item 2 só rodava no `upsert`. A cópia de outro ano (`copiar-de`) e a exclusão de um perfil ANUAL trocavam a forma do e-Lalur e deixavam linha órfã, que a ECF trimestral descartava em silêncio | **Gate também na cópia e na exclusão** (mesmo 400 `FORMA_COM_LALUR`) **e defesa na ECF:** linha do e-Lalur fora dos períodos emitidos ou movimento da Parte B fora dos períodos da forma ⇒ 400, nas duas formas. O trimestral sem órfão continua byte a byte igual (teste 26 k) |

Não reabrem nenhum fork F-TB. P-B9 (oráculo do número no PVA) segue com o runbook H1b/X5.
