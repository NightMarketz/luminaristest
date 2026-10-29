# BE-INCR-TEAMMATES — teammates nativos: plataforma mínima, rotinas, canais e piloto de conciliação (BRIEF)

> Produzido por **sessão de planejamento** em 2026-10-29. Escopo: **backend**. A tela é nó vizinho (FE-INCR-TEAMMATES).
> **Não executável ainda:** F-TM-5..12 estão PENDENTES. O checklist abaixo foi escrito na recomendada de cada fork; o
> item que depende de um fork diz qual. Se a resposta for outra, o item muda antes do `executa`.

## Contexto fixo

- **Item:** nó [`TEAMMATES`](../plano/nos/TEAMMATES.md) — projeto nativo com as funções do OpenBot, conforme
  [`PRE-ADR-TEAMMATES.md`](../adr/PRE-ADR-TEAMMATES.md) (Proposed, 29/10).
- **Autorização:** dono, chat, 2026-10-29: "Autorizo planejar" — nó + PRE-ADR + BRIEF, só docs, sem código, sem
  `executa`. Forks F-TM-1..4 ratificados no mesmo dia (cédula [`D-2026-10-29-TEAMMATES-FORKS`](../plano/decisoes/D-2026-10-29-TEAMMATES-FORKS.md)).
- **Insumos (em disco):** PRE-ADR §2 (tabela de fatos verificados em `de43cb51`); `features/chat/services/ChatService.ts`,
  `LuminarisAgentService.ts`; `prisma/schema.prisma` (`ActionProposal`, `ChatMessage`); `lib/openai/OpenAIService.ts`,
  `lib/openai/llmUsage.ts`; `lib/secretBox.ts`; `jobs/PtaxRateScheduler.ts` (padrão de agendador com alerta);
  BRIEF do I11 (`BE-INCR-CHAT-AGENT-brief.md`); `ADR-OBSERVABILIDADE.md` (OBS-R11, F-OBS-14); `ADR-M2-deploy-topology.md`.
- **Nós vizinhos:** consome o laço de ferramentas e a `ActionProposal` do `chat` (pelo serviço), o `secretBox`, o
  `alertWebhook`, o `DynamicTableService` (ferramentas de tabela) e, no piloto, o `BankSettlementService`. Depende do
  nó [`FIX-CHAT-AGENTE`](../plano/nos/FIX-CHAT-AGENTE.md) fechado. É consumido pelo FE-INCR-TEAMMATES e pelos nós dos agentes 2..6 do §7.

## Decisões que este BRIEF materializa (não rediscutir)

F-TM-1 base + 1 piloto · F-TM-2 alçada por ação · F-TM-3 multi-provedor + BYOK ou chave da plataforma com teto +
reserva · F-TM-4 canais completos no v1 · decisões diretas D-1..D-5 do PRE-ADR §4 (módulo `features/teammates`,
classe da ação no código, playbook = dado, um turno por vez, custo medido em todo turno).

## 1. Checklist numerado (cada item testável sozinho)

### PR-0 · schema e contratos (SERIAL — nada dos corpos antes dele)

1. Migração Prisma com os modelos da §2.1 (`Teammate`, `LlmCredential`, `AgentTurn`, `TeammateRoutine`, `AgentChannel`,
   `AgentChannelMember`, `AgentChannelMessage`) e a emenda da `ActionProposal` (F-TM-8 a: `kind` default `TABLE_ROW`,
   `payload Json?`, `teammateId?`, `channelMessageId?`, `expiresAt?`). **Prova:** a migração aplica sobre um banco com
   propostas antigas e toda linha antiga lê como `kind = TABLE_ROW` (teste de integração).
2. Prólogo defensivo na migração (SQLite não é transacional: abort deixa metade aplicada). **Prova:** rodar a migração
   duas vezes não falha.
3. DTOs Zod `.strict()` da §2.2 em `features/teammates/dtos/`; snapshot `__dto-shapes__` atualizado **só com as chaves
   novas** (não regenerar o arquivo inteiro). **Prova:** `dtoShapeSnapshot` verde.
