---
schema_version: 1
type: skill-governance
governance-skill-id: SKL-FE-DASHKPI
skill_path: ./SKILL.md
status: validated
owner: engineering
criticality: normal
evaluation:
  report: ../skill-audit/reports/dashboard-kpi-end-to-end-generator/REPORT.md
  last_evaluated: 2026-06-25
  score: 1.00
  minimum_score: 0.90
rules:
  DASHKPI-001:
    gates:
      - type: eval
        target: ./evals/evals.json#happy-1
      - type: eval
        target: ./evals/evals.json#edge-1
  DASHKPI-002:
    gates:
      - type: eval
        target: ./evals/evals.json#happy-1
  DASHKPI-003:
    gates:
      - type: eval
        target: ./evals/evals.json#happy-1
  DASHKPI-004:
    gates:
      - type: eval
        target: ./evals/evals.json#happy-1
      - type: eval
        target: ./evals/evals.json#regression-1
  DASHKPI-005:
    gates:
      - type: eval
        target: ./evals/evals.json#happy-1
---

# Governança — `dashboard-kpi-end-to-end-generator`

| Camada | Fonte canônica |
|---|---|
| Texto das **regras** | `SKILL.md` (IDs `DASHKPI-*` inline no Generation contract) |
| Relação **regra→gate** | este arquivo (`rules:` no frontmatter) |
| Coerência | `skill-audit governance-check` |
| Evidência de execução | `evals/evals.json` + `../skill-audit/reports/dashboard-kpi-end-to-end-generator/REPORT.md` |

Regras normativas da cadeia KPI ponta-a-ponta, cada uma coberta por um caso de eval comportamental. O happy path (`happy-1`) emite a cadeia inteira num único caso; cada assertion é file-scoped (`@<fileSubstr>::`) para que o gate verifique o elo no arquivo certo.

- `DASHKPI-001` — backend processor single-pass sobre `rows` retornando `ChartDataPoint[]`.
- `DASHKPI-002` — template do KPI registrado (`registerProcessor` + `import` do template no index).
- `DASHKPI-003` — hook de dados analíticos que busca via service layer (`analytics.service`/`DashboardDataContext`), nunca `apiClient`/`fetch` direto.
- `DASHKPI-004` — KPI card widget que consome o hook e reusa o card canônico `DashboardKpiCard`, sem `zinc-*`; regressão `regression-1` cobre o anti-padrão CRM (card/gráfico bespoke).
- `DASHKPI-005` — cadeia inteira ligada (widget→hook→service→template→processor registrado); um elo faltando = FAIL.

`status: validated` (frontmatter é autoritativo — ver `REPORT.md` do skill-audit). `eval-score`/`last-evaluated` no frontmatter da skill são **projeção** do `REPORT.md` (SG-011) — nunca editados à mão.
