> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de
> ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# Dossiê técnico — golden test byte-idêntico (gate de saída do P1)

Leitura prévia: `docs/adr/ADR-P1-binding-press.md`, `docs/ROADMAP-PLATAFORMA.md` Parte B (Fase P1,
linhas 80–100), `docs/accounting/ACCOUNTING-MASTER-MAP.md` §1 (T3/T4/T5/T7/T8/T10) e §4 (Motor de
Regras rejeitado). Todo claim de código abaixo foi lido via `Read`/`Grep` neste worktree — a
citação `arquivo:linha` acompanha cada um. Nenhum fork de `ADR-P1-binding-press.md` §6
(F-P1-1..6) é tratado como decidido aqui: onde o desenho do golden test depende de um deles, as
duas opções são desenvolvidas lado a lado.

---

## (a) Inventário do corpus real

O corpus vive em `server/src/features/accounting/sync/mappers/__tests__/*.test.ts` (5 suítes, uma
por mapper) e `server/src/features/accounting/sync/__tests__/AccountingSyncService.test.ts` (rotas
de erro/retry, não arquétipos novos). Um sexto artefato — `CrmReceivableBridge.ts` — materializa a
**classe 2** do corpus (comando de subrazão, não `postEntry` direto) e tem sua própria suíte em
`server/src/features/accounting/sync/bridges/__tests__/CrmReceivableBridge.test.ts`.

### Tabela — suíte → arquétipo → casos cobertos

