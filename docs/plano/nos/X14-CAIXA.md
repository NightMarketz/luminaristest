---
id: "X14-CAIXA"
tipo: "regua"
dominio: "fiscal"
titulo: "Simples Nacional ME/EPP: base do DAS pela receita recebida (regime de caixa) — registro de recebíveis e gatilhos do art. 20"
estado: "inflight"
estado_detalhe: "16/10: execução autorizada (dono, chat, 2026-10-16: \"Pode começar agora e disparar as sessões com brief autorizado\"). PR-1 #729 (recebimento + trava de ano, itens 1–7a) e PR-2 #738 (base caixa + art. 20, itens 8–18) abertos; PR-3 (Anexo IX + incobráveis) empilhado. Lacunas L1 (a) e L2 (a) decididas pelo dono em 16/10 ([[D-2026-10-16-X14-CAIXA-LACUNAS]]); A3 nova (transição competência → caixa). Pendentes de contador: A1, A2, A3. Não mergear sem OK"
depende_de: ["[[X14]]", "[[D-2026-10-10-X14-PROXIMOS-PASSOS]]", "[[D-2026-10-15-X14-CAIXA-FORKS]]"]
autorizacao: "dono, chat, 2026-10-15: \"Autorizo planejar o BRIEF do X14-CAIXA — sessao-planejamento, sem código, sem 'executa'\" — só o BRIEF; forks ratificados no questionário do mesmo dia ([[D-2026-10-15-X14-CAIXA-FORKS]]) — sem executa"
ancora_sdd: "—"
atualizado: "2026-10-16"
prs: ["#711", "#729", "#738"]
---
# X14-CAIXA — base do DAS por recebimento (regime de caixa)

**Estado:** `inflight` — 16/10: execução autorizada (dono, chat, 2026-10-16: "Pode começar agora e disparar as sessões com brief autorizado"). PR-1 #729 (recebimento + trava de ano, itens 1–7a) e PR-2 #738 (base caixa + art. 20, itens 8–18) abertos; PR-3 (Anexo IX + incobráveis) empilhado. Lacunas L1 (a) e L2 (a) decididas pelo dono em 16/10 ([[D-2026-10-16-X14-CAIXA-LACUNAS]]); A3 nova (transição competência → caixa). Pendentes de contador: A1, A2, A3. Não mergear sem OK  
**Autorização:** dono, chat, 2026-10-15. Planejar o BRIEF só pela `sessao-planejamento`. O código exige `executa`
próprio por PR.  
**Depende de:** [[X14]] (cálculo por competência, perfil com `simplesRegimeApuracao`).

## Fato novo (15/10): o caixa acaba em 31/12/2026

A Res. CGSN 190/2026 (DOU 10/08/2026, efeitos em 01/01/2027) dá ao art. 16 da Res. 140 a redação "receita bruta
total mensal **auferida**" e revoga o art. 16 § 1º, o art. 17 p.ú., o art. 18 § 1º, os arts. 19, 20, 77 e 78 e o
art. 61 V. A RFB confirma em notícia de 14/08/2026. Dossiê:
`pesquisas-legais/simples-regime-caixa/relatorio.md` (D04, D05). O nó serve aos PAs de 2026 e anteriores. A
competência de out/2026 vence em 20/11/2026, e a de dez/2026 em 20/01/2027.

## Escopo legal (Res. CGSN 140, vigente até 31/12/2026)

1. Base mensal = receita **recebida**. RBT12, limites, sublimites e alíquota seguem **por competência** (art. 19 p.ú.).
2. Opção irretratável no ano (art. 16 § 1º), registrada na apuração de nov/dez/início (art. 19 I–III).
3. Parcela a prazo não vencida entra na base até o último mês do ano seguinte ao da prestação/operação (art. 20 I).
4. Receita não recebida antecipada no encerramento, no retorno à competência e no mês anterior à exclusão (art. 20 II).
5. Impedimento do art. 12 com caixa mantido: a receita não recebida vai ao ICMS/ISS direto ao ente (art. 20 IV).
6. Registro dos valores a receber no modelo do Anexo IX (arts. 20 III e 77). Anexo IX **lido em 15/10** (D03).
7. Devolução e cancelamento deduzem só o valor efetivamente devolvido (arts. 17 p.ú. e 18 § 1º).

## Docs
- [`BE-INCR-SIMPLES-CAIXA-brief.md`](../../accounting/BE-INCR-SIMPLES-CAIXA-brief.md) — BRIEF (15/10)
- [[D-2026-10-15-X14-CAIXA-FORKS]] — escopo e forks F-CX-1..7 (15/10)
- [[D-2026-10-10-X14-PROXIMOS-PASSOS]] — D2 (c)
- [`BE-INCR-SIMPLES-NACIONAL-brief.md`](../../accounting/BE-INCR-SIMPLES-NACIONAL-brief.md)
