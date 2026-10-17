# BE-INCR-DT-VERSION-LEDGER — ledger de versões das DynamicTables (BRIEF)

**Sessão:** `sessao-planejamento` · **Data:** 2026-10-17 · **Nó:** [[BE-INCR-DT-VERSION-LEDGER]] (`docs/plano/nos/`)
**Saída:** este documento. Nenhum código. Código exige `executa` próprio do dono.

## 0. Formulário

- **Item a planejar:** ledger de versões das tabelas dinâmicas — linhas (`DynamicTableData.data`) e estrutura
  (`DynamicTable.schema`). Frente nova, aberta pelo dono no chat de 17/10; não existia nó nem item no `destino/`.
- **Autorização:** dono, chat, 2026-10-17: *"Ledger de versões para as tabelas dinamicas"* + questionário do mesmo
  dia ([[D-2026-10-17-DT-VERSION-LEDGER]]): *"Linhas + schema (Recomendado)"* · *"Ver + diff + restaurar
  (Recomendado)"* · *"Append-only simples (Recomendado)"* · *"Só planejar o BRIEF (Recomendado)"*. Cobre **só o BRIEF**
  (sem código, sem `executa`). As três primeiras respostas são decisões de desenho (D1–D3 abaixo); não são forks.
- **Insumos (fato consumado, medido em `a1072c47`):**
  - `server/prisma/schema.prisma:312-343` — `DynamicTable` (`schema Json`, sem versão) e `DynamicTableData`
    (`data Json`, `deletedAt`, sem versão). Toda escrita sobrescreve no lugar.
  - `server/src/features/dynamicTables/repositories/DynamicTableRepository.ts` (cliente sem tx) e
    `TransactionalDynamicTableRepository.ts` (tx) — os **únicos** escritores das duas tabelas no código de aplicação:
    `createTable`, `updateTable` (só `name`), `updateTableSchema`, `deleteTable` (hard), `deleteTablesByUserId`,
    `createData`, `updateData`, `deleteData` (soft), `deleteAllDataByUserId` (hard).
  - Fora dos repositórios, um único escritor: `server/src/jobs/PurgeDeletedRecords.ts:34` — `deleteMany` de linhas
    soft-deletadas há mais de 90 dias. (`rekeyLegacyUnitCli.ts:395` faz `UPDATE` cru, mas só em tabelas com `unitId`;
    `dynamic_table_data` não tem a coluna.)
  - Chamadores: o `DynamicTableService` escreve linhas sempre pelo repo tx (`:620`, `:882`, `:1007-1076`); schema pelo
    repo sem tx em `:219` e `:313` e pelo repo tx em `:470-498`; `PresetSyncService.ts:299` cria tabela sem tx.
    **Plugins** escrevem pelo `ctx.repository` (14 sítios em `rules/plugins/**`: estoque, vendas, leads, comissões…).
  - Rotas: `server/src/routes/dynamic-tables.ts` → `@/controllers/dynamicTablesController`.
  - Policy: `IDynamicTablePolicy` (`canView`, `canManageData`).
  - Trilha existente: `AuditEvent` (hash-chain por `scopeUserId+unitId`) é da contabilidade; DT não tem `unitId` e
    não grava ali. **Não reusar** (D3).
  - Pesquisa legal: `pesquisas-legais/lgpd-versoes-dt/relatorio.md` — LGPD art. 16 caput e art. 18 VI.
- **Nós vizinhos:** consome o motor DT (sem contrato novo com módulo Prisma — fronteira §2.1 respeitada: o ledger é
  infraestrutura do próprio motor, não integração cross-módulo). Consumido por: FE do histórico (frente futura,
  ver §6) e, eventualmente, o agente de chat (fora de escopo).

## 1. Decisões já tomadas (dono, 17/10)

- **D1 — escopo:** versiona **linhas e schema**. Cada linha versionada guarda a versão do schema vigente na escrita.
- **D2 — uso:** listar versões, **diff** campo a campo e **restaurar**. Restaurar grava uma **versão nova** (nunca
  apaga nem reescreve histórico) e passa pelas validações e plugins normais da atualização.
- **D3 — integridade:** **append-only simples**, sem hash-chain. A versão é gravada **na mesma tx** da escrita da
  linha/schema; o repositório não expõe update nem delete de versão.

## 2. Checklist de comportamentos (cada um testável isoladamente)

**Persistência**

1. **Migração aditiva** (SQLite, prólogo defensivo — memória `migracao-sqlite-nao-e-transacional`):
   `DynamicTableRowVersion`, `DynamicTableSchemaVersion` e coluna `DynamicTable.schemaVersion Int @default(1)`.
   Nenhum backfill na migração (F-DTV-3). Teste: migração aplica em banco com dado e `schemaVersion` = 1 em toda tabela.
