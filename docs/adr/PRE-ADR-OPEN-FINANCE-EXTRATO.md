# PRE-ADR-OPEN-FINANCE-EXTRATO — Extrato bancário automático via Open Finance, com agregador regulado como adaptador

- **Data:** 2026-10-22
- **Status:** **Proposed**. Os forks F-OF-0..9 estão todos PENDENTES. Nenhum código autorizado sem "executa".
- **Autorização:** dono, chat de 22/10/2026: *"Escreve o PRE-ADR da fonte de extrato via Open Finance (agregador como
  adaptador)."* Cobre **este PRE-ADR**. Não cobre BRIEF nem código. O item não tem nó em `docs/plano/nos/`: só aparece
  como PROPOSTO em `docs/plano/destino/09-integracoes-e-ecossistema.md:8` e `docs/plano/destino/06-catalogo-completo-de-modulos-16-dominios.md:64`. Pela regra do vault, vira
  nó depois de ratificado (id proposto em F-OF-9).
- **Divergência registrada (passo 1):** a autorização fixa o desenho "agregador como adaptador". O dono comentou no
  mesmo chat que *"conectar banco então é bem caro"*. Por isso o F-OF-0 deixa aberta a pergunta "implementar agora ou
  esperar volume". O desenho continua o pedido. O momento é decisão do dono.
- **Autor:** `sessao-planejamento` (agente). Os forks são do dono.
- **Base:** `origin/main` = `b0b93890`.

## TLDR

Hoje o extrato chega por upload manual (OFX, CNAB ou planilha) em `ReconciliationService.importStatement`. Open Finance
entregaria as transações sozinho, todo dia, sem o cliente baixar arquivo. O Luminaris **não pode** receber dados do Open
Finance diretamente (não é instituição autorizada). Entra por parceria com um **agregador regulado**, com consentimento
do cliente (Res. Conj. BCB/CMN 1/2020, art. 1º e art. 36). A proposta:

1. **Uma porta `StatementSourcePort`** com o agregador como 1º adaptador. Segue o padrão da `CollectionProviderPort`:
   porta de aplicação, nunca chamada por plugin nem pelo motor de DynamicTable.
2. **`BankConnection` first-class** (Prisma), presa à conta contábil folha do banco, com credencial cifrada pelo
   `secretBox` que já existe.
3. **Puxada incremental vira extrato**, pelo seam `PreParsedStatementImport` que o MP já usa. O gate de linhas, a tx e o
   audit são os mesmos. A diferença é a **deduplicação por id de transação**, porque duas puxadas sobrepostas são o caso
   normal, não erro.
4. **Só Open Finance.** O "acesso direto" por senha do usuário fica de fora (F-OF-3).

O custo é o risco principal. O piso público do Pluggy é **R$ 2.500/mês** só para dados. Com poucos tenants, não fecha a
conta. O F-OF-0 propõe construir só quando houver contrato.

---

## 1. Objetivo (sob a letra)

A letra é "fonte de extrato via Open Finance". O objetivo é que **a conciliação bancária (FIN-05) e a baixa do F7 rodem
sem o cliente baixar e subir arquivo**. Na prática:

- (1) as transações da conta PJ do cliente chegam sozinhas, ao menos uma vez por dia;
- (2) entram pelo **mesmo** gate do import manual: sem caminho paralelo de conciliação;
- (3) puxar de novo nunca duplica linha;
- (4) consentimento vencido ou revogado aparece para o cliente e para o job, sem falha silenciosa.

## 2. Evidência

### 2.1 Plano e decisões

| Fato | Fonte | Implica |
|---|---|---|
| Open Finance é PROPOSTO, sem nó | `docs/plano/destino/09-integracoes-e-ecossistema.md:8`; `docs/accounting/mapa-2026-10-10/dominio-financeiro.md:83` (item 3.9, "SÓ DESTINO") | Este PRE-ADR abre a frente |
| O mapa de 10/10 já inferiu "ERP sem autorização precisa de agregador" | `dominio-financeiro.md:83` | Agora verificado (§2.3) |
| Concorrentes têm Open Finance na conciliação | `docs/mercado/COMPARATIVO-2026-10.md:100` | Motivação de produto, não requisito |
| F-PP-1 → (b) BYOK na cobrança MP | `D-2026-10-02-PAYMENT-PROVIDER-FORKS.md` | Precedente que **não** se transporta direto (F-OF-1) |
| `TESOURARIA` propõe `BankAccount` first-class absorvendo `glAccountId` solto | `PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md:222` | Colisão de modelo (F-OF-6) |

