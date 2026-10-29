# BE-INCR-CNAB-COLLECTION — remessa e retorno CNAB 240 de cobrança, 2º adaptador da porta de cobrança (nó F5) — BRIEF

> Sessão: `sessao-planejamento` · 2026-10-29 · base `origin/main` `455c1a45` (o código citado foi lido em `de43cb51`;
> nenhum arquivo citado mudou entre os dois commits: `git diff --stat de43cb51 455c1a45` vazio nesses caminhos).
> **Sem código.** Saída: este documento e uma seção na nota [F5](../plano/nos/F5.md).
> **Forks F-CNAB-1..9: RATIFICADOS 29/10/2026** pelo dono, no questionário desta sessão (§5.1; cédula
> [D-2026-10-29-CNAB-FORKS](../plano/decisoes/D-2026-10-29-CNAB-FORKS.md)). 8 de 9 seguiram a recomendação.
> **F-CNAB-8 foi para (b), contra a recomendação:** sem teto de multa no código, só aviso na tela. Com isso o BRIEF
> está pronto para a `sessao-feature` sob o `executa` de 29/10. **Ressalva de base:** esse `executa` está no PR #971,
> ainda aberto.

**TL;DR.** O `CnabCollectionProvider` gera a **remessa** CNAB 240 de cobrança (segmentos P, Q e R) a partir das
`CollectionCharge` e lê o **retorno** (segmentos T e U). O formato segue o **Padrão FEBRABAN 240** com um **perfil de
banco declarativo**: tudo o que varia de banco para banco é dado do perfil, não `if` no código. **Nada é transmitido**:
o operador baixa o arquivo e sobe o retorno. O retorno faz duas coisas: muda o **status** da cobrança (como o webhook do
MP) e importa as **liquidações como extrato** de uma conta transitória, onde o scan do F7 propõe a baixa. **A baixa só
sai no confirm humano.**

**Risco principal:** a versão oficial mais nova do leiaute é a **11.0 de 11/09/2026, que se declara "Versão
preliminar"** (§2, L1). Os segmentos P/Q/R/T/U têm as mesmas posições na 10.1 e na 11.0 (L4), então o risco cai no
cabeçalho e nos domínios, e esses ficam no perfil. O 2º risco é contábil: a conta transitória e a data da baixa são
pendências do contador (§6.1).

---

## 0. Contexto fixo (não rediscutir)

- **Item:** adaptador CNAB do nó [F5](../plano/nos/F5.md): `CnabCollectionProvider`, 2º adaptador da
  `CollectionProviderPort` ([ADR-INCR-PAYMENT-PROVIDER-COLLECTION](../adr/ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md)
  PP-D1, PP-D9, §6.1).
- **Autorização (ORCH-006), literal:** dono, chat, 29/10/2026: *"vamos focar em fechar emissão de nota para mei, me e
  simples nacional agora além de fechar tudo do financeiro menos o gate de pagamento"*, mais o questionário, item
  financeiro → **"Só a prova real fora"**: *"Entram os itens 16b/16c do [[F5]] e o adaptador CNAB 240 genérico (sem o
  banco do cliente, [[D6]])"*. A cédula
  [D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO](../plano/decisoes/D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO.md) §2 item 3
  diz: *"adaptador CNAB 240 genérico (`CnabCollectionProvider`, ADR §6) — não tem BRIEF: abre pela
  `sessao-planejamento`, e os forks novos voltam ao dono antes do código"*.
  **Aviso de base:** a cédula está no PR #971, **aberto** quando escrevi (lida em
  `origin/claude/decisao-emissao-simples-financeiro`).
  **Cobertura:** a autorização cobre exatamente este item: o adaptador genérico, sem o banco do cliente. Ela não cobre
  calibrar o banco do D6, transmitir arquivos nem fazer a prova real. É `executa` para o BRIEF inteiro (regra de
  28/10), **depois** de os forks deste BRIEF voltarem ratificados.
