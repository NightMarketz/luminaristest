---
id: "GET-DATA-EXCHANGE-JOBS"
tipo: "fe"
dominio: "contabil"
titulo: "Insumo GET /api/accounting/data-exchange/jobs (lista) — quem mergear primeiro cria"
estado: "done"
estado_detalhe: "✅ #368 89d0c6a5 (C8 PR-4): GET /api/accounting/data-exchange/jobs no shape do F-FA15 (ListDataExchangeJobsQuerySchema, DataExchangeDto.ts:176). Consequência: F-FE-RV-1 do FE-INCR-REVIEW superado"
autorizacao: "F-FA15 → (a) (dono, 18/09)"
prs: ["#368"]
ancora_sdd: "§III.1 · §III.3 §1"
atualizado: "2026-09-28"
---
# GET-DATA-EXCHANGE-JOBS — Insumo GET /api/accounting/data-exchange/jobs (lista) — quem mergear primeiro cria

**Estado:** `done` — ✅ #368 89d0c6a5 (C8 PR-4): GET /api/accounting/data-exchange/jobs no shape do F-FA15 (ListDataExchangeJobsQuerySchema, DataExchangeDto.ts:176). Consequência: F-FE-RV-1 do FE-INCR-REVIEW superado  
**Autorização:** F-FA15 → (a) (dono, 18/09)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 · §III.3 §1  
**PRs:** #368

## Docs

- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]

## Evidência

- `docs/SDD-LUMINARIS.md:1515` → BRIEF C12 §6.3 — rota nova) **esperam o merge do BE** (F-PS-4 → a). **Insumo comum dos 3 BRIEFs de FE + C8 item 30:**
- `docs/SDD-LUMINARIS.md:1784` → | **F-FA15** | Quem cria `GET /api/accounting/data-exchange/jobs` (lista, hoje inexistente)? | **(a) Quem mergear primeiro cria; o segundo só estende** — shape único `{ unitId, direction?, kind?, status?, year?, page, limit } → { items, total, page, limit }`, policy `canRead` | (a) — mesma opção | Se o `FE-INCR-REVIEW` mergear antes do C8 PR-4, o PR-4 só estende (`supersedesJobId`/`supersededByJobId`); shape já fixado nos dois BRIEFs para não divergir. |
- `docs/SDD-LUMINARIS.md:1566` → - Sobra do C8: PR-4 (retificação versionada + J801/J932 + `GET /data-exchange/jobs`) e PR-5 (NF-e modo 4) — autorizados
