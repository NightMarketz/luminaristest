---
id: "M5-envio-contador"
tipo: "diferido"
dominio: "governanca"
titulo: "Envio de ECD/ECF ao contador por e-mail"
estado: "done"
estado_detalhe: "✅ #305; = régua C6"
prs: ["#305"]
ancora_sdd: "§M5"
atualizado: "2026-09-23"
---
# M5-envio-contador — Envio de ECD/ECF ao contador por e-mail

**Estado:** `done` — ✅ #305; = régua C6  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**PRs:** #305  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1126` → | **Envio de ECD/ECF ao contador por e-mail** | ✅ **MERGEADO 2026-09-11 — PR #305, squash `7725f0ca`** (verificado `git merge-base --is-ancestor 7725f0ca origin/main`): `AccountingContact` + `AccountingDeliveryLog`, gate de período F-CD7-a dentro da tx (período vive no job — Fork Novo A → **(b)** pelo sinal F3 do dono, supera o (a) inicial), via barata `signerContactIds[]` (F2), máscara em todos os campos de identidade (F13); 2 reviews independentes FAIL → ciclo → delta PASS; CI 5/5. **Contábil 16/22 → 17/22.** Residual = C6b pacote ampliado (resposta 8, tabela filha + migração — nó novo do re
