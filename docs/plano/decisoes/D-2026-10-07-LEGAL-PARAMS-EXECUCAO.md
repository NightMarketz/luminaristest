---
id: "D-2026-10-07-LEGAL-PARAMS-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Execução do BE-INCR-LEGAL-PARAMS: 'executa' + lacunas L-1..L-7 (questionário)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-07: \"Executa o BE-INCR-LEGAL-PARAMS\" — sessao-feature; lacunas por questionário (AskUserQuestion) no mesmo dia"
atualizado: "2026-10-07"
---
# D-2026-10-07-LEGAL-PARAMS-EXECUCAO — cédulas da sessão de execução

**Estado:** `decided` (7/7).
**Autorização:** dono, chat, 07/10/2026: *"Executa o BE-INCR-LEGAL-PARAMS"*. As lacunas apareceram no passo 1 da
`sessao-feature` e foram respondidas pelo AskUserQuestion (o agente apresentou, o dono decidiu). Registro completo
na emenda §9 do [`BE-INCR-LEGAL-PARAMS-brief.md`](../../accounting/BE-INCR-LEGAL-PARAMS-brief.md). Nó: [[LEGAL-PARAMS]].

| # | Lacuna | Resposta literal |
|---|---|---|
| L-1 | Repoint do imobilizado (FK `FixedAsset.rateId → DepreciationRate`, Restrict) | *"Coluna nova no bem"* (Recomendado) |
| L-2 | Como se recebe `PLATFORM_ADMIN` | *"Comando de terminal"* (Recomendado) |
| L-3 | Gatilho e alcance do recálculo do item 10 | *"Dispara na publicação + varredura"* (Recomendado) — IRPJ/CSLL e PIS/Cofins |
| L-4 | Fatiamento | *"4 PRs em sequência"* (Recomendado) |
| L-5 | Corrente de auditoria dos eventos de plataforma | *"Corrente própria da plataforma"* (Recomendado) |
| L-6 | "Linha publicada nunca muda" × revogar | *"Só o status muda"* (Recomendado) |
| L-7 | Substituída sai do lookup? | *"Sim, a substituída sai"* (Recomendado) |
