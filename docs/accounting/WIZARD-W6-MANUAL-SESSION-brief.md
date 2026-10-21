# BRIEF — W6 emenda: o modo manual do painel de campos grava na sessão (`kind:'manual'`)

- **Nó:** [W6](../plano/nos/W6.md) — painel de campos do wizard. Emenda ao
  [`WIZARD-W6-CUSTOMIZE-FIELDS-brief.md`](WIZARD-W6-CUSTOMIZE-FIELDS-brief.md) (itens 1–20), sem editá-lo.
- **Autorização:** dono, chat, 2026-10-21: *"Corrige o modo manual pra gravar na sessão"*. Cobre este BRIEF e a
  execução que ele descreve, depois dos forks ratificados. Merge fora. Forks F-MS-1..4 ratificados no questionário
  do mesmo dia (§4).
- **Origem:** achado fora de escopo do PR #785 (FE do W6). O modo manual edita só o estado do `useAiInterview`; a
  sessão do servidor (W4) não sabe dele. Um Aplicar da IA sobe a tabela do servidor (item 15) e a edição manual
  some da tela.
- **Sessões executoras:** `sessao-feature`, BE (itens 1–7) → FE (itens 8–12). O item 13 é gate humano.

## Estado de partida — medido em 2026-10-21 sobre a branch do #785 (`3ef6e1c3`)

| Fato | Evidência (lida no arquivo) |
|---|---|
| O manual só adiciona campo e alterna `hidden` | `my-app/features/interview/components/RightSidebar/index.tsx`: `handleToggleFieldVisibility`, `handleAddField`; não há remover nem editar rótulo |
| "Salvar Alterações" não chama o servidor | `handleSave` → `onUpdateTable(tableData)` + `setTimeout` que "simula um pequeno delay"; mostra `onboardingFieldsSaved` |
| O formulário oferece tipos fora do motor | `NewFieldForm.tsx:71-78`: `string, number, boolean, date, datetime, email, password, phone`. `AdvancedFieldSchema.type` (`server/src/features/dynamicTables/dtos/DynamicTable.dto.ts:24`) não tem `email`/`password`/`phone`; `email` e `phone` existem como `format` (`:34`); `password` não existe |
| O servidor já grava a sessão com dono e versão | `StateManager.loadSession(sessionId, userId)` → 404 `INTERVIEW_SESSION_NOT_FOUND`; `saveSession` com `expectedVersion` → 409 `INTERVIEW_SESSION_CONFLICT` (`CustomizationService/StateManager.ts:64-95`) |
| A rota do W6 já é a porta da tabela da sessão | `POST /dashboard/ai/CustomizeFields`, `CustomizeFieldsDto` = união por `kind` `.strict()`; resposta `CustomizeFieldsResult` (`FieldCustomizationService/index.ts:25`) |
| Já existe a validação canônica e a rede de dado sensível | `AdvancedFieldSchema` (exportado, usado pelo W6 item 8 em `FieldProposal.checkField`); `matchesSensitiveRadical(name, label)` (`FieldProposal.ts:35`) |
| A IA lê os campos da sessão | `FieldCustomizationService.systemPrompt` monta `{{TABLE_FIELDS}}` de `table.fields` — campo manual gravado passa a ser visto pela IA |
| O valor final depende do W1 | o `/dashboard/create` ainda recebe só `suiteKey` (BRIEF W6 §3): sem o W1, nem a IA nem o manual chegam ao sistema criado |

## 1. Checklist de comportamentos

### BE — `BE-INCR-W6-MANUAL-SESSION`

1. **DTO: `kind:'manual'` na união do `CustomizeFieldsDto`** (contrato §2.1, F-MS-1), `.strict()` em todos os
   níveis; `changes` com 1 a 50 itens. *Teste:* chave fora do DTO → 400; `changes: []` → 400; tipo fora do
   enum manual → 400 (F-MS-2).
2. **Sessão com dono e tabela da sessão**, como os turnos do W6: `loadSession(sessionId, userId)` → 404
   `INTERVIEW_SESSION_NOT_FOUND`; `tableKey` fora → 404 `TABLE_NOT_IN_SESSION`. *Teste:* usuário B com o
   `sessionId` de A → 404 e a sessão de A intacta.
3. **Validação canônica, tudo ou nada.** Cada `add` passa pelo `AdvancedFieldSchema` (o mesmo do item 8, sem
   cópia). Nome reservado, nome já existente, `setHidden` de nome inexistente ou nome repetido no lote → **400**
   `{ code: 'MANUAL_CHANGE_INVALID', details: [{ index, name, reason }] }` e **nada** é gravado. Motivos:
   `reserved | exists | not_found | duplicate | invalid`. *Teste:* lote com 1 válido + 1 reservado → 400 e
   `fields` da sessão idêntico ao de antes.
