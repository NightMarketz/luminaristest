# BRIEF — BE-INCR-CRM-SUBMODULES — módulos de CRM divididos em submódulos atômicos

> Produzido em sessão de planejamento (`sessao-planejamento`), 2026-09-28. **Nenhum fork se auto-ratifica**:
> os 8 forks da §5 estão em **RATIFICAÇÃO PENDENTE**. Este documento não autoriza código; executar exige
> sinal próprio do dono ("executa…", ORCH-006). Vive em `docs/crm/` ao lado do BRIEF do I8, pelo mesmo motivo
> (item de onboarding/DynamicTable, não contábil). **Não há nó no vault**: pelo `docs/plano/README.md`, proposta
> nova só vira nota em `nos/` depois de ratificada.

## 0. Contexto fixo

- **Item:** dividir os módulos de CRM do registro que agrupam tabelas separáveis em submódulos, de modo que
  toda combinação de tabelas que o usuário consegue escolher corresponda a módulos inteiros. Com isso a remoção
  parcial de módulo deixa de ser um caso ambíguo.
- **Autorização (citação transmitida pelo orquestrador desta sessão, não lida direto do chat):** dono, chat,
  **2026-09-28**, respondendo ao achado fora de escopo nº 1 do PR #411 ("Remoção parcial de módulo NÃO-fixo
  (ex.: CRM-2 sem `crmContacts`) segue aceita com 201; agora o módulo apenas deixa de aparecer em
  `modules.installed`…"): **"tem que dividir o módulo em submodulos"**.
  - *Cobertura (passo 1 da sessão):* a frase decide a **direção**: dividir, e não passar a responder 400 nem
    manter o 201. Ela cobre este BRIEF. O **como** (granularidade, nomes, dependências, compatibilidade, API/UI)
    fica em forks. A frase **não** autoriza código. Também **não** reabre por si as decisões ratificadas do I8
    (F-CRM-1..9): onde o corte encosta numa delas (F-CRM-4 "Contas+Contatos num módulo", ratificado 07/09), o BRIEF
    registra a colisão como fork, e a frase de hoje é a leitura mais provável de que o dono reverte o F-CRM-4.
    Mesmo assim, o fork fica pendente e não é aplicado por inferência.
  - *Divergência declarada:* o achado cita CRM-2. A frase fala em "o módulo". Estender a divisão ao CRM-0 (fixo)
    seria **mais** que o item, e por isso vira o fork F-SUB-1, com recomendação de **não** estender.
