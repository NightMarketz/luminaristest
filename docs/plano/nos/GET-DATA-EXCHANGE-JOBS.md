---
id: "GET-DATA-EXCHANGE-JOBS"
tipo: "fe"
dominio: "contabil"
titulo: "Insumo GET /api/accounting/data-exchange/jobs (lista) — quem mergear primeiro cria"
estado: "planned"
estado_detalhe: "Não existe; previsto no C8 PR-4 ou no FE-INCR-REVIEW (F-FA15 → a)"
autorizacao: "F-FA15 → (a) (dono, 18/09)"
ancora_sdd: "§III.1 · §III.3 §1"
atualizado: "2026-09-23"
---
# GET-DATA-EXCHANGE-JOBS — Insumo GET /api/accounting/data-exchange/jobs (lista) — quem mergear primeiro cria

**Estado:** `planned` — Não existe; previsto no C8 PR-4 ou no FE-INCR-REVIEW (F-FA15 → a)  
**Autorização:** F-FA15 → (a) (dono, 18/09)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 · §III.3 §1

## Evidência

- `docs/SDD-LUMINARIS.md:1515` → BRIEF C12 §6.3 — rota nova) **esperam o merge do BE** (F-PS-4 → a). **Insumo comum dos 3 BRIEFs de FE + C8 item 30:**
- `docs/SDD-LUMINARIS.md:1784` → | **F-FA15** | Quem cria `GET /api/accounting/data-exchange/jobs` (lista, hoje inexistente)? | **(a) Quem mergear primeiro cria; o segundo só estende** — shape único `{ unitId, direction?, kind?, status?, year?, page, limit } → { items, total, page, limit }`, policy `canRead` | (a) — mesma opção | Se o `FE-INCR-REVIEW` mergear antes do C8 PR-4, o PR-4 só estende (`supersedesJobId`/`supersededByJobId`); shape já fixado nos dois BRIEFs para não divergir. |
- `docs/SDD-LUMINARIS.md:1566` → - Sobra do C8: PR-4 (retificação versionada + J801/J932 + `GET /data-exchange/jobs`) e PR-5 (NF-e modo 4) — autorizados
