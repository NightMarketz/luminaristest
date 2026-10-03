# BRIEF — BE-INCR-UNIT-REKEY-LACUNAS (nó I1b): correção das lacunas L-RK-1..5 do CLI de re-key

> **Status:** BRIEF pronto. **Forks: 9/9 ratificados** em 2026-10-03 (8 da entrevista + F-RKL-1 aberto pelo detalhamento)
> ([`D-2026-10-03-I1B-LACUNAS-L-RK`](../plano/decisoes/D-2026-10-03-I1B-LACUNAS-L-RK.md)). **Não tem "executa"** (o
> dono respondeu *"Só o BRIEF agora"*). A `sessao-feature` só roda com autorização de código citável.
> Produzido em `sessao-planejamento`, 2026-10-03.

## 0. Contexto fixo

- **Item:** lacunas L-RK-1..5 do nó [`I1b`](../plano/nos/I1b.md), registradas em
  [`ADR-INCR-UNIT-REKEY-migration.md`](../adr/ADR-INCR-UNIT-REKEY-migration.md) §10 e no
  [`GAP-MAP`](../operating-manual/GAP-MAP.md) item 16. Origem: implementação e review independente do PR #480
  (veredito PASS-COM-RESSALVAS).
- **Autorização:** dono, chat, 2026-10-03: *"Me faz a entrevista pra documentar e criar os briefs das lacunas"*. Cobre
  a entrevista e o BRIEF. **Não cobre o código.**
