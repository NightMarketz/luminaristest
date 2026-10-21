---
id: "TESTE-ACOPLAMENTO-PRESET"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Teste de acoplamento preset↔schema: campos lidos por plugins e KPIs ⊆ campos declarados; regras de governança apontam para campo/tabela existente"
estado: "planned"
estado_detalhe: "21/10: BRIEF em docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md, forks F-TAP-1..5 pendentes · Registrado 19/10. A varredura de hoje deu zero inconsistência nas regras de governança, mas não há teste — typo num módulo vira regra silenciosa (REVIEW_BACKLOG, junho). O #770 cobre só expenses"
depende_de: ["[[FIX-ANALYTICS-DADO]]"]
autorizacao: "dono, chat, 2026-10-21: \"dispara os chats A, C e F agora\" — escopo: planejar o BRIEF, sessao-planejamento, só docs, sem código, sem 'executa'"
write_set: ["server/src/features/dynamicTables/presets/__tests__/**", "server/src/features/analytics/**/__tests__/**"]
atualizado: "2026-10-21"
---
# TESTE-ACOPLAMENTO-PRESET — Teste de acoplamento preset↔schema: campos lidos por plugins e KPIs ⊆ campos declarados; regras de governança apontam para campo/tabela existente

**Estado:** `planned` — Registrado 19/10. A varredura de hoje deu zero inconsistência nas regras de governança, mas não há teste — typo num módulo vira regra silenciosa (REVIEW_BACKLOG, junho). O #770 cobre só expenses  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[FIX-ANALYTICS-DADO]]  
**Origem:** [[D-2026-10-19-ACHADOS-NA-FILA]] · achados em [`ACHADOS-2026-10-19`](../../operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md)

registrado a pedido do dono (chat, 2026-10-19: "Já incorpora nos planos do vault e encaixa na fila"); sem 'executa'.

## Por que é o primeiro item de código da seção E

É a causa comum de quatro achados de hoje: contas a pagar 0 (campo `date` inexistente), compra virando `Adjustment`
(`sourceType` não declarado), comissão sem `rate` e `reason` em caixa diferente das opções. Os testes ficavam verdes
porque as fixtures inventavam os nomes de campo.

## Escopo proposto

1. Para cada suíte instalável (Core + módulos default + suíte), toda regra (`compositeUnique`, `immutableAfter`,
   `compare`, `lifecycle`, `noOverlap`, `requiredIf`, `deleteConstraints`, `defaultDisplayField`, `defaultValue` de
   select, alvo de relação) aponta para campo/tabela existente.
2. Todo `fieldMapping`/`params.*Field` dos presets de analytics existe na tabela que ele lê.
3. Campos que os plugins escrevem por repositório (sem Zod) existem no preset — lista explícita por plugin.

## Docs

- BRIEF: [`TESTE-ACOPLAMENTO-PRESET-brief.md`](../../accounting/TESTE-ACOPLAMENTO-PRESET-brief.md) (21/10) — 8 comportamentos; forks F-TAP-1..5 em ratificação pendente. Implementação não autorizada.
