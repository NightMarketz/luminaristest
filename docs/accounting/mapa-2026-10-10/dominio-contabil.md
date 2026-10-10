# Mapa do domínio contábil/fiscal × Luminaris (10/10/2026)

Base: worktree `brief-fe-tarifa-f7-b13fea` em `origin/main 845d79ce`, mais os 5 docs de hoje que ainda não foram commitados
(contam como PLANO). A referência é o backoffice de Domínio, Alterdata, Fortes, Questor e Protheus. O checklist foi
montado de memória do domínio (**inferido**), sem abrir os produtos.

**Método.** Rodei uma busca por regex em Python sobre `git ls-files --cached --others` (UTF-8 correto) em 14 áreas: código
(sem os testes), schema, nós, gates, diferidos, rejeitadas, destino, decisões, trilhos, raiz do plano, `docs/accounting`,
`docs/adr`, SDD e front. Cada item levou 2 a 6 termos (sinônimos, siglas, nomes de classe). As classes CÓDIGO têm o
arquivo confirmado por leitura de trecho. Script: `scratchpad/g.py`; padrões: `scratchpad/p1..p7.txt`.

**Classes.** CÓDIGO = existe em `server/src` · PLANO = nó, gate, diferido, ADR, PRE-ADR ou BRIEF · **PLANO(reg)** = um doc do
plano **registra a lacuna** ("frente própria", "não planejado", "fora do sistema"), mas não há nó nem fork. Na prática
está quase não mapeado · SÓ DESTINO = só `docs/plano/destino/` (PROPOSTO) · NÃO MAPEADO · REJEITADO.
Para o leitor: "rótulo ECF" quer dizer que o termo aparece **só** como descrição de linha transcrita do leiaute da ECF
(`fixtures/ecf-l12-linhas.json`, `BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md`). Isso não planeja a rotina.

1º cliente = Simples Nacional, SP capital, serviço (salão; clínica no P2).

---

