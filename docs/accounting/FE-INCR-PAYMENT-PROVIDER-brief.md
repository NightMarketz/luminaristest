# FE-INCR-PAYMENT-PROVIDER — tela de cobrança por provedor (Mercado Pago) sobre o backend do F5 (BRIEF)

> **Sessão:** `sessao-planejamento`, 2026-10-10, base `origin/main` `845d79ce`. Produz decisão, não código. Não cria
> branch, não commita, não edita outro BRIEF.
> **Autorização (ORCH-006), literal:** dono, chat, 2026-10-10, questionário: *"BRIEF tela de cobrança (Recommended)"*,
> opção descrita como *"BRIEF da FE-INCR-PAYMENT-PROVIDER, a tela de cobrança do Mercado Pago sobre o backend do F5
> que já está em main"*. Cobre **só este documento**: sem código e sem "executa". Cada fatia (§2) começa só com o
> "executa" do dono.
> **Escopo conferido (passo 1 da sessão):** a autorização cobre exatamente a tela que o BRIEF do F5 lista como achado
> fora de escopo (`BE-INCR-PAYMENT-PROVIDER-brief.md` §8, primeiro item), mais os dois "abertos" de FE que as decisões
> de 10/10 empurraram para "o BRIEF de FE do F5/F7": o upload manual `mp_release` (EMENDA 1 do FEE §6, item 2) e o
> alerta `releaseReportBlockedReason` com o botão de destravar ([[D-2026-10-10-F5-PR3-REVIEW-FIXES]] §Aberto). Não há
> nota `docs/plano/nos/FE-INCR-PAYMENT-PROVIDER.md`; criar o nó fica para o fold (pendência 2 do template).
> **Forks F-FE-COB-1..8: RATIFICAÇÃO PENDENTE** (§4).

## 0. Contexto fixo (não rediscutir)

### 0.1 Fronteira com o `FE-INCR-BANK-SETTLEMENT-FEE` (#616 + EMENDA 1 #617)

Este BRIEF **não** planeja nada da tela de baixas do F7. O que está lá continua sendo dele:

| Tema | Dono | Onde |
|---|---|---|
| Tarifa (`feeCents`, "Retido pelo provedor"), bruto, coluna condicional, conferência ✓/✗ | FEE | #616 itens 1–4; EMENDA 1 itens 12–13 |
| Método `ProviderBalance` no confirm/retry do F7 e `methodsFor(statement)` | FEE | EMENDA 1 item 11 |
| Aviso G7 (cobrança terminal casada) na lista e no modal do F7 | FEE | EMENDA 1 item 10 |
| Seção de conta da tarifa (`providerFeeExpenseAccountId`, override) | FEE | #616 item 7 × F-FEE-E1 (a) |
| Dicas de `fee_account_not_configured` / `provider_balance_requires_payment_account` | FEE | #616 itens 5–6 |
| `failedStep 'FEE'` | FEE | EMENDA 1 item 14 |
| **Conta do provedor** (cadastro, credencial, status, destravar relatório) | **este** | §2 PR-1 |
| **Emitir, ver e cancelar cobrança** a partir do título do AR | **este** | §2 PR-2 |
| **Upload manual `mp_release`** no import de extrato e o **atalho** da conta do provedor para a Conciliação | **este** | §2 PR-3 |

A cadeia "relatório de liberações → extrato da PaymentAccount → F7" já tem tela: o extrato importado aparece na
sub-aba "Extratos" da Conciliação e as propostas de baixa na sub-aba "Baixas por retorno" (`ReconciliationPanel.tsx:904`,
`BankSettlementPanel`). Este BRIEF só leva o usuário até lá com a folha certa selecionada (item 24). A partir daí, a
tela é do FEE.

### 0.2 Decisões já ratificadas que a tela respeita

- **F-PP-10 (a)**: cobrança manual, **por título, na tela do Contas a Receber**. O botão "Cobrar" fica no AR, sem fork.
- **PP-D5 + resposta 20 + F9 (ratificação pós-implementação de 10/10)**: nenhum status da cobrança dá baixa. Cobrança
  `PAID` com título aberto mostra **"pago no provedor, aguardando confirmação"** (P2-15; texto é do FE).
- **F-PPB-8 (b)**: `PARTIALLY_REFUNDED` e `CHARGED_BACK` são status próprios, sem efeito no razão. A view mostra um
  aviso (P2-7).
- **F-PP-9 (a)**: no máximo uma conta `ACTIVE` por (escopo, provedor). A tela não oferece "conta padrão".
- **P2-12 / invariante 13**: o DTO não tem juros, multa, desconto nem vencimento acima de 30 dias, e o `.strict()` dá
  400 se vierem. **A tela não oferece esses campos** (o MP não os suporta: ADR MP11, doc relida hoje, §0.4).
- **F9**: o pagador (PII) não vem na lista. Vem só no detalhe e na sugestão, para quem tem `canManageReceivable`.
- **D-2026-10-03 lacuna 2**: ler a conta = `canReadAccountingSettings`; gerir = `canManageAccountingSettings`.
- **R2 (a)** de 10/10: o bloqueio do relatório é um alerta visível que o operador destrava. O status da conta não é
  tocado (a cobrança continua funcionando).
- **F-FEE-E2 (a)**: tipos de **resposta** escritos à mão, transcritos do service do BE (D11). Os de **escrita** vêm do
  `.gen.ts` (`my-app/CLAUDE.md` regra 6).
- **Chave em repouso = M2**: sem `PAYMENT_CREDENTIAL_KEYS` no env, gravar credencial e cobrar dão 503
  `payment_credential_key_missing` (P1-2). A tela mostra o motivo e não inventa caminho alternativo.

### 0.3 Rotas reais em `main` (lidas no código, CBM-001)

