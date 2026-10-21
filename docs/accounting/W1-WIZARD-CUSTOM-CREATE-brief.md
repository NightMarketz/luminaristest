# BRIEF — W1 · Customização da entrevista chega ao `/dashboard/create`

- **Nó:** [`docs/plano/nos/W1.md`](../plano/nos/W1.md) · substitui o esboço de 07/09 em
  [`ONBOARDING-WIZARD-plano-grafo-brief.md` §W1](ONBOARDING-WIZARD-plano-grafo-brief.md) (envelhecido).
- **Autorização:** dono, chat, 2026-10-21: "dispara os chats A, C e F agora", sobre o escopo "Autorizo planejar o
  BRIEF do W1 ... — sessao-planejamento, só docs, sem código, sem 'executa'". Cobre **só este BRIEF**; não autoriza
  código, `executa` nem merge.
- **Estado:** BRIEF escrito; **6 forks PENDENTES** (§3). Não é executável pela `sessao-feature` até ratificação.
- **Base lida:** `origin/main` @ `7c063e39` (2026-10-21). W4 (#734/#735) já em `main` — sessão persistida no servidor.

## 0. O que mudou desde o esboço de 07/09 (conferido no código)

| Esboço (07/09) | Código hoje | Fonte |
|---|---|---|
| create aceita `{mode:'custom', presetKey, removedTables, addedFields}` | idem, **mais** `unit` obrigatório (F-I1-2 b), `modules[]` + `selectOverrides`, e os dois ramos `.strict()` | `server/src/features/dynamicTables/dtos/CreateDashboard.dto.ts` |
| `fiscal` | o controller estende os dois ramos com `fiscal: OnboardingFiscalSchema.optional()` | `server/src/controllers/dashboardController.ts:17-20` |
| "remover tabela" | remoção é **por módulo**: remover parte das tabelas de um módulo → 400 `MODULE_PARTIAL`/`FIXED_MODULE_PARTIAL`; `assertRemovalsAllowed` (W2) trava tabela com `lock`; Core em `removedTables` é ignorado | `moduleSelection.ts:50-70`, `dashboardController.ts:207-217` |
| `addedFields` livre | campo que colide com campo declarado pelo módulo → 400 | `moduleSelection.ts:87-104` |
| front só cria em `COMPLETED` com `suiteKey` | **igual**: `handleCreateSystem` monta `{suiteKey, unit, fiscal, modules}`; `CUSTOMIZATION_COMPLETED` não tem ramo no hook | `my-app/features/interview/hooks/useAiInterview.ts:115-125, 235-239` |
| servidor não guarda estado | W4: `InterviewSession` persistida; `ICustomizationState` com `tables[].isSelected/lock/fields` | `models/InterviewTypes.ts:93-100` |
| — | turno `done` grava `completeCustomization` e devolve `CUSTOMIZATION_COMPLETED` **sem** payload | `CustomizationService.ts:207-213` |
| painel manual edita estado local | **igual**: "Salvar" do modo manual só chama `onUpdateTable` (estado React); o modo IA aplica proposta pelo servidor (W6) e ecoa no local | `RightSidebar/index.tsx:112-118, 193-197` |
| — | `addTable` (intenção "adicionar tabela") cria tabela de usuário na sessão; **o create não tem campo para tabela nova** | `StateManager.ts:107-130` |

## 1. Checklist (comportamentos testáveis)

Dois PRs: **BE** (itens 1–5) e **FE** (itens 6–10), FE empilhado no BE. Itens marcados *(fork)* só valem na forma
ratificada.

**BE**
1. *(F-W1-1, F-W1-2)* O turno `done` devolve `nextStage:'COMPLETED'`, `presetKey` e `creation` (§2) montado pelo
   servidor a partir do `ICustomizationState` persistido. Teste: sessão com 1 tabela desmarcada + 1 campo novo →
   `creation` contém exatamente ambos.
2. Consolidação pura `toCustomCreation(state, presetDef)` (função em `features/interview/CustomizationService/`, sem
   I/O): `removedTables` = tabelas `isSelected:false` não-Core; `addedFields[t]` = campos de `t` ausentes em
   `presetDef.tables[t].schema.fields`. Testes unitários: Core desmarcado não entra; campo do preset não entra.
3. *(F-W1-5)* Remoção dentro de módulo: a consolidação nunca emite remoção parcial de módulo (forma conforme o fork).
   Teste: desmarcar 1 de 2 tabelas de um módulo não-fixo → comportamento ratificado, nunca 400 no create.
4. *(F-W1-3)* Se ratificado (a): rota de gravação do painel manual na sessão (Route→Controller→Service→Repository,
   DTO Zod `.strict()`, dono + `version`/409 do W4). Teste: 404 sessão alheia, 409 versão velha, 400 chave extra.
5. Gates do diff: `dtoShapeSnapshot` (DTO novo/alterado; inserir só o novo — memória do reorder no Windows),
   guard de path-count do openapi se a rota do item 4 nascer, `tsc` server + `tsconfig.test.json`.

**FE**
6. Hook: `COMPLETED` com `creation` → mesma pergunta fiscal fechada (X13 PR-3 item 20) → `createDashboard` com
   `{mode:'custom', presetKey, removedTables, addedFields, unit, fiscal, modules}`. Sem `creation` → caminho quick
   de hoje, intacto. vitest do hook nos dois ramos.
7. `modules` do payload custom = `selectedModules` do hook (o mesmo do quick); `unit` = `nomeDaUnidadeDaEntrevista`.
8. Retry (`lastCreateRequest`) guarda e reenvia o payload custom inteiro, não só `key`. vitest.
9. *(F-W1-3)* Modo manual do painel conforme o fork (grava no servidor, ou fica fora).
10. Erro 400 do create custom (`MODULE_PARTIAL`, `REMOVAL_LOCKED`, colisão de campo) cai no `classifyCreationError`
    existente com mensagem i18n pt/en (paridade é gate). Tipos do payload vêm de `types/contracts/**.gen` (sem import
    do backend).

## 2. Contratos (esboço)

```ts
// BE — turno de conclusão (IInterviewTurnResult estendido; só com nextStage 'COMPLETED' vindo de customização)
type CustomCreationDraft = {
  mode: 'custom';
  presetKey: string;
  removedTables: string[];                       // nunca Core; nunca remoção parcial de módulo (item 3)
  addedFields: Record<string, ISchemaField[]>;   // nunca campo declarado por módulo
  // F-W1-4 (a): addedTables?: { key: string; name: string; fields: ISchemaField[] }[]
};
IInterviewTurnResult & { nextStage: 'COMPLETED'; presetKey: string; creation?: CustomCreationDraft };

// FE → POST /dashboard/create  (CustomCreationSchema atual, sem mudança salvo F-W1-4 a)
{ ...CustomCreationDraft, unit: { name: string }, fiscal?: OnboardingFiscalInput, modules: ModuleSelector[] }

// F-W1-3 (a) — gravação do painel manual
PUT /interview/session/:sessionId/tables/:tableKey   // nome final pelo GENERATION_CONTRACTS
body: { fields: ISchemaField[]; version: number }  .strict()   → 200 { customizationState, version } | 404 | 409 | 400
```

## 3. Forks — RATIFICAÇÃO PENDENTE

- **F-W1-1 · fonte de verdade ao finalizar.** (a) servidor consolida a sessão persistida (W4) e devolve `creation`;
  (b) front monta a partir do `customizationState` local. **Rec. (a)**: com W4 em `main` a sessão é a verdade; (b)
  mantém duas verdades e o modo IA do painel já grava no servidor. **PENDENTE.**
- **F-W1-2 · estágio final.** (a) `done` passa a devolver `COMPLETED` + `creation`; (b) front trata
  `CUSTOMIZATION_COMPLETED` como gatilho. **Rec. (a)**: um só gatilho de criação no hook. **PENDENTE.**
- **F-W1-3 · "Salvar" do painel manual** (estado só local hoje; sob F-W1-1 a seria perdido). (a) rota nova grava na
  sessão (item 4); (b) esconder o modo manual e deixar só o IA; (c) o front envia `tables` editadas no turno `done`
  e o servidor mescla. **Rec. (a)**: mantém a verdade única sem esconder função; (c) reabre estado do cliente como
  fonte. **PENDENTE.**
- **F-W1-4 · tabela nova criada na conversa** (`addTable` existe; create não tem campo). (a) `CustomCreationSchema`
  ganha `addedTables` (DTO + snapshot + validação de campos); (b) a intenção "adicionar tabela" sai da entrevista
  (só campos); (c) fica fora do W1 com aviso explícito ao usuário no turno `done`. **Rec. (a)** (dono quer
  completude), aceitando subir para L; (c) é o mínimo se o dono quiser W1 em M. **PENDENTE.**
- **F-W1-5 · desmarcar parte de um módulo.** (a) na conversa, desmarcar uma tabela de módulo não-fixo desmarca o
  módulo inteiro e a IA avisa; tabela de módulo fixo fica travada (`lock`); (b) consolidação emite como está e o
  400 do create aparece no fim. **Rec. (a)**: o 400 chega depois da conversa inteira (mesmo motivo do F-W2-1 a).
  **PENDENTE.**
- **F-W1-6 · módulos escolhidos × tabelas da sessão.** O `ICustomizationState.tables` nasce do preset; os
  `selectedModules` do FE podem mudar a composição. (a) a sessão passa a nascer de preset ∪ módulos escolhidos
  (o turno MATCHING_PRESET já conhece `moduleOptions`), para a IA customizar o que será instalado; (b) a sessão
  segue só com o preset e `modules` vai à parte no payload. **Rec. (a)**: em (b) o usuário não consegue customizar
  tabela de módulo opcional, e a remoção por módulo do item 3 fica cega. **PENDENTE.**

## 4. Pendente de validação externa
Nenhuma — W1 não toca regra contábil/fiscal (o `fiscal` reaproveita a pergunta fechada do X13 sem mudança).

## 5. Insumos ausentes
- Confirmação em browser do fluxo `CUSTOMIZATION_*` ponta a ponta (gate humano; W4 também aguarda sign-off).
- Não li a montagem da sessão no turno MATCHING_PRESET além de `moduleOptions`; F-W1-6 pode alterar o item 1.

## 6. Achados fora de escopo
- `QuickSetup.tsx`/`TotalControlSetup.tsx` também chamam `createDashboard`; não conferidos contra o DTO atual.
- `IInterviewTurnResult.startCustomization` + `COMPLETED` coexistem com o novo `COMPLETED`+`creation` — limpar é
  frente própria se o dono quiser.