## 1. Escrituração e rotinas contábeis

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| Plano de contas + mapeamento referencial RFB | CÓDIGO | `fixtures/ChartOfAccountsFixture.ts`, `services/ReferentialMappingService.ts` | — | — |
| Lançamento com numeração, estorno, hash-chain e proveniência | CÓDIGO | `services/PostingService.ts`, `models/entryContentHash.ts`, `JournalEntrySequence` (schema) | — | — |
| Aprovação maker-checker | CÓDIGO | `services/EntryApprovalService.ts` | — | — |
| Importação de lançamentos (planilha/arquivo) | CÓDIGO | `services/DataExchangeImportService.ts` | — | — |
| **Lançamentos recorrentes / modelos de lançamento / histórico padrão** | NÃO MAPEADO | 0 ocorrência de `recorren`/`modelo de lançamento` no contexto contábil. O `I075` (histórico padronizado) aparece só como registro da ECD "fora do MVP" (`ADR-INCR-SPED-ECD-file-generation.md:162`) | **média**: aluguel, pró-labore e tarifas fixas todo mês; quem digita lançamento manual sente falta | não |
| Centro de custo | CÓDIGO | `models/Dimension.model.ts`, `services/DimensionService.ts`, `DimensionReportService.ts` (eixo genérico de dimensão) | — | — |
| Rateio de despesas indiretas | SÓ DESTINO | `destino/06 §6.9` PROPOSTO; `destino/18-caminho.md:21` (onda 5) | baixa: unidade única | não |
| Provisão de férias, 13º e encargos | PLANO | `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md:105` (lacuna) + F-PES-10 (contabilização por competência) | — | — |
| Provisão de contingências (CPC 25) | SÓ DESTINO | `destino/06 §6.9` "provisões automáticas (férias, 13º, contingências)" | baixa: PME de serviço raramente provisiona | não |
| Provisão de tributos (DAS, IRPJ/CSLL, PIS/Cofins) | CÓDIGO | `services/SimplesApuracaoService.ts` (provisão `simples.das.provision`), `TaxAssessmentService.ts`, `PisCofinsAssessmentService.ts` | — | — |
| **Perdas estimadas em créditos (PECLD/PDD) e baixa de incobráveis** | NÃO MAPEADO | só rótulo ECF | **média**: clínica parcela; salão vende pacote fiado | não |
| Receita diferida de pacote (apropriação no consumo/validade) | CÓDIGO | `sync/bridges/SalePackageSoldBridge.ts`, `CustomerPackageBalance` (schema); nó `PACOTE-VALIDADE` | — | — |
| **Despesas antecipadas com apropriação mensal (seguro, anuidade, aluguel antecipado)** | NÃO MAPEADO | `prepaid`/`a apropriar` só batem no pacote (receita) e no LC 214 art. 10 | **média**: seguro e software anual são comuns | não |
| Conciliação bancária (OFX/CNAB, sugestão, unmatch) | CÓDIGO | `services/ReconciliationService.ts` (`suggestions()` :351); nó FIN-05 done | — | — |
| Tie-out subrazão × razão (AR/AP/estoque) | CÓDIGO | `services/TieOutDiagnosticService.ts` | — | — |
| **Conciliação/composição de saldo de qualquer conta (fluxo com evidência e responsável)** | NÃO MAPEADO | 0 ocorrência de `conciliação contábil`/`composição de saldo`/`análise de contas` | **média**: é rotina do contador no fechamento (impostos a recuperar, adiantamentos) | não |
| Fechamento de período (soft/hard close, reabertura) | CÓDIGO | `services/PeriodService.ts` (`softClosePeriod`/`hardClosePeriod`/`reopenPeriod`) | — | — |
| Checklist de fechamento mensal assistido | SÓ DESTINO | `destino/06 §6.9` "fechamento assistido com checklist"; `destino/07` "Contador-assistente" | média | não |
| Encerramento do exercício (zeramento do resultado) | CÓDIGO | `services/ExerciseClosingService.ts` `closeExercise` | — | — |
| Orçamento × realizado | SÓ DESTINO | `destino/06 §6.8`; `destino/18-caminho.md:21` | baixa/média: o dono de salão pede "meta do mês", não orçamento contábil | não |
| Consolidação de demonstrações | REJEITADO | `rejeitadas/R-torre-multiempresa.md`; `destino/06 §6.9` ⟨corr⟩ "colide com T2" | — | — |
| Intercompany / mútuo entre empresas | REJEITADO (por consequência) | nenhuma menção própria; sem torre multiempresa não há contraparte "intragrupo" (`R-torre-multiempresa`) | — | — |
| Multiempresa (vários CNPJ raiz numa conta) | REJEITADO | `R-torre-multiempresa.md`; "um escopo = uma PJ (CNPJ raiz)" (`ADR-FISCAL-OBLIGATION-PROFILE-regime-porte.md:86`) | — | — |
| Filiais (estabelecimentos do mesmo CNPJ raiz) | CÓDIGO (parcial) | `unitId` = filial (`PRE-ADR-ICMS-IPI-EFD.md:190`); perfil por CNPJ raiz (`CompanyFiscalProfile`). Limite: não soma filiais (`CompanyFiscalProfileService.ts:260`) | — | — |
| Multimoeda | REJEITADO | `rejeitadas/R-multimoeda.md` | — | — |
| Imobilizado e depreciação | CÓDIGO | `services/FixedAssetService.ts`, `DepreciationService.ts` (C8 done) | — | — |
| Estoque como subrazão (custo médio móvel) | CÓDIGO | `services/InventoryService.ts:75`; `ADR-INCR-INVENTORY-stock-subledger.md:9` | — | — |

