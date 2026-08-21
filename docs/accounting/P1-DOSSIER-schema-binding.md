> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de
> ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# Dossiê técnico — Schema de Binding (Fase 0 do P1, "A Prensa")

> Origem: `docs/adr/ADR-P1-binding-press.md` (PRE-ADR, Draft) + `docs/ROADMAP-PLATAFORMA.md` Fase P1.
> Este documento **não decide** F-P1-2 nem F-P1-5 — desenha a anatomia do binding e analisa cada opção
> dos dois forks por evidência de código, para o dono ratificar. Todo claim de código abaixo carrega
> `arquivo:linha` verificado por leitura real nesta sessão (2026-08-21).

---

## 0. O que já existe hoje — pipeline de instalação de preset (evidência)

Antes de desenhar o binding é preciso saber exatamente como um preset vira "sistema do tenant" hoje,
porque isso é o piso de custo de qualquer opção do F-P1-2.

1. **Presets são módulos TypeScript, não linhas de banco.** `BeautySalonPreset`
   (`server/src/features/dynamicTables/presets/systems/BeautySalonPreset.ts:30-56`) é um objeto literal
   `{ key, name, description, tables: Record<string, PresetTableDefinition> }`. `PresetTableDefinition`
   (`server/src/features/dynamicTables/presets/index.ts:29-53`) só tem `name`/`category`/`schema`/`meta`/
   `analytics` — **sem `key`, sem `version`, sem `hash`**. O registro global é o objeto em memória
   `tablePresetSuites` (`presets/index.ts:18-25`), lido por `PresetService.getPresetByKey`
   (`server/src/features/dynamicTables/services/PresetService.ts:30-39`) por iteração linear — não há
   query, não há tabela `Preset` no Prisma.
2. **O que É persistido por tenant é o `DynamicTable`** (`server/prisma/schema.prisma:229-247`): `id`,
   `userId`, `name`, `internalName?`, `category`, `schema: Json`, `createdAt/updatedAt`. **Nenhum campo
   de versão, hash ou proveniência de preset.** `internalName` é a única amarração de volta ao preset —
   e é só uma string igual à chave da tabela no módulo (`installPresetAsSystem`, ver abaixo), não uma FK.
3. **Instalação = snapshot JSON no `DynamicTable.schema` em `installPresetAsSystem`**
   (`server/src/features/dynamicTables/services/DynamicTableService.ts:307` em diante). Passo relevante
   para custo de evolução: o comentário de `PresetSyncService.ts:29-33` confirma por escrito — *"Editing
   a preset module does NOT retroactively update tables already installed for a user (the schema is
   persisted as JSON at install time)"*. Ou seja, **hoje já existe divergência estrutural entre o módulo
   de código e o que está gravado por tenant**, e o produto já resolve isso com um serviço de sync
   ADITIVO próprio (`PresetSyncService.syncInstalledTableFromPreset`,
   `PresetSyncService.ts:125-228`) — nunca edita o dado in-place por reflexão, sempre recalcula o delta
   e escreve via `DynamicTableService.updateTableSchemaAsSystem` (`DynamicTableService.ts:237` em
   diante, chamado em `PresetSyncService.ts:215-217`).
4. **Edição de schema pelo usuário final é bloqueada por policy.** `DynamicTableService.updateTable`
   (`DynamicTableService.ts:519-526`) chama `policy.canUpdate` e o comentário no próprio código diz *"This
   part is now unreachable for regular users"* — confirma que **a única via de mutação de schema em
   produção é `updateTableSchemaAsSystem`** (chamada só por serviços do sistema, nunca por rota de
   usuário comum) mais a customização de campo **antes** da instalação, dentro da sessão de entrevista
   (§3(d) abaixo).
5. **Não existe hoje nenhum conceito de "papel de conta" resolvido em runtime.** Os 5 mappers do corpus
   (`server/src/features/accounting/sync/mappers/*.ts`) usam **códigos de plano de contas literais em
   string, hardcoded na classe** — ex.: `SalonSaleFinalizedMapper.ts:22`
   `private static readonly DEBIT_ACCOUNT = '1.1.2';`. O padrão "papel→conta versionado por tenant"
   citado no ADR-P1 como "padrão INCR-9" (`ADR-P1-binding-press.md:71`) refere-se a
   `ReferentialMapping` (Account→código RFB, tabela Prisma própria, `mappingVersion` string livre,
   `@@unique([userId,unitId,accountId,mappingVersion])`) — **não existe hoje o inverso** (papel→Account
   por tenant). O mais próximo é `Payable.expenseAccountId`/`Receivable.revenueAccountId`
   (`schema.prisma:855-856`), mas esses são **FK escolhida pelo usuário no momento do lançamento**, não
   resolvida por um binding compilado.

