# BRIEF — BE-INCR-API-ERROR-ENVELOPE (BRD F-01.1: um envelope de erro, `handleApiError` único)

> **Estado:** BRIEF de `sessao-planejamento`, **ratificado em 2026-11-11**: os 11 forks da §3 têm resposta do dono
> (questionário da sessão de decisões pendentes), nenhum pendente. Pronto para `sessao-feature` quando o dono escrever o
> `executa` no chat. Pela F-ENV-10 esse `executa` libera também a zona proibida de todos os PRs do BRIEF.
>
> **Risco principal, em uma linha:** a troca é *expand → contract*. Se o servidor mudar o corpo antes de o front ler os dois
> formatos, toda falha de validação vira toast genérico ("Validation failed…" ou "Unexpected error."). Por isso o front
> (BRD F-73.1) entra **antes** da migração dos 485 sítios, não depois.

## 0. Contexto fixo

- **Item a planejar:** BRD F-01.1, linha 142 de `docs/estruturas-implicitas/CORRECOES.md` (faixa 3, D4, contrato de API = zona
  proibida): *"Quatro formatos de corpo de erro; a mesma falha de validação sai em dois (`flatten` nos 485 `safeParse`; `issues`
  quando o schema lança)"*. Ficha: `BRD-01` do inventário (`git show f5f70b03f:docs/estruturas-implicitas/INVENTARIO-BRD.md`,
  linhas 36-64); questão aberta 1 do mesmo inventário (linhas 899-902).
- **Autorização (dono, chat, 2026-11-10):** a lista "BRD F-01.1: BRIEF por `sessao-planejamento`, que destrava BRD F-04.3 e
  F-73.1. … Resolver"; no questionário da mesma data, BRIEF em "Sessão própria". Antes, BRD Q1 respondida "(c) `handleApiError`
  único" (`CORRECOES.md:78`). **A autorização cobre só este BRIEF** (nenhum código de aplicação) — conferida contra o item: cobre
  exatamente o F-01.1; F-04.3 e F-73.1 entram aqui só como sequência, não como plano executável próprio.
- **Decisão já tomada (não rediscutir):** BRD Q1 = (c). Os controllers **lançam**; `handleApiError` (`server/src/lib/apiUtils.ts`)
  é o único ponto que monta corpo de erro. As alternativas (a) "documentar os quatro formatos" e (b) "manter `safeParse` e trocar
  só o corpo" estão fora.
- **Nós vizinhos:**
  - consome: `handleApiError` como está na `main` (`d5608ef79`) **mais** os dois PRs abertos que o alteram: #1154 (BRD F-02.1,
    `MALFORMED_JSON` 400 / `PAYLOAD_TOO_LARGE` 413 do body-parser) e #1189 (BRD F-56.1, `LLM_<kind>` 503/502). O BRIEF parte
    do código dos dois.
  - é consumido por: BRD F-04.3 (`CORRECOES.md:146`) e BRD F-73.1 (`CORRECOES.md:176`), ambos "bloqueado: depende do BRIEF".
  - encosta (PRs abertos, mesmos arquivos): #1193 (`uploadSecurity.ts`, texto do 415), #1184 (`lib/pagination.ts` lança
    `ValidationError`), #1202 (`my-app/lib/api/api-client.ts`), #1204 (`document.service.ts` → `multipart.ts`), #1206
    (`dynamicTableFetch.ts`, Kanban, Pessoas, widget ERP).

## 1. Base verificada em disco (`origin/main` @ `d5608ef79`, 2026-11-10)

Grau: **[OBS]** lido nesta sessão; **[GREP]** contagem por grep, não reaberta linha a linha; **[INF]** inferido.

### 1.1 Os formatos de corpo que saem hoje

