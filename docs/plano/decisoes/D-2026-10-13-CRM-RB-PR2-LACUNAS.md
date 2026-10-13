---
id: "D-2026-10-13-CRM-RB-PR2-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Lacunas de spec do PR-2 do CRM-RB (templates e teto de linhas) — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13, questionário na sessão de feature do PR-2 — templates: '5 templates, paridade de valores'; teto: '20.000 linhas'; ambos na recomendação"
atualizado: "2026-10-13"
---
# D-2026-10-13-CRM-RB-PR2-LACUNAS — lacunas de spec do PR-2 do [[CRM-RB]]

**Estado:** `decided` (2 cédulas, ambas na recomendação).
**Autorização:** dono, chat, 13/10/2026, questionário, durante a execução do PR-2 (o "executa" do nó é do mesmo dia).

Origem: `docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md` itens 9 e 13; a sessão de feature parou nos dois (regra 2).

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Item 13 (templates) | A "paridade" com os 6 gráficos fixos é impossível pela letra: BANT exige fórmula (fora do v1, F-RB5); funil/status/propostas usam ordem fixa que o builder não expressa; o vazio vira 'Desconhecida'/'Open'/'Draft' nos fixos | **5 templates** (funil, origem, status, propostas, atividades), **paridade de valores** (mesmos pares nome→valor na fixture, sem exigir ordem nem rótulo do vazio); **BANT fora** até existir fórmula | não |
| Item 9 (teto do F-RB5) | O BRIEF mandava medir no `dev.db` real; lá só há seed (máx. 181 linhas numa tabela CRM) — a medida não informa produção | **20.000 linhas lidas por execução** (fonte + joins + tabelas de nome de relação) | não |

## Consequências

- `server/src/features/crm/models/crmReportTemplates.ts` documenta as diferenças aceitas; o teste de paridade compara mapas
  nome→valor numa fixture sem campo vazio.
- `CRM_REPORT_ROW_CAP = 20_000` em `CrmReportService.ts`; sobe por decisão quando um cliente real estourar.
- Fica para o FE vizinho / emenda: **como o FE obtém os templates** — o item 10 não lista rota de templates (achado do PR-2).
