> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de
> ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# Dossiê P1 — Intérprete Fixo de Runtime + Wiring

Fatia do PRE-ADR [`ADR-P1-binding-press.md`](../adr/ADR-P1-binding-press.md). Este documento cobre
**só** o intérprete de runtime e seu ponto de encaixe no registro de mappers atual — não o compilador/
validador/engine de geração (que é a outra metade da prensa), não os 6 forks em bloco (só os que tocam
diretamente esta fatia, sempre por opção).

Todo claim de código abaixo foi verificado por leitura direta nesta sessão (`Read`/`Grep`), com
`arquivo:linha`. Nenhum fork (F-P1-1..6) é tratado como decidido — onde a proposta depende de um fork,
a análise é por opção.

---

## (a) Assinatura e responsabilidade do intérprete

### Assinatura proposta

```ts
function interpret(input: {
  archetype: PostingArchetype;   // catálogo em código testado (ver abaixo)
  binding: CompiledBinding;      // dado versionado emitido na geração (F-P1-2)
  event: AccountingEvent;        // mesmo tipo hoje em AccountingSyncPort.ts:23-66
}): PostEntryInput;               // mesmo tipo hoje consumido por PostingService.postEntry
```

`(binding, arquétipo, evento) → PostEntryInput`, exatamente como o enunciado da tarefa. O tipo de saída
já existe e não muda: `PostEntryInput` é o mesmo consumido hoje por `postEntry` (ver
`server/src/features/accounting/sync/mappers/IAccountingEventMapper.ts:12-16`, que já declara
`map(event): PostEntryInput`). O intérprete é, estruturalmente, **um substituto do corpo de `map()`** —
troca "código escrito à mão por evento" por "uma função fixa parametrizada por dado".

### Catálogo de arquétipos (extraído do corpus verificado)

O corpus real de `server/src/features/accounting/sync/mappers/` já materializa 5 arquétipos
distintos (tabela também no ADR-P1 §2, aqui reconferida linha a linha):

| Arquétipo | Mapper hoje | Partidas (papel, não código de conta) |
|---|---|---|
| Reconhecimento de receita | `SalonSaleFinalizedMapper.ts:18-66` | D `receivable-role` = total · C `revenue-role` split por natureza (via `splitRevenueCredit`, `revenueSplit.ts`, importado em `SalonSaleFinalizedMapper.ts:5,51`) |
| Liquidação | `SalonSaleSettledMapper.ts:23-103` | D `<método>-role` (papel resolvido por `paymentMethod`) = total · C `receivable-role` |
| Contra-receita (devolução) | `SalonSaleReturnedMapper.ts:17-61` | D `contra-revenue-role` = total · C `receivable-role` |
| Passivo de performance (pacote) | `SalonPackageSoldMapper.ts:17-57` | D `receivable-role` = total · C `prepaid-liability-role` |
| CMV | `SalonSaleCogsMapper.ts:25-65` | D `cogs-expense-role` = custo · C `inventory-role` |

Cada arquétipo **já balanceia por construção** — sempre 2 pernas espelhadas (algumas com split em N
créditos, mas a soma sempre fecha o débito). O binding só escolhe: qual arquétipo, quais campos do
evento alimentam quais slots de valor, e qual conta concreta resolve cada papel (`role→accountCode`,
padrão INCR-9 — master map `ACCOUNTING-MASTER-MAP.md:82` T3/T4, T4 especificamente sobre dinheiro).

Se o fork **F-P1-1** for ratificado com opção **(b)** (incluir a classe comando-de-subrazão, padrão
`CrmReceivableBridge.ts`), o catálogo ganha um 6º arquétipo de natureza diferente — "criar `Receivable`"
em vez de "postar direto" — que não devolve `PostEntryInput` e não passa pelo mesmo `interpret()`; é
fora do escopo desta assinatura e teria a própria. **Por opção, não decidido**: (a) v1 só cobre os 5
arquétipos postEntry-diretos acima; (b) v1 cobre os 5 + o 6º. A tarefa e o corpus lido sustentam (a) como
o corpo desta seção; (b) exigiria uma segunda assinatura de retorno (`ReceivableCommand`, não
`PostEntryInput`) e está fora do escopo textual da tarefa ("… → PostEntryInput").

### O que conta como branch de negócio PROIBIDO vs guard/lookup PERMITIDO

