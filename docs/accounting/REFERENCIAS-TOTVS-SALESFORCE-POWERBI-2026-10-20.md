# Referências de mercado — TOTVS Protheus · Salesforce · Power BI (pesquisa 20/10/2026)

> Insumo da [`PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20`](../plano/PROPOSTA-COMPLEMENTO-FIN-CTB-FIS-2026-10-20.md).
> Pedido do dono (chat, 20/10): "Use os apps de referência como Totvs, SalesForce, PowerBI como referência para termos
> todas as funcionalidades chaves e completas desses módulos". Pesquisa feita por dois agentes em fonte oficial
> (TDN/Central de Atendimento TOTVS; help/trailhead/salesforce.com; learn.microsoft.com). Texto de fornecedor vale como
> **alegação de capacidade**, não como medição de qualidade.
>
> Graus: **VERIFICADO** = página aberta e lida · **VERIFICADO (trecho)/†** = URL oficial na busca, só o trecho lido ·
> **INFERIDO** = sem página oficial encontrada. Limitações: TDN e Central bloqueiam `WebFetch` (lidos pelo navegador
> embutido); `help.salesforce.com` devolveu 403 (só trechos); Financial Services Cloud não pesquisado; muitas páginas do
> TDN são de 2012–2021 (rotinas descontinuadas marcadas).

## 1. TOTVS Protheus — Financeiro (SIGAFIN)

