---
id: "D-2026-10-06-CRM-RB-EMENDA-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks da emenda §9 do BRIEF do CRM-RB ratificados (F-RB9..11) — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — F-RB9 (a), F-RB10 (a), F-RB11 (b) com default America/Sao_Paulo; todos na recomendação. Sem 'executa'"
atualizado: "2026-10-06"
---
# D-2026-10-06-CRM-RB-EMENDA-FORKS — forks da emenda §9 do [[CRM-RB]]

**Estado:** `decided` (3 cédulas, todas na recomendação).
**Autorização:** dono, chat, 06/10/2026, questionário. **Não é "executa"** (ORCH-006).

Origem: `docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md` §9.2 (emenda de 06/10, PR #550), aberta pela
[[D-2026-10-06-CRM-RB-PRE-ADR-FORKS]].

| Fork | Pergunta (resumo) | Decisão | Contra? |
|---|---|---|---|
| F-RB9 | `sort.by: 'measure'`: implementar ou recusar | **(a)** implementar no serviço: ordena pela medida em `key` (400 se várias medidas sem `key`); `sort` + `limit` aplicados pelo serviço depois da agregação | não |
| F-RB10 | Várias medidas (o agregador soma tudo num `value` só, A6) | **(a)** uma chamada ao agregador por medida → `series[]`; mantém o teto de 4 medidas do F-RB5; **muda o contrato de saída** (`points` → `series`) | não |
| F-RB11 | Fuso do balde de período para `datetime` e `_createdAt`/`_updatedAt` | **(b)** `timeZone` IANA do cliente no `run` (padrão `CrmAnalyticsInput`), default **`America/Sao_Paulo`** | não — mas o default **diverge** do `'UTC'` do padrão (`CrmAnalyticsService.ts:66`): decisão do dono |

## Consequências

- BRIEF atualizado no mesmo PR: item 7 (séries, ordenação, período), itens 14, 24 e 25, §3 (`sort.key` + refine,
  `TimeZoneSchema`, `RunSavedCrmReportSchema`, `ReportSeries`, `RunCrmReportOutput.series`, `meta.timeZone`,
  `ConvertedView.series`), §4.3, §9.1–§9.3.
- **Nenhum fork pendente** no BRIEF do CRM-RB. O nó segue `planned` só pelo "executa" de cada um dos 3 PRs
  (F-RBP2: fx → builder → remoção do `custom-kpis`); perfil `opus-medio` (F-RBP1) passa a valer.
- O FE vizinho (`FE-INCR-CRM-REPORT-BUILDER`) herda `series[]` e o envio do `timeZone` do navegador no `run`.
- Detalhes fixados por regra na emenda, sem cédula (contestáveis sem reabrir fork): `timeZone` no pedido de `run`, não no
  spec salvo; fuso inválido → 400; códigos `REPORT_SORT_KEY_REQUIRED`/`REPORT_SORT_KEY_NOT_FOUND`/`INVALID_TIME_ZONE`.
