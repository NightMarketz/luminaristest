# BE-INCR-CHAT-AGENT — agente de chat: permissão antes da proposta, busca no repositório e tokens por mensagem (BRIEF do I11)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Nó:** [`docs/plano/nos/I11.md`](../plano/nos/I11.md) ("Agente de chat: permissão e custo por mensagem").
> **Autorização:** dono, chat, 2026-10-15: *"Autorizo planejar o BRIEF do I11 — sessao-planejamento, sem código,
> sem 'executa'"*. **Sem "executa".** Cobre exatamente o nó I11: as lacunas que a nota e o plano de 07/09 listam
> (achados int. 21–24 em [`ONBOARDING-WIZARD-plano-grafo-brief.md`](ONBOARDING-WIZARD-plano-grafo-brief.md) §I11) e
> o fork F-I11-1.
> **Forks ratificados nesta sessão** (dono, chat, 2026-10-15, questionário): **F-I11-1 → (a)** *"Tokens na ChatMessage
> (Recomendado)"*; **F-I11-2 → (b)** *"Filtro no repositório"*.
> **Base:** `origin/main` `8ba1ed8f`.

## 0. Fatos consumados (lidos nesta sessão, no arquivo)

| # | Fato | Fonte |
|---|---|---|
| F1 | `request_record_creation` e `request_record_update` chamam só `getTableById` (que checa **`canView`**) e gravam a `ActionProposal`; **`canManageData` não é consultado** antes de gravar | `LuminarisAgentService.ts:141-179`; `DynamicTableService.ts:501-514` |
| F2 | `canManageData` recusa toda tabela `ui.presentation === 'system'` e toda tabela de outro dono; `canView` deixa o **ADMIN** ver tabela alheia → ADMIN e tabela `system` geram proposta que só falha na confirmação (`createTableData`/`updateTableData` checam a policy) | `DynamicTablePolicy.ts:13-15,40-44`; `DynamicTableService.ts:546-550,692-696` |
| F3 | `request_record_update` não confere que `recordId` pertence a `tableId`: o modal mostra a tabela X e `executeProposal` atualiza a linha `id` onde ela estiver (`updateTableData(user, id)` resolve a tabela pela linha) | `LuminarisAgentService.ts:163-179,201-204` |
| F4 | `getTools(userId)` ignora o parâmetro (a lista é estática); o chamador passa `user.id` | `LuminarisAgentService.ts:29`; `ChatService.ts:151` |
| F5 | `query_table_data` lê as 200 primeiras linhas (`getTableData(…,1,200)`), filtra em memória por `===` e devolve até 10; linha 201+ é invisível e o modelo não sabe que viu amostra | `LuminarisAgentService.ts:126-139`; `DynamicTableService.ts:619-625` |
| F6 | O repositório já filtra JSON em SQL com `json_extract` e parâmetro ligado (`countByFieldValue`, `countByCompositeFieldValues`, `findRowsByFieldValue`); **não há** busca por N campos que devolva linhas | `DynamicTableRepository.ts:233-345` |
| F7 | Duas classes implementam `IDynamicTableRepository`: `DynamicTableRepository` e `TransactionalDynamicTableRepository` | `DynamicTableRepository.ts:9`; `TransactionalDynamicTableRepository.ts:28` |
| F8 | `OpenAIService` descarta `completion.usage`: devolve só `choices[0]` (`getChatCompletion`, `getChatCompletionWithHistory`, `getChatCompletionWithToolsAndHistory`) | `OpenAIService.ts:145-240` |
| F9 | Turno do agente = no máx. **1 chamada `gpt-4o`** (com tools) **+ 1 `gpt-3.5-turbo`** (resposta final): o `while (iterations < 5)` nunca passa da 1ª volta (devolve ou dá `break`). O "até 11 chamadas `gpt-4o`" do plano de 07/09 envelheceu. Modo RAG = rewrite 3.5 (se `history.length > 1`) + embedding + resposta 3.5. Confirmação de proposta = 0 chamadas | `ChatService.ts:126-143,161-229,251-269` |
| F10 | `ChatMessage` não tem coluna de uso; a resposta do ASSISTANT só é gravada quando o request traz `chatInstanceId` (opcional no DTO; os dois widgets mandam) e por `appendAssistantMessage(chatInstanceId, content, user)` | `schema.prisma:170-180`; `ChatService.ts:72-93`; `ChatMessageService.ts:111-130`; `GenericChatWidget.tsx:55,122` |
| F11 | DTO de leitura da mensagem: `ChatMessageSchema` (id, content, role, chatInstanceId, createdAt, updatedAt) e `ChatMessageSummarySchema` | `chatMessages/dtos/ChatMessageDto.ts:31-42,94-101` |
| F12 | Factory monta `LuminarisAgentService(dynamicTableService, actionProposal repo)`; a policy está à mão em `this.policies.dynamicTable` | `lib/factory.ts:974-983` |
| F13 | Testes existentes: `ChatService.spec.ts` (RAG, agente, confirmação, persistência); **não há** suíte do `LuminarisAgentService` | `features/chat/services/__tests__/` |

