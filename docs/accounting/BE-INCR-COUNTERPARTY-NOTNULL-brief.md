# BRIEF — BE-INCR-COUNTERPARTY-NOTNULL (SEC-A1-5)

> Sessão de planejamento, 2026-08-14, contra `origin/main` `a5bb5cee`. **Nenhum fork abaixo está
> ratificado.** O BRIEF fica pronto com os forks LISTADOS; decidir é do dono, fora desta sessão.

- **Item:** endurecer a FK `counterpartyId` (`payables` + `receivables`) para `NOT NULL` numa 2ª
  migração que assere cobertura antes de aplicar.
- **Autorização:** [ADR-INCR-COUNTERPARTY](../adr/ADR-INCR-COUNTERPARTY-first-class.md) §5
  **[SEC-A1-5]** — *"Passo NOT NULL num 2º migration que **assere** zero `counterpartyId` NULL
  in-scope **antes** de aplicar (a FK só endurece depois do backfill provar cobertura total)"* —
  dentro do fork **F-CP1→A1 ratificado**; registrado como resíduo em
  [ACCOUNTING-MASTER-MAP §5.1 B1](ACCOUNTING-MASTER-MAP.md): *"Residual: NOT NULL da FK num 2º
  migration + browser sign-off"*. A autorização cobre **exatamente** este item: nem mais (dados
  cadastrais ricos, dedupe/merge, RBAC estão em §6 "Fora de escopo" do ADR), nem menos.
- **Escopo:** backend. FE é nó vizinho (regra 3), não entra.

## Insumos lidos (artefatos, não memória)

| Artefato | O que fixou |
|---|---|
| [ADR-INCR-COUNTERPARTY](../adr/ADR-INCR-COUNTERPARTY-first-class.md) §5 | SEC-A1-1..5 — os cinco controles herdados |
| `server/prisma/migrations/20260715060000_incr_counterparty/migration.sql` | o backfill idempotente já escrito (`INSERT OR IGNORE` + UPDATE correlacionado por `userId`+`unitId`+nome) e o padrão de rebuild de tabela do SQLite |
| `server/prisma/schema.prisma:859,929` | `counterpartyId String?` nas duas tabelas + FK `ON DELETE SET NULL` |
| `PayableService.ts:112-152,602-620` · `ReceivableService.ts:110-130` | `resolveCounterpartyId` devolve `null` quando o body não manda; é o único ponto de entrada |
| `dtos/PayableDto.ts:50` · `dtos/ReceivableDto.ts:47` | `counterpartyId: z.string().min(1).optional()` — opcional nos dois |
| `sync/bridges/CrmReceivableBridge.ts:125-135` | **cria `Receivable` sem `counterpartyId`** — write-path vivo que produz NULL hoje |
| `services/CounterpartyService.ts:106-127` | archive é **soft** (`deletedAt` + rename-on-key), não existe hard-delete de contraparte |
| `repositories/ICounterpartyRepository.ts` | **não** existe `findOrCreate`/`findByName`; só `create`/`findById`/`findManyByUnit`/`update` |
| `services/AgingReportService.ts:25,279-284` | balde `(Sem contraparte)` para `counterpartyId` NULL — consumidor direto da nulidade |

**Nós vizinhos:** `CounterpartyService`/`Repository` (produtor), `PayableService`/`ReceivableService`
(escritores), `CrmReceivableBridge` (escritor indireto), `AgingReportService` (leitor da nulidade),
`subledgerFilters.ts` (filtro por FK — não toca nulidade), FE `CreatePayableModal`/`CreateReceivableModal`
(mandam `counterpartyId` só quando preenchido: `...(counterpartyId ? { counterpartyId } : {})`).

---

## PARECER DE DOMÍNIO CONTÁBIL

**Bloco do roadmap:** 2 núcleo (integridade do subrazão). **Já existe?** Sim — a FK, o backfill e o
catálogo estão em `main` desde o PR #119/#128; falta só o passo de endurecimento.
**Colisão com decisão commitada?** NÃO — é a segunda metade de uma decisão já ratificada.

