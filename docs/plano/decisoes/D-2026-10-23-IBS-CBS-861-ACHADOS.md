---
id: "D-2026-10-23-IBS-CBS-861-ACHADOS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Achados da revisão do #861 (IBS-CBS-2027 PR-5): regra de vencimento desconhecida vira null + aviso; resumo de apuração substituída responde 200 + aviso"
estado: "decided"
autorizacao: "dono, chat do coordenador, 2026-10-23: \"Abra uma sessão nova com os 8 achados copiados do relatório da revisão do #861, para confirmar e corrigir num PR novo, sem merge.\" + questionário na sessão dos achados (23/10): achado 2 \"null + aviso (Recomendado)\"; achado 3 \"200 + aviso (Recomendado)\""
atualizado: "2026-10-23"
---
# D-2026-10-23-IBS-CBS-861-ACHADOS

Duas lacunas que o BRIEF do [[IBS-CBS-2027]] (item 22) não cobria e apareceram ao confirmar os achados da revisão do #861.

| Lacuna | Resposta do dono (literal) | Efeito |
|---|---|---|
| Achado 2: linha `IBS_CBS/<tributo>/VENCIMENTO` publicada com regra que o código não lê (só `valorInt`, ou o rascunho do IBS da migração publicado sem valor) derrubava com 500 todo resumo do tributo. O item 22 só cobre a linha DRAFT sem valor | "null + aviso (Recomendado)" | `vencimento: null` + aviso `VENCIMENTO_REGRA_DESCONHECIDA` com o id da linha. A proposta passa a exigir `valorTexto` com regra conhecida (achado 1) |
| Achado 3: `GET /ibs-cbs-assessments/:id/resumo` de uma apuração SUPERSEDED devolvia o saldo da versão antiga sem sinal | "200 + aviso (Recomendado)" | 200 com o aviso `APURACAO_SUBSTITUIDA` ("não recolha por ela"); o histórico segue consultável |

Achado 8 (contador `avisos` do job) descartado: no IBS/CBS uma linha legal alcança um só tributo e há uma apuração viva
por (dono, tributo, ano, mês), então 1 por linha = 1 por período, a mesma unidade do X7/X8.

Não há merge.
