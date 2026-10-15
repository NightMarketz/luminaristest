---
id: "X14-CAIXA"
tipo: "regua"
dominio: "fiscal"
titulo: "Simples Nacional ME/EPP: base do DAS pela receita recebida (regime de caixa) — registro de recebíveis e gatilhos do art. 20"
estado: "planned"
estado_detalhe: "15/10: BRIEF escrito (`BE-INCR-SIMPLES-CAIXA-brief.md`, 22 itens em 3 PRs: recebimento + trava de ano → base caixa + art. 20 → Anexo IX + incobráveis). Fato novo: a Res. CGSN 190/2026 extingue o caixa em 01/01/2027 (revoga arts. 16 § 1º, 19, 20, 77 e 78), e o nó serve só aos PAs até dez/2026. Escopo \"caixa completo para 2026\" (dono, contra a recomendação de guarda + encerrar). F-CX-1..7 e F-CX-2.1 RATIFICADOS; F-CX-2 (c) D+N e F-CX-7 (a) calcular ICMS/ISS, os dois contra a recomendação. Pendentes de contador: A1 (transição dez/2026) e A2 (dia do recebimento no cartão). Sem executa"
depende_de: ["[[X14]]", "[[D-2026-10-10-X14-PROXIMOS-PASSOS]]", "[[D-2026-10-15-X14-CAIXA-FORKS]]"]
autorizacao: "dono, chat, 2026-10-15: \"Autorizo planejar o BRIEF do X14-CAIXA — sessao-planejamento, sem código, sem 'executa'\" — só o BRIEF; forks ratificados no questionário do mesmo dia ([[D-2026-10-15-X14-CAIXA-FORKS]]) — sem executa"
ancora_sdd: "—"
atualizado: "2026-10-15"
prs: []
---
# X14-CAIXA — base do DAS por recebimento (regime de caixa)

**Estado:** `planned`. BRIEF escrito em 15/10, forks ratificados, **sem `executa`**.  
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