## 2. Normas CPC (PME e média)

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| CPC 47 / receita de contrato | PLANO (só o pacote) | `BE-INCR-PACOTE-VALIDADE-brief.md`, nó `PACOTE-VALIDADE`. Contrato genérico com várias obrigações de desempenho: sem plano | — | — |
| **CPC 06 arrendamento (direito de uso)** | NÃO MAPEADO | excluído do C8: "Impairment (CPC 01), reavaliação, arrendamento (CPC 06) não entram" (`ADR-INCR-FIXED-ASSETS.md:191`); fora isso só PIS/Cofins e rótulo ECF | baixa: na NBC TG 1000 o aluguel do ponto segue como operacional (**inferido**) | não |
| **CPC 01 impairment** | NÃO MAPEADO (excluído) | `ADR-INCR-FIXED-ASSETS.md:191` exclui do C8 sem abrir frente | baixa | não |
| **CPC 12 ajuste a valor presente** | NÃO MAPEADO | só rótulo ECF | baixa: venda parcelada longa é rara | não |
| **CPC 46 valor justo** | NÃO MAPEADO | só rótulo ECF | baixa | não |
| **CPC 32 tributos diferidos** | NÃO MAPEADO | 0 ocorrência | baixa: o Simples não tem diferença temporária relevante | não |
| CPC 23: retificação de arquivo ECD/ECF | CÓDIGO | `services/spedRectificationGate.ts`; C8 (ex-C9) | — | — |
| **CPC 23: ajuste de exercícios anteriores contra LPA / mudança de política com efeito retrospectivo** | NÃO MAPEADO | só rótulo ECF. A política versionada (`AccountingPolicyVersionService.ts`) é prospectiva | baixa/média: aparece na primeira migração de contabilidade de outro escritório | não |
| **CPC 24 eventos subsequentes** | NÃO MAPEADO | 0 ocorrência | baixa | não |
| CPC 27 vida útil e valor residual | CÓDIGO | `models/FixedAsset.model.ts` | — | — |
| CPC 16 estoque (custo médio) | CÓDIGO | `InventoryService.ts`; FIFO/lote em `destino/06 §6.7` | — | — |
| NBC TG 1000 / 1002 / ITG 2000 (enquadramento normativo do tenant) | PLANO | `BE-INCR-PACOTE-VALIDADE-brief.md`, `BE-INCR-ACCOUNTANT-GOVERNANCE-brief.md`, nó `GOV-CONTADOR` | — | — |

## 3. Demonstrações

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| Balanço Patrimonial | CÓDIGO | `services/AccountingReportService.ts:656` `balanceSheet` | — | — |
| DRE | CÓDIGO | `AccountingReportService.ts:751` `incomeStatement` | — | — |
| DFC (indireto, CPC 03) | CÓDIGO | `services/CashFlowReportService.ts` | — | — |
| Balancete, razão, diário, por dimensão | CÓDIGO | `AccountingReportService.ts:402/462/564`, `DailyJournalReportService.ts`, `DimensionReportService.ts` (nó CONT-08) | — | — |
| Comparativo entre períodos | CÓDIGO | `services/PeriodComparisonReportService.ts` | — | — |
| DMPL | PLANO(reg) | "DMPL/DFC/notas **não existem** → frente própria com ADR" (`BE-INCR-CONTADOR-PACKAGE-EXTENDED-brief.md:125,197`); sem nó | média: o contador pede no fechamento anual (a DFC já foi feita depois) | não |
| Notas explicativas | PLANO(reg) | mesmo trecho; `PEDIDO-CONTADOR-2026-09-03.md:208` | média: obrigatórias no jogo completo da NBC TG 1000 | não |
| **DLPA** | NÃO MAPEADO | só a conta 2.3.1 (`ChartOfAccountsFixture.ts:57`) e o encerramento; nenhum relatório | **média**: a ITG 1000 e a NBC TG 1000 aceitam DLPA no lugar da DMPL; é a demonstração da PME | não |
| **DRA (resultado abrangente)** | NÃO MAPEADO | 0 ocorrência | baixa: sem ORA no Simples de serviço | não |
| **DVA** | NÃO MAPEADO | 0 ocorrência | baixa: obrigatória só para S.A. aberta | não |
| **Relatório da administração** | NÃO MAPEADO | 0 ocorrência | baixa: é de S.A. | não |
| BP/DRE dentro da ECD (J100/J150) | CÓDIGO | `services/SpedGenerationService.ts`; ADR ECD :67 | — | — |

