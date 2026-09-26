---
id: "C6b"
tipo: "regua"
dominio: "contabil"
titulo: "Pacote ampliado ao contador (tabela filha AccountingDeliveryItem)"
estado: "done"
estado_detalhe: "✅ #337/#338/#340 → 373d00d4 (17/09); residual FE-INCR-DELIVERY. **Emenda ABERTA (Fase 3.4 do plano pós-contador, sem BRIEF):** memória de cálculo, créditos por nota e item, aging conciliado, ficha do imobilizado, inventário, conciliação apurado × contabilizado × pago, XLSX (dependência nova? checar antes) — a memória de IRPJ/CSLL depende do [[X7]]"
depende_de: ["[[C6]]"]
autorizacao: "\"executa C6b\" (dono, 16/09)"
prs: ["#324", "#336", "#337", "#338", "#340"]
ancora_sdd: "§M7.1 · §M5.1"
atualizado: "2026-09-23"
---
# C6b — Pacote ampliado ao contador (tabela filha AccountingDeliveryItem)

**Estado:** `done` — ✅ #337/#338/#340 → 373d00d4 (17/09); residual FE-INCR-DELIVERY. **Emenda ABERTA (Fase 3.4 do plano pós-contador, sem BRIEF):** memória de cálculo, créditos por nota e item, aging conciliado, ficha do imobilizado, inventário, conciliação apurado × contabilizado × pago, XLSX (dependência nova? checar antes) — a memória de IRPJ/CSLL depende do [[X7]]  
**Autorização:** "executa C6b" (dono, 16/09)  
**Depende de:** [[C6]]  
**Desbloqueia:** [[FE-INCR-DELIVERY]]  
**PRs:** #324, #336, #337, #338, #340  
**Âncora no SDD consolidado:** §M7.1 · §M5.1

## Docs

- [`docs/accounting/BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md`](../../accounting/BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md)
- [`docs/accounting/BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md`](../../accounting/BE-INCR-CONTADOR-PACKAGE-EXTENDED-execution-plan.md)
- [`PLANO-POS-CONTADOR-2026-09-23.md`](../../accounting/PLANO-POS-CONTADOR-2026-09-23.md) — fila viva das fases pós-contador — Fase 3.4 (emenda: relatórios do pacote)

## Evidência

- [`docs/accounting/CEDULA-DECISAO-2026-09-10-entrevista.md:45`](../../accounting/CEDULA-DECISAO-2026-09-10-entrevista.md)
- `docs/SDD-LUMINARIS.md:1162` → > | **C6b** pacote ampliado ao contador | B — nó novo do re-baseline | ✅ BRIEF em `main` (#324 `ce0c97e8`); 5 forks ✅ ratificados 16/09 (todos a); C11 ✅ #334 → `ready`, falta "executa". **Plano granular 16/09** (3 PRs seriais: período nos exports → conciliação+amostra → tabela filha/extras) F-C6b-6..8 ✅ (a) ratificados 16/09; **"executa" dado 16/09** — PR-1 ✅ #337 `daf76279` · PR-2 ✅ #338 `15c8bf53` · **PR-3 ✅ #340 `373d00d4`** → **✅ MERGEADO 2026-09-17, C6b `done`. Contábil 18/22 → 19/22.** Residual = `FE-INCR-DELIVERY` → **BRIEF ✅ 17/09 (sessão 6), 4 forks PENDENTES** | `BE-INCR-CONTADOR-PAC
- `docs/SDD-LUMINARIS.md:595` → > **🔁 FOLD 2026-09-17 — SESSÃO 5: "executa C6b" → C6b MERGEADO em 3 PRs seriais.** Plano granular #336 (`b7310a2c`) → **PR-1 #337 `daf76279`** (período nos 4 exports de relatório; F-C6b-6/7 → a: balancete usa o `asOf` antes aceito-e-ignorado, razão geral com abertura; review PASS + 1 MÉDIO fechado no PR) → **PR-2 #338 `15c8bf53`** (`EXPORT_BANK_RECONCILIATION` + `EXPORT_ENTRY_SAMPLE` sha256-rank por lançamento; review FAIL 2 ALTO — `'?'` alcançável no CSV, amostra por perna — + 1 MÉDIO → fix → delta PASS) → **PR-3 #340 `373d00d4`** (`AccountingDeliveryItem` + backfill idempotente, manifesto N-
- `docs/SDD-LUMINARIS.md:1690` → C6 --> C6b

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1740`

| **C6b** | plan (BRIEF) | C6 ✅ | resposta 8 (cédula 10/09) |
