---
id: "D-2026-10-21-FORKS-IBS-CBS-2027-BRIEF"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-IBS-11..13 do BRIEF BE-INCR-IBS-CBS-2027 ratificados por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"ratifica F-IBS-11..13 por questionário\" — respostas no AskUserQuestion de 21/10. NÃO é 'executa' nem merge"
atualizado: "2026-10-21"
---
# D-2026-10-21-FORKS-IBS-CBS-2027-BRIEF

**Estado:** `decided`. **Autorização:** dono, chat, 21/10/2026 — *"ratifica F-IBS-11..13 por questionário"*. Opções
preparadas a partir do §5 de `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md`.

| Fork | Resposta | O que fica decidido |
|---|---|---|
| F-IBS-11 conferência sem alíquota | **Pula com aviso** (a) | Sem linha CBS `PUBLISHED`, a conferência do item 7 é pulada com aviso `CONFERENCIA_SEM_ALIQUOTA` e a apuração confirma pelo débito do documento (art. 60 § 1º). A antecipação do pacote (item 17) continua com 400 nomeado |
| F-IBS-12 apropriação do crédito | **Rota própria no AP** (a) | `POST /api/accounting/payables/:id/ibs-cbs-credits/apropriar`, CAS no status do crédito do `Payable`; a apuração só lê `APROPRIADO` |
| F-IBS-13 P-IBS-1 negativa | **Volta ao dono antes** (a) | O `executa` do PR-2 cita o estado da P-IBS-1; resposta negativa devolve o F-IBS-7 ao dono antes do PR-2 |

## O que NÃO decide

Não há 'executa' nem merge. P-IBS-1..7 seguem com o contador / fonte oficial.
