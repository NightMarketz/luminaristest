# BRIEF — W6: customização de campos por IA no painel do wizard (`POST /dashboard/ai/CustomizeFields`)

- **Nó:** [W6](../plano/nos/W6.md) — Painel de campos: rota `CustomizeFields` ou remoção.
- **Autorização:** dono, chat, 2026-10-15: *"Autorizo planejar o BRIEF do W6 — sessao-planejamento, sem código,
  sem 'executa'"*. Cobre **este BRIEF**, não cobre código nem o arquivo de ADR (ver §6).
- **Decisões do dono nesta sessão** (questionário de 15/10, registradas em
  [[D-2026-10-15-W6-CUSTOMIZE-FIELDS]]): F-W6-1 → **(b) fazer a IA de verdade, ADR primeiro**. A remoção foi
  descartada e o 404 fica na tela até o PR de FE. F-W6-2 → manter `AIChatMode.tsx`. F-W6-3, F-W6-5, F-W6-6 e
  F-W6-7 → ratificados pela recomendação (§4).
- **Restrição herdada (fato consumado):** F-P2-5, ratificado em 25/08 ([ADR-P2 §3](../adr/ADR-P2-second-vertical.md)):
  ligar o `FieldCustomizationService` é **incremento próprio com ADR próprio**. Este BRIEF é o insumo desse ADR,
  e o código só começa depois do ADR `Accepted` **e** do W4 mergeado (F-W6-7).
- **Sessões executoras (depois do ADR):** `sessao-feature`, em dois incrementos seriais: **BE** (itens 1–12) →
  **FE** (itens 13–19). O item 20 é gate humano.

## Estado de partida — medido em 2026-10-15 sobre `main` `8ba1ed8f`

| Fato | Evidência (lida no arquivo) |
|---|---|
| O front chama uma rota que não existe | `my-app/features/interview/components/RightSidebar/AIChatMode.tsx:110` e `:176`: `fetch(…/dashboard/ai/CustomizeFields)`; `server/src/routes/dashboard.ts:39` só registra `/ai/ChatInterview` |
| O serviço não tem chamador | `grep processMessage\|fieldCustomizationService server/src` fora do próprio `index.ts` → 0 |
| A sessão vive em memória, sem dono e sem TTL | `FieldCustomizationService/index.ts:41,69` lê `StateManager.getInstance().getSessionState(sessionId)`; o próprio `StateManager.ts:17` diz "Substituir este Map…" |
| Sessão ausente vira `Error` genérico | `index.ts:72` `throw new Error('Sessão não encontrada.')`. O front espera **404** (`AIChatMode.tsx:125,190`) |
| O histórico só é gravado quando há mudança | `index.ts:121-131`: o `push` em `conversationHistory` fica dentro de `if (modified)` |
| O papel `'ai'` vai cru para a OpenAI | o front mapeia `assistant → 'ai'` (`AIChatMode.tsx:104,167`); o serviço repassa `msg.role` sem normalizar (`index.ts:167`) |
| As formas de resposta não batem | o serviço devolve `{updatedTable, aiMessage, modified, conversationHistory}` (`Types.ts:56`); o front lê `{sessionId, conversationHistory, modified, table}` (`AIChatMode.tsx:57-62`) |
| A saída do modelo é texto livre | `FieldIntentParser.ts`: regex `\{[\s\S]*\}` + `JSON.parse` + Zod com `type: z.string()` livre; modelo `gpt-4-turbo` fixo (`index.ts:92`) |
| Duas chamadas de LLM por turno | `FieldPresetMatcher.findFieldPreset` (`:150`) faz uma segunda chamada; o catálogo `FieldPresetKnowledgeBase.ts` tem **15** entradas |
| A IA aplica sem o usuário ver | `FieldUpdater.update` muda a tabela da sessão no mesmo turno (`index.ts:118`) |
| Já existe validação canônica de campo | `AdvancedFieldSchema` (`dynamicTables/dtos/DynamicTable.dto.ts:19`, **não exportado**): regex de nome, nomes reservados, `type` enum. O `/dashboard/create` revalida `addedFields` com ele (`dashboardController.ts:211-220`) |
| Já existe precedente de saída presa a schema | `OpenAIService.buildEnumResponseFormat` / `classifyIntoEnum` (`lib/openai/OpenAIService.ts:73,248`): `json_schema` strict, modelo `FALLBACK` (`gpt-4o-mini`), porque o `CHAT` (3.5) não suporta structured outputs |
| Painel e testes | `RightSidebar/index.tsx:190` monta `AIChatMode` no modo `'ai'`; não há `__tests__` em `RightSidebar/`; strings PT fixas, sem i18n |

