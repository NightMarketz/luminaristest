# BRIEF — BE-INCR-CRM-MODULE-COMPOSITION — CRM como categoria composta por módulos

> Produzido em sessão de planejamento, 2026-09-07, sob a autorização do dono **"já desenvolva o plano
> necessário no crm preset, qual a granularidade de módulos fixos e módulos que podem ser customizados
> na área de crm?"** (mesma data), executando a direção **F-I8-1 → (d)** ratificada horas antes:
> *"CRM é categoria que tem módulos completos que precisa de custom dentro dele; então nós selecionamos
> se vai existir CRM e, a partir daí, teremos módulos menores que compõem CRM."* É o BRIEF do nó **I8**
> do [plano em grafo do wizard](../accounting/ONBOARDING-WIZARD-plano-grafo-brief.md). Vive em
> `docs/crm/` (e não em `docs/accounting/`) porque o item é de onboarding/DynamicTable, não contábil —
> desvio deliberado da nota de saída padrão da sessão. **Nenhum fork se auto-ratifica.**
>
> **RATIFICAÇÕES 2026-09-07 (dono, via `AskUserQuestion`, mesma sessão):** F-CRM-1 → **(a)** leads saem do
> Core para CRM-0 · F-CRM-2 → **(a)** salão = CRM-0 + CRM-1 · F-CRM-8 → **(a)** override de selects livres
> com allowlist · F-CRM-9 → **(b)** lista plana `modules: ModuleKey[]`. **Segunda rodada, mesma data:** F-CRM-3 → **(a)** Propostas é módulo próprio · F-CRM-4 → **(a)** Contas+Contatos
> num módulo · F-CRM-5 → **(a)** Oportunidades depende só de CRM-0 · F-CRM-6 → **(a)** desligar não permitido
> por ora · F-CRM-7 → **(a)** campos só na criação. **9/9 forks RATIFICADOS — o BRIEF está pronto para
> `sessao-feature`.** O contrato §3 foi ajustado para F-CRM-9 (b).

## 0. Contexto fixo

- **Item:** granularidade de módulos da categoria CRM no onboarding — o que é fixo (a categoria não
  existe sem), o que é opcional (módulo ligável), e o que é customizável dentro de cada módulo.
- **Autorização:** dono, 2026-09-07 (frase acima) + F-I8-1 → (d) (registro no plano em grafo, §2 nó I8).
  Cobre escrever este BRIEF. **Executar** exige sinal próprio do dono (ORCH-006); os forks já estão
  ratificados, então a sessão de feature fica destravada no dia em que o dono mandar.
