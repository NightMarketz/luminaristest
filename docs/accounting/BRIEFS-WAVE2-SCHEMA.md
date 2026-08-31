# BRIEFS-WAVE2-SCHEMA — P2-SCHEMA (planejamento, não implementação)

> **Nota do registrador (2026-08-31):** registro histórico congelado — este é o BRIEF tal como
> existia no momento da execução (2026-08-30); status de fork, "pendente"s e achados aqui **podem
> estar desatualizados**. Os desfechos reais (o que de fato foi mergeado, o que ficou em andamento,
> o que foi diferido) estão em
> [`PRE-DADOS-REAIS-2026-08-30.md`](./PRE-DADOS-REAIS-2026-08-30.md).

## Contexto fixo (não rediscutir)

- **Autorização:** citação direta do dono no disparo desta sessão de planejamento (`sessao-planejamento`),
  2026-08-30: *"Pode disparar"* + fork **F1(b)** (normalização de contraparte: trim + fold de caixa na
  chave) e fork **F2** (teto Int32→BigInt) **ratificados via `AskUserQuestion` em 2026-08-30**. Esta
  citação cobre exatamente os dois itens abaixo — nenhum a mais, nenhum a menos. Ainda **não está**
  dobrada em `PROXIMOS-PASSOS-2026-08-28.md` nem no `ACCOUNTING-MASTER-MAP.md §5.1` (ambos de
  2026-08-28/29, um dia antes desta ratificação) — fold é passo de integração, fora do escopo desta
  sessão (regra 1: "saída é um documento novo, nada mais").
- **Base do repo:** `HEAD` = `41884c8a` = `origin/main` (conferido via `git fetch` + `git rev-parse`
  nesta sessão) — sem drift.
- **Insumos lidos:** `server/prisma/schema.prisma` (`model Counterparty`, todas as colunas `*Cents`),
  `CounterpartyDto.ts`, `Counterparty.model.ts`, `ICounterpartyRepository.ts`/`CounterpartyRepository.ts`,
  `CounterpartyService.ts`, `counterpartyResolution.ts`, `CounterpartyResolution.integration.test.ts`,
  `CounterpartyBackfill.integration.test.ts`, `counterpartyController.ts`, migração
  `20260814120000_counterparty_notnull` (precedente de assert-abort + rebuild), migração
  `20260715060000_incr_counterparty` (precedente de backfill), `scripts/smoke-gate-incr-counterparty.mjs`,
  `models/money.ts`, `PostingRepository.moneyOverflow.test.ts` (ACC-INCR6-J-001/002),
  `FE-INCR6-functional-validation.md`, `INCR2-execution-brief.md` (precedente `AuditEvent.seq BigInt`),
  `auditCanonical.ts`, `dtoShapeSnapshot.test.ts`, `ValidationUtils.ts` (`isValidCpf`/`isValidCnpj`,
  digit-only), `ACCOUNTING-MASTER-MAP.md` T4. Verificação ao vivo: `npx prisma migrate diff` gerado
  contra uma cópia de schema com `Posting.debitCents/creditCents` em `BigInt` (SQL colado no §B.2).
- **Nós vizinhos:** AP/AR (`PayableService`/`ReceivableService`, resolução de contraparte),
  `PostingRepository`/`PostingService` (ledger), relatórios que agregam `*Cents` (BP/DRE/DFC/Balancete/
  Diário/SPED), frontend `formatCents`/`parseBrl` (18 arquivos em `my-app/features/accounting`).

---

# BRIEF-W2-A — identidade de contraparte (normalização de nome + `taxId`)

## 1. Checklist numerado

1. **Schema — coluna derivada `nameNormalized`.** `Counterparty.nameNormalized String` (NOT NULL,
   backfillada), `@@unique([userId, unitId, type, nameNormalized])` substitui o `@@unique` atual sobre
   `name`. `name` continua existindo, vira PURAMENTE display (não constrangida).
