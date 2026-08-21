> **INSUMO DE PLANEJAMENTO (dossiê/parecer técnico)** — não é BRIEF nem ADR; forks pendentes de ratificação humana (ORCH-006). Gerado por agente em 2026-08-21.

# P1 — Dossiê técnico: Catálogo de Arquétipos de Lançamento

Fatia 1 da Fase P1 (`docs/ROADMAP-PLATAFORMA.md` Parte B, `docs/adr/ADR-P1-binding-press.md`). Extrai, arquétipo
por arquétipo, o corpus real de `server/src/features/accounting/sync/mappers/` — a matéria-prima que a prensa
(intérprete + binding) precisa reproduzir byte-idêntico antes de prensar coisa nova. Todo claim sobre código
abaixo foi verificado por leitura direta dos arquivos citados nesta sessão (não por memória).

## 0. Escopo e o que este documento NÃO decide

Este dossiê **documenta** o corpus (5 mappers da classe 1 + 1 bridge da classe 2) e propõe uma forma de
catálogo. Ele **não ratifica nenhum fork** do ADR-P1 (F-P1-1..6) — onde a especificação de um arquétipo
depende de um fork em aberto, a seção correspondente traz a análise **por opção**, nunca uma escolha única.
A classe 2 (`CrmReceivableBridge`) é documentada por exigência da tarefa mas seu ingresso no catálogo v1
depende inteiramente de **F-P1-1**.

Fontes lidas integralmente: `IAccountingEventMapper.ts`, `SalonSaleFinalizedMapper.ts`,
`SalonSaleSettledMapper.ts`, `SalonSaleReturnedMapper.ts`, `SalonPackageSoldMapper.ts`,
`SalonSaleCogsMapper.ts`, `revenueSplit.ts`, `AccountingSyncPort.ts`, `dtos/PostingDto.ts`,
`sync/bridges/CrmReceivableBridge.ts`, `models/money.ts` (só `MAX_CENTS`).

---

## 1. Contrato comum que todo arquétipo herda

`IAccountingEventMapper.ts:12-17` define o contrato que os 5 mappers da classe 1 implementam: um
`sourceType` fixo (chave de registro) e um método `map(event) → PostEntryInput` que **não reimplementa o
invariante de balanceamento** — quem valida Σdébito===Σcrédito é `PostingService.postEntry`
(`IAccountingEventMapper.ts:9-10`). `PostEntryInput` vem de `dtos/PostingDto.ts:50-76` (linha):
cada `PostEntryLine` tem `accountCode`, `debitCents`, `creditCents` (ambos `Int` capados em `MAX_CENTS`,
`PostingDto.ts:59-60`) e a regra "exatamente um lado positivo" (`PostingDto.ts:66-76`); `PostEntrySchema`
exige `lines.min(2)` (`PostingDto.ts:107`).

Todo evento fonte é um `AccountingEvent` (`AccountingSyncPort.ts:23-66`) — discriminado por `sourceType`
(union fechada em `AccountingSyncPort.ts:28-33`), carregando `amount` (float reais, cru — a conversão para
centavos é dever do mapper, `AccountingSyncPort.ts:38-39`) e campos condicionais por evento
(`paymentMethod`, `revenueByNature`, `costCents`).

---

## 2. Catálogo — arquétipos da CLASSE 1 (evento → `PostEntryInput` balanceado)

### 2.1 Reconhecimento de Receita

| Campo | Valor |
|---|---|
| Nome proposto | `reconhecimento-receita` |
| Evento fonte (`sourceType`) | `salon.sale.finalized` |
| Mapper | `SalonSaleFinalizedMapper.ts` |

**Partidas por papel** (código do salão como exemplo — nunca constante do arquétimo):

| Lado | Papel | Exemplo (salão) | Origem |
|---|---|---|---|
| Débito | `controle-recebível` | `1.1.2` (A Receber) | `SalonSaleFinalizedMapper.ts:22` |
| Crédito | `receita-serviço` | `3.1` (`SERVICE_REVENUE_ACCOUNT`) | `revenueSplit.ts:22` |
| Crédito | `receita-revenda` (condicional, omitida se zero) | `3.3` (`RESALE_REVENUE_ACCOUNT`) | `revenueSplit.ts:23` |

**Slots de dado:**

