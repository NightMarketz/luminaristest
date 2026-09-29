---
id: "FE-INCR-LALUR-PR2"
tipo: "fe"
dominio: "fiscal"
titulo: "FE-INCR-LALUR PR 2 — M410 + fechar trimestre + diagnóstico na tela"
estado: "done"
estado_detalhe: "Crescimento do X4. Detalhe granular do item 13 do BRIEF (M410, fechar/reabrir trimestre, diagnóstico) em PLANO-ONDA1-FE-2026-09-28 §4; forks F-FE-L2-1/2 → a decididos 28/09 sob delegação. Nasce tipado pelo contrato gerado (sequência mestre passo 5). MERGEADO #433 `8351c15c` (29/09, itens 1–12; substitui o #431, fechado por branch apagada); lacuna L1: a listagem de movimentos não devolve `processos`, então a edição não envia M415 (só a criação) — decisão do dono"
depende_de: ["[[X4]]"]
prs: ["#433"]
autorizacao: "dono, chat, 2026-09-28: \"Planeja com granularidade\" + \"pode decidir tudo\" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; EXECUTA: \"Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui\" (lançamento da sessão de execução, passos 5–9) + \"Pode criar pr e comittar\""
ancora_sdd: "§III.1 passo 6 · §III.2"
atualizado: "2026-09-28"
---
# FE-INCR-LALUR-PR2 — FE-INCR-LALUR PR 2 — M410 + fechar trimestre + diagnóstico na tela

**Estado:** `done` — Crescimento do X4. Detalhe granular do item 13 do BRIEF (M410, fechar/reabrir trimestre, diagnóstico) em PLANO-ONDA1-FE-2026-09-28 §4; forks F-FE-L2-1/2 → a decididos 28/09 sob delegação. Nasce tipado pelo contrato gerado (sequência mestre passo 5). MERGEADO #433 `8351c15c` (29/09, itens 1–12; substitui o #431, fechado por branch apagada); lacuna L1: a listagem de movimentos não devolve `processos`, então a edição não envia M415 (só a criação) — decisão do dono  
**Autorização:** dono, chat, 2026-09-28: "Planeja com granularidade" + "pode decidir tudo" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; EXECUTA: "Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui" (lançamento da sessão de execução, passos 5–9) + "Pode criar pr e comittar"  
**PRs:** #433  
**Depende de:** [[X4]]  
**Desbloqueia:** [[H1b]] (pontilhada)  
**Âncora no SDD consolidado:** §III.1 passo 6 · §III.2

## Docs

- [`docs/accounting/FE-INCR-LALUR-brief.md`](../../accounting/FE-INCR-LALUR-brief.md)
- [`docs/accounting/PLANO-ONDA1-FE-2026-09-28.md`](../../accounting/PLANO-ONDA1-FE-2026-09-28.md) — plano granular da Onda 1 de FE (28/09)
- [`docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](../../accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md) — sequência mestre (§4) e contrato gerado
- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]

## Evidência

- `docs/SDD-LUMINARIS.md:1503` → | 6 | **FE-INCR-LALUR PR 2** (M410 + fechar trimestre + diagnóstico na tela) | contábil (crescimento X4) | `sessao-feature` | BRIEF FE-LALUR §3; `withAuth` ⇒ verificar contra build de produção; vitest com shim `React` global | PR + review + merge; numerador inalterado | **falta "executa"** | ⬜ [H] |
- `docs/SDD-LUMINARIS.md:1656` → FEL2["FE-INCR-LALUR PR 2<br/>M410 + fechar + diagnóstico na tela"]:::ready
- `docs/SDD-LUMINARIS.md:1700` → X4 --> FEL2
- `docs/SDD-LUMINARIS.md:1749` → | **FE-INCR-LALUR PR 2** | **ready** (F-FE-4 → a; 3C mergeado; PR 1 mergeado) — sem item de fila próprio: entra como crescimento do X4 quando o dono chamar | #315 ✅ · #316 ✅ | BRIEF FE-LALUR §3 |
- #433 (`8351c15c`, 29/09): em `main`. Residual: sign-off de browser (RUNBOOK-H2 passo 16, humano) e a lacuna L1 (processos M415 na edição — a listagem do BE não os devolve; decisão do dono).
