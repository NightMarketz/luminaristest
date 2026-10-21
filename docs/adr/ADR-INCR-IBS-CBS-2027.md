# ADR-INCR-IBS-CBS-2027 — IBS/CBS no regime regular: tabela de vigência, débito por documento, crédito por entrada, antecipação do pacote, apuração mensal e split payment (nó IBS-CBS-2027, promove M5-ibs-cbs)

> **Verificação legal de 20/10/2026** (dossiê `pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md`,
> acervo ctresb/leis + Planalto compilado). Reaproveita o dossiê de 17/10 (`verif-2026-10-17-pis-cofins`, [D09] daquele)
> para os arts. 343/346/347/348/542. O que mudou desde 17/10: nada no texto; o que **faltava** e entrou aqui: arts. 10 § 4º,
> 12, 14, 31–33, 41, 43–47, 57, 60, 344–345, 349 da LC 214 e o Decreto 12.955/2026 (regulamento da CBS).

- **Data:** 2026-10-20
- **Status:** **Proposed — RATIFICAÇÃO PENDENTE.** Nenhum fork está decidido e nenhum código está autorizado.
- **Autor:** `sessao-planejamento` (agente), com base em `origin/main` `ad792aca` (fetch nesta sessão).
- **Autorização (ORCH-006), citada:**
  - dono, chat, 2026-10-20: *"Q1 a, Q2 a. Grava as decisões e pode começar pelo fold R0 (Q3 a)."* — a **Q2 (a)** da
    `PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20` §5 é *"Sim, os três [IBS-CBS-2027, RETENCOES-FONTE, EFD-REINF],
    `sessao-planejamento`, sem `executa`"*. Decisão gravada em `D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS` (sessão de origem;
    ainda não em `main`).
  - **Passo 1 (cobertura):** a autorização cobre exatamente este documento (PRE-ADR do IBS-CBS-2027) e a nota do nó. Não
    cobre BRIEF, não cobre código. **Divergência registrada:** o `docs/plano/README.md` diz que nó novo só entra em
    `nos/` depois de PRE-ADR **ratificado**; a sessão de origem pediu a nota já, com `estado: planned`. A nota nasce com
    `estado_detalhe` dizendo "PRE-ADR Proposed — não roteia até ratificação", o que mantém a regra do ORCH-006 (sem
    `executa`) mesmo com a nota existindo.
- **Related:** `docs/plano/diferidos/M5-ibs-cbs.md` (este PRE-ADR promove o diferido) · `ADR-INCR-TAX-ASSESSMENT`
  (contrato C1, `TaxAssessment`, CAS + substituição) · `ADR-INCR-PIS-COFINS` (X8; morre em 31/12/2026) ·
  `ADR-INCR-DCTFWEB-MIT` (X9; D9 retidos fora, D10 Simples 400) · F7 (`BankSettlementItem` + `BankSettlementChargePart`) ·
  `ADR-INCR-NFE-fiscal-ingestion` (parser `lib/nfe.ts`, dívida T3 do grupo `IBSCBS`) · nós irmãos [NFE-DANFE-IBSCBS]
  (DANFE 01/12/2026) e [ISS-TRANSICAO-IBS] (2029+) · BRIEF `BE-INCR-LEGAL-PARAMS` (tabelas de plataforma) ·
  `TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md` (V5).

## TLDR (2 linhas)

Em **01/01/2027** PIS e Cofins deixam de existir (LC 214 art. 542 X/XI/XVIII/XXI, efeitos pelo art. 544 III) e a CBS passa à alíquota de referência menos 0,1 p.p. (art. 347). Hoje o produto responde **400 "CBS é da onda 3"** (`pisCofinsParams.ts` `vigenteAte = 2026-12-31`): um cliente Presumido/Real fica **sem apuração federal sobre receita** a partir de janeiro. Este PRE-ADR desenha o nó que fecha isso por inteiro: tabela de vigência IBS/CBS em LEGAL-PARAMS, débito lido do documento fiscal autorizado (confissão, art. 60 § 1º), crédito por nota de entrada no regime regular (arts. 47/57), antecipação do pacote pré-pago (art. 10 § 4º), apuração mensal com saldo por tributo (arts. 43/45), guia e split payment como parte de baixa do F7 (arts. 31–33).
**Risco principal:** a alíquota da CBS de 2027 **ainda não existe** — é resolução do Senado (art. 349 I; 1º ciclo até 15/12/2026, grau I) — e o oráculo da apuração é a **apuração assistida** da RFB/CG-IBS (art. 46), que o Luminaris não enxerga. O que sai daqui é pré-preenchimento com memória; o número final é do humano e do fisco.

---

## 1. Contexto e objetivo

- **O que já está decidido e este PRE-ADR respeita** (§4 detalha): IBS/CBS é Prisma first-class (lei desenha + agregação
  em volume + imutabilidade); X8 (PIS/Cofins) não se estende para 2027 (Q8 (a) recomendada, aberta); X7 nomeia o C1 só para
  IRPJ/CSLL no MIT; F7 é a única baixa por retorno bancário; T9 BRL-only; T10 ponte por origem; R-motor-regras (tabela é
  dado, aplicação é chamada nomeada); triagem 23/09 P2 (DeRE fora para salão); Simples fora de IBS/CBS em 2026 (art. 348
  III "c") e dentro do DAS em 2027 (0 diferenças na frente Simples, 17/10).
- **O que existe hoje (V, §2):** parâmetros PIS/Cofins com fim de vigência; `FiscalProfile.ibsCbsClassTrib` e o grupo
  `gIBSCBS` no DPS da NFS-e (emitir e ler de volta); `ServiceFiscalProfile` com `cNBS` mas **sem** `cClassTrib` por
  serviço; parser de NF-e que lê `ICMSTot` e **ignora `IBSCBS`/`vNFTot`** (grep 0); `Payable.recoverableTaxLines` (X6) para
  crédito a recuperar; `BankSettlementChargePart` (emenda 3.3) como value-object de partes do encargo no confirm do F7;
  `LegalParameter` com vigência, status e `fonteSha256`.
- **Objetivo:** fixar (i) onde mora a tabela de vigência e o que ela carrega; (ii) de onde vem o débito e de onde vem o
  crédito; (iii) como a antecipação do pacote entra; (iv) a forma da apuração mensal e o que é "guia"; (v) como o split
  payment aparece no extrato e no razão; (vi) o que fica fora (Simples, DeRE, ISS→IBS 2029+, DANFE).