4. Enum `ActionClass = LIVRE | PROPOSTA | PROIBIDA` e o mapa `TOOL_CLASS` (ferramenta → classe) num arquivo só, com
   teste que reprova ferramenta registrada sem classe.

### PR-1 · porta de provedor e credencial (paralelo após PR-0)

5. Porta `LlmProvider` em `server/src/lib/llm/` com `complete({ messages, tools, model }) → { message, toolCalls, usage }`
   no formato único da §2.3. Adaptador OpenAI **embrulha** o `OpenAIService` existente (não o substitui — entrevista e
   extração continuam nele). **Prova:** teste do adaptador com cliente falso devolve `usage` igual ao `LlmUsage` atual.
6. Adaptadores Anthropic e Gemini por SDK oficial (F-TM-9 a). **Prova:** para cada um, um teste com resposta gravada
   (fixture) que tem chamada de ferramenta → `toolCalls` no formato único e `usage` com tokens > 0.
7. `LlmCredentialService`: grava a chave do provedor cifrada com `secretBox` (AAD = `LlmCredential.id`), em keyring
   próprio (`LLM_CREDENTIAL_KEYS`/`LLM_CREDENTIAL_KEY_ACTIVE`). Leitura nunca devolve a chave (DTO de saída só tem
   `provider`, `last4`, `createdAt`). Sem keyring → 503 fechado, como o pagamento. **Prova:** blob copiado para outra
   linha não decifra; GET não contém a chave.
8. Resolução de chave por turno: chave do tenant para o provedor do teammate → senão chave da plataforma (env) se o
   teto mensal não estourou (F-TM-6 a) → senão erro `LLM_SEM_CREDENCIAL`. **Prova:** 3 casos.
9. Reserva: em 429, 5xx ou `quota` do provedor primário, o turno tenta **uma vez** o provedor reserva do teammate; o
   turno grava qual respondeu. Erro 4xx de conteúdo (ex.: 400) **não** dispara reserva. **Prova:** 4 casos.

### PR-2 · teammate e alçada (paralelo após PR-0)

10. CRUD de `Teammate` pela cadeia Route → Controller → Service → Repository → Prisma + `TeammatePolicy` + Factory;
    soft-delete; escopo por `userId`. **Prova:** cross-tenant → 404 (padrão da casa).
11. Validação da alçada no service: `toolOverrides` só pode **apertar** classe (LIVRE → PROPOSTA); tentar marcar como
    LIVRE uma ferramenta de dinheiro, fiscal, razão ou envio externo → 400 `ALCADA_INVALIDA`. **Prova:** teste por
    categoria.
12. `allowedTools` só aceita nomes do registro `TOOL_CLASS`; ferramenta `PROIBIDA` nunca entra. **Prova:** 400 com
    nome desconhecido e com ferramenta proibida.
13. Eventos `llm_credential.created/deleted` e `teammate.alcada_changed` gravados na trilha encadeada
    (`features/accounting/audit/auditCanonical.ts`, a mesma que o `LegalParameterService` já usa fora da contabilidade),
    com a allowlist **no mesmo PR** e sem a chave nem o playbook no payload (segredo/texto livre). **Prova:** teste da
    allowlist e o teste de `MASKABLE_FREE_TEXT_KEYS`. **Insumo ausente:** conferir no `LegalParameterService` como um
    módulo de fora grava na trilha antes de copiar o padrão.

### PR-3 · runner de turno (depois de PR-1 e PR-2)

14. `TeammateRunner.runTurn(turnId)`: monta o prompt (papel + playbook + relógio do usuário + grafo de conhecimento
    existente), as ferramentas (`allowedTools` ∩ registro) e a memória (últimas N mensagens da thread do canal, ou da
    rotina). **Prova:** teste com provedor falso confere as mensagens enviadas.
15. Antes de executar cada chamada de ferramenta, o runner consulta a classe efetiva (registro + override):
    `LIVRE` executa; `PROPOSTA` grava `ActionProposal` (com `teammateId`, `expiresAt`) e encerra o turno;
    `PROIBIDA` ou fora da lista devolve erro ao modelo (padrão `agentToolError`) e **não** executa. **Prova:** 3 casos,
    e um teste que finge o modelo pedindo ferramenta fora da lista.
