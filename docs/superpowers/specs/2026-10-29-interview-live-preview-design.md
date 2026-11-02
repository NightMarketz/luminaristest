# Prévia ao vivo da tela do módulo custom na entrevista — design

- **Data:** 2026-10-29
- **Origem:** conversa de design com o dono (brainstorming), seções 1–5 aprovadas uma a uma no chat.
- **Autorização:** dono, chat, 2026-10-29: "Sim, escreve a spec". Cobre **só este documento**: não autoriza
  código nem BRIEF executável (o `executa` continua pendente, ORCH-006).
- **Próximo passo:** plano de implementação (writing-plans / `sessao-planejamento`) a partir desta spec.

## 1. Objetivo

Durante a customização da entrevista (W1, antes do `/dashboard/create`), o usuário vê **a tela inteira da
categoria** — abas, filtros, KPIs, formulário, kanban — montada com o schema que o create vai provisionar e com
**dados de exemplo plausíveis**. Dois objetivos, ambos exigidos:

1. **Conferir antes de criar:** o que aparece na prévia é o que o create vai gerar.
2. **Encantar:** a tela parece um sistema em uso, não um esqueleto vazio.

"Ao vivo" quer dizer: a **proposta pendente** da IA (antes de Aplicar/Descartar) aparece destacada na prévia, e
o modo manual reflete cada edição.

### Decisões do dono (chat, 2026-10-29)

| Pergunta | Escolha |
|---|---|
| Momento | Na entrevista (W1) |
| Fidelidade | A tela inteira da categoria |
| Objetivo | Os dois (conferir + encantar) |
| Ao vivo | Mostra a proposta pendente |
| Abordagem | A — schema composto pelo servidor + troca da fonte de dados no FE |
| Dados de exemplo | (a) Determinístico |
| Layout | A — prévia como palco, chat acoplado à direita |

### Fora do escopo

- Provisionar qualquer coisa (tabela, linha, lançamento contábil) antes do create.
- Persistir linhas digitadas na prévia.
- Fluxos que dependem de efeito real: `createSaleWithItems`, `updateSale` (ficam desligados na prévia).
- Gerar exemplos por LLM (meio-termo citado e não escolhido).
- Manifesto de preset do `PRE-ADR-BUILDER-VERTICAIS` (relacionado, não é dependência).

### Abordagens descartadas

- **B — sandbox no servidor** (provisionar num escopo temporário e apagar): efeito real antes do create, limpeza
  frágil, toca a ponte contábil.
- **C — maquete paralela** (componentes de prévia próprios): diverge da tela real e quebra o objetivo "conferir".

## 2. Servidor

### 2.1 Extrair a composição do create

Hoje `server/src/controllers/dashboardController.ts:183–345` (`handleCustomCreation`) compõe o preset custom
inline: `getPresetByKey` → `resolveModuleSelection` → `{...CoreSystemPreset.tables, ...composeModuleTables,
...originalPreset.tables}` → `applyModuleRemovals` / `assertRemovalsAllowed` → `assertAddedFieldsRespectModules`
+ validação por `CreateDynamicTableDto.shape.schema` → `addedTables` → `applySelectOverrides` → `finalPayload` →
descarte de relação opcional órfã (`@@PRESET_TABLE_KEY::`) → `provision` → `activateAccountingOrReport`.

- Nova função pura **`composeCustomPreset(draft: CustomCreationDraft) → { tables, keptModules }`** em
  `server/src/features/dynamicTables/presets/`. Recebe o rascunho, devolve o `finalPayload`; **lança** erro
  tipado (não escreve em `res`). Nenhuma escrita em banco — a deleção das tabelas removidas fica no create.
- O create passa a: `composeCustomPreset` → deletar removidas → `provision` → `activateAccountingOrReport`.
- **Teste-guarda antes da extração:** congelar os corpos atuais de erro do create custom — os dois formatos de
  400 (`{error, details}` inline da validação de campos e `ValidationError` com `reason`
  `ADDED_TABLE_EXISTS`/`ADDED_TABLE_INVALID`) e o 404 de `UnknownSuiteError`. A extração não pode mudá-los.

### 2.2 Rota de prévia do schema

`POST /dashboard/ai/InterviewPreview` — Route → Controller → Service (`InterviewPreviewService`), DTO Zod.

- **Body:** `{ sessionId, pending?: { proposalId?, manualChanges? } }`.
  `manualChanges` validado por `ManualChangeSchema` (de `CustomizeFields.dto.ts`).