## 2. Evidência de código (CBM-001 — lida em `origin/main` `ad792aca`)

Caminhos relativos a `server/`. Grau **V** (lido nesta sessão).

| Ponto | O que existe | Arquivo:linha |
|---|---|---|
| Fim de vigência do PIS/Cofins | `vigenteAte = '2026-12-31'`; sem linha vigente ⇒ 400; constante `PIS_COFINS_REVOGACAO_FONTE = 'LC 214/2025 art. 542 (efeito: art. 544 III)'` | `src/features/accounting/models/pisCofinsParams.ts:1-30` |
| Tabela de plataforma | `LegalParameter { tabela, chave, discriminador?, valorInt?, valorTexto?, valorJson?, fonte, fonteUrl?, fonteSha256?, vigenteDesde, vigenteAte?, status DRAFT\|PUBLISHED\|REVOKED, supersedesId? }` | `prisma/schema.prisma:3016-3040` |
| Apuração confirmada (molde) | `TaxAssessment { tributo IRPJ\|CSLL, periodo, codigoReceita, baseCents, devidoCents, deducoesCents, aPagarCents, memoria Json, parametrosIds/Sha256, entradaInformada, status CONFIRMED\|SUPERSEDED, supersedesId, provisaoEntryId }` | `prisma/schema.prisma:2744-2790` |
| cClassTrib hoje | `FiscalProfile.ibsCbsClassTrib String?` (um por perfil/unidade; regra E0959 prefixo = CST no DTO) e `gIBSCBS { CST, cClassTrib }` no payload do DPS | `prisma/schema.prisma:1668`; `dtos/DpsPayloadDto.ts:146`; `dtos/FiscalProfileDto.ts:169` |
| Leitura de volta da NFS-e | `nfse.ts` extrai `ibsCbs { cst, cClassTrib }` do `gIBSCBS` do retorno | `src/lib/nfse.ts:42,134,183` |
| Perfil por serviço | `ServiceFiscalProfile { cTribNac, cTribMun?, cNBS?, cIndOp, cLocPrestacao? }` — **sem** `cClassTrib` | `prisma/schema.prisma:1793-1811` |
| Parser de NF-e | Lê `ide`, `emit/dest`, `det/prod`, `total/ICMSTot`, `protNFe`; **nenhuma** referência a `IBSCBS`, `vNFTot` ou `IS` (dívida T3 registrada no diferido) | `src/lib/nfe.ts:11,254-261`; grep `IBSCBS` em `lib/nfe.ts` = 0 |
| Crédito a recuperar na compra | `Payable.recoverableTaxLines String?` — JSON `[{accountId, amountCents}]` reconhecido no mesmo entry (X6 F-X6-8 a) | `prisma/schema.prisma:1133` |
| Baixa por extrato (F7) | `BankSettlementItem { proposedCents, chargeCents, feeCents, shortfallCents, shortfallTreatment, chargeParts[] }`; `BankSettlementChargePart { kind ∈ BANK_CHARGE_KINDS, cents }`, `@@unique([itemId, kind])` | `prisma/schema.prisma:1984-2030` |
| Pacote pré-pago no razão | venda ⇒ D 1.1.2 / C 2.1.1 Pacotes Pré-pagos; consumo debita o passivo (V7, transcrição de 27/09 §3) | `sync/mappers/SalePackageSoldMapper.ts`; `SaleSettledMapper.ts:83-87` |
| Simples | `ibsCbsInformar` default `false` no SIMPLES (frente Simples 17/10) | `FiscalProfileService.ts` (grep `ibsCbs`) |
| Matriz de obrigações | `ObrigacaoSped = 'ECD' \| 'ECF' \| 'DCTFWEB' \| 'PGDAS_D' \| 'DEFIS' \| 'LIVRO_CAIXA' \| 'DASN_SIMEI'`; linhas na tabela `OBRIGACAO_REGIME` | `src/features/accounting/models/obrigacoesPorRegime.ts:19-25` |
| Reinf/CBS no código | grep `reinf` em `src` = 0; grep `cbs` só no perfil/DPS | — |

## 3. Fonte legal e técnica (com grau)

**V** = lido na fonte nesta sessão ([Dnn] do dossiê de 20/10; [D09-17/10] = dossiê de 17/10). **I** = inferido. **NV** = não verificado.