2. **Função de normalização (contrato puro, testável isolado).** `normalizeCounterpartyName(name: string): string`
   em `Counterparty.model.ts` (mesmo arquivo de `deletedCounterpartyName`): `trim()` + fold de caixa
   (`toLowerCase()` — ver nota do disc. de acentuação abaixo) + colapso de espaços internos múltiplos
   (`/\s+/g` → `' '`). Direto, sem fork (justificativa no §3 comportamento 2).
3. **Schema — coluna opcional `taxId`.** `Counterparty.taxId String?` (nova, sem backfill possível —
   dado não existe hoje). Normalização só-dígitos na escrita (`.replace(/\D/g, '')`, mesmo padrão de
   `isValidCpf`/`isValidCnpj` em `dynamicTables/utils/ValidationUtils.ts:14,34` — **bespoke local**, não
   import cross-módulo: ver §3 comportamento 3). SEM checksum de CNPJ/CPF nesta fase — registrado como
   degrau futuro no BRIEF, não implementado.
4. **`archiveCounterparty` mangla as DUAS colunas da chave.** `deletedCounterpartyName` (ou uma segunda
   função irmã) tem de gerar o mesmo mangling para `nameNormalized`, não só para `name` — senão o rename
   -on-delete (SEC-A1-4) libera a chave velha (`name`) mas deixa `nameNormalized` presa, e o
   archive+recreate do mesmo nome volta a colidir em P2002. É correção obrigatória, não fork.
5. **DTOs.** `CreateCounterpartySchema`: `name` ganha `.trim()` (Zod `.transform` ou `.trim()` nativo);
   `taxId: z.string().optional()` com `.transform` para só-dígitos (mesma normalização do model, não
   duplicada — ver contrato §2). `.strict()` preservado.
6. **Serviço.** `CounterpartyService.createCounterparty` grava `nameNormalized` calculado a partir de
   `dto.name` normalizado; o catch de `P2002` já existente cobre a nova chave sem mudança de forma (é
   o mesmo `@@unique`, só a coluna-alvo mudou).
7. **`counterpartyResolution.ts` (`findByName`/cunhagem implícita).** `ICounterpartyRepository.findByName`
   passa a comparar por `nameNormalized` calculado a partir do `fallbackName` recebido — é o ponto que
   fecha o objetivo do fork F1(b): " Padaria X" e "padaria x" (supplierName/customerName vindos de
   AP/AR) devem resolver para a MESMA identidade.
8. **Migração com backfill.** `nameNormalized` calculado de `name` para toda linha viva E arquivada
   (arquivada já carrega `deleted:<id>:<name>` — normalizar essa string também, senão duas tumbas do
   mesmo nome original colidem na nova chave). Detecção de colisão: ver fork F-W2A-1 abaixo — a
   RECOMENDAÇÃO usa o padrão assert-trigger-abort já usado em `20260814120000_counterparty_notnull`
   (RAISE(ABORT,…) via trigger BEFORE INSERT numa tabela-sonda), aplicado a "existem 2+ linhas VIVAS no
   mesmo (userId,unitId,type) cujo nameNormalized colide" — falha alto, não sufixa em silêncio. Prólogo
   `DROP TRIGGER/TABLE IF EXISTS` obrigatório (memória `migracao-sqlite-nao-e-transacional`: um ABORT
   não desfaz o que já rodou antes dele nesta migração).
9. **Testes — guarda dos casos citados no brief-mãe.** `" Padaria X"` e `"padaria x"` (trim + fold)
   fundem no `resolveOrCreateCounterpartyId` E no `createCounterparty` (P2002→ValidationError). Caso
   negativo espelhado: dois nomes GENUINAMENTE diferentes (`"Padaria X"` vs `"Padaria Y"`) continuam
   distintos — sem isso o teste positivo passaria com uma normalização que colapsa tudo.
10. **Gate — smoke-migration-gate sobre cópia do `dev.db` real.** `server/prisma/prisma/dev.db`
    (aninhado — memória `dev-db-real-path-is-nested`). Script no molde de
    `scripts/smoke-gate-incr-counterparty.mjs`: **primeiro** `SELECT COUNT(*) FROM counterparties`,
    imprimir o baseline, e se `0` **declarar explicitamente** "backfill não exercitado pelo gate —
    PASS vácuo" (mesmo aviso de linha 109 do gate irmão) em vez de reportar verde sem qualificação —
    é a lição de `smoke-gate-s6-x-migracao-de-dado` aplicada aqui.

