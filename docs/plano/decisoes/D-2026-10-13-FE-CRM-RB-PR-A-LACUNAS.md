---
id: "D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Lacunas de spec do PR-A da tela do builder de relatórios do CRM — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13, questionário na sessão de feature do PR-A — lista: 'Lista própria (Recomendado)'; moeda: 'Um gráfico por moeda (Recomendado)'; KPI: 'Usuário escolhe'"
atualizado: "2026-10-13"
---
# D-2026-10-13-FE-CRM-RB-PR-A-LACUNAS — lacunas de spec do PR-A do [[FE-INCR-CRM-REPORT-BUILDER]]

**Estado:** `decided` (3 cédulas; 2 na recomendação, 1 contra).
**Autorização:** dono, chat, 13/10/2026, questionário, na fase 1 da sessão de feature do PR-A (o "executa" do PR-A é do
mesmo dia).

Origem: `docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md` itens 2, 12 e 14. A sessão de feature parou nos três antes de
escrever código (regra 2).

| Lacuna | O que a spec não decidia | Decisão | Contra? |
|---|---|---|---|
| Item 2 (lista em `GenericTable`) | O `GenericTable` é preso a registro de DynamicTable: a ação "editar" abre o formulário de linha da tabela (`RowActionsCell` → `EditRecordButton` com `tableId`) e não há clique de linha para "abrir". O relatório salvo é Prisma (`CrmReportDefinition`), não DynamicTable | **Lista própria**, no padrão visual (`neutral-*`, `rounded-2xl`), com Abrir e Apagar. Bespoke por divergência de objeto (critério de reuso, estágio 1); o `GenericTable` não muda | não |
| Item 14 (gráfico com `meta.currency.mode = 'dimension'`) | O `ChartRenderer` formata todos os pontos numa moeda só (`options.currency`); com a dimensão de moeda, USD e BRL cairiam no mesmo eixo | **Um gráfico por moeda**: os pontos de cada série **de dinheiro** são separados pela moeda do ponto, e cada grupo é desenhado com o símbolo certo (a contagem, que não é dinheiro, segue num gráfico só). Nunca há duas moedas no mesmo eixo (coerente com o F-RB8). Tabela e KPI já formatam por ponto | não |
| Item 12 (`chartType` com `kind:'kpi'`) | O BE exige `chartType` em todo relatório; a spec só diz que `table` é exclusivo de `kind:'table'` e que KPI não tem dimensão | **O usuário escolhe** o gráfico também no KPI (bar/line/area/pie/donut); o valor é salvo como escolhido | **sim** (recomendação era fixar `bar` e esconder o seletor) |

## Consequências

- `features/crm/components/reports/CrmReportList.tsx` é a lista própria; o `GenericTable` continua sendo usado no
  resultado `kind:'table'` (item 14), em modo só leitura (`isWidgetMode`).
- O render do resultado (`seriesViews` em `features/crm/lib/reportBuilder.ts`) separa por moeda só as séries de dinheiro
  quando o modo é `dimension`; o título do gráfico leva a moeda (ou "Sem moeda" para `__NO_CURRENCY__`).
- No KPI, o seletor de gráfico continua visível; o `chartType` escolhido não muda a exibição do KPI (um card por ponto).