| # | Corpo | Quem produz | Volume | Evidência |
|---|---|---|---|---|
| 1 | `{ success:false, error:'<texto>' }` | controllers (401 `'Unauthorized'`/`'Authentication required'`, ~30 400/404/415 com texto); `uploadSecurity.ts` (413/415/400); `dfeSignerDeviceAuth.ts` (401) | 412 linhas de 401 por texto [GREP]; 439 linhas `success:false, error:'…'` [GREP] | `payableController.ts:28,32`; `uploadSecurity.ts:101-133`; `dfeSignerDeviceAuth.ts:15,31` [OBS] |
| 2 | `{ success:false, error:{ formErrors, fieldErrors } }` | controllers, no `safeParse` que falha | 489 `.flatten()` fora de teste: 487 em controllers (92 arquivos), 2 fora (`BindingCompileService.ts:325` já lança `ValidationError`; `dynamicTables/validation/SchemaValidator.ts:31`, motor = ZP) [GREP]. O inventário contou 485 por script | `payableController.ts:34-36` [OBS] |
| 2' | variantes do 2 | 18 controllers com `const bad = (res, error) => res.status(400).json({ success:false, error })`; `crmReportsController.ts:35` (`code` + `error: flatten`); `dashboardController.ts:248` (`{ error:'<texto>', details: flatten }`, sem `success`) e `:277` (`issues: flatten`); `dpLancamentoController.ts:46` (só `fieldErrors`) | 18 helpers + 4 variantes [GREP/OBS] | linhas citadas [OBS] |
| 3 | `{ code, message, details? }`, **sem** `success` | `handleApiError`: `ZodError` lançado (`details = issues`), `AppError` (`details` só para 6 subclasses, `apiUtils.ts:39`), Prisma P2002/P2025, 500; `middleware/auth.ts` (401/403 `UNAUTHORIZED`/`FORBIDDEN`) | todo erro lançado; 591 chamadas a `handleApiError` em controllers [GREP] | `apiUtils.ts:19-81`; `auth.ts:136-199` [OBS] |
| 4 | `{ error:'Route not found', message }` | 404 de rota | 1 | `app.ts:103-108` [OBS] |
| 5 | texto puro do `express-rate-limit` (429) | limiter em `/api/` | 1 | `app.ts:63-69` [OBS]; o corpo ser texto é o padrão da biblioteca **[INF]**, não executado. **Não está no inventário** |

- **Mesma falha, dois corpos:** validação por `safeParse` → formato 2, sem log; por `.parse(` ou `throw new ValidationError` →
  formato 3 com `issues` ou sem `details`, log `info api.error` (BRD-01, falha 1 e 2) [OBS].
- **Express 4** (`server/package.json: "express": "^4.18.2"`) [OBS]: rejeição de handler `async` **não** chega ao handler global.
  Lançar fora de `try` deixa a requisição pendurada. Varredura heurística [INF, script fora do repo]: dos 487 `.flatten()` em
  controllers, **479 estão depois de um `try {`** no mesmo handler e **8 não** (helpers de `dp*Controller` ×6, `crmReportsController`,
  `teammateController`). O censo do PR-1 refaz isso com AST.
- **Contrato que manda escrever o formato 2:** `.claude/skills/_ARCHITECTURE-CONTRACT.md:63`, `docs/claude-skills/GENERATION_CONTRACTS.md:20`
  e `.claude/skills/backend-controller-generator/SKILL.md` [OBS/GREP]. Sem trocar os três, código novo reintroduz o formato 2.
- **Sem schema de erro em lugar nenhum:** `server/public/openapi.json` (383 paths) não declara resposta de erro; o snapshot de DTO
  (`dtoShapeSnapshot.test.ts`, que gera `my-app/types/contracts/**/*.gen.ts`) não cobre erro [OBS].
- **Testes que leem corpo de erro** [GREP, `server/**/*.test.ts`]: 167 linhas com `body.code`, 28 com `body.error`, 14 com
  `fieldErrors|formErrors` (3 arquivos). Os de `body.error` e `fieldErrors` mudam no lote do controller deles.

### 1.2 O front que lê esses corpos

- `apiClient.request` (`my-app/lib/api/api-client.ts:68-112`) [OBS]: em `!ok`, monta o toast com `extractErrorMessage` e lança
  `Object.assign(new Error(toast), body, { status })`. **Consequência para a migração:** o campo `message` do corpo **sobrescreve**
  o `message` do `Error`. Com o formato 2 não há `message` e o toast humanizado ("campo: erro; …") fica; com o envelope novo, o
  `message` genérico do servidor substituiria o texto humanizado em todo `resolveError` que lê `message` primeiro.
- `extractErrorMessage` (`api-client.ts:11-14`) humaniza só `body.error` com forma de flatten; não olha `details`.
- `resolveErrorWithCode`/`resolveError` (`features/accounting/lib/resolveError.ts:26-44`, 81 arquivos importam [GREP]):
  `message` → `error` (texto) → `error` (flatten).
- `resolveErrorMessage` (`lib/utils/error-handler.ts:7-30`, 18 arquivos [GREP]): `error` (texto) → `message` → `JSON.stringify(details)`
  → "Unexpected error.". Não trata flatten.