- **Insumos existentes (fatos consumados, todos lidos no código nesta sessão, `origin/main` = `b385040e`):**
  - `server/src/features/dynamicTables/presets/modules/registry.ts`: `MODULE_KEYS = ['CRM-0'..'CRM-3']`,
    `moduleDefSchema` `.strict()` (`key, category:'crm', name{pt,en}, aiDescription, fixed, tables, dependsOn,
    freeSelects`), `moduleOfTable`, `composeModuleTables`, `TABLE_SOURCES`.
  - `moduleSelection.ts`: `resolveModuleSelection` (dependência fixa entra implícita, não-fixa ausente → 400
    `missingModule`), `assertAddedFieldsRespectModules`, `applySelectOverrides` (allowlist por `moduleOfTable`).
  - **PR #411 (ABERTO, não mergeado, branch `claude/fix-crm0-parcial`):** `applyModuleRemovals(selected,
    removedTables)`. Módulo `fixed` com remoção parcial → 400 `reason:'FIXED_MODULE_PARTIAL'`. Módulo
    não-fixo parcial → **sai de `modules.installed` e a tabela restante fica instalada** (o caso ambíguo deste
    item). `handleCustomCreation` passa a responder `modules.installed: keptModules`. **Este BRIEF pressupõe o
    #411 em `main`** (§7, insumo ausente 1).
  - `dashboardController.ts` `handleCustomCreation`: `removedTables` apaga do `finalTablesConfig` qualquer tabela
    fora do Core. Relação **opcional** para tabela ausente é descartada; relação **required** para tabela ausente
    → 400 genérico `"relação 'x.y' aponta para presetKey inexistente"`.
  - `ModuleInstallService.installModule` (`POST /dashboard/modules/install`, admin): dependência verificada por
    **presença de tabela**, `already-installed` só se todas as tabelas existem, instala as que faltam e roda
    `syncInstalledTableFromPreset` em toda tabela instalada cujo preset tem relação para o módulo.
  - `PresetSyncService.getPresetDefinitionForInternalName`: resolve a definição **por tabela** (Core → registro
    via `moduleOfTable` → suítes). Não depende da granularidade do módulo.
  - **Não existe lista de módulos persistida por tenant.** "Módulo instalado" é derivado da presença das tabelas
    em três lugares: `ModuleInstallService.isInstalled`, `my-app/features/crm/lib/crmModules.ts`
    `installedCrmModules` ("instalado quando TODAS as tabelas existem") e a resposta do create.
  - FE: `crmModules.ts` é espelho manual do registro ("se o registro mudar, este mapa muda no mesmo PR").
    `CrmNav.tsx` mapeia `/crm/contacts` e `/crm/accounts` → `'CRM-2'`. `TotalControlSetup.tsx` mostra uma
    checkbox **por tabela** de `GET /dashboard/presets/:key` (`preset.tables`), envia só `removedTables`, e o
    `analyzePresetDependencies` é **no-op** (mapas vazios: desmarcar `leads` não desmarca `leadProposals`).
  - Suítes: `crmModule.modules = MODULE_KEYS` e `tables = composeModuleTables(MODULE_KEYS)`, então as 8 tabelas
    aparecem no Controle Total. `beautySalon`/`aestheticClinic` têm `modules: ['CRM-0','CRM-1']`, mas as tabelas
    de lead **não** estão no `preset.tables` delas, então o Controle Total do salão/clínica não mostra tabela de
    CRM (a remoção só é possível via API).
- **Nós vizinhos:** I8 (done, #397), que é a origem do registro. PR #411, que é o pré-requisito. `POST
  /dashboard/create` (`CreateDashboard.dto.ts`, `moduleKeySchema` no `modules`), `POST /dashboard/modules/install`
  (`InstallModule.dto.ts`), `ModuleNotInstalledError` (409 `CRM_MODULE_NOT_INSTALLED`, `details.moduleKey` via
  `moduleOfTable`), `docs.paths.ts` (enum `[CRM-0..CRM-3]` em 3 lugares) + `public/openapi.json`, W5/c12 (KB da IA
  derivado de `aiDescription`: ADIADO, vinculado ao F-W5-1).

## 1. Mapa atual e dependências

### 1.1 Tabela → módulo (hoje)

| Módulo | fixo | tabelas | dependsOn |
|---|---|---|---|
| CRM-0 Funil | **sim** | `leadPipelines`, `leadStages`, `leads`, `leadActivities` | — |
| CRM-1 Propostas | não | `leadProposals` | CRM-0 |
| CRM-2 Contas e contatos | não | `crmAccounts`, `crmContacts` | CRM-0 |
| CRM-3 Oportunidades | não | `crmOpportunities` | CRM-0 |

### 1.2 Relações entre tabelas de CRM (marcadores `@@PRESET_TABLE_KEY::`, lidas nos `*Module.ts`)

| De → para | required | Observação |
|---|---|---|
| `leadStages.pipelineId` → `leadPipelines` | **sim** | |
| `leads.pipelineId` → `leadPipelines` | não | |
| `leads.stageId` → `leadStages` | não | |
| `leads.accountId` → `crmAccounts` | não | descartada sem CRM-2, restaurada por sync |
| `leads.contactId` → `crmContacts` | não | idem |
| `leadActivities.leadId` → `leads` | **sim** | |
| `leadActivities.prevStageId`/`nextStageId` → `leadStages` | não | |
| `leadProposals.leadId` → `leads` | **sim** | |
| `crmContacts.accountId` → `crmAccounts` | **não** | **é o que torna CRM-2 separável** |
| `crmContacts.leadId` → `leads` | não | |
| `crmOpportunities.pipelineId`/`stageId` → `leadPipelines`/`leadStages` | **sim** | |
| `crmOpportunities.leadId`/`accountId`/`contactId` | não | |
| `*.ownerId`/`assigneeId`/`actorId` → `employees` (Core) | não | |

### 1.3 Consumidores por tabela (servidor + FE; `grep` por `'<internalName>'` fora de testes e presets)

| Tabela | Quem exige |
|---|---|
| `crmAccounts` | `CrmPipelineService.convertLead` (junto com `crmContacts`); `OpportunityCreateModal` (opcional, lista contas); tela `/crm/accounts` |
| `crmContacts` | `convertLead` (junto com `crmAccounts`); tela `/crm/contacts` |
| `leadPipelines`/`leadStages` | `LeadsPlugin`, `LeadsSeedOnUnitPlugin` (tolera ausência), `advanceStage`/`advanceOpportunity`/`convertLeadToOpportunity`, `CrmFunnelProcessor`, `useCrmData`, board |
| `leads` | quase todo o CRM (`advanceStage`, `recordNoShow`, `convertLead`, analytics, Lead360) |
| `leadActivities` | `recordNoShow`, `LeadsPlugin`, `CrmRelatedProcessors`, `MeetingsCalendar`, `useLeadActivities`, `/crm/activities` |

**Leitura:** no nível de FK, só **CRM-2** e **CRM-0** são separáveis entre os módulos com mais de uma tabela.
CRM-2 separa em `{crmAccounts}` + `{crmContacts}` (a única aresta entre as duas é opcional). CRM-0 se liga só
por arestas opcionais entre `{leadPipelines, leadStages}` e `{leads, leadActivities}`, e `leadActivities` pode ser
removida sem quebrar FK. Mas a coesão de CRM-0 é de **serviço**, não de FK: o board, o `advanceStage`, o
`recordNoShow` e o Lead360 exigem as quatro, e o I8 já ratificou isso ("existe CRM ⇔ existe CRM-0", fixo).

## 2. Corte proposto (recomendação; forks na §5)

| Novo módulo | Grupo (UI/alias) | fixo | tabelas | dependsOn | freeSelects | Justificativa por tabela |
|---|---|---|---|---|---|---|
| CRM-0 Funil | — | sim | as 4 de hoje | — | — | Coeso por serviço (§1.3). Remoção parcial já é 400 pelo #411. **Não dividir** (F-SUB-1). |
| CRM-1 Propostas | — | não | `leadProposals` | CRM-0 | — | Já é atômico. |
| **CRM-2A Contas** | CRM-2 "Contas e contatos" | não | `crmAccounts` | CRM-0 | `{ crmAccounts: ['size'] }` | Não depende de nenhuma tabela de CRM por FK (só `ownerId` → Core, opcional). O `dependsOn: CRM-0` vem do F-CRM-4/5: a categoria CRM só existe com CRM-0. |
| **CRM-2B Contatos** | CRM-2 "Contas e contatos" | não | `crmContacts` | CRM-0 (F-SUB-3) | `{ crmContacts: ['role'] }` | `accountId` é opcional: descartado sem Contas e restaurado por sync quando Contas chega (mesmo mecanismo de `leads.accountId`). |
| CRM-3 Oportunidades | — | não | `crmOpportunities` | CRM-0 | — | Já é atômico. |

**Regra que sai do corte (aplicada primeiro a este BRIEF, T3):** *módulo não-fixo tem exatamente uma tabela.
Módulo com mais de uma tabela só existe se for fixo, e aí vale "inteiro ou nada" (#411).* Com essa regra, a
combinação escolhível pelo usuário é sempre união de módulos inteiros. **Onde a regra falha nela mesma:** ela
impede um módulo opcional futuro com duas tabelas ligadas por relação required (ex.: cabeçalho + itens). Esse caso
fica para o F-SUB-4 (b), sem ser resolvido aqui.

## 3. Checklist numerado de comportamentos

> Cada item traz o teste-guarda que o prova. **[BE]** = este incremento. **[FE-mínimo]** = espelho obrigatório
> no mesmo PR (o comentário do `crmModules.ts` exige). **[FE-INCR]** = incremento separado (F-SUB-8).

1. **[BE] Registro com submódulos.** `MODULE_KEYS` troca `'CRM-2'` por `'CRM-2A'`, `'CRM-2B'` (nomes: F-SUB-2).
   `moduleDefSchema` ganha `group?: ModuleGroupKey` (F-SUB-5) e o registro ganha `MODULE_GROUPS: { 'CRM-2':
   { name: { pt: 'Contas e contatos', en: 'Accounts and contacts' }, members: ['CRM-2A','CRM-2B'] } }`.
   `freeSelects` se divide como na §2. `TABLE_SOURCES` não muda.
   *Guarda:* `moduleRegistry.test.ts`: (a) acíclico; (b) toda tabela de `CrmModulePreset` pertence a exatamente
   um módulo; (c) nenhuma relação required cruza módulo sem `dependsOn`; (d) **novo:** todo módulo `fixed:false`
   tem `tables.length === 1` (a regra da §2; o caso falha se alguém reagrupar); (e) **novo:** todo membro de grupo
   existe e pertence a um único grupo.
2. **[BE] `crmModule` e presets inalterados em resultado.** `crmModule.modules = MODULE_KEYS` (agora 5 chaves)
   instala as mesmas 8 tabelas com os mesmos schemas. Salão e clínica seguem `['CRM-0','CRM-1']`.
   *Guarda:* `CrmModulePreset.test.ts` (snapshot das 8 tabelas antes = depois) e o caso c5/F-I8-COMP3-a do
   `dashboardModules.integration.test.ts`, sem alteração de expectativa.
3. **[BE] Seleção aceita a chave do grupo como atalho** (F-SUB-2). `modules: ['CRM-2']` expande para
   `['CRM-2A','CRM-2B']` antes do `resolveModuleSelection`. A resposta `modules.installed` lista **só chaves
   atômicas**. *Guarda:* `moduleSelection.test.ts` › `'CRM-2' expande para CRM-2A+CRM-2B`; integração: quick
   `salão + modules ['CRM-2']` → 201, `installed` contém `CRM-2A` e `CRM-2B`, 6 tabelas de CRM.
4. **[BE] Remoção de tabela de submódulo = remoção do submódulo inteiro, sem ambiguidade.** `crmModule` custom +
   `removedTables:['crmContacts']` → 201, `modules.installed` = `['CRM-0','CRM-1','CRM-2A','CRM-3']`, `crmAccounts`
   instalada, `leads.contactId` e `crmOpportunities.contactId` descartados. Simétrico para `['crmAccounts']`:
   `crmContacts` instalada **sem** `accountId`. *Guarda:* dois casos de integração; o segundo verifica que o schema
   de `crmContacts` não tem `accountId`.
5. **[BE] `applyModuleRemovals` generaliza "inteiro ou nada" para todo módulo com >1 tabela** (latente depois do
   corte, porque só o CRM-0 tem >1 tabela). `reason` passa de `'FIXED_MODULE_PARTIAL'` para `'MODULE_PARTIAL'`
   (ou mantém: F-SUB-4). *Guarda:* unit com registro de teste injetado (o parâmetro `registry` já existe) com um
   módulo não-fixo de 2 tabelas → remoção parcial = 400.
6. **[BE] Remover módulo com dependente mantido → 400 nomeado** (F-SUB-6). Ex.: `crmModule` + `removedTables` =
   as 4 de CRM-0 → hoje dá o 400 genérico da relação required de `leadProposals.leadId`. Com o fork em (a):
   400 `VALIDATION_ERROR` `details: { reason: 'DEPENDENT_MODULE_KEPT', moduleKey: 'CRM-0', dependents:
   ['CRM-1','CRM-2A','CRM-2B','CRM-3'] }`, e nada instalado. *Guarda:* integração: o caso afirma o `reason` e a
   ausência de tabelas do tenant. **Não** muda o caso c3 (salão sem CRM), cuja seleção não tem dependente.
7. **[BE] Ligar submódulo depois (`POST /dashboard/modules/install`).** `moduleKey` aceita `CRM-2A`, `CRM-2B` e o
   grupo `CRM-2` (instala os membros em ordem, resultado agregado; F-SUB-2). O `ModuleInstallService` não muda de
   lógica. *Guardas (integração):* (a) tenant com Contas só → instala `CRM-2B` → `crmContacts.accountId` aponta
   para a `crmAccounts` real (a relação é resolvida na instalação porque o alvo existe); (b) tenant com Contatos só
   → instala `CRM-2A` → `synced` contém `crmContacts` e `leads`, e `crmContacts.accountId` volta; (c) 2ª chamada =
   `already-installed`.
8. **[BE] `convertLead` com um submódulo só → 409 nomeando o que falta** (F-SUB-7 (a)). `resolveTableId` já lança
   `ModuleNotInstalledError(moduleOfTable(t))`. Com o corte, `moduleKey` passa a ser `CRM-2A` ou `CRM-2B`. Se o
   F-SUB-7 fechar em (a) com "nomear todos", o erro leva `details.missingModules`. *Guarda:* o caso c7 muda de
   `moduleKey:'CRM-2'` para: tenant sem Contas → `CRM-2A`; tenant com Contas e sem Contatos → `CRM-2B`.
9. **[BE] Tenants existentes: sem migração.** Como "instalado" é derivado da presença de tabela (§0), um tenant
   com as 8 tabelas passa a ter as 5 chaves, e um tenant que ficou com uma tabela só de CRM-2 (possível via
   Controle Total antes e depois do #397) passa a ser reconhecido com `CRM-2A` **ou** `CRM-2B`, sem nenhuma escrita.
   *Guarda:* integração: tenant legado com `crmAccounts` sem `crmContacts` → `installModule('CRM-2A')` =
   `already-installed`, e `installModule('CRM-2B')` instala só `crmContacts`.
10. **[BE] Sync-preset inalterado.** `getPresetDefinitionForInternalName('crmContacts')` segue resolvendo pelo
    registro (agora via `CRM-2B`). *Guarda:* `PresetSyncService.moduleRegistry.test.ts`, expectativa de chave
    atualizada e mesma definição.
11. **[BE] Metadado do registro exposto para a UI** (F-SUB-8): `GET /dashboard/presets/:key` ganha o campo aditivo
    `modules: PresetModuleView[]` (só os módulos da suíte, com `group` e `tables`). Não muda o shape existente.
    *Guarda:* teste de controller: `crmModule` devolve 5 entradas, CRM-0 `fixed:true` com 4 tabelas; `beautySalon`
    devolve CRM-0 e CRM-1.
12. **[FE-mínimo] Espelho do registro.** `crmModules.ts`: `CrmModuleKey` com `CRM-2A`/`CRM-2B`, `CRM_MODULE_TABLES`
    dividido. `CrmNav`: `/crm/accounts` → `CRM-2A`, `/crm/contacts` → `CRM-2B`. *Guarda (vitest):* tenant com
    `crmAccounts` sem `crmContacts` mostra "Contas" e esconde "Contatos" (hoje esconde as duas).
13. **[FE-INCR] Botão "Converter Lead" no Lead360 só com CRM-2A e CRM-2B instalados** (senão, tooltip nomeando o
    submódulo que falta). Hoje o botão aparece sempre e responde 409. *Guarda (vitest):* sem `crmContacts`, o
    botão não é renderizado.
14. **[FE-INCR] Controle Total por módulo.** Para suítes com `modules`, `TotalControlSetup` agrupa as tabelas por
    módulo (dado do item 11): CRM-0 vira **um** cartão com as 4 tabelas e **um** toggle. Desmarcar um módulo com
    dependentes pede confirmação e desmarca os dependentes (pela `dependsOn` exposta, substituindo o
    `analyzePresetDependencies` no-op). O payload continua `removedTables` (F-SUB-8). *Guardas (vitest):* não
    existe toggle por tabela dentro do CRM-0; desmarcar CRM-0 lista CRM-1/2A/2B/3 na confirmação.
15. **[BE] Gates mecânicos do diff:** enum de `moduleKey` em `docs.paths.ts` (3 lugares) e `public/openapi.json`
    regenerado; path-count do OpenAPI **inalterado** (nenhuma rota nova); snapshot de `CreateDashboard.dto.test.ts`
    / `InstallModule` com o enum novo; paridade i18n pt/en para os nomes novos (registro); `aiDescription` de
    CRM-2A e CRM-2B (campo obrigatório do schema, insumo do W5 adiado); `node .claude/skills/skill-audit/
    skill-audit.mjs run` (o `check-registries.mjs` lê `registry.ts`) com 0 findings; `tsc --noEmit` limpo em
    `server/` e `my-app/`. Testes a atualizar (grep por `CRM-2`): `dashboardModules.integration`,
    `CrmPipelineService.test`, `CreateDashboard.dto.test`, `CrmModulePreset.test`, `moduleRegistry.test`,
    `moduleSelection.test`, `ModuleInstallService.test`, `PresetSyncService.moduleRegistry.test`,
    `moduleNotInstalledEnvelope.test`.

## 4. Contratos esboçados

```ts
// presets/modules/registry.ts
export const MODULE_KEYS = ['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3'] as const;   // F-SUB-2
export const MODULE_GROUP_KEYS = ['CRM-2'] as const;                                   // F-SUB-5
export const moduleKeySchema = z.enum(MODULE_KEYS);
export const moduleGroupKeySchema = z.enum(MODULE_GROUP_KEYS);
export const moduleSelectorSchema = z.union([moduleKeySchema, moduleGroupKeySchema]);  // entrada: atômica ou grupo