## 1. Checklist de comportamentos

Cada item é testável sozinho. A sessão referida em todo o BE é a **`InterviewSession` do W4** (`IInterviewSessionRepository`, BRIEF
`BE-INCR-INTERVIEW-SESSION`, §7).

### BE — `BE-INCR-W6-CUSTOMIZE-FIELDS` (após W4 mergeado e ADR `Accepted`)

1. **Rota em 2 toques.** `router.post('/ai/CustomizeFields', postCustomizeFields)` em `routes/dashboard.ts` →
   controller → `FieldCustomizationService` (instância por factory, sem o singleton `getInstance()` nem o
   export de instância no import, que hoje cria o `OpenAIService` só por importar o módulo) → repositório da sessão do W4.
   Sem contexto de usuário → **401**. *Teste:* supertest sem token → 401; com token → passa ao serviço.
2. **DTO `.strict()` em `features/interview/dtos/CustomizeFields.dto.ts`** (contrato §2.1), união
   discriminada por `kind`. Chave desconhecida → 400. *Teste:* `{kind:'message', …, conversationHistory}` → 400
   (o front deixa de mandar histórico, F-W6-3).
3. **Sessão com dono.** A sessão é lida por `(sessionId, userId)`. Sessão de outro usuário, expirada ou
   inexistente → **404** `{ code: 'INTERVIEW_SESSION_NOT_FOUND' }`, alinhado ao F-W4-2 (b). *Teste:* o usuário B
   com o `sessionId` de A → 404, e a sessão de A fica intacta (F-W6-7).
4. **Tabela fora da sessão** → **404** `{ code: 'TABLE_NOT_IN_SESSION' }`. *Teste:* `tableKey` que não está em
   `customizationState.tables` → 404, sem chamada ao modelo.
5. **O histórico por tabela mora no servidor** (F-W6-3). Todo turno `message` acrescenta a mensagem do usuário
   e a resposta do assistente, **mude ou não a tabela** (corrige `index.ts:121`). Papéis só `'user' | 'assistant'`.
   Ao modelo vão as **últimas 20** mensagens da tabela. *Teste:* turno sem modificação → o histórico cresce 2;
   o array enviado ao `OpenAIService` não tem papel fora de `user|assistant|system`.
6. **Uma chamada de modelo por turno, com saída presa a schema** (F-W6-4, pendente). `response_format`
   `json_schema` strict (§2.3), modelo `FALLBACK`. O casamento com preset entra **no mesmo schema**: `presetKey`
   ∈ enum das 15 chaves do `FieldPresetKnowledgeBase` ou `null`. Sai do caminho a segunda chamada do
   `FieldPresetMatcher.findFieldPreset` (o `findExactFieldMatch` determinístico continua). *Teste:* com
   `OpenAIService` falso, um turno faz **1** chamada; resposta fora do schema → turno sem proposta, com mensagem
   "não entendi", e nada muda na sessão.
7. **O turno devolve proposta, nunca aplica** (F-W6-5). O resultado traz `proposal { id, changes[] }`. A sessão
   guarda a proposta pendente (uma por tabela: a nova substitui a anterior), e `fields` da tabela **não muda**.
   *Teste:* depois do turno `message`, `fields` da sessão fica idêntico ao de antes; `proposal.changes` tem o diff.