### 2.2 O código (fato consumado)

| Fato | Onde | Implica |
|---|---|---|
| Import único: escolhe o parser e passa tudo pelo mesmo `parseLines`. Idempotente por `sha256` do arquivo | `ReconciliationService.ts:97-140` | O agregador vira mais uma origem da tabela normalizada |
| Seam `PreParsedStatementImport` com `guardInTx` e `afterCreateInTx`, já usado pelo relatório do MP | `ReconciliationService.ts:41-52`; `ReleaseReportService.ts:54-59,108` | Reuso direto, sem gate novo |
| O guarda de sobreposição do MP (P3-4) **recusa o arquivo inteiro** se repetir `SOURCE_ID` e para o job na conta | `ReleaseReportService.ts:127-150,252-273` | Para puxada incremental, recusar é errado: sobrepor é o normal (F-OF-4) |
| `BankStatementLine.externalRef` é opcional e **sem unique** | `schema.prisma:944` | A dedupe por id de transação não tem guarda autoritativa hoje (F-OF-4) |
| `BankStatement` tem `@@unique([userId, unitId, sha256])` e `paymentAccountId` opcional | `schema.prisma:917,920,927` | O extrato puxado precisa de hash canônico (F-OF-4) e de um vínculo próprio (F-OF-6) |
| `PaymentAccount` guarda credencial cifrada (`credentialCiphertext`, AAD = id), status e motivo de bloqueio | `schema.prisma:2730-2750`; `server/src/lib/secretBox.ts` | O padrão da credencial se reusa. O modelo, não (F-OF-6) |

### 2.3 A norma (dossiê `pesquisas-legais/open-finance-acesso/`, lido em 22/10/2026)

| Ponto | Norma | Fonte |
|---|---|---|
| Open Finance é implementado "por parte de instituições financeiras, instituições de pagamento e demais instituições autorizadas a funcionar pelo Banco Central" | Res. Conj. 1/2020, art. 1º (redação da Res. Conj. 4/2022) | [D05] compilada v9 do BCB |
| Parceria admitida "com entidades não autorizadas" para dados de cadastro e transações (art. 5º, I, "c" e "d"), com "prévio e expresso consentimento do cliente" | art. 36, caput e § 1º | [D05] |
| Vedada a parceria "entre instituições autorizadas" e "com o objetivo de que o parceiro contratado atue em nome da instituição contratante" | art. 36, § 5º | [D05] |
| A contratante avalia antes o parceiro: segurança, auditoria independente, registros de consentimento, controle de acesso. O contrato dá acesso ao BCB | arts. 37 e 38 (VII) | [D05] |
| ITP não guarda credencial do usuário nem usa o dado para outra finalidade | Res. BCB 80/2021, art. 4º | [D04] compilada do BCB |
| Ser ITP exige autorização prévia (art. 9º, Res. BCB 494/2025) e capital/PL mínimos de R$ 1.000.000,00 | Res. BCB 80/2021, art. 9º e art. 17, II (Res. BCB 407/2024) | [D04] |

Vigência: ambas não revogadas. Lidas na redação compilada do BCB (relatório do dossiê, §3).

### 2.4 Mercado (22/10/2026)

| Agregador | Preço | Participação | Grau |
|---|---|---|---|
| Pluggy | Dados: a partir de R$ 2.500/mês. Pagamentos: a partir de R$ 500/mês. Excedente por requisição. Sandbox grátis, 15 dias de teste | Na lista oficial. Declara licença ITP | V (pluggy.ai/en/pricing; openfinancebrasil.org.br/quem-participa) |
| Belvo | Não publicado. Relato de terceiro: ~R$ 6 mil/mês | Na lista oficial | Participação V; preço assumido |
| Celcoin | Não publicado | Na lista ("Celcoin Baas") | Participação V |

## 3. Colisões verificadas

- **`TESOURARIA` × `BankConnection`:** se a `TESOURARIA` criar `BankAccount`, a conexão deveria pendurar nela, não no
  `glAccountId`. F-OF-6 decide a ordem.
- **Guarda P3-4 × puxada incremental:** reusar o guarda do MP pararia o job na primeira sobreposição. F-OF-4.
- **Upload manual × puxada na mesma conta:** o mesmo dia pode entrar por OFX e pelo agregador. Sem dedupe entre origens,
  a linha duplica e o auto-match pode casar duas vezes o mesmo lançamento. F-OF-4 (c).

## 4. Decisões propostas e forks (todos PENDENTES)

### F-OF-0 — Quando construir