| Suíte (arquivo) | Mapper/artefato | Arquétipo (ADR-P1 §2) | Casos cobertos (resumo) |
|---|---|---|---|
| `SalonSaleFinalizedMapper.test.ts` (166 linhas) | `SalonSaleFinalizedMapper.ts` | Reconhecimento de receita | sourceType declarado (:28); `Math.round` reais→centavos + arredondamento no limite 0,5¢ (:31-37); split 1.1.2/3.1 balanceado (:39-48); preserva sourceType/sourceId/unitId + descrição (:50-56); usa `occurredAt` como data (:58-61); rejeita NaN/Infinity/zero/negativo/fora-de-Int32-seguro (:63-81); nunca repassa float (:83-88); **split por natureza** (:90-164): sem breakdown → 3.1 único (:98-103); mix 3.1+3.3 somando ao total (:105-117); rateio proporcional de desconto de header (:119-127); resíduo de arredondamento absorvido na linha de produto (:129-137); só-serviço sem linha 3.3 zerada (:139-146); só-produto sem linha 3.1 zerada (:148-155); idempotência preservada sob split (:157-163) |
| `SalonSaleSettledMapper.test.ts` (99 linhas) | `SalonSaleSettledMapper.ts` | Liquidação | sourceType (:28-30); **matriz D1-QMAP** `it.each` — Cash→1.1.3, Pix→1.1.1, Debit/Credit Card→1.1.4, Package Balance→2.1.1, sempre balanceado contra 1.1.2 crédito (:33-48); Package Balance nunca cai em caixa/banco (:50-56); valor BRUTO sem líquido de taxa de cartão (:58-62); arredondamento reais→centavos (:64-68); rejeita paymentMethod ausente/desconhecido sem default silencioso (:70-76); rejeita amount inválido `it.each` NaN/Infinity/0/-10 (:78-80); rejeita acima do Int32 seguro (:82-84); sourceType distinto de `finalized` — não colide no `@@unique` (:86-91); preserva unitId/data/descrição (:93-98) |
| `SalonSaleReturnedMapper.test.ts` (82 linhas) | `SalonSaleReturnedMapper.ts` | Contra-receita (devolução) — **não** é o "estorno" de T5 | sourceType (:27-29); arredondamento (:31-36); legs balanceadas 3.2(D)/1.1.2(C) (:38-47); não colide com a conta 3.1 do `finalized` (:49-53); preserva sourceType/sourceId/unitId + descrição (:55-61); data = `occurredAt` (:63-66); rejeita amount inválido `it.each` (:68-70); rejeita acima do Int32 seguro (:72-74); nunca repassa float (:76-80) |
| `SalonPackageSoldMapper.test.ts` (66 linhas) | `SalonPackageSoldMapper.ts` | Passivo de performance (pacote pré-pago, origem) | sourceType (:26-28); arredondamento (:30-35); legs 1.1.2(D)/2.1.1(C) balanceadas, **nunca** toca 3.1 (:37-46); preserva sourceType/sourceId/unitId + descrição (:48-54); rejeita amount inválido `it.each` incl. acima do Int32 seguro (:56-58); nunca repassa float (:60-64) |
| `SalonSaleCogsMapper.test.ts` (96 linhas) | `SalonSaleCogsMapper.ts` | CMV (custo da mercadoria vendida) — **único** mapper cuja entrada já chega em centavos inteiros, não reais float | sourceType (:29-31); legs balanceadas 4.2(D)/1.1.6(C) (:33-44); **lê `costCents`, ignora `amount`** mesmo quando os dois discordam (:46-51); preserva sourceType/sourceId/unitId + descrição (:53-59); data (:61-64); rejeita `costCents` float não-inteiro (:66-68); rejeita ausente/NaN/Infinity/zero/negativo (:70-85); rejeita acima de `MAX_CENTS` e aceita exatamente `MAX_CENTS` — teste de fronteira dedicado (:87-94) |
| `AccountingSyncService.test.ts` (193 linhas) | `AccountingSyncService.ts` (orquestrador, não mapper) | N/A — roteamento/retry, não gera arquétipo novo | delega a `postEntry` com sourceType/sourceId corretos (:59-74); duplicidade não cria dedupe própria — idempotência é de `postEntry` (:76-88); corrida P2002 é absorvida (:90-97); `ValidationError` não é retentada (:99-107); `MaxCentsExceededError` não é retentada e preserva `errorCode` (:109-119); erro transitório (P2024) respeita `maxAttempts` sem escrita parcial (:121-129); retry-then-succeed (:131-140); sourceType sem mapper registrado é rejeitado ANTES de chamar `postEntry` (:142-149); liquidação com conta 2.1.1 ausente propaga `ValidationError` sem retry, sem escrita parcial (:151-179); unitId nunca é substituído/cruzado (:181-191) |
| `CrmReceivableBridge.test.ts` (358 linhas) | `CrmReceivableBridge.ts` | **Classe 2 — comando de subrazão** (cria `Receivable`, não posta `PostEntryInput` diretamente; o lançamento nasce depois, no ciclo do AR) | cria o receivable com chave de negócio `CRM-<id>`, data date-only e centavos exatos (:81-101); NÃO passa `counterpartyId` — identidade nasce do `customerName` (:111-119); vira o dia no fuso do escopo, não em UTC (:127-135); guarda legacy (rota direta aposentada) (:137-146); guarda de dedupe (linha viva) (:148-158); tombstone com `cancelledById` é final (:160-176); tombstone sem `cancelledById` é retryable (H1) (:178-196); tombstone estrangeiro que só termina com a chave nunca bloqueia (L3) (:198-216); sweep de corrida M1 nas duas direções (:218-256); convergência tardia (R1), inclusive linha não-OPEN nunca auto-cancelada (:257-287); preflight de período fechado falha ANTES de criar a linha (R2) (:289-299); semeadura idempotente do plano quando 3.1 não existe (M2) (:301-313); 3.1 ainda ausente após semeadura → `ValidationError` (:315-323); dinheiro inválido `it.each` (:325-338); já-booked com dinheiro corrompido classifica como booked (L1) (:340-348); data de calendário inválida (2026-02-30) rejeitada (:350-357) |

O contrato de saída comum a todo mapper de classe 1 é `IAccountingEventMapper.map(event): PostEntryInput`
(`server/src/features/accounting/sync/mappers/IAccountingEventMapper.ts:12-17`), e o shape de
`PostEntryInput` é o `z.infer<typeof PostEntrySchema>` mais o campo interno `auditDescription?`
(`server/src/features/accounting/dtos/PostingDto.ts:78-108,226-237`): `{ unitId, date, description,
sourceType, sourceId, sourceDocument?, lines: [{accountCode, debitCents, creditCents,
dimensions?}], auditDescription? }`. O split de receita por natureza é uma função pura
compartilhada, não re-inlinada por mapper (`revenueSplit.ts:32-56`, `splitRevenueCredit`),
consumida hoje só pelo `SalonSaleFinalizedMapper` (`SalonSaleFinalizedMapper.ts:51`).

