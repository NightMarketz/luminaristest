---
id: "FIX-CHAT-AGENTE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…"
estado: "inflight"
estado_detalhe: "Lotes A–C mergeados (#835, #836, #838 em 22/10; #1/#4/#7 pelo #803). Decisões do dono de 29/10 em D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO: lote D (R26 aposentado, 2 rotas do Qdrant fora, #18 no README, #20 no DTO, #25 coberto) no PR deste fechamento; #6, #11 e #16 fecham sem código; #10 sai do nó (fila de documentos na BullMQ do TEAMMATES, depois do PR-0). Falta para done: só o merge do PR do lote D"
write_set: ["server/src/features/chat/**", "server/src/features/documents/**", "server/src/features/chatMessages/**", "server/src/features/chatInstances/**", "my-app/features/chat/**", "my-app/lib/services/document.service.ts", "my-app/components/widgets/chat/**", "my-app/features/documents/**", "my-app/pages/documents/**", "server/src/routes/documents.ts", "server/src/lib/vector/**", "server/src/lib/openai/OpenAIService.ts", "server/src/controllers/documentsController.ts", "server/src/features/structuredData/**", "server/src/controllers/structuredDataController.ts", "server/src/routes/structured-data.ts", "server/src/routes/index.ts", "server/src/routes/docs/documents.paths.ts", "server/src/routes/docs.paths.ts", "server/src/lib/openai/**", "server/src/lib/factory.ts", "server/prisma/schema.prisma", "server/prisma/migrations/20261029150000_fix_chat_agente_r26_drop_structured_data/migration.sql", "server/test/helpers/db.ts", "server/test/helpers/seed.ts", "server/public/openapi.json", "server/.dependency-cruiser-known-violations.json", "my-app/types/contracts/structuredData/**"]
atualizado: "2026-10-29"
autorizacao: "dono, chat, 2026-10-29: \"Dispara sessão para o FIX-CHAT-AGENTE fechado: os teammates rodam em cima do chat agente atual.\" + respostas em D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO (sem merge; merge pela classe de risco) · dono, chat, 2026-10-21: \"Autorizo instrumentar e corrigir os achados de FIX-AUTH-CONTA (§3.4), FIX-CHAT-AGENTE (§3.3) e FIX-FE-DASHBOARD (§3.5) do ACHADOS-2026-10-19 — sessao-instrumentacao → sessao-correcao, lotes de até 8 itens por PR, sem merge. Itens que dependem de transporte de e-mail ficam fora.\" · dono, chat, 2026-10-22: \"Todos os 22 em série\" (D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD) — sem merge; item que se revelar decisão de produto volta ao dono"
prs: ["#835", "#836", "#838"]
---
# FIX-CHAT-AGENTE — Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…

**Estado:** `inflight` — Lotes A–C mergeados (#835, #836, #838 em 22/10; #1/#4/#7 pelo #803). Decisões do dono de 29/10 em D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO: lote D (R26 aposentado, 2 rotas do Qdrant fora, #18 no README, #20 no DTO, #25 coberto) no PR deste fechamento; #6, #11 e #16 fecham sem código; #10 sai do nó (fila de documentos na BullMQ do TEAMMATES, depois do PR-0). Falta para done: só o merge do PR do lote D  
**Autorização:** dono, chat, 2026-10-21 — instrumentar e corrigir §3.3 em lotes de até 8 itens por PR, sem merge; 2026-10-22 — os 22 restantes em série ([[D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD]])  
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

## Lotes (numeração da tabela §3.3 do ACHADOS-2026-10-19)

- **Já na main:** #1 e #7 (#803), #4 (`c7218b59`).
- **Lote A** — #2 #3 #5 #8 #13 #14 #22 corrigidos; guardas em `server/src/features/chat/__tests__/fixChatAgenteLoteA.test.ts`,
  `my-app/components/widgets/chat/__tests__/DocumentChatWidget.proposal.test.tsx` e
  `my-app/features/documents/__tests__/documentsPage.failedStatus.test.tsx`. #6 e a metade "COMPLETED com erro
  silencioso" do #14 voltam ao dono (ver GAP-MAP). `write_set` ampliado para os arquivos onde os achados moram
  (o chat do dashboard vive em `my-app/components/widgets/chat/`, não em `my-app/features/chat/`).
- **Lote B** — #9 #12 #15 #21 #23 corrigidos; guardas em `server/src/features/documents/__tests__/fixChatAgenteLoteB*.test.ts` e
  `my-app/lib/services/__tests__/document.service.tokenCost.test.ts`. Voltam ao dono: #10 (fila/worker), #11 (é o G1 do
  [[BE-INCR-DT-NO-CONSUMER-CALLS]], aguarda "executa"), #16 (remover × expor os métodos sem rota) e a metade R26 do #9.
- **Lote C** — #19 #24 corrigidos; guarda em `server/src/features/chat/__tests__/fixChatAgenteLoteC.test.ts`. Voltam ao
  dono: #17 e #20 (remover rota/ação sem consumidor), #18 (aposentar a tabela `Chunk`). #25: ver GAP-MAP.
- **Lote D (fechamento, 29/10)** — decisões do dono em [[D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO]]. R26 (metades do #9 e do
  #14) aposentado: sem extração estruturada, sem a feature `structuredData` e sem a tabela; #17 parcial: saem
  `qdrant-status` e `/:id/qdrant`, ficam `search` e `PATCH /:id` para o repensar do RAG; #25 coberto (`PromptSanitizer` e
  filtro `userId` da busca vetorial). Guarda em `server/src/features/documents/__tests__/fixChatAgenteLoteD.test.ts`. Sem
  código: #6 (FAILED + reenvio), #11 (fechado no #773), #16 (mantidos para o chat), #18 (README de documentos), #20
  (comentário no `ChatDto`). #10 sai do nó: vira fila de documentos na BullMQ do TEAMMATES, depois do PR-0 dele.
