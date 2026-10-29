---
id: "D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO"
tipo: "decisao"
dominio: "plataforma"
titulo: "FIX-CHAT-AGENTE: os itens do §3.3 que voltaram ao dono (#6, #9-R26, #10, #14 metade, #16, #17, #18, #20) e o fechamento do nó"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29, ao pedir a sessão: \"Dispara sessão para o FIX-CHAT-AGENTE fechado: os teammates rodam em cima do chat agente atual.\" · respostas por AskUserQuestion no mesmo dia: R26/#14 \"Aposentar pipeline (Recomendado)\"; #10 \"Reusar a fila do TEAMMATES (Recomendado)\"; #6 \"FAILED e reenvio (Recomendado)\"; #18 \"Manter e documentar (Recomendado)\"; #17 \"Qdrant pode extinguir e as rotas de buscar documento são de RAG\" e, na confirmação, \"Sim, vamos repensar o RAG agora, as coisas mudaram muito\"; #16 \"Isso não é para o chat de mensagem? Ainda nao terminamos a implementação\" e, na confirmação, \"Manter, reservado (Recomendado)\"; #20 \"Manter para o TEAMMATES (Recomendado)\". NÃO é merge: merge segue a classe de risco (D-2026-10-28-FLUXO-AUTONOMO)"
atualizado: "2026-10-29"
---
# D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO

**Estado:** `decided`. **Autorização:** dono, chat, 29/10/2026. O texto literal das respostas ao questionário está no
campo `autorizacao`. Os itens vêm de [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)
§3.3 e são os que os lotes A–C (#835, #836, #838, todos mergeados em 22/10) devolveram ao dono. Nó: [[FIX-CHAT-AGENTE]].

## Medido antes de perguntar (gh, 2026-10-29)

- #803, #835, #836 e #838 estão **MERGED** (20–22/10); o #797, só com os guardas vermelhos, foi fechado e o conteúdo
  entrou pelo #803. A nota do nó dizia "aguarda merge" por inércia.
- **#11 já estava fechado.** O G1 do [[BE-INCR-DT-NO-CONSUMER-CALLS]] foi feito no #773, mergeado em 20/10:
  `updateTableSchemaAsSystem` tem um único chamador (`PresetSyncService`), e os dois controllers que o acionam
  (`syncPreset` e `installTableFromPreset`) chamam `afterStructureWrite`. O guarda estático é o
  `dynamicTableWritersCallEffects.test.ts`. Por isso o #11 não foi perguntado.
- **#25 não é decisão de produto.** Faltava teste para o `PromptSanitizer` e para o filtro `userId` da busca vetorial.
  É instrumentação e entra no lote D.

## Decisões

| # | Achado | Decisão | Efeito |
|---|---|---|---|
| 9 (metade R26) + 14 (metade "COMPLETED com erro silencioso") | Upload "Análise de dados" extrai tabela para o `StructuredData`, uma feature aposentada e sem tela; paga OpenAI (`isTextTabular` + extração); se falha, grava COMPLETED com o erro só em `contextJson.errors` | **Aposentar o pipeline** | Lote D: sai a extração do `DocumentProcessingPipeline`, junto com a feature `structuredData` (serviço, policy, repositório, controller e rota `/structured-data/*`), o `ExcelStructuredExtractor` e os métodos do `OpenAIService` que só ela usava. A tabela `StructuredData` sai por migração. O seletor de finalidade do upload continua, agora só como rótulo |
| 10 | Extração de texto (até 50 MB) no event loop, sem fila nem worker | **Reusar a fila BullMQ + Redis do TEAMMATES** (F-TM-5 de `D-2026-10-29-TEAMMATES-FORKS`, no PR #969) | Sai deste nó. O PR-0 do TEAMMATES exige este nó fechado, então o documento como job (`{ documentId }`, bytes em disco) fica para **depois do PR-0** e vira proposta a registrar quando a fila existir. Até lá valem o teto de 50 MB e o limitador do lote B |
| 6 | Documento em PROCESSING após restart; bytes só em memória | **Fica FAILED, e o usuário reenvia** | Sem código: o watchdog R18 passa a `FAILED` em até 15 min e a tela já sela o erro (lote A, #14). O reprocessamento automático chega com a fila do #10 |
| 18 | Tabela `Chunk` só é escrita; o texto se repete no payload do Qdrant | **Manter e documentar** | Lote D, só no README de documentos: a `Chunk` é a cópia de registro no SQLite, usada para reindexar o Qdrant (coleção perdida, troca de modelo de embedding) e como origem do id do ponto |
| 17 | Rotas sem consumidor | **Saem as 2 rotas de inspeção do Qdrant** (`GET /documents/qdrant-status` e `GET /documents/:id/qdrant`). `POST /documents/search` e `PATCH /documents/:id` **ficam**: são do RAG, que o dono vai repensar ("vamos repensar o RAG agora, as coisas mudaram muito") | Lote D remove as 2 rotas, os controllers e os wrappers sem consumidor em `my-app/lib/services/document.service.ts`. O guarda do #13 (lote A), que testava o filtro do `qdrant-status`, sai com a rota. O repensar do RAG é trabalho de planejamento fora deste nó |
| 16 | `ChatMessageService.getMessageById/updateMessage/deleteMessage` e `ChatInstanceService.getInstanceById` com policy e sem rota | **Manter, reservados** para a continuação do chat de mensagens ("ainda não terminamos a implementação") | Sem código. O achado fecha como decisão, não como defeito |
| 20 | `DELETE` no enum do contrato de proposta sem ferramenta que o emita | **Manter para o TEAMMATES** (o BRIEF usa o mesmo enum `CREATE/UPDATE/DELETE` em `TABLE_ROW`) | Lote D: só um comentário no `ChatDto` apontando o consumidor previsto |

## O que fecha o nó

Fecha com o lote D (R26, #17 parcial, #18 no README, #20 no comentário e os testes do #25) mergeado. #6, #11 e #16
fecham sem código. O #10 sai do nó e fica para depois do PR-0 do TEAMMATES. O repensar do RAG não é deste nó.
