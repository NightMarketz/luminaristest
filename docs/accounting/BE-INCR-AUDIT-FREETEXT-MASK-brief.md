# BRIEF — `BE-INCR-AUDIT-FREETEXT-MASK` (contábil — mascarar nome de terceiro em campo livre de auditoria)

> **O que este documento é:** o BRIEF de planejamento (checklist + contratos esboçados + forks)
> produzido em `sessao-planejamento` — zero código de aplicação foi escrito nesta sessão.
>
> **Ratificação (2026-09-10):** o dono respondeu **"Pode ratificar"** em resposta direta às
> recomendações abaixo — tratado como ratificação em bloco das 6 recomendações (A=b, B=a, C=a, D=a,
> E=b, F=a), no mesmo padrão já registrado como prática real da casa (ver nota de pendência do
> template desta skill: *"os forks da NF-e e do INCR-DIM foram ratificados DENTRO da sessão,
> fork-a-fork, com o dono respondendo na hora"*). Cada fork abaixo foi atualizado de
> `RATIFICAÇÃO PENDENTE` para `RATIFICADO` com a opção recomendada. **Este BRIEF está pronto para
> `sessao-feature`.**

## Autorização citável (ORCH-006) — nota de transparência

- Pedido direto do dono, nesta mesma conversa, 2026-09-10: *"abre item de produto pra mascarar
  nome no reason livre"* — na sequência imediata do achado registrado em
  `docs/operating-manual/GAP-MAP.md` (Nível O, linha 71): sessão de instrumentação de 2026-09-09
  concluiu que os 12 eventTypes investigados **não** tinham lacuna de produtor (nenhum auto-injeta
  nome de terceiro), e que o risco residual real — operador digitar o nome à mão em campo livre —
  "não é lacuna de produtor, é decisão de produto". O dono leu essa conclusão e pediu a abertura
  deste item na sequência.
- **Declaração honesta (regra 1 da sequência obrigatória desta sessão):** os exemplos que a própria
  skill lista para "onde achar autorização" são `ACCOUNTING-MASTER-MAP.md` §5.1 (fila ratificada) ou
  `docs/adr/`. Esta autorização é diferente — é uma **decisão datada em chat**, não uma linha
  pré-existente nesses documentos. A skill aceita esse formato ("decisão datada" está explicitamente
  no pré-requisito), mas registro a diferença em vez de apresentar isto como se fosse uma linha do
  master map. Não há ADR nem linha de fila prévia para este item especificamente — é frente nova,
  aberta agora, por pedido direto.
- **O que a autorização cobre, exatamente:** "mascarar nome no reason livre" — o pedido não
  especifica escopo (quais eventTypes), fonte do nome, nem mecanismo. Por isso este BRIEF trata as
  três coisas como forks explícitos (A, B, C abaixo) em vez de assumir a leitura mais ampla ou mais
  estreita.

## Insumos lidos (código + ADR, não memória — CBM-001)

| Insumo | Onde | O que confirma |
|---|---|---|
| Allowlist + canonicalização | `server/src/features/accounting/audit/auditCanonical.ts:12-151` | `PAYLOAD_ALLOWLIST` decide só quais CHAVES sobrevivem; `canonicalizeAuditPayload` (linha 130) faz `String(v)` sem qualquer sanitização de conteúdo — o VALOR passa intacto |
| Choke-point único de escrita | `server/src/features/accounting/services/AuditService.ts:54-110` (`append`) | `canonicalizeAuditPayload` é chamado na linha 68, **antes** de `buildAuditCanonicalTuple`/`hashAuditCanonical` (linhas 70-85) — é o ÚNICO ponto por onde todo evento passa antes de entrar na hash-chain. Qualquer mascaramento tem que acontecer aqui ou antes (no produtor); depois é impossível (chain já hasheada) |
| ADR da hash-chain | `docs/adr/ADR-INCR2-audit-trail.md` Q2/Q8 | Hash é sobre o `canonicalTuple`, que inclui `payloadCanonical` — **append-only, tamper-evident**: não dá para editar um evento já persistido sem quebrar `verifyAuditChain`. Confirma: mascaramento é decisão de **momento de escrita**, nunca de correção posterior |
| Precedente de rejeição (NÃO reabrir) | `PayableReceivableAuditAllowlist.integration.test.ts:26-30` | *"PROIBIDO um denylist genérico varrendo toda PAYLOAD_ALLOWLIST por nome de campo de PII — colidiria com `entry.posted`/`entry.drafted`/`entry.draft_updated`, que allowlistam `description` de propósito (o VALOR é sanitizado no call-site via `auditDescription`; a KEY fica)."* — confirma que o padrão já aceito na casa é sanitizar o **valor**, não proibir a chave. Este item generaliza esse padrão já aceito, não abre precedente novo |
| Padrão existente a reusar/generalizar | `server/src/features/accounting/services/PayableService.ts:905-1000` | `recognitionDescription`/`settlementDescription` constroem a description COM o nome; `auditDescription` é a versão sanitizada, só para `entry.posted`. É o único produtor que já resolve este problema — para 1 de 13+ eventTypes com campo livre |
| Fonte estruturada de nomes | `server/prisma/schema.prisma:1112-1132` (`model Counterparty`) | `name` (livre) + `nameNormalized` (fold+trim+colapso de espaço, já uma normalização pronta) + `@@unique([userId, unitId, type, nameNormalized])` — é a ÚNICA fonte de nomes de terceiro estruturada e escopada por unit que o sistema tem hoje |
| Os 12 produtores do achado | `PostingService.ts:664`, `PayableService.ts:582,631`, `ReceivableService.ts:345,394`, `PeriodService.ts:98,130,167`, `EntryApprovalService.ts:111,154,348`, `ReconciliationService.ts:633` | Todos passam `reason`/`description` como `dto.reason`/`dto.description` — string opaca, sem transformação |
| Contratos de entrada hoje | `PayableDto.ts:195-217`, `EntryApprovalDto.ts:39,65,110`, `PostingDto.ts:92,128`, `ReconciliationDto.ts:165` | Todos `z.string()` livre (`.min(1)`, `.max(500)` em um caso) — nenhuma constraint de formato; nada impede o operador de digitar um nome |
| `entry.posted` manual (canal de MAIOR volume provável) | `auditCanonical.ts:19` (comentário) | *"Manual/machine posts with no PII in their description omit auditDescription and this field is the raw description."* — o post manual (lançamento direto pelo usuário, sem passar por Payable/Receivable) hoje aceita `description` 100% livre, SEM boundary nenhum — é o canal mais comum de digitação, e está fora do achado original (que só olhou os 12 do GAP-MAP) |

## Nós vizinhos no grafo

- `AuditService.append` — choke-point único; candidato natural para uma solução centralizada (Fork D).
- `ICounterpartyRepository` / `CounterpartyRepository` — fonte de nomes; hoje não é dependência do
  `AuditService` (precisaria ser injetada, se Fork D = (a)).
- `auditCanonical.ts` `PAYLOAD_ALLOWLIST` — não muda de forma (chaves continuam as mesmas); o item
  é sobre o VALOR, não sobre quais chaves sobrevivem.

---

## Comportamentos candidatos (esqueleto antes do detalhe)

1. Escopo: quais eventTypes/campos entram no mascaramento.
2. Fonte dos "nomes conhecidos" a mascarar.
3. Mecanismo de correspondência (exato normalizado vs. fuzzy).
4. Onde o mascaramento roda (centralizado vs. por-produtor).
5. O que fica no lugar do nome mascarado.
6. Custo de leitura extra (Counterparty) dentro do caminho de escrita transacional.
7. Teste-guarda por comportamento ratificado.

---

## FORK A — Escopo: só os 12 eventTypes do achado, ou generaliza para todo campo livre?

**Por que é fork:** o pedido do dono ("mascarar nome no reason livre") não nomeia eventTypes
específicos — foi feito depois do achado que investigou 12, mas `entry.posted` manual (fora desses
12) é hoje o único canal SEM proteção nenhuma, nem a específica (`auditDescription`) nem a genérica
que este item propõe.

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Só os 12 do achado** | Escopo idêntico ao que motivou o pedido; `entry.posted`/`entry.drafted`/`entry.draft_updated`/`entry.rejected` ficam de fora (ou seja, `entry.drafted`/`draft_updated`/`rejected` também ficam de fora, já que fazem parte dos 12 — na prática isso deixa só os eventos de `payable`/`receivable`/`period`/`reconciliation` cobertos) | Menor diff, mas o canal de maior volume de digitação livre (lançamento manual) continua sem nenhuma proteção — inconsistente com o motivo do pedido |
| **(b) Generaliza: todo `description`/`reason` que sobrevive à canonicalização, em qualquer eventType** (inclui os 12 + `entry.posted`/`entry.drafted`/`entry.draft_updated`/`entry.rejected` manuais) | Cobre o caso mais provável de vazamento real (o operador digita ao lançar manualmente); um único mecanismo, sem exceção por eventType | Escopo maior que o pedido original citava; mas o pedido não excluiu isso, só não mencionou |

**Recomendação:** **(b)**. Justificativa: a própria memória do projeto registra que o dono "quer
completude, não MVP" (`dono-quer-completude-nao-mvp`) — deixar de fora justamente o canal com MAIS
exposição (post manual, hoje 100% sem boundary) para cobrir só os 12 que por acaso foram os
investigados primeiro seria proteção pela metade. Custo de estar errado: se o dono quis só os 12,
este BRIEF superdimensiona — mas o mecanismo de (b) é o MESMO de (a) aplicado a mais chaves, não um
mecanismo diferente; reduzir depois é subtrair itens de uma lista, não redesenhar. **Status:
RATIFICADO (b) — 2026-09-10, "Pode ratificar".**

---

## FORK B — Fonte dos "nomes conhecidos" a mascarar

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Só `Counterparty` (fornecedor/cliente) da mesma `(userId, unitId)`** | Único cadastro estruturado de nome de terceiro que o sistema tem; já normalizado (`nameNormalized`) | Não cobre nome de PESSOA que não seja counterparty (ex.: funcionário citado num `reason` de cancelamento) — mas isso nunca foi pedido |
| **(b) Expande para `User` (nome de outros usuários do tenant)** | Cobriria menção a colega/funcionário no texto livre | Fora do que foi pedido ("fornecedor/cliente/contraparte"); adiciona escopo e uma segunda fonte de dado a consultar, sem motivo citado |

**Recomendação:** **(a)**. É exatamente "nome de fornecedor/cliente/contraparte" do pedido original;
(b) é escopo não pedido. Custo de estar errado: se o dono quiser (b) depois, é extensão aditiva (mais
uma fonte no mesmo mecanismo), não retrabalho. **Status: RATIFICADO (a) — 2026-09-10, "Pode
ratificar".**

---

## FORK C — Mecanismo de correspondência (o de maior risco de falso positivo/negativo)

**Por que é fork:** mascaramento de texto livre por conteúdo é **estruturalmente best-effort** —
nenhuma das duas opções abaixo é uma garantia completa, e o BRIEF não pode deixar essa limitação
implícita (achado de risco, não fork resolvível por escolha).

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Substring exato, normalizado** — aplica a MESMA normalização de `nameNormalized` (fold case + trim + colapso de espaço) ao texto livre e procura o `name` completo de cada `Counterparty` da unit como substring | Barato, determinístico, sem dependência nova; mesma técnica já usada no repo (`nameNormalized`) | Perde variantes: abreviação ("J. Silva" por "João Silva"), erro de digitação, nome parcial, ordem invertida — nenhum desses é pego |
| **(b) Fuzzy/token-based (distância de edição ou matching por token)** | Pegaria mais variantes que (a) | Custo de implementação e de falso positivo MUITO maiores (ex.: sobrenome comum bate com texto não relacionado); nenhuma biblioteca de fuzzy matching está instalada hoje (ladder do ponytail: rung 4 — dependência nova só se instalada já resolvesse; não é o caso) |

### Emenda 2026-09-10 — duas lacunas de formato levantadas na `sessao-feature` e resolvidas pelo dono

O Fork C ratificou "substring exato normalizado", mas não resolvia duas decisões de formato que a
implementação expõe. Ambas foram registradas como **lacuna de spec** (regra 2 da `sessao-feature`),
a execução pausada, e o dono decidiu:

1. **Fidelidade do texto fora do trecho mascarado** → **preservar o original**. A normalização serve
   só para CASAR; a substituição acontece no texto ORIGINAL. `"Cancelado — ACME  Ltda cobrou errado"`
   vira `"Cancelado — [counterparty:cp_x] cobrou errado"`, não a versão em caixa baixa. Motivo: a
   trilha é append-only (ADR-INCR2 Q2) — degradar o texto do operador num campo que não é PII seria
   irreversível.
2. **Fronteira de palavra** → **`\b` nas pontas do nome**. Uma `Counterparty` chamada "Sol" NÃO
   mascara "solicitado". Pontuação conta como fronteira, então `(ACME)` ainda casa. Motivo: substring
   puro corromperia texto legítimo na trilha imutável.

Consequência de implementação: o matching é por **regex montado por nome** (tokens do nome separados
por `\s+`, `\b` nas pontas, case-insensitive), não por `String.includes` na versão normalizada.

**Recomendação:** **(a)**, com uma frase obrigatória no relatório/documentação do comportamento:
**mascaramento por substring normalizado é melhor-esforço, não filtro completo** — precisa ser
declarado explicitamente (na doc do endpoint/no ADR que ratificar isto), para não criar falsa
sensação de garantia total. Custo de estar errado: se o dono esperava cobertura de variantes/erros de
digitação, (a) sozinho não entrega — mas trocar por (b) depois é uma extensão do mesmo mecanismo
(function de matching plugável), não um redesenho. **Status: RATIFICADO (a) — 2026-09-10, "Pode
ratificar". A declaração de melhor-esforço do item 6 do checklist é MANDATÓRIA, não opcional, junto
com esta ratificação.**

---

## FORK D — Onde o mascaramento roda: centralizado em `AuditService.append`, ou por-produtor?

**Por que é fork:** é a decisão de maior raio de efeito arquitetural — muda a superfície do serviço
mais crítico do sistema (todo evento de auditoria passa por ele) vs. replica um padrão manual em
~9-13 call sites.

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Centralizado em `AuditService.append`** — antes de `canonicalizeAuditPayload` (linha 68), para toda chave marcada como "texto livre mascarável" por eventType (precisa de uma segunda estrutura de metadado ao lado de `PAYLOAD_ALLOWLIST`, ex. `MASKABLE_FREE_TEXT_KEYS: Record<eventType, string[]>`) | Garante que NENHUM eventType futuro esqueça (mesma motivação da linha 70 do GAP-MAP — "cada nova superfície precisa do seu", mas aqui vira "todo evento passa pelo choke-point, não precisa lembrar"); um lugar só para testar | `AuditService` precisa de uma dependência nova (`ICounterpartyRepository` ou um `INameMasker` injetado) — hoje ele só depende de `IAuditRepository`/`IPostingRepository`/`IAccountingPolicy` (`AuditService.ts:42-47`); acopla uma leitura de Counterparty dentro do caminho transacional de TODA escrita contábil, mesmo quando o payload não menciona ninguém |
| **(b) Por-produtor**, replicando o padrão `auditDescription` manualmente em cada um dos ~9-13 call sites com campo livre | Menor mudança na superfície do `AuditService`; segue o padrão já ratificado (`auditDescription`) que o time já usa e entende | Depende de cada produtor novo (e cada um dos já existentes) lembrar de implementar — exatamente a classe de risco "harness só cresce com falha" que a linha 70 do GAP-MAP já documenta como limite conhecido; sob Fork A=(b), teria que tocar em 4-5 arquivos de serviço agora e todo arquivo novo depois |

**Recomendação:** **(a)**. Justificativa: a alternativa (b) é o padrão que JÁ existe (`auditDescription`)
e que motivou este item ser aberto — se (b) fosse suficiente, o item não precisaria existir, bastaria
replicar manualmente. Centralizar é a única forma de fechar a classe (não só a instância). Custo de
estar errado: se o dono preferir (b) por menor acoplamento do `AuditService`, a
`sessao-feature` replica o padrão manual nos produtores do Fork A — mais trabalho, mas plenamente
reversível a partir deste BRIEF (o checklist abaixo assume (a) como leitura de referência). **Status:
RATIFICADO (a) — 2026-09-10, "Pode ratificar". O risco silencioso nº1 (OPS-004, leitura de
Counterparty DENTRO da mesma tx do `append`) fica vinculado a esta ratificação — a `sessao-feature`
não pode implementar (a) sem isso.**

---

## FORK E — O que fica no lugar do nome mascarado

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) Placeholder fixo genérico** (ex.: `[fornecedor]`/`[cliente]`, sem diferenciar QUAL) | Mais simples; nenhuma referência a dado externo na trilha | Perde correlação — quem audita não sabe se dois eventos citavam o MESMO terceiro ou terceiros diferentes |
| **(b) Referência opaca ao id** (ex.: `[counterparty:cp_abc123]`) | Mantém correlação (mesmo espírito de `payableId`/`supplierRef` id-only já usado em `payable.created`) sem expor o nome em texto puro | Exige que quem lê a trilha tenha acesso à tabela `Counterparty` para resolver o id — mas isso já é verdade para `supplierRef`/`counterpartyId` em outros eventos allowlistados |

