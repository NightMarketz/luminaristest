---
id: "D-2026-10-10-FE-F7-TARIFA-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Forks do BRIEF FE-INCR-F7-TARIFA — F-TAR-1..9 ratificados pelo dono"
estado: "decided"
autorizacao: "dono, chat, 2026-10-10: \"ratifico F-TAR-1..8 → a, F-TAR-9 → b\" + \"F-TAR-9.1 → b\""
atualizado: "2026-10-10"
---
# D-2026-10-10-FE-F7-TARIFA-FORKS — forks do [[FE-INCR-F7-TARIFA]]

**Estado:** `decided`.
**Autorização:** dono, chat, 2026-10-10: *"ratifico F-TAR-1..8 → a, F-TAR-9 → b"* e *"F-TAR-9.1 → b"*. Os caminhos e as justificativas
estão no BRIEF (`docs/accounting/FE-INCR-F7-TARIFA-brief.md` §5). Esta nota não acrescenta fundamento normativo: o
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
