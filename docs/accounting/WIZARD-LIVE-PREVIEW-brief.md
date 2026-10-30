# BRIEF — Prévia ao vivo da tela do módulo custom na entrevista

- **Nó:** nenhum ainda em `docs/plano/nos/`. Frente aberta pelo dono no chat de 2026-10-29. Os vizinhos são
  [[W1]] (`done`), [[W4]] e [[W6]] (`human-open`). Para criar a nota do nó, ver F-LP-1.
- **Spec de origem:** [`docs/superpowers/specs/2026-10-29-interview-live-preview-design.md`](../superpowers/specs/2026-10-29-interview-live-preview-design.md)
  (commit `b91d37dc`). As seções 1 a 6 foram aprovadas pelo dono uma a uma, e a spec inteira com "Aprovada, faz o plano".
- **Autorização:** dono, chat, 2026-10-29: "Aprovada, faz o plano". Vale **só para este BRIEF**. Código,
  `executa` e merge ficam de fora (ORCH-006).
- **Estado:** BRIEF pronto, com **0 de 6 forks ratificados** (§3). Tamanho estimado: **XL**, em 5 PRs.
- **Base lida:** `origin/main` @ `778d867c` (2026-10-29).

## 0. Estado de partida (conferido no código)

| Fato | Fonte |
|---|---|
| A composição do preset custom fica inline no controller, sem função reusável | `server/src/controllers/dashboardController.ts:183-345` |
| A sessão do W4 já deriva o rascunho completo (`presetKey`, `removedTables`, `addedFields`, `addedTables`) | `server/src/features/interview/CustomizationService/sessionComposition.ts:29-62` |
| A proposta pendente do W6 fica na sessão (`pendingProposal`) | `server/src/features/interview/models/InterviewTypes.ts:82` |
| Sessão com dono e TTL: `findActive(id, userId, now)` e `saveState` com versão | `server/src/features/interview/repositories/InterviewSessionRepository.ts:44,52` |
| As rotas da entrevista ficam em `/dashboard/ai/*`, com auth no controller | `server/src/routes/dashboard.ts:37-45`, `controllers/interviewController.ts:117-125` |
| O motor de KPIs busca chart, tabela e linhas **no banco do usuário** (`getAllPresetGroupsAsync(userId)`, `getTablesForUser`, `getAllTableData`) e só então chama o processador | `server/src/features/analytics/engine/AnalyticsResolver.ts:299-330` |
| O processador é puro sobre `AnalyticsProcessorContext` | `server/src/features/analytics/core/ProcessorRegistry.ts:47,75` |
| A tela de KPIs faz **5** chamadas: `/analytics/presets[/:presetKey]`, `/analytics[/presets/:k]/data`, `/analytics/discover/:tableId` e `/analytics/drill-down`. Duas delas vão por `getCustomData(url)` com URL montada à mão | `my-app/.../finance/services/FinanceService.ts:62-117`, `hooks/analytics/useAnalyticsData.ts:163-168`, `useWidgetAnalyticsData.ts:62-66` |
| 23 arquivos em `category-views` chamam serviço estático, e também `CrmTableScreen.tsx:61` (`getTables`) | grep (spec §3) |
| `DashboardSidebar.tsx:101,134` chama `getSidebar()` e `deleteSystem()`. Fica fora da prévia (spec §6) | grep |

## 1. Checklist (comportamentos testáveis)

São cinco PRs. Os PR-1 a PR-3 são servidor e vão em sequência. O PR-4 (FE) não depende do servidor e pode correr junto.
O PR-5 depende de todos (F-LP-5).

**PR-1 · Extração da composição (sem mudar comportamento)**
1. Teste-guarda **antes** da extração, congelando os corpos de erro do create custom:
   - o 400 inline `{error, details}` da validação de campo;
   - o 400 `ValidationError` com `reason` `ADDED_TABLE_EXISTS` e `ADDED_TABLE_INVALID`;
   - os 400 `MODULE_PARTIAL` e `REMOVAL_LOCKED` (W1/W2);
   - o 404 de `UnknownSuiteError`.

   O teste é de integração na rota `POST /dashboard/create`.