**Invariantes aplicáveis:**

- **[ACC-011]/[T6]** — a resolução da contraparte vira **escrita**, não mais leitura. Se ela ficar fora
  da tx que cria a linha, abre-se janela para linha criada com contraparte que sumiu (ou o inverso).
  Tem de rodar **dentro** da `runTransaction` do create, com `tx` propagado (**[ACC-012]**).
- **[ACC-013]/[T7]** — a chave de idempotência do subrazão (`supplierName`+`documentNumber`) **não muda**.
  A contraparte é resolvida a partir do nome-snapshot; o snapshot continua sendo a identidade.
- **[ACC-020]/[T8]** — se a criação implícita de contraparte emitir evento, ele entra na allowlist do
  `auditCanonical.ts` na mesma mudança.
- **[ACC-024]** — a etiqueta de contraparte é **ortogonal ao razão**: nada aqui pode tocar
  Σdébito=Σcrédito, período, numeração ou o lançamento já postado. O endurecimento é de subrazão, não
  de `Posting`.

**Tradução aspiracional → realidade:** SQLite não faz `ALTER COLUMN` (T1). `NOT NULL` = **rebuild de
tabela** (`CREATE new_ / INSERT…SELECT / DROP / RENAME` + recriar todos os índices), exatamente como a
1ª migração fez. É a manobra que o smoke-gate do INCR-INVENTORY já exercitou uma vez sobre
`payables` — e cuja lição (preservar linha/FK/índice) é o gate desta.

**Risco de domínio nº 1:** a migração é irreversível na prática (rebuild + `DROP TABLE`) e roda sobre
subrazão com histórico postado. O gate real é o smoke-migration-gate sobre cópia do `dev.db` real —
não os testes.

---

## 1. Checklist de comportamentos

Cada item é testável isolado. Ordem = ordem de implementação sugerida (comportamento antes de migração:
enquanto a coluna for nullable, os testes de 1–8 podem falhar/passar sem risco de dado).

### Fase A — fechar a torneira de NULLs (antes de endurecer)

1. **Criação de AP sem `counterpartyId` no body resolve a contraparte pelo `supplierName`.**
   `createPayable` sem o campo grava linha com `counterpartyId` não-nulo, apontando para a
   `Counterparty(type='SUPPLIER', name=supplierName)` **do escopo**. Teste: criar sem o campo → ler a
   linha → FK preenchida.
2. **Idem AR pelo `customerName`**, com `type='CUSTOMER'`.
3. **Reuso, não duplicação.** Segunda criação com o mesmo nome no mesmo escopo aponta para a **mesma**
   `Counterparty` (nenhuma nova linha no catálogo).
4. **Isolamento de escopo preservado (SEC-A1-2).** Dois escopos com o mesmo nome ("ACME") resolvem para
   **duas** contrapartes distintas. Teste: dois `AccountingScope`, mesma string, `id` diferente.
5. **Re-scope SEC-A1-1 intocado.** `counterpartyId` de outro tenant no body continua `ValidationError`;
   `counterpartyId` de `type` errado (CUSTOMER num payable) continua `ValidationError`. Regressão pura
   — é o IDOR nº 1 do incremento.
6. **Nome arquivado não é ressuscitado (SEC-A1-4).** Contraparte arquivada teve o `name` renomeado para
   `deleted:<id>:<name>`; uma criação nova com o nome original **cria uma contraparte nova** em vez de
   ligar na arquivada. Teste: arquivar → criar payable com o mesmo nome → FK aponta para id novo,
   `deletedAt === null`.
7. **Atomicidade (ACC-011/012).** A resolução/criação da contraparte roda **dentro** da tx que cria a
   linha, com `tx` propagado ao repo. Teste: forçar falha após a resolução → nem linha nem contraparte
   nova persistem.
