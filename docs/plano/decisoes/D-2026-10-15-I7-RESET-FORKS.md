---
id: "D-2026-10-15-I7-RESET-FORKS"
tipo: "decisao"
dominio: "plataforma"
titulo: "Reset consistente (I7) — 409 só com movimento, purga sem Documentos, T0 preservado, evento na trilha"
estado: "decided"
autorizacao: "dono, chat, 2026-10-15, questionário da sessão de planejamento do I7 ('Autorizo planejar o BRIEF do I7 — sessao-planejamento, sem código, sem executa') — 4 cédulas, todas na recomendação"
atualizado: "2026-10-15"
---
# D-2026-10-15-I7-RESET-FORKS — forks do BRIEF do [[I7]]

**Estado:** `decided` (4 cédulas, todas na recomendação).
**Autorização:** dono, chat, 15/10/2026, por questionário durante a sessão de planejamento do I7.

| Cédula | Opções | Decisão |
|---|---|---|
| F-I7-1 (D3+): contabilidade no reset | 409 só com movimento · 409 com qualquer contabilidade · nunca tocar a contabilidade | **409 só com movimento.** Havendo só a configuração do onboarding (kit, plano, período vazio, binding, perfis), ela é removida por um serviço da contabilidade, com o gate dentro da tx. A trilha nunca é apagada |
| F-I7-2: o que entra na purga | tudo menos Documentos · tudo, inclusive Documentos | **Tudo, menos Documentos** (layouts, visões salvas, relatórios e anexos do CRM, chats de widget, KG, propostas) |
| F-I7-3: T0 depois de reset + reinstalação | preservar o 1º · sobrescrever · zerar no reset | **Preservar o 1º T0** (gravado só se `null`) |
| F-I7-4: evento na trilha ao remover a configuração contábil | sim (`accounting.scope_reset`) · não, só log | **Sim**, na mesma tx, por unidade, com as contagens removidas |

Contexto que o questionário levou ao dono: desde o I4, todo onboarding de salão ou clínica já ativa a
contabilidade. Por isso o 409 "com qualquer contabilidade" do plano de 07/09 bloquearia o reset de todo tenant
desses presets.

Não cobre: o "executa" (implementar os PR-1/PR-2 do BRIEF) e o FE do 409 (achado fora de escopo).

BRIEF: [`docs/accounting/BE-INCR-RESET-CONSISTENTE-brief.md`](../../accounting/BE-INCR-RESET-CONSISTENTE-brief.md).