- Lê a sessão do W4 (dono, TTL; 404 se não existe/expirou, 409 de dono). O rascunho vem de
  `sessionComposition.ts` (verificado: já deriva `presetKey`, `removedTables`, `addedFields`, `addedTables`).
- Aplica `pending` **em memória**: a proposta lida da sessão por `proposalId` + as `manualChanges` ainda não
  salvas. **Nunca grava** na sessão.
- Chama `composeCustomPreset`. **Nunca** chama `provision` nem a ponte contábil.
- **Resposta:** `{ version, tables: IDynamicTable[], diff, sampleRows }`
  - `tables`: ids `preview:<presetTableKey>`; relações `@@PRESET_TABLE_KEY::x` resolvidas para `preview:x`.
  - `diff`: `{ addedTables[], removedTables[], addedFields{table: name[]}, hiddenFields{table: name[]} }`,
    calculado entre o rascunho salvo e o rascunho + `pending`. Sem `pending`, só traz o que difere do preset
    original (para os selos "novo").
  - `version`: a `version` da sessão do W4 lida.
  - `sampleRows`: §4.
- **Erro de composição:** 400 com o mesmo `reason` que o create daria.
- **Teste de equivalência:** para o mesmo rascunho, `tables` da prévia == `finalPayload` do create, exceto ids.

### 2.3 Rota de analytics da prévia

`POST /dashboard/ai/InterviewPreview/analytics` — `{ sessionId, pending?, chartKey | tableId, params }`.

- Recompõe (mesma função), gera as mesmas linhas de exemplo e roda o **processador real** do
  `ProcessorRegistry` com um `AnalyticsProcessorContext` em memória (`rows`, `fetchByPresetTableKey`,
  `fetchByTableId` sobre as linhas de exemplo).
