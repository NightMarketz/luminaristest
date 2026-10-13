---
id: "FE-INCR-CRM-REPORT-BUILDER"
tipo: "fe"
dominio: "plataforma"
titulo: "Tela do builder de relatórios do CRM (lista, editor, visualização, modelos e widget do dashboard)"
estado: "planned"
estado_detalhe: "Nó vizinho nomeado no BRIEF do CRM-RB (§7). 13/10: BRIEF escrito (`docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md`, 23 itens em 4 PRs A–D); forks F-FRB1..7 RATIFICADOS no mesmo dia (todos na recomendação, [[D-2026-10-13-FE-CRM-RB-FORKS]]); F-FRB4=(a) → pré-requisito de BE (GET /api/crm/reports/templates) ainda SEM planejamento nem autorização; exige 'executa' por PR (A–D)"
depende_de: ["[[CRM-RB]]"]
autorizacao: "dono, chat, 2026-10-13: \"Planeja a tela do builder de relatórios do CRM\" — só sessao-planejamento (BRIEF); sem código, sem executa · forks F-FRB1..7 (dono, chat, 2026-10-13, questionário): todos (a), na recomendação — sem executa"
ancora_sdd: "CRM_REMEDIATION_AND_ROADMAP Parte B gap #14 (supersedido → SDD §IV.3)"
atualizado: "2026-10-13"
prs: []
---
# FE-INCR-CRM-REPORT-BUILDER — tela do builder de relatórios do CRM

**Estado:** `planned` — BRIEF escrito em 13/10; forks F-FRB1..7 ratificados no mesmo dia ([[D-2026-10-13-FE-CRM-RB-FORKS]]). Falta o "executa" de cada PR; o PR-C (modelos) espera o pré-requisito de BE.
**PRs:** —
**Autorização:** *"Planeja a tela do builder de relatórios do CRM"* — dono, chat, 2026-10-13. Não autoriza código.
**Por que `planned` sem PRE-ADR:** é o nó vizinho já nomeado no BRIEF do [[CRM-RB]] (§7, "BRIEF próprio"), não proposta
nova do `destino/` — mesma divergência registrada no CRM-RB (26/09) e no FE-INCR-SIMPLES.
**Depende de:** [[CRM-RB]] (done — #647, #651, #648). Pré-requisito de BE dos modelos (F-FRB4=(a)) para o PR-C — sem nó ainda.
**Desbloqueia:** —

## Docs

- [`docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md`](../../crm/FE-INCR-CRM-REPORT-BUILDER-brief.md) — BRIEF (checklist,
  contratos, forks F-FRB1..7, fatiamento em 4 PRs)
- [`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md`](../../crm/BE-INCR-CRM-REPORT-BUILDER-brief.md) — contrato do BE
  (§3, §7, §9) que a tela consome
- [[D-2026-10-13-CRM-RB-PR2-LACUNAS]] — 5 modelos, teto de 20.000 linhas, modelos sem rota

## Evidência

- `my-app/types/contracts/crm/CrmReportDto.gen.ts` — tipos do contrato gerados do snapshot (PR #651).
- `server/src/routes/crm.ts` — 4 paths em `/api/crm/reports`.
- `my-app/features/dashboard/category-views/finance/components/analytics/charts/ChartRenderer.tsx:45` — uma série por
  gráfico (motivo do F-FRB3).