- Os outros extratores localizados nesta sessão (a ficha BRD-73 diz "ao menos 12" [OBS da coleta, não reaberto]):
  `multipart.ts:28 multipartParseError`, `dataExchange.service.ts:94 parseError`, `crm.service.ts:75 attachmentError` (as três
  cópias do parse de upload), `chat.service.ts:50 toChatError`, `interview.service.ts:85 toInterviewError`,
  `setup.service.ts:69 toError`, `dashboardLayout.service.ts:59 toError`, `governance/governanceError.ts:9 resolveGovernanceError`,
  `crm/lib/reportBuilder.ts:826 reportError`, `interview/setup/creationErrorMessage.ts:24`, `interview/setup/classifyCreationError.ts:7`
  (lê `errorCode`, nome que o servidor não emite [INF]), `interview/components/RightSidebar/index.tsx:137 saveErrorMessage`,
  `SimplesApuracaoPanel.tsx:21 alertasDoErro`, `simplesGrid.ts:67 celulaDoErro`. Ramos por `code` à mão:
  `ChargeReceivableModal.tsx:111`, `PaymentProviderPanel.tsx:177` (36 arquivos com `.code ===` [GREP]).
- `fieldErrors` por campo na tela: `DynamicForm.tsx`, `EditRecordButton.tsx`, `FloatingActionButton.tsx` (vem do `ValidationError`
  do motor DynamicTable, formato 3) [OBS].
- `success === false` é lido em 2 lugares do front [GREP]: o `apiClient` já lança em `!ok`.

## 2. Contrato do envelope (esboço Zod — materializa no PR-1)

Esboço com as recomendações dos forks aplicadas **só para mostrar a forma**; cada linha marcada `F-ENV-n` muda se o dono escolher
outro caminho.

```ts
// server/src/lib/apiError.ts (nome proposto; o tipo vai ao front pelo snapshot de DTO, nunca por import)
import { z } from 'zod';

export const API_ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;               // F-ENV-6: código aberto com regex, não enum

export const ValidationErrorDetailsSchema = z.object({
  kind: z.literal('validation'),                                  // discrimina de outros `details`
  source: z.enum(['body', 'query', 'params', 'headers']).optional(),
  formErrors: z.array(z.string()),                                // F-ENV-2: forma do z.flattenError (Zod 4)
  fieldErrors: z.record(z.string(), z.array(z.string())),
}).strict();

export const ApiErrorBodySchema = z.object({
  success: z.literal(false),                                      // F-ENV-1
  code: z.string().regex(API_ERROR_CODE),
  message: z.string().min(1),                                     // texto para pessoa; nunca stack, nunca texto de provedor
  details: z.union([ValidationErrorDetailsSchema, z.record(z.string(), z.unknown())]).optional(),
  error: z.string().min(1).optional(),                            // F-ENV-3: espelho de `message` SÓ na transição; sai no PR-final
}).strict();

export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
```

Entradas que o contrato fixa (todas **diretas**, sem fork, salvo marca):