| Slot | Tipo | Origem no evento | Guards (arquivo:linha) |
|---|---|---|---|
| `amount` | `number` (reais) | `event.amount` | `typeof===number && Number.isFinite` (`SalonSaleFinalizedMapper.ts:32-36`); `Math.round(amount*100)` (`:37`); `Number.isSafeInteger(amountCents)` (`:38-42`); `amountCents>0` (`:43-47`) |
| `revenueByNature` | `{ serviceReais, productReais }` (opcional) | `event.revenueByNature` | passado a `splitRevenueCredit` (`SalonSaleFinalizedMapper.ts:51`); dentro dele: fallback para crédito único 3.1 se `base<=0` (`revenueSplit.ts:41-43`); `Math.round(totalCents*(service/base))` (`:45`); resíduo absorvido pela linha de produto garantindo Σ===totalCents (`:46`) |
| `unitId`, `date` (←`occurredAt`), `sourceId`, `sourceType` | passthrough | `event.*` | validados pelo `PostEntrySchema` na fronteira do `postEntry`, não pelo mapper |

**Invariantes que o arquétipo carrega:**
- Split por natureza via `splitRevenueCredit` — técnica **canônica compartilhada** (comentário
  `revenueSplit.ts:6-9` registra que é extraída de propósito para não re-inlinar por mapper).
  `paymentStatus` é ignorado: mesmo uma venda `Paid` posta para A Receber (`SalonSaleFinalizedMapper.ts:16`);
  liquidação é evento separado (§2.2).
- Fronteira de dinheiro: conversão float→cents acontece **uma única vez, aqui** (comentário
  `SalonSaleFinalizedMapper.ts:25-30`).
- Balanceamento por construção: `amountCents` debitado = Σ créditos (`serviceCents+productCents===totalCents`
  por desenho do splitter, `revenueSplit.ts:46`); `postEntry` permanece a autoridade final (não duplicado).

**Casos de erro** (`ValidationError`, um a um):
1. `"Valor inválido para lançamento de receita (venda '<id>'): não é um número finito."` — `SalonSaleFinalizedMapper.ts:33-35`.
2. `"Valor fora da faixa segura de centavos (venda '<id>')."` — `:39-41`.
3. `"Valor deve ser maior que zero para reconhecer receita (venda '<id>')."` — `:44-46`.

---

### 2.2 Liquidação

| Campo | Valor |
|---|---|
| Nome proposto | `liquidacao` |
| Evento fonte | `salon.sale.settled` |
| Mapper | `SalonSaleSettledMapper.ts` |

**Partidas por papel:**

| Lado | Papel | Exemplo (salão) | Origem |
|---|---|---|---|
| Débito | `caixa-por-metodo` (resolvido por lookup do `paymentMethod`) | `Cash→1.1.3`, `Pix→1.1.1`, `Debit/Credit Card→1.1.4`, `Package Balance→2.1.1` | `SalonSaleSettledMapper.ts:36-42` |
| Crédito | `controle-recebível` | `1.1.2` | `SalonSaleSettledMapper.ts:27` |

**Slots de dado:**

| Slot | Tipo | Origem | Guards |
|---|---|---|---|
| `amount` | `number` (reais) | `event.amount` | mesmo padrão de §2.1: finito (`:52-56`), `Math.round`(`:57`), safe-integer (`:58-62`), `>0` (`:63-67`) |
| `paymentMethod` | `string` (enum implícito por lookup) | `event.paymentMethod` | não vazio (`:72-76`); existe no mapa `DEBIT_ACCOUNT_BY_METHOD` — sem default silencioso (`:77-82`); guarda defensiva extra para `Package Balance` (nunca resolve fora do passivo de adiantamento, `:85-89`) |

**Invariantes:**
- Método→conta é **lookup fixo**, nunca fallback implícito para caixa (comentário `:33-35`, `Package
  Balance → 2.1.1 NUNCA cash` — `D1-Q10`).
- Entry **separada** do reconhecimento de receita (mesmo `saleId`, `sourceType` distinto evita colisão em
  `@@unique([userId,unitId,sourceType,sourceId])` — comentário `:11-15`).
- Cartão (débito/crédito) usa o valor **bruto**, não líquido — taxa de adquirente é incremento futuro
  (`:19-20`).