- **Insumos existentes (fatos consumados, todos lidos no código nesta sessão):**
  - **Peças já existem como módulos:** `presets/modules/core/{LeadPipelines,LeadStages,Leads,
    LeadProposals,LeadActivities}Module.ts` e `presets/modules/crm/{CrmAccounts,CrmContacts,
    Opportunities}Module.ts`. Todas com `category: 'leads'`.
  - **Duas composições hoje:** `CoreSystemPreset` instala as 5 tabelas de lead **para todo tenant**
    (junto de `units`, `employees`, `tasks`, `stakeholders`); `CrmModulePreset` (`key: 'crmModule'`,
    suíte selecionável) re-declara as 5 e soma `crmAccounts`, `crmContacts`, `crmOpportunities`.
  - **Relações entre as peças** (`@@PRESET_TABLE_KEY::`): `leads.accountId`/`contactId` → `crm*`
    (**opcionais**); `crmContacts.leadId`/`accountId` (opcionais); `crmOpportunities.pipelineId`/`stageId`
    → `leadPipelines`/`leadStages` (**obrigatórias**), `leadId`/`accountId`/`contactId` (opcionais);
    `leadStages.pipelineId`, `leadProposals.leadId`, `leadActivities.leadId` (obrigatórias); todos os
    `ownerId`/`assigneeId`/`actorId` → `employees` (core); `tasks.leadId` (core, opcional).
  - **Relação opcional para tabela ausente é descartada na instalação** (`dashboardController.ts:150-170`,
    `DynamicTableService.ts:364-370`) e **volta quando a tabela chega**: `PresetSyncService.
    syncInstalledTableFromPreset` é aditivo e re-resolve marcadores (`PresetSyncService.ts:88-108,
    157-159`); `installTableFromPreset` instala **uma** tabela por `internalName` em runtime, admin-only
    (`dynamicTablesController.ts:228-247`, rota `POST /dynamic-tables/install-table`).
  - **Quem depende de qual tabela, por nome, no servidor** (`CrmPipelineService.ts`): `advanceStage` →
    `leads` (+ `leadProposals` só se etapa `proposal` com valor); `createProposal` → `leads`,
    `leadProposals`; `recordNoShow` → `leads`, `leadActivities`; `convertLead` → `leads`, `crmAccounts`,
    `crmContacts`; `advanceOpportunity` → `crmOpportunities`; `convertLeadToOpportunity` →
    `crmOpportunities`, `leads`, `leadStages`. `CrmAnalyticsService` → `leads`. `LeadsSeedOnUnitPlugin`
    (afterCreate de `units`) → `leadPipelines`, `leadStages`, **e retorna sem erro se ausentes**
    (`LeadsSeedOnUnitPlugin.ts:22`). `CrmReceivableBridge` → `crmOpportunities` `Won` → `Receivable`
    (subrazão AR; ADR-CRM-AR-SEAM).
  - **Frontend** (`my-app/features/crm`): board de leads, board de oportunidades, telas de tabela
    (contas, contatos), Lead360 (notas = `leadActivities.type='note'`, timeline = `leadActivities`,
    tarefas = `tasks.leadId`, anexos = `CrmAttachment` Prisma), agenda = `leadActivities` tipos
    `meeting*`, captura de proposta e no-show. Opções de `leadActivities.type`: `note, call, email,
    meeting, meeting_no_show, meeting_cancelled, status_change, stage_change, proposal, field_update`.
  - **Decisões anteriores que este BRIEF respeita:** Council CRM v3 **D3 (Lead × Opportunity)
    DEVOLVIDO AO DONO**, interino reversível = *ocultar a 2ª pipeline no preset do salão sem deletar
    código*; **D4** congela os 22 gaps vs Salesforce exceto web-to-lead e o piso (tarefa+lembrete,
    notas/anexos); P0 slices 1–6 (conversão, owner, tarefas, notas, anexos, views/bulk, opportunity)
    **feitos** em junho. Plano em grafo: I1 (primeira unidade dispara o seed de pipeline), W1/W2
    ("remover tabela" vira "remover módulo"), W5 (KB derivado do registro), I4-3 (preset sem binding →
    `not-applicable`).
  - **Sem acoplamento fiscal:** nenhum módulo de `finance/service/business` referencia tabela de lead
    ou `crm*` (0 ocorrências). O único acoplamento contábil é o seam AR das oportunidades.
- **Nós vizinhos:** `POST /dashboard/create` (I1 muda o body; este BRIEF muda de novo), `PresetService.
  getAllPresetSummaries` (lista suítes), `PresetKnowledgeBase` (W5), `CustomizationService.
  TableExtractor` (W1/W2), `installTableFromPreset`/`syncInstalledTableFromPreset` (primitivas de
  runtime), `TableCategories` (14 fixas; CRM vive em `leads`).

## 1. A granularidade proposta

### 1.1 Três níveis, não dois

| Nível | O que é | Quem decide | Quando |
|---|---|---|---|
| **Categoria** | CRM sim/não | usuário, no onboarding (e depois, admin) | seleção |
| **Módulo** | conjunto de tabelas com contrato próprio, ligável dentro da categoria | usuário, no onboarding e em runtime (só ligar) | seleção |
| **Custom** | campos extras, opções de select livres, linhas de configuração (pipeline/etapas) | usuário | criação e runtime |

### 1.2 Os módulos da categoria CRM

