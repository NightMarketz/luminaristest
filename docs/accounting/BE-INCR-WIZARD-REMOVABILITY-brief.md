# BE-INCR-WIZARD-REMOVABILITY — `isCore` real (nó W2)

> Sessão de planejamento, 2026-10-15. **Sem código, sem "executa".** Este BRIEF é a spec que a `sessao-feature`
> consome depois de uma autorização de execução separada.

## 0. Contexto fixo

- **Item:** nó [[W2]] (`docs/plano/nos/W2.md`): "`isCore` real". No plano em grafo de 07/09
  (`ONBOARDING-WIZARD-plano-grafo-brief.md` §2, "W2"), a lacuna é o achado sup. 2: todas as 17 tabelas nascem
  `isCore:true` e nada pode ser removido. A nota pede que o F-W2-1 seja reformulado em termos de módulo, pelas
  regras do I8.
- **Autorização:** *"Autorizo planejar o BRIEF do W2 — sessao-planejamento, sem código, sem 'executa'"* (dono,
  chat, 2026-10-15). Ela cobre só o BRIEF; a execução precisa de outra autorização.
- **Forks:** F-W2-1..4 foram ratificados no mesmo dia, por questionário, todos pela recomendação →
  [[D-2026-10-15-W2-FORKS]].
- **Base:** `main` `8ba1ed8f` (re-fetch em 2026-10-15).

### 0.1 Estado medido no código (lido no arquivo; o cbm não foi usado como prova)

| # | Fato | Onde | Grau |
|---|---|---|---|
| E1 | `extractTablesFromRealPreset` marca **toda** tabela do preset com `isCore: true`. | `server/src/features/interview/CustomizationService/TableExtractor.ts:99` | verificado (leitura) |
| E2 | `extractTablesFromDescription` (o "método legado", que também marca `isCore:true` na linha 44) **não tem chamador** em `server/src` nem em `my-app`. | `TableExtractor.ts:18-50`; grep | verificado (grep) |
| E3 | A sessão recebe só `preset.tables`, ou seja, as tabelas do setor. Não recebe o Core nem as tabelas dos módulos padrão da suíte. Salão e clínica: 17 tabelas. `crmModule`: as 8 tabelas dos módulos CRM-0..3. | `CustomizationService.ts:52-66`; `PresetService.getPresetByKey` | verificado (leitura + probe ts-node) |
| E4 | `StateManager.removeTable` recusa quando `isCore` é verdadeiro; o fluxo `remove` lista e oferece só `!isCore`. Com E1, o fluxo de remoção sempre responde "Não há tabelas que possam ser removidas". | `StateManager.ts:179`; `CustomizationService.ts:240,417,450` | verificado (leitura) |
| E5 | No create custom, a regra de módulo já existe: `applyModuleRemovals` dá 400 `FIXED_MODULE_PARTIAL`, `MODULE_PARTIAL` ou `DEPENDENT_MODULE_KEPT`. Módulo não-fixo tem exatamente uma tabela (guarda em `moduleRegistry.test.ts`). | `presets/modules/moduleSelection.ts:50-80`; `registry.ts` | verificado (leitura) |
| E6 | `handleCustomCreation` monta `finalPayload.tables[k] = {name, category, schema, internalName}` **sem `meta`**. Com isso, o `requiresTables`, o `requiresCapabilities` e o `excludesTables` do `installPresetAsSystem` nunca rodam no modo custom. | `dashboardController.ts` (loop do `finalPayload`); `DynamicTableService.ts:307-354` | verificado (leitura) |
| E7 | Consequência de E6: `removedTables:['saleItems']` mantendo `sales` passa. `sales.meta.requiresTables = ['saleItems']` não é checado, e `commissions.saleItemId` é opcional, por isso é descartado. | idem | **inferido** (leitura; não executado). O item 9 prova. |
| E8 | Relação `required` para tabela removida dá 400 **genérico** ("aponta para presetKey inexistente") só no fim, depois da conversa inteira. | `dashboardController.ts` (loop de relações) | verificado (leitura) |
| E9 | A contabilidade lê pelo nome as tabelas `sales`, `saleItems`, `customers` e `packages`. Quando alguma falta, ela **retorna em silêncio**. | `SaleSalesAccountingBridge.ts:55`, `SaleSettlementBridge.ts:59`, `SaleReversalBridge.ts:59`, `SalePackageSoldBridge.ts:50`, `bridges/saleItems.ts:70,124,154,195,207`, `FiscalDocumentEmissionService.ts:478,590,908` | verificado (leitura) |
| E10 | O FE lê `isCore` para exibir (`my-app/features/interview/components/LeftSidebar/index.tsx:33`, `RightSidebar`, `types/InterviewTypes.ts`). | grep | verificado (grep) |

