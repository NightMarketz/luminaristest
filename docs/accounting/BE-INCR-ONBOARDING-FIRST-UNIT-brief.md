# BRIEF — BE-INCR-ONBOARDING-FIRST-UNIT (nó I1 + I1b) — a primeira unidade nasce no onboarding

> Produzido em sessão de planejamento, 2026-09-07, sob a autorização do dono **"Pode seguir a ordem
> natural"** (mesma data), cuja ordem enunciada e aceita era: sign-off de browser → fold no master map →
> **BRIEF do I1**. Nó I1 do [plano em grafo](ONBOARDING-WIZARD-plano-grafo-brief.md), com o nó I1b
> (backfill do `unitId` legado) que nasceu da ratificação **F-I1-3 → (b)**. **Nenhum fork novo se
> auto-ratifica**; F-I1-1 e F-I1-2 seguem PENDENTES do plano, e este BRIEF acrescenta F-I1-4 e F-I1b-1.

## 0. Contexto fixo

- **Item:** o sistema gerado pelo onboarding (Rápido, Controle Total ou Entrevista) nasce com **uma linha
  em `units`**, e a resposta do create devolve o `unitId`. Hoje `installPresetAsSystem` cria só schema
  (`DynamicTableService.ts:307-471`, `return { message }`), a tabela `units` fica vazia, o front seta
  `unitId = ''` e toda aba contábil fica inerte; pipeline de CRM e estoque por unidade só nascem no
  `afterCreate` de `units` (`LeadsSeedOnUnitPlugin`, `UnitAutoStockPlugin`). É o primeiro degrau da
  espinha N0 → **I1** → I3 → I4.
- **Autorização:** dono, 2026-09-07 ("Pode seguir a ordem natural"); F-I1-3 → (b) ratificado na mesma
  data. Cobre escrever este BRIEF; **executar** exige sinal próprio (ORCH-006).
- **Insumos existentes (lidos no código nesta sessão):**
  - `dashboardController.ts`: `UnifiedCreationSchema = QuickCreationSchema ∪ CustomCreationSchema`
    (`suiteKey` | `mode:'custom', presetKey, removedTables?, addedFields?`); guarda one-shot 403
    quando o usuário já tem tabelas; `handleQuickCreation` mescla `CoreSystemPreset` + suíte e chama
    `installPresetAsSystem(userId, merged)`; resposta `201 { data: { suiteKey, tables: { core, business } } }`.
  - `DynamicTableService.installPresetAsSystem` roda 3 passes numa única `prisma.$transaction`
    (rollback total em falha); **não aceita `tx` externo**. `createTableData(user, tableId, dto,
    { isSystem?, tx? })` aceita tx e roda os plugins (`RuleContext`) no caminho de escrita.
  - `UnitsModule`: `name` (string, **obrigatório**), `cnpj`, `address`, `managerId` (relação opcional →
    `employees`), `type` (select). Categoria `business` — é o que o `LeadsSeedOnUnitPlugin` casa
    (`categories: ['business'] AND internalNames: ['units']`).
  - `AccountingScope.resolveAccountingScope(user, unitId)` só copia a string; o front escolhe
    `opts[0]?.id ?? ''` da tabela `units` (`useAccountingData.ts:57-62`).
  - `dev.db` do dono (cópia de 2026-09-07): `unitId` contábil = strings soltas `unit-incr6-val`,
    `unit-incr6-val-1782938879534`, `cmr2jyirc006oci1kscm61n6n` (esta última tem forma de cuid, pode
    ser uma linha real), 41 contas, períodos 2026 (junho OPEN), 13 tabelas dinâmicas, **zero** binding.
  - Plano em grafo: I2 (T0 na mesma tx — **serializar com I1**), I8/BRIEF CRM (`modules: ModuleKey[]` no
    mesmo body — **serializar**), I6 (validação do `unitId` depende de I1b), F-I4-1 (a) (ativação no
    mesmo request, depois deste passo).
  - Memórias de classe: `authoritative-gate-inside-tx`, `tx-nao-propagado-ao-repo`,
    `orchestration-service-tx-repo-smell`, `dynamictable-tx-aware-validations`,
    `param-aceito-e-ignorado-e-bug`, `migracao-sqlite-nao-e-transacional`.