- (a) Construir agora a porta e o adaptador, e contratar junto.
- (b) **Construir só a porta e o `NullStatementSource`. O adaptador real fica para quando houver contrato assinado e um
  tenant pagando o custo.** Até lá, o OFX continua sendo a fonte.
- (c) Não fazer. Fica só no destino.

**Recomendação: (b).** O piso de R$ 2.500/mês não se paga com o 1º cliente. A porta é barata e evita retrabalho. O
adaptador sem contrato seria código sem oráculo: não há conta real para testar. **RATIFICAÇÃO PENDENTE.**

### F-OF-1 — Quem contrata o agregador

- (a) **Plataforma:** o Luminaris tem um contrato e rateia o custo entre os tenants. O cliente só dá consentimento.
- (b) **BYOK:** cada cliente contrata o agregador e cola a chave, como na cobrança MP (F-PP-1 b).

**Recomendação: (a).** O BYOK do MP funciona porque conta MP é gratuita e o salão já tem uma. Contrato de agregador
custa R$ 2.500/mês e exige due diligence (art. 37), o que é inviável para um salão. Implicação: o Luminaris vira o
parceiro do art. 36, com as obrigações do contrato do art. 38. Isso também muda o desenho de 1 instância por cliente
(F-PP-1). A credencial da plataforma fica no env, e cada `BankConnection` guarda só o id do "item" do agregador.
**RATIFICAÇÃO PENDENTE.**

### F-OF-2 — Qual agregador avaliar primeiro

- (a) **Pluggy:** preço público, sandbox grátis, participa, declara ITP.
- (b) Belvo.
- (c) Cotar os dois antes de escrever o adaptador.

**Recomendação: (a) para o sandbox, (c) antes de assinar.** O adaptador se escreve contra uma API real, e só o Pluggy
publica preço. **RATIFICAÇÃO PENDENTE.**

### F-OF-3 — "Acesso direto" (senha do usuário, fora do Open Finance)

- (a) **Proibido:** o adaptador recusa conexão que não seja Open Finance.
- (b) Permitido para bancos fora do Open Finance.

**Recomendação: (a).** Fora da Res. Conj. 1/2020 não há base de consentimento regulada, e não pesquisei norma sobre esse
modelo (§8). Senha de banco de terceiro com o agregador é risco que o produto não precisa correr. Os bancos de PJ
relevantes participam. **RATIFICAÇÃO PENDENTE.**

### F-OF-4 — Idempotência da puxada

- (a) **Dedupe antes do gate + guarda autoritativa nova.** Cada puxada vira um `BankStatement`. Antes de montar a
  tabela, descartam-se as transações cujo id do provedor já existe para a mesma conexão. O `sha256` é calculado sobre a
  serialização canônica do que sobrou (ordenada por id). A guarda autoritativa é uma tabela
  `BankConnectionTransaction` com `@@unique([bankConnectionId, providerTransactionId])`, gravada na mesma tx. Puxada sem
  nada novo não cria extrato.
- (b) Reusar o guarda P3-4: recusar e parar o job.
- (c) (a) **+ dedupe entre origens:** recusar no upload OFX as linhas cujo `externalRef` já veio pelo agregador na mesma
  conta contábil, e vice-versa.

**Recomendação: (a).** O (b) para o job toda manhã. O (c) só vale se o `externalRef` do OFX for o mesmo id que o
agregador devolve, o que não está provado (§9). Até lá, a recomendação é **uma conta contábil, uma origem**:
`BankConnection` ativa bloqueia upload manual naquela conta (comportamento 9). Só transações **lançadas** entram.
Pendentes podem mudar de valor e são ignoradas. **RATIFICAÇÃO PENDENTE.**

### F-OF-5 — O que dispara a puxada

- (a) **Job diário + botão "atualizar agora"**, com janela de N dias para trás (sobreposição proposital, absorvida pelo
  F-OF-4).
- (b) Webhook do agregador ("item atualizado") que só acorda a re-consulta, como no PP-D4 do MP (`ADR-INCR-PAYMENT-PROVIDER-COLLECTION.md:157`). O corpo do webhook
  nunca vira linha.
- (c) Só o botão.

**Recomendação: (a) agora, (b) depois.** O webhook entra na `publicApiRoutes` e exige verificação de assinatura. É
superfície que só se justifica com volume. **RATIFICAÇÃO PENDENTE.**

### F-OF-6 — Onde mora a conexão

- (a) **`BankConnection` nova (Prisma)**, com FK `Restrict` para `Account` folha (`glAccountId`). Migra para `BankAccount`
  quando a `TESOURARIA` existir.
