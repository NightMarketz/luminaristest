# BRIEF (ESBOÇO) — W3 F-W3-1: confirmação do resumo do negócio sem `=== 'true'`

> **ESBOÇO — não executável.** A autorização de 15/10 cobre **decidir** o F-W3-1 e esboçar este BRIEF, não
> implementar (sem "executa"). A `sessao-feature` só roda depois de nova autorização citável do dono **e** da
> ratificação dos forks F-W3-C1..C3 (§3).

- **Nó:** [W3](../plano/nos/W3.md) — Gates determinísticos da entrevista (parte F-W3-1).
- **Autorização:** dono, 2026-10-15, chat — *"Prepara a decisão do F-W3-1 (W3, gates determinísticos da entrevista)
  — sessao-planejamento, sem código"*. Decisão: [`D-2026-10-15-W3-CONFIRMACAO-RESUMO`](../plano/decisoes/D-2026-10-15-W3-CONFIRMACAO-RESUMO.md)
  — F-W3-1 = **(c) botões + classificação estruturada (3 saídas)**; negar **refaz o resumo**; `IDENTIFYING_ENTITIES`
  **entra junto**.
- **Estado de partida (fato consumado, `origin/main` 8ba1ed8f):** parte (b) do W3 mergeada (#455 BE, #477 FE) —
  `choice` enum no corpo, `choicePrompt { kind: 'creation_type', reason }` na resposta, componente `CreationChoice`.
- **Sessão executora (quando autorizada):** `sessao-feature`, dois incrementos seriais: **BE** (itens 1–8) → **FE**
  (itens 9–13). O BE sozinho já fecha o defeito (o texto deixa de depender de `'true'` literal).

## Insumos lidos

| Artefato | O que fixa |
|---|---|
| `server/src/features/interview/InterviewService/InterviewService.ts:130-160` | turno de estágio processável: resposta da IA, depois 2ª chamada com `completionCheckPrompt` e `checkResult?.toLowerCase() === 'true'` (l. 144), compartilhada por `CONFIRMING_BUSINESS` e `IDENTIFYING_ENTITIES`; ao completar, `processTurn(config.nextStage)` na hora (a resposta de reconhecimento é descartada) |
| `server/src/features/interview/InterviewService/PromptConfig.ts:21-31` | `CONFIRMING_BUSINESS.systemPrompt` só reconhece ("Obrigado"); `completionCheckPrompt` pede `'true'`/`'false'`; idem `IDENTIFYING_ENTITIES` ("pelo menos duas entidades") |
| `server/src/lib/openai/OpenAIService.ts:72-96, 241-259` | canônico `classifyIntoEnum(input, systemPrompt, options)` — `json_schema` strict, `gpt-4o-mini`, devolve uma das `options` ou `null`; **erro da API sobe** ao chamador |
| `server/src/controllers/interviewController.ts:21-28` | `ChatInterviewSchema` com `choice: z.enum(['create','customize']).optional()` |
| `server/src/features/interview/models/InterviewTypes.ts:40,51` | `choicePrompt?: { kind: 'creation_type'; reason }` — discriminador `kind` já pensado para extensão |
| `server/src/routes/docs.paths.ts:870` | `POST /api/dashboard/ai/ChatInterview` documentado (#455) — muda junto |
| `my-app/features/interview/components/AiInterviewSetup/CreationChoice.tsx` (75 l.) + `index.tsx:163` + `hooks/useAiInterview.ts` | botões da parte (b), `sendCreationChoice`, estado `choicePrompt` |

## 1. Checklist de comportamentos

### BE — `BE-INCR-W3-SUMMARY-CONFIRM`

1. **Classificação estruturada do texto em `CONFIRMING_BUSINESS`.** O `=== 'true'` sai; a última mensagem do
   usuário (com o resumo como contexto) vai ao `classifyIntoEnum` com `['confirmed','rejected','unclear']`.
   `null` ⇒ `unclear`. *Teste (OpenAIService falso):* `confirmed` → avança a `MATCHING_PRESET`; e o caso que
   motivou o fork — o classificador antigo devolvendo "True." — deixa de existir (a chamada de texto livre some).
2. **`unclear` repete a pergunta** "Isso está correto?" com o mesmo resumo, `nextStage: 'CONFIRMING_BUSINESS'` e
   `choicePrompt { kind: 'business_summary', reason: 'unclear' }`. *Teste:* `unclear`/`null` → não avança.
3. **`rejected` volta a `DISCOVERING_BUSINESS`** (decisão #2) e reprocessa o turno nesse estágio com o histórico
   (que contém a correção): a IA produz novo `SUMMARY:` e o turno devolve a nova pergunta de confirmação; se a IA
   não resumir, devolve a pergunta dela com `nextStage: 'DISCOVERING_BUSINESS'`. *Teste:* `rejected` + IA falsa
   com `SUMMARY:` → `nextStage: 'CONFIRMING_BUSINESS'` e resumo novo.
4. **Botão decide sem IA.** Corpo aceita o campo do botão (forma: F-W3-C1). `confirm` → `MATCHING_PRESET` sem
   chamar o classificador; `correct` → responde "O que está diferente no seu negócio?" (texto fixo) com
   `nextStage: 'DISCOVERING_BUSINESS'`, sem chamar a IA. *Teste:* botão `confirm` + texto "não" → avança
   (o botão vence o texto, como F-W3-B1); classificador com 0 chamadas.
5. **A pergunta de confirmação traz os botões.** Todo turno com `nextStage: 'CONFIRMING_BUSINESS'` devolve
   `choicePrompt { kind: 'business_summary', reason: 'initial' | 'unclear' | 'error' }`. *Teste:* um por `reason`.
6. **Falha do classificador** (exceção da API) → tratamento F-W3-C2. *Teste:* `classifyIntoEnum` rejeita → turno
   não avança e não devolve `CANNOT_PROCEED`.
7. **`IDENTIFYING_ENTITIES` na mesma correção** (decisão #3): `classifyIntoEnum` com `['enough','not_enough']`;
   `null` ⇒ `not_enough` (continua perguntando). Sem botões (pergunta aberta). *Teste:* `enough` → `COMPLETED`;
   `null` → permanece.
8. **Contrato e gates:** `docs.paths.ts` + `public/openapi.json` regenerado (corpo e `choicePrompt.kind` novos);
   snapshot de shape dos DTOs atualizado só com o schema tocado (memória: UPDATE do snapshot no Windows reordena);
   `cd server && npx tsc --noEmit` + `tsc -p tsconfig.test.json`; suíte unit; a guarda da parte (a)/(b)
   (`StageHandlers.creationType.test.ts`, `StageHandlers.choice.test.ts`) segue verde.

### FE — `FE-INCR-W3-SUMMARY-CONFIRM` (depende do BE mergeado)

9. **Botões no resumo.** `choicePrompt.kind === 'business_summary'` → dois botões **"Sim, está certo"** e
   **"Não, corrigir"** (`rounded-2xl`, `neutral-*`, padrão do `CreationChoice`/`FiscalQuestion`); componente: F-W3-C3.
   *Teste vitest:* `kind` presente → dois botões; `creation_type` → os botões da parte (b), não estes.
10. **Sem modal.** Confirmar o resumo não cria nada (o passo caro segue sendo "Criar o sistema agora", já com
    modal) — mesma razão do F-W3-B4. *Teste:* clique → 1 `fetch` com o campo do botão.
11. **Campo de texto continua** ao lado dos botões (precedente F-W3-B2): digitar "não, é uma barbearia" é o
    caminho natural de corrigir.
12. **Botões desabilitados em voo** (dois cliques → 1 `fetch`).
13. **i18n `common` pt e en** (paridade `skill-audit wiring`); `cd my-app && npx tsc --noEmit` + `npm run test:types`;
    `withAuth` → sign-off em build de produção é **gate humano** (runbook; agente não assina).

## 2. Contratos (esboço materializável)

```ts
// server — InterviewTypes.ts
export type SummaryChoiceReason = 'initial' | 'unclear' | 'error';
export type ChoicePrompt =
  | { kind: 'creation_type'; reason: CreationChoiceReason }      // existente (#455)
  | { kind: 'business_summary'; reason: SummaryChoiceReason };   // novo
export interface IInterviewTurnResult { /* … */ choicePrompt?: ChoicePrompt; }

// server — opções fechadas do classificador
export const SUMMARY_CONFIRMATION = ['confirmed', 'rejected', 'unclear'] as const;
export const ENTITIES_SUFFICIENCY = ['enough', 'not_enough'] as const;

// server — corpo do POST /api/dashboard/ai/ChatInterview (forma depende do F-W3-C1; recomendação (a))
const ChatInterviewSchema = z.object({
  /* stage, messages, presetKey, sessionId, choice — existentes */
  summaryChoice: z.enum(['confirm', 'correct']).optional(), // novo; só lido em CONFIRMING_BUSINESS
});
```

```ts
// my-app — useAiInterview (acréscimo)
sendSummaryChoice(choice: 'confirm' | 'correct'): Promise<void>;
choicePrompt: ChoicePrompt | null; // passa a ser a união; CreationChoice filtra kind === 'creation_type'
```

## 3. Forks — RATIFICAÇÃO PENDENTE

- **F-W3-C1 · como o botão chega ao servidor.**
  (a) campo novo `summaryChoice: 'confirm' | 'correct'`;
  (b) ampliar `choice` para `'create' | 'customize' | 'confirm' | 'correct'` e validar por estágio.
  **Recomendação: (a).** Cada enum fica preso ao seu estágio pelo tipo; com (b), `choice: 'create'` em
  `CONFIRMING_BUSINESS` vira combinação válida no schema que o serviço precisa recusar à mão. **PENDENTE.**
- **F-W3-C2 · falha da API do classificador.**
  (a) trata como `unclear`: repete a pergunta com os botões, `reason: 'error'` (o botão não depende da IA);
  (b) mantém o comportamento genérico do `catch` (`CANNOT_PROCEED`).
  **Recomendação: (a).** Com botões na tela, uma falha da IA não precisa encerrar a entrevista — o mesmo raciocínio
  da decisão #4 de 30/09 (erro volta a perguntar). **PENDENTE.**
- **F-W3-C3 · componente do FE.**
  (a) componente novo `SummaryConfirmation` (só botões, sem modal), reaproveitando as classes do `CreationChoice`;
  (b) generalizar `CreationChoice` para renderizar por `kind`.
  **Recomendação: (a).** Os dois decidem coisas diferentes (resumo × criação) e só o de criação tem modal —
  divergência de posse pelo critério de reuso; generalizar acopla a lógica dos modais a um caso que não a usa. **PENDENTE.**

Direto (sem fork): entrega BE → FE (escolhida com a opção (c) da decisão #1, mesma forma do F-W3-B5).

## 4. Pendente de validação externa

- Nenhuma regra contábil, fiscal ou legal envolvida.
- Sign-off de browser em build de produção (item 13): gate humano por runbook.

## 5. Insumos ausentes

- Nenhum bloqueante. A taxa "~1/3" de falha do `=== 'true'` vem do achado sup. 6 (plano de 07/09), não foi
  medida de novo — não muda a decisão.

## 6. Achados fora de escopo

1. **Chamada de reconhecimento desperdiçada.** Em `CONFIRMING_BUSINESS`, o turno chama a IA para um "Obrigado" que
   é descartado quando o resumo é confirmado (`processTurn` imediato). Com o item 4 o botão não chama a IA; o caminho
   de texto ainda chama. Remover é otimização, não correção — fica fora.
2. **`IDENTIFYING_ENTITIES` → `COMPLETED` sem `presetKey`.** O que o front faz ao completar sem preset não foi lido
   (fora do F-W3-1); o item 7 só troca o gate.
3. **`isTextTabular`** (`OpenAIService.ts:266`) usa o mesmo padrão `=== 'true'` fora da entrevista — mesma classe,
   outro módulo.
