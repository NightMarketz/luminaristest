# BRIEF — FE-INCR-WIZARD-HYGIENE (nó W7): higiene do FE do wizard de onboarding

- **Nó:** [W7](../plano/nos/W7.md) — Higiene do FE do wizard (`/dashboard/setup`: Rápido · Controle Total · Entrevista com IA).
- **Autorização:** dono, chat, 2026-10-15 — *"Autorizo planejar o BRIEF do W7 — sessao-planejamento, sem código,
  sem 'executa'"*. Cobre **este BRIEF**, não a execução: implementar exige "executa" do dono.
- **Forks:** F-W7-1..3 **ratificados** no questionário de 2026-10-15 (pela recomendação) →
  [`D-2026-10-15-W7-HIGIENE-WIZARD`](../plano/decisoes/D-2026-10-15-W7-HIGIENE-WIZARD.md).
- **Origem:** plano em grafo de 07/09, [`ONBOARDING-WIZARD-plano-grafo-brief.md`](ONBOARDING-WIZARD-plano-grafo-brief.md)
  §2 "W7" (achados sup. 17–21); nó criado pela decisão 12/18 de `D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE`.
- **Sessão executora:** `sessao-feature`, **3 PRs** (F-W7-3): PR-1 comportamento → PR-2 i18n + paleta fora do
  painel direito → PR-3 painel direito, **só depois do merge do W6** (F-W7-1).
- **Tamanho:** M (cerca de 15 arquivos + 2 JSON de locale). Risco baixo: FE puro, sem contrato de API novo.

## Estado de partida — medido no código em 2026-10-15 (`main` 8ba1ed8f)

| Achado (nota W7 / plano 07/09) | Onde | Confirmado? |
|---|---|---|
| Saudação em dobro (StrictMode) | `my-app/next.config.js:5` `reactStrictMode: true`; `useAiInterview.ts:56-78` — `useEffect([])` faz `POST /dashboard/ai/ChatInterview {stage:'GREETING'}` **sem guarda nem cleanup** → em dev o efeito roda 2× e chama o modelo 2×; `setMessages([...])` substitui, então o que se vê depende da ordem de chegada. Em build de produção roda 1× | **Sim (leitura)**; o "2 bolhas" de 07/09 não foi reproduzido hoje (inferido: `setMessages` substitui, então hoje é chamada dupla ao modelo, não necessariamente bolha dupla) |
| Botão Debug | `AiInterviewSetup/index.tsx:151-156` → `logState` (`useAiInterview.ts:92-103`) faz `console.log` de conversa + estado de customização | **Sim** |
| Strings PT fixas | `AiInterviewSetup/index.tsx:150` ("Entrevista com IA"), `:116,135` (aria-labels); `CreationArea.tsx` (4 textos + "Tentar novamente"); `InputArea.tsx:28` placeholder; `CreatingAnimation.tsx`; `LeftSidebar/index.tsx:42` ("Campos: ") e cabeçalhos; `useAiInterview.ts:72,121,122,132,186` (mensagens de erro); `TotalControlSetup.tsx:167,199,211,225,267,270,283,288,328,330,337,391,394`; `QuickSetup.tsx:58,79,171`; `RightSidebar/*` (AIChatMode ~25, index ~20, NewFieldForm ~7, FieldItem ~2) | **Sim** (contagem por grep, ordem de grandeza) |
| Retry recarrega a página | `useAiInterview.ts:254-256` `handleRetry = () => window.location.reload()` — perde a conversa; a sessão do servidor vive num `Map` em memória (W4) | **Sim** |
| Classes fora do padrão | `gray-*` em `AiInterviewSetup/*`, `LeftSidebar`, `RightSidebar/*`, `CreatingAnimation`, `setup.tsx:50,59-60`; `slate-*` em `QuickSetup`, `TotalControlSetup`, `setup.tsx:71-121`. Regra: `my-app/CLAUDE.md` item 2 (`neutral-*`; cards `rounded-2xl`/`3xl`) — o card do chat é `rounded-xl` (`index.tsx:148`) e o modal de criação `rounded-lg` (`CreationArea.tsx:17`) | **Sim** |
| Hidratação Navbar/tema em carga direta de `/dashboard/setup` | fora do wizard (Navbar) | **Não medido** — fora de escopo desde 07/09 (ver "Achados fora de escopo") |