8. **Corrida converge (T7 na prática).** Duas criações concorrentes com o mesmo nome no mesmo escopo
   produzem **uma** contraparte, não P2002 para o usuário: colisão no
   `@@unique([userId,unitId,type,name])` é capturada e re-lida.
   > Sonda obrigatória: Windows serializa SQLite e a CI Linux não
   > ([memória](../../../.claude/../docs/operating-manual/PORTABLE-GUIDE.md) —
   > `windows-serializa-sqlite-ci-linux-nao`). Verde local **não** é evidência; a CI é o oráculo.
9. **`CrmReceivableBridge` deixa de produzir NULL — sem alterar o bridge.** O comportamento 2 cobre o
   bridge porque ele chama `createReceivable`. Teste **no bridge** (não só no service): ganhar uma
   oportunidade → `Receivable` com FK preenchida. Se este teste exigir mudar o bridge, o fork F-NN1
   foi decidido errado.

### Fase B — endurecer o banco

10. **A migração re-roda o backfill idempotente** (o mesmo SQL de `20260715060000`, que já é
    `INSERT OR IGNORE` + `WHERE counterpartyId IS NULL`) **antes** da asserção.
11. **A migração assere zero NULL e aborta se houver (SEC-A1-5 literal).** Falha dura, mensagem
    nomeando tabela e contagem — nunca endurece "no escuro".
12. **`NOT NULL` aplicado nas duas tabelas** via rebuild, com **todos** os índices recriados:
    `userId_unitId_status`, `userId_unitId_dueDate` e o `UNIQUE` de chave de negócio, nas duas.
    Teste: `PRAGMA index_list` antes/depois na cópia do dev.db → conjunto idêntico.
13. **Contagem de linhas e FKs preservadas** no rebuild (lição do smoke-gate do INCR-INVENTORY):
    `COUNT(*)` igual antes/depois, `PRAGMA foreign_key_check` vazio.
14. **Ação da FK compatível com `NOT NULL`** (ver F-NN2): `ON DELETE SET NULL` numa coluna `NOT NULL` é
    uma contradição que só explode no dia de um delete real.

### Fase C — gates que o diff aciona

15. **Snapshot de shape dos DTOs** (`__dto-shapes__.json`) — só muda se F-NN1 for decidido como (b).
16. **Allowlist do `auditCanonical.ts`** — todo `eventType` novo (ex.: criação implícita de contraparte)
    entra na mesma mudança.
17. **openapi path-count guard** — não deve mudar (nenhuma rota nova); se mudar, regenerar
    (`npm run docs:generate`) faz parte do diff.
18. **Smoke-migration-gate sobre cópia do `dev.db` real**, no formato dos
    `SMOKE-MIGRATION-GATE-*.md` existentes, asserindo 11–13 + SEC-A1-3 (zero
    `counterpartyId` cross-escopo). **É o gate de deploy deste incremento**, não os testes.

---

## 2. Contratos esboçados

### 2.1 `schema.prisma` (delta)

```prisma
model Payable {
  // …
  counterpartyId String        // era String? — SEC-A1-5
  counterparty   Counterparty  @relation(fields: [counterpartyId], references: [id], onDelete: Restrict)
}

model Receivable {
  // …
  counterpartyId String        // era String?
  counterparty   Counterparty  @relation(fields: [counterpartyId], references: [id], onDelete: Restrict)
}

model Counterparty {
  payables    Payable[]     // relação deixa de ser opcional do lado de cá
  receivables Receivable[]
}
```

### 2.2 Migração (esqueleto — a ordem é o contrato)