Grafo de dependências internas do salão (igual ao da clínica), extraído por probe sobre os presets reais, só com as
arestas que travam:

```
relação required (alvo ← origem):  sales ← saleItems, commissions · products ← productUnits, stockMovements
                                   services ← appointments · units/employees (Core, fora da sessão)
meta.requiresTables (origem → alvos): sales → saleItems · appointments → services, customers
                                      commissions → sales, saleItems
meta.requiresCapabilities:          stockMovements → inventory.stock (provida por productUnits)
lidas pela contabilidade (E9):      sales, saleItems, customers, packages
```

### 0.2 Nós vizinhos

- **W1** (`planned`, depende de W4): leva `removedTables` da sessão ao `/dashboard/create`. **O valor do W2 só fica
  visível com o W1.** Até lá, o efeito do W2 aparece só no fluxo de remoção da conversa e no create (Controle Total).
- **W4** (`planned`, BRIEF em paralelo): persiste a sessão que hoje fica no `Map` do `StateManager`. **Colisão de
  arquivo** em `StateManager.ts` e `InterviewTypes.ts` (§5).
- **W5 / c12 do I8** (adiado em 26/09): módulos na conversa e KB da IA. Fica fora deste BRIEF (F-W2-4 → fora).
- **Controle Total** (`TotalControlSetup.tsx`): também manda `removedTables` ao mesmo `handleCustomCreation`, então
  o item 7 vale para ele. Mostrar a trava na tela é um FE vizinho (§6).

## 1. Checklist de comportamentos (BE)

Cada item é testável sozinho. Os itens com `[R]` têm a regra pura como sujeito; os com `[S]`, a sessão do wizard;
os com `[C]`, o create.

1. **[R] Regra pura de trava, numa fonte só.** Arquivo novo `server/src/features/dynamicTables/presets/removability.ts`,
   só com metadado de preset (sem Prisma, sem serviço; Contrato §2.1). `computeTableLocks(tables, keptKeys)` devolve,
   para cada tabela mantida, `TableLock | null`, nesta ordem de precedência:
   1. `FIXED_MODULE`: a tabela pertence a módulo `fixed` (CRM-0), via `moduleOfTable`.
   2. `ACCOUNTING`: a tabela tem `meta.lockedBy === 'accounting'` (item 3).
   3. `REQUIRED_RELATION`: alguma tabela **ainda mantida** tem relação `required` com
      `@@PRESET_TABLE_KEY::<esta>`. `by` lista as origens.
   4. `REQUIRED_TABLE`: alguma tabela ainda mantida tem esta em `meta.requiresTables`. `by` lista as origens.
   5. `REQUIRED_CAPABILITY`: esta é a **única** provedora mantida de uma capacidade que outra tabela mantida
      exige. `by` lista as origens.

   Guardas (Jest, presets reais): (i) salão completo → `sales`, `saleItems`, `customers`, `packages` travam com
   `ACCOUNTING`; `products` trava com `REQUIRED_RELATION` por `productUnits` e `stockMovements`; `services` trava com
   `REQUIRED_RELATION` por `appointments`; `productUnits` trava com `REQUIRED_CAPABILITY` por `stockMovements`;
   `suppliers`, `goals`, `reports`, `campaigns`, `expenses`, `otherRevenues`, `financialBaselines`, `commissions`,
   `appointments` e `stockMovements` ficam livres.
   (ii) `crmModule` → as 4 tabelas do CRM-0 travam com `FIXED_MODULE`; `leadProposals`, `crmAccounts`,
   `crmContacts` e `crmOpportunities` ficam livres. (iii) Função pura: não muta `tables`.
