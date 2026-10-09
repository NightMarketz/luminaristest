# FE-INCR-BANK-SETTLEMENT-FEE — BRIEF (tarifa do provedor na tela de baixas do F7)

> `sessao-planejamento`, 2026-10-09. Saída: este documento. Sem código, sem "executa".
> **Forks F-FE-FEE-1..3: RATIFICAÇÃO PENDENTE.**

## 0. Contexto fixo

- **Item:** a parte de tela da tarifa retida pelo Mercado Pago no F7 (F-PP-6 → b). O lado BE é P3-7, P3-8, P3-11 e
  P3-12 do PR-3 de [`BE-INCR-PAYMENT-PROVIDER-brief.md`](BE-INCR-PAYMENT-PROVIDER-brief.md). A tela-mãe é a 3ª sub-aba
  da Conciliação ([`FE-INCR-BANK-SETTLEMENT-brief.md`](FE-INCR-BANK-SETTLEMENT-brief.md), #436).
- **Autorização:** dono, chat, 2026-10-09: "planeja o BRIEF de FE da tarifa no F7". Cobre o BRIEF e só ele, sem
  "executa". O BRIEF do F5 (§8) lista a tela do provedor (`FE-INCR-PAYMENT-PROVIDER`) como achado fora de escopo; este
  BRIEF cobre só a tarifa na tela de baixas e **não** planeja aquela tela.
- **Nós vizinhos:** consome o PR-3 do [[F5]] (não mergeado). Toca a tela do [[FE-INCR-BANK-SETTLEMENT]] (✅ #436).
- **Fato consumado que o BRIEF respeita:**
  - `BankSettlementPanel.tsx` já mostra `chargeCents` (badge âmbar, `:204-205`), `chargeEntryId` encurtado (`:217`),
    o resumo do modal de confirmação (`:311-312`) e a dica de `charge_account_not_configured` (`:330-331`), cujo texto
    diz que a conta de encargo **ainda não tem tela**.
  - `FixedAssetAccountsSection.tsx` é o precedente de seção de contas em `accounting/settings` (selects de conta folha
    e `updateSettings` só com os campos dela, teste de wire em `FixedAssetsPanel.test.tsx:133`).
  - Tipos de payload vêm do contrato gerado (`types/contracts/**.gen.ts`, memória `fe-contract-types-import-type`).

## 1. Insumos ausentes (bloqueiam a `sessao-feature`, não este BRIEF)

| # | Ausente | Efeito |
|---|---|---|
| IA-1 | **PR-3 do F5 não está em `main`.** `feeCents`, `feeEntryId` e `providerFeeExpenseAccountId` não existem no `schema.prisma` nem nos `.gen.ts` (conferido por grep, 2026-10-09) | os contratos do §3 são esboço sobre o texto do BRIEF do BE, não sobre o DTO. A execução espera o merge do PR-3, que por sua vez espera a correção do `manualMatch` (F10) e a sonda de colunas no M2 (F-PPB-1 c) |
| IA-2 | Nome e forma do campo de bruto na resposta. P3-7 diz que o F7 "re-deriva `gross = |linha| + feeCents`", sem dizer se o DTO expõe `grossCents` | §3 assume derivação no FE; se o PR-3 expuser o campo, o FE lê o campo (sem fork) |
| IA-3 | Se os códigos `fee_account_not_configured` e `provider_balance_requires_payment_account` chegam no `code` do erro (molde do `charge_account_not_configured`, lido por `startsWith` em `:330`) | comportamentos 5 e 6 seguem o molde; confirma lendo o controller do PR-3 |

## 2. Checklist de comportamentos

Cada item é testável sozinho (vitest + RTL, shim de `React` global).

1. **[direto]** Tipos: o item de baixa ganha `feeCents: number` e `feeEntryId: string | null`, importados do `.gen.ts`
   regenerado depois do PR-3 (IA-1). Nada escrito à mão.
2. **[direto, P3-7]** Linha com `feeCents > 0` mostra a tarifa e o bruto (`|linha| + feeCents`) — lugar na tabela é o
   **F-FE-FEE-2**. Teste: linha líquida 9700, `feeCents = 300`, título aberto 10000 ⇒ mostra bruto R$ 100,00, tarifa
   R$ 3,00, proposto R$ 100,00, sem badge de encargo. Linha com `feeCents = 0` renderiza igual a hoje (teste de
   regressão sobre o fixture existente).
3. **[direto, P3-8]** Resumo do modal de confirmação acrescenta `· Tarifa R$ x` quando `feeCents > 0`, no mesmo molde
   do encargo (`:312`).
4. **[direto, P3-8]** Item `CONFIRMED` com `feeEntryId` mostra `tarifa <id curto>` ao lado do `encargo <id curto>`
   (`:217`), sem link (a lacuna L-BS1 do #436 vale igual).
5. **[direto, P3-8]** Erro `fee_account_not_configured` no confirm/retry mostra a dica própria, no molde de
   `chargeAccountHint`. O texto depende do **F-FE-FEE-1** (aponta para a seção nova ou para a API).
6. **[direto, P3-9]** Erro `provider_balance_requires_payment_account` mostra mensagem traduzida (o extrato não é de
   uma conta de provedor ativa). Sem ação na tela.
7. **[fork F-FE-FEE-1]** Campo `providerFeeExpenseAccountId` editável na tela.
8. **[direto]** Paridade i18n pt/en em `accounting.json` para toda chave nova (`bankSettlement.col.fee`,
   `bankSettlement.gross`, `bankSettlement.feeEntry`, `bankSettlement.feeAccountHint`,
   `bankSettlement.error.providerBalance` + as do item 7). O namespace já está no `ns`.
9. **[direto]** Gates: `cd my-app && npx tsc --noEmit`, `npm run test:types` (diff em `__tests__`), vitest do
   `BankSettlementPanel` e o build de produção (`withAuth`). `neutral-*`, sem `zinc-*`.

## 3. Contratos (esboço; IA-1)

```ts
// leitura — item de GET /api/accounting/bank-settlements (campos novos do PR-3, P3-7/P3-8)
type BankSettlementItemFee = {
  feeCents: number;            // int ≥ 0; 0 = sem tarifa (linhas de banco, itens antigos)
  feeEntryId: string | null;   // preenchido pela etapa FEE do confirm
};
// derivado no FE enquanto o DTO não expuser o bruto (IA-2)
const grossCents = (it) => Math.abs(it.line.amountCents) + it.feeCents;

// escrita — PUT /api/accounting/settings (P3-11), só com os campos da seção (molde FixedAssetAccountsSection)
type ProviderFeeSettingsWire = { unitId: string; providerFeeExpenseAccountId: string | null };

// erros lidos por code (IA-3)
type FeeErrorCode = 'fee_account_not_configured' | 'provider_balance_requires_payment_account';
```

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação |
|---|---|---|
| **F-FE-FEE-1** — onde se configura a conta da tarifa | **(a)** seção nova "Contas da baixa" na sub-aba de baixas, molde `FixedAssetAccountsSection`, com **só** `providerFeeExpenseAccountId` · **(b)** a mesma seção com as três contas da baixa (`bankChargeExpenseAccountId`, `bankChargeIncomeAccountId`, `providerFeeExpenseAccountId`) — fecha também a dica "ainda sem tela" do encargo · **(c)** sem tela: só a dica apontando a API, como o encargo hoje | **(b).** A dica de `:331` já registra a falta da tela do encargo; as três contas são da mesma etapa de confirmação e falham com o mesmo molde de 400. Fazer só a da tarifa deixa duas contas vizinhas sem tela por motivo nenhum. Custo extra: dois selects. **Atenção:** (b) passa do item "tarifa"; se o dono quiser escopo estrito, (a) |
| **F-FE-FEE-2** — onde a tarifa aparece na tabela | **(a)** coluna nova "Tarifa" entre Encargo e Status, mostrada só quando algum item da página tem `feeCents > 0` · **(b)** sem coluna: na célula Valor, `líquido (bruto − tarifa)` em texto secundário · **(c)** coluna sempre visível | **(a).** Extrato de banco nunca tem tarifa (P3-6 só roda em extrato de `PaymentAccount`), então coluna fixa seria vazia na maior parte das telas; (b) mistura três números numa célula e quebra o alinhamento à direita |
| **F-FE-FEE-3** — quando executar | **(a)** `sessao-feature` só depois do PR-3 em `main` e do `.gen.ts` regenerado · **(b)** executar já com tipo local provisório e trocar depois | **(a).** (b) cria tipo à mão, que a memória `fe-contract-types-import-type` rejeita, e o PR-3 ainda pode mudar a forma (IA-2, F10, sonda) |

## 5. Pendente de validação externa

- **Código da conta da tarifa** (pergunta P3 ao contador): a tela só deixa escolher uma conta folha; qual conta é o
  contador quem diz. Até a resposta, a dica do item 5 diz que o código é pendência do contador, como a do encargo.
- **`TAXES_AMOUNT` é retenção recuperável?** (P3): se for, o BE separa a parcela em outra conta e o item 2 ganha uma
  segunda linha de dedução. O BRIEF não planeja isso.

## 6. Achados fora de escopo

- **Tela do provedor** (`FE-INCR-PAYMENT-PROVIDER`: cadastro da conta MP, botão "cobrar", upload do CSV
  `mp_release`): já registrada no BRIEF do F5 §8; exige autorização própria.
- **L-BS1** (ids de lançamento sem link no `JournalEntriesPanel`): vale para `feeEntryId` também; não muda aqui.
- **Pendência 2 do template** desta sessão: este BRIEF não foi linkado na nota `docs/plano/nos/F7.md` (regra 1); fica
  para o fold.