| Regra | Fonte | Grau |
|---|---|---|
| Fato gerador no fornecimento; serviço de execução continuada/fracionada: 1ª ocorrência entre exigibilidade da parcela e pagamento (§ 3º, red. LC 227) | LC 214 art. 10 caput, § 1º III, § 3º | V (transcrição V5 de 27/09, relida no [D08]) |
| **Pagamento antes do fornecimento ⇒ antecipação** na data de cada parcela (base = parcela; alíquota da data do pagamento ou do documento, o que vier primeiro), débito na apuração; no fornecimento, valor definitivo sobre o total, diferença a maior é débito, a menor segue pagamento indevido; não fornecimento ⇒ regras do cancelamento; § 7º: regulamento pode permitir débito no período do fornecimento quando o prazo ≤ 5 dias | LC 214 art. 10 §§ 4º–7º [D08]; **Decreto 12.955/2026 art. 11 §§ 5º–6º** reproduz (base = parcela; alíquota = data do documento ou do pagamento; diferença a maior = débito; a menor ⇒ arts. 38 e 491; não fornecimento ⇒ art. 57) [D10] | V |
| Base de cálculo = valor da operação, valor integral cobrado a qualquer título | LC 214 art. 12 caput e § 1º [D08] | V |
| Alíquotas fixadas por lei de cada ente; União fixa a CBS | LC 214 art. 14 I [D08] | V |
| **Split payment:** PSP e operadoras segregam e recolhem IBS/CBS na liquidação financeira (art. 31); procedimento padrão exige informações no documento fiscal (art. 32 § 1º); procedimento **simplificado** opcional, percentual preestabelecido do valor da operação (art. 33, red. LC 227); valores do simplificado pagam débitos do período em ordem cronológica do documento fiscal | LC 214 arts. 31–33 [D08]; Decreto 12.955 arts. 28–35 (referidos no art. 25 §§ 5º–6º) e art. 35 § 4º [D10] | V |
| Regime regular = quem não optou por Simples/MEI | LC 214 art. 41 § 1º [D08] | V |
| **Período de apuração mensal**; regulamento fixa prazo de conclusão e vencimento (art. 44); saldo por tributo = débitos do período − créditos (art. 45); apuração entregue ao CG-IBS e à RFB no prazo do art. 44 I (art. 45 § 6º); **apuração assistida** pela RFB/CG-IBS (art. 46) | LC 214 arts. 43–46 [D08]; Decreto 12.955 art. 27 (saldo a recolher do art. 44, vencimento do art. 45 do decreto) [D10] | V |
| **Crédito** no regime regular quando ocorre a **extinção** do débito da operação de entrada (art. 27), exceto uso ou consumo pessoal (art. 57) | LC 214 arts. 47 caput, 57 [D08]; Decreto 12.955 art. 26 § 1º (imputação cronológica por documento fiscal) [D10] | V |
| Documento fiscal eletrônico obrigatório; informações têm caráter declaratório e **constituem confissão** do IBS/CBS consignados | LC 214 art. 60 caput e § 1º [D08] | V |
| 2026: IBS 0,1% (art. 343), CBS 0,9% (art. 346); compensação com PIS/Cofins do mesmo período (art. 348 I); **dispensa** para quem cumpre as obrigações acessórias (art. 348 § 1º); Simples fora (art. 348 III "c") | LC 214 arts. 343, 346, 348 ([D09] de 17/10, relido no [D08]) | V |
| **2027–2028:** IBS 0,05% estadual + 0,05% municipal (art. 344); CBS = alíquota de referência (art. 14 I, §§ 2º–3º) **− 0,1 p.p.** (art. 347) | LC 214 arts. 344, 347 [D08] | V |
| A alíquota de referência da CBS de 2027 a 2033 é fixada por **resolução do Senado** (art. 349 I), com a forma dos arts. 353–359 (art. 345 I) | LC 214 arts. 345 I, 349 I [D08] | V (o texto); **a resolução não existe em 20/10/2026** — busca em 20/10: proposta RFB→TCU (set/2026), Senado até 15/12/2026 no 1º ciclo; estimativa CGIBS Res. 14/2026 ≈ 9,21% CBS. **I**, fonte secundária |
| PIS/Cofins revogados em 01/01/2027 (art. 542 X, XI, XVIII, XXI); efeitos do art. 542 e dos arts. 509–515 em **01/01/2027** (art. 544 III, red. LC 227); demais dispositivos desde 01/01/2026 (art. 544 VI) | LC 214 arts. 542, 544 [D08] | V |
| Regulamento da CBS: Decreto 12.955, de 29/04/2026 | [D10] (acervo, versão **original** — alterações posteriores não apareceriam; nenhuma pista de alteração até 20/10) | V (texto) · vigência **I** |
| NF-e: grupos `IBSCBS`/`IS`/`vNFTot` em notas autorizadas ≥ 03/08/2026 (NT 2025.002); NT 2026.006 (grupo YC + evento 110300 "vinculação de pagamento", homologação 05/10/2026, produção 03/11/2026, campos não obrigatórios em 2026); NT 2026.010 (DANFE com IBS/CBS, 01/12/2026) | diferido `M5-ibs-cbs` (03/09, fontes secundárias); busca de 20/10 (secundária); nó [NFE-DANFE-IBSCBS] (Portal NF-e, V no dossiê NF-e de 17/10) | **I** para 2026.006 (Portal NF-e não lido nesta sessão) · V para 2026.010 |
| Tabela `cClassTrib` (classificação tributária) e `cst` do IBS/CBS; DeRE | não lidas nesta sessão; `cClassTrib` já validada no DPS (E0959) | **NV** (a tabela oficial do CG-IBS/RFB) |
| Simples 2027+: IBS/CBS dentro do DAS, Anexos 2027–2033 | frente Simples 17/10 (`verif-2026-10-17-simples-mei`): 0 diferenças | V (naquela sessão) |

## 4. Decisões já ratificadas que limitam o desenho

| Decisão | Efeito aqui |
|---|---|
| `M5-ibs-cbs` (diferido 03/09; fold 25/09 P2; verificação 17/10) | DeRE **fora** (salão); IBS/CBS como controle **extracontábil para conciliação** foi a leitura de 23/09 — este PRE-ADR **supera** essa leitura para 2027 (sem apuração não há guia), e registra isso como fork F-IBS-7 (2026) para não contrariar o fold sem o dono |
| `D-2026-10-17-AMBIGUIDADES-A1-A10` A2 | 2026: premissa de dispensa declarada na memória da apuração, condicionada a `ibsCbsInformar = true`; pergunta ao contador no pacote de 17/10 (não enviado) |
| `ADR-INCR-TAX-ASSESSMENT` C1 + `ADR-INCR-DCTFWEB-MIT` D5/D9 | O C1 leva ao MIT só IRPJ/CSLL (e PIS/Cofins se o X8 gravar código). **CBS não entra no MIT** (grau I — IN 2.237 art. 8º não a lista; a apuração da CBS é a do art. 45 § 6º entregue à RFB/CG-IBS). Este nó **não** emenda o X9 |
| `ADR-INCR-TAX-ASSESSMENT` F-X7-3 (a) | Confirmação imutável, substituível por CAS; `supersedesId`; memória persistida — a família nova herda o molde |
| F7 (R9 tabela irmã; F-F7-1..5 (a)); emenda 3.3 (E7, F-ENC-2 a) | O **único** lugar de baixa por retorno bancário é `BankSettlementItem`; partes do encargo são `BankSettlementChargePart` informadas pelo humano no confirm — o split payment entra como **parte**, nunca como tarifa |
| T9 BRL-only · T10 ponte por origem · R-motor-regras | Nenhuma engine: tabela de vigência é dado (`LegalParameter`), apuração é função pura + serviço nomeado; sem rule engine por `cClassTrib` |
| ADR-PERSISTENCE-BOUNDARY (14/10) | Lei desenha + agregação em volume + imutabilidade ⇒ Prisma first-class; nada disto vira preset de DynamicTable |
| X8 F-PCB-3 (a) · Q8 (a) (aberta) | A provisão não lança outros créditos/retenções; PIS/Cofins não se completa antes de 2027 salvo cliente Lucro Real com período 2026 |
| BRIEF LEGAL-PARAMS (F-LP-4 a; PR-4 snapshot por apuração) | Toda alíquota/vigência mora em `legal_parameters` com `fonte` não vazia; a apuração guarda `parametrosIds/Sha256` e o job de recálculo reconfirma |
| `D-2026-10-14-FILA-ORDEM-RATIFICADA` + Q1 (a) | A seção F entra **depois** de A–E; IBS-CBS-2027 é F1, com prazo 01/01/2027 — a ordem não muda por este PRE-ADR |