## 2. Contratos esboçados

```
// Counterparty.model.ts
export function normalizeCounterpartyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
export function normalizeTaxId(taxId: string): string {
  return taxId.replace(/\D/g, '');
}
// mangling da chave nova, espelhando deletedCounterpartyName:
export function deletedCounterpartyNameNormalized(id: string, nameNormalized: string): string {
  return `deleted:${id}:${nameNormalized}`;
}
```

```prisma
model Counterparty {
  // ...campos existentes...
  nameNormalized String   // derivada de name; NOT NULL; recalculada a cada write
  taxId          String?  // só-dígitos; SEM checksum nesta fase
  // ...
  @@unique([userId, unitId, type, nameNormalized])   // era [userId, unitId, type, name]
  // @@index([userId, unitId, type]) inalterado
}
```

```ts
// CounterpartyDto.ts — shape que muda (dtoShapeSnapshot.test.ts precisa de update)
CreateCounterpartySchema: {
  unitId: string,
  type: 'SUPPLIER' | 'CUSTOMER',
  name: string,          // trim aplicado; máx COUNTERPARTY_NAME_MAX_LENGTH (sobre o valor JÁ trimado)
  taxId?: string,         // novo; normalizado para só-dígitos; sem .length fixo (11 OU 14, sem checksum)
  ref?: string,
}
```

## 3. Comportamentos — direto vs. fork

| # | Comportamento | Classificação | Nota |
|---|---|---|---|
| 1 | `nameNormalized` derivada + `@@unique` migra para ela | **direto** | é o objetivo literal do F1(b) já ratificado |
| 2 | trim + fold de caixa + colapso de espaços internos múltiplos | **direto** | fold de caixa e trim são o que F1(b) pede; colapso de múltiplos espaços é o comportamento seguro-por-default (evita "Padaria  X" com 2 espaços virar identidade nova) — baixo risco, sem caminho alternativo razoável melhor |
| 3 | fold de acentuação (á→a) | **fork PENDENTE — F-W2A-3** | F1(b) ratificado cobre só "fold de caixa"; acentuação é um eixo à parte (normalização Unicode NFD+strip de diacríticos). Caminhos: (a) fold só de caixa, como ratificado — "Café" ≠ "Cafe" continuam identidades distintas; (b) fold de caixa + acentuação — funde os dois. Recomendação: **(a)**, porque é literalmente o que foi ratificado — expandir o escopo do fold é decisão nova, não dedução do F1(b) |
| 4 | `taxId` fora da chave de unicidade (discriminador informacional) | **fork PENDENTE — F-W2A-4** | orquestrador já deu recomendação inicial "(a) fora da chave nesta fase". Caminhos: (a) fora da chave — duas contrapartes podem coexistir com o mesmo CNPJ se os nomes normalizados divergirem (útil: erro de digitação no nome não trava o cadastro); (b) `taxId` entra em um `@@unique` PARCIAL (`[userId,unitId,type,taxId]` quando não-nulo) — barra duplicata por documento fiscal mesmo com nomes diferentes. Recomendação: **manter (a)**, concordo com o orquestrador — SQLite/Prisma não têm unique parcial nativo sem índice filtrado manual (`CREATE UNIQUE INDEX ... WHERE taxId IS NOT NULL`, fora do que o Prisma gera), e (b) sem checksum de CNPJ/CPF corre o risco de travar dois fornecedores por um `taxId` mal digitado igual — pior que o problema que resolve nesta fase |
| 5 | migração: colisão de nomes normalizados nas linhas EXISTENTES — abortar ou sufixar | **fork PENDENTE — F-W2A-5** | Caminhos: (a) **abortar** (assert-trigger-ABORT, precedente `20260814120000`) — nenhuma linha sufixada às cegas, dono decide manualmente cada colisão antes de reexecutar; (b) sufixar automaticamente (`nameNormalized || '#' || id` na 2ª+ ocorrência) — migração sempre passa, mas cria identidades "quase-duplicadas" sem revisão humana. Recomendação: **(a)**, por precedente direto (mesma decisão já tomada em `SEC-A1-5`) e porque sufixar em silêncio é exatamente o tipo de "decisão de dono" que a regra 4 do formulário proíbe tomar sozinho |
| 6 | `nameNormalized` das linhas ARQUIVADAS (mangled) | **direto** | precisa normalizar `deleted:<id>:<name>` também, senão duas tumbas do mesmo nome original colidem na chave nova — é decorrência mecânica do comportamento 1, não escolha |

