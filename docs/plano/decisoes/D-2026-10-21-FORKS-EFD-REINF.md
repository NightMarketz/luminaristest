---
id: "D-2026-10-21-FORKS-EFD-REINF"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-REINF-1..5 do ADR-INCR-EFD-REINF ratificados por questionário"
estado: "decided"
autorizacao: "dono, chat, 2026-10-21: \"dispara os chats A, C e F agora\" — Chat F: \"ratificar por questionário os forks de IBS-CBS-2027, RETENCOES-FONTE, EFD-REINF e EFICIENCIA-FISCAL — grava as decisões, sem BRIEF, sem 'executa'\". Respostas no AskUserQuestion de 21/10. NÃO é BRIEF nem 'executa'"
atualizado: "2026-10-21"
---
# D-2026-10-21-FORKS-EFD-REINF

**Estado:** `decided`. **Autorização:** dono, chat, 21/10/2026 — *"dispara os chats A, C e F agora"* (Chat F: questionário
+ gravar decisões, sem BRIEF, sem 'executa'). As respostas vieram do AskUserQuestion de 21/10. As opções foram preparadas a
partir de [[EFD-REINF]] / `docs/adr/ADR-INCR-EFD-REINF.md`, com as normas citadas pelo dossiê
`pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs`.

## Respostas do dono

| Fork | Resposta | O que fica decidido |
|---|---|---|
| F-REINF-1 saída da fase 1 | **XML + relatório** (a) | XML 2.1.x não assinado testado contra o XSD, relatório de conferência e `ReinfBatch` com hash/defasado |
| F-REINF-2 transmissão | **Depois, condicionado** (a) | Porta nomeada já; adaptador de webservice só no PR-4, com leiaute oficial lido e um tenant real que retenha |
| F-REINF-3 fatiamento | **4 PRs** (a) | R-4020 primeiro; 'executa' por PR |
| F-REINF-4 dividendos isentos | **Informar isentos** (a) | R-4010 também com os isentos (IN RFB 2.043 art. 6º § 3º); dado vem do IRRF-DISTRIBUICAO |
| F-REINF-5 natureza do rendimento | **legal_parameters DRAFT** (a) | Tabela 01 em `legal_parameters` com fonte, DRAFT até leitura oficial; valores conferidos pelo contador (P-REINF-2) |

## Fora do questionário do dono

Pacote P-REINF ao contador ([[D1]]) segue como no ADR §9.

## O que NÃO decide

Não há BRIEF, não há 'executa' e não há merge. O BRIEF precisa de pedido próprio.