export const moduleDefSchema = z.object({
  key: moduleKeySchema,
  category: z.literal('crm'),
  group: moduleGroupKeySchema.optional(),              // NOVO — só UI/alias; não entra em dependência
  name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
  aiDescription: z.string().min(1),
  fixed: z.boolean(),
  tables: z.array(z.string().min(1)).min(1),           // invariante: !fixed ⇒ length === 1 (teste, item 1d)
  dependsOn: z.array(moduleKeySchema),                 // sempre chaves ATÔMICAS
  freeSelects: z.record(z.string(), z.array(z.string().min(1))),
}).strict();

export const MODULE_GROUPS: Readonly<Record<ModuleGroupKey, {
  name: { pt: string; en: string }; members: readonly ModuleKey[];
}>> = { 'CRM-2': { name: { pt: 'Contas e contatos', en: 'Accounts and contacts' }, members: ['CRM-2A', 'CRM-2B'] } };

export function expandModuleSelectors(sel: readonly ModuleSelector[]): ModuleKey[];   // grupo → membros, dedup, ordem do registro

// moduleSelection.ts — assinatura mantida; semântica ampliada (itens 5–6)
export function applyModuleRemovals(selected: readonly ModuleKey[], removedTables: readonly string[],
  registry?: Readonly<Record<ModuleKey, ModuleDef>>): ModuleKey[];