| Origem do erro | status | `code` | `details` |
|---|---|---|---|
| `parseOrThrow` / `ZodError` lançado (inclui os 13 `.parse(` de hoje, que deixam de mandar `issues`) | 400 | `VALIDATION_ERROR` | `ValidationErrorDetails` |
| `ValidationError` com `details` vindo de flatten (`BindingCompileService`, `SchemaValidator`, `pagination.ts` do #1184) | 400 | o da classe | normalizado para `ValidationErrorDetails` quando tiver `fieldErrors` |
| `AppError` (37 subclasses) | da classe | `errorCode` | só a allowlist atual de 6 subclasses (`apiUtils.ts:39`) — não ampliar aqui |
| `LlmProviderError` (#1189) | 503/502 | `LLM_<kind>` | — |
| body-parser (#1154) | 400/413 | `MALFORMED_JSON`/`PAYLOAD_TOO_LARGE` | — |
| Prisma P2002 / P2025 | 409 / 404 | `CONFLICT` / `NOT_FOUND` | `{ fields }` no P2002 |
| sem sessão no controller | 401 | `UNAUTHORIZED` | — (F-ENV-5) |
| rota inexistente (`app.ts:103`) | 404 | `ROUTE_NOT_FOUND` | — ; não ecoa `originalUrl` no `message` [direto: o eco é a "confiança indevida" da ficha] |
| rate limit (`app.ts:63`) | 429 | `RATE_LIMITED` | — (handler do limiter chama o mesmo montador) |
| upload (`uploadSecurity.ts`) | 400/413/415 | `UPLOAD_ERROR`/`FILE_TOO_LARGE`/`UNSUPPORTED_MEDIA_TYPE` | — |
| não reconhecido | 500 | `INTERNAL_SERVER_ERROR` | `rawError`/`stack` só em `development`, como hoje (mudar é fora de escopo, §7) |

Helpers que o PR-1 cria (assinaturas, não corpo):

```ts
// server/src/lib/apiUtils.ts
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown, source?: 'body' | 'query' | 'params' | 'headers'): z.infer<S>;
export function requireUser(req: Request): UserContext;           // F-ENV-5: lança UnauthorizedError
export function buildApiErrorBody(error: unknown): { status: number; body: ApiErrorBody }; // puro; handleApiError = build + log + res
```

`handleApiError` passa a ser `buildApiErrorBody` + o log de hoje (OBS-R5, `apiUtils.ts:71-79`, sem mudar nível) + `res.status().json()`.
Uma consequência **direta** que o dono deve conhecer: os 400 de validação, que hoje não deixam log, passam a deixar `info api.error`
(é o comportamento atual do `ValidationError` lançado; o ADR-OBSERVABILIDADE manda registrar uma vez, na borda).

## 3. Forks — ratificados em 2026-11-11 (nenhum pendente)

| ID | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-ENV-0** | O contrato vira ADR antes do código? | (a) PR-0 com `docs/adr/ADR-API-ERROR-ENVELOPE.md` (envelope, tabela de códigos, exceções), ratificado antes do PR-1; (b) este BRIEF basta e o PR-1 muda o Contrato direto | **(a)**: muda o Contrato de Arquitetura §(linha 63), o GENERATION_CONTRACTS e uma skill geradora; o `CLAUDE.md` manda ler/abrir ADR antes de mudar estrutura entre camadas. Custo: um PR de `.md` | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "ADR antes (PR-0) (Recommended)" |
| **F-ENV-1** | O envelope leva `success:false`? | (a) sim; (b) não (como o formato 3 de hoje) | **(a)**: simetria com `{ success:true, data }` e com os formatos 1/2 que o front conhece; o custo é um campo | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "Com success:false (Recommended)" |
| **F-ENV-2** | Forma de `details` em validação | (a) flatten (`formErrors`/`fieldErrors`, `z.flattenError`) + `kind`/`source`; (b) `issues` (`ZodIssue[]`, com `path`); (c) os dois | **(a)**: o front já humaniza flatten (`zodFlatten.ts`) e o `DynamicForm` usa campo→mensagem; `issues` expõe a anatomia do schema (`expected`, ramos de union). Perde-se o caminho aninhado (`itens.2.valor` vira `itens`) — se o dono quiser o caminho, (c) | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "flatten + kind/source (Recommended)" |
| **F-ENV-3** | Compatibilidade na transição | (a) front tolerante primeiro (PR-2) e servidor sem espelho; (b) front tolerante primeiro **e** o servidor espelha `error: message` até o PR-final; (c) servidor primeiro | **(b)**: os 12+ extratores, as 3 cópias de parse de upload e os ramos à mão leem `error` primeiro; o espelho cobre o que o PR-2 não achar, e sai num PR próprio quando o grep do front der zero leitor de `.error` | **RATIFICADO 11/11 → (b)** (dono, questionário, 2026-11-11): "Front antes + espelho (Recommended)" |
| **F-ENV-4** | Mecanismo do "controller lança" | (a) `parseOrThrow(schema, input, source)` no controller, dentro do `try` que já existe; (b) middleware `validate({ body, query, params })` na rota; (c) wrapper `asyncHandler` que leva o `catch` para fora de todo handler | **(a)**: troca de 3 linhas por sítio, mantém a validação no controller (Contrato §2), codemod mecânico; (b) muda 530 rotas e a camada Route; (c) é refatoração maior que o item e não é pedida | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "parseOrThrow no controller (Recommended)" |
| **F-ENV-5** | Os 412 `401` de texto nos controllers | (a) `requireUser(req)` que lança `UnauthorizedError`, no mesmo lote do arquivo; (b) `throw new UnauthorizedError()` inline; (c) deixar fora (o `authMiddleware` já barra sem token; o ramo só roda com usuário apagado [INF, `auth.ts:144-151`]) | **(a)**: fecha o formato 1 no mesmo toque e some a dupla de textos; (c) deixa um formato vivo e contraria Q1 | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "requireUser(req) (Recommended)" |
| **F-ENV-6** | `code` aberto ou catálogo fechado | (a) `string` com regex agora; catálogo é achado à parte; (b) `z.enum` gerado de `errors.ts` + códigos de borda, exportado ao front | **(a)**: `LLM_${kind}` e as 37 subclasses tornam o enum um trabalho próprio; o front ramifica por 3-4 códigos | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "string com regex (Recommended)" |
| **F-ENV-7** | Bordas cujo cliente não é o `my-app` | (a) fora da migração, listadas no ADR como exceção (webhook de pagamento BRD-46, webhook DF-e BRD-47, dispositivo do assinador local `dfeSignerDeviceAuth`/BRD-48, callback PSC BRD-49); (b) entram, cada uma com liberação de ZP | **(a)**: o corpo é lido por provedor ou pelo assinador local, que este BRIEF não leu (§5); mudar sem ler o cliente quebra fora da tela | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "Fora, como exceção no ADR (Recommended)" |
| **F-ENV-8** | Granularidade dos PRs de migração | (a) um PR por domínio (7 lotes, §4), arquivos disjuntos, todos sobre a `main` depois de PR-1 e PR-2; (b) um PR mecânico só; (c) um PR por controller (≈92) | **(a)**: ≤ ~120 sítios por PR é revisável; os lotes não dependem entre si (profundidade de pilha 1); (b) contraria "PR grande piora a revisão"; (c) gera 92 lotes de CI | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "Um PR por domínio (Recommended)" |
| **F-ENV-9** | Guarda contra regressão no fim | (a) regra `no-restricted-syntax` no ESLint do server (job que já roda) proibindo `.flatten()` e `res.status(<4xx/5xx>).json(` em `controllers/**` fora das exceções do F-ENV-7; (b) nenhuma guarda: Contrato + skill geradora bastam | **(a)**, mas **só com ratificação explícita**: a regra ⛔ do `CLAUDE.md` proíbe aparato novo, e as exceções em lint foram ratificadas uma a uma (no-console, catch silencioso). Sem a guarda, o próximo controller gerado de memória volta ao formato 2 | **RATIFICADO 11/11 → (a)** (dono, questionário, 2026-11-11): "Ratifico a regra ESLint (Recommended)". Vale como exceção ratificada à regra ⛔ do `CLAUDE.md`, nos moldes do `no-console` |
| **F-ENV-10** | Liberação de zona proibida na execução | a autorização deste BRIEF libera ZP **só para planejar**. Os lotes que tocam auth (`authController`, `authUtilityController`), assinatura/transmissão (`companySigner`, `dfeSigner`, `pscCredential`, `fiscalCertificate`, `nfe*`, `fiscalDocument`) e pagamento (`collectionCharge`, `paymentAccount`) precisam de liberação por PR | Recomendação: o dono libera por lote no `executa`; o envelope em si (PR-1) já é contrato de API = ZP e precisa da liberação dele | **RATIFICADO 11/11, fora da recomendação** (dono, questionário, 2026-11-11): "Libero tudo no executa". Um `executa` do dono libera a ZP de todos os PRs do BRIEF (PR-1, PR-5, PR-6, PR-9); os PRs seguem vermelhos e passam por revisor independente e lote |

**Conferência de 2026-11-11 (antes do questionário, `origin/main` @ `d96a17caf`):** o #1154 e o #1189 já estão na `main`: o
`handleApiError` (`apiUtils.ts:33-108`) tem os ramos `MALFORMED_JSON`/`PAYLOAD_TOO_LARGE` e `LLM_<kind>`, e a allowlist de `details`
passou de `:39` para `:61`, com as mesmas 6 subclasses [OBS]. Continuam valendo: Express `^4.18.2`, o `Object.assign(new Error(toast), body)`
em `api-client.ts:120`, o `zodFlatten.ts` e a ausência de ADR de erro em `docs/adr/` [OBS]. Recontagem por grep de linha [GREP]:
474 `.flatten()` em `server/src/controllers` (487 em 10/11), 381 `status(401).json({ success:false` numa linha só (412 no BRIEF,
contados por outro padrão) e 31 `Schema.parse(` em controllers. O censo AST do 1.13 fixa o denominador; nenhuma decisão muda com a diferença.

## 4. Checklist — PR-0..PR-n

Cada item é testável sozinho. "Base" = de onde o PR sai; pilha máxima 2, raiz primeiro (`CLAUDE.md` §Pilhas).

### PR-0 — ADR (só se F-ENV-0 = a). Base: `main`.
0.1 `docs/adr/ADR-API-ERROR-ENVELOPE.md` com o envelope da §2 nos caminhos ratificados, a tabela de códigos de borda, a lista de
    exceções do F-ENV-7 e a regra de transição do F-ENV-3. Linha no `docs/adr/INDEX.md`. Nenhum código.

### PR-1 — envelope e helpers (servidor). Base: `main` **depois** de #1154 e #1189 mergeados (os dois mudam `apiUtils.ts`).
1.1 `ApiErrorBodySchema` + `ValidationErrorDetailsSchema` em Zod 4 `.strict()` (§2). Teste: `safeParse` aceita um corpo de cada
    linha da tabela da §2 e recusa campo extra.
1.2 `buildApiErrorBody(error)` puro, extraído do `handleApiError`. Teste por ramo (ZodError, cada `AppError` com e sem `details`,
    `LlmProviderError`, body-parser, P2002, P2025, desconhecido em `production` e `development`): o corpo passa no
    `ApiErrorBodySchema.parse` e o status é o da tabela.
1.3 `handleApiError` = `buildApiErrorBody` + log atual (mesmos níveis, OBS-R5) + resposta. Teste: 400 de validação loga `info`,
    401/403 `warn`, 5xx `error` com o erro inteiro.
1.4 `ZodError` lançado sai com `details` de validação (F-ENV-2), não mais `issues`. Teste com um dos 13 `.parse(` reais
    (`accountingController.ts:547-551` é o par do F-04.3).
1.5 `ValidationError` cujo `details` tem `fieldErrors` sai normalizado (`kind:'validation'`). Teste com `BindingCompileService:325`
    e `pagination.ts` (#1184).
1.6 `parseOrThrow(schema, input, source)` devolve `z.infer` e lança `ValidationError` com `ValidationErrorDetails`. Teste de tipo
    (`npx tsc --noEmit`) e de comportamento.
1.7 `requireUser(req)` (se F-ENV-5 = a) lança `UnauthorizedError`. Teste: 401 `UNAUTHORIZED` no envelope.
1.8 404 de rota (`app.ts:103`) e handler do rate limit (`app.ts:63`) respondem pelo `buildApiErrorBody`. Teste supertest: corpo
    passa no schema; 404 não ecoa a URL.
1.9 `uploadSecurity.ts` responde pelo envelope (413/415/400). Base sobre o #1193 se ele já tiver entrado (mesmo arquivo).
1.10 Espelho `error: message` ligado (se F-ENV-3 = b). Teste: presente em todo corpo; some quando a flag/constante do PR-final cair.
1.11 Tipo `ApiErrorBody` exportado ao front pelo snapshot de DTO (`dtoShapeSnapshot.test.ts` → `my-app/types/contracts/api/ApiErrorBody.gen.ts`
     ou caminho que o snapshot já usa). Gate: o próprio snapshot; atenção ao reordenamento no Windows (memória "UPDATE do snapshot
     reordena": inserir só o novo).
1.12 Contrato: `_ARCHITECTURE-CONTRACT.md:63` e `GENERATION_CONTRACTS.md:20` trocam o exemplo de `safeParse … flatten()` por
     `parseOrThrow`; `backend-controller-generator/SKILL.md` idem. Gate: `node .claude/skills/skill-audit/skill-audit.mjs run` = 0.
1.13 Censo versionado (comando no corpo do PR, não script novo de gate): `.flatten()`, `res.status(4xx|5xx).json(`, `bad(` e
     `'Unauthorized'` por arquivo, com a separação dentro/fora de `try` feita por AST. Fixa o denominador dos lotes e a lista dos
     sítios fora de `try`, que **não** podem receber `throw` sem `try` (Express 4).
Gates do PR: `cd server && npx tsc --noEmit`; testes com escopo (`npx jest server/src/lib/__tests__/apiUtils… --selectProjects unit`);
`npm run check:arch`; supertest do 404/429 um arquivo por vez com `--runInBand`. Classe esperada: vermelho (código, ZP) → revisor
independente + lote do dono.

### PR-2 — um extrator no front (= **BRD F-73.1**). Base: `main` **depois** do PR-1 e de #1202, #1204, #1206. **Entra antes de qualquer lote.**
2.1 `my-app/lib/api/apiError.ts`: `readApiError(e: unknown) → { message, code?, status?, fieldErrors? }` que lê o envelope novo
    **e** os formatos 1, 2, 2', 3 e 4 (tolerant reader). Teste vitest com um corpo real de cada formato (copiado de resposta de
    teste do servidor, não sintético — memória "Sintético ≠ formato real").
2.2 Validação: com `code === 'VALIDATION_ERROR'` e `details.kind === 'validation'`, a mensagem é a humanizada (`humanizeZodFlatten`),
    não o `message` genérico do servidor. Teste.
2.3 `apiClient`: `extractErrorMessage` delega ao `readApiError`; o `Error` lançado carrega a mensagem humanizada mesmo quando o corpo
    tem `message` (§1.2, `Object.assign` sobrescreve). Teste no `api-client-request.test.ts`.
2.4 `resolveError`/`resolveErrorWithCode` e `resolveErrorMessage` passam a ser fachadas finas do `readApiError` (ordem única). Teste:
    o mesmo corpo dá a mesma mensagem pelos três nomes. Os importadores (81 + 18 arquivos) não mudam neste PR.
2.5 As três cópias do parse de upload (`multipart.ts:28`, `dataExchange.service.ts:94`, `crm.service.ts:75`) viram uma. Teste.
2.6 Os demais extratores da §1.2 delegam ao `readApiError` ou são removidos se ficarem idênticos; `classifyCreationError` passa a ler
    `code` (hoje lê `errorCode`). Teste por arquivo tocado.
2.7 Os ramos por `code` (`ChargeReceivableModal`, `PaymentProviderPanel` e os 36 arquivos com `.code ===`) seguem funcionando: teste
    dos dois componentes com corpo no envelope novo.
Gates: `cd my-app && npx tsc --noEmit`; `npm run test:types`; `npx vitest run <arquivos>`. Telas atrás de `withAuth`: conferência
em build de produção só se o PR mudar componente de tela (2.7).

### PR-3..PR-9 — migração dos controllers, um lote por domínio (F-ENV-8 = a). Base de cada um: `main` depois de PR-1 e PR-2. Lotes independentes entre si.
Em cada lote, por handler: `safeParse` + `return res.status(400).json(...)` → `parseOrThrow(...)`; `bad(res, x)` removido com o
helper local; `if (!user) return res.status(401)…` → `requireUser(req)`; `res.status(4xx).json({ success:false, error:'<texto>' })`
→ `throw new <AppError adequado>(texto)` (`ValidationError`, `NotFoundError`, `ForbiddenError`…). Sítio fora de `try` (lista do
censo 1.13): ganha `try/catch → handleApiError` no mesmo diff, nunca `throw` solto. Testes do domínio que leem `body.error` ou
`fieldErrors` passam a ler o envelope.

| PR | Lote | Controllers (contagem `flatten`/`401` [GREP], refeita no censo) | ZP? |
|---|---|---|---|
| PR-3 | tributos | simples 34/19, lalur 16/16, taxAssessment 8/8, taxOptimization 10/8, taxSimulation, ibsCbsAssessment, interestOnEquity, profitDistribution, withholding, withholdingProfile, reinfBatch, mitExport, sped, partner, issBeneficioMunicipal | não |
| PR-4 | contabilidade | accounting 25/0, accountingReview, accountingDelivery, accountingPolicyVersion, accountantAssignment, accountingContact, accountingKit, accountingSettings, accountingBinding, closing, entryApproval, dimension, referentialCatalog, referentialMapping, depreciationRate, fixedAsset, fixedAssetClass, legalParameter, sourceDocument, documentAttachment | não |
| PR-5 | financeiro | payable, receivable, bankSettlement, counterparty, reconciliation, reconcilePending, dataExchange; **collectionCharge, paymentAccount** | parcial (pagamento) |
| PR-6 | fiscal | fiscalDocument 26/16, fiscalProfile, productFiscalProfile, serviceFiscalProfile, serviceFiscalSuggestion, servicoFiscalAvaliacao, productDestination, nfceContingencia, nfceCsc; **nfe, companyFiscalProfile, companySigner, dfeSigner, pscCredential, fiscalCertificate** | sim (assinatura/transmissão) |
| PR-7 | DynamicTable, CRM, vendas, painel | dynamicTables, dynamicTableVersions, crm, crmReports, sales, packageAcceptance, packageBalance, savedViews, dashboard, dashboardLayout, analytics, analyticsDefinitions, attachments, documents | controllers não são o motor; `SchemaValidator.ts` fica fora |
| PR-8 | DP | dpModule, dpLancamento, dpAfastamentoFerias, dpCadastros, dpDependente, dpVinculo, dpRubrica | não |
| PR-9 | plataforma | user, chat, chatInstances, chatMessages, interview, llmCredential, teammate, kitRoleOverride, kitUpgrade; **auth, authUtility** | sim (auth) |

Gate de cada lote: `npx tsc --noEmit`; os testes do domínio com escopo (`npm run test:changed` no unit; integração um arquivo por vez);
o censo do 1.13 restrito aos arquivos do lote dá zero formato 1/2.

### PR-10 — BRD F-04.3 (item próprio). Base: `main` depois do PR-4 (mesmo arquivo).
10.1 `accountingController.ts:546-551`: o `parseInt(req.query.year) + throw new ValidationError` vira campo do schema de query do
     handler. Teste: `year=abc` e corpo inválido no mesmo handler saem com o **mesmo** envelope `VALIDATION_ERROR` e `details`.
10.2 Outros "validação à mão ao lado do schema" que o censo achar no caminho entram como achado fora de escopo, não neste PR.

### PR-11 — contrato fechado. Base: `main` depois de PR-3..PR-10.
11.1 Espelho `error` removido (se F-ENV-3 = b). Pré-condição medida: grep em `my-app/` sem leitor de `.error` de corpo de API fora do
     `readApiError`.
11.2 `readApiError` perde os ramos dos formatos 1, 2, 2' e 4 (os de exceção F-ENV-7 ficam, se algum cliente do `my-app` os ler).
11.3 Guarda de regressão (só se F-ENV-9 = a).
11.4 Censo final: zero `.flatten()` e zero `res.status(4xx|5xx).json(` em `controllers/**` fora das exceções.

## 5. Insumos ausentes (registrados, não varridos)

- **Clientes do corpo de erro fora do `my-app`:** o assinador local (cliente do `dfeSignerDeviceAuth` e das rotas de dispositivo),
  provedor de pagamento e PSC. Não li o código do assinador; o F-ENV-7 recomenda deixá-los fora até alguém ler.
- **Os 12 extratores da ficha BRD-73** vieram da coleta, não reabertos; a lista da §1.2 é a que esta sessão localizou por grep de
  nome e pode não bater um a um com a da ficha.
- **Contagem exata por lote:** os números da §4 são grep de linha; `bad(` e handlers montados por fábrica (`crud({...})` no DP,
  `handler(schema, …)` no `taxSimulationController`) não aparecem como `.flatten()` por sítio. O censo AST do 1.13 fixa o denominador.
- **Corpo do 429:** que o `express-rate-limit` responde texto puro é inferência da configuração (`app.ts:63-69`), não executado.

## 6. Pendente de validação externa

Nenhuma. O item não depende de regra contábil, fiscal ou legal.

## 7. Achados fora de escopo (não planejados)

- `rawError`/`stack` no corpo do 500 com `NODE_ENV=development` (`apiUtils.ts:66-68`): depende do BRD F-03.4 (`NODE_ENV` ausente).
- `prismaCode` por duck typing (`apiUtils.ts:24`) trata qualquer erro com `code` P2002/P2025 como Prisma (ficha BRD-01, "confiança indevida").
- BRD F-01.2 (`headersSent` no handler global) mexe no mesmo `app.ts:114-116`: se entrar antes do PR-1, o PR-1 rebaseia.
- Mensagens de erro misturam inglês e português (`'Validation failed…'`, `'Route not found'` × textos dos controllers e do #1189).
- `ErrorBoundary` mostrando a pilha (BRD F-73.3, Produto) e os `catch` que engolem falha (BRD F-73.2, #1206).
- Catálogo fechado de `code` (se F-ENV-6 = a).

## 8. Como F-04.3 e F-73.1 entram

- **BRD F-73.1 = PR-2**, e entra **antes** da migração, não depois: é o *expand* do *expand → contract*. Sai do bloqueio quando o
  dono ratificar F-ENV-1, F-ENV-2 e F-ENV-3 (são os que fixam o que o front lê) e o PR-1 estiver na `main`.
- **BRD F-04.3 = PR-10**, depois do lote de contabilidade (PR-4), porque o handler citado está no `accountingController.ts`. Sai do
  bloqueio com F-ENV-2 e F-ENV-4 ratificados.
- Os dois seguem como linhas próprias do `CORRECOES.md` (um PR por item); a atualização daquele arquivo é da sessão de orquestração.
