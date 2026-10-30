# BE-INCR-RAG-DOCUMENTOS — RAG de documentos com sqlite-vec, busca como serviço, contexto gerado e embedding BYOK (BRIEF)

> Produzido por **sessão de planejamento** em 2026-10-30. Escopo: **backend**; as telas são nó vizinho (FE).
> **Forks F-RAG-1..10 ratificados** (30/10); cinco contra a recomendação (F-RAG-1, 2, 3, 5, 5b). O checklist já as
> materializa — não "conserte". **Forks F-RAG-B1..B6 deste BRIEF ratificados** no mesmo dia (§3); o F-RAG-B2 foi
> contra a recomendação. Executável com `executa` do dono.

## Contexto fixo

- **Item:** nó [`RAG-DOCUMENTOS`](../plano/nos/RAG-DOCUMENTOS.md), conforme
  [`PRE-ADR-RAG-DOCUMENTOS.md`](../adr/PRE-ADR-RAG-DOCUMENTOS.md) (Accepted 30/10; **a §2.1 manda** sobre TLDR, §3 e §4).
- **Autorização:** dono, chat, 2026-10-29: "Sim, vamos repensar o RAG agora, as coisas mudaram muito" (planejar) ·
  2026-10-30: "Forks do RAG antes" + questionário ([`D-2026-10-30-RAG-DOCUMENTOS-FORKS`](../plano/decisoes/D-2026-10-30-RAG-DOCUMENTOS-FORKS.md))
  · 2026-10-30: "BRIEF do RAG antes" (este documento) · 2026-10-30: "Sim, questionário" (F-RAG-B1..B6, §3). Nada
  disso autoriza código.
- **Insumos (lidos em `c8b7c835`):**
  - `prisma/schema.prisma` (`Document`, `Chunk`);
  - `features/documents/**`: `DocumentService`, `DocumentProcessingPipeline`, `VectorRepository`, `ChunkRepository`,
    `DocumentDto` (`UpdateDocumentSchema` e `SearchDocumentsSchema`) e `models/DocumentContext.ts`;
  - `lib/vector/{embedding,qdrant,qdrant-initializer,chunking}.ts`;
  - `lib/factory.ts:1012` (`EmbeddingService` com `OPENAI_API_KEY`);
  - `ChatService.ts:14-15,275,292` (`prisma` direto com exceção de lint e embedding da pergunta);
  - `UserService.ts:309` (`deleteVectorsByUserId`);
  - [`BE-INCR-TEAMMATES-brief.md`](BE-INCR-TEAMMATES-brief.md) (itens 5–9, 16, 19–23; `LlmCredential` e `LlmProvider` §2).
- **Nós vizinhos:**
  - Consome a `LlmCredential`/`LlmCredentialService` e a porta `LlmProvider` (TEAMMATES PR-1).
  - Consome a infraestrutura BullMQ, o padrão de porta de fila e a descoberta de `*Worker.ts` (TEAMMATES PR-4).
  - É consumido pelo chat (modo RAG e modo agente), pelos teammates (`search_documents`) e pelas telas de documentos (FE).
  - Divide arquivos com o TEAMMATES (`features/chat/**`, `lib/factory.ts`, `routes/index.ts`, `server/package.json`,
    teste de descoberta de workers). **PRs que tocam esses arquivos rodam em série com os do TEAMMATES.**

## Decisões que este BRIEF materializa (não rediscutir)

F-RAG-1 **`sqlite-vec`** · F-RAG-2 **serviço + ferramenta + rota** · F-RAG-3 **dois modos de chat** · F-RAG-4 **contexto
gerado + PATCH só de contexto** · F-RAG-5 **embedding pela `LlmCredential` do usuário** · F-RAG-5b **chave da instância de
reserva** · F-RAG-6 fila própria no mesmo Redis · F-RAG-7 em memória sem Redis · F-RAG-8 3 tentativas e alerta ·
F-RAG-9 contexto com a regra de chave do embedding · F-RAG-10 provedor de embedding escolhido pelo usuário ·
F-RAG-B1 coluna `generatedContext` · F-RAG-B2 **embedding e contexto contam** (com a reserva medida sem orçamento) ·
F-RAG-B3 coluna `User.embeddingProvider` · F-RAG-B4 falha de contexto não tira da busca · F-RAG-B5 modo RAG sem
resumo · F-RAG-B6 orçamento estourado para e avisa.

