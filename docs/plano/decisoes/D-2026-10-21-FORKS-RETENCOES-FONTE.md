---
id: "D-2026-10-21-FORKS-RETENCOES-FONTE"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-RET-1..8 do ADR-INCR-RETENCOES-FONTE ratificados por questionário; F-RET-7 = incluir PF (contra a recomendação); F-RET-9 vai ao contador (P-RET-4)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"dispara os chats A, C e F agora\" — Chat F: \"ratificar por questionário os forks de IBS-CBS-2027, RETENCOES-FONTE, EFD-REINF e EFICIENCIA-FISCAL — grava as decisões, sem BRIEF, sem 'executa'\". Respostas no AskUserQuestion de 21/10. NÃO é BRIEF nem 'executa'"
atualizado: "2026-10-21"
---
# D-2026-10-21-FORKS-RETENCOES-FONTE

**Estado:** `decided`. **Autorização:** dono, chat, 21/10/2026 — *"dispara os chats A, C e F agora"* (Chat F: questionário
+ gravar decisões, sem BRIEF, sem 'executa'). As respostas vieram do AskUserQuestion de 21/10. As opções foram preparadas a
partir de [[RETENCOES-FONTE]] / `docs/adr/ADR-INCR-RETENCOES-FONTE.md`, com as normas citadas pelo dossiê
`pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs`.

## Respostas do dono

| Fork | Resposta | O que fica decidido |
|---|---|---|
| F-RET-1 nós × PES-2 | **Dois nós** (a) | RETENCOES-FONTE e EFD-REINF substituem o PES-2 de 12/10; o PRE-ADR de pessoal ganha a marca "superado por" no BRIEF |
| F-RET-2 fatiamento | **4 PRs** (a) | PR-1/PR-2 fecham o lado do pagador; PR-3 liga X7/X8; 'executa' por PR |
| F-RET-3 escopo do pagador | **Completo** (a) | IRRF + CSRF + INSS 11% (cessão de mão de obra) + ISS retido, com perfil por contraparte × natureza |
| F-RET-4 CSRF parcelada | **Proporcional** (a) | Retenção em cada baixa, com mínimo de R$10 por pagamento; em 2027 só a CSLL de 1% |
| F-RET-5 regime do beneficiário | **No cadastro** (a) | Regime em `Counterparty` + declaração de optante anexável; aviso quando faltar (validação = P-RET-1) |
| F-RET-6 mínimo R$10 PJ | **Reter e avisar** (a) | Retém qualquer valor > 0 até o contador mostrar a base (P-RET-2) |
| F-RET-7 beneficiário PF | **Incluir** (b) — **contra a recomendação** | IRRF de PF pela tabela progressiva entra neste nó. **Reabre F-PES-0** (fronteira com o nó de pessoal): o BRIEF tem que fixar dependentes, tabela progressiva com vigência em LEGAL-PARAMS e o que fica para eSocial/pessoal |
| F-RET-8 alimentar X7/X8 | **Sugestão** (a) | A prévia sugere a soma das retenções sofridas; o valor manual ratificado prevalece, com aviso de divergência |

## Fora do questionário do dono

F-RET-9 (conta do ISS retido sofrido) é do contador e vira P-RET-4; o BRIEF usa o provisório (a). O pacote P-RET-1..5 vai ao contador ([[D1]]).

## O que NÃO decide

Não há BRIEF, não há 'executa' e não há merge. O BRIEF precisa de pedido próprio.
