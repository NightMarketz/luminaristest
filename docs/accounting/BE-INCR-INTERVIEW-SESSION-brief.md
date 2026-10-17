# BE-INCR-INTERVIEW-SESSION — `InterviewSession` persistida, com dono e TTL (nó [[W4]])

**Tipo:** BRIEF (`sessao-planejamento`). Não é "executa": código exige autorização própria (ORCH-006).
**Autorização:** dono, chat, 2026-10-15: *"Autorizo planejar o BRIEF do W4 — sessao-planejamento, sem código, sem
'executa'"*. Cobre exatamente o nó W4 (BRIEF + nota + fold); não cobre código, nem W1/W6 (vizinhos).
**Base:** `origin/main` `8ba1ed8f`. Plano de origem: [`ONBOARDING-WIZARD-plano-grafo-brief.md`](ONBOARDING-WIZARD-plano-grafo-brief.md) §2 W4
(07/09) e [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]] decisão 12 (nó criado `planned`).
**Forks:** F-W4-1, F-W4-2, F-W4-3 **ratificados** pelo dono em questionário (2026-10-15, [[D-2026-10-15-W4-SESSAO-ENTREVISTA]]);
F-W4-4 → **(a)** e F-W4-5 → **(b)** **ratificados** pelo dono em questionário (2026-10-16), os dois contra a recomendação
deste BRIEF. **Execução:** dono, chat, 2026-10-16: *"Pode começar agora e disparar as sessões com brief autorizado"* — vale
como "executa" do W4 (sem merge: cada PR termina com "— não mergear sem OK").

## 0. Estado medido no código (lido em 2026-10-15, `8ba1ed8f`)

Grau: **V** = lido no arquivo; **I** = inferido da leitura.

| # | Fato | Onde | Grau |
|---|---|---|---|
| E1 | Sessão de customização vive num `Record<string, ICustomizationState>` em memória, singleton (global em dev, estático em prod). O header do arquivo já marca o bug (R28) e propõe Prisma `InterviewSession {id, userId, state Json}` | `server/src/features/interview/CustomizationService/StateManager.ts:5-28` | V |
| E2 | Nenhum TTL: entradas só saem com restart do processo | `StateManager.ts` (não há remoção) | V |
| E3 | `sessionId` é `uuidv4()` sem dono; qualquer usuário autenticado que conheça o id lê/muta a sessão | `StateManager.ts:58-60`, `StageHandlers.ts:107-110` | V |
| E4 | O controller resolve `ctx` (401 sem auth) mas **não repassa `userId`** ao `processTurn` | `server/src/controllers/interviewController.ts:72-112` | V |
| E5 | `ChatInterviewSchema` é inline no controller, **sem `.strict()`** | `interviewController.ts:21-28` | V |
| E6 | API do `StateManager` é **síncrona** e devolve **referência mutável**: os chamadores mutam o estado por efeito colateral (`setCurrentAction`, `removeTable`, `customMessages.push`) | `StateManager.ts:66-262`; consumidores `CustomizationService.ts` (≈30 chamadas), `FieldCustomizationService/index.ts:69,133` | V |
| E7 | Sessão ausente em `CUSTOMIZATION_IN_PROGRESS` vira **200** "Vamos recomeçar" + `nextStage:'MATCHING_PRESET'` (sem `presetKey`) | `CustomizationService.ts:171-187` | V |
| E8 | **Correção ao BRIEF de 07/09:** o "`AIChatMode` já espera 404" é sobre a rota `CustomizeFields` (que não existe — W6), não sobre o `ChatInterview`. O hook `useAiInterview` trata **qualquer** `!response.ok` como "erro de comunicação" e **mantém o estágio** → com sessão perdida o usuário fica preso repetindo o erro | `my-app/features/interview/components/RightSidebar/AIChatMode.tsx:110,125`; `my-app/features/interview/hooks/useAiInterview.ts:155,185-188` | V |
| E9 | `FieldCustomizationService` importa o `StateManager` mas não tem chamador (rota 404 — W6) | `FieldCustomizationService/index.ts:11,41` | V |
| E10 | Job diário de expurgo já existe e roda em `server.ts` (só `DynamicTableData`, `deletedAt` > 90 dias) | `server/src/jobs/PurgeDeletedRecords.ts:19-30`, `server/src/server.ts:80-87` | V |
| E11 | Erro `AppError` sai como `{ code: errorCode, message }` com o `statusCode` do erro | `server/src/lib/apiUtils.ts:35-40` | V |
| E12 | SQLite + Prisma 6.16 já usam `Json` (28 colunas) | `server/prisma/schema.prisma` | V |
| E13 | Testes de `StageHandlers` mockam `createCustomizationSession` **síncrono** (`mockReturnValue`) | `InterviewService/__tests__/StageHandlers.{choice,creationType}.test.ts` | V |

