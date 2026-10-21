---
id: "FIX-FE-DASHBOARD"
tipo: "fe"
dominio: "plataforma"
titulo: "Frontend antigo do dashboard: datetime mostra o dia anterior, sem interceptor de 401, erros da API não são Error, chaves i18n duplicadas, json como [object Object]…"
estado: "planned"
estado_detalhe: "Registrado 19/10; §3.5 do documento de achados (30 itens). O item 1 (readOnly na edição) está no #771"
depende_de: ["[[FIX-ESTOQUE-FINALIZE]]"]
write_set: ["my-app/features/dashboard/**", "my-app/lib/api/**", "my-app/lib/context/**", "my-app/public/locales/**", "my-app/components/ui/**", "my-app/components/widgets/generic-chat/components/CommandConfirmationModal.tsx"]
atualizado: "2026-10-19"
---
# FIX-FE-DASHBOARD — Frontend antigo do dashboard: datetime mostra o dia anterior, sem interceptor de 401, erros da API não são Error, chaves i18n duplicadas, json como [object Object]…

**Estado:** `planned` — Registrado 19/10; §3.5 do documento de achados (30 itens). O item 1 (readOnly na edição) está no #771  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[FIX-ESTOQUE-FINALIZE]]  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

registrado a pedido do dono (chat, 2026-10-19: "Já incorpora nos planos do vault e encaixa na fila"); sem 'executa'.

## Itens de maior risco (§3.5)

1. `datetime` perde a hora e exibe o dia anterior (input `date` → meia-noite UTC → local).
2. Sem interceptor de 401/refresh: token expirado vira toast genérico até navegar.
3. O ApiClient lança objeto plano → todo `instanceof Error` cai no fallback; erro por campo não chega ao wizard de pessoas.
4. Estado da `GenericTabbedView` reseta a cada render do pai.
5. `common.json` en/pt com chaves duplicadas (`actions`, `filters`, `status`) e duas chaves inexistentes.
6. DynamicForm ignora `requiredIf`, `min/max`, `format url/custom`, `defaultValue`; `json` vira "[object Object]";
   `readOnly`/`aria-invalid` descartados em select/moeda/percentual/checkbox; `PercentageField` quebra em en-US.
7. Botões sem `onClick` no detalhe do Kanban; lógica de dependência do Controle Total morta; 13 `fetch` cru.
