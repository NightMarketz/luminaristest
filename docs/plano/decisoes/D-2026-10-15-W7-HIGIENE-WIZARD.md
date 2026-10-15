---
id: "D-2026-10-15-W7-HIGIENE-WIZARD"
tipo: "decisao"
dominio: "plataforma"
titulo: "W7: planejar autorizado; F-W7-1..3 ratificados pela recomendação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15: \"Autorizo planejar o BRIEF do W7 — sessao-planejamento, sem código, sem 'executa'\"; questionário do mesmo dia: F-W7-1 \"Incluir após o W6 (Recomendado)\" · F-W7-2 \"Reenviar o mesmo pedido (Recomendado)\" · F-W7-3 \"FE-INCR em 2–3 PRs (Recomendado)\""
atualizado: "2026-10-15"
---
# D-2026-10-15-W7-HIGIENE-WIZARD — higiene do FE do wizard

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-15. Abre o [[W7]] **para planejar** (BRIEF
[`FE-INCR-WIZARD-HYGIENE-brief.md`](../../accounting/FE-INCR-WIZARD-HYGIENE-brief.md)); **não** autoriza executar.

## Decisões

| # | Tema | Decisão | Palavras |
|---|---|---|---|
| 1 | F-W7-1 · painel direito (`RightSidebar/*`) × [[W6]]/[[W1]] | **(a)** entra no W7 em PR próprio (PR-3), aberto só depois do merge do W6 | *"Incluir após o W6 (Recomendado)"* |
| 2 | F-W7-2 · "Tentar novamente" após falha do create | **(a)** reenvia o último pedido sem recarregar; `ONBOARDING_ROLLBACK_FAILED` e 403 ficam sem retry | *"Reenviar o mesmo pedido (Recomendado)"* |
| 3 | F-W7-3 · forma de execução | **(a)** `FE-INCR-WIZARD-HYGIENE` em 2–3 PRs pela `sessao-feature` | *"FE-INCR em 2–3 PRs (Recomendado)"* |
