---
id: "D-2026-10-19-DT-ARQUITETURA-CORRECOES"
tipo: "decisao"
dominio: "plataforma"
titulo: "Motor DynamicTable: verificação de arquitetura e correções (seam de tx no repositório, repositório único, engines de validação como implementação única, policy-first nos services de preset, hard delete por desenho)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-19: \"Verifique a arquitetura e faça todas as correções sugeridas e mais correções necessárias no DynamicTable\""
atualizado: "2026-10-19"
---
# D-2026-10-19-DT-ARQUITETURA-CORRECOES — correções de arquitetura do motor DynamicTable

**Estado:** `decided`
**Autorização:** dono, chat, 2026-10-19: *"Verifique a arquitetura e faça todas as correções sugeridas e mais correções
necessárias no DynamicTable"*. Cobre o backend do motor (`server/src/features/dynamicTables/**`, controller e factory).
**Não cobre** merge nem o frontend (R20–R22 da auditoria são do `my-app`, fora deste pedido).

## O que "sugeridas" quer dizer aqui

As correções sugeridas são as FALHAs do grupo A (`dynamicTables`) da
[auditoria de regressão arquitetural 2026-10](../../operating-manual/AUDITORIA-REGRESSAO-ARQUITETURAL-2026-10.md)
§2 — R1 (service importa o Prisma), R3 (services de preset sem policy), R4 (`new TransactionalDynamicTableRepository(tx)`
no service), R6 (hard deletes), R14 (`any` evitável) — mais as regras já sancionadas no Contrato §2 e nas memórias
`orchestration-service-tx-repo-smell` / `tx-nao-propagado-ao-repo`. As "mais necessárias" vieram da leitura do motor
(abaixo).

## Achados e decisões

| # | Achado (verificado por leitura + teste vermelho) | Decisão |
|---|---|---|
| 1 | `TransactionalDynamicTableRepository` era cópia de 380 linhas do `DynamicTableRepository` com **dois desvios reais**: `findRowsReferencingId` com `LIMIT 100` (o lote de delete rodava `checkDeleteRules` com ela → `RESTRICT_IF_AGGREGATE` subcontava, `CASCADE` deixava órfãos acima de 100; vermelho: `Expected: 150 / Received: 100`) e `findTablesReferencingTableId` sem `userId` (devolvia tabela de outro tenant) | **Classe apagada.** `DynamicTableRepository` é único; aceita client raiz ou de tx e expõe `withTransaction(tx)` e `runInTransaction(fn)` (reentrante). |
| 2 | `DynamicTableService` importava `lib/prisma` (R1, baseline L3) e instanciava o repo tx 7× (R4) | O service não conhece o Prisma: `this.repository.runInTransaction(...)` / `withTransaction(options.tx)`. Baseline do `check:arch` encolheu 32 → 31. `installPresetAsSystem` recebe o `tx` do seam só para o marco T0 (linha literal mantida — `proveP2ZeroDiffCli.SYMBOL_ALLOWLIST`). |
| 3 | `validation/SchemaValidator` e `validation/GovernanceEngine` existiam, os docs diziam que o service delegava a eles, mas o service tinha **cópia inline drifted** (o engine não tinha o fix do Zod 4 `.partial()` #385; o service não tinha a contagem indexada de `compositeUnique`) | Engines viram a **implementação única**; o service só orquestra. `SchemaValidator` ganhou `applyDefaults`; `GovernanceEngine` ganhou `assertNotImmutableForDelete`. `installPresetAsSystem` fica no service (o `PresetInstallerService` dos docs nunca existiu no git). |
| 4 | `compositeUnique` fazia `findAllDataByTableId` (full scan) apesar de `countByCompositeFieldValues` existir sem chamador (vermelho: `findAllDataByTableId` chamado) | Contagem indexada `json_extract`; booleano JSON comparado como 1/0. Dívida de `validation-and-governance.md §3` fechada. |
| 5 | GAP-MAP 8 TOCTOU (#390, aberto): `deleteTableData` lia as regras de delete fora da tx | `checkDeleteRules` roda dentro de `runInTransaction` com o repo tx-bound (mesmo desenho do lote #409). |
| 6 | R3: `PresetSyncService` e `ModuleInstallService` sem policy; o ADMIN-only vivia só no controller (vermelho: USER chegava ao repositório) | `DynamicTablePolicy.canAdministerPresets(user)` (ADMIN); os dois services consultam **antes de qualquer leitura**; os três controllers deixaram de repetir o check (403 vem do `ForbiddenError` do service). `PresetService` é catálogo estático sem ator — sem policy por desenho. |
| 7 | R6: `deleteTable`, `deleteTablesByUserId`, `deleteAllDataByUserId` são hard delete | **Por desenho, não dívida:** `DynamicTable` não tem `deletedAt`; apagar a definição é purga (reset/conta) e leva linhas e versões por cascade de FK (F-DTV-4 a, LGPD art. 16 caput / art. 18 VI). Declarado no JSDoc da interface. Soft-delete de tabela exigiria migração + filtro em toda leitura — fora deste pedido, sem demanda. |
| 8 | R14: 10 `as any` no motor (7 `(this.tx as any).$queryRaw`, `schema as any` ×2, `value: any`) + `console.*` no service | Zero `any` no motor fora do contrato (`Record<string, any>` do dado dinâmico nos DTOs); `logger` com contexto; log de validação sem payload (C4). |
| 9 | Métodos mortos no repositório (`findDataByTableIdPaged`, `countDataByTableId`, `getDataByTableId` — fora da interface, sem chamador) | Removidos (regra de ouro do REVIEW_BACKLOG §2.1: sem rota/chamador → remover). |
| 10 | `installPresetAsSystem` mutava `preset.tables` do chamador ao filtrar relações opcionais | Cópia de trabalho local; o preset recebido nunca é alterado. |

## Teste-vermelho → fix (OPS-006, por achado)

Sondas no estilo antigo (mock do `prisma` + da classe apagada) provaram P1–P5 vermelhos antes do diff; os testes-guarda
permanentes ficam em `DynamicTableRepository.txSeam.integration.test.ts` (P1, P2, reentrância, rollback),
`DynamicTableService.txSeam.test.ts` (P3, P4, seam) e `PresetAdmin.policyFirst.test.ts` (P5). Os três testes que mockavam
o módulo apagado (`transaction-rollback`, `transaction-aware-validation`, `batch-delete`) passaram a falsificar o seam do
repositório (`runInTransaction`/`withTransaction`) — o que eles provam não mudou.

## Fora do escopo (declarado)

- Frontend (R20–R22) e `ReportService` (R1) — outros módulos.
- Soft-delete de `DynamicTable` (ver #7).
- `docs/tech-debt/avoidable-any-remediation.md` é catálogo datado; as linhas da classe apagada ficam como histórico.
