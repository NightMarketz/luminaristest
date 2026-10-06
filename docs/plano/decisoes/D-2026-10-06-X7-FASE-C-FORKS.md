---
id: "D-2026-10-06-X7-FASE-C-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks da Fase C do X7 (F-TC-1..7: ISS por competência e memória de cálculo) — ratificados por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-06, questionário — F-TC-1..7, todos na recomendação. Sem 'executa'"
atualizado: "2026-10-06"
---
# D-2026-10-06-X7-FASE-C-FORKS — forks da Fase C do [[X7]]

**Estado:** `decided` (7 cédulas, todas na recomendação).
**Autorização:** dono, chat, 06/10/2026, questionário. **Não é "executa"** (ORCH-006): cada PR da Fase C (PR-1
memória, PR-2 ISS; BRIEF §3.1) exige o próprio.

Origem: `docs/accounting/BE-INCR-TAX-ASSESSMENT-C-brief.md` §3 (PR #545).

| Fork | Pergunta (resumo) | Decisão | Contra? |
|---|---|---|---|
| F-TC-1 | De onde vem o município do ISS de cada nota | **(a)** `cLocPrestacao` do `payloadJson` da tentativa corrente — o município gravado no envio, sem migração | não |
| F-TC-2 | Nota autorizada sem `vIssCents` | **(a)** soma zero, conta em `documentosSemIss` e avisa na linha-meta | não |
| F-TC-3 | Nota cancelada depois da competência | **(a)** vale o status atual: `CANCELLED` sai | não |
| F-TC-4 | `AUTHORIZED_DIVERGENT` | **(a)** entra, com coluna de contagem `divergentes` | não |
| F-TC-5 | Qual apuração entra na janela da memória | **(a)** só apurações inteiras na janela (`periodoBounds` ⊆ janela; `A00` só se a janela cobrir o ano) | não |
| F-TC-6 | Resumo da apuração na planilha | **(a)** linhas `RESUMO` das colunas da apuração antes das `MEMORIA` | não |
| F-TC-7 | Superfície do relatório de ISS | **(b)** kind `EXPORT_ISS_BY_COMPETENCE` no exportador, entregável no pacote; sem rota JSON | não |

## Consequências

- O PR-2 (ISS) tem as pré-condições do BRIEF §3.1 cumpridas (F-TC-1..4 e F-TC-7). Nenhum path novo de API (F-TC-7 b):
  o guard de path-count do openapi não sobe.
- A ressalva do F-TC-1 segue aberta como validação externa: local da prestação ≠ município de incidência nas
  exceções da LC 116 (BRIEF §4, P-C2). Não trava código.
- Nota emitida fora do nosso fluxo (Paulistana em SP capital, regime normal) não aparece no relatório — risco já
  declarado no cabeçalho do BRIEF, não muda com estas cédulas.