- **Nós vizinhos:** `dashboardController.createDashboard/handleQuickCreation/handleCustomCreation`,
  `DynamicTableService.installPresetAsSystem/createTableData`, plugins de `units`, `useAiInterview.
  handleCreateSystem`, `QuickSetup`, `TotalControlSetup`, `SetupService.createDashboard` (FE),
  `activateAccountingBindingCli.ts`/`scripts/activate-salon-binding.mjs` (molde do I1b).

## 1. Checklist numerado de comportamentos

**I1 — onboarding**

1. **DTO** — `UnifiedCreationSchema` ganha, nos dois ramos, `unit?: { name: z.string().min(1).max(120),
   cnpj?: z.string().max(18), type?: z.enum(<opções do UnitsModule>) }` (`.strict()`). Testável: body com
   `unit: { foo: 1 }` → 400.
2. **A linha nasce** — após a instalação, uma linha em `units` com `unit.name` (ou o default do fork
   F-I1-2), pelo caminho de escrita normal (`createTableData`), para que os plugins rodem. Testável:
   `POST /dashboard/create` → `units` tem 1 linha; `leadPipelines` tem "Pipeline Padrão" e
   `leadStages` as etapas (quando CRM-0 está instalado — I8); `stockMovements`/estoque sem linhas
   (não há produto ainda).
3. **Atomicidade** conforme fork F-I1-4. Testável: falha injetada na criação da unidade → nenhuma tabela
   sobrevive (se (a)) ou a compensação as remove (se (b)); o usuário NÃO fica com 403 "setup já
   concluído" e sem unidade.
4. **Resposta** — `201 { data: { suiteKey|presetKey, unitId, tables } }`. Testável: `unitId` é o id da
   linha em `units` e `GET /accounting/accounts?unitId=<ele>` responde 200 (chart lazy nasce).
5. **Frontend envia o nome** — Entrevista: do `SUMMARY:` (ou nome do preset); Rápido e Controle Total:
   campo "Nome da unidade" com default. `useAiInterview.handleCreateSystem` passa a montar `unit`.
   Testável: vitest do hook assere o body.
6. **Front contábil usa o `unitId` devolvido** — sem mudança: `useAccountingData` já lê a primeira linha
   de `units`; o teste é ver a aba renderizar (browser, humano).
7. **Gates mecânicos:** snapshot de shape do DTO de criação; path-count do OpenAPI (rota existente);
   i18n pt/en para o campo novo; docs.paths.ts do body.

**I1b — backfill do legado (CLI)**

8. **Job** `src/jobs/backfillUnitsFromAccountingCli.ts` + wrapper `scripts/backfill-units.mjs`, molde do
   `activate-salon-binding.mjs`: para um `--owner-user-id`, lista os `unitId` distintos em
   `Account`, `AccountingPeriod`, `JournalEntry`, `Payable`, `Receivable`, `AccountingBinding` e, para cada um
   sem linha em `units`, cria a linha (fork F-I1b-1 decide o id). Idempotente: segunda execução = NO-OP.
   `--dry-run` imprime o plano. Testável: self-check em SQLite temporário, como o wrapper de binding.
9. **Nunca no boot, nunca no Dockerfile** — mesma proibição dos outros CLIs (ADR-M2 decisão 4).
10. **Rastreio:** o CLI grava no log estruturado `{ event: 'units_backfilled', created: [...] }`; sem
    tabela nova.

## 2. Contratos esboçados

```ts
// DTO (dashboardController → features/dynamicTables/dtos/CreateDashboard.dto.ts, .strict())
const UnitInput = z.object({
  name: z.string().min(1).max(120),
  cnpj: z.string().max(18).optional(),
  type: z.enum(UNIT_TYPE_OPTIONS).optional(),   // = options do UnitsModule.type
}).strict();
QuickCreationSchema.extend({ unit: UnitInput.optional() })
CustomCreationSchema.extend({ unit: UnitInput.optional() })
// (I8 acrescenta `modules: z.array(moduleKeyEnum).default([])` no MESMO schema — serial)

// resposta
{ success: true, data: { suiteKey?: string; presetKey?: string; unitId: string;
                         tables: { core: string[]; business: string[] } } }

// serviço (F-I1-4 a): DynamicTableService
installSystemWithUnit(user, preset, unit): Promise<{ unitId: string }>
  // = prisma.$transaction(tx => installPresetAsSystem(userId, preset, { tx }) + createTableData(user, unitsTableId, unit, { tx }))

// I1b
node scripts/backfill-units.mjs --owner-user-id <id> [--dry-run] [--db <caminho>]
```