- (b) Reusar `PaymentAccount` com `provider = OPEN_FINANCE_*`.
- (c) Esperar a `TESOURARIA` e pendurar na `BankAccount`.

**Recomendação: (a).** `PaymentAccount` é conta de **cobrança** num provedor. Conexão é **leitura** de conta bancária.
São objetos de domínio diferentes (Etapa 1 do `_REUSE-CRITERION`). O (c) amarra este item a uma proposta sem PRE-ADR.
Pela persistência, é Prisma: é integração com efeito contábil, não tabela que o usuário desenha (ADR-PERSISTENCE-BOUNDARY).
**RATIFICAÇÃO PENDENTE.**

### F-OF-7 — Consentimento vencido ou revogado

- (a) **Status `CONSENT_EXPIRED` / `REVOKED`.** O job pula a conexão e registra o motivo. A tela mostra "reconectar". O
  upload manual volta a valer na conta.
- (b) Só log.

**Recomendação: (a).** Falha silenciosa deixaria o cliente achar que a conciliação está em dia. **RATIFICAÇÃO PENDENTE.**

### F-OF-8 — Controle de saldo

- (a) **Gravar o saldo do agregador em `closingBalanceCents`** e acusar divergência entre o saldo e a soma das linhas.
- (b) Ignorar o saldo.

**Recomendação: (a).** É o único oráculo independente que a puxada traz. A divergência não bloqueia o import: vira aviso.
**RATIFICAÇÃO PENDENTE.**

### F-OF-9 — Id do nó

- (a) **`FIN-OF-EXTRATO`**, vizinho do FIN-05 e do F7.
- (b) Pendurar como sub-item do FIN-05.

**Recomendação: (a).** Tem fork, custo e contrato próprios. **RATIFICAÇÃO PENDENTE.**

## 5. Comportamentos candidatos do futuro BRIEF (esqueleto — não é checklist executável)

1. `StatementSourcePort` + `NullStatementSource` (recusa `NODE_ENV=production`, como o `NullCollectionProvider`).
2. `BankConnection` + `BankConnectionTransaction` (migração com prólogo defensivo: SQLite não é transacional).
3. CRUD da conexão: Route → Controller → Service → Repository (+ Policy `canReconcile`), DTO Zod `.strict()`, soft-delete.
4. Fluxo de consentimento: criar o "connect token" no agregador, receber o id do item, gravar a conexão `ACTIVE`.
5. Puxada: listar transações lançadas na janela → dedupe (F-OF-4) → tabela normalizada → `importStatement` com
   `preParsed` → gravar os ids na mesma tx → audit.
6. Job diário `bankConnectionFetch` com o tratamento do F-OF-7. Erro próprio para o "skip" (memória
   `erro-especifico-para-skip-em-job`).
7. Botão "atualizar agora" (mesma função do job, ator humano).
8. Controle de saldo (F-OF-8).
9. Conta com conexão ativa recusa upload manual (400 com o motivo).
10. Gates do diff: snapshot de shape dos DTOs, `auditCanonical.ts` com os eventTypes novos, openapi path-count, i18n pt/en.

Não entra no BE: a tela de conexão (FE-INCR separado).

## 6. Contratos esboçados

```ts
// Porta de aplicação. Chamada só por serviço ou job, nunca por plugin, RuleContext ou DynamicTableService.
export interface StatementSourcePort {
  readonly provider: 'PLUGGY' | 'NULL';
  createConnectToken(input: { bankConnectionId: string }): Promise<{ token: string; expiresAt: Date }>;
  getConnectionStatus(providerItemId: string): Promise<'ACTIVE' | 'CONSENT_EXPIRED' | 'REVOKED' | 'ERROR'>;
  listPostedTransactions(input: {
    providerItemId: string; providerAccountId: string; from: Date; to: Date;
  }): Promise<SourceTransaction[]>;
  getBalance(input: { providerItemId: string; providerAccountId: string }): Promise<{ cents: bigint; at: Date }>;
}

export interface SourceTransaction {
  providerTransactionId: string; // chave de dedupe (F-OF-4)
  date: string;                  // date-only YYYY-MM-DD, como o banco escreveu (memória: Date ISO UTC recua 1 dia)
  amountCents: bigint;           // com sinal: >0 entrada
  description: string;
  rawJson: string;
}
```

