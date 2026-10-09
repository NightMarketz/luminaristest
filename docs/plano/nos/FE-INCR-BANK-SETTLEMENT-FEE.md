---
id: "FE-INCR-BANK-SETTLEMENT-FEE"
tipo: "fe"
dominio: "financeiro"
titulo: "Tarifa do provedor na tela de baixas do F7 (bruto, retido, líquido; aviso G7; método ProviderBalance)"
estado: "planned"
estado_detalhe: "10/10: BRIEF canônico #616 (F-FE-FEE-1..3 ratificados 09/10) + EMENDA 1 (#617: itens 10–15, forks F-FEE-E1/E2 PENDENTES). Depende do PR de BE da view (#620: feeCents/feeEntryId no BankSettlementItemView, sem merge). #615 mergeado. Sem 'executa'"
depende_de: ["[[F5]]", "[[FE-INCR-BANK-SETTLEMENT]]"]
autorizacao: "dono, chat, 2026-10-09: \"planeja o BRIEF de FE da tarifa no F7\" + \"ratifica os forks com as recomendações\" (#616) · dono, chat, 2026-10-10: \"Autorizo planejar o BRIEF do FE da tarifa no F7 — sessao-planejamento, sem 'executa'.\" + questionário: \"#616 + emenda do #617\" ([[D-2026-10-10-FE-F7-TARIFA-FORKS]]) · dono, chat, 2026-10-10: \"Executa o patch do F-TAR-1 no #615, sem merge\" + \"PR de BE novo\" (só o BE da view)"
ancora_sdd: "—"
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: F-FEE-E1/E2 PENDENTES na EMENDA 1. Ratificados, a previsão é sonnet-alto (regra 4: 15 itens, só FE)"
atualizado: "2026-10-10"
---
# FE-INCR-BANK-SETTLEMENT-FEE — Tarifa do provedor na tela de baixas do F7 (bruto, retido, líquido; aviso G7; método ProviderBalance)

**Estado:** `planned` — 10/10: BRIEF canônico #616 (F-FE-FEE-1..3 ratificados 09/10) + EMENDA 1 (#617: itens 10–15, forks F-FEE-E1/E2 PENDENTES). Depende do PR de BE da view (#620: feeCents/feeEntryId no BankSettlementItemView, sem merge). #615 mergeado. Sem 'executa'  
**Autorização:** dono, chat, 2026-10-09: "planeja o BRIEF de FE da tarifa no F7" + "ratifica os forks com as recomendações" (#616) · dono, chat, 2026-10-10: "Autorizo planejar o BRIEF do FE da tarifa no F7 — sessao-planejamento, sem 'executa'." + questionário: "#616 + emenda do #617" ([[D-2026-10-10-FE-F7-TARIFA-FORKS]]) · dono, chat, 2026-10-10: "Executa o patch do F-TAR-1 no #615, sem merge" + "PR de BE novo" (só o BE da view)  
**Depende de:** [[F5]], [[FE-INCR-BANK-SETTLEMENT]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** —

## Docs

- [`docs/accounting/FE-INCR-BANK-SETTLEMENT-FEE-brief.md`](../../accounting/FE-INCR-BANK-SETTLEMENT-FEE-brief.md) —
  **BRIEF canônico** (#616, 09/10). F-FE-FEE-1 → b, F-FE-FEE-2 → a, F-FE-FEE-3 → a.
- [`docs/accounting/FE-INCR-BANK-SETTLEMENT-FEE-EMENDA-1-brief.md`](../../accounting/FE-INCR-BANK-SETTLEMENT-FEE-EMENDA-1-brief.md)
  — **EMENDA 1** (#617, 10/10): aviso G7, método `ProviderBalance` por extrato, conferência visual e rótulo "Retido pelo
  provedor". Forks **F-FEE-E1** (a seção de contas do F-FE-FEE-1 (b) × F-ENC-1/F-ENC-11 da EMENDA 3.3) e **F-FEE-E2**
  (tipo da resposta à mão × `.gen.ts`) PENDENTES. Nasceu do BRIEF paralelo `FE-INCR-F7-TARIFA` (mesma sessão, sem ver o
  #616). As decisões F-TAR e o destino de cada uma estão em [[D-2026-10-10-FE-F7-TARIFA-FORKS]].
- BE da view: PR #620 (`claude/be-f7-fee-view`) (sem merge). É o mesmo campo do E31 da EMENDA 3.3
  (`BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md`).
- Origem: `D-2026-10-10-F5-PR3-FORKS`: *"a tela do F7 mostrar a tarifa (`feeCents`) vai num BRIEF de FE separado"*.
  O G7 vale e não se rediscute.