8. **Validação determinística antes de propor.** Cada `add`/`update` passa pelo `AdvancedFieldSchema` canônico
   (exportado de `DynamicTable.dto.ts`, sem cópia; `_REUSE-CRITERION`: o objeto de domínio e a posse são os
   mesmos). Tipos permitidos à IA: `string, number, boolean, date, datetime, textarea, select` (`select` exige
   `options` com pelo menos 1 item). `relation` e `json` ficam fora (F-W6-4). `add` de nome já existente e
   `remove`/`update` de nome inexistente são descartados com motivo. *Teste:* nome `id` → descartado
   (reservado); `type:'relation'` → descartado; o que sobra chega íntegro ao `/dashboard/create` (W1).
9. **Campo sensível é marcado** (F-W6-6). O schema de saída traz `sensitiveCategory` por campo novo ou alterado,
   enum fechado com as categorias do LGPD art. 5º, II (§2.3), ou `null`. Em cima disso roda uma rede
   determinística: lista curta de radicais (`saude`, `alerg`, `diagnost`, `medica`, `gestant`, `biometr`,
   `religi`, `etnia`, `raca`, `sexual`, `sindic`, `genetic`). Se a lista casar e o modelo disser `null`, a
   categoria vira `'health_or_other_unspecified'`. A rede só **acrescenta** marca, nunca tira. *Teste:* o modelo
   devolve `{name:'alergias', sensitiveCategory:null}` → a proposta marca o campo sensível.
10. **Aplicar e descartar.** `{kind:'decision', proposalId, decision:'apply'|'discard'}`. `apply` aplica **só a
    proposta pendente com aquele id**, via `FieldUpdater`, na mesma escrita da sessão. Id velho ou já usado →
    **409** `{ code: 'PROPOSAL_STALE' }`. Proposta com campo sensível exige `acknowledgeSensitive: true` no corpo;
    sem ele → **400** `{ code: 'SENSITIVE_FIELD_NOT_ACKNOWLEDGED' }` e nada é aplicado. `discard` só limpa a
    pendente. As duas decisões entram no histórico da tabela como linha `system`, que não vai ao modelo. *Teste:*
    os 4 caminhos (aplica, descarta, stale, sensível sem ack).
11. **Erro do modelo não derruba a sessão.** Exceção da OpenAI → **200** com `proposal: null`, a mensagem
    padrão de erro e a sessão intacta. Não é 500: a conversa segue e o usuário tenta de novo. *Teste:* o falso
    lança → 200, `proposal:null`, histórico com a linha do usuário.
12. **Gates do diff:** snapshot `dtoShapeSnapshot` com o schema novo. No Windows, reverta o churn e insira só o
    schema novo (memória `dto-snapshot-update-reordena-no-windows`). Documentar a rota em `docs.paths.ts` +
    `npm run` do openapi, subindo o `BASELINE` do `openapi-paths.test.ts` em +1. `tsc` do server e
    `tsc -p tsconfig.test.json`. `check:arch` sem violação nova. Nenhum `eventType` novo de auditoria (§8).

### FE — `FE-INCR-W6-CUSTOMIZE-FIELDS` (após o BE mergeado)

13. **Contrato tipado pelo gerado.** `AIChatMode` passa a mandar `{kind:'message', sessionId, tableKey, message}`
    e `{kind:'decision', …}` tipados por `my-app/types/contracts/**/*.gen.ts` (memória
    `fe-contract-types-import-type`), sem `conversationHistory` no corpo. *Teste (vitest):* o corpo do `fetch`
    bate com o tipo gerado; `tsc` morde chave fora do DTO.
14. **O histórico vem do servidor.** A lista de mensagens é a `conversationHistory` da resposta (linhas `system`
    renderizadas como nota). *Teste:* render com a resposta falsa → as mensagens na ordem do servidor.
15. **Cartão de proposta.** Com `proposal`, aparece o diff (adicionar / remover / alterar, com rótulo e tipo) e os
    botões **Aplicar** e **Descartar**. Aplicar chama `decision:'apply'` e, no sucesso, `onSaveChanges(table)`
    com a tabela que o servidor devolveu, não com uma montada no cliente. *Teste:* clicar Aplicar → `fetch` com
    `decision:'apply'` e `onSaveChanges` recebe `data.table`.