**Casos de erro:**
1. `"Valor inválido para liquidação (venda '<id>')..."` — `:53-55`.
2. `"Valor fora da faixa segura de centavos (liquidação da venda '<id>')."` — `:59-61`.
3. `"Valor deve ser maior que zero para liquidar a venda '<id>'."` — `:64-66`.
4. `"Liquidação sem forma de pagamento (venda '<id>')..."` — `:73-75`.
5. `"Forma de pagamento '<method>' não mapeada para conta de débito (venda '<id>')."` — `:79-81`.
6. Defensivo: `"blocked_missing_prepaid_liability_account: ..."` — `:86-88` (nunca deveria disparar em
   runtime normal; protege contra a constante `PREPAID_LIABILITY_ACCOUNT` ser limpa por engano).

---

### 2.3 Estorno de Origem (contra-receita)

| Campo | Valor |
|---|---|
| Nome proposto | `estorno-origem` |
| Evento fonte | `salon.sale.returned` |
| Mapper | `SalonSaleReturnedMapper.ts` |

**Partidas por papel:**

| Lado | Papel | Exemplo (salão) | Origem |
|---|---|---|---|
| Débito | `contra-receita` | `3.2` (Devoluções de Vendas) | `SalonSaleReturnedMapper.ts:21` |
| Crédito | `controle-recebível` | `1.1.2` | `SalonSaleReturnedMapper.ts:22` |

**Slots de dado:**

| Slot | Tipo | Origem | Guards |
|---|---|---|---|
| `amount` | `number` (reais) | `event.amount` | finito (`:32-35`), `Math.round`(`:37`), safe-integer (`:38-41`), `>0` (`:43-46`) |

**Invariantes:**
- **T5** — não é reversão/edição do lançamento original: o `salon.sale.finalized` original permanece
  `Posted`; a devolução é um lançamento **novo e separado** (comentário `:11-15`, `D2-Q5`). Efeito líquido:
  receita líquida (Σcrédito−débito nas contas de Receita) cai pela devolução; A Receber é zerado
  simetricamente.
- Distinto de cancelamento, que reverteria a entry finalizada por completo (mesmo comentário).

**Casos de erro:**
1. `"Valor inválido para lançamento de devolução (venda '<id>')..."` — `:33-35`.
2. `"Valor fora da faixa segura de centavos (devolução da venda '<id>')."` — `:39-41`.
3. `"Valor deve ser maior que zero para registrar devolução (venda '<id>')."` — `:44-46`.

---

### 2.4 Passivo de Performance (pacote pré-pago)

| Campo | Valor |
|---|---|
| Nome proposto | `passivo-performance` |
| Evento fonte | `salon.package.sold` |
| Mapper | `SalonPackageSoldMapper.ts` |

**Partidas por papel:**

| Lado | Papel | Exemplo (salão) | Origem |
|---|---|---|---|
| Débito | `controle-recebível` | `1.1.2` | `SalonPackageSoldMapper.ts:21` |
| Crédito | `passivo-diferido` | `2.1.1` (Pacotes Pré-pagos) | `SalonPackageSoldMapper.ts:22` |

**Slots de dado:**

| Slot | Tipo | Origem | Guards |
|---|---|---|---|
| `amount` | `number` (reais) | `event.amount` | finito (`:28-31`), `Math.round`(`:33`), safe-integer (`:34-36`), `>0` (`:39-41`) |

**Invariantes:**
- Vender um pacote **não é receita** — cria passivo (deferred revenue); reconhecimento acontece só no
  consumo (uma venda futura paga com `Package Balance`, comentário `:11-13`).
- A liquidação DESTE recebível reusa o fluxo `salon.sale.settled` existente (§2.2) — não há mapper
  próprio de liquidação de pacote (comentário `:13-14`).
- `sourceType` distinto isola do reconhecimento de receita "normal" no `@@unique` (comentário `:14-15`).

**Casos de erro:**
1. `"Valor inválido para origem de pacote (venda '<id>')..."` — `:29-31`.
2. `"Valor fora da faixa segura de centavos (venda '<id>')."` — `:35-37`.
3. `"Valor deve ser maior que zero para registrar origem de pacote (venda '<id>')."` — `:40-42`.

---

### 2.5 CMV (Custo das Mercadorias Vendidas)

| Campo | Valor |
|---|---|
| Nome proposto | `cmv` |
| Evento fonte | `salon.sale.cogs` |
| Mapper | `SalonSaleCogsMapper.ts` |

**Partidas por papel:**

| Lado | Papel | Exemplo (salão) | Origem |
|---|---|---|---|
| Débito | `custo-mercadoria-vendida` | `4.2` (Expense) | `SalonSaleCogsMapper.ts:29` |
| Crédito | `estoque` | `1.1.6` (Asset) | `SalonSaleCogsMapper.ts:30` |