- **Herdado do ADR (Accepted 02/10) e do BRIEF do MP, não se reabre:**
  - PP-D1: uma porta, um adaptador por protocolo. O banco é **configuração** do adaptador CNAB, não adaptador próprio
    (D-2026-09-26 #3).
  - PP-D2: `PaymentAccount` serve às duas espécies; a conta bancária entra como `provider = BANK_CNAB`.
  - PP-D3: `CollectionCharge` não lança no razão; no máximo uma viva por título; valor = saldo relido na tx.
  - **PP-D5 / resposta 20:** *"Contas a pagar e a receber NÃO têm baixa automática"*. Nenhum evento do provedor
    liquida título. **O arquivo de retorno é evento do provedor.**
  - F-BAIXA-1 (a): o retorno vira **item pendente** que o humano confirma (cédula 10/09).
  - **Resposta 19:** *"Ambiente de teste para os arquivos antes"* → "Gera e valida sem transmitir".
  - **Resposta 22:** *"O valor do encargo chega pelo retorno"*.
  - F-PP-5 (a), F-PP-6 (b), F-PP-7 (a): **um** caminho até o razão (extrato → scan → confirm), `feeCents` no item do
    F7, folha própria com o método `ProviderBalance`.
- **Escopo = backend** (`BE-INCR-*`). A tela é nó vizinho (§9).

## 1. Estado medido do código (CBM-001: li os arquivos; o grafo não entrou)

| # | Fato | Onde | Grau |
|---|---|---|---|
| S1 | A porta tem `name: 'MERCADO_PAGO' \| 'NULL'`. `createCharge`/`getCharge`/`cancelCharge` são chamadas síncronas ao provedor; `verifyWebhook` e os 3 métodos do relatório de liberações são **obrigatórios** | `collection/CollectionProviderPort.ts:95-105` | V |
| S2 | `CollectionCapabilities` já tem `interestAndFine`, `protest`, `bankRegistration` e `maxDaysToDue` | `CollectionProviderPort.ts:10-20` | V |
| S3 | O serviço da cobrança está preso ao MP: `findActive(scope, 'MERCADO_PAGO', tx)` na criação, `mapMercadoPagoStatus` ao aplicar o resultado e mensagens "Mercado Pago" nos erros | `services/CollectionChargeService.ts:140, :204, :420, :472-487` | V |
| S4 | `applyProviderResult` faz CAS do status dentro da tx, **nunca regride** de PAID para PENDING e, se o provedor diz "pago" depois de um estado terminal, mantém o terminal e loga `collection_charge_paid_after_terminal` | `CollectionChargeService.ts:419-468` | V |
| S5 | A factory resolve o adaptador por `provider`: `MERCADO_PAGO` → MP; qualquer outro → `throw` | `lib/factory.ts` (`providerFor` do `CollectionChargeService` e do `ReleaseReportService`) | V |
| S6 | `PAYMENT_PROVIDERS = ['MERCADO_PAGO']`; o `configJson` é `z.discriminatedUnion('provider', [MercadoPagoConfigSchema])`. O comentário do schema diz "BANK_CNAB entra com o 2º adaptador" | `models/PaymentAccount.model.ts:13`; `dtos/PaymentAccountDto.ts:29`; `schema.prisma:3076` | V |
| S7 | `PaymentAccount` só vira `ACTIVE` gravando credencial (`PUT …/credential`); o `PATCH` só faz `ACTIVE ↔ DISABLED` (decisão do dono de 03/10, "ao pé da letra") | `PaymentAccount.model.ts:5-11` | V |
| S8 | `BankStatement.paymentAccountId` (G1 do PR-3) marca o extrato de provedor; `ReconciliationService` aceita import pré-normalizado (`PreParsedStatementImport`) com `guardInTx` e `afterCreateInTx` | `schema.prisma:934-935`; `ReconciliationService.ts:41-53` | V |
| S9 | No extrato de `PaymentAccount`, o scan do F7 roda **só** `pickProviderCandidate`, que hoje exige `description = payment` do relatório do MP e casa pela cobrança (`externalRef` = `charge.id`, depois `SOURCE_ID`). O título é o exato da cobrança. Cobrança terminal casa **com aviso** (G7) | `BankSettlementService.ts:198-200, :274-317` | V |
| S10 | O item do F7 nasce com `origin: 'STATEMENT_LINE'`. A coluna é `String` e o comentário diz *"'CNAB_RETURN' reservado para quando F5 existir"*. `feeCents`, `shortfallCents`/`shortfallTreatment` (Emenda 3.3) e `chargeCents` já existem | `BankSettlementService.ts:234`; `schema.prisma:2352-2385` | V |
| S11 | O confirm com `ProviderBalance` debita a folha da `PaymentAccount` do extrato (precisa estar ACTIVE e ter a mesma `glAccountId`); tarifa D `providerFeeExpenseAccountId` / C folha; encargo pelo passo `bank.charge` | `BankSettlementService.ts:659-695` | V |
| S12 | `lib/cnab.ts` lê só o **extrato** (registro 3, segmento E): posições fixas, valor por leitura de string (sem `Number`), data DDMMAAAA reordenada (sem `new Date`), recusa CNAB 400 e arquivo com várias contas. **Não lê** T/U nem gera remessa | `server/src/lib/cnab.ts` | V |
| S13 | O DTO do pagador aceita CPF/CNPJ **só numéricos** (`/^\d{11}$\|^\d{14}$/`); o endereço é obrigatório para boleto | `dtos/CollectionChargeDto.ts:28`, `CollectionChargeService.ts:116` | V |
| S14 | `CollectionCharge` não tem `dueDate` (o esboço do ADR §5 tinha); o prazo é `expiresAt` (instante) | `schema.prisma:3106-3140` | V |
| S15 | `ReceivableReceipt` grava a conta de débito (`debitAccountId`) quando o método é `ProviderBalance` (F-PPB-3 a) | `models/Receivable.model.ts:68-73` | V |

## 2. Fatos do leiaute — **documento oficial da FEBRABAN**, lido nesta sessão

Fonte primária: portal FEBRABAN, página "Layouts da Febraban"
(<https://portal.febraban.org.br/pagina/3425/33/pt-br/layout-febraban>). O link "Layout CNAB 240" aponta para
<https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2011_0%20-%202026_09_11.pdf>
(260 páginas; sha256 da cópia baixada hoje `95a67618027784e9b9b4c4a48c8290082c2bb2245db758619a733f80f36204f4`).
Extraí o texto com `pdftotext -layout`. Comparação: cópia **de terceiro** da v10.1 (15/07/2016) hospedada pela Senior
(<https://documentacao.senior.com.br/gestaoempresarialerp/7.0.0/resources/executaveis%20zipados/layout_cnab_240_v10_1.pdf>,
sha256 `68b40317…793b09`). Graus: **V** = lido no PDF hoje · **I** = inferido · **NV** = não verificado.

| # | Fato | Grau | Onde no PDF v11.0 |
|---|---|---|---|
| L1 | Capa: *"Versão 11.0 — 11/09/2026"*. Em §5.2 (Manutenção do Manual), a linha da 11.0 diz: *"Versão preliminar. … Dentro de três semanas, será publicada uma nova versão, contendo ajustes finos residuais."* Em 29/10 o portal ainda lista só esse arquivo | V | p. 1; p. 252 |
| L2 | Mudanças da 11.0: CNPJ passa de numérico a **alfanumérico** ("mantendo tamanho e posição") em B, D, E, G, H, J-52, J-53, K, **Q**, **T**, Y-01 e Y-03; **Split Payment (CBS/IBS)** com os segmentos X-01 a X-11 (na cobrança: **X-03** na remessa e no retorno, **X-04** no retorno); Duplicata Escritural (Y-54, Y-55, Y-56); códigos novos em C004, C044 e C047 | V | p. 252 |
| L3 | A 10.11 é a última versão sem a marca "preliminar". O log dela só registra: header 14.1 do extrato, domínio C026, códigos C044 93/94 (intenção de pagamento), J-53 e G067. Nada muda nas posições de P/Q/R/T/U. **Não li o PDF da 10.11** (o portal não o lista mais), só o log dentro da 11.0 | V (log) · NV (PDF 10.11) | p. 252-253 |
| L4 | Os pares início–fim de **T** e **U** são **idênticos** na 10.1 e na 11.0 (comparação campo a campo dos pares extraídos). Em P/Q/R os inícios e fins batem; o diff mecânico acusa diferença só na coluna "Nº Dig", que sai desalinhada na extração da 11.0 | V (T/U) · I (P/Q/R) | §3.2.2, p. 68-86 |
| L5 | Eventos de cobrança. Remessa: P, Q, R, S, Y, X-03 (entrada, instruções, alterações; Q opcional em instrução e alteração). Retorno: T, U, Y-56, X-03, X-04 (confirmação ou rejeição de entrada, instrução e alteração; liquidação; conciliação da carteira "em ser"; ocorrências; Retorno do Super Inteligente; duplicatas) | V | p. 66 |
| L6 | **T**: código de movimento retorno 16-17; nosso número 38-57 (20); carteira 58; número do documento 59-73 (15); vencimento 74-81; valor nominal 82-96 (13,2); banco/agência cobradora 97-105; **identificação do título na empresa 106-130 (25)**; moeda 131-132; pagador (tipo 133, inscrição 134-148, nome 149-188); contrato 189-198; **tarifa/custas 199-213 (13,2)**; **motivo da ocorrência 214-223** (até 5 códigos de 2) | V | p. 83 |
| L7 | **U**: juros/multa/encargos 18-32; desconto 33-47; abatimento 48-62; IOF 63-77; **valor pago 78-92**; **valor líquido a ser creditado 93-107**; outras despesas 108-122; outros créditos 123-137; **data da ocorrência 138-145**; **data da efetivação do crédito 146-153**; ocorrência do pagador 154-210; banco correspondente 211-233. Todos os valores com 13 inteiros e 2 decimais | V | p. 84 |
| L8 | **P**: código de movimento remessa 16-17; nosso número 38-57; carteira 58; forma de cadastramento 59; tipo de documento 60; emissão do boleto 61; distribuição 62; número do documento 63-77; vencimento 78-85; valor nominal 86-100; espécie 107-108; aceite 109; emissão 110-117; juros (código 118, data 119-126, valor/taxa 127-141); desconto 1 (142, 143-150, 151-165); IOF 166-180; abatimento 181-195; **identificação do título na empresa 196-220**; protesto (221, 222-223); baixa/devolução (224, 225-227); moeda 228-229. **Q**: pagador (inscrição 18-33, nome 34-73, endereço 74-113, bairro 114-128, CEP 129-136, cidade 137-151, UF 152-153) e beneficiário final 154-209. **R**: descontos 2 e 3, multa (código 66, data 67-74, valor/percentual 75-89), mensagens | V | p. 69-71 |
| L9 | **G069 (nosso número):** *"Para código de movimento igual a '01' (Entrada de Títulos), caso esteja preenchido com zeros, a numeração será feita pelo Banco."* **G072:** *"Campo destinado para uso da Empresa Beneficiário para identificação do Título."* | V | descrição dos campos |
| L10 | **C044 (movimento retorno):** 02 entrada confirmada · 03 entrada rejeitada · 06 liquidação · 09 baixa · 11 títulos em carteira · 14 alteração de vencimento confirmada · 17 liquidação após baixa ou de título não registrado · 19/20 protesto · 23/24/25 cartório · 26 instrução rejeitada · 28 débito de tarifas/custas · 30 alteração rejeitada · 44 pago com cheque devolvido · 45 compensado · 50 pendente de liquidação · 51-53 DDA · 68-78 duplicata · 93/94 intenção de pagamento · **95 Retorno do Super Inteligente (Split)** · 96 alteração do split. O C047 (motivo) é tabela por grupo: A = rejeições (02/03/26/30), B = tarifas (28), C = liquidação e baixa (06/09/17), F = split (95) | V | p. 177-178 |
| L11 | **C004 (movimento remessa):** 01 entrada · 02 pedido de baixa · 04/05 abatimento · 06 alteração de vencimento · 07/08 desconto · 09 protestar · 10/11 sustar protesto · 12-16 juros, multa e desconto · *"Cada Banco definirá os campos a serem alterados para o código de movimento '31'"* | V | p. 171 |
| L12 | Domínios com variação por banco declarada no próprio texto: carteira (C006), cadastramento (C007), emissão (C009: 1 banco emite, 2 cliente emite…), distribuição (C010: 1 banco, 2 cliente, 3 e-mail, 4 SMS, P/Q com QR Code Pix), espécie; o header de lote traz *"Código do Convênio no Banco"* (20 posições) e as versões do layout de arquivo e de lote (G019, G030) | V | p. 68, 172 |
| L13 | Observações gerais: *"Para cada um dos serviços … é necessário firmar um convênio específico entre o Banco e o Cliente"* | V | p. 67 |

**Pista de projeto consolidado** (código-fonte; pista, não fonte, conforme a memória
`pesquisar-projetos-consolidados-em-arquitetura`): **OCA/l10n-brazil**, branch 18.0, lido por `gh api` em 29/10.

- `l10n_br_cnab_structure/readme/DESCRIPTION.md`: *"Apesar de muitas Documentações do CNAB acabarem dizendo que usam
  o 'Padrão FEBRABAN' na realidade … existem muitas divergências … diferentes Códigos para a mesma função"*. A
  arquitetura deles separa o comum do que varia por banco.
- `l10n_br_account_payment_order/models/l10n_br_cnab_boleto_fields.py`: o que eles parametrizam por convênio. Código do
  convênio, carteira, modalidade, variação, aceite, espécie; protesto (código e dias); **quem gera o nosso número** e a
  sequência; códigos e percentuais de juros, multa e desconto; **códigos de instrução** (envio, baixa, alteração de
  valor, vencimento, desconto, protesto, abatimento); baixa/devolução. Contas: juros e multa, desconto, abatimento,
  tarifa, não pagamento. `l10n_br_cnab_config.liq_return_move_code_ids` = **quais códigos de retorno contam como
  liquidação, por banco**.
- `l10n_br_account_payment_brcobranca/parser/cnab_file_parser.py` (importa o retorno **como extrato** no diário do
  banco). Divergências que o parser trata: *"No itaú(341) o valor recebido (valor principal) já vem com a tarifa
  descontada"*. No Sicredi (240), os movimentos 02 e 09 vêm **sem data do crédito**. Em alguns bancos o desconto vem
  em chaves diferentes.
- O Odoo **dá baixa automática** no retorno. Aqui isso é proibido (resposta 20), e por isso não copiamos esse trecho.

## 3. Respostas às 4 perguntas do pedido

1. **A aresta F5 → P-IA bloqueia o adaptador genérico?** **Não** (F-CNAB-1 → a, ratificado 29/10). O F-BANK-1 (b) ratificou
   "extração genérica de documento por IA" para *ler leiaute de qualquer banco*, com a premissa R10: *"extração
   propõe, humano confirma, razão só aceita o confirmado"*. Na leitura recomendada, a saída dessa extração é um
   **perfil de banco** que algum humano confirma. O adaptador consome o perfil, não importa quem o preencheu. Hoje o
   perfil é o padrão FEBRABAN, mais o do banco do D6 quando ele chegar (à mão, do manual do banco). Quando o P-IA
   existir, ele **propõe** perfis. A leitura oposta ("a remessa financeira passa a **depender** dela", consequência
   (ii) do F-BANK-1) foi levada ao dono como fork, e ele escolheu (a).
2. **Qual versão do leiaute?** **Base 10.11** (F-CNAB-2 → a, ratificado 29/10; última final), com duas antecipações seguras da 11.0:
   aceitar CNPJ alfanumérico em Q e T e tolerar segmentos desconhecidos no retorno (X, Y). As posições de P/Q/R/T/U são
   as mesmas (L4). Split Payment (X-03/X-04) fica fora até a 11.x final (F-CNAB-2).
3. **O que fica parametrizado por banco?** O `CnabBankProfile` (§4.2). Ele traz as versões do header, convênio e
   conta, carteira e códigos de emissão/distribuição, nosso número (quem gera, tamanho, DV), tabelas de movimento
   (remessa e retorno → evento nosso), motivos, como a tarifa aparece (líquida ou à parte), data do crédito ausente,
   espécies e códigos de juros/multa/desconto/protesto suportados, charset e terminador. O perfil `FEBRABAN_240` é o
   padrão do documento. O perfil do banco do D6 é sobreposição validada pelo mesmo schema.
4. **Como o retorno dá baixa sem violar "nenhum evento do provedor dá baixa"?** O upload do retorno **não liquida
   nada**:
   - (i) os eventos de status (02, 03, 06, 09…) passam pela mesma `applyProviderResult` do webhook: CAS só na
     `CollectionCharge`, zero `JournalEntry`;
   - (ii) as liquidações (06/17) viram **linhas de extrato** de uma `PaymentAccount BANK_CNAB` cuja folha é uma
     **conta transitória** (F-CNAB-3);
   - (iii) o scan do F7 casa cada linha com o título **exato** pela identificação do título (G072 = `charge.id`) e cria
     um item `PENDING` com `origin = 'CNAB_RETURN'` (a reserva do schema), com tarifa em `feeCents` e juros/multa em
     `chargeCents`;
   - (iv) a baixa só existe quando um humano chama `confirm`.

   Teste-âncora (item 18): upload de retorno com liquidação ⇒ `JournalEntry` e `ReceivableReceipt` **inalterados**.

## 4. Contratos (esboço materializável; não é código)

### 4.1 Prisma (migração aditiva, prólogo `DROP TABLE IF EXISTS`; memória `migracao-sqlite-nao-e-transacional`)

```prisma
// PaymentAccount: sem coluna nova. provider += 'BANK_CNAB'; configJson ganha o ramo BANK_CNAB (§4.3).
// glAccountId = folha TRANSITÓRIA da cobrança bancária (F-CNAB-3 a; código e nome = contador, P-CNAB-1).

model CollectionCharge {
  // … colunas atuais …
  dueDate   DateTime? // date-only (isValidDateOnly). CNAB: vencimento do boleto (P 78-85). MP: null (segue expiresAt)
  termsJson String?   // CNAB: juros/multa/desconto/protesto/baixa enviados (CnabChargeTermsSchema), para a remessa
                      // sair igual se for regerada. Congelado na criação, como o payerSnapshotJson
}

// Uma remessa gerada (arquivo imutável depois de gerado). Prisma first-class: sequência monotônica + trilha.
model CnabRemittance {
  id               String    @id @default(cuid())
  userId           String
  unitId           String
  paymentAccountId String    // FK PaymentAccount (BANK_CNAB), Restrict
  sequence         Int       // NSA do header de arquivo: max+1 por conta, gate DENTRO da tx
  profileId        String    // perfil usado (ex.: 'FEBRABAN_240') + profileVersion: a regeração é determinística
  profileVersion   String
  generatedAt      DateTime  // vai no header (data e hora de geração); gravado para o download repetir os bytes
  sha256           String
  attachmentId     String    // DocumentAttachment com o arquivo (o download serve ESTE arquivo, não regera)
  status           String    // GENERATED | DISCARDED
  discardedById    String?
  createdById      String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?
  items            CnabRemittanceItem[]
  @@unique([paymentAccountId, sequence])
  @@index([userId, unitId, paymentAccountId, status])
  @@map("cnab_remittances")
}

// Uma instrução dentro de uma remessa. A cobrança pode aparecer em várias remessas (01 entrada, depois 02 baixa…).
model CnabRemittanceItem {
  id                 String           @id @default(cuid())
  remittanceId       String
  remittance         CnabRemittance   @relation(fields: [remittanceId], references: [id], onDelete: Restrict)
  collectionChargeId String           // FK CollectionCharge, Restrict
  movementCode       String           // código NOSSO (ENTRY | WRITE_OFF | CHANGE_DUE_DATE | …), traduzido pelo perfil
  lineFrom           Int              // nº sequencial do 1º registro (P) no lote
  @@unique([remittanceId, collectionChargeId, movementCode])
  @@index([collectionChargeId])
  @@map("cnab_remittance_items")
}

// Instrução pedida e ainda não remetida (ex.: cancelar = pedido de baixa). Fila por conta, consumida pela remessa.
model CnabPendingInstruction {
  id                 String    @id @default(cuid())
  userId             String
  unitId             String
  collectionChargeId String
  movementCode       String    // ENTRY | WRITE_OFF | CHANGE_DUE_DATE | … (F-CNAB-6 decide o conjunto)
  payloadJson        String?   // ex.: novo vencimento
  remittanceItemId   String?   // preenchido quando entra numa remessa
  createdById        String?
  createdAt          DateTime  @default(now())
  deletedAt          DateTime?
  @@index([userId, unitId, remittanceItemId])
  @@map("cnab_pending_instructions")
}
```

O retorno **não** ganha tabela própria: o dinheiro vive no `BankStatement` (sha256), e o status vive no CAS da
cobrança, que é idempotente. Subir de novo o mesmo arquivo converge (item 20). Se o executor achar que precisa de uma
tabela, é lacuna de spec e volta ao dono.

### 4.2 Perfil de banco (dado validado, versionado no repo; F-CNAB-1 a)

```ts
// server/src/features/accounting/collection/cnab/CnabBankProfile.ts — só o schema; perfis em profiles/*.ts
export const CnabBankProfileSchema = z.object({
  id: z.string().regex(/^[A-Z0-9_]+$/),          // 'FEBRABAN_240' | 'BANCO_<código>_<convênio-tipo>' (D6)
  version: z.string(),                            // muda quando qualquer campo muda (remessa grava profileVersion)
  bankCode: z.string().regex(/^\d{3}$/).nullable(), // null no FEBRABAN_240 genérico; obrigatório para transmitir de verdade
  layoutVersion: z.object({ file: z.string().regex(/^\d{3}$/), batch: z.string().regex(/^\d{3}$/) }), // G019, G030
  charset: z.enum(['ASCII_UPPER']),               // sem acento, maiúsculas (I: prática dos manuais; conferir no D6)
  lineTerminator: z.enum(['CRLF', 'LF']),
  account: z.object({                             // larguras do header/P/T: agência 5+1, conta 12+1, DV ag/conta 1
    agencyDigits: z.number().int(), accountDigits: z.number().int(), hasAgencyAccountDv: z.boolean(),
  }).strict(),
  covenant: z.object({ width: z.literal(20), pad: z.enum(['LEFT_ZERO', 'RIGHT_SPACE']) }).strict(),
  ourNumber: z.discriminatedUnion('generatedBy', [
    z.object({ generatedBy: z.literal('BANK') }).strict(),            // G069: zeros na entrada (F-CNAB-5 a)
    z.object({ generatedBy: z.literal('COMPANY'), width: z.number().int().max(20),
               dv: z.enum(['NONE', 'MOD10', 'MOD11_2_9', 'MOD11_2_7']), rangeFrom: z.string(), rangeTo: z.string() }).strict(),
  ]),
  issuance: z.object({ wallet: z.string().length(1), registration: z.enum(['1', '2', '3']),
                       documentType: z.enum(['1', '2']), emission: z.string().length(1), distribution: z.string().length(1),
                       species: z.string().length(2), accept: z.enum(['A', 'N']) }).strict(),
  remittanceCodes: z.record(z.enum(CNAB_MOVEMENTS), z.string().regex(/^\d{2}$/)), // nosso evento → C004 do banco
  returnCodes: z.record(z.string().regex(/^\d{2}$/), z.enum(CNAB_RETURN_EVENTS)), // C044 do banco → nosso evento
  rejectionReasons: z.record(z.string(), z.string()).optional(),                  // C047 → texto (failReason)
  fee: z.object({
    mode: z.enum(['NETTED', 'SEPARATE']),        // NETTED: líquido (U 93-107) = pago − tarifa; SEPARATE: tarifa sai no extrato do banco
    creditDateMissingOn: z.array(z.string()).default([]), // ex. Sicredi 02/09 (pista OCA): data do crédito vazia
  }).strict(),
  supports: z.object({ interest: z.array(z.string()), fine: z.array(z.string()), discount: z.array(z.string()),
                       protest: z.boolean(), maxDaysToDue: z.number().int().nullable() }).strict(),
  tolerateUnknownSegments: z.literal(true),       // X-xx/Y-xx do retorno: ignorados e guardados no rawJson (F-CNAB-2 a)
}).strict();

export const CNAB_MOVEMENTS = ['ENTRY', 'WRITE_OFF', 'CHANGE_DUE_DATE', 'GRANT_REBATE', 'CANCEL_REBATE',
                               'PROTEST', 'SUSPEND_PROTEST_WRITE_OFF', 'SUSPEND_PROTEST_KEEP'] as const; // F-CNAB-6 corta
export const CNAB_RETURN_EVENTS = ['ENTRY_CONFIRMED', 'ENTRY_REJECTED', 'LIQUIDATED', 'LIQUIDATED_AFTER_WRITE_OFF',
                                   'WRITTEN_OFF', 'DUE_DATE_CHANGED', 'INSTRUCTION_REJECTED', 'FEE_DEBITED',
                                   'CHEQUE_RETURNED', 'IN_PORTFOLIO', 'PROTESTED_WRITTEN_OFF', 'INFO'] as const;
```

O perfil `FEBRABAN_240` (C004/C044 de L10/L11) é o padrão. Sem `bankCode`, ele **gera e valida** (resposta 19), mas a
remessa sai marcada como homologação: a geração recusa `ambiente=PRODUCAO` com `cnab_profile_not_bank_specific`. O
perfil do banco do D6 entra num PR próprio quando o convênio chegar (fora deste BRIEF, §9).

### 4.3 DTOs (`.strict()`)

```ts
// PaymentAccountDto — ramo novo do union (discriminador DECLARADO; memória zod-strip-mata-discriminador-de-plugin)
export const BankCnabConfigSchema = z.object({
  provider: z.literal('BANK_CNAB'),
  profileId: z.string().min(1),                   // precisa existir no catálogo e validar no CnabBankProfileSchema
  bankCode: z.string().regex(/^\d{3}$/).optional(),
  agency: z.string().regex(/^\d{1,5}$/), agencyDv: z.string().max(1).optional(),
  account: z.string().regex(/^\d{1,12}$/), accountDv: z.string().max(1),
  covenant: z.string().min(1).max(20),            // código do convênio (header de lote 34-53)
  beneficiaryName: z.string().min(1).max(30),     // header 74-103
  defaultTerms: CnabChargeTermsSchema.optional(),
  environment: z.enum(['HOMOLOGACAO', 'PRODUCAO']).default('HOMOLOGACAO'),
}).strict();
export const PaymentAccountConfigSchema = z.discriminatedUnion('provider', [MercadoPagoConfigSchema, BankCnabConfigSchema]);

// Termos do título (P/R). Percentual em basis points; valor em centavos string. F-CNAB-8 (b): só formato.
export const CnabChargeTermsSchema = z.object({
  interest: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('NONE') }).strict(),
    z.object({ kind: z.literal('DAILY_AMOUNT'), cents: CentsString, fromDate: DateOnly.optional() }).strict(),
    z.object({ kind: z.literal('MONTHLY_RATE'), bps: z.number().int().min(1), fromDate: DateOnly.optional() }).strict(),
  ]),
  fine: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('NONE') }).strict(),
    z.object({ kind: z.literal('PERCENT'), bps: z.number().int().min(1).max(10_000) /* F-CNAB-8 b: sem teto legal; aviso na tela */, fromDate: DateOnly.optional() }).strict(),
    z.object({ kind: z.literal('AMOUNT'), cents: CentsString, fromDate: DateOnly.optional() }).strict(),
  ]),
  discount: z.object({ untilDate: DateOnly, cents: CentsString }).strict().optional(),
  protestDays: z.number().int().min(1).max(99).optional(),     // só se F-CNAB-6 ⊇ protesto
  writeOffDays: z.number().int().min(1).max(999).optional(),   // baixa/devolução (P 224-227); ≥ protestDays (obs. do P)
}).strict();

// CreateChargeSchema (atual) + campos novos. Campo do provedor errado ⇒ 400 nomeado, nunca ignorado.
export const CreateChargeSchema = z.object({
  unitId: z.string().min(1),
  paymentAccountId: z.string().min(1).optional(), // F-CNAB-7 a
  kind: z.enum(CHARGE_KINDS),
  expiresInDays: …, expiresInMinutes: …,          // MP (inalterados)
  dueDate: DateOnly.optional(),                    // CNAB: obrigatório (400 charge_due_date_required); MP: 400 se vier
  terms: CnabChargeTermsSchema.optional(),         // CNAB; MP ⇒ 400 capability_not_supported (interestAndFine=false)
  payer: PayerSchema,
}).strict();

// Rotas novas (2 toques: index.ts + docs.paths.ts)
// POST /api/payment-accounts/:id/cnab/remittances           { unitId }              → CnabRemittanceView (201) | 409 cnab_nothing_to_remit
// GET  /api/payment-accounts/:id/cnab/remittances            ?unitId&page&limit      → lista
// GET  /api/payment-accounts/:id/cnab/remittances/:rid/file  ?unitId                 → o arquivo GRAVADO (bytes iguais)
// POST /api/payment-accounts/:id/cnab/remittances/:rid/discard { unitId, reason }    → só sem retorno que cite os itens
// POST /api/payment-accounts/:id/cnab/returns  (multipart, unitId)                   → CnabReturnSummary
export const CnabReturnSummarySchema = z.object({
  sha256: z.string(), statementId: z.string().nullable(), statementCreated: z.boolean(),
  events: z.object({ applied: z.number(), unchanged: z.number(), unknownCharge: z.number(), ignoredSegments: z.number() }),
  liquidations: z.number(), rejections: z.array(z.object({ chargeId: z.string().nullable(), ourNumber: z.string(), reasons: z.array(z.string()) })),
}).strict();
```

### 4.4 Porta (evolução mínima; nenhum método do MP muda)

```ts
export interface CollectionCapabilities { /* atuais */ fileExchange: boolean; credential: boolean; }
export interface CollectionProviderPort {
  readonly name: 'MERCADO_PAGO' | 'BANK_CNAB' | 'NULL';
  readonly capabilities: CollectionCapabilities;
  createCharge(account: ResolvedAccount, input: CreateChargeInput): Promise<ChargeResult>; // CNAB: local, sem rede
  getCharge?(…): …;  cancelCharge?(…): …;  verifyWebhook?(…): …;                         // opcionais por capability
  requestReleaseReport?(…); listReleaseReports?(…); downloadReleaseReport?(…);
  mapStatus(result: ChargeResult): { status: CollectionChargeStatus; known: boolean };      // tira o mapMercadoPagoStatus do serviço
}
// O serviço só chama um opcional se a capability anunciar; ausente + chamado ⇒ erro de programação (teste cobre).
// ResolvedAccount.credential vira opcional (BANK_CNAB não tem credencial).

// Funções puras do adaptador (lib, sem Prisma):
buildRemittance(profile, header: CnabFileHeader, items: CnabRemittanceLine[]): Buffer
parseCollectionReturn(profile, buf: Buffer): { header: CnabReturnHeader; events: CnabReturnEvent[]; ignored: number }
export interface CnabReturnEvent {
  movementCode: string; event: CnabReturnEvent['event']; companyRef: string /* G072, 25 */; ourNumber: string;
  documentNumber: string; dueDate: string | null; nominalCents: string; feeCents: string; reasons: string[];
  paidCents: string; netCents: string; interestFineCents: string; discountCents: string; rebateCents: string;
  otherExpensesCents: string; otherCreditsCents: string; occurrenceDate: string | null; creditDate: string | null; // date-only literal
  raw: { t: string; u: string | null };
}
```

### 4.5 Linha de extrato do retorno (normalizador `cnab_return` → `PreParsedStatementImport`)

`date` = F-CNAB-4 · `amountCents` = **líquido** (U 93-107) com `fee.mode = NETTED`, ou **pago** (U 78-92) com
`SEPARATE` · `description = 'cnab:liquidation'` · `externalRef` = G072 (`charge.id`) · `rawJson` = todos os campos do
evento. Só entram eventos `LIQUIDATED` e `LIQUIDATED_AFTER_WRITE_OFF`; os demais só mudam status. Exemplo: o 28
(tarifa) não vira linha, porque o débito aparece no extrato do banco.

### 4.6 Lançamentos (nenhum novo; o confirm do F7 já faz, com `ProviderBalance`)

- Recibo bruto: D transitória (folha da `PaymentAccount`) / C cliente, no valor `proposedCents`.
- Tarifa, se `feeCents > 0`: D `providerFeeExpenseAccountId` / C transitória.
- Juros/multa (`chargeCents`, resposta 22): D transitória / C `bankChargeIncomeAccountId`.
- Desconto ou abatimento (`shortfallCents`): tratamento da Emenda 3.3 escolhido no confirm.
- O crédito real no extrato do banco (OFX/CNAB-E, em `1.1.1`) zera a transitória por lançamento manual mais
  `manualMatch`, o mesmo caminho do repasse do MP. Automatizar isso é achado fora de escopo (§9).

## 5. Forks — RATIFICADOS 29/10/2026 (dono, questionário nesta sessão, fork a fork)

### 5.1 Resultado

| Fork | Decisão | Nota |
|---|---|---|
| F-CNAB-1 | ✅ **(a)** o P-IA não bloqueia; perfil declarativo no repo | quando existir, o P-IA só propõe perfis |
| F-CNAB-2 | ✅ **(a)** base 10.11 + CNPJ alfanumérico em Q/T + retorno tolera X/Y | split entra por emenda com a 11.x final |
| F-CNAB-3 | ✅ **(a)** conta transitória, item F7 `CNAB_RETURN`, confirm humano | folha = P-CNAB-1 (contador) |
| F-CNAB-4 | ✅ **(a)** data da ocorrência | P-CNAB-2 segue com o contador; trocar é escolher a coluna |
| F-CNAB-5 | ✅ **(a)** banco emite, distribui e numera; casamento pelo G072 | — |
| F-CNAB-6 | ✅ **(b)** completo + protesto e abatimento no PR-4 | cuidados do protesto: P-CNAB-5 |
| F-CNAB-7 | ✅ **(a)** `paymentAccountId` opcional, 400 se ambíguo | — |
| F-CNAB-8 | ⚠️ **(b) CONTRA a recomendação**: sem teto no código, só aviso na tela | o backend valida só o formato (bps ≥ 1, ≤ 10000). O aviso é da tela (FE, §9). P-CNAB-5 (i) e (ii) seguem com o advogado |
| F-CNAB-9 | ✅ **(a)** `PATCH DRAFT → ACTIVE` só para provedor sem credencial | emenda a regra de 03/10 só para `BANK_CNAB` |

### 5.2 Tabela original (mantida como foi proposta)

| Fork | Caminhos | Recomendação | Por quê / custo |
|---|---|---|---|
| **F-CNAB-1 — O P-IA bloqueia o adaptador genérico?** | **(a)** Não. O adaptador lê um **perfil de banco declarativo** (§4.2), versionado no repo e validado por Zod. Hoje há o FEBRABAN; o banco do D6 entra à mão, a partir do manual. O P-IA, quando existir, só **propõe** perfis, e o humano confirma (premissa R10) · **(b)** Sim. Espera o ADR do P-IA, que espera o D6 (R10), e a remessa só nasce com a extração · **(c)** Não bloqueia, mas o perfil fica **editável em tela** (banco de dados) desde já | **(a)** | Segue a autorização de 29/10, que diz "genérico, sem o banco do cliente". A resposta 1 ("contabilidade determinística") fica de pé: nada estatístico no caminho do arquivo. Bate com o F-COB-1 (b): "catálogo, não `if`". **Custo:** a leitura (ii) do F-BANK-1 ("a remessa passa a depender" do P-IA) vira "o P-IA alimenta o perfil". O (c) põe tela e trilha de edição de dado sensível antes de haver banco real |
| **F-CNAB-2 — Versão do leiaute** | **(a)** Base **10.11** (última final), com duas antecipações da 11.0: CNPJ alfanumérico em Q e T, e retorno que **tolera** segmentos X/Y desconhecidos (guarda em `rawJson`). Split (X-03/X-04) fica fora · **(b)** **11.0 inteira**, com o split da cobrança · **(c)** Esperar a 11.x final | **(a)** | A 11.0 se declara preliminar (L1). P/Q/R/T/U não mudam de posição (L4). O split da cobrança é opcional "na visão do Recebedor" (texto do X-03) e é tema do nó IBS-CBS-2027. A versão do header vai no perfil, então trocar de versão é dado. **Custo:** quando a 11.x final sair, o split entra por emenda |
| **F-CNAB-3 — Caminho do dinheiro do retorno até a baixa** (resposta 20 vale em todos) | **(a)** Liquidações viram **extrato de uma `PaymentAccount BANK_CNAB` com folha transitória** ("cobrança bancária a compensar"). O scan do F7 casa pelo G072 e cria item `origin = 'CNAB_RETURN'`; o confirm usa `ProviderBalance`. O crédito real no banco zera a transitória à mão · **(b)** Extrato contra a própria `1.1.1 Banco` · **(c)** Item do F7 sem extrato: `statementLineId` passa a opcional (ALTER na chave do F7), tabela de linhas de retorno, e o extrato do banco casa com N recibos | **(a)** | É o desenho ratificado do MP (F-PP-5 a, F-PP-7 a) aplicado ao banco, sem mexer na chave do F7. Funciona com crédito **consolidado** (o banco credita a soma do dia), que é comum. O (b) faz o retorno e o extrato do banco disputarem a mesma conta, e o saldo de nenhum fecha: é o mesmo motivo que derrubou o F-PP-7 (b). O (c) reabre a chave do F7 e cria um 2º caminho até o razão. **Custo:** a transitória é uma conta nova (P-CNAB-1) e cada crédito do banco pede um lançamento manual |
| **F-CNAB-4 — Data da linha (e portanto da baixa)** | **(a)** **Data da ocorrência** (U 138-145, o pagamento); se vier vazia, a data do crédito · **(b)** **Data do crédito** (U 146-153); se vier vazia (pista Sicredi), a da ocorrência | **(a)** | Com a transitória (F-CNAB-3 a), o título se extingue quando o pagador paga. O banco credita depois, e esse crédito zera a transitória no extrato do banco, que tem a data do crédito. As duas datas ficam no `rawJson`. **Custo:** é pergunta do contador (P-CNAB-2); trocar depois é só escolher outra coluna no normalizador, como o P2 do MP |
| **F-CNAB-5 — Quem emite o boleto e quem numera** | **(a)** **Banco emite e distribui** (C009 = 1, C010 = 1, no perfil) e **banco numera**: nosso número com zeros na entrada (G069). O Luminaris se identifica no **G072 = `charge.id`** (25 posições; o cuid tem 25, I). A linha digitável não é calculada · **(b)** **Cliente emite**: o Luminaris calcula nosso número, DV, campo livre e linha digitável e gera o PDF | **(a)** | O (b) é intrinsecamente por banco (campo livre e DV), e não existe sem o D6. O (a) funciona com o perfil genérico. **Custo:** o boleto chega ao pagador pelo banco (e-mail ou correio, com tarifa do banco) e a tela não mostra linha digitável no v1. O (b) entra como capacidade do perfil do D6 |
| **F-CNAB-6 — Instruções de remessa no BRIEF** | **(a)** Entrada (01) com juros, multa e desconto; pedido de baixa (02) para cancelar; alteração de vencimento (06) · **(b)** (a) + **protesto** (09/10/11) e **abatimento** (04/05) num PR final · **(c)** Só 01 e 02 | **(b)** | O ADR §6.1 lista protesto e baixa como o que o CNAB cobre e o MP não (MP11). A memória `dono-quer-completude-nao-mvp` pede cobertura. Mandar o código de protesto é técnica; **decidir protestar** é do usuário, título a título. Os códigos variam por banco, então vão para o perfil (`supports.protest`). **Custo:** o protesto tem efeito sobre terceiro. As regras de prazo e de cobrança abusiva vão ao advogado (P-CNAB-5); até lá a rota existe e a tela avisa |
| **F-CNAB-7 — Como a cobrança escolhe a conta, com MP e banco ativos no mesmo escopo** | **(a)** `paymentAccountId` **opcional** no DTO: se há uma só conta ativa, usa ela; se há mais de uma, 400 `payment_account_required` · **(b)** `paymentAccountId` obrigatório (quebra o FE do MP já mergeado) · **(c)** Conta padrão em `AccountingScopeSettings` | **(a)** | Não quebra o FE de 23/10 (#862), que não manda o campo, e mantém o F-PP-9 (uma ativa por escopo e provedor). **Custo:** com as duas ativas o FE passa a precisar do seletor (achado §9) |
| **F-CNAB-8 — Limite de multa e juros nos termos do título** | **(a)** **Multa ≤ 2%** (200 bps), recusada acima (`charge_fine_above_limit`). Juros só com checagem de formato · **(b)** Sem teto no código, aviso na tela · **(c)** Termos bloqueados até o advogado responder | **(a)** | O 1º cliente (salão) cobra consumidor final. O CDC 52 § 1º (2%) foi conferido na verificação legal de 17/10 [D02]; a extensão a serviço vem do STJ e não foi conferida. Recusar acima de 2% é a leitura mais segura. O teto dos juros (CC 406, usura) **não** foi lido nesta sessão, então vai para o advogado (P-CNAB-5) em vez de virar regra inventada. **Custo:** um B2B com multa contratual maior fica barrado até a resposta |
| **F-CNAB-9 — Como uma conta sem credencial vira ACTIVE** | **(a)** `PATCH` aceita `DRAFT → ACTIVE` **só** para provedor com `capabilities.credential = false` (`BANK_CNAB`), com o `configJson` validado e o perfil existente. Para o MP, nada muda · **(b)** Rota nova `POST …/activate` · **(c)** `BANK_CNAB` já nasce `ACTIVE` | **(a)** | É a menor mudança na máquina de status ratificada em 03/10 ("ao pé da letra"), e mantém o gate de uma ativa (P1-4) no mesmo lugar. O (c) pula o rascunho e ativaria uma conta com dado bancário errado. **Custo:** muda uma regra que o dono ratificou, por isso pergunto |

## 6. Pendente de validação externa (não entra no checklist como decidido)

### 6.1 Contador

| # | Pergunta | Onde bate |
|---|---|---|
| P-CNAB-1 | Código e nome da **conta transitória** da cobrança bancária ("títulos em cobrança / a compensar"). O plano do salão não tem (`ChartOfAccountsFixture.ts:22-41`, ADR §3) | `PaymentAccount.glAccountId` (o humano escolhe a folha; o BRIEF não cria conta no fixture) |
| P-CNAB-2 | Data da baixa: **pagamento** (ocorrência) ou **crédito**? | F-CNAB-4; normalizador do item 14 |
| P-CNAB-3 | Tarifa de cobrança bancária: usa a mesma conta da tarifa do provedor (`providerFeeExpenseAccountId`) ou outra? | item 17; se for outra, emenda com conta nova em `AccountingScopeSettings` |
| P-CNAB-4 | Juros e multa recebidos: `bankChargeIncomeAccountId` (receita financeira) serve? | confirm do F7 (inalterado) |

### 6.2 Advogado

| # | Pergunta | Onde bate |
|---|---|---|
| P-CNAB-5 | Com F-CNAB-8 (b) o código não barra nada; a resposta define o texto do aviso na tela. (i) A multa de 2% vale para pagador PJ (B2B)? (ii) Qual o teto de juros de mora contratuais no boleto (CC 406; Decreto 22.626/33)? (iii) Protesto de boleto de serviço a consumidor: algum cuidado além da Lei 9.492/97 (CDC 42, cobrança vexatória)? **Nada disso foi lido no acervo nesta sessão**; se o dono quiser, abre dossiê pelo `legal.py` | F-CNAB-8; F-CNAB-6 (b) |
| P-CNAB-6 | LGPD: enviar nome, CPF/CNPJ e endereço do pagador ao **banco** (Q). Mesma base do P5 do MP (art. 7º V), aqui com instituição financeira | `payerSnapshotJson` (inalterado) |

### 6.3 Gates humanos (runbook; o agente prepara em branco, não preenche, não assina)

- **D6 — convênio e perfil do banco do 1º cliente com banco:** manual do leiaute do banco, carteira, convênio, quem
  numera e como a tarifa aparece. O agente transcreve num perfil, num PR próprio, e o dono confere.
- **Homologação com o banco** (resposta 19): o operador envia uma remessa gerada em `HOMOLOGACAO` ao canal de teste do
  banco e cola o retorno no runbook. Desfecho em 3 estados (`RUNBOOK-FORMAT.md`). A prova real fica **fora** pela
  decisão de 29/10.

## 7. Checklist de comportamentos (cada item testável sozinho)

Gates de todo PR: `tsc` limpo (server), `npm run check:arch`, snapshot de shape dos DTOs (memória
`dto-snapshot-update-reordena-no-windows`: insira só o novo), allowlist do `auditCanonical.ts` na **mesma** mudança
(eventTypes novos **sem** dado de pagador, agência ou conta), path-count do openapi + `docs.paths.ts` (rotas em 2
toques), migração aditiva com prólogo + `smoke:migration`, `test:integration` com `--runInBand`.

**Fixtures:** todas **SINTÉTICAS** e declaradas assim. Ficam em `server/src/features/accounting/collection/cnab/__fixtures__/`
com um `README.md` que diz *"arquivos sintéticos montados a partir do Padrão FEBRABAN 240 v11.0 (11/09/2026) §3.2.2;
nenhum veio de banco real"*. Cada teste repete a palavra "sintético" no nome. As variações "estilo Itaú" (tarifa
líquida) e "estilo Sicredi" (sem data do crédito) seguem a **pista** do OCA e não são fato do banco.

### PR-1 — Perfil, codec e funções puras (sem Prisma, sem rota)

1. **Codec de campo posicional** (`collection/cnab/codec.ts`): numérico com zeros à esquerda, alfa com espaços à
   direita, maiúsculas sem acento; valor de 13+2 por **string** (sem `Number`, sem float; a mesma regra do
   `lib/cnab.ts`); data DDMMAAAA ↔ date-only por **reordenação literal** (sem `new Date`); `00000000` → `null`.
   Estouro de largura ⇒ erro, nunca truncamento silencioso.
2. `CnabBankProfileSchema` e o perfil `FEBRABAN_240` com C004/C044/C047 de L10/L11. O teste valida o perfil no schema
   e confere **cada código** contra uma tabela transcrita do PDF (memória `tabela-transcrita-de-lei-conferir-redacao-vigente`:
   o teste cita a página).
3. `buildRemittance`: header de arquivo, header de lote (serviço 01 cobrança), P + Q (+ R quando houver multa, desconto
   2/3 ou mensagem) por instrução, trailer de lote, trailer de arquivo. Toda linha tem **exatamente 240** caracteres,
   com o terminador do perfil. Contagens dos trailers batem. **Determinístico:** mesma entrada ⇒ mesmos bytes (sha256
   igual).
4. Posições: um teste por campo de L8 que o gerador preenche, lendo de volta a fatia `[início-1, fim)` de uma linha
   gerada. A tabela de posições do teste é transcrita do PDF, com a página citada.
5. Nosso número na entrada: `generatedBy = BANK` ⇒ 20 zeros (G069). G072 = `charge.id` com padding de 25 posições.
   `charge.id` maior que 25 ⇒ erro alto. O teste usa um cuid real do Prisma, não um literal.
6. `parseCollectionReturn`: lê T e U **em par** (U órfão ou T sem U ⇒ o arquivo inteiro é recusado com a linha
   citada). Segmentos X/Y e outros desconhecidos ⇒ `ignored++`, guardados no `raw` (F-CNAB-2 a). CNAB 400 ou linha ≠
   240 ⇒ recusa (mesma regra do `lib/cnab.ts`). Arquivo de **outro** convênio ou conta (header ≠ `configJson`) ⇒
   recusa `cnab_return_wrong_account`.
7. Tradução de código: C044 desconhecido no perfil ⇒ evento `INFO` com o código cru, **nunca** descartado em
   silêncio. Motivos C047: até 5 códigos de 2 posições (L6), traduzidos pelo perfil.
8. Round-trip sintético: remessa gerada → retorno sintético montado das mesmas cobranças (02, depois 06) → o parser
   devolve o mesmo `companyRef`, o valor nominal e as datas.

### PR-2 — Conta BANK_CNAB, cobrança CNAB e remessa (schema + porta + rotas)

9. `PAYMENT_PROVIDERS += 'BANK_CNAB'`; ramo `BankCnabConfigSchema` no union. `profileId` inexistente ⇒ 400
   `cnab_profile_unknown`. Ativação: F-CNAB-9. Gate de uma ativa por (escopo, provedor) inalterado.
10. Porta: `name` ganha `BANK_CNAB`; métodos de webhook, consulta e relatório viram opcionais, guardados por
    capability (§4.4); `mapStatus` sai do serviço e vai para o adaptador (o MP passa a chamar o
    `mapMercadoPagoStatus` dentro do adaptador, **sem mudança de comportamento**: a suíte atual do MP fica verde sem
    editar asserção). A factory registra `CnabCollectionProvider`. Webhook para `BANK_CNAB` ⇒ 401 sem escrita, porque
    a capability é falsa.
11. Criação (F-CNAB-7): conta resolvida por `paymentAccountId` ou pela única ativa. Validações de CNAB: `dueDate`
    obrigatório e ≥ hoje no dia-calendário de Brasília (ADR-TZ); `expiresIn*` ⇒ 400 `charge_expiry_field_mismatch`;
    `kind = PIX` ⇒ 400 `capability_not_supported`; `terms` fora do `supports` do perfil ⇒ 400 nomeado. Multa:
    **sem teto legal no backend** (F-CNAB-8 b): o teste prova que 300 bps passa e que 0 ou 10001 bps dão 400 de
    formato. No MP, `dueDate` ou `terms` ⇒ 400 `capability_not_supported` (memória
    `param-aceito-e-ignorado-e-bug`).
12. `createCharge` do CNAB é **local**: grava `dueDate`, `termsJson`, um `CnabPendingInstruction(ENTRY)` e passa a
    `PENDING` com `providerStatus = 'AWAITING_REMITTANCE'`, nos 2 commits que já existem (o 2º commit não espera rede).
    Saldo relido na tx, uma viva por título e 409s iguais aos do MP (invariante 6 do ADR).
13. Remessa (`POST …/cnab/remittances`): numa tx, lê as instruções pendentes da conta, cria `CnabRemittance` com
    `sequence = max+1` (gate **dentro** da tx; `@@unique` é a rede), os itens, o arquivo (`DocumentAttachment`,
    sha256) e marca as instruções; `providerStatus` → `REMITTED`. Sem pendente ⇒ 409 `cnab_nothing_to_remit`.
    Corrida de duas gerações ⇒ uma vence, a outra recebe 409, sem instrução em duas remessas (teste concorrente com a
    ressalva da memória `windows-serializa-sqlite-ci-linux-nao`). `GET …/file` serve **os bytes gravados**.
    `discard` só quando nenhum retorno já citou os itens. As instruções voltam a pendentes, e o audit grava o motivo
    (risco declarado em §9).
14. Cancelar uma cobrança CNAB `PENDING` = enfileira `WRITE_OFF` (02 pedido de baixa). O status **não** muda até o
    retorno 09 (item 18). Cancelar de novo com o pedido já pendente ⇒ 409 nomeado.
15. Audit: `cnab_remittance.generated`, `cnab_remittance.discarded`, `collection_charge.instruction_queued`, com chaves
    fechadas (ids, contagens, sequence, sha256). Nenhum dado de pagador, agência ou conta.

### PR-3 — Retorno: status, extrato e proposta de baixa

16. `POST …/cnab/returns`: parse puro **antes** de qualquer escrita (malformado ⇒ 400, zero escrita). Depois: (i)
    se houver liquidações, import pré-normalizado (`cnab_return`, §4.5) com `paymentAccountId`, sha256 e guarda de
    sobreposição **dentro** da tx. Chave = (conta, `companyRef`, nosso número, código, data da ocorrência). Se ela já
    foi importada noutro arquivo, o arquivo é recusado com 409 `cnab_return_overlap` listando as chaves (PP-D6:
    nunca duplicar). (ii) Eventos de status aplicados por `applyProviderResult`, cobrança achada por `companyRef` e,
    sem ele, por nosso número (`providerRef`).
    `atomicUntil`: sem `postEntry`. São 1 commit (o import) + N CAS idempotentes. Se o processo cair entre os dois,
    subir o mesmo arquivo de novo converge, porque o sha256 devolve o extrato existente e o CAS não repete transição
    (item 20).
17. Mapa evento → `CollectionCharge` (status cru em `providerStatus` / `providerStatusDetail` = código + motivos):
    - `ENTRY_CONFIRMED` (02) ⇒ continua `PENDING`, grava o nosso número em `providerRef`;
    - `ENTRY_REJECTED` (03) ⇒ `FAILED`, com os motivos C047 em `failReason`;
    - `LIQUIDATED` (06) ⇒ `PAID`;
    - `LIQUIDATED_AFTER_WRITE_OFF` (17) ⇒ `PAID`; sobre um terminal, mantém o terminal com o alerta que já existe;
    - `WRITTEN_OFF` (09) ⇒ `CANCELLED` se houve pedido de baixa remetido, senão `EXPIRED`;
    - `CHEQUE_RETURNED` (44) depois de `PAID` ⇒ `CHARGED_BACK`;
    - `INSTRUCTION_REJECTED` (26/30) ⇒ sem transição, com audit e o motivo na resposta;
    - `FEE_DEBITED` (28), `IN_PORTFOLIO` (11) e `INFO` ⇒ sem transição.

    `applyProviderResult` não regride (S4).
18. **Zero baixa no upload.** Depois de subir um retorno com 06, a contagem de `JournalEntry`, `ReceivableReceipt`
    e `BankSettlementItem` é a mesma de antes. O teste assere as três contagens, não só uma (memória
    `comentario-de-teste-afirma-o-que-nao-assere`).
19. Scan do F7 em extrato de `PaymentAccount BANK_CNAB`: `pickProviderCandidate` ganha o ramo
    `description = 'cnab:liquidation'`. O título é o da cobrança pelo `externalRef` (= `charge.id`) e, sem ele, pelo
    nosso número; sem janela nem valor aproximado. O ramo do MP fica intacto (suíte verde). O item nasce com
    `origin = 'CNAB_RETURN'`. Valores sobre o **bruto** = pago (U 78-92): `proposed = min(bruto, saldo)`,
    `charge = max(0, bruto − saldo)`. Com `NETTED`, `fee = pago − líquido`; com `SEPARATE`, `fee = 0`. Se `líquido ≠
    pago − tarifa(T) − outras despesas + outros créditos`, o item sai `ambiguous` (molde do G3 do MP). Cobrança
    terminal casa com aviso (G7).
20. Idempotência: o mesmo arquivo duas vezes ⇒ o mesmo `statementId` (`statementCreated = false`), zero transição
    nova e zero item novo no scan. O teste assere a 2ª chamada.
21. Confirm do F7 em item `CNAB_RETURN`: o método `ProviderBalance` debita a transitória; a tarifa sai por
    `providerFeeExpenseAccountId` (P-CNAB-3) e o encargo pelo passo `bank.charge`. O `manualMatch` da linha fecha
    |líquido|. Teste integrado com fixture sintética: cobrança → remessa → retorno 02 → retorno 06 → scan → confirm ⇒
    um recibo bruto, uma tarifa, um encargo e a linha `MATCHED`.
22. Data (F-CNAB-4): a linha usa a data da ocorrência (ou a do crédito, conforme a ratificação), lida **literal** do
    campo. O teste usa um retorno sintético com ocorrência 30/10 e crédito 31/10 e assere o dia escrito (memória
    `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`). `creditDateMissingOn` do perfil cobre o caso vazio.
23. Audit: `cnab_return.processed` (sha256, contagens, statementId; nenhum dado de pagador).

### PR-4 — Instruções restantes (só se F-CNAB-6 = b)

24. Alteração de vencimento (06): grava o novo `dueDate` só quando chega o retorno 14; até lá o pedido fica pendente.
    Abatimento (04/05): valor ≤ saldo. Protesto (09) e sustação (10/11): só se `supports.protest`; `protestDays` ≤
    `writeOffDays` (observação do segmento P). Retornos 19/20/23/24/25 traduzidos (25 ⇒ `EXPIRED` com motivo).
    Nenhuma dessas transições lança no razão.

## 8. Insumos ausentes (pausados, não varridos — regra 2)

1. **PDF da 10.11:** o portal só lista a 11.0. Usei o log da 11.0 (L3) e a 10.1 de terceiro (L4). Se o dono quiser a
   10.11 literal, ela vem por pedido à FEBRABAN ou de um banco.
2. **11.x final:** a 11.0 prometia "nova versão em três semanas" a partir de 11/09. Em 29/10 o portal não tinha. O
   executor confere o portal no PR-1 e, se houver versão nova, compara T/U/P/Q/R antes de escrever o perfil.
3. **O banco devolve o G072 no T 106-130?** É o padrão (L6). Que algum banco não devolva: NV. O fallback por nosso
   número (item 16) cobre esse caso.
4. **Charset e terminador de linha** exigidos pelos bancos: o PDF da 11.0 não fixou para mim. O perfil declara, e o
   D6 confirma.
5. **Tamanho do cuid do Prisma = 25:** inferido; o item 5 prova com um id real.
6. **Validação de homologação:** se os bancos aceitam marca de teste no header (campos reservados). NV; vai para o
   perfil do D6.

## 9. Achados fora de escopo (registrados, não planejados — exigem autorização própria)

- **Tela** (FE-INCR): cadastro da conta `BANK_CNAB`, seletor de conta na cobrança (F-CNAB-7), termos (juros, multa,
  desconto) com o **aviso de multa acima de 2%** (F-CNAB-8 b, texto a confirmar pelo P-CNAB-5), "Gerar remessa", download, upload do retorno e resumo. Nó vizinho.
- **CNPJ alfanumérico** no sistema todo: o `PayerSchema` (S13), o `Counterparty.taxId` e os outros validadores só
  aceitam dígitos. A RFB passa a emitir CNPJ alfanumérico (Q e T da 11.0 já são alfa). Afeta MP, NF-e e cadastro;
  frente própria.
- **Boleto híbrido com QR Code Pix** (C010 `P`/`Q`, motivos P1-P4): é boleto, mas puxa chave Pix e suporte por banco.
  A resposta 21 ("API separada para Pix") sugere frente própria.
- **Split Payment no boleto (X-03/X-04, código 95):** nó IBS-CBS-2027, depois da 11.x final.
- **Compensação automática transitória → banco** (propor o lançamento quando a soma dos recibos do dia bate com o
  crédito do extrato): serve ao MP e ao CNAB.
- **Perfil do banco do D6, transmissão por API/VAN do banco, CNAB 400, DDA, pagamentos (A/J) e duplicata
  escritural (Y-54..56):** fora.
- **Vault:** a aresta pontilhada `F5 → P-IA` deve virar "P-IA alimenta o perfil" se F-CNAB-1 = (a). Mover a aresta é
  fold, depois da ratificação.

## 10. Riscos e vieses declarados (T8)

- **Preliminar como fonte:** a única versão no portal é preliminar (L1). Mitigação: as posições usadas são iguais às
  da 10.1 (L4), e o executor reconfere o portal (insumo 2).
- **Extração de PDF:** `pdftotext` desalinha colunas (a coluna "Nº Dig" de P/Q/R na 11.0). As posições do BRIEF vêm
  dos pares início–fim, e o item 4 manda o executor reler as páginas ao transcrever.
- **Viés de consistência:** reusei o desenho do MP (transitória, `ProviderBalance`, `feeCents`). Ele pode esconder um
  custo próprio do banco: o crédito consolidado pede um lançamento manual por dia (F-CNAB-3).
- **Descarte de remessa** (item 13): se o banco já tinha processado o arquivo descartado, a nova remessa cria **título
  duplicado no banco**, porque o banco numera (F-CNAB-5 a). Mitigação: só descarta sem retorno que cite os itens, com
  motivo no audit. O risco residual é operacional.
- **Pista do OCA** (Itaú, Sicredi): lida no código de terceiro, não em manual de banco. Nas fixtures aparece como
  "estilo", nunca como fato do banco.

## 11. Ordem para a `sessao-feature` (depois dos forks ratificados)

PR-1 → PR-2 → PR-3 → (PR-4 se F-CNAB-6 = b), em série: cada um consome o anterior.
Write set previsto: `server/src/features/accounting/collection/cnab/**` (novo),
`collection/CollectionProviderPort.ts`, `collection/MercadoPagoCollectionProvider.ts` (só o `mapStatus`),
`services/CollectionChargeService.ts`, `services/BankSettlementService.ts` (ramo novo do scan),
`services/CnabRemittanceService.ts` / `CnabReturnService.ts` (novos), repositórios, controller e rotas novos,
`dtos/PaymentAccountDto.ts`, `dtos/CollectionChargeDto.ts`, `models/PaymentAccount.model.ts`,
`models/CollectionCharge.model.ts`, `prisma/schema.prisma` + migração, `audit/auditCanonical.ts`.
Registros (PAR-001): `server/src/lib/factory.ts`, `server/src/routes/index.ts`, `server/src/routes/docs.paths.ts`.
Perfil previsto: `opus-medio` (tipo régua, migração, toca F7 e porta).
