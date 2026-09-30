# ADR-INCR-PAYMENT-PROVIDER-COLLECTION — Cobrança por provedor de pagamento: uma porta, Mercado Pago como 1º adaptador, remessa CNAB 240 como 2º; Pix de saída bloqueado

- **Data:** 2026-09-29
- **Status:** **Proposed.** Nenhum fork ratificado (§8). **Nenhum código escrito.** BRIEF e código exigem autorização
  nova do dono ("executa"); este documento não a substitui.
- **Autorização (ORCH-006):**
  - **F5:** F-M3, 03/09 (cédula de módulos, C.1 item 16 e §E linha F5: *"ADR-INCR-BANK-OUTBOUND: conta bancária
    como entidade + remessa CNAB 240 + boleto + Pix"*, coluna de sessão = "ADR"). Nota do nó: *"autoriza abrir ADR,
    não código"*.
  - **F6:** F-M3 + resposta 21 da entrevista de 10/09 (*"API separada para Pix"*). Nota do nó: *"só ADR"*.
  - **Re-escopo:** [D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE](../plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md)
    decisão 7, palavras do dono *"F5 = cobrança por provedor"*: MP como 1º adaptador, CNAB depois; F6 bloqueado
    pela liberação do Payouts pelo MP; token por cliente exige cifra em repouso (M2); *"Autorização segue F-M3: só
    ADR"*. Antecedente: [D-2026-09-26-EMISSAO-FISCAL-BYOK](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md),
    "Registradas junto": *"MP agora, banco CNAB depois"*.
  - **Aviso de base:** a decisão de 29/09 e o dossiê estão no PR #440, **aberto** quando este ADR foi escrito. Li
    os dois em `origin/claude/docs-decisoes-2026-09-29` @ `b5398c87`; o código foi lido em `origin/main` @ `9dd690b3`.
- **Nós:** [F5](../plano/nos/F5.md) (re-escopado) e [F6](../plano/nos/F6.md) (bloqueado). Vizinhos:
  [F7](../plano/nos/F7.md) ✅ (baixa por retorno), [FE-INCR-BANK-SETTLEMENT](../plano/nos/FE-INCR-BANK-SETTLEMENT.md),
  [D6](../plano/gates/D6.md) (convênio do banco), [P-IA](../plano/nos/P-IA.md), [M2](../plano/gates/M2.md) (deploy),
  [R9](../plano/decisoes/R9.md) (tabela irmã do F7), [R8](../plano/decisoes/R8.md) (instância = CNPJ raiz).
- **Supersedes:** o nome `ADR-INCR-BANK-OUTBOUND` da cédula 03/09 §E, que nunca foi escrito. Este ADR é ele,
  re-escopado.
- **Related:** [ADR-INCR-DFE-EMISSAO-PARCEIRO](ADR-INCR-DFE-EMISSAO-PARCEIRO.md) (porta + adaptadores, webhook
  público, BYOK por env — D2), [ADR-M2-deploy-topology](ADR-M2-deploy-topology.md) (1 instância por cliente; cifra em
  repouso fora de escopo), [ADR-INCR7-bank-reconciliation](ADR-INCR7-bank-reconciliation.md) (import de extrato),
  [BE-INCR-BANK-SETTLEMENT-brief](../accounting/BE-INCR-BANK-SETTLEMENT-brief.md) (F7),
  [ADR-INCR-AR-accounts-receivable](ADR-INCR-AR-accounts-receivable.md),
  [ADR-INCR-PARTIAL-SETTLEMENT](ADR-INCR-PARTIAL-SETTLEMENT.md),
  [ADR-ACCOUNTING-TIMEZONE-what-is-today](ADR-ACCOUNTING-TIMEZONE-what-is-today.md),
  [ADR-DOMAIN-MOTOR-rejected](ADR-DOMAIN-MOTOR-rejected.md) (Contrato §2.3).
- **Evidência de pesquisa:** [DOSSIE-DECISOES-2026-09-29](../accounting/DOSSIE-DECISOES-2026-09-29.md) §3 (D-3), no
  PR #440. As páginas do MP foram **relidas nesta sessão** (§2); onde não reli, o grau diz.

## TLDR (2 linhas)

Uma porta `CollectionProviderPort` emite boleto ou Pix contra um título do Contas a Receber. O MP é o 1º adaptador; a
remessa CNAB 240 é o 2º, quando houver D6. **Nenhum evento do provedor dá baixa** (resposta 20): o relatório de
liberações do MP entra como extrato, e a baixa segue o caminho do F7 (proposta, depois confirmação humana).

**Risco principal:** a topologia "1 instância por cliente" (ADR-M2) colide com o OAuth de **uma** aplicação de
plataforma. A `redirect_uri` é estática, o segredo do webhook é um por aplicação e o webhook da Orders API só se
configura no painel. Por isso o F-PP-1 recomenda **credencial própria do cliente**, e não o OAuth descrito no dossiê.
A conta de pagamento também precisa de conta contábil e método de recibo próprios: o F7 hoje recusa confirmar
Pix/Boleto em conta que não seja `1.1.1 Banco` (`BankSettlementService.ts:447-450`).

---

## 1. Contexto e objetivo

A cédula de 03/09 autorizou abrir o ADR de "conta bancária como entidade + remessa CNAB 240 + boleto + Pix" (F-M3,
contra a recomendação). O nó ficou `blocked` pelo dado externo D6 (convênio e leiaute do banco do 1º cliente). Em
26/09 o dono decidiu cobrar primeiro pelo Mercado Pago e deixar banco/CNAB para depois; em 29/09 fixou o re-escopo
(decisão 7).

**Objetivo (T1):** o 1º cliente (Simples Nacional, São Paulo capital, com IE, venda de balcão) cobra os títulos do
Contas a Receber por boleto ou Pix **sem convênio bancário**, e o dinheiro recebido chega ao razão pela mesma trilha
auditável do F7. Não estão no objetivo: maquininha, Pix no balcão (QR por venda), cobrança recorrente, Pix de saída.

## 2. Fatos do provedor (doc oficial do MP, relida em 29/09)

Grau: **V** = lido nesta sessão na página oficial · **V\*** = lido pelo dossiê de 29/09 e não relido aqui ·
**S** = fonte secundária · **NV** = não verificado. Li as páginas pelo WebFetch, que devolve um **resumo feito por
modelo auxiliar**; trechos entre aspas vêm desse resumo, não de cópia manual (viés declarado no §9).

Prefixo das URLs: `https://www.mercadopago.com.br/developers`.

| # | Fato | Grau | Fonte |
|---|---|---|---|
| MP1 | OAuth *authorization code*: o código vale **10 min** e o access token **180 dias**. PKCE é opcional (S256 ou plain), ligado na aplicação; com ele ligado, `code_challenge` passa a ser obrigatório. `state` é recomendado, um por tentativa. A `redirect_uri` deve ser **"uma URL estática"** igual à cadastrada. `test_token=true` gera credencial de sandbox | V | `/pt/docs/security/oauth/creation` |
| MP2 | Renovação com `grant_type=refresh_token`: **"cada vez que você renovar o access_token, o refresh_token também vai ser renovado"** (rotação, é preciso gravar de novo). Exige o escopo `offline_access`. Vencidos os 180 dias, refaz-se o fluxo. A validade própria do refresh token não aparece na página (o "refresh 6 meses" do dossiê não foi reconfirmado) | V · validade do refresh: NV | `/pt/docs/security/oauth/renewal` |
| MP3 | Quando o vendedor desautoriza a aplicação, **todos os tokens e grants** são excluídos; existe webhook de autorizar/desautorizar (tópico `mp-connect`) | V | `/pt/docs/security/oauth/management` + página de webhooks |
| MP4 | Assinatura do webhook: header `x-signature` = `ts=…,v1=…`. Template **`id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];`**. `data.id` alfanumérico maiúsculo vira **minúsculo**; valor ausente **sai do template**; HMAC **SHA-256 em hex** com a chave secreta; `ts` em **milissegundos** | V | `/pt/docs/checkout-api-orders/notifications` (e `.md`) |
| MP5 | A chave secreta é **"exclusiva para a sua aplicação"**. URLs de teste e de produção são separadas no painel. Na Payments API, a URL enviada na criação do pagamento **tem prioridade** sobre a do painel | V | `/pt/docs/split-payments/additional-content/your-integrations/notifications/webhooks` (o caminho genérico `/pt/docs/your-integrations/notifications/webhooks` deu 404 em 29/09) |
| MP6 | A notificação espera 200/201 em **22 s**; nova tentativa **a cada 15 min**, com prazo prorrogado depois da 3ª. Cronograma descrito: 0, 15 e 30 min, depois 6 h, 48 h e 96 h (repetido) | V | mesma página de MP5 + `/pt/docs/checkout-pro/payment-notifications` |
| MP7 | O corpo traz **só o id** do recurso; o conteúdo completo exige GET | V | página de MP5 |
| MP8 | **Nenhuma** janela de replay ou tolerância de `ts` documentada | V (ausência nas 3 páginas lidas) | MP4, MP5, MP6 |
| MP9 | A Payments API (`/v1/payments`) aparece como **"legacy"**; a Orders API (`/v1/orders`) cobre Pix e boleto no Brasil | V | `/pt/docs/checkout-api-orders/overview` |
| MP10 | Boleto (Orders): `expiration_time` em duração ISO 8601, de **1 a 30 dias**, padrão **3 dias úteis**. Pago depois do vencimento, **é estornado** para a conta MP do pagador. `X-Idempotency-Key` obrigatório. Exige nome, CPF/CNPJ, e-mail e endereço do pagador. Devolve `ticket_url`, `barcode_content`, `digitable_line`. Na Payments API: padrão "3 dias", mesma faixa | V | `/pt/docs/checkout-api-orders/payment-integration/boleto`; `/pt/docs/checkout-api-payments/integration-configuration/other-payment-methods` |
| MP11 | Juros, multa, desconto, protesto, registro bancário, baixa ou alteração de vencimento e vencimento acima de 30 dias: **nenhum campo** na documentação do boleto | V (ausência nas 2 páginas de MP10) + V\* (dossiê D-3) | MP10 |
| MP12 | Pix (Orders): `expiration_time` de **30 min a 30 dias**, padrão **24 h**. **"é necessário ter as chaves Pix cadastradas"**. `external_reference` é obrigatório, `X-Idempotency-Key` também. Devolve `qr_code`, `qr_code_base64`, `ticket_url` | V | `/pt/docs/checkout-api-orders/payment-integration/pix`; `/pt/docs/checkout-api-payments/integration-configuration/integrate-pix` |
| MP13 | Relatório de liberações por API: `/v1/account/release_report` (config, criação manual, lista, download, agendamento). A criação manual recebe datas em **UTC** (`…Z`) e responde **202** (assíncrono). `display_timezone` tem padrão **"GMT-04"**. Formato CSV; XLSX só no dossiê | V · XLSX: V\* | `/en/docs/reports/released-money/api` |
| MP14 | Colunas: `DATE` (instante em que a transação **afeta o saldo disponível**, `yyyy-MM-dd'T'HH:mm:ssZ`), `SOURCE_ID` (id da transação no MP), `EXTERNAL_REFERENCE` (referência do lojista, pode vir vazia), `RECORD_TYPE`, `DESCRIPTION` (payment, refund, chargeback…), `NET_CREDIT_AMOUNT`, `NET_DEBIT_AMOUNT`, `GROSS_AMOUNT`, `MP_FEE_AMOUNT`, `FINANCING_FEE_AMOUNT`, `SHIPPING_FEE_AMOUNT`, `TAXES_AMOUNT`, `BALANCE_AMOUNT` | V | `/en/docs/checkout-api-payments/additional-content/reports/released-money/report-fields` |
| MP15 | Em conta de teste o relatório sai vazio | V\* | dossiê D-3 |
| MP16 | Payouts existe. Em produção exige **assinatura Ed25519 do corpo serializado exato**; em teste, um header oficial próprio. No Brasil o contrato é "Transaction Intent" | S | repositório oficial `github.com/mercadopago/mercadopago-claude-marketplace`, `plugins/mercadopago/skills/mp-integrate/SKILL.md` |
| MP17 | A chave Ed25519 precisa ser aprovada pelo time de integrações do MP, e não há OAuth documentado para operar Payouts em nome de terceiro | V\* | dossiê D-3 / fatos do dono 29/09 |
| MP18 | Se o Payouts é liberado para lojista comum | NV | dossiê §10 |

## 3. Evidência de código (CBM-001: lido em `origin/main` @ `9dd690b3`)

| Fato | Onde | Consequência para este ADR |
|---|---|---|
| Não existe entidade de conta bancária ou de pagamento. O extrato aponta direto para a conta contábil (`BankStatement.glAccountId`, "bank GL account… (D4)") | `schema.prisma:744-748` | a `PaymentAccount` (PP-D2) é nova; ela carrega a FK que o extrato já usa |
| O import de extrato só escolhe **qual parser** chamar (`ofx` / `cnab` / tabela) e passa todos pelo mesmo `parseLines`; é idempotente por `sha256` | `ReconciliationService.ts:82-113` | o relatório do MP entra como mais um parser, sem gate novo (PP-D6) |
| `lib/cnab.ts` lê **extrato** (registro 3, segmento E); não existe parser de retorno de cobrança (T/U) | BRIEF F7 §0.1 | o retorno de cobrança é trabalho do adaptador CNAB (§6) |
| `BankSettlementItem.origin` = `'STATEMENT_LINE'`, com `'CNAB_RETURN'` **"reservado para quando F5 existir"**; `statementLineId` é obrigatório | `schema.prisma:1548-1556` | o F7 já previu o F5; o caminho recomendado (F-PP-5 a) não mexe nessa chave |
| A confirmação do F7 recebe `method` e exige `resolvePaymentMethodAccount(method)` == conta do extrato; se não, `method_account_mismatch`. `receivedAt` = data da linha | `BankSettlementService.ts:319`, `:447-450` | extrato importado contra uma conta do MP **não confirma** com Pix/Boleto hoje (F-PP-7) |
| Mapa fechado método → conta: Pix/TED/Boleto → `1.1.1 Banco`; Cash → `1.1.3 Caixa`. Método desconhecido é rejeitado | `Receivable.model.ts:60-72`, `Payable.model.ts:102-114` | mesma causa do item anterior |
| Plano do salão: `1.1.1 Banco`, `1.1.4 A Receber Cartão / Adquirente`, `1.1.5 Clientes a Receber`. Não há conta de tarifa de meio de pagamento | `ChartOfAccountsFixture.ts:22-41` | conta do saldo MP e conta da tarifa são pendência do contador (§7.1) |
| Regra de candidatura do F7: `\|linha\| < saldo` = baixa **parcial**; excedente = encargo, com teto | BRIEF F7 §1 item 3 | uma linha **líquida de tarifa** deixaria a tarifa como saldo aberto do título (F-PP-6) |
| `Counterparty` só tem `taxId` opcional: sem e-mail, sem endereço | `schema.prisma:1190-1199` | o boleto exige os dois (MP10) → F-PP-11 |
| Precedente de porta: `DfeEmissorPort` declara `capabilities` e `verifyWebhook(headers, rawBody)`. O webhook é público (`publicApiRoutes`), inválido ⇒ 401 sem efeito, e o corpo **só acorda** a re-consulta | `DfeEmissorPort.ts:56-116`; `FiscalDocumentLifecycleService.ts:303-339`; `middleware/auth.ts:36`; `app.ts:47-54` (`rawBody`) | reuso do **padrão**, não do tipo (§4 PP-D1) |
| Nenhuma cifra de dado em repouso no servidor: `git grep createCipheriv\|createDecipheriv\|aes-256` em `server/src` = 0 | busca em `origin/main` | a cifra é peça nova (F-PP-3) |
| ADR-M2 §3: cifra em repouso (KMS) *"FORA de escopo desta decisão"*; todo segredo mora no env da instância | `ADR-M2-deploy-topology.md:38-42, :54` | este ADR propõe a cifra; ratificar o F-PP-3 fecha esse ponto do M2 |

## 4. Decisões fixadas (decorrem de decisão do dono ou de precedente ratificado; não são forks)

Prefixo `PP-` para não confundir com os gates `D5`/`D6` do vault nem com as decisões `D1..D8` do ADR do DFE.

### PP-D1 — Uma porta de cobrança e um adaptador por provedor (decisão 7)

`CollectionProviderPort` é porta **de aplicação**, chamada só por serviço ou controller, nunca por plugin, `RuleContext`
ou `DynamicTableService` (Contrato §2.1). Adaptadores: `MercadoPagoCollectionProvider` (1º),
`CnabCollectionProvider` (2º, espera D6) e `NullCollectionProvider` (dev/teste; **recusa `NODE_ENV=production`**,
como o `NullEmissor`). Cada adaptador declara `capabilities`, e o serviço nunca assume uma capacidade que o
adaptador não anuncia. Regra herdada da D-2026-09-26 #3: **um adaptador por protocolo**; o banco é configuração do
adaptador CNAB, não adaptador próprio.

Reuso: a porta **não** reusa o tipo `DfeEmissorPort`. É outro objeto de domínio (Etapa 1 do `_REUSE-CRITERION`), e
a verificação do MP precisa de `query` (`data.id`), coisa que a assinatura `verifyWebhook(headers, rawBody)` não
recebe. Reusa o **padrão**: capabilities, webhook público com 401 sem efeito, re-consulta.

### PP-D2 — `PaymentAccount` é entidade Prisma first-class

Invariante financeiro (Contrato §2.1; cédula 03/09 item 16: *"sem entidade 'conta bancária'"*). Uma entidade serve às
duas espécies: conta de pagamento (MP) e conta bancária (CNAB). Cada `PaymentAccount` aponta para **exatamente uma**
conta contábil folha (`glAccountId`, FK `Restrict`, `acceptsEntries`), e o extrato do provedor é importado contra
ela. Tenancy `userId`+`unitId` (AccountingScope), soft-delete. A configuração específica do provedor fica num
`configJson` validado por `z.discriminatedUnion('provider', …)`, com o discriminador **declarado no schema** (memória
`zod-strip-mata-discriminador-de-plugin`). A credencial é assunto do F-PP-1..3.

### PP-D3 — `CollectionCharge` (cobrança) é entidade Prisma first-class, sem efeito no razão

- Um título (`Receivable`) pode ter N cobranças ao longo do tempo, mas **no máximo uma viva** (`CREATING`/`PENDING`).
  O gate é autoritativo **dentro da tx** (memória `authoritative-gate-inside-tx`).
- Valor = **saldo aberto do título, relido na tx** (a baixa parcial do F3 existe). Título `RECEIVED`/`CANCELLED` ⇒ 409.
- `external_reference` = `charge.id`; `X-Idempotency-Key` = `charge.id:attempt`.
- Ordem: commit `CREATING`, depois a chamada externa, depois commit `PENDING` com o `providerRef`. Se o processo
  cair entre a chamada e o 2º commit, o re-drive usa **a mesma chave** e o MP devolve a mesma ordem (MP10/MP12).
  Classe `efeito-irreversivel-antes-do-gate-autoritativo`: nada vai ao provedor antes do registro local.
- Máquina de estados: `CREATING → PENDING → PAID | EXPIRED | CANCELLED | FAILED`; `PAID → REFUNDED`. **Nenhuma
  transição lança no razão.** Não há `postEntry`, logo o cabeçalho `atomicUntil` do Contrato §2.3 não se aplica à
  cobrança; aplica-se à confirmação do F7, que já o tem.

### PP-D4 — Webhook público, assinatura antes de tudo, corpo nunca transiciona estado

`POST /api/payment-collection/webhook/:provider/:accountId` entra na `publicApiRoutes` **de propósito**, mesmo
desenho do F-DFE-5 (item 28), e nunca como GET (o Express deriva HEAD de GET; memória
`critical-auth-bypass-case-sensitive-guard`). Sequência:

1. O `:accountId` da URL (cadastrada no painel da aplicação) escolhe a `PaymentAccount` e, com ela, **qual segredo**
   verifica a assinatura. Com R8, uma instância pode ter N contas, cada uma com seu segredo; rotear por um campo do
   corpo (`user_id`, NV) exigiria confiar no corpo antes de verificá-lo. Conta inexistente, inativa ou de outro
   provedor ⇒ 401. O id é um `cuid`: enumerá-lo não rende nada sem o segredo.
2. Verifica `x-signature` pelo template MP4 (`data.id` em minúsculo, par ausente removido), com comparação em tempo
   constante. Checa a janela do F-PP-8. Qualquer falha ⇒ **401 sem nenhuma escrita**.
3. Válida ⇒ **re-consulta** o recurso com a credencial da conta (MP7) e aplica o resultado pela **mesma função** do job
   de re-consulta. O corpo não transiciona nada.
4. Idempotência = **CAS de status dentro da tx**: `PENDING → PAID` acontece uma vez; aplicar o mesmo resultado de
   novo não faz nada. A correção não depende de tabela de dedupe.

### PP-D5 — Resposta 20 vale para o provedor: nenhum evento dele liquida título

*"Contas a pagar e a receber NÃO têm baixa automática"* (entrevista de 10/09, resposta 20). Webhook `PAID` muda só a
cobrança; o título fica aberto até a confirmação humana, e a tela mostra "pago no provedor, aguardando
confirmação". A baixa sai do F7: item `PENDING` e `confirm` humano. A liquidação automática por webhook **não é
opção** deste ADR; reabri-la exige decisão do dono contra a resposta 20.

### PP-D6 — O relatório de liberações entra como extrato

- Formato novo no `importStatement` (`mp_release`): parser puro que normaliza para `{headers, rows}` e passa pelo
  mesmo `parseLines`, idempotente por `sha256`, importado contra `PaymentAccount.glAccountId`.
- **Datas:** `DATE` é lido como **instante com offset** e convertido em dia-calendário de `America/Sao_Paulo`
  (ADR-TZ F-TZ1 → b). **Nunca** se recorta o `yyyy-MM-dd` da string (classe `date-only-rendering-utc-shift`, com o
  `display_timezone` padrão GMT-04 de MP13). Exemplo que o BRIEF prova: `2026-10-01T23:30:00-04:00` = 00:30 de 02/10
  em Brasília ⇒ linha com data **2026-10-02**. As datas do pedido de criação vão em UTC (`…Z`, MP13), convertidas do
  dia-calendário de Brasília.
- A linha carrega `externalRef = EXTERNAL_REFERENCE` (= `charge.id`) e, em `rawJson`, as colunas de valor (MP14).
- O caminho normal é o download por API num job, porque o relatório é assíncrono (202). Upload manual do CSV fica
  como válvula.
- **Sobreposição de faixas:** o `sha256` só barra o **mesmo arquivo**. Dois relatórios com faixas sobrepostas têm
  bytes diferentes e duplicariam linhas (o saldo do extrato inflaria, e a 2ª linha do mesmo pagamento ficaria
  `UNMATCHED`). O job pede faixas **contíguas e disjuntas** (fechado-aberto, fim de uma = início da próxima) e o
  import recusa o arquivo que traga um `SOURCE_ID` + `DESCRIPTION` já importado para a mesma `PaymentAccount`
  (rejeitar o arquivo ou pular a linha é escolha do BRIEF; engolir em silêncio, não).

### PP-D7 — A credencial nunca sai

Não entra em log, em payload de `AuditEvent` (a allowlist de `auditCanonical.ts` recebe os eventTypes novos **sem**
campo de credencial; memória `accounting-audit-allowlist-guards`), em resposta de API nem em `rawJson`. Na API o
campo é **só de escrita**; a leitura mostra "configurada em ‹data›" e, no máximo, os 4 últimos caracteres.

### PP-D8 — F6 (Pix de saída) fora deste ciclo

O Payouts depende de gate externo: chave Ed25519 aprovada pelo MP e nenhum OAuth documentado para operar por
terceiro (MP16–MP18). A porta **não** ganha `pagar()`. As condições de reabertura estão no §6.2.

### PP-D9 — O adaptador CNAB herda a porta

Tudo o que o MP não cobre (MP11) fica para ele (§6.1). Nada deste ADR fecha porta para ele: `PaymentAccount` já tem a
espécie bancária, e `BankSettlementItem.origin = 'CNAB_RETURN'` já está reservado.

## 5. Contratos esboçados (materializáveis; não são código)

```prisma
// PP-D2 — conta de pagamento (MP) ou bancária (CNAB). Tenancy AccountingScope; soft-delete.
model PaymentAccount {
  id                   String    @id @default(cuid())
  userId               String    // AccountingScope.ownerUserId
  unitId               String
  provider             String    // MERCADO_PAGO | BANK_CNAB | NULL  (PAYMENT_PROVIDERS)
  label                String
  glAccountId          String    // FK Account folha (acceptsEntries), onDelete: Restrict — o extrato importa contra ela
  providerAccountRef   String?   // MP: user_id do vendedor · CNAB: banco/agência/conta (D6)
  configJson           String    // z.discriminatedUnion('provider', …) — discriminador declarado
  credentialCiphertext Bytes?    // F-PP-2/3: iv ‖ tag ‖ ct (AES-256-GCM, AAD = id); nunca exposto (PP-D7)
  credentialKeyVersion Int?      // rotação da chave-mestra
  credentialSetAt      DateTime?
  credentialExpiresAt  DateTime? // OAuth: now + expires_in · credencial própria: NV (insumo ausente §7.3)
  status               String    // ACTIVE | CREDENTIAL_INVALID | DISABLED
  createdById          String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt
  deletedAt            DateTime?
  @@index([userId, unitId, provider, status])
}

// PP-D3 — uma cobrança emitida contra um título. Sem efeito no razão.
model CollectionCharge {
  id                 String    @id @default(cuid())      // = external_reference no provedor
  userId             String
  unitId             String
  paymentAccountId   String    // FK PaymentAccount, Restrict
  receivableId       String    // FK Receivable, Restrict
  kind               String    // BOLETO | PIX
  amountCents        BigInt    // saldo aberto relido na tx; MAX_CENTS (política, memória max-cents)
  dueDate            DateTime? // date-only (boleto), isValidDateOnly
  expiresAt          DateTime  // instante; derivado da duração ISO 8601 (MP10/MP12)
  attempt            Int       @default(1)                // X-Idempotency-Key = id:attempt
  providerRef        String?   // MP: order id
  providerPaymentRef String?   // MP: payment id (= SOURCE_ID no relatório, MP14)
  status             String    // CREATING | PENDING | PAID | EXPIRED | CANCELLED | REFUNDED | FAILED
  paidAt             DateTime? // instante informado pelo provedor na re-consulta
  payerSnapshotJson  String    // F-PP-11: nome, CPF/CNPJ, e-mail, endereço (PII; fora do AuditEvent)
  instrumentJson     String?   // linha digitável, código de barras, qr_code, ticket_url
  failReason         String?
  createdById        String?
  cancelledById      String?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
  @@unique([paymentAccountId, providerRef])
  @@index([userId, unitId, receivableId, status])
}
// "No máximo 1 viva por título" = gate dentro da tx (PP-D3), não @@unique: o SQLite do Prisma não declara
// índice parcial no schema.
```

```ts
// PP-D1 — a porta. Valores em centavos cruzam como bigint internamente e como string na borda (BigInt-safe).
export type ChargeKind = 'BOLETO' | 'PIX';

export interface CollectionCapabilities {
  boleto: boolean; pix: boolean; webhook: boolean; cancel: boolean;
  releaseReport: boolean;            // MP: true · CNAB: retorno por arquivo
  interestAndFine: boolean;          // MP: false (MP11) · CNAB: true (§6.1)
  protest: boolean; bankRegistration: boolean;
  maxDaysToDue: number | null;       // MP: 30 (MP10)
}

export interface ResolvedAccount {       // credencial decifrada só em memória, no serviço
  id: string; providerAccountRef: string | null; credential: { accessToken: string; webhookSecret: string };
}

export interface CreateChargeInput {
  idempotencyKey: string;               // `${charge.id}:${attempt}`
  externalReference: string;            // charge.id
  kind: ChargeKind;
  amountCents: string;
  expiresIn: string;                    // duração ISO 8601 (P3D, PT30M…)
  payer: { name: string; taxId: string; email?: string; address?: PayerAddress };
  description: string;
}

export interface ChargeResult {
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED' | 'REJECTED';
  providerRef: string; providerPaymentRef?: string;
  paidAt?: string;                      // ISO com offset — nunca date-only
  instrument?: { digitableLine?: string; barcode?: string; qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };
  errors: Array<{ code: string; message: string }>;
}

export interface WebhookRequest { headers: Record<string, string | undefined>; query: Record<string, string | undefined>; rawBody: Buffer }

export interface CollectionProviderPort {
  readonly name: string;
  readonly capabilities: CollectionCapabilities;
  createCharge(account: ResolvedAccount, input: CreateChargeInput): Promise<ChargeResult>;
  getCharge(account: ResolvedAccount, providerRef: string): Promise<ChargeResult>;
  cancelCharge(account: ResolvedAccount, providerRef: string): Promise<ChargeResult>;
  verifyWebhook(req: WebhookRequest, secret: string, now: Date):
    { ok: true; topic: string; resourceRef: string } | { ok: false; reason: 'signature' | 'replay_window' | 'malformed' };
  fetchReleaseReport?(account: ResolvedAccount, range: { fromUtc: string; toUtc: string }): Promise<Buffer>;
}
```

```ts
// Rota do BRIEF (esboço): POST /api/receivables/:id/charges
export const CreateChargeSchema = z.object({
  paymentAccountId: z.string().min(1),
  kind: z.enum(['BOLETO', 'PIX']),
  expiresInDays: z.number().int().min(1).max(30).optional(),       // boleto (MP10); Pix aceita minutos (MP12)
  payer: PayerSchema.optional(),                                     // F-PP-11
}).strict();
```

## 5.1 Fronteira e sequenciamento (para quando houver "executa")

- **Backend primeiro**, como `BE-INCR-*`; a tela é `FE-INCR-*`, nó vizinho.
- Ordem natural: (i) cifra + `PaymentAccount` (a peça que o M2 não tem); (ii) `CollectionCharge` + adaptador MP +
  webhook; (iii) parser `mp_release` + a extensão do F7 que os F-PP-5/6/7 decidirem.
- **Precondição de produção:** webhook exige URL pública HTTPS, logo o 1º deploy (M2). Em teste o relatório sai
  vazio (MP15), então a conciliação só se prova em produção, por runbook humano (§7.2).
- Gates que o diff aciona e entram no checklist do BRIEF: snapshot de shape dos DTOs Zod, paridade i18n pt/en,
  allowlist do `auditCanonical.ts`, guard de path-count do openapi, registro em 2 toques (`index.ts` +
  `docs.paths.ts`), entrada nova na `publicApiRoutes` com teste, migração aditiva com prólogo `DROP TABLE IF EXISTS`
  (memória `migracao-sqlite-nao-e-transacional`) e `smoke:migration`.

## 6. O que fica fora do adaptador MP

### 6.1 Adaptador CNAB (2º; volta com o D6)

- Registro bancário do boleto (convênio, carteira) e **remessa CNAB 240** (segmentos P/Q/R, conferidos no leiaute do
  banco = D6).
- **Retorno de cobrança** (segmentos T/U: ocorrência, valor pago, juros, multa, desconto, tarifa, data de crédito) →
  `BankSettlementItem.origin = 'CNAB_RETURN'` (já reservado); encargo por `chargeCents` (resposta 22: *"o valor do
  encargo chega pelo retorno"*).
- Juros, multa e desconto no título; protesto; instrução de baixa e de alteração de vencimento; vencimento acima de
  30 dias (tudo o que MP11 lista).
- Homologação do arquivo antes de transmitir (resposta 19: *"Ambiente de teste para os arquivos antes"*).
- Leiaute de qualquer banco (F-BANK-1 → b): a aresta pontilhada **F5 → P-IA** é deste adaptador, não do MP, que tem
  relatório estruturado.
- `PaymentAccount` com `provider = BANK_CNAB` guarda banco, agência, conta, convênio e carteira no `configJson`.

### 6.2 F6 — o que precisa ser verdade para reabrir

1. O MP libera a chave Ed25519 para a conta do cliente (ou para uma aplicação Luminaris, **com** OAuth para terceiros
   documentado). Gate externo; ninguém do projeto o fecha.
2. Autorização do dono além de "só ADR".
3. Desenho: saída de dinheiro liquida `Payable`. A resposta 20 vale igual, e o fluxo passa pelo maker-checker
   (ADR-INCR-APPROVAL). A fonte secundária (MP16) descreve Payouts como operação privilegiada, com autorização do
   operador, instrução durável, idempotência persistida e trilha.
4. Caminho alternativo que não depende do MP: API Pix do **banco** do cliente. Volta junto com o D6.

## 7. Pendências

### 7.1 Pendente de validação externa (contador) — **não** entram como decididas

| # | Pergunta | Por que importa | Onde bate |
|---|---|---|---|
| P1 | Em que conta fica o saldo no MP (instituição de pagamento, não banco)? "A liberar" e "disponível" em contas separadas? `1.1.4 A Receber Cartão / Adquirente` serve? | define a folha da `PaymentAccount` | F-PP-7 |
| P2 | A baixa do título é na data do **pagamento** (`paidAt`) ou na da **liberação** (`DATE` do relatório)? | o F7 grava `receivedAt = data da linha` (`BankSettlementService.ts:319`); pelo relatório, sai a data da liberação | F-PP-5 |
| P3 | Conta de despesa da tarifa do MP e tratamento de `TAXES_AMOUNT` (retenção?) | nenhuma conta assim no plano do salão | F-PP-6 |
| P4 | Estorno e chargeback no relatório (`DESCRIPTION` = refund/chargeback) | o F7 não estorna recibo confirmado | insumo do BRIEF |
| P5 | Base legal (LGPD) para mandar CPF/CNPJ e endereço do cliente final ao MP: execução de contrato (art. 7º, V) é **inferência**, não parecer | `payerSnapshotJson` é PII | F-PP-11 |

### 7.2 Gates humanos (runbook; agente prepara em branco, não preenche, não assina)

- **Conta MP do 1º cliente:** PJ, com **chave Pix cadastrada** (MP12). Na opção F-PP-1 (b), a aplicação própria é
  criada no painel no provisionamento do M2 (precedente: cédula 10/09, consequência registrada da resposta 16 — a
  conta do emissor nasce no provisionamento do M2, junto com a instância).
- **Prova da conciliação em produção:** uma cobrança Pix real de valor baixo, paga, liberada e conciliada até o
  confirm do F7, com o CSV colado como evidência (MP15: em teste o relatório sai vazio). Formato
  `docs/operating-manual/RUNBOOK-FORMAT.md`.

### 7.3 Insumos ausentes (declarados, não varridos)

1. Validade do access token de **aplicação própria** (F-PP-1 b): a página de OAuth trata do token obtido por OAuth.
   NV.
2. Se a aplicação do MP aceita **várias** `redirect_uri`. A doc diz "URL estática" no singular. NV; só pesa no
   F-PP-1 (c).
3. Se o `ts` do `x-signature` muda a cada nova tentativa ou mantém o da 1ª. NV; define o F-PP-8.
4. Se a notificação vinda de `notification_url` (Payments API) traz `x-signature`. NV; só pesa no F-PP-1 (c).
5. Valores aceitos em `display_timezone` (dá para pedir "GMT-03"?). NV; o PP-D6 não depende disso, porque lê o offset
   do próprio timestamp.
6. De onde vêm e-mail e endereço do pagador: `Counterparty` não tem; a linha DynamicTable referenciada por `ref`
   talvez tenha. Não conferido; é o F-PP-11.

## 8. FORKS — RATIFICAÇÃO PENDENTE (dono, fork a fork)

| Fork | Caminhos | Recomendação | Custo / risco da recomendação |
|---|---|---|---|
| **F-PP-1 — Como a instância obtém a credencial do vendedor** | **(a)** OAuth com **uma aplicação de plataforma** Luminaris mais um **broker central** que recebe o callback e os webhooks e roteia por `state`/`user_id` para a instância certa · **(b)** **credencial própria do cliente**: o cliente (ou o operador, no provisionamento do M2) cria a aplicação dele no painel do MP e entrega access token de produção e segredo do webhook; o webhook da aplicação dele aponta para a instância dele · **(c)** OAuth de plataforma **sem broker**: cada instância cadastrada como `redirect_uri` (NV, §7.3 item 2) e Payments API "legacy" com `notification_url` por pagamento (assinatura NV, item 4) | **(b)**, com a porta aceitando `credentialSource: 'OWN' \| 'OAUTH'` para o (a) entrar depois sem migração de chave | Não põe componente central numa topologia de 1 instância por cliente (ADR-M2 §2), não espalha o segredo de uma aplicação por N VPS (MP5: segredo "exclusivo para a sua aplicação"), usa a Orders API atual (MP9) e segue R4/D2 do DFE (BYOK). **Custo:** atrito de onboarding (o cliente mexe no painel de desenvolvedor do MP) e validade do token NV. **Diverge do dossiê**, que descreveu o OAuth: a colisão com a topologia não estava no D-3 |
| **F-PP-2 — Onde vive a credencial** | **(a)** env da instância (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`), como o `DFE_PARTNER_API_KEY` · **(b)** coluna cifrada na `PaymentAccount` | **(b)** | A decisão 7 já registra que o token por cliente exige cifra em repouso. O R8 permite filial com conta própria (N contas por instância; o env só comporta uma). O OAuth futuro troca o refresh token a cada renovação (MP2), coisa que env não guarda. **Custo:** peça nova de cifra (F-PP-3) |
| **F-PP-3 — Mecanismo da cifra em repouso** (ponto aberto do M2) | **(a)** AES-256-GCM no nível da aplicação (`node:crypto`): chave-mestra de 32 bytes no env da instância, `keyVersion` por linha para rotação, **AAD = id da linha** (ciphertext copiado para outra linha não decifra) · **(b)** SQLCipher no arquivo SQLite inteiro · **(c)** KMS/Vault externo | **(a)** | Protege dump, backup e cópia do `.db` sem o env; **não** protege contra root na VPS (chave e banco no mesmo host). O (b) troca o driver do Prisma/SQLite (suporte NV) e cifra tudo sem separar segredo de dado. O (c) o ADR-M2 pôs fora de escopo. Ratificar fecha "cifra em repouso" no M2 e cumpre **metade** da condição (b) de reabertura do Emissor Nacional (D-2026-09-26 #2); só registro, não decido nada lá |
| **F-PP-4 — Qual API do MP** | **(a)** Orders (`/v1/orders`) · **(b)** Payments (`/v1/payments`, "legacy") | **(a)**, condicionado ao F-PP-1 ≠ (c) | A Payments API está marcada legacy (MP9). Na (b), o único ganho é o `notification_url` por pagamento, que só importa no F-PP-1 (c) |
| **F-PP-5 — Por onde a baixa chega ao razão** (a resposta 20 vale nos dois) | **(a)** **só pelo relatório de liberações** → extrato (PP-D6) → scan do F7 com um passo novo: `externalRef` = `charge.id` resolve o título exato, sem janela nem valor aproximado → item `PENDING` → confirm humano. O webhook atualiza só a cobrança · **(b)** o webhook `PAID` cria o `BankSettlementItem` direto (`origin = 'PROVIDER_CHARGE'`, `statementLineId` passa a opcional: ALTER numa tabela do F7); a linha do relatório depois casa com o recibo por `ReconciliationMatch` | **(a)** | Um caminho só até o razão; reusa o F7 sem mexer na chave dele e segue a instrução "reusar o relatório de liberações". **Custo:** a baixa espera o relatório (D+1 se agendado por dia) e sai na **data da liberação** (P2). Se o contador responder P2 = data do pagamento, o BRIEF passa `paidAt` da cobrança como `receivedAt`, e isso vira comportamento novo no F7 |
| **F-PP-6 — Tarifa retida pelo MP** (a linha do relatório é líquida; MP14) | **(a)** o parser separa cada linha em `+GROSS` (casa com o título) e `−tarifa` por coluna não zero; a tarifa segue pelo caminho manual que já existe (lançamento + `manualMatch`) · **(b)** o item do F7 ganha `feeCents` (ALTER aditivo) e o confirm registra o recibo **bruto** mais o lançamento da tarifa (D despesa de tarifa / C conta MP), no molde do passo de encargo `chargeCents`, com a conta em `AccountingScopeSettings.providerFeeExpenseAccountId` (campo novo) · **(c)** baixa pelo **líquido**, tarifa como abatimento do título | **(b)** | Um confirm por cobrança, e a linha do extrato continua 1:1 com a linha do relatório (o total do extrato bate com `BALANCE_AMOUNT`). O (a) cria um lançamento manual por cobrança. O (c) deixa a tarifa como saldo aberto (regra de candidatura do F7) ou a trata como desconto ao cliente, o que é pergunta do contador (P3). **Coordenar** com o BRIEF da emenda F7/X4 (encargos e descontos), em curso noutra sessão |
| **F-PP-7 — Conta contábil da `PaymentAccount` e método do recibo** | **(a)** folha **própria** por conta de pagamento, mais um método novo no mapa fechado (`ProviderBalance`) resolvido pela FK da `PaymentAccount`, e não por código fixo · **(b)** reusar `1.1.1 Banco`: o F7 funciona sem mudança, mas o saldo do MP se mistura com o do banco | **(a)**; código e nome da folha vêm do contador (P1) | Hoje o F7 recusa confirmar Pix/Boleto em conta que não seja `1.1.1` (`BankSettlementService.ts:447-450`). No (b), extrato do banco e relatório do MP disputam a mesma conta, e o saldo de nenhum dos dois fecha sozinho |
| **F-PP-8 — Janela de replay do webhook** (MP8: nenhuma documentada) | **(a)** sem janela: vale qualquer assinatura válida (réplica só causa um GET) · **(b)** janela curta (5 min) · **(c)** janela **larga**, constante `PAYMENT_WEBHOOK_MAX_AGE`, padrão **15 dias** | **(c)** | Cobre o cronograma de novas tentativas descrito (MP6: soma ≈ 14 dias, inferido do texto) qualquer que seja a semântica do `ts` (NV, §7.3 item 3). O (b) pode descartar retentativa legítima, se o `ts` for o da 1ª entrega. A idempotência não depende da janela (PP-D4 item 4), que só limita amplificação. O `ts` está em **ms** (MP4), então a comparação é em ms |
| **F-PP-9 — Quantas contas por escopo** | **(a)** no máximo **uma ativa** por (escopo, provedor) · **(b)** N por escopo, com uma padrão | **(a)** | Cobre R8 (filial com conta própria = outro escopo) sem escolha na tela. Promover para (b) depois = soltar o gate, sem migração |
| **F-PP-10 — Quem dispara a cobrança** | **(a)** manual, por título, na tela do Contas a Receber · **(b)** automática quando o título nasce (ex.: CRM `Won` → AR → cobrança) | **(a)** | Mesmo molde do D4 do DFE (gatilho manual no MVP). Boleto vencido **não** se reemite sozinho: o MP estorna o pagamento atrasado (MP10), e a nova cobrança é ação humana. Se ela incluir multa, o valor passa do saldo e cai no encargo do F7 (`chargeCents`, com teto) |
| **F-PP-11 — De onde vêm os dados do pagador** (o boleto exige CPF/CNPJ, e-mail e endereço — MP10) | **(a)** informados no ato da cobrança (DTO), com `taxId` pré-preenchido da `Counterparty`; snapshot na `CollectionCharge` · **(b)** a `Counterparty` ganha e-mail e endereço (ALTER numa tabela do A1) · **(c)** lidos da linha DynamicTable por `Counterparty.ref`, no controller | **(a)** | Não mexe no A1 nem cruza a fronteira do §2.1 dentro de serviço Prisma. O snapshot congela o que foi enviado ao MP (trilha). **Custo:** redigitação quando o cadastro já tem o dado; o FE pode pré-preencher. PII fora do `AuditEvent` (PP-D7, P5) |

## 9. Riscos e vieses nomeados (T8)

- **Viés de leitura:** as páginas do MP vieram por WebFetch com resumo automático. Um detalhe do template (MP4) ou das
  faixas (MP10/MP12) pode ter sido parafraseado. O BRIEF **reabre as páginas** antes de transcrever qualquer constante.
- **Viés de consistência:** o precedente do DFE (BYOK por env, porta com `capabilities`) pode ter pesado demais no
  F-PP-1 (b). A vantagem de UX do OAuth é real quando houver muitos clientes; por isso a recomendação deixa a porta
  aberta para `OAUTH`.
- **Divergência com o dossiê:** o D-3 descreveu o OAuth por vendedor como o caminho, e a decisão 7 herdou isso ("o
  token por cliente"). A colisão com a topologia é achado **desta** sessão (fatos MP1/MP5/MP9 × ADR-M2 §2). Se o dono
  quer o OAuth mesmo assim, o custo é o broker central do F-PP-1 (a).
- **Latência da baixa:** pelo F-PP-5 (a), o dinheiro aparece no razão só depois do relatório. Pode frustrar quem
  espera baixa instantânea. É o preço da resposta 20 com um só caminho.
- **Cifra com a chave no mesmo host:** o F-PP-3 (a) não resiste a root na VPS. O ganho é contra vazamento de
  backup/dump, e está declarado.
- **Base não mergeada:** a decisão 7 está num PR aberto (#440). Se ele mudar antes do merge, este ADR precisa de
  fold.

## 10. Invariantes que o BRIEF herda (cada uma vira teste)

1. Webhook com assinatura inválida, janela vencida, `:accountId` inexistente/inativo ou de outro `:provider` ⇒ **401
   e zero escrita**. Assinatura válida com o segredo de **outra** conta da mesma instância ⇒ 401.
2. Webhook válido cujo corpo diz "aprovado" enquanto o GET diz `pending` ⇒ a cobrança **fica `PENDING`** (o corpo
   nunca transiciona).
3. A mesma notificação duas vezes ⇒ **uma** transição; o teste **assere a 2ª chamada** (classe
   `comentario-de-teste-afirma-o-que-nao-assere`).
4. `data.id` maiúsculo na query ⇒ a assinatura valida depois de passar para minúsculo (fixture com o exemplo da doc,
   MP4); par ausente removido do template.
5. Queda entre a chamada externa e o 2º commit ⇒ o re-drive reenvia **a mesma** `X-Idempotency-Key` (o adaptador
   falso assere a chave) e não nasce 2ª ordem.
6. Título `RECEIVED`/`CANCELLED` ⇒ 409; 2ª cobrança viva para o mesmo título ⇒ 409; valor = saldo **relido na tx**.
7. Webhook `PAID` ⇒ **zero** `JournalEntry` (resposta 20).
8. Linha `2026-10-01T23:30:00-04:00` ⇒ data **2026-10-02** (dia-calendário de Brasília); nenhum `slice(0, 10)` sobre o
   timestamp.
9. Reimportar o mesmo relatório ⇒ idempotente por `sha256` (reuso do INCR-7). Relatório **diferente** com faixa
   sobreposta (mesmo `SOURCE_ID` + `DESCRIPTION` já importado na conta) ⇒ recusado ou linha pulada, **nunca**
   duplicada (PP-D6).
10. Credencial ausente de log, `AuditEvent`, resposta de API e `rawJson` (asserção sobre o payload serializado e
    snapshot da resposta).
11. Ciphertext copiado para outra `PaymentAccount` **não decifra** (AAD = id).
12. `NullCollectionProvider` recusa `NODE_ENV=production`.
13. Capacidade não anunciada (ex.: `interestAndFine` no MP) ⇒ o serviço recusa (400), nunca aceita e ignora (memória
    `param-aceito-e-ignorado-e-bug`).

## 11. Achados fora de escopo (registrados, não planejados — ORCH-006)

- **Pix no balcão** (QR dinâmico por venda) é cobrança de venda, não de título. Cabe na mesma porta, mas precisa de
  autorização própria.
- **Receita por transação** (`marketplace_fee`) só existe com aplicação de plataforma (F-PP-1 a). É decisão de modelo
  comercial.
- **Pix Cobrança do banco** (API Pix do BACEN, cobrança com vencimento, juros e multa) seria um 3º adaptador para quem
  precisa de encargo no Pix. Volta com o D6.
- **Vault:** a aresta pontilhada `F5 → P-IA` pertence ao adaptador CNAB (§6.1). Mover a aresta é fold, não este PR.
- **Vault:** depois do merge deste PR e do #440, o `estado_detalhe` de F5 ("ADR não aberto") precisa de fold para
  "ADR Proposed". Este PR só acrescenta a seção Docs nas notas, para não conflitar com o #440.

## 12. Sinal humano — estado do gate

| Item | Estado |
|---|---|
| ADR | **Proposed**, 29/09 |
| Forks F-PP-1..11 | **todos pendentes**; nenhum se auto-ratifica |
| Pendências do contador P1–P5 | abertas; entram no próximo pedido ao contador (`luminaris-contador-liaison`), se o dono quiser |
| BRIEF / código | **não autorizados** (F-M3: só ADR) |
| F6 | bloqueado por gate externo (§6.2) |
