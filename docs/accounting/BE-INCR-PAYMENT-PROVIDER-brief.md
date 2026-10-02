# BE-INCR-PAYMENT-PROVIDER — cobrança por provedor, Mercado Pago como 1º adaptador (nó F5) — BRIEF

> Sessão: `sessao-planejamento` · 2026-10-02 · base `origin/main` `4dd8fcb4`. **Sem código.**
> Saída: este documento, mais o fold da nota [F5](../plano/nos/F5.md) (Docs/autorização) e uma linha de pré-condição
> na nota [M2](../plano/gates/M2.md).
> **Forks do ADR (F-PP-1..11): ratificados** em [D-2026-10-02-PAYMENT-PROVIDER-FORKS](../plano/decisoes/D-2026-10-02-PAYMENT-PROVIDER-FORKS.md).
> **Forks novos deste BRIEF (F-PPB-1..9): RATIFICADOS 02/10** (§5.1; mesma cédula, rodadas 4–6). Divergem da
> recomendação: **F-PPB-1 → (c)** (PR-3 bloqueado até a sonda de colunas em produção) e **F-PPB-8 → (b)** (status novos).

## 0. Contexto fixo (não rediscutir)

- **Item:** nó [F5](../plano/nos/F5.md), re-escopado em 29/09 (decisão 7 de
  [D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md)):
  cobrança por provedor, com o **Mercado Pago como 1º adaptador**. O adaptador CNAB (2º) e o [F6](../plano/nos/F6.md)
  (Pix de saída, que espera a chave Ed25519 do MP, ADR §6.2) **ficam fora**.
- **Autorização (ORCH-006), literal, dono, chat, 02/10/2026:** *"(2) depois, planejar o BRIEF do F5 (Mercado Pago como
  1º adaptador) (dono, 02/10) — sem 'executa'"*. Ela cobre exatamente este documento: BRIEF do F5 restrito ao MP. Não
  autoriza código, e o campo `autorizacao` da nota F5 continua sem "executa".
- **Instruções do dono para este BRIEF (mesma mensagem):** *"A cifra do token em repouso depende do M2 — marque como
  pré-condição de deploy, não invente KMS. Capacidades do MP só confirmadas na doc oficial, com link; o que não
  confirmar = fork pendente. F6 fica fora."*
- **Desenho:** [ADR-INCR-PAYMENT-PROVIDER-COLLECTION](../adr/ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md), **Accepted
  02/10**. Este BRIEF herda as decisões PP-D1..PP-D9 (§4 do ADR), os forks ratificados (§8.1) e as 13 invariantes do
  §10, que aqui viram itens de checklist. Onde este BRIEF e o ADR divergirem, quem vale é a ratificação.
- **Forks ratificados, resumo:** F-PP-1 (b) BYOK, credencial própria do cliente · F-PP-2 (b) coluna cifrada ·
  F-PP-3 (a) AES-256-GCM em `node:crypto`, chave-mestra no env, provisionada pelo M2 · F-PP-4 (a) Orders API ·
  F-PP-5 (a) baixa só pelo relatório de liberações · F-PP-6 (b) `feeCents` no item do F7 · F-PP-7 (a) folha própria +
  método `ProviderBalance` · F-PP-8 (c) janela de 15 dias · F-PP-9 (a) uma conta ativa por (escopo, provedor) ·
  F-PP-10 (a) gatilho manual por título · F-PP-11 (a1) pagador no DTO, com sugestão pela última cobrança.
- **Resposta 20 (entrevista de 10/09):** *"Contas a pagar e a receber NÃO têm baixa automática"*. Nenhum evento do MP
  liquida título (PP-D5).

## 1. Estado medido do código (CBM-001: lido em `4dd8fcb4`)

| # | Fato | Onde | Grau |
|---|---|---|---|
| S1 | Não existe `PaymentAccount`, `CollectionCharge` nem cifra (`createCipheriv` em `server/src` = 0, ADR §3) | `schema.prisma` | V (ADR) |
| S2 | Import de extrato: 3 parsers (`ofx`/`cnab`/tabela) → o mesmo `parseLines`; idempotência por `@@unique([userId, unitId, sha256])`; `glAccountId` precisa ser folha | `ReconciliationService.ts:84-131`; `schema.prisma:745-767` | V |
| S3 | `BankStatementLine` tem `externalRef String?` e `rawJson String` | `schema.prisma:771-793` | V |
| S4 | Scan do F7: para cada linha `UNMATCHED`, `amountCents < 0` → candidato **PAYABLE**, `> 0` → RECEIVABLE, via `pickCandidate` (janela de vencimento + teto de encargo; `externalRef` só desempata contra `documentNumber`) | `BankSettlementService.ts:150-189`; `BankSettlement.model.ts:72-100` | V |
| S5 | `proposedCents = min(\|linha\|, saldo)`, `chargeCents = max(0, \|linha\| − saldo)`. O pré-cheque do confirm re-deriva os dois sobre o saldo atual e exige igualdade (`title_balance_changed`); o stale do scan faz o mesmo | `BankSettlementService.ts:131-145, 441-451`; `BankSettlement.model.ts:97-98` | V |
| S6 | Confirm: `registerReceipt(method, receivedAt = data da linha, amountCents = proposedCents)`, depois `bank.charge` com o encargo, depois `manualMatch(linha, N postings)` sobre as pernas de banco | `BankSettlementService.ts:326-368` | V |
| S7 | F-F7-3 (a): `resolvePaymentMethodAccount(method)` tem de ser a conta do extrato, senão `method_account_mismatch`. **As linhas do ADR (`:447-450`) andaram: hoje é `:460-464`** | `BankSettlementService.ts:459-464` | V |
| S8 | O recibo do AR resolve a conta de débito **pelo método** (mapa fechado `RECEIPT_METHOD_ACCOUNTS`: Cash→1.1.3, Pix/TED/Boleto→1.1.1) no registro **e de novo no estorno** | `Receivable.model.ts:60-78`; `ReceivableService.ts:248`, `:533` | V |
| S9 | `ReceivableReceipt` grava `method`, mas **não** a conta de débito | `schema.prisma:1069-1086` | V |
| S10 | `BankSettlementItem` com `@@unique([userId, unitId, statementLineId, titleType, titleId])`; `origin` = `'STATEMENT_LINE'` | `schema.prisma:1551-1578` | V |
| S11 | `AccountingScopeSettings` tem 1 linha por escopo, com FKs `Restrict` para contas configuráveis | `schema.prisma:1583-1610` | V |
| S12 | Allowlist do audit: `bank_settlement.*` com chaves fechadas; evento novo entra na mesma mudança | `auditCanonical.ts:135-138` | V |
| S13 | `publicApiRoutes`: só `POST`, `prefix`; precedente `/api/nfe/dfe/webhook` | `middleware/auth.ts:36-46` | V |
| S14 | Adaptador nulo recusa `NODE_ENV=production` no construtor | `dfe/NullEmissor.ts:20-21` | V |
| S15 | Job periódico: `DfePollScheduler` (lock process-local, sem timer em teste) + `JobWatermarkRepository` (chave `job` string) | `jobs/DfePollScheduler.ts`; `jobs/JobWatermarkRepository.ts:11-17` | V |
| S16 | Emenda 3.3 (BRIEF em curso, F-ENC-2/4/… pendentes) **também** altera `bank_settlement_items` (`shortfallCents`, `shortfallTreatment`, `chargeParts`) | `BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md` §4.3 | V |
| S17 | `manualMatch` aceita N `postingIds`; o comentário do F7 diz que as pernas "fecham \|linha\| exato". **Não li se a soma é com sinal** (a perna de tarifa é crédito) | `BankSettlementService.ts:360-368`; `ReconciliationService.ts:535-563` | I |

