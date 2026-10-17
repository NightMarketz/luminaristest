---
id: "D-2026-10-17-DT-VERSION-LEDGER"
tipo: "decisao"
dominio: "plataforma"
titulo: "Ledger de versões das DynamicTables: linhas + schema, ver/diff/restaurar, append-only simples; só o BRIEF"
estado: "decided"
autorizacao: "dono, chat, 2026-10-17: \"Ledger de versões para as tabelas dinamicas\"; questionário do mesmo dia: \"Linhas + schema (Recomendado)\", \"Ver + diff + restaurar (Recomendado)\", \"Append-only simples (Recomendado)\", \"Só planejar o BRIEF (Recomendado)\""
atualizado: "2026-10-17"
---
# D-2026-10-17-DT-VERSION-LEDGER — ledger de versões das tabelas dinâmicas

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-17: *"Ledger de versões para as tabelas dinamicas"*. Abre o nó
[[BE-INCR-DT-VERSION-LEDGER]] e cobre **só o BRIEF** (`sessao-planejamento`, sem código, sem `executa`).

## Questionário de 17/10

| # | Pergunta | Decisão | Palavras |
|---|---|---|---|
| D1 | O que versiona (hoje `data` e `schema` são sobrescritos sem histórico) | Linhas **e** schema; cada versão de linha guarda a versão do schema vigente | *"Linhas + schema (Recomendado)"* |
| D2 | O que o usuário faz com as versões | Lista, diff campo a campo e restaurar; restaurar grava versão **nova** pelo caminho normal de atualização | *"Ver + diff + restaurar (Recomendado)"* |
| D3 | Integridade | Append-only simples, na mesma tx da escrita; sem hash-chain, sem `AuditEvent` | *"Append-only simples (Recomendado)"* |
| D4 | Alcance desta autorização | Só o BRIEF | *"Só planejar o BRIEF (Recomendado)"* |

Os forks de detalhe (F-DTV-1..7) ficam **pendentes** no BRIEF.