| Módulo | Tabelas | Fixo/opcional | Depende de | O que liga no servidor e na tela |
|---|---|---|---|---|
| **CRM-0 · Funil** | `leadPipelines`, `leadStages`, `leads`, `leadActivities` | **FIXO** (base da categoria: existe CRM ⇔ existe CRM-0) | core (`units`, `employees`) | `advanceStage`, `recordNoShow`, analytics, seed de pipeline por unidade, board de leads, Lead360 (notas, timeline, agenda), anexos (`CrmAttachment`), tarefas por lead (`tasks.leadId`, core) |
| **CRM-1 · Propostas** | `leadProposals` (+ 4 campos `latestProposal*` em `leads`, que são snapshot) | opcional | CRM-0 | `createProposal`, ramo `proposal` do `advanceStage`, modal de captura de proposta, etapa do tipo `proposal` |
| **CRM-2 · Contas e contatos** | `crmAccounts`, `crmContacts` (+ `leads.accountId`/`contactId`, relações opcionais que voltam via sync) | opcional (B2B) | CRM-0 | `convertLead`, telas de tabela Contas/Contatos, modal de conversão |
| **CRM-3 · Oportunidades** | `crmOpportunities` | opcional, **default OFF fora do `crmModule`** (interino do D3) | CRM-0 (pipeline/etapa obrigatórias); CRM-2 enriquece | `advanceOpportunity`, `convertLeadToOpportunity`, board de oportunidades, Opp360, **seam AR** (Won → `Receivable`) |

**O que NÃO é módulo de CRM e fica no core:** `tasks` (com `leadId` opcional, descartado se CRM-0
ausente e restaurado por sync), `employees` (donos/atribuição), `units` (o seed de pipeline é efeito
do `afterCreate` de `units`, já tolerante à ausência), `stakeholders`. `CrmAttachment` é Prisma
first-class e não instala nada: é capacidade que só ganha superfície quando CRM-0 existe.

**Por que CRM-0 é assim e não menor:** `leadActivities` não é opcional porque três painéis do Lead360
(notas, timeline, agenda) e o `recordNoShow` leem dela, e o custo de ligá-la é uma tabela. Separar
"atividades" em módulo próprio criaria um CRM sem histórico, que nenhuma tela do repositório sabe
renderizar.

**Por que Propostas é opcional:** o `advanceStage` só toca `leadProposals` quando a etapa é do tipo
`proposal` **e** há valor; um CRM de qualificação pura (salão B2C que só quer agenda e follow-up) não
precisa dela. Tirá-la exige que o seed de etapas não crie etapa do tipo `proposal` (comportamento 6).

### 1.3 Fixo × customizável, dentro de cada módulo

| Camada | FIXO (o código lê por nome/valor) | CUSTOMIZÁVEL |
|---|---|---|
| Identidade | `internalName` das tabelas, `category: 'leads'` | `name`/label exibido (já é i18n por preset) |
| Relações | todas as `required: true` (`leadStages.pipelineId`, `leadProposals.leadId`, `leadActivities.leadId`, `crmOpportunities.pipelineId/stageId`) | nenhuma relação nova entre módulos (relação é contrato) |
| Selects lidos por serviço | `leads.status`, `leadStages.type`, `leadActivities.type`, `leadProposals.status`, `crmOpportunities.status`, `currency` | — |
| Selects livres (nenhum serviço lê) | — | `leads.source`, `bant*` (rótulos), `crmAccounts.segment/size`, `crmContacts.role` (fork F-CRM-8) |
| Campos | os declarados no módulo | **campos extras** por tabela (`addedFields`, validados pelo `CreateDynamicTableDto` — já existe no `handleCustomCreation`) |
| Dados de configuração | seed "Pipeline Padrão" + etapas por unidade | **pipelines e etapas são linhas**: nome, ordem, tipo, `defaultWinProbability` — o funil inteiro já é customizável em runtime, por unidade |

Regra que sai daqui e se aplica primeiro a este BRIEF: **customizável é o que nenhum serviço resolve
por nome ou compara por valor.** Tudo que aparece em `resolveTableId(...)`, `findTableByInternalName`,
`stageType === 'proposal'`, `type: 'note'` ou `status === 'Won'` é contrato e fica fixo.

