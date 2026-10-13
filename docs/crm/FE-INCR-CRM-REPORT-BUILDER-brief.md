# FE-INCR-CRM-REPORT-BUILDER — BRIEF (sessão de planejamento)

> **Estado:** BRIEF — forks **F-FRB1..F-FRB7 RATIFICADOS 2026-10-13** (dono, chat, questionário; todos na recomendação —
> [D-2026-10-13-FE-CRM-RB-FORKS](../plano/decisoes/D-2026-10-13-FE-CRM-RB-FORKS.md)). Sem código; cada PR exige "executa".
> O F-FRB4=(a) cria um **pré-requisito de BE** (rota dos modelos) que precisa de planejamento e autorização próprios.
> Nó do vault: [`docs/plano/nos/FE-INCR-CRM-REPORT-BUILDER.md`](../plano/nos/FE-INCR-CRM-REPORT-BUILDER.md).
> **Risco principal (2 linhas):** o backend não expõe os modelos prontos (templates) — o item 10 do BE não tem rota para
> eles —, então "começar de um modelo" depende de um pré-requisito de BE (F-FRB4) ou de cópia dos 5 specs no FE.
> O segundo risco é o gráfico: o `ChartRenderer` canônico desenha **uma** série, e o run devolve **uma por medida** (F-FRB3).

## 0. Formulário

- **Item a planejar:** a tela do builder de relatórios do CRM — nó vizinho nomeado no BRIEF do backend
  (`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md` §0 "Nós vizinhos" e §7 primeiro e terceiro achados: "tela: builder
  fonte→dimensões→medidas→filtros + preview com `ChartRenderer` — nó vizinho, BRIEF próprio"; emenda 29/09: herda a
  exibição por moeda, o bloco convertido com a data da taxa e o aviso `stale`, e o KPI com um valor por moeda; emenda
  06/10: herda `series[]` e o `timeZone` do navegador no `run`).
- **Autorização (literal, chat do dono, 2026-10-13):** *"Planeja a tela do builder de relatórios do CRM"*.
  **Cobertura:** planejar exatamente esta tela (BRIEF + nota do nó). **Não** cobre: código, ratificar fork, o
  pré-requisito de BE do F-FRB4 (se escolhido, vira nó/BRIEF próprio com autorização própria).
  Divergência de protocolo registrada (a mesma do CRM-RB em 26/09 e do FE-INCR-SIMPLES): `docs/plano/README.md` pede
  PRE-ADR antes de nó novo em `nos/`; o nó nasce aqui como `planned`, por ser vizinho já nomeado de um nó `done` com
  autorização citável, e não proposta nova do `destino/`.
