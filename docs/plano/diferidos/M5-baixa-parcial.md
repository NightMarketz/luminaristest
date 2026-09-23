---
id: "M5-baixa-parcial"
tipo: "diferido"
dominio: "governanca"
titulo: "Baixa parcial em AP/AR"
estado: "done"
estado_detalhe: "✅ #307; = régua F3"
prs: ["#307"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-baixa-parcial — Baixa parcial em AP/AR

**Estado:** `done` — ✅ #307; = régua F3  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #307  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1123` → | **Baixa parcial em AP/AR** | ✅ **MERGEADO 2026-09-11 — PR #307, squash `b45eaf62`** (verificado `git merge-base --is-ancestor`): N recibos por título, sum-CAS atômico (`paidCents ≤ amountCents − novo` + increment, forma corrigida do ADR §3), `PARTIALLY_PAID`/`PARTIALLY_RECEIVED`, aging/caixa projetado/tie-out por saldo, auditoria `settlement_*`, rotas-irmãs `/settlements` (F-PS8 a · F-PS9 a · F-PS10 b, cédula 10/09 resposta 23). **Review independente: FAIL → ciclo → FAIL (F8 CRÍTICO novo) → ciclo → PASS** (F1 estorno antes do gate; F2/F3 leitura stale; F8 duplo cancel concorrente — todos com
