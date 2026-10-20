---
id: "BE-INCR-DT-NO-CONSUMER-CALLS"
tipo: "plataforma"
dominio: "motor"
titulo: "Tirar do motor DynamicTable as chamadas a consumidores (KnowledgeGraph e KpiCache)"
estado: "done"
estado_detalhe: "20/10 (executa): feito no #773 (empilhado no #769) — motor sem chat/analytics, efeitos pós-commit em features/integration, B7 + varredura; G2 fica como lacuna (I7 item 1). Merge só com OK do dono · 19/10: BRIEF escrito (sessao-planejamento) · forks F1–F8 RATIFICADOS na recomendação pelo dono (F1 = opção b) · execução de código NÃO autorizada (falta 'executa'). Base: claude/dynamictable-architecture-fixes-9e5ba8 (PR #769, OPEN)"
depende_de: []
autorizacao: "dono, chat, 2026-10-19: \"Autorizo BE-INCR-DT-NO-CONSUMER-CALLS com a opção (b); ratifico F1 (b) e demais forks na recomendação.\" — cobre planejamento e forks · **EXECUTA** (dono, chat, 2026-10-19): \"Já corrige aqui mesmo\" — implementação nesta sessão, empilhada no #769; sem merge"
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "forks F1–F8 abertos (mecanismo, tx externa, cobertura de G1/G3, erro silencioso, forma do guard, localização do helper); execução depende da escolha do dono"
write_set: ["server/src/features/dynamicTables/services/DynamicTableService.ts", "server/src/features/dynamicTables/services/PresetSyncService.ts", "server/src/lib/factory.ts", "server/src/controllers/dynamicTablesController.ts", "server/src/controllers/analyticsDefinitionsController.ts", "server/.dependency-cruiser.cjs"]
registros: ["server/src/lib/factory.ts"]
ancora_sdd: "—"
atualizado: "2026-10-20"
prs: ["#773"]
---
# BE-INCR-DT-NO-CONSUMER-CALLS — tirar do motor DynamicTable as chamadas a consumidores

**Estado:** `done` — 19/10: BRIEF escrito (sessao-planejamento) · forks F1–F8 RATIFICADOS na recomendação pelo dono (F1 = opção b) · execução de código NÃO autorizada (falta 'executa'). Base: claude/dynamictable-architecture-fixes-9e5ba8 (PR #769, OPEN)  
**Desbloqueia:** —

## Origem
Inversão de dependência que sobrou após o #769 (`claude/dynamictable-architecture-fixes-9e5ba8`): `DynamicTableService` importa `KnowledgeGraphService` (chat) e `kpiCacheService` (analytics). Contrato §2.1: "o motor nunca chama o consumidor". O gate B1 não pega (chat/analytics não são Prisma first-class). Probe de regra B7 em config temporária: exatamente 2 violações.

## Docs
- [`BE-INCR-DT-NO-CONSUMER-CALLS-brief.md`](../../accounting/BE-INCR-DT-NO-CONSUMER-CALLS-brief.md)
- Contrato: `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2.1 ("O que o B1/B4 NÃO proíbe")
- ADR de referência: `docs/adr/ADR-DOMAIN-MOTOR-rejected.md` (sem engine/fila genérica)
- Decisão da casa em que o trabalho nasceu (não deste nó): `D-2026-10-19-DT-ARQUITETURA-CORRECOES` (branch do #769)

## Pendências (dono)
- Autorização citável do nó (campo `autorizacao`).
- F1 mecanismo: (a) hook / (b) integração / (c) contrato / (d) geração pull. Recomendação: (b).
- F2–F8: tx externa, cobertura G1/G3, erro silencioso do sync, forma do guard B7, emenda do §2.1, achado G7, localização do helper.