## 2. Checklist numerado de comportamentos

1. **Registro de módulos** — `presets/modules/registry.ts` declara, por `moduleKey`: `category`,
   `tables` (ordem de instalação), `dependsOn` (módulos), `fixed: boolean` (CRM-0 = true), `aiDescription`
   (insumo do W5). CRM registra CRM-0..3. Testável: registro é acíclico; toda tabela de `CrmModulePreset`
   pertence a exatamente um módulo; nenhum `required` cruza módulo sem `dependsOn`.
2. **Seleção no onboarding** — `POST /dashboard/create` aceita `modules: ModuleKey[]` (lista plana, F-CRM-9 b;
   DTO `.strict()`); categoria e dependências inferidas do registro; CRM-0 é implícito quando `crm` está presente; módulo sem sua dependência → 400 com
   o módulo faltante nomeado. Testável: `crm: { modules: ['CRM-3'] }` sem CRM-2 instala CRM-3 (CRM-2 só
   enriquece); `crm: { modules: ['CRM-1'] }` instala CRM-0 + CRM-1.
3. **Core deixa de instalar o ecossistema de leads** (fork F-CRM-1). Com `crm` ausente, o tenant nasce
   sem as 5 tabelas de lead; `tasks.leadId` é descartado pela regra existente de relação opcional.
   Testável: tenant sem CRM cria unidade e o `LeadsSeedOnUnitPlugin` retorna sem erro e sem linhas.
4. **Suíte `crmModule` vira composição** = CRM-0 + CRM-1 + CRM-2 + CRM-3 (o que ela já instala hoje),
   sem alterar o resultado para quem a escolhe. Testável: snapshot das tabelas instaladas por
   `suiteKey: 'crmModule'` antes/depois idêntico.
5. **Preset do salão** (fork F-CRM-2): `beautySalon` compõe CRM-0 + CRM-1 por padrão; CRM-2/3 OFF.
   Testável: tenant salão novo não tem `crmAccounts`/`crmContacts`/`crmOpportunities`; board de
   oportunidades não aparece no `CrmNav`.
6. **Seed de etapas respeita CRM-1** — sem Propostas, o seed por unidade não cria etapa do tipo
   `proposal`. Testável: unidade criada em tenant CRM-0-only tem etapas sem `type: 'proposal'`.
7. **Serviços degradam por contrato, não por crash** — `resolveTableId` para tabela de módulo não
   instalado lança `ModuleNotInstalledError` (409, `errorCode: 'CRM_MODULE_NOT_INSTALLED'`, payload
   `{ moduleKey }`), em vez de `NotFoundError` genérico. Cobre F-I8-2 do plano em grafo. Testável:
   `convertLead` em tenant sem CRM-2 → 409 com `moduleKey: 'CRM-2'`.
8. **Ligar módulo depois** — `POST /dashboard/modules/install { moduleKey }` (admin): instala as
   tabelas do módulo em ordem via `installTableFromPreset`, depois roda `syncInstalledTableFromPreset`
   nas tabelas que têm relação opcional para ele (`leads`, `tasks`, `crmContacts`), restaurando
   `accountId`/`contactId`/`leadId`. Idempotente (módulo já instalado → 200 `already-installed`).
   Testável: tenant CRM-0 → instala CRM-2 → `leads` volta a ter `accountId` relacionando à `crmAccounts`
   real.
9. **Nav e telas leem o registro** — `CrmNav` mostra só as áreas cujos módulos existem (hoje decide por
   tabela presente; passa a decidir por módulo). Testável: vitest do `CrmNav` com CRM-0 só.
10. **Customização de campos por módulo na criação** — `addedFields` por tabela (já existente) passa a
    ser validado contra a lista FIXA de campos do módulo: não pode sombrear campo declarado nem tocar
    select lido por serviço. Testável: `addedFields.leads: [{ name: 'status' }]` → 400.
