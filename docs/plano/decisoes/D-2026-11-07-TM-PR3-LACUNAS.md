---
id: "D-2026-11-07-TM-PR3-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "TEAMMATES PR-3: lacunas L-PR3-1/2/3/4/5 respondidas por questionário (memória 50, proposta 72 h, maxTokens 4096, colunas novas no PR-4)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07, AskUserQuestion sobre as lacunas do #1130 · execução coberta pelo EXECUTA do nó TEAMMATES (dono, chat, 2026-11-06)"
atualizado: "2026-11-07"
---
# D-2026-11-07-TM-PR3-LACUNAS

**Estado:** `decided`. Nó: [[TEAMMATES]]. PR: #1130 (TM PR-3, runner de turno).

| Lacuna | Pergunta | Resposta literal | Efeito |
|---|---|---|---|
| L-PR3-1 | N da memória do runner | "50, igual ao chat (Recomendado)" | `memoryLimit = 50` (o mesmo `MAX_PERSISTED_HISTORY` do chat), passado pelo compositor do PR-4 |
| L-PR3-2 | Prazo do `expiresAt` da proposta | "72 horas (Recomendado)" | `proposalTtlMs = 72 h` |
| L-PR3-5 | `maxTokens` de cada chamada | "4096 (Recomendado)" | `maxTokens = 4096` |
| L-PR3-3/4 | Duração e aviso do turno sem coluna | "Colunas novas no PR-4 (Recomendado)" | Migração no PR-4: `AgentTurn.startedAt`, `output` e `warning`. A duração é a da execução, sem contar a fila |

**Seguem abertas** (fora deste questionário): L-PR3-6 (override LIVRE→PROPOSTA sem formato de proposta), L-PR3-7
(memória da rotina), L-PR3-8 (fuso do usuário em segundo plano, que também atinge o item 24), L-PR3-9 (MCP, PR-10) e
L-PR3-10 (nenhuma ferramenta PROIBIDA hoje).
