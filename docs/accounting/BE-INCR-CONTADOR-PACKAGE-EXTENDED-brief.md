# BRIEF — BE-INCR-CONTADOR-PACKAGE-EXTENDED (nó C6b · pacote ampliado ao contador)

> **Estado: BRIEF pronto, 5 forks `RATIFICAÇÃO PENDENTE` (§3).** Nenhuma linha de código nasce deste
> documento antes da ratificação. Escrito em `sessao-planejamento` (2026-09-14, passo 5 de
> `PROXIMOS-PASSOS-2026-09-14.md`), **depois** do merge de C6 (#305) como a fila exigia.

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** nó **C6b** do `GRAFO-DEPENDENCIAS-2026-09-11.md` (§1 linha C6b; §4 fila item 6):
  *"Pacote **ampliado** ao contador — balancete, razão, conciliação, amostra e demais demonstrativos,
  configurável. **Exige tabela filha + migração** (`AccountingDeliveryLog` tem 2 hashes fixos + 2 FKs de
  job + `@@unique([ecdJobId, ecfJobId, contactId])`)"*.
- **Autorização:** `CEDULA-DECISAO-2026-09-10-entrevista.md` resposta **8** — *"Faltam todos esses e mais —
  temos que ter todos os possíveis"* → *"F-CD3 REABERTO e ampliado: balancete, razão, conciliação, amostra
  e demais demonstrativos entram no pacote, configurável"* + **CORREÇÃO 2026-09-10** (tabela filha +
  migração, não só conteúdo). Sessão autorizada por `PROXIMOS-PASSOS-2026-09-14.md` passo 5. Preferência
  registrada do dono (2026-09-07): *cobrir todas as lacunas, não MVP* — o BRIEF cobre o universo pedido;
  o que não tem gerador hoje entra como comportamento com fork, não some.
- **Insumos existentes (lidos nesta sessão):**
  - `server/prisma/schema.prisma` `model AccountingDeliveryLog`: `ecdJobId`/`ecfJobId` (FK
    `AccountingDataExchangeJob`, `onDelete: Restrict`), `manifestSha256Ecd`/`Ecf` fixos, `periodStart/End`
    copiados do job, `status QUEUED|SENT|FAILED`, `@@unique([ecdJobId, ecfJobId, contactId])`,
    `@@index([userId, unitId, periodStart])`.
  - `server/src/features/accounting/models/AccountingDelivery.model.ts:30-70` — `DeliveryManifest {
    scope, period, contactId, files: DeliveryManifestFile[] {kind, jobId, sha256}, generatedAt }`;
    `buildDeliveryManifest` é **pura** e já modela `files[]` — a lista é fixa em 2 só na chamada.
  - `server/src/features/accounting/services/AccountingDeliveryService.ts:96-125` (`buildDeliveryPackage`:
    `resolveJobs(ecdJobId, ecfJobId)` + `assertPeriodHardClosed` F-CD7-a + manifesto sem destinatário),
    `:126-210` (`confirmDelivery`: idempotência pela chave única, `markSent`, eventos
    `delivery.package_built/sent/failed`), `:269` (job sem `sha256` → 400).
  - `server/src/features/accounting/dtos/AccountingDeliveryDto.ts:24-45` — `BuildDeliveryPackageSchema {
    unitId, ecdJobId, ecfJobId }`, `ConfirmDeliverySchema { …, contactId, confirmed: true }`.
  - Rotas em `server/src/routes/docs.paths.ts` (4 paths): `POST /api/accounting/delivery/build` (l.4133),
    `/confirm` (4154), `/{id}/retry` (4176), `GET /{id}` (4198).
  - `AccountingDataExchangeJob.periodStart/periodEnd DateTime?` **já existem** (`schema.prisma:629-630`,
    migração `20260910180000_job_period_covered`), preenchidos pela geração SPED (`SpedGenerationService.ts:129`,
    `SpedEcfGenerationService.ts:175`) e exigidos por `resolveJobs` (`AccountingDeliveryService.ts:268-272`).
    **Os exports de relatório NÃO os preenchem** (`grep periodStart DataExchangeExportService.ts` = 0) — é isso
    que F-C6b-3 trata; **zero migração** no job.
  - `server/src/features/accounting/models/DataExchange.model.ts:14-32` — `EXPORT_KINDS`:
    `EXPORT_TRIAL_BALANCE` (balancete), `EXPORT_GENERAL_LEDGER` (razão), `EXPORT_BALANCE_SHEET` (BP),
    `EXPORT_INCOME_STATEMENT` (DRE), `EXPORT_IMPORT_ERRORS`, `EXPORT_TEMPLATE`, `EXPORT_SPED_ECD`,
    `EXPORT_SPED_ECF`, `EXPORT_SPED_ECF_REAL`; coluna `kind` é String (ADR-ECD D1) ⇒ **kind novo = zero
    migração**. `DataExchangeDto.ts:15-21` `IMPLEMENTED_EXPORT_KINDS` (os 4 relatórios + template).
    **Não existe** export de conciliação nem de amostra.
  - `server/src/features/accounting/services/ReconciliationService.ts` — conciliação bancária existe
    (`importStatement` OFX/CNAB/planilha, `autoMatchStatement`, `suggestions`, relatório de pendências
    `PendingReportQueryDto`) — é a fonte do "conciliação" do pacote.
  - `docs/accounting/BE-INCR-CONTADOR-DELIVERY-brief.md` + `docs/adr/ADR-CONTADOR-DELIVERY.md` — F-CD3
    (a) era "ECD+ECF+manifesto, sem PDF-resumo"; F-CD4 (a) manifesto+hash sem cópia; F-CD6 (a) sha256
    lido do job; F-CD7 (a) `HARD_CLOSED`.