---

## (a) Anatomia proposta do binding

Isto é síntese de engenharia sobre o corpus lido (mappers + `IAccountingEventMapper` +
`PostEntryInput`/`PostEntryLineSchema` em `server/src/features/accounting/dtos/PostingDto.ts:50-107`) —
**não decide F-P1-2/F-P1-5**, só nomeia os campos que qualquer opção dos dois forks precisa carregar.

```
AccountingBindingV1 {
  // --- Identificação ---
  sectorKey:        string          // ex.: 'beautySalon' — casa com PresetTableDefinition/presetKey hoje solto
  bindingVersion:   number          // monotônico, incrementa a CADA recompilação (invariante 4 do ADR)
  compiledAt:       string (ISO)    // timestamp da compilação, não da ativação
  compiledFromHash: string          // hash do (schema operacional + chart do tenant) na hora da compilação
                                     // — é o que a Prensa reconhece como "stale" no F-P1-5(a)

  // --- Entradas evento → arquétipo (1:N; cada evento do preset mapeia 1 arquétipo) ---
  eventBindings: [{
    eventKey:      string           // ex.: 'salon.sale.finalized' — mesma sourceType de hoje
    archetypeKey:  ArchetypeKey     // enum FECHADO: 'revenue_recognition' | 'settlement' | 'reversal' |
                                     // 'performance_liability' | 'cogs' (+ 'subledger_command' se F-P1-1(b))
    // --- Slot fill: campo operacional (do preset) → slot do arquétipo ---
    fieldSlots: [{
      slotName:     string          // nome do slot que o arquétipo em código expõe (ex.: 'amountCents')
      sourceField:  string          // caminho no evento operacional (ex.: 'event.amount')
      transform?:   'cents_from_reais' | 'identity'   // SEMPRE do catálogo fixo do intérprete — nunca
                                                        // expressão livre (isto seria reabrir §4)
    }]
    // --- Papel → conta (ver F-P1-5 abaixo) ---
    roleSlots: [{
      role:         RoleKey         // enum FECHADO: 'ar_control' | 'revenue_service' | 'revenue_resale' |
                                     // 'cash_by_method' | 'cogs_expense' | 'inventory_asset' | ...
      accountCode?: string          // presente SÓ se F-P1-5(a) — código literal já validado contra o chart
    }]
  }]

  // --- Papel → conta, por tenant (existe como bloco separado só se F-P1-5(b); ver §(c)) ---
  roleToAccount?: Record<RoleKey, string /* accountCode */>
}
```

Esboço Zod `.strict()` (forma — não instala nada, é o contrato de validação do compilador e do
validador determinístico F-P1-6):

```ts
const ArchetypeKeySchema = z.enum([
  'revenue_recognition', 'settlement', 'reversal', 'performance_liability', 'cogs',
  // 'subledger_command', // só se F-P1-1(b)
]);

const FieldSlotSchema = z.object({
  slotName: z.string().min(1),
  sourceField: z.string().min(1),
  transform: z.enum(['cents_from_reais', 'identity']).default('identity'),
}).strict();

const RoleSlotSchema = z.object({
  role: z.string().min(1), // RoleKeySchema real seria enum fechado por arquétipo
  accountCode: z.string().min(1).optional(), // presente iff F-P1-5(a)
}).strict();

const EventBindingSchema = z.object({
  eventKey: z.string().min(1),
  archetypeKey: ArchetypeKeySchema,
  fieldSlots: z.array(FieldSlotSchema).min(1),
  roleSlots: z.array(RoleSlotSchema).min(1),
}).strict();

const AccountingBindingV1Schema = z.object({
  sectorKey: z.string().min(1),
  bindingVersion: z.number().int().positive(),
  compiledAt: z.string().datetime(),
  compiledFromHash: z.string().min(1),
  eventBindings: z.array(EventBindingSchema).min(1),
  roleToAccount: z.record(z.string(), z.string()).optional(), // só F-P1-5(b)
}).strict();
```