**Recomendação:** **(b)** — consistente com o padrão id-only já usado no resto do
`PAYLOAD_ALLOWLIST` (`payable.created`, `counterparty.created`); preserva rastreabilidade sem
reintroduzir o nome em claro. Custo de estar errado: (a) é troca de 1 linha de formatação se o dono
preferir simplicidade sobre correlação. **Status: RATIFICADO (b) — 2026-09-10, "Pode ratificar".**

---

## FORK F — Custo de leitura extra dentro da tx de escrita (só relevante se Fork D = (a))

| Caminho | Descrição | Custo de errar |
|---|---|---|
| **(a) 1 query de `Counterparty` por `append`** | Simples, sem estado novo | Toda escrita contábil (não só as com campo livre) paga 1 leitura adicional, mesmo quando não há nome a mascarar |
| **(b) Cache por request/scope** (a lista de `Counterparty` da unit é lida 1x por request e reusada por todo `append` dentro da mesma tx/request) | Evita reconsulta quando há múltiplos `append` na mesma operação (raro, mas existe — ex.: reversão + novo lançamento) | Precisa de um lugar para guardar o cache (escopo de request) que o `AuditService` hoje não tem — é infraestrutura nova, ainda que pequena |

**Recomendação:** **(a)** para a primeira fatia — YAGNI: a maioria das operações faz 1 `append` por
tx; otimizar antes de medir é o oposto do ladder do ponytail. Se o volume mostrar que é um gargalo
real, (b) vira um incremento próprio, medido. **Status: RATIFICADO (a) — 2026-09-10, "Pode
ratificar".**