## 4. Gate de saída (para a `sessao-feature` que executar este BRIEF)

- `tsc` limpo (`server`).
- `dtoShapeSnapshot.test.ts` atualizado (shape do `CreateCounterpartySchema` mudou — `taxId` novo).
- `CounterpartyResolution.integration.test.ts` estendido com os casos trim/fold (comportamento 9).
- Novo teste de integração no molde de `CounterpartyBackfill.integration.test.ts` para a migração desta
  fase (lê o SQL do disco via marcador, não espelha).
- Smoke-migration-gate rodado contra CÓPIA do `dev.db` aninhado real, com a contagem-baseline impressa
  e o veredito "vácuo" honesto se `counterparties` estiver vazia.
- Nenhuma rota nova, nenhum `eventType` de auditoria novo (comportamento 1-9 não introduz mutação além
  de create/archive já existentes) — allowlist do `auditCanonical.ts` não muda.

## 5. Pendências de validação externa

Nenhuma — normalização de string e chave de unicidade são regra de engenharia, não regra contábil/fiscal
(o `taxId` sem checksum é dado opcional, sem obrigação legal nesta fase).

## 6. Insumos ausentes

- **Contagem real de `counterparties` no `dev.db` populado.** Este worktree é novo (memória
  `worktree-deps-stale-prisma-client`) e não carrega `server/prisma/prisma/dev.db` — não posso medir se
  o smoke-gate será vácuo ou não a partir daqui. A `sessao-feature`/gate futura deve contar ao vivo
  (item 10 do checklist já manda imprimir o baseline).

## 7. Achados fora de escopo

- Nenhuma tela de frontend expõe `taxId` hoje (0 arquivo em `my-app` referencia `taxId` fora de
  `dynamicTables`/CRM). Exibir/editar `taxId` no catálogo de contrapartes é FE-INCR separado — este
  BRIEF é backend por padrão (nota de operação do template).

---

# BRIEF-W2-B — teto de persistência Int32 → BigInt

## 0. Achado que redesenha o escopo (leitura do código, não do ADR)

`server/src/features/accounting/repositories/__tests__/PostingRepository.moneyOverflow.test.ts` já prova,
contra SQLite real, que:
- **ACC-INCR6-J-001 (CONFIRMADO, aberto):** uma PERNA individual de `Posting.debitCents`/`creditCents`
  1 centavo acima de `2_147_483_647` ou trava no `create()` ou "envenena" toda leitura seguinte da linha
  com um `PrismaClientKnownRequestError` cru ("does not fit in an INT column") — nunca vira
  `ValidationError`. Este é o bug real que motiva o F2.
- **ACC-INCR6-J-002 (FECHADO, não é bug):** o agregado `_sum` de `groupByAccount` **não** está sujeito ao
  mesmo teto — SQLite computa `SUM()` sem a largura de 32 bits que o Prisma só impõe na ESCRITA de uma
  linha individual; dois lançamentos de R$15M cada somam R$30M corretamente hoje, sem BigInt.
- O comentário do próprio `money.ts:11-12` já registra isto como débito conhecido (`ponytail:` tag):
  *"raise to BigInt only if a real posting leg ever needs to exceed ~R$21.47M"*.