Nota de desenho (não-fork, decorre direto do invariante 5 do ADR-P1 — `ADR-P1-binding-press.md:75-77`):
`transform` é um **enum fechado do catálogo do intérprete**, nunca uma string de expressão livre —
qualquer coisa parseável/avaliável em runtime reabre exatamente o `templateJson` rejeitado em §4 do
master map (`ACCOUNTING-MASTER-MAP.md:244-251`).

---

## (b) F-P1-2 — Forma/persistência do binding compilado — análise POR OPÇÃO

Evidência-base (§0.1-0.3): presets são código; o que é persistido por tenant é `DynamicTable.schema`
(JSON snapshot); não existe hoje nenhuma tabela `SystemPreset`/`Preset` no Prisma.

### Opção (a) — dado serializado do preset (JSON versionado junto ao `DynamicTable`/preset instalado)

- **Custo de persistência:** **zero migração nova** se o binding for anexado como mais um campo JSON —
  seja num novo campo em `DynamicTable` (precisa 1 `ALTER TABLE ADD COLUMN` nullable, migração aditiva
  padrão do projeto — ver `dev-db-real-path-is-nested`/lições de ALTER SQLite) seja dentro do próprio
  `schema: Json` existente (**zero ALTER**, mas mistura dado-de-schema-operacional com dado-de-binding
  contábil no mesmo blob — acoplamento de leitura).
- **Custo de query:** **alto para qualquer coisa que não seja "ler o binding de UM tenant/UMA tabela por
  vez".** Hoje não há índice sobre conteúdo de `schema: Json` (SQLite sem JSON1 indexado no schema
  atual) — auditoria "quais tenants usam o arquétipo X" ou "quantos bindings estão desatualizados"
  exigiria full-scan + parse em memória. É exatamente o padrão que `PresetSyncService` já aceita hoje
  para schema operacional (nenhuma query indexada existe sobre `DynamicTable.schema`), então esta opção
  **não piora o que já existe**, só estende o mesmo ponto cego.
- **Custo de versionamento:** o binding já nasce com `bindingVersion` no próprio dado (§(a)) — coexistir
  com múltiplas versões não pede coluna extra, é só manter o histórico serializado (ex.: array de
  bindings, ou sobrescrever com o anterior arquivado num campo `previousBinding?`). Precedente direto:
  `ReferentialMapping.mappingVersion` é string livre e versões **coexistem** por design
  (`ACCOUNTING-MASTER-MAP.md`, entrada INCR-9 D2) — mas isso é uma TABELA Prisma dedicada (ver opção b),
  não um blob JSON dentro de outra entidade.
- **Alinhamento com o resto do produto:** é a opção que a recomendação não-vinculante do ADR-P1 já
  aponta (`ADR-P1-binding-press.md:109`) com a justificativa "de graça vira o formato de um futuro
  marketplace (P5)" — plausível mas **não verificado em código**: não há hoje nenhum consumidor de
  export/import de preset serializado; é uma inferência sobre Fase P5, marcada como tal.

### Opção (b) — tabela Prisma própria (`AccountingBinding`)

- **Custo de migração:** 1 `CREATE TABLE` aditivo — **mesma classe de custo zero-ALTER** que
  `ReferentialMapping`/`DimensionDefinition` usaram (`ACCOUNTING-MASTER-MAP.md`, INCR-9/INCR-DIM: "zero
  ALTER em tabelas existentes"). Não é caro por si — o projeto já tem o precedente de fazer isso bem.
- **Custo de query:** **ganha exatamente o que (a) perde.** `@@unique([userId, unitId, sectorKey,
  bindingVersion])` (espelhando `ReferentialMapping` e o `@@unique([userId, unitId, code])` do model `Account` em `server/prisma/schema.prisma:422`) dá lookup indexado por
  tenant+setor+versão sem parse de JSON; permite audit ("todos os tenants com binding desatualizado")
  com uma query simples. É o padrão que o próprio ADR-P1 reconhece como o critério de troca: "(b) só se
  precisarmos de query/audit sobre bindings" (`ADR-P1-binding-press.md:109`).
- **Custo de versionamento:** trivial — é a própria PK/unique composto, igual ao `ReferentialMapping`
  já mergeado.
- **Custo adicional real:** exige Service+Repository+DTO Zod próprios (Contrato §2/§3 do CLAUDE.md
  raiz) — camada inteira nova, mesmo que fina. É o preço de ser "Prisma first-class" em vez de "dado
  dentro de outra entidade" — decisão que o projeto já tomou para toda a contabilidade (T3,
  `ACCOUNTING-MASTER-MAP.md:81`), então a opção (b) é a que mais se parece com o padrão dominante do
  módulo contábil, mas o binding em si **não é dado contábil imutável** — é artefato de GERAÇÃO
  (pipeline de preset), o que puxa na direção contrária (T3 rege `features/accounting`, não
  `features/dynamicTables/presets`/`features/interview`).