## 4. Patrimônio e societário

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| **Distribuição de lucros (registro, limite isento, IRRF da Lei 15.270/2025)** | PLANO(reg) → na prática NÃO MAPEADO | "Distribuição isenta acima da presunção … **Não planejado**" (`PRE-ADR-SIMPLES-NACIONAL-CALCULO.md:554`); `CashFlowReportService.ts:63` "no dividendos-a-pagar leaf exists"; a 15.270 aparece só no redutor da folha (`PRE-ADR-PESSOAL:143`) | **alta**: o sócio de salão retira lucro todo mês, e o limite isento com escrituração completa é o argumento de venda da contabilidade | não (é regra legal) |
| **JCP** | NÃO MAPEADO | rótulo ECF; IRRF 17,5% "sem linha na plataforma" (`BE-INCR-CSLL-ALIQUOTA-LC224-brief.md:131`) | baixa: só faz sentido no Lucro Real | não |
| Pró-labore | PLANO | `PRE-ADR-PESSOAL` F-PES-7 | — | — |
| **Capital social (integralização, aumento, quotas)** | NÃO MAPEADO | rótulo ECF; o plano-semente **não tem conta de capital social**: o PL é só 2.3 → 2.3.1 LPA (`ChartOfAccountsFixture.ts:56-57`) | **média**: o BP de qualquer Ltda tem capital. O tenant pode criar a conta, mas BP, ECD e DMPL não a preveem | não |
| **Reservas (legal, de lucros) e destinação do resultado** | NÃO MAPEADO | 0 ocorrência | baixa: a Ltda não é obrigada a ter reserva legal | não |
| Quadro societário (sócios, participação) | CÓDIGO (só DEFIS) | `dtos/SimplesDto.ts:188-209` `SimplesDefisSocioSchema` | — | — |
| **Ata/reunião de aprovação de contas (CC art. 1.078)** | NÃO MAPEADO | `ata`/`aprovação de contas`/`reunião de sócios` sem hit pertinente | baixa | JUCESP se registrar |
| Termos de abertura/encerramento e autenticação via ECD | CÓDIGO | `lib/sped.ts`, `dtos/SpedEcdDto.ts` (I030/J900) | — | — |
| Assinatura ICP e transmissão da ECD/ECF | PLANO | gate `P4`; `destino/06 §6.10` "GATILHO P4" | — | — |
| Livro de Inventário / Bloco H | PLANO | `PRE-ADR-ICMS-IPI-EFD.md:148,306` (F-ICMS-7) | — | — |
| Lalur/Lacs (e-Lalur, Parte B) | CÓDIGO | `services/LalurService.ts`, `lalurParteBBalances.ts` | — | — |
| Livro-caixa (ME/EPP) | CÓDIGO (só na matriz) | `LIVRO_CAIXA` em `models/obrigacoesPorRegime.ts:21`; gerador do livro: sem evidência | — | — |