## 1. Checklist (três PRs)

### PR-1 · permissão antes da proposta (sem migração, sem rota)

1. **`request_record_creation`**: depois de `getTableById`, se `!policy.canManageData(user, table)` → **não grava**
   proposta e devolve à ferramenta `{ error: 'SEM_PERMISSAO', message }` (o modelo explica ao usuário; F-I11-3).
   Cobre tabela `system` (F2), tabela alheia vista por ADMIN (F2).
2. **`request_record_update`**: a mesma checagem do item 1, **e** `recordId` tem de existir em `tableId` —
   `dynamicTableService.getTableDataByIds(user, tableId, [recordId])` vazio → `{ error: 'REGISTRO_NAO_ENCONTRADO' }`
   sem gravar (F3; o método já filtra por `dynamicTableId`, `DynamicTableService.ts:638-643`).
3. **Injeção da policy**: `LuminarisAgentService` recebe `IDynamicTablePolicy` por construtor; factory passa
   `this.policies.dynamicTable`. **Não** se adiciona método ao `DynamicTableService` para isso (regra STOP do
   `CLAUDE.md`: o motor não ganha superfície para integrar módulo).
4. **Parâmetro morto**: `getTools()` sem `userId`; `ChatService.ts:151` ajustado (F4; memória
   `param-aceito-e-ignorado-e-bug`).
5. **Suíte nova** `LuminarisAgentService.test.ts` (unit, repo de proposta falso + policy real `DynamicTablePolicy`):
   (a) tabela `system` → erro e `proposalRepository.create` **não chamado**; (b) ADMIN em tabela de outro dono → idem;
   (c) dono em tabela comum → `PROPOSED`; (d) update com `recordId` de outra tabela → `REGISTRO_NAO_ENCONTRADO`, sem
   gravar; (e) update válido → `PROPOSED` com `data.id = recordId`. **Falsificador:** remover a checagem do item 1
   faz (a) e (b) ficarem vermelhos.
6. `ChatService.spec.ts`: um caso em que a ferramenta devolve `{ error }` → o turno segue para a resposta em texto
   (não vira `ACTION_PROPOSAL`).

### PR-2 · busca no repositório (F-I11-2 b) — depois do PR-1 (mesmo arquivo do agente)

7. **Repositório**: `findDataByFieldEquals(tableId, filters, limit)` em `IDynamicTableRepository`,
   `DynamicTableRepository` e `TransactionalDynamicTableRepository` (F7) — `SELECT … FROM dynamic_table_data WHERE
   "dynamicTableId" = ? AND "deletedAt" IS NULL AND <igualdades> ORDER BY "createdAt" DESC LIMIT ?` + `COUNT(*)` com o
   mesmo `WHERE`. Igualdade **tipada** (contrato §2.2), caminho e valor sempre parâmetro ligado (`Prisma.sql`), como
   `countByFieldValue` (F6).
