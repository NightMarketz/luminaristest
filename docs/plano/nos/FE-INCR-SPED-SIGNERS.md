---
id: "FE-INCR-SPED-SIGNERS"
tipo: "fe"
dominio: "contabil"
titulo: "Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova)"
estado: "planned"
estado_detalhe: "BE C12 em main desde #353. BRIEF em PLANO-ONDA1-FE-2026-09-28 §5 + delta do FE-FIX-SPED-ECD-SIGNERS (PLANO-PENDENCIAS-FE-DTO §B1: item 4 feito lá; guarda por placeholder a manter). Forks decididos 28/09 sob delegação: F-FE-SG-1 → a (GET /sped/qualif-assinante), SG-2 → (d) contador do cadastro via signerContactIds. Sequência mestre passo 6 (depois do FE-FIX e do contrato PR-2); falta 'executa'"
depende_de: ["[[C12]]"]
autorizacao: "dono, chat, 2026-09-28: \"Planeja com granularidade\" + \"pode decidir tudo\" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; sem 'executa'"
ancora_sdd: "§III.1 (fora da régua)"
atualizado: "2026-09-28"
---
# FE-INCR-SPED-SIGNERS — Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova)

**Estado:** `planned` — BE C12 em main desde #353. BRIEF em PLANO-ONDA1-FE-2026-09-28 §5 + delta do FE-FIX-SPED-ECD-SIGNERS (PLANO-PENDENCIAS-FE-DTO §B1: item 4 feito lá; guarda por placeholder a manter). Forks decididos 28/09 sob delegação: F-FE-SG-1 → a (GET /sped/qualif-assinante), SG-2 → (d) contador do cadastro via signerContactIds. Sequência mestre passo 6 (depois do FE-FIX e do contrato PR-2); falta 'executa'  
**Autorização:** dono, chat, 2026-09-28: "Planeja com granularidade" + "pode decidir tudo" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; sem 'executa'  
**Depende de:** [[C12]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua)

## Docs

- [`docs/accounting/BE-INCR-SPED-IDENTITY-MASKS-brief.md`](../../accounting/BE-INCR-SPED-IDENTITY-MASKS-brief.md)
- [`docs/accounting/PLANO-ONDA1-FE-2026-09-28.md`](../../accounting/PLANO-ONDA1-FE-2026-09-28.md) — plano granular da Onda 1 de FE (28/09)
- [`docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](../../accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md) — sequência mestre (§4) e contrato gerado
- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]

## Evidência

- `docs/SDD-LUMINARIS.md:1514` → 17/09 sessão 6, F-FE-DL-1..4 [H]**; `FE-INCR-FIXED-ASSETS` (tela do C8) e `FE-INCR-SPED-SIGNERS` (combobox de qualificação,
- `docs/SDD-LUMINARIS.md:1161` → > | **C12** máscaras de identidade no SPED | B — nó novo do re-baseline | ✅ BRIEF em `main` (#322 `1c469e2f`); 4 forks ✅ ratificados 16/09 (todos a) → `ready` **após transcrição J930/0930**, ~~falta "executa"~~ **"Executa C12" 18/09** → ✅ **MERGEADO #353 `edb80ec8` (20/09). Contábil 19/22 → 20/22** (fold 22/09). Residual = `FE-INCR-SPED-SIGNERS` (tela) | `BE-INCR-SPED-IDENTITY-MASKS-brief.md` |
