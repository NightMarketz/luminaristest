---
id: "FE-INCR-F7-TARIFA"
tipo: "fe"
dominio: "financeiro"
titulo: "Tela do F7 mostra bruto, tarifa retida e líquido da baixa via provedor (F5 PR-3)"
estado: "planned"
estado_detalhe: "10/10: BRIEF escrito (sessao-planejamento); forks F-TAR-1..9 PENDENTES. Depende do merge do #615 (F5 PR-3) e do F-TAR-1: a view do item do F7 não expõe feeCents/feeEntryId nem no #615. Sem 'executa'"
depende_de: ["[[F5]]", "[[FE-INCR-BANK-SETTLEMENT]]"]
autorizacao: "dono, chat, 2026-10-10: \"Autorizo planejar o BRIEF do FE da tarifa no F7 — sessao-planejamento, sem 'executa'.\" (só BRIEF + nota do nó)"
ancora_sdd: "—"
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: forks F-TAR-1..9 PENDENTES. Ratificados, e com F-TAR-1 fora do nó, a previsão é sonnet-alto (regra 4: 15 itens, só FE)"
atualizado: "2026-10-10"
---
# FE-INCR-F7-TARIFA — Tela do F7 mostra bruto, tarifa retida e líquido da baixa via provedor (F5 PR-3)

**Estado:** `planned` — 10/10: BRIEF escrito (sessao-planejamento); forks F-TAR-1..9 PENDENTES. Depende do merge do #615 (F5 PR-3) e do F-TAR-1: a view do item do F7 não expõe feeCents/feeEntryId nem no #615. Sem 'executa'  
**Autorização:** dono, chat, 2026-10-10: "Autorizo planejar o BRIEF do FE da tarifa no F7 — sessao-planejamento, sem 'executa'." (só BRIEF + nota do nó)  
**Depende de:** [[F5]], [[FE-INCR-BANK-SETTLEMENT]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** —

## Docs

- [`docs/accounting/FE-INCR-F7-TARIFA-brief.md`](../../accounting/FE-INCR-F7-TARIFA-brief.md) — **BRIEF 10/10**
  (`sessao-planejamento`): 15 comportamentos, forks **F-TAR-1..9 PENDENTES**. O principal é o F-TAR-1, onde a view
  ganha `feeCents`/`feeEntryId`, com recomendação de patch no #615 antes do merge.
- Origem: `D-2026-10-10-F5-PR3-FORKS` (na branch do #615): *"a tela do F7 mostrar a tarifa (`feeCents`) vai num
  BRIEF de FE separado, que o dono abre"*. O G7 (aviso de cobrança terminal, confirmação humana) vale e não se
  rediscute.
