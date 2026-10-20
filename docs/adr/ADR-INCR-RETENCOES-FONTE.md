# ADR-INCR-RETENCOES-FONTE — Retenções na fonte feitas e sofridas pelo tenant: IRRF, CSRF (CSLL/Cofins/PIS → só CSLL em 2027), INSS 11% e ISS retido em AP (serviço tomado) e AR (serviço prestado), perfil por contraparte × natureza, título de imposto por código e resumo mensal (nó RETENCOES-FONTE)

> **Verificação legal de 20/10/2026** (dossiê `pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md`,
> acervo ctresb/leis + Planalto compilado + Sijut). Artigos conferidos: RIR/2018 arts. 714, 716, 718, 723 [D09]; Lei 10.833
> arts. 29–36 [D01] com a nova redação dos arts. 30–34 pela **LC 214 art. 509 (efeitos 01/01/2027, art. 544 III)** [D08];
> Lei 13.137 (via [D01] compilada; [D02] original); Lei 8.212 art. 31 [D03]; LC 116 art. 6º [D04]; Lei 9.430 arts. 64 e 67
> [D07]; Lei 11.196 art. 70 I "e" [D11]. IN SRF 459/2004 **não lida em fonte oficial** (§10).

- **Data:** 2026-10-20
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork está decidido e nenhum código está autorizado.
- **Autor:** `sessao-planejamento` (agente), com base em `origin/main` `ad792aca`. Empilhado no PRE-ADR `IBS-CBS-2027`
  (PR #777) só por ordem de PR; não depende dele em conteúdo.
- **Autorização (ORCH-006), citada:**
  - dono, chat, 2026-10-20: *"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)."* — **Q2 (a)** da
    `PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20` §5: *"Sim, os três, `sessao-planejamento`, sem `executa`"*.
  - **Passo 1 (cobertura):** cobre exatamente este PRE-ADR e a nota do nó. **Divergência de escopo a reportar:** o item
    **PES-2** do `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF` (10/10) — *"retenções no contas a pagar + Reinf R-4000/R-2010"* — foi
    **ratificado em lote** com F-PES-0..13 pela recomendação (dono, chat, 2026-10-12, `D-2026-10-12-QUESTIONARIO-DONO`),
    mas **nenhum nó PES-* existe em `nos/`**. Este PRE-ADR e o do EFD-REINF **materializam o PES-2** em dois nós (fork
    F-RET-1 pede ao dono que confirme a troca de id e o fatiamento); não há dois desenhos concorrentes — o F-PES-5 (b) é
    herdado como insumo.
- **Related:** `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF` (§2.1 "retenções hoje", F-PES-1 (a) PES-2, F-PES-5 (b)) ·
  `ADR-INCR-AP-accounts-payable` / `ADR-INCR-AR-accounts-receivable` (duplo fato gerador, `Payable`/`PayablePayment`,
  `Receivable`/`ReceivableReceipt`) · `ADR-INCR-COUNTERPARTY-first-class` (`Counterparty.taxId`) · `ADR-INCR-PARTIAL-SETTLEMENT`
  (`paidCents`, gate de soma) · BRIEF `BE-INCR-IRRF-DISTRIBUICAO` (resumo mensal do DARF, L8 vencimento; `codigoReceita`
  1841/5706) · BRIEF `BE-INCR-TAX-ASSESSMENT-A` item 15 (retenções sofridas abatem o devido, `RETIDO_MESES`) · BRIEF
  `BE-INCR-PIS-COFINS` (retenções sofridas: `pisCofinsRetidoCompensarAccountId`, F-PCB-3 a) · BRIEF Fase C do X7 (ISS por
  competência com `retido` separado) · `ADR-INCR-DCTFWEB-MIT` D9 (retidos vão à Reinf, não ao MIT) · BRIEF `BE-INCR-LEGAL-PARAMS`
  (tabelas de plataforma) · nó irmão `EFD-REINF` (consome o que este nó grava).

## TLDR (2 linhas)

Hoje o tenant **não registra retenção alguma como pagador** (`Payable` sem campo de retenção; grep `reten` em `PayableDto.ts` = 0) e, como prestador, só informa à mão o que sofreu (X7 `RETIDO_MESES`, X8 payload, ISS `tpRetISSQN` da NFS-e). Este PRE-ADR cria o **perfil de retenção por contraparte × natureza do serviço** (dado versionado em LEGAL-PARAMS + `WithholdingProfile`), grava a **retenção por título** nos dois lados (AP: feita; AR: sofrida) no momento que a lei fixa por tributo, gera o **título de imposto** (Payable para a União/INSS/município, por código e competência, vencimento pela lei) e o **resumo mensal** que a EFD-Reinf (R-4020/R-4010/R-2010) e o X7/X8 consomem.
**Risco principal:** a CSRF muda em **01/01/2027** (LC 214 art. 509: só CSLL 1%) e o Simples como **pagador** retém IRRF mas não CSRF (Lei 10.833 art. 30 § 2º) — duas vigências e uma condição que, erradas, geram DARF a maior ou retenção faltante. A ambiguidade do IRRF do Simples como tomador (A do dossiê) e o mínimo de R$ 10 para PJ (B) vão ao contador.

---

## 1. Contexto e objetivo

- **O que já está decidido e este PRE-ADR respeita (§4):** AP e AR têm duplo fato gerador (reconhecimento e baixa) com
  `postEntry` direto; baixa parcial com `paidCents`/`receivedCents` como cache e gate de soma; contraparte first-class com
  `taxId` opcional; X7 abate retenções sofridas na apuração (item 15) sem lançá-las (F-PCB-3 a no X8); ISS retido já é lido
  da NFS-e (Fase C); IRRF-DISTRIBUICAO já fixou o molde do **resumo mensal de DARF** por código e competência (L8) e as
  tabelas de parâmetros versionadas; o PRE-ADR de pessoal entregou a Reinf das retenções ao "contas a pagar" (F-PES-5 b).
- **O que existe hoje (V, §2):** nada no lado pagador; no lado prestador, só campos de entrada manual.
- **Objetivo:** fixar (i) **quem** retém de quem (matriz tributo × pagador × beneficiário × regime); (ii) **quando** (fato
  gerador por tributo); (iii) **quanto** (base, alíquota com vigência, mínimo); (iv) **onde grava** (título, pagamento,
  razão); (v) **o que sai** (título de imposto, resumo mensal, insumo do X7/X8 e da Reinf); (vi) o que fica fora.

## 2. Evidência de código (CBM-001 — lida em `origin/main` `ad792aca`)

| Ponto | O que existe | Arquivo:linha |
|---|---|---|
| AP | `Payable { supplierName, supplierRef?, documentNumber?, issueDate, dueDate, amountCents, expenseAccountId?, counterpartyId (NOT NULL), status, paidCents, recoverableTaxLines? }` — **sem** retenção | `prisma/schema.prisma:1114-1150` |
| Pagamento do AP | `PayablePayment { amountCents, method Cash\|Pix\|TED\|Boleto, paidAt, status, entryId?, kind PAYMENT\|DISCOUNT }` | `prisma/schema.prisma:1178-1197` |
| AR | `Receivable { customerName, customerRef?, amountCents, revenueAccountId, counterpartyId, status, receivedCents, collectionCharges[] }` | `prisma/schema.prisma:1206-1232` |
| Recebimento do AR | `ReceivableReceipt { amountCents, method, receivedAt, debitAccountId?, kind }` | `prisma/schema.prisma:1249-1270` |
| Contraparte | `Counterparty { type SUPPLIER\|CUSTOMER, nameNormalized, ref?, taxId? (dígitos, sem DV), @@unique([userId, unitId, type, nameNormalized]) }` | `prisma/schema.prisma:1373-1400` |
| Retenções **sofridas** hoje | X8: `pisCofinsRetidoCompensarAccountId` (Asset) e linhas `RETENCAO_n` da memória vindas do payload; X7: `RETIDO_MESES` soma deduções informadas; ISS: `tpRetISSQN === 2` lido do `FiscalDocument` (`issCompetencia.ts:18,61`) | `TaxAssessmentService.ts`, `PisCofinsAssessmentService.ts`, `models/issCompetencia.ts` |
| Retenções **feitas** hoje | 0 ocorrências de `reten`/`withhold` em `PayableDto.ts`, `PayableService.ts`, `Payable` | grep |
| Resumo mensal de DARF (molde) | `GET /accounting/profit-distributions/irrf?competencia=` → `{ codigoReceita: '1841', totalRetidoCents, eventos, vencimento }` (BRIEF IRRF-DISTRIBUICAO item 21, L8) | BRIEF §2 L8, §3 item 21 |
| Tabela de plataforma | `LegalParameter` (tabela, chave, discriminador, valorInt bp, fonte, vigência, status) | `prisma/schema.prisma:3016-3040` |
| Perfil da PJ | `CompanyFiscalProfile.regime MEI\|SIMPLES\|PRESUMIDO\|REAL` por ano | `prisma/schema.prisma:1693-1700` |
| Perfil por serviço | `ServiceFiscalProfile.cTribNac` (6 dígitos da lista LC 116) — identifica o subitem (ex. 17.xx) | `prisma/schema.prisma:1793-1800` |
| Padrão de 2 commits | provisão do X7 PR-3; `postEntry` abre tx raiz (memória "postentry-tx-raiz") | `TaxAssessmentService.ts` |

## 3. Fonte legal (com grau)

| Regra | Fonte | Grau |
|---|---|---|
| **IRRF 1,5%** sobre importâncias **pagas ou creditadas** por PJ a PJ por serviços de natureza profissional (lista do § 1º: 40 itens, inclui medicina, fisioterapia, estética? — a lista é do § 1º e precisa ser lida item a item no BRIEF) | RIR/2018 art. 714 caput e § 1º [D09] | V (caput); lista = NV neste PRE-ADR |
| **IRRF 1%** limpeza, conservação, segurança, vigilância, locação de mão de obra | RIR/2018 art. 716 [D09] | V |
| **IRRF 1,5%** comissões, corretagens, representação comercial, propaganda e publicidade | RIR/2018 art. 718 I–II [D09] | V |
| IRRF 1,5% assessoria creditícia etc. | RIR/2018 art. 723 (Lei 10.833 art. 29) [D09][D01] | V |
| Prazo do IRRF: **último dia útil do 2º decêndio do mês subsequente** ao fato gerador (demais casos) | Lei 11.196 art. 70 I "e" [D11] | V |
| IRRF ≤ R$ 10 dispensado — texto restrito a rendimentos da **declaração de ajuste anual (PF)** | Lei 9.430 art. 67 [D07] | V (texto); aplicação a PJ = **NV** (ambiguidade B) |
| **CSRF 4,65%** (CSLL 1 + Cofins 3 + PIS 0,65) nos **pagamentos** PJ→PJ por limpeza, conservação, manutenção, segurança, vigilância, transporte de valores, locação de mão de obra, assessoria creditícia…, e **serviços profissionais** | Lei 10.833 arts. 30 caput, 31 caput [D01] | V |
| Aplica-se também a pagamentos por associações, sociedades simples/cooperativas, fundações, condomínios | Lei 10.833 art. 30 § 1º [D01] | V |
| **Pagador optante pelo SIMPLES não retém CSRF** | Lei 10.833 art. 30 § 2º [D01] | V |
| CSRF sem prejuízo do IRRF | Lei 10.833 art. 30 § 3º [D01] | V |
| Beneficiário isento de uma contribuição: retém só as demais, pela alíquota específica | Lei 10.833 art. 31 § 2º [D01] | V |
| **CSRF ≤ R$ 10 dispensada** (exceto DARF eletrônico via Siafi) | Lei 10.833 art. 31 § 3º (red. Lei 13.137) [D01] | V |
| **Pagamento a optante pelo SIMPLES não sofre CSRF**; cooperativas (só CSLL); transporte internacional/estaleiros (só CSLL) | Lei 10.833 art. 32 III e p.ú. [D01] | V |
| Recolhimento da CSRF: **último dia útil do 2º decêndio do mês subsequente ao pagamento**, centralizado na matriz | Lei 10.833 art. 35 (red. Lei 13.137) [D01] | V |
| Retido = antecipação do devido pelo beneficiário | Lei 10.833 art. 36 [D01] | V |
| **A partir de 01/01/2027 a retenção é só da CSLL, a 1%** (nova redação dos arts. 30, 31, 33, 34; art. 32 p.ú. "será exigida a retenção da CSLL") | LC 214 art. 509; efeitos art. 544 III (red. LC 227) [D08] | V |
| **INSS 11%** sobre o valor bruto da NF de serviços executados mediante **cessão de mão de obra** (inclusive temporário); recolher em nome da cedente até o **dia 20 do mês subsequente à emissão** da NF; valor **destacado na NF**; compensável pela cedente | Lei 8.212 art. 31 caput e § 1º [D03] | V |
| Quais serviços são "cessão de mão de obra" / empreitada (limpeza, vigilância, etc.) | IN RFB 2.110/2022 (arts. sobre cessão) | **NV** (não lida) |
| **ISS retido**: município pode atribuir responsabilidade a terceiro por lei (caput); responsável recolhe integral mesmo sem reter (§ 1º); **responsáveis obrigatórios**: tomador de serviço do exterior (§ 2º I) e PJ tomadora dos subitens 3.05, 7.02, 7.04, 7.05, 7.09, 7.10, 7.12, 7.16, 7.17, 7.19, 11.02, 17.05, 17.10 (§ 2º II) | LC 116 art. 6º caput, §§ 1º–2º [D04] | V |
| ISS retido do **salão/clínica como prestador** já é lido da NFS-e (`tpRetISSQN`); a lei municipal de cada tomador decide o resto | BRIEF Fase C do X7; LC 116 art. 6º | V (código) · lei municipal = **NV** |
| Órgãos públicos federais retêm IR/CSLL/Cofins/PIS (fora do escopo: o tenant não é órgão público; como **prestador** a órgão público, sofre) | Lei 9.430 art. 64; Lei 10.833 art. 34 [D07][D01] | V (texto); escopo = fora |
| Retidos vão para a **EFD-Reinf**, não para o MIT | IN RFB 2.237 art. 9º § 1º I (ADR do X9, V-fonte em 02/10) | V-adr |
| Dispensa de IRRF/CSRF **a** optantes do Simples Nacional (atualização do "SIMPLES" da lei); dispensa de reter **pelo** optante | IN SRF 459/2004 (red. IN 765/2007, 791/2007, 1.151/2011); IN RFB 765/2007 | **NV** (só espelhos; ambiguidade A) |
| Códigos de DARF: IRRF serviços PJ **1708**; CSRF **5952** (ou 5987 CSLL / 5960 Cofins / 5979 PIS quando separados); GPS **2631** (retenção 11%) | referência TOTVS (Central PCC) e MAFON — tabelas da RFB **não lidas** | **I** |
| Reforma: CBS **não** entra na CSRF (a LC 214 só manteve CSLL); o split payment substitui a função de "retenção" para IBS/CBS | LC 214 arts. 31–33 e 509 [D08] | V |

## 4. Decisões já ratificadas que limitam o desenho

| Decisão | Efeito aqui |
|---|---|
| **F-PES-1 (a) → PES-2** e **F-PES-5 (b)** (ratificados em lote 12/10) | "Retenções no contas a pagar" é o lugar; Reinf R-4010/R-4020/R-4099 + R-2010/R-2099 derivam de **campos de retenção no pagamento do contas a pagar** (natureza do rendimento, beneficiário, base, IR, CSLL, PIS, Cofins). Este PRE-ADR é a materialização; o id muda (F-RET-1) |
| `ADR-INCR-AP`/`AR` F0 (a) `postEntry` direto; duplo fato gerador | A retenção entra como **leg** nos entries de reconhecimento (IRRF/INSS/ISS) e de baixa (CSRF), sem entry paralelo |
| `ADR-INCR-PARTIAL-SETTLEMENT` (F-PS1 c) | `paidCents ≤ amountCents − novo`: o título **bruto** fica em `amountCents`; o pagamento registra o **líquido** mais a retenção como kind próprio — a soma `pago + retido + desconto` fecha o título (invariante 3) |
| `ADR-INCR-COUNTERPARTY` (F-CP1 A1) | O perfil de retenção pende do `Counterparty` (first-class); `taxId` opcional hoje — CPF × CNPJ decide R-4010 × R-4020 (F-RET-5) |
| X7 Fase A item 15 / X8 F-PCB-3 (a) | Retenções **sofridas** abatem o devido e **não são lançadas** pela provisão; este nó lança a retenção sofrida **no recebimento** (D7) — o X8 (F-PCB-3 a) continua não lançando; a emenda de 06/10 do X8 (retenções no razão, "sim, os dois") é o precedente do lançamento |
| `ADR-INCR-DCTFWEB-MIT` D9 | Retidos ficam fora do MIT; vão à Reinf (nó irmão) |
| BRIEF `BE-INCR-IRRF-DISTRIBUICAO` L8/item 21 | Molde do resumo mensal por `codigoReceita` + `vencimento` (último dia útil do 2º decêndio) — reusar a função de vencimento; dividendos/JCP **ficam lá** |
| BRIEF `BE-INCR-LEGAL-PARAMS` | Alíquotas, mínimos, vigências e códigos em `legal_parameters` com `fonte`; nunca constante em código |
| T9 BRL-only · T10 · R-motor-regras · ADR-PERSISTENCE-BOUNDARY | Prisma first-class (lei desenha; atomicidade título + imposto + razão); matriz de incidência é **dado** (`WithholdingProfile` + tabela), aplicação é chamada nomeada no serviço de AP/AR — sem rule engine |
| ADR-PERSISTENCE-BOUNDARY / Contrato §2.1 | Fornecedor/cliente podem continuar em DynamicTable (`ref`); a **retenção** é Prisma |
| `D-2026-10-14-FILA-ORDEM-RATIFICADA` + Q1 (a) | F1, depois de A–E |

## 5. Decisões fixadas (sem fork)

**D1 — Dois lados, um model.** `TaxWithholding` registra retenção **feita** (lado AP: `direction = MADE`, o tenant é
fonte pagadora) e **sofrida** (lado AR: `direction = SUFFERED`, o cliente reteve). Mesma forma, sinais contábeis opostos.

**D2 — Fato gerador por tributo, como a lei diz (ambiguidade C ao contador, mas a leitura segura é a da letra):**
IRRF no **crédito ou pagamento, o que vier primeiro** (RIR art. 714 "pagas ou creditadas") ⇒ nasce no **reconhecimento**
do título (`issueDate`); CSRF no **pagamento** (Lei 10.833 art. 30 "pagamentos efetuados") ⇒ nasce na **baixa**; INSS 11%
na **emissão da NF** (Lei 8.212 art. 31) ⇒ reconhecimento; ISS retido ⇒ reconhecimento (documento). Logo o título AP
carrega `withholdings[]` com `event ∈ RECOGNITION | SETTLEMENT`; a baixa parcial rateia a CSRF proporcionalmente ao
pago (F-RET-4 decide o arredondamento).

**D3 — Vigência da CSRF em `legal_parameters` tabela `RETENCAO`:** linhas `CSRF/CSLL` 100 bp, `CSRF/COFINS` 300 bp,
`CSRF/PIS` 65 bp com `vigenteAte = 2026-12-31`; linha `CSRF/CSLL` 100 bp `vigenteDesde = 2027-01-01` (LC 214 art. 509).
Linhas `IRRF/SERVICO_PROFISSIONAL` 150 bp, `IRRF/LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO` 100 bp, `IRRF/COMISSAO_PROPAGANDA`
150 bp, `INSS/CESSAO_MAO_DE_OBRA` 1100 bp; mínimos `CSRF/MINIMO` 1000 centavos (art. 31 § 3º) e `IRRF/MINIMO` (sem valor até
a ambiguidade B — F-RET-6); códigos de receita `CODIGO_RECEITA/IRRF_SERVICO_PJ = 1708`, `CSRF = 5952` etc. com `fonte`
"tabela RFB — **a conferir**" (grau I ⇒ linha `DRAFT` até leitura oficial, como no IBS-CBS D2).

**D4 — Quem retém de quem, por regime (dado, não código):** pagador `SIMPLES`/`MEI` ⇒ **não retém CSRF** (art. 30 § 2º) e
**retém IRRF** (leitura segura da ambiguidade A, com aviso); beneficiário optante (`Counterparty` com `regimeTributario =
SIMPLES`) ⇒ **não sofre CSRF** (art. 32 III) e **não sofre IRRF** (IN 765 — grau I, aviso "declaração de optante" a anexar);
beneficiário **PF** ⇒ IRRF pela tabela progressiva (fora deste nó: F-RET-7), sem CSRF/INSS 11%; beneficiário cooperativa ⇒
só CSLL (art. 32 I).

**D5 — Natureza do serviço por título, do perfil de retenção.** `WithholdingProfile` por `(counterpartyId, naturezaServico)`
grava a matriz aplicável (IRRF sim/não + chave da alíquota; CSRF sim/não; INSS sim/não; ISS retido sim/não + `codMun` +
alíquota informada) com `fonte` do enquadramento (ex. "RIR art. 714 § 1º item 24"). O título herda o perfil e pode
sobrescrever **para menos** com motivo (ex. isenção comprovada, art. 31 § 2º). Sem perfil ⇒ sem retenção, com aviso
`SEM_PERFIL_RETENCAO` quando a contraparte for PJ prestadora de serviço (`expenseAccountId` de natureza "serviço" — F-RET-3).

**D6 — Título de imposto = `Payable` com `counterparty` da União/INSS/município**, um por `(competência, codigoReceita)`,
`documentNumber = <codigo>-<AAAAMM>`, `dueDate` = vencimento legal (IRRF e CSRF: último dia útil do 2º decêndio do mês
seguinte; INSS: dia 20 do mês seguinte à emissão; ISS: lei municipal — informada), gerado/atualizado pelo serviço ao
confirmar cada retenção (**mesma tx** do título/pagamento de origem, `postEntry` só uma vez por efeito — memória
"postentry-tx-raiz"). A consolidação mensal substitui o "DARF por título": o `Payable` de imposto cresce com cada retenção
(`amountCents` recalculado; `OPEN` até a baixa).

**D7 — Contabilização:**
- AP, reconhecimento com IRRF/INSS/ISS: D despesa (bruto) / C fornecedor (líquido) / C IRRF a recolher · C INSS retido a
  recolher · C ISS retido a recolher.
- AP, baixa com CSRF: D fornecedor (parcela baixada, bruta) / C banco (líquida) / C CSRF a recolher.
- AR, recebimento com retenção sofrida: D banco (líquido) / D IRRF a compensar · D CSRF a compensar · D ISS retido (resultado
  ou compensação por lei municipal) / C cliente (bruto).
- Contas pelo perfil contábil (`withholdingAccountMap`), folhas do referencial (item ao contador P-RET-4).

**D8 — Resumo mensal por código** (`GET /accounting/withholdings/summary?competencia=`): total retido feito por
`codigoReceita` com `vencimento`, eventos e beneficiários (base do R-4020/R-4010/R-2010 do nó EFD-REINF); total sofrido por
tributo (insumo para o X7 item 15, X8 e ISS da Fase C — F-RET-8 decide se alimenta automaticamente).

**D9 — Mínimo de R$ 10 da CSRF** (art. 31 § 3º): retenção calculada ≤ 1000 centavos ⇒ **não retém** e registra
`DISPENSA_MINIMO` com o valor (não acumula para o mês seguinte — o texto não manda acumular). IRRF: F-RET-6.

**D10 — Fora deste nó:** retenção de PF (tabela progressiva, pró-labore, aluguel PF) e eSocial — PRE-ADR de pessoal
(PES-1/PES-4); dividendos/JCP — IRRF-DISTRIBUICAO; órgão público como pagador (art. 64); ISS do tenant como prestador
(X7 Fase C, já lê); CBS/IBS (split payment, nó IBS-CBS-2027); transmissão Reinf (nó EFD-REINF).

## 6. Esqueleto de comportamentos por PR

Fatiamento proposto (F-RET-2): **PR-1 dado + perfil · PR-2 AP (feitas) · PR-3 AR (sofridas) + resumo · PR-4 ligação X7/X8/ISS**.

| # | Comportamento | Toca | Fork |
|---|---|---|---|
| 1 | Tabela `RETENCAO` + `CODIGO_RECEITA` em `legal_parameters` (D3), com vigência 2026/2027 e linhas `DRAFT` onde a fonte é I | migração de dado + `models/retencaoParams.ts` | — |
| 2 | `Counterparty.regimeTributario? ∈ SIMPLES\|MEI\|PRESUMIDO\|REAL\|PF\|COOPERATIVA\|EXTERIOR` + `taxIdKind CPF\|CNPJ` derivado do `taxId` (migração aditiva) | schema + DTO + serviço | F-RET-5 |
| 3 | Model `WithholdingProfile` (D5) + repo + policy + rotas em 2 toques | Prisma + camadas | — |
| 4 | Função pura `calcularRetencoes(titulo, perfil, tabela, regimePagador, data)` → `{ linhas[], avisos[] }` (D2, D4, D9) | `models/withholdingCalc.ts` | F-RET-6 |
| 5 | `PayableDto` aceita `withholdings?: [{ tributo, event, baseCents?, aliquotaBp?, amountCents, codMun? }]` **só para menos** que o perfil (motivo obrigatório); sem perfil ⇒ aviso | DTO + serviço | F-RET-3 |
| 6 | Reconhecimento do AP grava `TaxWithholding` (RECOGNITION) e o entry com as legs do D7 na **mesma tx** | `PayableService` + mapper | — |
| 7 | Baixa do AP: `PayablePayment.kind = 'WITHHOLDING'` (molde `DISCOUNT`) com o valor retido; CSRF calculada sobre a parcela paga; gate de soma `pago + retido + desconto ≤ amountCents` | serviço + schema (`SETTLEMENT_KINDS`) | F-RET-4 |
| 8 | Título de imposto (D6): upsert do `Payable` da União/INSS/município por `(competência, codigoReceita)` na mesma tx | serviço | — |
| 9 | Cancelamento de pagamento/título reverte a retenção e abate o título de imposto (estorno T5), bloqueado se o imposto já foi pago (409 nomeado) | serviço | — |
| 10 | AR: `ReceivableReceipt.kind = 'WITHHOLDING'` + `TaxWithholding` SUFFERED com documento do cliente (`documentNumber` da NF/comprovante) e entry do D7 | `ReceivableService` | — |
| 11 | Resumo mensal (D8) feito/sofrido, com `vencimento` pela função já usada no IRRF-DISTRIBUICAO | rota + serviço | — |
| 12 | Ligação ao X7 item 15 / X8 / ISS Fase C: retenções sofridas do mês entram na prévia como sugestão (`entradaInformada` continua mandando) | serviços de apuração | F-RET-8 |
| 13 | Pacote do contador: `EXPORT_RETENCOES` (feitas + sofridas por competência) | C6b | — |
| 14 | Matriz de obrigações: nada aqui (a Reinf entra no nó irmão) | — | — |
| 15 | Gates: snapshot de DTOs; allowlist `auditCanonical.ts` (`ap.withholding.recorded/reversed`, `ar.withholding.recorded`: ids, tributo, cents — **sem `taxId`**); openapi path-count; i18n dos avisos; `check:arch` | vários | — |

## 7. Contratos esboçados

```prisma
model WithholdingProfile {
  id              String    @id @default(cuid())
  userId          String
  unitId          String
  counterpartyId  String
  counterparty    Counterparty @relation(fields: [counterpartyId], references: [id], onDelete: Restrict)
  naturezaServico String    // chave da tabela RETENCAO (SERVICO_PROFISSIONAL | LIMPEZA_CONSERVACAO_SEGURANCA_LOCACAO | COMISSAO_PROPAGANDA | CESSAO_MAO_DE_OBRA | OUTRO)
  irrf            Boolean
  csrf            Boolean
  inss            Boolean
  issRetido       Boolean
  issCodMun       String?   // IBGE 7 — obrigatório se issRetido
  issAliquotaBp   Int?      // informada (lei municipal) — obrigatória se issRetido
  fonte           String    // enquadramento citado (ex. "RIR/2018 art. 714 § 1º item 24")
  vigenteDesde    String
  vigenteAte      String?
  createdById     String?
  updatedById     String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  deletedAt       DateTime?
  @@index([userId, unitId, counterpartyId])
  @@map("withholding_profiles")
}

model TaxWithholding {
  id             String    @id @default(cuid())
  userId         String
  unitId         String
  direction      String    // MADE (AP) | SUFFERED (AR)
  tributo        String    // IRRF | CSLL | COFINS | PIS | INSS | ISS   (CSRF = 3 linhas até 2026, 1 em 2027)
  event          String    // RECOGNITION | SETTLEMENT
  titleType      String    // PAYABLE | RECEIVABLE
  titleId        String
  settlementId   String?   // payable_payments.id | receivable_receipts.id (event = SETTLEMENT)
  baseCents      BigInt
  aliquotaBp     Int
  amountCents    BigInt    // > 0; 0 só com dispensa registrada em `dispensa`
  dispensa       String?   // MINIMO_R10 | OPTANTE_SIMPLES | COOPERATIVA | ISENCAO_COMPROVADA
  codigoReceita  String?   // 1708 | 5952 | … (MADE)
  competencia    String    // YYYY-MM do fato gerador
  taxPayableId   String?   // Payable do imposto (D6), MADE
  entryId        String?   // journal_entries.id onde a leg foi gravada
  parametrosSha256 String
  status         String    // ACTIVE | REVERSED
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@index([userId, unitId, competencia, direction])
  @@index([titleType, titleId])
  @@map("tax_withholdings")
}
```

```ts
// DTO (Zod .strict()) — trecho do PayableDto
export const WithholdingLineSchema = z.object({
  tributo: z.enum(['IRRF', 'CSLL', 'COFINS', 'PIS', 'INSS', 'ISS']),
  event: z.enum(['RECOGNITION', 'SETTLEMENT']),
  amountCents: z.coerce.bigint().min(0n),          // só ≤ ao calculado pelo perfil (D5)
  motivo: z.string().min(3).max(140).optional(),   // obrigatório se amountCents < calculado
}).strict();

// models/withholdingCalc.ts — pura
export interface EntradaRetencao {
  direction: 'MADE' | 'SUFFERED'; event: 'RECOGNITION' | 'SETTLEMENT';
  baseCents: bigint; data: string;                              // date-only
  pagador: { regime: 'MEI' | 'SIMPLES' | 'PRESUMIDO' | 'REAL' };
  beneficiario: { regime: 'SIMPLES' | 'MEI' | 'PRESUMIDO' | 'REAL' | 'PF' | 'COOPERATIVA' | 'EXTERIOR'; kind: 'CPF' | 'CNPJ' };
  perfil: Pick<WithholdingProfile, 'naturezaServico' | 'irrf' | 'csrf' | 'inss' | 'issRetido' | 'issAliquotaBp'>;
  tabela: readonly LinhaLegal[];
}
export function calcularRetencoes(e: EntradaRetencao): { linhas: LinhaRetencao[]; avisos: string[] };

// GET /accounting/withholdings/summary?competencia=YYYY-MM
export const WithholdingSummarySchema = z.object({
  competencia: z.string(),
  feitas: z.array(z.object({ codigoReceita: z.string(), tributo: z.string(), totalCents: z.bigint(), vencimento: z.string(), eventos: z.number().int(), taxPayableId: z.string().nullable() })),
  sofridas: z.array(z.object({ tributo: z.string(), totalCents: z.bigint(), eventos: z.number().int() })),
}).strict();
```

## 8. FORKS — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-RET-1** Id e relação com o PES-2 | **(a)** `RETENCOES-FONTE` + `EFD-REINF` substituem o PES-2 (F-PES-1 a) como dois nós; o PRE-ADR de pessoal ganha uma linha de "superado por" na próxima emenda · (b) manter o id PES-2 e fundir os dois nós · (c) três nós (PES-2 só para a parte de pessoal: PF/pró-labore) | **(a).** O PES-2 ratificado é "retenções no AP + Reinf"; separar em dois nós segue "menor dependência primeiro" (a Reinf depende das retenções, não o contrário) e o Q2 (a) já nomeou os dois ids. (c) é o que sobra para o PRE-ADR de pessoal de todo modo (D10) | baixo |
| **F-RET-2** Fatiamento | **(a)** 4 PRs (§6) · (b) 2 PRs (dado + tudo) | **(a).** PR-1/PR-2 fecham o lado pagador (o que a Reinf precisa); PR-3 fecha o X7/X8 | baixo |
| **F-RET-3** Escopo do lado pagador | **(a) completo:** IRRF + CSRF + INSS 11% + ISS retido, com perfil por contraparte × natureza e mínimo · (b) **mínimo:** IRRF + CSRF em serviços profissionais (RIR 714 + Lei 10.833 art. 30), sem INSS e sem ISS — **deixa aberto** limpeza/vigilância por cessão (R-2010) e o ISS do tomador obrigatório (LC 116 art. 6º § 2º II: 7.02/7.05/17.05 etc.) | **(a).** O salão/clínica contrata limpeza (INSS 11% se for cessão de mão de obra; IRRF 1%) e serviços dos subitens do § 2º II (17.05 fornecimento de mão de obra). O (b) atende "serviços profissionais" e deixa a Reinf R-2010 sem fonte | médio em (b) |
| **F-RET-4** CSRF na baixa parcial | **(a)** proporcional ao pago, arredondamento por parcela, mínimo de R$ 10 por **pagamento** (texto: "retenção de valor igual ou inferior a R$ 10") · (b) CSRF integral na 1ª baixa | **(a).** É o que a lei e a prática (TOTVS `MV_BX10925` = na baixa) fazem; (b) retém antes do pagamento | baixo |
| **F-RET-5** Regime do beneficiário | **(a)** `Counterparty.regimeTributario` + `taxIdKind`, com "declaração de optante" como `SourceDocument` opcional (aviso quando ausente) · (b) só `taxIdKind` (CPF/CNPJ) e perguntar o regime por título | **(a).** Sem o regime do beneficiário o D4 não decide CSRF; a declaração é o que a IN 459 (I) exige e o que o contador cobra | médio em (b): CSRF retida de optante |
| **F-RET-6** Mínimo de R$ 10 no IRRF de PJ | **(a)** aplicar o mínimo ao IRRF só com fonte lida (linha `DRAFT`); até lá reter qualquer valor > 0 e avisar · (b) aplicar R$ 10 por analogia ao art. 67 | **(a).** O art. 67 fala em ajuste anual (PF); reter a menor é o erro caro. Pergunta P-RET-2 | baixo em (a) |
| **F-RET-7** Beneficiário PF | **(a)** fora (PRE-ADR de pessoal: tabela progressiva, dependentes, INSS do contribuinte individual) — o nó só registra `direction/tributo` com `PF` ⇒ 400 nomeado "retenção de PF é do nó de pessoal" · (b) incluir IRRF de PF pela tabela progressiva | **(a).** Tabela progressiva, deduções e o eSocial (S-1210) são outro domínio com outro oráculo; misturar reabre o F-PES-0 | baixo |
| **F-RET-8** Alimentar X7/X8/ISS automaticamente | **(a)** sugestão na prévia (soma das SUFFERED do período) com `entradaInformada` prevalecendo e aviso de divergência · (b) substituir a entrada manual | **(a).** O X7 (F-TA-1..10) e o X8 já estão em `main` com a entrada manual ratificada; (b) emenda dois BRIEFs mergeados. A sugestão fecha a lacuna sem reabrir | baixo |
| **F-RET-9** Conta do ISS retido sofrido | **(a)** ativo "ISS retido a compensar" quando a lei municipal permite compensar; senão despesa — escolha no perfil contábil com fonte · (b) sempre despesa | **(a)**, condicionada a P-RET-4 | baixo |

## 9. Pendente de validação externa — item 1b do D1

| # | Pergunta | Por que importa | Quem fecha |
|---|---|---|---|
| P-RET-1 | O tenant optante pelo Simples, como **tomador**, retém o IRRF de 1,5% (RIR art. 714) de outra PJ? E de outra optante? (ambiguidade A) | D4 | contador |
| P-RET-2 | Base legal do mínimo de R$ 10 para o **IRRF de PJ** (ambiguidade B) | F-RET-6 | contador |
| P-RET-3 | Confirma o fato gerador por tributo (IRRF no crédito; CSRF na baixa; INSS na emissão)? (ambiguidade C) | D2 | contador |
| P-RET-4 | Contas do referencial para IRRF/CSRF/INSS/ISS a recolher e a compensar; o ISS retido sofrido compensa no município do tenant? | D7, F-RET-9 | contador (já no pedido de 23/09, códigos do referencial) |
| P-RET-5 | Quais serviços que o salão/clínica contrata são "cessão de mão de obra" (IN 2.110) e quais subitens da LC 116 o município do tenant torna retidos | F-RET-3 | contador + lei municipal |
| P-RET-6 | Códigos de DARF/GPS (1708, 5952/5979/5960/5987, 2631) e o código da CSLL retida em 2027 | D3 | tabela da RFB (fonte oficial, a ler) |

## 10. Insumos ausentes (regra 2)

1. **IN SRF 459/2004** vigente (Simples Nacional nos dois sentidos; declaração de optante do art. 11): o Sijut não ofereceu
   busca navegável nesta sessão; os espelhos não são fonte.
2. **Lista do § 1º do art. 714 do RIR** (40 itens) — lida só o caput; o enquadramento de "estética"/"fisioterapia" exige a
   lista no BRIEF.
3. **IN RFB 2.110/2022** (cessão de mão de obra) e **tabelas de códigos** DARF/GPS.
4. **Lei municipal de ISS** do município do tenant (responsabilidade do tomador além do § 2º II).

## 11. Achados fora de escopo (regra 5)

1. `Counterparty.taxId` sem DV ("no checksum this phase") — a Reinf exige CPF/CNPJ válidos; a validação entra no nó
   EFD-REINF ou numa emenda do COUNTERPARTY, não aqui.
2. `PayablePayment.method` fechado (Cash/Pix/TED/Boleto) — pagamento com retenção não é método; por isso `kind`.
3. A memória do X8 cita "IN SRF 459/2004 (inferido)" na linha de retenções — continua inferido.
4. **Pesquisa de código-fonte (regra do dono: Odoo/ERPNext antes de fork de arquitetura).** ERPNext (`version-15`,
   `tax_withholding_category.py`, lido 20/10): categoria com **taxas por vigência**, **limiar único e acumulado no ano
   fiscal**, `tax_on_excess_amount`, **certificado de dedução menor (LDC)**, conta de retenção por empresa; a retenção é
   calculada na **fatura** (`get_party_tax_withholding_details`, linha "Deduct" com `is_tax_withholding_account`), com
   avanços somados ao limiar. Odoo 18 (`l10n_account_withholding_tax/models/account_tax.py`): `is_withholding_tax_on_payment`
   — a retenção **não afeta contas até o pagamento**, com sequência de certificado. OCA `l10n_br_account_withholding` (16.0):
   retenção configurada por **grupo de imposto**, gera **fatura de retenção** na confirmação da compra, parceiro "Prefeitura"
   para o ISS. **O que isto decide aqui:** os três modelam a retenção **no documento financeiro, não na folha** (confirma
   F-PES-5 b); ERPNext mostra que limiar/vigência/LDC são **dado**, não engine (D3/D5); Odoo mostra o fato gerador no
   pagamento como opção — que a lei brasileira exige **por tributo** (D2), não globalmente. Nada disso é copiado; serve
   como régua de completude.

## 12. Riscos e vieses (T8)

- **Risco — vigência 2027 da CSRF.** Uma linha de tabela errada e o tenant retém Cofins/PIS que não existem mais ou deixa de
  reter CSLL. Invariante 1 cobre.
- **Risco — Simples como pagador.** A lei dispensa a CSRF, não o IRRF; o dado do pagador vem do `CompanyFiscalProfile`
  do ano. Invariante 2.
- **Risco — retenção a menor por "sem perfil".** D5 avisa, não bloqueia; é o custo de não ter engine.
- **Viés 1 (completude × 1º cliente):** o salão Simples é pagador que **não** retém CSRF e cujo IRRF como tomador é a
  ambiguidade A; o valor para o 1º cliente é o lado **sofrido** (AR) e o IRRF feito. Declarado.
- **Viés 2 (reuso do IRRF-DISTRIBUICAO):** o molde do resumo/DARF é reusado; o model **não** — dividendos não têm base
  por título nem perfil por contraparte.
- **Caso adversarial tentado contra "é só uma linha a menos no pagamento":** um título de R$ 300 pago em 3 parcelas de
  R$ 100 — a CSRF de cada parcela é R$ 4,65 (≤ R$ 10 ⇒ dispensada), enquanto na baixa única seria R$ 13,95 (retida). O
  mínimo por pagamento muda o resultado conforme o fatiamento da baixa; é o que a lei diz ("valor igual ou inferior a R$
  10,00", por retenção) e por isso o F-RET-4 é fork e a invariante 6 existe. O que me derrubaria: a IN 459 mandar acumular
  no mês — não lida (P-RET-2/insumo 1).

## 13. Invariantes que a implementação DEVE provar

1. Data 2026-12-31 ⇒ CSRF = 465 bp em 3 linhas; 2027-01-01 ⇒ CSLL 100 bp em 1 linha; sem Cofins/PIS.
2. Pagador SIMPLES/MEI ⇒ nenhuma linha CSRF; linha IRRF conforme o perfil (com aviso `AMBIGUIDADE_A`).
3. `amountCents(título) = Σ pago + Σ retido (SETTLEMENT) + Σ desconto` ao fechar; retenção de RECOGNITION reduz o líquido do fornecedor no entry, não o `amountCents`.
4. Beneficiário `SIMPLES` ⇒ sem CSRF (art. 32 III); `COOPERATIVA` ⇒ só CSLL; `PF` ⇒ 400 nomeado (F-RET-7 a).
5. Retenção calculada ≤ R$ 10 (CSRF) ⇒ `amountCents = 0` + `dispensa = MINIMO_R10`, sem linha no título de imposto.
6. Baixa parcial: CSRF proporcional ao pago, mínimo avaliado **por pagamento**.
7. Título de imposto por `(competência, codigoReceita)`: 2 retenções no mesmo mês ⇒ 1 `Payable` com a soma; estorno de uma ⇒ subtrai; imposto já pago ⇒ 409.
8. `dueDate` do título de imposto = último dia útil do 2º decêndio do mês seguinte (IRRF/CSRF) e dia 20 do mês seguinte à emissão (INSS), pela função de dias úteis já usada no IRRF-DISTRIBUICAO.
9. Entries do D7 batem (Σ débito = Σ crédito) e a auditoria não carrega `taxId`.
10. `parametrosSha256` gravado em cada retenção; linha publicada depois ⇒ aviso, nunca recálculo silencioso.

## 14. Sinal humano — estado do gate

- **F-RET-1..9:** PENDENTES. **P-RET-1..6:** externos. BRIEF depois da ratificação; código só com `executa` por PR.
- A nota `docs/plano/nos/RETENCOES-FONTE.md` aponta para cá; o nó `EFD-REINF` consome o D8.

## 15. Fontes (hash no dossiê)

| Documento | Origem | Observação |
|---|---|---|
| Lei 10.833/2003 compilada | acervo [D01], cópia de 13/10, compilada | "Vide LC 214" = art. 509 |
| LC 214/2025 compilada (art. 509, 544) | Planalto [D08] | — |
| RIR/2018 (Decreto 9.580) | Planalto [D09], baixado 20/10 | acervo [D05] é stub |
| Lei 8.212 art. 31; LC 116 art. 6º; Lei 9.430 arts. 64/67; Lei 11.196 art. 70; Lei 13.137 | acervo [D03][D04][D07][D11][D02] | compilados (13.137 original, efeito lido no [D01]) |
| IN SRF 459/2004; IN RFB 765/2007; IN RFB 2.110/2022; tabelas DARF/GPS | **não lidos** | §10 |
| ERPNext / Odoo / OCA | GitHub raw (20/10) | §11 item 4 |
