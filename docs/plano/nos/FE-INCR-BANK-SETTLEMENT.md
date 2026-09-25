---
id: "FE-INCR-BANK-SETTLEMENT"
tipo: "fe"
dominio: "financeiro"
titulo: "Tela do F7 (baixa por retorno bancário)"
estado: "planned"
estado_detalhe: "BRIEF ✅ 17/09; forks F-FE-BS-1..4 pendentes [H]"
depende_de: ["[[F7]]", "[[FF7]]"]
autorizacao: "dono 17/09 (F-PS-1 → a) — só BRIEF"
ancora_sdd: "§III.1 passo 7 · §III.2"
atualizado: "2026-09-23"
---
# FE-INCR-BANK-SETTLEMENT — Tela do F7 (baixa por retorno bancário)

**Estado:** `planned` — BRIEF ✅ 17/09; forks F-FE-BS-1..4 pendentes [H]  
**Autorização:** dono 17/09 (F-PS-1 → a) — só BRIEF  
**Depende de:** [[F7]], [[FF7]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §III.1 passo 7 · §III.2

## Docs

- [`docs/accounting/FE-INCR-BANK-SETTLEMENT-brief.md`](../../accounting/FE-INCR-BANK-SETTLEMENT-brief.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1504` → | 7 | **FE-INCR-BANK-SETTLEMENT** (tela do F7) | financeiro (crescimento F7) | `sessao-planejamento` | insumos: `BE-INCR-BANK-SETTLEMENT-brief.md`, 5 rotas do #326, aba Conciliação existente (reuse canônico: GenericTable/Modal/StandardPagination) | BRIEF + forks PENDENTES | dono 17/09 (`PLANO-SESSAO-2026-09-17-pontas-nao-codigo.md`, F-PS-1 → a) | ✅ **BRIEF 17/09 (sessão 6)** — `FE-INCR-BANK-SETTLEMENT-brief.md`, F-FE-BS-1..4 [H] |
- `docs/SDD-LUMINARIS.md:1648` → FEF7["FE-INCR-BANK-SETTLEMENT<br/>tela — contagem no fold do F7"]:::blocked
- `docs/SDD-LUMINARIS.md:1719` → FF7 --> FEF7
- `docs/SDD-LUMINARIS.md:1744` → | **FE-INCR-BANK-SETTLEMENT** | blocked | F7 | BRIEF F7 §0 |

## Linhas de origem (verbatim do SDD consolidado)

> Copiadas das tabelas das Partes II/III de `docs/SDD-LUMINARIS.md` (snapshot 23/09). O estado **vivo** é o frontmatter acima.

`SDD:1744`

| **FE-INCR-BANK-SETTLEMENT** | blocked | F7 | BRIEF F7 §0 |