**Servidor (fato consumado que o retry usa):** `POST /dashboard/create` → `SystemProvisioningService.assertCanProvision`
(`server/src/features/onboarding/services/SystemProvisioningService.ts:88-93`) devolve **403** se o usuário já tem
tabelas (one-shot); falha no meio da provisão devolve **500** com `errorCode` `ONBOARDING_ROLLED_BACK` (compensado:
repetir é seguro) ou `ONBOARDING_ROLLBACK_FAILED` (estado parcial) — `dashboardController.ts:97-106`,
`lib/errors.ts:421-424`.

## Insumos lidos

| Artefato | O que fixa |
|---|---|
| `my-app/features/interview/hooks/useAiInterview.ts` | estado do chat, `handleCreateSystem(key, conversa, fiscal)`, `confirmarFiscal`, `handleRetry`, `logState` |
| `my-app/features/interview/components/AiInterviewSetup/{index,CreationArea,ChatArea,InputArea}.tsx` | casca do chat, botão Debug, modal de criação/erro |
| `my-app/features/interview/components/AiInterviewSetup/{FiscalQuestion,CreationChoice}.tsx` | **precedente já limpo**: `useTranslation('common')`, `neutral-*`, `rounded-2xl` — padrão a copiar |
| `my-app/features/interview/setup/{QuickSetup,TotalControlSetup,CreatingAnimation}.tsx`, `my-app/pages/dashboard/setup.tsx` | modos Rápido e Controle Total, página (namespace `common` via `serverSideTranslations`) |
| `my-app/features/interview/components/{LeftSidebar,RightSidebar}/*` | painéis de customização (o direito é do W6/W1 — F-W7-1) |
| `my-app/features/interview/hooks/__tests__/useAiInterview*.test.tsx` | harness vitest do hook (`fetchMock`, `toHaveBeenCalledTimes`) — base dos testes novos |
| `my-app/public/locales/{pt,en}/common.json` | namespace que recebe as chaves (510/511 linhas) |
| `server/.../SystemProvisioningService.ts`, `dashboardController.ts` | semântica de erro do create (acima) |

## 1. Checklist de comportamentos

Cada item é testável sozinho (vitest em `my-app/features/interview/**/__tests__/`, shim de `React` global —
`my-app/CLAUDE.md`). Teste novo nasce **vermelho contra `main`** e fica verde com o diff.

### PR-1 — comportamento (`useAiInterview.ts`, `AiInterviewSetup/index.tsx`, `CreationArea.tsx`)

1. **Saudação uma vez só, inclusive em StrictMode.** O efeito do `GREETING` ganha guarda: `AbortController` no
   cleanup (a 1ª montagem do StrictMode é abortada) **ou** `useRef` de "já pediu". Recomendação de implementação:
   `AbortController` — também cancela a chamada se o usuário sair da aba antes da resposta; `AbortError` não vira
   mensagem de erro. *Teste:* `renderHook(useAiInterview, { wrapper: React.StrictMode })` → exatamente **1** `fetch`
   com `stage:'GREETING'` concluído e `messages.length === 1`. (Hoje: 2 chamadas → vermelho.)
2. **Sem botão Debug nem `logState`.** Remove o botão (`index.tsx:151-156`) e `logState` do hook e do retorno.
   Decisão direta (D1): é ferramenta de dev que vaza a conversa no console; quem precisa depurar usa o React
   DevTools. *Teste:* render de `AiInterviewSetup` → `queryByRole('button', { name: /debug/i })` é `null`.
3. **Retry reenvia o último pedido, sem recarregar (F-W7-2 ratificado).** `handleCreateSystem` guarda numa ref o
   último `{ key, conversa, fiscal }`; `handleRetry` chama `handleCreateSystem` de novo com ele. **Nunca**
   `window.location.reload()`. *Teste:* 1º `POST /dashboard/create` → 500 `ONBOARDING_ROLLED_BACK`; clique em
   "Tentar novamente" → 2º POST com **o mesmo corpo** (deep-equal), `window.location.reload` não chamado, e
   `messages` preservado.