## 5. Decisões fixadas (sem fork: a lei ou um fork já ratificado decide)

**D1 — Simples e MEI: 400 em 2026 e 2027.** Em 2026 estão fora (art. 348 III "c"); a partir de 2027 o IBS/CBS do optante
vai **no DAS** (frente Simples, 0 diferenças). Este nó serve **só regime regular** (art. 41 § 1º). O 1º cliente (Simples)
**não** é servido por este nó — como no X9 (D10).

**D2 — Tabela de vigência em `LegalParameter`, tabela `IBS_CBS`.** Linhas: `CBS/ALIQUOTA` (bp) com `vigenteDesde`
2026-01-01 → 90 bp (art. 346), 2027-01-01 → **sem valor até a resolução do Senado** (linha `DRAFT`, `fonte` = "LC 214 art.
347 + Res. SF nº ___", publicada pelo operador da plataforma quando sair; sem linha `PUBLISHED` vigente ⇒ 400 nomeado "alíquota
de referência da CBS de 2027 ainda não publicada"); `IBS/ALIQUOTA_UF` 5 bp e `IBS/ALIQUOTA_MUN` 5 bp 2026–2028 (arts. 343,
344). A regra de "sem linha ⇒ 400" é a mesma do PIS/Cofins (`SemLinhaVigenteError`).

**D3 — O débito é o que o documento fiscal autorizado declarou** (art. 60 § 1º: confissão). Fonte: `FiscalDocument`
autorizados (NFS-e nacional com `gIBSCBS`; NF-e 55/NFC-e quando o X10a emitir) — o mesmo molde da Fase C do X7 para o ISS
(`issCompetencia.ts`: soma o que veio do retorno, "nunca alíquota × base"). Recálculo pela tabela só como **conferência** com
aviso de divergência (`AUTHORIZED_DIVERGENT` já existe).

**D4 — Apuração mensal por tributo, família nova.** `(userId, anoCalendario, mes, tributo ∈ IBS|CBS)`, saldo = débitos −
créditos (art. 45), com CAS + `supersedesId` + `memoria` + `parametrosSha256` (molde `TaxAssessment`). IBS é um só saldo
(a repartição UF/município é do CG-IBS; o produto guarda os dois bp na memória).

**D5 — Crédito só no regime regular e só com extinção do débito da entrada** (art. 47). O produto registra o crédito
**candidato** pela nota de entrada e o marca `APROPRIADO` quando houver evidência de extinção (split payment no documento,
ou declaração do operador — F-IBS-4 decide a forma). Uso/consumo pessoal (art. 57) ⇒ sem crédito, por lista versionada.

**D6 — A guia não é emitida pelo Luminaris.** Não há leiaute público de guia IBS/CBS lido; o que sai é o **resumo do saldo
a recolher por tributo** com vencimento (Decreto 12.955 arts. 27/44/45 — datas no regulamento, **NV** neste PRE-ADR) e a
memória. Transmitir a apuração (art. 45 § 6º) é R5 (Integra Contador/Serpro adiado) — porta nomeada, adaptador adiado.

**D7 — Split payment é parte de baixa do F7.** A linha do extrato chega **líquida** da parcela que o PSP recolheu (art. 31).
No confirm do `BankSettlementItem` a parte `SPLIT_IBS_CBS` (novo `kind` em `BANK_CHARGE_KINDS`) é informada pelo humano
(como a emenda 3.3) e lançada **D IBS/CBS a recolher / C cliente** (extinção parcial do débito do período, art. 27 III/IV
do decreto), nunca como `feeCents`. O F7 continua sendo o único caminho de baixa por retorno.

**D8 — Antecipação do pacote pré-pago é débito fiscal, não lançamento contábil novo.** O razão já difere a receita (V7). A
apuração do mês da venda do pacote ganha linha `ANTECIPACAO_ART10` (base = parcela paga); o consumo gera o acerto (base =
total; diferença a maior = débito; a menor ⇒ pagamento indevido, art. 38 do decreto, **sem** automatizar a restituição).

**D9 — 2026 é ano-teste com dispensa declarada.** Enquanto `ibsCbsInformar = true` e o perfil declarar as obrigações
acessórias cumpridas, a apuração de 2026 sai com `dispensaArt348 = true` e **nenhum valor a recolher**; a premissa vai na
memória (A2). Se `false`, calcula 0,9%/0,1% e a **compensação** com PIS/Cofins do mesmo período (art. 348 I) fica
declarada na memória do X8 (não lançada — coerente com F-PCB-3 a).

**D10 — Parser de NF-e passa a ler `IBSCBS` (dívida T3).** `lib/nfe.ts` ganha `ibsCbs?: { cst, cClassTrib, vBC, vIBS, vCBS }`
por item e os totais de `IBSCBSTot`/`vNFTot`; nota sem o grupo continua válida (campo ausente, não erro).

**D11 — `cClassTrib` por serviço e por produto.** `ServiceFiscalProfile` ganha `cClassTrib String?` (6 dígitos, E0959) com
fallback para `FiscalProfile.ibsCbsClassTrib`. Produto fica em `ProductFiscalProfile` (nó F4 `TABELA-TRIBUTARIA-PRODUTO`)
— este nó **não** cria o perfil de produto; usa o `cClassTrib` que a NF-e de entrada traz.

**D12 — Matriz de obrigações ganha `IBS_CBS_APURACAO`** (dado versionado): REAL/PRESUMIDO `OBRIGATORIA` desde 2027-01-01
(arts. 41 § 1º, 43, 45 § 6º); SIMPLES/MEI `NAO_SE_APLICA` (DAS); 2026 `CONDICIONAL` (art. 348 § 1º). Fonte na linha.

**D13 — DeRE fora** (triagem 23/09 P2). **DANFE com IBS/CBS** é do nó irmão NFE-DANFE-IBSCBS; **ISS→IBS 2029+** é do
ISS-TRANSICAO-IBS. Nenhum dos dois entra aqui.

## 6. Esqueleto de comportamentos por PR (o BRIEF herda; isto não é o BRIEF)

Fatiamento proposto (F-IBS-9): **PR-1 dado e leitura · PR-2 apuração · PR-3 crédito e antecipação · PR-4 split no F7 · PR-5
matriz e superfície**. Cada item vira teste; "toca" lista a camada.

