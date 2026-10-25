# BRIEF — TESTE-ACOPLAMENTO-PRESET (teste de acoplamento preset↔schema)

**Status:** BRIEF — forks F-TAP-1..5 **RATIFICADOS em 21/10/2026** ([[D-2026-10-21-CHAT-C-FORKS]], PR #793; registro no BRIEF em 22/10/2026). F-TAP-6 (aberto na execução) **RATIFICADO em 25/10/2026: (b)** (dono, chat).
**EXECUTADO em 24/10/2026** (dono, chat: "executa TESTE-ACOPLAMENTO-PRESET"; sessao-feature; PR #883, sem merge) — ver
§"Execução (24/10/2026)" no fim. O corpo abaixo segue como spec; nada dele foi alterado.

## Contexto fixo

- **Item:** nó [`docs/plano/nos/TESTE-ACOPLAMENTO-PRESET.md`](../plano/nos/TESTE-ACOPLAMENTO-PRESET.md) (escopo proposto 1–3).
- **Autorização:** dono, chat, 2026-10-21: "dispara os chats A, C e F agora", sobre "Autorizo ... planejar o BRIEF do
  TESTE-ACOPLAMENTO-PRESET ... — sessao-planejamento, só docs, sem código, sem 'executa'". Cobre exatamente este BRIEF;
  não autoriza implementação nem merge.
- **Insumos (fato consumado):**
  - `docs/operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md` §2.2 (sonda das regras: zero
    inconsistência [P], sem teste), §3.1 itens 2/4/17 (campo escrito por plugin fora do preset), §3.2 itens 2/15/16/25, §4.
  - `server/src/features/dynamicTables/presets/__tests__/analyticsFieldMappingCoupling.test.ts` (#770): já varre todo
    `*Field` string sem ponto em `fieldMapping`/`params` dos `analytics[]` de `tablePresetSuites`, com mapa
    prefixo→tabela (`expense`, `header`, `stock`). É o canônico a **estender**, não duplicar.
  - `tablePresetSuites` (`presets/index.ts`): `services.beautySalon`, `services.aestheticClinic`, `sales.crmModule`.
  - Plugins em `server/src/features/dynamicTables/rules/plugins/` (Sales, StockMovementsApply, Commissions, Goals,
    Leads, Appointments, ProductAutoStock, UnitAutoStock, Employees, LeadsSeedOnUnit, `sales/*`).
- **Vizinhos:** consome [[FIX-ANALYTICS-DADO]] (done, #770). Destrava (opcionalmente, `?`) [[FIX-ANALYTICS-RESIDUO]] e
  [[FIX-PLUGINS-VENDA]] — ver §"O que cada nó passa a ter".
- **write_set (da nota):** `server/src/features/dynamicTables/presets/__tests__/**`, `server/src/features/analytics/**/__tests__/**`.
  Nada de código de aplicação: é um nó **só de teste** (sessão de instrumentação/feature de teste).

## Checklist de comportamentos (cada um = 1 `it` com relatório listando todas as divergências)

1. **Varredor de suítes instaláveis.** Itera `tablePresetSuites` × tabelas; a sanidade afirma um nº mínimo de tabelas
   por suíte (salão ≥ 17) para o varredor não passar vazio. (Universo: ver F-TAP-1.)
2. **Regras de governança → campo existente.** Para cada tabela, todo campo citado por `compositeUnique`,
   `immutableAfter`, `compare`, `lifecycle` (campo de estado), `noOverlap`, `requiredIf` (alvo e condição),
   `defaultDisplayField` existe em `schema.fields`.
3. **`deleteConstraints` e alvo de relação → tabela existente na suíte**, e o campo referenciado existe nela. Relações
   opcionais descartadas por desenho (`leads` → contas/contatos) entram numa allowlist nomeada com motivo (F-TAP-3).
4. **`defaultValue` de select ∈ opções do select.**
5. **Analytics (extensão do teste do #770):** `fieldMapping`/`params.*Field` cobre também campos pontuados de join
   (`a.b` → resolve a relação e checa o campo na tabela-alvo) e `importantFields` (achado §3.2 #16). Pega
   `status` em `expenses` hoje → nasce **vermelho** ou com fix no mesmo PR (F-TAP-4).
6. **Campos escritos por plugin ⊆ preset.** Manifesto explícito por plugin `{ plugin, table, writes: string[],
   reads: string[], selectValues?: {field, values[]} }` (forma: F-TAP-2); o teste checa que cada campo existe e que
   cada valor gravado em select está nas opções. Hoje deve acusar no mínimo: `sourceType` em `stockMovements`
   (§3.1 #4), `reason` `'SALE'/'RETURN'` × `'Sale'/'Return'` (§3.1 #17). (`rate` × `commissionRate`, #2, já saiu no #771 — o
   manifesto o fixa como regressão.)
7. **Sanidade de varredor que falha pelo motivo certo:** cada `it` tem um caso sintético (preset clonado com typo) que
   precisa produzir ≥1 divergência — prova que o varredor não é tautológico.
8. **Vermelhos conhecidos não viram `skip` silencioso:** divergência real ainda não corrigida vai para uma lista
   `KNOWN_GAPS` com o nó dono (`FIX-PLUGINS-VENDA`, `FIX-ANALYTICS-RESIDUO`); o teste falha se a lista tiver item que
   já não diverge (só encolhe). (Alternativa: F-TAP-4.)

## Contratos esboçados (só tipos de teste; nada exportado para a aplicação)

```ts
type CouplingFinding = {
  suite: string; table: string;
  source: 'rule' | 'relation' | 'select-default' | 'analytics' | 'plugin-write' | 'plugin-select-value';
  ruleKind?: 'compositeUnique'|'immutableAfter'|'compare'|'lifecycle'|'noOverlap'|'requiredIf'|'deleteConstraints'|'defaultDisplayField';
  ref: string;          // campo/tabela/valor citado
  target: string;       // tabela onde deveria existir
};

type PluginFieldManifest = {
  plugin: string;                 // nome da classe em rules/plugins
  table: string;                  // chave da tabela no preset
  writes: readonly string[];
  reads: readonly string[];
  selectValues?: readonly { field: string; values: readonly string[] }[];
};

type KnownGap = { key: string /* `${source}:${suite}.${table}:${ref}` */; owner: 'FIX-PLUGINS-VENDA'|'FIX-ANALYTICS-RESIDUO'; since: '2026-10-21' };
```
Saída de cada `it`: `expect(report).toEqual([])` com uma linha legível por finding (padrão do teste do #770).

## Forks — RATIFICADOS em 21/10/2026 ([[D-2026-10-21-CHAT-C-FORKS]]; o BRIEF original os deixou pendentes)

- **F-TAP-1 — Universo varrido.** **RATIFICADO 21/10/2026: (b).** (a) só `tablePresetSuites` (3 suítes); (b) (a) + Core + cada módulo do `MODULE_REGISTRY`
  isolado (CRM-0..3), já que módulo instalável sozinho pode citar tabela que só existe com outro. **Rec.: (b)** — o nó
  diz "Core + módulos default + suíte", e a combinação parcial é onde o alvo de relação some. Custo: depende de como
  `moduleSelection` monta o conjunto (Insumo ausente 1).
- **F-TAP-2 — Fonte da lista de campos escritos por plugin.** **RATIFICADO 21/10/2026: (a).** (a) manifesto estático escrito à mão no teste;
  (b) espiar em runtime (`repository.create/update` mockado, rodar cada plugin com o preset real e coletar chaves);
  (c) manifesto exportado pelo próprio plugin. **Rec.: (a)** — o nó pede "lista explícita por plugin", cabe no
  write_set (só testes); (b) é mais fiel mas exige fixture de cada plugin; (c) toca código de aplicação, fora do write_set.
  Risco de (a): manifesto desatualiza — mitigação: o item 7 + revisão do manifesto no FIX-PLUGINS-VENDA.
- **F-TAP-3 — Exceções por desenho.** **RATIFICADO 21/10/2026: (a).** (a) allowlist nomeada no teste, com motivo; (b) marcar no preset (`optional: true`
  já existe?) e o teste respeitar o marcador. **Rec.: (a)**, pelo write_set; (b) se o marcador já existir (Insumo ausente 2).
- **F-TAP-4 — Divergência real encontrada (ex.: `sourceType`, `reason`, `importantFields.status`).** **RATIFICADO 21/10/2026: (a).** (a) teste nasce
  com `KNOWN_GAPS` (verde, lista que só encolhe) e o fix fica no nó dono; (b) teste nasce vermelho e o nó só fecha com
  os fixes (invade write_set de FIX-PLUGINS-VENDA/presets); (c) `it.failing` por gap. **Rec.: (a)** — mantém o nó
  só-teste e dá aos dois FIX um critério de pronto mecânico (esvaziar a sua fatia de `KNOWN_GAPS`).
- **F-TAP-5 — Validador de runtime (§3.2 #15: `AnalyticsValidator` só loga).** **RATIFICADO 21/10/2026: (a).** (a) fora deste nó — fica em
  FIX-ANALYTICS-RESIDUO; (b) incluir aqui um teste que exige que o `AnalyticsService` rejeite config inválida.
  **Rec.: (a)** — mudar o validador é código de aplicação; este nó cobre o lado estático (preset), o resíduo cobre o runtime.

## O que cada nó destravado passa a ter

- **FIX-ANALYTICS-RESIDUO:** (1) rede estática que pega `*Field`/join/`importantFields` inexistente em qualquer preset de
  analytics — os itens #15 (validador) e #16 (`importantFields`) ganham oráculo; (2) sua fatia de `KNOWN_GAPS` como
  critério de pronto; (3) fixtures dos fixes de período/fuso/sanitizer podem ser montadas **a partir do preset real**
  (o teste prova que os nomes existem), acabando com fixture inventada (§4).
- **FIX-PLUGINS-VENDA:** (1) manifesto de campos escritos/lidos por plugin como contrato checado — os itens #4
  (`sourceType`), #17 (`reason`) e "campos declarados sem leitor/escritor" (#19–22) viram findings objetivos;
  (2) teste-guarda vermelho pronto para os itens de campo (vira a entrada de `sessao-correcao`); (3) regressão
  de `rate` (#771). Não cobre os itens de comportamento (tx, paginação, pré-recálculo) — esses seguem precisando de teste próprio.

## Pendente de validação externa
Nenhuma — o nó não depende de regra contábil/fiscal/legal.

## Insumos ausentes
1. Como `moduleSelection.ts`/`registry.ts` montam um conjunto instalável de módulo isolado (decide o custo de F-TAP-1(b)).
2. Se o preset já tem marcador de relação opcional descartável (F-TAP-3).
3. Shape exato de cada tipo de regra em `ITableSchema` (`RuleTypes.ts`) — o implementador lê ao materializar o item 2;
   não muda o checklist.

## Achados fora de escopo
- `addedFields` muta o singleton do preset (§2.1) — fix em branch sem PR; não é acoplamento.
- `PresetSyncService` não propaga `lifecycle`/`deleteConstraints`/`noOverlap`/`compositeUnique` (§2.3) — frente própria.

## Gates para a sessão que implementar
`cd server && npx tsc -p tsconfig.test.json --noEmit`; o novo teste roda em `npm test` (unit, sem banco); nenhum DTO,
i18n, auditCanonical ou openapi tocado.

---

## Execução (24/10/2026, PR #883)

Autorização: dono, chat, 2026-10-24: "executa TESTE-ACOPLAMENTO-PRESET" — teste-guarda; campos órfãos **não**
consertados, só registrados (no nó e em `KNOWN_GAPS`). Sem merge.

### Arquivos (todos em `server/src/features/dynamicTables/presets/__tests__/`, dentro do write_set)

| Arquivo | Itens |
|---|---|
| `presetCouplingUniverse.ts` (helper, não é suíte) | universo F-TAP-1 (b), tipos `CouplingFinding`/`KnownGap` do §Contratos, `partitionByKnownGaps` (item 8) |
| `presetSchemaCoupling.test.ts` | 1, 2, 3, 4, 6, 7, 8 + manifesto `PLUGIN_MANIFEST` (F-TAP-2 a) + allowlist `OPTIONAL_RELATIONS` (F-TAP-3 a) |
| `analyticsFieldMappingCoupling.test.ts` (o do #770, estendido — não duplicado) | 5, 7, 8 |

### Checklist

| # | Status | Nota |
|---|---|---|
| 1 | ✅ | 8 universos: `beautySalon`, `aestheticClinic`, `crmModule` + `module:CRM-0/1/2A/2B/3`; salão ≥ 17 tabelas |
| 2 | ✅ | 0 divergência (confirma a sonda do ACHADOS §2.2) |
| 3 | ✅ | 0 divergência fora da allowlist |
| 4 | ✅ | 0 divergência |
| 5 | ✅ | `importantFields` na leitura do runtime (F-TAP-6 → b, 25/10); 7 divergências por suíte → 14 chaves em `KNOWN_GAPS` (FIX-ANALYTICS-RESIDUO) |
| 6 | ✅ | 6 divergências → `KNOWN_GAPS` (FIX-PLUGINS-VENDA); `rate` (#771) fixado como regressão |
| 7 | ✅ | um typo sintético por varredor (`defaultDisplayField`, alvo de relação, relação obrigatória fora da allowlist, `defaultValue`, campo e valor de plugin, `*Field`, join pontuado, `importantFields`) |
| 8 | ✅ | entrada de `KNOWN_GAPS` que já não diverge reprova o teste; falsificador: remover a entrada do `sourceType` deixa o item 6 vermelho |

### Insumos ausentes — resolvidos na leitura

1. **Conjunto instalável de módulo isolado:** `Core.tables ∪ composeModuleTables(resolveModuleSelection([m]))`; suíte
   = `Core ∪ composeModuleTables(resolveModuleSelection([], suite.modules)) ∪ suite.tables`, na ordem de spread do
   `dashboardController.createDashboardFromPreset`. Custo de F-TAP-1 (b) baixo — nenhuma fixture.
2. **Marcador de relação opcional:** não existe no preset. O critério real é `required: false`: o create descarta
   relação opcional cujo alvo não foi instalado e responde 400 se ela for obrigatória (`dashboardController`,
   "Verificar dependências quebradas"; idem `DynamicTableService.installPresetAsSystem`). Por isso a allowlist
   F-TAP-3 (a) só vale com `required: false`.
3. **Shape das regras:** em `models/DynamicTable.model.ts` (não em `RuleTypes.ts`). Campos checados: `compositeUnique.fields`,
   `immutableAfter.condition.field` + `scope[]`, `compare.left/right`, `lifecycle.field`,
   `noOverlap.startField/endField/scopeFields`, `requiredIf.field`, `defaultDisplayField`,
   `deleteConstraints.targetTable` + `aggregate.field` (na tabela-alvo).

### Leituras de implementação (dentro da spec, registradas para o revisor)

- **Item 5, join pontuado:** os únicos `*Field` pontuados dos presets estão dentro de `params.pipeline`
  (`dateField: 'header.date'` em `SalesItemsMixed`), não no top-level. O varredor percorre o pipeline:
  `*Field` sem ponto → tabela `pipeline.source`; `alias.campo` → `joins[].alias` (ou campo `relation` homônimo na
  tabela-base) → tabela-alvo; `joins[].leftField` na base, `rightField` no `rightRef`. `id` é aceito como campo de
  sistema da linha. Chaves `field` (sem sufixo `Field`) de `filters`/`measures` ficam fora — o item pede `*Field`.
- **Item 5, `importantFields`:** inclui `defaultImportantFields`; tabela de referência = a do `tableKey` do bloco.
- **Item 6:** o manifesto cobre leitura e escrita com `source: 'plugin-write'` (o contrato só tem esse rótulo para
  campo); valor de select só é checado quando o campo é `select` (campo livre aceita qualquer valor).
- **Chave de `KnownGap`:** `${source}:${universo}.${tabela}:${ref}` — o mesmo gap aparece uma vez por universo que
  contém a tabela (salão e clínica compartilham `stockMovements`, `expenses` e `sales`).

### Achados (em `KNOWN_GAPS`, não consertados — critério de pronto dos nós donos: esvaziar a sua fatia)

**FIX-PLUGINS-VENDA** (6 chaves = 3 divergências × salão/clínica)

| Divergência | Origem |
|---|---|
| `sourceType` lido em `stockMovements` por `StockMovementsApplyPlugin` e `sales/stockSync.ts`; não declarado no preset (o Zod do motor remove a chave) | ACHADOS §3.1 #4 |
| `reason='SALE'` gravado por `stockSync.createMovementsForItems`; opções `Sale`/`Return` | §3.1 #17 |
| `reason='RETURN'`, idem | §3.1 #17 |

**FIX-ANALYTICS-RESIDUO** (14 chaves = 7 divergências × salão/clínica; leitura do runtime, F-TAP-6 → b)

| Chave (`analytics:<suíte>.<tabela>:` + …) | Divergência | Origem |
|---|---|---|
| `costKpis:importantFields[Custo Total]=status` | KPI de fonte `expenses` lista `status`, que `expenses` não tem | §3.2 #16 |
| `costKpis:defaultImportantFields=status` | o *default* cobre os 9 KPIs de custo sem entrada própria, todos de `expenses` | §3.2 #16 |
| `cashflowKpis:importantFields[Contas a Pagar Total]=date` | **novo:** KPI de fonte `expenses`; `expenses` tem `paymentDate`/`dueDate`, não `date` | L-TAP-1 |
| `cashflowKpis:defaultImportantFields=date` · `=totalAmount` · `=status` | **novo:** o *default* do bloco de caixa (feito para `sales`) cai sobre "Contas a Pagar Vencidas" e "Prazo Médio de Pagamento (dias)", de fonte `expenses` | L-TAP-1 |
| `profitKpis:importantFields[Lucro por Cliente]` | **novo:** chave morta; o `ProfitKpiProcessor` emite "Lucro Médio por Cliente" | L-TAP-1 |

As 2 chaves da leitura A sobre `amount` saíram: `amount` existe em `expenses`, a fonte do KPI, então era falso positivo.
`importantFields` não tem consumidor no frontend (L-TAP-1 §1).

**Por desenho (allowlist F-TAP-3 a, não é achado):** `leads.accountId/contactId`, `crmContacts.accountId` e — **novo,
só visível com o módulo isolado de F-TAP-1 (b)** — `crmOpportunities.accountId/contactId` (CRM-3 depende só de CRM-0,
F-CRM-5 a). A sonda do ACHADOS §2.2 não varreu módulo isolado, por isso só citava os `leads`.

### Lacunas de spec

#### L-TAP-1 — contra qual tabela conferir `importantFields` (aprofundada em 24/10; **fechada em 25/10 por F-TAP-6 → b**)

**Resumo.** O BRIEF dizia só "`importantFields` (achado §3.2 #16)". A 1ª entrega usou a tabela do `tableKey` do bloco
(leitura A). O runtime tem uma semântica executável diferente (leitura B), que acha **mais** divergências, então a
1ª entrega subnotificava. Há ainda uma terceira classe de órfão (chave de KPI que o processador não emite) que A não
pegava. **O dono ratificou B em 25/10** (F-TAP-6 abaixo); o teste agora usa B.

**1. O que é `importantFields` no código** (verificado lendo os arquivos):

- Tipo: `ChartPreset.options.importantFields?: Record<string, string[]>` — "KPI name → array de campos importantes" —
  e `defaultImportantFields?: string[]` — "Campos padrão para todos os KPIs deste chart"
  (`server/src/features/analytics/core/models/ChartPreset.ts:49-50`). A chave é o **nome do KPI**, não a tabela.
- Único leitor no servidor: `resolveChartDetails` (`engine/AnalyticsResolver.ts:453`), atrás de
  `GET /api/analytics/chart/:chartKey/details` (`routes/analytics.ts:28`). Ele **só repassa** os dois campos no
  corpo da resposta; não filtra nem valida nada com eles.
- Consumidor no frontend: **nenhum**, em nenhum commit do histórico (`git log --all -S importantFields` só acha
  `server/` e docs; `git grep` no `my-app` em `ef2fb231`, `0db39612` e `HEAD` = vazio). O `my-app` tem o tipo
  `ChartDetailsResponse` (`analytics.types.ts:273`, sem `importantFields`) e nenhum chamador da rota de detalhe — é a
  rota órfã do ACHADOS §3.2 #20. Pelo comentário em `AnalyticsResolver.ts:437` ("O modal ainda funcionará buscando
  dados via resolveChartDetails"), a intenção era um modal de detalhamento do KPI (quais colunas mostrar). Grau:
  **inferido**.
- **De qual tabela vêm os registros do detalhe de um KPI:** do `tableSource` que o **processador** emite para aquele
  KPI (`ProcessorRegistry.ts:36`; `AnalyticsResolver.ts` "Priority: dataPoint.tableSource > table.presetKey >
  processorParams.tableId"). Valores: a tabela principal (`mainTableSource`), a de despesas (`expenseTableSource` =
  `params.expensesTableKey ?? 'expenses'`), ou `'mixed'`. Com `'mixed'`, o resolver busca a principal **e** a de
  `costSourceTableKey || expensesTableKey`, devolvendo `recordsByTable` agrupado por tabela. Esta é a **única
  semântica executável** de "tabela de um KPI" no repo.

**2. Inventário completo** (4 blocos com `importantFields`, idênticos em salão e clínica; nomes emitidos lidos dos
processadores — `cashflow` 11, `cost` 14, `profit` 18, `revenue` 17 KPIs, conferidos por contagem):

| Bloco (tabela) | KPI em `importantFields` | `tableSource` emitido | Campos fora da tabela-fonte |
|---|---|---|---|
| `sales#revenueKpis` | 6 KPIs | todos `sales` | — |
| `sales#profitKpis` | Lucro Bruto, Lucro Líquido, Margem Bruta, Margem Líquida | `mixed` (sales ∪ expenses) | — |
| `sales#profitKpis` | **Lucro por Cliente** | **não emitido** (o processador emite `Lucro Médio por Cliente`) | chave morta |
| `sales#cashflowKpis` | Fluxo de Caixa Operacional | `mixed` | — |
| `sales#cashflowKpis` | Contas a Receber Total | `sales` | — |
| `sales#cashflowKpis` | **Contas a Pagar Total** `['date','amount','paymentStatus']` | **`expenses`** | **`date`** (expenses tem `paymentDate`/`dueDate`) |
| `sales#cashflowKpis` | *default* `['date','totalAmount','paymentStatus','status']` → KPIs sem entrada própria com fonte `expenses`: **Contas a Pagar Vencidas**, **Prazo Médio de Pagamento** | `expenses` | **`date`, `totalAmount`, `status`** |
| `expenses#costKpis` | Custo Total (e o *default*, que cobre os 9 KPIs sem entrada) | `expenses` | **`status`** |

**3. As leituras e o que cada uma acha** (por suíte; ×2 com salão e clínica):

| Leitura | Regra | Divergências |
|---|---|---|
| **A** (entregue no #883) | todo campo existe na tabela do `tableKey` do bloco | `costKpis:status`, `cashflowKpis:amount` |
| **B** (oráculo de runtime) | campo da entrada de um KPI existe na tabela do `tableSource` que o processador emite para ele (`mixed` = pelo menos uma das duas tabelas); `default` vale para cada KPI emitido **sem** entrada própria, contra a fonte dele; chave de KPI tem de ser nome emitido | `costKpis:status`; `cashflowKpis` "Contas a Pagar Total": `date`; `cashflowKpis` *default* nos 2 KPIs de despesa: `date`, `totalAmount`, `status`; `profitKpis`: chave morta `Lucro por Cliente` |
| **B′** (B com `mixed` estrito: o campo existe nas **duas** tabelas) | idem B | B + todo KPI `mixed` de lucro e de caixa (`date`, `totalAmount`, `status` não existem em `expenses`) — descartada: `importantFields` não é indexado por tabela, então não dá para exigir o campo nas duas |

Sob A, `amount` em "Contas a Pagar Total" é falso positivo: o KPI lê `expenses`, onde `amount` existe. O órfão real
é `date`, que A não vê. A também não vê o *default* aplicado a KPI de despesa nem a chave morta.

**4. Decisão** — F-TAP-6 (abaixo), ratificado em (b).

**F-TAP-6 — semântica do `importantFields` no teste.** **RATIFICADO 25/10/2026: (b)** — dono, chat, 2026-10-25:
"F-TAP-6 → (b): adota a leitura do runtime (tableSource por KPI, mixed = pelo menos uma das duas tabelas, default
por KPI sem entrada, chave tem de ser nome emitido), com manifesto estático nome→tableSource. Atualiza o teste e os
KNOWN_GAPS no #883, sem merge."
- (a) Manter A (tabela do bloco). Simples, mas tem falso positivo (`amount`) e falso negativo (`date`, *default*, chave morta).
- (b) Adotar B: o teste lê o `tableSource` de cada KPI e confere a chave contra os nomes emitidos. Para isso, o
  teste precisa da lista `nome → tableSource` de cada processador, e há dois jeitos de obtê-la: executar o
  processador com um fixture vazio ou manter um manifesto estático, como no F-TAP-2 (a). **Rec.: (b)**, com o
  manifesto estático: B é a única semântica que o runtime executa, e o manifesto cabe no write_set.
- (c) Não testar `importantFields`: sem consumidor, o campo morre junto com a rota de detalhe se o
  FIX-ANALYTICS-RESIDUO remover a rota órfã (§3.2 #20). Nesse caso, a fatia de `importantFields` sai de `KNOWN_GAPS`
  e vira item de remoção no nó dono.

Continua aberto, mas não neste nó: se a rota de detalhe sobrevive é decisão do FIX-ANALYTICS-RESIDUO (§3.2 #20). Se
ela morrer, a fatia de `importantFields` de `KNOWN_GAPS` some junto (o critério "a lista só encolhe" acomoda isso).

**Implementação de (b)** (`analyticsFieldMappingCoupling.test.ts`):
- `PROCESSOR_KPI_SOURCES`: nome emitido → `main | expense | mixed` dos 4 processadores cujos blocos têm
  `importantFields` (`revenue` 17, `profit` 18, `cost` 14, `cashflow` 11), mais o `params` que dá a tabela de
  despesa (`expensesTableKey` no caixa, `costSourceTableKey` no lucro), como cada processador faz.
- Tabelas de um KPI = as que o `resolveChartDetails` buscaria: `main` → a do bloco; `expense` →
  `params[expenseParam] ?? 'expenses'`; `mixed` → a do bloco + `costSourceTableKey || expensesTableKey`.
- Regras: campo da entrada existe em **pelo menos uma** das tabelas do KPI; chave fora dos nomes emitidos é
  divergência (`importantFields[<kpi>]`); o *default* é conferido para cada KPI emitido sem entrada própria e agregado
  por campo (`defaultImportantFields=<campo>`, com os KPIs afetados na mensagem); bloco com `importantFields` e
  processador fora do manifesto é divergência.
- Guarda contra desatualização do manifesto: um `it` lê o código de cada processador e reprova nome ou fonte
  divergente, nos dois sentidos.
- Item 7: casos sintéticos para chave morta, campo de `sales` em KPI de fonte `expenses` e *default* com typo, mais
  um caso negativo (`totalAmount` em KPI `mixed` não acusa).
- Falsificadores rodados: fonte errada no manifesto (`Contas a Pagar Total: main`) deixa vermelho o `it` do
  manifesto, o de acoplamento e o de `KNOWN_GAPS`; remover a entrada `defaultImportantFields=totalAmount` deixa
  vermelho o de acoplamento. Arquivo restaurado e conferido com `cmp`.

### Fora de escopo (para os nós donos)

- O manifesto é estático (F-TAP-2 a): plugin novo ou campo novo lido por plugin não entra sozinho. Revisar o
  `PLUGIN_MANIFEST` no FIX-PLUGINS-VENDA, como o F-TAP-2 já previa.
- `filters[].field` e `measures[].field` dos pipelines não são varridos (o item 5 pede `*Field`); se o
  FIX-ANALYTICS-RESIDUO quiser a rede completa do pipeline, é extensão do mesmo varredor.

### Gates rodados

`npx jest --selectProjects unit --testPathPatterns "analyticsFieldMappingCoupling|presetSchemaCoupling"` 12/12 (25/10, após F-TAP-6) ·
`npx tsc --noEmit` 0 · `npx tsc -p tsconfig.test.json --noEmit` 0 · eslint dos 3 arquivos 0 ·
`node scripts/plano-vault.mjs check` 0. Review independente não despachado (CLAUDE.md §⛔: Bloco A com oráculo aberto).