4. **Erro classificado decide se o retry existe.** O hook passa a guardar `creationError` como objeto
   `{ kind, message }` (contrato §2):
   - `retryable` — rede, 5xx sem `errorCode` e `ONBOARDING_ROLLED_BACK` → mostra "Tentar novamente";
   - `partial` — `ONBOARDING_ROLLBACK_FAILED` → **sem** retry; mensagem de "fale com o suporte";
   - `already-provisioned` — **403** → sem retry; mensagem "seu sistema já foi criado" + botão que leva a
     `/dashboard` (o one-shot já garante que não se cria duas vezes; um 403 aqui quase sempre é tentativa anterior
     que deu certo e cuja resposta se perdeu — inferido, não medido).
   - `invalid` — 400 → sem retry (o mesmo corpo daria 400 de novo); mensagem genérica + "Voltar à conversa"
     (fecha o modal, conversa intacta).
   *Teste:* um caso por `kind` (4), checando presença/ausência do botão e o destino.
5. **"Voltar à conversa" não perde nada.** Nos `kind` sem retry que ficam no wizard (`invalid`), o botão limpa
   `creationError`, mantém `messages` e devolve a `FiscalQuestion`/`InputArea` ao estado anterior ao create.
   *Teste:* após 400 → clicar "Voltar à conversa" → `messages` igual ao de antes do create.

### PR-2 — i18n + paleta no wizard, **fora** de `RightSidebar/*`

