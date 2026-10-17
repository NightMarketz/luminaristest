---
id: "M5-lgpd-rbac"
tipo: "diferido"
dominio: "governanca"
titulo: "LGPD/RBAC granular"
estado: "deferred"
estado_detalhe: "⚫ parcial"
ancora_sdd: "§M5"
atualizado: "2026-10-17"
---
# M5-lgpd-rbac — LGPD/RBAC granular

**Estado:** `deferred` — ⚫ parcial  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** —  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5

## Evidência

- `docs/SDD-LUMINARIS.md:1120` → | **LGPD/RBAC granular** | ⚫ Parcial | Autorização no servidor já vale; mascaramento/retenção/papéis finos = incremento próprio. |

## Verificação legal 17/10/2026

- **Feature nova revelada:** não existe fluxo de **comunicação de incidente de segurança** à ANPD e ao titular (LGPD art. 48 e regulamento da ANPD). O acervo ctresb/leis não tem as resoluções da ANPD e o projeto não tem decisão apoiada nelas (dossiê [`verif-2026-10-17-lgpd-cdc-obrigacoes`](../../../pesquisas-legais/verif-2026-10-17-lgpd-cdc-obrigacoes/relatorio.md)). Antes de planejar, ler a resolução vigente em gov.br/anpd.
- Expurgo de 90 dias justificado como "LGPD" (`PurgeDeletedRecords.ts:19`): conferir guarda até a prescrição (CTN 195 p.ú.) — em investigação na sessão de pacote/retenções.
- A Lei 15.352/2026 só reorganiza a ANPD; os arts. 5º II, 6º, 7º, 11, 38 e 46 usados pelo projeto não mudaram.
