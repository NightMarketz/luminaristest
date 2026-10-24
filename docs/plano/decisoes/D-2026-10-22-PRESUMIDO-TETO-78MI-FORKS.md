---
id: "D-2026-10-22-PRESUMIDO-TETO-78MI-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-PT-1..7 do BRIEF PRESUMIDO-TETO-78MI ratificados por questionário, todos pela recomendação"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Dispara 1 pra ratificar os forks\" (sessão de ratificação aberta pela sessão de origem). Respostas no AskUserQuestion de 22/10, 2 rodadas. Decide forks; NÃO é 'executa' nem merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-PRESUMIDO-TETO-78MI-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-22 — *"Dispara 1 pra ratificar os forks"*. As opções vieram de
`docs/accounting/BE-INCR-PRESUMIDO-TETO-78MI-brief.md` §5 (#844), lido inteiro. Nó: [[PRESUMIDO-TETO-78MI]].

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Fork | Resposta literal | Opção | O que fica decidido |
|---|---|---|---|
| F-PT-1 forma | "(c) Avisa + trava confirmar (Recomendado)" | (c) | aviso no perfil/obrigações e na prévia; 400 na confirmação da apuração Presumido com `EXCEDIDO` (Lei 9.718 art. 14 I) |
| F-PT-2 fonte da receita | "(c) O maior dos dois (Recomendado)" | (c) | maior entre razão e declarado no perfil, com aviso de divergência |
| F-PT-3 medida | "(a) Receita total (Recomendado)" | (a) | receita total (IN 1.700 art. 59 § 1º), sujeita a P-PT-1 do contador |
| F-PT-4 meses no ano de início | "(a) Conta inteiro (Recomendado)" | (a) | `13 − mês`, sujeito a P-PT-2 |
| F-PT-5 REAL × `lucroRealObrigatorio` | "(a) Avisar (Recomendado)" | (a) | aviso nas obrigações |
| F-PT-6 multi-unidade | "(a) Leitura por dono (Recomendado)" | (a) | `sumRevenueNetByOwner` no repositório |
| F-PT-7 valor na tabela legal | "(a) Em reais (Recomendado)" | (a) | chaves `PRESUMIDO_TETO_*_REAIS`, × 100n na leitura |

Nenhuma escolha contra a recomendação.

## O que NÃO decide

Não é `executa` do PR único, não é merge e não responde P-PT-1..3.
