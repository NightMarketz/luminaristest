---
id: "FE-INCR-SPED-SIGNERS"
tipo: "fe"
dominio: "contabil"
titulo: "Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova)"
estado: "done"
estado_detalhe: "✅ MERGEADO #436 `c793b4bb` (29/09): GET /sped/qualif-assinante + QualifAssinanteSelect + contador do cadastro (o #435 foi fechado e o conteúdo entrou no #436); residual = sign-off de browser (H2) · BE C12 em main desde #353. BRIEF em PLANO-ONDA1-FE-2026-09-28 §5 + delta do FE-FIX-SPED-ECD-SIGNERS (item 4 absorvido pelo #427 `0eb0799d`; guarda por placeholder a manter — PLANO-PENDENCIAS-FE-DTO §B1). Forks decididos 28/09 sob delegação: F-FE-SG-1 → a (GET /sped/qualif-assinante), SG-2 → (d) contador do cadastro via signerContactIds. Sequência mestre passo 6: PR aberto 28/09 (rota GET /sped/qualif-assinante + QualifAssinanteSelect + contador do cadastro via signerContactIds)"
depende_de: ["[[C12]]"]
autorizacao: "dono, chat, 2026-09-28: \"Planeja com granularidade\" + \"pode decidir tudo\" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; EXECUTA: \"Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui\" (lançamento da sessão de execução, passos 5–9) + \"Pode criar pr e comittar\""
ancora_sdd: "§III.1 (fora da régua)"
prs: ["#436"]
atualizado: "2026-09-29"
---
# FE-INCR-SPED-SIGNERS — Combobox de qualificação de signatário (BRIEF C12 §6.3, rota nova)

**Estado:** `done` — ✅ MERGEADO #436 `c793b4bb` (29/09): GET /sped/qualif-assinante + QualifAssinanteSelect + contador do cadastro (o #435 foi fechado e o conteúdo entrou no #436); residual = sign-off de browser (H2) · BE C12 em main desde #353. BRIEF em PLANO-ONDA1-FE-2026-09-28 §5 + delta do FE-FIX-SPED-ECD-SIGNERS (item 4 absorvido pelo #427 `0eb0799d`; guarda por placeholder a manter — PLANO-PENDENCIAS-FE-DTO §B1). Forks decididos 28/09 sob delegação: F-FE-SG-1 → a (GET /sped/qualif-assinante), SG-2 → (d) contador do cadastro via signerContactIds. Sequência mestre passo 6: PR aberto 28/09 (rota GET /sped/qualif-assinante + QualifAssinanteSelect + contador do cadastro via signerContactIds)  
**Autorização:** dono, chat, 2026-09-28: "Planeja com granularidade" + "pode decidir tudo" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; EXECUTA: "Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui" (lançamento da sessão de execução, passos 5–9) + "Pode criar pr e comittar"  
**Depende de:** [[C12]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 (fora da régua)
**PRs:** #436  

## Docs

- [`docs/accounting/BE-INCR-SPED-IDENTITY-MASKS-brief.md`](../../accounting/BE-INCR-SPED-IDENTITY-MASKS-brief.md)
- [`docs/accounting/PLANO-ONDA1-FE-2026-09-28.md`](../../accounting/PLANO-ONDA1-FE-2026-09-28.md) — plano granular da Onda 1 de FE (28/09)
- [`docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](../../accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md) — sequência mestre (§4) e contrato gerado
- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]

## Evidência

- `docs/SDD-LUMINARIS.md:1514` → 17/09 sessão 6, F-FE-DL-1..4 [H]**; `FE-INCR-FIXED-ASSETS` (tela do C8) e `FE-INCR-SPED-SIGNERS` (combobox de qualificação,
- `docs/SDD-LUMINARIS.md:1161` → > | **C12** máscaras de identidade no SPED | B — nó novo do re-baseline | ✅ BRIEF em `main` (#322 `1c469e2f`); 4 forks ✅ ratificados 16/09 (todos a) → `ready` **após transcrição J930/0930**, ~~falta "executa"~~ **"Executa C12" 18/09** → ✅ **MERGEADO #353 `edb80ec8` (20/09). Contábil 19/22 → 20/22** (fold 22/09). Residual = `FE-INCR-SPED-SIGNERS` (tela) | `BE-INCR-SPED-IDENTITY-MASKS-brief.md` |
- #427 (`0eb0799d`, 28/09): FE-FIX-SPED-ECD-SIGNERS em `main` — **item 4 do SPED-SIGNERS absorvido** (CRC, UF do CRC, e-mail e fone na linha J930; `toEcdSignerPayload`; guardas `GAP-MAP N3`). Estado inalterado: o combobox (itens 1–3, 5, 6) segue pendente.