16. **Campo sensível destacado.** Linha marcada com selo "dado sensível (LGPD)" e um texto curto: dado de saúde
    é sensível (art. 5º, II), e a decisão de coletar é do controlador. Uma caixa "Entendo que este campo guarda
    dado sensível" fica **desmarcada** por padrão e habilita o Aplicar (manda `acknowledgeSensitive:true`).
    *Teste:* sem marcar, Aplicar fica `disabled`; marcado → o corpo leva `acknowledgeSensitive:true`.
17. **Erros por código, não por status solto.** `INTERVIEW_SESSION_NOT_FOUND` → mensagem de sessão expirada que
    leva a reabrir a entrevista (comportamento do F-W4-2 b no hook); `PROPOSAL_STALE` → "a proposta mudou, veja a
    nova"; o resto → erro genérico. *Teste:* os 3 ramos.
18. **Padrões de tela:** strings **novas** do componente via i18n `common` com paridade pt/en (as fixas que já
    existem são do W7, não deste item); cartão `rounded-2xl`; `neutral-*` nas classes **novas**; reuse de
    `components/ui` (botão e checkbox canônicos). *Teste:* paridade i18n (gate existente).
19. **Verificação contra build de produção** (`/dashboard/setup` está atrás de `withAuth`, `my-app/CLAUDE.md`).
    Roteiro: entrevista → customizar → tabela → modo IA → "preciso guardar alergias do cliente" → proposta com
    selo → marcar → Aplicar → o modo manual mostra o campo. Evidência: o agente cola a rede e a tela no PR.

### Gate humano

20. **Sign-off de browser** do modo IA: o agente acrescenta o roteiro do item 19 ao
    `RUNBOOK-H2-WIZARD-ENTREVISTA.md` (seção nova, em branco). O desfecho e a assinatura são do dono.

## 2. Contratos (esboço materializável)

### 2.1 Entrada — `features/interview/dtos/CustomizeFields.dto.ts`

```ts
const SessionRef = { sessionId: z.string().min(1), tableKey: z.string().min(1) };

export const CustomizeFieldsDto = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('message'), ...SessionRef,
             message: z.string().trim().min(1).max(2000) }).strict(),
  z.object({ kind: z.literal('decision'), ...SessionRef,
             proposalId: z.string().min(1),
             decision: z.enum(['apply', 'discard']),
             acknowledgeSensitive: z.literal(true).optional() }).strict(),
]);
```

### 2.2 Saída — `200`

```ts
type SensitiveCategory =
  | 'health' | 'sex_life' | 'genetic' | 'biometric' | 'racial_ethnic'
  | 'religious' | 'political' | 'union_or_org' | 'health_or_other_unspecified';

type FieldChange =
  | { action: 'add';    field: AdvancedField; sensitiveCategory: SensitiveCategory | null; presetKey: string | null }
  | { action: 'update'; originalName: string; field: AdvancedField; sensitiveCategory: SensitiveCategory | null }
  | { action: 'remove'; originalName: string };

interface CustomizeFieldsResult {
  sessionId: string;
  tableKey: string;
  table: ICustomizableTable;             // estado da sessão DEPOIS do turno (inalterado em 'message')
  conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string; at: string }>;
  proposal: { id: string; changes: FieldChange[]; requiresSensitiveAck: boolean } | null;
  discarded: Array<{ name: string; reason: 'reserved' | 'type_not_allowed' | 'exists' | 'not_found' | 'invalid' }>;
  applied?: boolean;                     // só em kind:'decision'
}
```

Erros: `401` sem contexto · `400` DTO, ou `SENSITIVE_FIELD_NOT_ACKNOWLEDGED` · `404 INTERVIEW_SESSION_NOT_FOUND` ·
`404 TABLE_NOT_IN_SESSION` · `409 PROPOSAL_STALE`.

### 2.3 Saída do modelo — `json_schema` strict (F-W6-4)

