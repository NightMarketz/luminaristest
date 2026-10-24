---
id: "D-2026-10-22-ISS-TRANSICAO-IBS-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-ISS-1..7 do BRIEF ISS-TRANSICAO-IBS ratificados por questionário, todos pela recomendação (a)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Dispara 1 pra ratificar os forks\" (sessão de ratificação aberta pela sessão de origem). Respostas no AskUserQuestion de 22/10, 2 rodadas. Decide forks; NÃO é 'executa' nem merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-ISS-TRANSICAO-IBS-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-22 — *"Dispara 1 pra ratificar os forks"*. As opções vieram de
`docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` §5 (#847), lido inteiro. Nó: [[ISS-TRANSICAO-IBS]].

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Fork | Resposta literal | Opção | O que fica decidido |
|---|---|---|---|
| F-ISS-1 significado do `issAliquotaBp` | "(a) Alíquota de 2028 (Recomendado)" | (a) | campo = alíquota municipal de 31/12/2028; a emissão aplica o fator pela data do fato gerador; no Simples com retenção não aplica |
| F-ISS-2 teto 2029–2032 | "(a) Continua 500 (Recomendado)" | (a) | `ALIQUOTA_MAX_BP` = 500 até 2032-12-31 |
| F-ISS-3 benefício no Simples | "(a) Dois ramos, espera contador (Recomendado)" | (a) | mecanismo com § 2º / § 3º; ramo ativo = resposta da P-ISS-2, em linha de parâmetro |
| F-ISS-4 piso `DRAFT` em 2029 | "(a) Erro nomeado (Recomendado)" | (a) | 400 nomeado na apuração do Simples com benefício |
| F-ISS-5 alíquota a partir de 2033 | "(a) Erro nomeado (Recomendado)" | (a) | 400 nomeado com valor; `null` aceito |
| F-ISS-6 linhas DRAFT do IBS 2029–2032 | "(a) Este nó (Recomendado)" | (a) | PR-1 deste nó semeia as 8 linhas |
| F-ISS-7 fatiamento | "(a) 2 PRs (Recomendado)" | (a) | PR-1 sem dependência; PR-2 depois de P-ISS-1..3 |

Nenhuma escolha contra a recomendação.

## O que NÃO decide

Não é `executa`, não é merge e não responde P-ISS-1..5.