**Slots de dado:**

| Slot | Tipo | Origem | Guards |
|---|---|---|---|
| `costCents` | `number` (**já em centavos inteiros**) | `event.costCents` | `typeof===number && Number.isSafeInteger` (`:37-41`); `costCents>0` (`:42-46`); `costCents<=MAX_CENTS` (`:47-51`, `MAX_CENTS=2_147_483_647` de `models/money.ts:14`) |

**Invariante distintiva (é a única diferença de fronteira de dinheiro do catálogo):** este arquétipo
**não converte float→cents** — o valor chega já em centavos exatos, calculado por
`InventoryService.recordSaleCogs` a partir do subledger de custo médio móvel, em uma transação **diferente**
(comentário `SalonSaleCogsMapper.ts:13-18`). `event.amount` (o float genérico de receita) é **ignorado**
para este `sourceType` (mesmo comentário, linha 18). Isso significa que o slot `costCents` tem uma classe de
guard distinta da classe `moneyReais` dos outros 4 arquétipos — o esboço de tipo em §4 marca isso como um
segundo tipo de slot monetário (`moneyCentsExact`), não uma variação do primeiro.

Idempotência: `sourceType='salon.sale.cogs'` é distinto de `'salon.sale.finalized'` no
`@@unique([userId,unitId,sourceType,sourceId])`, então CMV e receita coexistem para a mesma venda sem
colidir (comentário `:20-23`).

**Casos de erro:**
1. `"Custo inválido para lançamento de CMV (venda '<id>'): não é um inteiro seguro."` — `:38-40`.
2. `"Custo deve ser maior que zero para lançar CMV (venda '<id>')."` — `:43-45`.
3. `"Custo fora da faixa suportada de centavos (venda '<id>')."` — `:48-50`.

---

## 3. CLASSE 2 (documentação, NÃO arquétipo ratificado) — `CrmReceivableBridge`

**Marcado como DECISÃO DE FORK: F-P1-1.** `CrmReceivableBridge.ts` **não implementa**
`IAccountingEventMapper` e **não produz** `PostEntryInput` — é um **comando de subrazão**: cria um
`Receivable` no subledger AR; quem posta (`D 1.1.5 / C 3.1`) é o próprio ciclo de AR
(`ReceivableService`), não este bridge (comentário `CrmReceivableBridge.ts:17-23`). A tabela de evidência
do `ADR-P1-binding-press.md:36-43` já classifica esta linha separadamente ("comando de subrazão" vs.
"postEntry direto"); este dossiê confirma a classificação por leitura do código.

O `ADR-P1-binding-press.md:108` registra a recomendação **não-vinculante** de deixar esta classe fora do
escopo v1 (F-P1-1 opção **(a)**), com a classe 2 entrando como v2. **Este dossiê não decide isso** — segue
a análise por opção:

**Se F-P1-1 = (a)** (só classe postEntry-direto): o catálogo do binding v1 cobre exatamente os 5
arquétipos de §2; `CrmReceivableBridge` fica fora do escopo da prensa nesta fase — o tipo `Archetype` do
esboço (§4) não precisa de union, só de `LancamentoArchetype`.

**Se F-P1-1 = (b)** (inclui a classe 2): o catálogo ganha um 6º arquétipo, de **efeito diferente** (não
`postEntry`, mas `createSubledgerRecord`) — isso muda a shape do tipo `Archetype` para uma união
discriminada (ver `SubledgerCommandArchetype` em §4) e implica que o **intérprete de runtime** precisa
saber emitir dois tipos de efeito, não um. Essa é uma decisão de design que o `ADR-P1-binding-press.md`
ainda não especifica em detalhe (ele só note a existência do fork) — fica registrada como pergunta aberta
neste dossiê (ver `openQuestions` do retorno).

**Slots de dado observados (para uso SE (b) for ratificado):**