2. **[R] A trava é dinâmica (F-W2-1 → dinâmica).** Ela é recalculada sobre o conjunto mantido: tirar
   `stockMovements` e depois `productUnits` libera `products` (e `services` continua travado por `appointments`).
   Guarda: a sequência acima, assertando a trava de `products` a cada passo.
3. **[R] Marcação contábil no preset (F-W2-2 → travar).** `PresetTableDefinition.meta` ganha `lockedBy?: 'accounting'`.
   Ela é declarada **nos arquivos das suítes** (`BeautySalonPreset.ts`, `AestheticClinicPreset.ts`), nas 4 tabelas
   de E9. Os módulos compartilhados (`SalesModule` etc.) não mudam, porque a trava é do setor com contabilidade, não
   da tabela em si. `crmModule` não recebe marcação. Guarda: snapshot das chaves marcadas por suíte é igual a
   exatamente `{sales, saleItems, customers, packages}` em salão e clínica, e `∅` em `crmModule`.
4. **[S] `TableExtractor` usa a regra.** `extractTablesFromRealPreset` calcula `computeTableLocks(preset.tables,
   todas)` e preenche `lock` (campo novo) e `isCore = lock !== null` (campo mantido por causa do FE, E10).
   Guarda: salão → `isCore` verdadeiro só nas tabelas travadas do item 1(i); hoje o teste fica vermelho, porque
   todas são `true`.
5. **[S] Remoção recalcula as travas da sessão.** `StateManager.removeTable` passa a: recusar se `lock !== null`
   (como hoje com `isCore`); remover; **recalcular** `lock`/`isCore` das tabelas restantes que vieram do preset.
   Tabela adicionada pelo usuário continua com `isCore:false` e `lock:null`. Guarda: sessão de salão, remove
   `stockMovements`, depois `productUnits`; a seguir `products` aparece em `removableTables`.
6. **[S] Recusa nomeia a trava.** Quando a remoção é recusada por trava, a resposta do `CustomizationService` diz
   o motivo em pt ("é usada pela contabilidade", "`saleItems` depende dela", "faz parte do Funil, que é fixo") e
   continua listando as removíveis. A recusa por "não encontrada" fica separada. Guarda: `OpenAIService` falso
   devolvendo `sales` → a resposta contém o motivo `ACCOUNTING` e **não** contém "não foi encontrada".
7. **[C] O create aplica a mesma regra (F-W2-3 → sim, no W2).** `handleCustomCreation` chama
   `assertRemovalsAllowed(tablesAntesDaRemoção, removedTables)` **depois** de `applyModuleRemovals` (os 400 de módulo
   do I8 continuam com o `reason` deles) e **antes** de apagar do `finalTablesConfig`. Removida travada → 400
   `ValidationError` com `details: { reason: 'TABLE_LOCKED', table, lock }`. A checagem roda sobre o conjunto
   **final** mantido, então remover dependente e alvo juntos passa (é a mesma semântica do item 2). Guardas
   (integração): `removedTables:['saleItems']` no salão → 400 `TABLE_LOCKED`/`ACCOUNTING`;
   `['stockMovements','productUnits','products']` → 201; `['products']` sozinho → 400 `REQUIRED_RELATION`
   `by:['productUnits','stockMovements']`.
8. **[C] Tabela do Core em `removedTables` continua ignorada** (comportamento atual, `coreTableKeys`). Não vira 400:
   isso não foi ratificado (§6). Guarda de não-regressão: `removedTables:['units']` → 201 e `units` instalada.
9. **[C] Prova do furo E6/E7 antes da correção.** Teste-guarda de integração em que `removedTables:['saleItems']`
   mantendo `sales` **hoje dá 201**. Ele precisa ficar vermelho contra o item 7 e verde depois dele. Se hoje já der
   400, o E7 estava errado: o executor registra e o item 7 fica só com os casos `ACCOUNTING`/`REQUIRED_RELATION`.