6. **Toda string visível passa por `t()`.** Arquivos: `AiInterviewSetup/{index,CreationArea,InputArea,ChatArea}.tsx`,
   `CreatingAnimation.tsx`, `LeftSidebar/index.tsx`, `QuickSetup.tsx`, `TotalControlSetup.tsx`, `setup.tsx` e as
   mensagens de erro de `useAiInterview.ts` (`:72,121,122,132,186`). Inclui `aria-label` e `placeholder`.
   Namespace **`common`** (já carregado por `setup.tsx:138`; decisão direta — namespace novo exigiria entrar no
   `ns` do SSR no mesmo PR, memória do #551). Chaves **planas** com prefixo `onboarding` (contrato §3), como o precedente do mesmo wizard (`choice*`, `fiscal*`, `onboardingAccountingDraftTitle`); **não** usar o objeto `wizard` já existente em `common.json` (`wizard.basic_info`… — é dos passos do `WizardModal`, outra coisa).
   *Teste:* render em `en` de `CreationArea` (erro) e `AiInterviewSetup` → nenhum texto da lista PT do contrato §3
   aparece; mais o gate de paridade (item 9).
7. **Mensagem de erro do servidor não é traduzida, a nossa é.** Quando o corpo traz `error`/`message`, ele é exibido
   como veio (é texto do servidor); os fallbacks locais (`'Não foi possível criar o sistema.'` etc.) viram chaves.
   *Teste:* 500 sem corpo → texto da chave `onboardingErrorCreateFailed` no idioma ativo.
8. **Paleta e cantos no padrão.** `gray-*`/`slate-*` → `neutral-*` (mesmo tom: `gray-500`→`neutral-500` etc.);
   cards do chat e do modal de criação → `rounded-2xl`. `blue-*`/`emerald-*`/`red-*` de destaque ficam (não são
   neutros). *Teste:* gate estático no próprio PR — `rg -n "\b(gray|slate|zinc)-[0-9]" my-app/features/interview my-app/pages/dashboard/setup.tsx --glob '!**/RightSidebar/**'`
   → **0 linhas**.
9. **Paridade pt/en.** Toda chave nova existe nos dois `common.json`. *Gate:* o checador de paridade i18n do
   `skill-audit` (`.claude/skills/skill-audit/check-i18n-keys.mjs`, chamado pelo `wiring` em `skill-audit.mjs:835`)
   sai 0.

### PR-3 — painel direito (`RightSidebar/*`), **só após o merge do W6** (F-W7-1)

10. **Mesma higiene (itens 6–8) no que o W6 deixar de pé.** Se o W6 escondeu/removeu o modo IA (`AIChatMode`), o
    PR-3 cobre só os arquivos que restaram; se o W6 o manteve, cobre todos. O gate do item 8 roda **sem** o
    `--glob '!**/RightSidebar/**'`. *Pré-condição de abertura:* `git log origin/main --grep "W6"` mostra o merge
    do W6; sem ele, o PR-3 não abre (registrar no `estado_detalhe`).
11. **Paridade pt/en** das chaves do painel (item 9).

### Fechamento (cada PR)

12. **Gates:** `cd my-app && npx tsc --noEmit` e `npm run test:types`; vitest da pasta `features/interview`;
    `npm run check:arch` (não pode crescer o baseline); `npm run build` (a página está atrás de auth via
    `useAuth` — verificar em **build de produção**, `my-app/CLAUDE.md` item 4).
13. **Sign-off de browser humano** (gate humano, sem sessão de agente): runbook
    `docs/accounting/RUNBOOK-W7-HIGIENE-WIZARD.md` no formato `RUNBOOK-FORMAT.md`, preparado no PR-1 e completado
    no PR-2/PR-3 — passos: carga da Entrevista (1 saudação), ausência do Debug, falha forçada do create (servidor
    parado → retry; usuário com tabelas → 403 → `/dashboard`), troca para `en` nas 3 abas, modo escuro. Agente
    prepara; evidência/desfecho/assinatura são do dono.
14. **Fold** no próprio PR: `node scripts/plano-vault.mjs fold W7 --pr <n>` (PR-3 com `--estado done`, ou o último
    PR que fechar o nó) + `estado_detalhe` à mão + `check` saindo 0.

## 2. Contratos (esboço materializável — tipos locais do FE, nenhum DTO de API muda)

```ts
// my-app/features/interview/types/InterviewTypes.ts (acréscimo)
export type CreationErrorKind = 'retryable' | 'partial' | 'already-provisioned' | 'invalid';
export interface ICreationError {
  kind: CreationErrorKind;
  /** texto do servidor quando veio; senão já traduzido via t() */
  message: string;
}

// classificação pura (testável sem render) — useAiInterview.ts ou setup/classifyCreationError.ts
export function classifyCreationError(
  status: number | null,               // null = falha de rede (fetch rejeitou)
  body: { errorCode?: string } | null,
): CreationErrorKind {
  if (status === 403) return 'already-provisioned';
  if (status === 400) return 'invalid';
  if (body?.errorCode === 'ONBOARDING_ROLLBACK_FAILED') return 'partial';
  return 'retryable'; // rede, 5xx, ONBOARDING_ROLLED_BACK
}

// useAiInterview — retorno muda:
//   - remove: logState
//   - creationError: string | null  →  ICreationError | null
//   + backToConversation: () => void          // item 5
//   handleRetry: () => void  (mesma assinatura; agora reenvia o último pedido)
const lastCreateRequest = useRef<{ key: string; conversa: IMessage[]; fiscal: FiscalOnboarding } | null>(null);

// CreationArea props:
interface CreationAreaProps {
  isCreating: boolean;
  creationError: ICreationError | null;
  onRetry: () => void;               // só renderizado em kind === 'retryable'
  onBackToConversation: () => void;  // kind === 'invalid'
  // 'already-provisioned' → <Link href="/dashboard">; 'partial' → só texto de suporte
}
```

## 3. Chaves i18n (namespace `common`, chaves planas com prefixo `onboarding` — lista mínima; o executor completa com o grep do item 6)

```jsonc
{
  "onboardingInterviewTitle": "Entrevista com IA",          // en: "AI interview"
  "onboardingInterviewInputPlaceholder": "Digite sua resposta...",
  "onboardingShowFeaturesPanel": "Mostrar painel de funcionalidades",
  "onboardingHideFeaturesPanel": "Ocultar painel de funcionalidades",
  "onboardingShowCustomizePanel": "Mostrar painel de customização",
  "onboardingHideCustomizePanel": "Ocultar painel de customização",
  "onboardingGreetingFailed": "Olá! Houve um problema ao iniciar. Por favor, recarregue a página.",
  "onboardingTurnFailed": "Desculpe, ocorreu um erro de comunicação.",
  "onboardingCreatingTitle": "Criando seu projeto",
  "onboardingCreatingWait": "Aguarde enquanto configuramos seu projeto. Isso pode levar alguns instantes...",
  "onboardingErrorTitle": "Erro ao criar projeto",
  "onboardingErrorCreateFailed": "Não foi possível criar o sistema.",
  "onboardingErrorUnexpected": "Ocorreu um erro inesperado.",
  "onboardingErrorPartial": "A criação parou no meio e não pôde ser desfeita. Fale com o suporte antes de tentar de novo.",
  "onboardingErrorAlreadyProvisioned": "Seu sistema já foi criado.",
  "onboardingRetry": "Tentar novamente",
  "onboardingGoToDashboard": "Ir para o painel",
  "onboardingBackToConversation": "Voltar à conversa",
  "onboardingFeaturesPanelFields": "Campos: ",
  "onboardingTotalControl…": "… (12 textos de TotalControlSetup.tsx listados no estado de partida)",
  "onboardingQuick…": "… (3 textos de QuickSetup.tsx)"
}
```

Chave existente que já cubra o texto (ex.: `loading`, usada em `QuickSetup.tsx:89`) é **reusada**, não duplicada.

## 4. Forks

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-W7-1** · painel direito × W6/W1 | (a) incluir em PR próprio **após o merge do W6**; (b) excluir do W7 (W6/W1 adotam); (c) incluir já | (a) — cobre tudo sem conflito de arquivo e não traduz tela que o W6 pode apagar | **RATIFICADO (a)** — dono, 2026-10-15 |
| **F-W7-2** · semântica do retry | (a) reenviar o mesmo pedido, com `ROLLBACK_FAILED`/403 sem retry; (b) voltar ao chat e reconfirmar; (c) manter o reload | (a) — conversa preservada, sem chamada extra ao modelo, erro parcial tratado | **RATIFICADO (a)** — dono, 2026-10-15 |
| **F-W7-3** · forma de execução | (a) FE-INCR em 2–3 PRs; (b) instrumentação → correção por item; (c) PR único | (a) — revisável por PR, cerimônia proporcional ao risco (OPS-006) | **RATIFICADO (a)** — dono, 2026-10-15 |

Decisões diretas (D1, registradas para não virar improviso do executor): `AbortController` no item 1; remover o
Debug em vez de escondê-lo atrás de `NODE_ENV` (item 2); 400 sem retry e 403 → `/dashboard` (item 4, derivado do
F-W7-2 (a)); namespace `common` (item 6).

**Nenhum fork pendente.**

## 5. Pendente de validação externa

Nenhum — o item não toca regra contábil, fiscal ou legal. O único oráculo é o **sign-off de browser** (item 13),
que é gate humano.

## 6. Insumos ausentes

- **Reprodução do "saudação em dobro" visível.** Não reproduzido em browser nesta sessão; o que a leitura prova é a
  chamada dupla ao modelo em dev. O teste do item 1 cobre as duas formas (contagem de `fetch` e de `messages`).
- **Resultado do W6** (o que sobra de `RightSidebar/*`) — por desenho: define o escopo exato do PR-3.

## 7. Achados fora de escopo (não planejados — frente nova exige autorização)

1. **Hidratação Navbar/tema na carga direta de `/dashboard/setup`** (achado sup. 21 do plano de 07/09) — é da Navbar,
   não do wizard. Não medido hoje.
2. **`CreationArea` é overlay bespoke**, não o `components/ui/Modal.tsx` canônico (o W3 FE usou o canônico). Trocar é
   reuse, não higiene — candidato a item do próprio W7 numa emenda, se o dono quiser.
3. **`setup.tsx` não usa `withAuth`**: faz a guarda à mão com `useAuth` + `router.replace('/users/login')`. Divergência
   do padrão de página autenticada; fora do W7.
4. **`fetch` cru com `Authorization` montado à mão** em `useAiInterview.ts` (3 lugares) em vez de um serviço de
   `lib/services/` — mesma classe que gerou o 401 do N0. Fora do W7.