O `AccountingEvent` de origem (union discriminada por `sourceType`) tem exatamente 5 variantes
(`AccountingSyncPort.ts:28-33`) — as mesmas 5 suítes de mapper acima cobrem as 5. `'crm.opportunity.won'`
foi retirado da union e sobrevive só como `CRM_LEGACY_SOURCE_TYPE` (`AccountingSyncPort.ts:24-27,79`).

### Lacunas de corpus (o que falta hoje)

1. **`revenueByNature` não é exercitado fora de `SalonSaleFinalizedMapper.test.ts`.** O AccountingEvent
   carrega o campo (`AccountingSyncPort.ts:52-58`), mas nem `AccountingSyncService.test.ts` nem
   nenhuma suíte de bridge fixa um caso com split passando pelo caminho completo
   evento→`AccountingSyncService.sync`→`postEntry`; o corpus do split vive só na chamada direta a
   `mapper.map()`.
2. **Arredondamento de split com 3+ dígitos de proporção não-trivial.** O caso existente
   (`SalonSaleFinalizedMapper.test.ts:129-137`) cobre proporção 1:2 sobre 10001¢; não há caso com
   3+ naturezas hipotéticas (irrelevante hoje — `revenueByNature` só tem 2 eixos —, mas relevante se
   o binding vier a generalizar o split por N papéis, o que o P1 evita por design, F-P1-1(a)).
3. **Estorno verdadeiro (T5) não passa por nenhum mapper — está fora do corpus de `sync/mappers/`.**
   O único "estorno" do corpus é a rota `Cancelled` do `SalonSaleReversalBridge`, que chama
   `PostingService.reverseEntry` diretamente (`SalonSaleReversalBridge.test.ts:76-89`), nunca
   `IAccountingEventMapper.map()`. `SalonSaleReturnedMapper` (o mapper testado) implementa a rota
   `Returned`, que é uma **contra-receita nova**, deliberadamente distinta de um estorno
   (`SalonSaleReturnedMapper.ts:11-16`). Se o binding compilado da prensa vier a cobrir "estorno"
   como arquétipo (o corpus do ADR-P1 §2 não lista essa linha — ver tabela de arquétipos,
   `ADR-P1-binding-press.md:36-43`), **não há hoje nenhum caso de teste do formato certo para
   servir de golden**: `reverseEntry` não produz um `PostEntryInput` novo a partir de um
   `AccountingEvent`, produz a partir do lançamento original já persistido — outro contrato de
   entrada inteiramente. Isto é uma lacuna estrutural, não só de caso de teste.
4. **`CrmReceivableBridge` (classe 2) não produz `PostEntryInput` nenhum** — não há golden
   possível no mesmo formato da classe 1 até o AR consumir o receivable e postar. F-P1-1 decide se
   a v1 do corpus da prensa cobre a classe 2; a recomendação do PRE-ADR é não cobrir em v1
   (`ADR-P1-binding-press.md:108`) — se ratificada, esta lacuna é intencional e sai do escopo do
   golden do P1 v1.
5. **`sourceDocument` (BE-INCR-8) nunca aparece em nenhum evento do corpus de mappers.** Nenhum dos
   5 mappers de salão preenche o campo opcional `sourceDocument` do `PostEntryInput`
   (`PostingDto.ts:97-106`) — os 5 `return` de cada mapper (`SalonSaleFinalizedMapper.ts:53-63`,
   `SalonSaleSettledMapper.ts:91-102`, `SalonSaleReturnedMapper.ts:49-59`,
   `SalonPackageSoldMapper.ts:45-56`, `SalonSaleCogsMapper.ts:53-64`) omitem a chave. Um golden test
   que canonicaliza a ausência dessa chave nunca vai detectar uma divergência caso o binding decida
   emiti-la (mesmo que vazia) — ver (b).