10. **[R] Remove o método morto `extractTablesFromDescription`** (E2; é a linha 44 que a nota do nó cita). Zero
    chamadores; nenhum teste o referencia.
11. **[C] Gates mecânicos do diff:** snapshot de shape dos DTOs (o `ICustomizableTable` não é DTO Zod; se o executor
    criar o `tableLockSchema` em Zod, ele entra no `dtoShapeSnapshot`); `docs.paths.ts` do `POST /dashboard/create`
    documenta o 400 `TABLE_LOCKED` e `public/openapi.json` é regenerado; path-count do OpenAPI **inalterado**
    (nenhuma rota nova); `npm run check:arch` (o `interview/` já importa de `dynamicTables/presets`, então não há
    aresta nova de camada); `tsc --noEmit` nos dois pacotes. Não há i18n de FE neste BRIEF.

## 2. Contratos esboçados

```ts
// server/src/features/dynamicTables/presets/removability.ts  (item 1)
import { z } from 'zod';
import type { PresetTableDefinition } from '.';

export const TABLE_LOCK_REASONS = [
  'FIXED_MODULE', 'ACCOUNTING', 'REQUIRED_RELATION', 'REQUIRED_TABLE', 'REQUIRED_CAPABILITY',
] as const;

export const tableLockSchema = z
  .object({
    reason: z.enum(TABLE_LOCK_REASONS),
    by: z.array(z.string().min(1)).optional(),   // origens (REQUIRED_*) ou moduleKey (FIXED_MODULE)
  })
  .strict();
export type TableLock = z.infer<typeof tableLockSchema>;

/** Pura. `keptKeys` ⊆ chaves de `tables`; só as mantidas recebem entrada. */
export function computeTableLocks(
  tables: Readonly<Record<string, PresetTableDefinition>>,
  keptKeys: ReadonlySet<string>,
): Record<string, TableLock | null>;

/** Lança ValidationError { reason:'TABLE_LOCKED', table, lock } na 1ª removida travada contra o conjunto final. */
export function assertRemovalsAllowed(
  tables: Readonly<Record<string, PresetTableDefinition>>,
  removedTables: readonly string[],
): void;
```

```ts
// server/src/features/dynamicTables/presets/index.ts — PresetTableDefinition.meta (item 3, aditivo)
meta?: {
  requiresTables?: string[]; excludesTables?: string[];
  providesCapabilities?: string[]; requiresCapabilities?: string[];
  /** W2 / F-W2-2: a tabela é lida pela contabilidade do setor; não pode ser removida no onboarding. */
  lockedBy?: 'accounting';
};
```

```ts
// server/src/features/interview/models/InterviewTypes.ts — ICustomizableTable (item 4, aditivo)
isCore: boolean;            // mantido (FE lê, E10) — passa a ser derivado: lock !== null
lock?: TableLock | null;    // novo; ausente em tabela adicionada pelo usuário
```

```jsonc
// POST /dashboard/create (mode custom) — 400 novo (item 7)
{ "error": "A tabela 'products' não pode ser removida: productUnits, stockMovements dependem dela.",
  "details": { "reason": "TABLE_LOCKED", "table": "products",
               "lock": { "reason": "REQUIRED_RELATION", "by": ["productUnits", "stockMovements"] } } }
```

O envelope do 400 segue o do `ValidationError` que o `applyModuleRemovals` já usa. O executor confirma qual handler de
erro do controller serializa `details` e reutiliza o mesmo caminho.

