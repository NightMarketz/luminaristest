---
id: "M5-subrazoes-restantes"
tipo: "diferido"
dominio: "governanca"
titulo: "Subrazões restantes (estoque, imobilizado, folha, fiscal/tributos)"
estado: "deferred"
estado_detalhe: "Estoque ✅ #130; folha ⚫; imobilizado → C8"
prs: ["#130"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-subrazoes-restantes — Subrazões restantes (estoque, imobilizado, folha, fiscal/tributos)

**Estado:** `deferred` — Estoque ✅ #130; folha ⚫; imobilizado → C8  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #130  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1115` → | **Subrazões restantes** (estoque, imobilizado, **folha**, **fiscal/tributos**) | ✅ **Estoque mergeado (PR #130, `5c04bd1`, 2026-07-22)**; resto ⚫ Diferido | Cada um é módulo ERP first-class próprio (AP → nó ✅; **AR → ✅ mergeado** INCR-AR PR #111, [ADR-INCR-AR](../../adr/ADR-INCR-AR-accounts-receivable.md); o par do subledger está fechado). **Estoque = [ADR-INCR-INVENTORY](../../adr/ADR-INCR-INVENTORY-stock-subledger.md) ✅ MERGEADO (PR #130, §5.1 item 12)** — inventário perpétuo + CMV + ponte de compra AP; guard exaustivo do tie-out ganhou `salon.sale.cogs` (`5590a3f`). **Merge desbloqueou o