16. Nenhuma transação aberta durante a chamada ao provedor (D-4): leitura → LLM fora de tx → gravação em tx curta.
    **Prova:** teste que espiona `runTransaction` e falha se o `complete` for chamado dentro dela.
17. O turno grava provedor, modelo, tokens (via `LlmUsage`) e duração no `AgentTurn`. **Prova:** campos preenchidos.
18. Limite de voltas do laço de ferramentas por turno (mesmo teto do chat, 5). **Prova:** modelo falso que sempre pede
    ferramenta → turno termina `DONE` com aviso, sem 6ª chamada.

### PR-4 · fila e agendador (depois de PR-3)

19. Reivindicação atômica (F-TM-5 a): `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'RUNNING', claimedAt } })`
    e só segue se `count === 1`. **Prova:** duas reivindicações do mesmo turno → só uma roda.
20. `TeammateTurnScheduler` em `jobs/` no padrão da casa (`alert` injetado, `job_failed`, timer que não morre), um turno
    por tick (D-4). Entra na tabela do teste de OBS-R11. **Prova:** o teste de descoberta de scheduler passa e o caso
    de falha alerta.
21. Vigia de turno preso: `RUNNING` há mais de X minutos volta a `PENDING` com `attempts+1`; na 3ª vez vira `FAILED` e
    alerta. **Prova:** teste com relógio fixo.
22. Limites (F-TM-10 a): turnos/dia por teammate, teto mensal de tokens da instância (chave da plataforma) e saltos por
    thread. Estourou → teammate (ou thread) vai para `PAUSED`, nada mais roda, e uma proposta `kind = LIMITE_ATINGIDO`
    aparece na caixa do dono. **Prova:** um teste por limite.

### PR-5 · rotinas (depois de PR-4)

23. CRUD de `TeammateRoutine` (agenda: diária/semanal/mensal num horário, no fuso do usuário; F-TM-11 a). **Prova:**
    agenda inválida → 400.
24. `TeammateRoutineScheduler` enfileira um `AgentTurn` quando a rotina vence, com chave de idempotência
    `routineId + slot` única (dois ticks no mesmo slot → um turno). **Prova:** teste de idempotência; alerta OBS-R11.
25. "Rodar agora" (`POST /teammates/routines/:id/run`) enfileira um turno manual fora do slot. **Prova:** 202 + turno
    `PENDING`.

### PR-6 · canais (depois de PR-4; pode ser cortado sem desfazer o resto)

26. CRUD de `AgentChannel` e membros (dono + teammates do mesmo tenant). **Prova:** teammate de outro tenant → 404.
27. Postar mensagem no canal; cada `@teammate` mencionado gera um `AgentTurn` com `hop = 0`. **Prova:** 2 menções → 2
    turnos.
28. A resposta de um teammate que menciona outro gera turno com `hop + 1`; ao passar do teto de saltos a thread vai a
    `PAUSED` (item 22). Teammate não menciona a si mesmo. **Prova:** laço A→B→A para no teto.
29. Mensagem de canal nunca executa ação: o que for `PROPOSTA` vira proposta ligada a `channelMessageId`. **Prova:**
    teste ponta a ponta com provedor falso.

### PR-7 · caixa única de propostas (depois de PR-3)

30. `GET /proposals?status=PENDING` lista propostas do chat e dos teammates juntas, com `kind`, teammate e expiração.
    **Prova:** as duas origens aparecem.
31. Confirmar despacha pelo `kind` para o **serviço dono** (`TABLE_ROW` → `DynamicTableService`, como hoje;
    `SETTLEMENT_MATCH` → serviço da conciliação). Rejeitar grava `REJECTED`. Confirmação de proposta expirada → 409.
    **Prova:** um teste por `kind` + o 409.
32. Agendador de expiração marca `EXPIRED` o que passou de `expiresAt` (fecha o "propostas sem TTL" do FIX-CHAT-AGENTE,
    se ainda aberto). **Prova:** relógio fixo; alerta OBS-R11.