**Consequência para o fork de escopo (F-W2B-1 abaixo):** o defeito medido e confirmado vive SÓ em
`Posting.debitCents`/`creditCents`. As outras 11 colunas `*Cents` (Payable, Receivable, BankStatement×2,
BankStatementLine, CustomerPackageBalance, PackageBalanceMovement, InventoryItem, StockMovement,
PayablePayment, ReceivableReceipt) têm o MESMO risco teórico (nenhuma tem guarda de MAX_CENTS no
choke-point de escrita, exceto via DTO Zod na borda), mas ZERO evidência de caso real acima do teto —
são domínios (contas a pagar/receber, extrato bancário, estoque) onde um valor de R$21M+ numa linha
ÚNICA é operacionalmente muito mais raro que um SALDO de conta contábil acumulado ao longo de anos
(que já não é afetado, por ACC-INCR6-J-002).

## 1. Checklist numerado

1. **Escopo da migração — ver fork F-W2B-1.** Recomendação: **fatiar** — Fase 1 = só `Posting.debitCents`/
   `creditCents` (fecha o bug confirmado). Fase 2 = as 11 colunas remanescentes, increment separado,
   SEM bug confirmado hoje.
2. **Schema.** `Posting.debitCents Int → BigInt`, `Posting.creditCents Int → BigInt`. Migração verificada
   ao vivo nesta sessão via `npx prisma migrate diff --script` (SQL completo colado no §2 abaixo):
   é um `RedefineTables` (SQLite não tem `ALTER COLUMN TYPE`) — `CREATE TABLE new_postings` com as duas
   colunas `BIGINT`, `INSERT INTO new_postings SELECT * FROM postings`, `DROP TABLE postings`,
   `RENAME`, recria os 3 índices. **Preserva dado, é uma cópia 1:1** — nenhum `CAST` explícito
   necessário porque SQLite já armazena `INTEGER` em 8 bytes independente do tipo declarado (fato
   verificado: o teto de hoje é 100% do lado do Prisma Client, nunca do motor SQLite — mesma conclusão
   do docstring do `moneyOverflow.test.ts`).
3. **`MAX_CENTS` pós-migração.** Recomendação: **manter como teto de POLÍTICA**, não removê-lo — mas
   redefinir o número. Ver fork F-W2B-2 (valor exato + ligar a checagem no `postEntry`, achado A5/1.5
   do `COUNCIL-BOARD-2026-07-20` que já pedia isso e nunca foi executado).
4. **Contrato de serialização na borda HTTP.** `res.json()` do Express lança em `bigint` cru
   (`TypeError: Do not know how to serialize a BigInt`). Recomendação: converter de volta a `number` na
   fronteira do controller/serviço de leitura (não a `string` como o precedente `AuditEvent.seq` —
   justificativa no fork F-W2B-3), com uma guarda explícita (`Number.isSafeInteger` pós-conversão) que
   lança se algum dia um valor realmente ultrapassar 2^53 — nunca silenciosamente perde precisão.
5. **Varredura read-side — sítios que precisam de ajuste.** Ver §3 (medição completa). Resumo: 2 sítios
   de aritmética direta (`PostingRepository.ts:80-81` `?? 0` → `?? 0n`; `:117-119` `+=` com default
   `0`/`0` → `0n`/`0n`), 2 sítios de teto Zod (`PostingDto.ts:59-60`, trocar `z.number().int().max(...)`
   por um schema que aceita `number` de entrada e converte para `bigint` na saída — Zod não tem
   `z.bigint()` com `.max()` numérico direto sobre bigint sem um refine dedicado), 1 teste dedicado a
   reescrever inteiramente (`PostingRepository.moneyOverflow.test.ts` — os 3 `it` mudam de sentido:
   o "CONFIRMED BUG" vira teste de que o valor agora É aceito e round-tripa exato).
6. **Sítios de LEITURA que tocam `debitCents`/`creditCents` sem fazer aritmética** (só passam o valor
   adiante) — não quebram em TypeScript (bigint é atribuível onde o tipo já era inferido do Prisma
   Client), mas quebram em RUNTIME no primeiro `Math.abs`/`+`/`JSON.stringify` que encontrarem. Listados
   no §3.