8. **Serviço**: `DynamicTableService.searchTableData(user, tableId, filters, limit)` — `getTableById` (canView);
   **toda chave de `filters` tem de ser campo do schema da tabela** (o nome vem do LLM, não do schema: não é
   confiável) → senão `ValidationError` listando os campos válidos; valor não escalar → `ValidationError`; `limit`
   preso em 1..50. É capacidade genérica de leitura do motor (mesma família de `getTableDataByIds`), não integração.
9. **Ferramenta `query_table_data`** passa a chamar `searchTableData(…, limit 10)`; sem `filters` = as 10 mais
   recentes com `total`. Saída da ferramenta muda para `{ rows, total, returned, truncated }` (contrato §2.3); some a
   constante `SAMPLE_LIMIT` e o comentário de ponytail. `ValidationError` do item 8 vira `{ error, message }` para o
   modelo (catch **só** de `ValidationError`, memória `erro-especifico-para-skip-em-job`). Descrição da ferramenta
   diz "igualdade exata; use os nomes de campo de get_table_schema".
10. **Teste de integração** (`dynamicTables/__tests__/…searchTableData.integration.test.ts`, banco real): 250 linhas,
    a procurada na posição 230 → encontrada (falsificador: com o código de hoje, F5, não é); string × número
    (`"1"` ≠ `1`); booleano (`true` casa com JSON `true`); `null` casa com campo ausente/nulo; linha soft-deleted fora;
    tabela de outro usuário → 403/404 como `getTableById`; chave fora do schema → `ValidationError`; `total` conta
    além do `limit`.
11. Repositórios falsos de teste que implementam `IDynamicTableRepository` ganham o método (o `tsc -p
    tsconfig.test.json` acusa os que faltarem).

### PR-3 · tokens por mensagem (F-I11-1 a) — independente dos PRs 1–2, salvo a linha de `ChatService.ts:151`

12. **Migração** (SQLite, só `ADD COLUMN` anulável — sem backfill): `ChatMessage.promptTokens Int?`,
    `completionTokens Int?`, `model String?` (+ `usageDetail` conforme F-I11-4). `NULL` = mensagem anterior ao I11
    ou de USER; **0** = turno do ASSISTANT sem chamada ao LLM (confirmação de proposta).
13. **`OpenAIService`** devolve o uso das três chamadas do chat sem mudar quem não mede: variante
    `…WithUsage` (ou parâmetro `onUsage?: (u: LlmUsage) => void`; escolha do implementador, contrato §2.4 fixo) que lê
    `completion.usage.prompt_tokens/completion_tokens` e `completion.model`. `usage` ausente na resposta → 0, com
    `logger.warn`. Chamadas coalescidas pelo `RequestLock` (`getChatCompletion`) contam **uma vez**, no turno que
    disparou a chamada (o outro recebe 0 daquela chamada — documentado no teste).
14. **`ChatService`** acumula o uso do turno (`TurnUsage`) em todos os caminhos que chamam o LLM: agente com e sem
    ferramenta, proposta (`ACTION_PROPOSAL`), RAG (rewrite + resposta). Embedding fica de fora (F-I11-5).
15. **Persistência**: `appendAssistantMessage(chatInstanceId, content, user, usage?)` grava as colunas no mesmo
    `create` (sem segunda escrita). Turno que falha na chamada ao LLM não grava mensagem → uso perdido (limite
    aceito, registrado). Request sem `chatInstanceId` não é medido (F10 — limite da opção (a) ratificada).
16. **Exposição**: `ChatMessageSchema` ganha `promptTokens`, `completionTokens`, `model` (`.nullable()`) e o mapeamento
    do repositório os carrega; `ChatMessageSummarySchema` **não** muda. `IChatMessage` (model de domínio) idem.
    Snapshot de shape dos DTOs atualizado **só** com o schema alterado (memória
    `dto-snapshot-update-reordena-no-windows`); `ChatMessageDto.gen.ts`/tipos do FE regenerados se o gerador os
    cobrir; anotação `@openapi` do schema atualizada e `public/openapi.json` regenerado (**0 path novo**: a guarda de
    path-count não muda).
