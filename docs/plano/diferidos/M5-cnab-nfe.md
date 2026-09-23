---
id: "M5-cnab-nfe"
tipo: "diferido"
dominio: "governanca"
titulo: "CNAB/NF-e (ingestão bancária/fiscal rica)"
estado: "done"
estado_detalhe: "CNAB ✅ #61; NF-e ✅ #267 (linha do §M5 não atualizada)"
prs: ["#61", "#267"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-cnab-nfe — CNAB/NF-e (ingestão bancária/fiscal rica)

**Estado:** `done` — CNAB ✅ #61; NF-e ✅ #267 (linha do §M5 não atualizada)  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #61, #267  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1107` → | **CNAB/NF-e** (ingestão bancária/fiscal rica) | ✅ **CNAB mergeado em `main`** (BE-INCR7-CNAB, PR #61, merge `1088e32`, 2026-07-12; review independente PASS + re-review da resolução PASS) · **NF-e implementada fora de `main`, merge travado por dado externo** (branch `claude/nfe-fase-a`; não é mais "⏳ incremento corrente" desde 2026-08-22 — §3) | CNAB 240 = 3º parser de extrato: `lib/cnab.ts`→`InTable` reusando `parseLines` (espelha OFX; direct-int cents, D/C sign, slice `DDMMAAAA`); também corrigiu o bug swagger-jsdoc `: ` que dropava 17 paths do openapi. Refrescado sobre `main` pós-ECF (conf
