---
id: "D-2026-10-22-RETENCOES-FONTE-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-RET-10..19 do BRIEF RETENCOES-FONTE ratificados por questionário, todos pela recomendação (a)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Dispara 1 pra ratificar os forks\" (sessão de ratificação aberta pela sessão de origem). Respostas no AskUserQuestion de 22/10, 3 rodadas (a 3ª em par com a Reinf). Decide forks; NÃO é 'executa' nem merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-RETENCOES-FONTE-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-22 — *"Dispara 1 pra ratificar os forks"*. As opções vieram de
`docs/accounting/BE-INCR-RETENCOES-FONTE-brief.md` §6 (#843), lido inteiro. Nó: [[RETENCOES-FONTE]]. F-RET-16 e F-RET-18
foram perguntados na mesma rodada de F-REINF-8/9 ([[D-2026-10-22-EFD-REINF-FORKS]]), para o dono ver o contrato cruzado.

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Fork | Resposta literal | Opção | Efeito no lançamento / no produto |
|---|---|---|---|
| F-RET-10 perna da retenção | "(a) Baixa sem caixa (Recomendado)" | (a) | reconhecimento bruto D despesa / C 2.1.2; retenção = baixa `WITHHOLDING` D 2.1.2 / C X a recolher |
| F-RET-11 título de imposto | "(a) Payable sem reconhecimento (Recomendado)" | (a) | `Payable` `origin = 'WITHHOLDING_TAX'`; baixa D conta a recolher / C banco; complementar após a 1ª baixa |
| F-RET-12 F7 AP com CSRF | "(a) F7 deriva o bruto (Recomendado)" | (a) | confirm grava PAYMENT + WITHHOLDING (`brutoDaParcela`) |
| F-RET-13 F7 AR sofrida | "(a) Tratamento WITHHOLDING (Recomendado)" | (a) | `SHORTFALL_TREATMENTS` ganha `WITHHOLDING` com partes por tributo |
| F-RET-14 sofridas × X7/X8 | "(a) Transitória a conciliar (Recomendado)" | (a) | recebimento D "retenções a conciliar"; X7/X8 inalterados; X7 ganha a baixa do retido (item 31) |
| F-RET-15 ISS retido sofrido | "(a) ISS sobre serviços (Recomendado)" | (a) | D "ISS sobre serviços" (dedução, papel `issDeducaoAccountId`); pergunta ao contador junto (P-RET-4) |
| F-RET-16 `natRend` | "(a) natRend no perfil (Recomendado)" | (a) | perfil ganha `natRend` + campos do R-2010; tabela única nasce no PR-1 daqui |
| F-RET-17 IRRF de PF | "(a) Soma do mês (Recomendado)" | (a) | tabela mensal + art. 3º-A + deduções informadas; pagamentos do mês ao mesmo CPF somam (P-RET-7 segue ao contador) |
| F-RET-18 leitura das feitas | "(a) No PR-2, com o AP (Recomendado)" | (a) | rotas + porta `findMadeForReinf` no PR-2 |
| F-RET-19 plano de contas | "(a) Reusa 2.1.7.03 (Recomendado)" | (a) | IRRF de serviço em 2.1.7.03; torres 2.1.9 e 1.1.8; referencial DRAFT até P-RET-4 |

Nenhuma escolha contra a recomendação.

## Efeito

O BRIEF fica sem fork pendente. O PR-1 continua só esperando o `executa` dele; PR-2, PR-3 e PR-4 deixam de esperar fork e
precisam de `executa` próprio (e o PR-3/PR-4 das pendências do contador que o próprio BRIEF lista: P-RET-4, P-RET-7..9).

## O que NÃO decide

Não é `executa`, não é merge e não responde nenhuma P-RET (validação externa).