### Opção (c) — artefato em disco

- Nenhuma evidência de precedente no código lido: não há hoje nenhum artefato de sistema por-tenant
  persistido em arquivo (SPED/ECD grava `.txt` mas como **saída de exportação sob demanda**, não como
  estado vivo que o intérprete relê a cada evento — ver `SpedGenerationService`, fora do escopo desta
  leitura mas citado no master map). Persistir estado operacional vivo em arquivo, fora do banco,
  quebra o modelo transacional (SQLite + `runTransaction`, T1/T6) que todo o resto do binding precisa
  respeitar no momento da leitura em runtime (o intérprete lê o binding **dentro** do caminho que
  termina em `postEntry`). **Não teria como participar da mesma unidade transacional de forma nativa**
  — teria que ser lido antes e tratado como imutável durante a tx, o que é possível mas não tem
  nenhum precedente no projeto. Custo de operação (deploy multi-instância, backup, race de escrita
  concorrente em arquivo) não tem análogo no que já existe — o projeto é single-process (T11) então o
  risco de concorrência é baixo, mas ainda assim não há infraestrutura de arquivo-por-tenant hoje.

### Leitura de custo real (evidência, não recomendação)

| Eixo | (a) JSON no preset/DynamicTable | (b) Tabela Prisma | (c) Arquivo |
|---|---|---|---|
| Migração | zero ALTER (dentro de `schema`) ou 1 ALTER nullable (campo novo) | 1 CREATE TABLE (zero ALTER) | nenhuma migração, mas infra nova |
| Query/audit "todos os bindings desatualizados" | full-scan + parse | índice `@@unique`/`where` direto | teria que abrir N arquivos |
| Versionamento múltiplo coexistindo | precisa desenhar (array/campo anterior) | trivial (PK composta), precedente `ReferentialMapping` | trivial (nome de arquivo com versão) |
| Encaixe na camada existente | dentro de `features/dynamicTables`/`interview` (onde o ADR-P1 diz que a engine deve viver — §6/7 do ADR) | força Service/Repo/Policy novos, puxa para `features/accounting`-like mesmo fora de `features/accounting` | nenhum precedente arquitetural no projeto |
| Participação na tx do runtime | leitura simples de campo já carregado com a tabela | leitura extra (join ou query separada) antes da tx de `postEntry` | leitura de I/O fora de tx — risco maior |

---

## (c) F-P1-5 — Resolução papel→conta — análise POR OPÇÃO

Evidência-chave, verificada por leitura direta (não do grafo — CBM-001): `PostingService.resolveLeafAccount`
(`server/src/features/accounting/services/PostingService.ts:147-158`) é chamado por `postEntry`
**dentro da mesma tx** para CADA linha do lançamento, resolvendo por **código** via
`accountRepo.findByCode` — e o comentário em `PostingService.ts:108-110` confirma que `findByCode`
**filtra `deletedAt: null`** (soft-delete, `Account.deletedAt` em `schema.prisma:420`, índice em
`schema.prisma:424`). Se o código não resolve para uma conta ativa e folha (`acceptsEntries===true`,
`PostingService.ts:152-156`), a função lança `ValidationError` **dentro da tx** — que a `runTransaction`
propaga como rollback total (T6: gate autoritativo dentro da tx).

**Isto é o fato central que os dois lados de F-P1-5 têm de encarar:** mesmo a opção (a) — "resolve na
compilação, binding carrega o `accountCode` literal" — **não elimina** a chamada a `resolveLeafAccount`
em runtime, porque o binding entrega o `accountCode` ao intérprete, que monta o `PostEntryInput`
(`accountCode` é campo obrigatório de `PostEntryLineSchema`, `PostingDto.ts:21,50-52`), e
`PostingService.postEntry` **sempre** re-resolve por código, sem exceção — não existe hoje (nem o ADR-P1
propõe) um caminho que pule `resolveLeafAccount`. A pergunta real de F-P1-5 não é "quem valida a conta",
é "**quando** o erro de conta ausente/arquivada aparece para o operador" — na compilação (cedo, com
contexto de "recompile o binding") ou só no primeiro evento pós-arquivamento (tarde, como erro de
runtime genérico de venda).

