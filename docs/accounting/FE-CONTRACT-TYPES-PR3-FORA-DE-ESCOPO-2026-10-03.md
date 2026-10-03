# FE-CONTRACT-TYPES PR-3 — achados fora de escopo (03/10/2026)

> **Status:** inventário, sem decisão. Nada aqui foi feito no PR-3 (#485): o §8 do
> [`PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](PLANO-FE-CONTRACT-TYPES-2026-09-28.md) limita a migração a 7 services
> e manda classificar as rotas que o mapeador não resolve. Cada item abaixo precisa de autorização do dono antes de
> virar trabalho (ORCH-006). Origem: a sessão `sessao-feature` do PR-3 + a rodada 1 do review independente.
>
> **Já resolvido no PR-3 (não é pendência):** `POST /dashboard/create` tinha um 2º chamador (`useAiInterview.ts`) que manda
> `fiscal`, aceito só pelo controller. Dono, 03/10: **opção 1**. `CreateDashboardPayload` ganhou a extensão explícita D9
> (`UnifiedCreationInput & { fiscal?: OnboardingFiscalInput }`, com `// ponytail:`), `useAiInterview` monta o body como
> literal anotado e `FiscalOnboarding`/`RegimeOnboarding` deixaram de ser espelho à mão (aliases do `.gen.ts`).

## 1. Chamadores com body por `fetch` cru, fora de `lib/services`

O `tsc` do FE não morde nestes: o DTO muda, o `.gen.ts` muda, e o chamador segue compilando. Os domínios abaixo **já têm**
`.gen.ts` (exceto onde indicado).

| Arquivo:linha | Rota | Tipo gerado disponível | Observação |
|---|---|---|---|
| `components/widgets/dashboard-grid/dashboard-layout.api.ts:37` | `POST /dashboard-layout` `{ name, type: 'GRID', config }` | `dashboardLayout/DashboardLayoutDto.gen` → `CreateDashboardLayoutInput` | `config` é JSON livre (G12/D10: o tipo gerado é frouxo ali) |
| `…/dashboard-layout.api.ts:46`, `:55` | `PATCH /dashboard-layout/:id` `{ config }` / `{ name }` | `UpdateDashboardLayoutInput` | |
| `…/dashboard-layout.api.ts:64` | `POST /dashboard-layout/:id/activate` | — | sem body |
| `components/widgets/chat/hooks/useChatInstance.ts:100` | `POST /chat-instances/get-or-create` | `chatInstances/ChatInstanceDto.gen` → `GetOrCreateChatInstanceInput` | |
| `components/widgets/shared/hooks/useChatInstance.ts:102` | idem | idem | |
| `components/widgets/shared/hooks/useChatInstances.ts:211` | `PUT /chat-instances/:id` `{ title }` | `UpdateChatInstanceInput` | |
| `components/widgets/chat/hooks/useChatMessages.ts:109` | `POST /chat` | `chat/ChatDto.gen` → `ChatRequestInput` | este não manda `confirmedProposalId`; o do `shared/` manda |
| `components/widgets/shared/hooks/useChatMessages.ts:90` | `POST /chat` | idem | |
| `features/interview/hooks/useAiInterview.ts:53`, `:137` | `POST /dashboard/ai/ChatInterview` | **nenhum** | o Zod (`ChatInterviewSchema`, `MessageSchema`) é local de `controllers/interviewController.ts`, fora de `dtos/` |
| `features/interview/components/RightSidebar/AIChatMode.tsx:110`, `:176` | `POST /dashboard/ai/CustomizeFields` | **nenhum** | **a rota não existe no servidor**: `grep -rn CustomizeFields server --include=*.ts` não acha nada, e `routes/dashboard.ts` só monta `/ai/ChatInterview`. Só o FE cita |
| `features/dev/seed/utils/ApiClient.ts`, `scripts/verify-crud.ts` | várias | — | ferramentas de desenvolvimento; não avaliadas |

Duas preocupações que valem para a decisão: (a) `POST /chat` e o `get-or-create` mexem com o chat do produto, então a mordida
(vermelho → verde) precisa de teste de widget; (b) `AIChatMode` chama uma rota que responde 404 hoje (o componente trata 404 como
"sessão não encontrada"): migrar o body sem antes saber se o componente é código morto seria tipar uma chamada que nunca funciona.

## 2. Zod fora de `dtos/` — o snapshot não vê

O coletor só enxerga `src/features/*/dtos/`. Schemas definidos em controllers ficam sem JSON, sem `.gen.ts` e sem gate:

- `controllers/interviewController.ts`: `MessageSchema`, `ChatInterviewSchema` (inclui `choice`, W3).
- `controllers/dashboardController.ts:22-25`: `UnifiedCreationSchema = z.union([Quick.extend({ fiscal }), Custom.extend({ fiscal })])`.
  Os dois ramos e o `OnboardingFiscalSchema` estão em `dtos/` e são cobertos; **a composição `.extend({ fiscal })` não**. Se alguém
  tirar o `fiscal` do controller, o FE continua mandando e o tipo estendido (D9) mente. A extensão do FE é a única descrição
  do fio.

Mover esses schemas para `dtos/` é mudança de servidor (e entra no snapshot): não é do PR-3.

## 3. Rotas de escrita sem chamador no FE (têm `.gen.ts`, nada para tipar)

`POST /documents/search`, `PATCH /documents/:id`, `POST /dashboard/modules/install`. Se uma tela passar a chamá-las, o tipo já existe
(`documents/DocumentDto.gen`, `dynamicTables/InstallModule.dto.gen`).

## 4. Onde o contrato gerado ainda não morde, mesmo nos 7 services

- **Argumento por variável:** o TS só checa chave extra em literal. `AuthService.signup(formData)` e `login(formData)` recebem o
  estado do formulário (variável); hoje o estado tem exatamente as chaves do DTO e o servidor descarta o excedente
  (`z.object` não é `.strict()` em `UserDto`). O mesmo vale para qualquer service que receba um objeto montado antes. A forma
  que morde é a do §9 (literal anotado ou função de retorno declarado).
- **Refinamentos invisíveis:** `LoginSchema` (`identifier|username|email` obrigatório um dos três) e `RegisterPaymentSchema`
  (`packageId` XOR `Package Balance`) são `.refine`/`.superRefine`; o tipo gerado deixa os três opcionais e o `packageId` livre.
  Limite já declarado no cabeçalho do `dtoShapeSnapshot` e no PRE-ADR.
- **Cast de folha em `updatePreferences`:** 3 chamadas (4 casts) passam `string` onde o contrato quer `'en'|'pt'` / `'BRL'|'USD'|'EUR'`
  (Navbar, `CurrencyContext`, `profile.tsx`). Cast com `// ponytail:`; a origem (tipar `locale`/`currency` do contexto) é de outra frente.

## 5. Efeitos operacionais do PR-3

- **PR concorrente que muda DTO não contábil** passa a precisar de `UPDATE_DTO_SNAPSHOT=1` e dos `.gen.ts`/JSON no mesmo PR; senão a
  CI do server reprova. Vale avisar as sessões em andamento.
- **GAP-MAP**, linha "Evolução assimétrica": ainda diz "demais domínios no PR-3". Atualizar no fold pós-merge (o §8 não lista a edição).
- **Fim de linha no Windows:** `core.autocrlf=true` faz o `git diff` mostrar os JSON/`.gen.ts` como modificados mesmo com sha256
  idêntico; o `.gitattributes` fixa LF só para `my-app/types/contracts/**/*.gen.ts`, não para os `__dto-shapes__.json`.
- **Suíte unit do server em máquina carregada:** 8 suítes (OOM do worker, `UNKNOWN: open`, hook de 60 s em SQLite real) falharam
  quando rodaram em paralelo com o `next build`; isoladas, passam. `renameDataMigrationGuard` leva 41 s sozinha contra um limite de
  60 s: candidata a flake em CI lenta.
- **Linux:** tudo foi medido no Windows; a CI é a prova do Linux.

## 6. Já registrado em outros lugares (não repetir)

Query strings e tipos de resposta (D11), OpenAPI × Zod (GAP-MAP, G17), `openPeriod` sem DTO (GAP-MAP, G13), FE-INCR-FIXED-ASSETS
sem `autorizacao` (plano §12).
