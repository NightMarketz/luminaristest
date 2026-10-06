---
id: "D-2026-10-06-CRM-RB-PRE-ADR-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "PRE-ADR do CRM-RB ratificado (F-RBP1..3) + emenda do BRIEF autorizada — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — F-RBP1..3 na recomendação + 'Sim, emendar' (emenda do BRIEF do CRM-RB com os achados do PRE-ADR). Sem 'executa'"
atualizado: "2026-10-06"
---
# D-2026-10-06-CRM-RB-PRE-ADR-FORKS — PRE-ADR do [[CRM-RB]]

**Estado:** `decided` (3 cédulas na recomendação + autorização da emenda).
**Autorização:** dono, chat, 06/10/2026, questionário. **Não é "executa"** (ORCH-006).

Origem: `docs/adr/PRE-ADR-CRM-REPORT-BUILDER.md` §3 (PR #550). O PRE-ADR passa a **Accepted**.

| Fork | Pergunta (resumo) | Decisão | Contra? |
|---|---|---|---|
| F-RBP1 | Perfil de execução: regra 2 pela letra ou só para invariante | **(a)** `opus-medio` — o parêntese da regra 2 nomeia "migração de schema" | não |
| F-RBP2 | Fatiamento | **(a)** 3 PRs: **PR-1** `features/fx` → **PR-2** builder → **PR-3** remoção do `custom-kpis` | não |
| F-RBP3 | O que o número "pipeline" do CRM mede (BRIEF §4.2, ortogonal) | **(a)** oportunidades abertas, por moeda; sem a tabela de oportunidades, leads abertos. Conserto da visão geral = instrumentação → correção, **com autorização própria**, fora do nó | não |
| — | Emendar o BRIEF com os achados do PRE-ADR? | *"Sim, emendar"* — A1 (`sort.by` aceito e ignorado: implementar ou 400; fork se não óbvio), A2 (teto por leitura em lotes, `getTableDataStream`, parando no teto), A3 (join com tabela não instalada não some em silêncio), A4 (fuso do agrupamento por período, só-dia), A5 (linhas citadas) | — |

## Consequências

- Emenda feita no BRIEF §9 (`docs/crm/BE-INCR-CRM-REPORT-BUILDER-brief.md`), no mesmo PR. Entraram direto, por regra:
  teto checado durante a leitura em lotes (E2), join ausente → `moduleNotInstalled` antes do agregador (E3), balde de
  campo só-dia pelo dia escrito (E4), citações (E5).
- **6º achado (A6):** com várias medidas o agregador soma tudo num único `value` (`AggregatePipelineProcessor.ts:319-350`).
- **Forks novos PENDENTES:** F-RB9 (`sort` por medida: implementar × recusar), F-RB10 (várias medidas), F-RB11 (fuso de
  `datetime`/`_createdAt`). O nó segue `planned` até a ratificação deles; o perfil `opus-medio` vale depois.
- Correção ao PRE-ADR: `closedAt` é `datetime`, não só-dia (`OpportunitiesModule.ts:113`); o exemplo "ganhos por mês"
  cai no F-RB11, não na regra do dia escrito.
- O conserto do valor de pipeline na visão geral (`useCrmData.ts`) nasce como instrumentação → correção, fora do CRM-RB,
  e exige autorização própria.
