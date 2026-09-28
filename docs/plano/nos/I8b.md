---
id: "I8b"
tipo: "plataforma"
dominio: "plataforma"
titulo: "CRM — módulos divididos em submódulos atômicos (BE-INCR-CRM-SUBMODULES)"
estado: "done"
estado_detalhe: "✅ #414 ce55efcd (28/09): itens 1–12 e 15 do BRIEF (CRM-2A Contas + CRM-2B Contatos; 'CRM-2' como atalho; 400 MODULE_PARTIAL / DEPENDENT_MODULE_KEPT; 409 com missingModules; moduleViews no GET /dashboard/presets/:key); CI Linux verde. Residual: itens 13–14 (telas) → FE-INCR-CRM-SUBMODULES"
depende_de: ["[[I8]]"]
autorizacao: "direção: \"tem que dividir o módulo em submodulos\" (dono, chat, 2026-09-28); forks + execução: \"Pode seguir com as recomendações e executa cada uma das duas\" (dono, chat, 2026-09-28)"
prs: ["#413", "#414"]
ancora_sdd: "§M5.1 Bloco A I8"
atualizado: "2026-09-28"
---
# I8b — CRM — módulos divididos em submódulos atômicos (BE-INCR-CRM-SUBMODULES)

**Estado:** `done` — ✅ #414 ce55efcd (28/09): itens 1–12 e 15 do BRIEF (CRM-2A Contas + CRM-2B Contatos; 'CRM-2' como atalho; 400 MODULE_PARTIAL / DEPENDENT_MODULE_KEPT; 409 com missingModules; moduleViews no GET /dashboard/presets/:key); CI Linux verde. Residual: itens 13–14 (telas) → FE-INCR-CRM-SUBMODULES  
**Autorização:** direção: "tem que dividir o módulo em submodulos" (dono, chat, 2026-09-28); forks + execução: "Pode seguir com as recomendações e executa cada uma das duas" (dono, chat, 2026-09-28)  
**Depende de:** [[I8]]  
**Desbloqueia:** —  
**Âncora no SDD consolidado:** §M5.1 Bloco A I8  
**PRs:** #413, #414

## Docs

- [`docs/crm/BE-INCR-CRM-SUBMODULES-brief.md`](../../crm/BE-INCR-CRM-SUBMODULES-brief.md) — BRIEF (checklist, contratos, forks F-SUB-1..8 RATIFICADOS 28/09)
- Decisão: [[D-2026-09-28-CRM-SUBMODULOS-E-DFE-TPAMB]] (F-SUB-1..8; F-CRM-4 do [[I8]] revertido)

## O que é

Resposta ao achado "remover só parte de um módulo não-fixo devolve 201 e deixa tabela solta". Regra resultante: módulo
opcional tem exatamente uma tabela; módulo com mais de uma tabela só existe se for fixo (inteiro ou nada). O CRM-2
("Contas e contatos") vira CRM-2A (Contas) e CRM-2B (Contatos); CRM-0 segue atômico e fixo. Tenants existentes não
migram: "instalado" é deduzido das tabelas presentes.

