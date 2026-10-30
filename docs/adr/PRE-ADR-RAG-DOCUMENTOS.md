# PRE-ADR-RAG-DOCUMENTOS — Repensar o RAG de documentos: índice, busca, embeddings e fila

- **Data:** 2026-10-29
- **Status:** **Accepted** (30/10/2026). F-RAG-1..10 respondidos pelo dono por questionário, cinco contra a recomendação (F-RAG-1, 2, 3, 5 e 5b). Respostas e consequências na §2.1 e na cédula [`D-2026-10-30-RAG-DOCUMENTOS-FORKS`](../plano/decisoes/D-2026-10-30-RAG-DOCUMENTOS-FORKS.md). Nenhum código autorizado sem BRIEF e "executa". **O TLDR, o §3 e o §4 abaixo descrevem as recomendações e ficam como registro; onde a §2.1 diverge, a §2.1 manda e o BRIEF reescreve o checklist.**
- **Autorização:** dono, chat, 29/10/2026, na confirmação do item #17 do FIX-CHAT-AGENTE: *"Sim, vamos repensar o RAG
  agora, as coisas mudaram muito"*. Na pergunta anterior, o dono tinha dito: *"Qdrant pode extinguir e as rotas de
  buscar documento são de RAG"*. As duas frases estão no campo `autorizacao` de
  [`D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO`](../plano/decisoes/D-2026-10-29-FIX-CHAT-AGENTE-FECHAMENTO.md) (PR #977), que
  registra: *"O repensar do RAG é trabalho de planejamento fora deste nó"*. A frase cobre **repensar**, ou seja,
  planejar. Não cobre código nem `executa`, e nenhum fork aqui se auto-ratifica.
- **Divergências registradas (passo 1 da `sessao-planejamento`):**
  1. **Não há nó.** O RAG não tem nota em `docs/plano/nos/`. Pelo `docs/plano/README.md` (*"Proposta nova … só vira
     nota em `nos/` depois de PRE-ADR ratificado"*), o artefato é este PRE-ADR. A nota nasce no fold da ratificação (§8).
  2. **A frase do dono não diz "planejar".** Li "repensar agora" como pedido de planejamento, como no
     [PRE-ADR-OBSERVABILIDADE](PRE-ADR-OBSERVABILIDADE.md) ("Planeja e mapeia"). Se o dono quis outra coisa, este
     documento não vale como autorização de nada.
  3. **A base ainda não está na `main`.** O texto descreve o código **depois do PR #977** (branch
     `claude/fix-chat-agente-lote-d`, ainda aberto), que tira a extração R26 e as 2 rotas de inspeção do Qdrant. A
     `origin/main` lida é `455c1a45`. Se o #977 mudar antes do merge, os `arquivo:linha` abaixo precisam ser
     conferidos de novo.
  4. **Os documentos do TEAMMATES também não estão na `main`.** O PRE-ADR, o BRIEF e a cédula estão no PR #969
     (branch `claude/teammates-planejamento`). Este documento os cita e **não os altera**. Onde um fork daqui exige
     emenda lá, isso está dito no fork.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Escopo:** backend (`server/`). As telas ficam em "Achados fora de escopo" (§7), pela convenção BE/FE da casa.

## TLDR

Hoje o RAG é um modo separado do chat: com documentos selecionados, o `ChatService` gera o embedding da pergunta com a
chave OpenAI da instância, busca 10 trechos no Qdrant e responde com um prompt "só o contexto". O Qdrant é um serviço a
mais em cada instância (container, volume, segredo e uma ordem de exclusão "Qdrant antes do SQL"). Com o M2 (uma
instância por cliente, poucos documentos) e o TEAMMATES (o agente é o centro, as ferramentas têm classe e a fila é
BullMQ), a recomendação deste PRE-ADR é:

1. O Qdrant sai, e o vetor passa para a tabela `Chunk` no SQLite, com busca por similaridade no próprio processo (F-RAG-1).
2. A busca vira serviço e ferramenta `search_documents`, de classe LIVRE, para o agente e os teammates. A rota
   `POST /documents/search` sai (F-RAG-2) e o modo RAG separado é absorvido pelo agente (F-RAG-3).
3. O `PATCH /documents/:id` sai (F-RAG-4).
4. O embedding fica com uma porta própria, e a chave é a da instância (a do cliente, pelo ADR-M2). Isso pede uma
   ressalva no item 8 do BRIEF do TEAMMATES (F-RAG-5). A reindexação lê a `Chunk`.
5. O processamento de documento vai para uma fila BullMQ própria (`document-processing`), no mesmo Redis e no mesmo
   padrão de porta da fila de turnos, depois do PR-4 do TEAMMATES (F-RAG-6..8).

**Risco principal:** a busca no processo lê os vetores do usuário a cada pergunta. Isso é barato para o volume de um
cliente do M2, mas não foi medido. O item 6 do checklist mede, e o §6 define quando reabrir a decisão.

## 1. Estado medido (código lido nesta sessão, branch do PR #977)

| Fato | Onde |
|---|---|
| O modo RAG é acionado quando o pedido traz `documentIds`. Sem eles, roda o agente ERP | `chat/services/ChatService.ts:184-187` |
| Modo RAG: confere a posse com `prisma.document.findMany` (dívida de camada marcada no próprio arquivo), reescreve a pergunta com o histórico, gera o embedding, busca 10 trechos e responde com `RAG_SYSTEM_PROMPT` | `ChatService.ts:14-15,271-316` |
| O agente tem 5 ferramentas fixas, nenhuma de documento | `chat/services/LuminarisAgentService.ts:42-120` |
| Embedding: `text-embedding-3-small`, 1536 dimensões, lotes de 100, chave `process.env.OPENAI_API_KEY` | `lib/vector/embedding.ts:58-59,113-135,159-168`; `lib/factory.ts:1012` |
| Pipeline: cria uma linha `Chunk` por trecho, gera os embeddings em lote e faz upsert no Qdrant de 10 em 10, com payload `{documentId, userId, index, textContent, chunkId, fileName}`. O id do ponto é `uuidv5(chunk.id)` | `documents/services/DocumentProcessingPipeline.ts:85-151` |
| O texto extraído é gravado em `Document.textContent` antes do pipeline. Só a extração precisa dos bytes do arquivo | `documents/services/DocumentService.ts:131-157` |
| Os bytes do arquivo ficam só na memória (`setImmediate`). Após restart, o documento vai a FAILED pelo watchdog R18 (decisão #6) | `DocumentService.ts:116-120`; README de documentos §Invariants |
| `Chunk { id, text, index, documentId, createdAt }` com `onDelete: Cascade` a partir do `Document`. O `Document` cai em cascata com o `User` | `prisma/schema.prisma:259-296` |
| Exclusão: apaga os pontos no Qdrant **antes**, depois apaga chunks e documento numa transação SQL | `DocumentService.ts:176-200` |
| Exclusão de usuário (LGPD art. 18 VI) chama `deleteVectorsByUserId` antes do SQL | `users/services/UserService.ts:309` |
| `POST /documents/search` → `DocumentService.searchDocuments` → `searchVectors` (todos os documentos do usuário) | `routes/documents.ts:36`; `DocumentService.ts:206-225` |
| **Nenhum consumidor** de `/documents/search` nem de `PATCH /documents/:id` no `my-app` (grep em `my-app/`, branch do #977) | `my-app/lib/services/document.service.ts:9-64` só tem list, get, upload, token-cost e delete |
| `UpdateDocumentSchema` aceita `status`, `contextJson`, `summary`, `processingDate` e `processingError`, todos campos do pipeline | `documents/dtos/DocumentDto.ts:24-…`; `DocumentService.ts:231-254` |
| Infra: o Qdrant é o 3º serviço do `docker-compose` (`qdrant/qdrant:latest`, volume `qdrant_data`, `QDRANT_API_KEY` obrigatória) | `docker-compose.yml:18-22,52,79-97` |
| ADR-M2: uma instância por cliente; `OPENAI_API_KEY` **é do cliente** (BYOK por env); "se o Qdrant vira serviço gerenciado" está aberto | `docs/adr/ADR-M2-deploy-topology.md:7-9,15,36-39,187` |

**Do TEAMMATES (PR #969, lido e não alterado):** porta `LlmProvider` só com `complete`, **sem embedding** (BRIEF §2.3);
item 8: *"teste que falha se o código ler `OPENAI_API_KEY` no caminho do teammate"*; item 16: conteúdo não confiável
entra delimitado como dado; item 19–20: fila `teammate-turns`, payload **exatamente** `{ turnId }`; item 22: sem Redis,
o app sobe e as rotas de teammates respondem 503; mapa `TOOL_CLASS` (item 4) com `LIVRE | PROPOSTA | PROIBIDA`.

**Provedores (documentação oficial lida em 29/10/2026):**
- Anthropic: *"Anthropic does not offer its own embedding model"* (platform.claude.com/docs/en/build-with-claude/embeddings). Verificado.
- OpenAI: `text-embedding-3-small` tem 1536 dimensões por padrão; há busca hospedada (`file_search` com vector stores na
  Responses API) (developers.openai.com/api/docs/guides/embeddings e …/tools-file-search). Verificado.
- Gemini: `gemini-embedding-001` e `gemini-embedding-2` com 3072 dimensões por padrão e 768/1536/3072 recomendadas; há
  ferramenta hospedada "File Search" (ai.google.dev/gemini-api/docs/embeddings e …/file-search). Verificado.

## 2. Forks (respondidos em 30/10; respostas na §2.1)

### F-RAG-1 — O Qdrant continua?

| Caminho | O que é | Custo |
|---|---|---|
| a | Mantém o Qdrant como está | Um serviço, um volume e um segredo por instância; a exclusão em dois armazenamentos ("Qdrant antes do SQL"); o item aberto no ADR-M2 continua aberto |
| **b** | **Vetor no SQLite:** coluna `embedding Bytes` (Float32) na `Chunk`; a busca carrega os vetores do usuário (filtrados por `documentIds` quando houver) e calcula o cosseno no processo, top-k | Sem dependência nova. A exclusão vira uma transação só, e a de usuário é cascata. Custo de leitura por pergunta cresce com o número de trechos (§6) |
| c | `sqlite-vec` (extensão nativa) | Prisma não expõe `loadExtension` (inferido, não verificado), então exigiria uma segunda conexão (`better-sqlite3`) só para vetor e binário nativo por plataforma |
| d | Busca do lado do provedor (OpenAI vector stores ou Gemini File Search) | A Anthropic não tem (verificado), então o RAG dependeria do provedor e quebraria o multi-provedor do F-TM-3. O documento inteiro fica guardado no provedor (mais exposição LGPD que mandar trechos). Trocar de provedor = reenviar tudo |

**Recomendação: b.** O M2 tem uma instância por cliente, e o volume de documentos de um salão ou clínica é pequeno.
O dono já descartou o Postgres (fica no SQLite), e o próprio dono disse "Qdrant pode extinguir". A `Chunk`, mantida
como cópia de registro (#18), passa a ser também o índice: some a ordem "Qdrant antes do SQL" e a exclusão LGPD vira
cascata. **Gatilho de reabertura** (§6): se a medida do item 6 passar do teto, a decisão volta ao dono com o número
(reabrir com c ou com um índice em memória por processo).

### F-RAG-2 — Onde fica a busca de documentos?

| Caminho | O que é |
|---|---|
| a | Rota `POST /documents/search` como está (sem consumidor hoje) |
| **b** | **Serviço `DocumentSearchService.search(user, query, { documentIds?, limit })` + ferramenta `search_documents` do agente, de classe `LIVRE` no `TOOL_CLASS`.** A rota sai |
| c | Serviço + ferramenta + rota (a rota para uma futura tela de busca) |

**Recomendação: b.** O consumidor previsto é o agente (chat e teammates). Rota sem tela é o mesmo achado #17 que o
dono acabou de limpar. Se uma tela de busca vier, a rota volta em 2 toques chamando o mesmo serviço. Ler documento do
próprio usuário é leitura, então `LIVRE` pela regra do F-TM-2 ("ler, resumir… sem aprovação").

### F-RAG-3 — O modo RAG separado do chat continua?

| Caminho | O que é |
|---|---|
| a | Mantém os dois modos: com `documentIds`, prompt "só o contexto" e sem ferramentas; sem eles, agente |
| **b** | **Um modo só, o agente.** Os `documentIds` selecionados na tela passam a restringir o escopo da ferramenta `search_documents` no turno, e uma linha de sistema pede para citar o documento. O `RAG_SYSTEM_PROMPT` e a reescrita da pergunta saem |
| c | Mantém os dois modos agora e funde depois do PR-3 do TEAMMATES |

**Recomendação: b.** Hoje, com documentos selecionados, o usuário perde o agente (não consegue "lê o contrato e cria o
registro"). O laço de ferramentas já existe e vai para os teammates. Um modo só tira o `prisma` direto do
`ChatService` (a checagem de posse vai para o serviço). **Custo:** o RAG passa a usar o modelo do agente (gpt-4o)
em vez do gpt-4o-mini, que é mais caro por pergunta e não foi medido. A resposta "não achei nos documentos" passa a
depender do prompt, não de um `if`.

### F-RAG-4 — O que fazer com o `PATCH /documents/:id`?

| Caminho | O que é |
|---|---|
| **a** | **Remove** rota, controller, `DocumentService.updateDocument` e `UpdateDocumentSchema` |
| b | Troca o corpo por campos do usuário (`fileName`, `documentPurpose`) |
| c | Mantém |

**Recomendação: a.** Não há consumidor. Pior: o corpo aceita `status` e `contextJson`, campos que só o pipeline
deveria escrever. Um cliente pode marcar `COMPLETED` um documento que não foi indexado. Se renomear documento virar
pedido, entra como rota nova e estreita (caminho b) com tela. O pipeline continua usando `DocumentRepository.update`,
que não muda.

### F-RAG-5 — Embeddings sob o multi-provedor BYOK do TEAMMATES

O conflito: a porta `LlmProvider` não tem embedding, a Anthropic não oferece embedding, e o item 8 do BRIEF do
TEAMMATES reprova ler `OPENAI_API_KEY` no caminho do teammate. A ferramenta `search_documents` gera o embedding da
pergunta, então ela cai nesse caminho.

| Caminho | O que é | Consequência |
|---|---|---|
| **a** | **Porta `EmbeddingProvider` própria (adaptadores OpenAI e Gemini), configurada por instância** (`EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_DIMS` e chave; padrão = a `OPENAI_API_KEY` da instância, que pelo ADR-M2 é do cliente) | Um modelo por índice, igual para chat e teammates. Exige **emenda no item 8 do TEAMMATES:** o teste vale para a porta `LlmProvider`, não para a `EmbeddingProvider` |
| b | Embedding pela `LlmCredential` do usuário (OpenAI ou Gemini) | Cada usuário pode ter um modelo, então o índice fica partido por usuário. Usuário só com chave Anthropic fica sem RAG. Documento enviado antes de cadastrar a chave fica sem índice |
| c | Modelo de embedding local na VPS (ex.: e5 multilíngue via ONNX) | Nenhum texto sai da instância (melhor para a LGPD). Em troca, entra uma dependência nativa de ~100 MB e CPU no upload. Qualidade em português não medida |
| d | Busca lexical (FTS5 do SQLite), sem embedding | Sem chave e sem envio. Perde a busca semântica. Não sei se o SQLite do Prisma tem FTS5 (insumo ausente) |

**Recomendação: a.** O embedding é configuração do índice, não do turno: se o modelo muda, o índice inteiro precisa
ser refeito, então ele não pode variar por teammate. A chave da instância já é do cliente (ADR-M2 (3)), então o
espírito do F-TM-6 ("nenhuma chave da plataforma") se mantém. Só o teste mecânico do item 8 precisa da ressalva. A
dimensão fica em 768 (o OpenAI aceita `dimensions` nos modelos `text-embedding-3`, o que é conhecimento do agente e
não foi conferido nesta sessão; o Gemini recomenda 768, verificado). Isso deixa trocar de provedor sem mudar a coluna
e reduz a leitura do F-RAG-1 b pela metade.

**Reindexação pela `Chunk`** (direto, sem fork): cada trecho guarda `embeddingModel` e `embeddingDims`. A busca só
considera trechos cujo carimbo é igual à configuração atual. Quando a configuração muda, um job por documento refaz
o embedding a partir de `Chunk.text`, sem precisar dos bytes nem do Qdrant. É também o caminho da migração de saída
do Qdrant: as linhas `Chunk` atuais não têm vetor e são reindexadas.

### F-RAG-6 — Mesma fila dos turnos ou fila própria?

A cédula do #10 diz *"Reusar a fila BullMQ + Redis do TEAMMATES"* e, no efeito, *"documento como job (`{ documentId }`,
bytes em disco) … depois do PR-0"*.

| Caminho | O que é | Consequência |
|---|---|---|
| a | A mesma fila `teammate-turns`, com tipo de job | Quebra a cerca do item 20 do TEAMMATES (payload **exatamente** `{ turnId }`) |
| **b** | **Fila própria `document-processing` no mesmo Redis, com o mesmo padrão** (porta `DocumentQueue` com implementação BullMQ e em memória, `jobId = documentId`, payload `{ documentId }` estrito, worker com alerta OBS-R11) | Um segundo worker no mesmo processo; a cerca do TEAMMATES fica intacta |

**Recomendação: b.** É a leitura de "reusar a fila" que não fura a cerca do TEAMMATES: reusa Redis, BullMQ, padrão de
porta e worker, sem misturar payload. Depende do **PR-4** do TEAMMATES (onde a fila nasce), não só do PR-0.

### F-RAG-7 — Sem Redis, o upload funciona?

| Caminho | O que é |
|---|---|
| **a** | **Sem `REDIS_URL`, a porta usa a implementação em memória** (a mesma dos testes) e roda o worker no processo, como hoje. Não muda nada para dev e CI sem Redis |
| b | Sem Redis, upload responde 503, como as rotas de teammates (item 22) |

**Recomendação: a.** Documentos existem antes dos teammates e não devem passar a exigir Redis. O corpo do worker é o
mesmo nos dois caminhos. O que se perde sem Redis é só a retomada após restart, que é o comportamento atual (#6).

### F-RAG-8 — Reprocessamento automático

| Caminho | O que é |
|---|---|
| **a** | **Job com 3 tentativas e backoff.** Na falha final, FAILED + `alert`, e o arquivo em disco é apagado. O watchdog R18 deixa de reprovar documento cujo job ainda está na fila ou rodando |
| b | Mantém a decisão #6 (FAILED e o usuário reenvia) mesmo com fila |

**Recomendação: a.** A cédula do #6 já diz que *"o reprocessamento automático chega com a fila do #10"*. Pergunto só
porque o dono pode preferir manter o reenvio manual.

## 2.1 Respostas do dono (30/10/2026) e consequências

Questionário no chat, 30/10. A primeira resposta do F-RAG-4 foi texto livre ("Vamos evoluir isso para um contexto
completo"), e a pergunta de esclarecimento fixou a leitura. F-RAG-5b, F-RAG-9 e F-RAG-10 nasceram das próprias
respostas e foram perguntados no mesmo turno.

| Fork | Resposta | Recomendada? |
|---|---|---|
| F-RAG-1 | c — `sqlite-vec` | Não (era b) |
| F-RAG-2 | c — serviço + ferramenta + rota | Não (era b) |
| F-RAG-3 | a — mantém os dois modos | Não (era b) |
| F-RAG-4 | contexto gerado pelo processamento + PATCH só com campos de contexto | Caminho novo (nem a, b nem c) |
| F-RAG-5 | b — `LlmCredential` do usuário | Não (era a) |
| F-RAG-5b | sem chave OpenAI/Gemini do usuário → chave da instância como reserva | Não (era ficar sem índice e avisar) |
| F-RAG-6 | b — fila própria, mesmo Redis | Sim |
| F-RAG-7 | a — sem Redis, fila em memória | Sim |
| F-RAG-8 | a — 3 tentativas e alerta | Sim |
| F-RAG-9 | contexto gerado com a mesma regra de chave do embedding | Sim |
| F-RAG-10 | provedor de embedding escolhido pelo usuário; trocar reindexa | Sim |

### Consequências que o BRIEF precisa carregar

**F-RAG-1 c (`sqlite-vec`).**
- O vetor vai numa tabela virtual `vec0` no mesmo arquivo SQLite. A `Chunk` continua como cópia de registro e ganha
  `embeddingModel` e `embeddingDims`. O vetor fica na `vec0`, ligado por `chunk.id`.
- **Carga da extensão (insumo ausente, primeiro item do BRIEF):** o Prisma 6.16 do repo não expõe `loadExtension`
  (inferido, não verificado). Há dois caminhos a medir antes de qualquer outro item:
  1. Driver adapter do Prisma para better-sqlite3, carregando a extensão na mesma conexão (não verificado).
  2. Uma segunda conexão `better-sqlite3` só para vetor.
- No caminho 2 há dois escritores no mesmo arquivo. Isso pede `busy_timeout` e teste de concorrência rodado no CI Linux, porque o Windows serializa o SQLite e o
  teste local verde não prova nada.
- **A exclusão deixa de ser uma transação só.** A `vec0` não tem FK nem cascata a partir de `Document`/`User`. Se a
  conexão for outra (caminho 2), apagar documento ou usuário exige ordem explícita: vetores antes do SQL, como era com
  o Qdrant. Também exige uma varredura de órfãos, com teste do caso LGPD art. 18 VI. No caminho 1 a exclusão volta a
  caber numa transação, mas por código, não por FK.
- **Migração:** `CREATE VIRTUAL TABLE … USING vec0` só roda com a extensão carregada. O `prisma migrate` não a carrega,
  então a tabela é criada no boot, de forma idempotente, pela conexão que carrega a extensão. O BRIEF precisa provar que
  o `prisma migrate dev` não tenta apagar a tabela virtual nem as tabelas-sombra dela (drift). Isso não foi verificado.
- **Binário nativo por plataforma:** Windows (dev), Linux (CI e VPS). A imagem do M2 precisa dele (emenda do runbook).
- **Dimensão:** a coluna da `vec0` tem dimensão fixa. Fica 768, com `dimensions` na OpenAI e `outputDimensionality` no
  Gemini. A busca filtra pelo carimbo do modelo. Se a versão do `sqlite-vec` não tiver coluna de metadado ou partição
  para filtrar dentro do KNN, o filtro vira pós-filtro com k ampliado (verificar a versão).
- **Gatilho de reabertura:** se a extensão não carregar nas três plataformas, ou se o drift do Prisma não tiver saída
  limpa, a decisão volta ao dono com o erro, e o caminho b do F-RAG-1 é a alternativa medida.

**F-RAG-2 c.**
- `POST /documents/search` fica, religada ao `DocumentSearchService`: rota → controller → serviço, sem `searchVectors`
  direto.
- Contrato e snapshot do DTO mudam só onde o serviço muda. A guarda de path-count do openapi não muda.

**F-RAG-3 a.**
- O modo RAG separado continua: com `documentIds`, usa `RAG_SYSTEM_PROMPT`, sem ferramentas, com `gpt-4o-mini`.
- A checagem de posse ainda sai do `ChatService` (o `prisma` direto) e vai para o `DocumentSearchService`. As
  respostas não mudam isso, que é direto.
- A ferramenta `search_documents` serve ao modo agente (sem `documentIds`) e aos teammates.

**F-RAG-4 (contexto gerado + correção).**
- Depois do chunking, o worker chama a IA uma vez por documento e grava `summary`, um tipo de documento e entidades
  em `contextJson`, com schema Zod próprio e versionado.
- O `PATCH /documents/:id` passa a aceitar só campos de contexto corrigíveis: `fileName`, `documentPurpose`, `summary`
  e o `contextJson` validado pelo schema. `status`, `processingError` e `processingDate` saem do corpo, o que fecha o
  buraco do "marcar COMPLETED".
- Correção do usuário não pode ser sobrescrita por reprocessamento. O BRIEF decide o mecanismo, por exemplo uma marca
  de campo corrigido. É detalhe de implementação, não fork.
- O modo RAG e a ferramenta podem devolver o resumo junto com os trechos. Isso fica como item do BRIEF, não como
  decisão.
- **Tela:** a correção do contexto precisa de tela (FE fora deste backend, §7).

**F-RAG-5 b + F-RAG-5b + F-RAG-10 (embedding pela chave do usuário).**
- O embedding usa a `LlmCredential` OpenAI ou Gemini do usuário. Quando há as duas, vale a escolhida pelo usuário
  (campo "provedor de embedding"). O padrão é a primeira chave cadastrada que sirva.
- Sem chave própria que sirva, usa a `OPENAI_API_KEY` da instância.
- Cada trecho guarda o carimbo (`embeddingModel`). A busca gera o embedding da pergunta com o provedor atual do usuário
  e só considera trechos com o mesmo carimbo. Trecho com outro carimbo fica invisível até a reindexação.
- Trocar de provedor, cadastrar a primeira chave própria ou apagar a chave dispara a reindexação dos documentos daquele
  usuário, como job na fila do F-RAG-6.
- **Dependência:** a `LlmCredential` e o `LlmCredentialService` nascem no **PR-1 do TEAMMATES**. A parte "chave do
  usuário" não sai antes dele.
- Até lá, ou se o RAG-PR-A vier antes, o índice usa só a reserva (chave da instância). Isso cabe na resposta do
  F-RAG-5b sem fork novo.
- **Emenda no TEAMMATES (item 8):** a reserva lê `OPENAI_API_KEY` no caminho do teammate. A ressalva do item 15 deste
  PRE-ADR continua necessária, e é feita pelo nó TEAMMATES.
- **Custo:** o embedding passa a sair da conta do usuário quando ele tem chave. Pelo F-RAG-B2 do BRIEF (dono, 30/10:
  "Os dois contam"), embedding e contexto entram na medida e no orçamento, o que revisa o F-I11-5 a só para o RAG.

**F-RAG-9.** O contexto gerado usa a `LlmCredential` do usuário, de qualquer provedor (Claude, OpenAI ou Gemini, pela
porta `LlmProvider`), com reserva na chave da instância. Depende do PR-1 do TEAMMATES pelo mesmo motivo do F-RAG-5.

**F-RAG-6..8:** como recomendado no §2.

### Ordem que sai das respostas (o BRIEF confirma)

| Bloco | Conteúdo | Depende de |
|---|---|---|
| RAG-PR-A | Medir a carga do `sqlite-vec` (os dois caminhos) e o drift do Prisma; índice `vec0` com a chave da instância; saída do Qdrant | #977 (mergeado) |
| RAG-PR-B | `DocumentSearchService` + `search_documents` + rota religada; PATCH estreitado para os campos de contexto | RAG-PR-A |
| RAG-PR-C | Embedding pela `LlmCredential` (F-RAG-5/5b/10) e adaptador Gemini; reindexação por usuário | TEAMMATES PR-1 |
| RAG-PR-D | Fila `document-processing` (F-RAG-6..8) + geração de contexto (F-RAG-4/9) no worker | TEAMMATES PR-4 (fila) e PR-1 (chave) |

**Arquivos em comum com o TEAMMATES:** `features/chat/**` (a ferramenta no `LuminarisAgentService`), `lib/factory.ts`,
`routes/index.ts` e `server/package.json`. Os PRs dos dois nós que tocam esses arquivos rodam em série, nunca em
paralelo.

## 3. Checklist (esqueleto do BRIEF; cada item testável sozinho)

Os itens marcados com F-RAG-n dependem da recomendação do fork. Se o dono escolher outro caminho, o item muda.

### RAG-PR-A · índice no SQLite (F-RAG-1 b, F-RAG-5 a) — depois do #977; não depende do TEAMMATES

1. Migração: `Chunk.embedding Bytes?`, `Chunk.embeddingModel String?`, `Chunk.embeddingDims Int?`, com prólogo
   defensivo. **Prova:** aplica sobre banco com chunks antigos; rodar duas vezes não falha.
2. Porta `EmbeddingProvider` (`embed(texts) → { vectors, model, dims }`) com adaptador OpenAI (o `EmbeddingService`
   atual embrulhado) e configuração por env da instância. O adaptador Gemini pode vir no RAG-PR-C. **Prova:** o adaptador
   devolve a dimensão configurada; dimensão errada → erro.
3. `ChunkVectorRepository` substitui o `VectorRepository`: grava o vetor na própria linha `Chunk` e busca por cosseno no
   processo, filtrando por `Document.userId` e, quando houver, `documentIds`, e só com o carimbo atual. **Prova:** o
   teste de isolamento entre tenants (`rag-tenant-isolation.test.ts`) adaptado; ordem por score; trecho com carimbo
   antigo não aparece.
4. Pipeline: o embedding é gravado na mesma linha da `Chunk`; sem armazenamento externo. Exclusão de documento = uma
   transação; `deleteVectorsByUserId` sai (a cascata `User → Document → Chunk` cobre o art. 18 VI). **Prova:** excluir
   usuário zera os chunks dele; teste de integração real.
5. Reindexação: comando (e depois job, no RAG-PR-D) que refaz o embedding a partir de `Chunk.text` para todo trecho com
   carimbo diferente do atual. **Prova:** trocar `EMBEDDING_MODEL` → a busca não vê nada → reindexar → a busca volta.
6. Medida: teste de desempenho com N trechos (proposta: 20 mil × 768) e teto de tempo por busca. O número medido vai ao
   dono (§6). **Prova:** o teste registra o tempo e falha acima do teto.
7. Saída do Qdrant: `lib/vector/qdrant*.ts`, a dependência `@qdrant/js-client-rest`, o serviço e o volume do
   `docker-compose`, `QDRANT_*` do `.env.example` e a chamada no bootstrap. **Emenda do runbook M2** (gate humano: o
   agente prepara, o dono assina). O item aberto do ADR-M2 fecha. **Prova:** grep sem `qdrant` no `server/src`; boot
   sem `QDRANT_URL`.

### RAG-PR-B · busca como serviço e ferramenta (F-RAG-2 b, F-RAG-3 b, F-RAG-4 a)

8. `DocumentSearchService.search(user, query, { documentIds?, limit })`: confere a posse pelo `DocumentRepository`, o
   que tira o `prisma` do `ChatService` e a exceção de lint dele; gera o embedding; busca. **Prova:** `documentIds` de outro
   usuário → 404 ou 403, conforme o padrão da policy; o embedding não é chamado nesse caso.
9. Ferramenta `search_documents` no `LuminarisAgentService` (`query`, `documentIds?`, `limit ≤ 10`). Quando o mapa
   `TOOL_CLASS` do TEAMMATES existir, ela entra como `LIVRE`. **Prova:** modelo falso chama a ferramenta e recebe os trechos.
10. O resultado da ferramenta volta ao modelo **delimitado como dado não confiável** (um PDF de terceiro pode ter
    "ignore as instruções"), no mesmo formato do item 16 do TEAMMATES. **Prova:** trecho com instrução injetada não muda
    a lista de ferramentas nem aparece como `system`.
11. Modo único (F-RAG-3 b): com `documentIds` no pedido, o agente roda com `search_documents` restrito a eles. Saem
    `RAG_SYSTEM_PROMPT` e `rewriteQueryWithHistory`. `sourceDocuments` da resposta vem das chamadas da ferramenta no turno.
    **Prova:** o contrato `ChatResponseDto` não muda (snapshot); teste com documentos selecionados devolve `sourceDocuments`.
12. Sai `POST /documents/search` (rota, controller, `routes/docs`, `openapi.json` com a guarda de contagem de paths, DTO
    de busca e snapshot só com a chave removida). **Prova:** 404 na rota; guarda de paths verde.
13. Sai `PATCH /documents/:id` (rota, controller, `updateDocument`, `UpdateDocumentSchema`, docs e openapi). **Prova:**
    404 na rota; o pipeline continua gravando status (teste existente).

### RAG-PR-C · embedding sob BYOK (F-RAG-5 a) — depois do PR-1 do TEAMMATES

14. Adaptador Gemini da `EmbeddingProvider` (`@google/genai`, dependência que o TEAMMATES já traz) com
    `outputDimensionality` = `EMBEDDING_DIMS`. **Prova:** resposta gravada (fixture) → vetor com a dimensão configurada.
15. Emenda proposta ao item 8 do BRIEF do TEAMMATES (feita pelo nó TEAMMATES, não aqui): o teste de "não ler
    `OPENAI_API_KEY`" cobre `lib/llm/**` e o runner, não `lib/embedding/**`. **Prova:** o teste do item 8 continua
    vermelho com uma leitura de prova no runner.

### RAG-PR-D · fila de documentos (F-RAG-6 b, F-RAG-7 a, F-RAG-8 a) — depois do PR-4 do TEAMMATES

16. Upload grava os bytes em disco (diretório do volume da instância, nome = `documentId`) e enfileira `{ documentId }`.
    **Prova:** a resposta do upload não espera a extração; o arquivo existe até o fim do job.
17. Porta `DocumentQueue` (BullMQ `document-processing`, `jobId = documentId`; em memória sem `REDIS_URL`) e payload
    Zod `.strict()`. **Prova:** enfileirar duas vezes = um job; payload com chave extra é recusado.
18. `DocumentProcessingWorker`: extrai, grava `textContent`, faz chunk, embedding e índice; apaga o arquivo no fim; 3
    tentativas; na falha final, FAILED + `alert` (`job_failed`). Entra no teste de descoberta de `jobs/*Worker.ts`.
    **Prova:** caso de falha alerta; restart no meio retoma (com Redis).
19. O watchdog R18 não reprova documento com job pendente ou ativo. **Prova:** documento em PROCESSING com job ativo
    continua PROCESSING após o prazo.
20. Reindexação (item 5) vira job na mesma fila (`{ documentId }` + carimbo atual, lido pelo worker, não pelo payload).

### Gates de todo PR

`tsc` limpo (server e my-app) · `check:arch` · snapshot dos DTOs só com as chaves tocadas · openapi com a guarda de
paths · `npm run test:integration` para migração e fila · OBS-R11 para o worker novo · dependência nova só a do
Gemini (já no TEAMMATES).

## 4. Contratos (esboço)

```prisma
model Chunk {
  id             String   @id @default(cuid())
  text           String
  index          Int
  documentId     String
  document       Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  embedding      Bytes?   // Float32Array little-endian, embeddingDims posições
  embeddingModel String?  // ex.: "openai:text-embedding-3-small"
  embeddingDims  Int?
  createdAt      DateTime @default(now())
  @@index([documentId])
}
```

```ts
// lib/embedding/EmbeddingProvider.ts (RAG-PR-A)
export interface EmbeddingProvider {
  readonly id: 'openai' | 'gemini';
  embed(texts: string[]): Promise<{ vectors: Float32Array[]; model: string; dims: number }>;
}

// features/documents/dtos (RAG-PR-B)
export const SearchDocumentsToolArgsSchema = z.object({
  query: z.string().min(1).max(2000),
  documentIds: z.array(z.string()).max(50).optional(),
  limit: z.number().int().min(1).max(10).default(5),
}).strict();
export type DocumentSearchHit = { documentId: string; fileName: string; chunkIndex: number; text: string; score: number };

// features/documents/jobs (RAG-PR-D)
export const DocumentJobSchema = z.object({ documentId: z.string() }).strict();
```

## 5. Pendente de validação externa

- **LGPD do envio de trechos ao provedor de embedding:** já acontece hoje (texto vai à OpenAI com a chave da
  instância). É a mesma análise do PR #975 (tenant = controlador, Luminaris = operador, provedor contratado pelo tenant;
  lacunas L1 e L2 abertas). Não fiz pesquisa legal nova. O F-RAG-5 c e d evitam o envio, se o dono quiser pesar isso.
- **Runbook M2 sem Qdrant e com Redis:** gate humano (o agente prepara a emenda, o dono executa e assina).

## 6. Insumos ausentes e gatilho de reabertura

- **Desempenho da busca no processo:** estimativa, não medida. 20 mil trechos × 768 dimensões ≈ 15 milhões de
  multiplicações (dezenas de ms em JS) e ≈ 60 MB lidos do SQLite por busca sem filtro de documento. O item 6 mede.
  **Gatilho proposto:** p95 acima de 300 ms ou mais de 20 mil trechos numa instância → volta ao dono com o número.
- `dimensions` nos modelos `text-embedding-3` da OpenAI: conhecimento do agente, conferir na doc antes do RAG-PR-C.
- Se o SQLite do Prisma tem FTS5: só importa se o dono escolher F-RAG-5 d.
- Volume real de documentos por cliente: não há instância em produção (o M2 não foi implantado).

## 7. Achados fora de escopo (registrados, não planejados)

- **FE:** a tela de chat com documentos (`DocumentSelector`, `DocumentChatWidget`) segue funcionando com o F-RAG-3 b,
  porque o contrato não muda. O seletor "Análise de dados × Base de conhecimento" do upload hoje é só rótulo (R26
  aposentado), e a tela de documentos não mostra o motivo do FAILED além do erro.
- O README de documentos diz que `reports` consome documentos, mas um grep em `features/reports` não achou uso
  (inferido; conferir antes de mexer no README).
- Resumo automático do documento (`summary`) nunca é preenchido pelo pipeline atual.
- Migrar a entrevista e a extração para a porta `LlmProvider` já está registrado no BRIEF do TEAMMATES §6.

## 8. Depois da ratificação

O fold cria a nota `docs/plano/nos/RAG-DOCUMENTOS.md` (`depende_de`: FIX-CHAT-AGENTE; RAG-PR-C depende de TEAMMATES
PR-1, e RAG-PR-D de TEAMMATES PR-4), a cédula com as respostas e a linha no `docs/adr/INDEX.md`. O §3 vira BRIEF
(`docs/accounting/BE-INCR-RAG-DOCUMENTOS-brief.md`) sem retrabalho. A emenda do item 8 do TEAMMATES (item 15) vai
para o nó TEAMMATES.
