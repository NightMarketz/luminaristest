---
id: "D-2026-10-21-CHAT-C-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Chat C: 21 forks ratificados pelas recomendações — W3 (C1..C3), TESTE-ACOPLAMENTO-PRESET (TAP-1..5), W1 (F-W1-1..6), BUILDER-VERTICAIS (BV-1..7)"
estado: "decided"
autorizacao: "dono, 2026-10-21, questionário do Chat C (AskUserQuestion), sobre os PRs de docs #788, #789, #790, #791: W3 → \"Ratifico as 3 (Recomendado)\"; TAP → \"Ratifico as 5 (Recomendado)\"; W1 → \"Ratifico as 6 (Recomendado)\"; BV → \"Ratifico as 7 (Recomendado)\". Decide forks; não autoriza código nem merge (sem 'executa')"
atualizado: "2026-10-21"
---
# D-2026-10-21-CHAT-C-FORKS — forks dos 4 planejamentos do Chat C

**Estado:** `decided`
**Autorização:** dono, 2026-10-21, questionário do Chat C (respostas literais no cabeçalho). Escopo: **ratificar forks**.
Não autoriza código (sem "executa") nem merge — os PRs #788..#791 seguem "não mergear sem OK".

Opções completas, evidência e alternativas descartadas estão em cada BRIEF/PRE-ADR; aqui fica só a escolha.

## [[W3]] — `docs/accounting/WIZARD-W3-CONFIRMACAO-RESUMO-brief.md` (PR #788)

| Fork | Decisão |
|---|---|
| F-W3-C1 | (a) campo novo `summaryChoice: 'confirm' \| 'correct'` |
| F-W3-C2 | (a) falha do classificador = `unclear`, repete a pergunta com os botões (`reason: 'error'`) |
| F-W3-C3 | (a) componente novo `SummaryConfirmation`, sem generalizar `CreationChoice` |

## [[TESTE-ACOPLAMENTO-PRESET]] — `docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md` (PR #789)

| Fork | Decisão |
|---|---|
| F-TAP-1 | (b) suítes + Core + cada módulo do `MODULE_REGISTRY` isolado |
| F-TAP-2 | (a) manifesto estático por plugin, escrito no teste |
| F-TAP-3 | (a) allowlist nomeada no teste, com motivo |
| F-TAP-4 | (a) teste nasce verde com `KNOWN_GAPS` que só encolhe; fixes nos nós FIX-PLUGINS-VENDA / FIX-ANALYTICS-RESIDUO |
| F-TAP-5 | (a) validador de runtime fica em FIX-ANALYTICS-RESIDUO |

## [[W1]] — `docs/accounting/W1-WIZARD-CUSTOM-CREATE-brief.md` (PR #790)

| Fork | Decisão |
|---|---|
| F-W1-1 | (a) servidor consolida a sessão persistida (W4) e devolve `creation` |
| F-W1-2 | (a) `done` devolve `COMPLETED` + `creation` |
| F-W1-3 | (a) rota nova grava o "Salvar" do painel manual na sessão |
| F-W1-4 | (a) `CustomCreationSchema` ganha `addedTables`; W1 aceito como L |
| F-W1-5 | (a) desmarcar tabela de módulo não-fixo desmarca o módulo com aviso; módulo fixo fica travado |
| F-W1-6 | (a) sessão nasce de preset ∪ módulos escolhidos |

## [[BUILDER-VERTICAIS]] — `docs/adr/PRE-ADR-BUILDER-VERTICAIS.md` (PR #791)

| Fork | Decisão |
|---|---|
| F-BV-1 | (a) manifesto Zod de composição, módulos por `id@versão` |
| F-BV-2 | (a) todo agrupamento vira módulo no registro, faseado |
| F-BV-3 | (a) arquétipo + ponte em código revisado; manifesto só declara `bridges` de enum fechado |
| F-BV-4 | (a) manifesto operacional separado do kit contábil (`kitRef`) |
| F-BV-5 | (a) arquivo versionado no repo agora; tabela Prisma no P5 |
| F-BV-6 | (a) só o dono publica até o P5 |
| F-BV-7 | (a) sync completo de upgrade fora deste nó (GAP-MAP #397) |

## Consequência

Os BRIEFs/PRE-ADR ficam com forks decididos; marcar "RATIFICADO" em cada documento é fold do PR de cada nó.
Próximo passo de qualquer um dos quatro exige autorização nova do dono (código = "executa").
