# BE-INCR-CRM-REPORT-BUILDER — BRIEF (sessão de planejamento)

> **Estado:** BRIEF — **7/7 forks RATIFICADOS 2026-09-26 (dono, AskUserQuestion)**; F-RB4 diverge da recomendação. Sem código; execução exige "executa". Nó do vault: [`docs/plano/nos/CRM-RB.md`](../plano/nos/CRM-RB.md).
> **Risco principal (2 linhas):** o builder **é** a resposta de produto ao `F-AD5` aberto do
> [`ADR-ANALYTICS-DEFS`](../adr/ADR-ANALYTICS-DEFS-write-unblock.md) — decidir onde a definição mora (F-RB1) reverte ou
> contorna o `F-AD0=(c)` ratificado — **resolvido 26/09: F-RB1=(a) contorna (Prisma), F-AD0 segue congelado**. Resta só o "executa".

## 0. Formulário

- **Item a planejar:** gap **#14** "Relatórios & Dashboards customizáveis pelo usuário (builder)" —
  `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md:157` (Parte B; doc supersedido → SDD §IV.3, citado só como origem).
  Congelado pelo **D4** (`COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md:17`), **descongelado pelo dono 25/09** (só o #14).
- **Autorização (literal, chat do dono, 2026-09-26):** "autorizo planejar o builder de relatórios do CRM".
  **Cobertura:** cobre exatamente planejar o #14. **Não** cobre: código, ratificar fork, reabrir o ADR-ANALYTICS-DEFS
  (o BRIEF só aponta que F-RB1 o reabre), nem o `custom-kpis` órfão além de registrar a relação (F-RB6).
  Divergência de protocolo registrada: `docs/plano/README.md` pede PRE-ADR ratificado antes de nó novo em `nos/`;
  o nó foi criado por instrução explícita do orquestrador com autorização citável, estado `planned` (não `ready`).
- **Insumos (lidos no arquivo — grau verificado salvo nota):**
  - `server/src/features/analytics/core/pipeline/Pipeline.ts` — `PipelineSpec` {source: presetTable|tableId, joins, filters(eq/ne/in/nin/gt/gte/lt/lte), dimensions(field|period), measures(sum/count/avg/formula) 1..n, sort, limit}.
  - `server/src/features/analytics/dynamic/processors/AggregatePipelineProcessor.ts` — executa o spec via `fetchByPresetTableKey`/`fetchByTableId`.
  - `server/src/features/analytics/services/AnalyticsService.ts:86-139` — lê definições da tabela CORE `analyticsDefinitions`; pipeline inválido é **descartado em silêncio** (E8 do ADR).
  - `server/src/features/analytics/dtos/AnalyticsDefinitionDto.ts` — `pipeline` é só `JsonBlock` na fronteira (E7 do ADR).
  - `server/src/features/dynamicTables/policies/DynamicTablePolicy.ts` `canManageData` — `presentation:'system'` ⇒ 403 para todos; travado por `DynamicTableService.systemTableWriteLock.test.ts`.
  - `docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md` — F-AD0=(c) congelar (ratificado 01/08); F-AD5 (a tela) **ABERTO**; F-AD6=(a) manter `custom-kpis` até F-AD5 fechar.
  - `server/src/features/analytics/schemas/KpiSchema.ts` + `POST /api/analytics/custom-kpis` — KPI escalar stateless, zero consumidor FE (E12).
  - `server/src/features/crm/services/CrmAnalyticsService.ts` — bundle **fixo** (funil/fonte/status/BANT/propostas/atividades) sobre `leads`; reusa processors `analytics/kpis/crm`.
  - Precedentes Prisma de config por usuário sobre tabela dinâmica: `SavedTableView` (`schema.prisma:69`, `tableId` sem FK, `config Json`, soft-delete) e `DashboardLayout` (`schema.prisma:104`, grid `positions[].widgetConfig`).
- **Nós vizinhos:** consome o motor `analytics` (PipelineSpec) e as tabelas CRM (`leads`, `crmOpportunities`, `leadActivities`, propostas, contas); [[I8]] condiciona quais estão instaladas. FE canônico: `AnalyticsDashboard`/`ChartRenderer`/`DashboardKpiCard` (golden ref do roadmap §Fase 4). Consumidor: tela do CRM (`FE-INCR-CRM-REPORT-BUILDER`, nó vizinho — **fora** deste BRIEF, regra BE-por-padrão).

## 1. Registro de Fronteira (module-boundary-selector)

```
## Registro de Fronteira — ReportDefinition (definição salva de relatório/dashboard do CRM)
- Camada: Prisma first-class — F-RB1=(a) RATIFICADO 2026-09-26         [decisão do dono sobre evidência inferida]
    SEL-001 4 perguntas: todas caem no lado DynamicTable (errado-e-corrigido é aceitável; nenhum número é fonte
    de verdade — o relatório LÊ, não é razão; unicidade só de UX; sem write-path fora do motor). Tripwires: nenhum
    (sem dinheiro autoritativo, sem self-relation, sem atomicidade cross-tabela). => o seletor PERMITE DT, não obriga.
    O que decide é outra coisa: a definição é METADADO DE PLATAFORMA sobre tabelas (aponta tableId/campos), não
    registro de negócio que o usuário modela. Precedentes verificados do mesmo shape moram em Prisma
    (SavedTableView, DashboardLayout); o único precedente DT (analyticsDefinitions) é tabela 'system' congelada por
    ADR. Colocar em DT exige ou reverter F-AD0 ou criar tabela DT não-system que o usuário também veria/editaria
    como JSON cru no dashboard (efeito colateral E11 do ADR).
- Tipo (se DT): n/a sob a recomendação; sob F-RB1(b) seria canônico selecionável (critério c: tela canônica o descobre).
- Contratos implícitos de nome (SEL-003, grau inferido — grep, não prova): a definição salva referencia
    tableId + nomes de campo das tabelas CRM (leads.status/source/stageId/value…, crmOpportunities.value/status/closedAt).
    Renomear/remover campo desses presets ou customização do usuário quebra a definição → hoje o motor pula em
    silêncio (E8). Checklist item 6 transforma isso em erro nomeado.
- Alfândega: n/a — o builder é somente leitura sobre dados operacionais; nenhum evento, bridge ou lançamento.
    Justificativa: nenhum write-path em dado de negócio. Valores monetários exibidos são float JSON do motor
    (currency), operacionais, NÃO verdade contábil — rotular na UI (fora deste BRIEF).
- Riscos anotados: (1) F-AD0 ratificado 'congelar'; (2) custom-kpis órfão (F-AD6) sobrevive até F-AD5 fechar —
    este nó fecha F-AD5, então F-AD6 volta à mesa (F-RB6); (3) processamento em memória (getAllTableData) — custo
    cresce com linhas; limite por F-RB5.
- Roteamento (se F-RB1=a): backend-prisma-model-generator → backend-repository-generator → backend-policy-generator
    → backend-service-generator → backend-dto-generator → backend-controller-generator → backend-route-generator
    → backend-test-suite-generator (+ api-contract-sync-generator p/ openapi).
- Forks do dono: F-RB1..F-RB7 — todos RATIFICADOS 2026-09-26 (§4).
```

## 2. Checklist numerado (cada item testável isolado) — escopo BE

Forks resolvidos: F-RB1=(a), F-RB2=(a), F-RB3=(b), F-RB4=(c), F-RB5=(a), F-RB6=(a), F-RB7=(a).

1. **Modelo `CrmReportDefinition`** (F-RB1=(a)): `id cuid`, `userId` (FK User, cascade como `SavedTableView`), `name`,
   `description?`, `kind` (`chart|table|kpi`), `spec Json` (validado por §3 `ReportSpecSchema`), `chartType`,
   `createdAt/updatedAt/deletedAt` (soft-delete). `@@index([userId])`. Teste: migração aplica em SQLite e é idempotente no prólogo (memória `migracao-sqlite-nao-e-transacional`).
2. **Repository** `ICrmReportDefinitionRepository` + impl — `findManyByUser`, `findById`, `create`, `update`, `softDelete`; aceita `tx` opcional. Teste: listagem exclui `deletedAt != null`.
3. **Policy** `CrmReportDefinitionPolicy` (F-RB4=(c)): **ver/rodar** = dono **ou** `ADMIN` (todos os relatórios);
   **editar/apagar** = só o dono (a cédula ratificou visibilidade do ADMIN, não escrita — escrita de ADMIN seria
   decisão nova). Não-dono não-ADMIN → 404 (anti-enumeração; confirmar contra `SavedTableViewPolicy` na execução).
   **Run de relatório alheio pelo ADMIN resolve a fonte contra as tabelas do DONO do relatório (`report.userId`),
   não do ADMIN** — senão o ADMIN vê os próprios dados com o rótulo de outro. Testes: dono lista só os seus;
   ADMIN lista todos; ADMIN PUT/DELETE em alheio → 403; outro usuário comum → 404; run pelo ADMIN lê linhas do dono.
   **D4 não reaberto (verificado contra `COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md` e o descongelamento de
   25/09):** o que o D4 congela é *team selling* — equipe, hierarquia, compartilhamento entre vendedores.
   F-RB4=(c) usa só o papel global `ADMIN` que já existe (mesmo eixo do `canView` do motor, `DynamicTablePolicy`),
   sem modelo de equipe, sem compartilhamento par-a-par. Se a execução precisar de "equipe", PARE: é D4.
4. **DTO Zod `.strict()`** (§3) — `CreateCrmReportSchema`, `UpdateCrmReportSchema` (partial + refine não-vazio, cuidado Zod 4 `.partial()` × `.default()`: nenhum `.default()` no create — memória `zod4-partial-aplica-default-reseta-campo`), `RunCrmReportSchema`. Teste de snapshot de shape + testes de refine (source whitelist, measures ≥1, campo inexistente).
5. **Whitelist de fonte**: `source` só pode ser tabela CRM do próprio usuário (F-RB3 define o conjunto). Resolução por `internalName` (padrão `CrmAnalyticsService.resolveTable`), nunca `tableId` arbitrário vindo do cliente sem checagem de posse. Teste: `tableId` de outro usuário → 404.
6. **Validação de campos contra o schema vivo da tabela** no save **e** no run: campo inexistente → `400 REPORT_FIELD_NOT_FOUND` com o nome do campo (fecha a classe E8 "descarta em silêncio" para este caminho). Teste: salvar ok → renomear campo no schema → run devolve erro nomeado, não série vazia.
7. **Service `CrmReportService.run(user, id | spec)`** — traduz `ReportSpec` → `PipelineSpec` e executa via `AggregatePipelineProcessor` (reuso; nada de agregador novo). Saída = `ChartDataPoint[]` (mesmo contrato do `CrmAnalyticsBundle`, consumível por `ChartRenderer`). Teste: fixture com 3 leads em 2 status → contagem por status bate.
8. **Preview sem salvar** (`POST /api/crm/reports/run` com spec inline) — mesmo caminho do item 7. Teste: spec inválido → 400 na fronteira.
9. **Limites** (F-RB5=(a), teto conservador): `limit` de pontos na saída e teto de linhas lidas; acima → `422 REPORT_TOO_LARGE`, nunca truncamento silencioso. Teste nos dois lados do teto.
10. **Rotas** `GET/POST /api/crm/reports`, `GET/PUT/DELETE /api/crm/reports/:id`, `POST /api/crm/reports/run`, `POST /api/crm/reports/:id/run` — registro em 2 toques (`routes/crm*` + `docs.paths.ts`), auth deny-by-default. Gate: guard de path-count do openapi atualizado + `public/openapi.json` regenerado.
11. **Factory** — `getCrmReportService()` no `lib/factory`. Sem `new` de repo dentro de service.
12. **Dashboard** (F-RB2=(a)): widget `crmReport` no `DashboardLayout` existente, `widgetConfig: { reportId }`. Validação do `reportId` no service (o DTO do layout tem `widgetConfig: z.any()`). Teste: widget com `reportId` apagado → erro nomeado; `reportId` alheio → 404 (ADMIN: visível, F-RB4).
13. **Templates iniciais** (F-RB7=(a)): os 6 gráficos fixos do `CrmAnalyticsBundle` expressos como `ReportSpec` para o usuário clonar. Teste: cada template roda e bate com o bundle fixo na mesma fixture (paridade).
14. **i18n pt/en** das mensagens de erro novas (`REPORT_FIELD_NOT_FOUND`, `REPORT_TOO_LARGE`, `REPORT_SOURCE_NOT_ALLOWED`) — gate de paridade.
15. **Audit**: sem `eventType` novo previsto (não é dado financeiro; F-RB4=(c) é leitura do ADMIN, sem compartilhamento).
16. **Remover `POST /api/analytics/custom-kpis`** (F-RB6=(a), emenda do ADR-ANALYTICS-DEFS 26/09): rota, controller,
    `CustomKpiExecutor`, `KpiSchema` se sem outro consumidor (grep na execução), entrada no `docs.paths.ts` e
    guard de path-count do openapi. Teste: rota responde 404; `tsc` limpo. PR próprio, antes ou depois do builder.

## 3. Contratos (esboço — materializar na sessão de feature)

```ts
import { z } from 'zod';

// Fonte: nome interno de tabela CRM (whitelist por F-RB3), resolvido server-side para tableId do próprio usuário.
export const CRM_REPORT_SOURCES = ['leads', 'crmOpportunities', 'leadActivities', 'proposals', 'accounts', 'contacts'] as const; // F-RB3

const FieldRef = z.string().trim().min(1).max(64);

export const ReportFilterSchema = z.object({
  field: FieldRef,
  op: z.enum(['eq', 'ne', 'in', 'nin', 'gt', 'gte', 'lt', 'lte']), // = FilterOp do PipelineSpec
  value: z.unknown(),
}).strict();

export const ReportDimensionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('field'), field: FieldRef, label: z.string().max(80).optional() }).strict(),
  z.object({
    type: z.literal('period'),
    dateField: FieldRef, // inclui os sintéticos _createdAt/_updatedAt (padrão CrmAnalyticsService.loadRows)
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']),
    label: z.string().max(80).optional(),
  }).strict(),
]);

export const ReportMeasureSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('count'), field: FieldRef.optional(), alias: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal('sum'), field: FieldRef, alias: z.string().max(40).optional() }).strict(),
  z.object({ type: z.literal('avg'), field: FieldRef, alias: z.string().max(40).optional() }).strict(),
  // 'formula' do PipelineSpec FORA do v1 — F-RB5
]);

export const ReportSpecSchema = z.object({
  source: z.enum(CRM_REPORT_SOURCES),
  joins: z.array(z.object({
    leftField: FieldRef,
    rightSource: z.enum(CRM_REPORT_SOURCES),
    rightField: FieldRef,
    alias: z.string().max(40).optional(),
  }).strict()).max(2).optional(),            // F-RB5
  filters: z.array(ReportFilterSchema).max(10).optional(),
  dimensions: z.array(ReportDimensionSchema).max(2).optional(),
  measures: z.array(ReportMeasureSchema).min(1).max(4),
  sort: z.object({ by: z.enum(['dimension', 'measure']), key: z.string().optional(), dir: z.enum(['asc', 'desc']).optional() }).strict().optional(),
  limit: z.number().int().min(1).max(500).optional(),
}).strict();

export const CreateCrmReportSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).optional(),
  kind: z.enum(['chart', 'table', 'kpi']),
  chartType: z.enum(['bar', 'line', 'area', 'pie', 'donut', 'table']), // = CHART_TYPES do AnalyticsDefinitionDto
  spec: ReportSpecSchema,
}).strict();

export const UpdateCrmReportSchema = CreateCrmReportSchema.partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'At least one field must be provided.' });

export const RunCrmReportSchema = z.object({ spec: ReportSpecSchema }).strict(); // preview

// Saída (reuso — não é tipo novo)
// type RunCrmReportOutput = { points: ChartDataPoint[]; meta: { rowsRead: number; truncated: false } };
// Erros nomeados: 400 REPORT_FIELD_NOT_FOUND {field} · 400 REPORT_SOURCE_NOT_ALLOWED · 404 (não é seu / não existe) · 422 REPORT_TOO_LARGE {rowsRead, cap}
```

Prisma (esboço, F-RB1=a):

```prisma
model CrmReportDefinition {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String
  description String?
  kind        String    // chart | table | kpi (validado no DTO)
  chartType   String
  spec        Json      // ReportSpecSchema
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  @@index([userId])
  @@map("crm_report_definitions")
}
```

## 4. Forks — ✅ 7/7 RATIFICADOS 2026-09-26 (dono, AskUserQuestion)

| Fork | Pergunta | Opções | Recomendação | Decisão |
|---|---|---|---|---|
| **F-RB1** | Onde a definição salva mora? | **(a)** Prisma first-class `CrmReportDefinition` (padrão `SavedTableView`); **(b)** destravar a tabela DT `analyticsDefinitions` (reverte F-AD0=(c) — policy+preset+4 docs, ADR §2); **(c)** tabela DT **não-system** nova de preset CRM | **(a)** — metadado de plataforma, precedente vivo do mesmo shape em Prisma, não toca o F-AD0 ratificado. Custo: F-AD0/`analyticsDefinitions` continua existindo em paralelo (duas casas de "definição") → F-RB6. | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB2** | O "dashboard" do builder é o quê? | **(a)** widget novo no `DashboardLayout` existente (`widgetConfig.reportId`); **(b)** entidade `CrmDashboard` própria no CRM (lista ordenada de reportIds); **(c)** v1 só relatórios, dashboard depois | **(a)** — reuso do grid canônico; evita segunda casa de layout. Risco: `widgetConfig: z.any()` no DTO do layout (validação fraca herdada). | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB3** | Quais fontes o builder enxerga? | **(a)** só `leads` + `crmOpportunities`; **(b)** todas as tabelas CRM instaladas (whitelist por internalName); **(c)** qualquer tabela do usuário (vira builder genérico, não do CRM) | **(b)** — cobre o gap #14 sem virar builder de plataforma (c = frente nova, exige nova autorização). | ✅ (b) RATIFICADO 2026-09-26 |
| **F-RB4** | Visibilidade | **(a)** só o dono; **(b)** dono + "compartilhar com o tenant/equipe"; **(c)** ADMIN vê todos | **(a)** no v1 — compartilhamento depende de modelo de equipe que o D4 manteve congelado (team selling). | ✅ **(c)** RATIFICADO 2026-09-26 — **diverge** da recomendação; checklist 3 ajustado; D4 não reaberto |
| **F-RB5** | Expressividade/limites do v1 | **(a)** sem `formula`, ≤2 joins, ≤2 dimensões, ≤4 medidas, teto de linhas lidas com 422; **(b)** paridade total com `PipelineSpec` (inclui `formula` via ExpressionEvaluator); **(c)** sem joins | **(a)** — menor superfície; `formula` executa expressão do usuário e merece revisão própria. Teto numérico = a medir na execução (Insumo ausente §6). | ✅ (a) RATIFICADO 2026-09-26 |
| **F-RB6** | Destino dos irmãos `analyticsDefinitions` (congelado) e `custom-kpis` (órfão, F-AD6 "manter até F-AD5 fechar") | **(a)** este nó fecha F-AD5 ⇒ reabrir ADR-ANALYTICS-DEFS com emenda: F-AD5→(b) builder dedicado (no CRM), F-AD6→ deletar `custom-kpis`; **(b)** manter ambos intocados e só registrar; **(c)** convergir `custom-kpis` no `ReportSpec` (medida escalar = `kind:'kpi'`) | **(a)** — o gatilho do F-AD6 é literalmente F-AD5 fechar; deixar dois caminhos órfãos é o risco E12. Decisão de ADR = dono. | ✅ (a) RATIFICADO 2026-09-26 — emenda registrada no ADR |
| **F-RB7** | Templates iniciais | **(a)** os 6 gráficos do `CrmAnalyticsBundle` viram templates clonáveis (paridade testada); **(b)** sem templates; **(c)** substituir o bundle fixo pelos templates (apagar `CrmAnalyticsService` fixo) | **(a)** — destrava o usuário sem tela em branco; (c) é refatoração de algo vivo, fora do #14. | ✅ (a) RATIFICADO 2026-09-26 |

## 5. Pendente de validação externa

- Nenhuma regra contábil/fiscal/legal. Única ressalva: soma de `value` de oportunidades é operacional (float JSON do motor), não número contábil — a UI deve dizer isso (FE, fora deste BRIEF).

## 6. Insumos ausentes

- Volume real de linhas CRM por tenant (para o teto do F-RB5) — medir no `dev.db` real (`server/prisma/prisma/dev.db`) na execução.
- Confirmar se `AggregatePipelineProcessor` aplica `sort`/`limit` e `period` sobre `_createdAt` sintético (lido só até a resolução de fonte, linhas 179-280).
- Nomes internos exatos das tabelas de propostas/contas/contatos após [[I8]] (whitelist F-RB3).

## 7. Achados fora de escopo (não planejados)

- `DashboardLayoutDto` `widgetConfig: z.any()` — validação fraca pré-existente.
- `AnalyticsService` descarta definição inválida em silêncio (E8 do ADR) para o caminho `analyticsDefinitions` — não corrigido aqui.
- `FE-INCR-CRM-REPORT-BUILDER` (tela: builder fonte→dimensões→medidas→filtros + preview com `ChartRenderer`) — nó vizinho, BRIEF próprio.
