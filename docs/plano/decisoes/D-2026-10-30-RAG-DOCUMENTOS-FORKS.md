---
id: "D-2026-10-30-RAG-DOCUMENTOS-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "RAG de documentos repensado: F-RAG-1..10 respondidos por questionário (sqlite-vec no lugar do Qdrant, busca como serviço + ferramenta + rota, dois modos de chat mantidos, contexto do documento gerado e corrigível, embedding pela chave do usuário com a da instância de reserva, fila própria no Redis do TEAMMATES)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29: \"Sim, vamos repensar o RAG agora, as coisas mudaram muito\" (planejar; PRE-ADR no #978) · dono, chat, 2026-10-30: \"Forks do RAG antes\" (ratificar F-RAG-1..8 por questionário antes do executa do TEAMMATES) + respostas por AskUserQuestion no mesmo turno, incluindo F-RAG-5b, F-RAG-9 e F-RAG-10, abertos pelas próprias respostas"
atualizado: "2026-10-30"
---
# D-2026-10-30-RAG-DOCUMENTOS-FORKS

**Estado:** `decided` (F-RAG-1..10). Esta cédula **não** autoriza código: o nó [[RAG-DOCUMENTOS]] espera BRIEF e `executa`.

**Origem:** [PRE-ADR-RAG-DOCUMENTOS](../../adr/PRE-ADR-RAG-DOCUMENTOS.md) (PR #978, 29/10), aberto no fechamento do
[[FIX-CHAT-AGENTE]] ([[D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO]]). O §2 do PRE-ADR tem os caminhos completos.

## Forks respondidos (AskUserQuestion, recomendada como 1ª opção)

| # | Pergunta | Resposta literal | Efeito |
|---|---|---|---|
| F-RAG-1 | O Qdrant continua? | "Extensão sqlite-vec" (a recomendada era vetor em coluna da `Chunk` com cosseno no processo) | Qdrant sai; vetor numa tabela virtual `vec0` no mesmo arquivo SQLite. Consequências na §2.1 do PRE-ADR: carga da extensão nativa, migração fora do Prisma, exclusão fora da transação do Prisma |
| F-RAG-2 | Onde fica a busca? | "Serviço + ferramenta + rota" (a recomendada tirava a rota) | `DocumentSearchService` + ferramenta `search_documents` (`LIVRE`) + `POST /documents/search` mantida, religada ao serviço |
| F-RAG-3 | Modo RAG separado continua? | "Mantém os dois modos" (a recomendada fundia no agente) | Com `documentIds`, o chat segue no modo RAG (`RAG_SYSTEM_PROMPT`, sem ferramentas); sem eles, agente com `search_documents` |
| F-RAG-4 | `PATCH /documents/:id` | "Vamos evoluir isso para um contexto completo" → esclarecido como "Contexto gerado + correção" | O processamento gera resumo, tipo de documento e entidades; o PATCH passa a aceitar só os campos de contexto corrigíveis pelo usuário. `status` e erro saem do corpo |
| F-RAG-5 | De onde vem o embedding? | "Chave do usuário (LlmCredential)" (a recomendada era porta própria com a chave da instância) | Embedding pela `LlmCredential` OpenAI ou Gemini do usuário; o índice fica carimbado por modelo, por usuário. Depende do PR-1 do [[TEAMMATES]] |
| F-RAG-5b | Usuário sem chave OpenAI/Gemini | "Usa a chave da instância como reserva" (a recomendada era ficar sem índice e avisar) | Sem chave própria, usa a `OPENAI_API_KEY` da instância (do cliente, pelo ADR-M2). O índice do usuário pode ter dois carimbos até a reindexação |
| F-RAG-6 | Fila | "Fila própria, mesmo Redis (Recomendado)" | `document-processing`, payload `{ documentId }` estrito; cerca do item 20 do TEAMMATES intacta. Depende do PR-4 do TEAMMATES |
| F-RAG-7 | Sem Redis | "Funciona em memória (Recomendado)" | Sem `REDIS_URL`, fila em memória no processo, como hoje |
| F-RAG-8 | Reprocessamento | "3 tentativas e alerta (Recomendado)" | Na falha final: FAILED + `alert` + arquivo em disco apagado; watchdog R18 respeita job pendente |
| F-RAG-9 | Chave do contexto gerado | "Igual ao embedding (Recomendado)" | `LlmCredential` do usuário (qualquer provedor), reserva na chave da instância |
| F-RAG-10 | Usuário com OpenAI e Gemini | "Escolha explícita do usuário (Recomendado)" | Campo "provedor de embedding" do usuário; padrão = a primeira chave que sirva; trocar dispara a reindexação dos documentos dele |

## Efeitos fora do nó

- **TEAMMATES, item 8 do BRIEF:** a ferramenta `search_documents` roda no caminho do teammate e, pela reserva do
  F-RAG-5b, pode ler a `OPENAI_API_KEY` da instância. O teste do item 8 precisa da ressalva "cobre `lib/llm/**` e o
  runner, não o embedding". A emenda é feita pelo nó TEAMMATES, não por este. A chave da instância é do cliente
  (ADR-M2 (3)), então o F-TM-6 ("nenhuma chave da plataforma") não é violado.
- **Runbook M2:** sai o Qdrant (serviço, volume, `QDRANT_*`); entra o binário do `sqlite-vec` na imagem. Gate humano.
- **ADR-M2:** o item aberto "Qdrant gerenciado ou não" fecha (Qdrant sai).
- **LGPD:** hoje todos os trechos do documento já vão à OpenAI para o embedding. O F-RAG-4/F-RAG-9 manda também o
  texto a um modelo de conversa, que pode ser de outro provedor (Claude ou Gemini), com outros termos de uso de dados.
  Mesma análise do PR #975; as lacunas L1 e L2 valem antes de dado real.
