# BE-INCR-RAG-DOCUMENTOS — RAG de documentos com sqlite-vec, busca como serviço, contexto gerado e embedding BYOK (BRIEF)

> Produzido por **sessão de planejamento** em 2026-10-30. Escopo: **backend**; as telas são nó vizinho (FE).
> **Forks F-RAG-1..10 ratificados** (30/10); cinco contra a recomendação (F-RAG-1, 2, 3, 5, 5b). O checklist já as
> materializa — não "conserte". **Forks F-RAG-B1..B5 deste BRIEF estão PENDENTES** (§3). Sem `executa`.

## Contexto fixo

- **Item:** nó [`RAG-DOCUMENTOS`](../plano/nos/RAG-DOCUMENTOS.md), conforme
  [`PRE-ADR-RAG-DOCUMENTOS.md`](../adr/PRE-ADR-RAG-DOCUMENTOS.md) (Accepted 30/10; **a §2.1 manda** sobre TLDR, §3 e §4).
- **Autorização:** dono, chat, 2026-10-29: "Sim, vamos repensar o RAG agora, as coisas mudaram muito" (planejar) ·
  2026-10-30: "Forks do RAG antes" + questionário ([`D-2026-10-30-RAG-DOCUMENTOS-FORKS`](../plano/decisoes/D-2026-10-30-RAG-DOCUMENTOS-FORKS.md))
  · 2026-10-30: "BRIEF do RAG antes" (este documento). Nada disso autoriza código.
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
F-RAG-9 contexto com a regra de chave do embedding · F-RAG-10 provedor de embedding escolhido pelo usuário.

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
20. **Escolha do provedor de embedding** (F-RAG-10), guardada onde o F-RAG-B3 decidir, e resolvedor com `source = 'USER'`.
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
22. **Uso e orçamento** conforme o F-RAG-B2. **Prova:** segue a resposta do fork.

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
    - a saída é validada pelo `GeneratedContextSchema` e grava `summary` e o contexto (onde o F-RAG-B1 decidir);
    - campos em `userEditedFields` nunca são sobrescritos;
    - falha da geração segue o F-RAG-B4;
    - entidades podem ter PII: nunca vão a log (ADR-OBSERVABILIDADE).

    **Prova:** saída fora do schema não grava nada; campo corrigido sobrevive ao reprocessamento; texto com instrução
    injetada não muda o schema da saída.
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
  generatedContext Json?   // F-RAG-B1 a (recomendado): GeneratedContextSchema
}

model User {
  // …
  embeddingProvider String? // F-RAG-B3 a (recomendado): 'openai' | 'gemini' | null = automático
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

## 3. Forks deste BRIEF — RATIFICAÇÃO PENDENTE

| # | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| F-RAG-B1 | Onde mora o contexto gerado? | **a** coluna nova `Document.generatedContext Json?` · b dentro do `contextJson`, sob a chave `ai` · c tabela `DocumentContext` 1:1 | **a.** O `contextJson` já guarda as estatísticas que o pipeline escreve (`DocumentContext.ts`); misturar faz o PATCH e o pipeline disputarem o mesmo JSON. A tabela 1:1 é cerimônia para um JSON só |
| F-RAG-B2 | Tokens de embedding e de contexto entram no uso e no orçamento? | a os dois contam em `LlmUsage` e no `monthlyTokenBudget` da credencial do usuário · **b** só o contexto gerado conta (é uma `complete`); o embedding segue fora, como no F-I11-5 a · c nenhum conta | **b.** O F-I11-5 a tirou o embedding da medida, e o embedding custa uma fração do contexto. O contexto é uma chamada de conversa por documento e precisa entrar no orçamento que protege a conta do usuário (TEAMMATES item 23). Isso **corrige** a frase da §2.1 do PRE-ADR que mandava medir o embedding |
| F-RAG-B3 | Onde mora a escolha do provedor de embedding (F-RAG-10)? | **a** coluna `User.embeddingProvider String?` · b tabela de preferências de IA 1:1 com o usuário · c campo na `LlmCredential` (`useForEmbedding`) | **a.** É um valor por usuário e não há outra preferência de IA em vista. O c espalha a escolha por linhas e permite duas marcadas |
| F-RAG-B4 | Se a geração de contexto falhar | **a** o documento fica `COMPLETED` com o contexto vazio e um aviso em `processingError`, porque a busca não depende do contexto · b conta como falha do job (3 tentativas, depois `FAILED`) | **a.** Indexação e busca são o valor principal. Reprovar o documento por um resumo que falhou tira o documento da busca. O usuário pode preencher o contexto pelo PATCH |
| F-RAG-B5 | O modo RAG (com documentos selecionados) devolve o resumo junto com os trechos? | a sim, o resumo de cada documento selecionado entra no contexto do prompt · **b** não por agora: o modo RAG fica como está (F-RAG-3 a) | **b.** O dono escolheu manter o modo RAG como está. Mudar o prompt dele é mudança de comportamento que a resposta não pediu |

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
- Volume real de documentos por cliente: não há instância em produção.

## 6. Achados fora de escopo (registrados, não planejados)

- **FE** (nó vizinho):
  - tela de correção do contexto;
  - escolha do provedor de embedding na tela de credenciais;
  - aviso de "documento indexado com a chave da instância";
  - motivo do `FAILED` e do aviso de contexto na lista de documentos.
- **Seletor "Análise de dados × Base de conhecimento" do upload:** segue só como rótulo desde o R26.
- **README de documentos:** cita `reports` como consumidor; o grep do PRE-ADR não achou (inferido).
- **Emenda do item 8 do BRIEF do TEAMMATES:** a reserva lê `OPENAI_API_KEY` no caminho do teammate. A emenda é do nó
  TEAMMATES, não deste.

## 7. Ordem e dependências

| PR | Itens | Depende de | Arquivos em comum com o TEAMMATES |
|---|---|---|---|
| RAG-PR-A | 1–12 | #977 (mergeado) | `lib/factory.ts`, `server/package.json`, `UserService.ts` |
| RAG-PR-B | 13–18 | RAG-PR-A | `features/chat/**`, `lib/factory.ts`, `routes/index.ts` |
| RAG-PR-C | 19–22 | RAG-PR-B, TEAMMATES PR-1 | `lib/factory.ts` |
| RAG-PR-D | 23–28 | RAG-PR-C, TEAMMATES PR-4 | teste de descoberta de workers, `lib/factory.ts`, `server/package.json` |

O RAG-PR-A e o RAG-PR-B podem ir antes do TEAMMATES ou entre os PRs dele, mas nunca **ao mesmo tempo** que um PR do
TEAMMATES que toque os mesmos arquivos.