```prisma
model BankConnection {
  id                 String   @id @default(cuid())
  userId             String
  unitId             String
  provider           String   // PLUGGY | NULL
  glAccountId        String   // FK Account folha, Restrict
  providerItemId     String?  // id do consentimento/item no agregador
  providerAccountId  String?  // conta dentro do item
  status             String   // DRAFT | ACTIVE | CONSENT_EXPIRED | REVOKED | DISABLED
  statusReason       String?
  lastFetchedAt      DateTime?
  createdById        String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  deletedAt          DateTime?
  transactions       BankConnectionTransaction[]
  @@unique([userId, unitId, glAccountId]) // F-OF-4: uma conta, uma conexão
  @@index([userId, unitId, status])
}

model BankConnectionTransaction {
  id                    String @id @default(cuid())
  bankConnectionId      String
  providerTransactionId String
  statementLineId       String // a linha que ela gerou
  createdAt             DateTime @default(now())
  @@unique([bankConnectionId, providerTransactionId]) // guarda autoritativa da dedupe
}
```

A `@@unique` em `glAccountId` mais o soft-delete reabrem a armadilha registrada em `unique-de-idempotencia-x-soft-delete`:
desconectar e reconectar morre em P2002. O BRIEF decide entre a re-ativação da linha e uma chave composta com `deletedAt`.

## 7. Exemplo

Conta Itaú PJ, job às 06:00 com janela de 3 dias. Dia 1: 12 transações lançadas → 12 novas → 1 extrato, 12 linhas.
Dia 2: a janela traz 15, sendo 9 já vistas → 6 novas → 1 extrato, 6 linhas. Dia 3: domingo, 0 novas → nenhum extrato.
O auto-match do FIN-05 roda sobre as linhas como roda hoje.

## 8. Pendente de validação externa (não entra em checklist)

- **LGPD:** no contrato com o agregador, o Luminaris é controlador ou operador do extrato do cliente? Quem guarda o
  registro de consentimento que o art. 37, § 2º, I exige? Pergunta ao advogado, nessas palavras.
- **Base do agregador:** ele recebe os dados como instituição receptora própria ou por outra parceria? Isso define se o
  repasse ao Luminaris cai no art. 36 e se o § 5º, II pesa.
- **Validade do consentimento:** prazo máximo e renovação (art. 10 da Res. Conj. 1/2020). Não lido neste dossiê.
- **"Acesso direto":** nenhuma norma pesquisada (F-OF-3).

## 9. Insumos ausentes

- Documentação da API do Pluggy: schema da transação, estabilidade do id, status lançado × pendente, connect token,
  webhook. Não lida. Sem ela, o §6 é esboço.
- Se o `FITID` do OFX de cada banco é o mesmo id que o agregador devolve (decide o F-OF-4 c).
- Preço da Belvo e da Celcoin.

## 10. Achados fora de escopo (registrados, não planejados)

- **Pix de saída por iniciação (produto Pagamentos do agregador, R$ 500/mês):** alternativa ao F6, travado na chave
  ed25519 do MP. Exige autorização nova.
- **API Pix do próprio banco (`GET /pix`):** fonte gratuita dos Pix recebidos, sem agregador. Cobre parte do extrato.
  Pode ser o caminho barato enquanto o F-OF-0 for (b).
- **`TESOURARIA` / `BankAccount`:** a conexão migra para ela quando existir.

## 11. Como entra na fila (depois da ratificação)

Nota `docs/plano/nos/FIN-OF-EXTRATO.md` (F-OF-9), `depende_de: [FIN-05]`. Se F-OF-0 for (b), o BRIEF cobre os
comportamentos 1–3 e 9. O resto espera o contrato.

## Riscos desta proposta (incluindo os vieses do autor)

- **Custo × volume:** a proposta pode virar código parado se o contrato nunca vier. O F-OF-0 (b) limita isso à porta.
- **Viés de solução:** o dono pediu "agregador". Não comparei a fundo a API de extrato de cada banco, que seria gratuita
  mas é um adaptador por banco. Ficou como achado fora de escopo, não como fork.
- **Precedente contrário:** o dono preferiu emissor próprio a contratar a Focus (memória `focus-e-referencia`). Aqui não
  existe a opção "próprio": ser ITP exige autorização e R$ 1 milhão (§2.3).
- **Mudança de topologia:** F-OF-1 (a) cria a primeira credencial de plataforma compartilhada entre tenants. Hoje tudo é
  BYOK.

## Estado legal verificado em 22/10/2026

Res. Conj. BCB/CMN 1/2020 (compilada v9, até a Res. Conj. 15/2025) e Res. BCB 80/2021 (compilada, até a Res. BCB
494/2025), ambas não revogadas. Dossiê: `pesquisas-legais/open-finance-acesso/relatorio.md` (D01–D05, com sha256).