### Opção (a) — resolução na compilação (binding carrega `accountCode` literal)

- **Cenário "conta bound arquivada depois da compilação":** a conta X foi arquivada (soft-delete,
  `deletedAt` setado) DEPOIS que o binding v_n foi compilado com `accountCode: X`. Nenhum mecanismo
  hoje re-valida bindings compilados quando uma conta é arquivada — arquivar é uma operação sobre
  `Account`, isolada de `features/dynamicTables`/`interview` (fronteira §2.1, T3). **O primeiro sinal do
  problema é o próximo evento operacional que dispara aquele `eventBinding`**: o intérprete monta o
  `PostEntryInput` com `accountCode: X`, chama `postEntry`, que chama `resolveLeafAccount(scope, 'X')`,
  que agora retorna `null` (filtro `deletedAt: null`) → `ValidationError` **dentro da tx** → rollback do
  evento operacional inteiro (a venda, o pagamento, etc. não é gravado do lado contábil — mas o lado
  operacional, ex. `salon.sale.finalized`, já aconteceu fora da tx contábil, T10: bridge pós-commit).
  Ou seja: **o dado operacional existe, o lançamento contábil falha silenciosamente do ponto de vista do
  usuário de negócio** (a bridge é assíncrona/pós-commit — comportamento exato depende de como o
  `AccountingSyncPort` trata falha de bridge, fora do escopo desta leitura, mas o padrão hoje é "log +
  não bloqueia a operação de negócio" pelo desenho de bridge pós-commit, T10).
  **Mitigação que o próprio ADR-P1 já nomeia:** "exige gatilho de recompilação quando conta bound for
  arquivada (validador acusa)" (`ADR-P1-binding-press.md:112`) — mas isso é responsabilidade adicional
  que NINGUÉM dispara automaticamente hoje: arquivar uma `Account` não tem, no código lido, nenhum hook
  que notifique o pipeline de binding. Seria trabalho NOVO (fora do escopo desta Fase 0, mas a Fase 0
  precisa decidir se o "gatilho de recompilação por arquivamento" é P1 ou um ⚫ diferido).
- **Vantagem real:** "falha na compilação, não no lançamento" (a frase da recomendação do ADR,
  `ADR-P1-binding-press.md:112`) É verdadeira **para o caso comum** — conta ausente/arquivada NO
  MOMENTO da compilação é pega pelo validador F-P1-6 antes de qualquer coisa ativar. O gap é só o caso
  "arquivada DEPOIS" descrito acima, que nenhuma das duas opções de F-P1-5 evita sozinha — só muda ONDE
  o erro aparece.

### Opção (b) — resolução em runtime (binding carrega o papel; intérprete resolve papel→conta por
tenant a cada evento)

- **Cenário "conta bound arquivada depois da compilação":** o intérprete faz o lookup papel→conta a
  cada evento (contra uma tabela/mapa vivo `roleToAccount` do tenant, não contra um literal congelado no
  binding). Se a conta foi arquivada e **ninguém trocou o mapeamento do papel**, o lookup ainda devolve
  o código arquivado — o resultado final em `resolveLeafAccount` é **idêntico ao da opção (a)**:
  `ValidationError` dentro da tx no primeiro evento pós-arquivamento. A diferença real de (b) é que
  **corrigir o problema não exige recompilar o binding inteiro** — só atualizar `roleToAccount[role]`
  para uma conta ativa, e o próximo evento já resolve certo (sem passar pelo validador F-P1-6 de novo,
  a menos que se desenhe assim de propósito).
