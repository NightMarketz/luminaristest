# Proposta — complemento e retomada dos módulos Financeiro, Contábil e Fiscal (20/10/2026)

> **Estado deste documento:** proposta do agente **ratificada em parte** pelo dono em 20/10
> ([[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]): Q1 (a) régua F própria, Q2 (a) PRE-ADRs de F1 autorizados (só
> planejamento), Q3 (a) fold R0. Q4–Q9 seguem abertas. Nada roteia código sem `executa` citável (ORCH-006). Nó novo
> só entra em `nos/` depois de PRE-ADR ratificado ([[README]]); a ordem A–E da [[FILA-ORDEM]] (ratificada em 14/10)
> **não muda** — a seção **F** entra depois dela.
> **Emenda 22/10** ([[D-2026-10-22-LISTA-BRIEFS-ODOO]]): §4b grava a lista de BRIEFs para passar o Odoo na régua de 32
> capacidades e **propõe** 6 nós novos na régua F (Q10–Q12). Só docs; nada ratificado, nenhum `executa`.
> Régua de referência pedida pelo dono (chat, 20/10): TOTVS Protheus (Financeiro, Contabilidade, Fiscal),
> Salesforce (Revenue Cloud/Billing e Reports & Dashboards) e Power BI (analytics embutido).
> Medição: vault regenerado em 20/10 + `git log origin/main` + `gh pr view` + grep no código. Grau por claim:
> **V** = verificado (li o arquivo/fonte), **I** = inferido, **A** = assumido.

**Em duas linhas.** Pela régua própria os três módulos estão em 54/63 (contábil 21/22 · financeiro 17/19 · fiscal
16/22) e **não existe PR aberto** (V, `gh pr list` = 0 em 20/10): tudo o que o vault ainda marca `inflight` já
está em `main` e só espera fold. O que falta fechar é (a) gate humano (H1 → H2 → M2, contador, A1 da NFS-e) e (b)
BRIEFs prontos sem `executa`. O risco principal é **data legal**: CBS plena em 01/01/2027 (LC 214 art. 347) sem
nenhum nó de IBS/CBS aberto, DANFE com IBS/CBS em 01/12/2026, NFS-e nacional do Simples em 01/11/2026 — os três
dependem de decisão do dono (A1/D5), não de código.

---

## 1. Onde cada módulo está (medido 20/10)

### 1.1 Contábil — 21/22, o que resta é humano

| Nó | Estado real | O que falta | Quem move |
|---|---|---|---|
| [[GOV-CONTADOR]] | `inflight`; BE + FE da política versionada em `main` (#604) | H2 passo 23 (sign-off), F-GOV-1 (consulta CRC-SP), BRIEF `BE-INCR-CRC-CFC-VALIDACAO` (depois do M2) | dono (2) · agente (BRIEF) |
| [[H1]] / [[H1b]] / [[H3]] | `human-open` | PVA Presumido, 2ª passada Lucro Real, prova P2 | dono |
| Diferidos | [[M5-subrazoes-restantes]] (folha ⚫), [[M5-ia-analytics]] ⚫ | PRE-ADR | dono ratifica |

Tudo o mais (CONT-01..15, C6..C12, CRC-CFC, telas REVIEW/DELIVERY/FIXED-ASSETS/SPED-SIGNERS) está `done` (V, índice).

### 1.2 Financeiro — 17/19, dois nós abertos e um FE pronto

| Nó | Estado real | O que falta | Quem move |
|---|---|---|---|
| [[F5]] cobrança | `inflight`; PR-1/2/3 do BE em `main` (#484/#609/#615) | **FE da cobrança** (EMENDA-1, forks F-FE-COB-1..8 ratificados 13/10) sem `executa`; chave MP só com M2; fase CNAB espera D6 | dono (`executa`) |
| [[FE-INCR-BANK-SETTLEMENT-FEE]] | `planned`; BE da view em `main` (#620) | FE da tarifa (BRIEF #616 + emenda #617) sem `executa` | dono (`executa`) |
| [[PACOTE-VALIDADE]] | `inflight`; código em `main` (#483/#530/#533/#630) | não vai a produção antes do PE-6 (contador) | contador (D1) |
| [[F6]] Pix de saída | `blocked` | chave ed25519 aprovada pelo MP (gate externo) | externo |

### 1.3 Fiscal — 16/22, fila de PRs esvaziada em 16/10

| Nó | Estado real (V, `gh pr view`) | O que falta | Quem move |
|---|---|---|---|
| [[X14-CAIXA]] | vault `inflight`; **#729/#738/#739 MERGED 16/10** | fold `--estado done`; pendências A1–A3 do contador | agente (fold) · contador |
| [[FE-INCR-SIMPLES]] | vault `inflight`; **#733 MERGED 16/10** | fold `--estado done` | agente |
| [[X11]] eventos | vault `blocked`; **PR-1 #633 MERGED 12/10** (modo manual) | PR-2 (webhook/automático) depende de [[X10i]] | — |
| [[X7]] apuração | `inflight`; Fases A/B/C em `main` | oráculos humanos P-C1/P-C5; texto de ajuda Lei 9.250 art. 40 no FE | contador · agente (1 item) |
| [[X9]] DCTFWeb/MIT | `inflight`; PR-1 em `main` (#562/#564) | PR-2 (itens 10–12, 15–17) e PR-4 — **destravados**, sem `executa` | dono (`executa`) |
| [[X10a]] NFC-e/tipo | `blocked` por D5 | EMENDA-2 PR-1..PR-6 (Fases A–F, `NullEmissor`) prontos; PR-7 travado por mTLS | dono (A1 + `executa`) |
| [[X10i]] emissão | `blocked` | PSC + e-CNPJ contratados, runbook D5, M2 | dono |
| [[IRRF-DISTRIBUICAO]] | `planned`; BRIEF (36 itens, 4 PRs) + F-IRD-1..18 ratificados 17/10 | `executa`; P1/P2 ao contador | dono |
| [[PRESUMIDO-TETO-78MI]] · [[NFE-DANFE-IBSCBS]] · [[ISS-TRANSICAO-IBS]] | `planned` sem BRIEF (registrados 17/10) | planejar (DANFE tem prazo **01/12/2026**) | dono autoriza BRIEF |
| [[CSLL-RESSEGURADORES]] | `blocked` | ADE Cofis com leiaute novo da ECF | externo |
| Diferidos | [[M5-ibs-cbs]] ⚫ (**risco de data 01/01/2027**), [[M5-efd-contribuicoes]] (X8 fechou o raso) | PRE-ADR | dono |

### 1.4 Plataforma que encosta nos três (achados de 19/10)

[[FIX-ANALYTICS-DADO]] (#770) e [[FIX-ADDEDFIELDS-VAZAMENTO]] (#772) **mergeados em 20/10** (V); E1 da fila está
fechado. Restam `planned`: [[TESTE-ACOPLAMENTO-PRESET]], [[FIX-PLUGINS-VENDA]], [[FIX-AUTH-CONTA]],
[[FIX-CHAT-AGENTE]], [[FIX-FE-DASHBOARD]], [[FIX-ANALYTICS-RESIDUO]] — todos sem `executa`.

---

## 2. Retomada — o que fazer, na ordem (não altera A–E da FILA-ORDEM)

**R0 · Higiene do vault (agente, sem código).** Fold dos nós já em `main`: X14-CAIXA, FE-INCR-SIMPLES, X11 (PR-1),
FIX-ANALYTICS-DADO, FIX-ADDEDFIELDS-VAZAMENTO, BE-INCR-DT-NO-CONSUMER-CALLS (#773). Sem isso o índice mente
(mostra `inflight` o que está fechado) e a régua fica 54 quando já são 56+ (I: depende de X14-CAIXA e X11 contarem).

**R1 · `executa` dos BRIEFs prontos (código, um PR por vez, merge por número).** Ordem sugerida pela menor dependência:
1. F5 — FE da cobrança (EMENDA-1) → destrava FE-INCR-BANK-SETTLEMENT-FEE.
2. FE-INCR-BANK-SETTLEMENT-FEE.
3. X9 PR-2 e PR-4 (DCTFWeb/MIT) — fecha o X9.
4. IRRF-DISTRIBUICAO PR-1..PR-4 — P1/P2 ao contador correm em paralelo.
5. X10a EMENDA-2 PR-1..PR-6 (NFC-e com `NullEmissor`) — não precisa do D5 até o PR-7.
6. E2–E7 da seção E (TESTE-ACOPLAMENTO-PRESET primeiro: barato e preventivo).

**R2 · Gates humanos (só o dono).** Inalterado: A1 (caminho NFS-e) → A2 H1 → A3 H2 → A4 M2; A5 D7; A6 contador; A7 CRC.
A1 é o que mais trava: X10a PR-7, X10i, X11 PR-2, NFE-DANFE-IBSCBS e a NFS-e de 01/11 esperam essa decisão.

**R3 · BRIEFs a planejar (sessao-planejamento, sem `executa`).** Por prazo: NFE-DANFE-IBSCBS (01/12/2026) →
PRESUMIDO-TETO-78MI (cheque simples) → **IBS-CBS-2027** (seção 4, prazo 01/01/2027) → ISS-TRANSICAO-IBS (2029).

**R4 · Seção F (nova) — complemento pelas referências.** Seção 4 abaixo; entra na fila só depois de PRE-ADR ratificado.

---

## 3. Lacunas contra as referências (TOTVS · Salesforce · Power BI)

Fonte das referências: pesquisa de 20/10 em fonte oficial (TDN/Central TOTVS, help/trailhead Salesforce,
learn.microsoft.com) — tabelas completas em
[`docs/accounting/REFERENCIAS-TOTVS-SALESFORCE-POWERBI-2026-10-20.md`](../accounting/REFERENCIAS-TOTVS-SALESFORCE-POWERBI-2026-10-20.md).
Legenda do estado no Luminaris: **✅** existe (nó `done`) · **🟡** parcial · **⬜** ausente (grep 0 ou leitura) ·
**⏳** em fila (nó existente) · **⛔** fora por trilho/rejeição (só por ADR) · **GATILHO** fora do molde (vertical/porte).

### 3.1 Financeiro × TOTVS Financeiro (SIGAFIN) + Salesforce Billing

| Capacidade de referência | Luminaris hoje | Grau | Destino |
|---|---|---|---|
| AP com parcelamento/desdobramento; título a partir da NF de entrada | FIN-01, F1, F3 ✅ | V | — |
| AR + aging + histórico do cliente (maior atraso, protestos, saldos) | FIN-02, FIN-04 ✅; histórico por cliente ⬜ | V | `REGUA-COBRANCA` |
| Naturezas + **orçamento** por natureza (TOTVS) / metas (Power BI goals) | dimensões CONT-07 ✅; orçamento ⬜ (0 código fora de preset CRM) | V | `ORCAMENTO` |
| Rateio do título em CC/natureza | só o rateio D3 do cabeçalho da NF-e (`PayableDto.ts:73`) 🟡 | V | `RATEIO-DIMENSOES` |
| Baixas manual/lote/automática/por retorno | FIN-05, F7 ✅ | V | — |
| Compensação pagar × receber (mesma contraparte) | ⬜ | V (grep) | `TESOURARIA` |
| Adiantamento de cliente/fornecedor; títulos provisórios | pacote pré-pago FIN-12 (caso especial) 🟡; fornecedor e provisório ⬜ | V | `TESOURARIA` |
| Bloqueio por calendário contábil | CONT-02 gate in-tx ✅ | V | — |
| Liberação/**alçada** de pagamento | maker-checker só para lançamento contábil (CONT-06) 🟡 | V | `ALCADA-PAGAMENTO` (portão P3) |
| Borderô + CNAB remessa/SISPAG + DDA | `lib/cnab.ts` só lê; remessa = F5 fase 2 ⏳ (D6); DDA ⬜ | V | F5 fase CNAB · `TESOURARIA` (DDA, fase 2) |
| Boleto, boleto híbrido Pix, API bancária | F5 Mercado Pago ✅ BE; FE pendente ⏳ | V | F5 FE (R1) |
| Pix a receber (TXID) / Pix a pagar | MP ✅ / F6 `blocked` | V | F6 |
| **Tesouraria**: conta bancária como entidade, transferências, saldo por conta, caixinha | `PaymentAccount` só MP, `BankStatement.glAccountId` solto; sem transferência, sem caixa físico ⬜ | V | `TESOURARIA` |
| Conciliação bancária (extrato × movimentos) | FIN-05 ✅ | V | — |
| Conciliação de **cartões/adquirentes** (NSU, taxas, agenda) | F7 + FEE só para MP 🟡 | V | `CONC-ADQUIRENTE` |
| Fluxo de caixa realizado/projetado, por natureza e CC | F4, FIN-06, CONT-08 ✅; cenários/simulação ⬜ | V | `ORCAMENTO` (cenário) |
| Multimoeda (5 moedas) | ⛔ [[T9]] / [[R-multimoeda]] | V | — |
| Aplicações, empréstimos, Compror/Vendor, AVP (CPC 12), antecipação de recebíveis | ⬜ | V | GATILHO (porte) |
| Comissões → título a pagar | `CommissionsModule` ✅; comissão **não** gera Payable ⬜ | V (grep) | `TESOURARIA` (item) |
| **Retenções** PCC/IRRF/INSS/ISS em AP (serviço tomado) e AR (prestado) | ISS retido no Simples/DPS ✅; PCC/IRRF/INSS ⬜; IRRF-DISTRIBUICAO cobre só dividendos/JCP | V | `RETENCOES-FONTE` |
| DIRF / EFD-Reinf R-4000 | ⬜ (`reinf` = 0 arquivos) | V | `EFD-REINF` |
| Contabilização por lançamento padrão (LP) | ponte por origem (CONT-13, P1 — desenho [[T10]]) ✅ — coberto de outra forma | V | — |
| Dashboards/IA de fluxo de caixa | KPIs cashflow ✅; IA ⚫ | V | `IA-ANALYTICS` (depois do H1) |
| **Faturamento recorrente**/assinatura/proration/invoice run (Salesforce) | só pacote pré-pago; contrato recorrente ⬜ (destino 6.2 PROPOSTO) | V | `CONTRATOS-RECORRENTES` |
| Credit memo / write-off (baixa por perda) | estorno [[T5]] ✅; incobráveis só no Simples (X14-CAIXA) 🟡; perda dedutível Lucro Real ⬜ | V | `REGUA-COBRANCA` |
| **Dunning / régua de cobrança** | ⬜ (0 código; destino 6.8 PROPOSTO) | V | `REGUA-COBRANCA` |
| Conciliação de liquidação do gateway | F7 ✅ | V | — |
| Reconhecimento de receita (diferimento) | razão já difere o pacote (V7) ✅ | V | — |

### 3.2 Contábil × TOTVS Contabilidade Gerencial (SIGACTB)

| Capacidade de referência | Luminaris hoje | Grau | Destino |
|---|---|---|---|
| Plano de contas + referencial RFB | CONT-01, FIS-01 ✅ | V | — |
| CC/item/classe de valor + **amarração** (combinações válidas) | dimensões + eixo obrigatório ✅; amarração ⬜ | V | `RATEIO-DIMENSOES` |
| Calendário contábil e bloqueio | CONT-02 ✅ | V | — |
| Moedas contábeis | ⛔ T9 | V | — |
| Lançamentos padronizados por evento | binding/bridges (T10) ✅; engine de template ⛔ [[R-motor-regras]] | V | — |
| Pré-lançamento/lotes/históricos padronizados | draft maker-checker ✅; lote CONT-09 ✅; históricos padronizados ⬜ | V | miúdo em `FECHAMENTO-ASSISTIDO` |
| **Rateio** on/off-line, grupos, índices estatísticos | ⬜ | V | `RATEIO-DIMENSOES` |
| Reprocessamento/verificação de saldos | hash-chain + verify-chain CONT-14 ✅ | V | — |
| Tipos de saldo real/**orçado**/gerencial | orçado ⬜ | V | `ORCAMENTO` |
| Apuração de resultado | CONT-10 ✅ | V | — |
| Livros/**visão gerencial configurável**, quadros, DRE gerencial por CC | BP/DRE fixos; builder só para CRM (CRM-RB) 🟡 | V | `RB-CONTABIL` |
| Balancete/razão/diário | CONT-08 ✅ | V | — |
| DLPA/DMPL (ECD J210/J215) | `grep J210` = 0 em `SpedGenerationService.ts` ⬜ | I | miúdo em `FECHAMENTO-ASSISTIDO` (conferir no PVA do H1) |
| Orçamento contábil + PCO (bloqueio por orçamento) | ⬜ | V | `ORCAMENTO` |
| Consolidação, intercompany, Bloco K | ⛔ [[T2]] / [[R-torre-multiempresa]] | V | — |
| MEP, correção monetária, regulatória × societária | ⬜ | V | GATILHO (porte) |
| ECD / ECF / LALUR | CONT-11, FIS-03/04, X4 ✅ | V | — |
| Rastreabilidade e auditoria | [[T8]], CONT-05/15 ✅ | V | — |
| Conciliação com sugestão por IA (Carol) | ⚫ [[M5-ia-analytics]] | V | `IA-ANALYTICS` |
| Ativo fixo integrado | C8 ✅ | V | — |
| Provisões/lançamentos recorrentes (destino 6.9 PROPOSTO) | só depreciação (job do C8) 🟡 | V | `PROVISOES-AGENDADAS` (ADR) |
| Fechamento assistido com checklist (destino 6.9 PROPOSTO) | períodos + encerramento ✅; checklist ⬜ | V | `FECHAMENTO-ASSISTIDO` |

### 3.3 Fiscal × TOTVS Fiscal (SIGAFIS) + SPED + TAF

| Capacidade de referência | Luminaris hoje | Grau | Destino |
|---|---|---|---|
| Escrituração de NF entrada / saída / serviço | NF-e entrada FIS-08 ✅, NFS-e X10b ✅; NF-e 55/NFC-e saída ⏳ X10a/X10i | V | A1 + R1.5 |
| Livros ICMS/IPI (P1/P2/P7/P8/P9), apuração ICMS/IPI/ST/DIFAL/FECP, GNRE | ⬜ (X6 só custo D3) | V | `EFD-ICMS-IPI` (gate: contribuinte de ICMS) |
| Apuração de ISS | X7 Fase C ✅ (Paulistana fora) | V | `NFSE-PAULISTANA` |
| EFD ICMS/IPI (blocos, CIAP, K, H) | ⬜ | V | `EFD-ICMS-IPI` |
| EFD-Contribuições + créditos + exclusão do ICMS da base | X8 ✅ raso; exclusão do ICMS (`pisCofinsCalc.ts` grep 0) ⬜ — morre em 2027 | V | só se houver cliente Lucro Real em 2026 (decisão Q8) |
| **EFD-Reinf** (R-2010, R-4010/4020/4080) | ⬜ | V | `EFD-REINF` |
| DCTFWeb / MIT | X9 ⏳ (PR-2/PR-4) | V | R1.3 |
| GIA-ST, DeSTDA, estaduais | ⬜ | V | dentro de `EFD-ICMS-IPI` |
| TES / **Configurador de Tributos** por NCM/UF/vigência | LEGAL-PARAMS ✅ (coeficientes), `ServiceFiscalProfile` ✅, `ProductDestinationDefault` ✅; `ProductFiscalProfile` ⬜ (X10a já aponta) | V | `TABELA-TRIBUTARIA-PRODUTO` (dado versionado, não engine) |
| IBPT / tributos aproximados (Lei 12.741) no cupom | ⬜ | I | item de `TABELA-TRIBUTARIA-PRODUTO` |
| **Calendário de obrigações** | X13 perfil ✅ + `GET /tax-assessments/periodos` ✅; tela única ⬜ | V | `AGENDA-FISCAL` |
| **IBS/CBS**: cClassTrib, tabela, crédito por entrada, apuração/guia, split payment | adaptador leva IBS/CBS 🟡; parser ignora grupo `IBSCBS` (T3); apuração/guia/split ⬜; [[M5-ibs-cbs]] ⚫ | V | `IBS-CBS-2027` (**prazo 01/01/2027**) |
| Simulador da reforma | ⬜ | V | GATILHO |
| Assinatura/transmissão própria (TSS) | [[P4-fase]] GATILHO; emissão via PSC ⏳ X10i | V | — |
| **Manifestação do destinatário** + distribuição DF-e (Colaboração) | ⬜ (`DistDFe|manifestacao` = 0) | V | `MANIFESTACAO-DFE` |
| NFS-e ABRASF/municipal (Paulistana para SP fora do Simples) | ⬜ | I | `NFSE-PAULISTANA` |
| CT-e / MDF-e | ⬜ | V | GATILHO (vertical transporte) |
| Relatórios de conferência fiscal (Smart View) | aba compliance 🟡 | V | `RB-CONTABIL` |

### 3.4 Analytics × Power BI + Salesforce Reports & Dashboards

| Capacidade de referência | Luminaris hoje | Grau | Destino |
|---|---|---|---|
| Modelo semântico/medidas/fórmulas | templates + CORE definitions (dado) + `FormulaCalculation` ✅ | V | — |
| Relatórios tabular/resumo/matriz/**joined**, bucket, fórmula de resumo | CRM-RB ✅ **só CRM**; razão/AP/AR como fonte ⬜ | V | `RB-CONTABIL` |
| Drill-down / drill-through | drill por `recordIds` ✅; razão→lançamento→documento ✅; KPI→título 🟡 | V | emenda em `RB-CONTABIL` |
| Filtros cruzados / slicers que valem para o dashboard inteiro | seletor de período não chega aos pipelines ([[FIX-ANALYTICS-RESIDUO]]) 🟡 | V | E7 |
| Bookmarks / visões salvas | `SavedTableView` ✅ | V | — |
| Q&A / Copilot | agente de chat ERP ✅ ([[FIX-CHAT-AGENTE]] pendente) | V | E5 |
| **Alertas de dado** (limiar) | ⬜ | V | `ALERTAS-ASSINATURAS` |
| **Assinatura por e-mail** (agenda + anexo + condição) | ⬜ — **não existe transporte de e-mail** (`nodemailer|smtp` = 0 fora de docs) | V | `EMAIL-TRANSPORT` → `ALERTAS-ASSINATURAS` |
| Export PDF/PPT/Excel de relatório | recibos PDF ✅; CSV/XLSX só import/export de lançamentos; balancete/DRE/aging em PDF/XLSX ⬜ | V | `EXPORT-RELATORIOS` |
| RLS (segurança por linha) | escopo/unidade ✅; papel fino ⚫ [[M5-lgpd-rbac]] | V | M5 |
| Workspaces/compartilhar dashboard no tenant | `DashboardLayout` por `userId`, sem compartilhamento ⬜ | V | item de `RB-CONTABIL` |
| Metas/scorecards | ⬜ | V | `ORCAMENTO` |
| Anomalias, key influencers, forecast | F4 projeção ✅; anomalias ⚫ | V | `IA-ANALYTICS` |
| Paginated reports (livro impresso) | Diário/Razão em tela; ECD cobre o oficial | V | `EXPORT-RELATORIOS` |

---

## 4. Nós novos propostos (seção F da fila — cada um exige PRE-ADR ratificado)

Fronteira pela regra do [[README]]/ADR-PERSISTENCE-BOUNDARY: **lei desenha + atomicidade/agregação/imutabilidade → Prisma**;
**o usuário desenha → DynamicTable + ponte**. Onde a fronteira é discutível, marco `module-boundary-selector`.
Perfil previsto segue a taxonomia do classificador. IDs são provisórios (mudam no PRE-ADR).

### F1 · Prazo legal (antes de tudo, 2026-Q4 → 2027-Q1)

| ID | Módulo | Entrega | Fronteira | Depende de | Colisão / risco | Perfil |
|---|---|---|---|---|---|---|
| `IBS-CBS-2027` (promove [[M5-ibs-cbs]]) | fiscal + financeiro | tabela de vigência IBS/CBS em LEGAL-PARAMS; `cClassTrib` por item/serviço; crédito por nota de entrada (regime regular); apuração mensal + guia; **split payment** (NT 2026.006) como item de baixa do F7; parser da NF-e lendo o grupo `IBSCBS` (dívida T3); Simples 2027 já verificado (0 diferenças) | Prisma (`TaxAssessment` família nova) | [[X7]] (contrato C1), [[F7]], [[D1]] item 1b, [[LEGAL-PARAMS]] | **prazo 01/01/2027** (LC 214 art. 347/542 — V no dossiê de 17/10); antecipação no pacote pré-pago (art. 10 §4º) | precisa-de-planejamento |
| `RETENCOES-FONTE` | financeiro↔fiscal | IRRF, CSRF/PCC 4,65 %, INSS 11 % e ISS retidos em AP (serviço tomado) e AR (serviço prestado); perfil de retenção por contraparte × natureza; título de imposto (DARF por código) e compensação; relatório de retenções; regra do Simples (optante não sofre CSRF) | Prisma (`WithholdingProfile`, `TaxWithholding` → `Payable` de imposto) | [[FIN-01]], [[FIN-02]], [[X7]], [[LEGAL-PARAMS]], [[IRRF-DISTRIBUICAO]] (reusa sócios/DARF) | artigos a conferir pelo método oficial (`legal.py`): RIR art. 714+, Lei 10.833 art. 30 e Lei 13.137 (mínimo R$ 10), Lei 8.212 art. 31, LC 116 art. 6º — **I** | precisa-de-planejamento |
| `EFD-REINF` | fiscal | serializer R-1000/R-2010/R-4010/R-4020/R-4080/R-2099/R-4099 (padrão do ECD: 25 registros + gate de cobertura), a partir de `RETENCOES-FONTE` e `IRRF-DISTRIBUICAO`; alimenta DCTFWeb (X9) | Prisma + serializer | `RETENCOES-FONTE`, [[IRRF-DISTRIBUICAO]], [[X9]] | obrigação vigente para quem retém (IN RFB 2.043/2021 — **I**, conferir); validador = oráculo humano (como PVA) | opus-medio |
| [[NFE-DANFE-IBSCBS]] · [[PRESUMIDO-TETO-78MI]] | fiscal | já são nós; só falta o BRIEF | — | — | DANFE: 01/12/2026 | opus-baixo |

### F2 · Financeiro no nível TOTVS

| ID | Entrega | Fronteira | Depende de | Colisão / risco | Perfil |
|---|---|---|---|---|---|
| `TESOURARIA` | `BankAccount` first-class (banco/agência/conta/tipo/`glAccountId`) absorvendo o `glAccountId` solto de `BankStatement` e `PaymentAccount` (migração); transferência entre contas (lançamento único atômico); saldo por conta; **caixa físico** (caixinha + fechamento de caixa/PDV: sangria, suprimento, conferência); adiantamento genérico a cliente/fornecedor; compensação pagar × receber; títulos previstos; comissão → Payable | Prisma | [[FIN-05]], [[F5]], [[FIN-01]] | PDV/fechamento de caixa está na lista Z-alta do molde (memória 17/09); migração SQLite sem transação (prólogo defensivo) | precisa-de-planejamento |
| `REGUA-COBRANCA` | régua por dias (D-3, D+1, D+7…), juros/multa (2 % CDC, dias não úteis CC 132 — já pesquisados no F5), 2ª via boleto/Pix, flag de inadimplência visível no CRM/venda, baixa por perda (Lei 9.430 art. 9º no Lucro Real; Simples já no X14-CAIXA), histórico do cliente | Prisma (`CollectionPolicy`, `CollectionEvent` sobre `CollectionCharge`) | [[F5]] FE, `EMAIL-TRANSPORT` (WhatsApp = GATILHO) | negativação fora (serviço externo); T11: job interno como `MpReleaseReportScheduler` | opus-medio |
| `CONC-ADQUIRENTE` | cadastro de adquirente/maquininha, NSU/autorização na venda, agenda de recebíveis (D+30, antecipação), taxa por bandeira × parcelas, conciliação do extrato da adquirente (CSV) com AR reusando `BankSettlementItem` | Prisma (reusa F7) | [[F7]], [[FE-INCR-BANK-SETTLEMENT-FEE]] | — | opus-medio |
| `CONTRATOS-RECORRENTES` | contrato/assinatura (plano, periodicidade, reajuste), ciclo gera AR + NFS-e, proration em aditivo/cancelamento, renovação; antecipação de IBS/CBS (LC 214 art. 10 §4º) ligada a `IBS-CBS-2027` | **module-boundary-selector**: catálogo = DT preset (como `PackageCatalogModule`) + job de ciclo + ponte → `Receivable` (Prisma) | [[FIN-02]], [[X10b]], [[F5]] | não tocar o motor DT para integrar (Contrato §2.1) | precisa-de-planejamento |
| `ALCADA-PAGAMENTO` | aprovação de pagamento por valor/natureza, SoD pagador ≠ aprovador, reusando o padrão `EntryApprovalService` | Prisma | [[FIN-01]], `TESOURARIA` | **portão P3** (mais de um operador por tenant — §18.3); entra em F2 só como PRE-ADR | opus-baixo |
| `ORCAMENTO` | orçamento por conta × dimensão × período (versões, aprovação), orçado × realizado (relatório + KPI), metas/scorecard, cenário de caixa, alerta de estouro via `ALERTAS-ASSINATURAS` | **module-boundary-selector** (recomendo Prisma: agregação em volume contra o razão) | [[CONT-07]], [[CONT-08]], `RB-CONTABIL` | PCO (bloquear compra acima do orçamento) depende de Compras operacional (Onda 4) | opus-medio |

### F3 · Contábil no nível TOTVS

| ID | Entrega | Fronteira | Depende de | Colisão / risco | Perfil |
|---|---|---|---|---|---|
| `RATEIO-DIMENSOES` | tabela de rateio (grupo, percentuais/índices com vigência) por conta × dimensão; amarração (combinações válidas conta × CC); aplicação **explícita**: no lançamento (UI) e por job mensal de despesas indiretas gerando lançamento de rateio como DRAFT do maker-checker | Prisma | [[CONT-06]], [[CONT-07]] | **não** é engine: tabela é dado, aplicação é chamada nomeada ([[R-motor-regras]], [[T10]]) | opus-medio |
| `PROVISOES-AGENDADAS` | lançamento recorrente/provisão com agenda (aluguel, férias/13º enquanto folha é ⚫, contingências) → job cria DRAFT; reversão no mês seguinte por estorno ([[T5]]); precedente = job de depreciação do C8 | Prisma | [[CONT-06]], [[C8]] | **colide com [[R-motor-regras]]** ("template gera lançamento") → `DECISÃO ARQUITETURAL`: ADR distinguindo cópia agendada revisada por humano de engine em runtime | precisa-de-planejamento |
| `FECHAMENTO-ASSISTIDO` | checklist por período (conciliação sem pendência, `ReconcilePending` = 0, aprovações = 0, tie-out de estoque OK, depreciação rodada, rateios e provisões lançados, apuração confirmada, DAS/DARF registrados), SOFT→HARD condicionado ao checklist, trilha de quem fechou; miúdos: históricos padronizados, DLPA/DMPL na ECD se o PVA do H1 cobrar | Prisma (`ClosingChecklistRun`) | [[CONT-02]], [[FIN-11]], [[C7]], [[X7]], `RATEIO-DIMENSOES`, `PROVISOES-AGENDADAS` | — | opus-medio |
| `RB-CONTABIL` | generalizar `CrmReportDefinition.source` para razão/AP/AR/estoque (read models); visão gerencial (árvore de contas/dimensões com totalizadores → DRE gerencial por CC, demonstrativos configuráveis); tabular/resumo/matriz/joined, bucket, fórmula de resumo, filtro cruzado; drill-through KPI → título/lançamento; compartilhar dashboard no tenant | Prisma (definição = dado, já é `CrmReportDefinition`) | [[CRM-RB]], [[CONT-08]], [[FIX-ANALYTICS-RESIDUO]] | reuse canônico (GenericTable, ChartRenderer, AnalyticsDashboard) — bespoke só por shape | precisa-de-planejamento |

### F4 · Fiscal de comércio (só se o tenant for contribuinte de ICMS — gate por `FiscalProfile`)

| ID | Entrega | Fronteira | Depende de | Colisão / risco | Perfil |
|---|---|---|---|---|---|
| `TABELA-TRIBUTARIA-PRODUTO` | `ProductFiscalProfile` (NCM, CEST, CST/CSOSN, CFOP por operação, `cClassTrib`, alíquotas por UF **com vigência**, IBPT aproximado Lei 12.741) no padrão LEGAL-PARAMS | Prisma (dado versionado) | [[LEGAL-PARAMS]], [[X10a]] | não virar "motor de regras" ([[R-motor-regras]]); X10a já pede `ProductFiscalProfile` | opus-medio |
| `MANIFESTACAO-DFE` | distribuição DF-e (`NFeDistribuicaoDFe`) com o certificado da unidade (X10i PR-1 ✅ `FiscalCertificate`); ciência/confirmação/desconhecimento/não realizada; download automático → `NfeImportService` (F1 pré-preenche AP) | Prisma | [[D5]], [[X10i]] PR-1, [[FIS-08]] | precisa do certificado real (A1); XML real (D2) para fixture | opus-medio |
| `EFD-ICMS-IPI` | escrituração entrada/saída por CFOP/CST/NCM, livros P1/P2/P7/P8/P9, apuração ICMS próprio/ST/DIFAL/FECP + GNRE, EFD ICMS/IPI (blocos 0/C/D/E/H; G CIAP; K se indústria), GIA/DeSTDA (**I**: conferir o que SP ainda exige) | Prisma + serializer | `TABELA-TRIBUTARIA-PRODUTO`, [[X10a]], [[D2]] | maior nó do plano; validador = PVA EFD ICMS/IPI (oráculo humano); só vale com cliente contribuinte | precisa-de-planejamento |
| `AGENDA-FISCAL` (FE) | tela única de obrigações por período (DAS, DARF, DCTFWeb, EFD-Contrib, ECD, ECF, DEFIS, DASN, NFS-e, Reinf) com status pendente/apurado/registrado/entregue/pago, prazo (`/periodos`), alerta | FE sobre rotas existentes | [[X13]], [[TAX-ASSESSMENT-PERIODOS]], [[X9]], `ALERTAS-ASSINATURAS` | — | sonnet-alto |
| `NFSE-PAULISTANA` | adaptador ABRASF/Paulistana (prestador em SP fora do Simples — memória "NFS-e: onde emite"); ISS do X7 passa a ver essas notas | Prisma (adaptador por tipo, X10a) | [[X10a]], [[D5]] | **I**: confirmar se a capital SP ainda exige Paulistana para o regime normal após a adesão ao padrão nacional | opus-medio |

### F5 · Analytics no nível Power BI (e infraestrutura que ele exige)

| ID | Entrega | Fronteira | Depende de | Colisão / risco | Perfil |
|---|---|---|---|---|---|
| `EMAIL-TRANSPORT` (plataforma) | transporte de e-mail BYOK por tenant (SMTP/API key cifrada como `PaymentAccount`), templates, log de envio; destrava reset de senha, entrega real ao contador (C6 hoje registra "disse que enviou"), régua de cobrança, assinaturas | Prisma | — | pré-requisito de 3 nós; está na lista Z-alta (memória 17/09) | opus-baixo |
| `EXPORT-RELATORIOS` | PDF/XLSX/CSV de balancete, razão, diário, DRE, BP, DFC, aging, caixa projetado e relatórios do builder (reusa puppeteer dos recibos e xlsx do DataExchange); livro paginado | serviço | [[CONT-08]], [[CONT-12]], `RB-CONTABIL` | — | sonnet-alto |
| `ALERTAS-ASSINATURAS` | assinatura de relatório/dashboard (agenda, anexo, condição), alerta de KPI por limiar, alerta de estouro de orçamento e de prazo fiscal | Prisma (`ReportSubscription`, `DataAlert`) + job | `EMAIL-TRANSPORT`, `EXPORT-RELATORIOS`, `RB-CONTABIL` | T11: job interno, sem fila | opus-medio |
| `IA-ANALYTICS` (promove [[M5-ia-analytics]]) | anomalias em série, sugestão de conta/contraparte na conciliação, explicação de variação (paridade Carol / key influencers) — IA sugere, humano contabiliza | serviço sobre o razão | [[H1]] assinado (razão provado), `RB-CONTABIL` | só depois do H1 (regra do M5) | precisa-de-planejamento |

### Fora desta proposta (e por quê)

- **Por trilho/rejeição (só ADR reabre):** multimoeda ([[T9]], [[R-multimoeda]]); consolidação/intercompany/ECD Bloco K
  ([[T2]], [[R-torre-multiempresa]]); engine de lançamento padrão ([[R-motor-regras]] — binding cobre); fila/outbox ([[T11]]).
- **Por porte/molde (GATILHO, registrar no destino §6):** CT-e/MDF-e; Compror/Vendor; AVP CPC 12; MEP; correção monetária;
  aplicações/empréstimos; antecipação de recebíveis; simulador da reforma; SCR (nem a TOTVS documenta).
- **Já coberto de outra forma:** LP (binding por origem), DeRE (fora para salão — triagem 23/09), FCONT (extinto).

### Régua

A régua de 63 **não muda** (fecha em 100 % com R0–R3). A seção F entra como régua própria — 22 nós (F1 4 · F2 6 ·
F3 4 · F4 5 · F5 4, contando NFE-DANFE/PRESUMIDO já existentes em F1 como 1) — com denominador por módulo:
financeiro 7 · contábil 4 · fiscal 7 · analytics/plataforma 4. Ordem entre ondas: **F1 → F5.1 (`EMAIL-TRANSPORT`) →
F2 → F3 → F5 → F4**; F4 pode correr antes se aparecer cliente contribuinte de ICMS (gatilho explícito).

---

## 4b. Emenda 22/10 — BRIEFs para passar o Odoo (régua de 32 capacidades)

> Pedido do dono (chat, 22/10): *"Crie a lista de briefs que precisamos fazer para ultrapassar o melhor dos erp"* e,
> depois, *"Grava a lista no vault (fold na PROPOSTA-COMPLEMENTO e na FILA-ORDEM) e propõe os 6 nós novos na régua F,
> só docs, sem executa."* Lista publicada no artifact <https://claude.ai/artifact/3PLp8QYpPNYAb3qNrheQ5Q>.

**Régua usada.** As 32 capacidades da seção "Comparado com ERPs maduros" do painel *Fluxo da Venda Luminaris*
(22/10, medido em `a4f96b02`): "tem" = 1, "parcial" = 0,5. Odoo 18 + OCA **25,5**; ERPNext v15 **19,5**; Luminaris
**14,5**. Pontos **copiados do painel, não re-medidos no código** (grau **I** para esta emenda). A régua de 32 saiu do
fluxo da venda: mede bem esse caminho, não o ERP inteiro — por isso os nós de F4/F5 fora dela continuam na lista.

**Em duas linhas.** As ondas 1 e 2 abaixo, **em `main`**, levam o Luminaris a 26,5 e passam o Odoo; ondas 0 a 3, a
31/32 (o ponto que falta é o meio do CNAB, D6, e o meio da emissão, D5). Risco: o `CONTINGENCIA-EMISSOR` depende do
D5; sem ele as ondas 1 e 2 dão 25,5 (empate) e só a onda 0 desempata (27,5). BRIEF escrito não move a régua.

| Onda | O quê | Capacidades (pontos) | Soma |
|---|---|---|---|
| 0 | BRIEFs **já escritos**, falta `executa`/forks: [[F5]] FE (16), `RETENCOES-FONTE` (28), `IBS-CBS-2027` PR-5 (30), [[EFD-REINF]] (31) | 4 × 0,5 | +2 |
| 1 | Venda e recebível: `EMAIL-TRANSPORT` (pré-requisito, 0) · `VENDA-PARCELADA` (02: 1) · `PAGAMENTO-MISTO` (03: 1) · `TESOURARIA` (04: 0,5 · 09: 1 · 10: 0,5 · 13: 0,5) · `REGUA-COBRANCA` (07: 1 · 08: 0,5) · `ESTORNO-PAGAMENTO` (06: 1) · `CONTRATOS-RECORRENTES` (12: 1) · `GORJETA-TAXA-SERVICO` (32: 1) · lacuna devolução (05: 0,5) · lacuna cancelamento → título (0) | — | +9,5 |
| 2 | Onde nenhum dos dois resolve: `CONCILIACAO-QUATRO-VIAS` (26: 1) · `CONC-ADQUIRENTE` (15: 0,5) · `CONTINGENCIA-EMISSOR` (29: 1) | — | +2,5 |
| 3 | Contábil e gerencial: `RATEIO-DIMENSOES` (22: 0,5) · `ORCAMENTO` (23: 1) · `RB-CONTABIL` (25: 0,5) · `ALCADA-PAGAMENTO` (19: 0,5) · `PROVISOES-AGENDADAS` (0) · `FECHAMENTO-ASSISTIDO` (0) | — | +2,5 |
| fora | Fora da régua de 32 (já na régua F): `EXPORT-RELATORIOS` · `ALERTAS-ASSINATURAS` · `AGENDA-FISCAL` · `IA-ANALYTICS` · `TABELA-TRIBUTARIA-PRODUTO` · `MANIFESTACAO-DFE` · `NFSE-PAULISTANA` · `EFD-ICMS-IPI` | — | 0 |

Conta: 14,5 + 9,5 + 2,5 = **26,5** · + 2 + 2,5 = **31**. BRIEFs novos a escrever: **25** (8 + 3 + 6 + 8).

### 4b.1 Nós novos propostos (fora da régua F de 20/10 — Q10)

Nascem das lacunas do "caminho de volta" e da tabela de capacidades do painel de 22/10. Mesma regra da §4: cada um
exige PRE-ADR ratificado antes de virar `nos/`; IDs provisórios.

| ID | Onda F | Domínio | Entrega | Fronteira | Depende de | Colisão / risco | Perfil |
|---|---|---|---|---|---|---|---|
| `VENDA-PARCELADA` | F2 | financeiro | condição de pagamento na venda (entrada, N parcelas, vencimentos, juros); uma venda gera N títulos no AR e N cobranças | Prisma (`Receivable`); condição de pagamento pelo `module-boundary-selector` | [[FIN-02]], [[F5]] | V (painel): `installment` = 0 no backend; parcela só existe no AP | opus-medio |
| `PAGAMENTO-MISTO` | F2 | financeiro | vários meios na mesma venda, parcial, a maior, troco, crédito do cliente; a liquidação deixa de ler um único `paymentMethod` | Prisma | [[F7]], saldo do pacote (FIN-12) | crédito do cliente genérico × `PackageBalance` — decidir no PRE-ADR se é o mesmo saldo | opus-medio |
| `ESTORNO-PAGAMENTO` | F2 | financeiro | chargeback, MED do Pix e reembolso: webhook do provedor, estorno da liquidação ([[T5]]), título reaberto, disputa com prazo, efeito na base do DAS no caixa | Prisma | [[F5]], [[F7]] | V (painel): sem código; o caixa mostra dinheiro que voltou — **número errado quando o fluxo rodar**; MED pelo método legal | opus-medio |
| `GORJETA-TAXA-SERVICO` | F2 | financeiro↔fiscal | gorjeta e taxa de serviço na venda, repasse ao profissional, tratamento na base de ISS, Simples e IBS/CBS | `module-boundary-selector` (campo de venda é DT; repasse e base são Prisma) | [[X7]] | verificação legal pelo acervo antes do BRIEF; colide com a cota-parte do salão-parceiro | opus-medio |
| `CONCILIACAO-QUATRO-VIAS` | F3 | contábil↔financeiro↔fiscal | prova por período que AR = conta 1.1.2 = notas emitidas = base do imposto; pendência por divergência (inclui nota rejeitada com receita lançada); item do checklist do `FECHAMENTO-ASSISTIDO` | Prisma (leitura) | [[X7]], [[X10b]] | nenhum dos dois ERPs tem; cada ponte é idempotente sozinha, ninguém confere as quatro | opus-medio |
| `CONTINGENCIA-EMISSOR` | F4 sem o gate de ICMS | fiscal | modo de contingência quando o emissor ou a prefeitura cai, fila de reenvio com prazo, aviso | Prisma (adaptador por tipo, [[X10a]]) | [[X10a]], [[X10i]] (D5) | só roda depois do D5; MOC/NTs pelo método legal | opus-medio |

Denominador da régua F se Q10 (a): **28 nós** — financeiro 7 → 11 · contábil 4 → 5 · fiscal 7 → 8 · analytics/plataforma 4.

### 4b.2 Lacunas que não viram BRIEF

- **Instrumentação → correção (Q12):** `DEVOLUCAO-VENDA` — a devolução (Returned) não estorna o CMV, o pacote devolvido
  lança D 3.2 contra receita nunca reconhecida e o subrazão `InventoryItem` não volta (GAP-MAP, grau do painel:
  conferido); `CANCELAMENTO-TITULO` — o `SalesCancellationService` só chama a ponte contábil; título do AR e cobrança do
  Mercado Pago parecem ficar abertos (grau **I**: o teste-guarda confirma ou derruba).
- **Emenda de nó existente:** salão-parceiro na NFS-e e no lançamento → [[X10b]] e [[EFICIENCIA-FISCAL]]; NFS-e do pacote
  na venda ou no consumo → [[PACOTE-VALIDADE]] e `IBS-CBS-2027` (verificação legal); venda de 2026 paga em 2027 →
  `IBS-CBS-2027` (o split do #842 recusa competência anterior a 2027); fato em período fechado → `FECHAMENTO-ASSISTIDO`
  e PR-4 da [[EFD-REINF]].
- **Espera a folha:** comissão de empregado CLT ([[M5-subrazoes-restantes]]); o `TESOURARIA` leva ao AP só a comissão
  de parceiro.

---

## 5. O que o dono decide (questionário)

Responda no chat "Q1 a, Q2 b…". Cada resposta vira decisão em `decisoes/` e só então o PRE-ADR correspondente é escrito.

### Q1 — Ratificar a seção F como régua própria?
- [ ] **(a) Sim, régua F separada, 22 nós, ordem F1 → F5.1 → F2 → F3 → F5 → F4** — *recomendado*: a régua de 63 chega a 100 % sem mudar de denominador, e o complemento é medido à parte.
- [ ] (b) Fundir na régua de 63 (vira ~85): um só número, mas a régua atual "recua" de 86 % para ~64 %.
- [ ] (c) Não ratificar; só R0–R3.

### Q2 — Autorizar os PRE-ADRs de F1 agora (IBS-CBS-2027, RETENCOES-FONTE, EFD-REINF)?
- [ ] **(a) Sim, os três, `sessao-planejamento`, sem `executa`** — *recomendado*: são os únicos com data legal (01/01/2027) e a verificação legal já apontou o risco em 17/10.
- [ ] (b) Só IBS-CBS-2027.
- [ ] (c) Esperar o item 1b do contador (D1) antes de qualquer PRE-ADR fiscal.

### Q3 — Fold dos nós já mergeados (R0)?
- [ ] **(a) Sim: X14-CAIXA, FE-INCR-SIMPLES, X11 PR-1, FIX-ANALYTICS-DADO, FIX-ADDEDFIELDS-VAZAMENTO, DT-NO-CONSUMER-CALLS → `done`/fold num PR de docs** — *recomendado*.
- [ ] (b) Fold só quando cada nó tiver a próxima emenda.

### Q4 — `executa` do bloco R1 (BRIEFs prontos), em que ordem?
- [ ] **(a) Na ordem da seção 2: F5 FE → FEE → X9 PR-2/PR-4 → IRRF PR-1..4 → X10a EMENDA-2 PR-1..6 → E2–E7** — *recomendado* (menor dependência primeiro; um PR por vez; merge por número).
- [ ] (b) Fiscal primeiro (X9, IRRF, X10a) e o financeiro depois.
- [ ] (c) Só os de FE (F5, FEE), o resto espera A1.

### Q5 — `PROVISOES-AGENDADAS` colide com a rejeição R-motor-regras. Abrir ADR?
- [ ] **(a) Sim: ADR que define "cópia agendada revisada por humano" como fora da rejeição** — *recomendado*: sem ela não há provisão nem recorrência, e o C8 já tem o precedente (job de depreciação).
- [ ] (b) Manter a rejeição; provisões ficam manuais (import CSV mensal).

### Q6 — Fronteira de `CONTRATOS-RECORRENTES` e `ORCAMENTO` (Prisma × DynamicTable)?
- [ ] **(a) Decidir no PRE-ADR pelo `module-boundary-selector`, com a recomendação da tabela (catálogo de contrato = DT + ponte; orçamento = Prisma)** — *recomendado*.
- [ ] (b) Os dois em Prisma.
- [ ] (c) Os dois em DynamicTable.

### Q7 — `EMAIL-TRANSPORT`: BYOK por tenant ou conta do Luminaris?
- [ ] **(a) BYOK por tenant (SMTP/API key cifrada), coerente com o M2 BYOK** — *recomendado*.
- [ ] (b) Conta única do Luminaris (mais simples; custo e reputação de envio no produto).

### Q8 — Completar EFD-Contribuições (créditos, exclusão do ICMS) antes de 2027?
- [ ] **(a) Não: PIS/Cofins morrem em 01/01/2027; só reabrir se houver cliente Lucro Real com período de 2026 a declarar** — *recomendado*.
- [ ] (b) Sim, fechar o X8 "cheio" agora.

### Q9 — F4 (fiscal de comércio) entra na régua F já ou fica como gatilho?
- [ ] **(a) PRE-ADR de `TABELA-TRIBUTARIA-PRODUTO` e `MANIFESTACAO-DFE` agora (servem a NFC-e e à entrada); `EFD-ICMS-IPI` e `NFSE-PAULISTANA` só com cliente contribuinte/SP normal** — *recomendado*.
- [ ] (b) Tudo de F4 já na régua.
- [ ] (c) Tudo de F4 como gatilho.

### Q10 — Os 6 nós da §4b.1 entram na régua F? (emenda 22/10)
- [ ] **(a) Sim, os 6: régua F vai a 28 nós (financeiro 11 · contábil 5 · fiscal 8 · analytics/plataforma 4)** — *recomendado*: sem eles a régua F fecha em 100 % e o Luminaris continua atrás do Odoo em 02, 03, 06, 26, 29 e 32.
- [ ] (b) Só os 4 de venda e recebível (`VENDA-PARCELADA`, `PAGAMENTO-MISTO`, `ESTORNO-PAGAMENTO`, `GORJETA-TAXA-SERVICO`).
- [ ] (c) Nenhum; ficam só como lista.

### Q11 — Ordem de escrita dos BRIEFs dentro de F (emenda 22/10)?
- [ ] **(a) Pela §4b: onda 0 (executa) → onda 1 (venda e recebível) → onda 2 (diferencial) → onda 3 (contábil) → F5 → F4; F1 continua antes de tudo** — *recomendado*: venda e recebível é o bloco mais atrás (4/12 contra 10,5) e o que o cliente do salão sente primeiro.
- [ ] (b) Manter a ordem de 20/10 (F2 → F3 → F5 → F4), com os nós novos no fim de cada onda.

### Q12 — Instrumentar as duas lacunas da §4b.2 (devolução e cancelamento → título)?
- [ ] **(a) Sim: `sessao-instrumentacao` → `sessao-correcao`, sem merge** — *recomendado*: a devolução já tem achado conferido no GAP-MAP; o cancelamento → título é inferido e o teste-guarda decide.
- [ ] (b) Só a devolução.
- [ ] (c) Esperar.

---

## Fontes e método

- Vault regenerado em 20/10 (`node scripts/plano-vault.mjs index`); nós lidos: F5, F6, PACOTE-VALIDADE, FE-INCR-BANK-SETTLEMENT-FEE,
  X7, X9, X14-CAIXA, FE-INCR-SIMPLES, IRRF-DISTRIBUICAO, ISS-TRANSICAO-IBS, NFE-DANFE-IBSCBS, PRESUMIDO-TETO-78MI,
  CSLL-RESSEGURADORES, X10a, X10i, X11, GOV-CONTADOR; diferidos M5-*; [[FILA-ORDEM]]; destino §2, §6, §18.
- PRs: `gh pr view` 729/738/739/733/633/770/772/773 = MERGED; `gh pr list --state open` = 0 (20/10).
- Código: `server/prisma/schema.prisma` (101 modelos), `server/src/features/accounting/services` (70+ serviços),
  `server/src/features/analytics/README.md`, abas de `AccountingView.tsx`, greps citados nas tabelas.
- Referências de mercado: pesquisa de 20/10 (dois agentes, fonte oficial), tabelas completas no arquivo citado na seção 3.
- Caso adversarial tentado: "a régua já está quase em 100 %, então os módulos estão completos" — falha porque a régua mede
  o comprometido, não a referência (memória 17/09: 32 itens Z-alta, nenhum contábil). O inverso ("falta tudo") também
  falha: 54/63 e 0 PR aberto são medidos. O que teria me derrubado: um nó `inflight` com PR de fato aberto — chequei
  os oito PRs citados, nenhum aberto.