## 1. Checklist numerado (comportamentos testáveis)

### PR-1 · BE — persistência, dono, TTL, 404 (`BE-INCR-INTERVIEW-SESSION`) · **M**

1. **Model Prisma `InterviewSession`** (F-W4-1 a) — `id`, `userId` (FK `User`, `onDelete: Cascade`: estado transitório, não é
   trilha de auditoria), `presetKey`, `state Json`, `expiresAt`, `createdAt`, `updatedAt`, `deletedAt?`;
   `@@index([userId, expiresAt])`. Migração com prólogo idempotente (memória `migracao-sqlite-nao-e-transacional`).
   *Teste:* integração cria/lê linha; `prisma migrate diff` limpo.
2. **Repositório `InterviewSessionRepository`** (Route→Controller→Service→Repository→Prisma; nomes/paths por
   `docs/claude-skills/GENERATION_CONTRACTS.md`): `create`, `findActive(id, userId, now)`, `saveState(id, userId, state,
   expiresAt)`, `softDelete(id, userId)`. **Todo read** filtra `{ id, userId, deletedAt: null, expiresAt: { gt: now } }` —
   dono, soft-delete e TTL num só `where`. Nunca `prisma.interviewSession.delete()`.
   *Teste:* integração — sessão de outro `userId` → `null`; `expiresAt` passado → `null`; `deletedAt` → `null`.
3. **`StateManager` vira adaptador assíncrono sobre o repositório** — some o `Record` em memória e o singleton por
   `globalThis`. Padrão **carregar → mutar → salvar** dentro de cada método (E6): cada operação faz `findActive`, aplica a
   mutação no objeto e chama `saveState`. Todos os métodos ganham `userId` e passam a `async`. Injeção do repositório por
   construtor/factory (não `new` dentro do serviço — memória `orchestration-service-tx-repo-smell`).
   **Consequência de F-W4-4 (a), registrada na execução (16/10):** o serviço carrega a sessão **uma vez por turno**
   (`loadSession` → handle com a `version` lida) e cada método que muta grava na hora com essa versão (`saveSession`,
   que avança a versão do handle). Recarregar dentro de cada método leria a versão nova e nunca veria o turno da outra aba.
   *Teste:* unitário com repo falso — `removeTable` persiste a lista sem a tabela; `isCore` continua bloqueando.
4. **TTL de 24 h deslizante** (F-W4-3 a) — `create` e todo `saveState` gravam `expiresAt = now + 24h`. Constante
   nomeada (`INTERVIEW_SESSION_TTL_MS`), relógio injetável para teste.
   *Teste:* unitário — `saveState` com `now` fixo grava `now+24h`; leitura em `now+24h+1ms` → não encontrada.
