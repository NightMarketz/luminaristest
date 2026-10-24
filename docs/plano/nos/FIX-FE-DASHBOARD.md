---
id: "FIX-FE-DASHBOARD"
tipo: "fe"
dominio: "plataforma"
titulo: "Frontend antigo do dashboard: datetime mostra o dia anterior, sem interceptor de 401, erros da API não são Error, chaves i18n duplicadas, json como [object Object]…"
estado: "done"
estado_detalhe: "§3.5 fechado em 24/10: 26 itens corrigidos (#771 item 1; #804, #806, #813, #817, #823; #884 para 3 resíduo, 4 e 7 resíduos), 19 e 20 não reproduzem mais (pagos pelo #784), 23 não é defeito (dono, 22/10, [[D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD]]), 2 pertence ao W1. Tabela em §Fechamento"
autorizacao: "dono, chat, 2026-10-24: \"Autorizo executar o nó FIX-FE-DASHBOARD … primeiro sessao-instrumentacao … depois sessao-correcao (fix mínimo). Itens que não reproduzirem como descritos: registre como 'não reproduz' e não conserte … PR sem merge.\" Antes: 2026-10-21, \"Autorizo instrumentar e corrigir os achados de … FIX-FE-DASHBOARD (§3.5) … sem merge\""
depende_de: ["[[FIX-ESTOQUE-FINALIZE]]"]
write_set: ["my-app/features/dashboard/**", "my-app/lib/api/**", "my-app/lib/services/**", "my-app/lib/context/**", "my-app/public/locales/**", "my-app/components/ui/**", "my-app/components/widgets/generic-chat/components/CommandConfirmationModal.tsx", "my-app/pages/dashboard/setup.tsx", "my-app/features/interview/setup/TotalControlSetup.tsx"]
atualizado: "2026-10-24"
prs: ["#884"]
---
# FIX-FE-DASHBOARD — Frontend antigo do dashboard: datetime mostra o dia anterior, sem interceptor de 401, erros da API não são Error, chaves i18n duplicadas, json como [object Object]…

**Estado:** `done` — §3.5 fechado em 24/10: 26 itens corrigidos (#771 item 1; #804, #806, #813, #817, #823; #884 para 3 resíduo, 4 e 7 resíduos), 19 e 20 não reproduzem mais (pagos pelo #784), 23 não é defeito (dono, 22/10, [[D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD]]), 2 pertence ao W1. Tabela em §Fechamento  
**Autorização:** dono, chat, 2026-10-24: "executa FIX-FE-DASHBOARD" (texto literal no campo `autorizacao`); write_set do item 7 ampliado em [[D-2026-10-24-FIX-FE-DASHBOARD-ITEM7]]  
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

## Fechamento (24/10) — os 30 itens do §3.5

| # | Desfecho | Onde |
|---|---|---|
| 1 | corrigido | #771 |
| 2 | fora do nó: é o W1 (customização da entrevista) | BRIEF W1 (#790) |
| 3 | corrigido em duas vezes: `datetime-local` (#804); ISO UTC do servidor exibido na hora local e hora digitada sobe como ISO UTC (resíduo, guarda com ISO real) | #804 · `DynamicForm.datetimeIso.test.tsx` |
| 4 | corrigido: 401 com token no `apiClient` emite `luminaris:session-expired`; o `AuthProvider` apaga o cookie e zera o usuário (o `withAuth` leva ao login). Sem refresh: o servidor não tem rota de refresh | `lib/context/__tests__/AuthContext.apiClient401.test.tsx` |
| 5, 6, 10, 12, 16, 17 | corrigidos | #804 |
| 7 | corrigido: botões do Kanban (#806); botão "Contact support" do setup e mapa de dependências morto do Controle Total ([[D-2026-10-24-FIX-FE-DASHBOARD-ITEM7]]) | #806 · `item7.residuos.static.test.ts` |
| 8, 9, 11, 13, 14 | corrigidos | #806 |
| 15, 18, 21, 22 | corrigidos | #813 |
| 19 | **não reproduz**: 0 `fetch` cru em `pages/`, `features/`, `components/`. A dívida R2b foi paga (27 → 0, #784) e o lint gate barra caso novo | #784 |
| 20 | **não reproduz**: o SSR do dashboard passa pelo `apiClient` (`DynamicTableService.getTablesSsr`), mesma base URL | #784 |
| 23 | não é defeito (dono, 22/10) | [[D-2026-10-22-FIX-AUTH-CHAT-DASHBOARD]] |
| 24–27, 29, 30 | corrigidos | #823 (#815, #818, #819) |
| 28 | corrigido | #817 |

**Achados fora de escopo (24/10):** (a) o SSR de `pages/dashboard/index.tsx` loga `tokenPreview: token.substring(0, 20)`,
um pedaço do JWT, no `console.log` (ADR-OBSERVABILIDADE); (b) as chaves `onboardingNeedHelp`, `onboardingContactSupport`
e `onboardingTotalControlConfirmDeselect` ficaram sem uso em `common.json` en/pt; (c) a submissão de `datetime` sobe o
instante com o fuso do navegador, e o servidor ainda aceita hora sem fuso de outro cliente (lê no fuso dele).
