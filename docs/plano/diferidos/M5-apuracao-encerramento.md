---
id: "M5-apuracao-encerramento"
tipo: "diferido"
dominio: "governanca"
titulo: "Apuração/encerramento do resultado (I350/I355)"
estado: "done"
estado_detalhe: "✅ #63; residual PVA"
prs: ["#63"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-apuracao-encerramento — Apuração/encerramento do resultado (I350/I355)

**Estado:** `done` — ✅ #63; residual PVA  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #63  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1109` → | **Apuração/encerramento do resultado** (I350/I355 + ECD PVA-value-clean) | ✅ **Mergeado em `main`** (BE-INCR-SPED-APURACAO, PR #63, merge `1465bae`, 2026-07-10; feature `1de120d`; 2ª review independente PASS; residual = sign-off humano no PVA) | **ADR-INCR-SPED-APURACAO** (`docs/adr/`). `ExerciseClosingService.closeExercise(year)` posta 1 encerramento real balanceado (via `PostingService.postEntry`) que zera as contas de resultado contra Lucros/Prejuízos Acumulados (`2.3.1`, nova no fixture — **zero migração**, `sourceType='closing'`). **D3** `incomeStatement` closing-aware no report compart