2. Função pura `composeCustomPreset(draft) → { tables, keptModules }` em
   `server/src/features/dynamicTables/presets/composeCustomPreset.ts`. Ela não faz I/O de escrita e lança erro
   tipado em vez de escrever em `res`. Para manter o 400 inline do item 1 igual, o erro de validação de campo
   ganha classe própria, e o controller o mapeia para o mesmo corpo.
3. `handleCustomCreation` passa a chamar `composeCustomPreset`, deletar as removidas, `provision` e
   `activateAccountingOrReport`. O teste do item 1 continua verde sem nenhuma edição.
4. Testes unitários de `composeCustomPreset`: remoção por módulo, campo que colide com módulo, `addedTables` e
   relação opcional órfã descartada.

**PR-2 · Rota de prévia do schema e dados de exemplo**

5. Gerador puro `buildSampleRows(tables, seed, aiProfile)` em `server/src/features/interview/PreviewService/`:
   - a semente é `hash(sessionId + presetTableKey)`;
   - o preenchimento segue `type`, `format`, `numberFormat`, `options`, `validation`, `relation`, `required` e
     `requiredIf`;
   - gera de 12 a 30 linhas por tabela, com datas nos últimos 90 dias;
   - as relações apontam para linhas da tabela-alvo, gerada antes (ordenação topológica pelas relações).

   Testes: a mesma semente dá as mesmas linhas, e toda linha passa na validação do motor (ver §5, insumo ausente 1).
6. Vocabulário pt-BR por setor (nomes, serviços, produtos, cidades), escolhido pelo `aiProfile` do preset, com
   fallback genérico. É constante versionada, não vem de LLM (spec §4, fork (a) da conversa).
7. `InterviewPreviewService.preview(user, { sessionId, pending })`:
   - faz `findActive` e devolve 404 se não acha (mesmo padrão das rotas do W6);
   - aplica `pending` em memória: a proposta por `proposalId` (deve ser igual a `pendingProposal.id`, senão 409
     `PROPOSAL_STALE`) e as `manualChanges`;
   - chama `composeCustomPreset` e calcula o `diff` (§2);
   - **nunca** chama `saveState`, `provision` nem a ponte contábil.

   Teste com espiões nos três: nenhuma chamada.
8. Rota `POST /dashboard/ai/InterviewPreview`, com a cadeia Route → Controller → Service, Factory e DTO Zod
   `.strict()`. A rota não acessa repositório próprio, porque lê pelo `InterviewSessionRepository`.

   Testes:
   - 401 sem auth;
   - 404 para sessão alheia ou expirada;
   - 400 para chave extra;
   - 400 com o mesmo `reason` do create para cada erro do item 1.
9. Teste de equivalência: para o mesmo rascunho, `tables` da prévia é igual ao `finalPayload` que o create
   passaria ao `provision`, tirando os ids `preview:*`.

**PR-3 · KPIs da prévia (F-LP-2, F-LP-3)**

10. Extrair do `AnalyticsResolver` um núcleo que recebe `{ chart, table, rows, fetchByPresetTableKey }` já
    resolvidos e devolve `ChartDataPoint[]`. `resolveChartData` e `resolveChartDetails` continuam com a mesma
    assinatura e o mesmo resultado, protegidos por teste de caracterização antes da extração.
11. Rota de analytics da prévia, no formato que F-LP-3 decidir. Ela cobre as operações listadas em §0 (presets,
    data, discover, drill-down) sobre as linhas de exemplo do item 5. Os grupos de chart vêm do preset do
    rascunho, não do `userId`.
12. Teste de equivalência: com as mesmas linhas, a rota de prévia e o `resolveChartData` real devolvem o mesmo
    `ChartDataPoint[]`. O teste roda em pelo menos um processador de finance e um de serviços.

**PR-4 · Fonte de dados trocável no FE (sem mudança visível)**

13. Interface `TableDataSource` em `my-app/features/dashboard/components/shared/`, com as operações de §2 e
    `getTables`. Também `TableDataSourceProvider` e `useTableDataSource()`, cujo padrão delega aos serviços
    reais.
14. Trocar `DynamicTableService.x` e `FinanceService.x` por `ds.x` nos 23 arquivos de `category-views`, em
    `useTableData` e no `CrmTableScreen`. As chamadas `getCustomData(url)` de analytics viram métodos tipados
    (F-LP-2). Os vitest existentes dessas views seguem verdes sem edição de asserção.