5. **Erro específico `InterviewSessionNotFoundError`** (`AppError`, `statusCode 404`,
   `errorCode 'INTERVIEW_SESSION_NOT_FOUND'`) — lançado quando `findActive` devolve `null` (inexistente, expirada,
   apagada **ou de outro usuário**: mesma resposta, não revela existência). Substitui os dois ramos 200 "Vamos recomeçar"
   (E7) e é **relançado**, não engolido, pelos `catch` genéricos de `CustomizationService`/`InterviewService`
   (memória `erro-especifico-para-skip-em-job`: catch amplo não pode esconder o code próprio). (F-W4-2 b)
   *Teste:* controller (supertest) — `sessionId` de outro usuário → 404 `{ code: 'INTERVIEW_SESSION_NOT_FOUND' }`;
   expirada → idem; mensagem de turno normal → 200 inalterado.
6. **`userId` atravessa a cadeia** — controller passa `ctx.userId` a `processTurn(…, userId)` → `StageHandlers` →
   `CustomizationService.createCustomizationSession(presetKey, userId)` (o id passa a ser o `id` da linha, gerado pelo
   Prisma ou `uuid`, nunca vindo do cliente). `generateSessionId()` sai da API pública.
   *Teste:* `StageHandlers.*.test.ts` atualizados para `mockResolvedValue` (E13) e para assertar o `userId` recebido.
7. **DTO `ChatInterviewDto` em `server/src/features/interview/dtos/`** — move `MessageSchema`/`ChatInterviewSchema` do
   controller, `.strict()` no objeto raiz e no item de mensagem; `sessionId: z.string().uuid().optional()` (ou
   `cuid`, o que o item 1 usar). Gate: entra no snapshot de shape dos DTOs (`dtoShapeSnapshot`) — inserir só o schema novo
   (memória `dto-snapshot-update-reordena-no-windows`).
   *Teste:* chave desconhecida no corpo → 400; o corpo que o `useAiInterview` manda hoje (`messages/stage/presetKey/sessionId/choice`) → 200.
8. **Fim da customização não apaga a sessão** — `CUSTOMIZATION_COMPLETED` só marca `isCompleted` (persistido); o
   consumo/soft-delete depois do `/dashboard/create` é do [[W1]] (fronteira: W1 lê o estado consolidado — F-W1-1).
   *Teste:* após `done`, `findActive` ainda devolve a sessão com `isCompleted: true`.
9. **Expurgo** (F-W4-5 **b**) — `PurgeDeletedRecords` passa a incluir `InterviewSession`: hard-delete da sessão com
   `expiresAt` **ou** `deletedAt` anterior a `now − 7 dias` (constante `INTERVIEW_SESSION_RETENTION_MS`); `DynamicTableData`
   segue em 90 dias. A janela de 7 dias vale também para a apagada (soft-delete do W1), pelo mesmo motivo de minimização. O
   comentário do job ganha a linha do model novo.
   *Teste:* unitário do job com prisma falso — `deleteMany` do model com o corte de 7 dias; constante = 7 dias.
10. **`FieldCustomizationService` acompanha a assinatura** (`await`, `userId`) só para compilar — sem chamador (E9); plugar a
    rota é W6, fora daqui.
11. **OpenAPI** — `docs.paths.ts` do `ChatInterview` ganha a resposta 404 com o `code`; `public/openapi.json`
    regenerado (`npm run …` da memória `openapi-wiring-static-artifact`) e guard de path-count verde (path não muda).
12. **Concorrência** (F-W4-4 **a**) — coluna `version Int @default(0)`; `saveState` é `updateMany` condicional
    (`where { id, userId, version: lida, deletedAt: null, expiresAt > now }`, `version: { increment: 1 }`). Nada gravado →
    relê: sessão ativa = outro turno gravou antes → `InterviewSessionConflictError` (`AppError`, 409,
    `errorCode 'INTERVIEW_SESSION_CONFLICT'`); sessão sumiu → 404 do item 5. Relançado pelos `catch` amplos, como o 404.
    **Muda o contrato público:** o OpenAPI documenta o 409 com o `code`, e o PR-2 trata o 409 (item 14).
    *Teste:* unitário — duas leituras na mesma versão, a 2ª gravação → 409 e o estado gravado é o da 1ª; outra aba grava
    durante a chamada à IA → o turno sai 409, não 200; integração — `saveState` com versão velha → `false`.