6. **`dimensions` (INCR-DIM) nunca aparece em nenhuma linha do corpus.** Mesma lacuna do item
   anterior, aplicada ao campo opcional por linha (`PostingDto.ts:61-64`).
7. **Nenhum caso testa a MESMA venda emitindo receita + CMV juntos** (o par
   `salon.sale.finalized`/`salon.sale.cogs` da mesma origem, com `sourceId` igual e `sourceType`
   distinto — o mecanismo que evita colisão no `@@unique` é comentado em
   `SalonSaleCogsMapper.ts:20-23`, mas nenhuma suíte constrói os dois eventos para o mesmo `sale-N`
   e compara os dois `PostEntryInput` resultantes lado a lado).

---

## (b) Estratégia de comparação byte-idêntica

### Por que `toEqual`/diff de objeto estrutural não basta

1. **Jest `toEqual` normaliza o que a prensa não pode normalizar.** `toEqual` trata uma chave com
   valor `undefined` como equivalente à chave ausente. O `PostEntryInput` tem 3 campos opcionais
   nesse regime — `sourceDocument` (`PostingDto.ts:97-106`), `sourceId` (`PostingDto.ts:91`, via
   `.optional()`) e `auditDescription` (`PostingDto.ts:226-237`, **fora** do `PostEntrySchema`, só
   no tipo TS). Um binding que emita `sourceDocument: undefined` explicitamente passa em `toEqual`
   contra um mapper que simplesmente omite a chave — mas os dois **não** são byte-idênticos quando
   serializados: `JSON.stringify({a:1, b:undefined})` já falha aqui de outro jeito (`undefined` é
   descartado por `JSON.stringify` também), então o ponto real é o inverso — um binding que emita
   `dimensions: []` numa linha onde o mapper-à-mão simplesmente omite `dimensions` **falha** em
   `toEqual` (correto) mas um revisor apressado usando um "diff de objeto" genérico (ex. lodash
   `isEqual` com `{}` vs `{dimensions:[]}` tratado como "praticamente igual") pode deixar passar —
   a prova de saída do P1 (§7, `ADR-P1-binding-press.md:115-121`) exige que isso reprove.
2. **Ordem de chaves e de linhas não é parte da igualdade estrutural, mas É parte do consumidor
   posterior.** `entry.posted` carrega o `auditDescription`/`description` no hash-chain de auditoria
   (T8, `ACCOUNTING-MASTER-MAP.md:86`); `SourceDocument.rawJson` (BE-INCR-8) é declarado como
   "snapshot JSON da origem" (`PostingDto.ts:44`) — ambos são strings serializadas, não objetos.
   Dois `PostEntryInput` estruturalmente iguais por `toEqual` podem gerar strings JSON diferentes
   (ordem de inserção de chave, ordem das `lines`) se um caminho constrói o objeto por spread e o
   outro por push sequencial — o que muda o HASH gravado na cadeia append-only. "Byte-idêntico" no
   sentido do §7 do ADR só é garantido comparando a **forma serializada canônica**, não o grafo de
   objeto.
3. **A ordem das `lines` importa por si**, e `toEqual` já a distingue (arrays são ordenados) — mas
   um comparador "amigável" (diff visual, `expect.arrayContaining`) apagaria essa diferença de
   propósito. O golden test não pode usar `arrayContaining`/`objectContaining` em lugar nenhum:
   linha na posição errada é regressão, porque relatórios que leem `lines` por posição (Razão,
   drill do BP/DRE) e o próprio `PostingService.postEntry` (autoridade de Σdébito=Σcrédito,
   `ADR-P1-binding-press.md:48-49`) percorrem o array em ordem.
4. **O padrão já existe no repo para "shape" e é conhecidamente cego a lógica fina** — o gate de
   snapshot de DTO (`server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts:14-20,63-80`)
   versiona `JSON.stringify(shape, null, 2)` comitado e falha no diff, mas opera sobre o **schema**
   Zod (`z.toJSONSchema`), não sobre um **valor** produzido em runtime — não pega `refine`/`transform`
   (memória `dto-shape-snapshot-nao-cobre-logica-fina`, já registrada no projeto). O golden do P1
   precisa do mesmo princípio de "snapshot comitado, diff reprova" **aplicado ao valor**, não ao
   schema — são gates complementares, não substitutos um do outro.

