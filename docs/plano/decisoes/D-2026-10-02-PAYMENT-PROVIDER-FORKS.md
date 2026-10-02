---
id: "D-2026-10-02-PAYMENT-PROVIDER-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Ratificação por questionário: forks F-PP-1..11 do ADR e F-PPB-1..9 do BRIEF de cobrança por provedor (F5, Mercado Pago)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (AskUserQuestion, sessão de ratificação) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-PAYMENT-PROVIDER-FORKS — cédulas da sessão de ratificação

**Estado:** `decided` (F-PP 11/11 · F-PPB 9/9)
**Autorização:** dono, chat, 02/10/2026: *"(1) rodada de ratificação dos 11 forks F-PP do
ADR-INCR-PAYMENT-PROVIDER-COLLECTION por questionário comigo agora; (2) depois, planejar o BRIEF do F5 (Mercado Pago
como 1º adaptador) (dono, 02/10) — sem 'executa'"*. O agente apresentou e o dono decidiu.
**Não é "executa"** (ORCH-006): o [[F5]] ganha autorização de **BRIEF**, não de código.

Documento dos forks: [`ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md`](../../adr/ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md) §8.
BRIEF que nasce desta cédula: [`BE-INCR-PAYMENT-PROVIDER-brief.md`](../../accounting/BE-INCR-PAYMENT-PROVIDER-brief.md).

## Rodada 1 — credencial e API

### F-PP-1 — como a instância obtém a credencial do vendedor (fork destacado)
- **Pergunta:** mostrada a colisão do OAuth de **uma** aplicação de plataforma com a topologia de 1 instância por
  cliente do ADR-M2: `redirect_uri` estática (MP1), segredo do webhook "exclusivo para a sua aplicação" (MP5), webhook
  da Orders API configurado só no painel. Com N instâncias, ou existe um broker central, ou o segredo vai para todas
  as VPS.
- **Opções:** (b) BYOK, credencial própria do cliente, com a porta aceitando `'OWN' | 'OAUTH'` (**recomendada**) ·
  (a) OAuth com broker central · (c) OAuth sem broker (2 premissas NV, Payments API legacy).
- **Resposta literal:** *"(b) BYOK (Recomendado)"* → ✅ (b). **Diverge do dossiê D-3 e da redação da decisão 7**
  ("token por cliente" por OAuth). A colisão foi achado do ADR, e o dono decidiu com ela à vista.

### F-PP-2 — onde vive a credencial
- **Opções:** (b) coluna cifrada na `PaymentAccount` (**recomendada**) · (a) env da instância.
- **Resposta literal:** *"(b) Coluna cifrada (Recomendado)"* → ✅ (b).