Gates do PR-1: `npx tsc --noEmit` + `tsc -p tsconfig.test.json` (server), `npm run check:arch`, `npm run test:integration`
(shards), snapshot de DTO, openapi. Sem evento de auditoria novo (allowlist do `auditCanonical.ts` não muda — **I**:
estado transitório de onboarding não é evento canônico; se o executor quiser auditar criação de sessão, é fork novo).

### PR-2 · FE — o hook trata a sessão perdida (`FE-INCR-INTERVIEW-SESSION-LOST`) · **S**

13. **`useAiInterview.postTurn` lê o corpo do erro**: `404` com `code === 'INTERVIEW_SESSION_NOT_FOUND'` →
    `setSessionId(null)`, `setCustomizationState(null)`, fecha o painel de customização, volta para
    `AWAITING_CREATION_TYPE_CONFIRMATION` com o mesmo `presetKey` e `choicePrompt { kind:'creation_type', reason:'error' }`
    (reusa os botões criar × customizar do W3; sem `presetKey` → `DISCOVERING_BUSINESS`). Mensagem própria
    (i18n pt/en, chave nova, ex.: `interview.sessionExpired`): "Sua customização expirou ou não foi encontrada. Quer
    customizar de novo ou criar o sistema agora?". Qualquer outro erro segue o caminho atual.
    *Teste:* vitest do hook (`useAiInterview.test.tsx`) — fetch falso 404 com o code → estágio, `sessionId` nulo e botões;
    500 → mensagem genérica, estágio mantido.
14. **409 `INTERVIEW_SESSION_CONFLICT`** (F-W4-4 a) — mensagem própria (i18n pt/en, chave nova), **sem perder a conversa**:
    mantém mensagens, estágio, `sessionId` e painel; o usuário reenvia. Nenhum outro estado muda.
    *Teste:* vitest do hook — fetch falso 409 com o code → mensagem própria, estágio e `sessionId` mantidos, conversa intacta.

Gates do PR-2: paridade i18n pt/en (namespace no `ns` se for JSON novo — memória `i18n-namespace-novo-precisa-entrar-no-ns`),
`npm run test:types` do my-app, vitest. **Sign-off de browser** do fluxo (customizar → reiniciar o servidor → continuar)
é gate humano: runbook, não agente.

**Ordem:** PR-1 → PR-2, mergeados em sequência. Na janela entre os dois, o 404 cai no "erro de comunicação" atual — mas
com PR-1 a sessão sobrevive a restart/deploy, então só sessão > 24 h parada ou alheia chega lá (hoje: toda sessão a cada
restart). Melhora líquida; não pede fork.

## 2. Contratos (esboço materializável)

```prisma
model InterviewSession {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  presetKey String
  state     Json      // ICustomizationState serializado
  expiresAt DateTime  // now + 24h, renovado a cada saveState (F-W4-3 a)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  version   Int       @default(0) // F-W4-4 a: update condicional
  @@index([userId, expiresAt])
}
```

```ts
// server/src/features/interview/dtos/ChatInterviewDto.ts
export const InterviewMessageSchema = z.object({
  role: z.enum(['user', 'assistant']).optional(),
  sender: z.enum(['user', 'ai']).optional(),
  content: z.string().optional(),
  text: z.string().optional(),
}).strict();
export const ChatInterviewSchema = z.object({
  stage: z.string().optional().default('GREETING'),
  messages: z.array(InterviewMessageSchema).optional().default([]),
  presetKey: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  choice: z.enum(['create', 'customize']).optional(),
}).strict();

// repositório
interface IInterviewSessionRepository {
  create(input: { userId: string; presetKey: string; state: ICustomizationState; expiresAt: Date }): Promise<{ id: string }>;
  findActive(id: string, userId: string, now: Date): Promise<{ id: string; state: ICustomizationState } | null>;
  saveState(id: string, userId: string, state: ICustomizationState, expiresAt: Date): Promise<void>;
  softDelete(id: string, userId: string): Promise<void>;   // consumidor: W1
}

// erro
class InterviewSessionNotFoundError extends AppError { statusCode = 404; errorCode = 'INTERVIEW_SESSION_NOT_FOUND' }

class InterviewSessionConflictError extends AppError { statusCode = 409; errorCode = 'INTERVIEW_SESSION_CONFLICT' }

// resposta pública — 404 e 409 (novos)
{ code: 'INTERVIEW_SESSION_NOT_FOUND', message: string }
{ code: 'INTERVIEW_SESSION_CONFLICT', message: string }
// resposta 200 do turno — inalterada (IInterviewTurnResult)
```