## 2. Fatos do provedor — **só doc oficial, com link** (relidos em 02/10)

Lidos por WebFetch, que devolve um **resumo feito por modelo auxiliar** (viés declarado no §10). Grau: **V** = lido
hoje · **V-29/09** = lido pelo ADR com link e não relido hoje · **NV** = não confirmado, logo vira fork ou insumo
ausente. Prefixo: `https://www.mercadopago.com.br/developers`.

| # | Fato | Grau | Link |
|---|---|---|---|
| M1 | Boleto, `POST /v1/orders`: headers `Authorization: Bearer`, `X-Idempotency-Key`; corpo `type: "online"`, `external_reference`, `processing_mode`, `total_amount` **string decimal** ("50.00"), `payer.{email, first_name, last_name, identification.{type, number}, address.{street_name, street_number, zip_code, neighborhood, state (2 letras), city}}`, `transactions.payments[].{amount, payment_method.{id: "boleto", type: "ticket"}, expiration_time}` | V | [/pt/docs/checkout-api-orders/payment-integration/boleto](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/boleto) |
| M2 | Vencimento do boleto: 1 a 30 dias, padrão 3 dias úteis; fim de semana empurra para o próximo dia útil; **pago depois do vencimento, o valor volta para a conta MP do pagador** | V | M1 |
| M3 | Resposta do boleto: `transactions.payments[].id` no formato `PAY01…`, `payment_method.{ticket_url, barcode_content, digitable_line}`. **Nenhum campo de juros, multa ou desconto** | V | M1 |
| M4 | Pix, `POST /v1/orders`: `payment_method.{id: "pix", type: "bank_transfer"}`; `payer.email` obrigatório; `X-Idempotency-Key`; `expiration_time` de PT30M a P30D, padrão 24 h; **exige chave Pix cadastrada**; resposta `qr_code`, `qr_code_base64`, `ticket_url`, status inicial `action_required/waiting_transfer` | V | [/pt/docs/checkout-api-orders/payment-integration/pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix) |
| M5 | `GET /v1/orders/{id}`: em `transactions.payments[]` vêm `id`, `amount`, `paid_amount`, `taxes_amount`, `status`, `status_detail`, `date_of_expiration`, `reference_id`, `payment_method`; **sem tarifa e sem data de aprovação**. Na raiz, só `created_date`/`last_updated_date` | V | [/en/reference/online-payments/checkout-api/get-order/get](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/get-order/get) |
| M6 | Status da ordem → `status_detail`: `created/created` · `processing/in_process` · `action_required/{waiting_payment, waiting_capture, waiting_transfer, waiting_retry}` · `processed/{accredited, partially_refunded}` · `canceled/canceled` · `expired/expired` · `failed/failed` · `refunded/refunded` · `charged_back/{in_process, settled, reimbursed}` | V | [/en/docs/checkout-api-orders/payment-management/status/order-status](https://www.mercadopago.com.br/developers/en/docs/checkout-api-orders/payment-management/status/order-status) |
| M7 | Cancelar: `POST /v1/orders/{order_id}/cancel`, com `X-Idempotency-Key` obrigatório; **só `action_required` ou `created`**; 409 `cannot_cancel_order` | V | [/en/reference/online-payments/checkout-api/cancel-order/post](https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/cancel-order/post) |
| M8 | Webhook da Orders: **só pelo painel** ("Suas integrações" → Webhooks), URL HTTPS de produção, segredo gerado ao salvar; tópico "Order (Mercado Pago)"; corpo `{action: "order.processed", type: "order", data: {id: "ORD…", status, status_detail, …}, user_id, live_mode}`; o SDK valida com `x-signature`, `x-request-id`, `data.id` **da query** e o segredo; `ts` em **ms**; resposta 200/201 em **22 s**; retentativa a cada 15 min, intervalo maior depois da 3ª; **nenhuma tolerância de `ts` documentada** | V | [/pt/docs/checkout-api-orders/notifications](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/notifications) |
| M9 | Template HMAC `id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];`, `data.id` em minúsculo, par ausente sai do template, SHA-256 em hex | V-29/09 | mesma página de M8 (ADR MP4). **O resumo de hoje não repetiu o template:** o executor reabre a página antes de transcrever a constante (item P2-5) |
| M10 | Relatório de liberações: `POST/GET/PUT /v1/account/release_report/config` (`file_name_prefix`, `columns`, `frequency`, `display_timezone` padrão **"GMT-04"**, `separator` padrão ",", …); `POST /v1/account/release_report` com `begin_date`/`end_date` ISO UTC (`…Z`) → **202**; `GET /v1/account/release_report/list`; `GET /v1/account/release_report/:file_name`; `POST/DELETE …/schedule`; CSV (padrão) e XLSX; **nenhum limite de faixa** documentado | V | [/en/docs/reports/released-money/api](https://www.mercadopago.com.br/developers/en/docs/reports/released-money/api) |
| M11 | Colunas: `DATE` (*"the moment when this transaction impacts the available balance"*), `SOURCE_ID` (*"Example: ID of a Payment"*), `EXTERNAL_REFERENCE` (*"Their own ID, provided by the seller, if it is an external integration"*), `RECORD_TYPE` (`initial_available_balance`, `release`, `total`, `available_balance`), `DESCRIPTION` (payment, refund, chargeback, shipping, tax withholding, dispute, payout, reserve…), `NET_CREDIT_AMOUNT`, `NET_DEBIT_AMOUNT`, `GROSS_AMOUNT`, `MP_FEE_AMOUNT`, `FINANCING_FEE_AMOUNT`, `SHIPPING_FEE_AMOUNT`, `TAXES_AMOUNT`, `COUPON_AMOUNT`, `BALANCE_AMOUNT`, `PAYMENT_METHOD`, `ORDER_ID`, **`TRANSACTION_DATE`, `TRANSACTION_APPROVAL_DATE`** | V | [/en/docs/checkout-api-payments/additional-content/reports/released-money/report-fields](https://www.mercadopago.com.br/developers/en/docs/checkout-api-payments/additional-content/reports/released-money/report-fields) |
| M12 | Credenciais de produção da aplicação: pares Public Key/Access Token e Client ID/Client Secret. **A página não fala em validade do access token.** Renovar no painel "afetará o seu funcionamento": é preciso trocar pela nova | V (ausência de validade) | [/pt/docs/your-integrations/credentials](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials) |
| M13 | Em conta de teste o relatório sai vazio | V\* (dossiê D-3; ADR MP15) | — |

**Consequências para o desenho:**
- M5 fecha o F-PP-5 (a): tarifa e data só existem no relatório (M11).
- M11 traz `TRANSACTION_APPROVAL_DATE`. A resposta do contador ao P2 (data da baixa = pagamento ou liberação) vira
  **escolha de coluna no parser**, e não comportamento novo no F7 (§6).
- **NV que viram fork ou insumo ausente:** se o `external_reference` da **ordem** chega à coluna `EXTERNAL_REFERENCE`,
  e se `SOURCE_ID` é o `PAY01…` da Orders ou um id numérico (F-PPB-1); `identification.type = "CNPJ"` no boleto
  (§7); se o `ts` muda em cada retentativa (indiferente com F-PP-8 (c)).

## 3. Checklist de comportamentos

Formato: **Pn-k [direto | fork F-…]**. Cada item tem teste próprio. Ordem por PR, se F-PPB-9 → (a).

### PR-1 — Cifra e `PaymentAccount` (a peça que o M2 não tem)

- **P1-1 [direto, F-PP-3 a]** `lib/secretBox.ts` (`node:crypto`, sem dependência nova): `seal(plain, aad, keyring)` →
  `iv(12) ‖ tag(16) ‖ ct`, AES-256-GCM; `open(blob, aad, keyVersion, keyring)`. Keyring lido do env
  `PAYMENT_CREDENTIAL_KEYS` = `"<versão>:<base64 de 32 bytes>[,…]"` + `PAYMENT_CREDENTIAL_KEY_ACTIVE=<versão>`. Chave
  com tamanho ≠ 32 bytes ⇒ erro na carga. Testes: ida e volta; AAD diferente ⇒ falha; byte do ct trocado ⇒ falha;
  versão antiga decifra depois da troca da ativa.
- **P1-2 [direto, F-PP-3 a + instrução do dono]** **Falha fechada sem chave:** sem keyring, gravar ou ler credencial
  dá 503 `payment_credential_key_missing`, sem efeito; o resto da aplicação sobe normalmente. Nada de chave padrão,
  nada de fallback para texto puro. **Pré-condição de deploy do M2** (§6.3): provisionar `PAYMENT_CREDENTIAL_KEYS` no
  env da instância e o backup dela **fora** do backup do `.db` (senão a cifra não protege o dump; ADR §9).
- **P1-3 [direto, PP-D2]** Model `PaymentAccount` (§4.1) + migração aditiva com prólogo `DROP TABLE IF EXISTS`
  (memória `migracao-sqlite-nao-e-transacional`) + `smoke:migration`. `glAccountId` = FK `Restrict` para folha
  `acceptsEntries`, **imutável depois de criada** (o extrato importado aponta para ela; troca de conta = nova
  `PaymentAccount`).
- **P1-4 [direto, F-PP-9 a]** No máximo **uma** `ACTIVE` por (`userId`, `unitId`, `provider`); gate dentro da tx ⇒
  409 `payment_account_already_active`.
- **P1-5 [direto, PP-D2]** `configJson` validado por `z.discriminatedUnion('provider', …)`, com o discriminador
  **declarado** em cada ramo (memória `zod-strip-mata-discriminador-de-plugin`). Ramo `MERCADO_PAGO`:
  `{ provider, credentialSource: 'OWN' }`. `'OAUTH'` fica **declarado no tipo e recusado no DTO** (400
  `credential_source_not_supported`), para a porta não mudar quando o OAuth entrar (F-PP-1 b).
- **P1-6 [direto, F-PP-2 b + PP-D7]** `PUT /api/payment-accounts/:id/credential` `{ accessToken, webhookSecret }`:
  cifra com AAD = `PaymentAccount.id`, grava `credentialKeyVersion` e `credentialSetAt`, e põe `status = ACTIVE`. **Só
  escrita:** a leitura devolve `credentialSetAt` e `accessTokenLast4`. `credentialExpiresAt` fica `null` para `OWN`,
  porque a doc não declara validade (M12). Quando o MP responde 401, a conta vai para `CREDENTIAL_INVALID` (P2-4).
- **P1-7 [direto, PP-D7]** Credencial ausente de log, `AuditEvent`, resposta e `rawJson`. Teste: serializar o payload
  de audit, a resposta e o log capturado e assertar que o token de fixture **não** aparece (invariante 10).
- **P1-8 [direto]** Ciphertext copiado para outra `PaymentAccount` **não** decifra (invariante 11).
- **P1-9 [direto, camadas]** CRUD `POST/GET/PATCH/DELETE /api/payment-accounts` (soft-delete; `PATCH` só `label` e
  `status` `DISABLED`↔`ACTIVE` com o gate P1-4). Route → Controller → Service → Repository → Prisma + Policy
  (`canManagePaymentAccounts` = quem já pode configurar settings contábeis) + Factory + DTO Zod `.strict()`.
  Registro em 2 toques (`index.ts` + `docs.paths.ts`).
- **P1-10 [direto]** Audit: `payment_account.created` / `.updated` / `.credential_set` / `.disabled`, com chaves
  fechadas **sem** campo de credencial (allowlist `auditCanonical.ts`, memória `accounting-audit-allowlist-guards`).

### PR-2 — `CollectionCharge`, adaptador MP, webhook e re-consulta

- **P2-1 [direto, PP-D1]** `CollectionProviderPort` (§4.2) + `MercadoPagoCollectionProvider` (Orders API, F-PP-4 a)
  + `NullCollectionProvider` que **recusa `NODE_ENV=production`** no construtor, como em S14 (invariante 12).
  `capabilities` do MP: `boleto`, `pix`, `webhook`, `cancel`, `releaseReport` = `true`; `interestAndFine`, `protest`,
  `bankRegistration` = `false`; `maxDaysToDue = 30` (M2, M3, M7, M10).
- **P2-2 [direto, PP-D3]** `POST /api/receivables/:id/charges` (`CreateChargeSchema`, §4.3). Numa tx: título
  `RECEIVED`/`CANCELLED` ⇒ 409; outra cobrança viva (`CREATING`/`PENDING`) ⇒ 409; valor = **saldo aberto relido na
  tx**; conta MP `ACTIVE` do escopo (F-PP-9); commit `CREATING`. Fora da tx: `createCharge` com
  `X-Idempotency-Key = ${id}:${attempt}` e `external_reference = id`. Segundo commit: `PENDING` + `providerRef` (order
  id) + `providerPaymentRef` (`PAY01…`, M3) + `instrumentJson`. Invariante 6.
- **P2-3 [direto, PP-D3]** Re-drive: cobrança em `CREATING` há mais de N min é reenviada com **a mesma** chave e não
  nasce 2ª ordem (invariante 5; o adaptador falso assere a chave recebida). Erro definitivo do MP (4xx que não seja
  401/409/429) ⇒ `FAILED` + `failReason`.
- **P2-4 [direto]** 401 do MP em qualquer chamada ⇒ `PaymentAccount.status = CREDENTIAL_INVALID` (audit) e 502
  `provider_credential_invalid` para quem chamou. Quem sai disso é o humano, gravando a credencial de novo (P1-6).
- **P2-5 [direto, PP-D4 + F-PP-8 c]** `POST /api/payment-collection/webhook/:provider/:accountId` na `publicApiRoutes`
  (POST, `prefix`). Sequência: a conta resolve o segredo (inexistente, inativa ou de outro provedor ⇒ 401) →
  `x-signature` pelo template M9, **reconferido na página antes de virar constante**, com comparação em tempo
  constante → `|now − ts| ≤ PAYMENT_WEBHOOK_MAX_AGE_MS = 15 × 86 400 000` → qualquer falha ⇒ **401, zero escrita** →
  re-consulta `getCharge(data.id)` com a credencial da conta → aplica pela **mesma função** do job (P2-7). Responde
  200 em menos de 22 s (M8). Invariantes 1, 2, 4.
- **P2-6 [direto, PP-D4 item 4]** Idempotência por **CAS de status dentro da tx**: `PENDING → PAID` acontece uma vez.
  O teste chama duas vezes e **assere a 2ª** (zero transição, zero audit novo; invariante 3).
- **P2-7 [direto, F-PPB-8 b]** Mapa status MP → `CollectionCharge.status` (M6): `processed/accredited` → `PAID`
  (`paidAt` = instante da re-consulta, porque M5 não traz data de aprovação; é **informativo**, a baixa usa a data do
  relatório) · `expired` → `EXPIRED` · `canceled` → `CANCELLED` · `failed` → `FAILED` · `refunded` → `REFUNDED` ·
  `action_required/*`, `created`, `processing` → continua `PENDING` · `processed/partially_refunded` →
  `PARTIALLY_REFUNDED` · `charged_back/*` → `CHARGED_BACK` (o detalhe `in_process`/`settled`/`reimbursed` fica em
  `providerStatusDetail`). As transições entre `PAID`, `PARTIALLY_REFUNDED`, `CHARGED_BACK` e `REFUNDED` seguem o
  estado atual do MP (CAS na tx); `REFUNDED` é terminal. **Nenhum** desses status tem efeito no razão (P4 do
  contador); a view mostra o aviso. O `status`/`status_detail` cru é gravado em `providerStatus`/`providerStatusDetail` em todos os casos.
- **P2-8 [direto, PP-D5]** Nenhuma transição da cobrança gera `JournalEntry` nem `ReceivableReceipt` (invariante 7:
  teste conta as linhas antes e depois de um webhook `PAID`).
- **P2-9 [direto]** Job `collectionChargePoll` (clone mínimo do `DfePollScheduler`, S15): a cada 15 min, re-consulta
  as `PENDING` (e as `CREATING` velhas, P2-3) e as vencidas (`expiresAt < now`). Cobre webhook perdido. Lock
  process-local (`ponytail:` com teto declarado, como o DFE).
- **P2-10 [direto, M7]** `POST /api/collection-charges/:id/cancel`: só `PENDING`; chama `cancelCharge` com
  `X-Idempotency-Key = ${id}:cancel`; 409 `cannot_cancel_order` do MP ⇒ re-consulta e aplica o estado real (se já foi
  paga, fica `PAID`).
- **P2-11 [direto, F-PP-11 a1]** `GET /api/receivables/:id/charges/payer-suggestion`: devolve o `payerSnapshotJson`
  da última `CollectionCharge` não apagada do mesmo `counterpartyId` do título; se não houver, `{ identification:
  { number: Counterparty.taxId } }` e o resto vazio. Só leitura, sem audit. O DTO de criação recebe o pagador inteiro,
  e o enviado é congelado no snapshot.
- **P2-12 [direto, PP-D1 + memória `param-aceito-e-ignorado-e-bug`]** Pedido que exige capacidade não anunciada
  (juros, multa, desconto, vencimento acima de 30 dias) ⇒ 400 nomeado, nunca aceita e ignora (invariante 13). O DTO
  não tem esses campos; o teste manda o campo e espera 400 do `.strict()`.
- **P2-13 [direto, F-PPB-7 a]** Cancelar `Receivable` com cobrança viva (`CREATING`/`PENDING`) ⇒ 409
  `receivable_has_live_charge`, com gate dentro da tx do cancelamento do AR; nenhuma chamada ao MP dentro dele.
- **P2-14 [direto]** Audit: `collection_charge.created` / `.status_changed` (`from`, `to`, `providerStatus`) /
  `.cancelled` / `.failed`, **sem** pagador (PII; ADR P5) nem instrumento.
- **P2-15 [direto]** `GET /api/receivables/:id/charges` e `GET /api/collection-charges/:id` (view com `instrument`,
  sem credencial); a tela mostra "pago no provedor, aguardando confirmação" a partir de `status = PAID` com o título
  aberto (texto é do FE, nó vizinho).

### PR-3 — Relatório de liberações → extrato → F7

- **P3-1 [direto, PP-D6]** Formato `mp_release` no `importStatement`: parser puro (`lib/mpReleaseReport.ts`) que lê o
  CSV (separador do arquivo, padrão ",", M10) e normaliza para o `{headers, rows}` do `parseLines`. Uma linha por
  `RECORD_TYPE = release`; `initial_available_balance` e `available_balance` viram `openingBalanceCents` e
  `closingBalanceCents` do extrato (controle); `total` é ignorado. `externalRef = EXTERNAL_REFERENCE`;
  `amountCents = NET_CREDIT − NET_DEBIT`; `rawJson` com **todas** as colunas.
- **P3-2 [direto, PP-D6 + ADR-TZ F-TZ1 b]** `DATE` é lido como instante com offset e convertido em dia-calendário de
  `America/Sao_Paulo`. Fixture: `2026-10-01T23:30:00-04:00` ⇒ **2026-10-02** (invariante 8). `grep` de guarda: nenhum
  `slice(0, 10)` no parser.
- **P3-3 [direto, F-PPB-2 a]** Colunas obrigatórias ausentes no arquivo ⇒ 400 `release_report_missing_columns` com a
  lista. A configuração do relatório na conta do cliente é passo do runbook de provisionamento (§6.2); o Luminaris
  **não** escreve na config da conta.
- **P3-4 [direto, F-PPB-4 a]** Faixa sobreposta: arquivo com `SOURCE_ID` + `DESCRIPTION` já importado para a mesma
  `PaymentAccount` ⇒ 400 `release_report_overlap` listando os `SOURCE_ID` repetidos; **nada** é importado
  (invariante 9).
- **P3-5 [direto, PP-D6 + F-PPB-6 a]** Job `mpReleaseReportFetch` (diário, por `PaymentAccount` MP `ACTIVE`): watermark
  `mp_release:<accountId>` no `JobWatermarkRepository`; pede `[watermark, hoje 00:00 BRT)` em UTC (`…Z`, M10),
  fechado-aberto e contíguo; espera o 202, lista, baixa e importa contra `PaymentAccount.glAccountId`. A watermark só
  avança depois do import. O upload manual do CSV continua como válvula (mesmo endpoint de import, `format =
  mp_release`).
- **P3-6 [direto, F-PPB-5 a + F-PPB-1 c]** Scan do F7 sobre extrato de `PaymentAccount`: passo novo **antes** do `pickCandidate`. Linha
  `release` de `DESCRIPTION = payment` cujo `externalRef` é o `id` de uma `CollectionCharge` do escopo **com
  `paymentAccountId` = conta do extrato** ⇒ título exato da cobrança, sem janela e sem valor aproximado
  (F-PP-5 a). Se `EXTERNAL_REFERENCE` não casar, tenta `SOURCE_ID = providerPaymentRef` (F-PPB-1). Em extrato de
  `PaymentAccount` o `pickCandidate` genérico **não** roda: o que não casa fica `UNMATCHED` para o manual
  (F-PPB-5 a). **A ordem das duas chaves é reconferida contra o CSV da sonda (§6.2) antes do merge do PR-3.**
- **P3-7 [direto, F-PP-6 b]** Para a linha casada pelo passo novo: `grossCents = GROSS_AMOUNT`,
  `feeCents = GROSS − NET` (soma das deduções da linha, conferida contra as colunas `*_FEE_AMOUNT` + `TAXES_AMOUNT`;
  diferença ⇒ linha não vira candidata e o scan conta `ambiguous`), `proposedCents = min(gross, saldo)`,
  `chargeCents = max(0, gross − saldo)`. **O shortfall e o stale do F7 (S5) passam a usar o bruto** para itens com
  `feeCents > 0`: o pré-cheque re-deriva com `gross = |linha| + feeCents`. Teste: uma linha líquida de R$ 97,00 com
  tarifa de R$ 3,00 sobre título de R$ 100,00 ⇒ `proposed = 10000`, `charge = 0`, `fee = 300`, **não** parcial.
- **P3-8 [direto, F-PP-6 b]** Confirm com `feeCents > 0`: etapa nova `FEE` depois de `CHARGE`, com
  `postEntry(sourceType = 'provider.fee', sourceId = item.id)`, D `providerFeeExpenseAccountId` / C conta da
  `PaymentAccount`. Idempotente por `(sourceType, sourceId)`; id gravado em `feeEntryId`; `retry` pula a etapa feita.
  Conta não configurada ⇒ 400 `fee_account_not_configured`, sem efeito (molde do `charge_account_not_configured`).
  Código da conta = contador (P3).
- **P3-9 [direto, F-PP-7 a]** Método `ProviderBalance` nos mapas de método do AR e do F7: **não** resolve por código
  fixo. No confirm, o F7 exige que exista `PaymentAccount` `ACTIVE` com `glAccountId = statement.glAccountId` e passa
  essa conta ao `registerReceipt`. `ProviderBalance` fora desse caminho (recibo avulso, extrato de banco) ⇒ 400
  `provider_balance_requires_payment_account`. O recibo grava `debitAccountId` (F-PPB-3 a), e o estorno (`ReceivableService.ts:533`) lança nessa conta quando
  ela não é nula; `null` mantém o mapa fechado de hoje.
- **P3-10 [direto, S6 + S17]** Etapa `MATCH`: as pernas da conta da `PaymentAccount` (recibo a débito, encargo a
  débito, tarifa a **crédito**) fecham a linha líquida. O executor **lê** o gate do `manualMatch` (S17, grau I) e, se
  a soma não for com sinal, isso é insumo ausente: pausa, não conserta o gate por conta própria. Teste: o caso de
  P3-7 termina `CONFIRMED` com a linha `MATCHED`.
- **P3-11 [direto]** `AccountingScopeSettings.providerFeeExpenseAccountId` (FK `Restrict`, folha) + DTO de settings +
  snapshot de shape.
- **P3-12 [direto]** Audit: `bank_settlement.confirmed` ganha `feeCents` e `feeEntryId` (allowlist);
  `payment_account.release_report_imported` (`statementId`, `lineCount`, `fromUtc`, `toUtc`).

### Gates da mudança (pertencem ao checklist)

- `tsc --noEmit` limpo no server; snapshot de shape dos DTOs Zod (`dtoShapeSnapshot`) atualizado na mesma mudança.
- Guard de path-count do openapi + `npm run` do artefato estático (memória `openapi-wiring-static-artifact`).
- Allowlist `auditCanonical.ts` com cada eventType novo (P1-10, P2-14, P3-12).
- Teste da `publicApiRoutes`: `POST` do webhook público; `GET`/`HEAD` do mesmo path continuam 401 (memória
  `critical-auth-bypass-case-sensitive-guard`).
- Migração por PR, aditiva, com prólogo `DROP TABLE IF EXISTS`; `smoke:migration`. A migração do PR-3 **ordena com a
  da emenda 3.3** (S16): quem mergear depois rebaseia a sua (memória `squash-merge-quebra-prs-empilhados`).
- Integração com `--runInBand` (memória `integration-suite-precisa-de-runinband`).
- Paridade i18n pt/en: **não se aplica** (BE-only; as mensagens de erro do server são pt, como as do F7).

## 4. Contratos (esboço materializável)

### 4.1 Prisma

```prisma
model PaymentAccount {           // PR-1 — PP-D2; tenancy AccountingScope; soft-delete
  id                   String    @id @default(cuid())
  userId               String
  unitId               String
  provider             String    // PAYMENT_PROVIDERS = ['MERCADO_PAGO'] (BANK_CNAB entra com o 2º adaptador)
  label                String
  glAccountId          String    // FK Account folha, Restrict — IMUTÁVEL (P1-3)
  glAccount            Account   @relation("PaymentAccountGl", fields: [glAccountId], references: [id], onDelete: Restrict)
  providerAccountRef   String?   // MP: user_id do vendedor (informativo; nunca roteia — PP-D4 item 1)
  configJson           String    // discriminatedUnion('provider') — P1-5
  credentialCiphertext Bytes?    // iv ‖ tag ‖ ct; AAD = id (P1-1/P1-8)
  credentialKeyVersion Int?
  credentialSetAt      DateTime?
  accessTokenLast4     String?   // única projeção legível (PP-D7)
  status               String    // DRAFT | ACTIVE | CREDENTIAL_INVALID | DISABLED
  createdById          String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  deletedAt            DateTime?
  charges              CollectionCharge[]
  @@index([userId, unitId, provider, status])
  @@map("payment_accounts")
}

model CollectionCharge {         // PR-2 — PP-D3; sem efeito no razão
  id                   String    @id @default(cuid())          // = external_reference
  userId               String
  unitId               String
  paymentAccountId     String
  paymentAccount       PaymentAccount @relation(fields: [paymentAccountId], references: [id], onDelete: Restrict)
  receivableId         String
  receivable           Receivable @relation(fields: [receivableId], references: [id], onDelete: Restrict)
  counterpartyId       String?   // copiado do título na criação — chave da sugestão (P2-11)
  kind                 String    // BOLETO | PIX
  amountCents          BigInt
  expiresAt            DateTime
  attempt              Int       @default(1)
  providerRef          String?   // ORD…
  providerPaymentRef   String?   // PAY01… (M3)
  providerStatus       String?   // cru (M6)
  providerStatusDetail String?
  status               String    // CREATING | PENDING | PAID | PARTIALLY_REFUNDED | CHARGED_BACK | REFUNDED | EXPIRED | CANCELLED | FAILED (F-PPB-8 b)
  paidAt               DateTime? // instante da re-consulta que viu accredited — informativo (P2-7)
  payerSnapshotJson    String    // PII — fora do AuditEvent
  instrumentJson       String?
  failReason           String?
  createdById          String?
  cancelledById        String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  deletedAt            DateTime?
  @@unique([paymentAccountId, providerRef])
  @@index([userId, unitId, receivableId, status])
  @@index([userId, unitId, counterpartyId, createdAt])
  @@map("collection_charges")
}

// PR-3 — acréscimos (ALTER aditivo; ordenar com a emenda 3.3, S16)
model BankSettlementItem       { /* … */ feeCents BigInt @default(0)  feeEntryId String? }
model AccountingScopeSettings  { /* … */ providerFeeExpenseAccountId String? /* FK Account, Restrict */ }
model ReceivableReceipt        { /* … */ debitAccountId String? }   // F-PPB-3 a — null = mapa fechado (legado)
```

### 4.2 Porta (ADR §5, com os ajustes da ratificação)

```ts
export type ChargeKind = 'BOLETO' | 'PIX';
export type CredentialSource = 'OWN' | 'OAUTH';              // F-PP-1 b — 'OAUTH' recusado no DTO (P1-5)

export interface ResolvedAccount {                           // decifrada só em memória, no serviço
  id: string; credentialSource: CredentialSource;
  credential: { accessToken: string; webhookSecret: string };
}

export interface CreateChargeInput {
  idempotencyKey: string;                                    // `${charge.id}:${attempt}`
  externalReference: string;                                 // charge.id
  kind: ChargeKind;
  amountCents: bigint;                                       // o adaptador formata "123.45" (M1) sem float
  expiresIn: string;                                         // ISO 8601: P{1..30}D boleto · PT30M..P30D Pix
  payer: PayerInput;                                         // §4.3
  description: string;
}

export interface ChargeResult {
  providerStatus: string; providerStatusDetail: string;      // cru (M6)
  providerRef: string; providerPaymentRef?: string;
  instrument?: { digitableLine?: string; barcode?: string; qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };
}

export interface CollectionProviderPort {
  readonly name: 'MERCADO_PAGO' | 'NULL';
  readonly capabilities: CollectionCapabilities;            // ADR §5
  createCharge(account: ResolvedAccount, input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(account: ResolvedAccount, providerRef: string): Promise<ChargeResult>;
  cancelCharge(account: ResolvedAccount, providerRef: string, idempotencyKey: string): Promise<ChargeResult>;
  verifyWebhook(req: WebhookRequest, secret: string, now: Date):
    { ok: true; resourceRef: string } | { ok: false; reason: 'signature' | 'replay_window' | 'malformed' };
  requestReleaseReport(account: ResolvedAccount, range: { fromUtc: string; toUtc: string }): Promise<void>;   // 202
  listReleaseReports(account: ResolvedAccount): Promise<Array<{ fileName: string; beginDate: string; endDate: string }>>;
  downloadReleaseReport(account: ResolvedAccount, fileName: string): Promise<Buffer>;
}

// Mapa fechado M6 → status (P2-7). Desconhecido ⇒ PENDING + log warn (nunca PAID por default).
export const MP_STATUS_MAP: Record<string, CollectionChargeStatus | ((detail: string) => CollectionChargeStatus)>;
```

### 4.3 DTOs (`.strict()`)

```ts
const AddressSchema = z.object({
  streetName: z.string().min(1), streetNumber: z.string().min(1), zipCode: z.string().regex(/^\d{8}$/),
  neighborhood: z.string().min(1), city: z.string().min(1), state: z.string().regex(/^[A-Z]{2}$/),
}).strict();

export const PayerSchema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(),
  identification: z.object({ type: z.enum(['CPF', 'CNPJ']), number: z.string().regex(/^\d{11}$|^\d{14}$/) }).strict(),
  address: AddressSchema.optional(),                          // obrigatório se kind = BOLETO (refine no serviço → 400)
}).strict();

export const CreateChargeSchema = z.object({
  kind: z.enum(['BOLETO', 'PIX']),
  expiresInDays: z.number().int().min(1).max(30).optional(),            // só BOLETO (M2); default no serviço = omitido (MP: 3 dias úteis)
  expiresInMinutes: z.number().int().min(30).max(43_200).optional(),    // só PIX (M4); default no serviço = omitido (MP: 24 h)
  payer: PayerSchema,
}).strict();
// Campo do tipo errado para o kind (expiresInMinutes num BOLETO) ⇒ 400, nunca ignorado.
// Sem default no schema (memória zod4-partial-aplica-default-reseta-campo).

export const CreatePaymentAccountSchema = z.object({
  provider: z.literal('MERCADO_PAGO'), label: z.string().min(1).max(80), glAccountId: z.string().min(1),
  config: z.discriminatedUnion('provider', [
    z.object({ provider: z.literal('MERCADO_PAGO'), credentialSource: z.literal('OWN') }).strict(),
  ]),
}).strict();

export const SetCredentialSchema = z.object({
  accessToken: z.string().min(20), webhookSecret: z.string().min(16),
}).strict();
```

### 4.4 Lançamentos (PR-3)

| Etapa | Débito | Crédito | `sourceType` |
|---|---|---|---|
| SETTLE (`registerReceipt`, `method = ProviderBalance`) | conta da `PaymentAccount` — `proposedCents` | 1.1.5 Clientes — `proposedCents` | `ar.receipt` (existente) |
| CHARGE (se `chargeCents > 0`) | conta da `PaymentAccount` | encargo recebido (F7/3.3) | `bank.charge` (existente) |
| FEE (se `feeCents > 0`) | `providerFeeExpenseAccountId` | conta da `PaymentAccount` — `feeCents` | `provider.fee` (novo) |

Conferência: `proposed + charge − fee = |linha líquida|` (P3-10).

### 4.5 Env (pré-condição de deploy, §6.3)

```
PAYMENT_CREDENTIAL_KEYS="1:<base64 32 bytes>"     # M2 provisiona; backup separado do backup do .db
PAYMENT_CREDENTIAL_KEY_ACTIVE=1
```

## 5. Forks — RATIFICADOS 2026-10-02

### 5.1 Resultado ([cédula](../plano/decisoes/D-2026-10-02-PAYMENT-PROVIDER-FORKS.md), rodadas 4–6)

| Fork | Decisão | Itens |
|---|---|---|
| F-PPB-1 | ✅ **(c)** duas chaves + **PR-3 bloqueado até a sonda de colunas** em produção (PR-1 + PR-2 implantados) — divergente | P3-6, §6.2, §9 |
| F-PPB-2 | ✅ (a) runbook + 400 | P3-3, §6.2 |
| F-PPB-3 | ✅ (a) `debitAccountId` no recibo | P3-9, §4.1 |
| F-PPB-4 | ✅ (a) rejeita o arquivo | P3-4 |
| F-PPB-5 | ✅ (a) só o passo novo | P3-6 |
| F-PPB-6 | ✅ (a) job diário + upload | P3-5 |
| F-PPB-7 | ✅ (a) 409 | P2-13 |
| F-PPB-8 | ✅ **(b)** status `PARTIALLY_REFUNDED` / `CHARGED_BACK` — divergente | P2-7, §4.1 |
| F-PPB-9 | ✅ (a) 3 PRs seriais | §9 |

### 5.2 Tabela original (mantida como foi proposta)


| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-PPB-1** | Chave de casamento da linha do relatório com a cobrança (o casamento por `EXTERNAL_REFERENCE` é NV para a Orders) | **(a)** só `EXTERNAL_REFERENCE = charge.id`; sem ela, a linha não casa pelo passo novo · **(b)** (a) + fallback `SOURCE_ID = providerPaymentRef` · **(c)** (b) + bloquear o merge do PR-3 até o runbook de produção (§6.2) provar qual coluna chega | **(b)**, sem bloquear. M11 só garante `EXTERNAL_REFERENCE` para "external integration" e descreve `SOURCE_ID` como "ID of a Payment"; nenhum dos dois foi provado para a Orders. Gravar as duas chaves custa uma comparação. A prova vem no runbook (M13: em teste o relatório sai vazio). Linha que não casa por nenhuma das duas fica `UNMATCHED` (manual), nunca vira candidata errada (F-PPB-5) |
| **F-PPB-2** | Quem configura o relatório na conta MP do cliente (`columns`, `display_timezone`) | **(a)** runbook humano no provisionamento; o parser exige as colunas e recusa com 400 listando as faltantes (P3-3) · **(b)** o job faz `PUT /v1/account/release_report/config` | **(a).** A configuração vale para a conta inteira do cliente, inclusive e-mails e agendamento (M10); o Luminaris escrever nela é efeito fora do próprio dado. Com (a), um relatório mal configurado falha alto no import |
| **F-PPB-3** | Onde fica a conta de débito de um recibo `ProviderBalance` (o estorno re-resolve pelo método, S8 `:533`) | **(a)** coluna `debitAccountId` em `receivable_receipts` (null = mapa fechado, legado), usada no registro e no estorno · **(b)** o recibo guarda `paymentAccountId` e o estorno resolve por `PaymentAccount.glAccountId` (depende da imutabilidade do P1-3) | **(a).** O estorno lança na conta em que o registro lançou, sem depender de outra entidade continuar igual. ALTER aditivo numa tabela do AR |
| **F-PPB-4** | Arquivo com faixa sobreposta (PP-D6 deixou a escolha para o BRIEF) | **(a)** rejeitar o arquivo inteiro: 400 `release_report_overlap` com os `SOURCE_ID` repetidos · **(b)** pular as linhas repetidas e importar o resto | **(a).** O job só pede faixas disjuntas (P3-5), então sobreposição é erro humano no upload manual. Pular linha deixaria o saldo de controle (`opening/closing`) incoerente com as linhas importadas |
| **F-PPB-5** | O `pickCandidate` genérico roda em extrato de `PaymentAccount`? | **(a)** não: em extrato de `PaymentAccount` só o passo novo propõe; o resto (refund, chargeback, tax withholding, payout, pagamento sem cobrança) fica `UNMATCHED` para o manual · **(b)** sim, depois do passo novo | **(a).** A linha é líquida: o genérico veria R$ 97 contra um título de R$ 100 e proporia parcial. Linha negativa (refund/chargeback) viraria candidata a **AP** (S4). O tratamento contábil de estorno e chargeback é pergunta P4 do contador |
| **F-PPB-6** | Quem dispara a busca do relatório | **(a)** job diário automático (P3-5) + upload manual · **(b)** só um botão "buscar relatório" por conta | **(a).** É o caminho do ADR (PP-D6). O job só **importa**: a baixa continua no confirm humano (resposta 20) |
| **F-PPB-7** | Cancelar `Receivable` com cobrança viva | **(a)** 409 `receivable_has_live_charge`: o humano cancela a cobrança antes · **(b)** cancelar o título cancela a cobrança no MP | **(a).** Não põe chamada externa dentro do protocolo de cancelamento do AR (classe `efeito-irreversivel-antes-do-gate-autoritativo`), e o gate é dentro da tx do cancelamento |
| **F-PPB-8** | Status `processed/partially_refunded` e `charged_back/*` (M6) | **(a)** a cobrança fica `PAID`, com o cru em `providerStatus*` e um aviso na view; nenhum efeito no razão até o P4 do contador · **(b)** status novos `PARTIALLY_REFUNDED` / `CHARGED_BACK` na máquina | **(a).** Sem tratamento contábil decidido (P4), status novo não teria consumidor. O dinheiro aparece no relatório como linha negativa e fica `UNMATCHED` (F-PPB-5 a) |
| **F-PPB-9** | Fatiamento | **(a)** 3 PRs seriais: PR-1 cifra + `PaymentAccount` → PR-2 cobrança + MP + webhook + job → PR-3 relatório + F7 · **(b)** 1 PR | **(a).** O PR-1 é independente e destrava o ponto do M2. O PR-3 coordena a migração com a emenda 3.3 (S16) e pode esperar por ela sem travar os outros dois |

## 6. Pendente de validação externa (não entra no checklist como decidido)

### 6.1 Contador (ADR §7.1)

| # | Pergunta | Onde bate no BRIEF |
|---|---|---|
| P1 | Código e nome da folha do saldo no MP (instituição de pagamento); "a liberar" × "disponível" | `PaymentAccount.glAccountId` (o humano escolhe a folha; o BRIEF não cria conta no fixture) |
| P2 | Data da baixa: pagamento ou liberação? | P3-1. **Achado novo (M11):** o relatório traz `TRANSACTION_APPROVAL_DATE`. Se o contador disser "pagamento", o parser lê essa coluna para `date`, sem comportamento novo no F7. Default até a resposta: `DATE` (liberação), como ratificado no F-PP-5 (a) |
| P3 | Conta da tarifa; `TAXES_AMOUNT` é retenção? | `providerFeeExpenseAccountId` (P3-8, P3-11). O BRIEF soma `TAXES_AMOUNT` no `feeCents` (P3-7) até a resposta; se for retenção recuperável, muda a conta de destino dessa parcela |
| P4 | Estorno e chargeback | F-PPB-5, F-PPB-8 (ficam no manual) |
| P5 | Base LGPD para enviar CPF e endereço ao MP | `payerSnapshotJson` (P2-2, P2-11) |

### 6.2 Gates humanos (runbook; o agente prepara em branco, não preenche, não assina)

- **Conta MP do 1º cliente:** PJ, **chave Pix cadastrada** (M4), aplicação própria criada no painel (F-PP-1 b),
  webhook de produção apontando para `https://<instância>/api/payment-collection/webhook/MERCADO_PAGO/<accountId>`
  (M8), relatório configurado com as colunas exigidas (F-PPB-2 a).
- **Sonda de colunas — gate do merge do PR-3 (F-PPB-1 c):** com PR-1 + PR-2 implantados no M2, uma cobrança Pix
  real de valor baixo criada pelo Luminaris (o PR-2 grava `charge.id` e `PAY01…`), paga e liberada; o CSV do
  relatório é baixado **à mão** no painel do MP e colado no runbook. Evidência: em qual coluna aparece o `charge.id`
  (`EXTERNAL_REFERENCE`?) e o `PAY01…` (`SOURCE_ID`?), além de separador, formato decimal e datas. Desfecho em 3
  estados; sem assinatura do dono o PR-3 não mergeia.
- **Prova ponta a ponta** (M13), depois do PR-3: a cobrança seguinte importada pelo job e confirmada no F7, com o CSV
  colado. Formato `docs/operating-manual/RUNBOOK-FORMAT.md`.

### 6.3 Pré-condição de deploy do M2 (instrução do dono: "não invente KMS")

- `PAYMENT_CREDENTIAL_KEYS` e `PAYMENT_CREDENTIAL_KEY_ACTIVE` provisionados no env da instância **antes** de gravar a
  primeira credencial (§4.5). Sem eles, a feature responde 503 e o resto sobe (P1-2).
- O backup da chave fica **separado** do backup do `.db`; os dois juntos anulam a cifra.
- Onde a chave mora além do env (cofre, KMS) **não** é decisão deste BRIEF: é do M2 (ADR-M2 §3 deixou fora de escopo).
  Registrado na nota [M2](../plano/gates/M2.md).

## 7. Insumos ausentes (pausados, não varridos — regra 2)

1. **Soma com sinal no `manualMatch`** (S17): não li o corpo do gate. O executor confirma no PR-3 e, se a soma não
   for com sinal, pausa (P3-10).
2. **`identification.type = "CNPJ"` no boleto da Orders:** a página (M1) mostra `CPF` no exemplo. NV. O DTO aceita
   os dois; se o MP recusar CNPJ, a resposta de erro do MP sobe como `FAILED` com o motivo (P2-3), e o teste de
   sandbox do executor mostra.
3. **Validade do access token da aplicação própria:** a página de credenciais não declara nenhuma (M12). O desenho
   não depende disso (401 ⇒ `CREDENTIAL_INVALID`, P2-4).
4. **`ts` igual ou novo em cada retentativa:** NV; indiferente com a janela de 15 dias (F-PP-8 c).
5. **Valores aceitos em `display_timezone`:** NV; o parser lê o offset do próprio timestamp (P3-2).
6. **Atraso entre a criação manual do relatório (202) e o arquivo aparecer na lista:** não documentado (M10). O job
   tenta de novo no ciclo seguinte sem avançar a watermark (P3-5).

## 8. Achados fora de escopo (não planejados — exigem autorização própria)

- **Tela** (`FE-INCR-PAYMENT-PROVIDER`): cadastro da conta MP, botão "cobrar" no AR com o formulário pré-preenchido
  (P2-11), estado "pago no provedor, aguardando confirmação", upload do CSV. Nó vizinho.
- **Rotação da chave-mestra com recifra em lote** (CLI): o keyring de P1-1 já decifra versões antigas; recifrar tudo
  só se o M2 exigir.
- **OAuth (`credentialSource = 'OAUTH'`)**, broker e `marketplace_fee`: F-PP-1 (a), fora (ADR §11).
- **Pix no balcão** (QR por venda), **adaptador CNAB**, **F6**: ADR §6 e §11.
- **Teste de serviço do `BankSettlementService`** (GAP-MAP N3, cabeçalho do arquivo): o PR-3 acrescenta etapas a um
  serviço sem teste próprio. Os testes do PR-3 cobrem as etapas novas; cobrir as antigas é a lacuna N3, não este nó.

## 9. Ordem para a `sessao-feature` (F-PPB-9 → a; só depois de "executa")

1. PR-1 (P1-1..P1-10). Não depende de nada além do "executa".
2. PR-2 (P2-1..P2-15). Depende do PR-1. Pode ser provado em sandbox com credencial de teste, exceto a parte do
   relatório (M13).
3. **Gate humano:** M2 com PR-1 + PR-2 implantados → sonda de colunas (§6.2), assinada pelo dono (F-PPB-1 c).
4. PR-3 (P3-1..P3-12). Pode ser escrito antes da sonda, mas **só mergeia depois dela**, com a fixture do parser
   trocada pelo CSV real colado. Coordena a ordem da migração com a emenda 3.3.
5. Prova ponta a ponta (§6.2) depois do PR-3: é o oráculo da conciliação.

## 10. Riscos e vieses declarados (T8)

- **Viés de leitura:** toda a §2 veio de WebFetch com resumo por modelo auxiliar. Nomes de campo e faixas podem ter
  sido parafraseados. P2-5 (template) e P2-1 (corpo da ordem) mandam reabrir a página antes de transcrever constante.
- **Prova só em produção:** com o relatório vazio em teste (M13), PR-3 entra com fixture escrita a partir da
  descrição das colunas, não de um CSV real. O primeiro CSV real pode trazer surpresa de formato (separador, decimal,
  aspas). A válvula é o 400 alto do parser (P3-3), e não a importação silenciosa.
- **Cifra com a chave no mesmo host:** protege dump e backup, não root na VPS (ADR §9). Declarado no §6.3.
- **Acoplamento com a emenda 3.3:** as duas mexem no pré-cheque do F7 e em `bank_settlement_items`. Se a 3.3 mergear
  primeiro, P3-7 reescreve o cálculo de shortfall em cima do dela (bruto em vez de linha); se mergear depois, ela
  herda o `feeCents`. Nos dois casos, quem vem depois rebaseia.
- **Viés do agente:** pende para reusar o caminho do F7 já mergeado (que **não** tem teste de serviço, GAP-MAP N3, e
  nunca rodou em produção), mesmo quando isso alonga o PR-3. A alternativa, o webhook criar o item, foi a 1ª resposta
  do dono no F-PP-5; ele voltou para (a) depois do conflito com a doc (M5).