---

## Checklist numerado de comportamentos (assume as recomendações acima como leitura de referência)

1. **`MASKABLE_FREE_TEXT_KEYS`** — novo mapa em `auditCanonical.ts` (ou arquivo irmão), paralelo a
   `PAYLOAD_ALLOWLIST`, nomeando quais chaves de quais eventTypes passam pelo masker (sob Fork A=(b):
   `description` em `entry.posted`/`entry.drafted`/`entry.draft_updated`, `reason` em
   `entry.reversed`/`entry.rejected`/`period.*`/`payable.*_cancelled`/`receivable.*_cancelled`/
   `reconciliation.unmatched`). Testável: um evento fora dessa lista não é tocado pelo masker (ex.:
   `payableId`, que já é id-only, passa intacto).
2. **`maskThirdPartyNames(text, counterparties): string`** — função pura em `auditCanonical.ts` (ou
   módulo vizinho), recebendo o texto livre + lista de `Counterparty` da unit (já resolvida fora da
   função — mantém a função testável sem banco); aplica a normalização de `nameNormalized` ao texto e
   substitui cada ocorrência do `name` normalizado por `[counterparty:{id}]` (Fork E=(b)). Testável:
   função pura, tabela de casos (nome presente / ausente / presente parcialmente / case diferente /
   espaço duplo).
