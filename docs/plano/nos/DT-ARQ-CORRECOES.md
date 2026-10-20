---
id: "DT-ARQ-CORRECOES"
tipo: "motor"
dominio: "motor"
titulo: "Arquitetura do motor DynamicTable: seam de tx no repositório, repo único, engines como implementação única, policy-first nos presets"
estado: "inflight"
estado_detalhe: "PR #769 aberto, CI 14/14 verde (19/10); merge só com OK do dono por número. Decisão no próprio PR: docs/plano/decisoes/D-2026-10-19-DT-ARQUITETURA-CORRECOES.md (entra em main com o merge)"
autorizacao: "dono, chat, 2026-10-19: \"Verifique a arquitetura e faça todas as correções sugeridas e mais correções necessárias no DynamicTable\" — merge NÃO autorizado"
prs: ["#769"]
atualizado: "2026-10-19"
---
# DT-ARQ-CORRECOES — Arquitetura do motor DynamicTable: seam de tx no repositório, repo único, engines como implementação única, policy-first nos presets

**Estado:** `inflight` — PR #769 aberto, CI 14/14 verde (19/10); merge só com OK do dono por número. Decisão no próprio PR: docs/plano/decisoes/D-2026-10-19-DT-ARQUITETURA-CORRECOES.md (entra em main com o merge)  
**Autorização:** dono, chat, 2026-10-19: "Verifique a arquitetura e faça todas as correções sugeridas e mais correções necessárias no DynamicTable" — merge NÃO autorizado  
**Depende de:** —  
**PRs:** #769  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

## O que o PR fecha

Correções sugeridas = FALHAs do grupo A da [auditoria de regressão 2026-10](../../operating-manual/AUDITORIA-REGRESSAO-ARQUITETURAL-2026-10.md)
(R1, R3, R4, R6, R14) + Contrato §2. Cada uma com sonda vermelha antes do diff (saídas no corpo do PR):

1. `TransactionalDynamicTableRepository` apagada — era cópia com `LIMIT 100` no scan de referências do lote de delete e
   `findTablesReferencingTableId` sem tenant. Repositório único com `withTransaction`/`runInTransaction`.
2. Service sem `lib/prisma` (baseline do `check:arch` 32 → 31; supressão SANCTIONED do ledger C5 paga).
3. `SchemaValidator`/`GovernanceEngine` viram a implementação única (o service tinha cópia drifted).
4. `compositeUnique` por contagem indexada (fim do full scan).
5. GAP-MAP 8 TOCTOU: regras de delete lidas dentro da tx.
6. `canAdministerPresets` policy-first em `PresetSyncService`/`ModuleInstallService` (R3).
7. Zero `any` evitável no motor; `logger` no lugar de `console`.
8. R6 (hard delete de tabela): por desenho, declarado no JSDoc da interface.

## Resíduo (não está no PR)

- O motor ainda chama dois consumidores (KnowledgeGraph, KpiCache) — BRIEF `BE-INCR-DT-NO-CONSUMER-CALLS`
  (ver [[FILA-ORDEM]] E8).
- Trava de unicidade in-process (teto declarado).