// erros (ValidationError → 400 VALIDATION_ERROR):
//   { reason: 'FIXED_MODULE_PARTIAL' | 'MODULE_PARTIAL', moduleKey, removedTables }        // F-SUB-4
//   { reason: 'DEPENDENT_MODULE_KEPT', moduleKey, dependents: ModuleKey[] }                 // F-SUB-6

// CreateDashboard.dto.ts — só o tipo do item muda
modules: z.array(moduleSelectorSchema).default([]),

// InstallModule.dto.ts
{ moduleKey: moduleSelectorSchema }
  → { status: 'installed' | 'already-installed', tables: string[], synced: string[], modules?: ModuleKey[] } // modules: quando grupo

// GET /dashboard/presets/:key — campo ADITIVO (item 11, F-SUB-8)
type PresetModuleView = { key: ModuleKey; group?: ModuleGroupKey; name: { pt: string; en: string };
  fixed: boolean; tables: string[]; dependsOn: ModuleKey[] };
// data: { ...preset, modules: PresetModuleView[] }   // hoje `modules` é ModuleKey[] na suíte → ver insumo ausente 3

// ModuleNotInstalledError — inalterado; details.moduleKey passa a valer 'CRM-2A' | 'CRM-2B'
// (F-SUB-7: opcional details.missingModules: ModuleKey[])