| # | Comportamento | Toca | Fork |
|---|---|---|---|
| 1 | Tabela `IBS_CBS` em `legal_parameters` (D2): linhas 2026 e 2027–2028 com fonte/hash; linha `DRAFT` da CBS 2027 sem valor; `tabelaIbsCbsDe(linhas)` + `parametroIbsCbsVigente(...)` no molde de `pisCofinsParams.ts` | migração de dado + `models/ibsCbsParams.ts` | F-IBS-1 |
| 2 | Sem linha `PUBLISHED` vigente ⇒ `SemLinhaVigenteError` ⇒ 400 nomeado | model/serviço | — |
| 3 | `ServiceFiscalProfile.cClassTrib?` (D11) + regra E0959 no DTO + o DPS usa o do serviço antes do perfil | schema (aditiva) + DTO + `FiscalDocumentEmissionService` | — |
| 4 | Parser `lib/nfe.ts` lê `IBSCBS` por item e `IBSCBSTot`/`vNFTot` (D10); fixture real-format (memória "sintético ≠ formato real") | `lib/nfe.ts` + fixture | — |
| 5 | `ibsCbsCompetencia.ts` (função pura, molde `issCompetencia.ts`): agrupa `FiscalDocument` autorizados por competência × tributo, soma `vIBS`/`vCBS` do retorno, conta documentos sem grupo e divergentes (D3) | model puro | F-IBS-3 |
| 6 | Model `ConsumptionTaxAssessment` (D4) + repo + policy (`canManageTaxAssessment` reusada) + prévia/confirmação com CAS e substituição em cascata (molde X7 Fase A itens 12–16) | Prisma + repo + serviço + rotas em 2 toques | F-IBS-2 |
| 7 | Memória: linhas `DEBITO_DOC_n`, `ANTECIPACAO_ART10_n`, `CREDITO_ENTRADA_n`, `CREDITO_NAO_APROPRIADO_n` (art. 47 pendente), `USO_CONSUMO_PESSOAL_n` (art. 57, excluído), `SALDO`, `DISPENSA_ART348` (2026); `parametrosIds/Sha256` + `entradaInformada` como no PR-4 do LEGAL-PARAMS | serviço | — |
| 8 | 2026: `dispensaArt348` lido do perfil (D9); `true` ⇒ saldo 0 com premissa; `false` ⇒ 0,9%/0,1% + linha `COMPENSACAO_PIS_COFINS_ART348` na memória, **não** lançada | serviço | F-IBS-7 |
| 9 | Provisão em 2 commits (molde X7 PR-3): D despesa/dedução de receita IBS/CBS / C IBS a recolher · C CBS a recolher — **fork F-IBS-8** decide se IBS/CBS é dedução da receita (como PIS/Cofins, F-PCB-1R) ou outra classe | serviço + mapeamento de contas no perfil | F-IBS-8 |
| 10 | Crédito candidato por NF-e de entrada no regime regular (D5): `recoverableTaxLines` ganha `{ tributo: 'IBS'\|'CBS', amountCents, status: 'PENDENTE'\|'APROPRIADO' }`; lista de uso/consumo pessoal versionada (art. 57 I) em `legal_parameters` `IBS_CBS_USO_CONSUMO` | Payable + tabela de dado | F-IBS-4 |
| 11 | Evidência de extinção ⇒ `APROPRIADO` (F-IBS-4: pelo split informado no documento/evento 110300, ou declaração do operador com `SourceDocument`) | serviço | F-IBS-4 |
| 12 | Antecipação do pacote (D8): venda de pacote ⇒ linha `ANTECIPACAO_ART10` na apuração do mês (base = parcela paga); consumo ⇒ acerto; cancelamento ⇒ regras do cancelamento (aviso, sem automatizar restituição) | serviço (lê `sale.package.sold`/`SaleSettled` já mapeados) | F-IBS-5 |
| 13 | `BANK_CHARGE_KINDS` ganha `SPLIT_IBS_CBS` (D7); confirm do F7 lança D a recolher / C cliente; `chargeParts` com `@@unique([itemId, kind])` já garante 1 parte | F7 + mapper `bank.charge` | F-IBS-6 |
| 14 | Saldo a recolher por tributo com vencimento (D6) — `GET /accounting/ibs-cbs-assessments/:id/resumo`; vencimento vem de linha `IBS_CBS/VENCIMENTO` (NV ⇒ linha sem valor até fonte) | rota + serviço | — |
| 15 | Porta `EnvioApuracaoIbsCbs` nomeada (tipo + função pura), adaptador **nenhum** (R5) | `lib/ibsCbsApuracao.ts` | — |
| 16 | Matriz `OBRIGACAO_REGIME` ganha `IBS_CBS_APURACAO` (D12); tipo `ObrigacaoSped` cresce | tabela de dado + `obrigacoesPorRegime.ts` | — |
| 17 | Simples/MEI ⇒ 400 nomeado em todas as rotas do nó (D1) | serviço | — |
| 18 | Gates que o diff aciona: snapshot de shape dos DTOs; allowlist do `auditCanonical.ts` (`tax.ibs_cbs_assessment.confirmed/superseded`: ids, ano, mês, tributo, saldo — sem PII); guard de path-count do openapi; rota em 2 toques; paridade i18n se houver texto de erro novo | vários | — |
| 19 | Pacote do contador ganha `EXPORT_IBS_CBS_MEMO` (kind de export, molde `EXPORT_TAX_ASSESSMENT_MEMO`) | C6b | — |
| 20 | Job de recálculo do LEGAL-PARAMS (PR-4) cobre a família nova: parâmetro publicado depois da confirmação ⇒ `avisoParametroLegal` | job existente | — |

## 7. Contratos esboçados (forma materializável; o BRIEF fecha)

```prisma
// D4 — molde TaxAssessment (CAS, supersedes, memória, parâmetros). Família nova, não coluna nova no TaxAssessment (F-IBS-2 a).
model ConsumptionTaxAssessment {
  id                 String    @id @default(cuid())
  userId             String    // a PJ (R8)
  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId             String    // proveniência da leitura
  anoCalendario      Int
  mes                Int       // 1..12 (art. 43: mensal)
  tributo            String    // IBS | CBS
  regime             String    // PRESUMIDO | REAL — cópia do perfil (REGULAR para o IBS/CBS)
  debitosCents       BigInt    // Σ documentos autorizados + antecipações (D3, D8)
  creditosCents      BigInt    // Σ créditos APROPRIADOS (D5)
  saldoCents         BigInt    // débitos − créditos (art. 45); negativo = saldo credor transportado
  dispensaArt348     Boolean   @default(false) // só 2026 (D9)
  memoria            Json      // MemoriaLinha[] (mesmo schema do X7)
  parametrosIds      Json
  parametrosSha256   String
  entradaInformada   Json?
  avisoParametroLegal String?
  status             String    // CONFIRMED | SUPERSEDED
  supersedesId       String?
  provisaoEntryId    String?
  confirmedById      String
  confirmedAt        DateTime
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  deletedAt          DateTime?
  @@index([userId, anoCalendario, mes, tributo])
  @@map("consumption_tax_assessments")
}
```

