---
id: "FIX-ANALYTICS-DADO"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Analytics: dado fabricado/errado mostrado como real (Top-10 por nome, contas a pagar 0, KPIs de constante, barra anterior, sparkline, badge flat)"
estado: "done"
estado_detalhe: "20/10 (fold): #770 mergeado em main em 20/10 (05:42Z); nó fecha (done). Item 3 entrou com a opção segura (KPIs de constante escondidos); a decisão (a)/(b) continua com o dono · PR #770 aberto, 6 pares vermelho→verde, GAP-MAP Nível 5; CI 14/14 verde (19/10). Pendente do dono: OK por número e decisão do item 3 — (a) esconder os KPIs derivados de constante × (b) ler dado real de funcionários/patrimônio"
autorizacao: "dono, chat, 2026-10-19 (questionário): \"Autorizo as duas (Recommended)\" — 6 itens, item 3 só a opção segura; merge NÃO autorizado"
prs: ["#770"]
atualizado: "2026-10-20"
---
# FIX-ANALYTICS-DADO — Analytics: dado fabricado/errado mostrado como real (Top-10 por nome, contas a pagar 0, KPIs de constante, barra anterior, sparkline, badge flat)

**Estado:** `done` — 20/10 (fold): #770 mergeado em main em 20/10 (05:42Z); nó fecha (done). Item 3 entrou com a opção segura (KPIs de constante escondidos); a decisão (a)/(b) continua com o dono · PR #770 aberto, 6 pares vermelho→verde, GAP-MAP Nível 5; CI 14/14 verde (19/10). Pendente do dono: OK por número e decisão do item 3 — (a) esconder os KPIs derivados de constante × (b) ler dado real de funcionários/patrimônio  
**Autorização:** dono, chat, 2026-10-19 (questionário): "Autorizo as duas (Recommended)" — 6 itens, item 3 só a opção segura; merge NÃO autorizado  
**Depende de:** —  
**PRs:** #770  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

## Itens

1. Top-10 ordenava por nome (o processador ignorava `sort.by:'measure'`).
2. Contas a pagar sempre 0: `expenseDateField:'date'`, campo que `expenses` não tem.
3. KPIs derivados de constantes fixas no preset (`employeesCount: 3`, `equity: 50000`…) — escondidos; a decisão de produto é do dono.
4. Barra "período anterior" = 80% do atual quando faltava dado.
5. Sparkline com `Math.random`.
6. Badge ▼ vermelho para tendência `flat`.

Inclui o primeiro teste de acoplamento preset↔schema (campos de `expenses`). A generalização é [[TESTE-ACOPLAMENTO-PRESET]].