7. **Testes.** Todo `it.each`/asserção que compara `debitCents`/`creditCents` com um literal numérico
   (`toBe(1000)`) precisa decidir se compara contra `number` (pós-conversão na borda) ou `bigint`
   (direto do repo) — **não pode misturar os dois** (`1000n === 1000` é sempre `false` em JS).
8. **Gate.** smoke-migration-gate (cópia do `dev.db` real, mesma disciplina do BRIEF-A) + suíte de
   integração completa `npm run test:integration` (`--runInBand`, memória
   `integration-suite-precisa-de-runinband`) + `tsc --noEmit` ANTES e DEPOIS da conversão bigint→number
   na borda (o `tsc` sozinho não pega o `TypeError` de serialização em runtime — é gate necessário, não
   suficiente).

## 2. SQL da migração verificado (não hipotético — gerado por `prisma migrate diff --script` nesta sessão)

```sql
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_postings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitCents" BIGINT NOT NULL DEFAULT 0,
    "creditCents" BIGINT NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME,
    CONSTRAINT "postings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "postings_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "journal_entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "postings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_postings" ("accountId","createdAt","creditCents","debitCents","entryId","id","unitId","updatedAt","userId")
  SELECT "accountId","createdAt","creditCents","debitCents","entryId","id","unitId","updatedAt","userId" FROM "postings";
DROP TABLE "postings";
ALTER TABLE "new_postings" RENAME TO "postings";
CREATE INDEX "postings_userId_unitId_idx" ON "postings"("userId", "unitId");
CREATE INDEX "postings_entryId_idx" ON "postings"("entryId");
CREATE INDEX "postings_accountId_idx" ON "postings"("accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
```

## 3. Blast radius medido (grep real, contado nesta sessão, excluindo `__tests__`)

| Sítio | Contagem | Detalhe |
|---|---|---|
| Colunas `*Cents Int` no schema (universo do fork de escopo) | **13 colunas / 11 models** | `Posting` (2), `BankStatement` (2), `BankStatementLine` (1), `CustomerPackageBalance` (1), `PackageBalanceMovement` (1), `Payable` (1), `PayablePayment` (1), `Receivable` (1), `ReceivableReceipt` (1), `InventoryItem` (1), `StockMovement` (1) |
| Arquivos `server/src` que importam/usam `MAX_CENTS` | **31 arquivos** | DTOs (7), services (9), sync/mappers/bridges (8), accountingBinding (5), lib (2) |
| Arquivos `server/src` que referenciam `debitCents`/`creditCents` (nome literal) | **37 arquivos** | services, repos, DTOs, sped, receiptHtml, docs.paths.ts |
| Arquivos `server/src` que referenciam qualquer `*Cents` (fora de teste) | **70 arquivos** | teto para o escopo "todas as colunas" |
| Arquivos de teste (`.test.ts`) que citam `MAX_CENTS`/`2147483647` | **25 arquivos** | inclui o `moneyOverflow.test.ts` a reescrever inteiro |
| `groupBy`/`_sum` sobre tabelas com coluna `*Cents` | **9 arquivos** | `AccountingReportService`, `CashFlowReportService`, `DimensionReportService`, `ExerciseClosingService`, `SpedEcfGenerationService`, `SpedGenerationService`, `TieOutDiagnosticService`, `PostingRepository`, `IPostingRepository` — risco: Prisma `_sum`/`groupBy` sobre coluna `BigInt` devolve `bigint\|null` em vez de `number\|null`, TODOS precisam do mesmo tratamento `?? 0n` + conversão na borda |
| `Math.abs`/`Math.round` direto sobre uma variável `*Cents` | **7 sítios em 6 arquivos** | `ExerciseClosingService.ts:97`, `InventoryService.ts:250`, `ReconciliationService.ts:203,305,356,510(+512)`, `revenueSplit.ts:45`, `receiptHtml.ts:45`, `sped.ts:60` — `Math.*` NÃO aceita `bigint`, TypeError em runtime se a coluna correspondente virar BigInt |
| `server/src` que tocam `.posting.`/`postings` fora de teste | **13 arquivos** | superfície que pode devolver `Posting` bruto (`debitCents`/`creditCents`) num payload JSON |
| Frontend (`my-app`) que referenciam `debitCents`/`creditCents` | **6 componentes + 1 service** (`accounting.service.ts`) fora de teste; +4 arquivos de teste FE | `DailyJournalPanel`, `EntryApprovalsPanel`, `JournalEntriesPanel`, `JournalEntryModal`, `LedgerPanel`, `ReconciliationMatchModal`/`ReconciliationPanel`, `TrialBalanceTable` |
| Precedente de serialização BigInt já no projeto | `AuditEvent.seq`/`nextSeq` (`BigInt` desde INCR-2) | `auditCanonical.ts:129,167` converte para `string` explicitamente antes de qualquer JSON — NUNCA exposto bruto. Nenhum controller devolve `AuditEvent` via `res.json` hoje (0 hit) |

