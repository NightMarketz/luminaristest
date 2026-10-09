---
id: "D-2026-10-10-FE-F7-TARIFA-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Forks do BRIEF FE-INCR-F7-TARIFA — F-TAR-1..9 ratificados pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10: \"ratifico F-TAR-1..8 → a, F-TAR-9 → b\" + \"F-TAR-9.1 → b\" + questionário: \"PR de BE novo\" e \"#616 + emenda do #617\""
atualizado: "2026-10-10"
---
# D-2026-10-10-FE-F7-TARIFA-FORKS — forks do [[FE-INCR-BANK-SETTLEMENT-FEE]] (ex-`FE-INCR-F7-TARIFA`)

**Estado:** `decided`.
**Autorização:** dono, chat, 2026-10-10: *"ratifico F-TAR-1..8 → a, F-TAR-9 → b"* e *"F-TAR-9.1 → b"*. Os caminhos e as justificativas
estavam no BRIEF `FE-INCR-F7-TARIFA` (hoje `docs/accounting/FE-INCR-BANK-SETTLEMENT-FEE-EMENDA-1-brief.md`). Esta nota não acrescenta fundamento normativo: o
parecer colado no chat antes da ratificação **não** foi adotado como fundamento (citações legais não conferidas).

| # | Decisão | Ratificado |
|---|---|---|
| F-TAR-1 | Onde a view do item do F7 ganha `feeCents` + `feeEntryId` | **(a)** patch no próprio #615 antes do merge |
| F-TAR-2 | Fonte do bruto na tela | **(a)** `proposedCents + chargeCents`, conferido contra `\|linha\| + feeCents` |
| F-TAR-3 | Método no extrato de conta de provedor | **(a)** só `ProviderBalance`, pré-selecionado; extrato bancário segue com os 4 de hoje |
| F-TAR-4 | Tarifa na lista | **(a)** sublinha `bruto · retido` na célula Valor, só quando `feeCents > 0` |
| F-TAR-5 | Conferência que não bate | **(a)** aviso `✗`, confirmar habilitado; o pré-cheque do BE é a autoridade |
| F-TAR-6 | Rótulo de `feeCents` | **(a)** "Retido pelo provedor" |
| F-TAR-7 | Texto do aviso G7 | **(a)** `reason` do BE verbatim sob rótulo i18n |
| F-TAR-8 | Passo extra antes de confirmar item com aviso G7 | **(a)** nenhum |
| F-TAR-9 | Configuração de `providerFeeExpenseAccountId` | **(b)** seletor neste nó (item 16 do BRIEF) |
| F-TAR-9.1 | Onde o seletor aparece (dono, chat, 2026-10-10: *"F-TAR-9.1 → b"*) | **(b)** seção compacta no topo da sub-aba "Baixas por retorno", visível em extrato de conta de provedor; a dica do erro aponta para ela |

## O que a ratificação NÃO cobre

- **Executar o patch do F-TAR-1 no #615.** Exige "executa" próprio para o #615 (a sessão deste BRIEF tinha ordem de
  não tocá-lo).
- **Implementar este nó.** Segue sem "executa".

## Atualização 2026-10-10 — questionário depois do "executa" do F-TAR-1

Ao abrir o "executa", a sessão achou o #615 **já mergeado** (`2f942f73`) e o BRIEF concorrente
`FE-INCR-BANK-SETTLEMENT-FEE` (#616) em `main`, com F-FE-FEE-1..3 ratificados em 09/10 e em conflito com F-TAR-2/4/9.
Respostas do dono (chat, 2026-10-10):

- **Veículo do F-TAR-1:** *"PR de BE novo"*. O patch (`feeCents`/`feeEntryId` na `BankSettlementItemView`) vai num PR
  contra `main` (`claude/be-f7-fee-view`), sem merge.
- **BRIEF que prevalece:** *"#616 + emenda do #617"*. O #616 é o canônico, o #617 vira
  `FE-INCR-BANK-SETTLEMENT-FEE-EMENDA-1-brief.md`, e nos conflitos valem as decisões do #616. O nó `FE-INCR-F7-TARIFA` foi
  renomeado para [[FE-INCR-BANK-SETTLEMENT-FEE]].

Destino de cada F-TAR: **mantidos** F-TAR-3, 5, 6, 7 e 8 (itens 10–13 da emenda). **Substituídos pelo #616** F-TAR-2
(bruto = `|linha| + feeCents`), F-TAR-4 (coluna condicional) e F-TAR-9/9.1 (F-FE-FEE-1 (b)). O próprio F-FE-FEE-1 (b)
colide com F-ENC-1/F-ENC-11 da EMENDA 3.3 e virou o fork **F-FEE-E1**, PENDENTE na emenda.