## 1. Checklist numerado (cada item testável sozinho)

### RAG-PR-A · índice `sqlite-vec` com a chave da instância e saída do Qdrant (depois do #977; não depende do TEAMMATES)

1. **Carga da extensão: primeiro item, e trava o resto do PR.** Mede os dois caminhos e registra a versão do
   `sqlite-vec` usada:
   - **(1)** O driver adapter better-sqlite3 do Prisma 6.16 com `loadExtension` na mesma conexão.
   - **(2)** Uma segunda conexão `better-sqlite3` só para vetor.

   Escolhe (1) se funcionar nas três plataformas: Windows (dev), Linux (CI) e a imagem do M2. Caso contrário, (2).
   **Gatilho:** se nenhum dos dois funcionar nas três, **pare e volte ao dono** com o erro. O caminho b do F-RAG-1 é a
   alternativa medida. **Prova:** `vecExtension.load.test.ts` cria uma `vec0` num banco temporário, insere e faz KNN.
   Roda no CI Linux; resultado no corpo do PR.
2. **Drift do Prisma.** Prova que `prisma migrate diff` entre um banco com a `vec0` (e as tabelas-sombra dela) e o
   `schema.prisma` sai vazio, e que `prisma migrate dev` não propõe `DROP`. **Gatilho:** se não sair limpo, pare e volte
   ao dono. **Prova:** teste de integração que roda o `diff` e assere saída vazia.
3. **Migração `Chunk`.** Acrescenta `embeddingModel String?`, `embeddingDims Int?` e `embeddedAt DateTime?`, com
   prólogo defensivo. O vetor **não** vai na `Chunk` (vai na `vec0`). **Prova:** aplica sobre banco com chunks antigos;
   rodar duas vezes não falha.
4. **`VecIndex` (`lib/vector/sqliteVec.ts`).** No boot, cria a `chunk_vec` de forma idempotente (DDL na §2.2) pela
   conexão que carrega a extensão. Usa coluna de partição `user_id` e de metadado `embedding_model` se a versão do
   item 1 suportar. Se não suportar, faz pós-filtro com k ampliado (×4) e registra a limitação. **Prova:** boot duas
   vezes sem erro; o KNN de um usuário não devolve linha de outro.
5. **Porta `EmbeddingProvider`** (`lib/embedding/`), no formato da §2.3. O adaptador OpenAI embrulha o `EmbeddingService`
   com `dimensions: 768`. **Prova:** devolve 768 posições; dimensão diferente da configurada → erro.
6. **`EmbeddingKeyResolver.resolve(userId)`** → `{ provider, apiKey, model, dims, source }`. Neste PR só existe
   `source = 'INSTANCE'` (`OPENAI_API_KEY`, F-RAG-5b); o PR-C acrescenta `USER`. Um resolvedor só para indexar e para a
   pergunta, então o carimbo sempre bate. **Prova:** retorna `INSTANCE`; sem `OPENAI_API_KEY`, erro tipado
   `EMBEDDING_SEM_CREDENCIAL`.
7. **`ChunkVectorRepository`** substitui `VectorRepository`/`IVectorRepository`, com `upsert`, `search`,
   `deleteByDocument` e `deleteByUser`. `search` filtra `user_id`, `documentIds` (quando houver) e o carimbo atual, e
   devolve top-k por distância. **Prova:** `rag-tenant-isolation.test.ts` adaptado; ordem por score; trecho com carimbo
   antigo não aparece.
8. **Pipeline.** `DocumentProcessingPipeline` grava o vetor pelo `ChunkVectorRepository` e o carimbo na `Chunk`; some o
   upsert no Qdrant. **Prova:** teste de integração real (não repo falso) com um documento de 3 trechos → 3 linhas na `vec0`.