## 5. Obrigações acessórias

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| ECD | CÓDIGO | `services/SpedGenerationService.ts` | — | — |
| ECF (Presumido e Real) | CÓDIGO | `SpedEcfGenerationService.ts`, `SpedEcfRealGenerationService.ts` | — | — |
| Apuração PIS/Cofins | CÓDIGO | `PisCofinsAssessmentService.ts` (X8 done) | — | — |
| Gerador da EFD-Contribuições | PLANO | F-X8-1 "sem gerador de EFD-Contribuições (diferido)" (nó X8); `diferidos/M5-efd-contribuicoes.md` | — | — |
| EFD ICMS/IPI | PLANO | `PRE-ADR-ICMS-IPI-EFD.md` (de hoje, não commitado) | — | — |
| EFD-Reinf | PLANO | `PRE-ADR-PESSOAL` F-PES-5 | — | — |
| eSocial | PLANO | `PRE-ADR-PESSOAL` F-PES-0..4 | — | — |
| DCTFWeb (via MIT) | CÓDIGO (parcial) | `services/MitExportService.ts`, `lib/mit.ts` (JSON do MIT); a parte que vem do eSocial/Reinf está no PRE-ADR-PESSOAL F-PES-12 | — | — |
| PGDAS-D (espelho + DAS oficial) | CÓDIGO | `SimplesApuracaoService.ts`, `models/simplesEspelho.ts`; a transmissão é no portal | — | — |
| DEFIS | CÓDIGO | `services/SimplesDeclaracaoService.ts` | — | — |
| DASN-SIMEI | CÓDIGO | `SimplesDeclaracaoService.ts`, `models/meiAnexoXi.ts` | — | — |
| RAIS / CAGED / FGTS Digital | PLANO | `PRE-ADR-PESSOAL` (absorvidos pelo eSocial) | — | — |
| DIRF | PLANO (descartada por lei) | extinta desde 2025, IN 2.181/2024 (`DOSSIE-DECISOES-2026-09-29.md:111`) | — | — |
| GIA-SP | PLANO (descartada por lei) | dispensada desde 01/01/2026 (`DOSSIE-DECISOES-2026-09-29.md:113`) | — | — |
| DeSTDA | PLANO | `PRE-ADR-ICMS-IPI-EFD.md:53` | — | — |
| NFS-e Paulistana (regime normal em SP) | PLANO(reg) | `DOSSIE-DECISOES-2026-09-29.md:29`; `D-2026-10-06-X7-FASE-C-FORKS.md:34` (risco registrado) | média: só para quem sai do Simples | prefeitura SP |
| **DMED** | NÃO MAPEADO | 0 ocorrência (DMED, "serviços médicos", "Receita Saúde", CPF do paciente) | **alta para a clínica com profissional de saúde** (PJ prestadora de serviço de saúde é obrigada; o Simples não dispensa, **inferido** de fonte secundária); **não se aplica ao salão nem à estética pura**. Prazo: último dia útil de fevereiro | entrega no programa da RFB |
| **NFTS (nota do tomador de serviços, SP)** | NÃO MAPEADO | 0 ocorrência (NFTS, "nota do tomador", "serviços tomados") | **média/alta**: o tenant de SP que contrata prestador de fora do município (software, marketing, contador de outra cidade) emite a NFTS até o dia 5 do mês seguinte, mesmo sem retenção (Manual NFTS v3.1/2026) | portal da prefeitura SP |
| **CPOM** | NÃO MAPEADO | 0 ocorrência | baixa: a NFTS substitui a consulta; a retenção por falta de cadastro foi afastada pelo STF, Tema 1020 (**inferido**, não conferido nesta sessão) | prefeitura SP |
| **DES/DMS municipal** | NÃO MAPEADO | 0 ocorrência pertinente | baixa: SP capital não exige (NFS-e + NFTS cumprem o papel); só pesa em outros municípios | prefeitura |
| **DIRPF / carnê-leão do sócio; informe de rendimentos** | NÃO MAPEADO | 0 ocorrência (DIRPF, IRPF, carnê-leão, informe de rendimentos) | **média**: a PJ deve dar ao sócio o comprovante de rendimentos (pró-labore + lucros) para a DIRPF | não |
| **DIMOB** | NÃO MAPEADO | 0 ocorrência | não se aplica (imobiliária/construtora) | — |
| **DECRED** | NÃO MAPEADO | 0 ocorrência | não se aplica (administradora de cartão) | — |
| **e-Financeira** | NÃO MAPEADO | 0 ocorrência pertinente | não se aplica (instituição financeira) | — |
| **DIRBI** | NÃO MAPEADO | 0 ocorrência | baixa: quem usufrui de benefício fiscal; o Simples é dispensado (**inferido**) | e-CAC |
| Matriz de obrigações por regime × porte | CÓDIGO | `models/obrigacoesPorRegime.ts` (7 obrigações), nó X13 done | — | — |