- **Insumos (lidos no arquivo em `origin/main` `6cef4207` — grau verificado salvo nota):**
  - **Contrato do BE (fato consumado, PRs #647/#651/#648):** `server/src/features/crm/dtos/CrmReportDto.ts` →
    tipos gerados `my-app/types/contracts/crm/CrmReportDto.gen.ts` (`CreateCrmReportInput`, `UpdateCrmReportInput`,
    `RunCrmReportInput`, `RunSavedCrmReportInput`, `ReportSpecInput`, `RunCrmReportOutputInput`, `ReportSeriesInput`,
    `ConvertedViewInput`, `CurrencyModeInput`, `PtaxRateViewInput`).
  - **Rotas** (`server/src/routes/crm.ts`): `GET/POST /api/crm/reports`, `POST /api/crm/reports/run`,
    `GET/PUT/DELETE /api/crm/reports/:id`, `POST /api/crm/reports/:id/run`. Erros nomeados no envelope
    `{ code, message, details }` (e `code` nos 400 do DTO, controller `crmReportsController.ts` `badBody`).
  - **i18n de erros já existente:** `my-app/public/locales/{pt,en}/crm.json` → `report_builder.errors.*` (10 códigos) e
    `report_builder.labels.{NO_CURRENCY,UNDECLARED_CURRENCY,RATE_UNAVAILABLE}`.
  - **Modelos prontos:** `server/src/features/crm/models/crmReportTemplates.ts` (5 specs: funil, origem, status,
    propostas, atividades) — **sem rota** (D-2026-10-13-CRM-RB-PR2-LACUNAS, "Consequências").
  - **FE canônico:** `ChartRenderer` (`features/dashboard/category-views/finance/components/analytics/charts/ChartRenderer.tsx:45`,
    props `{ chart: ChartPreset; data: ChartData }`, `ChartData.data: ChartDataPoint[]` = **uma série**; `ChartType` =
    `pie|donut|bar|line|area`, `types/analytics.types.ts:23`) e `DashboardKpiCard` — reusados por
    `features/crm/components/analytics/CrmAnalyticsDashboard.tsx`; `GenericTable`, `Modal` (my-app/CLAUDE.md gate 1).
  - **Tela CRM:** padrão `pages/crm/analytics.tsx` (`withAuth` + `CrmProvider` + `CrmLayout` + `dynamic(..., { ssr:false })`
    para Recharts + `serverSideTranslations(['common','crm','analytics'])`); navegação `features/crm/components/CrmNav.tsx`
    (`ITEMS` com módulo, `installedCrmModules`).
  - **Schema das tabelas no FE:** `DynamicTableService.getTableById` (`lib/services/dynamic-table.service.ts:17`) devolve
    o envelope `{ data: { schema } }` (lido assim em `useActorNames.ts:66` e `usePipelineBoard.ts:130` — memória
    `crm-teste-vivo-2026-09-25`: `meta.schema` direto dá `null`). `getTables()` lista as tabelas com `internalName`.
  - **Dashboard (F-RB2=(a)):** `components/widgets/dashboard-grid/` — `DASHBOARD_GRID_CONFIG.WIDGET_TYPES`
    (`dashboard-grid.config.ts`), `renderWidgetContent` (`dashboard-grid.tsx:316`, `switch (item.type)`),
    `FloatingAddWidgetButton.tsx` (lista de tipos), padrão `ErpViewWidget`/`AnalyticsWidget` com
    `initialConfig`/`onConfigChange` (`widgetConfig`).
  - **Erros do `apiClient`:** lança `{ ...body, status }` (`lib/api/api-client.ts:76`) — `code`/`details` acessíveis.
- **Nós vizinhos:** consome [[CRM-RB]] (done) e o contrato gerado; consome o `ChartRenderer`/`DashboardKpiCard`/`GenericTable`
  canônicos; acrescenta um tipo de widget ao grid do dashboard. Pré-requisito condicional: o BE dos modelos (F-FRB4).

## 1. Comportamentos (checklist numerado — cada item testável isolado)

Testes em vitest (`features/crm/**/__tests__`), com o shim de `React` global quando o componente não importa React
(my-app/CLAUDE.md). Body de escrita tipado pelos `.gen.ts`, mapper com retorno declarado (gate 7), sem `any`.

**A. Navegação e página**

1. **Rota `/crm/reports`** (F-FRB1) no padrão de `pages/crm/analytics.tsx`: `withAuth`, `CrmProvider`, `CrmLayout`,
   builder carregado com `ssr:false`, namespaces `['common','crm','analytics']`. Item novo no `CrmNav` (módulo `CRM-0`,
   chave `nav.reports`). Teste: o item aparece com só o CRM-0 instalado.
2. **Lista de relatórios** (`GET /api/crm/reports`) em `GenericTable`: nome, tipo (`kind`), gráfico, atualizado em.
   Para o ADMIN, relatório de outro usuário traz a marca "de outro usuário" (`userId !== eu`; o BE não devolve nome —
   F-RB4=(c)). Vazio → estado vazio com as ações "Novo relatório" e (se F-FRB4 permitir) "Começar de um modelo".
   Teste: lista renderiza; marca aparece só para `userId` alheio.

**B. Editor (builder)**

3. **Fonte**: select com as fontes de `CRM_REPORT_SOURCES` **instaladas** (cruzando `getTables()` por `internalName`;
   fonte não instalada não aparece). Trocar a fonte limpa joins/filtros/dimensões/medidas que não existem mais
   (confirmação antes de limpar). Teste: só instaladas; troca limpa.
4. **Campos** vêm do schema vivo (`getTableById(...).data.schema.fields`) + `id`, `_createdAt`, `_updatedAt`
   (rotulados "Criado em"/"Atualizado em"). Rótulo = `label` do campo. Teste: lista bate com o schema mockado.
5. **Medidas** (1..4): `count` (campo opcional), `sum`/`avg` só em campo `number` (os de `numberFormat:'currency'`
   marcados como dinheiro); alias opcional. O 5º bloco não é oferecido. Teste: `sum` não lista campo texto; teto 4.
6. **Dimensões** (0..2): `field` (qualquer campo) ou `period` (só `date`/`datetime`/sintéticos, com
   dia/semana/mês/trimestre/ano). Teste: período só oferece campos de data.
7. **Filtros** (0..10): campo + operador (`eq/ne/in/nin/gt/gte/lt/lte`) + valor; `select` oferece as `options` do
   schema; `in/nin` aceitam vários valores; número/data com input do tipo. Teste: `in` monta array.
8. **Regra de moeda guiada (item 17 do BE):** ao escolher `sum`/`avg` em campo de dinheiro com par
   (`CRM_MONEY_CURRENCY_PAIRS`, espelhado no FE — §3), o editor exige "separar por moeda" (adiciona a dimensão do
   par) **ou** "só uma moeda" (filtro `eq`), antes de salvar/visualizar; o 400 `REPORT_CURRENCY_MIXED` do BE continua
   sendo a verdade (o FE só evita o erro). Teste: sem escolha, "Visualizar" fica desabilitado com a explicação.
9. **Ordenação e limite** (F-RB9): por dimensão ou por medida (com várias medidas, escolher qual — `sort.key`), asc/desc,
   limite 1..500. Teste: com 2 medidas e "por medida", o `key` é obrigatório.
10. **Joins** (F-FRB5): conforme o fork. Se entrarem, seção "avançado" com até 2: fonte da direita (instalada), campo da
    esquerda, campo da direita, apelido; campos do join aparecem como `apelido.campo` nos itens 5–7.
11. **Conversão para R$** (F-RB8): opção "mostrar também convertido para R$" só habilitada quando há medida de dinheiro
    com par (senão o BE devolve 400 `REPORT_CONVERSION_NOT_APPLICABLE`). Teste: desabilitada sem medida de dinheiro.
12. **Nome, descrição, tipo e gráfico**: `kind` `chart|table|kpi`; `chartType` `bar|line|area|pie|donut|table`
    (`table` só com `kind:'table'`; `kpi` sem dimensão — F-FRB6). Teste: combinações inválidas não são oferecidas.

**C. Visualizar, salvar, apagar**

13. **Visualizar** (`POST /api/crm/reports/run`, spec do editor + `timeZone` do navegador via
    `Intl.DateTimeFormat().resolvedOptions().timeZone`): por botão (F-FRB2). Loading, erro e resultado no painel.
    Teste: o body enviado = spec + timeZone.
14. **Resultado — verdade** (F-FRB3): uma série por medida; nome do ponto `__NO_CURRENCY__` → rótulo
    `report_builder.labels.NO_CURRENCY`; valor de medida de dinheiro formatado na moeda do ponto quando
    `meta.currency.mode` é `dimension` (moeda = parte do nome do ponto que vem da dimensão de moeda) ou `filter`
    (moeda do filtro); `undeclared` → número sem símbolo + aviso "moeda não declarada". `kind:'table'` → `GenericTable`
    com uma coluna por série. `kind:'kpi'` → um `DashboardKpiCard` por ponto (um por moeda). Teste por modo.
15. **Resultado — convertido** (item 24 do BE): bloco **separado** e rotulado "Estimativa em R$ pela PTAX de venda de
    dd/mm/aaaa — não é número contábil" (BRIEF do BE §5), uma linha por taxa com a data (`rateDate`, sempre exibida),
    aviso `stale` ("taxa com mais de 5 dias") e a lista `excluded[]` com motivo traduzido e número de linhas. Nunca
    substitui o bloco da verdade. Teste: `stale:true` mostra o aviso; `excluded` lista.
16. **Erros nomeados**: `code` do envelope → `t('report_builder.errors.<code>', details)` (chaves existentes);
    `CRM_MODULE_NOT_INSTALLED` → mensagem do módulo; `REPORT_TOO_LARGE` sugere filtrar. Teste: cada código mapeia.
17. **Salvar** (`POST` novo / `PUT` existente), **Salvar como** (POST com o spec atual), **Apagar** (`DELETE` com
    `Modal` de confirmação). ADMIN editando relatório alheio vê o aviso "este relatório é de outro usuário". Teste:
    PUT envia só o patch; apagar pede confirmação.
18. **Abrir salvo**: `GET /api/crm/reports/:id` preenche o editor; `POST /:id/run` mostra o resultado. Relatório
    apagado/alheio → 404 `REPORT_NOT_FOUND` com mensagem e volta à lista. Teste: 404 mostra a mensagem.

**D. Modelos prontos e dashboard**

19. **Começar de um modelo** (F-FRB4): lista dos 5 modelos (funil, origem, status, propostas, atividades) → abre o
    editor preenchido, ainda não salvo. Fonte do modelo não instalada → modelo desabilitado. Teste: abrir preenche.
20. **Widget `crm-report` no dashboard** (F-RB2=(a)): tipo novo em `DASHBOARD_GRID_CONFIG.WIDGET_TYPES` +
    `DIMENSIONS` + `FloatingAddWidgetButton` + `case` no `renderWidgetContent`; configuração = escolher um relatório
    salvo (`widgetConfig: { reportId }`, via `onConfigChange`); o widget roda `POST /api/crm/reports/:id/run` e reusa
    o render do item 14 (e 15, se o relatório tiver `convertTo`). `REPORT_NOT_FOUND` → "relatório não existe mais"
    com ação de reconfigurar. Teste: config salva `reportId`; 404 mostra a ação.

**E. Gates**

21. **i18n pt/en** de toda string nova em `crm.json` (namespace `crm` já está no `ns` das páginas CRM; o dashboard
    precisa do `crm` no `serverSideTranslations` da sua página — memória `i18n-namespace-novo-precisa-entrar-no-ns`).
    Gate: paridade (`skill-audit wiring`).
22. **`tsc --noEmit`** do my-app e `npm run test:types` (diff em `__tests__` — memória `tsc-noemit-my-app-exclui-testes`);
    `neutral-*`, `rounded-2xl`; build de produção para a tela atrás de `withAuth`.
23. **Sign-off de browser** (gate humano, não do agente): runbook no formato `RUNBOOK-FORMAT.md` com os passos
    criar → visualizar (com e sem conversão) → salvar → abrir → widget no dashboard.

## 2. Fatiamento proposto (cada PR exige o próprio "executa")

- **PR-A** itens 1–9, 11–18, 21–22 (a tela, sem joins nem modelos).
- **PR-B** item 10 (joins), se F-FRB5 = (a).
- **PR-C** item 19 (modelos) — depois do pré-requisito de BE, se F-FRB4 = (a).
- **PR-D** item 20 (widget do dashboard).

## 3. Contratos (esboço — materializar na sessão de feature)

Entrada/saída do BE: **só** os tipos gerados (`@/types/contracts/crm/CrmReportDto.gen.ts`); nada espelhado à mão.

```ts
// lib/services/crmReports.service.ts — fino sobre apiClient (padrão crm.service.ts)
import type {
  CreateCrmReportInput, UpdateCrmReportInput, RunCrmReportInput, RunSavedCrmReportInput, RunCrmReportOutputInput,
} from '@/types/contracts/crm/CrmReportDto.gen';

export interface CrmReportRow { // resposta do GET (modelo do BE; não há DTO de saída da lista no snapshot)
  id: string; userId: string; name: string; description: string | null;
  kind: CreateCrmReportInput['kind']; chartType: CreateCrmReportInput['chartType'];
  spec: CreateCrmReportInput['spec']; createdAt: string; updatedAt: string;
}
export const CrmReportsService = {
  list: () => apiClient.get<ApiResult<CrmReportRow[]>>('/crm/reports'),
  get: (id: string) => apiClient.get<ApiResult<CrmReportRow>>(`/crm/reports/${id}`),
  create: (body: CreateCrmReportInput) => apiClient.post<ApiResult<CrmReportRow>>('/crm/reports', body),
  update: (id: string, body: UpdateCrmReportInput) => apiClient.put<ApiResult<CrmReportRow>>(`/crm/reports/${id}`, body),
  remove: (id: string) => apiClient.delete<ApiResult<{ id: string }>>(`/crm/reports/${id}`),
  preview: (body: RunCrmReportInput) => apiClient.post<ApiResult<RunCrmReportOutputInput>>('/crm/reports/run', body),
  run: (id: string, body: RunSavedCrmReportInput) => apiClient.post<ApiResult<RunCrmReportOutputInput>>(`/crm/reports/${id}/run`, body),
};

// Estado do editor → spec: mapper com retorno declarado (gate 7)
export function toSpec(draft: ReportDraft): CreateCrmReportInput['spec'];

// Espelho DECLARADO do par valor→moeda do BE (item 8) — só UX; a verdade é o 400 do BE.
// ponytail: duplicação de constante (não de DTO); sem teste de paridade possível, o FE não importa o backend — ver §6.
export const CRM_MONEY_CURRENCY_PAIRS_FE = {
  leads: { latestProposalAmount: 'latestProposalCurrency' },
  leadProposals: { amount: 'currency' },
  crmOpportunities: { amount: 'currency' },
} as const;

// Widget do dashboard (item 20)
export interface CrmReportWidgetConfig { reportId: string }
```

## 4. Forks — ✅ 7/7 RATIFICADOS 2026-10-13 (dono, questionário, todos na recomendação)

| Fork | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-FRB1** | Onde a tela mora? | **(a)** página nova `/crm/reports` + item "Relatórios" no `CrmNav`; (b) aba dentro de `/crm/analytics`; (c) só no dashboard geral | **(a)** — o builder é tela de trabalho (lista + editor); a analytics fixa continua como está; o dashboard recebe o widget (item 20) | ✅ (a) |
| **F-FRB2** | Visualização: automática ou por botão? | **(a)** botão "Visualizar"; (b) automática a cada mudança (debounce) | **(a)** — cada run lê até 20.000 linhas no servidor e pode dar 422; automático dispararia runs a cada clique e mostraria erros intermediários (ex.: moeda ainda não escolhida) | ✅ (a) |
| **F-FRB3** | Várias medidas no gráfico (o `ChartRenderer` desenha uma série) | **(a)** um gráfico por medida, lado a lado (mesma ordem de pontos); (b) estender o `ChartRenderer` canônico para multisséries; (c) gráfico só da 1ª medida e tabela com todas | **(a)** — não mexe no componente compartilhado (usado pela analytics de vendas/finanças); as séries já vêm alinhadas do BE. Custo: 4 medidas = 4 gráficos | ✅ (a) |
| **F-FRB4** | Como o FE obtém os 5 modelos prontos | **(a)** pré-requisito de BE: `GET /api/crm/reports/templates` (nó/BRIEF próprio, pequeno); (b) copiar os 5 specs para o FE (constante); (c) adiar o item 19 | **(a)** — uma fonte só (o BE já testa a paridade dos modelos com os gráficos fixos); copiar no FE deixa o modelo divergir em silêncio quando o BE mudar | ✅ (a) |
| **F-FRB5** | Joins no v1 da tela | **(a)** sim, numa seção "avançado" (PR-B); (b) não — o BE aceita, a tela não oferece por enquanto | **(a)** — o dono pediu completude (memória `dono-quer-completude-nao-mvp`) e o caso real "oportunidades por status do lead" precisa de join; isolado em PR próprio para não travar o resto | ✅ (a) |
| **F-FRB6** | `kind:'kpi'` com dimensão | **(a)** KPI sem dimensão (o editor esconde dimensões; com moeda, a dimensão de moeda é a única permitida); (b) KPI aceita dimensão e mostra um card por ponto | **(a)** — KPI é número; a única exceção é a moeda (um card por moeda, BRIEF do BE §7) | ✅ (a) |
| **F-FRB7** | Formato do ponto com 2 dimensões (o BE junta os nomes com `" \| "`) | **(a)** mostrar o nome como vem ("Open \| USD"), trocando só `__NO_CURRENCY__`; (b) o FE separa as partes e monta legenda/agrupamento por dimensão | **(a)** — separar por `" \| "` quebra se um valor tiver esse texto; (b) só vale com o BE devolvendo as partes, o que é mudança de contrato | ✅ (a) |

## 5. Pendente de validação externa

- Nenhuma regra contábil/fiscal/legal. O rótulo da visão convertida ("estimativa pela PTAX… não é número contábil") vem
  do BRIEF do BE §5 — texto de produto, não norma.

## 6. Insumos ausentes

- Se `GET /api/dynamic-tables` (lista) já traz o `schema` de cada tabela (pouparia um `getTableById` por fonte) — não
  conferido; o plano usa `getTableById` (comportamento verificado em `useActorNames.ts:66`).
- Teste de paridade do `CRM_MONEY_CURRENCY_PAIRS_FE` com o do BE: o FE não importa o backend (regra da casa); a
  alternativa é o BE expor os pares (ex.: na mesma rota do F-FRB4) — decidir junto com o F-FRB4 na execução.

## 7. Achados fora de escopo

- `DashboardKpiCard` mostra badge ▼ vermelho em card sem variação (memória `dashboard-kpi-card-flat-badge`) — o KPI do
  builder herda; conserto adiado (afeta todos os dashboards).
- O agregador ignora `JoinRef.rightField` (achado do PR-2 do BE) — afeta joins fora do builder, não esta tela.
- A analytics fixa do CRM (`/crm/analytics`) e a visão geral continuam com o valor de pipeline divergente (GAP-MAP;
  F-RBP3 → (a), conserto com autorização própria).
