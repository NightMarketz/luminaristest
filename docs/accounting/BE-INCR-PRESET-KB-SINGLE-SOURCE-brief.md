# BE-INCR-PRESET-KB-SINGLE-SOURCE (+ FE-INCR-W5-MODULES): BRIEF do nó W5

> **Nó:** [`docs/plano/nos/W5.md`](../plano/nos/W5.md): KB multi-preset + fonte única de presets.
> Também fecha o **c12 do I8**, adiado pelo dono em 26/09 "vinculado ao F-W5-1"
> ([`BE-INCR-CRM-MODULE-COMPOSITION-brief.md`](../crm/BE-INCR-CRM-MODULE-COMPOSITION-brief.md) §2 item 12).
> **Sessão:** `sessao-planejamento`. Sem código, sem branch de código, **sem "executa"**.
> **Base medida:** `main` `8ba1ed8f` (15/10/2026).

## 0. Formulário

- **Item a planejar:** W5. O texto de origem está no plano em grafo de 07/09,
  [`ONBOARDING-WIZARD-plano-grafo-brief.md`](ONBOARDING-WIZARD-plano-grafo-brief.md) §2 "W5" (l. 349–360) e §3 (l. 424–425).
  O nó foi criado `planned` pela decisão 12/18 de [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]].
- **Autorização:** *"Autorizo planejar o BRIEF do W5 — sessao-planejamento, sem código, sem 'executa'"* (dono, chat,
  2026-10-15). Ela cobre exatamente o BRIEF do W5. O escopo foi ampliado **pelo próprio dono**, no questionário desta
  sessão: o c12 do I8 entra (F-W5-3) e o W5 ganha um PR de FE (F-W5-5). As cédulas estão em
  [[D-2026-10-15-W5-FORKS]]. Implementar exige um "executa" à parte.
