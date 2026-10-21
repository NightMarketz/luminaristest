# BRIEF — TESTE-ACOPLAMENTO-PRESET (teste de acoplamento preset↔schema)

**Status:** BRIEF — forks F-TAP-1..5 em **RATIFICAÇÃO PENDENTE**. Sem código; sem "executa".

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

## Forks — RATIFICAÇÃO PENDENTE (nenhum decidido aqui)

- **F-TAP-1 — Universo varrido.** (a) só `tablePresetSuites` (3 suítes); (b) (a) + Core + cada módulo do `MODULE_REGISTRY`
  isolado (CRM-0..3), já que módulo instalável sozinho pode citar tabela que só existe com outro. **Rec.: (b)** — o nó
  diz "Core + módulos default + suíte", e a combinação parcial é onde o alvo de relação some. Custo: depende de como
  `moduleSelection` monta o conjunto (Insumo ausente 1).
- **F-TAP-2 — Fonte da lista de campos escritos por plugin.** (a) manifesto estático escrito à mão no teste;
  (b) espiar em runtime (`repository.create/update` mockado, rodar cada plugin com o preset real e coletar chaves);
  (c) manifesto exportado pelo próprio plugin. **Rec.: (a)** — o nó pede "lista explícita por plugin", cabe no
  write_set (só testes); (b) é mais fiel mas exige fixture de cada plugin; (c) toca código de aplicação, fora do write_set.
  Risco de (a): manifesto desatualiza — mitigação: o item 7 + revisão do manifesto no FIX-PLUGINS-VENDA.
- **F-TAP-3 — Exceções por desenho.** (a) allowlist nomeada no teste, com motivo; (b) marcar no preset (`optional: true`
  já existe?) e o teste respeitar o marcador. **Rec.: (a)**, pelo write_set; (b) se o marcador já existir (Insumo ausente 2).
- **F-TAP-4 — Divergência real encontrada (ex.: `sourceType`, `reason`, `importantFields.status`).** (a) teste nasce
  com `KNOWN_GAPS` (verde, lista que só encolhe) e o fix fica no nó dono; (b) teste nasce vermelho e o nó só fecha com
  os fixes (invade write_set de FIX-PLUGINS-VENDA/presets); (c) `it.failing` por gap. **Rec.: (a)** — mantém o nó
  só-teste e dá aos dois FIX um critério de pronto mecânico (esvaziar a sua fatia de `KNOWN_GAPS`).
- **F-TAP-5 — Validador de runtime (§3.2 #15: `AnalyticsValidator` só loga).** (a) fora deste nó — fica em
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