15. Teste de caracterização: uma view de cada família (finance, kanban, people, planning, products, services,
    inventory), montada sem provider, chama o serviço real. O teste prova que o padrão do contexto delega.

**PR-5 · Prévia na entrevista**

16. `PreviewDataSource` em memória, alimentado pela resposta do item 8 e, para analytics, pela rota do item 11.
    - Escritas genéricas mudam só a memória.
    - `createSaleWithItems` e `updateSale` rejeitam com a mensagem i18n "disponível depois de criar o sistema".
    - Quando o schema muda, os exemplos são trocados. As linhas digitadas ficam se a tabela ainda existir, sem
      os campos removidos.

    Teste: cada view de categoria montada sob `PreviewDataSource` com `fetch` global lançando erro. Nenhuma
    chamada pode escapar.
17. Hook `useInterviewPreview(sessionId, pending)`, que refaz o pedido em três casos:
    - quando a `version` da sessão muda;
    - quando uma proposta aparece ou some;
    - 400 ms depois da última edição manual.

    O pedido antigo é cancelado por `AbortController`, e só vale a resposta da `version` mais recente. Enquanto
    carrega, a tela anterior fica visível com indicador. Se der erro, aparece o `reason` e fica a última prévia
    boa.

    vitest: respostas fora de ordem (a mais velha chega por último e é ignorada) e erro que mantém a anterior.
18. `usePreviewDiff()` e o atributo `data-preview-diff` em `GenericTable`, `DynamicForm`, no card do kanban e
    nas abas:
    - adicionado mostra o selo "novo";
    - removido aparece riscado só enquanto está pendente;
    - ocultado aparece esmaecido.

    vitest: remover, descartar e aplicar uma proposta.
19. Layout A em `AiInterviewSetup` (spec §6). As etapas antes da customização ficam iguais. Com `presetKey` e a
    etapa de customização, a tela fica assim:
    - **à esquerda**, o `LeftSidebar` com navegação, agrupamento por categoria e selos do diff;
    - **no centro**, a tela da categoria sob o provider de prévia, com a faixa "Prévia: dados de exemplo, nada
      foi criado" e o aviso de que os KPIs usam os exemplos;
    - **à direita**, um painel único com a conversa e o cartão da proposta em cima, e a aba "Campos | Manual" do
      `RightSidebar` embaixo;
    - **no rodapé**, "Criar sistema", que leva ao create atual.

    Os botões flutuantes de `405px` e `505px` saem. A conversa e o `AIChatMode` continuam com estados separados
    em `useAiInterview`, e o cartão da proposta lê da sessão.
20. Responsivo: abaixo de 1280px, a esquerda vira gaveta. Abaixo de 1024px, a tela vira abas Conversa | Prévia,
    com selo quando há proposta pendente. vitest de render nos dois cortes.
21. Campo sensível pendente (F-LP-6) aparece na prévia conforme o fork ratificado.

**Gates de todos os PRs**

22. Os gates que o diff aciona:
    - `dtoShapeSnapshot` para os DTOs novos, inserindo só o novo (memória do reorder no Windows);
    - guarda de path-count do openapi (1 ou 2 paths novos, conforme F-LP-3);
    - paridade i18n pt/en (namespace novo entra em `ns`);
    - `check:arch` em server e my-app;
    - `tsc` limpo, com `tsconfig.test.json` no server e `npm run test:types` no my-app;
    - `neutral-*` e `rounded-2xl`.

    No FE, os tipos vêm de `types/contracts/**.gen`, sem importar o backend.
23. Verificação em build de produção (a tela fica atrás de `withAuth`), feita pelo agente no PR-5, com print e
    texto. O sign-off de browser é do dono e entra numa seção nova do `RUNBOOK-H2-WIZARD-ENTREVISTA` (§4).

## 2. Contratos (esboço)