| Rota | Faz | Fonte |
|---|---|---|
| `GET /api/payment-accounts?unitId` | lista `PaymentAccountView[]` | `routes/paymentAccounts.ts`; `paymentAccountController.ts:20` |
| `GET /api/payment-accounts/:id?unitId` | detalhe | `:35` |
| `POST /api/payment-accounts` | cria em `DRAFT` (`CreatePaymentAccountSchema`); `glAccountId` folha e **imutável** | `:50`; `PaymentAccountDto.ts` |
| `PATCH /api/payment-accounts/:id` | `label` e/ou `status` `ACTIVE↔DISABLED`; mesmo status ⇒ 409 `payment_account_invalid_transition` | `:65` |
| `PUT /api/payment-accounts/:id/credential` | `{unitId, accessToken(≥20), webhookSecret(≥16)}`; põe `ACTIVE`; 409 `payment_account_already_active`; 503 sem chave | `:80` |
| `POST /api/payment-accounts/:id/release-report/unblock` | `{unitId}`; limpa `releaseReportBlockedReason`; 200 sem efeito se não bloqueada | `:96` |
| `DELETE /api/payment-accounts/:id?unitId` | soft-delete, sem audit | `:111` |
| `POST /api/receivables/:receivableId/charges` | cria (`CreateChargeSchema`); valor = saldo aberto relido na tx | `routes/collectionCharges.ts:21`; `CollectionChargeService.ts:104` |
| `GET /api/receivables/:receivableId/charges?unitId` | lista do título, **sem pagador** | `:22`; service `:312` |
| `GET /api/receivables/:receivableId/charges/payer-suggestion?unitId` | `Partial<PayerInput>`; exige `canManageReceivable` | `:23`; service `:330` |
| `GET /api/collection-charges/:id?unitId` | detalhe; `payer` só para gestor | `:26`; service `:322` |
| `POST /api/collection-charges/:id/cancel` | `{unitId}`; só `PENDING`; 409 do MP ⇒ aplica o estado real | `:27`; service `:180` |
| `POST /api/accounting/reconciliation/statements` (multipart) | import de extrato; campo `format` opcional `mp_release` (G6) | `routes/accounting.ts:260`; `ReconciliationDto.ts:69` |
| `GET /api/accounting/reconciliation/statements?unitId&page&limit` | lista de extratos (sem filtro por folha ou conta) | `:261`; `ReconciliationRepository.ts:80` |
| `POST /api/payment-collection/webhook/:provider/:accountId` | **público**, chamado só pelo MP | `middleware/auth.ts:48` |

Códigos de erro que a tela trata, todos lidos pelo `code` do envelope (`apiUtils.ts:38`) via
`resolveErrorWithCode` (`features/accounting/lib/resolveError.ts`), **nunca** por prefixo da mensagem: alguns 400/502
não começam pelo código (ex.: `charge_address_required`, `provider_credential_invalid`):
`CHARGE_RECEIVABLE_NOT_CHARGEABLE`, `CHARGE_LIVE_EXISTS`, `CHARGE_NOTHING_TO_CHARGE`, `CHARGE_NOT_PENDING`,
`PAYMENT_ACCOUNT_NOT_ACTIVE`, `charge_address_required`, `charge_expiry_field_mismatch`, `provider_credential_invalid`
(502), `provider_unavailable` (502), `payment_credential_key_missing` (503), `receivable_has_live_charge` (409, no
cancelamento do título), `payment_account_already_active`, `payment_account_invalid_transition`,
`credential_source_not_supported`, `release_report_overlap`, `release_report_balance_from_file`,
`release_report_no_payment_account` (`CollectionCharge.model.ts:49-60`, `PaymentAccount.model.ts`,
`ReleaseReport.model.ts:24-28`, `secretBox.ts:17`).

### 0.4 Fatos do provedor relidos hoje (doc oficial, WebFetch 2026-10-10; resumo por modelo auxiliar, viés do §9)

| # | Fato | Efeito na tela | Fonte |
|---|---|---|---|
| W1 | Boleto: vencimento padrão de 3 dias úteis; `expiration_time` de 1 a 30 dias; fim de semana empurra para o próximo dia útil; a doc recomenda no mínimo `P3D` por causa da compensação. **Pago depois do vencimento, o valor é estornado na conta MP do pagador.** A página não diz quem é o beneficiário nem se o boleto é registrado, e não tem juros, multa ou desconto | item 12 (aviso do prazo mínimo recomendado); item 17 (aviso de vencido); L-COB-1, L-COB-5 | [checkout-api-orders/payment-integration/boleto](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/boleto) |
| W2 | Boleto e Pix: **se não for pago até 30 dias depois do vencimento, o MP o considera expirado** e o cancelamento manual deixa de ser possível. A doc recomenda cancelar o que não foi pago depois do vencimento | item 17 (entre o vencimento e o `EXPIRED` do MP, a cobrança continua `PENDING`) | W1 e [payment-integration/pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix) |
| W3 | Pix: prazo de 30 min a 30 dias, padrão 24 h; só `payer.email` é obrigatório na ordem; a resposta traz `qr_code` (copia-e-cola), `qr_code_base64` e `ticket_url`; status inicial `action_required/waiting_transfer` | itens 12 e 14 | W2 |
| W4 | Cancelar: só `action_required` ou `created`; 409 `cannot_cancel_order` / `order_already_canceled`. Existe endpoint "Refund order" na Orders API, que o BE **não** expõe | item 16; IA-6 | [reference/.../cancel-order/post](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/cancel-order/post) |

## 1. Insumos ausentes (BE que a tela precisaria e não existe — fora deste BRIEF)

| # | Ausente | Efeito aqui |
|---|---|---|
| IA-1 | **Lista global de cobranças** (`GET /api/collection-charges?unitId&status&page`). Só existe a lista por título | "listar cobranças e status" fica por título (F-FE-COB-2). Uma visão "todas as cobranças pendentes" exige BE novo |
| IA-2 | **Linha do tempo de eventos/webhook.** O webhook não persiste o corpo nem a chegada: só a transição que a re-consulta aplica (`webhookReceived`, service `:234`). O `AuditEvent` tem `collection_charge.*`, mas não há rota de leitura de audit (só `GET /accounting/audit/verify-chain`, `routes/accounting.ts:204`) | "ver webhook/eventos" fica no último estado do provedor (F-FE-COB-4) |
| IA-3 | **Resumo da cobrança viva na lista do AR.** `ReceivableService` não junta cobrança na view | o selo "pago no provedor, aguardando confirmação" só aparece quando o usuário abre as cobranças do título (F-FE-COB-3) |
| IA-4 | **Estado do job do relatório** (watermark, última execução, último arquivo). A view expõe só `releaseReportBlockedReason` | a tela mostra "bloqueado / não bloqueado", não mostra "importado até" |
| IA-5 | **Filtro da lista de extratos** por `glAccountId` ou `paymentAccountId`. `findStatements` filtra só por escopo. A presença de `paymentAccountId` na resposta é **inferida** (`findMany` sem `select`, `schema.prisma:790`; mesma inferência da EMENDA 1 §0) | o atalho do item 24 seleciona a folha. A lista continua paginada por unidade, como hoje |
| IA-6 | **Estorno (refund)** da cobrança paga. O MP tem o endpoint (W4); o BE não | nenhum botão de estorno. O tratamento contábil é a P4 do contador |
| IA-7 | **URL do webhook na view da conta** | só se F-FE-COB-5 → (b) |