2. **Toda escrita de linha grava exatamente 1 versão, nos dois repositórios.** `createData` → `CREATE` (v1);
   `updateData` → `UPDATE` (vN+1); `deleteData` (soft) → `DELETE` com o snapshot no momento. O repo sem tx envolve
   escrita + versão em `$transaction`; o repo tx usa a tx recebida. Teste de **varredura de classe** (memória
   `idempotency-class-fix-discipline`): enumera os métodos de escrita de `IDynamicTableRepository` e falha se algum
   método novo não tiver caso — os dois repos × 3 operações.
3. **Toda escrita de schema grava exatamente 1 versão e incrementa `DynamicTable.schemaVersion`.** `createTable` → v1
   (`CREATE`); `updateTableSchema` → vN+1 (`UPDATE`). `updateTable` (só `name`) **não** versiona. Mesma regra de tx do
   item 2; cobre os 5 sítios do `DynamicTableService` e o do `PresetSyncService`.
4. **Número de versão sequencial por linha/tabela**, calculado dentro da tx (`max + 1`), protegido por
   `@@unique([dataId, version])` / `@@unique([dynamicTableId, version])`. Teste: 2 updates na mesma tx → v2 e v3;
   colisão forçada → P2002 e rollback da escrita da linha junto (prova de que é a mesma tx).
5. **Snapshot completo** (`data` inteiro após a operação) e `schemaVersion` da tabela no momento (F-DTV-2).
6. **Ator e origem** gravados em toda versão: `actorUserId` (null = sistema) e `origin` ∈ `DIRECT | RULE | SYSTEM`
   (F-DTV-1). Teste: venda criada pelo usuário → versão `DIRECT` na venda e versão `RULE` no saldo de estoque que o
   plugin atualizou, ambas com o mesmo `actorUserId`.
7. **Linha anterior ao deploy (sem versões):** no primeiro `updateData`/`deleteData` grava antes uma versão `BASELINE`
   com o `data` atual, depois a da operação (F-DTV-3). Idem para schema: `BASELINE` antes do primeiro
   `updateTableSchema` de tabela sem versão.
8. **Ciclo de vida segue a linha (LGPD art. 16 caput, art. 18 VI — `pesquisas-legais/lgpd-versoes-dt`):** FK com
   `onDelete: Cascade` para `DynamicTableData` e `DynamicTable` (F-DTV-4). Testes: purga de 90 dias
   (`PurgeDeletedRecords`), `deleteTable`, `deleteTablesByUserId` e `deleteAllDataByUserId` deixam zero versões
   órfãs. Soft-delete **não** apaga versões.
9. **`resetDb`** (`server/test/helpers/db.ts`, `templateDb.ts`) limpa as 2 tabelas novas na ordem das FKs.

**Leitura**

10. `GET /api/dynamic-tables/:tableId/data/:dataId/versions?page&limit` — metadados (sem `data`), mais nova primeiro,
    paginação padrão (`limit` ≤ 200). Policy `canView`; linha de outra tabela/usuário → 404. Linha soft-deletada
    **lista** (o histórico é justamente o que se quer ver depois de apagar).
11. `GET …/versions/:version` — snapshot + `schema` da versão de schema correspondente (para o FE renderizar com os
    rótulos da época). Versão inexistente → 404.
12. `GET …/versions/:version/diff?against=<n|current>` — diff calculado no BE por função **pura** (`diffRowVersions`):
    `[{ field, label, before, after, kind: 'added'|'removed'|'changed' }]`, só campos de topo de `data`; igualdade
    JSON profunda; campo que sumiu do schema aparece com `label` da versão antiga. `against` default = versão anterior
    (`v1` contra vazio). Teste unitário da função com campo novo, removido, igual, relação e dinheiro.
13. `GET /api/dynamic-tables/:tableId/schema-versions` e `…/schema-versions/:version` — lista e snapshot; diff de
    schema por campo (`added|removed|changed` por `name`) na mesma função pura ou irmã.

**Restauração**

14. `POST …/versions/:version/restore` — policy `canManageData`; chama o **mesmo caminho** de
    `DynamicTableService.updateTableData` com o snapshot (validação contra o schema **atual**, regras avançadas, gate
    de sobreposição dentro da tx, `beforeUpdate`/`afterUpdate`). A versão gravada é `RESTORE` com
    `restoredFromVersion`. Snapshot que não passa no schema atual → 400 com os erros de campo, nada gravado
    (sem coerção). Teste: restaurar v1 após 2 updates → v4 `RESTORE`, `data` = v1; plugins rodaram.
15. **Restaurar linha soft-deletada** → 409 `ROW_DELETED` (F-DTV-5).
16. **Schema não se restaura** pela API (F-DTV-6): sem rota de restore de schema.
17. **Campos de sistema não voltam pelo restore:** `__isSystem` continua removido como em toda atualização; o restore
    roda com `isSystem: false`.

