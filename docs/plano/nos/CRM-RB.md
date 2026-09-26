---
id: "CRM-RB"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Builder de relatórios/dashboards self-service do CRM (BE-INCR-CRM-REPORT-BUILDER)"
estado: "planned"
estado_detalhe: "BRIEF em PR (26/09); 7 forks PENDENTES; reabre ADR-ANALYTICS-DEFS via F-AD5; código não iniciado; execução exige 'executa'"
depende_de: ["[[I8]]?"]
autorizacao: "\"autorizo planejar o builder de relatórios do CRM\" 2026-09-26 (só planejamento — sem 'executa')"
ancora_sdd: "CRM_REMEDIATION_AND_ROADMAP Parte B gap #14 (supersedido → SDD §IV.3)"
atualizado: "2026-09-26"
---
# CRM-RB — Builder de relatórios/dashboards self-service do CRM (BE-INCR-CRM-REPORT-BUILDER)

**Estado:** `planned` — BRIEF em PR (26/09); 7 forks PENDENTES; reabre ADR-ANALYTICS-DEFS via F-AD5; código não iniciado; execução exige 'executa'  
**Autorização:** "autorizo planejar o builder de relatórios do CRM" — dono, chat, 2026-09-26. Escopo = **planejar**; não autoriza código.  
**Depende de:** [[I8]]? (condicional: fontes do builder = tabelas CRM instaladas; com I8 elas passam a depender de módulo ligado)  
**Desbloqueia:** —  
**Âncora:** gap **#14** da Parte B de `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md` ("Relatórios & Dashboards customizáveis … builder self-service"), congelado pelo D4 do conselho CRM de 20/07 e **descongelado pelo dono em 25/09** (discordância só neste item; o resto do D4 segue congelado).

## Docs

- [`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md`](../../crm/BE-INCR-CRM-REPORT-BUILDER-brief.md) — BRIEF (checklist, contratos Zod, forks F-RB1..F-RB7)
- [`docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md`](../../adr/ADR-ANALYTICS-DEFS-write-unblock.md) — F-AD0=(c) congelado; **F-AD5 (a tela) ABERTO** — este nó é a resposta de produto a F-AD5
- [`docs/crm/COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md`](../../crm/COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md) — D4

## Evidência

- `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md:157` → gap #14 "Relatórios & Dashboards customizáveis pelo usuário (builder)".
- `server/src/features/dynamicTables/policies/DynamicTablePolicy.ts` `canManageData` → tabela `presentation:'system'` (o `analyticsDefinitions`) é read-only para todos, por ADR.
- `server/src/features/analytics/core/pipeline/Pipeline.ts` → `PipelineSpec` (source/joins/filters/dimensions/measures/sort/limit) — motor de agregação já existente.