3. **Integração em `AuditService.append`** (Fork D=(a)) — antes de `canonicalizeAuditPayload`
   (`AuditService.ts:68`), para cada chave do `input.payload` que está em `MASKABLE_FREE_TEXT_KEYS`
   para aquele `eventType`, aplica `maskThirdPartyNames` usando a lista de `Counterparty` da
   `scope.unitId` (nova leitura via `ICounterpartyRepository`, injetada no construtor do
   `AuditService`). Testável: `append` chamado com um `reason` contendo um nome de `Counterparty`
   cadastrado → o `AuditEvent` persistido tem o nome substituído; `verifyAuditChain` continua `ok`
   (o hash é sobre o valor JÁ mascarado, nunca sobre o original).
4. **Nenhuma mudança na allowlist de chaves** — `PAYLOAD_ALLOWLIST` continua igual; este item muda
   VALOR, não quais chaves sobrevivem (consistente com o precedente citado nos insumos). Testável:
   `dtoShapeSnapshot`/testes de allowlist existentes continuam verdes sem alteração.
5. **`entry.posted` manual perde o caminho "sem boundary"** (só sob Fork A=(b)) — hoje
   `auditCanonical.ts:19` documenta que posts manuais ficam com `description` 100% livre; sob este
   item, o masker roda para TODO `entry.posted`, manual ou não — o boundary `auditDescription`
   existente (PayableService/ReceivableService) continua funcionando em paralelo (o masker atua
   depois, sobre o que sobrar — inclusive sobre `auditDescription` já sanitizado, como
   camada extra). Testável: lançamento manual com `description` contendo nome de `Counterparty`
   cadastrado → trilha mascarada.