4. **Aplica e grava numa escrita só.** `add` acrescenta o campo validado (com `format` quando o F-MS-2 mapear);
   `setHidden` troca só `hidden` do campo. Uma `saveSession` por requisição; conflito de versão → 409
   `INTERVIEW_SESSION_CONFLICT` (já existe). Resposta `CustomizeFieldsResult` com `applied: true`,
   `proposal: null`, `discarded: []`. *Teste:* depois do turno, `loadSession` devolve os campos novos e o
   `hidden` trocado; o turno seguinte de IA monta o prompt com o campo manual.
5. **Campo sensível no manual** — conforme **F-MS-3**. *Teste:* conforme o caminho ratificado
   (ex.: em (a), `add` de `alergias` sem `acknowledgeSensitive` → 400 `SENSITIVE_FIELD_NOT_ACKNOWLEDGED`, nada gravado).
6. **Proposta pendente da IA** — conforme **F-MS-4**. *Teste:* em (a), depois do `manual`, `decision:'apply'`
   com o id da pendente → 409 `PROPOSAL_STALE`.
7. **Gates do diff:** `dtoShapeSnapshot` + `.gen.ts` regenerados (no Windows, reverter o churn e inserir só o
   schema novo); doc OpenAPI do corpo novo em `routes/docs/dashboard.paths.ts` (mesmo path: o
   `openapi-paths.test.ts` não muda de contagem); `tsc` do server e `tsc -p tsconfig.test.json`; `check:arch`.
   Nenhum `eventType` de auditoria (a sessão é efêmera; BRIEF W6 §8).

### FE — `FE-INCR-W6-MANUAL-SESSION`

8. **Tipos do formulário manual** — conforme **F-MS-2**. *Teste (vitest):* as opções do `<select>` são as do
   caminho ratificado, e o mapeamento (ex.: `email` → `{type:'string', format:'email'}`) sai no corpo.
9. **"Salvar Alterações" grava no servidor.** `handleSave` monta `changes` pelo diff entre a tabela recebida e a
   editada (campos novos → `add`; `hidden` mudado → `setHidden`), chama
   `InterviewService.customizeFields({kind:'manual', …})` tipado pelo `.gen.ts` e, no sucesso, sobe
   `data.table` ao hook (`onUpdateTable`) e mostra `onboardingFieldsSaved`. Sem mudança → não chama. Sai o
   `setTimeout` que simulava o delay. *Teste:* adicionar um campo e esconder outro → um `fetch` com os dois
   itens; `onUpdateTable` recebe `data.table`.
10. **Erros por `code`:** `INTERVIEW_SESSION_NOT_FOUND` → `onSessionLost` (como o modo IA, F-W4-2 b);
    `MANUAL_CHANGE_INVALID` → mensagem por campo a partir de `details` (motivo traduzido); `INTERVIEW_SESSION_CONFLICT`
    → "a sessão mudou em outra aba, recarregue"; resto → genérico. A edição local fica na tela para o usuário
    corrigir. *Teste:* os 4 ramos.
11. **Campo sensível no formulário** — conforme **F-MS-3** (em (a): selo + texto do art. 5º, II + `Checkbox`
    canônico de ciência que habilita o Salvar quando algum campo novo casa a rede). *Teste:* conforme o caminho.
12. **Padrões de tela:** strings novas no `common` pt/en (paridade); `Button`/`Checkbox` de `components/ui`;
    `neutral-*`, `rounded-2xl`. *Teste:* paridade i18n.

### Gate humano

13. **Sign-off de browser:** o agente acrescenta passos à seção W6 do `RUNBOOK-H2-WIZARD-ENTREVISTA.md` (em
    branco): adicionar campo manual → Salvar → `kind:"manual"` 200 → voltar à IA e pedir algo sobre o campo → a
    proposta o enxerga; Aplicar da IA não apaga o campo manual. Desfecho e assinatura do dono.

## 2. Contratos (esboço materializável)

### 2.1 Entrada — acréscimo à união de `features/interview/dtos/CustomizeFields.dto.ts`

```ts
const ManualFieldSchema = z.object({
  name: z.string().trim().min(1),
  label: z.string().trim().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date', 'datetime']), // F-MS-2 (a)
  format: z.enum(['email', 'phone']).optional(),                    // F-MS-2 (a): email/phone viram format
  required: z.boolean(),
}).strict();

const ManualChange = z.discriminatedUnion('action', [
  z.object({ action: z.literal('add'), field: ManualFieldSchema }).strict(),
  z.object({ action: z.literal('setHidden'), name: z.string().min(1), hidden: z.boolean() }).strict(),
]);

// novo membro da união `CustomizeFieldsDto`
z.object({
  kind: z.literal('manual'), ...SessionRef,
  changes: z.array(ManualChange).min(1).max(50),
  acknowledgeSensitive: z.literal(true).optional(),               // F-MS-3 (a)
}).strict();
```