11. **Opções de select livres** (fork F-CRM-8) — `selectOverrides: { leads: { source: [...] } }` aceito
    só para a allowlist de selects livres do módulo. Testável: override em `leads.status` → 400.
12. **KB da IA** deriva `aiDescription` do registro (W5, F-W5-1 b) e a entrevista pergunta CRM sim/não
    quando o preset casado não fixa a categoria. Testável: turno `MATCHING_PRESET` devolve
    `categories` sugeridas junto do `presetKey`.
13. **Gates mecânicos do diff:** snapshot de shape do DTO de criação; path-count do OpenAPI (+1 rota);
    paridade i18n pt/en para nomes de módulo; `skill-audit wiring` ganha "tabela de preset sem módulo
    no registro".

## 3. Contratos esboçados

```ts
// presets/modules/registry.ts
type ModuleKey = 'CRM-0' | 'CRM-1' | 'CRM-2' | 'CRM-3';
interface ModuleDef {
  key: ModuleKey; category: 'crm';
  name: { pt: string; en: string };
  aiDescription: string;               // insumo do W5
  fixed: boolean;                      // CRM-0 = true
  tables: string[];                    // internalNames, ordem de instalação
  dependsOn: ModuleKey[];              // CRM-1/2/3 → ['CRM-0']
  freeSelects: Record<string, string[]>; // { leads: ['source'], crmAccounts: ['segment','size'], crmContacts: ['role'] }
}

// POST /dashboard/create — extensão (soma-se ao `unit` do I1) — F-CRM-9 → (b) RATIFICADO
CreateDashboardDto.extend({
  modules: z.array(moduleKeyEnum).default([]),   // ex.: ['CRM-1','CRM-2']; categoria e deps vêm do registro;
                                                 // CRM-0 é implícito se qualquer CRM-* estiver presente
                                                 // ou se a suíte escolhida compuser CRM (salão: CRM-0 + CRM-1)
  selectOverrides: z.record(z.string(), z.record(z.string(), z.array(z.string()).min(1))).optional(),
}).strict()
// resposta: data.modules: { installed: ModuleKey[] }

// POST /dashboard/modules/install
{ moduleKey: z.enum([...]) }  →  { status: 'installed' | 'already-installed', tables: string[], synced: string[] }

// erro de contrato (comportamento 7)
class ModuleNotInstalledError extends AppError { statusCode = 409; errorCode = 'CRM_MODULE_NOT_INSTALLED'; details: { moduleKey } }
```

## 4. Forks — 9/9 RATIFICADOS 2026-09-07 (todas as recomendações acolhidas)

- **F-CRM-1 · CRM "não" tira as tabelas de lead do Core?** (a) sim: o ecossistema de leads migra do
  `CoreSystemPreset` para CRM-0; core fica `units`, `employees`, `tasks`, `stakeholders`; (b) não: core
  mantém as 5 tabelas e "CRM sim" só liga CRM-1..3. **Recomendação: (a)** — é a leitura literal da
  direção ("selecionamos se vai existir CRM"); o custo é baixo porque o seed já tolera ausência e
  `tasks.leadId` é opcional; tenants existentes não mudam (já têm as tabelas). (b) mantém CRM em todo
  tenant e esvazia a categoria. **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-2 · default do salão:** (a) CRM-0 + CRM-1 ligados, CRM-2/3 OFF; (b) CRM inteiro OFF (a tabela
  `customers` do salão basta); (c) CRM completo. **Recomendação: (a)** — preserva o que o kit D6 validou
  (funil, no-show, proposta) e cumpre o interino do D3 (2ª pipeline oculta sem deletar). **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-3 · granularidade de CRM-1:** (a) `leadProposals` como módulo próprio (proposto acima);
  (b) fundir em CRM-0. **Recomendação: (a)** — o `advanceStage` já é condicional; (b) obriga todo CRM
  a ter etapa de proposta. **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-4 · Contas+Contatos juntos ou separados:** (a) um módulo CRM-2 com as duas tabelas;
  (b) dois módulos. **Recomendação: (a)** — `convertLead` exige as duas; `crmContacts.accountId` é
  a razão de existirem juntas. **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-5 · Oportunidades depende de CRM-2?** (a) não (só CRM-0; conta/contato enriquecem);
  (b) sim. **Recomendação: (a)** — todas as relações de `crmOpportunities` para `crm*` são opcionais e
  o `convertLeadToOpportunity` não lê `crm*`. **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-6 · desligar módulo com dados:** (a) não permitido (só reset, nó I7); (b) soft-delete das
  tabelas do módulo. **Recomendação: (a) agora** — remover com linhas é a classe de decisão que I7 ainda
  não fechou. **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-7 · customização de campos:** (a) só na criação (`addedFields`, comportamento 10); (b) também
  em runtime por rota de schema nova. **Recomendação: (a)** — (b) é o território do
  `FieldCustomizationService` (F-P2-5, ADR próprio, nó W6). **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-8 · opções de select livres:** (a) permitir override na criação só para a allowlist
  `freeSelects` (comportamento 11); (b) fixo. **Recomendação: (a)** — é a customização de menor custo e
  maior pedido em CRM ("origem do lead"); selects lidos por serviço seguem fixos por construção.
  **✅ RATIFICADO 2026-09-07 → (a).**