## 6. Tributário operacional

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| **Calendário de vencimentos e prazos de entrega, com alerta** | NÃO MAPEADO | a matriz (`obrigacoesPorRegime.ts`) diz **o quê**, não **quando**; `calendário` só bate em "ano-calendário"; agenda/lembrete só no CRM | **alta**: DAS dia 20, NFTS dia 5, DEFIS março, DMED fevereiro. É o que o dono mais esquece | não (é dado legal versionável) |
| **Emissão de guias (DARF, DAS, DAM) com código de barras** | NÃO MAPEADO | `guia`/`Sicalc`/`linha digitável` sem hit pertinente. O DAS oficial é **registrado** (`SimplesApuracaoService.ts:4`), não emitido | média: o DAS sai do PGDAS-D; DARF de IRPJ só no Presumido/Real | Sicalc / PGDAS-D / Integra Contador |
| **Pagamento do tributo apurado como título a pagar (baixa do "a recolher")** | NÃO MAPEADO (**inferido**) | `SimplesApuracaoService` e `TaxAssessmentService` não referenciam `Payable` | média: sem isso a provisão fica aberta, ou o pagamento é lançado à mão | não |
| **Parcelamentos (Simples, PGFN, RFB)** | NÃO MAPEADO | só o campo `E`/REFIS da ECF (`ADR-INCR-TAX-ASSESSMENT.md:75`) | **média**: parcelamento do Simples é comum em PME; exige controle de parcelas e juros | RFB/PGFN; Integra Contador |
| **PER/DCOMP / restituição** | NÃO MAPEADO (saldo negativo: decidido "fora do sistema") | F-TA-9 (a) (`taxAssessmentCalc.ts:595`) | baixa: no Simples a restituição é pelo próprio PGDAS-D | e-CAC |
| **CND / CPEN: emissão e monitoramento** | NÃO MAPEADO | `certidão` só bate em certidão de regularidade do CRC (`AccountingContact`) | média: crédito bancário e contratos com clínica/convênio | RFB/PGFN, SEFAZ, prefeitura; Integra Contador |
| **Caixa postal e-CAC / DTE / DEC municipal** | NÃO MAPEADO | e-CAC citado só como lugar onde a DCTFWeb nasce (`nos/X9.md:39`) | média: intimação perdida vira exclusão do Simples | Integra Contador |
| Integra Contador (Serpro) como canal | PLANO | `decisoes/R5.md` (adiado); `ADR-INCR-DCTFWEB-MIT.md:251` | — | Serpro |
| Retenções sofridas a compensar (PIS/Cofins, ISS retido pelo tomador) | CÓDIGO | `FiscalProfileService.ts`, `PisCofinsAssessmentService.ts`; IRRF/CSLL sofridos são PLANO(reg) (`PRE-ADR-PESSOAL` §13 item 5) | — | — |
| Retenções na fonte em pagamentos (IRRF/CSRF/INSS 11%) | PLANO | `PRE-ADR-PESSOAL` `RetencaoPagamento` (:425), F-PES-5 | — | — |
| Retenção do salão-parceiro sobre o profissional-parceiro (Lei 12.592) | PLANO | `PRE-ADR-PESSOAL` F-PES-6 | — | — |
| **Retenção de ISS como tomador (SP)** | NÃO MAPEADO | o código só tem o ISS retido **sofrido** (`simplesCalc.ts`, `FiscalDocumentEmissionService.ts`); o PRE-ADR-PESSOAL não trata ISS do tomador | média: casa com a NFTS | prefeitura SP |
| Sublimite / excesso do Simples | CÓDIGO (parcial) | `models/simplesCalc.ts`, `meiAnexoXi.ts` | — | — |