Este é o invariante 5 do ADR-P1 (`ADR-P1-binding-press.md:75-77`): "o intérprete de runtime não contém
branch de decisão de negócio — toda condicional pertence à engine de geração e vira dado no binding."
Traduzindo em exemplos concretos do próprio corpus lido:

**PROIBIDO (decisão de negócio — vira dado no binding, nunca código no intérprete):**
- Um `if (paymentMethod === 'Pix') debitAccount = '1.1.1'` — hoje isso é uma tabela de dados
  (`SalonSaleSettledMapper.ts:36-42`, `DEBIT_ACCOUNT_BY_METHOD`), não um `if`/`switch` — já está na
  forma certa; a migração preserva essa forma de tabela (ver F-P1-5 abaixo).
- Decidir **quantas pernas** o lançamento tem, ou **pular uma perna**, olhando um campo do evento (ex.:
  "só gera a perna de CMV se `event.hasPhysicalItem`"). Quantidade/forma das pernas é propriedade do
  **arquétipo** (fixo em código, escolhido pelo binding em tempo de geração), nunca uma decisão tomada
  por valor de evento em runtime.
- Qualquer lógica de **quando** reconhecer receita, liquidar, ou decidir a natureza contábil do fato —
  isso é o `sourceType` (eixo do evento) escolhendo qual `(archetype, binding)` par usar, uma operação de
  **dispatch por chave**, não de decisão sobre o *conteúdo* do evento.

**PERMITIDO (guard de tipo/dinheiro, lookup — não é decisão de negócio):**
- Guards de tipo/forma: `typeof amount !== 'number'`, `Number.isFinite`, `Number.isSafeInteger`,
  `Number.isInteger` — todos já presentes nos 5 mappers (ver (c) abaixo) — protegem a fronteira de
  dinheiro, não decidem contabilização.
- Lookup determinístico em tabela de dados (`Map`/`Record`) por chave vinda do binding ou do evento —
  ex. `DEBIT_ACCOUNT_BY_METHOD[method]` (`SalonSaleSettledMapper.ts:77`) — é dado indexado por dado,
  estruturalmente idêntico ao dispatch por `sourceType` que `AccountingSyncService` já faz
  (`AccountingSyncService.ts:51`, `this.mappers.get(event.sourceType)`).
- Aritmética de conversão (`Math.round(amount * 100)`) — transformação determinística, não decisão.