Nenhum desses bloqueia o checklist da forma recomendada. Abrir qualquer um é BE novo, com autorização própria.

## 2. Checklist de comportamentos (fatiado em 3 PRs)

Formato: **n [direto | fork F-FE-COB-k]**. Cada item tem teste próprio (vitest + RTL, `jsdom`, shim
`(globalThis as unknown as { React: typeof React }).React = React;` no teste que renderiza componente sem `import React`).

### PR-1 — Serviços, tipos e a conta do provedor

1. **[direto]** `lib/services/paymentAccounts.service.ts`, com `list`, `get`, `create`, `update`, `setCredential`,
   `unblockReleaseReport` e `remove` sobre as rotas do §0.3. O corpo de escrita é tipado por
   `@/types/contracts/accounting/PaymentAccountDto.gen.ts` (`CreatePaymentAccountInput`, `UpdatePaymentAccountInput`,
   `SetCredentialInput`, `UnblockReleaseReportInput`) e a resposta `PaymentAccountView` é escrita à mão (§3.1, F-FEE-E2).
   Teste de wire por método: URL, verbo e corpo exato.
2. **[direto]** `lib/services/collectionCharges.service.ts` com `create`, `listByReceivable`, `get`, `cancel` e
   `payerSuggestion`. A escrita é tipada por `CollectionChargeDto.gen.ts` (`CreateChargeInput`, `CancelChargeInput`) e a
   resposta `CollectionChargeView` à mão (§3.2). `amountCents` chega como **string** (BigInt) e é convertido num único
   lugar (`toCents(s): number`, com teste de string grande). Teste de wire.
3. **[fork F-FE-COB-1]** Onde mora a conta do provedor. Recomendado: aba nova `cobranca` em `AccountingView.tsx`
   (`TABS`, `labelKey: 'view.tabs.cobranca'`), fora de `DELEGATED_TABS`, com o painel `PaymentProviderPanel`.
4. **[direto]** Lista de contas (`GET`): rótulo, provedor, folha (`código — nome`, resolvida pela lista de contas como
   em `ReconciliationPanel.tsx:895`), selo de status (`DRAFT` / `ACTIVE` / `CREDENTIAL_INVALID` / `DISABLED`, cores
   `neutral-*` mais o tom do status), `credentialSetAt` e `•••• <accessTokenLast4>`. Cards `rounded-2xl`. Sem conta:
   estado vazio com o botão "Cadastrar conta Mercado Pago". Teste: os 4 status renderizam rótulo próprio, e a
   credencial nunca aparece além dos 4 últimos dígitos.
5. **[direto]** Criar conta (`Modal` canônico): `label` (1–80) e folha (select de contas `acceptsEntries`, molde
   `FixedAssetAccountSelect`). `provider` e `config` são fixos (`MERCADO_PAGO` / `{provider:'MERCADO_PAGO',
   credentialSource:'OWN'}`); o FE nunca manda `OAUTH`. Aviso fixo: **"a conta contábil não pode ser trocada depois;
   para trocar, crie outra conta"** (P1-3). Texto de ajuda da folha: o código é pendência do contador (P1, §5). Teste de
   wire: corpo exato, sem campo extra.
6. **[direto]** Gravar credencial (`Modal`): dois campos `type="password"`, `autocomplete="off"`, sempre vazios ao
   abrir (nada é pré-preenchido, porque o BE nunca devolve a credencial). Validação local espelha o DTO (≥ 20 e ≥ 16).
   Depois do 200, o estado do formulário é zerado e a lista mostra `credentialSetAt` e os 4 últimos dígitos. Erros:
   503 `payment_credential_key_missing` ⇒ *"A chave de cifra da instância não está provisionada (pré-condição do
   deploy, M2). Nada foi gravado."*; 409 `payment_account_already_active` ⇒ *"Já existe uma conta ativa nesta unidade;
   desative-a antes."* Teste: os valores digitados não ficam no DOM depois do sucesso nem depois do erro, e não vão
   para `console`.
