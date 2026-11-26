---
id: "ESCALA-BASE"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Escala como módulo base — disponibilidade de recurso (CLT, parceiro, sala, equipamento) lida pela agenda e pelo DP (BE-INCR-ESCALA-BASE)"
estado: "inflight"
estado_detalhe: "26/11: PRE-ADR (docs/adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md, Accepted) e BRIEF (docs/accounting/BE-INCR-ESCALA-BASE-brief.md, 48 itens, PR-0..PR-5) escritos; forks F-ESC-1..16 DECIDIDOS pelo dono em 26/11, todos na recomendação ([[D-2026-11-26-ESCALA-BASE-FORKS]]); sem 'executa'. Nó criado antes da ratificação do PRE-ADR a pedido da tarefa (divergência com docs/plano/README.md §Fold, declarada no PRE-ADR; o PRE-ADR foi ratificado no mesmo dia). Achado: a agenda já confere employees.workSchedule (AppointmentsPlugin), com dois defeitos na caixa (L-20261126-180055-8f07, L-20261126-180056-7893); e o agendamento automático da venda grava fora do gate (L-20261126-180939-51cf). Próximo: 'executa' do dono (sessao-feature em integration/escala-base)"
depende_de: ["[[D-2026-11-26-ESCALA-BASE-FORKS]]", "[[PES-4]]?", "[[PAIS-NA-BORDA]]?"]
autorizacao: "dono, chat, 2026-11-26, questionário — pergunta: \"Escala como módulo base (disponibilidade do profissional, CLT ou parceiro, lida pela agenda e pelo DP): autoriza planejar o PRE-ADR e o BRIEF? É só documento, sem código e sem 'executa'.\" Resposta: \"Planejar (Recomendado)\". Cobre só o PRE-ADR, o BRIEF e esta nota; não ratifica fork e não é 'executa' de PR algum. FORKS (dono, chat, 2026-11-26: \"faz o questionário dos forks F-ESC comigo\" + \"Segue\"): F-ESC-1..16 decididos por questionário, todos na recomendação ([[D-2026-11-26-ESCALA-BASE-FORKS]]); também não é 'executa'. EXECUTA (dono, chat, 2026-11-26): à pergunta \"Autoriza o executa do BRIEF BE-INCR-ESCALA-BASE (PR-0..PR-5)?\" respondeu \"Executa o BRIEF\". Cobre os 48 itens do BRIEF, PR-0..PR-5, em integration/escala-base; não cobre mudar features/dp/** nem mergear na main"
perfil_previsto: "opus-medio"
perfil_evidencia: "BRIEF §9: PR-0, PR-2 e PR-5 opus-medio (fuso e meia-noite; mudança de comportamento da agenda e migração; costura com o DP); PR-1, PR-3 e PR-4 opus-baixo"
atualizado: "2026-11-26"
write_set: ["docs/adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md", "docs/accounting/BE-INCR-ESCALA-BASE-brief.md", "server/src/features/scheduling/**", "server/src/features/dynamicTables/presets/modules/core/ResourcesModule.ts", "server/src/features/dynamicTables/presets/modules/core/SchedulesModule.ts", "server/src/features/dynamicTables/presets/modules/core/ScheduleShiftsModule.ts", "server/src/features/dynamicTables/presets/modules/core/ScheduleExceptionsModule.ts", "server/src/features/dynamicTables/presets/modules/core/UnitsModule.ts", "server/src/features/dynamicTables/presets/modules/core/EmployeesModule.ts", "server/src/features/dynamicTables/presets/modules/planning/AppointmentsModule.ts", "server/src/features/dynamicTables/presets/systems/CoreSystemPreset.ts", "server/src/features/dynamicTables/presets/fields/relation/RelationPresets.ts", "server/src/features/dynamicTables/presets/removability.ts", "server/src/features/dynamicTables/rules/plugins/SchedulesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/AppointmentsPlugin.ts", "server/src/features/dynamicTables/rules/plugins/EmployeesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/sales/appointmentSync.ts", "server/src/scripts/scheduling-*.ts", "server/src/controllers/schedulingController.ts", "server/src/routes/scheduling.ts", "server/src/routes/docs/scheduling.paths.ts", "server/public/openapi.json", "server/src/__tests__/openapi-paths.test.ts", "server/src/jobs/SchedulingHolidaySyncScheduler.ts", "server/src/jobs/SchedulingHrAbsenceReconcileScheduler.ts"]
registros: ["server/src/lib/factory.ts", "server/src/routes/index.ts", "server/src/features/dynamicTables/rules/RuleRegistry.ts"]
prs: ["#1424", "#1429", "#1430", "#1432"]
---
# ESCALA-BASE — Escala como módulo base

**Estado:** `inflight` — 26/11: PRE-ADR (docs/adr/PRE-ADR-ESCALA-DISPONIBILIDADE.md, Accepted) e BRIEF (docs/accounting/BE-INCR-ESCALA-BASE-brief.md, 48 itens, PR-0..PR-5) escritos; forks F-ESC-1..16 DECIDIDOS pelo dono em 26/11, todos na recomendação ([[D-2026-11-26-ESCALA-BASE-FORKS]]); sem 'executa'. Nó criado antes da ratificação do PRE-ADR a pedido da tarefa (divergência com docs/plano/README.md §Fold, declarada no PRE-ADR; o PRE-ADR foi ratificado no mesmo dia). Achado: a agenda já confere employees.workSchedule (AppointmentsPlugin), com dois defeitos na caixa (L-20261126-180055-8f07, L-20261126-180056-7893); e o agendamento automático da venda grava fora do gate (L-20261126-180939-51cf). Próximo: 'executa' do dono (sessao-feature em integration/escala-base)  
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