**CASO-FRONTEIRA que a tarefa pede para enumerar, achado na leitura — não decidido aqui:**
`SalonSaleSettledMapper.ts:85-89` tem um `if (method === 'Package Balance' && debitAccount !==
PREPAID_LIABILITY_ACCOUNT) throw …`. Isso **não** decide qual conta usar (isso já aconteceu no lookup da
linha 77) — é uma asserção defensiva de consistência interna ("se o dado da tabela estiver quebrado,
falhe alto em vez de contabilizar errado"), citada no comentário como defesa do invariante D1-Q10. É
estruturalmente um guard, não uma decisão — mas é o tipo de `if` que um scanner puramente sintático (ver
(d)) tem dificuldade de distinguir de um branch de negócio, porque compara um **valor de campo do
evento/binding** (`method`) contra um resultado de lookup. Recomendo tratá-lo como **guard permitido**
(consistência do dado, não decisão sobre o dado) mas registro como o exemplo que qualquer gate
automatizado do item (d) precisa classificar explicitamente — não é auto-óbvio.

---

## (b) Como o intérprete se pluga no registro de mappers atual — sem tocar o padrão T10

### O ponto de extensão real, hoje

O registro de mappers é **um array literal**, não um mecanismo de plugin dinâmico:

```
server/src/lib/factory.ts:402-408
    const accountingSyncService = new AccountingSyncService(postingService, [
      new SalonSaleFinalizedMapper(),
      new SalonSaleCogsMapper(),
      new SalonSaleReturnedMapper(),
      new SalonSaleSettledMapper(),
      new SalonPackageSoldMapper(),
    ]);
```

`AccountingSyncService` recebe o array no construtor e o indexa por `sourceType`:
`AccountingSyncService.ts:36` (`private readonly mappers: Map<string, IAccountingEventMapper>`) e
`AccountingSyncService.ts:45` (`this.mappers = new Map(mappers.map((m) => [m.sourceType, m]))`). Em
`sync()`, o lookup é `AccountingSyncService.ts:51` (`this.mappers.get(event.sourceType)`) seguido de
`AccountingSyncService.ts:58` (`const input = mapper.map(event)`).

O contrato que cada item do array precisa satisfazer é `IAccountingEventMapper`
(`IAccountingEventMapper.ts:12-17`): `{ readonly sourceType: AccountingEvent['sourceType']; map(event):
PostEntryInput }`. Nada nesse contrato exige que a classe seja escrita à mão.

### Proposta concreta

Um adaptador fino, `InterpretedEventMapper`, implementa `IAccountingEventMapper` fechando sobre um
`CompiledBinding` + o catálogo de arquétipos:

```ts
class InterpretedEventMapper implements IAccountingEventMapper {
  public readonly sourceType: AccountingEvent['sourceType'];
  constructor(private readonly binding: CompiledBinding, private readonly archetypes: ArchetypeCatalog) {
    this.sourceType = binding.sourceType;
  }
  map(event: AccountingEvent): PostEntryInput {
    return interpret({ archetype: this.archetypes.get(this.binding.archetypeId), binding: this.binding, event });
  }
}
```

O array em `factory.ts:402-408` passa a ser **construído**, não mais **literal**: para cada binding
compilado do tenant/preset (fonte concreta depende de F-P1-2 — ver (e)), `new
InterpretedEventMapper(binding, archetypeCatalog)` entra na lista no lugar de `new
SalonSaleFinalizedMapper()` etc. Nada muda em:

- `AccountingSyncPort.ts` (tipo `AccountingEvent`, interface `AccountingSyncPort`) — **zero linha
  tocada**;
- `AccountingSyncService.ts` (construtor, `Map`, `sync()`, retry/idempotência) — **zero linha tocada**;
- os 4 bridges (`bridges/*.ts`) que chamam `getFactory().getAccountingSyncService().sync(...)`
  (confirmado no cabeçalho de `SalonSalesAccountingBridge.ts:1-14`, que descreve o padrão T10: "invoked
  POST-COMMIT from the DynamicTable controller… NEVER inside DynamicTableService") — **zero linha
  tocada**, porque a assinatura pública de `sync()` não muda.

Isso é literalmente "trocar a implementação dos mappers (código à mão → intérprete+binding), não o
padrão de integração" — a frase do próprio ADR-P1 (`ADR-P1-binding-press.md:101-102`, §5, linha final).
O único arquivo que muda é `server/src/lib/factory.ts`, e só na construção do array — o T10 (bridge
pós-commit explícita) permanece intacto porque o T10 nunca dependeu de os mappers serem escritos à mão,
só de implementarem `IAccountingEventMapper`.

### Consequência sobre `IAccountingEventMapper.ts`

O comentário de `IAccountingEventMapper.ts:7-10` ("The mapper owns the chart-of-accounts knowledge…
AND the money boundary") deixa de ser literalmente verdade para instâncias interpretadas — quem passa a
"possuir" esse conhecimento é o par `(archetype, binding)`, não a classe. Recomendo **atualizar o
comentário da interface** quando o incremento entrar (não uma mudança de assinatura, só de doc) — não é
código de aplicação tocado por este dossiê, é um apontamento para a sessão de feature futura.

---

## (c) Migração dos guards de dinheiro (F-P1-4a)

**Nota de fork:** F-P1-4 pergunta se a fronteira de dinheiro vive no intérprete (código) — opção (a) —
ou é declarada no binding (dado) — opção (b) (`ADR-P1-binding-press.md:111`). A tarefa nomeia
explicitamente "F-P1-4a", mas a regra de projeto (nenhum fork tratado como decidido) exige que eu
apresente as duas leituras. Faço a migração concreta sob (a) — que é também a recomendação não
vinculante do PRE-ADR — e registro o que muda sob (b).

### O que existe hoje — duas variantes de guard, achadas por leitura linha a linha

**Variante 1 — float reais → centavos (a fronteira "de fato" de que fala a tarefa)**, byte-a-byte
idêntica em 4 mappers:

| Mapper | Linhas do guard | Comentário confirma duplicação? |
|---|---|---|
| `SalonSaleFinalizedMapper.ts:31-47` (a tarefa cita 24-47, que inclui a assinatura `map()`; o corpo do guard começa em 31) | 17 linhas | Original — comentário `:25-30` descreve a fronteira |
| `SalonSaleSettledMapper.ts:51-67` | 17 linhas | `:45-48` diz explicitamente "identical to SalonSaleFinalizedMapper" |
| `SalonSaleReturnedMapper.ts:31-47` | 17 linhas | `:25-28` diz explicitamente "identical to SalonSaleFinalizedMapper" |
| `SalonPackageSoldMapper.ts:27-43` | 15 linhas (versão condensada, mesma lógica) | `:25-26` referencia a mesma fronteira |

Lógica idêntica nas 4: `typeof amount !== 'number' \|\| !Number.isFinite(amount)` → `ValidationError`;
`Math.round(amount * 100)`; `!Number.isSafeInteger(amountCents)` → `ValidationError`; `amountCents <= 0`
→ `ValidationError`. É duplicação literal de técnica (a classe de bug nomeada na memória
`comentario-de-teste-afirma-o-que-nao-assere` é sobre comentário vs teste, mas aqui o padrão relevante é
"clone re-inlinado" — `reuse-criterion-blind-to-reinlined-technique`: um revisor por símbolo não pegaria
isso porque cada cópia é um método privado de uma classe diferente).

**Variante 2 — centavos já prontos, revalidados contra o teto** — 1 mapper, lógica DIFERENTE por
desenho (o valor já chega em `Int`, calculado pelo `InventoryService`, nunca cruza um float):

`SalonSaleCogsMapper.ts:36-51` (16 linhas): `typeof costCents !== 'number' \|\| !Number.isSafeInteger`
→ erro; `costCents <= 0` → erro; **e** `costCents > MAX_CENTS` → erro (o teto de `MAX_CENTS`, importado
de `../../models/money` em `SalonSaleCogsMapper.ts:2`, que as outras 4 variantes não checam
explicitamente — elas dependem de `Number.isSafeInteger` sozinho, que é um teto bem mais alto que
`MAX_CENTS`). Esta é uma **divergência real de comportamento** entre as duas variantes que a migração
precisa preservar (não uniformizar sem decisão): a Variante 1 não impõe `MAX_CENTS`, só
`Number.isSafeInteger`; a Variante 2 impõe os dois.

### Proposta de migração (sob F-P1-4a)

Dois pontos únicos de conversão no intérprete, um por variante, cada um chamado pelo `interpret()` de
acordo com um metadado do **slot do arquétipo** (não do evento) — `slot.moneyKind: 'reais' | 'cents'`,
fixado em código junto com o arquétipo (arquétipos de receita/liquidação/devolução/pacote usam `'reais'`;
o arquétipo de CMV usa `'cents'`). Isso não é uma decisão de negócio em runtime — é uma propriedade fixa
do arquétipo escolhido, igual a "quantas pernas tem":

```ts
// único ponto de conversão reais→centavos (substitui as 4 cópias idênticas)
function centsFromReais(value: unknown, context: string): number { /* Variante 1, verbatim */ }

// único ponto de revalidação de centavos já prontos (substitui a cópia de SalonSaleCogsMapper)
function assertCentsInRange(value: unknown, context: string): number { /* Variante 2, verbatim, com MAX_CENTS */ }
```

As 4 cópias da Variante 1 (68 linhas de guard duplicado no total, `31-47`+`51-67`+`31-47`+`27-43`)
colapsam num só ponto; a Variante 2 (`SalonSaleCogsMapper.ts:36-51`) migra como está, preservando o teto
`MAX_CENTS` que as outras não têm — **não unificar os dois tetos sem decisão do dono**, porque isso
mudaria comportamento observável (um evento que hoje passa pela Variante 1 com `amountCents` entre
`MAX_CENTS` e `Number.MAX_SAFE_INTEGER` — janela estreita mas real — deixaria de passar).

### Sob F-P1-4(b) — o que mudaria

Se o dono ratificar (b) (fronteira declarada no binding, não em código fixo), os dois `centsFromReais`/
`assertCentsInRange` acima deixam de ser escolhidos por `slot.moneyKind` do arquétipo e passam a ser
parametrizados por um campo do **binding** (`binding.slots[x].moneyKind`) — o código de conversão em si
continua sendo função JS (não existe "conversão declarativa" sem código executável para aritmética de
ponto flutuante), mas a **escolha de qual guard aplicar a qual slot** vira dado versionado em vez de
propriedade do arquétipo. O ADR-P1 recomenda (a) com a justificativa "dinheiro é invariante (T4), não
decisão de setor" (`ADR-P1-binding-press.md:111`) — concordo com a leitura técnica: sob (b) um binding
malformado poderia, em teoria, apontar `moneyKind:'cents'` para um slot que na prática recebe reais,
sem que isso seja um erro de compilação — (a) fecha essa classe de erro em código testado, (b) a
empurra para o validador determinístico (F-P1-6).

---

## (d) Como se prova o invariante anti-erosão em CI

O invariante 5 (`ADR-P1-binding-press.md:75-77`) — "zero branch de decisão de negócio" — precisa de um
gate que **não é** o gate binário usual ("passou/falhou"), porque "decisão de negócio" tem uma zona
cinza real (achada em (a): `SalonSaleSettledMapper.ts:85-89`). Proposta em 3 camadas, do mais barato ao
mais caro:

**1. Teto de complexidade ciclomática no `interpret()` — regra ESLint `complexity`, mecânica, barata.**
Como o `interpret()` correto é "lookup do arquétipo por id + preencher slots + montar `PostEntryInput`",
ele tem complexidade ciclomática baixa e **estável** por construção — nenhuma condicional nova deveria
ser necessária para suportar um binding novo (bindings novos são só mais dados). Configurar
`complexity: ['error', N]` (N pequeno, ex. 6-8, calibrado no primeiro PR que portar os 5 mappers) com
escopo restrito ao(s) arquivo(s) do intérprete via `overrides` do eslint — cada `if`/`&&`/`case`
adicional que um autor tente colar vira erro de lint, não uma leitura humana. É o proxy mais barato e
objetivo para "erosão": erosão é, por definição, complexidade crescendo onde deveria ficar plana.

**2. Teste de fronteira de import — grep/AST simples, modelo direto do que já existe no repo.**
O padrão já existe: `nfe-fixture-provenance.test.ts` (citado em `ACCOUNTING-MASTER-MAP.md:185-191`) é
uma "trava deliberada" que falha por um marcador em fixture, não por lógica de negócio — prova que o
projeto já aceita testes cujo único papel é bloquear uma classe de regressão estrutural. Proposta
equivalente aqui: um teste que declara o allowlist de imports do(s) arquivo(s) do intérprete (tipos,
`lib/errors`, o próprio catálogo de arquétipos, nada de `features/interview/*` do lado do motor/IA, nada
de cliente LLM) e falha se `import` novo aparecer fora da lista — prova que a engine (dinâmica, com IA)
nunca entra no arquivo que roda no caminho do dinheiro, o que é uma leitura literal do invariante 5.

**3. Golden test byte-idêntico — já é a prova de saída exigida pelo ADR (§7), não uma proposta nova.**
`ADR-P1-binding-press.md:117-121` já exige: rodar os eventos reais das suítes existentes
(`server/src/features/accounting/sync/mappers/__tests__/Salon*.test.ts`, confirmado por listagem —
5 arquivos, um por mapper, mais `sync/__tests__/AccountingSyncService.test.ts`) contra o intérprete e
comparar `PostEntryInput` campo a campo com o que os mappers à mão produzem hoje. Isso prova fidelidade
comportamental, **não** prova ausência de branch — um intérprete com um `if` a mais que não muda o
resultado dos fixtures atuais passa no golden test e ainda assim erodiu o invariante. Por isso (3)
sozinho não fecha (d); (1)+(2) são os que atacam a erosão em si.

**4. Checklist de review — backstop humano para o caso-fronteira.** Casos como
`SalonSaleSettledMapper.ts:85-89` (guard defensivo vs decisão) não são classificáveis por regex/AST sem
falsos positivos/negativos. Proposta: um item de checklist nomeado no `governance.md` (o mesmo mecanismo
que já mapeia `AC-2.1-Bn` → gate, citado em `_ARCHITECTURE-CONTRACT.md:105`) — "todo `if`/`&&` novo no
intérprete tem comentário citando qual guard de tipo/dinheiro ele é, ou é FAIL" — checável por humano no
review independente (padrão T12), não automatizável com confiança sem gerar ruído.

**Nenhuma dessas 4 camadas está implementada** — são propostas concretas para a sessão de feature que
implementar o incremento, não um gate já existente. Não confundir com o "gate padrão por cima" que o
ADR já lista (`tsc×2`, `jest accounting`, review independente, grep de zero-import-de-`features/
accounting`-a-partir-do-pipeline-de-geração) — aquele último item do ADR (§7) é a direção *oposta* do
item 2 acima (geração não importa accounting) e **também** precisa existir; os dois greps de fronteira
não são o mesmo teste.

---

## (e) Onde o código novo vive

A tarefa fixa a resposta institucional: "paths propostos no pipeline de geração, NUNCA
`features/accounting`" — conforme Contrato §2.1 (`_ARCHITECTURE-CONTRACT.md:107-115`, AC-2.1-B1..B4) e
invariante 6 do ADR-P1 (`ADR-P1-binding-press.md:81-82`: "pipeline de geração (`features/interview/*` /
presets) — nunca em `features/accounting`, nunca no motor DynamicTable"). O pipeline de geração
verificado hoje mora em `server/src/features/interview/` — confirmado por `Glob`:
`server/src/features/interview/InterviewService/PresetMatcher.ts` e
`server/src/features/interview/CustomizationService/CustomizationService.ts` existem de fato.

Proposta de 3 artefatos distintos, cada um com path próprio (não um módulo monolítico):

| Artefato | Natureza | Path proposto |
|---|---|---|
| Catálogo de arquétipos (código testado, 5+ arquétipos) | Fixo, versionado por deploy — não por tenant | `server/src/features/interview/AccountingBinding/archetypes/` |
| Schema do binding + compilador + validador determinístico (F-P1-6) | Roda só na geração, pode ter IA no lado proposta | `server/src/features/interview/AccountingBinding/` (ao lado de `InterviewService/`, `CustomizationService/`, `FieldCustomizationService/`) |
| Intérprete fixo (`interpret()`) | Função pura, chamada em runtime, **sem** IA | ver ressalva abaixo |

### Ressalva não resolvida por este dossiê — achado durante a leitura, não um dos 6 forks nomeados

O intérprete precisa ser **chamado** de dentro de `server/src/lib/factory.ts:402-408` (ponto de extensão
de (b)), que hoje importa das duas árvores (`features/accounting/sync/mappers/*` na wiring atual). Se o
código-fonte do `interpret()` mora fisicamente em `features/interview/AccountingBinding/`, então
`server/src/lib/factory.ts` (que já não é nem `features/accounting` nem `features/interview` — é
`server/src/lib/`) importaria de `features/interview/*` para construir o array de mappers de
`features/accounting`. Isso não fere o invariante 6 ao pé da letra (o código do intérprete não está
*dentro* de `features/accounting`), mas cria uma dependência nova **features/accounting-adjacente →
features/interview** que hoje não existe em nenhuma direção — o padrão P-i18n do roadmap
(`ROADMAP-PLATAFORMA.md:149-150`) estabelece a regra oposta para compliance→núcleo ("a dependência flui
só compliance → núcleo, nunca o contrário"); aqui não há uma regra equivalente nomeada para
interview→accounting.

Duas leituras possíveis, **nenhuma ratificada**:
- **Leitura estrita:** o intérprete mora em `features/interview/AccountingBinding/` e
  `features/accounting`/`server/src/lib` importam dele — aceita a dependência nova como o preço de
  "nunca em features/accounting".
  - **Leitura simétrica:** o intérprete (só ele — não o catálogo, não o compilador/validador) mora num
  módulo **novo**, irmão dos dois (`server/src/features/accountingBinding/interpreter/`, ou
  `server/src/lib/accountingBinding/`), do qual **tanto** `features/interview/AccountingBinding/`
  (tempo de geração, escreve o binding) **quanto** `server/src/lib/factory.ts` (tempo de runtime, consome
  o binding) importam — nenhum dos dois "vive dentro" do outro. Isso satisfaz literalmente "nunca em
  `features/accounting`" (não está lá) sem inverter uma dependência que hoje não existe.

Não decido entre as duas — é uma pergunta de arquitetura nova, não coberta por F-P1-1..6, que registro em
`openQuestions`.

---

## Resumo dos forks tocados nesta fatia (nenhum decidido)

| Fork | Toca esta fatia como | Recomendação do PRE-ADR (não-vinculante) |
|---|---|---|
| F-P1-1 | (a) define a assinatura de retorno única (`PostEntryInput`); (b) exigiria uma segunda assinatura fora de escopo | (a) |
| F-P1-4 | (c) inteira — onde vive a fronteira de dinheiro | (a) — código no intérprete |
| F-P1-5 | (a)/(b) — se o binding carrega `accountCode` literal ou `role` pra resolver em runtime; não muda a classificação branch-vs-lookup, muda só QUEM faz o lookup | (a) — literal, recompila no chart mudando |
| F-P1-6 | (d) item 4 (checklist) é o piso; (b) do fork (simulação dry-run) reforça mas não substitui (1)/(2)/(3) | (b) — estrutural + simulação |