### PR-8 · piloto Conciliação (F-TM-7 a; depois de PR-3 e PR-7)

33. Ferramentas `LIVRE` de leitura: linhas de extrato não conciliadas, títulos abertos, recebíveis do adquirente, no
    escopo contábil do usuário. **Insumo ausente:** os métodos do serviço dono a usar (PRE-ADR §8) — ler antes deste PR.
34. Ferramenta `propor_conciliacao` (`PROPOSTA`) grava `kind = SETTLEMENT_MATCH` com o payload da §2.2; **nunca** chama
    `postEntry`. **Prova:** teste que espiona o `PostingService` e falha se for chamado no turno.
35. Teammate "Conciliação" semeado como modelo (playbook + ferramentas), instalável pelo dono. **Prova:** instalar duas
    vezes não duplica.

### Gates de todo PR

`npx tsc --noEmit` (server) e `tsconfig.test.json` · `npm run check:arch` · `no-console` e `catch` silencioso do ESLint ·
snapshot de DTO só com chave nova · guarda de path-count do OpenAPI (rotas novas em `routes/docs/*.paths.ts` e
`public/openapi.json`) · allowlist do `auditCanonical.ts` · teste de OBS-R11 para todo `*Scheduler.ts` novo ·
`npm run test:integration` para migração e reivindicação.

## 2. Contratos (esboço materializável)

### 2.1 Prisma (PR-0)

```prisma
model Teammate {
  id               String   @id @default(cuid())
  userId           String
  name             String
  role             String              // papel em uma linha ("Conciliação bancária")
  playbook         String              // instruções em texto (D-3)
  allowedTools     Json                // string[] ⊂ TOOL_CLASS
  toolOverrides    Json?               // { [tool]: 'PROPOSTA' } — só aperta (item 11)
  provider         String              // 'anthropic' | 'openai' | 'gemini'
  model            String
  fallbackProvider String?
  fallbackModel    String?
  dailyTurnLimit   Int      @default(50)
  status           String   @default("ACTIVE") // ACTIVE | PAUSED
  deletedAt        DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([userId])
}

model LlmCredential {
  id         String   @id @default(cuid())
  userId     String
  provider   String
  secret     Bytes    // secretBox: iv ‖ tag ‖ ct, AAD = id
  keyVersion Int
  last4      String
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  @@unique([userId, provider, deletedAt]) // conferir o padrão de unique × soft-delete da casa antes do PR-0
}

model AgentTurn {
  id               String   @id @default(cuid())
  userId           String
  teammateId       String
  trigger          String   // ROUTINE | MANUAL | MENTION
  routineId        String?
  idempotencyKey   String?  @unique // routineId + slot
  channelMessageId String?
  hop              Int      @default(0)
  status           String   @default("PENDING") // PENDING | RUNNING | DONE | FAILED | PAUSED
  attempts         Int      @default(0)
  claimedAt        DateTime?
  provider         String?
  model            String?
  promptTokens     Int?
  completionTokens Int?
  error            String?
  createdAt        DateTime @default(now())
  finishedAt       DateTime?
  @@index([status, createdAt])
  @@index([teammateId, createdAt])
}

model TeammateRoutine {
  id         String   @id @default(cuid())
  userId     String
  teammateId String
  prompt     String
  schedule   Json     // { freq: 'DAILY'|'WEEKLY'|'MONTHLY', time: 'HH:mm', weekday?, monthday? }
  active     Boolean  @default(true)
  deletedAt  DateTime?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model AgentChannel        { id String @id @default(cuid()); userId String; name String; deletedAt DateTime?; createdAt DateTime @default(now()) }
model AgentChannelMember  { channelId String; teammateId String; @@id([channelId, teammateId]) }
model AgentChannelMessage {
  id         String   @id @default(cuid())
  channelId  String
  threadId   String?            // null = raiz
  authorType String             // OWNER | TEAMMATE
  authorId   String
  content    String
  hop        Int      @default(0)
  createdAt  DateTime @default(now())
  @@index([channelId, createdAt])
}

// emenda (F-TM-8 a)
model ActionProposal {
  // ...campos atuais...
  kind             String    @default("TABLE_ROW") // TABLE_ROW | SETTLEMENT_MATCH | LIMITE_ATINGIDO
  payload          Json?
  teammateId       String?
  channelMessageId String?
  expiresAt        DateTime?
}
```