9. **Exclusão.** O que muda depende do caminho do item 1:
   - **Caminho (1):** documento e usuário apagam vetores e SQL **na mesma transação, por código**.
   - **Caminho (2):** vetores **antes** do SQL, mais o `VecOrphanSweepScheduler` diário, que apaga linhas da `vec0` sem
     `Chunk`, com `alert` e caso no teste do F-OBS-14.

   `UserService` troca `deleteVectorsByUserId` pelo `ChunkVectorRepository.deleteByUser`. **Prova:** excluir usuário
   zera os vetores dele (LGPD art. 18 VI). No caminho (2), um vetor órfão plantado some na varredura.
10. **Reindexação (comando).** `npm run rag:reindex [--user <id>]` refaz o embedding, a partir de `Chunk.text`, de todo
    trecho sem carimbo ou com carimbo diferente do atual. Também é a migração de saída do Qdrant: os chunks atuais não
    têm vetor local. **Prova:** trocar o modelo → a busca não vê nada → reindexar → a busca volta.
11. **Medida.** Teste de desempenho com 20 mil trechos × 768, com teto de p95 de 300 ms por busca. O número medido vai ao
    dono (gatilho do PRE-ADR §6). **Prova:** o teste registra o tempo e falha acima do teto.
12. **Saída do Qdrant:**
    - remove `lib/vector/qdrant*.ts`, `@qdrant/js-client-rest`, o serviço e o volume do `docker-compose.yml`, `QDRANT_*`
      do `.env.example` e a chamada no bootstrap;
    - **emenda do runbook M2** (Qdrant sai, binário do `sqlite-vec` entra na imagem) é gate humano: o agente prepara, o
      dono assina;
    - fecha o item aberto do ADR-M2.

    **Prova:** `grep -ri qdrant server/src` vazio; boot sem `QDRANT_URL`.

### RAG-PR-B · busca como serviço, ferramenta e rota; PATCH de contexto (depois do RAG-PR-A)

13. **`DocumentSearchService.search(user, query, { documentIds?, limit })`.** Confere a posse pelo `DocumentRepository`
    com a policy, gera o embedding da pergunta pelo resolvedor e busca. Devolve hits e o carimbo usado. **Prova:**
    `documentIds` de outro usuário → `NotFoundError` (padrão cross-tenant), e o embedding **não** é chamado nesse caso.
14. **Rota `POST /documents/search` religada** (F-RAG-2 c): rota → controller → `DocumentSearchService`.
    `SearchDocumentsSchema` ganha `documentIds?` (máx. 50) e passa a `.strict()` (Contrato §3; hoje aceita chave
    extra em silêncio). Snapshot do DTO só com a chave nova; `routes/docs` e
    `openapi.json` atualizados. **Prova:** 200 com hits; isolamento entre usuários.
15. **Modo RAG do chat mantido** (F-RAG-3 a). O `ChatService` passa a chamar o `DocumentSearchService`. Saem o
    `prisma.document.findMany`, a exceção de lint e o embedding direto. Ficam `RAG_SYSTEM_PROMPT`, a reescrita da
    pergunta e o modelo. **Prova:** snapshot do `ChatResponseDto` igual; `sourceDocuments` igual com documentos
    selecionados; o baseline do `check:arch` perde a entrada do `ChatService` (só encolhe).
16. **Ferramenta `search_documents`** no `LuminarisAgentService`, só no modo agente (sem `documentIds`), com args da §2.4.
    Entra como `LIVRE` quando o `TOOL_CLASS` do TEAMMATES existir. **Prova:** modelo falso chama a ferramenta e recebe
    os trechos com `fileName` e índice.
17. **Resultado como dado não confiável.** Os trechos voltam ao modelo delimitados como dado, no formato do item 16 do
    TEAMMATES (um PDF de terceiro pode trazer "ignore as instruções"). **Prova:** trecho com instrução injetada não muda
    a lista de ferramentas nem vira `system`.
18. **`PATCH /documents/:id` estreitado** (F-RAG-4):
    - `UpdateDocumentContextSchema` `.strict()` aceita só `fileName`, `documentPurpose`, `summary` e os campos
      corrigíveis do contexto (§2.4, onde mora pelo F-RAG-B1);
    - `status`, `processingError`, `processingDate` e as estatísticas do `contextJson` saem do corpo;
    - todo campo corrigido entra em `userEditedFields`.

    **Prova:** corpo com `status` → 400; correção grava `userEditedFields`; o pipeline continua gravando status pelo
    repositório (teste existente).