- Linhas digitadas pelo usuário na prévia **não** entram nos KPIs; a tela avisa ("KPIs calculados sobre os
  dados de exemplo").
- **Teste:** com as mesmas linhas, prévia e rota real devolvem o mesmo `ChartDataPoint[]`.

## 3. Frontend — fonte de dados trocável

As views chamam serviços estáticos (contagem em `category-views`: `DynamicTableService` deleteRecord 7,
updateRecord 5, getTableData 5, createRecord 4, getCustomData 3, getTableById 1, deleteRecordsBatch 1;
`FinanceService` getCustomData 3, fetchChartData 2, updateSale 1, getDrillDownData 1, discoverKPIs 1,
createSaleWithItems 1 — 23 arquivos). Um provider sozinho não basta.

- Interface **`TableDataSource`** com exatamente essas operações + `getTables` (usado por
  `CrmTableScreen.tsx:61`). Exposta por `useTableDataSource()`; o valor padrão do contexto delega aos serviços
  reais — fora da prévia nada muda.
- **Troca mecânica** `DynamicTableService.x(...)` / `FinanceService.x(...)` → `ds.x(...)` nos 23 arquivos, em
  `useTableData` (`dynamic-tables.client.ts:26`) e no `CrmTableScreen`.
- **`PreviewDataSource`** (em memória, alimentado pela resposta de §2.2):
  - leituras servem `tables` e `sampleRows`; analytics chama §2.3;
  - escritas genéricas (create/update/delete/batch) mudam só a memória;
  - `createSaleWithItems` e `updateSale` rejeitam com o aviso "disponível depois de criar o sistema";
  - quando o schema muda, os exemplos são substituídos; linhas digitadas ficam se a tabela ainda existe
    (campos removidos são descartados delas).
- **Teste:** cada view de categoria montada sob `PreviewDataSource` com `fetch` global lançando erro — nenhuma
  chamada de rede escapa. (Flag global "modo prévia" foi descartada.)

## 4. Dados de exemplo (determinístico)

Gerados no servidor, dentro do `InterviewPreviewService`, por um gerador puro.

- Semente `hash(sessionId + presetTableKey)`: mesma sessão, mesmas linhas.
- Preenchimento por campo: `type`, `format` (email/phone), `numberFormat`, `options`, `validation`,
  `relation` (aponta para linhas existentes da tabela-alvo, gerada antes), `required` / `requiredIf`.
- Vocabulário: listas pt-BR por setor (nomes, serviços, produtos, cidades) escolhidas pelo `aiProfile` do
  preset, mais as `options` do próprio schema.
- 12 a 30 linhas por tabela, datas espalhadas nos últimos 90 dias.
- Toda linha gerada passa na validação do motor para o schema (teste).
- Faixa fixa na tela: "Prévia: dados de exemplo, nada foi criado".

## 5. Ao vivo

- `pending = { proposalId?, manualChanges? }`, montado pelo FE a partir do estado da customização.
- O FE refaz §2.2 quando:
  - a `version` da sessão muda;
  - uma proposta aparece ou some;
  - 400 ms depois da última edição manual (debounce).
- Pedido antigo cancelado por `AbortController`; a resposta só é aceita se a `version` for a mais recente
  pedida. Enquanto carrega, a tela anterior fica visível com um indicador.
- **Destaque do diff:** `usePreviewDiff()` + atributo `data-preview-diff` em `GenericTable`, `DynamicForm` e
  card do kanban, e nas abas:
  - adicionado → selo "novo";
  - removido → riscado, **só enquanto pendente** (depois de aplicado, some);
  - ocultado → esmaecido.
- **Erro:** mostra o `reason` e mantém a última prévia boa.
- **Testes:** remover / descartar / aplicar uma proposta; respostas fora de ordem (a mais velha chega por
  último e é ignorada).

## 6. Layout (opção A)

- **Quando muda:** as etapas antes da customização (checklist de módulos, pergunta fiscal, escolha de criação)
  ficam como hoje. A tela vira construtor quando a sessão tem `presetKey` e entra na customização.
- **Esquerda (~240px):** o `LeftSidebar` da entrevista, que já lista as tabelas, ganha clique para trocar a
  tela do centro, agrupamento por categoria e os selos do diff. **Não** reusa o `DashboardSidebar`: ele busca
  `getSidebar()` e oferece `deleteSystem()` (`DashboardSidebar.tsx:101,134`), que não existem antes do create
  — divergência de posse pelo critério de reuso.
- **Centro (flexível):** a tela real da categoria sob `TableDataSourceProvider` de prévia, com a faixa.
- **Direita (~420px):** painel único. Em cima, a conversa da entrevista com o cartão da proposta
  (Aplicar/Descartar); embaixo, aba "Campos | Manual" com o conteúdo do `RightSidebar` atual. Os botões
  flutuantes (`left: 405px` / `right: 505px`) saem.
  - O chat da entrevista e o `AIChatMode` continuam **estados separados** em `useAiInterview`; muda só onde
    aparecem. O cartão da proposta lê a proposta da sessão, não do chat que a pediu.
- **Rodapé fixo:** "Criar sistema" → `/dashboard/create` atual, mesmo rascunho.
- **Responsivo:** < 1280px a esquerda vira gaveta; < 1024px cai para abas Conversa | Prévia, com selo quando
  há proposta pendente.
- **Teste:** render das três colunas; clicar numa tabela troca o centro; proposta pendente aparece no cartão
  e no destaque do centro.
- Regras de UI do projeto: `neutral-*`, cards `rounded-2xl`, verificação contra build de produção
  (tela atrás de `withAuth`).

## 7. Ordem sugerida (para o plano)

1. Teste-guarda dos corpos de erro do create → extrair `composeCustomPreset` (sem mudança de comportamento).
2. Gerador de exemplos + `InterviewPreviewService` + rota §2.2 + teste de equivalência.
3. Rota de analytics §2.3 + teste de equivalência do processador.
4. `TableDataSource` + troca mecânica (sem mudança visível) + teste de "nenhum fetch escapa".
5. `PreviewDataSource` + layout A + ao vivo + destaque.

Os passos 1–3 (servidor) e 4 (FE, sem dependência de servidor) podem andar em paralelo; o 5 depende de todos.

## 8. Riscos e graus

| Claim | Grau |
|---|---|
| A sessão do W4 já deriva o rascunho completo (`sessionComposition.ts:29–62`) | verificado |
| Composição inline em `dashboardController.ts:183–345` | verificado (lido) |
| 23 arquivos com chamada a serviço estático em `category-views` | verificado (grep) |
| `CrmTableScreen` e `DashboardSidebar` chamam serviço estático | verificado (grep) |
| Processadores de KPI rodam sobre contexto em memória sem banco | inferido (assinatura do `AnalyticsProcessorContext`); o teste de §2.3 prova |
| Juntar os dois chats no painel direito sem embaralhar os fluxos | inferido; risco principal de UI |
| Troca mecânica não muda comportamento fora da prévia | assumido; o padrão do contexto delega aos serviços reais e a suíte existente cobre |

**Caso adversarial considerado:** proposta chega pelo chat de campos com a conversa aberta → aparece no mesmo
cartão, porque o cartão lê da sessão. **Checagem que falharia se o design estiver errado:** o teste de
equivalência de §2.2 (schema da prévia ≠ `finalPayload` do create) e o de §3 (qualquer `fetch` na prévia).