```ts
{ name: 'field_customization', strict: true, schema: {
  type: 'object', additionalProperties: false, required: ['friendlyMessage', 'changes'],
  properties: {
    friendlyMessage: { type: 'string' },
    changes: { type: 'array', items: { type: 'object', additionalProperties: false,
      required: ['action', 'name', 'originalName', 'label', 'type', 'required', 'options',
                 'description', 'sensitiveCategory', 'presetKey'],
      properties: {
        action:       { type: 'string', enum: ['add', 'update', 'remove'] },
        name:         { type: 'string' },
        originalName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        label:        { type: 'string' },
        type:         { type: 'string', enum: ['string','number','boolean','date','datetime','textarea','select'] },
        required:     { type: 'boolean' },
        options:      { type: 'array', items: { type: 'string' } },
        description:  { type: 'string' },
        sensitiveCategory: { anyOf: [{ type: 'string', enum: [/* SensitiveCategory exceto o unspecified */] }, { type: 'null' }] },
        presetKey:    { anyOf: [{ type: 'string', enum: [/* 15 chaves do FieldPresetKnowledgeBase */] }, { type: 'null' }] },
} } } } } }
```

O strict mode exige todo campo em `required`; o que não se aplica volta `null` ou vazio, e o item 8 normaliza.

### 2.4 Estado da sessão (acréscimo ao `state` do W4, sem coluna nova)

```ts
ICustomizableTable & { pendingProposal?: { id: string; changes: FieldChange[]; createdAt: string } }
// conversationHistory já existe no tipo; passa a receber 'system' para as decisões
```

## 3. Divisão em PRs

| PR | Conteúdo | Pré-condição | Sessão |
|---|---|---|---|
| **este** | BRIEF + nota W6 + [[D-2026-10-15-W6-CUSTOMIZE-FIELDS]] + dossiê `pesquisas-legais/w6-campos-ia-dado-saude/` | — | planejamento |
| ADR | `docs/adr/ADR-W6-field-customization-ai.md` (`Proposed` → `Accepted`), transcrevendo §1–§4 como decisão | autorização do dono para o ADR | planejamento |
| BE | itens 1–12 | ADR `Accepted` + **W4 mergeado** (F-W6-7) | feature |
| FE | itens 13–19 | BE mergeado | feature |
| — | item 20 | FE mergeado | humano (dono) |

O 404 na tela continua até o PR de FE (escolha do dono no F-W6-1: nada de esconder no meio do caminho).
**Para o campo chegar ao sistema criado é preciso o W1**: sem ele, a customização aplicada na sessão para no
painel, porque o front cria só com `suiteKey` (achado sup. 1). W1 não bloqueia o W6, mas é ele que dá valor ao
W6. O ADR deve dizer isso.

## 4. Forks