### RAG-PR-C · embedding pela chave do usuário (depois do TEAMMATES PR-1)

19. **Adaptador Gemini** da `EmbeddingProvider` (`@google/genai`, que o TEAMMATES já traz), com
    `outputDimensionality: 768`. **Prova:** resposta gravada (fixture) → 768 posições.
20. **Escolha do provedor de embedding** (F-RAG-10), na coluna `User.embeddingProvider` (F-RAG-B3 a), e resolvedor com `source = 'USER'`.
    A ordem de resolução:
    1. o provedor escolhido, se o usuário tem `LlmCredential` não apagada dele;
    2. senão, a primeira `LlmCredential` OpenAI ou Gemini do usuário (por `createdAt`);
    3. senão, `INSTANCE` (F-RAG-5b).

    A chave é lida pelo `LlmCredentialService`, sem decifrar fora dele. **Prova:** 4 casos (escolhido, primeira,
    só Anthropic → instância, nenhuma → instância).
21. **Reindexação por usuário.** Disparada quando a resolução muda: credencial criada ou apagada, ou escolha alterada.
    O `LlmCredentialService` (teammates) **não** importa `documents`. A integração fica num serviço de nível de rota ou
    serviço de integração que chama `DocumentReindexService.scheduleForUser(userId)` (CLAUDE.md, integração
    cross-módulo fora do motor). Até o RAG-PR-D, roda em memória. **Prova:** cadastrar a primeira chave Gemini → os
    chunks do usuário passam a ter o carimbo Gemini; a busca devolve resultados.
22. **Uso e orçamento** (F-RAG-B2 a, F-RAG-B2b, F-RAG-B6):
    - toda chamada de IA do RAG grava uma linha em `DocumentAiUsage` (§2.1): embedding de indexação, embedding da
      pergunta (modo RAG, rota e ferramenta) e geração de contexto;
    - com `source = 'USER'`, a linha leva o `credentialId` e soma no orçamento mensal da credencial;
    - com `source = 'INSTANCE'`, a linha é gravada para o custo, mas não consome orçamento de ninguém (F-RAG-B2b);
    - antes de chamar o provedor com a chave do usuário, confere o orçamento. Se estourou, **não chama e não cai na
      reserva** (F-RAG-B6): o documento vai a `AWAITING_BUDGET` sem índice nem contexto, e a busca responde 409
      `RAG_ORCAMENTO_ESGOTADO`;
    - quando o mês vira ou o teto sobe, os documentos em `AWAITING_BUDGET` voltam para a fila (no RAG-PR-D; até lá,
      pelo comando do item 10).

    **Emenda no TEAMMATES (item 23):** o cálculo do orçamento mensal passa a somar `AgentTurn` **e**
    `DocumentAiUsage` da credencial. **Feita em 30/10** no BRIEF do TEAMMATES (`LlmBudgetService.usedThisMonth`, que este item usa).

    **Prova:**
    - uma linha por tipo de chamada;
    - linha `INSTANCE` fora da soma;
    - orçamento estourado → provedor não chamado, documento `AWAITING_BUDGET`, busca 409;
    - teto aumentado → documento volta a indexar.

### RAG-PR-D · fila de documentos e contexto gerado (depois do TEAMMATES PR-4 e PR-1)

23. **Upload em disco.** O upload grava os bytes no diretório do volume da instância (`DOCUMENTS_DIR`, nome =
    `documentId`) e enfileira `{ documentId }`. **Prova:** a resposta do upload não espera a extração; o arquivo existe
    até o fim do job.
24. **Porta `DocumentQueue`.** BullMQ `document-processing` com `jobId = documentId`; em memória sem `REDIS_URL`
    (F-RAG-7). Payload exatamente `{ documentId }` (`.strict()`). O worker decide entre processar e reindexar pelo estado
    do `Document` e dos carimbos, nunca pelo payload. **Prova:** enfileirar duas vezes = um job; chave extra recusada;
    sem `REDIS_URL` o upload funciona.