## 7. Gestão do escritório contábil

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| Contador responsável vinculado ao tenant (convite, aceite, CRC) | CÓDIGO | `services/AccountantAssignmentService.ts` (nó GOV-CONTADOR) | — | — |
| Pacote ao contador com protocolo (manifesto sha256) | CÓDIGO | `services/AccountingDeliveryService.ts` | — | — |
| Revisão profissional editável | CÓDIGO | `services/AccountingReviewService.ts` (C11) | — | — |
| Carteira multicliente do contador (portal com N clientes) | SÓ DESTINO | `destino/04-personas-e-papeis.md:14` "PROPOSTO — reabre 'contador não é persona'; só por ADR" | média: é o canal de distribuição via escritório | não |
| **Agenda de obrigações e tarefas por cliente (escritório)** | NÃO MAPEADO | 0 ocorrência | baixa para o tenant; alta se o produto for vendido ao escritório | não |
| **Protocolo de entrega ao cliente (recibos de transmissão, documentos)** | NÃO MAPEADO | o protocolo existente é tenant → contador, não escritório → cliente | baixa | não |
| **Honorários contábeis (contrato, cobrança recorrente)** | NÃO MAPEADO | 0 ocorrência de `honorário` | baixa: é produto do escritório; o tenant paga como fornecedor via AP | não |

## 8. IA e automação

| Item | Classe | Evidência | Relevância 1º cliente | Externo? |
|---|---|---|---|---|
| Classificação automática de lançamento / sugestão de conta | PLANO | `diferidos/M5-ia-analytics.md` | — | — |
| Conciliação sugerida (determinística, ranking D6) | CÓDIGO | `ReconciliationService.ts:351` `suggestions()`; o agente de IA de conciliação é SÓ DESTINO (`destino/07`) | — | — |
| Detecção de anomalias | PLANO | `diferidos/M5-ia-analytics.md` | — | — |
| Extração de documento por IA/OCR | PLANO | nó `P-IA` (blocked; R10 adia até D6) | — | — |
| Checklist de fechamento e explicação da variação da DRE | SÓ DESTINO | `destino/07` "Contador-assistente" | média | LLM |
| Sugestão de classificação tributária / nota inconsistente | SÓ DESTINO | `destino/07` "Fiscal" | média | LLM |

---

## Contagem por classe (115 linhas, contadas por script)

| Classe | Nº |
|---|---|
| CÓDIGO (inclui parcial) | 41 |
| PLANO | 20 |
| PLANO(reg): lacuna registrada, sem nó | 4 (DMPL, notas explicativas, distribuição de lucros, NFS-e Paulistana) |
| SÓ DESTINO | 7 |
| NÃO MAPEADO | 39 (4 delas "não se aplica": DIMOB, DECRED, e-Financeira, DIRBI) |
| REJEITADO | 4 |

> A contagem é das linhas desta tabela. A granularidade é escolha minha, então o total não mede cobertura.

## Fontes externas consultadas
- DMED, quem é obrigado: https://noticias.iob.com.br/dmed-clinicas-de-vacinas-estao-dispensadas/ ; prazo: https://www.facilite.co/dmed-prazo-passou (secundárias; a IN vigente **não foi conferida**)
- NFTS SP: https://notadomilhao.sf.prefeitura.sp.gov.br/wp-content/uploads/2026/02/Manual_NFTS-v3.1.pdf ; prazo: https://saopaulo.sp.leg.br/iah/fulltext/decretos/D52610.pdf

## Casos adversariais (o que mudou de classe quando chequei)
1. **Livro-caixa.** Parecia não mapeado: o `PRE-ADR-SIMPLES-NACIONAL-CALCULO.md:552` diz "Livro-caixa … não está na matriz de obrigações". Mas o código tem `LIVRO_CAIXA` em `models/obrigacoesPorRegime.ts:21,53`. Ficou **CÓDIGO** (só na matriz); a frase do PRE-ADR está desatualizada.
2. **Provisão de férias/13º.** A primeira busca (git grep com regex acentuada passada por argv no Windows) só achou o catálogo de destino. Com os acentos quebrados, a regex falhou em silêncio (`consolida..o` também deu zero nos docs). Refeita em Python com UTF-8, a busca achou `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md:105`, e o item passou a **PLANO**. Nenhuma busca de acento foi aproveitada da versão quebrada.
3. **No sentido inverso, distribuição de lucros.** Bateu em PRE-ADR (parecia PLANO), mas o texto diz "Não planejado". Ficou **PLANO(reg)**, que na prática é lacuna.