```sql
-- 1. backfill idempotente (cópia literal de 20260715060000; INSERT OR IGNORE + WHERE … IS NULL)
-- 2. asserção SEC-A1-5 — aborta a migração se sobrar qualquer NULL
SELECT RAISE(ABORT, 'SEC-A1-5: payables com counterpartyId NULL — backfill não cobriu')
  WHERE EXISTS (SELECT 1 FROM "payables" WHERE "counterpartyId" IS NULL);
-- (idem receivables)
-- 3. rebuild ×2 com counterpartyId TEXT NOT NULL + FK ON DELETE RESTRICT
--    PRAGMA defer_foreign_keys=ON; CREATE new_ / INSERT…SELECT / DROP / RENAME
-- 4. recriar OS TRÊS índices de cada tabela (2 idx + 1 unique) — item 12
```

> `RAISE(ABORT)` fora de trigger exige o wrapper `SELECT … WHERE EXISTS`; se o alvo não aceitar,
> a alternativa é uma `CREATE TABLE` de sonda com `CHECK` — decidir no implementador, o **contrato**
> é "aborta antes de tocar a tabela".

### 2.3 Resolução de contraparte (assinatura nova)

```ts
// ICounterpartyRepository — método novo (hoje não existe lookup por nome)
findByName(
  scope: AccountingScope,
  type: CounterpartyType,
  name: string,
  tx?: Prisma.TransactionClient,
): Promise<Counterparty | null>;   // ignora arquivadas: deletedAt === null (item 6)

// PayableService/ReceivableService — substitui resolveCounterpartyId
private async resolveOrCreateCounterpartyId(
  scope: AccountingScope,
  type: CounterpartyType,
  explicitId: string | undefined,   // caminho SEC-A1-1 preservado quando vem no body
  fallbackName: string,             // supplierName / customerName
  tx: Prisma.TransactionClient,     // ACC-012 — obrigatório, não opcional
): Promise<string>;                 // NUNCA null — é a mudança de contrato
```

**Contrato de entrada da API:** inalterado sob F-NN1(a) — `counterpartyId` segue opcional no DTO.
**Contrato de saída:** `counterpartyId: string` (era `string | null`) nas linhas de AP/AR.

---

## 3. Forks — RATIFICAÇÃO PENDENTE

### F-NN1 — Como cada write-path passa a ter contraparte

| | Caminho | Custo | Efeito |
|---|---|---|---|
| **(a)** | **find-or-create no service** a partir do nome-snapshot | 1 método de repo + 1 método de service ×2 | API e FE **intocados**; `CrmReceivableBridge` intocado; espelha o backfill que já rodou |
| (b) | `counterpartyId` vira **obrigatório no DTO** | quebra contrato de API; FE (2 modais) + bridge CRM têm de resolver antes; snapshot de shape muda | catálogo vira cadastro obrigatório de verdade |
| (c) | não endurecer (recusar o item) | zero | SEC-A1-5 fica aberto indefinidamente |

**Recomendação: (a).** É o único caminho em que o `CrmReceivableBridge` — que hoje **não tem** de onde
tirar um `counterpartyId` (o CRM manda `fact.label`, não um id de contraparte) — passa a cumprir a
invariante sem virar um incremento próprio. (b) empurra trabalho para o FE e para o CRM, ou seja,
transforma um resíduo de backend em três frentes. **PENDENTE.**

### F-NN2 — `ON DELETE SET NULL` numa coluna `NOT NULL`

A FK atual é `ON DELETE SET NULL` nas duas tabelas. Com `NOT NULL`, essa ação é uma contradição: no dia
de um delete real de contraparte, o SQLite falha a operação em vez de anular.

| | Caminho | Efeito |
|---|---|---|
| **(a)** | trocar para **`RESTRICT`** na mesma migração | delete de contraparte com linha viva passa a ser erro explícito; **hoje não existe hard-delete** (archive é soft, `CounterpartyService.ts:106-127`), então o fluxo real não muda |
| (b) | manter `SET NULL` | a contradição fica latente; explode como erro obscuro no primeiro delete |

**Recomendação: (a).** Aproveita o rebuild que já vai acontecer — fazer depois custa **outra** migração
de rebuild. **PENDENTE.**