```ts
// BE — POST /dashboard/ai/InterviewPreview
const InterviewPreviewDto = z.object({
  sessionId: z.string().min(1),
  pending: z.object({
    proposalId: z.string().min(1).optional(),
    manualChanges: z.array(ManualChangeSchema).max(50).optional(), // de CustomizeFields.dto.ts
  }).strict().optional(),
}).strict();

type PreviewTable = IDynamicTable & { id: `preview:${string}` }; // relações @@PRESET_TABLE_KEY::x → preview:x

type PreviewDiff = {
  addedTables: string[];                 // presetTableKey
  removedTables: string[];               // só as removidas pelo pending
  addedFields: Record<string, string[]>; // vs preset original (selo "novo") ∪ pending
  hiddenFields: Record<string, string[]>;
  pendingOnly: { addedTables: string[]; removedTables: string[]; addedFields: Record<string, string[]>; hiddenFields: Record<string, string[]> };
};

type InterviewPreviewResponse = {
  success: true;
  data: {
    version: number;                                // version da sessão lida
    presetKey: string;
    tables: PreviewTable[];
    diff: PreviewDiff;
    sampleRows: Record<string /* preview:id */, Array<{ id: string; data: Record<string, unknown>; createdAt: string }>>;
  };
};
// erros: 401 · 404 SESSION_NOT_FOUND · 409 PROPOSAL_STALE · 400 { reason } (mesmo do create)

// BE — analytics da prévia (forma (a) de F-LP-3)
const InterviewPreviewAnalyticsDto = z.object({
  sessionId: z.string().min(1),
  pending: InterviewPreviewDto.shape.pending,
  op: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('presets'), datePreset: z.string() }).strict(),
    z.object({ kind: z.literal('data'), chartKey: z.string(), datePreset: z.string(), params: z.record(z.string()).optional() }).strict(),
    z.object({ kind: z.literal('discover'), tableId: z.string().startsWith('preview:'), datePreset: z.string() }).strict(),
    z.object({ kind: z.literal('drillDown'), params: z.record(z.string()) }).strict(),
  ]),
}).strict();
// resposta: o mesmo envelope de cada rota real correspondente (data/presets/discover/drill-down)

// FE — fonte de dados
interface TableDataSource {
  getTables(): Promise<IDynamicTable[]>;
  getTableById(id: string): Promise<IDynamicTable>;
  getTableData(id: string, query?: TableQuery): Promise<TablePage>;
  createRecord(id: string, data: Record<string, unknown>): Promise<TableRow>;
  updateRecord(id: string, rowId: string, data: Record<string, unknown>): Promise<TableRow>;
  deleteRecord(id: string, rowId: string): Promise<void>;
  deleteRecordsBatch(id: string, rowIds: string[]): Promise<void>;
  // analytics tipado (F-LP-2 (a)) — substitui getCustomData(url)
  getAnalyticsPresets(presetKey: string | undefined, datePreset: string): Promise<AnalyticsPresetGroup[]>;
  fetchChartData(chartKey: string, datePreset: string, presetKey?: string, params?: Record<string, string>): Promise<ChartResponse>;
  discoverKPIs(tableId: string, datePreset: string): Promise<DiscoverResponse>;
  getDrillDownData(params: URLSearchParams): Promise<DrillDownResponse>;
  // efeito real — PreviewDataSource rejeita com PreviewUnavailableError
  createSaleWithItems(...args: Parameters<typeof FinanceService.createSaleWithItems>): ReturnType<typeof FinanceService.createSaleWithItems>;
  updateSale(...args: Parameters<typeof FinanceService.updateSale>): ReturnType<typeof FinanceService.updateSale>;
}
```

Os nomes `TableQuery`, `TablePage`, `TableRow`, `ChartResponse`, `DiscoverResponse` e `DrillDownResponse`
**reaproveitam os tipos que os serviços já devolvem hoje**. O executor lê a assinatura atual de cada método e
não inventa shape novo.