| Slot | Tipo | Origem | Guards |
|---|---|---|---|
| `amount` | `number` (reais) | `WonOpportunityFact.amount` | finito (`:242-245`), `Math.round`(`:247`), safe-integer **e** `<=MAX_CENTS` na mesma checagem (`:248-250`), `>0` (`:253-256`) — nota: `toCents` combina `Number.isSafeInteger` e `MAX_CENTS` num único guard, diferente do padrão dos mappers da classe 1 que separam as duas checagens |
| `occurredAt` | `string` (ISO) → `dateOnly` | `WonOpportunityFact.occurredAt` | `scopeDay(scope, occurredAt)` no fuso do escopo (`:275`, comentário `:262-269` documenta o bug de UTC-shift que motivou o fix), `isValidDateOnly` (`:279`) |
| `label`, `accountRef` | `string` | `WonOpportunityFact.label`/`.accountRef` | passthrough para `customerName`/`customerRef` |
| `documentNumber` | derivado | `crmDocumentNumber(opportunityId)` (`:53-55`) | chave de negócio da idempotência do subledger, não do `@@unique` do `JournalEntry` |

**Invariantes desta classe (não presentes na classe 1):**
- Idempotência de **duas guardas**: (1) legado — `sourceType='crm.opportunity.won'` já existente bloqueia
  para sempre (`:96-98`, `CRM_LEGACY_SOURCE_TYPE`); (2) `documentNumber` classificado por linha (viva /
  tombstone-humano / tombstone-máquina-retentável) — `:100-110`, `isAlreadyBooked` (`:210-222`).
- Convergência de corrida (`convergeTwins`, `:160-189`): duas linhas vivas com a mesma chave convergem para
  a de menor `id`; só cancela twin `OPEN` (nunca sob dinheiro já movimentado).
- Preflight de período é **não-autoritativo** (comentário `:117-121`, `:192-194`) — o gate dentro da tx do
  `postEntry`/`ReceivableService` continua a autoridade (**T6** do master map).

**Casos de erro (`ValidationError`/`AccountingPeriodNotOpenError`):**
1. `"Valor inválido para conta a receber (oportunidade '<id>')..."` — `:243-245`.
2. `"Valor fora da faixa segura de centavos (oportunidade '<id>')."` — `:249-251`.
3. `"Valor deve ser maior que zero para criar a conta a receber (oportunidade '<id>')."` — `:254-256`.
4. `"Data de fechamento inválida para a oportunidade '<id>': '<occurredAt>'."` — `:280-282`.
5. `"Conta de receita '3.1' não existe nesta unidade — plano de contas não semeado."` — `:233-235`.
6. `AccountingPeriodNotOpenError(year, month)` — `:200` (preflight, não-autoritativo).

---

## 4. Esboço de contrato TypeScript/Zod do tipo `Archetype`

**Esboço, não código final.** Marca inline onde um fork do ADR-P1 muda a shape.

