---
id: "FIX-CHAT-AGENTE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…"
estado: "planned"
estado_detalhe: "Registrado 19/10; §3.3 do documento de achados (25 itens)"
write_set: ["server/src/features/chat/**", "server/src/features/documents/**", "server/src/features/chatMessages/**", "server/src/features/chatInstances/**", "my-app/features/chat/**"]
atualizado: "2026-10-19"
---
# FIX-CHAT-AGENTE — Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…

**Estado:** `planned` — Registrado 19/10; §3.3 do documento de achados (25 itens)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
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