Fontes-base lidas na íntegra: [TDN Financeiro P12](https://tdn.totvs.com/display/public/PROT/Financeiro+-++Protheus+12) ·
[FINA050 Contas a Pagar](https://tdn.totvs.com/display/public/PROT/Contas+a+Pagar+-+FINA050+-+Financeiro+-+P12) ·
[PIX](https://tdn.totvs.com/pages/releaseview.action?pageId=569478747).

| Capacidade | O que faz | Fonte | Grau |
|---|---|---|---|
| Contas a Pagar (FINA050) | Duplicatas, cheques, adiantamentos, NF e provisórios, com parcelamento e desdobramento; título automático da NF de entrada; atualiza o fluxo de caixa | [FINA050](https://tdn.totvs.com/display/public/PROT/Contas+a+Pagar+-+FINA050+-+Financeiro+-+P12) | VERIFICADO |
| Contas a Receber (FINA040) | Títulos a receber, adiantamentos, provisórios e histórico do cliente (maior atraso, protestos, saldos) | [TDN Financeiro P12](https://tdn.totvs.com/display/public/PROT/Financeiro+-++Protheus+12) | VERIFICADO |
| Naturezas e controle orçamentário | Agrupa títulos por natureza e controla orçamento por natureza em até 5 moedas | TDN Financeiro P12 | VERIFICADO |
| Rateio por centro de custo e múltiplas naturezas | Distribui o título em contas, CC, itens e classes de valor, sobre bruto ou líquido | FINA050 | VERIFICADO |
| Baixas a pagar e a receber | Manual, por lote ou automática, individual ou por retorno bancário | TDN Financeiro P12 | VERIFICADO |
| Compensação de títulos | Compensa pagar × receber entre carteiras (FINA330/340/450) | [Central: baixas a Receber](https://centraldeatendimento.totvs.com/hc/pt-br/articles/28457261489303) | VERIFICADO (trecho) |
| Adiantamentos e pagamento antecipado | Título de adiantamento com cheque/movimento bancário opcional, compensado depois | FINA050 | VERIFICADO |
| Títulos provisórios (PR) | Títulos previstos substituídos pelo definitivo | FINA050 | VERIFICADO |
| Bloqueio por calendário contábil | Impede incluir/alterar/excluir título em período bloqueado | FINA050 | VERIFICADO |
| Liberação/aprovação de título a pagar | Aprovador no título, simples ou por alçada hierárquica (MV_FINCTAL, MV_FINAPxx) | [FINA580](https://tdn.totvs.com/pages/releaseview.action?pageId=312165854) | VERIFICADO (trecho) |
| Borderô de pagamento e cobrança | Agrupa títulos enviados ao banco (FINA240/241/060) | [CNAB pré-requisitos](https://tdn.totvs.com/pages/releaseview.action?pageId=353277139) | VERIFICADO (trecho) |
| CNAB a receber/pagar (Modelos 1 e 2) | Remessa e retorno (FINA150/200/420/430), parâmetros por banco, tabela de ocorrências | TDN Financeiro P12 | VERIFICADO |
| SISPAG | Pagamento a fornecedores por CNAB 240 (FINA300) | PIX TDN | VERIFICADO |
| CNAB Cloud | Layouts de CNAB validados | [Central: CNAB Cloud](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360048501574) | VERIFICADO (trecho) |
| Pré-validação de retorno CNAB | Divergências retorno × títulos antes de baixar (FINR650) | [FINR650](https://tdn.totvs.com/pages/releaseview.action?pageId=312162708) | VERIFICADO (trecho) |
| Boleto e instruções bancárias | Emite boleto e instruções, com situação de cobrança | TDN Financeiro P12 | VERIFICADO |
| Boleto híbrido (boleto + QR Pix) | Boleto registrado com QR Pix; retorno por API no BB | [DT Boleto híbrido BB](https://tdn.totvs.com/pages/releaseview.action?pageId=758485829) | VERIFICADO (trecho) |
| Comunicação bancária online (API) | Cobrança online com bancos homologados; rotina antiga encerrada em 30/06/2026 → Recebe+ Boleto Híbrido | [Contas a Receber online](https://tdn.totvs.com/pages/releaseview.action?pageId=612548392) | VERIFICADO (trecho) |
| Pix a receber (Monitor Pix, FINA890) | Título com Pix pelo TXID, situação "K", chaves Pix do banco, QR dinâmico | PIX TDN | VERIFICADO |
| Pix a pagar | Pix via CNAB com "copia e cola" e chaves do fornecedor | PIX TDN | VERIFICADO |
| DDA | Importa boletos eletrônicos autorizados (FINA260) | [DDA](https://tdn.totvs.com/pages/releaseview.action?pageId=6070338) | VERIFICADO (trecho) |
| Tesouraria: movimento bancário e transferências | Movimentos, transferências, saldos, extrato e cheques (FINA100, FINR470) | TDN Financeiro P12 | VERIFICADO |
| Conciliação bancária (CTBA940) | Cruza extrato importado com movimentos; desde 01/01/2025 substitui FINA380/FINA473 | [CTBA940](https://tdn.totvs.com/display/public/PROT/Suporte+Financeiro-+CTBA940+Conciliador+Financeiro) | VERIFICADO (trecho) |
| Conciliação de cartões e Pix (FINA918, SITEF) | Concilia vendas de cartão/pagamentos digitais com o AR (Cielo, Rede, Amex) | [FINA918](https://tdn.totvs.com/pages/releaseview.action?pageId=655196877) | VERIFICADO (trecho) |
| Administradoras de cartão (SAE) | Liga NSU e autorização TEF ao título | [Conciliador SITEF](https://tdn.totvs.com/display/public/mp/Conciliador+SITEF++--+113612) | VERIFICADO (trecho) |
| Fluxo de caixa | Une pagar/receber, 5 moedas, simula empréstimos/antecipações, pedidos em carteira, gráfico dia a dia | TDN Financeiro P12 | VERIFICADO |
| Fluxo por natureza e CC | Visão por natureza, conciliado ou não (FINA710) | [FINA710](https://tdn.totvs.com/pages/releaseview.action?pageId=622668231) | VERIFICADO (trecho) |
| Projeção financeira | 4 moedas, referencial em dias, tendência inflacionária, disponibilidade por caixa | TDN Financeiro P12 | VERIFICADO |
| Multimoeda | Contas bancárias em moeda estrangeira | TDN Financeiro P12 | VERIFICADO |
| Aplicações e empréstimos (FINA716) | Aplicações, empréstimos e resgates, com contabilização e bloco F100 | [Aplicações e Empréstimos](https://tdn.totvs.com/pages/releaseview.action?pageId=392500138) | VERIFICADO |
| Compror e Vendor | Financiamento de compra/venda com cessão de crédito | TDN Financeiro P12 | VERIFICADO |
| AVP (CPC 12) | Ajuste a valor presente no pagar e receber | TDN Financeiro P12 | VERIFICADO |
| Caixinha | Despesas pequenas em dinheiro | TDN Financeiro P12 | VERIFICADO |
| Comissões | Na emissão ou na baixa; recálculo (FINA440); gera título a pagar (MATA530) | [FINA440](https://tdn.totvs.com/pages/releaseview.action?pageId=312162528) | VERIFICADO (trecho) |
| Retenção de PIS/COFINS/CSLL | Na emissão ou baixa (MV_BX10925), mínimo R$ 10 (Lei 13.137), códigos 5952/5979/5960/5987 | [Central: PCC](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360027163451) | VERIFICADO (trecho) |
| IRRF, INSS e ISS retidos | Pelo cadastro do fornecedor e da natureza; título de imposto; relatório FINR865 | [FINR865](https://tdn.totvs.com/pages/releaseview.action?pageId=312162245) | VERIFICADO (trecho) |
| DIRF | Marca o título para a DIRF (E2_DIRF) | [DIRF](https://tdn.totvs.com/pages/releaseview.action?pageId=6070440) | VERIFICADO (trecho) |
| EFD-Reinf pelo Financeiro (R-4010/4020/4080) | Extrator financeiro envia retenções ao TAF | [Reinf Suporte Financeiro](https://tdn.totvs.com/display/public/PROT/Protheus+-+REINF+Suporte+Financeiro) | VERIFICADO (trecho) |
| Contabilização on-line e off-line | Lançamentos padrão por evento (LP 500, 508, 521–527…) | [LPs do Financeiro](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360050526913) | VERIFICADO (trecho) |
| Dashboards e Smart View | Relatórios dinâmicos e insights de IA sobre fluxo de caixa | [Ficha técnica Backoffice](https://produtos.totvs.com/ficha-tecnica/tudo-sobre-o-totvs-backoffice-linha-protheus/) | VERIFICADO |
| Gesplan e TOTVS Antecipa | Planejamento financeiro externo e antecipação de recebíveis | Ficha técnica | VERIFICADO |
| SCR (Bacen) | Não localizado em fonte oficial | — | INFERIDO (não encontrado) |

## 2. TOTVS Protheus — Contabilidade Gerencial (SIGACTB)

Fontes-base: [Contabilidade Gerencial (TDN)](https://tdn.totvs.com/display/public/PROT/Contabilidade+Gerencial) ·
[Controladoria P12 (índice CTBAxxx)](https://tdn.totvs.com/display/public/PROT/Controladoria+-+Contabilidade+Gerencial+-+Protheus+12).

| Capacidade | O que faz | Fonte | Grau |
|---|---|---|---|
| Plano de contas (CTBA020) | Sintéticas/analíticas, máscaras configuráveis (MV_CTASUP) | Índice SIGACTB | VERIFICADO |
| Plano referencial (CTBA025) | Mapeia ao referencial RFB (ECF/LALUR) | Índice SIGACTB | VERIFICADO |
| CC, item contábil, classe de valor (CTBA030/040/060) + amarração (CTBA250) | Entidades analíticas e regras de combinação | [CTBA180](https://tdn.totvs.com/display/public/PROT/Centro+de+Custos+-+CTBA180) | VERIFICADO (trecho) |
| Entidades adicionais (CTBA050/910) | Entidades contábeis extras com wizard | Índice SIGACTB | VERIFICADO |
| Calendário contábil (CTBA010) e bloqueio | Exercícios e períodos abertos/bloqueados; calendário × moeda × tipo de saldo (CTBA200) | Índice SIGACTB | VERIFICADO |
| Moedas e cotações (CTBA140/150/200) | Várias moedas contábeis | Índice SIGACTB | VERIFICADO |
| Lançamentos padronizados (CTBA080) | Regras por evento com classificadores e fórmulas; on-line/off-line | [CTBA080](https://tdn.totvs.com/pages/releaseview.action?pageId=728631781) | VERIFICADO (trecho) |
| Integração contábil dos módulos (CTBA105, CTBANFE/NFS) | Por procedure e rastreamento (CV3) | Índice SIGACTB | VERIFICADO |
| Lançamentos manuais/automáticos/pré-lançamento (CTBA102/103) | Digitação, lotes, efetivação (MV_PRELAN) | Índice SIGACTB | VERIFICADO |
| Históricos padronizados (CTBA070) | Históricos reutilizáveis | Índice SIGACTB | VERIFICADO |
| Rateio on-line/off-line (CTBA100/270), grupos (CTBA276/277), índices | Rateio por percentual/índice estatístico/externo | Índice SIGACTB | VERIFICADO |
| Reprocessamento de saldos (CTBA190) | Recalcula saldos; job (MV_CTBJOB) | [CTBA190](https://tdn.totvs.com/pages/releaseview.action?pageId=347470259) | VERIFICADO (trecho) |
| Saldos base × compostos; tipos real/orçado/gerencial | Saldos por combinação de entidades | Índice SIGACTB | VERIFICADO |
| Apuração de resultado (CTBA211/212) | Zera contas de resultado, por visão | Índice SIGACTB | VERIFICADO |
| Configuração de livros (CTBA130) e Visão Gerencial (CTBA161) | Balanço/DRE/demonstrativos como árvore com totalizadores | [Balanço com Visão Gerencial](https://tdn.totvs.com/pages/releaseview.action?pageId=341231001) | VERIFICADO (trecho) |
| Quadros contábeis configuráveis (CTBA115) | Quadros pelo usuário | Índice SIGACTB | VERIFICADO |
| Balancetes, razão, diário (Smart View) | Relatórios por entidade, 2 moedas | Índice SIGACTB | VERIFICADO |
| DRE, balanço, fluxo de caixa, DLPA, DMPL, DOAR | Demonstrativos por visão gerencial | Índice SIGACTB | VERIFICADO |
| Orçamento contábil (CTBA390) | Vários orçamentos por calendário, com aprovação | [SIGACTB Diversos](https://tdn.totvs.com/display/public/PROT/SIGACTB+-+Diversos+--+24238) | VERIFICADO (trecho) |
| PCO (Planejamento e Controle Orçamentário) | Bloqueia compra acima do orçamento, liberação por alçada | Ficha técnica | VERIFICADO |
| Consolidação (CTBA220/231/240) e Intercompany (CTBA290) | Filiais/empresas numa destino; planos diferentes; lançamentos entre empresas | [CTBA220](https://tdn.totvs.com/pages/releaseview.action?pageId=6068446) · [Intercompany](https://tdn.totvs.com/pages/releaseview.action?pageId=340367154) | VERIFICADO (trecho) |
| MEP, CPC/IFRS, regulatória × societária | Tópicos existem no índice (conteúdo não lido) | Índice SIGACTB | VERIFICADO (existência) |
| Correção monetária / ajuste por inflação | Rotinas de localização (CTBA055); uso no Brasil não confirmado | Índice SIGACTB | INFERIDO (Brasil) |
| ECD (CTBS001) | Livros A/B/G/R/Z, PVA, J150, J210/J215 | [ECD](https://tdn.totvs.com/pages/releaseview.action?pageId=6068386) | VERIFICADO (trecho) |
| ECD Bloco K (conglomerado) | Plano consolidado (CTBS420/430/440) | [Bloco K](https://tdn.totvs.com/pages/releaseview.action?pageId=467764151) | VERIFICADO (trecho) |
| ECF e LALUR (CTBS300) | Pacote anual ECD/ECF 2026 | Contabilidade Gerencial (TDN) | VERIFICADO |
| Rastreabilidade e auditoria (CTBC010, CV3, CTBA018) | Lançamento até a origem, auditores, quadratura | Índice SIGACTB | VERIFICADO |
| Conciliação com IA | CTBA940 + IA sugere origem de registros sem correspondência | Ficha técnica | VERIFICADO |
| Reforma tributária na contabilidade | Tópico existe (não lido) | Índice SIGACTB | VERIFICADO (existência) |
| Ativo fixo integrado | Entrada, depreciação e baixa | Ficha técnica | VERIFICADO |

## 3. TOTVS Protheus — Fiscal (SIGAFIS), SPED e TAF

Fontes-base: [Fiscal P12](https://tdn.totvs.com/display/public/PROT/Fiscal+-+Protheus+12) · [SPDFIS](https://tdn.totvs.com/display/public/PROT/SPDFIS+-+Sped+Fiscal) ·
[EFDCON](https://tdn.totvs.com/pages/releaseview.action?pageId=212896468) · [EFD-REINF](https://tdn.totvs.com/display/public/PROT/EFD-REINF) ·
[TAF Escopo](https://tdn.totvs.com/display/public/TAF/Escopo).

| Capacidade | O que faz | Fonte | Grau |
|---|---|---|---|
| Escrituração de NF entrada/saída/serviço/complementos | ICMS, IPI, ISS, PIS, COFINS; complementos de imposto, frete, preço | Fiscal P12 | VERIFICADO |
| Livros oficiais | P1/P1A/P2/P2A, P7, P8/P9, Modelo 51/53 | Fiscal P12 | VERIFICADO |
| Apuração de ICMS (MATA953) | Próprio e ST, DIFAL/FECP, guia (GNR) | [APUICM](https://tdn.totvs.com/pages/releaseview.action?pageId=270894388) | VERIFICADO (trecho) |
| Apuração de IPI (MATA952) | Com ajustes manuais (CCK) | [APUIPI](https://tdn.totvs.com/pages/releaseview.action?pageId=270093976) | VERIFICADO (trecho) |
| Apuração de ISS (FISA300, Bloco B) | Bloco B da EFD (DF) | SPDFIS | VERIFICADO |
| ICMS-ST ressarcimento/complemento (FISA302) | Apura ressarcimento ou complemento | [APURESST](https://tdn.totvs.com/pages/releaseview.action?pageId=525806853) | VERIFICADO (trecho) |
| DIFAL e FECP (EC 87/2015) | Tabela UF × UF (FISA080), GNRE | [Central: DIFAL](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360048421613) | VERIFICADO (trecho) |
| GNRE via webservice | Transmite guias estaduais | [GNREWS](https://tdn.totvs.com/display/public/PROT/GNREWS+-+Guia+Nacional+de+Recolhimento+de+Tributos+Estaduais+via+Webservice) | VERIFICADO (trecho) |
| EFD ICMS/IPI (SPED Fiscal) | Blocos 0/B/C/D/E/G/H/K/1/9, perfil A/B/C, tabelas SEFAZ | SPDFIS | VERIFICADO |
| CIAP (Bloco G), Bloco K, inventário (Bloco H) | Crédito do ativo; produção/estoque; inventário (FISA120) | SPDFIS | VERIFICADO |
| Códigos de ajuste (CADSPED) | Códigos SEFAZ e reflexos | [CADSPED](https://tdn.totvs.com/pages/releaseview.action?pageId=640907320) | VERIFICADO (trecho) |
| EFD Contribuições (FISA001) | Apura PIS/COFINS/CPRB, títulos, contabilização, arquivo; caixa ou competência | EFDCON | VERIFICADO |
| Créditos de PIS/COFINS | Saldos, extemporâneo, estoque de abertura, ressarcimento (1100/1500) | EFDCON | VERIFICADO |
| Exclusão do ICMS da base de PIS/COFINS | ICMS destacado ou a recolher | EFDCON | VERIFICADO |
| Diferimento e crédito presumido | MV_DIFCRD1; M100/M500 | [CREDPRESPISCOF](https://tdn.totvs.com/pages/releaseview.action?pageId=697254834) | VERIFICADO (trecho) |
| Retenções na fonte de PIS/COFINS | Saldos de retenções | EFDCON | VERIFICADO |
| EFD-Reinf (R-2000, R-4000) | Serviços e retenções ao TAF; extrator fiscal e financeiro; NT 02/2026 (lucros e dividendos) | EFD-REINF | VERIFICADO |
| DCTFWeb e DIRF | Alimentada por Reinf/eSocial; FAQ de guias | EFD-REINF | VERIFICADO (existência) |
| GIA-ST e DeSTDA | GIA-ST pelo TAF; DeSTDA (MATA950) | [GIAST](https://tdn.totvs.com/pages/releaseview.action?pageId=643557353) | VERIFICADO (trecho) |
| GIA-SP, DIEF, DAPI, Sintegra… | Estaduais pelo TAF (página antiga; várias extintas) | TAF Escopo | VERIFICADO |
| TES e TES inteligente | Regras fiscais por tipo de entrada/saída, CST, crédito PIS/COFINS | Fiscal P12 | VERIFICADO |
| Configurador de Tributos (CFGTRIB) | Regras de alíquota/base/NCM/MVA/pauta/UF/vigência/fórmula; simulador | [CFGTRIB](https://tdn.totvs.com/display/public/PROT/CFGTRIB+-+Configurador+de+Tributos) | VERIFICADO |
| Exceções fiscais, impostos variáveis, tabela IBPT | Exceções e tributos aproximados | Fiscal P12 | VERIFICADO |
| Calendário de obrigações fiscais | Calendário da empresa | Fiscal P12 | VERIFICADO |
| Reforma Tributária: IBS/CBS na NF-e | Desde 03/08/2026 só pelo Configurador; tabela cClassTrib (F2D/CJ3), tags NT 2025.002 | [Central: IBS/CBS](https://centraldeatendimento.totvs.com/hc/pt-br/articles/42351363577623) | VERIFICADO |
| Simulador de Tributos / Inteligência Tributária | Simula o novo modelo | Ficha técnica | VERIFICADO |
| TSS: NF-e, CT-e, MDF-e, NFS-e, NFC-e, GNRE-e | Processos de emissão/cancelamento/CC-e; assinatura e transmissão | [TSS Processos](https://tdn.totvs.com/display/public/TSS/Processos) | VERIFICADO |
| Manifestação do destinatário (MD-e) | Processo 008; até 2 eventos conclusivos, vale o último | [Central: MD-e](https://centraldeatendimento.totvs.com/hc/pt-br/articles/360044719494) | VERIFICADO (trecho) |
| TOTVS Colaboração 2.0 | Importa NF-e/CT-e/NFS-e/MDF-e/MD-e para a entrada | [Colaboração 2.0](https://tdn.totvs.com/pages/releaseview.action?pageId=187534008) | VERIFICADO (trecho) |
| NFS-e Padrão Nacional | TSS → ADN, cTribNac/cTribMun, certificado por filial, DANFSE; também ABRASF municipal | [NFS0076](https://tdn.totvs.com/display/public/PROT/NFS0076_NFS-e+NACIONAL) | VERIFICADO (trecho) |
| TAF: integração e apuração | Arquivo ou banco-a-banco; ICMS/ST/IPI; Reinf, eSocial, ECF | TAF Escopo | VERIFICADO |
| TAF: eventos Reinf | R-1000, R-1070, R-2010–2060, R-2098/99, R-3010, R-9000 | TAF Escopo | VERIFICADO |
| Smart View fiscal | Conferência, inclusive Reinf | Ficha técnica | VERIFICADO |

**Diferenciais que a TOTVS alega (ficha técnica/TDN):** Configurador de Tributos como motor único (reforma incluída);
cobertura legal federal/estadual/capitais e municípios > 500 mil hab.; TSS + TAF para todas as entregas legais; Pix,
boleto híbrido e CNAB prontos; financeiro que alimenta Reinf e contabilidade sozinho; entidades contábeis configuráveis
com visão gerencial; consolidação/intercompany; IA (Carol) e Smart View.

## 4. Salesforce — Revenue Cloud / Billing

| Capacidade | O que faz | Fonte | Grau |
|---|---|---|---|
| Faturas automáticas por agenda | Faturas rastreáveis até cotação e pedido | [revenue-cloud-billing](https://www.salesforce.com/sales/revenue-cloud-billing/) | VERIFICADO |
| Invoice run, fatura sob demanda, importação | Lote, por Conta/Pedido, ou importando faturas externas | [Trailhead: billing lifecycle](https://trailhead.salesforce.com/content/learn/modules/billing-basics-in-revenue-cloud/navigate-the-full-billing-lifecycle) | VERIFICADO |
| Billing schedules | Cronograma em rampa, aditivo, cancelamento, renovação | Trailhead (acima) | VERIFICADO |
| Recorrente, por marco, proration | Assinatura e marcos com aditivos/renovações/proração | revenue-cloud-billing | VERIFICADO |
| Por uso e carteira digital | Pré-pago, moeda virtual, rollover | revenue-cloud-billing | VERIFICADO |
| Tipos de uso faturável | Uso medido vira resumo faturável | help.salesforce.com (usage types) | VERIFICADO† |
| Invoice plans (Billing legado) | Parcelas fora do ciclo | developer.salesforce.com (blng custom objects) | VERIFICADO† |
| Planos de pagamento (parcelar dívida) | Sem descrição clara no produto atual | — | INFERIDO |
| Pagamentos e gateways | Formas de pagamento, lote, gateways automatizados | revenue-cloud-billing · Trailhead | VERIFICADO |
| Conciliação de liquidação do gateway | Por regras configuráveis | revenue-cloud-billing | VERIFICADO |
| Credit memo, estorno, reembolso, pagamento parcial | Crédito automático ao reduzir pedido ou avulso | Trailhead · produto | VERIFICADO |
| Write-off | Credit memo de baixa por perda | Trailhead | VERIFICADO |
| Cobrança e dunning | Planos de cobrança, atividades, e-mails de atraso | Trailhead · produto | VERIFICADO |
| Impostos | Motores externos, cálculo por linha, política de imposto | produto · help (tax policy) | VERIFICADO / † |
| Contabilidade e razão | Diários, fechamento de período, conversão de moeda | revenue-cloud-billing | VERIFICADO |
| Integração com ERP | Sincroniza ou atua como subledger | revenue-cloud-billing | VERIFICADO |
| Contratos: aditivo, renovação, cancelamento | Mudança no ativo gera cotação → pedido | [Trailhead: asset amendments](https://trailhead.salesforce.com/content/learn/modules/asset-lifecycle-management-with-revenue-cloud/manage-customer-asset-amendments) | VERIFICADO† |
| Reconhecimento de receita | "Revenue Recognition Policies" no Billing legado | help (blng_rev_rec_policies) | VERIFICADO† |
| ASC 606 / IFRS 15 | Nada oficial atrela o produto à norma | — | INFERIDO |

## 5. Salesforce — Reports & Dashboards

| Capacidade | O que faz | Fonte | Grau |
|---|---|---|---|
| Tabular, resumo, matriz, joined | Joined combina tipos de relatório em blocos | [Trailhead: report formats](https://trailhead.salesforce.com/content/learn/modules/lex_implementation_reports_dashboards/lex_implementation_reports_dashboards_report_formats) | VERIFICADO† |
| Fórmulas de resumo (também em joined) | Coluna calculada sobre agrupamentos | help (custom summary formulas) | VERIFICADO† |
| Filtros cruzados | Por objeto relacionado (existência/ausência); 3 por relatório, 5 subfiltros | help (cross filters) | VERIFICADO† |
| Bucket columns | Agrupa valores sem criar campo; 5 campos/20 buckets/20 valores | help (limits) | VERIFICADO† |
| Resumos (soma, média, agrupamento) | Agregação por campo | help (fields summaries) | VERIFICADO† |
| Filtros de dashboard | Filtra o dashboard inteiro (não aceita bucket/fórmula) | help (dashboard filters) | VERIFICADO† |
| Dashboards dinâmicos | Dados conforme quem visualiza; sem refresh agendado/assinatura | help (dynamic dashboards) | VERIFICADO† |
| Agendar refresh de relatório | Em horário agendado | help (reports schedule) | VERIFICADO† |
| Assinar relatório | E-mail agendado com .xlsx/.csv e condição | help (subscribe) | VERIFICADO† |
| Assinar/agendar dashboard | Por e-mail, com cache | help (dashboards subscribe) | VERIFICADO† |
| Assinatura no Slack | Relatórios e dashboards pelo Slack | help (CRM Analytics for Slack) | VERIFICADO† |
| Einstein/Agentforce em relatórios | Sem página oficial confirmando | — | INFERIDO |
| Tipos de relatório customizados | Existem (só referência de API) | — | INFERIDO |

## 6. Microsoft Power BI

| Capacidade | O que faz | Fonte | Grau |
|---|---|---|---|
| Modelo semântico, DAX, medidas | Medidas/colunas com contexto de linha e filtro; inteligência de tempo | [DAX basics](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-quickstart-learn-dax-basics) | VERIFICADO |
| Relacionamentos | Cardinalidade, direção, ativo, autodetecção | [relationships](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-create-and-manage-relationships) | VERIFICADO |
| Drill mode (hierarquia) | Níveis dentro do visual | end-user-drill (citado) | VERIFICADO† |
| Drillthrough | Do resumo a página de detalhe filtrada; entre relatórios | [drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough) | VERIFICADO |
| Filtros/destaque cruzados | Selecionar filtra/destaca os outros visuais | [reports overview](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-reports-overview) | VERIFICADO† |
| Slicers, filtros, ordenar, dados como tabela | Interação do usuário | [end-user features](https://learn.microsoft.com/en-us/power-bi/fundamentals/end-user-features) | VERIFICADO |
| Visuais nativos | Catálogo | [visualizations](https://learn.microsoft.com/en-gb/power-bi/visuals/power-bi-visualizations-overview) | VERIFICADO† |
| Bookmarks | Salvam filtros/ordenação/visibilidade; apresentação | [bookmarks](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-bookmarks) | VERIFICADO |
| Tooltips | Página de dica de contexto | [tooltips](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-tooltips) | VERIFICADO† |
| Q&A | Perguntas em texto; descontinuação em fev/2027 em favor do Copilot | end-user features · [Q&A](https://learn.microsoft.com/en-us/power-bi/natural-language/power-bi-tutorial-q-and-a) | VERIFICADO / † |
| Copilot | Resumir/analisar/gerar DAX; exige Fabric | [copilot](https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction) | VERIFICADO† |
| Alertas de dado | Tile numérico cruza limite | [data alerts](https://learn.microsoft.com/en-us/power-bi/create-reports/service-set-data-alerts) | VERIFICADO† |
| Atualização agendada | Modelo em agenda | end-user features | VERIFICADO |
| Linhagem | Dependências fluxo → modelo → relatório | end-user features · [Purview lineage](https://learn.microsoft.com/en-us/purview/data-map-lineage-fabric) | VERIFICADO / † |
| RLS | Filtros DAX por papel; `USERPRINCIPALNAME()`; só restringe Viewer | [RLS](https://learn.microsoft.com/en-us/fabric/security/service-admin-row-level-security) | VERIFICADO |
| Dataflows | Power Query no serviço; Gen2 recomendada | [dataflows](https://learn.microsoft.com/en-us/power-query/dataflows/create-use) | VERIFICADO† |
| Workspaces e apps | Conteúdo com papéis; apps para público maior | [workspaces](https://learn.microsoft.com/en-nz/power-bi/collaborate-share/service-create-the-new-workspaces) · end-user features | VERIFICADO† / V |
| Assinatura por e-mail | Snapshot/anexo por agenda; até 24 por item | [subscribe](https://learn.microsoft.com/en-us/power-bi/collaborate-share/end-user-subscribe) | VERIFICADO† |
| Exportação PDF/PPT/dados/Excel | Admin pode desligar | end-user features | VERIFICADO |
| Relatórios paginados | Layout fixo (Report Builder) | [paginated](https://learn.microsoft.com/en-sg/power-bi/paginated-reports/paginated-reports-report-builder-power-bi) | VERIFICADO† |
| Métricas e scorecards | Metas com atual × alvo, hierarquias; máx. 1.000/scorecard | [goals](https://learn.microsoft.com/en-us/power-bi/create-reports/service-goals-introduction) | VERIFICADO† |
| Decomposition tree, key influencers | Explorar medida por dimensões; fatores | [AI sample](https://learn.microsoft.com/en-us/power-bi/create-reports/sample-artificial-intelligence) | VERIFICADO† |
| Detecção de anomalias | Fora do intervalo esperado, com explicação | [anomaly detection](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-anomaly-detection) | VERIFICADO† |
| Forecasting e painel de análise | Previsão, linhas de referência, barras de erro | [analytics pane](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-analytics-pane) | VERIFICADO† |
| Mobile | iOS/Android com Copilot (prévia) | [mobile copilot](https://learn.microsoft.com/en-us/power-bi/explore-reports/mobile/mobile-copilot-overview) | VERIFICADO† |

**"Mínimo esperado" por PME brasileira (inferência do agente, sem fonte oficial que ranqueie):** AR/AP com fluxo de caixa;
emissão de NF-e/NFS-e ligada ao faturamento (obrigação: Sebrae); cobrança com baixa/conciliação e cobrança de atraso;
relatórios com período/agrupamento/subtotal + PDF/Excel; dashboard com drill, acesso por perfil e envio agendado. Copilot,
joined, árvore de decomposição, anomalias, scorecards, paginados e linhagem são diferenciais.
