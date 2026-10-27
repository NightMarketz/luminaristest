---
id: "D-2026-10-24-FIX-FE-DASHBOARD-ITEM7"
tipo: "decisao"
dominio: "plataforma"
titulo: "FIX-FE-DASHBOARD item 7, resíduos: remover o botão \"Contact support\" do setup e o mapa de dependências morto do Controle Total, com write_set ampliado"
estado: "decided"
autorizacao: "dono, chat, 2026-10-24, respostas ao AskUserQuestion: \"Amplia e remove (Recommended)\" (botão do setup) · \"Remove o código morto (Recommended)\" (Controle Total). Execução do nó: \"executa FIX-FE-DASHBOARD\". NÃO é merge"
atualizado: "2026-10-24"
---
# D-2026-10-24-FIX-FE-DASHBOARD-ITEM7

**Estado:** `decided`. **Autorização:** dono, chat, 24/10/2026 (texto literal no campo `autorizacao`). Origem:
[`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md) §3.5 item 7. O #806
tirou só os botões do Kanban ("remove os botões sem ação do item 7", 21/10). Ficaram dois resíduos fora do write_set de
[[FIX-FE-DASHBOARD]]:

| Resíduo | Decisão |
|---|---|
| `pages/dashboard/setup.tsx`: botão "Contact our technical support" sem `onClick` | **Ampliar o write_set e remover** o botão e a frase "Need help?" |
| `features/interview/setup/TotalControlSetup.tsx`: `analyzePresetDependencies` devolve sempre mapa vazio, então a auto-seleção e o aviso ao desmarcar nunca rodam | **Ampliar o write_set e remover o código morto.** As travas entre tabelas continuam no servidor. Implementar o mapa pelas relações seria feature e iria para BRIEF |