6. **Declaração explícita de melhor-esforço** (Fork C) — na doc do comportamento (JSDoc do masker +
   nota no ADR que ratificar este item, se um ADR for aberto): mascaramento por substring normalizado
   NÃO garante ausência de PII em texto livre (abreviações, erros de digitação, nomes não
   cadastrados como `Counterparty` continuam passando). Testável: nenhum teste automatizado prova
   ausência total de PII (é logicamente impossível para texto livre) — o teste prova só o caso
   coberto (substring normalizado exato).
7. **`tsc` limpo** em `server/` — gate padrão.
8. **Sem migração de banco** — `Counterparty` já existe; nenhum campo novo é necessário neste item
   (o masker só LÊ `name`/`nameNormalized`, não escreve).

---

## Contratos esboçados (forma, não decisão final — ajusta conforme os forks)

```ts
// server/src/features/accounting/audit/auditCanonical.ts — esboço aditivo

/** Quais chaves, por eventType, passam pelo masker de nome de terceiro antes da canonicalização.
 *  Chave ausente daqui (ex.: supplierRef, payableId) nunca é tocada — já é id-only por desenho. */
export const MASKABLE_FREE_TEXT_KEYS: Record<string, readonly string[]> = {
  'entry.posted':           ['description'],
  'entry.drafted':          ['description'],
  'entry.draft_updated':    ['description'],
  'entry.reversed':         ['reason'],
  'entry.rejected':         ['reason'],
  'period.soft_closed':     ['reason'],
  'period.hard_closed':     ['reason'],
  'period.reopened':        ['reason'],
  'payable.cancelled':          ['reason'],
  'payable.payment_cancelled':  ['reason'],
  'receivable.cancelled':          ['reason'],
  'receivable.receipt_cancelled': ['reason'],
  'reconciliation.unmatched':   ['reason'],
};

/** Best-effort: substitui, no texto livre, cada ocorrência (normalizada) do nome de uma
 *  Counterparty conhecida por uma referência opaca ao id. NÃO garante ausência total de PII —
 *  abreviação, erro de digitação e nome não cadastrado não são detectados (Fork C). */
export function maskThirdPartyNames(
  text: string,
  counterparties: ReadonlyArray<{ id: string; nameNormalized: string }>,
): string {
  // normaliza `text` com a MESMA função usada para popular nameNormalized (reuso, não duplicação)
  // substitui cada match por `[counterparty:${id}]`
  // implementação na sessao-feature
  throw new Error('not implemented — planning only');
}
```