## 3. Forks

- **F-I1-1 · onde a linha nasce** (do plano, PENDENTE): (a) dentro da tx de `installPresetAsSystem`;
  (b) no controller, após a instalação, via `createTableData`. **Recomendação revisada após ler o
  código: (a′) — um método novo `installSystemWithUnit` no PRÓPRIO `DynamicTableService`, que abre a
  tx e chama `installPresetAsSystem(…, { tx })` + `createTableData(…, { tx })`.** Não é o anti-padrão
  do Contrato §2.1 (nada de fora é injetado no motor; o método é do mesmo módulo), e `createTableData`
  já roda os plugins dentro de tx. (b) puro deixa a janela do comportamento 3 aberta. **RATIFICAÇÃO
  PENDENTE.**
- **F-I1-2 · unidade ausente no body** (do plano, PENDENTE): (a) default "Matriz"; (b) 400.
  **Recomendação: (a)** — mantém o modo Rápido atual funcionando sem mudança de tela. **PENDENTE.**
- **F-I1-4 · atomicidade (novo):** (a) tx única (implica F-I1-1 a′: `installPresetAsSystem` passa a
  aceitar `{ tx }` opcional, mantendo o comportamento atual quando ausente — par de testes de
  caracterização antes/depois); (b) dois passos + compensação `deleteAllTablesForUser` no catch.
  **Recomendação: (a)** — (b) reintroduz a classe "meio instalado" que a tx de 3 passes existe para
  evitar. **PENDENTE.**
- **F-I1b-1 · id da linha no backfill (novo):** (a) criar a linha em `units` com **id = o `unitId`
  legado** (exige que o repositório aceite id explícito — ver insumo 1); (b) criar com cuid novo e
  **re-chavear** todas as linhas contábeis (31 tabelas; toca `AuditChainHead`/hash da trilha — proibido
  pela classe `audit-log-no-fk-cascade`). **Recomendação: (a)**; se o repositório não aceitar id, o
  insumo 1 vira decisão do dono antes de I6. **PENDENTE.**
- **F-I1b-2 · `unitId` legado que já é cuid de linha existente** (`cmr2jyirc006oci1kscm61n6n`): (a) o
  CLI verifica se existe linha com esse id e pula; (b) trata como legado. **Recomendação: (a)** — é o
  caso idempotente por construção. **PENDENTE.**

## 4. Pendente de validação externa

- Nenhuma regra contábil nasce aqui: a unidade é chave de escopo, não conta, período ou lançamento.
  **Vazia.**

## 5. Insumos ausentes

1. ~~`DynamicTableRepository.createData` aceita `id` explícito?~~ **Verificado 2026-09-07: NÃO** —
   `createData(tableId, data)` só passa `dynamicTableId` e `data` (`DynamicTableRepository.ts:91-99`); o id
   é o `@default(cuid())` do Prisma. Logo F-I1b-1 (a) se faz com `prisma.dynamicTableData.create({ data:
   { id: <legado>, dynamicTableId, data } })` **direto no CLI**, fora do motor e sem plugin — o que é o
   desejado: backfill não deve semear pipeline em unidade legada. Deixa de ser insumo ausente; vira
   comportamento 8.
2. **`installPresetAsSystem` com `{ tx }`** — exige o par de testes de caracterização (ADR-P1 §"núcleo")
   antes de alterar a assinatura.
3. **Ordem com I2 e I8** — os três tocam o mesmo schema/tx; Fase 0 serial do `_PARALLELIZATION-CONTRACT`.

## 6. Achados fora de escopo

- `handleQuickCreation` valida `preset.analytics`, campo que `PresetSuite` não tem (ramo morto — nó I9).
- `resolveAccountingScope` não valida o `unitId` (nó I6, depende de I1b).
- `useAccountingData` escolhe a primeira unidade sem seletor persistido; multi-unidade real é P3 do
  roadmap.

## 7. Como entra na fila

Linha sugerida no master map, logo abaixo de **ONB**: `I1/I1b · BE-INCR-ONBOARDING-FIRST-UNIT ·
BRIEF pronto, 5 forks PENDENTES · [brief](BE-INCR-ONBOARDING-FIRST-UNIT-brief.md)`.