### Proposta concreta — serializador canônico

Um módulo novo e pequeno, ex. `server/src/features/accounting/sync/__tests__/golden/canonicalize.ts`
(ainda não existe — proposta), com um contrato explícito, não "o que `JSON.stringify` fizer":

```ts
/** Ordem de chaves FIXA por tipo — nunca Object.keys() (frágil a refactor de construção). */
const ENTRY_KEY_ORDER = [
  'unitId', 'date', 'description', 'sourceType', 'sourceId',
  'sourceDocument', 'auditDescription', 'lines',
] as const;
const LINE_KEY_ORDER = ['accountCode', 'debitCents', 'creditCents', 'dimensions'] as const;
const SOURCE_DOC_KEY_ORDER = [
  'externalRef', 'documentDate', 'description', 'attachmentId', 'rawJson',
] as const;

/**
 * Normaliza + serializa um PostEntryInput na forma canônica do golden test.
 * Regras de normalização (aplicadas às DUAS pontas — mapper-à-mão e intérprete+binding —
 * NUNCA só a uma: lavar a diferença de um lado só reintroduziria o problema do item (1) acima):
 *   - chave ausente e chave `undefined` colapsam para "ausente" (JSON.stringify já faz isso;
 *     tornado explícito aqui para não depender do comportamento IMPLÍCITO da engine V8);
 *   - `dimensions: []` e `dimensions` ausente são tratados como DIFERENTES por design — se algum
 *     lado normalizar um no outro, o teste deve mostrar QUAL lado o fez, não escondê-lo;
 *   - ordem de `lines` preservada tal como o array chega (nunca ordenado por accountCode).
 */
export function canonicalizePostEntryInput(input: PostEntryInput): string {
  const ordered = pickOrdered(input, ENTRY_KEY_ORDER, {
    sourceDocument: (sd) => sd && pickOrdered(sd, SOURCE_DOC_KEY_ORDER),
    lines: (lines) => lines.map((l) => pickOrdered(l, LINE_KEY_ORDER)),
  });
  return JSON.stringify(ordered); // sem espaço/indentação — a forma "byte" é a mais estreita
}
```

`pickOrdered` é um helper de ~10 linhas que projeta um objeto na ordem de chaves dada, omitindo
qualquer chave cujo valor seja `undefined` (não emite `"chave":null` nem a omite condicionalmente —
sempre omite `undefined`, sempre serializa `null` explícito se algum dia aparecer). O ponto central:
**a ordem de chave é uma constante do MÓDULO DE TESTE**, nunca inferida da ordem de construção do
objeto em nenhum dos dois lados — isso é o que torna "byte-idêntico" uma propriedade do
comparador, e não um acidente de como cada implementação constrói o literal.

O teste então faz `expect(canonicalizePostEntryInput(a)).toBe(canonicalizePostEntryInput(b))` —
`.toBe` (igualdade de string), não `.toEqual` — porque o objetivo é a string, não a estrutura.

---

## (c) Esqueleto da suíte golden (pseudocódigo)

O corpus (a) tem hoje 15 casos "de formato certo" (produzem `PostEntryInput` a partir de um mapper
de classe 1): 9 em `SalonSaleFinalizedMapper` (incluindo os 7 de split), 1 arquétipo-base em cada um
dos outros 4 mappers, mais os 5 casos por-`paymentMethod` do `SalonSaleSettledMapper`. Dois regimes,
não um só — porque hoje **não existe** intérprete+binding para comparar contra (P1 ainda não
implementado):

**Fase 0 — hoje, sem dependência do P1 (pode ser escrito já).** Congela o output canônico dos
mappers-à-mão atuais como fixture comitada — o alvo que a prensa terá de bater depois.