- **F-CRM-9 · forma da seleção no DTO:** (a) `categories.crm.modules` tipado (acima); (b) lista plana
  `modules: ModuleKey[]` com categoria inferida do registro. **Recomendação: (b)** — cada categoria nova
  (RH, Estoque, Compras) não muda o DTO; a validação de dependência vive no registro. Contrato acima
  fica como (a) por legibilidade; se (b), `modules: z.array(moduleKeyEnum)`. **✅ RATIFICADO 2026-09-07 → (b) lista plana.**

## 5. Pendente de validação externa

- Nenhuma regra contábil ou fiscal nasce aqui. O seam AR (`CrmReceivableBridge`) só é acionado por
  `crmOpportunities` `Won`; com CRM-3 OFF ele fica inerte, sem mudança de comportamento contábil.
  **Vazia.**

## 6. Insumos ausentes

1. **D3 (Lead × Opportunity)** segue devolvido ao dono; este BRIEF não o decide — só torna o interino
   reversível uma configuração (CRM-3 OFF por padrão fora do `crmModule`). Se o dono fechar D3 em (b)
   "remover 2ª pipeline", CRM-3 sai do registro; em (a) "elevar", CRM-3 vira fixo no `crmModule`.
2. **Ordem com I1** — os dois mudam o body de `POST /dashboard/create`; fatiar em serial (Fase 0 do
   `_PARALLELIZATION-CONTRACT`).
3. **Categorias além de CRM** (Estoque, Compras, RH) — a direção do dono é geral ("categoria"), mas este
   BRIEF só desenha CRM; o registro nasce genérico para que as próximas entrem sem mudar o contrato.

## 7. Achados fora de escopo

- `getPresetByKey` resolve por import dinâmico ignorando `tablePresetSuites` (plano em grafo, W5).
- `TableCategories` fixa 14 categorias e o CRM vive em `leads`; um `category: 'crm'` de verdade
  exigiria migração de `category` nas tabelas existentes — não planejado aqui.
- `CrmAttachment.leadId` é string sem FK; anexos de oportunidade (`Opp360`) usam a mesma tabela?
  (não verificado nesta sessão).
- P1/P2 do roadmap (campanhas, produtos/quotes, forecasting, roteamento) seguem congelados pelo D4.

## 8. Como entra na fila

Documento órfão até o fold (regra 1 da sessão): linha sugerida em `ACCOUNTING-MASTER-MAP.md` §5.1
Bloco B, ao lado de LAC-B: `I8 · BE-INCR-CRM-MODULE-COMPOSITION · BRIEF pronto, 9 forks PENDENTES ·
[docs/crm](../crm/BE-INCR-CRM-MODULE-COMPOSITION-brief.md)`. O nó I8 do plano em grafo passa a apontar
para este arquivo.
