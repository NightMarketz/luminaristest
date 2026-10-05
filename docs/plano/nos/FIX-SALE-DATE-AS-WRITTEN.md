---
id: "FIX-SALE-DATE-AS-WRITTEN"
tipo: "plataforma"
dominio: "contabil"
titulo: "Pontes de venda leem o dia escrito (receita, liquidação e estorno)"
estado: "inflight"
estado_detalhe: "Aberto 05/10 pelo BRIEF PACOTE-VALIDADE-PENDENCIAS (F2). O motor grava o campo `date` como ISO à meia-noite UTC e `scopeDay` o converte para o dia anterior em Brasília: `SaleSalesAccountingBridge:91` data a receita de produto/serviço um dia antes (a reconciliação, que passa o ISO cru, data no dia escrito — a mesma venda sai em D-1 ou D conforme quem a lança). O pacote já foi corrigido no #530 (`saleDayAsWritten`). F-PP-3 (b) ratificado 05/10: receita + fallbacks de `data.date` em liquidação e estorno; F-PP-4 (a) não re-datar, condicionado ao I4 (nenhum tenant com venda real postada antes do deploy). Cadeia: instrumentação (teste vermelho pelo caminho real, com a virada de mês) → correção. Vai ANTES do sign-off H2 (que confere vendas no razão). Executa liberado 05/10 (Pode executar em sequencia)"
depende_de: ["[[FE-INCR-PACOTE-VALIDADE]]"]
autorizacao: "dono, chat, 2026-10-05: \"Vamos continuar planejando o que esta aberto ainda\" + questionário (\"Pontes de venda que recuam a data\") + \"Pode ratificar os forks\" — BRIEF + forks; EXECUTA: dono, chat, 2026-10-05: \"Pode executar em sequencia\" (F2 → F3 → F1)"
prs: []
ancora_sdd: "—"
perfil_previsto: "sonnet-alto"
perfil_evidencia: "regra 1 não casa (F-PP-3/4 ratificados 05/10); regra 2: muda a competência (data do lançamento) da receita de venda, sem migração nem lançamento novo; correção de 3 pontos de leitura com o helper que já existe"
atualizado: "2026-10-05"
---
# FIX-SALE-DATE-AS-WRITTEN — Pontes de venda leem o dia escrito

**Estado:** `inflight` — Aberto 05/10 pelo BRIEF PACOTE-VALIDADE-PENDENCIAS (F2). O motor grava o campo `date` como ISO à meia-noite UTC e `scopeDay` o converte para o dia anterior em Brasília: `SaleSalesAccountingBridge:91` data a receita de produto/serviço um dia antes. F-PP-3 (b) e F-PP-4 (a, condicionado ao I4) ratificados 05/10. Cadeia instrumentação → correção; antes do sign-off H2. Executa liberado 05/10 (Pode executar em sequencia)
**Autorização:** dono, chat, 2026-10-05: "Vamos continuar planejando o que esta aberto ainda" + questionário ("Pontes de venda que recuam a data") + "Pode ratificar os forks" — BRIEF + forks; EXECUTA: dono, chat, 2026-10-05: "Pode executar em sequencia" (F2 → F3 → F1)
**Depende de:** [[FE-INCR-PACOTE-VALIDADE]] (o helper `saleDayAsWritten` / `calendarDayAsWritten` em `models/dates.ts` nasce no #530)
**Desbloqueia:** o sign-off [[H2]] sem razão datado errado (ordem, não aresta do vault)
**Âncora no SDD consolidado:** —
**PRs:** —

Origem: [[D-2026-10-05-PACOTE-VALIDADE-PENDENCIAS-FORKS]] (F-PP-3, F-PP-4). Vizinho: [[PACOTE-VALIDADE]] (a ponte do pacote foi corrigida no #530).

## Docs

- [`docs/accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md`](../../accounting/PACOTE-VALIDADE-PENDENCIAS-brief.md) — §3 F2, itens 5–8 (teste vermelho pelo caminho real,
  correção mínima, ponte × reconciliação, regra de fixture), §5 forks ✅, insumo I4. Não autoriza código: exige "executa".