```ts
// models/ibsCbsParams.ts — tabela IBS_CBS (D2), molde pisCofinsParams.ts
export type TributoConsumo = 'IBS' | 'CBS';
export interface ParametroIbsCbs { tributo: TributoConsumo; aliquotaBp: number; fonte: string; vigenteDesde: string; vigenteAte: string }
export function tabelaIbsCbsDe(linhas: readonly LinhaLegal[]): readonly ParametroIbsCbs[];
export function parametroIbsCbsVigente(t: readonly ParametroIbsCbs[], tributo: TributoConsumo, data: string): ParametroIbsCbs | undefined;

// models/ibsCbsCompetencia.ts — D3, molde issCompetencia.ts
export const IbsCbsDocumentoSchema = z.object({
  fiscalDocumentId: z.string(), competencia: z.string().regex(/^\d{4}-\d{2}$/), status: z.enum(['AUTHORIZED', 'AUTHORIZED_DIVERGENT']),
  ibsCents: z.bigint().nullable(), cbsCents: z.bigint().nullable(), cClassTrib: z.string().regex(/^\d{6}$/).nullable(),
}).strict();

// DTO (Zod .strict()) — prévia/confirmação, molde TaxAssessmentDto
export const IbsCbsAssessmentPreviewSchema = z.object({
  anoCalendario: z.number().int().min(2026),
  mes: z.number().int().min(1).max(12),
  tributo: z.enum(['IBS', 'CBS']),
  dispensaArt348: z.boolean().optional(),          // só anoCalendario = 2026 (D9); 2027+ ⇒ 400 se true
  creditosApropriados: z.array(z.object({ payableId: z.string(), tributo: z.enum(['IBS', 'CBS']), amountCents: z.bigint() })).optional(), // F-IBS-4
}).strict();
export const IbsCbsAssessmentConfirmSchema = IbsCbsAssessmentPreviewSchema.extend({
  expectedSupersedesId: z.string().nullable(),     // CAS (F-X7-3 a)
}).strict();

// F7 — D7
export const BANK_CHARGE_KINDS = [...existentes, 'SPLIT_IBS_CBS'] as const;

// lib/nfe.ts — D10
type ParsedNfeItemIbsCbs = { cst: string; cClassTrib: string; vBCCents: bigint | null; vIBSCents: bigint | null; vCBSCents: bigint | null };
```

**Rotas (esboço, deny-by-default, policy de dado contábil):**

| Rota | O que faz |
|---|---|
| `POST /api/accounting/ibs-cbs-assessments/preview` | prévia por (ano, mês, tributo) com memória |
| `POST /api/accounting/ibs-cbs-assessments` | confirma (CAS), provisão em 2 commits |
| `GET /api/accounting/ibs-cbs-assessments?anoCalendario=` | lista vivas |
| `GET /api/accounting/ibs-cbs-assessments/:id/resumo` | saldo a recolher + vencimento + memória (D6) |

## 8. FORKS — RATIFICAÇÃO PENDENTE (recomendação = a opção que fecha a lacuna por inteiro; o mínimo entra como alternativa com o que deixa aberto)