```ts
// server/src/features/accounting/services/AuditService.ts — esboço da mudança no construtor/append

export class AuditService {
  constructor(
    private readonly auditRepo: IAuditRepository,
    private readonly postingRepo: IPostingRepository,
    private readonly policy: IAccountingPolicy,
    private readonly counterpartyRepo: ICounterpartyRepository, // NOVA dependência (Fork D=(a))
  ) {}

  async append(tx: Prisma.TransactionClient, scope: AccountingScope, input: AuditEventInput): Promise<void> {
    const maskableKeys = MASKABLE_FREE_TEXT_KEYS[input.eventType] ?? [];
    let payload = input.payload;
    if (maskableKeys.length > 0) {
      const counterparties = await this.counterpartyRepo.listActive(scope, tx); // nova leitura
      payload = { ...payload };
      for (const key of maskableKeys) {
        const v = payload[key];
        if (typeof v === 'string') payload[key] = maskThirdPartyNames(v, counterparties);
      }
    }
    const payloadCanonical = canonicalizeAuditPayload(input.eventType, payload);
    // ... resto igual
  }
}
```

> **Nota de disciplina:** o esboço acima é FORMA, sujeita aos forks. Em particular, se Fork D=(b), a
> integração não entra em `AuditService.append` — entra em cada produtor, e o masker é chamado antes
> de montar `payload` no call site (mesmo ponto onde `auditDescription` é montado hoje).

