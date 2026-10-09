# BRIEF — FE-INCR-F7-TARIFA (bruto, tarifa retida e líquido na baixa do F7)

> **Estado: BRIEF pronto. F-TAR-1..8 → (a) e F-TAR-9 → (b) RATIFICADOS** (dono, chat, 2026-10-10: *"ratifico
> F-TAR-1..8 → a, F-TAR-9 → b"*, registrado em `docs/plano/decisoes/D-2026-10-10-FE-F7-TARIFA-FORKS.md`).
> **Sub-fork F-TAR-9.1 (onde fica o seletor) PENDENTE.** A versão original deste BRIEF foi produzida por `sessao-planejamento` em
> 2026-10-10 contra `origin/main` **`b8a700cf`** (#614) e contra o head do PR #615 **`62533dc6`**
> (`claude/f5-pr3-relatorio`, aberto, sem merge). Não contém código de aplicação.
> **Implementação exige "executa" próprio do dono** (ORCH-006), forks ratificados e o merge do #615.

## Cabeçalho

- **Item a planejar:** a tela do F7 (sub-aba "Baixas por retorno" da Conciliação) passa a mostrar **valor bruto,
  tarifa retida e valor líquido** nas propostas que o F5 PR-3 (#615) gera a partir do relatório de liberações do
  Mercado Pago, e o aviso de cobrança em estado terminal (G7). Exemplo do dono: título de 10000, linha do extrato
  de 9700, tarifa de 300. Hoje a tela mostra "9700 → Proposto 10000" sem explicação.
- **Autorização (ORCH-006):** dono, chat, 2026-10-10: *"Autorizo planejar o BRIEF do FE da tarifa no F7 —
  sessao-planejamento, sem 'executa'."* Cobre **planejar** (BRIEF + nota do nó + PR de docs). Não cobre
  implementar, nem ratificar fork, nem tocar o #615. A origem da frente está no próprio #615: o
  `D-2026-10-10-F5-PR3-FORKS` registra *"a tela do F7 mostrar a tarifa (`feeCents`) vai num BRIEF de FE separado,
  que o dono abre"*.
- **Decisões que valem e não se rediscutem:**
  - **G7** (`docs/plano/decisoes/D-2026-10-10-F5-PR3-FORKS.md`, só na branch do #615): cobrança
    `EXPIRED`/`CANCELLED`/`FAILED` casa e vira proposta com o aviso "Cobrança em estado terminal no Luminaris". A
    confirmação é sempre humana. A implementação usa `TERMINAL_CHARGE_STATUSES`, que **também inclui `REFUNDED`**
    (`CollectionCharge.model.ts:34` no #615). A própria nota de decisão registra isso.
  - **F10** (#608, em `main`): `manualMatch` soma com sinal.

## 0. O que o backend expõe (verificado no #615, `62533dc6`). Nenhum campo inventado.

| Precisa na tela | Onde está no BE | Exposto na API? |
|---|---|---|
| `feeCents` do item | coluna `BankSettlementItem.feeCents BigInt @default(0)` (`schema.prisma`, migração `20261011120000_…`) | **NÃO.** `BankSettlementItemView` (`BankSettlementService.ts:74-89` no #615) e `toView` (`:300-325`) **não foram tocados** pelo #615. Os campos continuam sendo os de `main` (`BankSettlementService.ts:60-75`, `:223-250`). |
| `feeEntryId` (lançamento `provider.fee`) | coluna `BankSettlementItem.feeEntryId` | **NÃO** (mesmo motivo) |
| `grossCents` (bruto) | **não existe como campo**. `mpReleaseFeeCents()` devolve `{ grossCents, feeCents }` só dentro do scan (`lib/mpReleaseReport.ts`). O item persiste `proposedCents = min(gross, open)` e `chargeCents = max(0, gross − open)` (`BankSettlementService.ts:276-281` no #615) | Derivável: `gross = proposedCents + chargeCents`, e também `gross = |line.amountCents| + feeCents` (`:551`, pré-cheque P3-7) |
| Aviso G7 | texto no `reason` do item PENDING: `` `${TERMINAL_CHARGE_WARNING} (${charge.status}).` `` (`:281`), por exemplo `"Cobrança em estado terminal no Luminaris (EXPIRED)."` | **SIM**, `reason` já está na view. Não há campo estruturado (sem `chargeStatus`, sem flag). |
| Extrato é de conta de provedor? | `BankStatement.paymentAccountId String?` (G1) | **SIM, inferido.** `findStatements` faz `prisma.bankStatement.findMany` **sem `select`** (`ReconciliationRepository.ts:87` no #615), o service repassa (`ReconciliationService.ts:754-758`) e o controller faz `res.json` (`reconciliationController.ts:92-110`). A coluna nova sai na linha. O tipo FE `BankStatement` (`accounting.service.ts:318-334`) não a declara. |
| Método `ProviderBalance` | `BankSettlementDto.gen.ts` no #615: `method: "Cash"\|"Pix"\|"TED"\|"Boleto"\|"ProviderBalance"` em Confirm e Retry | **SIM**, gerado. O FE lista os métodos à mão (`bankSettlement.service.ts:27`, só os 4). |
| Erros novos do `/confirm` | `fee_account_not_configured: …` (`:597`), `provider_balance_requires_payment_account: …` (`:576`), ambos `ValidationError` 400 com o código como prefixo da mensagem | **SIM**, no molde do `charge_account_not_configured`, que a tela já trata por `startsWith` (`BankSettlementPanel.tsx:330`) |
| `failedStep = 'FEE'` | `BANK_SETTLEMENT_STEPS = ['SETTLE','CHARGE','FEE','MATCH']` (`BankSettlement.model.ts` no #615) | **SIM** (string). O tipo FE fecha em `'SETTLE'\|'CHARGE'\|'MATCH'` (`bankSettlement.service.ts:43`). |

**Consequência:** sem `feeCents` na view, a tela **não tem como** mostrar a tarifa. O caminho que falta no BE é o
**F-TAR-1**. Todo comportamento que lê `feeCents`/`feeEntryId` depende dele. `grossCents` não precisa virar campo
(ver F-TAR-2).

## 0.1 A tela atual (verificado em `main`, `b8a700cf`)

- **Painel:** `my-app/features/accounting/components/BankSettlementPanel.tsx`, 3ª sub-aba da Conciliação
  (`ReconciliationPanel.tsx` é o host). Lista em `<table>` própria (`:172-234`, forma sancionada no BRIEF do
  FE-INCR-BANK-SETTLEMENT §0 item 3, não `GenericTable`), com a célula de valor em `:191-194` mostrando
  `line.amountCents` mais "recebimento/pagamento", Proposto em `:202` e Encargo em `:203-207`. O status e o `reason` ficam em
  `:208-220`: **o `reason` só aparece para `FAILED` (`:212`) e `REJECTED` (`:213`)**, então o aviso G7, que chega num
  item `PENDING`, **hoje é invisível**.
- **Modal de confirmação:** `ActionModal` (`:256-338`) sobre o canônico `components/ui/Modal` (`:297-308`). O
  resumo é uma linha só (`:310-313`): `data · descrição · 9700 → contraparte · Proposto 10000 [· Encargo]`. Esse é o
  "10000 contra 9700 sem explicação" do dono. O select de método vem de `BANK_SETTLEMENT_METHODS` (`:320-325`),
  com default `'Pix'` (`:270`). A dica do 400 de encargo está em `:330-332`.
- **Canônicos já em uso:** `Modal` (`:2`), `StandardPagination` (`:3`, `:236-238`), `formatCents` (`:16`),
  `formatDate` (`:17`, date-only sem UTC-shift), `resolveErrorWithCode` (`:14`), `useAccountingT` (`:15`,
  namespace `accounting`), `Field`/`inputClass` (`:18`, de `SpedGenerationPanel`).
- **Serviço:** `my-app/lib/services/bankSettlement.service.ts`. Os bodies vêm do contrato **gerado**
  (`BankSettlementDto.gen`, `:3-9`). As **respostas são tipadas à mão (D11)**, transcritas do `BankSettlementService.ts`
  (`:11-15`, `:29-45`). Não existe `.gen.ts` para views: o `dtoShapeSnapshot` cobre os schemas Zod de entrada.
- **i18n:** `public/locales/{pt,en}/accounting.json`, bloco `bankSettlement` (pt `:1845`). O namespace
  `accounting` já entra no `ns` da página (`pages/accounting/index.tsx:54`). Chave nova, nenhum `ns` novo.
- **Teste existente:** `features/accounting/components/__tests__/BankSettlementPanel.test.tsx` (97 l.), com shim de
  `React` global (`:4`), fábricas `item()`/`statement` (`:26-32`) e mocks de `bankSettlementService` e
  `accountingService.listBankStatements` (`:19-24`).

## 1. Checklist numerado de comportamentos

Cada item é testável sozinho. **[F-TAR-n]** = a forma depende do fork. **[dep #615]** = só existe depois do merge do
#615. **[dep F-TAR-1]** = precisa de `feeCents`/`feeEntryId` na view.

1. **Tipo da resposta (à mão, D11) [dep F-TAR-1]:** `BankSettlementItemView` em `bankSettlement.service.ts`
   ganha `feeCents: number` e `feeEntryId: string | null`, transcritos do `BankSettlementItemView` do BE **depois**
   do F-TAR-1. `failedStep` passa a `'SETTLE' | 'CHARGE' | 'FEE' | 'MATCH' | null`. Nada é importado do backend.
2. **Tipo do extrato [dep #615]:** `BankStatement` em `accounting.service.ts` ganha `paymentAccountId: string | null`
   (resposta à mão, D11). A fábrica `statement` do teste ganha `paymentAccountId: null` (legado) e uma variante com id.
3. **Métodos [dep #615] [F-TAR-3]:** `BANK_SETTLEMENT_METHODS` passa a incluir `'ProviderBalance'`, e o tipo continua
   `ConfirmBankSettlementInput['method']`, que vem do `.gen.ts`. O conjunto oferecido no modal (confirmar e
   reprocessar) e o default vêm do extrato selecionado conforme o F-TAR-3.
4. **Decomposição pura [F-TAR-2]:** função exportada e testável, por exemplo `feeBreakdown(item)` em
   `features/accounting/lib/` ou no próprio painel, ao lado de `actionsFor`. Ela devolve `null` quando
   `feeCents === 0`, que é o item bancário de sempre e não muda nada na tela. Quando `feeCents > 0`, devolve
   `{ grossCents, feeCents, netCents, consistent }` com `netCents = |line.amountCents|`, `grossCents` pela fonte do
   F-TAR-2 e `consistent = grossCents − feeCents === netCents`. Só lê centavos inteiros e não arredonda nada.
5. **Proposta na lista [F-TAR-4]:** quando `feeBreakdown(item)` não é nulo, a linha da tabela mostra o bruto, o
   retido e o líquido. Itens sem tarifa ficam com a renderização **idêntica** à de hoje (é o teste de não-regressão).
6. **Modal de confirmação e de reprocessamento [F-TAR-6]:** quando há tarifa, um bloco de três linhas
   alinhadas à direita (`font-mono`, `formatCents`) aparece **acima** do método:
   `Bruto 100,00` · `− Retido pelo provedor 3,00` · `= Líquido (linha do extrato) 97,00`. Proposto e Encargo continuam
   na linha-resumo de hoje. O modal de **rejeitar** mostra o mesmo bloco, só leitura. Sem tarifa, o modal fica
   igual ao de hoje.
7. **Conferência visual [F-TAR-5]:** o bloco do item 6 mostra `✓ confere` (emerald) quando `consistent`, ou
   `✗ não confere: bruto − retido ≠ linha` (red) quando não confere. O efeito sobre o botão segue o F-TAR-5.
8. **Aviso G7 [F-TAR-7] [F-TAR-8]:** um item `PENDING` com `reason` não nulo mostra o aviso **na lista**
   (abaixo do status, tom amber, não red) e **no modal** (callout acima do bloco do item 6). O texto
   vem do BE conforme o F-TAR-7. A confirmação continua humana e um a um (G7 + resposta 20). A tela não faz nada
   automático. O que o aviso exige antes de confirmar segue o F-TAR-8.
9. **Item confirmado [dep F-TAR-1]:** em `CONFIRMED`, quando `feeEntryId` existe, aparece
   `· tarifa <id curto>` com `title=id`, no molde de `chargeEntryId` (`:217`). Continua sem link, pela lacuna L-BS1 já
   registrada.
10. **Erros nomeados do `/confirm` e do `/retry`:** `fee_account_not_configured…` ganha dica própria, no molde de
    `:330-332`: *"Configure a conta de tarifa do provedor (providerFeeExpenseAccountId) em PUT
    /api/accounting/settings. Ainda sem tela, e o código é pendência do contador."* (ver F-TAR-9).
    `provider_balance_requires_payment_account…` ganha a dica *"ProviderBalance só vale em extrato de conta de
    provedor ativa."* A mensagem do BE continua aparecendo inteira, como hoje.
11. **`FAILED` em `FEE`:** o item com `failedStep = 'FEE'` aparece como os outros (`:212`, `failedStep — reason`), e
    o `retry` continua disponível (`actionsFor`, sem mudança).
12. **Estados vazio, erro e loading:**
    - *Vazio:* nenhum estado novo. Item sem tarifa = sem bloco (item 4 nulo), e lista vazia segue `:169-170`.
    - *Erro:* sem fetch novo, porque a tarifa vem no mesmo `GET /bank-settlements`. Os erros novos são só os do item 10.
    - *Loading:* sem request novo, logo sem estado de loading novo. O `busy` do modal (`:272`, `:304`) já cobre o
      botão durante confirm/retry. Hoje o painel não tem indicador de loading da lista, o que fica registrado como achado fora de
      escopo e não entra aqui.
    - *Dado inconsistente:* é o `✗` do item 7. *Linha positiva/negativa:* sempre `|line.amountCents|`, porque a tarifa
      só existe em `RECEIVABLE` (ProviderBalance só recebe, `:576`).
13. **i18n:** as chaves novas ficam em `bankSettlement.fee.*` (`gross`, `fee`, `net`, `consistent`,
    `inconsistent`, `hint`), `bankSettlement.terminalCharge.*` (rótulo do aviso), `bankSettlement.feeEntry`,
    `bankSettlement.feeAccountHint`, `bankSettlement.providerBalanceHint` e `bankSettlement.method.ProviderBalance`
    (rótulo do método). A paridade entre pt e en é exigida. Todo `t()` leva fallback pt inline (padrão do arquivo).
    Namespace `accounting`, já no `ns`, sem namespace novo.
14. **Contrato de tipo:** os bodies (`confirm`/`retry`) continuam tipados por `BankSettlementDto.gen.ts`, que o
    #615 já regenerou com `ProviderBalance`. As respostas ficam à mão (D11), como no resto do serviço. **Proibido** importar de
    `server/`. **Proibido** editar `.gen.ts`.
15. **Gates:** `cd my-app && npx tsc --noEmit` limpo. O diff toca `__tests__`, então também `npm run test:types`
    (o `tsc` do my-app exclui testes). `npx vitest run` nos testes tocados fica verde. Nenhum `zinc-*`.

16. **Seletor da conta de tarifa (F-TAR-9 → b) [dep #615] [F-TAR-9.1]:** o operador configura
    `providerFeeExpenseAccountId` pela tela, no **molde do `FixedAssetAccountsSection.tsx`** (reuso de forma:
    `getSettings` no load, `loaded` antes de permitir salvar para não gravar `null` sobre configuração existente, select
    de conta folha `Expense`, `useGovernedSave` com `target: 'SCOPE_SETTINGS'`, de modo que com contador ativo o patch
    vira proposta via `toScopeSettingsProposal`, e as barras `ActiveAccountantNotice`/`PendingProposalBanner`).
    - **Contrato:** o patch é `Pick<UpdateAccountingScopeSettingsInput, 'unitId' | 'providerFeeExpenseAccountId'>`, do
      `.gen.ts` que o #615 regenera (`AccountingScopeSettingsDto.gen.ts` e `AccountingPolicyVersionDto.gen.ts` já trazem o
      campo). PUT parcial: **só** essa chave, nunca as do imobilizado nem as de encargo. Vazio vira `null`.
    - **Serviço:** hoje `accountingService.updateSettings` aceita só `FixedAssetAccountsPatch` e notifica *"Contas do
      imobilizado salvas."* (`accounting.service.ts:191-194`, `:729-733`). O executor alarga o tipo do parâmetro para a união
      dos patches, ou cria um método irmão com notificação própria, sem mudar o comportamento do imobilizado. Isso
      precisa de teste de não-regressão do `FixedAssetAccountsSection`.
    - **Tipo de resposta:** `AccountingScopeSettings` (à mão, D11) ganha `providerFeeExpenseAccountId: string | null`.
    - **Posição na tela:** conforme o F-TAR-9.1. A dica do item 10 aponta para o seletor em vez do path do PUT.
    - **Testes:** o load preenche o vigente; o salvar manda só `{ unitId, providerFeeExpenseAccountId }`; vazio manda
      `null`; com o GET falho não salva; com contador ativo vira proposta e não diz "salvo"; e a seção do imobilizado
      continua mandando só as 3 chaves dela.

## 2. Contratos esboçados

```ts
// my-app/lib/services/bankSettlement.service.ts — resposta à mão (D11), transcrita do BE pós-F-TAR-1
export interface BankSettlementItemView {
  // …campos de hoje (:29-45)…
  failedStep: 'SETTLE' | 'CHARGE' | 'FEE' | 'MATCH' | null;   // #615: BANK_SETTLEMENT_STEPS
  feeCents: number;          // [F-TAR-1] tarifa do provedor (GROSS − NET); 0 = item bancário
  feeEntryId: string | null; // [F-TAR-1] journal_entries.id do provider.fee
}
export const BANK_SETTLEMENT_METHODS: readonly BankSettlementMethod[] =
  ['Cash', 'Pix', 'TED', 'Boleto', 'ProviderBalance'];       // BankSettlementMethod = ConfirmBankSettlementInput['method'] (.gen)

// my-app/lib/services/accounting.service.ts — resposta à mão (D11)
export interface BankStatement { /* …de hoje… */ paymentAccountId: string | null } // #615 G1

// decomposição pura (item 4) — [F-TAR-2] fixa a fonte do bruto
export interface FeeBreakdown { grossCents: number; feeCents: number; netCents: number; consistent: boolean }
export function feeBreakdown(it: Pick<BankSettlementItemView, 'feeCents' | 'proposedCents' | 'chargeCents' | 'line'>): FeeBreakdown | null;
//   feeCents === 0 → null
//   netCents  = Math.abs(it.line.amountCents)
//   grossCents = it.proposedCents + it.chargeCents        // F-TAR-2 (a)
//   consistent = grossCents - it.feeCents === netCents

// métodos oferecidos (item 3) — [F-TAR-3] (a)
export function methodsFor(statement: Pick<BankStatement, 'paymentAccountId'> | undefined): readonly BankSettlementMethod[];
//   paymentAccountId != null → ['ProviderBalance']   (default = ProviderBalance)
//   senão                    → ['Cash','Pix','TED','Boleto'] (default = 'Pix', como hoje)
```

**Mudança de BE que o F-TAR-1 pede, em qualquer opção** (esboço e não código desta sessão, transcrito do formato de `toView`):

```ts
// server/src/features/accounting/services/BankSettlementService.ts
export interface BankSettlementItemView { /* … */ feeCents: number; feeEntryId: string | null }
// toView: feeCents: centsFromDb(item.feeCents), feeEntryId: item.feeEntryId
// teste: o integration do #615 (releaseReport.integration.test.ts) passa a asserir feeCents/feeEntryId na resposta do GET/confirm
// docs.paths.ts: a descrição do BankSettlementItemView ganha os dois campos (path-count do openapi inalterado)
```

## 3. Testes vitest previstos

Em `BankSettlementPanel.test.tsx` (mesmos mocks; a fábrica `item()` ganha `feeCents: 0, feeEntryId: null`):

1. `feeBreakdown`: tarifa 0 dá `null`. O caso do dono (proposto 10000, encargo 0, linha 9700, tarifa 300) dá
   `{ gross 10000, fee 300, net 9700, consistent: true }`. Com encargo (proposto 8000, encargo 2000, linha 9700,
   tarifa 300) dá bruto 10000 e `consistent: true`. Dado inconsistente (linha 9600) dá `consistent: false`.
2. Lista: o item com tarifa mostra bruto, retido e líquido. O item sem tarifa renderiza como hoje (não-regressão).
3. Modal de confirmar com tarifa: o bloco tem os três valores formatados e `✓`. O modal sem tarifa não tem o bloco.
4. Conferência inconsistente: mostra `✗`, e o botão fica habilitado ou desabilitado conforme o F-TAR-5.
5. Aviso G7: o `PENDING` com `reason` mostra o aviso na lista e no modal. O `PENDING` sem `reason` não mostra. A regra do F-TAR-8
   vale antes de confirmar.
6. Métodos: o extrato com `paymentAccountId` oferece e pré-seleciona `ProviderBalance`, e o `confirm` manda
   `{ unitId, method: 'ProviderBalance' }`. O extrato bancário oferece os 4 de hoje, com default `Pix`.
7. Os 400 `fee_account_not_configured…` e `provider_balance_requires_payment_account…` mostram mensagem inteira e dica.
8. `CONFIRMED` com `feeEntryId` mostra `tarifa <id curto>`.
9. `FAILED` com `failedStep: 'FEE'` mostra `FEE — reason` e oferece `retry`.
10. Paridade i18n: as chaves novas existem em pt e en. Se já houver teste de paridade do `accounting.json`, ele cobre.
    Se não houver, o teste vai junto.

## 4. Verificação contra o build de produção (a tela está atrás de `withAuth`)

Não vale `next dev`. Pré-condições: #615 mergeado, F-TAR-1 em `main`, server rodando no commit exato e
`providerFeeExpenseAccountId` configurado via `PUT /api/accounting/settings`.

1. `cd my-app && npm run build && npm start` (build de produção), com o server no mesmo commit.
2. Dado: um extrato `mp_release` subido pelo upload manual (`POST /api/accounting/reconciliation/statements` com
   `format=mp_release`) numa folha com PaymentAccount MP `ACTIVE`, mais uma `CollectionCharge` casável (`SOURCE_ID`).
   Uma segunda cobrança em `EXPIRED` cobre o G7. Depois, "Varrer extrato" na sub-aba.
3. Conferir na tela: a linha 9700 mostra bruto 100,00, retido 3,00 e líquido 97,00. O modal mostra o bloco com `✓`. O
   aviso G7 aparece no item da cobrança expirada. Confirmar com `ProviderBalance` leva a `CONFIRMED` com `tarifa <id>`.
4. Evidência por `read_page`/estilo computado, não por impressão (skill `verificacao-visual`).
   **O sign-off de browser continua gate humano (H2)**: o agente prepara, e o desfecho e a assinatura são do dono.

## 5. Forks

**Ratificação (dono, chat, 2026-10-10):** *"ratifico F-TAR-1..8 → a, F-TAR-9 → b"*. A coluna "Recomendação" abaixo
é a original. Onde o ratificado diverge dela (só o F-TAR-9), vale o ratificado. Patch no #615 (F-TAR-1) e implementação
deste nó continuam sem "executa".

| # | Decisão | Caminhos | Recomendação |
|---|---|---|---|
| **F-TAR-1** ✅ (a) | Onde entra `feeCents` + `feeEntryId` na view do item (o BE de hoje não expõe) | (a) **patch no próprio #615 antes do merge**: o PR já espera a sonda de colunas (F-PPB-1 c), e o retorno dele já lista "FE do F7 sem exibir feeCents" como aberto; (b) micro-PR de BE separado (`BE-INCR-F7-FEE-VIEW`) depois do merge do #615; (c) dentro do PR deste FE (BE+FE juntos) | **(a).** É lacuna de contrato do próprio #615: o PR persiste um campo que nenhuma leitura devolve. Fechar antes do merge evita uma janela em produção com itens tarifados que a API não mostra. (b) é o segundo melhor, porque mantém BE/FE separados como a casa prefere. (c) mistura camadas num nó `fe`. |
| **F-TAR-2** ✅ (a) | Fonte do **bruto** na tela | (a) FE deriva `gross = proposedCents + chargeCents` e confere contra `|linha| + feeCents`; (b) BE expõe `grossCents` na view e o FE confere `grossCents − feeCents = |linha|`; (c) FE deriva `gross = |linha| + feeCents` | **(a).** Não precisa de campo novo e a conferência compara duas derivações **independentes** (proposta×encargo contra linha×tarifa). Em (c) a conferência vira tautologia, porque bruto − tarifa = linha por construção. (b) é equivalente a (a), mas custa campo. |
| **F-TAR-3** ✅ (a) | Método no modal quando o extrato é de conta de provedor | (a) o conjunto vem do extrato: provedor oferece **só** `ProviderBalance` (pré-selecionado), bancário oferece os 4 de hoje; (b) os 5 sempre, com `ProviderBalance` pré-selecionado no extrato de provedor; (c) os 5 sempre, default `Pix` | **(a).** Fora dessa combinação o BE responde 400 (`provider_balance_requires_payment_account` / `method_account_mismatch`, `:567-590`). Oferecer opção que sempre falha é ruído. Extrato de provedor só gera item `RECEIVABLE` (o scan passa só `receivables` ao passo novo, `:167-168`), então não existe o caso "a pagar em extrato de provedor". |
| **F-TAR-4** ✅ (a) | Como a **lista** mostra a tarifa | (a) a célula "Valor" mostra o líquido como hoje, com uma sublinha `bruto X · retido Y` só quando `feeCents > 0`; (b) coluna nova "Retido" sempre visível; (c) só no modal, e a lista ganha um selo "tarifa" | **(a).** A tabela já tem 8 colunas (`:176-183`). A sublinha mostra a explicação onde o "9700 vs 10000" aparece, e item sem tarifa não muda nada. |
| **F-TAR-5** ✅ (a) | Conferência que **não bate** | (a) aviso `✗` em vermelho, confirmar segue habilitado (o pré-cheque do BE é a autoridade e re-deriva sobre o bruto, `:551-558`); (b) aviso `✗` e confirmar desabilitado | **(a).** Um gate só, e ele é o do BE (classe *gate autoritativo dentro da tx*). Um bloqueio no FE duplica a regra e pode divergir dela. |
| **F-TAR-6** ✅ (a) | Rótulo de `feeCents` | (a) "Retido pelo provedor"; (b) "Tarifa"; (c) "Tarifas e impostos retidos" | **(a).** Hoje `feeCents` soma tarifas **e** `TAXES_AMOUNT` até a resposta P3 do contador (teste do #615, `mpReleaseReport.test.ts`: *"TAXES_AMOUNT entra no feeCents até a resposta P3 do contador"*). (b) fica errado se houver imposto. (c) fica errado se o contador separar. (a) continua certo nos dois casos, e o tooltip explica. |
| **F-TAR-7** ✅ (a) | Texto do aviso G7 | (a) mostrar o `reason` do BE **verbatim** (pt-BR, com o status entre parênteses) sob um rótulo i18n ("Aviso"), no molde de `FAILED`/`REJECTED` hoje; (b) BE expõe campo estruturado (por exemplo `terminalChargeStatus: string \| null`) e o FE monta o texto com i18n (en traduzido); (c) FE reconhece o prefixo `TERMINAL_CHARGE_WARNING` no `reason` | **(a)**, sem BE novo. Em `PENDING`, `reason` só é escrito pelo G7: o scan grava `result.reason` na criação (`:194`, `:210`), e o release do confirm para `PENDING` não grava `reason` (`:384-389`). Custo: em `en` o aviso sai em pt, como `FAILED`/`REJECTED` já saem hoje. (c) acopla o FE ao texto do BE. |
| **F-TAR-8** ✅ (a) | Fricção antes de confirmar item com aviso G7 | (a) só o aviso visível, sem passo extra (a confirmação já é humana e um a um); (b) checkbox "Li o aviso" obrigatório para habilitar Confirmar | **(a).** O G7 decidiu que a confirmação é humana, e ela já é. Cobrança terminal com dinheiro liberado no MP é dinheiro real na conta, e confirmar é o caminho normal. (b) acrescenta passo que o G7 não pediu. |
| **F-TAR-9** ✅ (b), contra a recomendação | Onde o operador configura `providerFeeExpenseAccountId` (sem ela, todo confirm com tarifa dá 400) | (a) fora deste nó: só a dica do item 10, no precedente da conta de encargo (`:331`, "ainda sem tela"); (b) incluir neste nó um seletor da conta de tarifa (`PUT /api/accounting/settings`, que o `accountingService.updateSettings` já chama, `:729`) | **(a)**, para não alargar o nó, e a tela de configuração das contas (encargo + tarifa) vira um nó próprio. Contra a recomendação: o dono quer completude, e sem configuração a tarifa nunca confirma. Se o dono escolher (b), o seletor entra como item 16 e o perfil sobe. |
| **F-TAR-9.1** PENDENTE | Onde o seletor do item 16 aparece | (a) dentro da dica do erro `fee_account_not_configured`, no modal de confirmar; (b) seção compacta "Conta de tarifa do provedor" no topo da sub-aba "Baixas por retorno", visível quando o extrato selecionado é de conta de provedor, e a dica do erro aponta para ela; (c) seção "Contas da conciliação" que também traz as contas de encargo (`bankCharge*`) | **(b).** Revisa a sugestão (a) que dei no chat antes de ler o `FixedAssetAccountsSection`. Com contador ativo, salvar configuração vira **proposta** de política (`useGovernedSave`, `target: 'SCOPE_SETTINGS'`) e não aplica na hora. Dentro do modal de confirmar, o operador salvaria, tentaria confirmar e levaria o mesmo 400. Uma seção própria mostra o estado vigente e a proposta pendente. (c) resolve também a conta de encargo, mas alarga o nó além do F-TAR-9. |

## 6. Pendências de validação externa

- **Composição de `feeCents`:** tarifas + `TAXES_AMOUNT` somados até a **resposta P3 do contador**. Afeta o rótulo
  (F-TAR-6), não a aritmética.
- **Código da conta de tarifa** (`providerFeeExpenseAccountId`): pendência do contador, como a conta de encargo.
- **Colunas reais do relatório MP:** a sonda em produção (F-PPB-1 c) pode mudar o parser do #615. A tela não lê
  CSV, então o impacto aqui é nulo, a menos que a sonda mude a semântica de `feeCents`.

## 7. Insumos ausentes / dependências

- **Merge do #615** (`claude/f5-pr3-relatorio`, `62533dc6`), que traz `ProviderBalance` no `.gen.ts`,
  `BankStatement.paymentAccountId`, `failedStep 'FEE'`, os erros novos e o próprio `feeCents` persistido. Itens
  2, 3, 10 e 11 dependem dele.
- **F-TAR-1 resolvido e mergeado**, que traz `feeCents`/`feeEntryId` na view. Itens 1, 4–7 e 9 dependem dele.
- `BankStatement.paymentAccountId` na resposta de `GET /reconciliation/statements` está **inferido** pela leitura
  (findMany sem `select`). Precisa ser confirmado contra o server rodando no item 2 da execução.

## 8. Achados fora de escopo (registrados, não planejados)

1. **`ImportBankStatementInput.gen.ts` no #615 declara `format: "mp_release"` como obrigatório.** O schema é
   `z.preprocess(…, z.literal('mp_release').optional())`, e o gerador não enxerga o `.optional()` dentro do
   `preprocess`. Hoje nenhum arquivo do FE consome esse tipo (`grep ImportBankStatementInput my-app` fora do `.gen` = 0),
   mas o primeiro upload FE com `format` vai esbarrar nele.
2. **Sem FE para o upload manual `format=mp_release`** (G6/G8): a sub-aba Extratos não manda `format`.
3. **O aviso G7 é foto do scan:** cobrança que vira terminal **depois** do scan não atualiza o item `PENDING` já
   criado (`skippedExisting`). Inferido pela leitura de `:160-215`, sem teste.
4. **O painel do F7 não tem indicador de loading da lista** (só `busy` no scan e no modal).
5. **Não existe tela de configuração das contas de encargo e de tarifa** (`PUT /api/accounting/settings` só tem UI
   para as contas do imobilizado). Ligado ao F-TAR-9.

## 9. Perfil previsto

`precisa-de-planejamento` (regra 1 do classificador: o sub-fork F-TAR-9.1 está PENDENTE). Com ele ratificado, o nó
fica só com FE (o F-TAR-1 → a põe o BE no #615), 16 itens, e o item 16 escreve configuração contábil governada, mas não
cria lançamento. A previsão então é `sonnet-alto` (regra 4, mais de 8 itens).
