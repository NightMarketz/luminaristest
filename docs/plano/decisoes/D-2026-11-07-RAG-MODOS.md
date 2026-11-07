---
id: "D-2026-11-07-RAG-MODOS"
tipo: "decisao"
dominio: "plataforma"
titulo: "RAG com dois modos de resposta (descritivo × rápido): F-RAG-M1..M7 respondidos por questionário; descritivo vale também no agente (M6 contra a recomendação)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07, questionário (pergunta sobre chunkId no hit): \"Ele tem que ter dois modos no RAG, o descritivo onde mostra chunkID, cita fonte e em hover demonstra dados tecnicos e o modo rapido que só da a resposta\" · dono, chat, 2026-11-07: respostas por AskUserQuestion aos forks F-RAG-M1..M7 da emenda · execução coberta pelo EXECUTA do nó (dono, chat, 2026-11-06)"
atualizado: "2026-11-07"
---
# D-2026-11-07-RAG-MODOS

**Estado:** `decided`. Emenda: [BE-INCR-RAG-DOCUMENTOS-emenda-2026-11-07-modos](../../accounting/BE-INCR-RAG-DOCUMENTOS-emenda-2026-11-07-modos.md)
(item 15 do RAG-PR-B, 15a–15f). Nó: [[RAG-DOCUMENTOS]].

| # | Pergunta | Resposta literal | Efeito |
|---|---|---|---|
| F-RAG-M1 | Onde o modo é escolhido? | "Campo em cada pedido (Recomendado)" | `ChatRequestSchema.ragMode: 'DESCRITIVO' \| 'RAPIDO'` |
| F-RAG-M2 | Padrão sem o campo | "Rápido (Recomendado)" | Cliente que não manda o campo fica como hoje |
| F-RAG-M3 | Rápido devolve `sourceDocuments`? | "Devolve, a tela esconde (Recomendado)" | Prova do item 15 ("`sourceDocuments` igual") mantida |
| F-RAG-M4 | Como cita a fonte | "Marcadores [n] (Recomendado)" | `[n]` no texto, mapeado no servidor a `chunkId`; marcador sem trecho entregue é descartado |
| F-RAG-M5 | Dados técnicos do hover | "Trecho + índice (Recomendado)" | `technical { chunkId, documentId, fileName, chunkIndex, score, embeddingStamp }` + `answerModel`; sai o `userId` do payload |
| F-RAG-M6 | Descritivo no agente (`search_documents`)? | "Agente também" (a recomendada era só no modo RAG) | Item 15f: no modo agente o descritivo também numera os trechos devolvidos pela ferramenta e liga os `[n]` da resposta final |
| F-RAG-M7 | Citações no histórico? | "Salvar (Recomendado)" | `ChatMessage.ragDetail Json?` com migração no PR do item 15 |