**Leitura do número:** para o escopo RECOMENDADO (Fase 1, só `Posting`), o sweep toca diretamente
`PostingRepository.ts` (2 sítios de aritmética), `PostingDto.ts` (2 tetos), `PostingService.ts`
(bordas de leitura/escrita), 1 teste a reescrever, e precisa de auditoria pontual (não reescrita) nos
9 arquivos de `groupBy`/`_sum` — a maioria usa `PostingRepository.groupByAccount`, então o tratamento
concentra em **1 método** do repositório, não se espalha por 9 services. Para o escopo "todas as
colunas", o sweep de leitura (70 arquivos) e de teste (25 arquivos, +4 FE) multiplica por ~6.

## 4. Comportamentos — direto vs. fork

| # | Comportamento | Classificação | Nota |
|---|---|---|---|
| 1 | `Posting.debitCents`/`creditCents` → `BigInt` | **direto** | é o F2 já ratificado, e é o comportamento com bug confirmado (ACC-INCR6-J-001) |
| 2 | Migração via `RedefineTables` (rebuild de tabela) | **direto** | verificado ao vivo (SQL colado §2); não há decisão de dono aqui, é o único jeito do SQLite mudar tipo de coluna |
| 3 | Escopo: só `Posting` (Fase 1) vs. todas as 13 colunas (fatia única) | **fork PENDENTE — F-W2B-1** | Caminhos: (a) só `Posting` agora, resto vira BE-INCR-MONEY-BIGINT-FASE2 futuro, quando/se algum leg de AP/AR/estoque/extrato realmente aproximar do teto; (b) todas as 13 colunas nesta mesma investida, por consistência de T4. Recomendação: **(a)** — o blast radius medido (§3) é ~6× maior para (b) sem nenhum defeito confirmado fora de `Posting`, e T4 já registra a condição de reabertura ("~R$21,47M por leg") como algo a MEDIR, não presumir para todo subledger de uma vez |
| 4 | `MAX_CENTS` pós-migração — valor e ligação ao choke-point | **fork PENDENTE — F-W2B-2** | Caminhos: (a) manter `2_147_483_647` como teto de POLÍTICA (não de persistência) — evita que a mudança de schema vire, sem querer, "sem teto nenhum"; ligar a guarda de `MAX_CENTS`+`Number.isInteger` DENTRO de `PostingService.postEntry` (achado A5/1.5 do council 2026-07-20, nunca executado — grep confirma 0 hits de `MAX_CENTS` no choke-point hoje) com o `code` skipável que o rebuttal do council já desenhou (skip-list dos 4 bridges + poison no re-drive); (b) elevar o teto de política para perto de `Number.MAX_SAFE_INTEGER` (2^53-1), já que a coluna comporta; (c) remover qualquer teto de política, deixar só a guarda de serialização (`Number.isSafeInteger` na borda). Recomendação: **(a)** — é o achado JÁ analisado por 2 rodadas de council, com plano de execução pronto (guard + skip-list + poison, mudança única); não reabrir o debate, só executar o que já foi decidido e nunca implementado |
| 5 | Serialização na borda HTTP — `bigint→string` (precedente `AuditEvent.seq`) vs. `bigint→number` com guarda | **fork PENDENTE — F-W2B-3** | Caminhos: (a) `bigint→string`, mesmo padrão do `auditCanonical.ts` — mais "correto" para precisão arbitrária, mas quebra o TIPO que 7 componentes de `my-app` esperam (`number`) e exige tocar os 6 componentes + `accounting.service.ts`; (b) `bigint→number` com guarda `Number.isSafeInteger` (lança se ultrapassar) — zero mudança de tipo no FE, mas diverge do precedente do próprio projeto. Recomendação: **(b)** — dinheiro (diferente de `seq`, um contador que cresce para sempre) tem um teto de negócio realista MUITO abaixo de 2^53 mesmo pós-BigInt; a divergência do precedente é justificada pela natureza do dado (evidência: nenhum caso de uso do projeto precisa de centavos > R$ 90 trilhões, que é onde 2^53 aperta) |
| 6 | Tratamento de `groupBy`/`_sum` sobre `BigInt` nos 9 arquivos | **direto, mas em cascata** | decorrência mecânica do #1 — cada `_sum.debitCents` passa a ser `bigint\|null`; não é escolha, é ajuste de tipo obrigatório em cada um dos 9 sítios listados no §3 |