| Fork | Tema | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-W6-1** | Remover ou implementar | (a) remover o modo IA · (a') desativado "em breve" · (b) implementar, ADR primeiro | (a) | ✅ **(b)**, dono 15/10, *"Fazer a IA de verdade: ADR primeiro"* (contra a recomendação) |
| **F-W6-2** | `AIChatMode.tsx` | apagar · manter | apagar (sob (a)) | ✅ **manter**, dono 15/10. Sob (b) o arquivo é adaptado nos itens 13–17 |
| **F-W6-3** | Contrato e fonte do histórico | (a) rota própria, histórico no servidor · (b) rota própria, histórico do front · (c) dentro do `ChatInterview` | (a) | ✅ **(a)**, dono 15/10 |
| **F-W6-4** | Saída do modelo e tipos permitidos | (a) `json_schema` strict + `gpt-4o-mini` (`FALLBACK`) + preset no mesmo schema + tipos sem `relation`/`json` · (b) manter regex + `JSON.parse` + `gpt-4-turbo` + 2 chamadas | **(a)**: tira a classe de erro "JSON fora do lugar", corta uma chamada por turno, e `relation` exige alvo que a IA não tem como escolher com segurança. Precedente: `classifyIntoEnum` (PR-K3) | **RATIFICAÇÃO PENDENTE** (D2, não foi ao questionário) |
| **F-W6-5** | Quem aplica | (a) proposta + confirmação · (b) aplica direto · (c) direto, exceto sensível | (a) | ✅ **(a)**, dono 15/10 |
| **F-W6-6** | Campo sensível | (a) marcar + confirmar · (b) IA não cria sensível · (c) só avisar | (a) | ✅ **(a)**, dono 15/10 |
| **F-W6-7** | Ordem × W4 | (a) só após W4 · (b) antes, com dono no `Map` | (a) | ✅ **(a)**, dono 15/10 |
| **F-W6-8** | A marca sensível persiste no schema da tabela criada? | (a) não: vive só na sessão e na confirmação · (b) `ISchemaField.sensitive?: SensitiveCategory`, levado pelo W1 ao `/dashboard/create` | **(a) no W6**. (b) mexe em `DynamicTable.model.ts` (motor) e em quem lê o schema (export, mascaramento, auditoria): vira nó próprio, se o dono quiser. Sem (b), a tabela criada não "lembra" que o campo é sensível | **RATIFICAÇÃO PENDENTE** (D3, não foi ao questionário; vale levar ao ADR) |

## 5. Pendente de validação externa

- **Leitura da LGPD que sustenta o F-W6-6** (dossiê `pesquisas-legais/w6-campos-ia-dado-saude/relatorio.md`,
  [D01] Lei 13.709 compilada, Planalto, 15/10). Verificado: saúde é dado sensível (art. 5º, II); controlador ×
  operador (art. 5º, VI–VII); necessidade (art. 6º, III); hipóteses fechadas (art. 11); segurança desde a
  concepção (art. 46, §2º). **Ambíguo:** a lei não obriga, em texto literal, a marcar o campo nem a pedir
  confirmação. Isso é leitura do art. 46, §2º. A pergunta exata para o advogado, se o dono quiser levar, está no
  relatório §4. A decisão de produto (F-W6-6 (a)) não depende da resposta: é a leitura mais segura.
- A lista de radicais do item 9 é heurística de produto, não regra legal. A lei define as categorias, não as
  palavras.

## 6. Escopo desta autorização × próximos passos

- A autorização de 15/10 cobre este BRIEF. **O arquivo de ADR exige autorização própria** ("ADR primeiro" é a
  ordem que o dono escolheu; o ADR em si não foi autorizado como artefato nesta sessão). As decisões dele já
  estão todas aqui: 7 de 8 forks ratificados, e o F-W6-4 e o F-W6-8 podem ser fechados na própria sessão do ADR.
- O código não roda sem: ADR `Accepted`, W4 mergeado, e "executa" do dono para o BE.

## 7. Insumos ausentes

- ~~BRIEF do W4~~ **resolvido no merge de `main` (15/10):** [`BE-INCR-INTERVIEW-SESSION-brief.md`](BE-INCR-INTERVIEW-SESSION-brief.md)
  fixa `IInterviewSessionRepository.findActive(id, userId, now)` / `saveState(id, userId, state, expiresAt)`,
  `state Json` = `ICustomizationState` serializado, TTL de 24 h deslizante (F-W4-3 a) e
  `InterviewSessionNotFoundError` → **404 `INTERVIEW_SESSION_NOT_FOUND`** (F-W4-2 b). Os itens 3, 5, 7 e 10 usam
  esse repositório e esse erro sem forma própria. O `pendingProposal` (§2.4) entra em `state`, então todo
  `saveState` do W6 renova o TTL. O BRIEF do W4 corrige o de 07/09 (E8): o "404 que o `AIChatMode` espera" era
  sobre `CustomizeFields`. O item 17 cobre isso.
- Nenhum outro insumo ausente.

## 8. Achados fora de escopo

- **Auditoria:** a confirmação de campo sensível não gera evento de auditoria aqui. A sessão é efêmera, antes de
  o sistema existir; o ato persistente é o `/dashboard/create` (W1). Se o dono quiser trilha da decisão do
  controlador, o lugar é o W1 (evento na criação, com a lista de campos sensíveis). Isso depende do F-W6-8 (b).
- **Registro do consentimento do titular** (art. 11, I) é obrigação do controlador. O produto poderia oferecer
  um campo-padrão "consentimento para dado de saúde" na ficha clínica. É frente nova, ligada ao P2.
- `ChatInterview` não está documentado em `docs.paths.ts` (o BRIEF do W3 já registrou). O item 12 documenta só a
  rota nova.
- Strings PT fixas e `gray-*`/`blue-*` no `RightSidebar`/`AIChatMode` já existentes: são do W7.
- O modo manual do painel edita só estado local (achado sup. 4). Persistir isso é do W1 (F-W1-1).