| Fork | Caminhos | Recomendação e porquê | Custo de errar |
|---|---|---|---|
| **F-IBS-1** Escopo do nó | **(a) completo:** tabela de vigência + `cClassTrib` por serviço + parser IBSCBS + débito por documento + crédito por entrada + antecipação do pacote + apuração mensal com saldo/vencimento + split como parte do F7 + matriz · (b) **mínimo:** tabela de vigência + débito por documento + apuração mensal (itens 1–9, 14–18); **deixa aberto** crédito (art. 47), antecipação (art. 10 § 4º) e split (arts. 31–33) — o Real paga a mais e o pacote pré-pago fica errado desde a 1ª venda de 2027 | **(a).** O prazo é um só (01/01/2027) e as três partes que o (b) deixa fora são as que **mudam o número**: sem crédito o saldo do regime regular está superestimado; sem antecipação o salão/clínica com pacote declara no mês errado; sem split a baixa do F7 não fecha com o extrato. O (b) só serve se o dono aceitar "2027 sem crédito" como estado declarado | alto em (b): apuração errada por construção |
| **F-IBS-2** Persistência | **(a)** família nova `ConsumptionTaxAssessment` (§7), espelho do molde do X7 · (b) `TaxAssessment.tributo` ganha `IBS \| CBS` e `periodo` ganha `M01..M12` | **(a).** O `TaxAssessment` é IRPJ/CSLL por período T/A, com `codigoReceita` de DARF e o C1 do MIT amarrado nele; IBS/CBS é mensal, sem DARF, com crédito e dois entes. O (b) poluiria o C1 (o X9 lê `CONFIRMED` por ano) e exigiria filtrar por tributo em todo leitor. Tabela nova sem PII | médio em (b): regressão silenciosa no X9 |
| **F-IBS-3** Fonte do débito | **(a)** o que o `FiscalDocument` autorizado declarou (art. 60 § 1º), com recálculo só como aviso · (b) recalcular pela tabela × base de cada venda, inclusive sem documento | **(a).** A confissão é a do documento; recalcular criaria um segundo número. Venda sem documento fiscal é a lacuna que o X10a/X10i fecham, não este nó (aviso `VENDA_SEM_DOCUMENTO` na memória) | médio em (b): dois números para o mesmo mês |
| **F-IBS-4** Evidência de extinção para o crédito | **(a)** crédito `PENDENTE` na entrada, `APROPRIADO` por (i) split informado no documento/evento de vinculação ou (ii) declaração do operador com `SourceDocument` (comprovante); lista de uso/consumo pessoal versionada · (b) crédito pelo destaque da nota de entrada (como o ICMS hoje), com aviso "sujeito à extinção" | **(a).** O art. 47 condiciona o crédito à extinção do débito; (b) gera crédito indevido por construção (mesma classe do achado de NCM farmacêutico de 17/10). O custo do (a) é um status e um comprovante — o `SourceDocument` já existe | alto em (b): crédito indevido |
| **F-IBS-5** Antecipação do pacote pré-pago | **(a)** linha `ANTECIPACAO_ART10` na venda e acerto no consumo (D8), com a hipótese dos 5 dias (§ 7º) **não** aplicada (regulamento não localizado) · (b) ignorar até o contador responder (P-IBS-3) — **deixa aberto** o pacote inteiro | **(a).** A lei e o regulamento (Decreto 12.955 art. 11 § 5º) já dizem o que fazer; o que o contador fecha é a leitura do salão (P-IBS-3), não a regra. (b) deixa a clínica/salão com débito no mês errado desde janeiro | alto em (b) |
| **F-IBS-6** Split payment na baixa | **(a)** parte `SPLIT_IBS_CBS` informada pelo humano no confirm do F7 (D7), lançada D a recolher / C cliente · (b) ler o valor do split do evento 110300/YC da NF-e e pré-preencher a parte (a) — **depende** da NT 2026.006 (I) e do X10a/X10i · (c) tratar como `feeCents` | **(a) agora, (b) como emenda quando a NT 2026.006 estiver lida e o emissor existir.** (c) é erro contábil: o split extingue débito, não é despesa | alto em (c) |
| **F-IBS-7** 2026 (ano-teste) | **(a)** apuração de 2026 com `dispensaArt348` declarada (D9) e cálculo 0,9%/0,1% quando `false`, compensação só na memória · (b) nada em 2026; o nó começa em 01/2027 — **deixa aberto** a ambiguidade A2 e o cliente Presumido/Real que não cumpriu as obrigações acessórias | **(a).** O custo é uma flag e uma linha de memória; o ganho é fechar a A2 com dado em vez de premissa muda. (b) é aceitável **só** se o contador confirmar a dispensa (P-IBS-1) antes de 01/2027 | baixo em (a) |
| **F-IBS-8** Classe contábil do IBS/CBS | **(a)** dedução da receita bruta (como PIS/Cofins — F-PCB-1R; DL 1.598 art. 12 § 1º III "tributos sobre ela incidentes"), contas 3.x redutoras + 2.1.x a recolher no perfil · (b) despesa tributária · (c) fora do resultado (IVA "por fora": D cliente / C a recolher, receita líquida desde a venda) | **(c) até o contador responder (P-IBS-4)** — revisto em 21/10 (dossiê `pesquisas-legais/dl1598-art12-receita-bruta`). O DL 1.598 art. 12 **§ 4º** (red. Lei 12.973 art. 2º) tira da receita bruta "os tributos não cumulativos cobrados, destacadamente, do comprador ou contratante … na condição de mero depositário", e o § 5º se subordina a ele; IBS/CBS é não cumulativo e destacado. O § 1º III, base do (a), cobre os tributos que **integram** a receita bruta (§ 5º). Inferido do texto: a lei não nomeia IBS/CBS, e "mero depositário" é o ponto que o contador fecha. É pergunta de contador, não de código; o BRIEF só fecha depois | **alto:** além da DRE, muda imposto — a base do IRPJ/CSLL presumidos é a receita bruta do art. 12 (Lei 9.249 arts. 15 e 20), deduzida só de devoluções/cancelamentos/descontos; sob (a) o IBS/CBS entra nela |
| **F-IBS-9** Fatiamento | **(a)** 5 PRs (§6): dado/leitura → apuração → crédito/antecipação → split F7 → matriz/superfície; cada um com `executa` próprio · (b) 2 PRs (dado + tudo) | **(a).** PR-1 e PR-2 cabem antes de 01/01/2027 mesmo que a resolução do Senado atrase (a linha `DRAFT` cobre); PR-3/PR-4 dependem de fork e de contador | baixo |
| **F-IBS-10** `cClassTrib` por serviço | **(a)** coluna em `ServiceFiscalProfile` com fallback no perfil (D11) · (b) só o do perfil (um por unidade) | **(a).** A tabela de classificação é por operação; a clínica (P2) tem serviços com classificação diferente do salão; o fallback mantém o 1º cliente igual | baixo |

## 9. Pendente de validação externa (nada disto entra no checklist como decidido) — item 1b do D1 e pacote de 17/10

| # | Pergunta | Por que importa | Quem fecha |
|---|---|---|---|
| P-IBS-1 | 2026: as NFS-e/NF-e com `gIBSCBS` bastam para a dispensa do art. 348 § 1º, ou há outra obrigação acessória (art. 341-G)? (= A2 do pacote de 17/10) | D9 / F-IBS-7 | contador |
| P-IBS-2 | `cClassTrib` e `cst` do salão e da clínica estética (= D1f, aberto desde 23/09) e lista de uso/consumo pessoal aplicável (art. 57) | D5, D11 | contador |
| P-IBS-3 | Pacote pré-pago: a antecipação do art. 10 § 4º se aplica ao pacote de sessões? Existe hipótese dos 5 dias no regulamento do IBS? | D8 / F-IBS-5 | contador |
| P-IBS-4 | Classe contábil do IBS/CBS: o IBS/CBS destacado se enquadra no DL 1.598 art. 12 § 4º (mero depositário, fora da receita bruta e da base presumida da Lei 9.249 arts. 15/20) ou no § 1º III (dedução que não reduz a base presumida)? E contas do referencial | F-IBS-8 | contador |
| P-IBS-5 | Alíquota de referência da CBS 2027 (Res. SF) e **data de vencimento** do saldo mensal (Decreto 12.955 art. 45) | D2, D6 | fonte oficial quando publicada (operador da plataforma publica a linha) |
| P-IBS-6 | **Oráculo da apuração:** a apuração assistida da RFB/CG-IBS (art. 46) para o 1º mês de 2027 de um cliente real | o teste prova a leitura do texto, não o número aceito | gate humano (RUNBOOK-FORMAT); agente prepara, não assina |
| P-IBS-7 | Mercado Pago como PSP faz o split (arts. 31–33) nas vendas do salão? Em que data e com qual informação no extrato? | D7 / F-IBS-6 | dono + documentação do MP (não lida) |

## 10. Insumos ausentes (pausa registrada — regra 2)

1. **Resolução do Senado** com a alíquota de referência da CBS de 2027 (art. 349 I): não existe em 20/10/2026 (busca em
   fonte secundária). A linha `DRAFT` do D2 é a mitigação.
