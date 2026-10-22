---
id: "D-2026-10-22-IBS-CBS-PR4-SPLIT"
tipo: "decisao"
dominio: "fiscal"
titulo: "PR-4 do IBS-CBS-2027: split payment é tratamento da falta no F7, com IBS e CBS separados, competência informada e recibo de split no AR"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Executa o PR-4 do IBS-CBS-2027 — sessao-feature, sem merge.\" + questionário de lacunas na mesma sessão: mecanismo \"Tratamento da falta (Recomendado)\"; IBS × CBS \"Dois valores (Recomendado)\"; mês \"Operador informa (Recomendado)\"; AR vizinho \"Pode estender (Recomendado)\""
atualizado: "2026-10-22"
---
# D-2026-10-22-IBS-CBS-PR4-SPLIT

Lacunas achadas na abertura do PR-4 ([[IBS-CBS-2027]], BRIEF itens 19–20) pela sessao-feature, antes de qualquer código.
Texto da emenda: `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` § "EMENDA PR-4 (22/10)".

| Lacuna | Resposta do dono (literal) | Efeito |
|---|---|---|
| O item 19 põe o split como parte do encargo, mas no F7 encargo é o EXCESSO (linha > saldo) e as partes somam esse excesso (Emenda 3.3, E6); no split a linha chega MENOR | "Tratamento da falta (Recomendado)" | O confirm recebe o split; `\|linha\| + tarifa + split = saldo`; o resto do título é quitado sem caixa (D IBS/CBS a recolher / C cliente). `charge_parts` não é usado; `SHORTFALL_TREATMENTS` ganha `SPLIT_IBS_CBS` |
| `SPLIT_IBS_CBS` é uma classe só, mas IBS e CBS têm contas e apurações separadas | "Dois valores (Recomendado)" | `split.ibsCents` e `split.cbsCents`, cada um contra a conta a recolher do perfil fiscal |
| O título do AR não liga ao documento fiscal; o mês do débito extinto não é derivável | "Operador informa (Recomendado)" | `split.competencia` (AAAA-MM), padrão = mês da linha. Base: Decreto 12.955/2026 arts. 26 III, 27 § 1º e 44 § 3º, lidos no planalto compilado em 22/10 (dossiê `pesquisas-legais/verif-2026-10-22-ibs-cbs-split`) |
| Quitar o título exige recibo no AR com conta de débito explícita; `ReceivableService` é nó vizinho, fora do write_set | "Pode estender (Recomendado)" | `registerReceipt` aceita `kind = SPLIT_IBS_CBS` com conta obrigatória (só o F7 passa); um recibo por tributo |

Não há merge.