// my-app/features/crm/lib/crmModules.ts (FE-mínimo)
export type CrmModuleKey = 'CRM-0' | 'CRM-1' | 'CRM-2A' | 'CRM-2B' | 'CRM-3';
```

## 5. Forks — todos em RATIFICAÇÃO PENDENTE

- **F-SUB-1 · O CRM-0 também se divide?** (a) Não. CRM-0 segue atômico e fixo (4 tabelas), e a remoção parcial
  continua 400 (#411). (b) Separar `leadActivities` num submódulo opcional "Histórico" (a FK permite). (c) Separar
  em `{leadPipelines, leadStages}` + `{leads, leadActivities}`. **Recomendação: (a).** A coesão do CRM-0 é de
  serviço (board, `advanceStage`, `recordNoShow`, Lead360 leem as quatro). (b)/(c) reabrem a razão ratificada no I8
  §1.2 ("um CRM sem histórico, que nenhuma tela sabe renderizar") e criariam tenants que o FE não renderiza. A
  frase de 28/09 responde a um achado sobre módulo **não-fixo**. **RATIFICAÇÃO PENDENTE.**
- **F-SUB-2 · Nome das chaves e compatibilidade de `'CRM-2'`.** (a) `CRM-2A`/`CRM-2B` e `'CRM-2'` continua aceito
  **como grupo** na entrada (`modules`, `install`), expandindo para os dois. A saída só tem chaves atômicas.
  (b) `CRM-2A`/`CRM-2B` e `'CRM-2'` sai do enum (cliente que enviar recebe 400). (c) `CRM-2` passa a ser só Contas e
  entra um `CRM-4` Contatos. **Recomendação: (a).** Mantém o sentido de "ligar CRM-2" (B2B completo) sem quebra.
  Hoje nenhum cliente FE envia `modules` (só testes e OpenAPI), então o custo do alias é uma função pura. (c) muda
  em silêncio o que `'CRM-2'` significa para quem já o envia. **RATIFICAÇÃO PENDENTE.**
- **F-SUB-3 · Contatos depende de Contas?** (a) Não: `CRM-2B` depende só de `CRM-0`, e `accountId` é enriquecimento
  opcional (descartado e restaurado por sync). (b) Sim: `CRM-2B.dependsOn = ['CRM-0','CRM-2A']`. **Recomendação:
  (a).** É a mesma regra que decidiu o F-CRM-5 (dependência = relação required ou serviço que exige a tabela para
  existir), citada aqui pela 2ª vez (T4). A relação é opcional, e contato sem empresa (B2C) é caso real. Com (b), a
  combinação "só Contatos" deixa de ser escolhível, e remover Contas mantendo Contatos cai no F-SUB-6.
  **RATIFICAÇÃO PENDENTE.**
- **F-SUB-4 · Remoção parcial de módulo com >1 tabela, em geral.** (a) 400 para **qualquer** módulo (fixo ou não),
  com `reason:'MODULE_PARTIAL'`. O `FIXED_MODULE_PARTIAL` do #411 fica como está, porque hoje só o CRM-0 é
  atingido. (b) Invariante "não-fixo ⇒ 1 tabela" no teste (item 1d) **e** nenhum código novo no
  `applyModuleRemovals`. (c) Permitir módulo não-fixo com >1 tabela desde que as tabelas se liguem por relação
  required, com 400 na remoção parcial. **Recomendação: (a) + o teste do item 1d.** O teste impede o reagrupamento,
  e o 400 genérico fecha a classe se o teste for relaxado depois. Custo: um ramo no `applyModuleRemovals`.
  **RATIFICAÇÃO PENDENTE.**
- **F-SUB-5 · Forma do "submódulo" no registro.** (a) Lista **plana** de módulos atômicos com `group` opcional (só
  UI/alias). `dependsOn`, `resolveModuleSelection`, `applyModuleRemovals` e `ModuleInstallService` não mudam de
  forma. (b) Hierarquia: `ModuleDef.submodules[]`, com seleção e dependência nos dois níveis. **Recomendação:
  (a).** O F-CRM-9 (b) já escolheu a lista plana pelo mesmo motivo: a validação mora no registro e o DTO não
  cresce por categoria. (b) duplica a regra de dependência em dois níveis. **RATIFICAÇÃO PENDENTE.**
- **F-SUB-6 · Remover módulo que tem dependente mantido.** (a) 400 nomeado `DEPENDENT_MODULE_KEPT` com a lista de
  dependentes, e nada instalado. (b) Cascata no servidor: os dependentes saem junto e a resposta lista os
  removidos. (c) Manter o 400 genérico da relação required (hoje). **Recomendação: (a).** Espelha o
  `resolveModuleSelection` (dependência faltante → 400 nomeando). A cascata é decisão de UI (confirmação do item
  14), não um efeito silencioso do servidor. Observação: sem o F-SUB-3 (b), nenhum par CRM-2A/2B dispara este
  caso. **RATIFICAÇÃO PENDENTE.**
- **F-SUB-7 · `convertLead` com só um dos dois submódulos.** (a) Continua exigindo os dois: 409
  `CRM_MODULE_NOT_INSTALLED` nomeando o primeiro que falta (comportamento atual de `resolveTableId`, só a chave
  muda). (a′) Igual, mas com `details.missingModules` listando todos. (b) Degradar: converte só no que existe
  (conta sem contato, ou contato sem conta). **Recomendação: (a′).** Não muda a semântica da conversão, e a UI
  consegue nomear tudo que falta de uma vez. (b) muda a regra de negócio do `convertLead` (transação de 3
  escritas) e é frente própria. **RATIFICAÇÃO PENDENTE.**
- **F-SUB-8 · Empacotamento e contrato com a UI.** (a) BE + FE-mínimo (itens 1–12, 15) neste incremento. Os itens
  13–14 viram `FE-INCR-CRM-SUBMODULES`, e o registro é exposto no `GET /dashboard/presets/:key` (item 11) com
  `removedTables` mantido no payload. (b) Igual, mas sem o item 11: o FE estende o espelho `crmModules.ts` com
  `fixed`/`dependsOn`/`group`. (c) O Controle Total passa a enviar seleção por módulo (`removedModules:
  ModuleSelector[]` novo no DTO) em vez de `removedTables`. **Recomendação: (a).** A casa separa BE-INCR de
  FE-INCR, e o espelho já é duplicação declarada: aumentar o espelho com dependências (b) é a classe "cópia manual
  que diverge". (c) muda o DTO sem necessidade, porque depois do corte tabela ≅ módulo em tudo, menos no CRM-0,
  que o item 14 agrupa na UI. **RATIFICAÇÃO PENDENTE.**

## 6. Pendente de validação externa

Nenhuma regra contábil, fiscal ou legal nasce aqui. O seam AR (`CrmReceivableBridge`) só lê `crmOpportunities`
(CRM-3), que o corte não toca. **Vazia.**

## 7. Insumos ausentes

1. **PR #411 não está em `main`** (aberto em 28/09). Os itens 4–6 editam o `applyModuleRemovals` que ele cria. A
   execução só começa depois do merge do #411 ou empilhada sobre ele (se empilhada: rebasear o filho **antes** do
   squash do pai, conforme a lição `squash-merge-quebra-prs-empilhados`).
2. **Contagem de tenants reais com CRM-2 pela metade** no `dev.db` (`server/prisma/prisma/dev.db`) não foi medida.
   O item 9 não depende dela (sem migração), mas ela diz se o FE-mínimo muda a tela de alguém hoje.
3. **Colisão de nome no `GET /dashboard/presets/:key`:** a suíte já tem `modules?: ModuleKey[]` e o endpoint
   devolve a suíte crua. O item 11 precisa ou de outro nome de campo (ex.: `moduleViews`) ou de substituir o
   `modules` na resposta, e não se verificou se algum cliente lê `data.modules` dali (o `TotalControlSetup` lê só
   `tables`). Decisão de nome na sessão de feature, sem mudança de semântica.
4. **D3 (Lead × Opportunity)** segue devolvido ao dono. O corte não toca CRM-3.

## 8. Achados fora de escopo (não planejados)

1. **`sync-preset` desfaz `selectOverrides`** (GAP-MAP N3, [ABERTO]): o corte só move `freeSelects` de lugar e não
   muda o comportamento aditivo do `PresetSyncService`.
2. **`analyzePresetDependencies` no-op no `TotalControlSetup`**: hoje desmarcar `leads` no `crmModule` não
   desmarca nada e o submit bate no 400 genérico. O item 14 substitui o no-op para suítes com módulos. Para suítes
   sem módulos (tabelas de negócio do salão), o no-op continua, e é frente própria.
3. O texto do vazio em `CrmTableScreen` ("Install the CRM module to get started.") não diz qual submódulo instalar.
4. `deleteTableDataBatch` × `immutableAfter` (GAP-MAP N3) está no PR #409 e não tem relação com este corte.

## 9. Como entra na fila

Documento órfão até ratificação (regra 1 da sessão + `docs/plano/README.md`): depois dos 8 forks ratificados, o
fold cria a nota em `docs/plano/nos/` (sugestão de id: `I8b`, `depende_de: ["[[I8]]"]`, com o #411 como
pré-requisito) apontando para este arquivo, e o `FE-INCR-CRM-SUBMODULES` (itens 13–14) como nó irmão.