25. **`DocumentProcessingWorker`.** Extrai, grava `textContent`, faz chunk, embedding e índice, gera o contexto
    (item 26) e apaga o arquivo no fim. Tem 3 tentativas com backoff; na falha final, `FAILED` + `alert` (`job_failed`) e
    o arquivo é apagado (F-RAG-8). Entra no teste de descoberta de `jobs/*Worker.ts`. **Prova:** caso de falha alerta;
    com Redis, um restart no meio retoma.
26. **Contexto gerado** (F-RAG-4, F-RAG-9):
    - uma chamada `LlmProvider.complete` com a chave do usuário (qualquer provedor) ou a reserva da instância, pelo
      mesmo resolvedor generalizado;
    - o texto do documento entra delimitado como dado não confiável, sem ferramentas;
    - a saída é validada pelo `GeneratedContextSchema` e grava `summary` e `Document.generatedContext` (F-RAG-B1 a);
    - campos em `userEditedFields` nunca são sobrescritos;
    - falha da geração (erro do provedor ou saída fora do schema, depois das tentativas do job) **não** reprova o
      documento: ele fica `COMPLETED`, pesquisável, com o contexto vazio e o aviso em `processingError`, prefixado
      `CONTEXTO:` (F-RAG-B4 a);
    - entidades podem ter PII: nunca vão a log (ADR-OBSERVABILIDADE).

    **Prova:** saída fora do schema não grava contexto e o documento fica `COMPLETED` com o aviso; campo corrigido
    sobrevive ao reprocessamento; texto com instrução injetada não muda o schema da saída. O modo RAG **não** recebe o
    resumo (F-RAG-B5 b).
27. **Watchdog R18.** Não reprova documento cujo job está pendente ou ativo. **Prova:** documento em `PROCESSING` com job
    ativo continua `PROCESSING` depois do prazo.
28. **Reindexação na fila.** O comando do item 10 e o disparo do item 21 passam a enfileirar `{ documentId }` na mesma
    fila. **Prova:** trocar a escolha do provedor enfileira um job por documento do usuário.

### Gates de todo PR

`npx tsc --noEmit` (server) e `tsconfig.test.json` · `npm run check:arch` (baseline só encolhe) · `no-console` e
`catch` silencioso do ESLint · snapshot de DTO só com as chaves tocadas · guarda de path-count do OpenAPI · OBS-R11
para todo `*Scheduler.ts`/`*Worker.ts` novo · `npm run test:integration` para migração, `vec0` e fila · dependências
novas com versão fixada: `sqlite-vec` e, no caminho (1) ou (2), `better-sqlite3`/adapter do Prisma. O `@google/genai`
vem do TEAMMATES.

## 2. Contratos (esboço materializável)

### 2.1 Prisma

```prisma
model Chunk {
  id             String    @id @default(cuid())
  text           String
  index          Int
  documentId     String
  document       Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  embeddingModel String?   // carimbo: "openai:text-embedding-3-small@768" | "gemini:gemini-embedding-001@768"
  embeddingDims  Int?
  embeddedAt     DateTime?
  createdAt      DateTime  @default(now())
  @@index([documentId])
}

model Document {
  // … campos atuais; contextJson continua com as estatísticas do pipeline
  generatedContext Json?   // F-RAG-B1 a: GeneratedContextSchema
}

enum ProcessingStatus {
  PENDING
  PROCESSING
  COMPLETED
  ERROR
  FAILED
  AWAITING_BUDGET          // F-RAG-B6 a: orçamento da credencial do usuário estourado
}

model DocumentAiUsage {     // F-RAG-B2 a / B2b
  id               String   @id @default(cuid())
  userId           String
  documentId       String?  // null na pergunta (embedding da busca)
  kind             String   // 'EMBED_INDEX' | 'EMBED_QUERY' | 'CONTEXT'
  source           String   // 'USER' | 'INSTANCE'
  credentialId     String?  // só com source = 'USER'; soma no orçamento
  model            String
  promptTokens     Int
  completionTokens Int      @default(0)
  createdAt        DateTime @default(now())
  @@index([credentialId, createdAt])
  @@index([userId, createdAt])
} // trilha de custo, sem FK cascade a Document (o documento pode ser apagado e o custo fica); userId cai com o usuário

model User {
  // …
  embeddingProvider String? // F-RAG-B3 a: 'openai' | 'gemini' | null = automático
}
```

