---
id: "D-2026-10-05-X7-FASE-B-PR2-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Lacunas de spec do PR-2 da Fase B do X7 (e-Lalur anual) — 4 decididas pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-05 — questionário da sessao-feature do PR-2, antes do código (lacunas 1–4)"
atualizado: "2026-10-05"
---
# D-2026-10-05-X7-FASE-B-PR2-LACUNAS — lacunas do PR-2 da Fase B do [[X7]]

**Estado:** `decided`.
**Autorização:** dono, chat, 05/10/2026. Decididas por questionário antes de qualquer código; a 2 contra a
recomendação.

Origem: `docs/accounting/BE-INCR-TAX-ASSESSMENT-B-brief.md` §1 item 12 (e-Lalur com períodos anuais) e as lacunas
5 e 6 de `.claude/retornos/x7-fase-b-pr1.md`. Das lacunas 1–6 do PR-1, a 1, a 2 e a 3 são do PR-3
([[D-2026-10-05-X7-FASE-B-PR3-LACUNAS]]) e a 4 (`A00` = ano cheio) não muda comportamento no e-Lalur.
Implementado no #525 (`5c6827e9`).

| # | Lacuna | Decisão |
|---|---|---|
| 1 | "T0x só em TRIMESTRAL; A0x só em ANUAL" pela letra recusaria todo `T0x` de ano sem perfil, e o mesmo §3.1 exige a regressão trimestral sem editar asserções (as suítes não semeiam perfil) | Forma efetiva `ANUAL` ⇒ só `A00..A12`; qualquer outro caso (TRIMESTRAL, forma nula, regime sem forma, **ano sem perfil**) ⇒ só `T01..T04`. A continuidade entre exercícios usa a mesma regra para N−1 |
| 2 | O item 12 põe os livros `n620`/`n660` no PR-2, mas as abas N620/N660 do catálogo só entram no PR-4 (item 22; insumo §5.1) | **Contra a recomendação (adiar para o PR-4):** os livros entram já, com as regras de período (só `A01..A12`; `n630`/`n670` nunca em `A0m`), e **todo write neles é 400** "catálogo ainda não transcrito" até o PR-4. O catálogo devolve `[]` |
| 3 | Lacuna 5 do PR-1: `A0m` antes do início de atividade (janela invertida em `periodoBounds`) | Linha do e-Lalur em `A0m` com m anterior ao mês de `inicioAtividadeEm` no mesmo ano ⇒ 400. `T0x` segue sem checagem |
| 4 | Lacuna 6 do PR-1: o teto da compensação P em `A0m` | Por mês: saldo de abertura do ano da conta (`openingBalances`) − Σ das `P` da mesma conta no **próprio** `A0m` ≥ 0, senão 400. As linhas A/E do mês não mexem no teto, e os meses não somam (IN RFB 1.700 art. 50 I–II) |

Não reabrem nenhum fork F-TB.