## 3. Forks

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-W4-1** armazenamento | (a) tabela Prisma; (b) Redis | (a) | **RATIFICADO (a)** — dono, questionário, 2026-10-15 |
| **F-W4-2** sessão perdida | (a) 200 "vamos recomeçar" → `MATCHING_PRESET`; (b) 404 estruturado + front volta à escolha | (b) | **RATIFICADO (b)** — dono, questionário, 2026-10-15 (pergunta já trazia a correção E8) |
| **F-W4-3** TTL | (a) 24 h deslizante; (b) 7 dias deslizante; (c) 2 h fixo | (a) | **RATIFICADO (a)** — dono, questionário, 2026-10-15 |
| **F-W4-4** turnos concorrentes da mesma sessão (duas abas) | (a) coluna `version` + update condicional; conflito → 409 `INTERVIEW_SESSION_CONFLICT` (muda contrato); (b) último a gravar vence, limitação documentada no repositório | **(b)** — o front já serializa turnos (`isLoading`, `choiceInFlight`); o pior caso é perder um passo da customização numa segunda aba, recuperável na conversa; (a) acrescenta resposta pública e tratamento no FE sem caso real observado | **RATIFICADO (a)** — dono, questionário, 2026-10-16 (contra a recomendação); itens 12 e 14 |
| **F-W4-5** expurgo | (a) entra no `PurgeDeletedRecords`: hard-delete com `deletedAt` **ou** `expiresAt` anterior a 90 dias (uma regra, um job); (b) expirada some em 7 dias (minimização LGPD — o `state` guarda a descrição do negócio digitada) | **(a)** — mesma janela e mesmo job que o resto do sistema; a sessão expirada já é invisível pelo `where` do item 2, então o prazo só afeta retenção, não comportamento. Se o dono preferir minimizar retenção de texto livre, (b) custa uma constante | **RATIFICADO (b)** — dono, questionário, 2026-10-16 (contra a recomendação; minimização LGPD); item 9 |

## 4. Pendente de validação externa

Vazia — nenhum comportamento depende de regra contábil, fiscal ou legal. (O prazo de retenção do F-W4-5 é escolha de
produto sob LGPD art. 6º III, minimização; nenhum prazo específico é imposto por norma para este dado — **I**, não pesquisado
a fundo por não haver decisão que dependa disso além do fork.)

## 5. Insumos ausentes

Nenhum que trave o PR-1. Para o PR-2: o executor confirma o namespace i18n do wizard ao abrir o arquivo.

## 6. Achados fora de escopo (registrados, não planejados)

- `useAiInterview` manda `Authorization` lido de cookie e trata **todo** erro como "comunicação" — o tratamento genérico
  de 401/429/500 é do [[W7]] (higiene FE), não daqui; o PR-2 só separa o 404 com code.
- `AIChatMode` chama `/dashboard/ai/CustomizeFields`, que não existe (W6, GAP-MAP) — intocado.
- `E7` devolve `MATCHING_PRESET` **sem** `presetKey`: some com o item 5; não há outro chamador desse ramo.
- Rota da entrevista na lista de exceções do OpenAPI e README "NOT WIRED" (já listados no §7 do plano em grafo).
