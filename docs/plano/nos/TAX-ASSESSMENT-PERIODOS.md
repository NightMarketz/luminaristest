---
id: "TAX-ASSESSMENT-PERIODOS"
tipo: "plataforma"
dominio: "fiscal"
titulo: "Períodos esperados do ano por família de tributo — GET /tax-assessments/periodos (BE-INCR-TAX-ASSESSMENT-PERIODOS)"
estado: "ready"
estado_detalhe: "08/10: BRIEF escrito; forks ratificados por questionário no mesmo dia. Sem 'executa'. Fecha o insumo ausente §5 do FE-INCR-TAX-ASSESSMENT (#585). X14 retirado de depende_de (dono, chat, 09/10). Nó aberto em 09/10 depois do cruzamento BRIEF × git log: nenhum commit de implementação"
depende_de: ["[[X7]]", "[[X8]]"]
autorizacao: "dono, chat, 2026-10-08: \"insumo ausente §5 de docs/accounting/FE-INCR-TAX-ASSESSMENT-brief.md (PR #585). Este pedido autoriza só o BRIEF, sem código e sem 'executa'.\"; dono, chat, 2026-10-09: \"sim, abre os nós\" (só a nota do nó) — sem 'executa'"
ancora_sdd: "—"
atualizado: "2026-10-09"
prs: []
---
# TAX-ASSESSMENT-PERIODOS — períodos esperados do ano

**Estado:** `ready` — BRIEF com forks ratificados. Código só depois de um `executa` do dono.

## Escopo

- Rota de leitura pura `GET /api/accounting/tax-assessments/periodos?unitId&anoCalendario`, policy
  `canReadTaxAssessment`, escopo `AccountingScope`.
- Só expõe regras que já existem (forma efetiva, trimestres/meses em atividade, modalidade de PIS/Cofins, competências
  do Simples), para a grade do ano saber os períodos antes da 1ª prévia.

## Docs

- [`docs/accounting/BE-INCR-TAX-ASSESSMENT-PERIODOS-brief.md`](../../accounting/BE-INCR-TAX-ASSESSMENT-PERIODOS-brief.md) — BRIEF + forks
- [`docs/accounting/FE-INCR-TAX-ASSESSMENT-brief.md`](../../accounting/FE-INCR-TAX-ASSESSMENT-brief.md) — §5, o consumidor