**Camadas e gates**

18. Cadeia completa: rota (2 toques) → controller → `DynamicTableVersionService` (leitura + orquestração do restore
    chamando o `DynamicTableService` público) → `DynamicTableVersionRepository` (só leitura; a escrita das versões
    fica dentro dos repositórios de DT, item 2) → Prisma. Factory registra o serviço novo. DTOs Zod `.strict()` para
    params/query/resposta.
19. **Snapshot de shape dos DTOs** atualizado só com os DTOs novos (memória `dto-snapshot-update-reordena-no-windows`).
20. **OpenAPI:** +4 paths (`versions`, `versions/{version}`, `versions/{version}/diff`, `versions/{version}/restore`)
    +2 (`schema-versions`, `schema-versions/{version}`); atualizar a guarda de path-count no mesmo PR.
21. `auditCanonical.ts`: **nenhum** eventType novo (o ledger não grava em `AuditEvent`, D3) — o PR declara isso.
22. Gates: `npx tsc --noEmit` + `tsconfig.test.json`, `npm run check:arch` sem violação nova, `npm run test:integration`
    nos arquivos novos, `node scripts/plano-vault.mjs check`.

## 3. Contratos (esboço materializável)

```prisma
model DynamicTable {
  // … campos atuais …
  schemaVersion  Int  @default(1)
  schemaVersions DynamicTableSchemaVersion[]
}

model DynamicTableData {
  // … campos atuais …
  versions DynamicTableRowVersion[]
}

/// Append-only. Escrita só dentro dos repositórios de DT, na mesma tx da escrita da linha.
model DynamicTableRowVersion {
  id                  String           @id @default(cuid())
  dynamicTableId      String
  dynamicTable        DynamicTable     @relation(fields: [dynamicTableId], references: [id], onDelete: Cascade)
  dataId              String
  row                 DynamicTableData @relation(fields: [dataId], references: [id], onDelete: Cascade)
  version             Int
  op                  String           // BASELINE | CREATE | UPDATE | DELETE | RESTORE
  data                Json             // snapshot completo após a operação
  schemaVersion       Int
  actorUserId         String?          // sem FK: apagar usuário já apaga as tabelas (cascade) e com elas isto
  origin              String           // DIRECT | RULE | SYSTEM
  restoredFromVersion Int?
  createdAt           DateTime         @default(now())

  @@unique([dataId, version])
  @@index([dynamicTableId, createdAt])
  @@map("dynamic_table_row_versions")
}

model DynamicTableSchemaVersion {
  id             String       @id @default(cuid())
  dynamicTableId String
  dynamicTable   DynamicTable @relation(fields: [dynamicTableId], references: [id], onDelete: Cascade)
  version        Int
  op             String       // BASELINE | CREATE | UPDATE
  schema         Json
  actorUserId    String?
  origin         String       // DIRECT | SYSTEM
  createdAt      DateTime     @default(now())

  @@unique([dynamicTableId, version])
  @@map("dynamic_table_schema_versions")
}
```

