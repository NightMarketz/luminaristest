---
id: "FE-INCR-F7-TARIFA"
tipo: "fe"
dominio: "financeiro"
titulo: "Tela do F7 mostra bruto, tarifa retida e líquido da baixa via provedor (F5 PR-3)"
estado: "planned"
estado_detalhe: "10/10: BRIEF escrito (sessao-planejamento); F-TAR-1..8 → a e F-TAR-9 → b ratificados (D-2026-10-10-FE-F7-TARIFA-FORKS); sub-fork F-TAR-9.1 (onde fica o seletor) PENDENTE. Depende do merge do #615 e do patch F-TAR-1 (feeCents/feeEntryId na view) no #615, que exige executa próprio. Sem 'executa'"
depende_de: ["[[F5]]", "[[FE-INCR-BANK-SETTLEMENT]]"]
autorizacao: "dono, chat, 2026-10-10: \"Autorizo planejar o BRIEF do FE da tarifa no F7 — sessao-planejamento, sem 'executa'.\" (só BRIEF + nota do nó) · dono, chat, 2026-10-10: \"ratifico F-TAR-1..8 → a, F-TAR-9 → b\" ([[D-2026-10-10-FE-F7-TARIFA-FORKS]])"
ancora_sdd: "—"
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: sub-fork F-TAR-9.1 PENDENTE. Ratificado, a previsão é sonnet-alto (regra 4: 16 itens, só FE; o BE do F-TAR-1 vai no #615)"
atualizado: "2026-10-10"
---
# FE-INCR-F7-TARIFA — Tela do F7 mostra bruto, tarifa retida e líquido da baixa via provedor (F5 PR-3)

**Estado:** `planned` — 10/10: BRIEF escrito (sessao-planejamento); F-TAR-1..8 → a e F-TAR-9 → b ratificados (D-2026-10-10-FE-F7-TARIFA-FORKS); sub-fork F-TAR-9.1 (onde fica o seletor) PENDENTE. Depende do merge do #615 e do patch F-TAR-1 (feeCents/feeEntryId na view) no #615, que exige executa próprio. Sem 'executa'  
**Autorização:** dono, chat, 2026-10-10: "Autorizo planejar o BRIEF do FE da tarifa no F7 — sessao-planejamento, sem 'executa'." (só BRIEF + nota do nó) · dono, chat, 2026-10-10: "ratifico F-TAR-1..8 → a, F-TAR-9 → b" ([[D-2026-10-10-FE-F7-TARIFA-FORKS]])  
**Depende de:** [[F5]], [[FE-INCR-BANK-SETTLEMENT]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** —

## Docs

- [`docs/accounting/FE-INCR-F7-TARIFA-brief.md`](../../accounting/FE-INCR-F7-TARIFA-brief.md) — **BRIEF 10/10**
  (`sessao-planejamento`): 16 comportamentos; F-TAR-1..8 → a e F-TAR-9 → b **ratificados** em
  [[D-2026-10-10-FE-F7-TARIFA-FORKS]]. F-TAR-1 = patch no #615 antes do merge, com `feeCents`/`feeEntryId` na view.
  F-TAR-9 = seletor da conta de tarifa neste nó (item 16). Sub-fork **F-TAR-9.1** (posição do seletor) PENDENTE.
- Origem: `D-2026-10-10-F5-PR3-FORKS` (na branch do #615): *"a tela do F7 mostrar a tarifa (`feeCents`) vai num
  BRIEF de FE separado, que o dono abre"*. O G7 (aviso de cobrança terminal, confirmação humana) vale e não se
  rediscute.
