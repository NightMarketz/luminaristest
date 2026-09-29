---
id: "FE-INCR-BANK-SETTLEMENT"
tipo: "fe"
dominio: "financeiro"
titulo: "Tela do F7 (baixa por retorno bancário)"
estado: "done"
estado_detalhe: "✅ MERGEADO #436 `c793b4bb` (29/09): 3ª sub-aba da Conciliação (lacuna L-BS1 registrada no PR); residual = sign-off de browser (H2) · BRIEF ✅ 17/09. Forks decididos 28/09 sob delegação: F-FE-BS-1..4 → a; F-FE-BS-5 → a (retry de CONFIRMING sempre visível; o 400 explica). Sequência mestre passo 9: PR aberto 29/09 (3ª sub-aba da Conciliação; lacuna L-BS1: o JournalEntriesPanel não filtra por lançamento, então os ids do lançamento/encargo aparecem sem link)"
depende_de: ["[[F7]]", "[[FF7]]"]
autorizacao: "dono 17/09 (F-PS-1 → a) — só BRIEF; + dono, chat, 2026-09-28: \"Planeja com granularidade\" + \"pode decidir tudo\" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; EXECUTA: \"Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui\" (lançamento da sessão de execução, passos 5–9) + \"Pode criar pr e comittar\""
ancora_sdd: "§III.1 passo 7 · §III.2"
prs: ["#436"]
atualizado: "2026-09-29"
---
# FE-INCR-BANK-SETTLEMENT — Tela do F7 (baixa por retorno bancário)

**Estado:** `done` — ✅ MERGEADO #436 `c793b4bb` (29/09): 3ª sub-aba da Conciliação (lacuna L-BS1 registrada no PR); residual = sign-off de browser (H2) · BRIEF ✅ 17/09. Forks decididos 28/09 sob delegação: F-FE-BS-1..4 → a; F-FE-BS-5 → a (retry de CONFIRMING sempre visível; o 400 explica). Sequência mestre passo 9: PR aberto 29/09 (3ª sub-aba da Conciliação; lacuna L-BS1: o JournalEntriesPanel não filtra por lançamento, então os ids do lançamento/encargo aparecem sem link)  
**Autorização:** dono 17/09 (F-PS-1 → a) — só BRIEF; + dono, chat, 2026-09-28: "Planeja com granularidade" + "pode decidir tudo" (forks decididos sob delegação — D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE) — plano e forks; EXECUTA: "Me da o prompt para a proxima sessão que vai fazer o 1 a 4 que destrava, cria pr e mergeia esse aqui" (lançamento da sessão de execução, passos 5–9) + "Pode criar pr e comittar"  
**Depende de:** [[F7]], [[FF7]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 passo 7 · §III.2
**PRs:** #436  

## Docs

- [`docs/accounting/FE-INCR-BANK-SETTLEMENT-brief.md`](../../accounting/FE-INCR-BANK-SETTLEMENT-brief.md)
- [`docs/accounting/PLANO-ONDA1-FE-2026-09-28.md`](../../accounting/PLANO-ONDA1-FE-2026-09-28.md) — plano granular da Onda 1 de FE (28/09)
- [`docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md`](../../accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md) — sequência mestre (§4) e contrato gerado
- Decisão: [[D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE]]

## Evidência

- `docs/SDD-LUMINARIS.md:1504` → | 7 | **FE-INCR-BANK-SETTLEMENT** (tela do F7) | financeiro (crescimento F7) | `sessao-planejamento` | insumos: `BE-INCR-BANK-SETTLEMENT-brief.md`, 5 rotas do #326, aba Conciliação existente (reuse canônico: GenericTable/Modal/StandardPagination) | BRIEF + forks PENDENTES | dono 17/09 (`PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`, F-PS-1 → a) | ✅ **BRIEF 17/09 (sessão 6)** — `FE-INCR-BANK-SETTLEMENT-brief.md`, F-FE-BS-1..4 [H] |
- `docs/SDD-LUMINARIS.md:1648` → FEF7["FE-INCR-BANK-SETTLEMENT<br/>tela — contagem no fold do F7"]:::blocked
- `docs/SDD-LUMINARIS.md:1719` → FF7 --> FEF7
- `docs/SDD-LUMINARIS.md:1744` → | **FE-INCR-BANK-SETTLEMENT** | blocked | F7 | BRIEF F7 §0 |

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1744`

| **FE-INCR-BANK-SETTLEMENT** | blocked | F7 | BRIEF F7 §0 |
