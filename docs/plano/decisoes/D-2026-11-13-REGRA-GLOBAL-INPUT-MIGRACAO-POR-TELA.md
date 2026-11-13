---
id: "D-2026-11-13-REGRA-GLOBAL-INPUT-MIGRACAO-POR-TELA"
tipo: "decisao"
dominio: "frontend"
titulo: "A regra global de input deixa de vencer a utilitária do campo tela a tela, por opt-in data-own-style"
estado: "decided"
autorizacao: "dono, chat, 2026-11-13, questionário: \"Migrar por tela\" (alternativa recusada: aplicar input:where() em todos os 109 inputs de uma vez)"
atualizado: "2026-11-13"
---
# D-2026-11-13-REGRA-GLOBAL-INPUT-MIGRACAO-POR-TELA

**Estado:** `decided`. Causa-raiz do achado W7 passo 6 (runbook do wizard).

## Problema (medido)

`my-app/styles/globals.css` (`@layer base`) estiliza `input[type=text|email|password|number|search]` com especificidade
0,1,1 (0,2,1 no escuro, e nos estados `:focus`/`::placeholder`). A utilitária do próprio campo (0,1,0 / 0,2,0) perde, e `textarea`
e `select` (seletor de tag) não sofrem. Auditoria por AST sobre `my-app/**/*.tsx` (386 `<input>`; 160 com `type` alvo;
109 com `className` resolvível): **106 de 109 inputs ignoram pelo menos uma propriedade que o próprio autor declarou**, em 57
arquivos. Dois defeitos são funcionais, não estéticos: 25 inputs ignoram `pl-*` (texto por cima do ícone, p.ex.
`pages/users/create.tsx` com `pl-9`) e 9 ignoram uma largura fixa (`w-24` etc.; renderizam a 100%). Login e signup já
contornavam com `!pl-16`.

## Decisão

1. **Migração por tela, não troca global.** Trocar a regra inteira por `input:where([type=...])` (opção "b") mudaria a
   aparência de 106 inputs sem revisão visual por tela; o dono recusou.
2. **Mecanismo:** o campo que declara a própria aparência recebe o atributo `data-own-style`. Nele a mesma base vira
   `input:where([data-own-style][type=...])` (especificidade 0,0,1): **continua dando o default do que o campo não declara**, mas
   toda utilitária dele vence. Sem o atributo nada muda (`:not(:where([data-own-style]))` tem especificidade 0).
3. **Não usar o modificador `!`** (`!rounded-2xl`...) para resolver este conflito: o PR do wizard o usou como menor mudança e
   a migração o remove.
4. Quando a fila abaixo zerar, a primeira regra cai e fica só a segunda (cleanup final, mais um item da fila).
5. **Guarda:** `my-app/__tests__/styles/globalFieldRuleCascade.test.ts` calcula a cascata do CSS compilado. Falha se um campo
   migrado perder o atributo ou se a regra global vencer a utilitária dele; também prova que o campo sem atributo continua
   como era (telas não migradas não mudam) e que o default global do que o campo não declara se mantém. Falsificado: com o
   `globals.css` antigo, 3 dos 6 testes ficam vermelhos.

## Migrado neste PR

`pages/users/login.tsx`, `pages/users/signup.tsx` (`!pl-16` → `pl-16`) e os 5 campos do wizard
(`QuickSetup`, `TotalControlSetup`, `NewFieldForm` ×2, `InputArea`; os `!` do PR #1250 saem, as classes voltam ao que o autor
escreveu). Medição de `getComputedStyle` em build de produção no corpo do PR.

## Como migrar uma tela

1. Adicione `data-own-style` ao `<input>` e confira a classe: o que o autor declarou passa a valer (raio, fundo, borda,
   padding, largura, cor).
2. Rode `npx vitest run __tests__/styles/globalFieldRuleCascade.test.ts` (acrescente o arquivo em `WIZARD_FILES` do teste).
3. Revisão visual em claro e escuro (build de produção, `127.0.0.1`) antes do merge. **Um PR por tela ou por feature**; o
   efeito visual é do autor, não do default.

## Fila (54 arquivos, 99 inputs) — "defeito" = hoje ignora `pl-*` ou largura

Linhas da `main` em 13/11 (auditoria por AST; reconstrua com `audit-inputs.cjs`/`cascade-diff.cjs`, nas notas da sessão). Os 16
com defeito primeiro.