```
// server/src/features/accounting/sync/__tests__/golden/handMapperCorpus.golden.test.ts
describe('golden — corpus canônico dos mappers-à-mão (Fase 0, pré-P1)', () => {
  const CASES = [
    { name: 'finalized: sem breakdown', mapper: new SalonSaleFinalizedMapper(),
      event: event({ sourceType: 'salon.sale.finalized', amount: 200 }) },
    { name: 'finalized: split misto 100/100', mapper: new SalonSaleFinalizedMapper(),
      event: event({ amount: 200, revenueByNature: { serviceReais: 100, productReais: 100 } }) },
    { name: 'finalized: rateio de desconto de header', mapper: new SalonSaleFinalizedMapper(),
      event: event({ amount: 180, revenueByNature: { serviceReais: 100, productReais: 100 } }) },
    { name: 'finalized: resíduo de arredondamento 1:2 sobre 10001¢', mapper: new SalonSaleFinalizedMapper(),
      event: event({ amount: 100.01, revenueByNature: { serviceReais: 1, productReais: 2 } }) },
    // ... os 15 casos do inventário (a), um a um, cada um com seu evento EXATO da suíte de origem
    { name: 'settled: Cash', mapper: new SalonSaleSettledMapper(),
      event: settledEvent({ paymentMethod: 'Cash', amount: 200 }) },
    // Cash/Pix/Debit Card/Credit Card/Package Balance — os 5 do it.each D1-QMAP
    { name: 'returned: base', mapper: new SalonSaleReturnedMapper(), event: returnedEvent({ amount: 200 }) },
    { name: 'packageSold: base', mapper: new SalonPackageSoldMapper(), event: packageEvent({ amount: 200 }) },
    { name: 'cogs: base', mapper: new SalonSaleCogsMapper(), event: cogsEvent({ costCents: 20000 }) },
    { name: 'cogs: boundary MAX_CENTS', mapper: new SalonSaleCogsMapper(), event: cogsEvent({ costCents: MAX_CENTS }) },
  ] as const;

  it.each(CASES)('$name — output canônico bate com a fixture comitada', ({ name, mapper, event }) => {
    const output = canonicalizePostEntryInput(mapper.map(event));
    const fixturePath = goldenFixturePath(name); // server/.../golden/fixtures/<slug>.json
    if (process.env.UPDATE_GOLDEN === '1') { writeFileSync(fixturePath, output); return; }
    expect(existsSync(fixturePath)).toBe(true); // nunca gera fixture nova silenciosamente
    expect(output).toBe(readFileSync(fixturePath, 'utf8'));
  });
});
```

Este regime é **puramente de regressão dos mappers-à-mão** — não prova nada sobre a prensa, mas
(i) já entrega valor hoje (pega qualquer edição futura acidental de um mapper existente) e (ii) vira
o material bruto do golden real assim que o intérprete existir, sem re-transcrever o corpus.

**Fase 1 — depois que P1 aterrissar (intérprete + binding do salão existirem).** Pelo fork F-P1-3,
a recomendação do PRE-ADR (`ADR-P1-binding-press.md:110`, opção (b)) é os mappers-à-mão
**permanecerem** em produção até o P2 provar a prensa — o que significa que os dois lados coexistem
no código, e o golden pode comparar **diretamente em runtime**, não contra uma fixture congelada
(mais forte: uma fixture pode ser regenerada sem revisão cuidadosa; uma comparação viva não pode).

```
// mesmo arquivo de teste, ou um segundo golden.pressa.test.ts, condicional à existência do
// intérprete no código (o arquivo só compila depois que P1 landa; até lá fica só a Fase 0):
describe('golden — mapper-à-mão vs intérprete+binding do salão (Fase 1, pós-P1)', () => {
  const salonBinding = loadSalonBinding(); // artefato do preset compilado (F-P1-2)
  const interpreter = new PostingInterpreter(salonBinding); // runtime fixo, sem branch de negócio

  it.each(CASES)('$name — intérprete produz EXATAMENTE o que o mapper-à-mão produz', ({ mapper, event }) => {
    const fromHandMapper = canonicalizePostEntryInput(mapper.map(event));
    const fromInterpreter = canonicalizePostEntryInput(interpreter.interpret(event));
    expect(fromInterpreter).toBe(fromHandMapper); // byte a byte, não toEqual
  });

  // Se F-P1-1(b) for ratificado (classe 2 entra na v1): caso adicional que compara o COMANDO de
  // subrazão emitido (CreateReceivableInput), não um PostEntryInput — contrato de saída diferente,
  // precisa do próprio canonicalizador (fora do escopo desta proposta enquanto F-P1-1 não decide).
});
```