7. **[direto]** `CREDENTIAL_INVALID`: callout no card (*"O Mercado Pago recusou a credencial. Grave a credencial de
   novo para voltar a cobrar."*) com o botão do item 6. É a única saída do estado (P2-4).
8. **[direto]** Ativar e desativar (`PATCH status`), com o botão oferecido só na transição válida (`ACTIVE→DISABLED`,
   `DISABLED→ACTIVE`). `DRAFT` ativa só pela credencial. Renomear (`PATCH label`). Excluir (`DELETE`, confirmação no
   `Modal`). 409 mostra a mensagem do BE. Teste: em `DRAFT` não aparece "Ativar"; em `ACTIVE` aparece só "Desativar".
9. **[fork F-FE-COB-5]** Instruções de webhook no card: a URL a colar no painel do MP
   (`…/api/payment-collection/webhook/MERCADO_PAGO/<id>`), com botão de copiar, e o lembrete de que o webhook só se
   configura no painel do MP, em URL HTTPS de produção (M8). Recomendado: a URL é montada no FE a partir de
   `NEXT_PUBLIC_API_BASE_URL` (`lib/services/multipart.ts:16`), com aviso quando a base não é `https://` ou aponta para
   `localhost`.
10. **[direto]** Alerta do relatório (R2 a): conta com `releaseReportBlockedReason` não nulo mostra um callout âmbar
    com o motivo verbatim e a orientação (*"Resolva a sobreposição — por exemplo, exclua o extrato manual que cobre a
    faixa — e destrave"*), mais o botão "Destravar" (`POST …/release-report/unblock`), visível só para quem gere a
    conta. Depois do 200, recarrega. Teste: com motivo ⇒ callout + botão; sem motivo ⇒ nada; o clique manda
    `{ unitId }`.

### PR-2 — Cobrança a partir do título do AR

11. **[direto, F-PP-10 a + F9]** Botão "Cobrar" na linha do `AccountsReceivablePanel` para títulos cobráveis
    (`CHARGEABLE_RECEIVABLE_STATUSES` = `OPEN`, `PARTIALLY_RECEIVED`, `RECEIVING`). Para isso, o tipo FE
    `ReceivableStatus` (`accountsReceivable.service.ts:27`, hoje sem `PARTIALLY_RECEIVED`) ganha o status que o BE já
    tem (`Receivable.model.ts:14`), com rótulo i18n no `StatusBadge`. Teste: o botão aparece nos 3 status e não aparece
    em `RECEIVED` nem em `CANCELLED`.
12. **[direto + fork F-FE-COB-6]** Modal "Cobrar título" (`Modal` canônico):
    - tipo `BOLETO` | `PIX` (rádio);
    - **valor só leitura** = saldo aberto (`amountCents − receivedCents`), com a nota *"O valor é o saldo em aberto,
      relido pelo servidor na hora da emissão"*. Não há campo de valor, juros, multa nem desconto (P2-12);
    - prazo: boleto em dias (1–30; vazio = 3 dias úteis, F4), com a dica do mínimo recomendado de 3 dias (W1). O
      controle do prazo do Pix é o **F-FE-COB-6**. O FE manda **só** o campo do tipo escolhido, porque o outro dá 400
      `charge_expiry_field_mismatch`;
    - pagador: nome, sobrenome, e-mail, documento (tipo `CPF`/`CNPJ` pré-escolhido pelo tamanho: 11 ⇒ CPF, 14 ⇒ CNPJ,
      editável) e endereço (rua, número, CEP com 8 dígitos, bairro, cidade, UF com 2 letras), **obrigatório só no
      boleto** (o serviço dá 400 `charge_address_required`).
    O corpo sai de um mapper com retorno declarado (`toCreateChargeInput(form): CreateChargeInput`, regra 7 do
    `my-app/CLAUDE.md`). Teste de wire: boleto com endereço e `expiresInDays`; Pix sem endereço e só
    `expiresInMinutes`; nenhum campo extra.
13. **[direto, P2-11]** Ao abrir o modal, `GET …/payer-suggestion` pré-preenche o pagador (última cobrança do mesmo
    cliente ou só o documento do cadastro). 403 (sem `canManageReceivable`) ⇒ o modal nem abre e o botão do item 11 não
    aparece para quem só lê. Erro na sugestão ⇒ formulário vazio, sem bloquear. Teste: a sugestão preenche os campos;
    uma resposta `{identification:{number}}` preenche só o documento.
14. **[direto]** Resultado da emissão (mesma tela do modal, depois do 201): selo do status e o instrumento —
    boleto: `digitableLine` com botão copiar e link `ticketUrl` (`target="_blank" rel="noopener noreferrer"`); Pix:
    imagem `data:image/png;base64,<qrCodeBase64>`, `qrCode` copia-e-cola com botão copiar e link `ticketUrl`.
    `CREATING` (MP indisponível, 502 `provider_unavailable`) ⇒ *"A cobrança foi registrada e será reenviada
    automaticamente"* (P2-3). `FAILED` ⇒ `failReason` verbatim. Teste por variante (boleto, Pix, `CREATING`, `FAILED`).
15. **[direto]** Erros da emissão por `code` (§0.3): `CHARGE_LIVE_EXISTS` ⇒ *"O título já tem cobrança em andamento"*
    com o atalho para as cobranças do título (item 16); `PAYMENT_ACCOUNT_NOT_ACTIVE` ⇒ dica apontando a aba do item 3;
    `CHARGE_NOTHING_TO_CHARGE`, `CHARGE_RECEIVABLE_NOT_CHARGEABLE`, `provider_credential_invalid` (*"o MP recusou a
    credencial; grave de novo na aba Cobrança"*) e `payment_credential_key_missing` com texto próprio; Zod 400 pelo
    `humanizeZodFlatten` que o `resolveError` já usa. Teste por código.
16. **[fork F-FE-COB-2 / F-FE-COB-3]** Cobranças do título: painel ou drawer que carrega `GET
    /receivables/:id/charges` **ao abrir** e lista tipo, valor, vencimento, status, `providerStatus/Detail` e
    `updatedAt`. A ação "Cancelar cobrança" aparece só em `PENDING` com `providerRef`. O detalhe (`GET
    /collection-charges/:id`) mostra o instrumento e, para gestor, o pagador. Cancelar (`POST …/cancel`, confirmação no
    `Modal`): o resultado pode **não** ser `CANCELLED`, porque o 409 do MP faz o BE aplicar o estado real (ex.: já paga
    ⇒ `PAID`). A tela mostra o status devolvido com *"O provedor informou que a cobrança já estava <status>"*. 409
    `CHARGE_NOT_PENDING` ⇒ mensagem e recarga. Teste: cancelar devolvendo `PAID` mostra `PAID`, não "cancelada".
17. **[direto + fork F-FE-COB-7]** Textos por status (mapa fechado espelhando `COLLECTION_CHARGE_STATUSES`; status
    desconhecido ⇒ rótulo cru, nunca "pago"):
    - `PAID` com título ainda aberto ⇒ **"Pago no provedor, aguardando confirmação"**, com a nota *"A baixa entra pela
      Conciliação → Baixas por retorno, depois que o relatório de liberações do MP for importado"* (P2-15, PP-D5);
    - `PARTIALLY_REFUNDED`, `CHARGED_BACK`, `REFUNDED` ⇒ aviso *"Sem efeito no razão; o tratamento contábil de estorno
      e contestação está pendente do contador (P4) — concilie à mão"* (F-PPB-8 b);
    - `EXPIRED`, `CANCELLED`, `FAILED` ⇒ terminal: *"Se o pagador pagar mesmo assim, o valor aparece no relatório e a
      baixa é proposta na Conciliação com aviso"* (G7; a tela do aviso é do FEE);
    - `PENDING` com `expiresAt` no passado ⇒ **F-FE-COB-7**.
    `paidAt` aparece como *"visto pago em"* (informativo; a data da baixa é a do relatório, P2-7). Teste por grupo.
18. **[direto, P2-13 + F5]** O cancelamento do título com cobrança viva recebe 409 `receivable_has_live_charge` (o BE
    checa antes do `reverseEntry`). O modal de cancelamento do AR (`AccountsReceivablePanel.tsx:583`) mostra
    *"Cancele a cobrança do título antes"* com atalho para o item 16. Teste: 409 com esse código ⇒ mensagem + atalho,
    sem fechar o modal.
19. **[direto]** O recebimento manual do AR **não** oferece `ProviderBalance` (`RECEIPT_METHODS` continua com os 4).
    O BE recusa `ProviderBalance` fora do F7 (400 `provider_balance_requires_payment_account`, P3-9). Teste de
    regressão: a lista de métodos do modal "Receber" não muda.
20. **[direto]** Sem conta `ACTIVE` na unidade (lida com `GET /payment-accounts`, cacheada por montagem do painel do
    AR), o botão "Cobrar" aparece desabilitado, com tooltip apontando para a aba Cobrança. O BE continua sendo a
    autoridade (409 do item 15). Quem não tem `canReadAccountingSettings` recebe 403 nessa leitura: nesse caso o botão
    fica habilitado e o 409 decide. Teste: lista vazia ⇒ desabilitado; 403 ⇒ habilitado.
21. **[direto]** Nada desta fatia altera razão nem saldo do título na tela: a lista do AR **não** é recarregada como
    "mudança de razão" (`onLedgerChange` não é chamado) depois de emitir ou cancelar cobrança (P2-8). Teste: o callback
    não é chamado.

### PR-3 — Relatório de liberações → extrato → F7 (só o caminho até a tela do F7)

22. **[direto, G6/G2]** Import de extrato (`ReconciliationPanel.tsx`, formulário de `:332`): select "Formato" com
    *Detectar pelo conteúdo* (padrão, não envia `format`) e *Relatório de liberações do Mercado Pago* (envia
    `format=mp_release`). Com `mp_release`, os campos de saldo de abertura e fechamento ficam desabilitados e vazios,
    porque o BE responde 400 `release_report_balance_from_file` se vierem. `ImportStatementParams` (tipo de params do
    serviço multipart, à mão como hoje) ganha `format?: 'mp_release'`. Teste de wire: o `FormData` traz `format` só no
    modo MP e nunca traz saldo nesse modo.
23. **[direto]** Erros do import MP por `code`: `release_report_no_payment_account` (409) ⇒ *"Esta conta contábil não
    tem conta Mercado Pago; cadastre na aba Cobrança"*; `release_report_overlap` (400) ⇒ mensagem do BE verbatim, que
    lista os `SOURCE_ID` repetidos, mais *"Nada foi importado"* (F-PPB-4 a); colunas ausentes (`P3-3`) ⇒ mensagem
    verbatim. Teste por código.
24. **[direto]** Atalho "Ver extratos e baixas" no card da conta (item 4): troca para a aba `conciliacao` com a folha
    da conta (`glAccountId`) já selecionada. Para isso, o `ReconciliationPanel` ganha a prop opcional
    `initialGlAccountId` (sem a prop, o comportamento de hoje fica idêntico: primeira folha). Teste: com a prop, o
    select abre na folha; sem ela, abre na primeira (regressão).
25. **[direto]** Na lista de extratos, o extrato com `paymentAccountId` não nulo ganha o selo "Mercado Pago" (IA-5:
    confirmar contra o server na execução que o campo vem na resposta; se não vier, o item cai e vira insumo ausente,
    sem BE improvisado). `BankStatement` (FE) ganha `paymentAccountId: string | null`, o **mesmo** campo da EMENDA 1
    item 11. Quem mergear depois rebaseia, sem duplicar. Teste: com o campo ⇒ selo; `null` ⇒ sem selo.

### Gates (pertencem ao checklist)

26. **[direto]** Paridade i18n pt/en em `public/locales/{pt,en}/accounting.json` para toda chave nova (`view.tabs.cobranca`,
    `paymentProvider.*`, `collectionCharge.*`, `contasAReceber.status.PARTIALLY_RECEIVED`,
    `contasAReceber.action.charge*`, `reconciliation.import.format*`). O namespace `accounting` já está no `ns` da página
    (`pages/accounting/index.tsx:54`), e nenhum JSON novo é criado. Se a execução criar namespace próprio, ele entra no
    `ns` no mesmo PR (memória `i18n-namespace-novo-precisa-entrar-no-ns`).
27. **[direto]** Estilo: `neutral-*` (nunca `zinc-*`), cards `rounded-2xl`/`3xl`, zero `any` evitável. Canônicos:
    `Modal` (`components/ui/Modal`) para todo diálogo e `StandardPagination` se a lista de contas ou de cobranças
    paginar. Para `GenericTable`, ver o F-FE-COB-8.
28. **[direto]** `cd my-app && npx tsc --noEmit` limpo; `npm run test:types` (o diff toca `__tests__`; memória
    `tsc-noemit-my-app-exclui-testes`); vitest dos painéis tocados (`AccountsReceivablePanel`, `ReconciliationPanel`,
    painel novo, serviços novos).
29. **[direto]** Verificação contra **build de produção** (`npm run build && npm start`; a tela está atrás de
    `withAuth`), com o server local: conta criada em `DRAFT`, credencial gravada (com `PAYMENT_CREDENTIAL_KEYS` de teste
    no env local) e sem a chave (503 visível), cobrança Pix e boleto contra o `NullCollectionProvider` ou o sandbox, e
    import `mp_release` com fixture. Evidência por `read_page`/estilo computado (skill `verificacao-visual`). O sign-off
    de browser continua gate humano.
30. **[direto]** Nenhum segredo no bundle, no log ou no snapshot de teste: `grep` de guarda nos testes do item 6
    (token de fixture ausente do DOM e do `console`).

## 3. Contratos (esboço materializável)

### 3.1 Conta do provedor — resposta à mão (F-FEE-E2), escrita do `.gen.ts`

```ts
// paymentAccounts.service.ts — transcrito de PaymentAccountService.ts:29-45 (D11)
export type PaymentAccountStatus = 'DRAFT' | 'ACTIVE' | 'CREDENTIAL_INVALID' | 'DISABLED';
export interface PaymentAccountView {
  id: string; unitId: string;
  provider: 'MERCADO_PAGO';
  label: string;
  glAccountId: string;                       // imutável
  providerAccountRef: string | null;
  config: { provider: 'MERCADO_PAGO'; credentialSource: 'OWN' | 'OAUTH' };
  status: PaymentAccountStatus;
  credentialSetAt: string | null;
  credentialExpiresAt: string | null;        // sempre null para OWN
  accessTokenLast4: string | null;
  releaseReportBlockedReason: string | null; // R2 (a)
  createdAt: string; updatedAt: string;
}
import type {
  CreatePaymentAccountInput, UpdatePaymentAccountInput, SetCredentialInput, UnblockReleaseReportInput,
} from '@/types/contracts/accounting/PaymentAccountDto.gen';

// transições oferecidas na tela (item 8) — função pura testada
export function patchTargets(s: PaymentAccountStatus): ReadonlyArray<'ACTIVE' | 'DISABLED'>;
// ACTIVE → ['DISABLED'] · DISABLED → ['ACTIVE'] · DRAFT/CREDENTIAL_INVALID → []
```

### 3.2 Cobrança — resposta à mão, escrita do `.gen.ts`

```ts
// collectionCharges.service.ts — transcrito de CollectionChargeService.ts:46-66
export type CollectionChargeStatus =
  | 'CREATING' | 'PENDING' | 'PAID' | 'PARTIALLY_REFUNDED' | 'CHARGED_BACK'
  | 'REFUNDED' | 'EXPIRED' | 'CANCELLED' | 'FAILED';
export interface CollectionChargeView {
  id: string; unitId: string; receivableId: string; paymentAccountId: string;
  kind: 'BOLETO' | 'PIX';
  amountCents: string;                       // BigInt serializado — converter com toCents (item 2)
  expiresAt: string;
  status: CollectionChargeStatus;
  providerRef: string | null; providerPaymentRef: string | null;
  providerStatus: string | null; providerStatusDetail: string | null;
  paidAt: string | null;                     // informativo (P2-7)
  failReason: string | null;
  instrument: { digitableLine?: string; barcode?: string; qrCode?: string; qrCodeBase64?: string; ticketUrl?: string } | null;
  createdAt: string; updatedAt: string;
  payer?: PayerInput;                        // só detalhe + gestor (F9)
}
import type { CreateChargeInput, CancelChargeInput, PayerInput } from '@/types/contracts/accounting/CollectionChargeDto.gen';

export const LIVE: readonly CollectionChargeStatus[] = ['CREATING', 'PENDING'];
export const TERMINAL: readonly CollectionChargeStatus[] = ['REFUNDED', 'EXPIRED', 'CANCELLED', 'FAILED'];

// puros, exportados e testados
export function chargeBanner(c: Pick<CollectionChargeView, 'status' | 'expiresAt'>, receivableOpen: boolean, now: Date):
  | 'paid_awaiting_settlement' | 'no_ledger_effect' | 'terminal' | 'overdue_pending' | null;
export function docTypeFor(number: string): 'CPF' | 'CNPJ' | null;          // 11 / 14 dígitos
export function toCreateChargeInput(f: ChargeForm, unitId: string): CreateChargeInput; // só o campo de prazo do kind
```

### 3.3 Import de extrato (params do serviço multipart, à mão como hoje)

```ts
export interface ImportStatementParams {
  unitId: string; glAccountId: string; periodStart: string; periodEnd: string; statementRef?: string;
  openingBalanceCents?: number; closingBalanceCents?: number; // proibidos quando format = 'mp_release' (G2)
  format?: 'mp_release';                                       // G6; ausente = detecção pelo conteúdo
}
// BankStatement (accounting.service.ts:318) += paymentAccountId: string | null  — mesmo campo da EMENDA 1 item 11
```

### 3.4 Navegação

```ts
// AccountingView: Tab += 'cobranca' (F-FE-COB-1 a)
// ReconciliationPanel props += initialGlAccountId?: string   (item 24)
// AccountingView guarda { tab: 'conciliacao', glAccountId } ao seguir o atalho
```

## 4. Forks — RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação | Status |
|---|---|---|---|---|
| **F-FE-COB-1** | Onde mora a configuração da conta do provedor (item 3) | **(a)** aba nova "Cobrança" (`cobranca`) no `AccountingView`, com a conta, o alerta do relatório e o atalho para a Conciliação · **(b)** seção no topo da aba Conciliação · **(c)** dentro da aba Contas a Receber, como seção recolhível | **(a).** A conta é configuração com credencial, status e webhook. Ela serve à cobrança (AR) e ao relatório (Conciliação), e pôr num dos dois esconde do outro. A aba nova também é o destino natural de IA-1 (lista global) se o dono abrir esse BE. Custo: 1 entrada em `TABS` + 1 chave i18n | PENDENTE |
| **F-FE-COB-2** | "Listar cobranças e status" sem endpoint global (IA-1) | **(a)** só por título (item 16), sobre a rota que existe · **(b)** abrir BE `GET /api/collection-charges?unitId&status&page` e uma lista global na aba Cobrança · **(c)** (a) agora e (b) como nó próprio depois | **(c).** (a) cobre o fluxo ratificado (F-PP-10 a: cobrança por título) sem BE. Uma visão "todas as pendentes" tem valor operacional, mas é BE novo e fica fora desta autorização. Registrar como achado e deixar o dono decidir | PENDENTE |
| **F-FE-COB-3** | Como o AR mostra que um título tem cobrança (IA-3) | **(a)** carregar as cobranças só ao abrir o painel ou drawer do título (1 chamada por abertura) · **(b)** carregar `GET …/charges` para cada linha visível (N chamadas por página) · **(c)** BE novo: resumo `liveCharge`/`lastCharge` na view do AR | **(a).** (b) faz N+1 a cada página e a cada troca de filtro. (c) é BE fora de escopo. Custo de (a): o selo "pago no provedor, aguardando confirmação" só aparece com o título aberto (o P2-15 não exige que esteja na lista). Se o dono quiser o selo na lista, é (c) com autorização própria | PENDENTE |
| **F-FE-COB-4** | "Ver webhook/eventos" sem dado persistido nem rota de audit (IA-2) | **(a)** o detalhe mostra o último estado do provedor (`providerStatus`, `providerStatusDetail`, `updatedAt`, `paidAt`, `failReason`) com o texto *"atualizado por notificação ou re-consulta a cada 15 min"* · **(b)** BE novo: linha do tempo a partir dos `AuditEvent` `collection_charge.*` do `targetId` · **(c)** BE novo: tabela de entregas de webhook | **(a).** O webhook, por desenho, não transiciona pelo corpo (invariante 2): o que importa é o estado re-consultado, e ele já está na view. (b) exige rota de leitura de audit que não existe para nenhum módulo. (c) persiste corpo de terceiro, que o ADR evitou | PENDENTE |
| **F-FE-COB-5** | URL do webhook no card (item 9) | **(a)** montada no FE com `NEXT_PUBLIC_API_BASE_URL` + `/payment-collection/webhook/MERCADO_PAGO/<id>`, com aviso se não for `https://` ou se for `localhost` · **(b)** BE expõe `webhookUrl` na view (IA-7) · **(c)** sem URL na tela; fica só no runbook de provisionamento do M2 | **(a).** É a mesma base que o navegador já usa para a API. O aviso cobre o ambiente de dev. (b) é BE novo para concatenar uma string. (c) faz o operador montar a URL à mão, que é a fonte provável de erro no provisionamento. **Risco:** se a produção servir a API atrás de proxy com outra origem pública, a URL sai errada, e o runbook do M2 confere | PENDENTE |
| **F-FE-COB-6** | Controle do prazo do Pix (item 12): o DTO aceita `expiresInMinutes` de 30 a 43 200 | **(a)** presets: 30 min, 1 h, 24 h (padrão, envia omitido), 3 dias, 7 dias, 30 dias · **(b)** número + unidade (min/h/dias) convertido para minutos · **(c)** minutos crus | **(a).** Cobre os casos de balcão (minutos) e de cobrança remota (dias) sem conta de cabeça e sem valor fora da faixa. (b) é mais flexível e precisa de validação de faixa por unidade. O rótulo ("validade do QR" × "vencimento") depende de L-COB-3; até lá, **"validade"** | PENDENTE |
| **F-FE-COB-7** | Cobrança `PENDING` com `expiresAt` no passado (W1/W2: o MP só a dá como expirada 30 dias depois, e boleto pago depois do vencimento é estornado ao pagador) | **(a)** selo derivado "Vencida — aguardando o provedor", com a sugestão *"cancele para não deixar a cobrança aberta"* e o botão Cancelar em destaque · **(b)** sem selo derivado, mostra só `PENDING` e a data · **(c)** (a) e, além disso, esconder o instrumento (linha digitável/QR) depois do vencimento | **(a).** É o que a doc do MP recomenda (W2) e evita o operador mandar de novo uma linha digitável que, se paga, volta para o pagador. (c) esconde informação que o operador talvez precise para conferir um pagamento feito no limite. O status continua o do BE; o selo é só texto | PENDENTE |
| **F-FE-COB-8** | Tabela da lista de contas e de cobranças | **(a)** `GenericTable` canônico (`features/dashboard/category-views/shared/components/GenericTable.tsx`) · **(b)** tabela HTML no molde do `AccountsReceivablePanel`/`BankSettlementPanel` | **(b)** para as cobranças dentro do drawer do título (segue o painel-mãe, que não usa `GenericTable`) e **(a)** para a lista de contas na aba nova, se ela passar de um card. Divergência de **posse** (o drawer é parte da linha do AR) sancionada pelo `_REUSE-CRITERION`. Com F-PP-9 (a), a lista de contas tem em geral 1 item: cards bastam e o `GenericTable` só entra se houver mais de uma (desativada + ativa) | PENDENTE |

## 5. Pendente de validação externa (não entra no checklist como decidido)

| # | O quê | Quem | Onde bate |
|---|---|---|---|
| P1 | Código e nome da folha do saldo no MP ("a liberar" × "disponível") | contador (ADR §7.1 P1) | texto de ajuda do item 5; a tela não sugere conta |
| P2 | Data da baixa: pagamento ou liberação | contador (P2) | texto do item 17 ("a baixa entra depois da importação do relatório") vale para os dois; só muda a coluna no parser (BE) |
| P3 | Composição de `feeCents` / `TAXES_AMOUNT` | contador (P3) | **FEE**, não esta tela |
| P4 | Estorno e chargeback | contador (P4) | aviso do item 17 e IA-6 |
| P5 | Base LGPD para enviar CPF e endereço ao MP | advogado (ver L-COB-4) | item 12 |
| G-1 | Sonda de colunas e prova ponta a ponta no M2 (F-PPB-1 c) | gate humano (runbook) | o item 29 prova a tela com fixture; a tela real do relatório só se prova com o CSV da sonda |
| G-2 | `PAYMENT_CREDENTIAL_KEYS` e webhook no painel do MP | gate humano (M2) | itens 6 e 9 |

## 6. Perguntas de lei

**L-COB-1**
- (a) **Pergunta:** A cobrança emitida pelo MP (boleto, página do `ticket_url`, Pix) cumpre o art. 42-A do CDC (nome,
  endereço e CPF/CNPJ do **fornecedor** em todo documento de cobrança ao consumidor), ou o Luminaris precisa
  complementar esses dados?
- (b) **Por que importa / o que bloqueia:** hoje a descrição enviada ao MP leva só *"Título <nº> — <nome da empresa>"*
  (F9, `CollectionChargeService.ts:362`), sem endereço nem CNPJ. Se o documento do MP mostrar só o MP como
  beneficiário, a cobrança a consumidor pode ficar fora do 42-A. Isso bloqueia a decisão de exigir, na tela, um aviso
  ou um complemento (BE: descrição com CNPJ/endereço), e não o resto do checklist.
- (c) **O que a pesquisa achou:** texto do art. 42-A (incluído pela Lei 12.039/2009), reproduzido pelo Idec
  ([idec.org.br/print/484](https://idec.org.br/print/484), acesso 2026-10-10). O planalto.gov.br não respondeu
  (ECONNRESET, 2026-10-10), então o texto vigente não foi conferido na fonte oficial. A doc do boleto do MP **não diz
  quem é o beneficiário** (W1). Não basta porque a resposta depende do documento real emitido (que só a sonda do M2
  mostra) e de interpretação (intermediador × fornecedor).
- (d) **Quem responde:** advogado, com o boleto e a página `ticket_url` reais da sonda do M2.

**L-COB-2**
- (a) **Pergunta:** Ao reemitir a cobrança de um título vencido, o Luminaris pode embutir multa e juros de mora no
  valor (já que o MP não tem campo de encargo) e, se puder, quais são os tetos para cliente consumidor (multa de 2% do
  art. 52 §1º do CDC; juros do CC art. 406) e para cliente PJ?
- (b) **Por que importa / o que bloqueia:** hoje o valor é o saldo aberto, só leitura (item 12), e por isso a tela não
  cobra encargo nenhum. Se o dono quiser reemitir "com multa", é BE novo (valor acima do saldo cai no `chargeCents` do
  F7, ADR F-PP-10) e a tela precisaria de campo com teto legal. **Não bloqueia este checklist**; bloqueia qualquer pedido
  futuro de encargo na reemissão.
- (c) **O que a pesquisa achou:** o ADR MP11 e a página do boleto (W1) confirmam que o MP não tem juros, multa nem
  desconto. O texto do CDC art. 52 §1º e do CC art. 406 não foi conferido: planalto.gov.br com ECONNRESET em
  2026-10-10. Não basta porque, mesmo com o texto, a aplicação do art. 52 (fornecimento de crédito) a serviço pago a
  prazo e a forma de cobrar encargo embutido no principal pedem interpretação.
- (d) **Quem responde:** lei pesquisável (texto) + advogado (aplicação a consumidor × PJ) + contador (classe do
  encargo, já em curso na EMENDA 3.3).

**L-COB-3**
- (a) **Pergunta:** O Pix do MP com `expiration_time` de até 30 dias é, pelo Regulamento Pix do Banco Central, uma
  "cobrança imediata" com validade ou uma "cobrança com vencimento"? Há regra do BCB sobre o que a tela deve chamar de
  vencimento e sobre pagamento depois dele?
- (b) **Por que importa / o que bloqueia:** decide o rótulo do prazo no item 12 e no F-FE-COB-6 ("validade do QR" ×
  "vencimento") e o texto do F-FE-COB-7 para Pix. Rotular como "vencimento" algo que o regulamento trata como validade
  pode induzir o pagador sobre consequência que não existe.
- (c) **O que a pesquisa achou:** só fontes secundárias (bancos e fintechs) dizem que o Pix Cobrança tem as
  modalidades imediata e com vencimento, a segunda com juros, multa, abatimento e desconto (ex.:
  [Manual Pix Cobrança — Banrisul](https://lp.banrisul.com.br/bdg/link/midias/49205_Manual-Pix-Cobranca-para-Recebedores.pdf),
  acesso 2026-10-10). O texto da Resolução BCB nº 1/2020 (Regulamento Pix) e dos manuais do BCB **não foi alcançado**.
  A doc do MP (W3) fala em "expiração", não em vencimento.
- (d) **Quem responde:** lei pesquisável (Regulamento Pix e manuais no bcb.gov.br) e, se ambíguo, órgão (BCB, via
  canal do PSP).

**L-COB-4**
- (a) **Pergunta:** Qual é a base legal da LGPD para o Luminaris enviar ao MP o CPF/CNPJ, e-mail e endereço do cliente
  final, e a tela de emissão precisa exibir aviso ou registrar algo para o titular?
- (b) **Por que importa / o que bloqueia:** o item 12 coleta e envia esses dados, e o item 13 os reaproveita da
  última cobrança (`payerSnapshotJson`). Se a base exigir aviso ao titular ou registro de finalidade, falta um texto no
  modal ou um artefato fora da tela. Não bloqueia a estrutura do modal; bloqueia o texto final e o go-live.
- (c) **O que a pesquisa achou:** o ADR registra execução de contrato (LGPD art. 7º, V) como **inferência**, não
  parecer (ADR §7.1 P5, linha 368), e a pergunta foi roteada ao contador. Esta sessão não pesquisou além do ADR. Não
  basta porque é interpretação jurídica, não contábil.
- (d) **Quem responde:** advogado (re-roteia a P5 do ADR, que estava com o contador).

**L-COB-5**
- (a) **Pergunta:** O boleto emitido pela Orders API do MP é registrado na Nova Plataforma de Cobrança (NPC/Febraban),
  e quem aparece como beneficiário e como beneficiário final (antigo sacador/avalista)?
- (b) **Por que importa / o que bloqueia:** desde 2018 a rede bancária só aceita boleto registrado na NPC, e o
  registro confere CPF/CNPJ do emissor e do pagador. Se o pagador não reconhecer o beneficiário, ele pode recusar o
  boleto como falso. A resposta decide se a tela precisa avisar o operador ("o boleto sai em nome do Mercado Pago") e
  alimenta a L-COB-1.
- (c) **O que a pesquisa achou:** notícias de 2018 sobre o fim da migração da NPC (boletos a partir de R$ 0,01 só
  aceitos se registrados, desde 27/10/2018:
  [COAD](https://www.coad.com.br/home/noticias-detalhe/90006/boletos-a-partir-de-r-001-tem-de-estar-registrados-em-novo-sistema),
  acesso 2026-10-10) e o leiaute CNAB 240 do Santander (abril/2025), que chama o sacador/avalista de "beneficiário
  final". A doc do MP não diz se o boleto é registrado nem quem é o beneficiário (W1; ADR MP11: "registro bancário:
  nenhum campo"). Não basta porque a fonte primária da Febraban não foi alcançada e o comportamento do MP não está
  documentado.
- (d) **Quem responde:** lei pesquisável (normativo Febraban/Bacen da NPC) + evidência do boleto real na sonda do M2.
  O agente não assina essa evidência.

## 7. Achados fora de escopo (não planejados — exigem autorização própria)

1. **BE da lista global de cobranças** (IA-1), **do resumo de cobrança na view do AR** (IA-3), **da linha do tempo de
   eventos** (IA-2), **do estado do job do relatório** (IA-4), **do filtro de extratos por folha** (IA-5) e **do
   estorno** (IA-6).
2. **Tipo FE `ReceivableStatus` desatualizado**: falta `PARTIALLY_RECEIVED`, que o BE tem desde o BE-INCR-PARTIAL-
   SETTLEMENT. O item 11 corrige o necessário para o botão "Cobrar". Revisar o resto do AR (filtros, aging) para esse
   status é outra frente.
3. **`ImportBankStatementInput.gen.ts` declara `format` como obrigatório** (o gerador não enxerga o `.optional()`
   dentro do `z.preprocess`; EMENDA 1 §6 item 1). Este BRIEF não consome o tipo gerado no multipart (item 22 segue o
   `ImportStatementParams` à mão). Corrigir o gerador é outra frente.
4. **Botão "buscar relatório agora"**: F-PPB-6 (a) ratificou job diário + upload. Um gatilho manual é decisão nova.
5. **OAuth (`credentialSource = 'OAUTH'`)**, adaptador CNAB, Pix no balcão e F6: fora pelo ADR §11.
6. **Pendência 2 do template** desta sessão: este BRIEF não foi linkado em nenhuma nota do vault (não existe nó
   `FE-INCR-PAYMENT-PROVIDER`); fica para o fold.

## 8. Ordem para a `sessao-feature` (só depois de "executa" e dos forks ratificados)

1. **PR-1** (itens 1–10, 26–30 no que tocar). Não depende de BE novo.
2. **PR-2** (itens 11–21). Depende do PR-1 (serviços e aba do atalho).
3. **PR-3** (itens 22–25). Independe do PR-2. **Coordena com o FEE**: os dois tocam `ReconciliationPanel.tsx` e o tipo
   `BankStatement` (`paymentAccountId`). Quem mergear depois rebaseia (memória `squash-merge-quebra-prs-empilhados`).

## 9. Riscos e vieses declarados (T8)

- **Viés de leitura:** o §0.4 e o §6 vieram de WebFetch/WebSearch com resumo por modelo auxiliar. Duas fontes
  primárias (planalto.gov.br e o Regulamento Pix) não foram alcançadas; as perguntas de lei dizem isso em cada (c).
- **Inferências não provadas:** `paymentAccountId` na lista de extratos (IA-5, item 25) e o comportamento do 409 de
  cancelamento devolvendo `PAID` (item 16) foram lidos no código, não executados.
- **Viés do agente:** pende para não abrir BE (forks 2, 3 e 4 recomendam a forma sem BE). O custo é real: sem IA-1/IA-3,
  o operador não vê de relance quais títulos têm cobrança paga aguardando baixa.
- **Prova só em produção:** a tela do relatório e o caminho até o F7 se provam com fixture (item 29). O CSV real chega
  só na sonda do M2.