### F-NN3 — Escopo: as duas tabelas juntas ou só `payables`

**Recomendação: as duas na mesma migração.** AP e AR são espelhos e a
[ADR-RC](../adr/ADR-RC-SUBLEDGER-AP-AR-reuse-sanction.md) acabou de sancionar tratá-los como par;
endurecer metade deixa o aging com um lado nullable e o outro não, e custa um segundo rebuild.
**PENDENTE.**

### F-NN4 — O que a migração faz se a asserção achar NULL

| | Caminho |
|---|---|
| **(a)** | re-rodar o backfill idempotente **e então** asserir; abortar só se ainda sobrar |
| (b) | asserir direto; qualquer NULL aborta e exige intervenção manual antes |

**Recomendação: (a).** O backfill é comprovadamente idempotente (`INSERT OR IGNORE` +
`WHERE counterpartyId IS NULL`) e cobre justamente as linhas nascidas entre as duas migrações. (b)
transforma operação normal em incidente. **PENDENTE.**

### F-NN5 — O balde `(Sem contraparte)` do aging vira código morto

`AgingReportService.ts:25,279-284` agrupa `counterpartyId` NULL sob `NO_COUNTERPARTY_LABEL`.

| | Caminho |
|---|---|
| **(a)** | remover o balde e o rótulo |
| **(b)** | manter como defesa em profundidade |

**Recomendação: (b) manter.** O código continua compilando (`string` é atribuível a `string | null`),
custa zero, e um `?? NULL_GROUP_KEY` que nunca dispara é mais barato que um relatório que quebra se
algum dia uma linha legada aparecer. Registrar com comentário `ponytail:` dizendo que é inalcançável
por constraint. **PENDENTE.**

---

## 4. Pendente de validação externa

**Nenhum.** Este item não depende de regra contábil, fiscal ou legal — é integridade referencial de
subrazão. Não há artefato externo (PVA, RFB, contador) no caminho crítico.

## 5. Insumos ausentes

1. **Contagem real de `counterpartyId` NULL no `dev.db` populado** (`server/prisma/prisma/dev.db`) — não
   consultada nesta sessão; o worktree não carrega a base. É a primeira medição do implementador, e
   dimensiona F-NN4: se for zero, a Fase B é mecânica; se não for, a Fase A tem de vir antes e ser
   verificada em produção-de-dev.
2. **A branch `claude/nfe-fase-a` cria `Payable`?** Não verificável nesta sessão — a branch **não está
   em `origin`** (`git rev-parse origin/claude/nfe-fase-a` falha; ela é local do repositório principal).
   Se criar, o rebase obrigatório dela terá de fornecer contraparte. Não planejado aqui — é insumo a
   conferir no momento do rebase, que já está registrado como pré-requisito no §5.1 item 11.

## 6. Achados fora de escopo (registrados, NÃO planejados)

1. **FK `payables.expenseAccountId` `RESTRICT`→`SET NULL`** — risco latente já registrado no
   [§5.1 item 12](ACCOUNTING-MASTER-MAP.md) do master map. Mesma tabela, mesmo tipo de manobra
   (rebuild): há uma economia real em resolver os dois no **mesmo** rebuild. **Mas é frente própria** —
   exige ADR + sinal humano (ORCH-006), e o ADR desta autoriza só o `counterpartyId`. Se o dono quiser
   juntar, é decisão dele antes da implementação, não do implementador durante.
2. **FE: seleção de contraparte segue opcional** nos dois modais
   (`CreatePayableModal.tsx:119`). Sob F-NN1(a) isso continua correto — a contraparte passa a nascer do
   nome digitado. Vale um `FE-INCR-*` futuro para expor "esta contraparte foi criada automaticamente",
   mas nada quebra sem ele.
3. **`counterparties` não tem índice por `name`** — o `findByName` novo (contrato 2.3) vai usar o
   `@@unique([userId,unitId,type,name])`, que cobre o lookup. Sem ação.