---

## Residuais medidos na implementação (2026-09-10) — registrados, não resolvidos

1. **Custo por append nos laços quentes (Fork F(a) × F(b)).** O Fork F(a) ratificou "1 query por
   append, sem cache — YAGNI até medir". A medida existe agora, do review independente: o campo
   `entry.posted.description` **nunca** é vazio, então TODO post paga a leitura de
   `findManyByUnit`; e há laços que fazem um post por iteração —
   `DataExchangeImportService.ts:319` (import), `PayableService.ts:673,750,775` e
   `ReceivableService.ts:436,463` (`reconcile()` varre `findAllActive()`),
   `AccountingSyncService.ts:129` (um post por venda). Importar 500 lançamentos = 500 leituras de
   catálogo dentro de transações. O custo de CPU do masker em si **deixou de escalar com o
   catálogo** (pré-filtro por primeira palavra + fatiamento), mas a QUERY por append continua.
   Promover para o Fork F(b) (cache por request/tx) é o incremento próprio que o próprio Fork F
   previu. **Decisão do dono em 2026-09-10: MANTER F(a)** — o cache não será feito nem agora nem
   como frente aberta. O que sustentou a decisão, levantado na implementação: (i) **não existe
   escopo de request neste servidor** (zero `AsyncLocalStorage`/`requestContext`; factory é
   singleton) — "cache por request" exigiria infraestrutura nova; (ii) os laços de `reconcile`
   rodam como **job e CLI**, sem request nenhum, então nem se beneficiariam; (iii) o modo de falha
   de um cache mal-chaveado não é lentidão, é **vazamento cross-tenant** (mascarar o texto de um
   tenant com os nomes de outro) dentro de trilha append-only. Reabrir exige nova ratificação e
   BRIEF próprio.
2. **Pior caso patológico do masker:** quando milhares de contrapartes compartilham a primeira
   palavra, o pré-filtro não descarta nada e o fatiamento entra — medido em ~2,2 s para 30.000
   nomes homogêneos ("cliente teste numero N") num único append. Catálogo real tem primeira palavra
   variada, então isto é teto de laboratório, não medida de produção; fica registrado porque é o
   caso em que o custo volta a aparecer.

## Pendente de validação externa

Nenhuma. Item técnico (mecânica de sanitização de trilha de auditoria) — não depende de regra
contábil, fiscal ou legal externa (contador, RFB). A decisão de QUANTO mascaramento é "suficiente"
para LGPD é de produto/dono, não uma regra externa citável neste momento — se o dono quiser
tratamento formal de LGPD aqui, é uma pendência nova, registrada abaixo.

## Insumos ausentes

1. **Requisito de LGPD/compliance formal** — o item nasceu de um achado técnico (PII na trilha de
   auditoria), não de uma exigência regulatória citada por artefato. Se existir uma exigência formal
   (prazo, abrangência mínima), ela muda a urgência e possivelmente o Fork C (melhor-esforço pode não
   bastar) — não assumido aqui, registrado como ausente.
2. **Volume/frequência de `AuditService.append`** — não medi quantos `append`s por segundo o sistema
   faz hoje; relevante só se Fork F=(a) se mostrar um gargalo real (não assumido, YAGNI).