- **Insumos (fato consumado, não se rediscute):**
  - `presets/index.ts`: `tablePresetSuites` = `services.{beautySalon, aestheticClinic}` + `sales.{crmModule}`.
    `PresetSuite` tem `key?/name?/description?/modules?`.
  - `presets/ai/PresetKnowledgeBase.ts`: array escrito à mão `IPresetKnowledge { key, name, aiDescription }` com
    **2** entradas (beautySalon, aestheticClinic). A entrada da clínica e a emenda do salão são o comportamento 3 do P2
    (#282). Elas ficam **textualmente** como estão.
  - `presets/modules/registry.ts`: `MODULE_REGISTRY` (CRM-0 fixo, CRM-1, CRM-2A, CRM-2B, CRM-3), cada um com
    `aiDescription` e `name.{pt,en}`. **Nenhum consumidor lê `aiDescription` de módulo** (grep `\.aiDescription` em
    `server/src`: só `FieldPresetMatcher.ts:130` e `InterviewService.ts:72`, os dois sobre outras listas).
  - `presets/modules/moduleSelection.ts:16` `resolveModuleSelection(requested, suiteDefaults)`: a seleção é
    pedido ∪ padrão da suíte, fechada pelas dependências. Dependência fixa entra sozinha; dependência não-fixa ausente
    dá 400.
  - Consumidores do KB: `PresetMatcher.ts:27,58` (prompt + busca por key), `InterviewService.ts:72`
    (`extractTablesInfo(aiDescription)` lê a frase "tabelas para: …" por regex), `StageHandlers.ts:5` (tipo),
    `CustomizationService.ts:59` (exige entrada no KB para abrir a sessão de customização).
  - Resolução de preset, **três caminhos**:
    - Rápido: `buildQuickPreset.ts:41` percorre `tablePresetSuites` e lança `UnknownSuiteError` (404).
    - Lista e detalhe: `PresetService.getPresetByKey` / `getAllPresetSummaries` (registro).
    - **Controle Total:** `dashboardController.ts:190` usa `PresetManager.getPresetByKey`, que faz
      `import(./systems/${Pascal}Preset)` e **ignora o registro**. Uma chave fora do registro com arquivo em `systems/`
      resolve: `coreSystem` cai em `CoreSystemPreset.ts`, que não tem `default`, e dá `Error` genérico.
  - `OpenAIService.classifyIntoEnum` + `buildEnumResponseFormat` (`OpenAIService.ts:75,250`): saída estruturada
    `json_schema` strict, presa a um conjunto fechado. É o canônico para "a IA escolhe de uma lista" (KIT-SETOR PR-K3).
  - FE: `useAiInterview.ts:105-111` cria pelo modo **quick** (`{ suiteKey, unit, fiscal }`) e **não manda
    `modules`**. `AiInterviewSetup/index.tsx:163` mostra `CreationChoice` quando o turno traz `choicePrompt`.
  - `proveP2ZeroDiffCli.ts:48`: `presets/PresetManager.ts` está no perímetro zero-diff do ADR-P2
    (`RUNBOOK-H3-P2-CLINICA.md` passo 1). `presets/ai/` e `presets/systems/` estão **fora** dele (l. 19–24).
- **Nós vizinhos:**
  - Consome: [[I8]] (registro de módulos, `resolveModuleSelection`), [[P2]] (entrada `aestheticClinic`, não muda).
  - Consumido por: [[BUILDER-VERTICAIS]] (`depende_de: W5`: "preset vira manifesto" parte de uma lista única com perfil
    de IA).
  - Colisão de arquivo com os BRIEFs paralelos do wizard: [[W4]] (`InterviewSession`, mexe em `StateManager`/controller
    da entrevista) e [[W2]] (`isCore` em `TableExtractor`). Ver §6 item 2.

## 1. O que o W5 entrega, em uma frase por PR

| PR | Incremento | Resultado observável |
|---|---|---|
| PR-1 (BE) | fonte única | A IA conhece os 3 presets do registro (inclui `crmModule`). Uma suíte sem perfil de IA não compila. O Controle Total resolve pelo registro (chave desconhecida = 404, como no Rápido). |
| PR-2 (BE) | c12 do I8 | O turno `MATCHING_PRESET` devolve `moduleOptions`: os módulos da categoria, com os travados pela suíte e os sugeridos pela IA a partir da conversa e do `aiDescription` do registro. A pergunta "CRM sim/não" vale para suíte sem CRM-0 (latente hoje). |
| PR-3 (FE) | FE-INCR-W5-MODULES | A entrevista mostra os módulos sugeridos, deixa desmarcar os não-travados e manda `modules` no `POST /dashboard/create`. |

Ordem: PR-1 → PR-2 → PR-3, em série. O PR-2 importa o KB derivado e o PR-3 consome o campo do PR-2.

## 2. Checklist numerado (cada item testável sozinho)

### PR-1: fonte única (BE)

1. **Tipo do perfil de IA.** Em `presets/index.ts`: `PresetAiProfile = { name: string; description: string }` e
   `SelectablePresetSuite = PresetSuite & { key: string; aiProfile: PresetAiProfile }`. `tablePresetSuites` passa a
   ser declarado com `satisfies Record<string, Record<string, SelectablePresetSuite>>`. O `CoreSystemPreset` fica fora
   (não é selecionável).
   *Teste:* arquivo de teste de tipos com `// @ts-expect-error` numa suíte sem `aiProfile` (falha se a guarda sumir),
   compilado por `tsc -p tsconfig.test.json`.
2. **Textos movidos sem mudança.** `BeautySalonPreset.aiProfile` e `AestheticClinicPreset.aiProfile` recebem
   `name`/`aiDescription` de hoje **byte a byte**, com os comentários do P2 comportamento 3.
   *Teste:* os dois testes de não-competição de `PresetMatcher.test.ts:27-41` continuam verdes **sem edição**, e um
   teste novo compara as 2 strings com as literais de `8ba1ed8f`.
3. **`crmModule` ganha perfil.** `CrmModulePreset.aiProfile` = `{ name: 'CRM (funil de vendas)', description: <rascunho
   §3.3> }`. A descrição mantém a forma "Inclui tabelas para: A, B e C." porque o `extractTablesInfo` lê essa frase.
   *Teste:* `extractTablesInfo(crm.aiDescription)` devolve ≥ 3 nomes. A descrição do CRM não contém "salão" nem
   "clínica", e as do salão e da clínica não contêm "funil".
4. **KB derivado.** `PresetKnowledgeBase.ts` passa a exportar
   `presetKnowledgeBase: IPresetKnowledge[] = deriveKnowledgeBase(tablePresetSuites)`, com a ordem do registro e
   `{ key: suite.key, name: aiProfile.name, aiDescription: aiProfile.description }`. `IPresetKnowledge` não muda,
   então nenhum consumidor muda.
   *Teste:* chaves do KB == chaves de todas as suítes do registro (hoje 3). Uma suíte de fixture acrescentada ao
   registro aparece no KB sem tocar `PresetKnowledgeBase.ts`.
5. **Chave do mapa = `suite.key`.** `deriveKnowledgeBase` lança erro na carga do módulo se `suite.key !==` a chave do
   mapa. Hoje `buildQuickPreset` resolve pela chave do mapa e o `PresetService` pela `preset.key`. A igualdade é o que
   faz os dois apontarem para a mesma suíte.
   *Teste:* registro de fixture com chave divergente → lança erro com o nome da suíte.
6. **Controle Total pelo registro.** `handleCustomCreation` (`dashboardController.ts:190`) troca
   `await getPresetByKey(presetKey)` por `presetService.getPresetByKey(presetKey)`. `null` lança
   `new UnknownSuiteError(presetKey)` (reuso de `buildQuickPreset.ts:10`), que dá 404 `{ error }` igual ao modo Rápido.
   **`PresetManager.ts` fica com zero diff** (F-W5-2): o import de `getPresetByKey` sai do controller e o de
   `keyToPascalCase` fica.
   *Teste (integração do create, modo custom):* `presetKey: 'coreSystem'` → 404 (hoje é erro do import dinâmico);
   `'inexistente'` → 404; `'crmModule'` → 201.
   *Prova do F-W5-2:* `git diff --name-only origin/main...HEAD -- server/src/features/dynamicTables/presets/PresetManager.ts`
   vazio.
7. **Gates do PR-1:** `cd server && npx tsc --noEmit` e `npx tsc -p tsconfig.test.json`. Jest unit de
   `PresetMatcher`, `StageHandlers.choice`, `CustomizationService` e do teste novo do KB. Integração do create
   (`npm run test:integration`, shard que contém o create). `npm run check:arch`. **Não aciona:** snapshot de DTO (nenhum
   Zod muda), path-count do openapi (nenhuma rota nova), i18n, `auditCanonical`. Doc openapi: `docs.paths.ts:758-770` (`POST /api/dashboard/create`)
   lista 201/400/401/403 e **não** documenta o 404 que o modo Rápido já devolve. O PR-1 acrescenta
   `'404': { $ref: '#/components/responses/NotFoundError' }`, que vale para os dois modos, e regenera o
   `public/openapi.json` (`npm run docs:generate`). O path-count não muda.

### PR-2: c12 do I8, sugestão de módulos (BE)

8. **Conhecimento de módulos derivado.** Arquivo novo `presets/ai/ModuleKnowledgeBase.ts`:
   `moduleKnowledge(): IModuleKnowledge[]` derivado de `MODULE_REGISTRY` (`key`, `name` pt/en, `aiDescription`,
   `fixed`, `dependsOn`, `group?`). Sem lista à mão: é o primeiro consumidor do `aiDescription` de módulo.
   *Teste:* uma entrada por `MODULE_KEYS`, com textos iguais aos do registro.
9. **Escolha múltipla presa ao conjunto.** Em `OpenAIService`, irmãos do canônico de escolha única:
   `buildEnumSetResponseFormat(options)` (json_schema strict `{ keys: string[] }` com `items.enum = options`),
   `parseEnumSetChoice(content, options)` (JSON inválido → `[]`, filtra fora de `options`, deduplica) e
   `classifyIntoEnumSet(input, systemPrompt, options): Promise<string[]>` (modelo `FALLBACK`, como o
   `classifyIntoEnum`).
   *Teste:* unit de `buildEnumSetResponseFormat` e `parseEnumSetChoice` (JSON quebrado, chave fora da lista,
   duplicata).
10. **`ModuleSuggester`** (`features/interview/InterviewService/ModuleSuggester.ts`), construído com `OpenAIService`
    (injeção igual ao `PresetMatcher`).
    `suggest(messages, suite, registry = MODULE_REGISTRY): Promise<InterviewModuleOption[]>`:
    - `locked = resolveModuleSelection([], suite.modules ?? [])`: o que a suíte já instala.
    - `options` = módulos da categoria fora de `locked`. Se `options` estiver vazio, **não chama a IA**.
    - Com `options`, chama `classifyIntoEnumSet(conversa, prompt com moduleKnowledge, options)`. Cada pick passa por
      `resolveModuleSelection([pick], locked)`. Pick cuja dependência não-fixa falta **é descartado com log**, sem 400
      (é sugestão, não pedido).
    - Erro da API ou resposta vazia → nenhum sugerido além de `locked`. O turno **nunca** falha por causa da sugestão.
    - Saída: um `InterviewModuleOption` por módulo da categoria, na ordem do registro (§3.2).
    *Teste (stub do OpenAIService):* salão + conversa B2B → pick `CRM-2A` vira `suggested: true`, e CRM-0/CRM-1 vêm
    `locked: true`. `crmModule` (os 5 travados) → zero chamada à IA. Erro da API → só os travados sugeridos.
11. **Sim/não latente (F-W5-4).** Quando a suíte **não** traz a base fixa da categoria (CRM-0 fora de `locked`), o
    CRM-0 entra em `options` como `locked: false`. Desmarcá-lo no FE desmarca os dependentes (item 15). Nesse caso o
    prompt da mensagem do turno (`InterviewService.ts:77-89`) ganha a frase que pergunta se o negócio quer CRM.
    *Teste:* uma suíte de fixture sem `modules`, injetada pelo parâmetro `registry`/`suite`, dá CRM-0 com
    `locked: false` e põe a frase da pergunta no prompt. Nenhuma suíte real cai nesse caso hoje, e um teste afirma
    isso (as 3 suítes reais têm CRM-0 travado) para o latente não virar morto em silêncio.
12. **Turno `MATCHING_PRESET`.** `InterviewService.processTurn` chama `ModuleSuggester.suggest` depois do match e
    devolve `moduleOptions` em `IInterviewTurnResult` (campo **aditivo e opcional**: os outros turnos não mudam). A
    mensagem gerada cita os nomes (pt) dos módulos sugeridos não-travados. Sem preset casado, nada muda.
    *Teste:* turno com match devolve `presetKey` + `choicePrompt` + `moduleOptions`; turno sem match não devolve
    `moduleOptions`.
13. **Gates do PR-2:** tsc (`--noEmit` e `-p tsconfig.test.json`), jest unit (itens 8–12 + suites existentes da
    entrevista), `check:arch`. **Não aciona:** snapshot de DTO, já que o turno da entrevista é interface e não Zod (ver
    §6 item 2 sobre W4), nem path-count do openapi (nenhuma rota nova). **Aciona a doc openapi:** a resposta 200 de
    `POST /api/dashboard/ai/ChatInterview` está documentada em `docs.paths.ts:870-920` (já com `choicePrompt`), então
    `moduleOptions` entra ali (array de `{ key, name{pt,en}, dependsOn[], locked, suggested }`, "only on
    MATCHING_PRESET with a matched preset"), e o `public/openapi.json` é regenerado.

### PR-3: FE-INCR-W5-MODULES (FE)

14. **Estado no hook.** `useAiInterview` guarda `moduleOptions` do turno e a seleção (`selectedModules`, começando por
    `suggested`). Zera os dois quando chega um novo `presetKey`. O tipo `InterviewModuleOption` é espelhado no FE junto
    dos outros tipos do turno (o turno não tem `.gen.ts`, ver item 13).
    *Teste vitest:* turno com `moduleOptions` popula a seleção; novo match zera.
15. **Checklist de módulos.** Componente ao lado do `CreationChoice` (`AiInterviewSetup/index.tsx:163`): um checkbox
    por opção. Travados aparecem marcados e desabilitados. Desmarcar um módulo desmarca quem depende dele; marcar um
    módulo marca as dependências dele (`dependsOn` vem na opção). Nome por `name[locale]`, textos de UI por
    `useTranslation` com chaves pt/en, `neutral-*`, `rounded-2xl`.
    *Teste vitest:* desmarcar CRM-0 (fixture com `locked: false`) desmarca CRM-1..3; travado não desmarca.
16. **Create manda `modules`.** `handleCreateSystem` (`useAiInterview.ts:110`) passa a montar
    `{ suiteKey, unit, fiscal, modules: selectedModules }` tipado por `CreateDashboardPayload`, que já aceita `modules`
    (`CreateDashboard.dto.ts:27`).
    *Teste vitest:* corpo do POST contém `modules` com a seleção.
17. **Gates do PR-3:** `cd my-app && npx tsc --noEmit` + `npm run test:types`, vitest das suites da entrevista,
    paridade i18n (`skill-audit wiring`), `check:arch`, `npm run build`. **Sign-off de browser** da entrevista atrás de
    `withAuth`, contra o build de produção, é do dono (gate humano, sem sessão de agente).

## 3. Contratos (materializáveis)

### 3.1 PR-1

```ts
// server/src/features/dynamicTables/presets/index.ts
export type PresetAiProfile = { name: string; description: string };
export type SelectablePresetSuite = PresetSuite & { key: string; aiProfile: PresetAiProfile };
export const tablePresetSuites = {
  services: { beautySalon: BeautySalonPreset, aestheticClinic: AestheticClinicPreset },
  sales: { crmModule: CrmModulePreset },
} satisfies Record<string, Record<string, SelectablePresetSuite>>;

// server/src/features/dynamicTables/presets/ai/PresetKnowledgeBase.ts
export interface IPresetKnowledge { key: string; name: string; aiDescription: string } // inalterado
export function deriveKnowledgeBase(
  suites: Record<string, Record<string, SelectablePresetSuite>>,
): IPresetKnowledge[];                       // lança se suite.key !== chave do mapa
export const presetKnowledgeBase: IPresetKnowledge[] = deriveKnowledgeBase(tablePresetSuites);

// dashboardController.handleCustomCreation
const originalPreset = presetService.getPresetByKey(presetKey);
if (!originalPreset) throw new UnknownSuiteError(presetKey);   // 404 { error }, igual ao quick
```

### 3.2 PR-2

```ts
// server/src/features/dynamicTables/presets/ai/ModuleKnowledgeBase.ts
export interface IModuleKnowledge {
  key: ModuleKey; name: { pt: string; en: string }; aiDescription: string;
  fixed: boolean; dependsOn: ModuleKey[]; group?: ModuleGroupKey;
}
export function moduleKnowledge(registry?: Readonly<Record<ModuleKey, ModuleDef>>): IModuleKnowledge[];

// server/src/lib/openai/OpenAIService.ts (irmãos do classifyIntoEnum)
export function buildEnumSetResponseFormat(options: readonly string[]): {
  type: 'json_schema'; json_schema: { name: 'selecao'; strict: true; schema: {
    type: 'object'; properties: { keys: { type: 'array'; items: { type: 'string'; enum: string[] } } };
    required: ['keys']; additionalProperties: false } } };
export function parseEnumSetChoice(content: string | null | undefined, options: readonly string[]): string[];
// método: classifyIntoEnumSet(input: string, systemPrompt: string, options: readonly string[]): Promise<string[]>

// server/src/features/interview/models/InterviewTypes.ts
export interface InterviewModuleOption {
  key: ModuleKey;
  name: { pt: string; en: string };
  dependsOn: ModuleKey[];
  locked: boolean;     // a suíte já instala (padrão ∪ dependências fixas): o FE não deixa desmarcar
  suggested: boolean;  // locked ∪ escolha da IA, fechada pelas dependências
}
export interface IInterviewTurnResult {
  // … campos atuais inalterados …
  /** W5/I8-c12: só no turno MATCHING_PRESET com preset casado. */
  moduleOptions?: InterviewModuleOption[];
}
```

### 3.3 Rascunho do perfil do `crmModule` (texto de produto; o dono pode reescrever na revisão do PR-1)

```ts
aiProfile: {
  name: 'CRM (funil de vendas)',
  description:
    'Um sistema de CRM para negócios que vendem por funil — empresas de serviços B2B, consultorias, agências ou ' +
    'representantes comerciais — sem agenda de atendimentos nem catálogo de serviços. Otimizado para acompanhar o lead ' +
    'do primeiro contato até o fechamento. Inclui tabelas para: Funis de venda, Etapas do funil, Leads (com histórico ' +
    'de atividades), Propostas, Contas (empresas), Contatos e Oportunidades.',
}
```

### 3.4 PR-3 (FE)

```ts
// my-app/features/interview/hooks/useAiInterview.ts
const [moduleOptions, setModuleOptions] = useState<InterviewModuleOption[]>([]);
const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);
// create (quick): CreateDashboardPayload
{ suiteKey: key, unit: { name }, fiscal, modules: selectedModules }
```

## 4. Forks: todos ratificados nesta sessão (questionário, dono, 15/10)

Cédulas em [[D-2026-10-15-W5-FORKS]].

| Fork | Pergunta | Resposta |
|---|---|---|
| F-W5-1 | Origem do KB | ✅ **(b)** derivar do registro: `aiProfile` obrigatório na suíte, tsc como guarda |
| F-W5-2 | `PresetManager.getPresetByKey` depois da troca no controller | ✅ **rerrotear e deixar `PresetManager.ts` intacto** (zero diff no perímetro do ADR-P2; função morta vira dívida, §7) |
| F-W5-3 | O c12 do I8 entra no W5? | ✅ **incluir** (contra a recomendação do agente, que era deixar o c12 como item próprio do I8) |
| F-W5-4 | Forma do c12 | ✅ **sugerir os módulos opcionais + sim/não latente** (suíte sem CRM-0; provado por fixture) |
| F-W5-5 | Peça de FE | ✅ **PR-3 de FE dentro do W5**: o nó só fecha quando a sugestão instala de fato |

**Correção registrada (F-W5-4):** o texto da opção ratificada dizia "padrão da suíte **∩** sugestão da IA". Foi erro de
símbolo do agente. A semântica descrita na mesma opção ("fechado pelas dependências") e a do `resolveModuleSelection`
é **∪**: o que a suíte já instala, mais o que a IA sugere. Este BRIEF usa ∪ (item 10). Se o dono quis ∩, é cédula nova.

Nenhum fork pendente. D1/D2 decididos pelo agente, anotados para a revisão:
- Pick com dependência não-fixa ausente → descartado com log, sem 400 (item 10).
- O turno da entrevista continua interface TS, não Zod (item 13 e §6 item 2).
- Textos de salão e clínica movidos byte a byte (item 2).

## 5. Pendente de validação externa

Vazia. Nenhuma regra contábil, fiscal ou legal nasce aqui: o W5 mexe só em metadado de preset e no texto da IA. Os módulos
sugeridos não mudam binding contábil (CRM-3 continua acionando o seam AR do mesmo jeito que o I8 já faz).

## 6. Insumos ausentes

1. ~~Doc openapi do create e do turno.~~ Conferida na própria sessão (`docs.paths.ts:758-770` e `:870-920`), já
   incorporada aos itens 7 e 13.
2. **Colisão com o W4 (BRIEF em paralelo hoje).** O W4 deve tirar o `ChatInterviewSchema` do controller para
   `features/interview/dtos/` e persistir a sessão. Se ele também transformar o **resultado** do turno em Zod, o
   `moduleOptions` do PR-2 entra nesse schema, e quem mergear depois rebaseia. Regra: PR-2 depois do PR de DTO do W4
   se ele vier primeiro; senão, o W4 incorpora o campo. Não mexer no `ChatInterviewSchema` aqui.
3. **Ordem com o W2 (`isCore`).** O W2 reformula `isCore` "em termos de módulo". O PR-2 só lê `fixed`/`dependsOn` do
   registro e não toca `TableExtractor`. Sem sobreposição de arquivo esperada; conferir no rebase.

## 7. Achados fora de escopo (não planejados)

1. **Perímetro zero-diff do H3 já foi tocado depois do P2.** O `#693` (`d793a26f`, 15/10) exportou `keyToPascalCase`
   em `PresetManager.ts`, e há commits posteriores ao P2 em `dynamicTables/services/` (#419, #439, I8 `PresetSyncService`).
   O `RUNBOOK-H3-P2-CLINICA.md` passo 1 diz comparar "o commit pré-P2 e o commit atual"; com essa base, a prova sai
   FALHOU por diffs que não são do vertical. O script usa `origin/main...HEAD` por padrão. A base certa do H3 é decisão
   do dono no runbook, não do W5.
2. **`PresetManager.getPresetByKey` fica sem chamador** depois do PR-1 (F-W5-2). É dívida até o H3 fechar; depois,
   apagar.
3. **`PresetMatcher` lê a resposta livre da IA** (`toLowerCase`, regex `key:`). Com o KB derivado, migrar para
   `classifyIntoEnum(…, keys do KB)` fecharia o parse frágil. Não pedido.
4. **A customização da entrevista não chega ao create:** `handleCreateSystem` sempre cria em modo quick, e o estado de
   customização (`removedTables`) não vai no corpo. Território do [[W1]].