### 2.2 Tabela virtual (fora do Prisma, criada no boot — item 4)

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_vec USING vec0(
  chunk_id TEXT PRIMARY KEY,
  user_id TEXT PARTITION KEY,      -- se a versão do item 1 suportar; senão, coluna auxiliar + pós-filtro
  embedding_model TEXT,            -- metadado filtrável, idem
  embedding FLOAT[768] distance_metric=cosine
);
```

### 2.3 Portas

```ts
// lib/embedding/EmbeddingProvider.ts
export interface EmbeddingProvider {
  readonly id: 'openai' | 'gemini';
  embed(input: { apiKey: string; texts: string[] }): Promise<{ vectors: Float32Array[]; model: string; dims: 768 }>;
}
export type EmbeddingResolution = {
  provider: 'openai' | 'gemini'; apiKey: string; stamp: string; source: 'USER' | 'INSTANCE';
};
export interface EmbeddingKeyResolver { resolve(userId: string): Promise<EmbeddingResolution> } // erro: EMBEDDING_SEM_CREDENCIAL

// features/documents/repositories/IChunkVectorRepository.ts
export interface IChunkVectorRepository {
  upsert(rows: { chunkId: string; userId: string; stamp: string; vector: Float32Array }[]): Promise<void>;
  search(q: { userId: string; stamp: string; vector: Float32Array; documentIds?: string[]; limit: number }): Promise<{ chunkId: string; distance: number }[]>;
  deleteByDocument(documentId: string): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
}

// features/documents/jobs
export interface DocumentQueue { enqueue(documentId: string): Promise<void> }
export const DocumentJobSchema = z.object({ documentId: z.string() }).strict();
```

### 2.4 Zod

```ts
export const SearchDocumentsSchema = z.object({
  query: z.string().min(1, 'document.validation.queryRequired'),
  documentIds: z.array(z.string()).max(50).optional(),        // novo (item 14)
  limit: z.coerce.number().int().min(1).max(100).default(10),
}).strict();

export const SearchDocumentsToolArgsSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(10).default(5),
}).strict(); // modo agente: sem documentIds (o modo RAG é o caminho com seleção, F-RAG-3 a)

export type DocumentSearchHit = { documentId: string; fileName: string; chunkIndex: number; text: string; score: number };

export const GeneratedContextSchema = z.object({
  version: z.literal(1),
  documentType: z.string().min(1).max(60).nullable(),
  entities: z.array(z.object({
    type: z.enum(['PESSOA', 'EMPRESA', 'DATA', 'VALOR', 'IDENTIFICADOR', 'OUTRO']),
    value: z.string().min(1).max(200),
  })).max(50),
  userEditedFields: z.array(z.enum(['summary', 'documentType', 'entities'])).default([]),
}).strict();

