---
id: "RAG-DOCUMENTOS"
tipo: "plataforma"
dominio: "plataforma"
titulo: "RAG de documentos repensado — sqlite-vec no lugar do Qdrant, busca como serviço + ferramenta + rota, contexto do documento gerado e corrigível, embedding pela chave do usuário, fila de documentos no Redis do TEAMMATES"
estado: "planned"
estado_detalhe: "30/10: PRE-ADR Accepted — F-RAG-1..10 respondidos por questionário (cinco contra a recomendação); BRIEF com 28 itens em RAG-PR-A..D e forks F-RAG-B1..B5 pendentes; sem 'executa'. RAG-PR-A começa medindo a carga do sqlite-vec; RAG-PR-C espera o PR-1 do TEAMMATES e RAG-PR-D espera o PR-4"
depende_de: ["[[FIX-CHAT-AGENTE]]"]
ancora_sdd: "§7"
autorizacao: "dono, chat, 2026-10-29: \"Sim, vamos repensar o RAG agora, as coisas mudaram muito\" (planejar) · dono, chat, 2026-10-30: \"Forks do RAG antes\" + respostas por questionário ([[D-2026-10-30-RAG-DOCUMENTOS-FORKS]]) · dono, chat, 2026-10-30: \"BRIEF do RAG antes\" (BRIEF) — sem código, sem 'executa'"
atualizado: "2026-10-30"
write_set: ["server/src/features/documents/**", "server/src/lib/vector/**", "server/src/lib/embedding/**", "server/src/features/chat/**", "server/src/jobs/DocumentProcessingWorker.ts", "server/src/jobs/VecOrphanSweepScheduler.ts", "server/src/jobs/__tests__/schedulerFailureAlert.test.ts", "server/src/features/users/services/UserService.ts", "server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/routes/documents.ts", "server/src/routes/docs/documents.paths.ts", "server/public/openapi.json", "server/package.json", "server/package-lock.json", "docker-compose.yml", "server/.env.example"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts"]
prs: ["#978", "#990"]
---
# RAG-DOCUMENTOS — RAG de documentos repensado

**Estado:** `planned` — 30/10: PRE-ADR Accepted — F-RAG-1..10 respondidos por questionário (cinco contra a recomendação); BRIEF com 28 itens em RAG-PR-A..D e forks F-RAG-B1..B5 pendentes; sem 'executa'. RAG-PR-A começa medindo a carga do sqlite-vec; RAG-PR-C espera o PR-1 do TEAMMATES e RAG-PR-D espera o PR-4  
**Autorização:** dono, chat, 29/10 ("repensar o RAG", planejar) e 30/10 ("Forks do RAG antes" + questionário). Não autoriza código  
**Depende de:** [[FIX-CHAT-AGENTE]]; partes dependem do [[TEAMMATES]] (PR-1 para a chave do usuário, PR-4 para a fila)  
**Âncora no SDD consolidado:** §7

## Docs

- [`PRE-ADR-RAG-DOCUMENTOS.md`](../../adr/PRE-ADR-RAG-DOCUMENTOS.md) — 29/10, **Accepted** 30/10; respostas e consequências na §2.1
- Cédula: [[D-2026-10-30-RAG-DOCUMENTOS-FORKS]]
- [`BE-INCR-RAG-DOCUMENTOS-brief.md`](../../accounting/BE-INCR-RAG-DOCUMENTOS-brief.md) — 30/10: 28 itens em RAG-PR-A..D; forks F-RAG-B1..B5 **pendentes**; o item 1 (carga do `sqlite-vec`) trava o resto

## O que é

O Qdrant sai, e o vetor fica numa tabela `vec0` do `sqlite-vec` no próprio SQLite. A busca vira serviço, usado pela
ferramenta `search_documents` do agente e dos teammates e pela rota `POST /documents/search`. O chat mantém os dois
modos (RAG com documentos selecionados, agente sem eles). O processamento gera o contexto do documento (resumo, tipo,
entidades), que o usuário corrige pelo `PATCH`. O embedding e o contexto usam a chave do próprio usuário, com a da
instância de reserva. O processamento vai para uma fila própria no Redis do TEAMMATES, com 3 tentativas.

## Colisão com o TEAMMATES

`features/chat/**`, `lib/factory.ts`, `routes/index.ts`, `server/package.json` e o teste de descoberta de workers são
comuns aos dois nós. PRs que tocam esses arquivos rodam em série. A ressalva do item 8 do BRIEF do TEAMMATES (o teste
de "não ler `OPENAI_API_KEY`" não cobre o embedding) é emenda daquele nó.
