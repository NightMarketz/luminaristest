---
id: "D-2026-09-28-CRM-SUBMODULOS-E-DFE-TPAMB"
tipo: "decisao"
dominio: "plataforma"
titulo: "CRM em submódulos (F-SUB-1..8, F-CRM-4 revertido), tpAmb da DPS (F-AMB-1..6) e delete em lote com as regras do individual"
estado: "decided"
autorizacao: "\"Pode seguir com as recomendações e executa cada uma das duas\" (dono, chat, 2026-09-28)"
atualizado: "2026-09-28"
---
# D-2026-09-28-CRM-SUBMODULOS-E-DFE-TPAMB — decisões do dono em 28/09

**Estado:** `decided`  
**Autorização:** "Pode seguir com as recomendações e executa cada uma das duas" (dono, chat, 2026-09-28)

| # | Decisão | Palavras do dono (28/09) | Efeito |
|---|---|---|---|
| 1 | Módulo que agrupa tabelas separáveis vira submódulos | "tem que dividir o módulo em submodulos" | BRIEF BE-INCR-CRM-SUBMODULES → [[I8b]] |
| 2 | F-SUB-1..8 ratificados conforme as recomendações (F-SUB-7 → a′; demais → a) | "Pode seguir com as recomendações…" | **F-CRM-4 do [[I8]] (07/09, "Contas + Contatos num módulo") REVERTIDO** — CRM-2 → CRM-2A/CRM-2B |
| 3 | F-AMB-1..6 ratificados conforme as recomendações (F-AMB-5 → c; demais → a) | idem | [[DFE-TPAMB]]; recusa de reenvio com ambiente divergente é parte da lacuna |
| 4 | Delete em lote respeita as mesmas regras do individual (RESTRICT, CASCADE, hooks) | "Sim deve respeitar as regras de delete" | #415 → [[PASSO-12]] |
| 5 | Merges de 28/09 entram com CI verde, sem revisão independente prévia | "pode dar merge se passar" | revisão independente rodada DEPOIS dos merges de 28/09 (manhã); achados no GAP-MAP |