## 3. Forks: RATIFICAÇÃO PENDENTE (0 de 6)

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-LP-1** Nó no vault | (a) nota nova `docs/plano/nos/W8.md` (`plataforma`, `depende_de: [W1, W4, W6]`) com o fold deste BRIEF; (b) item dentro do W1, que já está `done`; (c) sem nó, só a spec e o BRIEF | **(a)**. O W1 está fechado, e reabri-lo mistura estados. Sem nó, a `autorizacao` não tem onde morar, e o protocolo do vault deixa o item sem rota | PENDENTE |
| **F-LP-2** Analytics no `TableDataSource` | (a) trocar `getCustomData(url)` por métodos tipados (presets, data, discover, drillDown); (b) manter `getCustomData(url)`, com o `PreviewDataSource` interpretando a URL | **(a)**. Com (b), a prévia passa a depender do formato de string montado em 3 hooks, e uma URL nova escapa calada para a rede, que é o que o teste do item 16 tenta impedir | PENDENTE |
| **F-LP-3** Forma da rota de analytics | (a) uma rota `POST /dashboard/ai/InterviewPreview/analytics` com união `op.kind`; (b) quatro rotas espelhando as reais (`.../presets`, `.../data`, `.../discover`, `.../drill-down`) | **(a)**. É um path no openapi e um DTO, a sessão e o `pending` são validados num ponto só, e o FE tem um método por `kind` | PENDENTE |
| **F-LP-4** Linhas digitadas na prévia | (a) só na memória do navegador e perdidas ao recarregar (spec §1, "fora do escopo"); (b) guardadas na sessão do W4 para sobreviver ao recarregar | **(a)**. A spec aprovada exclui persistir linhas, e (b) aumenta a sessão e o TTL sem pedido do dono. Fica listado porque recarregar a página apaga o que o usuário digitou | PENDENTE |
| **F-LP-5** Empacotamento | (a) um BRIEF com 5 PRs, BE e FE juntos (precedente: W1 e W6); (b) separar em `BE-INCR-WIZARD-PREVIEW` e `FE-INCR-WIZARD-PREVIEW` (padrão da casa) | **(a)**. O valor só existe com os dois, e W1 e W6 já fizeram assim. Os PRs continuam separados por camada | PENDENTE |
| **F-LP-6** Campo sensível pendente (W6, F-W6-8) | (a) aparece na prévia com o mesmo selo LGPD do cartão e dados de exemplo fictícios; (b) não aparece até a ciência ser dada no Aplicar | **(a)**. A prévia não coleta dado real, e esconder o campo quebra o objetivo de "conferir antes de criar". O selo deixa a ciência visível no ponto em que o usuário decide | PENDENTE |

## 4. Pendente de validação externa

- **Sign-off de browser** da prévia, passos novos numa seção "Prévia" do `RUNBOOK-H2-WIZARD-ENTREVISTA`. É gate
  humano e não tem sessão de agente. O agente prepara o runbook no PR-5, e o desfecho e a assinatura ficam com o
  dono.
- Nenhuma regra contábil, fiscal ou legal entra no checklist. O F-LP-6 só reaproveita a regra do W6, que já foi
  ratificada (dossiê `pesquisas-legais/w6-campos-ia-dado-saude/`).

## 5. Insumos ausentes

1. **Validador de linha do motor para uso puro.** O item 5 exige que toda linha gerada passe na validação da
   DynamicTable. Não confirmei se existe uma função pura (schema → Zod da linha) chamável sem `DynamicTableService`
   e sem banco. O grep por `validateRecord|validateRowAgainstSchema|buildRowSchema` em `features/dynamicTables`
   não achou nada. O executor localiza no começo do PR-2. Se não existir, extrair essa função é decisão nova:
   pausa e vira pergunta, sem duplicar a validação.
2. **Grupos de chart por preset, sem usuário.** O item 11 precisa dos chart presets do `presetKey` do rascunho.
   Existe `GET /analytics/presets/:presetKey` (`routes/analytics.ts:23`), mas não li se `getPresetAnalyticsPresets`
   depende de tabelas instaladas do usuário. O executor lê isso no começo do PR-3.
3. **`aiProfile` por setor.** Não conferi se todo preset declara `aiProfile`. O fallback genérico do item 6 cobre a
   falta, mas a lista de setores com vocabulário próprio sai dessa leitura.

## 6. Achados fora de escopo (não planejados)

- O `getCustomData(url)` aberto em `DynamicTableService` e `FinanceService` funciona como API sem tipo para
  qualquer rota. F-LP-2 resolve isso só nas chamadas de analytics das views.
- O `DashboardSidebar` continua chamando o serviço estático. Na prévia ele não aparece (spec §6), e passar a
  sidebar real pela fonte de dados seria outra frente.
- O sign-off de browser de W1, W6 e W7 continua em branco nos runbooks. O valor da prévia depende do W1 estar
  conferido na tela.
