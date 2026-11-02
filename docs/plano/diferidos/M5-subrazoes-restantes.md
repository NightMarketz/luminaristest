---
id: "M5-subrazoes-restantes"
tipo: "diferido"
dominio: "governanca"
titulo: "Subrazões restantes (estoque, imobilizado, folha, fiscal/tributos)"
estado: "deferred"
estado_detalhe: "Estoque ✅ #130; folha → módulo DP = fase 2 do F-PES-0, nó PES-4 (PRE-ADR-DP-DEPARTAMENTO-PESSOAL Accepted 02/11; nó e BRIEF na sessão 2); imobilizado → C8"
prs: ["#130"]
ancora_sdd: "§M5"
atualizado: "2026-11-02"
---
# M5-subrazoes-restantes — Subrazões restantes (estoque, imobilizado, folha, fiscal/tributos)

**Estado:** `deferred` — Estoque ✅ #130; folha → módulo DP = fase 2 do F-PES-0, nó PES-4 (PRE-ADR-DP-DEPARTAMENTO-PESSOAL Accepted 02/11; nó e BRIEF na sessão 2); imobilizado → C8  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #130  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1115` → | **Subrazões restantes** (estoque, imobilizado, **folha**, **fiscal/tributos**) | ✅ **Estoque mergeado (PR #130, `5c04bd1`, 2026-07-22)**; resto ⚫ Diferido | Cada um é módulo ERP first-class próprio (AP → nó ✅; **AR → ✅ mergeado** INCR-AR PR #111, [ADR-INCR-AR](../../adr/ADR-INCR-AR-accounts-receivable.md); o par do subledger está fechado). **Estoque = [ADR-INCR-INVENTORY](../../adr/ADR-INCR-INVENTORY-stock-subledger.md) ✅ MERGEADO (PR #130, §5.1 item 12)** — inventário perpétuo + CMV + ponte de compra AP; guard exaustivo do tie-out ganhou `salon.sale.cogs` (`5590a3f`). **Merge desbloqueou o

## Folha → módulo DP (02/11/2026)

Dono, chat, 02/11/2026: *"A folha estava diferida exatamente pra entrar nesse módulo aqui"*. A folha deixa de esperar
"demanda explícita" e entra pelo Departamento Pessoal: [`PRE-ADR-DP-DEPARTAMENTO-PESSOAL`](../../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md) (Accepted, F-DP-1..11) e cédulas em
[[D-2026-11-02-DP-PRE-ADR]]. O nó do DP é o PES-4 (F-PES-1 de 12/10) e nasce na sessão 2 (nó + BRIEF de F0 e F1); este diferido segue `deferred`
pelo resto da linha (fiscal/tributos).
