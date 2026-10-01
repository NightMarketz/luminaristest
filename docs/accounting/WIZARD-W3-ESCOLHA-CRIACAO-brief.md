# BRIEF — W3 parte (b): escolha "criar agora × customizar" por botões, com confirmação

- **Nó:** [W3](../plano/nos/W3.md) — Gates determinísticos da entrevista (só a escolha criar × customizar).
- **Autorização:** dono, 2026-09-30, em sessão — "(a), corrige e depois b"; parte (b) definida no
  questionário do mesmo dia: *"Botões no lugar do texto, confirmar antes de criar e confirmar se quer negar
  mesmo"*; W3 autorizado e F-W3-2 ratificado (a) → `docs/plano/decisoes/D-2026-09-30-W3-ESCOLHA-CRIACAO.md`.
  **Não cobre o F-W3-1** (gate de confirmação do resumo do negócio).
- **Estado de partida (fato consumado, 30/09):** parte (a) corrigida em `StageHandlers.handleCreationTypeConfirmation`
  — explícita decide; negação e ambígua voltam a `AWAITING_CREATION_TYPE_CONFIRMATION`; erro ao preparar a
  customização também volta (guarda `server/src/features/interview/InterviewService/__tests__/StageHandlers.creationType.test.ts`,
  8 casos). A decisão ainda é por palavra-chave no texto livre.
- **Sessão executora:** `sessao-feature`, dois incrementos seriais (F-W3-B5): **BE** (itens 1–6) → **FE** (itens 7–14).

## Insumos lidos

| Artefato | O que fixa |
|---|---|
| `server/src/controllers/interviewController.ts` | `ChatInterviewSchema` inline `{stage, messages, presetKey?, sessionId?}` — não `.strict()`; resposta = `IInterviewTurnResult` |
| `server/src/features/interview/models/InterviewTypes.ts:39` | `IInterviewTurnResult {response, nextStage, presetKey?, startCustomization?, sessionId?, customizationState?}` |
| `server/src/features/interview/InterviewService/InterviewService.ts:60-106` | `MATCHING_PRESET` → `AWAITING_CREATION_TYPE_CONFIRMATION`; esse estágio só roteia com `presetKey` |
| `server/src/features/interview/InterviewService/StageHandlers.ts` | classificação por texto (parte a) + ramos de erro |
| `my-app/features/interview/hooks/useAiInterview.ts:143-175` | o front guarda `stage`/`presetKey` no estado e mantém o `presetKey` quando a resposta o omite; `COMPLETED` sem customização → `FiscalQuestion` |
| `my-app/features/interview/components/AiInterviewSetup/FiscalQuestion.tsx` | precedente de **pergunta fechada** no wizard (X13 PR-3 item 20): opções `rounded-2xl`, `neutral-*`, i18n `common` |
| `my-app/components/ui/Modal.tsx` | modal canônico (reuse obrigatório, `my-app/CLAUDE.md`) |
| `server/src/routes/docs.paths.ts` | **não documenta** `POST /api/dashboard/ai/ChatInterview` (grep `ChatInterview` → 0; `public/openapi.json` → 0) |

## 1. Checklist de comportamentos

### BE — `BE-INCR-W3-CHOICE`

1. **Escolha estruturada no corpo.** `ChatInterviewSchema` aceita `choice?: 'create' | 'customize'`
   (enum Zod). Valor fora do enum → 400. *Teste:* body com `choice: 'delete'` → 400.
2. **`choice` presente decide sem ler texto.** Em `AWAITING_CREATION_TYPE_CONFIRMATION` com `choice`,
   `handleCreationTypeConfirmation` usa o enum e **ignora** a classificação por palavra-chave:
   `create` → `COMPLETED`; `customize` → caminho de customização atual. *Teste:* `choice: 'create'` com
   última mensagem "quero customizar" → `COMPLETED` (o enum vence o texto).
3. **Resposta diz ao front que é hora dos botões.** Todo turno com `nextStage = AWAITING_CREATION_TYPE_CONFIRMATION`
   devolve `choicePrompt` (contrato §2), com `reason`:
   - `initial` — vindo de `MATCHING_PRESET` (preset encontrado);
   - `unclear` — texto ambíguo;
   - `declined_customize` — texto nega customizar sem pedir para criar;
   - `error` — falha ao preparar a customização (sessão nula ou exceção).
   *Teste:* um caso por `reason`.
4. **Texto livre continua funcionando** como na parte (a) (fallback; F-W3-B2). A guarda existente segue verde.
5. **Rota documentada.** `POST /api/dashboard/ai/ChatInterview` entra em `docs.paths.ts` com o corpo e a
   resposta novos; `public/openapi.json` regenerado; guard de path-count do openapi atualizado (hoje a rota
   não está documentada — ver "Achados").
6. **Gates:** `cd server && npx tsc --noEmit`; suíte unit.

### FE — `FE-INCR-W3-CHOICE` (depende do BE mergeado)

7. **Botões no estágio.** Quando a última resposta traz `choicePrompt`, o chat mostra dois botões, **"Criar
   o sistema agora"** e **"Customizar"**, com o padrão visual do `FiscalQuestion` (`rounded-2xl`,
   `neutral-*`). *Teste vitest:* `choicePrompt` presente → dois botões; ausente → nenhum.
8. **"Customizar" envia direto** `choice: 'customize'` (reversível: a customização pode terminar sem
   remover nada). *Teste:* clique → `fetch` com `choice: 'customize'` no corpo.
