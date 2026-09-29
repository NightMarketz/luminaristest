---
id: "CRM-RB"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Builder de relatórios/dashboards self-service do CRM (BE-INCR-CRM-REPORT-BUILDER)"
estado: "planned"
estado_detalhe: "BRIEF em PR #395; 7/7 forks RATIFICADOS 26/09 (F-RB4=(c) diverge da recomendação); F-AD5→(b) e custom-kpis→apagar emendados no ADR; planned (sem PRE-ADR do nó); código não iniciado; exige 'executa' · 29/09: BRIEF EMENDADO — F-RB8 moeda DECIDIDO (soma por moeda + visão convertida à parte pela PTAX do BCB, tabela Prisma global PtaxRate); 6 sub-forks F-RB8a..f PENDENTES; nomes de campo corrigidos; decisão ortogonal do valor de pipeline PENDENTE (§4.2)"
depende_de: ["[[I8]]?"]
autorizacao: "\"autorizo planejar o builder de relatórios do CRM\" 2026-09-26 + 7/7 forks F-RB ratificados 2026-09-26 (AskUserQuestion) — sem 'executa'; F-RB8 (dono, 29/09, decisão 14): \"Soma por moeda e conversão a parte com cambio\" + \"PTAX do BCB, taxa do dia\" — emenda do BRIEF, sem 'executa'"
ancora_sdd: "CRM_REMEDIATION_AND_ROADMAP Parte B gap #14 (supersedido → SDD §IV.3)"
atualizado: "2026-09-29"
---
# CRM-RB — Builder de relatórios/dashboards self-service do CRM (BE-INCR-CRM-REPORT-BUILDER)

**Estado:** `planned` — BRIEF em PR #395; 7/7 forks RATIFICADOS 26/09 (F-RB4=(c) diverge da recomendação); F-AD5→(b) e custom-kpis→apagar emendados no ADR; planned (sem PRE-ADR do nó); código não iniciado; exige 'executa' · 29/09: BRIEF EMENDADO — F-RB8 moeda DECIDIDO (soma por moeda + visão convertida à parte pela PTAX do BCB, tabela Prisma global PtaxRate); 6 sub-forks F-RB8a..f PENDENTES; nomes de campo corrigidos; decisão ortogonal do valor de pipeline PENDENTE (§4.2)  
**Autorização:** "autorizo planejar o builder de relatórios do CRM" — dono, chat, 2026-09-26; forks F-RB1..F-RB7 ratificados 2026-09-26 via AskUserQuestion (1a·2a·3b·**4c**·5a·6a·7a). **F-RB8** decidido 2026-09-29 (decisão 14 de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`, PR #440): *"Soma por moeda e conversão a parte com cambio"* + *"PTAX do BCB, taxa do dia"*. Não autoriza código.  
**Antes do "executa" (29/09):** ratificar F-RB8a..f (BRIEF §4.1 — a data da taxa do ganho, a PTAX ausente no dia, moeda nula, campo sem par, compra × venda, fronteira com [[R-multimoeda]]). A decisão ortogonal do valor de pipeline (BRIEF §4.2) **não** bloqueia este nó.  
**Por que `planned` e não `ready`:** `docs/plano/README.md` exige PRE-ADR ratificado antes de nó novo em `nos/`; este nó nasceu por instrução com autorização citável, mas sem PRE-ADR próprio. A emenda do ADR-ANALYTICS-DEFS cobre F-AD5/F-AD6, não a abertura do nó. **Decisão do dono 2026-09-26 (AskUserQuestion): nó segue `planned`; o PRE-ADR é passo próprio, antes do 'executa'.**  
**F-RB4 complemento (dono, 2026-09-26):** ADMIN com controle total (lê/roda/edita/apaga qualquer relatório).  
**Depende de:** [[I8]]? (condicional: fontes do builder = tabelas CRM instaladas; com I8 elas passam a depender de módulo ligado)  
**Desbloqueia:** —  
**Âncora:** gap **#14** da Parte B de `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md` ("Relatórios & Dashboards customizáveis … builder self-service"), congelado pelo D4 do conselho CRM de 20/07 e **descongelado pelo dono em 25/09** (discordância só neste item; o resto do D4 segue congelado).

## Docs

- [`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md`](../../crm/BE-INCR-CRM-REPORT-BUILDER-brief.md) — BRIEF (checklist, contratos Zod, forks F-RB1..F-RB7; **emenda 29/09**: F-RB8 + sub-forks §4.1, checklist 17-26, `PtaxRate` §1.1, decisão ortogonal §4.2, evidência §8)
- `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §7 (D-11) — evidência do F-RB8 (PR #440; link vira ativo quando o PR entrar em `main`)
- [`docs/operating-manual/GAP-MAP.md`](../../operating-manual/GAP-MAP.md) — linha "CRM — valor de pipeline diverge entre visão geral e analytics, e soma moedas" (`[ABERTO]`, só registro)
- [`docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md`](../../adr/ADR-ANALYTICS-DEFS-write-unblock.md) — F-AD0=(c) congelado; **F-AD5 (a tela) ABERTO** — este nó é a resposta de produto a F-AD5
- [`docs/crm/COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md`](../../crm/COUNCIL-BOARD-CRM-2026-07-20-v3-resolution.md) — D4

## Evidência

- `docs/crm/CRM_REMEDIATION_AND_ROADMAP.md:157` → gap #14 "Relatórios & Dashboards customizáveis pelo usuário (builder)".
- `server/src/features/dynamicTables/policies/DynamicTablePolicy.ts` `canManageData` → tabela `presentation:'system'` (o `analyticsDefinitions`) é read-only para todos, por ADR.
- `server/src/features/analytics/core/pipeline/Pipeline.ts` → `PipelineSpec` (source/joins/filters/dimensions/measures/sort/limit) — motor de agregação já existente.
- (29/09) `LeadsModule.ts:82-97`, `OpportunitiesModule.ts:77-94`, `LeadProposalsModule.ts:23-30` → os campos monetários reais e suas moedas (BRL/USD/EUR); `presets/modules/registry.ts:173-178` → fontes `leadProposals`/`crmAccounts`/`crmContacts`.
- (29/09) API PTAX do BCB consultada ao vivo: fechamento ~13h de Brasília; sábado vem vazio; antes das 13h o dia ainda não tem fechamento (BRIEF §8).