O `ManualFieldSchema` é a borda da rota; a regra do campo continua sendo o `AdvancedFieldSchema` (item 3).

### 2.2 Saída

`200` → `CustomizeFieldsResult` (inalterado), com `applied: true`, `proposal: null`, `discarded: []`.

Erros: `400` DTO · `400 MANUAL_CHANGE_INVALID` `{ details: Array<{ index: number; name: string; reason: 'reserved'|'exists'|'not_found'|'duplicate'|'invalid' }> }` ·
`400 SENSITIVE_FIELD_NOT_ACKNOWLEDGED` (F-MS-3 a) · `404 INTERVIEW_SESSION_NOT_FOUND | TABLE_NOT_IN_SESSION` ·
`409 INTERVIEW_SESSION_CONFLICT`.

## 3. Divisão em PRs

| PR | Conteúdo | Pré-condição |
|---|---|---|
| **este** | BRIEF (entra no #785, que é o PR do W6 aberto) | — |
| W6-MANUAL | itens 1–7 (commit BE) + 8–12 (commit FE), PR novo empilhado sobre a branch do #785 | forks ratificados |
| — | item 13 | humano (dono) |

## 4. Forks

| Fork | Tema | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-MS-1** | Contrato | (a) `kind:'manual'` com lista de operações (`add`, `setHidden`) na rota do W6 · (b) `kind:'manual'` com a lista **inteira** de campos (substitui) · (c) rota própria (`PUT …/interview/tables/:key/fields`) | **(a)**: o servidor só aceita o que o manual sabe fazer (não remove nem reescreve campo do preset nem o que a IA aplicou); reusa sessão com dono, 404/409 e o `CustomizeFieldsResult`; nenhum path novo | ✅ **(a)**, dono, questionário, 2026-10-21, *"Operações na rota do W6"* |
| **F-MS-2** | Tipos `email`/`password`/`phone` do formulário | (a) `email`/`phone` → `type:'string'` + `format`; `password` sai do formulário · (b) idem, e `password` vira `string` · (c) o formulário passa a oferecer só os tipos do motor (sem `email`/`phone`) | **(a)**: o motor já tem `format` para e-mail e telefone; guardar senha em tabela de negócio não é caso do produto (o motor não tem tipo para isso, e texto puro seria senha em claro) | ✅ **(a)**, dono, questionário, 2026-10-21, *"email/phone viram format; password sai"* |
| **F-MS-3** | Campo sensível adicionado à mão | (a) mesma ciência do modo IA: selo + texto + caixa; o servidor exige `acknowledgeSensitive` (400 sem ele) · (b) só selo e texto, sem exigir ciência · (c) nada | **(b)**: no manual o usuário escreve o campo — o ato já é explícito, que é o que a ciência do F-W6-6 garante quando quem propõe é a IA; o aviso informa sem travar. A lei não obriga confirmação em texto literal (dossiê `pesquisas-legais/w6-campos-ia-dado-saude/relatorio.md` [D01], §4 "ambíguo") | ✅ **(a)**, dono, questionário, 2026-10-21, *"Mesma ciência do modo IA"* (contra a recomendação) |
| **F-MS-4** | Proposta da IA pendente quando o manual salva | (a) o `manual` descarta a pendente (o Aplicar seguinte dá 409 `PROPOSAL_STALE`, e o modo IA já trata) · (b) mantém a pendente e o Aplicar revalida contra os campos atuais | **(a)**: a proposta foi calculada sobre campos que mudaram; (b) exige revalidar no `decision` (código novo no caminho do item 10) para o mesmo resultado prático | ✅ **(a)**, dono, questionário, 2026-10-21, *"O manual descarta a pendente"* |

Decidido sem fork (um caminho só razoável): tudo ou nada no lote (item 3) — gravar metade de um "Salvar" deixa a
tela e a sessão divergentes; nenhuma linha no histórico da conversa (o prompt da IA já lê os campos atuais).

## 5. Pendente de validação externa

- **F-MS-3** se apoia na mesma leitura do dossiê do W6 (LGPD art. 5º, II; art. 46, §2º): a lei não obriga marcar
  nem confirmar em texto literal. A decisão é de produto; a pergunta exata ao advogado, se o dono quiser, está no
  relatório §4 do dossiê.

## 6. Insumos ausentes

- Nenhum.

## 7. Achados fora de escopo

- **O valor só chega com o W1**: sem levar `customizationState` ao `/dashboard/create`, o campo gravado na sessão
  para no painel — vale para a IA e para o manual.
- **Remover e editar campo à mão** não existem no modo manual hoje; ficam fora (o F-MS-1 a não os prevê).
