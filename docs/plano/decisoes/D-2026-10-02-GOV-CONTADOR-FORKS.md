---
id: "D-2026-10-02-GOV-CONTADOR-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Ratificação por questionário: forks F-GOV-7..11 do BRIEF BE-INCR-ACCOUNTANT-GOVERNANCE"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02: rodada de ratificação por questionário dos forks pendentes (AskUserQuestion) — só decisão, sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-GOV-CONTADOR-FORKS — cédulas da ratificação do BRIEF de governança do contador

**Estado:** `decided` (F-GOV-7..11, 5/5)
**Autorização:** dono, chat, 02/10/2026: *"Autorizo uma rodada de ratificação por questionário dos forks pendentes
abaixo (dono, 02/10). Só decisão: não escreva código nem BRIEF novo, não dê 'executa'."* Frontmatter de
[[GOV-CONTADOR]] conferido antes: os cinco seguiam pendentes. Cada pergunta levou a base legal da coluna "O que a lei
diz" do BRIEF §5.
**Não é "executa"** (ORCH-006). **F-GOV-1** (consulta ao CRC-SP) continua do dono, fora do código. Em 02/10 (2ª sessão)
a pergunta foi montada em [`CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md`](../../accounting/CONSULTA-CRC-SP-2026-10-02-F-GOV-1.md),
com o efeito do F-GOV-11 (a) abaixo como ponto a validar. O dono envia. Nada aqui foi decidido nem marcado como resolvido.

Documento dos forks: [`BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`](../../accounting/BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md)
§5 (texto e base legal) e §5.3 (escolhas e efeitos).

| Fork | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| F-GOV-7 | O que o contador alcança nos livros do cliente | (a+) mínimo + objeto assinado | *"(a+) Mínimo + objeto assinado (Recommended)"* | não |
| F-GOV-8 | Como o dono aponta o contador; aceite | (a) reforçada: aceite + declaração | *"(a) reforçada: aceite + declaração (Recommended)"* | não |
| F-GOV-9 | Nome e CRC do sign-off com atribuição ativa | (a) CRC digitado tem de bater | *"(a) CRC digitado tem de bater (Recommended)"* | não |
| F-GOV-10 | O dono encerra sozinho? | (a) sim, com motivo | *"(a) Sim, com motivo (Recommended)"* | não |
| F-GOV-11 | Quem reabre período que esteve com um contador | (b) cada período com seu contador | *"(a) Atribuição ativa governa tudo"* | **sim** |

## Consequência registrada (contra a recomendação)

- **F-GOV-11 (a):** sem `responsibleFrom` no aceite e sem cobertura por período. O contador ativo reabre qualquer
  `SOFT_CLOSED`. Sem atribuição ativa, o dono reabre tudo, inclusive logo depois de encerrar a atribuição
  (F-GOV-10 a). O BRIEF contava com o F-GOV-11 (b) para reduzir esse risco. Com (a), ele volta inteiro e fica
  coberto só pela trilha. A regra "cada contador assina o seu período" (Manual ECD L9 p. 12; Res. CFC 1.590 art. 9º
  § único e art. 10) passa a valer pelo contrato e pela ECD, não pelo sistema.
