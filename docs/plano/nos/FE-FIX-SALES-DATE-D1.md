---
id: "FE-FIX-SALES-DATE-D1"
tipo: "fe"
dominio: "financeiro"
titulo: "Data de venda um dia atrás na UI de vendas (lista, filtro de período, analítica)"
estado: "inflight"
estado_detalhe: "Aberto 05/10 pelo BRIEF PACOTE-VALIDADE-PENDENCIAS (F3). `SalesTable:197` mostra `formatDateBR(sale.date)` sobre o ISO à meia-noite UTC que o motor grava e recua um dia em UTC-3 (verificado em browser: venda de 05/10 listada como 04/10); candidatos na mesma classe, ainda não provados: o filtro de período (`useSalesLogic:79`) e o balde mensal da analítica (`useSalesAnalytics:44`). O renderizador genérico já trata `date` direito. F-PP-5 (c) ratificado 05/10: normalizar `SaleRecord.date` para `YYYY-MM-DD` no carregamento do módulo de vendas. Cadeia: instrumentação (teste vermelho com TZ=America/Sao_Paulo; o inventário sai do teste) → correção. Outros módulos ficam fora. Executa liberado 05/10 (Pode executar em sequencia)"
depende_de: []
autorizacao: "dono, chat, 2026-10-05: \"Vamos continuar planejando o que esta aberto ainda\" + questionário (\"Data D-1 na UI de vendas\") + \"Pode ratificar os forks\" — BRIEF + forks; EXECUTA: dono, chat, 2026-10-05: \"Pode executar em sequencia\" (F2 → F3 → F1)"
prs: []
ancora_sdd: "—"
perfil_previsto: "sonnet-medio"
perfil_evidencia: "regra 1 não casa (F-PP-5 ratificado 05/10); regra 2 não casa (só leitura e exibição de data, sem lançamento, saldo nem migração); FE de um módulo, 3 pontos candidatos"
atualizado: "2026-10-05"
---
# FE-FIX-SALES-DATE-D1 — Data de venda um dia atrás na UI de vendas

**Estado:** `inflight` — Aberto 05/10 pelo BRIEF PACOTE-VALIDADE-PENDENCIAS (F3). A lista de vendas recua a data um dia em UTC-3; filtro de período e analítica são candidatos a provar. F-PP-5 (c) ratificado 05/10: normalizar no carregamento do módulo. Cadeia instrumentação → correção. Executa liberado 05/10 (Pode executar em sequencia)
**Autorização:** dono, chat, 2026-10-05: "Vamos continuar planejando o que esta aberto ainda" + questionário ("Data D-1 na UI de vendas") + "Pode ratificar os forks" — BRIEF + forks; EXECUTA: dono, chat, 2026-10-05: "Pode executar em sequencia" (F2 → F3 → F1)
**Depende de:** —
**Desbloqueia:** —
**Âncora no SDD consolidado:** —
**PRs:** —

Origem: [[D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS]] (F-PP-5). Vizinho: [[FIX-SALE-DATE-AS-WRITTEN]] (a mesma causa, no razão) e a varredura
`FE-FIX-DATEONLY-UTC` (outra subclasse: defaults com `toISOString()`).

## Docs

- [`docs/accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md`](../../accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md) — §3 F3, itens 9–10, §5 F-PP-5 ✅, insumo I2 (inventário
  completo fora do módulo de vendas). Não autoriza código: exige "executa".
