---
id: "FIX-CHAT-AGENTE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…"
estado: "inflight"
estado_detalhe: "Lote A (§3.3 #2 #3 #5 #8 #13 #14 #22) corrigido — 10 guardas verdes; #6 não reproduz como descrito (watchdog R18 já tira de PROCESSING em ≤15 min; reprocessar exige guardar os bytes = decisão do dono); parte 'COMPLETED com erro silencioso' do #14 = decisão do dono. Lote B (#9 #12 #15 #21 #23) corrigido — 8 guardas verdes; #10, #11 (= G1 do BE-INCR-DT-NO-CONSUMER-CALLS), #16 e a metade R26 do #9 = decisão do dono. Lote C (#19 #24) corrigido — 2 guardas verdes; #17, #18, #20 = decisão do dono; #25 coberto em parte (PromptSanitizer e filtro userId da busca vetorial seguem sem teste). Os 22 itens instrumentados; aguarda decisões e merge"
write_set: ["server/src/features/chat/**", "server/src/features/documents/**", "server/src/features/chatMessages/**", "server/src/features/chatInstances/**", "my-app/features/chat/**", "my-app/lib/services/document.service.ts", "my-app/components/widgets/chat/**", "my-app/features/documents/**", "my-app/pages/documents/**", "server/src/routes/documents.ts", "server/src/lib/vector/**", "server/src/lib/openai/OpenAIService.ts", "server/src/controllers/documentsController.ts"]
atualizado: "2026-10-22"
autorizacao: "dono, chat, 2026-10-21: \"Autorizo instrumentar e corrigir os achados de FIX-AUTH-CONTA (§3.4), FIX-CHAT-AGENTE (§3.3) e FIX-FE-DASHBOARD (§3.5) do ACHADOS-2026-10-19 — sessao-instrumentacao → sessao-correcao, lotes de até 8 itens por PR, sem merge. Itens que dependem de transporte de e-mail ficam fora.\" · dono, chat, 2026-10-22: \"Todos os 22 em série\" (D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD) — sem merge; item que se revelar decisão de produto volta ao dono"
prs: ["#835", "#836", "#838"]
---
# FIX-CHAT-AGENTE — Chat, agente ERP e documentos: role system injetável no histórico, agente sem memória, documento preso em PROCESSING, propostas sem TTL, PII em log…

**Estado:** `inflight` — Lote A (§3.3 #2 #3 #5 #8 #13 #14 #22) corrigido — 10 guardas verdes; #6 não reproduz como descrito (watchdog R18 já tira de PROCESSING em ≤15 min; reprocessar exige guardar os bytes = decisão do dono); parte 'COMPLETED com erro silencioso' do #14 = decisão do dono. Lote B (#9 #12 #15 #21 #23) corrigido — 8 guardas verdes; #10, #11 (= G1 do BE-INCR-DT-NO-CONSUMER-CALLS), #16 e a metade R26 do #9 = decisão do dono. Lote C (#19 #24) corrigido — 2 guardas verdes; #17, #18, #20 = decisão do dono; #25 coberto em parte (PromptSanitizer e filtro userId da busca vetorial seguem sem teste). Os 22 itens instrumentados; aguarda decisões e merge  
**Autorização:** dono, chat, 2026-10-21 — instrumentar e corrigir §3.3 em lotes de até 8 itens por PR, sem merge; 2026-10-22 — os 22 restantes em série  
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
