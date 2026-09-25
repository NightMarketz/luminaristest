---
id: "PASSO-11"
tipo: "motor"
dominio: "motor"
titulo: "GAP-MAP 7 — unique/compositeUnique sem gate in-tx (teste-guarda it.failing)"
estado: "done"
estado_detalhe: "Instrumentado (#362, vermelho provado na CI Linux) e CORRIGIDO (#365 fec0804b: lock + re-check in-tx de unique/compositeUnique; review independente PASS; CI verde)"
autorizacao: "\"autorizo o passo 11\" + \"Corrige o passo 11\" (dono, 23/09)"
prs: ["#362", "#364", "#365"]
ancora_sdd: "§III.1 passo 11 · §III.4"
atualizado: "2026-09-23"
---
# PASSO-11 — GAP-MAP 7 — unique/compositeUnique sem gate in-tx (teste-guarda it.failing)

**Estado:** `done` — Instrumentado (#362, vermelho provado na CI Linux) e CORRIGIDO (#365 fec0804b: lock + re-check in-tx de unique/compositeUnique; review independente PASS; CI verde)  
**Autorização:** "autorizo o passo 11" (dono, 23/09)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #362, #364, #365  
**Âncora no SDD consolidado:** §III.1 passo 11 · §III.4

## Docs

- [`docs/operating-manual/GAP-MAP.md`](../../operating-manual/GAP-MAP.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1482` → > **Estado em 2026-09-23 (acréscimo desta unificação):** passo 11 (GAP-MAP 7) — teste-guarda
- `docs/SDD-LUMINARIS.md:1508` → | 11 | **GAP-MAP 7 — `unique`/`compositeUnique` sem gate in-tx** | motor DynamicTable (fora da régua; beneficia CRM/vendas) | `sessao-instrumentacao` → `sessao-correcao` | `validateAdvancedRules` (`json_extract`) roda **antes** de `prisma.$transaction`; só `enforceNoOverlap` re-checa dentro; `runSerializedIfNoOverlap` só arma `withTableWriteLock` com regra `noOverlap`. Teste = gêmeo `it.failing` do `NoOverlapConcurrency.integration.test.ts` (N writes da mesma chave → 1 persistido). **Só a CI Linux prova o vermelho** (`windows-serializa-sqlite-ci-linux-nao`) | teste-guarda vermelho na CI → fix 
- `docs/SDD-LUMINARIS.md:1929` → ### Passo 11 — GAP-MAP 7, Instrumentação (Haiku)
