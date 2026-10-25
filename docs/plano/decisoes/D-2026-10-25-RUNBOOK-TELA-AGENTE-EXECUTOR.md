---
id: "D-2026-10-25-RUNBOOK-TELA-AGENTE-EXECUTOR"
tipo: "decisao"
dominio: "plataforma"
titulo: "Runbook de conferência na tela do app: o agente, na persona do revisor, marca o desfecho e assina como agente"
estado: "decided"
autorizacao: "dono, chat, 2026-10-25: \"Pode preencher como persona do revisor, pode adicionar essa regra como executor ai\""
atualizado: "2026-10-25"
---
# D-2026-10-25-RUNBOOK-TELA-AGENTE-EXECUTOR

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-25: *"Pode preencher como persona do revisor, pode adicionar essa regra como executor ai"*,
em resposta à recusa do agente em assinar o `RUNBOOK-KANBAN-REORDER.md` com base em `RUNBOOK-FORMAT.md` §Fronteira.

## O que muda

Exceção à regra "desfecho e assinatura só do dono" (`RUNBOOK-FORMAT.md` §Fronteira, `CLAUDE.md`):

- **Vale para:** runbook de conferência na tela do próprio app em que todos os passos executados foram
  rodados pelo agente, com as ferramentas dele, na sessão.
- **Condições:**
  - comando do dono no chat para aquele runbook, citado literalmente no campo Executor;
  - assinatura identificando o agente (modelo + "persona revisor"), nunca um nome de pessoa;
  - desfecho só pela evidência colada.
- **Não vale para:**
  - os gates H1, H2, M2, X1 e X2;
  - nada que dependa de PVA, NF-e real, arquivo RFB, contador ou deploy.

  Esses continuam com assinatura humana, e `luminaris-gate-copilot` [GHC-001] fica intacto.

O recorte aos runbooks de tela foi leitura do agente sobre "essa regra" (o contexto era o runbook do Kanban).
Ampliar o recorte é decisão nova.

## Primeiro uso

[[FE-INCR-KANBAN-REORDER]]: o `RUNBOOK-KANBAN-REORDER.md` foi fechado como **FALHOU no passo 4**: o quadro fica vazio
depois de uma falha de rede no meio do rebalanceio. O fechamento está no PR #886.
