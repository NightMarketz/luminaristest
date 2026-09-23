---
id: "R-motor-dominio"
tipo: "rejeitada"
dominio: "governanca"
titulo: "Motor de Domínio (MutationEngine + DAG + PluginRegistry + fila) — rejeitado 2026-09-21"
estado: "rejected"
ancora_sdd: "§M4"
atualizado: "2026-09-23"
---
# R-motor-dominio — Motor de Domínio (MutationEngine + DAG + PluginRegistry + fila) — rejeitado 2026-09-21

**Estado:** `rejected` — s/ detalhe  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M4

## Docs

- [`docs/adr/ADR-DOMAIN-MOTOR-rejected.md`](../../adr/ADR-DOMAIN-MOTOR-rejected.md)

## Evidência

- `docs/SDD-LUMINARIS.md:1093` → | **Motor de Domínio** (MutationEngine + OrchestrationEngine em DAG + PluginRegistry + AuditLog central + fila) | 🔴 **Rejeitada 2026-09-21** | Vencedor: **2 commits + reconcile declarados no cabeçalho `atomicUntil`** (Contrato §2.3, `[AC-2.3-1..3]`); primitiva `commitThenReconcile` só nasce de incidente. Irmã da linha acima: o mesmo "motor de plugins no caminho do razão", um nível acima. Das 5 falhas alegadas, 3 já tinham resposta na casa, 1 era meio verdadeira e 1 invertia a guarda de PII da allowlist de auditoria; o pseudo-código central não sustentava a promessa ACID. 4 gatilhos de reabertu