17. **Testes**: `ChatService.spec.ts` — usage mockado de 2 chamadas (gpt-4o + 3.5) soma no `appendAssistantMessage`;
    confirmação grava 0/0; RAG soma rewrite + resposta; USER continua `null`. Integração do `ChatMessageService`:
    `GET` de mensagens devolve os três campos. **Falsificador:** sem o item 14, a soma do caso agente sai 0.

### Gates de todo PR

18. `cd server && npx tsc --noEmit` + `npx tsc -p tsconfig.test.json --noEmit`; `npm run check:arch` (server/) sem
    violação nova — atenção ao import de `IDynamicTablePolicy` em `features/chat` (PR-1) e de `LlmUsage` (PR-3);
    `npm run test:integration` (4 shards) para os PRs 2 e 3. Nenhum `eventType` de auditoria novo (allowlist do
    `auditCanonical.ts` intocada); nenhuma chave i18n nova (as mensagens de erro da ferramenta são para o modelo,
    em PT, como as de hoje em `LuminarisAgentService.ts:144,166`).
19. Fold no próprio PR (`docs/plano/README.md` §Fold): PR-1/PR-2 → `in_progress`; o último dos três → `done`.

## 2. Contratos (esboço materializável)

```ts
// §2.1 — PR-1: construtor e resultado de erro da ferramenta (sem DTO HTTP novo)
class LuminarisAgentService {
  constructor(
    dynamicTableService: DynamicTableService,
    proposalRepository: IActionProposalRepository,
    policy: IDynamicTablePolicy,            // novo (factory: this.policies.dynamicTable)
  );
  getTools(): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]>;   // sem userId
}
type AgentToolError = {
  error: 'SEM_PERMISSAO' | 'REGISTRO_NAO_ENCONTRADO' | 'FILTRO_INVALIDO' | 'DADOS_VAZIOS';
  message: string;                          // PT, para o modelo repassar ao usuário
};

// §2.2 — PR-2: repositório e serviço
type FieldEquals = { name: string; value: string | number | boolean | null };
interface IDynamicTableRepository {
  findDataByFieldEquals(
    tableId: string, filters: FieldEquals[], limit: number,
  ): Promise<{ rows: IDynamicTableData[]; total: number }>;
}
// SQL por tipo do valor (caminho `$.${name}` e valor como parâmetro):
//   string  → json_extract(data, ?) = ?            (TEXT)
//   number  → json_extract(data, ?) = ?            (INTEGER/REAL; "1" ≠ 1 por classe de armazenamento)
//   boolean → json_extract(data, ?) = ?  com 1/0   (json_extract devolve 1/0 para true/false)
//   null    → json_extract(data, ?) IS NULL        (ausente ou nulo)
class DynamicTableService {
  searchTableData(
    user: UserContext, tableId: string, filters: Record<string, unknown> | undefined, limit?: number, // 1..50, default 10
  ): Promise<{ rows: IDynamicTableData[]; total: number; limit: number }>;
  // ValidationError: chave fora de schema.fields[].name; valor objeto/array
}

// §2.3 — PR-2: saída da ferramenta query_table_data
type QueryTableDataResult = {
  rows: Array<{ id: string; data: Record<string, unknown>; createdAt: string }>;
  total: number;        // linhas que casam no banco inteiro
  returned: number;     // rows.length
  truncated: boolean;   // total > returned
} | AgentToolError;

// §2.4 — PR-3: uso
type LlmUsage = { model: string; promptTokens: number; completionTokens: number };
type TurnUsage = { promptTokens: number; completionTokens: number; model: string | null; calls: LlmUsage[] };
// ChatMessageSchema (+ .nullable()):
//   promptTokens: z.number().int().nonnegative().nullable(),
//   completionTokens: z.number().int().nonnegative().nullable(),
//   model: z.string().nullable(),
```

```prisma
// PR-3 — schema.prisma, model ChatMessage
promptTokens     Int?
completionTokens Int?
model            String?
// + usageDetail Json?  só se F-I11-4 → (b)
```