export const UpdateDocumentContextSchema = z.object({
  fileName: z.string().min(1).max(255).optional(),
  documentPurpose: z.nativeEnum(DocumentPurpose).optional(),
  summary: z.string().max(4000).nullable().optional(),
  documentType: z.string().min(1).max(60).nullable().optional(),
  entities: GeneratedContextSchema.shape.entities.optional(),
}).strict(); // status, processingError, processingDate e contextJson fora: chave extra → 400
```

## 3. Forks deste BRIEF — ratificados (dono, chat, questionário, 2026-10-30)

| # | Pergunta | Resposta literal | Recomendada? | Efeito |
|---|---|---|---|---|
| F-RAG-B1 | Onde mora o contexto gerado? | "Coluna nova (Recomendado)" | Sim | `Document.generatedContext`; o `contextJson` fica só com as estatísticas do pipeline |
| F-RAG-B2 | O que entra no uso e no orçamento? | "Os dois contam" (a recomendada era só o contexto) | Não | Embedding e contexto gravam `DocumentAiUsage` e somam no orçamento da credencial. **Revisa o F-I11-5 a** para as chamadas do RAG; o chat segue como está |
| F-RAG-B2b | Embedding com a chave da instância entra na medida? | "Mede, sem orçamento (Recomendado)" | Sim | Linha `source = 'INSTANCE'`, sem `credentialId`, fora da soma |
| F-RAG-B3 | Onde mora a escolha do provedor de embedding? | "Coluna no usuário (Recomendado)" | Sim | `User.embeddingProvider` |
| F-RAG-B4 | Se a geração de contexto falhar | "Fica pesquisável e avisa (Recomendado)" | Sim | `COMPLETED` + aviso `CONTEXTO:` em `processingError` |
| F-RAG-B5 | Modo RAG recebe o resumo? | "Não por agora (Recomendado)" | Sim | Modo RAG intacto |
| F-RAG-B6 | Orçamento estourado | "Para e avisa (Recomendado)" | Sim | `AWAITING_BUDGET`, busca 409 `RAG_ORCAMENTO_ESGOTADO`, sem cair na reserva |

F-RAG-B2b e F-RAG-B6 nasceram da resposta do F-RAG-B2 e foram perguntados no mesmo turno.

## 4. Pendente de validação externa

- **LGPD (antes de dado real):**
  - o item 26 manda o texto inteiro a um modelo de conversa, que pode ser Claude, OpenAI ou Gemini;
  - os itens 5 e 19 mandam trechos ao embedding da OpenAI ou do Gemini;
  - vale a análise do PR #975, com as lacunas **L1** (termos e DPA de cada provedor) e **L2** (região da VPS) abertas.
- **Runbook M2:** a emenda de saída do Qdrant, binário do `sqlite-vec` e diretório `DOCUMENTS_DIR` no volume é gate
  humano.

## 5. Insumos ausentes

- Se o driver adapter do Prisma 6.16 aceita `loadExtension` (o item 1 mede).
- Se a versão do `sqlite-vec` tem `PARTITION KEY` e metadado filtrável no KNN (o item 4 decide entre isso e o pós-filtro).
- Se o `prisma migrate` ignora a `vec0` e as tabelas-sombra (o item 2 mede).
- `dimensions: 768` nos modelos `text-embedding-3` da OpenAI: conhecimento do agente; conferir na doc antes do item 5.
- Se a API de embedding do Gemini devolve contagem de tokens (o item 22 precisa dela). Se não devolver, **pare no
  item 19** e pergunte ao dono como contar; não estime em silêncio.
- Volume real de documentos por cliente: não há instância em produção.

## 6. Achados fora de escopo (registrados, não planejados)

- **FE** (nó vizinho):
  - tela de correção do contexto;
  - escolha do provedor de embedding na tela de credenciais;
  - aviso de "documento indexado com a chave da instância";
  - motivo do `FAILED` e do aviso de contexto na lista de documentos.
- **Seletor "Análise de dados × Base de conhecimento" do upload:** segue só como rótulo desde o R26.
- **README de documentos:** cita `reports` como consumidor; o grep do PRE-ADR não achou (inferido).
- **Emendas no BRIEF do TEAMMATES (feitas em 30/10, dono: "Sim, emendas"):**
  - **item 8:** a reserva lê `OPENAI_API_KEY` no caminho do teammate;
  - **item 23:** o orçamento mensal passa a somar `DocumentAiUsage`, além de `AgentTurn` (F-RAG-B2).
- **FE:** o novo estado `AWAITING_BUDGET` precisa de rótulo e aviso na lista de documentos (i18n pt/en).

## 7. Ordem e dependências

| PR | Itens | Depende de | Arquivos em comum com o TEAMMATES |
|---|---|---|---|
| RAG-PR-A | 1–12 | #977 (mergeado) | `lib/factory.ts`, `server/package.json`, `UserService.ts` |
| RAG-PR-B | 13–18 | RAG-PR-A | `features/chat/**`, `lib/factory.ts`, `routes/index.ts` |
| RAG-PR-C | 19–22 | RAG-PR-B, TEAMMATES PR-1; o item 22 também espera o item 23 do TEAMMATES (PR-4) emendado | `lib/factory.ts`, `schema.prisma` |
| RAG-PR-D | 23–28 | RAG-PR-C, TEAMMATES PR-4 | teste de descoberta de workers, `lib/factory.ts`, `server/package.json` |

O RAG-PR-A e o RAG-PR-B podem ir antes do TEAMMATES ou entre os PRs dele, mas nunca **ao mesmo tempo** que um PR do
TEAMMATES que toque os mesmos arquivos.
