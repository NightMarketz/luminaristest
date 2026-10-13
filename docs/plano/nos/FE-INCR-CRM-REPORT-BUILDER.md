---
id: "FE-INCR-CRM-REPORT-BUILDER"
tipo: "fe"
dominio: "plataforma"
titulo: "Tela do builder de relatórios do CRM (lista, editor, visualização, modelos e widget do dashboard)"
estado: "inflight"
estado_detalhe: "Nó vizinho nomeado no BRIEF do CRM-RB (§7). 13/10: BRIEF escrito (`docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md`, 23 itens em 4 PRs A–D); forks F-FRB1..7 RATIFICADOS no mesmo dia (todos na recomendação, [[D-2026-10-13-FE-CRM-RB-FORKS]]); F-FRB4=(a) → pré-requisito de BE (GET /api/crm/reports/templates) ainda SEM planejamento nem autorização; exige 'executa' por PR (A–D) · 13/10: executa do PR-A (dono, chat); PR-A em #658 (itens 1–9, 11–18, 21–22; 3 lacunas decididas em [[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]]); PR-B, PR-C e PR-D seguem sem executa · 13/10: executa do PR-B e do PR-D (dono, chat); PR-B em #663 (item 10, joins; 4 lacunas decididas em [[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]); PR-D em #664 (item 20, widget crm-report no dashboard; empilhado sobre o #663); PR-C segue sem executa"
depende_de: ["[[CRM-RB]]"]
autorizacao: "dono, chat, 2026-10-13: \"Planeja a tela do builder de relatórios do CRM\" — só sessao-planejamento (BRIEF); sem código, sem executa · forks F-FRB1..7 (dono, chat, 2026-10-13, questionário): todos (a), na recomendação — sem executa · **EXECUTA PR-A** (dono, chat, 2026-10-13): \"POde seguir o caminho natural\" — em resposta a \"executa o PR-A do FE-INCR-CRM-REPORT-BUILDER\"; só o PR-A (itens 1–9, 11–18, 21–22) · lacunas do PR-A por questionário ([[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]]) · **EXECUTA PR-B e PR-D** (dono, chat, 2026-10-13): \"pode seguir com o PR-B e o PR-D, mas em uma sessão nova, dispare ela\" — só o PR-B (item 10) e o PR-D (item 20); não cobre o PR-C, o pré-requisito de BE nem o item 23 · lacunas do PR-B/PR-D por questionário ([[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]])"
ancora_sdd: "CRM_REMEDIATION_AND_ROADMAP Parte B gap #14 (supersedido → SDD §IV.3)"
atualizado: "2026-10-13"
prs: ["#658", "#663", "#664"]
---
# FE-INCR-CRM-REPORT-BUILDER — tela do builder de relatórios do CRM

**Estado:** `inflight` — Nó vizinho nomeado no BRIEF do CRM-RB (§7). 13/10: BRIEF escrito (`docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md`, 23 itens em 4 PRs A–D); forks F-FRB1..7 RATIFICADOS no mesmo dia (todos na recomendação, [[D-2026-10-13-FE-CRM-RB-FORKS]]); F-FRB4=(a) → pré-requisito de BE (GET /api/crm/reports/templates) ainda SEM planejamento nem autorização; exige 'executa' por PR (A–D) · 13/10: executa do PR-A (dono, chat); PR-A em #658 (itens 1–9, 11–18, 21–22; 3 lacunas decididas em [[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]]); PR-B, PR-C e PR-D seguem sem executa · 13/10: executa do PR-B e do PR-D (dono, chat); PR-B em #663 (item 10, joins; 4 lacunas decididas em [[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]]); PR-D em #664 (item 20, widget crm-report no dashboard; empilhado sobre o #663); PR-C segue sem executa  
**PRs:** #658, #663, #664  
**Autorização:** *"Planeja a tela do builder de relatórios do CRM"* — dono, chat, 2026-10-13. Não autoriza código. **Executa do PR-A** (dono, chat, 2026-10-13): *"POde seguir o caminho natural"* — resposta à proposta "executa o PR-A do FE-INCR-CRM-REPORT-BUILDER"; não cobre PR-B, PR-C, PR-D nem o pré-requisito de BE. **Executa do PR-B e do PR-D** (dono, chat, 2026-10-13): *"pode seguir com o PR-B e o PR-D, mas em uma sessão nova, dispare ela"* — só o PR-B (item 10, joins) e o PR-D (item 20, widget do dashboard); não cobre o PR-C, o pré-requisito de BE nem o item 23 (gate humano).
**Por que `planned` sem PRE-ADR:** é o nó vizinho já nomeado no BRIEF do [[CRM-RB]] (§7, "BRIEF próprio"), não proposta
nova do `destino/` — mesma divergência registrada no CRM-RB (26/09) e no FE-INCR-SIMPLES.
**Depende de:** [[CRM-RB]] (done — #647, #651, #648). Pré-requisito de BE dos modelos (F-FRB4=(a)) para o PR-C — sem nó ainda.
**Desbloqueia:** —

## Docs

- [`docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md`](../../crm/FE-INCR-CRM-REPORT-BUILDER-brief.md) — BRIEF (checklist,
  contratos, forks F-FRB1..7, fatiamento em 4 PRs)
- [`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md`](../../crm/BE-INCR-CRM-REPORT-BUILDER-brief.md) — contrato do BE
  (§3, §7, §9) que a tela consome
- [[D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS]] — lacunas do PR-A: lista própria, um gráfico por moeda, chartType do KPI escolhido pelo usuário
- [[D-2026-10-13-FE-CRM-RB-PR-B-D-LACUNAS]] — lacunas do PR-B/PR-D: apelido obrigatório pré-preenchido, join em uso reescreve/confirma, limites do BE escondidos, widget 6×12 sempre no menu
- [[D-2026-10-13-CRM-RB-PR2-LACUNAS]] — 5 modelos, teto de 20.000 linhas, modelos sem rota

## Evidência

- `my-app/types/contracts/crm/CrmReportDto.gen.ts` — tipos do contrato gerados do snapshot (PR #651).
- `server/src/routes/crm.ts` — 4 paths em `/api/crm/reports`.
- `my-app/features/dashboard/category-views/finance/components/analytics/charts/ChartRenderer.tsx:45` — uma série por
  gráfico (motivo do F-FRB3).
