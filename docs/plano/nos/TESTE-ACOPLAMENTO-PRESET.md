---
id: "TESTE-ACOPLAMENTO-PRESET"
tipo: "plataforma"
dominio: "plataforma"
titulo: "Teste de acoplamento preset↔schema: campos lidos por plugins e KPIs ⊆ campos declarados; regras de governança apontam para campo/tabela existente"
estado: "done"
estado_detalhe: "24/10: teste-guarda entregue (presetSchemaCoupling.test.ts + extensão do analyticsFieldMappingCoupling.test.ts, itens 1–8 do BRIEF); 10 achados registrados em KNOWN_GAPS — 6 do FIX-PLUGINS-VENDA, 4 do FIX-ANALYTICS-RESIDUO (lista em '## Achados'); nada consertado · 22/10: forks F-TAP-1..5 já estavam RATIFICADOS em 21/10 ([[D-2026-10-21-CHAT-C-FORKS]], #793: 1b, 2a, 3a, 4a, 5a); registro levado ao BRIEF nesta data. Sem fork pendente; espera o 'executa' (e o FIX-ANALYTICS-DADO de que depende) · 21/10: BRIEF em docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md, forks F-TAP-1..5 pendentes · Registrado 19/10. A varredura de hoje deu zero inconsistência nas regras de governança, mas não há teste — typo num módulo vira regra silenciosa (REVIEW_BACKLOG, junho). O #770 cobre só expenses"
depende_de: ["[[FIX-ANALYTICS-DADO]]"]
autorizacao: "dono, chat, 2026-10-21: \"dispara os chats A, C e F agora\" — escopo: planejar o BRIEF, sessao-planejamento, só docs, sem código, sem 'executa' · **EXECUTA** (dono, chat, 2026-10-24): \"executa TESTE-ACOPLAMENTO-PRESET\" — sessao-feature pelo BRIEF; teste-guarda, não consertar os campos órfãos, só registrar como achado; PR sem merge"
write_set: ["server/src/features/dynamicTables/presets/__tests__/**", "server/src/features/analytics/**/__tests__/**"]
atualizado: "2026-10-24"
prs: ["#859", "#883"]
---
# TESTE-ACOPLAMENTO-PRESET — Teste de acoplamento preset↔schema: campos lidos por plugins e KPIs ⊆ campos declarados; regras de governança apontam para campo/tabela existente

**Estado:** `done` — 24/10: teste-guarda entregue (presetSchemaCoupling.test.ts + extensão do analyticsFieldMappingCoupling.test.ts, itens 1–8 do BRIEF); 10 achados registrados em KNOWN_GAPS — 6 do FIX-PLUGINS-VENDA, 4 do FIX-ANALYTICS-RESIDUO (lista em '## Achados'); nada consertado · 22/10: forks F-TAP-1..5 já estavam RATIFICADOS em 21/10 ([[D-2026-10-21-CHAT-C-FORKS]], #793: 1b, 2a, 3a, 4a, 5a); registro levado ao BRIEF nesta data. Sem fork pendente; espera o 'executa' (e o FIX-ANALYTICS-DADO de que depende) · 21/10: BRIEF em docs/accounting/TESTE-ACOPLAMENTO-PRESET-brief.md, forks F-TAP-1..5 pendentes · Registrado 19/10. A varredura de hoje deu zero inconsistência nas regras de governança, mas não há teste — typo num módulo vira regra silenciosa (REVIEW_BACKLOG, junho). O #770 cobre só expenses  
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

- BRIEF: [`TESTE-ACOPLAMENTO-PRESET-brief.md`](../../accounting/TESTE-ACOPLAMENTO-PRESET-brief.md) (21/10) — 8 comportamentos; forks F-TAP-1..5 ratificados em 21/10 ([[D-2026-10-21-CHAT-C-FORKS]]). Executado em 24/10.
- Teste-guarda: `server/src/features/dynamicTables/presets/__tests__/presetSchemaCoupling.test.ts` (itens 1–4, 6–8),
  `analyticsFieldMappingCoupling.test.ts` (item 5, estende o #770) e o universo compartilhado `presetCouplingUniverse.ts`.

## Achados (24/10, teste-guarda — não consertados; cada um é uma entrada de `KNOWN_GAPS`)

Universo varrido (F-TAP-1 b): as 3 suítes (Core + módulos default + suíte) e Core + cada módulo CRM-0..3 isolado.
Regras de governança (item 2), `deleteConstraints` (item 3) e `defaultValue` de select (item 4): **zero** divergência.

**FIX-PLUGINS-VENDA** (6 chaves; `salão` e `clínica` têm o mesmo `stockMovements`):

1. `sourceType` em `stockMovements` — lido por `StockMovementsApplyPlugin` e por `sales/stockSync.ts`, não declarado
   no preset (o Zod do motor remove a chave) · ACHADOS §3.1 #4.
2. `reason='SALE'` e `reason='RETURN'` gravados por `stockSync.createMovementsForItems`; as opções do select são
   `Sale`/`Return` · §3.1 #17.

**FIX-ANALYTICS-RESIDUO** (4 chaves):

3. `costKpis` (`expenses`) lista `status` em `importantFields`/`defaultImportantFields`; `expenses` não tem `status` · §3.2 #16.
4. **Novo:** o KPI "Contas a Pagar Total" do `cashflowKpis` (`sales`) lista `['date', 'amount', 'paymentStatus']` —
   `amount` é de `expenses`, `date` é de `sales`; órfão em qualquer das duas leituras. `importantFields` não tem
   consumidor no frontend (só o `AnalyticsResolver` repassa).

**Por desenho (allowlist F-TAP-3 a, não é achado):** relações opcionais para módulo não instalado são descartadas
pelo create — `leads.accountId/contactId`, `crmContacts.accountId` e, **novo com o módulo isolado**,
`crmOpportunities.accountId/contactId` (CRM-3 depende só de CRM-0). A allowlist só vale para `required: false`.

Regressão fixada: `rate` em `commissions` (#771) está no manifesto dos plugins.
