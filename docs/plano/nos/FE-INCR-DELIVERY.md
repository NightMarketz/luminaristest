---
id: "FE-INCR-DELIVERY"
tipo: "fe"
dominio: "contabil"
titulo: "Tela do pacote ao contador (consome C6b; files[].kind = ExportKind)"
estado: "planned"
estado_detalhe: "BRIEF ✅ 17/09; forks F-FE-DL-1..4 pendentes"
depende_de: ["[[C6b]]"]
ancora_sdd: "§III.1 (fora da régua)"
atualizado: "2026-09-23"
---
# FE-INCR-DELIVERY — Tela do pacote ao contador (consome C6b; files[].kind = ExportKind)

**Estado:** `planned` — BRIEF ✅ 17/09; forks F-FE-DL-1..4 pendentes  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[C6b]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua)

## Docs

- [`docs/accounting/FE-INCR-DELIVERY-brief.md`](../../accounting/FE-INCR-DELIVERY-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1513` → F-FE-RV-1..4 [H]**; `FE-INCR-DELIVERY` (consome C6b; `files[].kind` = `ExportKind` **registrado como contrato**) — **✅ BRIEF
- `docs/SDD-LUMINARIS.md:1162` → > | **C6b** pacote ampliado ao contador | B — nó novo do re-baseline | ✅ BRIEF em `main` (#324 `ce0c97e8`); 5 forks ✅ ratificados 16/09 (todos a); C11 ✅ #334 → `ready`, falta "executa". **Plano granular 16/09** (3 PRs seriais: período nos exports → conciliação+amostra → tabela filha/extras) F-C6b-6..8 ✅ (a) ratificados 16/09; **"executa" dado 16/09** — PR-1 ✅ #337 `daf76279` · PR-2 ✅ #338 `15c8bf53` · **PR-3 ✅ #340 `373d00d4`** → **✅ MERGEADO 2026-09-17, C6b `done`. Contábil 18/22 → 19/22.** Residual = `FE-INCR-DELIVERY` → **BRIEF ✅ 17/09 (sessão 6), 4 forks PENDENTES** | `BE-INCR-CONTADOR-PAC