### 2.2 Zod (PR-0)

```ts
export const ActionClassSchema = z.enum(['LIVRE', 'PROPOSTA', 'PROIBIDA']);
export const LlmProviderIdSchema = z.enum(['anthropic', 'openai', 'gemini']);

export const TeammateCreateSchema = z.object({
  name: z.string().min(1).max(80),
  role: z.string().min(1).max(160),
  playbook: z.string().min(1).max(8000),
  allowedTools: z.array(z.string()).min(1),
  toolOverrides: z.record(z.string(), z.literal('PROPOSTA')).optional(),
  provider: LlmProviderIdSchema,
  model: z.string().min(1),
  fallbackProvider: LlmProviderIdSchema.optional(),
  fallbackModel: z.string().min(1).optional(),
  dailyTurnLimit: z.number().int().min(1).max(1000).optional(),
}).strict();

export const LlmCredentialCreateSchema = z.object({
  provider: LlmProviderIdSchema,
  apiKey: z.string().min(10),
}).strict();
export const LlmCredentialReadSchema = z.object({
  id: z.string(), provider: LlmProviderIdSchema, last4: z.string(), createdAt: z.string(),
}).strict(); // nunca a chave

export const RoutineScheduleSchema = z.discriminatedUnion('freq', [
  z.object({ freq: z.literal('DAILY'), time: z.string().regex(/^\d{2}:\d{2}$/) }).strict(),
  z.object({ freq: z.literal('WEEKLY'), time: z.string().regex(/^\d{2}:\d{2}$/), weekday: z.number().int().min(0).max(6) }).strict(),
  z.object({ freq: z.literal('MONTHLY'), time: z.string().regex(/^\d{2}:\d{2}$/), monthday: z.number().int().min(1).max(28) }).strict(),
]);

export const ChannelPostSchema = z.object({
  content: z.string().min(1).max(8000),
  threadId: z.string().optional(),
}).strict(); // menções são extraídas do content no service, contra os membros do canal

export const ProposalPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('TABLE_ROW'), action: z.enum(['CREATE', 'UPDATE', 'DELETE']), tableId: z.string(), data: z.record(z.string(), z.unknown()) }).strict(),
  z.object({ kind: z.literal('SETTLEMENT_MATCH'), statementLineId: z.string(), targetType: z.enum(['RECEIVABLE', 'PAYABLE', 'ACQUIRER']), targetId: z.string(), amountCents: z.string().regex(/^\d+$/), rationale: z.string().max(2000) }).strict(),
  z.object({ kind: z.literal('LIMITE_ATINGIDO'), limit: z.enum(['DAILY_TURNS', 'MONTHLY_TOKENS', 'HOPS']), teammateId: z.string().optional(), threadId: z.string().optional() }).strict(),
]);
```

`amountCents` como string de dígitos porque as colunas `*Cents` da casa são BigInt (memória `max-cents-e-politica`).
A forma exata do alvo do `SETTLEMENT_MATCH` depende do insumo ausente do item 33.

### 2.3 Porta de provedor (PR-1)

```ts
export type LlmMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; toolCallId: string; content: string };
export type LlmToolCall = { id: string; name: string; arguments: Record<string, unknown> };
export type LlmToolDef = { name: string; description: string; parameters: Record<string, unknown> }; // JSON Schema
export interface LlmProvider {
  readonly id: 'anthropic' | 'openai' | 'gemini';
  complete(input: { model: string; messages: LlmMessage[]; tools?: LlmToolDef[]; maxTokens: number }):
    Promise<{ message: Extract<LlmMessage, { role: 'assistant' }>; usage: LlmUsage }>;
}
export class LlmProviderError extends Error {
  constructor(readonly kind: 'RATE_LIMIT' | 'SERVER' | 'QUOTA' | 'AUTH' | 'BAD_REQUEST', message: string) { super(message); }
} // RATE_LIMIT | SERVER | QUOTA disparam a reserva (item 9)
```