```ts
// Contexto de escrita (F-DTV-1 a): passado no construtor dos dois repositórios.
type VersionWriteContext = { actorUserId: string | null; origin: 'DIRECT' | 'RULE' | 'SYSTEM' };

// DTOs (Zod .strict())
const RowVersionParams = z.object({ tableId: z.string().cuid(), dataId: z.string().cuid() }).strict();
const RowVersionNumberParams = RowVersionParams.extend({ version: z.coerce.number().int().min(1) }).strict();
const ListVersionsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).strict();
const DiffQuery = z.object({
  against: z.union([z.literal('current'), z.coerce.number().int().min(1)]).optional(), // default: versão anterior
}).strict();

type RowVersionMeta = {
  version: number; op: 'BASELINE' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  schemaVersion: number; actorUserId: string | null; origin: 'DIRECT' | 'RULE' | 'SYSTEM';
  restoredFromVersion: number | null; createdAt: string;
};
type RowVersionDetail = RowVersionMeta & { data: Record<string, unknown>; schema: ITableSchema };
type FieldDiff = { field: string; label: string; kind: 'added' | 'removed' | 'changed'; before: unknown; after: unknown };
type RowVersionDiff = { from: number | null; to: number | 'current'; changes: FieldDiff[] };

// Respostas
// GET  …/versions                     → { data: RowVersionMeta[]; total: number; page: number; limit: number }
// GET  …/versions/:version            → RowVersionDetail
// GET  …/versions/:version/diff       → RowVersionDiff
// POST …/versions/:version/restore    → IDynamicTableData (linha atualizada)  | 400 campos | 404 | 409 ROW_DELETED
// GET  /:tableId/schema-versions      → { data: SchemaVersionMeta[]; total }  (SchemaVersionMeta sem `schema`)
// GET  /:tableId/schema-versions/:v   → SchemaVersionMeta & { schema: ITableSchema }
```

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-DTV-1 — de onde vem o ator** | (a) `VersionWriteContext` no construtor dos repositórios; o serviço cria o repo `DIRECT` e entrega aos plugins uma instância `RULE` da mesma tx · (b) `AsyncLocalStorage` de request (infra nova, transversal) · (c) sem ator na V1 | **(a)** — explícito, testável, sem infra global; o padrão de construir o repo tx no serviço já existe (`DynamicTableService.ts:611`). (b) resolve mais coisas, mas é frente própria | PENDENTE |
| **F-DTV-2 — snapshot ou delta** | (a) snapshot completo por versão; diff calculado na leitura · (b) só o delta; reconstrução por replay | **(a)** — restore e leitura triviais, sem replay que quebra com schema mudado; custo é espaço (ver F-DTV-7) | PENDENTE |
| **F-DTV-3 — linhas que já existem** | (a) `BASELINE` preguiçoso na primeira escrita após o deploy · (b) backfill de v1 para toda linha na migração · (c) histórico começa na primeira escrita, sem estado anterior | **(a)** — não perde o estado anterior e não põe backfill na migração (memórias `smoke-gate-s6-x-migracao-de-dado` e `migracao-sqlite-nao-e-transacional`) | PENDENTE |
| **F-DTV-4 — versões quando a linha some de vez** | (a) cascade: purga/exclusão da tabela/da conta apaga as versões · (b) versões ficam (sem FK), como o `AuditEvent` | **(a)** — LGPD art. 16 caput e art. 18 VI (relatório em `pesquisas-legais/lgpd-versoes-dt`): versão antiga é o mesmo dado pessoal; DT é dado desenhado pelo usuário, não registro legal. A trilha legal (`AuditEvent`) segue sem cascade | PENDENTE |
| **F-DTV-5 — restaurar linha apagada** | (a) 409 `ROW_DELETED` na V1 · (b) restore desfaz o soft-delete (e as cascatas de exclusão que o `deleteData` disparou: itens de venda etc.) | **(a)** — desfazer exclusão com cascata é outro comportamento (reverter N linhas e efeitos de plugin); vira item próprio se o dono quiser | PENDENTE |
| **F-DTV-6 — restaurar schema** | (a) schema só lista/diff, sem restore · (b) restore de schema pelo caminho do `updateTableSchemaAsSystem` com revalidação | **(a)** — restaurar estrutura revalida todas as linhas e mexe em marcadores de preset/plugins; risco alto para pouco uso | PENDENTE |
| **F-DTV-7 — retenção / crescimento** | (a) guarda todas as versões na V1 e mede · (b) teto de N versões por linha · (c) não versionar escrita `RULE` (estoque muda a cada venda) | **(a)** — (c) faria o histórico mentir sobre o saldo; (b) sem medida é chute. Medir no seed de dev o nº de versões por venda e reavaliar | PENDENTE |

## 5. Pendente de validação externa

Nenhum. A única regra legal do item (ciclo de vida das versões com dado pessoal) tem artefato citado
(LGPD art. 16 caput, art. 18 VI — acervo ctresb/leis, compilada, sem alerta) e entrou como recomendação do F-DTV-4.

## 6. Insumos ausentes

- **Volume real por linha** (quantas escritas `RULE` uma venda dispara no seed): não medido; insumo do F-DTV-7.
- **Endpoint de leitura do schema por versão no FE**: o FE atual não tem tela de histórico; contrato do FE fica para a
  frente própria (§7).

## 7. Achados fora de escopo (não planejados)

- **FE do histórico** (`FE-INCR-DT-VERSION-LEDGER`): aba/drawer de versões na linha, diff visual, botão restaurar.
  Exige autorização própria.
- **Agente de chat** consultar/restaurar versões (tool call): frente própria do `chat-domain-generator`.
- **Desfazer exclusão** com cascatas (F-DTV-5 b) e **restaurar schema** (F-DTV-6 b), se o dono quiser.
- `updateTable` (renomear tabela) não entra no ledger — D1 fala em schema; se o nome também deve versionar, é emenda.

## 8. Fatiamento

1 PR (itens 1–22). Write set: `server/prisma/schema.prisma`, `server/prisma/migrations/<nova>/**`,
`server/src/features/dynamicTables/**`, `server/src/controllers/dynamicTablesController.ts` (ou controller novo
`dynamicTableVersionsController.ts`), `server/src/routes/dynamic-tables.ts`, `server/src/jobs/PurgeDeletedRecords.ts`
(só teste), `server/test/helpers/db.ts`, `server/test/helpers/templateDb.ts`, `server/public/openapi.json` e a guarda
de path-count. Registro: `server/src/lib/factory.ts`.
