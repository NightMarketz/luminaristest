---
id: "D-2026-10-13-FE-CRM-RB-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Forks do BRIEF da tela do builder de relatórios do CRM (F-FRB1..7) — por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-13, questionário — F-FRB1..7 todos (a), na recomendação. Sem 'executa'"
atualizado: "2026-10-13"
---
# D-2026-10-13-FE-CRM-RB-FORKS — forks da tela do builder ([[FE-INCR-CRM-REPORT-BUILDER]])

**Estado:** `decided` (7 cédulas, todas na recomendação).
**Autorização:** dono, chat, 13/10/2026, questionário, na sessão de planejamento aberta por *"Planeja a tela do builder
de relatórios do CRM"*. **Não é "executa"** (ORCH-006).

Origem: `docs/crm/FE-INCR-CRM-REPORT-BUILDER-brief.md` §4.

| Fork | Pergunta (resumo) | Decisão | Contra? |
|---|---|---|---|
| F-FRB1 | Onde a tela mora | **(a)** página `/crm/reports` + item "Relatórios" no menu do CRM | não |
| F-FRB2 | Pré-visualização automática ou por botão | **(a)** botão "Visualizar" | não |
| F-FRB3 | Várias medidas com o gráfico de uma série | **(a)** um gráfico por medida; o `ChartRenderer` compartilhado não muda | não |
| F-FRB4 | Como a tela obtém os 5 modelos | **(a)** rota nova no backend (`GET /api/crm/reports/templates`), com planejamento e autorização próprios | não |
| F-FRB5 | Joins na 1ª versão da tela | **(a)** sim, seção "avançado", PR próprio (PR-B) | não |
| F-FRB6 | KPI com dimensão | **(a)** só a dimensão de moeda (um card por moeda) | não |
| F-FRB7 | Nome do ponto com 2 dimensões | **(a)** como vem do BE ("Open \| USD"), trocando só o grupo sem moeda | não |

## Consequências

- Nenhum fork pendente no BRIEF. O nó segue `planned` até o "executa" de cada PR (A–D, BRIEF §2).
- **Pré-requisito novo de BE (F-FRB4):** a rota dos modelos não tem nó, BRIEF nem autorização — o PR-C espera por ela.
  Na mesma rota cabe expor os pares valor→moeda (BRIEF §6), o que acaba com o espelho `CRM_MONEY_CURRENCY_PAIRS_FE`.