### F-PP-3 — mecanismo da cifra em repouso
- **Enquadramento dado (instrução do dono no pedido: "depende do M2 — marque como pré-condição de deploy, não invente
  KMS"):** o código implementa a cifra. A chave-mestra é provisionada pelo M2 no env da instância e vira
  **pré-condição de deploy** do [[M2]].
- **Opções:** (a) AES-256-GCM em `node:crypto`, chave-mestra no env provisionada pelo M2, `keyVersion`, AAD = id
  (**recomendada**) · (b) SQLCipher · (c) adiar a cifra ao M2.
- **Resposta literal:** *"(a) AES-GCM + chave M2 (Recomendado)"* → ✅ (a). Não protege contra root na VPS (declarado
  no ADR §9). Registro colateral, sem decidir nada lá: cumpre metade da condição (b) de reabertura do Emissor Nacional
  ([[D-2026-09-26-EMISSAO-FISCAL-BYOK]] #2).

### F-PP-4 — qual API do MP
- **Opções:** (a) Orders `/v1/orders` (**recomendada**) · (b) Payments `/v1/payments` (legacy).
- **Resposta literal:** *"(a) Orders API (Recomendado)"* → ✅ (a).

## Rodada 2 — baixa, tarifa, conta, replay

### F-PP-5 — por onde a baixa chega ao razão
- **Opções:** (a) só pelo relatório de liberações → extrato → scan do F7 por `external_reference` (**recomendada**) ·
  (b) o webhook `PAID` cria o item do F7 direto (`statementLineId` opcional).
- **Resposta literal (1ª):** *"(b) Webhook cria item F7"*
- **Conflito mostrado antes de registrar:** a referência oficial do `GET /v1/orders/{id}`
  (<https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-api/get-order/get>, lida por
  WebFetch-resumo em 02/10) **não** traz campo de tarifa nem data de aprovação em `transactions.payments[]`, só
  `created_date`/`last_updated_date` na raiz. Com isso, o `feeCents` do F-PP-6 (b) não é conhecível no webhook e não
  há data de pagamento confiável para o `receivedAt`. Os custos próprios do (b) também foram mostrados: rebuild da
  `bank_settlement_items` no SQLite, que a emenda 3.3 também altera, e a unique (linha, título) furada por NULL.
  Opções: volta para (a) (**recomendada**) · (b-híbrido) · (b-puro), que troca o F-PP-6 para (a).
- **Resposta literal (2ª):** *"Volta para (a) (Recomendado)"* → ✅ **(a)**. P2 (data da baixa = liberação ou
  pagamento) continua com o contador.

### F-PP-6 — tarifa retida pelo MP
- **Contexto dado:** coordenação com a emenda 3.3 (`shortfallTreatment = DISCOUNT` lança em 4.3.3 e não serve para
  tarifa; as duas emendas alteram `bank_settlement_items`).
- **Opções:** (b) `feeCents` no item, recibo bruto mais lançamento da tarifa no confirm, conta em
  `AccountingScopeSettings.providerFeeExpenseAccountId` (**recomendada**) · (a) o parser quebra a linha · (c) baixa
  pelo líquido.
- **Resposta literal:** *"(b) feeCents no item (Recomendado)"* → ✅ (b). Código da conta da despesa pendente do
  contador (P3). O shortfall é calculado sobre o **bruto**.

### F-PP-7 — conta contábil e método do recibo
- **Opções:** (a) folha própria e método `ProviderBalance` resolvido pela FK (**recomendada**) · (b) reusar `1.1.1`.
- **Resposta literal:** *"(a) Folha própria (Recomendado)"* → ✅ (a). Código e nome da folha pendentes do contador (P1).

### F-PP-8 — janela de replay
- **Opções:** (c) 15 dias, `PAYMENT_WEBHOOK_MAX_AGE`, em ms (**recomendada**) · (b) 5 min · (a) sem janela.
- **Resposta literal:** *"(c) 15 dias (Recomendado)"* → ✅ (c).

## Rodada 3 — escopo e pagador

### F-PP-9 — contas por escopo
- **Resposta literal:** *"(a) Uma ativa (Recomendado)"* → ✅ (a): no máximo uma ativa por (escopo, provedor), com o
  gate dentro da tx.

### F-PP-10 — gatilho da cobrança
- **Resposta literal:** *"(a) Manual por título (Recomendado)"* → ✅ (a). A reemissão é sempre humana.

### F-PP-11 — dados do pagador
- **Resposta literal (1ª):** *"Como ter preenchimento automatico e ainda poder editar na hora?"* (pedido de
  esclarecimento, não escolha).
- **Pergunta de detalhe:** nos três caminhos o formulário vem pré-preenchido, todo campo é editável e o enviado fica
  congelado no snapshot. Muda só a origem: (a1) a última cobrança do mesmo `Counterparty` mais o `taxId`
  (**recomendada**) · (b) a `Counterparty` ganha e-mail e endereço, com o checkbox "atualizar cadastro" · (a2) (a1)
  mais a linha do CRM por `ref` (chaves de campo variáveis).
- **Resposta literal (2ª):** *"(a1) Última cobrança (Recomendado)"* → ✅ **(a1)**. É um **refino** da opção (a) do ADR:
  o DTO continua recebendo o pagador; o que entra é um endpoint de sugestão que lê a última `CollectionCharge` não
  apagada do mesmo `counterpartyId`.

## Resumo

| Fork | Decisão | Igual à recomendação? |
|---|---|---|
| F-PP-1 | (b) BYOK; porta com `credentialSource: 'OWN' \| 'OAUTH'` | sim |
| F-PP-2 | (b) coluna cifrada na `PaymentAccount` | sim |
| F-PP-3 | (a) AES-256-GCM; chave-mestra no env = **pré-condição de deploy do M2** | sim |
| F-PP-4 | (a) Orders API | sim |
| F-PP-5 | (a) só pelo relatório de liberações (1ª resposta foi (b); voltou após o conflito com a doc) | sim |
| F-PP-6 | (b) `feeCents` no item; conta da tarifa = contador (P3) | sim |
| F-PP-7 | (a) folha própria + `ProviderBalance`; folha = contador (P1) | sim |
| F-PP-8 | (c) janela de 15 dias, em ms | sim |
| F-PP-9 | (a) uma ativa por (escopo, provedor) | sim |
| F-PP-10 | (a) manual por título | sim |
| F-PP-11 | (a1) DTO + sugestão pela última cobrança do mesmo cliente, editável | sim (refino) |

**Viés (T8):** 11/11 terminaram na recomendação. O F-PP-5 só chegou lá depois de o agente mostrar o conflito com a
doc, e o F-PP-11 ganhou um refino. Recomendação aceita em bloco pode ser clique reflexo: o contexto de cada pergunta
listou o que a opção fecha e o custo dela.

## Rodadas 4–6 — forks F-PPB do BRIEF (mesmo dia, depois do PR #469 aberto)

**Autorização:** dono, chat, 02/10/2026: *"ratifica os forks F-PPB-1..9 por questionário"*. Documento dos forks:
[`BE-INCR-PAYMENT-PROVIDER-brief.md`](../../accounting/BE-INCR-PAYMENT-PROVIDER-brief.md) §5. Continua **sem "executa"**.

### F-PPB-1 — chave de casamento da linha do relatório
- **Contexto dado:** a doc oficial não prova, para a Orders API, que o `external_reference` da ordem chega à coluna
  `EXTERNAL_REFERENCE`, nem que `SOURCE_ID` é o `PAY01…`; em teste o relatório sai vazio.
- **Opções:** (b) duas chaves, `EXTERNAL_REFERENCE` com fallback `SOURCE_ID = providerPaymentRef` (**recomendada**) ·
  (a) só `EXTERNAL_REFERENCE` · (c) (b) + o PR-3 só mergeia depois da prova em produção.
- **Resposta literal (1ª):** *"(c) Duas chaves + bloqueio"*
- **Conflito mostrado antes de registrar:** a prova do §6.2 importava e confirmava no F7, que é o próprio PR-3, e a
  ordem ficava circular. Reformulação: **sonda de colunas** em produção com PR-1 + PR-2 implantados (cobrança Pix
  real criada pelo Luminaris, paga e liberada; CSV baixado à mão no painel e colado no runbook). O PR-3 mergeia depois
  dela. Opções: (c) com sonda (**recomendada**) · trocar para (b).
- **Resposta literal (2ª):** *"(c) com sonda de colunas (Recomendado)"* → ✅ **(c) com sonda**, divergente da
  recomendação original (b). O PR-3 passa a esperar o M2 e uma liberação real.

### F-PPB-2 — configuração do relatório na conta do cliente
- **Opções:** (a) runbook humano + 400 com as colunas faltantes (**recomendada**) · (b) o job faz `PUT` na config.
- **Resposta literal:** *"(a) Runbook + 400 (Recomendado)"* → ✅ (a).

### F-PPB-4 — faixa sobreposta
- **Opções:** (a) rejeita o arquivo inteiro (**recomendada**) · (b) pula as repetidas.
- **Resposta literal:** *"(a) Rejeita o arquivo (Recomendado)"* → ✅ (a).

### F-PPB-6 — quem dispara a busca do relatório
- **Opções:** (a) job diário + upload manual (**recomendada**) · (b) só botão.
- **Resposta literal:** *"(a) Job diário + upload (Recomendado)"* → ✅ (a).

### F-PPB-3 — conta de débito do recibo `ProviderBalance`
- **Opções:** (a) coluna `debitAccountId` em `receivable_receipts` (**recomendada**) · (b) `paymentAccountId`.
- **Resposta literal:** *"(a) debitAccountId (Recomendado)"* → ✅ (a).

### F-PPB-5 — `pickCandidate` genérico em extrato de `PaymentAccount`
- **Opções:** (a) só o passo novo; o resto fica no manual (**recomendada**) · (b) o genérico roda também.
- **Resposta literal:** *"(a) Só o passo novo (Recomendado)"* → ✅ (a).

### F-PPB-8 — `partially_refunded` e `charged_back`
- **Opções:** (a) continua `PAID` + aviso (**recomendada**) · (b) status novos na máquina.
- **Resposta literal:** *"(b) Status novos"* → ✅ **(b)**, divergente da recomendação.
- **Checagem antes de registrar (sem conflito):** os status novos não contam como "vivos" (o gate de 1 cobrança viva por
  título olha só `CREATING`/`PENDING`). Continuam sem efeito no razão (PP-D5 e P4 do contador intactos), e a
  máquina segue o estado do MP pelo mapa fechado. Itens do BRIEF ajustados: P2-7 e §4.1.

### F-PPB-7 — cancelar título com cobrança viva
- **Opções:** (a) 409 `receivable_has_live_charge` (**recomendada**) · (b) cancelamento em cascata no MP.
- **Resposta literal:** *"(a) 409 (Recomendado)"* → ✅ (a).

### F-PPB-9 — fatiamento
- **Contexto dado:** com o F-PPB-1 (c), um PR único esperaria a sonda, e a sonda precisa do PR-2 implantado.
- **Opções:** (a) 3 PRs seriais (**recomendada**) · (b) 1 PR.
- **Resposta literal:** *"(a) 3 PRs seriais (Recomendado)"* → ✅ (a): PR-1 → PR-2 → [sonda em produção] → PR-3.

### Resumo F-PPB

| Fork | Decisão | Igual à recomendação? |
|---|---|---|
| F-PPB-1 | (c) duas chaves + PR-3 bloqueado até a **sonda de colunas** em produção | não (escolha do dono, reformulada com sonda para evitar a ordem circular) |
| F-PPB-2 | (a) runbook + 400 | sim |
| F-PPB-3 | (a) `debitAccountId` no recibo | sim |
| F-PPB-4 | (a) rejeita o arquivo | sim |
| F-PPB-5 | (a) só o passo novo | sim |
| F-PPB-6 | (a) job diário + upload | sim |
| F-PPB-7 | (a) 409 | sim |
| F-PPB-8 | (b) status `PARTIALLY_REFUNDED` / `CHARGED_BACK` | não |
| F-PPB-9 | (a) 3 PRs seriais | sim |

**Estado final:** ADR com 11/11 e BRIEF com 9/9 forks ratificados; nenhum fork pendente. Seguem abertos P1–P5 do
contador e os gates humanos (runbook do §6.2, agora com a sonda). Nenhum nó recebeu "executa".