## Achados fora de escopo (registrados, não planejados)

1. **Boundary `auditDescription` de `entry.posted` (via Payable/ReceivableService) fica REDUNDANTE,
   não retirado** — sob Fork A=(b)/D=(a), o masker centralizado cobriria o mesmo caso que
   `auditDescription` já cobre hoje. Este BRIEF não propõe remover `auditDescription` (dupla camada é
   defesa em profundidade, não bug) — mas é um achado que vale nota no ADR se um for aberto: duas
   camadas resolvendo o mesmo problema têm custo de manutenção (2 lugares para lembrar), ainda que o
   custo de remover uma delas agora não se justifique (regra 6 T1-T8: não reescrever o que já
   funciona).
2. **Mascaramento em outros módulos fora de accounting** (CRM, DynamicTable) — nunca foi pedido; a
   Counterparty e a trilha de auditoria contábil são o escopo citado ("nome de fornecedor/cliente/
   contraparte" — linguagem do módulo de accounting). Frente adjacente, autorização própria.
3. **Redação/UX do texto mascarado na tela que lê a trilha (se existir)** — este BRIEF é backend
   (convenção da skill); a tela de auditoria (se/quando existir) é nó vizinho FE, fora daqui.

---

## Gates de envio — OPS-001 (auto-teste antes de fechar)

1. **Objetivo, não letra:** o pedido foi "mascarar nome no reason livre"; a letra não especificou
   escopo/fonte/mecanismo — o objetivo (fechar o risco residual identificado na instrumentação
   anterior) está endereçado pelos Forks A-F + checklist, que cobrem exatamente essas três lacunas de
   especificação. Frase que aponta a resposta: "Comportamentos candidatos" + Forks A/B/C.
2. **Grau em cada claim:** cada linha da tabela de insumos cita arquivo:linha, verificado por
   leitura direta nesta sessão (não memória). Os 6 forks são explicitamente **decisão do dono**, não
   inferência minha — nenhum foi tratado como resolvido.
3. **Caso adversarial tentado:** verifiquei se o padrão `auditDescription` já resolvia isto
   genericamente (evitaria abrir o item à toa) — não resolve: é per-produtor, só para `entry.posted`
   via Payable/ReceivableService, e o próprio motivo deste item é que os outros 12+1 eventTypes não
   têm equivalente. Segundo caso adversarial: verifiquei se mascaramento por substring seria
   apresentado como "resolve o problema" — não é; por isso o Fork C e o item 6 do checklist exigem a
   declaração explícita de melhor-esforço, para não vender garantia que a técnica não entrega.
4. **Checagem falseável:** `grep -rn "reason: dto.reason\|description: dto.description" server/src/features/accounting/services/*.ts`
   sobre os 5 produtores listados — se algum deles já sanitizasse o valor (como
   `PayableService`/`ReceivableService` fazem para `entry.posted` via `auditDescription`), a busca
   revelaria um `auditDescription`/equivalente ali; não revela para nenhum dos 12, confirmando que o
   item cobre gap real, não redundância.
5. **Duas primeiras linhas entregam verdade + risco:** a verdade é que este é item de produto (nunca
   existiu, não é lacuna) com 6 forks abertos, nenhum decidido; o risco principal é que mascaramento
   por substring normalizado (Fork C, recomendado) é **estruturalmente incompleto** — se o dono
   aprovar sem ler essa ressalva, pode nascer a expectativa de uma garantia que a técnica não cumpre.

**Risco silencioso nº1 (OPS-004):** se a `sessao-feature` implementar Fork D=(a) sem notar que
`AuditService` hoje não tem `ICounterpartyRepository` como dependência, o caminho mais fácil sob
pressão de prazo é buscar Counterparty **fora da tx** (quebra Q10 do ADR-INCR2 — "Append fora de tx
é proibido" não se aplica à LEITURA, mas se a leitura de Counterparty ficar fora da mesma tx que o
`append`, existe uma janela onde um Counterparty arquivado/renomeado entre a leitura e o append gera
inconsistência — pequena, mas real). O checklist (item 3) já assume leitura dentro da mesma tx; um
leitor futuro que pular esse detalhe reintroduz a janela.