## 3. Forks (todos ratificados em 2026-10-15 → [[D-2026-10-15-W2-FORKS]])

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-W2-1** (reformulado) · quando uma tabela do setor não pode sair | (a) dinâmica: alvo de relação `required`/`requiresTables`/capacidade de tabela **ainda mantida**, recalculada a cada remoção · (b) estática pelo grafo inteiro · (c) cascata com confirmação na conversa | (a): é a mesma semântica do create (conjunto final), e (c) põe na IA uma confirmação de cascata, que é a classe do W3 | ✅ **RATIFICADO (a)** — *"Dinâmica (Recomendado)"* |
| **F-W2-2** · tabelas lidas pela contabilidade | (a) travar `sales`/`saleItems`/`customers`/`packages` em salão e clínica via `meta.lockedBy` · (b) não travar | (a): sem isso, sai do onboarding um salão "contabilmente operante" que nunca lança venda (E9) | ✅ **RATIFICADO (a)** — *"Travar (Recomendado)"* |
| **F-W2-3** · o create aplica a mesma regra | (a) sim, no W2, com 400 `TABLE_LOCKED` · (b) nó próprio de correção | (a): uma regra só (mesmo argumento do F-W1-1); fecha E6/E7 | ✅ **RATIFICADO (a)** — *"Sim, no W2 (Recomendado)"* |
| **F-W2-4** · módulos CRM padrão da suíte na sessão | (a) fora do W2 (fica com o c12/W5, adiado em 26/09) · (b) dentro | (a): sem a KB do W5, a IA não sabe explicar o que é módulo | ✅ **RATIFICADO (a)** — *"Fora do W2 (Recomendado)"* |

Decisões D1/D2 tomadas aqui e anotadas (sem pergunta): o nome `isCore` fica (o FE lê) e `lock` é aditivo; `lockedBy`
vai nas suítes, não nos módulos compartilhados; precedência de `lock.reason` como no item 1; o método morto sai no
mesmo PR (item 10).

## 4. Pendente de validação externa

Nenhum. O item não depende de regra contábil, fiscal ou legal. A trava `ACCOUNTING` vem da leitura do código das
bridges (E9) e da decisão de produto F-W2-2, não de norma.

## 5. Divisão em PRs e ordem

**Um PR BE** (`BE-INCR-WIZARD-REMOVABILITY`), tamanho **M** (≈ 8 arquivos de código + testes): `removability.ts`
(novo), `presets/index.ts`, as duas suítes, `TableExtractor.ts`, `StateManager.ts`, `CustomizationService.ts`,
`InterviewTypes.ts`, `dashboardController.ts`, `docs.paths.ts` + `openapi.json`. Sequência interna: item 9
(guarda vermelha) → 1–3 (regra) → 7–8 (create) → 4–6 (sessão) → 10–11.

Colisões:
- **W4** toca `StateManager.ts`/`InterviewTypes.ts` (sessão persistida). Recomendação de ordem: quem mergear
  primeiro, o outro rebaseia. A mudança do W2 nesses arquivos é pequena (recalcular a trava no `removeTable` e um
  campo aditivo). Se o W4 trocar o `Map` por repositório, o item 5 passa a recalcular antes de persistir.
- **W1** depende deste PR para ter o que remover; não colide em arquivo de BE.

Perfil previsto para o executor: `opus-medio`. A regra é pura e bem cercada, mas o item 9 pode desmentir o E7, e o
executor precisa saber parar ali.

## 6. Insumos ausentes · achados fora de escopo

**Insumos ausentes:** nenhum que trave. O E7 está só inferido e o item 9 existe para prová-lo.

**Fora de escopo (registrados, não planejados):**
- **FE:** mostrar a trava e o motivo no `LeftSidebar`/`RightSidebar` do wizard e no `TotalControlSetup` (Controle
  Total). Hoje o Controle Total só descobre a trava no 400 do item 7. Isso pede um campo aditivo em
  `GET /dashboard/presets/:key` (ex.: `tableLocks`) e um FE-INCR próprio. É vizinho do W1 e do item 14 do
  BE-INCR-CRM-SUBMODULES.
- **`meta` descartado no create custom (E6)**, além do `requiresTables`: o `requiresCapabilities`/`excludesTables`
  também não rodam. O item 7 cobre o caso de remoção; repassar `meta` inteiro ao `installPresetAsSystem` é outra
  correção.
- **Core em `removedTables` ignorado em silêncio** (item 8): virar 400 nomeado não foi pedido.
- **Módulos na conversa** (salão sem Propostas pela IA): c12 do I8 / W5 (F-W2-4 → fora).