## 5. Gate de saída (para a `sessao-feature` que executar este BRIEF, Fase 1 = só `Posting`)

- `tsc --noEmit` limpo ANTES (baseline) e DEPOIS (final) — dois momentos, não um.
- `npm run test:integration -- --runInBand` completo, 0 vermelho fora do que o BRIEF já antecipa mudar
  de sentido (`moneyOverflow.test.ts`).
- Smoke-migration-gate no molde do `scripts/smoke-gate-incr-counterparty.mjs`, adaptado: aplica o
  `RedefineTables` de `Posting` sobre CÓPIA do `dev.db` real, confere preservação de linhas (A),
  confere que todo valor pré-existente (que por definição já era ≤ Int32, porque nunca teria sido
  aceito na escrita) sobrevive exato, e roda o cenário do `moneyOverflow.test.ts` (leg acima do Int32
  antigo) contra a cópia MIGRADA para confirmar que agora É aceito.
- `dtoShapeSnapshot.test.ts` — `PostingDto` muda de forma (o teto deixa de ser um `z.number().max`
  simples se F-W2B-2(a) for ratificado com o guard dentro do `postEntry` em vez do DTO).
- Nenhum `eventType` de auditoria novo. Nenhuma rota nova (guard de path-count do openapi não muda).

## 6. Pendências de validação externa

Nenhuma — teto de persistência e tratamento de agregação são engenharia pura, não regra contábil/fiscal.
(A ESCOLHA do valor de `MAX_CENTS`-política, se F-W2B-2(b)/(c), é decisão de produto do dono, já
capturada como fork, não "validação externa" no sentido de oráculo contábil/fiscal.)

## 7. Insumos ausentes

- Nenhum valor real de `debitCents`/`creditCents` no `dev.db` populado foi medido nesta sessão (mesmo
  motivo do BRIEF-A — worktree novo sem `dev.db`). O smoke-migration-gate da Fase 1 deve, como no
  BRIEF-A, imprimir o baseline e declarar honestamente se encontrou alguma linha REAL que já estava
  perto do teto antigo (evidência a mais para T4, mas não bloqueia a migração).

## 8. Achados fora de escopo

- **A5/1.5 do `COUNCIL-BOARD-2026-07-20`** ("mover `MAX_CENTS` para dentro do `postEntry`") já estava
  aprovado por 2 rodadas de council e nunca foi executado — capturado aqui como o conteúdo do fork
  F-W2B-2(a), não como frente nova.
- **Fase 2** (as 11 colunas fora de `Posting`) fica registrada como sub-incremento futuro pelo próprio
  fork F-W2B-1, não como "achado" — é o resultado esperado de fatiar por medição, conforme o BRIEF-mãe
  pediu explicitamente ("dizer 'é grande demais para um PR' é desfecho válido de planejamento").