```ts
// ESBOÇO — pendente de ratificação (F-P1-1..6). NÃO implementar antes do ADR passar a Accepted.

/** Papel de conta — resolvido papel→código na COMPILAÇÃO (F-P1-5a) ou em RUNTIME (F-P1-5b).
 *  O catálogo em código nunca guarda o código do salão como constante do arquétipo — só como
 *  EXEMPLO de binding (ver §2 deste dossiê). */
type AccountRole =
  | 'controle-recebível'
  | 'receita-serviço'
  | 'receita-revenda'
  | 'caixa-por-metodo'      // resolve por sub-chave (paymentMethod) — não é 1 conta fixa
  | 'contra-receita'
  | 'passivo-diferido'
  | 'passivo-adiantamento'
  | 'custo-mercadoria-vendida'
  | 'estoque';

/** Duas classes de slot monetário observadas no corpus (§2.5 é a única do 2º tipo hoje). */
type SlotType =
  | 'moneyReais'            // float reais → cents pelo INTÉRPRETE (guards: isFinite, round, isSafeInteger, >0)
  | 'moneyCentsExact'       // já inteiro — só revalida teto (guards: isSafeInteger, >0, <=MAX_CENTS)
  | 'revenueByNatureReais'  // par {serviceReais, productReais} — alimenta o splitter canônico
  | 'enumLookup'            // ex.: paymentMethod — resolve por tabela fixa, sem default silencioso
  | 'dateISO'
  | 'string';

interface ArchetypeSlotSpec {
  name: string;
  type: SlotType;
  /** Nomeados, não implementados aqui — o intérprete fixo (não o binding) os aplica (F-P1-4a). */
  guards: string[];
}

interface ArchetypeLine {
  role: AccountRole;
  side: 'debit' | 'credit';
  /** Nome do slot (ou do resultado do splitter) que preenche esta linha. */
  amountSlot: string;
  /** true só para linhas que o splitter pode omitir quando o valor cai a zero (ex.: receita-revenda). */
  optional?: boolean;
}

/** Classe 1 do corpus — cobre os 5 arquétipos de §2. Sempre no catálogo v1. */
interface LancamentoArchetype {
  kind: 'postEntry';
  name: string; // 'reconhecimento-receita' | 'liquidacao' | 'estorno-origem' | 'passivo-performance' | 'cmv'
  sourceType: string;
  slots: ArchetypeSlotSpec[];
  lines: ArchetypeLine[];      // balanceia por construção — Σdebit === Σcredit simbolicamente, no arquétipo
  invariants: string[];        // tags livres: 'revenue-split-by-nature' | 'T5-no-edit' | 'already-cents' | ...
}

/** Classe 2 — SÓ existe no catálogo SE F-P1-1 = (b). Efeito de runtime DIFERENTE: não produz
 *  PostEntryInput, produz um comando que o ciclo do subledger consome. */
interface SubledgerCommandArchetype {
  kind: 'createSubledgerRecord'; // presente apenas sob F-P1-1(b)
  name: string;                   // ex.: 'criacao-titulo-receber'
  sourceType: string;
  targetSubledger: 'receivable' | 'payable';
  slots: ArchetypeSlotSpec[];
  idempotencyKey: string;         // ex.: padrão 'documentNumber' observado em CrmReceivableBridge
  invariants: string[];           // ex.: 'legacy-sourcetype-guard', 'twin-race-converge', 'period-preflight-nonauthoritative'
}

/** F-P1-1 decide se esta é uma union de 1 ou 2 membros. */
type Archetype = LancamentoArchetype | SubledgerCommandArchetype;

/** Validação estrutural mínima (piso comum a F-P1-6(a) e F-P1-6(b) — a simulação dry-run de F-P1-6(b)
 *  fica FORA deste shape estático; é um passo de execução, não de tipo). */
import { z } from 'zod';

const ArchetypeSlotSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['moneyReais', 'moneyCentsExact', 'revenueByNatureReais', 'enumLookup', 'dateISO', 'string']),
  guards: z.array(z.string().min(1)).min(1),
});

const ArchetypeLineSchema = z.object({
  role: z.string().min(1), // enum real fica fechado quando o catálogo de papéis for congelado
  side: z.enum(['debit', 'credit']),
  amountSlot: z.string().min(1),
  optional: z.boolean().optional(),
});

const LancamentoArchetypeSchema = z.object({
  kind: z.literal('postEntry'),
  name: z.string().min(1),
  sourceType: z.string().min(1),
  slots: z.array(ArchetypeSlotSchema).min(1),
  lines: z.array(ArchetypeLineSchema).min(2), // espelha PostEntrySchema.lines.min(2)
  invariants: z.array(z.string()),
});

// SubledgerCommandArchetypeSchema — só entra no catálogo se F-P1-1=(b); omitido do esboço estático
// até a ratificação (evita modelar um shape que pode nunca existir).
```

**Pontos que o esboço deliberadamente deixa em aberto** (nenhum decidido aqui):
- `AccountRole` como union fechada exige congelar o catálogo de papéis — hoje é uma lista extraída do
  corpus, não uma decisão do ADR.
- Se `caixa-por-metodo` deve carregar a sub-chave (`paymentMethod`) como parte do papel ou como um slot
  separado que o binding referencia é uma escolha de forma do binding — parte de **F-P1-2**, não deste
  catálogo.
- Resolução papel→conta (`F-P1-5`) muda **onde** o `accountCode` literal vive (no binding compilado vs.
  resolvido em runtime) — não muda o shape do `Archetype` em si, que só carrega o papel simbólico.

---

## Resumo (3 linhas)

Os 5 mappers da classe `postEntry` (`salon.sale.finalized/settled/returned`, `salon.package.sold`,
`salon.sale.cogs`) formam um catálogo consistente de 5 arquétimos com partidas por papel, slots
monetários de duas classes (`moneyReais` guardado em 4 deles, `moneyCentsExact` só em CMV) e 14 casos de
`ValidationError` ao todo — nenhum reimplementa o balanceamento, que é sempre de `PostingService`.
`CrmReceivableBridge` é estruturalmente diferente (comando de subrazão, não `postEntry`) e seu ingresso no
catálogo v1 depende inteiramente do fork **F-P1-1**, ainda não ratificado — este dossiê documenta seus
slots e invariantes mas não o inclui no `Archetype` sem essa decisão. O esboço de tipo em §4 é
propositalmente uma union condicional a esse fork, não uma escolha de design deste agente.
