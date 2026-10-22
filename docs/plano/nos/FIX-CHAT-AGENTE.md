---
id: "FIX-CHAT-AGENTE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…"
estado: "inflight"
estado_detalhe: "§3.3 #1 #7 corrigidos (#803) e #4 (c7218b59); os 22 restantes seguem em série, lotes de até 8 (dono, 22/10, [[D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD]])"
autorizacao: "dono, chat, 2026-10-21: \"Autorizo instrumentar e corrigir os achados de FIX-AUTH-CONTA (§3.4), FIX-CHAT-AGENTE (§3.3) e FIX-FE-DASHBOARD (§3.5) do ACHADOS-2026-10-19 — sessao-instrumentacao → sessao-correcao, lotes de até 8 itens por PR, sem merge. Itens que dependem de transporte de e-mail ficam fora.\" · dono, chat, 2026-10-22: \"Todos os 22 em série\""
write_set: ["server/src/features/chat/**", "server/src/features/documents/**", "server/src/features/chatMessages/**", "server/src/features/chatInstances/**", "my-app/features/chat/**", "my-app/lib/services/document.service.ts"]
atualizado: "2026-10-22"
---
# FIX-CHAT-AGENTE — Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…

**Estado:** `inflight` — #1 #4 #7 corrigidos; 22 restantes em série, lotes de até 8  
**Autorização:** dono, chat, 2026-10-21 (instrumentar e corrigir §3.3 em lotes de até 8, sem merge) e 2026-10-22 ("Todos os 22 em série")  
**Depende de:** —  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

registrado a pedido do dono (chat, 2026-10-19: "Já incorpora nos planos do vault e encaixa na fila"); sem 'executa'.

## Itens de maior risco (§3.3)

1. O cliente pode mandar `role: 'system'` no `history` (sanitização só na `query`; sem teto).
2. Agente sem memória entre turnos (nenhuma tela envia `history`; o servidor não lê o que persiste); loop de tools de um passo só.
3. Documento preso em PROCESSING para sempre após restart (bytes só em memória, sem job).
4. Propostas nunca expiram (`deleteOldProposals` sem chamador; `EXECUTED/EXPIRED` nunca escritos).
5. PII de registros em log `info`; conteúdo extraído em `warn`.
6. Seletor de documentos do RAG chama `/documents?mode=list` (ignorado pela rota) → "formato inválido" sempre.
7. KnowledgeGraph stale após `updateTableSchemaAsSystem` (ver também o BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS`).
8. Qdrant sem índice de payload em `userId`; `qdrant-status` vaza contagem global.