- **Risco que o ADR-P1 e o master map §4 nomeiam como motivo de rejeição do motor de regras antigo:**
  "lookup papel→conta, não branch" (`ADR-P1-binding-press.md:112`) é a linha que separa isso de reabrir
  o Motor de Regras — o ADR-P1 já pré-classifica isso como aceitável (lookup ≠ decisão de negócio), mas
  **é o único ponto de todo o desenho em que o intérprete de runtime lê um dado de configuração de
  tenant que pode mudar entre dois eventos do mesmo binding sem recompilação** — o invariante 5
  ("intérprete não contém branch de decisão de negócio", `ADR-P1-binding-press.md:75-77`) sobrevive
  literalmente (é lookup, não condicional), mas o invariante 4 ("customização de campo bound = RE-
  COMPILAR", `ADR-P1-binding-press.md:73-74`) fica em tensão: se o mapeamento papel→conta pode mudar
  SEM recompilar o binding, então nem toda customização passa pelo validador — isto é uma pergunta que
  o ADR final precisa responder explicitamente, não esta Fase 0.

### Leitura de custo real (evidência, não recomendação)

| Eixo | (a) resolvido na compilação | (b) resolvido em runtime |
|---|---|---|
| Onde o erro de conta arquivada aparece SE arquivada ANTES da compilação | validador F-P1-6, pré-ativação | validador F-P1-6, pré-ativação (idêntico — o lookup também é checável estaticamente) |
| Onde aparece SE arquivada DEPOIS da compilação | `ValidationError` dentro da tx no 1º evento seguinte (idêntico à opção b) | `ValidationError` dentro da tx no 1º evento seguinte (idêntico à opção a) |
| Custo de corrigir "conta arquivada, binding aponta pra ela" | recompilar o binding inteiro (todos os `eventBindings` daquele setor) | trocar 1 entrada em `roleToAccount` — sem recompilar `eventBindings` |
| Tensão com invariante 4 (mudança=recompilar) | nenhuma — todo binding É a recompilação | precisa de regra explícita: `roleToAccount` está DENTRO ou FORA do escopo de "customização de campo bound"? |
| Precedente de código mais próximo | nenhum — INCR-9 é Account→RFB, não papel→Account | nenhum — mais próximo é `Payable.expenseAccountId`, mas esse é escolha do usuário por lançamento, não binding de tenant |

**Nota comum às duas opções, não-fork:** nenhuma delas evita a chamada a `resolveLeafAccount` em
runtime — o F-P1-4 (fronteira de dinheiro no intérprete, não no binding) já assume isso implicitamente
ao manter o intérprete como código que monta `PostEntryInput` e entrega a `postEntry` imutável
(`ADR-P1-binding-press.md:83-84,111`). Isso significa que **o "validador determinístico com simulação"
do F-P1-6(b)** — "compila 1 lançamento sintético e roda contra `postEntry` em dry-run"
(`ADR-P1-binding-press.md:113`) — é a única forma real de pegar conta arquivada ANTES do primeiro
evento de produção, para as duas opções de F-P1-5 igualmente. Isto é evidência a favor de F-P1-6(b)
sobre F-P1-6(a), mas F-P1-6 não é escopo desta tarefa.

---

## (d) Gatilhos de recompilação — onde se ancoram no pipeline existente

Evidência de pipeline (§0.3-0.4): **hoje só existem dois pontos de mutação de schema de tabela**:

1. **Customização de campo DENTRO da entrevista, antes da instalação** — `FieldCustomizationService`
   (`server/src/features/interview/FieldCustomizationService/index.ts:62-152`) muta
   `ICustomizableTable` (estado em memória via `StateManager`, `FieldUpdater.update`,
   `FieldUpdater.ts:16-93`) — este estado **nunca tocou** `DynamicTable.schema` ainda; a persistência só
   acontece quando a sessão completa (`CustomizationService.processCustomizationStep`, caso `'done'`,
   `CustomizationService.ts:250-257`, que chama `stateManager.completeCustomization` — o `install` real
   fica em `installPresetAsSystem`, fora do arquivo lido diretamente aqui, mas `createCustomizationSession`
   já busca o preset via `presetService.getPresetByKey`, `CustomizationService.ts:52`). **Se o binding
   precisar existir a partir do preset JÁ customizado nesta fase**, o ponto de ancoragem natural é
   logo após `stateManager.completeCustomization` e antes (ou dentro) de `installPresetAsSystem` — a
   compilação aconteceria **uma vez, na criação do sistema**, contra o schema final já customizado. Isto
   bate com o invariante 4 do ADR-P1 lido como "a PRIMEIRA compilação nasce aqui", não como gatilho de
   RE-compilação.
2. **Evolução aditiva de schema JÁ instalado** — `PresetSyncService.syncInstalledTableFromPreset`
   (`PresetSyncService.ts:125-228`) é o ÚNICO caminho hoje que muta o schema de uma tabela depois que o
   tenant já está em produção, e é **sempre aditivo** (nunca remove/renomeia campo, nunca muda
   tipo/`required` — `PresetSyncService.ts:194-210` prova isso por asserção antes de aplicar). Este é o
   candidato mais forte a gatilho de recompilação "mudança de chart/campo bound" pedido pela tarefa: se
   um `sourceField` que um `eventBinding` consome for alterado ou removido por este sync (hoje não pode
   ser removido — só adicionado), a Prensa teria que **revalidar** (não recompilar do zero, já que é
   aditivo) os `fieldSlots` que referenciam campos afetados. Como o sync de hoje é estritamente aditivo,
   o pior caso real é "campo novo apareceu" (nada quebra) — o caso "campo bound desapareceu" **não tem
   precedente no pipeline atual porque o pipeline atual não permite remoção**. Ancorar aqui significa: a
   Prensa ganha um hook DEPOIS de `updateTableSchemaAsSystem` (chamado em `PresetSyncService.ts:215-217`)
   que, se o `internalName` da tabela tocada aparecer em algum `eventBindings[].fieldSlots[].sourceField`
   do binding daquele tenant, dispara recompilação (ou, no mínimo, incrementa `bindingVersion` e
   revalida).
3. **Edição de schema pelo usuário comum é bloqueada por policy** (`DynamicTableService.ts:519-526`,
   comentário "unreachable for regular users") — portanto **não existe hoje nenhum gatilho de
   "customização de campo bound" pós-go-live iniciada pelo usuário final**; toda mudança de schema
   pós-instalação vem do lado do sistema (sync de preset), nunca de uma tela de edição de tabela do
   tenant. Isto simplifica a Fase 0: o binding só precisa reagir a UM tipo de evento pós-instalação
   (`PresetSyncService` aditivo), não a um endpoint de edição livre.
4. **Mudança de chart de contas** (arquivamento/soft-delete de `Account`) — como já registrado em §(c),
   **nenhum código lido nesta sessão liga essa operação a `features/dynamicTables`/`interview`** (correto
   pela fronteira §2.1/T3 — accounting não deve ser importado do lado da geração). Um gatilho aqui
   exigiria ou (i) o lado `features/accounting` publicar um evento que o pipeline de binding assina —
   mesmo padrão de bridge pós-commit já usado para operação→ledger (T10), aplicado ao inverso
   (ledger→binding), ou (ii) aceitar que este caso só é pego pelo validador determinístico rodado
   proativamente (nunca reativo a arquivamento), o que empurra a detecção para "próxima vez que alguém
   rodar o validador", não para "no momento em que a conta é arquivada". **Nenhuma das duas está
   implementada hoje — é decisão de escopo do ADR final, não fato de código.**

### Síntese dos gatilhos, por proximidade do pipeline existente

| Gatilho | Ponto de ancoragem hoje | Existe mecanismo pronto? |
|---|---|---|
| Primeira compilação (fim da entrevista) | após `stateManager.completeCustomization` (`CustomizationService.ts:252`), antes/dentro de `installPresetAsSystem` | Parcial — o ponto existe, a chamada à Prensa é trabalho novo |
| Campo bound alterado por sync aditivo pós-go-live | após `updateTableSchemaAsSystem` dentro de `PresetSyncService.syncInstalledTableFromPreset` (`PresetSyncService.ts:215-217`) | Parcial — o hook não existe, mas o ÚNICO ponto de mutação pós-install já está isolado num serviço único |
| Campo bound editado por usuário final | inexistente — `updateTable` é bloqueado por policy (`DynamicTableService.ts:519-526`) | Não aplicável hoje — não há como isso acontecer no pipeline atual |
| Conta bound arquivada (mudança de chart) | inexistente — nenhuma ponte accounting→binding no código lido | Não existe — exigiria bridge nova, fora da fronteira atual |

---

## Resumo (3 linhas, para o retorno estruturado)

Presets são código sem versão nem hash; o único dado por-tenant persistido é `DynamicTable.schema`
(JSON snapshot, sem campo de binding); `resolveLeafAccount` (`PostingService.ts:147-158`) resolve
SEMPRE por código dentro da tx do `postEntry`, então nenhuma opção de F-P1-2/F-P1-5 evita a checagem em
runtime — só muda onde e como o erro de "conta arquivada" aparece e quão caro é corrigi-lo. O único
gatilho de recompilação com mecanismo pronto no pipeline hoje é o sync aditivo pós-instalação
(`PresetSyncService`); mudança de chart de contas e edição de campo por usuário final não têm gatilho
algum no código atual.
