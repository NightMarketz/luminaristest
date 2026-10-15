---
id: "FE-INCR-SIMPLES"
tipo: "fe"
dominio: "fiscal"
titulo: "Telas do Simples Nacional: histórico, segregação, parceria, apuração/espelho e registro do DAS"
estado: "inflight"
estado_detalhe: "15/10 (executa PR-A/B/C): PR-B #718 (empilhado no #714) — itens 9–10 (DAS oficial com prévia obrigatória, sem PDF: lacuna em [[D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS]]; parcerias) · PR-A #714 — itens 1–8 (grade por regime do ano, 12 GETs com 3 em voo, detalhe ME/EPP e MEI, alertas, calcular, enquadramento MEI na aba Perfil fiscal); 3 lacunas por questionário em [[D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS]] (dedupe de toast contra a recomendação). PR-D fora (F-FS-8 c). Merge só com OK do dono · Achado §7 item 3 do BE-INCR-SIMPLES-NACIONAL-brief. BRIEF autorizado em 10/10 (D4 (a) de D-2026-10-10-X14-PROXIMOS-PASSOS), sobre o cálculo por competência; a variante caixa (X14-CAIXA) entra depois como emenda. Fila (D1): depois do código do SIMEI-TAC-12 · 12/10: BRIEF escrito (`FE-INCR-SIMPLES-brief.md`, 16 itens em 4 PRs A–D; ME/EPP + MEI/TAC/Anexo VII + DASN-SIMEI + DEFIS + alíquotas); F-FS-1..7 RATIFICADOS (todos na recomendação); F-FS-8 (c) contra a recomendação — PR-D espera a correção da DEFIS no BE (soma = 100% + cotas em tesouraria, manual §9.4.3.1); substitui o §3.1 do FE-INCR-TAX-ASSESSMENT (F-FS-1 a); PR-C espera GET de histórico/segregação no BE (frente própria). Sem executa"
depende_de: ["[[X14]]", "[[D-2026-10-10-X14-PROXIMOS-PASSOS]]", "[[X14-CAIXA]]?", "[[BE-INCR-SIMPLES-GET-ENTRADAS]]", "[[BE-INCR-SIMPLES-DEFIS-MANUAL]]"]
autorizacao: "dono, chat, 2026-10-10, questionário ([[D-2026-10-10-X14-PROXIMOS-PASSOS]]): D4 \"(a) Planejar o BRIEF agora\" — só sessao-planejamento (BRIEF); sem código, sem executa · dono, chat, 2026-10-12: \"Pode fazer o brief\" + questionário: \"BRIEF completo novo\"; F-FS-1..7 ratificados (todos na recomendação); F-FS-8 \"(c) o PR-D espera o backend ser corrigido.\" — sem executa · **EXECUTA** (dono, chat, 2026-10-15): \"Executa o FE-INCR-SIMPLES, PR-A, PR-B e PR-C — sessao-feature, um PR por vez na ordem do BRIEF\" — PR-D fora (F-FS-8 c); sem merge"
ancora_sdd: "—"
atualizado: "2026-10-15"
prs: ["#714", "#718"]
---
# FE-INCR-SIMPLES — telas do Simples Nacional

**Estado:** `inflight` — executa 15/10 (PR-A/B/C, um por vez); PR-A #714 e PR-B #718 (empilhado) em revisão; PR-D fora (F-FS-8 c).  
**Autorização:** dono, chat, 2026-10-10 — D4 "(a) Planejar o BRIEF agora": só o BRIEF (`sessao-planejamento`). Sem `executa`. **Executa** PR-A/B/C: dono, chat, 2026-10-15.  
**Depende de:** [[X14]] ✅ (BE). Pontilhada: [[X14-CAIXA]] (emenda quando a base por recebimento existir).  
**Ordem:** D1 de [[D-2026-10-10-X14-PROXIMOS-PASSOS]] — o código do [[SIMEI-TAC-12]] vem primeiro.

## Docs
- [`FE-INCR-SIMPLES-brief.md`](../../accounting/FE-INCR-SIMPLES-brief.md) — BRIEF (12/10), forks F-FS-1..7 ratificados
- [`BE-INCR-SIMPLES-NACIONAL-brief.md`](../../accounting/BE-INCR-SIMPLES-NACIONAL-brief.md) §7 item 3
- [[D-2026-10-10-X14-PROXIMOS-PASSOS]]
- [[D-2026-10-15-FE-SIMPLES-PR-A-LACUNAS]] — lacunas do PR-A (15/10)
- [[D-2026-10-15-FE-SIMPLES-PR-B-LACUNAS]] — lacuna do PR-B (15/10)