Os mesmos 15 casos (mais os que fecharem as lacunas do item (a)) rodam nos dois regimes — a Fase 0
é o congelamento; a Fase 1 é a prova de saída do §7 propriamente dita.

---

## (d) Teste de fronteira — falhar o CI se a geração importar `features/accounting`

**Já existe um precedente idêntico no repo**, na direção oposta da mesma fronteira (§2.1):
`server/src/features/dynamicTables/__tests__/no-accounting-imports.boundary.test.ts` — varre
recursivamente todo `.ts` sob `features/dynamicTables`, casa contra um regex que pega tanto
`from '...features/accounting...'` quanto os nomes dos serviços centrais
(`PostingService|AccountingSyncService|AccountingSyncPort`), e reprova se qualquer arquivo bater
(`no-accounting-imports.boundary.test.ts:11,13-24,28,30-39`).

A proposta é o **mesmo padrão, espelhado**, sobre o pipeline de geração citado no ADR-P1 §4
invariante 6 (`ADR-P1-binding-press.md:81-82`: "nunca em `features/accounting`") — hoje esse
pipeline vive em `server/src/features/interview/**` (verificado: `InterviewService`,
`CustomizationService`, `FieldCustomizationService`, `models` sob esse diretório).

```ts
// server/src/features/interview/__tests__/no-accounting-imports.boundary.test.ts (proposta)
const ENGINE_ROOT = join(__dirname, '..');
const FORBIDDEN = /(from\s+['"][^'"]*features\/accounting[^'"]*['"])|(PostingService|AccountingSyncService|AccountingSyncPort)/;

describe('Pipeline de geração (interview/presets) — fronteira P1', () => {
  it('contém zero import de accounting em features/interview', () => {
    const offenders = tsFiles(ENGINE_ROOT).filter((file) => {
      if (file.endsWith('no-accounting-imports.boundary.test.ts')) return false;
      return FORBIDDEN.test(readFileSync(file, 'utf8'));
    });
    expect(offenders).toEqual([]);
  });
});
```

**Limites honestos deste teste** (o mesmo limite herdado do precedente, não um limite novo do P1):
é um grep textual sobre `.ts` estático — não pega `require(variável)` dinâmico, concatenação de
string de módulo, nem import via caminho relativo profundo que escape o padrão
`features/accounting` (ex.: `../../accounting` sem o segmento `features/`). O precedente já aceita
esse limite (não há `dependency-cruiser`/`madge` no repo — checado: nenhuma menção em
`server/package.json`); manter o mesmo grau de rigor é consistente, não uma regressão de rigor
introduzida pelo P1. Se a engine da prensa acabar residindo num pacote que os dois barrem
igualmente (ex. `features/interview/binding/`), o mesmo regex cobre por já casar no path.

Este teste roda hoje contra um diretório onde a engine de binding **ainda não existe** — ele
protege a partir do primeiro arquivo do intérprete/compilador de binding que for escrito, não
espera o incremento inteiro. Vale escrevê-lo **antes** do primeiro código de P1 (é código de 15
linhas, zero dependência do resto do dossiê) — falha se algum dia alguém importar `PostingService`
para "só testar rápido" dentro do pipeline de geração.

---

## (e) Critério de pronto — golden verde como condição NECESSÁRIA do merge

O §7 do PRE-ADR já declara a prova de saída em prosa (`ADR-P1-binding-press.md:115-121`); o que
falta é o mecanismo que a torna **obrigatória**, não apenas "verde quando alguém lembra de rodar".

1. **Os dois arquivos de teste propostos — (c) Fase 1 e (d) — vivem sob `server/src/**` como
   qualquer outro `.test.ts` do repo.** O job de CI `Server – typecheck & test` já roda `npm test`
   (`.github/workflows/ci.yml:70`) sobre toda a árvore `server/src` sem nenhuma configuração
   adicional — nenhum passo novo de workflow precisa ser criado; os testes entram no gate
   **automaticamente** no mesmo PR que os adiciona.
