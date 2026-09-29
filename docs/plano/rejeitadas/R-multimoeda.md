---
id: "R-multimoeda"
tipo: "rejeitada"
dominio: "governanca"
titulo: "Multi-moeda (transactionCurrencyCode/exchangeRate) — fora / ADR próprio"
estado: "rejected"
ancora_sdd: "§M4"
atualizado: "2026-09-23"
---
# R-multimoeda — Multi-moeda (transactionCurrencyCode/exchangeRate) — fora / ADR próprio

**Estado:** `rejected` — s/ detalhe  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M4  
**Reabertura pedida (29/09):** o dono escolheu um **ADR de moeda no Contas a Receber** (câmbio realizado + monitor de câmbio) — [[D-2026-09-29-CRM-RB-MOEDA-REALIZADO]]. O estado segue `rejected` até esse ADR ser ratificado; a tabela `PtaxRate` do [[CRM-RB]] é só exibição e não reabre nada por si.

## Evidência

- `docs/SDD-LUMINARIS.md:1094` → | Multi-moeda (`transactionCurrencyCode`/`exchangeRate`) | 🔴 **Fora / ADR próprio** | BRL-only. Campo reservado no `AccountingScope` como slot futuro, sem implementação. |