| arquivo | inputs | linhas | defeito funcional |
|---|---|---|---|
| `my-app/components/widgets/generic-chat/components/GenericChatWidget.tsx` | 1 | 225 | **sim** |
| `my-app/features/accounting/components/CompliancePanel.tsx` | 5 | 212, 291, 300, 353, 401 | **sim** |
| `my-app/features/accounting/components/JournalEntryModal.tsx` | 3 | 339, 358, 428 | **sim** |
| `my-app/features/accounting/components/MeiEnquadramentoSection.tsx` | 1 | 160 | **sim** |
| `my-app/features/accounting/components/PresumidoServicosSection.tsx` | 1 | 92 | **sim** |
| `my-app/features/accounting/components/SubledgerFilterBar.tsx` | 1 | 58 | **sim** |
| `my-app/features/accounting/components/TaxAssessmentPanel.tsx` | 1 | 150 | **sim** |
| `my-app/features/crm/components/reports/CrmReportEditor.tsx` | 2 | 534, 636 | **sim** |
| `my-app/features/dashboard/category-views/finance/components/sales/create/inputs.tsx` | 3 | 45, 129, 180 | **sim** |
| `my-app/features/dashboard/category-views/finance/components/sales/SalesCreateModal.tsx` | 1 | 448 | **sim** |
| `my-app/features/dashboard/category-views/inventory/components/InventoryTable.tsx` | 1 | 347 | **sim** |
| `my-app/features/dashboard/category-views/inventory/components/MovementModal.tsx` | 2 | 231, 273 | **sim** |
| `my-app/pages/documents/index.tsx` | 1 | 156 | **sim** |
| `my-app/pages/users/create.tsx` | 4 | 127, 149, 171, 227 | **sim** |
| `my-app/pages/users/edit/[id].tsx` | 4 | 313, 335, 357, 413 | **sim** |
| `my-app/pages/users/profile.tsx` | 5 | 394, 412, 431, 465, 482 | **sim** |
| `my-app/features/accounting/components/AccountsPayablePanel.tsx` | 1 | 595 |  |
| `my-app/features/accounting/components/AccountsReceivablePanel.tsx` | 1 | 715 |  |
| `my-app/features/accounting/components/CatalogCombobox.tsx` | 1 | 150 |  |
| `my-app/features/accounting/components/ChartOfAccountsPanel.tsx` | 2 | 210, 226 |  |
| `my-app/features/accounting/components/CreateCounterpartyModal.tsx` | 2 | 152, 167 |  |
| `my-app/features/accounting/components/CreatePayableModal.tsx` | 5 | 281, 295, 310, 324, 452 |  |
| `my-app/features/accounting/components/CreateReceivableModal.tsx` | 4 | 212, 226, 241, 255 |  |
| `my-app/features/accounting/components/DepreciationRatesSection.tsx` | 1 | 233 |  |
| `my-app/features/accounting/components/DimensionsPanel.tsx` | 4 | 490, 502, 623, 635 |  |
| `my-app/features/accounting/components/EntryApprovalsPanel.tsx` | 2 | 597, 611 |  |
| `my-app/features/accounting/components/FixedAssetFormModal.tsx` | 1 | 258 |  |
| `my-app/features/accounting/components/ImportExportPanel.tsx` | 2 | 211, 323 |  |
| `my-app/features/accounting/components/JournalEntriesPanel.tsx` | 2 | 532, 544 |  |
| `my-app/features/accounting/components/LalurParteBModal.tsx` | 1 | 222 |  |
| `my-app/features/accounting/components/PeriodsPanel.tsx` | 1 | 237 |  |
| `my-app/features/accounting/components/ReconciliationPanel.tsx` | 3 | 516, 526, 536 |  |
| `my-app/features/accounting/components/ReviewDetailModal.tsx` | 1 | 485 |  |
| `my-app/features/crm/components/CrmPipelineBoard.tsx` | 1 | 147 |  |
| `my-app/features/crm/components/LeadConvertModal.tsx` | 6 | 170, 183, 202, 208, 212, 238 |  |
| `my-app/features/crm/components/LeadTasksPanel.tsx` | 1 | 193 |  |
| `my-app/features/crm/components/OpportunityCreateModal.tsx` | 2 | 174, 198 |  |
| `my-app/features/crm/components/ProposalCaptureModal.tsx` | 2 | 94, 127 |  |
| `my-app/features/dashboard/category-views/finance/components/expenses/ExpensesFilterBar.tsx` | 1 | 59 |  |
| `my-app/features/dashboard/category-views/finance/components/sales/SaleActionModals.tsx` | 1 | 214 |  |
| `my-app/features/dashboard/category-views/finance/components/sales/SalesFilterBar.tsx` | 1 | 48 |  |
| `my-app/features/dashboard/category-views/inventory/components/InventoryFilterBar.tsx` | 2 | 71, 163 |  |
| `my-app/features/dashboard/category-views/kanban/KanbanFilterBar.tsx` | 1 | 48 |  |
| `my-app/features/dashboard/category-views/kanban/KanbanFilterSidebar.tsx` | 1 | 49 |  |
| `my-app/features/dashboard/category-views/people/components/PeopleFilterBar.tsx` | 1 | 47 |  |
| `my-app/features/dashboard/category-views/planning/components/PlanningFilterBar.tsx` | 1 | 62 |  |
| `my-app/features/dashboard/category-views/products/ProductFilterBar.tsx` | 1 | 66 |  |
| `my-app/features/dashboard/category-views/services/ServiceFilterBar.tsx` | 1 | 63 |  |
| `my-app/features/dashboard/category-views/shared/components/GenericFilterBar.tsx` | 1 | 47 |  |
| `my-app/features/dashboard/category-views/shared/components/RelationCell.tsx` | 1 | 131 |  |
| `my-app/features/dashboard/category-views/shared/components/SavedViewsMenu.tsx` | 1 | 87 |  |
| `my-app/features/dashboard/components/forms/dynamic-form-fields/CepAddressField.tsx` | 1 | 66 |  |
| `my-app/features/dashboard/components/forms/dynamic-form-fields/CurrencyField.tsx` | 1 | 75 |  |
| `my-app/features/dashboard/components/forms/RelationSelector.tsx` | 1 | 162 |  |