2. **NT 2026.006** (split payment na NF-e/NFC-e: grupo YC, evento 110300) e a **tabela oficial de `cClassTrib`**: não lidas
   em fonte oficial nesta sessão (Portal NF-e não aberto). Necessárias para o F-IBS-6 (b) e para o item 3.
3. **Regulamento do IBS** (CG-IBS) e a hipótese dos 5 dias do art. 10 § 7º: não localizados; o Decreto 12.955 (CBS) foi lido
   na versão original do acervo.
4. **Datas de vencimento/prazo de conclusão** (Decreto 12.955 arts. 44–45): não extraídas nesta sessão (o relatório cita os
   artigos, não o texto).

## 11. Achados fora de escopo (registrados, não planejados — regra 5)

1. **`PisCofinsAssessment` em 2027:** o X8 responde 400 a partir de 01/2027; o aviso ao usuário deveria apontar para este nó
   ("CBS: apure em IBS/CBS"). Mudança de texto de erro no X8, não deste nó.
2. **Cancelamento/devolução de pacote** contabiliza errado (errata de 29/09 na transcrição V5; GAP-MAP Nível 5). Não é
   deste nó; afeta o acerto do D8 quando houver cancelamento.
3. **`TABELA-TRIBUTARIA-PRODUTO` (F4):** `ProductFiscalProfile` com `cClassTrib` por NCM é pré-requisito para a NFC-e com
   IBS/CBS do X10a; este nó só consome o que a NF-e de entrada traz.
4. **DeRE:** continua fora (P2). Se um cliente for obrigado, reabrir por ADR.

## 12. Riscos e vieses (T8)

- **Risco — número sem oráculo até 2027.** Não há PVA; o oráculo é a apuração assistida (art. 46). O que o teste prova é a
  leitura da lei; o P-IBS-6 é o runbook humano.
- **Risco — alíquota desconhecida.** Se a resolução do Senado atrasar, janeiro/2027 fica com 400 nomeado — declarado, não
  escondido.
- **Risco — crédito por extinção depende de evidência externa** (split/pagamento do fornecedor). O F-IBS-4 (a) troca
  "crédito automático" por "crédito com comprovante"; o cliente pode achar lento. O custo de errar no outro sentido é
  crédito indevido.
- **Viés 1 (completude):** "o dono quer completude" empurra para o F-IBS-1 (a). Contrapeso: as três partes do (a) têm
  artigo de lei próprio com efeito em 01/01/2027, não são gosto.
- **Viés 2 (reaproveitar o X7):** o F-IBS-2 (b) seria menos schema. Contrapeso: o C1 do MIT lê `TaxAssessment` por ano sem
  filtrar tributo — misturar quebraria o X9 em silêncio.
- **Caso adversarial tentado contra "é só mais uma apuração como o PIS/Cofins":** no PIS/Cofins o fato gerador é a receita
  do mês e a retenção abate o devido; no IBS/CBS o débito é **por documento** (confissão), o crédito depende de **extinção**
  e o pagamento pode ocorrer **antes do fornecimento** (art. 10 § 4º). Três mecanismos novos — por isso os forks 3, 4 e 5
  são forks, não detalhe de implementação. O que me derrubaria: a tabela `cClassTrib` dizer que o serviço do salão tem
  alíquota reduzida/regime diferenciado (arts. 127+ não lidos) — então D3 continua válido (o documento declara) mas a
  conferência do item 5 precisaria da tabela. Registrado em P-IBS-2.

## 13. Invariantes que a implementação DEVE provar (o BRIEF herda; cada uma vira teste)

1. Data ≥ 2027-01-01 sem linha `PUBLISHED` da CBS ⇒ 400 nomeado; com linha ⇒ `aliquotaBp` da linha.
2. Só `FiscalDocument` `AUTHORIZED`/`AUTHORIZED_DIVERGENT` vivos entram; cancelados saem; nota sem `gIBSCBS` soma 0 e conta.
3. `saldoCents = debitosCents − creditosCents`; crédito `PENDENTE` **nunca** entra em `creditosCents`.
4. Confirmação com `expectedSupersedesId` divergente ⇒ 409 (CAS); substituir um mês re-abre os seguintes em cascata.
5. 2026 com `dispensaArt348 = true` ⇒ `saldoCents = 0` e linha `DISPENSA_ART348` na memória; 2027 com `dispensaArt348 = true` ⇒ 400.
6. Venda de pacote em M ⇒ `ANTECIPACAO_ART10` em M com base = parcela paga; consumo em M+k ⇒ acerto com base total e diferença a maior como débito.
7. Parte `SPLIT_IBS_CBS` no confirm do F7 ⇒ entry D a recolher / C cliente, nunca `feeCents`; sem parte ⇒ baixa igual à de hoje.
8. Parser: NF-e com `IBSCBS` por item devolve os cinco campos; NF-e sem o grupo devolve `ibsCbs = undefined` e não falha.
9. Simples/MEI ⇒ 400 em todas as rotas do nó.
10. Auditoria sem PII; `parametrosSha256` muda ⇒ `avisoParametroLegal` preenchido pelo job.

## 14. Sinal humano — estado do gate

- **F-IBS-1..10:** PENDENTES. Decisão do dono, por questionário, fora desta sessão.
- **P-IBS-1..7:** externos (contador, fonte oficial, runbook).
- BRIEF só com pedido de planejamento depois da ratificação; código só com `executa`, PR a PR (F-IBS-9).
- A nota `docs/plano/nos/IBS-CBS-2027.md` aponta para este PRE-ADR; o diferido `M5-ibs-cbs` aponta para a nota.

## 15. Fontes (hash no dossiê `verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md`)

| Documento | Origem | Observação |
|---|---|---|
| LC 214/2025 compilada (com LC 227/2026) | Planalto `lcp214.htm`, baixada 20/10 [D08], sha256 `e728c970…` | acervo [D06] está em "republicação/retificação" ⇒ fonte oficial exigida |
| Decreto 12.955/2026 (regulamento da CBS) | acervo [D10], versão original, cópia de 15/10 | sem pista de alteração; vigência I |
| LC 214 arts. 343/346/347/348/542 | dossiê 17/10 [D09] (mesmo HTML, sha anterior `d4baa7c4…`) | relidos no [D08] |
| Transcrição art. 10 §§ 4º–7º | `docs/accounting/fontes-oficiais/TRANSCRICAO-LC214-art10-pagamento-antecipado-2026-09-27.md` | V5 + errata 29/09 |
| Resolução do Senado (CBS 2027), NT 2026.006, tabela `cClassTrib` | **não lidos** (§10) | — |
