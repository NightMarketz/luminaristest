---
id: "ESCALA-BASE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Escala como módulo base — disponibilidade de recurso (CLT, parceiro, sala, equipamento) lida pela agenda e pelo DP (BE-INCR-ESCALA-BASE)"
estado: "inflight"
estado_detalhe: "27/11: os 48 itens implementados na pilha #1431 (integration/escala-base). PR-0 #1429 (1–9), PR-1 #1430 (10–20), PR-2 #1432 (21–30; revisor rodada 1 FAIL A1, corrigido em d0fb9a639, rodada 2 PASS), PR-3 #1443 (31–36; revisor PASS), PR-4 #1447 (37–42, feriado pela borda BR) e PR-5 #1448 (43–48, afastamento do DP, etapa a1); #1447 e #1448 em draft, sem revisor ainda. Forks F-ESC-1..22 decididos ([[D-2026-11-26-ESCALA-BASE-FORKS]], emendas 1db262968, 2c67f74b6, 2e9c0b5b6, e4e771897). Próximo: CI e revisor do #1447/#1448; lote do dono"
depende_de: ["[[D-2026-11-26-ESCALA-BASE-FORKS]]", "[[PES-4]]?", "[[PAIS-NA-BORDA]]?"]
autorizacao: "dono, chat, 2026-11-26, questionário — pergunta: \"Escala como módulo base (disponibilidade do profissional, CLT ou parceiro, lida pela agenda e pelo DP): autoriza planejar o PRE-ADR e o BRIEF? É só documento, sem código e sem 'executa'.\" Resposta: \"Planejar (Recomendado)\". Cobre só o PRE-ADR, o BRIEF e esta nota; não ratifica fork e não é 'executa' de PR algum. FORKS (dono, chat, 2026-11-26: \"faz o questionário dos forks F-ESC comigo\" + \"Segue\"): F-ESC-1..16 decididos por questionário, todos na recomendação ([[D-2026-11-26-ESCALA-BASE-FORKS]]); também não é 'executa'. EXECUTA (dono, chat, 2026-11-26): à pergunta \"Autoriza o executa do BRIEF BE-INCR-ESCALA-BASE (PR-0..PR-5)?\" respondeu \"Executa o BRIEF\". Cobre os 48 itens do BRIEF, PR-0..PR-5, em integration/escala-base; não cobre mudar features/dp/** nem mergear na main. CONTINUAÇÃO (dono, chat da sessão de planejamento, 2026-11-26): \"Segue com os itens 22–48\", seguido de \"Inicia você o cartão de continuação\". Cobre os itens 22–48, do PR-2 (#1432) ao PR-5, na mesma pilha, com as mesmas exclusões; a emenda F-ESC-17/18 e o rollout de esquema (commit 1db262968 do #1424) põem o GovernanceEngine no write-set do PR-2. SESSÃO DE CONTINUAÇÃO 2 (dono, 2026-11-26): \"Inicia a sessão\", para fechar o PR-2 (#1432) e implementar os itens 31–48 (PR-3..PR-5), com as mesmas exclusões"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §9: PR-0, PR-2 e PR-5 opus-medio (fuso e meia-noite; mudança de comportamento da agenda e migração; costura com o DP); PR-1, PR-3 e PR-4 opus-baixo"
atualizado: "2026-11-27"
write_set: ["docs/adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md", "docs/accounting/BE-INCR-ESCALA-BASE-brief.md", "server/src/features/scheduling/**", "server/src/features/dynamicTables/presets/modules/core/ResourcesModule.ts", "server/src/features/dynamicTables/presets/modules/core/SchedulesModule.ts", "server/src/features/dynamicTables/presets/modules/core/ScheduleShiftsModule.ts", "server/src/features/dynamicTables/presets/modules/core/ScheduleExceptionsModule.ts", "server/src/features/dynamicTables/presets/modules/core/UnitsModule.ts", "server/src/features/dynamicTables/presets/modules/core/EmployeesModule.ts", "server/src/features/dynamicTables/presets/modules/planning/AppointmentsModule.ts", "server/src/features/dynamicTables/presets/systems/CoreSystemPreset.ts", "server/src/features/dynamicTables/presets/fields/relation/RelationPresets.ts", "server/src/features/dynamicTables/presets/removability.ts", "server/src/features/dynamicTables/rules/plugins/SchedulesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/AppointmentsPlugin.ts", "server/src/features/dynamicTables/rules/plugins/EmployeesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/sales/appointmentSync.ts", "server/src/features/dynamicTables/validation/GovernanceEngine.ts", "server/src/features/dynamicTables/models/DynamicTable.model.ts", "server/src/features/dynamicTables/dtos/DynamicTable.dto.ts", "server/src/scripts/scheduling-*.ts", "server/src/controllers/schedulingController.ts", "server/src/routes/scheduling.ts", "server/src/routes/docs/scheduling.paths.ts", "server/public/openapi.json", "server/src/__tests__/openapi-paths.test.ts", "server/src/jobs/SchedulingHolidaySyncScheduler.ts", "server/src/jobs/SchedulingHrAbsenceReconcileScheduler.ts", "server/src/features/integration/__tests__/dynamicTableWritersCallEffects.test.ts"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts", "server/src/features/dynamicTables/rules/RuleRegistry.ts"]
prs: ["#1424", "#1429", "#1430", "#1432", "#1443", "#1447", "#1448"]
---
# ESCALA-BASE — Escala como módulo base

**Estado:** `inflight` — 27/11: os 48 itens implementados na pilha #1431 (integration/escala-base). PR-0 #1429 (1–9), PR-1 #1430 (10–20), PR-2 #1432 (21–30; revisor rodada 1 FAIL A1, corrigido em d0fb9a639, rodada 2 PASS), PR-3 #1443 (31–36; revisor PASS), PR-4 #1447 (37–42, feriado pela borda BR) e PR-5 #1448 (43–48, afastamento do DP, etapa a1); #1447 e #1448 em draft, sem revisor ainda. Forks F-ESC-1..22 decididos ([[D-2026-11-26-ESCALA-BASE-FORKS]], emendas 1db262968, 2c67f74b6, 2e9c0b5b6, e4e771897). Próximo: CI e revisor do #1447/#1448; lote do dono  
**Autorização:** frontmatter. Cobre o PRE-ADR, o BRIEF, esta nota e a ratificação dos forks; não é `executa`.
**Depende de:** pontilhada [[PES-4]] (o item 44 lê o DP; a etapa a2 do F-ESC-7 e a porta do F-ESC-8 entram num BRIEF do DP);
pontilhada [[PAIS-NA-BORDA]] (feriado e default de fuso na borda `paises/br`).
**Desbloqueia:** o nó FE `FE-INCR-ESCALA` (tela da escala, horário livre na agenda, encaixe), a abrir; a porta de escala
planejada do `DP-PONTO` (12×36, previsto × realizado).

## O que é

A disponibilidade de um recurso (pessoa CLT, profissional-parceiro, sócio, sala, equipamento, box) num lugar e num tempo,
desenhada pelo usuário em DynamicTable no Core e lida por três consumidores: o gate da agenda (`AppointmentsPlugin`), o
horário livre (`AvailabilityService`) e, por porta futura, o DP. A jornada contratual do CLT continua na `DpJornada`.
Feriado e afastamento do DP chegam à escala como dado projetado, sem serviço Prisma no motor (`AC-2.1-B1`).

## Docs
- [`PRE-ADR-ESCALA-DISPONIBILIDADE.md`](../../adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md) — fronteira, as cinco perguntas, forks F-ESC-1..16
- [[D-2026-11-26-ESCALA-BASE-FORKS]] — ratificação dos forks
- [`BE-INCR-ESCALA-BASE-brief.md`](../../accounting/BE-INCR-ESCALA-BASE-brief.md) — 48 itens, PR-0..PR-5, contratos Zod, write-set

## Origem
Ordem do dono de 26/11/2026 para os próximos 3 meses, item 2: "a escala como módulo base, ligando agenda e DP". O motivo: no
salão, quem atende muitas vezes é profissional-parceiro (Lei 12.592), sem vínculo CLT.