9. **"Criar o sistema agora" pede confirmação.** O clique abre o `Modal` canônico, com o nome do preset e
   **Confirmar** / **Voltar**. Só Confirmar envia `choice: 'create'`; Voltar fecha e não envia nada.
   *Teste:* Voltar → 0 chamadas a `fetch`; Confirmar → 1, com `choice: 'create'`.
10. **Negação pede confirmação.** Com `choicePrompt.reason === 'declined_customize'`, o front abre um
    `Modal` "Você prefere não customizar. Criar o sistema agora com o padrão?", com **Criar agora** /
    **Customizar mesmo assim**. Os botões enviam `create` / `customize` (F-W3-B3). *Teste:* abre sozinho
    nesse `reason` e não abre nos outros.
11. **Erro e ambíguo não abrem modal:** mostram a mensagem do servidor com os dois botões do item 7.
12. **Enquanto a requisição está em voo, os botões ficam desabilitados** (sem duplo clique criando duas vezes).
    *Teste:* dois cliques rápidos → 1 `fetch`.
13. **i18n:** chaves novas em `common` pt **e** en (paridade — `skill-audit wiring`).
14. **Gates:** `cd my-app && npx tsc --noEmit` + `npm run test:types` (os testes ficam fora do `tsc` cru);
    `withAuth` → **sign-off em build de produção** (gate humano, runbook — o agente não assina).

## 2. Contratos (esboço materializável)

```ts
// server — body do POST /api/dashboard/ai/ChatInterview (acréscimo)
const ChatInterviewSchema = z.object({
  stage: z.string().optional().default('GREETING'),
  messages: z.array(MessageSchema).optional().default([]),
  presetKey: z.string().optional(),
  sessionId: z.string().optional(),
  choice: z.enum(['create', 'customize']).optional(), // novo
});

// server — InterviewTypes.ts (acréscimo)
export type CreationChoiceReason = 'initial' | 'unclear' | 'declined_customize' | 'error';
export interface IInterviewTurnResult {
  response: string;
  nextStage: InterviewStage;
  presetKey?: string;
  startCustomization?: boolean;
  sessionId?: string;
  customizationState?: ICustomizationState;
  choicePrompt?: { kind: 'creation_type'; reason: CreationChoiceReason }; // novo; só com nextStage AWAITING_CREATION_TYPE_CONFIRMATION
}
```

```ts
// my-app — useAiInterview (acréscimo de API do hook)
sendCreationChoice(choice: 'create' | 'customize'): Promise<void>; // posta {stage, messages, presetKey, sessionId, choice}
choicePrompt: { kind: 'creation_type'; reason: CreationChoiceReason } | null;
```

## 3. Forks — ratificados 30/09 (todos pela recomendação)

- **F-W3-B1 · como a escolha chega ao servidor.**
  (a) campo `choice` enum no corpo (itens 1–2);
  (b) o botão manda uma mensagem de texto sintética ("criar o sistema agora") e o BE não muda.
  **Recomendação: (a).** Com (b), a decisão continua passando pela palavra-chave, que é a classe que o
  W3 existe para fechar. **RATIFICADO (a) — dono, 30/09: "Segue as recomendações".**
- **F-W3-B2 · texto livre no estágio.**
  (a) mantém o campo de texto junto dos botões (a classificação da parte (a) segue como fallback);
  (b) esconde o campo enquanto os botões estão na tela.
  **Recomendação: (a).** A parte (a) já torna o texto seguro (só decide o que for explícito), e esconder
  o campo tira do usuário o jeito de perguntar "o que muda?". **RATIFICADO (a) — dono, 30/09: "Segue as recomendações".**
- **F-W3-B3 · negação + "Criar agora" no modal da negação.**
  (a) conta como a confirmação de criar (não abre um segundo modal);
  (b) abre também o modal do item 9.
  **Recomendação: (a).** O modal da negação já é uma pergunta explícita com o botão de criar; dois
  modais seguidos para o mesmo ato é atrito sem ganho. **RATIFICADO (a) — dono, 30/09: "Segue as recomendações".**
- **F-W3-B4 · confirmar "Customizar".**
  (a) sem modal (item 8);
  (b) modal também.
  **Recomendação: (a).** Customizar não cria nada; o passo caro é criar. **RATIFICADO (a) — dono, 30/09: "Segue as recomendações".**
- **F-W3-B5 · entrega.**
  (a) dois PRs seriais sob este BRIEF: BE (1–6) → FE (7–14);
  (b) um PR só.
  **Recomendação: (a).** É a separação BE-INCR × FE-INCR da casa, e o FE depende do contrato mergeado.
  **RATIFICADO (a) — dono, 30/09: "Segue as recomendações".**

## 4. Pendente de validação externa

- Nenhuma regra contábil, fiscal ou legal envolvida.
- **Sign-off de browser em build de produção** do item 14: gate humano (runbook `RUNBOOK-FORMAT.md`). O
  agente prepara o runbook em branco; não preenche nem assina.

## 5. Insumos ausentes

- Nenhum bloqueante.

## 6. Achados fora de escopo

1. **`ChatInterview` sem documentação OpenAPI.** A rota existe (`routes/dashboard.ts:39`), mas não está em
   `docs.paths.ts` nem em `public/openapi.json`. O item 5 documenta a rota porque o contrato muda; a
   lacuna em si é anterior a este BRIEF.
2. **`ChatInterviewSchema` inline e sem `.strict()`.** Mover para `dtos/` e tornar estrito já é escopo do
   [W4](../plano/nos/W4.md) (BRIEF `BE-INCR-INTERVIEW-SESSION`); este BRIEF só acrescenta o campo.
3. **F-W3-1** (gate de confirmação do resumo compara `=== 'true'`) continua pendente e fora desta
   autorização.
