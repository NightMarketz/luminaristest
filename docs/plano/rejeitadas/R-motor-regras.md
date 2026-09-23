---
id: "R-motor-regras"
tipo: "rejeitada"
dominio: "governanca"
titulo: "Motor de Regras Contábeis (template gera lançamento)"
estado: "rejected"
ancora_sdd: "§M4"
atualizado: "2026-09-23"
---
# R-motor-regras — Motor de Regras Contábeis (template gera lançamento)

**Estado:** `rejected` — s/ detalhe  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M4

## Evidência

- `docs/SDD-LUMINARIS.md:1092` → | **Motor de Regras Contábeis** (`conditionsJson`/`templateJson` gera lançamento) | 🔴 **Rejeitada (recomendação de domínio)** | Vencedor: **bridge pós-commit explícita por origem**. Um engine dirigido por template no caminho do ledger reintroduz o "motor de plugins" no ponto mais crítico (quem valida que o template balanceia? versionamento?). ADR-C01 fixou o padrão de bridge. |
