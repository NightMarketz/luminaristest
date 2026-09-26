---
id: "CRM-RB"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Builder de relatórios/dashboards self-service do CRM (BE-INCR-CRM-REPORT-BUILDER)"
estado: "planned"
estado_detalhe: "BRIEF em PR #395; 7/7 forks RATIFICADOS 26/09 (F-RB4=(c) diverge da recomendação); F-AD5→(b) e custom-kpis→apagar emendados no ADR; planned (sem PRE-ADR do nó); código não iniciado; exige 'executa'"
depende_de: ["[[I8]]?"]
autorizacao: "\"autorizo planejar o builder de relatórios do CRM\" 2026-09-26 + 7/7 forks F-RB ratificados 2026-09-26 (AskUserQuestion) — sem 'executa'"
ancora_sdd: "CRM_REMEDIATION_AND_ROADMAP Parte B gap #14 (supersedido → SDD §IV.3)"
atualizado: "2026-09-26"
---
# CRM-RB — Builder de relatórios/dashboards self-service do CRM (BE-INCR-CRM-REPORT-BUILDER)

**Estado:** `planned` — BRIEF em PR #395; 7/7 forks RATIFICADOS 26/09 (F-RB4=(c) diverge da recomendação); F-AD5→(b) e custom-kpis→apagar emendados no ADR; planned (sem PRE-ADR do nó); código não iniciado; exige 'executa'  
**Autorização:** "autorizo planejar o builder de relatórios do CRM" — dono, chat, 2026-09-26; forks F-RB1..F-RB7 ratificados 2026-09-26 via AskUserQuestion (1a·2a·3b·**4c**·5a·6a·7a). Não autoriza código.  
**Por que `planned` e não `ready`:** `docs/plano/README.md` exige PRE-ADR ratificado antes de nó novo em `nos/`; este nó nasceu por instrução com autorização citável, mas sem PRE-ADR próprio. A emenda do ADR-ANALYTICS-DEFS cobre F-AD5/F-AD6, não a abertura do nó — promover a `ready` fica para o dono (ou um PRE-ADR).  
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