2. **Esse job já é check obrigatório de branch protection** — o próprio master map documenta isso
   para o caso análogo do NF-e ("`Server – typecheck & test` é check obrigatório na branch
   protection, o CI segura o merge sozinho", `ACCOUNTING-MASTER-MAP.md:187`). Um golden vermelho
   (Fase 1) ou uma fronteira violada (d) bloqueia o merge do PR de P1 pela **mesma mecânica** que já
   bloqueia hoje o merge do NF-e por fixture sintética — nenhum gate novo precisa ser inventado
   (e a moratória de `CLAUDE.md` sobre não montar aparato de auditoria novo permanece intacta: isto
   é reuso do gate `npm test` que já existe, não um gate adicional).
3. **A Fase 0 (fixtures comitadas dos mappers-à-mão) deve mergear ANTES do código de P1** — ela é
   zero-dependência e vira o material bruto da Fase 1; não é o gate final, é o andaime que o
   antecede. Recomendação (não fork, é sequenciamento técnico): landar Fase 0 + (d) num PR isolado,
   pré-requisito de qualquer PR que implemente o intérprete/binding.
4. **"Necessária" não é "suficiente"**: o golden prova byte-igualdade de *saída*; não prova que a
   engine de geração (o lado que produz o binding a partir da entrevista) está correta — isso é
   escopo do validador determinístico do invariante 3 (`ADR-P1-binding-press.md:63-64`, fork
   F-P1-6). O golden é o gate de **regressão do vertical 1**; o F-P1-6(b) (simulação em dry-run) é
   o gate de **corretude do binding gerado para um vertical novo** — dois gates complementares,
   nenhum substitui o outro, e nenhum dos dois está ratificado.

---

## Forks tocados por este dossiê (nenhum decidido aqui)

- **F-P1-1** (escopo do corpus v1): a lacuna 4 em (a) e a nota em (c) Fase 1 dependem da opção
  escolhida — se (b) entrar na v1, o golden precisa de um segundo canonicalizador para o contrato
  de comando-de-subrazão (`CreateReceivableInput`), fora do que este dossiê especifica.
- **F-P1-2** (forma do binding): a Fase 1 de (c) assume `loadSalonBinding()`/`PostingInterpreter`
  como nomes ilustrativos — a forma real (JSON no preset vs. tabela Prisma vs. artefato em disco)
  muda só a implementação de `loadSalonBinding`, não a estratégia de comparação.
- **F-P1-3** (cutover do salão): a proposta de (c) Fase 1 (comparação viva, não fixture congelada)
  só é possível na opção (b) — mappers-à-mão permanecem no código. Se (a) for ratificado (swap em
  produção), a Fase 1 perde o lado "mapper-à-mão" para comparar e o golden regride para
  fixture-congelada (o mesmo mecanismo da Fase 0, permanentemente, não só como andaime).
- **F-P1-6** (escopo do validador): mencionado em (e) item 4 como gate complementar — este dossiê
  não propõe o desenho do validador, só marca a fronteira entre os dois gates.

---

## Riscos e vieses desta análise (nomeados, T8)

- **Viés de disponibilidade do corpus:** o inventário (a) é fiel ao que existe hoje; não tenta
  adivinhar arquétipos que a prensa v2/P2 vá precisar (ex. estorno como arquétipo formal) — a
  lacuna 3 nomeia isso, mas não a resolve, porque resolvê-la é decisão de escopo do P1, não deste
  dossiê.
- **A proposta de canonicalizador em (b) é código NÃO escrito e NÃO testado** — é um esqueleto de
  projeto, verificado contra o shape real do `PostEntryInput` (citações linha-a-linha), mas nunca
  executado; pode ter um detalhe de serialização errado que só apareceria ao implementar (ex.
  tratamento de `Number` com `-0`, que não foi testado empiricamente aqui).
- **A alegação "o mesmo mecanismo de CI já torna isso obrigatório" (e.1–e.2) é verificada por
  analogia documentada** (o precedente do NF-e no master map), não por uma tentativa real de abrir
  um PR com um golden vermelho e observar o bloqueio — grau: inferido a partir de evidência
  documental forte, não confirmado ao vivo neste dossiê.
