---
id: "D-2026-09-28-GAP-MAP-3-4-5-E-ANEXO-PENDENTE"
tipo: "decisao"
dominio: "fiscal"
titulo: "GAP-MAP 3/4/5 (applyResult, assinatura do evento, beforeDelete individual), EBUSY local e forks F-PA-1..8 do BRIEF ANEXO-PENDENTE"
estado: "decided"
autorizacao: "questionários em sessão, dono, 2026-09-28: \"GAP 3, 4 e 5\" · forks de desenho · \"Pode dar merge\" · F-PA-1..8"
atualizado: "2026-09-28"
---
# D-2026-09-28-GAP-MAP-3-4-5-E-ANEXO-PENDENTE — decisões do dono em 28/09 (noite)

**Estado:** `decided`  
**Autorização:** questionários em sessão, dono, 2026-09-28 (respostas citadas abaixo)

| # | Decisão | Palavras do dono (28/09) | Efeito |
|---|---|---|---|
| 1 | Corrigir os achados 3, 4 e 5 do GAP-MAP (instrumentação → correção, um PR por achado) | "GAP 3, 4 e 5" | #419 (GAP 5) · #420 (GAP 3) · #421 (GAP 4) |
| 2 | GAP 3: a tx de autorização roda primeiro; anexo e proveniência só depois | "Autorizar antes, anexar depois" | #420 → [[DFE-MANUAL]]; resíduo "XML perdido se o anexo falhar" → BRIEF ANEXO-PENDENTE |
| 3 | GAP 4: verificar só a `evento/ds:Signature`, com as regras do F-MAN-1 | "Só a do evento, regras F-MAN-1" | #421 → [[DFE-MANUAL]]; a cadeia ICP-Brasil segue no F-SIG-3 (c) |
| 4 | Guarda de status na 2ª escrita do `applyResult` + BRIEF da pendência + conserto do EBUSY | "Guarda do 2º write no #420", "BRIEF da pendência de anexo", "Conserto do EBUSY local" | `3eb8169e` (#420) · #425 · #424 |
| 5 | Mergear os três PRs | "Pode dar merge" | #419, #420, #421 em `main` |
| 6 | BRIEF BE-INCR-DFE-ANEXO-PENDENTE: F-PA-1 a · 2 a · 3 a · 4 a · **5 c** · 6 a · **7 b** · **8 b** | respostas do questionário | as escolhas em negrito ficaram fora da recomendação: cancelamento antes de drenar anexa e aposenta (como o #420); backfill por reconsulta automático em todo tick (custo declarado no item 11). A execução ainda pede `executa` |
