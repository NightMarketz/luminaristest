---
id: "SEED-MY"
tipo: "gate"
dominio: "gate"
titulo: "Seed multi-exercício 2025+2026 (alvo dos runbooks H1/H2/H3)"
estado: "done"
estado_detalhe: "MERGEADO em main (#372 `85068f76`, 25/09) e aplicado no dev.db real: seed-presumido/seed-real com 204 lançamentos 2025 + 153 em 2026, 1 lançamento closing e 12/2025 HARD_CLOSED cada (consulta read-only 25/09)"
depende_de: ["[[B-4]]"]
autorizacao: "cédula 14/09 (#318/#319) SEED-MY autorizado"
prs: ["#325", "#372"]
ancora_sdd: "§III.2 · §M5.1 (apontadores 14/09) · §III.1 passo 8"
atualizado: "2026-09-25"
---
# SEED-MY — Seed multi-exercício 2025+2026 (alvo dos runbooks H1/H2/H3)

**Estado:** `done` — MERGEADO em main (#372 `85068f76`, 25/09) e aplicado no dev.db real: seed-presumido/seed-real com 204 lançamentos 2025 + 153 em 2026, 1 lançamento closing e 12/2025 HARD_CLOSED cada (consulta read-only 25/09)  
**Autorização:** cédula 14/09 (#318/#319) SEED-MY autorizado  
**Depende de:** [[B-4]]  
**Desbloqueia:** [[H1]] (pontilhada), [[H1b]] (pontilhada)  
**PRs:** #325, #372  
**Âncora no SDD consolidado:** §III.2 · §M5.1 (apontadores 14/09) · §III.1 passo 8

## Docs

- [`docs/accounting/SEED-MULTI-EXERCICIO-brief.md`](../../accounting/SEED-MULTI-EXERCICIO-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1623` → SEED["SEED-MY seed 2025+2026<br/>pré-condição: B-4 assinado"]:::plan
- `docs/SDD-LUMINARIS.md:1670` → B4 --> SEED
- `docs/SDD-LUMINARIS.md:1733` → | **SEED-MY** | plan (BRIEF curto → `job-generator`) — **pára** se B-4 não estiver assinado | B-4 assinado | cédula #318 §4; #319 autorizações |
- `docs/SDD-LUMINARIS.md:1156` → > | **SEED-MY** seed multi-exercício 2025+2026 | A (pré-condição dos gates H1/H2/H3) | ✅ BRIEF em `main` (#325 `dbd5ea83`); **execução bloqueada até B-4 assinado**; 2 forks ✅ ratificados 16/09 (F-SEED-2 a · F-SEED-3 b) | `SEED-MULTI-EXERCICIO-brief.md` |
- `docs/SDD-LUMINARIS.md:1505` → | 8 | **SEED-MY** | pré-gate | `job-generator` | BRIEF ✅; forks ✅ (F-SEED-2 a · F-SEED-3 b) | seed 2025+2026; `RUNBOOK-H1` P0 | **B-4 assinado** (`RUNBOOK-B4`: 0 `[x]` hoje) | ⬜ [H] gate |
- [`docs/accounting/CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md:44`](../../accounting/CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md)

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1733`

| **SEED-MY** | plan (BRIEF curto → `job-generator`) — **pára** se B-4 não estiver assinado | B-4 assinado | cédula #318 §4; #319 autorizações |

## Fold 25/09 (Fase 6 do PLANO-POS-CONTADOR)

- Fold 25/09 — evidência: commit `85068f76` "SEED-MY: db:seed:accounting multi-exercício + B-4 PASSOU (#372)" em `origin/main`; CLI `server/src/jobs/seedAccountingFixtureCli.ts` (`npm run db:seed:accounting`). Consulta read-only em `server/prisma/prisma/dev.db` (25/09): usuários `seed-presumido` e `seed-real` existem; cada um com `journal_entries` 2025 Posted = 204, 2026 Posted = 153, `sourceType='closing'` = 1, `accounting_periods` 2025/12 = `HARD_CLOSED`.
