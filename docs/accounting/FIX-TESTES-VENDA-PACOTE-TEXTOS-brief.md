# BRIEF — FIX-TESTES-VENDA-PACOTE-TEXTOS: os avisos da venda de pacote testados pelo texto que a tela mostra

> **Estado:** BRIEF de correção, 04/11/2026. Sem código e sem `executa`. Os forks estão em **RATIFICAÇÃO PENDENTE**.
> Régua: [`APRENDIZADOS-TESTES-2026-11-04.md`](../operating-manual/APRENDIZADOS-TESTES-2026-11-04.md) (A1, A3, A5).

## 0. Contexto fixo

- **Item:** inventário de testes (PR #1065), §4.5: os textos da VENDA-PACOTE ("Pacote precisa de cliente cadastrado",
  "Uma venda leva um único pacote") não casam com nenhum teste. O `RUNBOOK-H2-VENDA-PACOTE` pode ser aposentado depois
  de seed e testes (§3: sobra para o dono "nada").
- **Autorização:** dono, chat, 04/11: *"… e onde já estiver implementado, você também já cria briefs de correção de acordo
  com o aprendizado."* Cobre **este BRIEF**. Executar pede `executa` próprio.
- **Fatos lidos (verificado, 04/11):**
  - `my-app/features/dashboard/category-views/finance/components/sales/SalesCreateModal.tsx:64–70`: `PACKAGE_ISSUE_KEYS`
    mapeia 5 códigos (`customer_required`, `mixed_packages`, `package_not_in_catalog`, `below_catalog`,
    `above_catalog_unsupported`) para chave i18n e texto padrão. O texto aparece no `setSubmitError` (`:226–227`) e no aviso
    da aba (`:429`). `create/SaleItemsManager.tsx:298` repete o `one_package`.
  - `my-app/public/locales/{pt,en}/finance_view.json:97–98` têm as chaves.
  - Testes que existem: `utils/__tests__/packageSale.test.ts:38–42` e
    `hooks/sales/__tests__/useSalesCreateForm.packages.test.ts:62,69` assertam só o **código** do problema.
    `components/sales/__tests__/vendaPacote.test.tsx` cobre os itens 1, 2, 3b, 7 e 8 do FE-INCR-VENDA-PACOTE, mas não os
    avisos. Nenhum teste casa com o texto nem com a chave `finance_view:sales.package.*`.
- **Por que é lacuna (A3):** a regra (qual código sai) está provada. A ligação código → texto na tela, não. Um erro de chave
  ou um texto em inglês na tela pt passaria. A execução de 04/11 achou "textos sem tradução" desta classe (PESQUISA-TESTES
  §7.1).

## 1. Checklist de comportamentos

Sessão: **`sessao-feature`** com `executa` (é cobertura sobre código que a execução de 04/11 viu correto; ninguém mostrou
texto errado nestes 5). Se algum caso sair vermelho, ele vira PR vermelho de propósito e segue para a `sessao-correcao`.

1. **[direto] Um caso por código (A3), na camada mais barata (A1): vitest do `SalesCreateModal`**, no molde do
   `vendaPacote.test.tsx` (shim `globalThis.React`, mocks de `CurrencyContext` e `dfe.service`). Para cada um dos 5
   códigos, o estado do formulário que o produz (um por vez) e a asserção **do texto pt exibido** (`screen.getByText`), com
   a i18n carregada do `public/locales/pt/finance_view.json` real (F-VPT-1).
2. **[direto] Paridade pt/en dos 5 textos:** cada chave de `PACKAGE_ISSUE_KEYS` existe nos dois `finance_view.json` e não é
   vazia. É um teste de tabela, sem render.
3. **[direto] Aba certa:** `customer_required` leva à aba 0 e os outros à aba 1 (`:225`), assertado pelo painel visível.
4. **[cond:F-VPT-2] Tela (A5):** os passos do `RUNBOOK-H2-VENDA-PACOTE` que sobram depois de 1–3 vão para um roteiro do
   `scripts/runbook-tela.mjs` (#1064) sobre um cenário de venda de pacote. O runbook passa a citar os testes.

## 2. Contratos

Nenhum contrato novo. O teste lê `PACKAGE_ISSUE_KEYS` (export, se a sessão precisar; hoje é `const` local, F-VPT-3).

Gates do diff: `cd my-app && npm run test:types`; rodar local só o arquivo: `npx vitest run <caminho>`.

## 3. Forks (RATIFICAÇÃO PENDENTE)

### F-VPT-1 — De onde vem o texto esperado
- (a) Do JSON real de `public/locales/pt` (a asserção quebra se alguém mudar o texto sem mudar o teste).
- (b) Do texto padrão do segundo elemento da tupla (prova o fallback, não a tradução).
- **Recomendação:** (a). É o que a tela mostra em pt.

### F-VPT-2 — Aposentar o RUNBOOK-H2-VENDA-PACOTE
- (a) Depois de 1–3 e do roteiro de tela do item 4, marcar o runbook como aposentado, citando os testes.
- (b) Manter o runbook até haver seed de cenário de venda (inventário §7, item 3).
- **Recomendação:** (b). O item 4 precisa do cenário; sem ele, o runbook continua sendo a única prova da tela.

### F-VPT-3 — Exportar `PACKAGE_ISSUE_KEYS`
- (a) Exportar a constante (uma palavra em código de produção).
- (b) Repetir as 5 chaves no teste.
- **Recomendação:** (a). (b) deixa o teste passar com uma chave que o componente não usa.

## 4. Pendente de validação externa

Nenhum.

## 5. Insumos ausentes

- Como o vitest do my-app carrega a i18n (instância real ou mock de `t`). A sessão lê o setup antes do item 1.

## 6. Achados fora de escopo

- `SaleItemsManager.tsx:298` repete a chave `one_package` fora do mapa. Duplicação de texto; não se planeja aqui.