- **Entrega (ratificada):** **PR novo, depois do merge do #480**, a partir de `origin/main`. Não entra no #480.
- **Insumos (fato consumado — respeitar):**
  - `server/src/jobs/rekeyLegacyUnitCli.ts` do #480: `classify`, `apply` (1 `$transaction`, `onTableRekeyed` como
    costura de teste), `verify`, `tableDigest`, `CliError`, `ApplyOptions`.
  - `server/src/jobs/__tests__/rekeyLegacyUnitCli.integration.test.ts` (8 testes; o fixture cria o dono pelo
    onboarding `beautySalon`, que instala `products` e `productUnits`).
  - `scripts/rekey-legacy-unit.mjs` `--self-check`. O legado dele **não tem trilha de auditoria**, o caso da L-RK-3.
  - Inventário: **48 models** com `unitId` = 46 REKEY + 2 KEEP. `ProductDestinationDefault` (#481) foi classificado
    REKEY e o dono confirmou.
  - Fato medido em 03/10 (DMMF): **duas tabelas REKEY não têm `id`**. A chave primária delas inclui o `unitId`:
    `journal_entry_sequences` `@@id([userId, unitId, fiscalYear])` e `fiscal_document_sequences`
    `@@id([userId, unitId, kind, serie])`. Toda outra tabela REKEY tem `id` cuid.
- **Nós vizinhos:** I6 depende do I1b executado (F-RK-12 a). O runbook `RUNBOOK-I1B-UNIT-REKEY.md` passo 7 só vale
  como prova depois deste incremento.

## 1. Checklist de comportamentos

**L-RK-1 → (a) exit 2**

1. **Sem `--backup-path`, exit 2.** O contrato do §5 fica como está, e o código não muda. O teste do item 15 passa a
   asserir `code === 2` (hoje assere só `≠ 0`). A emenda do texto do item 15 do ADR já foi feita nesta sessão (§10).

**L-RK-4 → (a) gate dentro da tx**

2. **Re-key vazio aborta dentro da tx.** Em `apply`, depois do laço de UPDATEs e **antes** da âncora:
   `Σ before = 0` → rollback (nem a linha de `units` nem os plugins ficam) e o resultado é `NOTHING_TO_DO`, exit 0.
   O pré-check de fora da tx continua como está: ele é preflight; a decisão vale dentro da tx (classe
   `authoritative-gate-inside-tx`).
   - **Teste:** costura `onBeforeTx` em `ApplyOptions` (só para teste, como a `onTableRekeyed`). Ela move as linhas
     do legado entre o preflight e a tx. Asserções: `NOTHING_TO_DO`, contagem de `units` igual, nenhum
     `unit.rekeyed` novo, nenhum pipeline semeado.

**L-RK-5 → (b) `DELETED_REAL_UNIT`**

3. **Classe nova no `classify`.** Se o `unitId` é id de uma linha de `units` **do mesmo dono** com
   `deletedAt IS NOT NULL`, o status é `DELETED_REAL_UNIT`. A precedência: real viva do mesmo dono → `SKIP_REAL_UNIT`;
   linha de `units` de outro dono (viva **ou** apagada) → `UNIT_OWNER_MISMATCH` (exit 1, como hoje para a viva);
   apagada do mesmo dono → `DELETED_REAL_UNIT`; depois `EXCLUDED_TENANT` / `LEGACY`.
   - O `MISMATCH` também para linha apagada de outro dono foi ratificado em F-RKL-1 → (a).
4. **`--plan` lista e `--apply` recusa.** O `--plan` mostra `DELETED_REAL_UNIT` (exit 0). O `--apply` sai com exit 1 e
   `CliError(1, 'DELETED_REAL_UNIT')`, sem escrever nada.
   - **Teste:** dono com uma `units` apagada e linhas contábeis sob o id dela. Asserções: plan com o status, apply com
     exit 1, digest do banco idêntico.

**L-RK-2 → (a) linha a linha + L-RK-3 → (b) pares inferidos pelo diff** (um mecanismo só no `verify`)

5. **Pares inferidos.** Nas tabelas REKEY **com `id`**, casar pré × pós por `id`. Toda linha cujo `unitId` mudou gera
   um par `(dono, from = unitId pré, to = unitId pós)`. Os pares são deduplicados.
   - **Linha do pré sem correspondente no pós, ou linha do pós sem pré:** falha `(b) linhas criadas/removidas`. O
     re-key não cria nem apaga linha contábil.
   - O `rekeyed` do relatório passa a ser estes pares, com `rows` (o total de linhas movidas). Ele **não** depende
     mais de `unit.rekeyed`.
6. **Validade de cada par.** Um par só passa se:
   - (i) o dono é o mesmo nos dois lados (mudar `userId` é falha);
   - (ii) `to` é uma linha de `units` **do dono**, viva no pós e **ausente no pré**;
   - (iii) `from` não é linha viva de `units` no pré;
   - (iv) no pós, **zero** linhas REKEY sob `(dono, from)`. Isto pega a "conta devolvida ao legado" do revisor.

   Linha cujo `unitId` mudou para algo que não satisfaz (ii) — o `HIJACKED` do revisor — é falha.
7. **Multiconjunto exato em toda tabela REKEY, inclusive as duas sem `id`.** O esperado é o pré com o `unitId`
   substituído pelos pares do item 5, aplicados a `(dono, from)`. O esperado tem de ser **igual** ao pós como
   multiconjunto de linhas completas (JSON estável, **incluindo** `unitId`, independente de ordem).
   - Isto substitui o 17(b) "hash sem `unitId`".
   - **Falso vermelho declarado:** um legado que só tenha linhas nas duas tabelas sem `id` não gera par no item 5, e o
     multiconjunto acusa a diferença. É o lado seguro.
8. **Comparações independentes da ordem.** As comparações (a) e (b) usam multiconjunto de JSON estável ordenado, não
   `ORDER BY rowid`. A cópia (`VACUUM INTO` / `db:backup`) pode renumerar rowid de tabela sem `INTEGER PRIMARY KEY`.
   - **Inferido** da documentação do SQLite; não foi observado divergindo no #480.
9. **Âncora coerente com os pares.**
   - Para cada par cujo `(dono, from)` tinha cabeça em `audit_chain_heads` no pré: exatamente **um** `unit.rekeyed`
     novo em `(dono, to)`, `seq = 1`, payload `fromUnitId = from` e `fromHeadHash`/`fromNextSeq` iguais aos da
     cabeça do pré.
   - Par sem cabeça no pré: **nenhum** evento (leitura `auditAnchor: null`, mantida).
   - Evento novo que não corresponda a um par: falha.
   - O item (e) (`verifyAuditChain` legado igual ao pré e o novo `ok`) roda para **todo** par.
10. **(a) / (c) / (d) sem mudança de regra.** O `dynamic_table_data` continua com "pré intacto + acréscimos contados".
    Passa a exigir que **cada** `to` esteja entre os acréscimos.

**Lacuna de teste (sem fork)**

11. **Estoque semeado para a unidade nova (item 8 do ADR).** No teste de integração "itens 8–17", criar 1 linha de
    `products` antes do `--apply`. Asserção: uma linha em `productUnits` com `unitId = to` e `stock = 0`.
    - O que o `UnitAutoStockPlugin` faz foi verificado por leitura de `UnitAutoStockPlugin.ts`; o teste é o que vai
      prová-lo em execução.

**Testes-guarda dos cenários do revisor** (vermelhos contra o `verify` do #480, verdes depois; o par
vermelho→verde vai no mesmo PR, `protocolo-conserto-de-gate`)

12. **P1a — conta devolvida ao legado depois do apply.** O `--verify` sai com exit 1 e a falha cita a regra (iv).
13. **P1b — `unitId` de linha de **outro dono** trocado para `HIJACKED`.** O `--verify` sai com exit 1 e a falha
    cita a regra (ii) ou o par inválido.
14. **P2 — legado sem trilha.** O `--verify` sai com exit 0 e `rekeyed` contém o par, com `rows` > 0.
15. **Self-check.** O `rekey-legacy-unit.mjs --self-check` passa a asserir `rekeyed.length === 1` no verify. O legado
    dele não tem trilha, então isto prova o item 14 no fluxo real do wrapper.

**Fechamento**

16. **Gates.**
    - `cd server && npx tsc --noEmit`;
    - `npx jest --selectProjects integration --runInBand --testPathPatterns rekeyLegacyUnitCli`;
    - `node scripts/rekey-legacy-unit.mjs --self-check`.
    - Sem DTO HTTP, rota, OpenAPI ou i18n. Sem eventType novo, então a allowlist fica intacta.
17. **Rastreio.** O GAP-MAP item 16 é atualizado, com status e comando por L-RK. O §10 do ADR registra "FECHADO" com
    o PR. O fold do nó I1b fica para depois do merge.

## 2. Contratos (delta sobre o §5 do ADR)

```ts
// rekeyLegacyUnitCli.ts
export type PlanStatus = 'SKIP_REAL_UNIT' | 'DELETED_REAL_UNIT' | 'LEGACY' | 'EXCLUDED_TENANT';   // L-RK-5

export interface ApplyOptions {
  onTableRekeyed?: (table: string, index: number) => void | Promise<void>;   // já existe (#480)
  onBeforeTx?: () => void | Promise<void>;                                   // NOVO, só teste (item 2)
}

export type ApplyOutcome =
  | { status: 'NOTHING_TO_DO' | 'SKIP_REAL_UNIT' }    // NOTHING_TO_DO agora também sai do gate in-tx (item 2)
  | { status: 'APPLIED'; result: ApplyResult };

export interface VerifyReport {
  ok: boolean;
  failures: string[];
  rekeyed: { ownerUserId: string; from: string; to: string; rows: number; anchored: boolean }[];   // inferido (item 5)
  dynamicTableDataAdded: Record<string, number>;
  checks: Record<string, string>;
}

// exit codes: 0 ok / NOTHING_TO_DO / SKIP_REAL_UNIT · 1 pré-condição (…, DELETED_REAL_UNIT) · 2 args (inclui sem --backup-path)
```

## 3. Forks

Ratificados (9/9, `D-2026-10-03-I1B-LACUNAS-L-RK`): L-RK-1 (a) · L-RK-2 (a) · L-RK-3 (b) · L-RK-4 (a) · L-RK-5 (b) ·
`ProductDestinationDefault` REKEY · PR novo depois do merge do #480 · só o BRIEF (sem "executa").

**Fork aberto pelo detalhamento e ratificado na mesma sessão:**

- **F-RKL-1 · linha de `units` APAGADA de outro dono.** Hoje o `UNIT_OWNER_MISMATCH` olha só linha viva. Opções:
  - (a) também `UNIT_OWNER_MISMATCH`, exit 1 (**recomendada**: id de unidade de outro tenant sob este dono é
    inconsistência, viva ou não);
  - (b) ignorar a linha apagada e seguir a classificação normal (`LEGACY`).
  - ✅ **RATIFICADO 2026-10-03 → (a).** Resposta do dono: *"Recusar também (Recomendado)"*.

## 4. Pendente de validação externa

Vazia. Nenhuma regra contábil, fiscal ou legal: o `unitId` é chave de escopo.

## 5. Insumos ausentes

1. **Renumeração de rowid na cópia.** O item 8 se apoia na documentação do SQLite (VACUUM pode mudar rowid de tabela
   sem `INTEGER PRIMARY KEY`); não foi medido sobre `npm run db:backup`. O item 8 torna a questão irrelevante, por
   isso não bloqueia.

## 6. Achados fora de escopo

- O ADR continua com o status "Proposed" no cabeçalho, embora tenha 12/12 forks + §10 fechados. Fica para o fold.
- `CounterpartyBackfill.integration.test.ts` estoura o `beforeAll` (180 s, cerca de 50 migrações via `prisma db
  execute`) no Windows, rodando sozinho. Não foi planejado aqui.