## 3. Forks

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-I11-1 · custo** | (a) tokens na `ChatMessage`; (b) tabela própria por chamada; (c) teto/dia; (d) nada | (a) | **RATIFICADO (a)** — dono, chat, 2026-10-15, questionário |
| **F-I11-2 · amostra de 200** | (a) sinalizar a amostra; (b) filtro no repositório; (c) fora do I11 | (a) | **RATIFICADO (b)** — dono, chat, 2026-10-15, questionário |
| **F-I11-3 · como a ferramenta recusa** | (a) devolve `AgentToolError` ao modelo, que explica em texto (HTTP 200, como o erro de "data vazio" de hoje, `LuminarisAgentService.ts:144`); (b) lança `ForbiddenError`/`ValidationError` e o `/api/chat` responde 4xx | **(a)** — mesmo padrão já usado pela ferramenta; o usuário recebe resposta no chat em vez de um erro de requisição; nenhum 4xx novo na rota | RATIFICAÇÃO PENDENTE (D2) |
| **F-I11-4 · forma da medida** | (a) só as 3 colunas da opção ratificada; turno com 2 modelos grava a soma e `model = "gpt-4o+gpt-3.5-turbo"`; (b) as 3 colunas **+** `usageDetail Json?` com `LlmUsage[]` por chamada | **(b)** — o propósito do F-I11-1 é decidir teto/custo, e o preço por token do `gpt-4o` e do `gpt-3.5` difere em ordem de grandeza: a soma sozinha não vira custo. Custo: 1 coluna JSON anulável | RATIFICAÇÃO PENDENTE (D2) |
| **F-I11-5 · embedding no RAG** | (a) fora (o `IEmbeddingService.embedText` devolve só o vetor; mudar a interface toca `documents/`); (b) dentro, mudando a interface | **(a)** — embedding é a menor parcela do turno RAG e a mudança sai do chat; fica registrado como limite | RATIFICAÇÃO PENDENTE (D2) |

## 4. Pendente de validação externa

Nenhum comportamento depende de regra contábil, fiscal ou legal.

## 5. Insumos ausentes

- Preço por token por modelo (para virar R$): fora do I11 — a opção ratificada só mede tokens.

## 6. Achados fora de escopo (registrados, não planejados)

- **Loop morto** em `ChatService.ts:161-229`: `while (iterations < 5)` nunca itera duas vezes (F9) — o agente não
  encadeia ferramentas (ex.: `list_my_tables` → `get_table_schema`). Corrigir muda comportamento e custo; é decisão
  própria.
- **`tool_call` sem resposta**: argumento que falha no `JSON.parse` dá `continue` sem empurrar a mensagem `tool`
  correspondente (`ChatService.ts:179-181`); a próxima chamada leva um `tool_call_id` sem resposta. **Não
  verificado** se a API rejeita.
- **Resposta final em `gpt-3.5-turbo` com histórico de `tool_calls` e sem `tools`** (`ChatService.ts:215`): não
  verificado contra a API.
- **`canView` dá ao ADMIN leitura de tabela de outro usuário** pelo agente (`list_my_tables` não, mas
  `get_table_schema`/`query_table_data` por id sim) — desenho da policy, não do I11.
- **FE não mostra tokens** — se o dono quiser, é `FE-INCR` vizinho.
- Outros consumidores de OpenAI (entrevista, extração, `classifyIntoEnum`) continuam sem medida.

## 7. Divisão e ordem

| PR | Itens | Toca | Ordem |
|---|---|---|---|
| PR-1 | 1–6 | `LuminarisAgentService.ts`, `ChatService.ts:151`, `factory.ts`, testes | primeiro |
| PR-2 | 7–11 | repositórios do DynamicTable, `DynamicTableService.ts` (1 método), agente, teste de integração | depois do PR-1 (mesmo arquivo do agente) |
| PR-3 | 12–17 | `schema.prisma` + migração, `OpenAIService.ts`, `ChatService.ts`, `chatMessages/*`, snapshot, openapi | paralelo aos PRs 1–2; rebase sobre o PR-1 por causa de `ChatService.ts:151` |

Execução exige "executa" do dono (ORCH-006); merge só com PR nomeado.
