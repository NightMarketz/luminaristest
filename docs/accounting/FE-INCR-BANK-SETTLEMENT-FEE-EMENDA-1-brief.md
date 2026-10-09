# FE-INCR-BANK-SETTLEMENT-FEE — EMENDA 1 (aviso G7, método ProviderBalance, conferência, rótulo)

> `sessao-planejamento`, 2026-10-10. **Emenda** ao BRIEF canônico
> [`FE-INCR-BANK-SETTLEMENT-FEE-brief.md`](FE-INCR-BANK-SETTLEMENT-FEE-brief.md) (#616, em `main`, forks F-FE-FEE-1..3
> ratificados 09/10). Sem código de aplicação. **Implementação exige "executa" próprio** (ORCH-006).
>
> **Como nasceu:** esta sessão planejou o mesmo item em paralelo (`FE-INCR-F7-TARIFA`, PR #617) sem ver o #616, que
> mergeou durante a sessão. Questionário ao dono, chat, 2026-10-10, opção *"#616 + emenda do #617"*. O #616 é o
> canônico, o #617 vira emenda dele só com o que falta, e **nos conflitos valem as decisões do #616**.
> As decisões F-TAR-1..9.1 (ratificadas 10/10) ficam registradas em
> [[D-2026-10-10-FE-F7-TARIFA-FORKS]], com o destino de cada uma (§4).

## 0. Fatos verificados contra `main` (#615 mergeado em `2f942f73`)

| Ponto | Fato | Efeito no #616 |
|---|---|---|
| `feeCents`/`feeEntryId` na resposta | `BankSettlementItemView` (`BankSettlementService.ts:74`) e `toView` (`:300`) **não** os expõem. A coluna existe e a API não a devolve | O item 1 do #616 não tem de onde ler. **Resolvido por PR de BE próprio** (dono, chat, 2026-10-10, *"PR de BE novo"*): #620 (`claude/be-f7-fee-view`). É o mesmo campo que o E31 da EMENDA 3.3 já planejava ("`BankSettlementItemView` expõe `feeCents` e `feeEntryId` (mesmos nomes do F5)") |
| Tipo da resposta | O `dtoShapeSnapshot` gera `.gen.ts` **só dos schemas Zod de entrada**. As respostas do F7 são tipadas à mão (D11, `bankSettlement.service.ts:11-15`, `:29-45`) | Conflito com o item 1 e o F-FE-FEE-3 do #616 ("importados do `.gen.ts` … nada escrito à mão"). A condição do F-FE-FEE-3 (a) nunca se cumpre para a view. Ver **F-FEE-E2** |
| Aviso G7 | O texto vai no `reason` do item `PENDING`: `` `${TERMINAL_CHARGE_WARNING} (${charge.status}).` `` (`:281`). Em `PENDING`, `reason` só é escrito por isso (o scan grava na criação; o release do confirm para `PENDING` não grava). A lista `TERMINAL_CHARGE_STATUSES` inclui `REFUNDED` | O #616 não cobre o G7. A tela hoje mostra `reason` só em `FAILED`/`REJECTED` (`BankSettlementPanel.tsx:212-213`), então o aviso é **invisível** |
| Método `ProviderBalance` | `BankSettlementDto.gen.ts` já o tem em confirm/retry. O FE lista 4 à mão (`bankSettlement.service.ts:27`). Extrato com `paymentAccountId` só gera item `RECEIVABLE` (`:168`) e só aceita `ProviderBalance` (`:570-590`) | O #616 cobre só a dica do 400, não a escolha do método |
| `BankStatement.paymentAccountId` | `findStatements` faz `findMany` sem `select`, e a coluna sai na lista de extratos. **Inferido** pela leitura; confirmar contra o server na execução | Dá ao FE o "extrato é de provedor?" sem BE novo |
| Conta da tarifa | `fee_account_not_configured` (`:597`) exige `AccountingScopeSettings.providerFeeExpenseAccountId` **hoje** | Ver **F-FEE-E1**: F-ENC-1 (a) e F-ENC-11 (a + override) da EMENDA 3.3 (#613, ratificados 09/10, **depois** do #616) mudam o alvo do F-FE-FEE-1 (b) |

## 1. Comportamentos que esta emenda acrescenta ao #616

Os itens 1–9 do #616 seguem como estão, exceto onde F-FEE-E1/E2 os tocam. Numeração continua a do #616.

10. **Aviso G7 (F-TAR-7 → a, F-TAR-8 → a):** item `PENDING` com `reason` não nulo mostra o aviso **na lista** (abaixo do
    status, tom amber) e **no modal** de confirmar/rejeitar (callout no topo). Texto = `reason` do BE verbatim, sob rótulo
    i18n (`bankSettlement.terminalCharge.label`). Sem passo extra para confirmar. Teste: `PENDING` com reason → aviso nos
    dois lugares. `PENDING` sem reason → nada. O botão Confirmar fica habilitado.
11. **Método por extrato (F-TAR-3 → a):** `BANK_SETTLEMENT_METHODS` ganha `'ProviderBalance'` (tipo continua
    `ConfirmBankSettlementInput['method']`, do `.gen.ts`). Extrato selecionado com `paymentAccountId` → o modal de
    confirmar/reprocessar oferece **só** `ProviderBalance`, já selecionado. Extrato bancário → os 4 de hoje, default `Pix`.
    `BankStatement` (FE) ganha `paymentAccountId: string | null`. Teste: confirmar no extrato de provedor manda
    `{ unitId, method: 'ProviderBalance' }`. No bancário, as opções são as de hoje.
12. **Conferência visual (F-TAR-5 → a):** com `feeCents > 0`, o modal mostra o bruto do #616 (`|linha| + feeCents`) e
    confere contra `proposedCents + chargeCents`. Bate → `✓ confere`. Não bate → `✗ não confere`, e Confirmar continua
    habilitado (o pré-cheque do BE re-deriva sobre o bruto, `:551`, e é a autoridade). Função pura exportada, por exemplo
    `feeCheck(item): { grossCents, consistent } | null` (`null` quando `feeCents === 0`). Teste: 9700 + 300 contra 10000 + 0
    → ✓. Contra 8000 + 2000 → ✓. Linha 9600 → ✗.
13. **Rótulo (F-TAR-6 → a):** a tarifa aparece como **"Retido pelo provedor"** (cabeçalho da coluna do F-FE-FEE-2 (a),
    resumo do modal do item 3, `tarifa <id>` do item 4 vira `retido <id>`), com tooltip: *"Tarifas e, até a resposta do
    contador (P3), impostos retidos pelo provedor."* Motivo: hoje `feeCents` soma `TAXES_AMOUNT`
    (`mpReleaseReport.test.ts`, *"TAXES_AMOUNT entra no feeCents até a resposta P3 do contador"*).
14. **`failedStep 'FEE'`:** o tipo FE passa a `'SETTLE' | 'CHARGE' | 'FEE' | 'MATCH' | null`. `FAILED` em `FEE` aparece como os
    outros e oferece `retry`.
15. **i18n:** chaves novas dos itens 10–13 em `bankSettlement.*`, com paridade pt/en. Namespace `accounting`, já no `ns`.

**Verificação (vale para o #616 inteiro):** build de produção (`npm run build && npm start`; a tela está atrás de
`withAuth`), extrato `mp_release` subido pelo upload manual (`format=mp_release`) numa folha com PaymentAccount `ACTIVE`,
uma cobrança casável e outra em `EXPIRED`. Evidência por `read_page`/estilo computado (`verificacao-visual`).
O sign-off de browser segue gate humano (H2).

## 2. Contratos (acréscimos)

```ts
// bankSettlement.service.ts — resposta (forma depende do F-FEE-E2)
failedStep: 'SETTLE' | 'CHARGE' | 'FEE' | 'MATCH' | null;
feeCents: number;           // PR de BE claude/be-f7-fee-view (= E31 da EMENDA 3.3)
feeEntryId: string | null;
export const BANK_SETTLEMENT_METHODS = ['Cash', 'Pix', 'TED', 'Boleto', 'ProviderBalance'] as const satisfies readonly BankSettlementMethod[];

// accounting.service.ts — BankStatement (resposta à mão, D11)
paymentAccountId: string | null;

// puros, exportados e testados
export function methodsFor(st?: Pick<BankStatement, 'paymentAccountId'>): readonly BankSettlementMethod[]; // provedor → ['ProviderBalance']
export function feeCheck(it: Pick<BankSettlementItemView, 'feeCents' | 'proposedCents' | 'chargeCents' | 'line'>):
  { grossCents: number; consistent: boolean } | null; // gross = |line| + fee (#616); consistent = gross === proposed + charge
```

## 3. Forks novos — RATIFICAÇÃO PENDENTE

| # | Decisão | Caminhos | Recomendação |
|---|---|---|---|
| **F-FEE-E1** | A seção "Contas da baixa" do F-FE-FEE-1 (b) depois da EMENDA 3.3. F-ENC-1 (a): *"Os 2 campos legados `bankCharge*` saem do contrato"*, e o PUT com eles dará 400 (E9). F-ENC-11 (a + override): a conta da tarifa é a `4.5` canônica, e `providerFeeExpenseAccountId` vira **override opcional** (nulo ⇒ 4.5). Hoje, antes do PR-2 da EMENDA 3.3, sem a conta o confirm com tarifa dá 400 | (a) A seção fica **só** com `providerFeeExpenseAccountId`, rotulada como override. Até o E29 entrar, ela é obrigatória para confirmar com tarifa. Depois, "vazio = 4.5"; (b) a seção como o #616 ratificou (3 contas) até o PR-2 da EMENDA 3.3, quando os 2 `bankCharge*` saem; (c) sem seção: espera o E29 (conta canônica, sem configuração) e só mantém a dica do 400 | **(a).** (b) constrói 2 selects que a decisão posterior do dono já mandou remover. (c) deixa a tarifa do MP sem caminho na tela até o PR-2 da EMENDA 3.3. (a) é o único campo que sobrevive às duas decisões, e é o mesmo alvo que o F-TAR-9/9.1 tinha (seção no topo da sub-aba, visível em extrato de provedor). Pendência registrada: o F-ENC-11 fala do override "na `PaymentAccount`", e no #615 o campo mora em `AccountingScopeSettings`. Quem resolve isso é o executor do E29, não esta tela |
| **F-FEE-E2** | Tipo da resposta (`feeCents`, `feeEntryId`, `failedStep`, `paymentAccountId`) | (a) À mão, transcrito do `BankSettlementService.ts`, como o resto do serviço (D11). O F-FE-FEE-3 (a) passa a ler "depois do #615 em `main` e do PR de BE da view"; (b) gerar tipos de resposta a partir do BE (infra nova, fora deste nó) | **(a).** (b) não existe hoje. A memória `fe-contract-types-import-type` cobre payload de **escrita**, e a resposta à mão é a regra registrada do serviço |

## 4. Destino das decisões F-TAR (10/10) sob "conflitos seguem o #616"

| F-TAR | Ratificado 10/10 | Destino |
|---|---|---|
| F-TAR-1 (a) patch no #615 | o #615 mergeou antes | **Substituído** pela resposta do dono de 10/10: PR de BE novo (#620 (`claude/be-f7-fee-view`)) |
| F-TAR-2 (a) bruto = proposto + encargo | conflito | **Vale o #616**: bruto = `|linha| + feeCents`. A soma proposto + encargo vira o lado conferido no item 12 |
| F-TAR-3 (a) só ProviderBalance | — | **Mantido** → item 11 |
| F-TAR-4 (a) sublinha na célula Valor | conflito | **Vale o F-FE-FEE-2 (a)**: coluna condicional |
| F-TAR-5 (a) ✗ sem bloquear | — | **Mantido** → item 12 |
| F-TAR-6 (a) "Retido pelo provedor" | rótulo (o dono listou explicitamente na emenda) | **Mantido** → item 13 (cabeçalho da coluna do #616) |
| F-TAR-7 (a), F-TAR-8 (a) | — | **Mantidos** → item 10 |
| F-TAR-9 (b) / 9.1 (b) seletor só da tarifa, topo da sub-aba | conflito com F-FE-FEE-1 (b) | **Vale o F-FE-FEE-1 (b)**, mas ele mesmo colide com F-ENC-1/F-ENC-11 → **F-FEE-E1** |

## 5. Pendente de validação externa

- Composição de `feeCents` (tarifas + `TAXES_AMOUNT`) até a resposta P3 do contador. Afeta só o tooltip do item 13.

## 6. Achados fora de escopo

1. `ImportBankStatementInput.gen.ts` declara `format: "mp_release"` como obrigatório (o gerador não enxerga o
   `.optional()` dentro do `z.preprocess`). Nenhum FE consome o tipo hoje.
2. Sem FE para o upload manual `format=mp_release` (G6/G8).
3. O aviso G7 é foto do scan: cobrança que vira terminal depois não atualiza o `PENDING` já criado (`skippedExisting`).
   Inferido pela leitura.
4. O painel do F7 não tem indicador de loading da lista.
5. `server/public/openapi.json` em `main` está atrás do `docs:generate` (paths de #610/#611). O PR de BE da view
   atualizou só a própria linha.
6. O `feeCents` informado pelo operador no confirm (F-ENC-13 (a), E28) é FE da EMENDA 3.3, não desta emenda.