### 2.4 Rotas (2 toques cada: rota + `routes/docs`)

`/teammates` (CRUD) · `/teammates/credentials` (POST, GET, DELETE) · `/teammates/routines` (CRUD + `POST /:id/run`) ·
`/teammates/channels` (CRUD, `POST /:id/members`, `POST /:id/messages`, `GET /:id/messages`) · `/teammates/turns`
(GET, leitura) · `/proposals` (GET, `POST /:id/confirm`, `POST /:id/reject`).

## 3. Forks

| Fork | Estado | Recomendada | Onde |
|---|---|---|---|
| F-TM-1..4 | **RATIFICADOS** 29/10 | — | cédula `D-2026-10-29-TEAMMATES-FORKS` |
| F-TM-5 Mecanismo assíncrono | **RATIFICAÇÃO PENDENTE** | (a) fila em tabela, sem Redis | PRE-ADR §5; itens 19–22 |
| F-TM-6 Chave da plataforma × M2 | **RATIFICAÇÃO PENDENTE** | (a) emenda ao ADR-M2 com teto mensal | item 8 |
| F-TM-7 Piloto | **RATIFICAÇÃO PENDENTE** | (a) Conciliação | PR-8 |
| F-TM-8 Forma da proposta | **RATIFICAÇÃO PENDENTE** | (a) estender `ActionProposal` | itens 1, 30–32 |
| F-TM-9 Adaptadores | **RATIFICAÇÃO PENDENTE** | (a) SDK oficial por provedor | item 6 |
| F-TM-10 Ao bater limite | **RATIFICAÇÃO PENDENTE** | (a) pausa e avisa | item 22 |
| F-TM-11 Gatilhos de rotina | **RATIFICAÇÃO PENDENTE** | (a) agendada + manual | itens 23–25 |
| F-TM-12 Conectores externos | **RATIFICAÇÃO PENDENTE** | (a) fora do v1 | — |

Valores numéricos com padrão no esboço (50 turnos/dia, 5 voltas por turno) não são fork: são default configurável. O
teto de saltos e o tempo do vigia (itens 21–22) ficam para a sessão de feature propor com medida.

## 4. Pendente de validação externa

- **LGPD do envio ao provedor de IA** (PRE-ADR §7): pesquisa pelo método oficial antes do PR que liga a chave da
  plataforma (item 8, ramo "chave da plataforma"). Não bloqueia PR-0..PR-7 com BYOK.

## 5. Insumos ausentes

- Métodos do `BankSettlementService` para leitura e para executar o `SETTLEMENT_MATCH` (itens 31, 33).
- Padrão da casa para `@@unique` com soft-delete (memória `unique-de-idempotencia-x-soft-delete`): conferir antes do
  `LlmCredential` no PR-0.
- Estado dos PRs do FIX-CHAT-AGENTE (#835, #836, #838).

## 6. Achados fora de escopo (registrados, não planejados)

- FE-INCR-TEAMMATES (telas de teammate, canal, rotina e caixa de propostas).
- Agentes 2..6 do §7 e transporte de e-mail/WhatsApp (pré-requisito do agente de Cobrança e de Vendas).
- Migrar a entrevista e a extração para a porta `LlmProvider` (hoje continuam no `OpenAIService`).
- Webhook de entrada de rotina (F-TM-11 b) e conectores MCP (F-TM-12 b).

## 7. Divisão e ordem

| PR | Itens | Depende de | Paralelo com |
|---|---|---|---|
| PR-0 | 1–4 | FIX-CHAT-AGENTE fechado | — |
| PR-1 | 5–9 | PR-0 | PR-2 |
| PR-2 | 10–13 | PR-0 | PR-1 |
| PR-3 | 14–18 | PR-1, PR-2 | — |
| PR-4 | 19–22 | PR-3 | PR-7 |
| PR-7 | 30–32 | PR-3 | PR-4 |
| PR-5 | 23–25 | PR-4 | PR-6 |
| PR-6 | 26–29 | PR-4 | PR-5 |
| PR-8 | 33–35 | PR-3, PR-7 | PR-5, PR-6 |