- **Nós vizinhos:** consome C6 ✅ (#305), exports ✅ (data-exchange Fase 3), conciliação ✅
  (`ReconciliationService`), C11 ⏳ (se F-C11-3 → a, a entrega exige sign-off — o gate lê o **pacote**,
  então C6b tem de manter a chave que C11 vai olhar). Consumido por: contador (humano), FE-INCR-DELIVERY.

---

## 1. O que o nó é

Generalizar o pacote de **2 arquivos fixos** para **N itens** (`AccountingDeliveryItem`, tabela filha com
FK ao job e `sha256` copiado), mantendo ECD+ECF como **núcleo obrigatório**, e cobrir o universo da
resposta 8: balancete, razão, BP, DRE (já exportáveis), **conciliação bancária** e **amostra de
lançamentos** (exports novos), com composição **configurável** por entrega. Manifesto continua puro, hash
por item lido do job (F-CD6-a), nada copiado (F-CD4-a). **Não é:** PDF-resumo (F-CD3 continua sem PDF),
transporte (o dono envia — F-CD1-a), nem revisão (C11).

## 2. Checklist de comportamentos

**Bloco A — tabela filha e migração**

1. **`AccountingDeliveryItem`** Prisma first-class: `{ id, deliveryId (FK AccountingDeliveryLog, onDelete:
   Restrict), jobId (FK AccountingDataExchangeJob, Restrict), kind (ExportKind, String), sha256, position
   Int, createdAt }`, `@@unique([deliveryId, jobId])`, `@@index([deliveryId, position])`. Migração
   **aditiva**; `npm run smoke:migration` obrigatório (`accounting_delivery_logs` do `dev.db` real está
   vazia — S6 PASS será vacuoso, declarar).
2. **Backfill dos pacotes existentes** (F-C6b-1): cada `AccountingDeliveryLog` existente ganha 2 itens
   (ECD `position 0`, ECF `position 1`) copiando `ecdJobId/manifestSha256Ecd` e `ecfJobId/…Ecf`.
   Idempotente por `@@unique([deliveryId, jobId])` — 2ª passada não duplica (classe
   `migracao-sqlite-nao-e-transacional`: `INSERT … WHERE NOT EXISTS`).
3. **As colunas fixas ficam** (F-C6b-1 → a): `ecdJobId`/`ecfJobId`/`manifestSha256*` continuam sendo o
   núcleo obrigatório e a chave de idempotência; os itens filhos são os **extras**. Invariante guardado
   por teste: todo delivery tem itens `position 0/1` iguais às colunas fixas.
4. **Manifesto N-ário**: `buildDeliveryManifest` recebe `items: Array<{kind, jobId, sha256}>` (ECD, ECF
   e extras, em `position`); `files[]` já tem o shape, mas `kind: DeliveryFileKind` é união fechada
   `DELIVERY_FILE_KINDS = ['ECD','ECF']` (`AccountingDelivery.model.ts:21-22`) → passa a `ExportKind`
   (o núcleo continua `EXPORT_SPED_ECD`/`EXPORT_SPED_ECF`). Snapshot do manifesto para 2 e para 6 itens.

**Bloco B — composição configurável**

5. **`BuildDeliveryPackageSchema` ganha `extraJobIds: string[]` (≤ 20, `.strict()`)**: cada id resolve
   por `findJobById(scope, id)` (404 cross-tenant, nunca 403), tem de ser `EXPORTED` com `sha256`, `kind`
   ∈ `DELIVERABLE_EXPORT_KINDS` (§4) e **mesmo `unitId`**; período do extra ⊆ período do pacote (F-C6b-3
   diz como o período do extra passa a ser gravado — as colunas existem, os exports não as preenchem). Duplicata de
   `kind` no mesmo pacote → 400 `DUPLICATE_KIND`.
6. **Perfil de pacote por contato** (F-C6b-2): `AccountingContact.packageProfile: Json?` com a lista de
   `kind` que a UI pré-marca (`["EXPORT_TRIAL_BALANCE","EXPORT_GENERAL_LEDGER",…]`); `GET
   /delivery/profile?contactId=` devolve; `PUT` grava (DTO `.strict()`, enum fechado). O perfil é
   **sugestão**, não gate — o corpo do `build` é a verdade.
7. **Idempotência com extras** (F-C6b-4): chave continua `(ecdJobId, ecfJobId, contactId)`; `confirm`
   com o mesmo núcleo e extras **diferentes** → 409 `PACKAGE_ALREADY_DELIVERED` com o `deliveryId`
   (re-entrega = nova geração do núcleo, nunca "acrescentar item a pacote SENT").
8. **Eventos de auditoria**: `delivery.package_built` ganha `itemCount` e `kinds[]` (allowlist de
   `auditCanonical.ts` **na mesma mudança**; `sha256Ecd`/`sha256Ecf` **ficam** como hoje (`auditCanonical.ts:139`),
   os `sha256` dos extras **não** entram no payload — já estão na linha filha);
   sem eventType novo.

**Bloco C — os relatórios que faltam (exports novos, `DataExchangeExportService`)**

9. **`EXPORT_BANK_RECONCILIATION`** (conciliação): por `unitId` + janela `[periodStart, periodEnd]`;
   colunas: extrato (banco, conta, data, valor, histórico), lançamento casado (`entryNumber`, conta,
   `matchType`), pendências (linhas sem match + postings sem linha) — fonte
   `IReconciliationRepository` (relatório de pendências já existe). CSV/XLSX como os demais.
10. **`EXPORT_ENTRY_SAMPLE`** (amostra): `n` lançamentos por conta de resultado + `n` por conta
    patrimonial com movimento, escolhidos por **semente determinística** (`seed` no DTO → mesma amostra
    reproduzível pelo contador), com `sourceType/sourceId` e o documento de origem (`entry.source_recorded`).
    F-C6b-5 fixa o critério de amostragem.
11. **"Demais demonstrativos"**: BP e DRE já existem (`EXPORT_BALANCE_SHEET`, `EXPORT_INCOME_STATEMENT`).
    DMPL/DFC/notas **não existem** → §6 (frente própria com ADR; não cabe em "pacote").
12. Cada export novo entra em `IMPLEMENTED_EXPORT_KINDS`, no `docs.paths.ts` (enum do `kind`), no
    snapshot de DTO e no guard de path-count (paths inalterados; `docs:generate` regenera o enum).

**Bloco D — camadas e gates**

13. Cadeia completa para as rotas novas (`/delivery/profile` GET/PUT): route (`index.ts` +
    `docs.paths.ts`) → controller → `AccountingDeliveryService` → `IAccountingDeliveryRepository`
    (métodos novos `createItems(tx)`, `listItems`) → Prisma; policy `canManageAccountingContact` reusada.
    Repositório de contato ganha `updatePackageProfile`.
14. Gates: `tsc`×2 · `test:integration` · snapshot de DTO · `docs:generate` (+1 path, 2 operações) · `smoke:migration`
    · allowlist de auditoria · review independente.

## 3. Forks — RATIFICAÇÃO PENDENTE

| # | Pergunta | Caminhos | Recomendação (não-vinculante) |
|---|---|---|---|
| **F-C6b-1** | Colunas fixas ECD/ECF | (a) **ficam** como núcleo + chave; itens filhos = extras (migração só aditiva + backfill 2 itens) · (b) tudo vira item; `ecdJobId/ecfJobId/manifestSha256*` viram nullable e depois somem (2 migrações, rebuild da tabela no SQLite) | **(a)** — zero rebuild, C11 (F-C11-3) e o `@@unique` continuam lendo o par; (b) é limpeza sem demanda e reabre `migracao-sqlite-nao-e-transacional` |
| **F-C6b-2** | Onde mora "configurável" | (a) perfil por **contato** (`AccountingContact.packageProfile`) · (b) perfil por **escopo** (tabela nova) · (c) só no corpo do `build` (sem persistência) | **(a)** — o contador é quem pede o conjunto; 1:N contatos por escopo já existe (F-CD5-a). (c) é MVP, contra a preferência do dono |
| **F-C6b-3** | Como validar que o extra cobre o período do pacote, se os exports de relatório não gravam `periodStart/End` (colunas já existem no job) | (a) `DataExchangeExportService` passa a **gravar** as colunas existentes nos exports de relatório (`asOf`/janela do DTO → período; **zero migração**) · (b) inferir do `originalName` (frágil, achado do C6) · (c) não validar período dos extras | **(a)** — reusa a coluna que a geração SPED já preenche; (b) foi rejeitado no C6; (c) deixa balancete de 2025 entrar em pacote de 2026 em silêncio |
| **F-C6b-4** | Idempotência com extras diferentes | (a) chave inalterada; núcleo já entregue → 409 nomeado · (b) chave vira hash do conjunto (núcleo+extras) — permite 2 pacotes do mesmo par | **(a)** — "pacote" é o par assinado; extras diferentes = pedido do contador por fora ou nova geração |
| **F-C6b-5** | Critério da amostra | (a) `n` por conta (resultado + patrimonial com movimento), semente determinística · (b) `n` aleatório global · (c) top-N por valor | **(a)** — reproduzível e cobre o plano; (c) ignora lançamentos pequenos, onde erro se esconde |

## 4. Contratos esboçados

```ts
export const DELIVERABLE_EXPORT_KINDS = [
  'EXPORT_TRIAL_BALANCE','EXPORT_GENERAL_LEDGER','EXPORT_BALANCE_SHEET','EXPORT_INCOME_STATEMENT',
  'EXPORT_BANK_RECONCILIATION','EXPORT_ENTRY_SAMPLE',
] as const;                                              // SPED nunca é "extra": é o núcleo

export const BuildDeliveryPackageSchema = z.object({
  unitId: z.string().min(1), ecdJobId: z.string().min(1), ecfJobId: z.string().min(1),
  extraJobIds: z.array(z.string().min(1)).max(20).default([]),
}).strict();
export const PackageProfileSchema = z.object({ kinds: z.array(z.enum(DELIVERABLE_EXPORT_KINDS)).max(20) }).strict();
export const EntrySampleExportSchema = ExportRequestSchema.extend({
  kind: z.literal('EXPORT_ENTRY_SAMPLE'), periodStart: dateOnly, periodEnd: dateOnly,
  perAccount: z.number().int().min(1).max(50).default(5), seed: z.string().min(1).max(64),
}).strict();
```

```prisma
model AccountingDeliveryItem {
  id         String  @id @default(cuid())
  deliveryId String
  delivery   AccountingDeliveryLog     @relation(fields: [deliveryId], references: [id], onDelete: Restrict)
  jobId      String
  job        AccountingDataExchangeJob @relation("DeliveryItemJob", fields: [jobId], references: [id], onDelete: Restrict)
  kind       String  // ExportKind
  sha256     String  // lido de job.sha256 (F-CD6-a)
  position   Int
  createdAt  DateTime @default(now())
  @@unique([deliveryId, jobId])
  @@index([deliveryId, position])
  @@map("accounting_delivery_items")
}
// F-C6b-2 (a): AccountingContact { packageProfile Json? }
```

## 5. Pendente de validação externa / insumos ausentes

1. **Linha ao contador:** *"quais demonstrativos e em que formato (CSV/XLSX) o senhor quer junto da
   ECD/ECF; conciliação bancária e amostra de lançamentos servem?"* — entra no pedido do passo 11.
2. **Amostra** (item 10): critério de amostragem contábil não tem norma citável no corpus (NBC TA 530 —
   amostragem em auditoria — **não está** em `fontes-oficiais/`); o comportamento entra com F-C6b-5
   como decisão do dono, não como regra de domínio.
3. `accounting_delivery_logs` vazia no `dev.db` real → o backfill (item 2) só se prova em fixture; S6 do
   smoke gate passa vacuamente (`smoke-gate-s6-x-migracao-de-dado`).

## 6. Achados fora de escopo

1. **DMPL / DFC / notas explicativas** — não existem como relatório; frente própria com ADR (e o
   tie-out com a ECD, que hoje não tem J100/J150 de DMPL).
2. **PDF-resumo** — F-CD3 (a) continua "sem PDF"; se o contador pedir, reabre F-CD3, não C6b.
3. **Transporte automático** (e-mail/webhook) — F-CD1 (a) "dono envia" segue.
4. **Perfil de pacote por escopo** (F-C6b-2 b) — só se >1 contato por escopo divergir na prática.

## 7. Gates de envio do PR de implementação

`cd server && npx tsc --noEmit && npm run test:integration` · snapshot de DTO · `docs:generate` (+1 path / 2 ops,
enum do `kind`) · `smoke:migration` (declarar S6 vacuoso) · allowlist de auditoria (`itemCount`, `kinds`)
· review independente PASS · OPS-001 com adversarial (sugestão: extra de outro `unitId` → 400; 2º `confirm`
com extras diferentes → 409 com o mesmo `deliveryId`; backfill rodado 2× → mesma contagem de itens).
