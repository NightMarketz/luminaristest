---
tipo: "destino"
secao_sdd: "§6"
titulo: "Catálogo completo de módulos (16 domínios)"
---
# §6 Catálogo completo de módulos (16 domínios)

### 6.1 Plataforma e geração do sistema
- **DECIDIDO** Entrevista com IA → preset match → customização de campos → binding compilado + validador (P1 ✅ #211).
- ⟨corr⟩ **DECIDIDO (em fila)** Composição por categoria→módulo (**I8**) e ativação (unidade, plano de contas,
  período aberto, binding ativo — **I1/I3/I4**): forks ratificados, **código não iniciado** (§M5.1 Bloco A;
  `ModuleKey`/`CRM_MODULE_NOT_INSTALLED` = 0 ocorrências em `server/src`).
- **DECIDIDO** Motor DynamicTable com governança declarativa (required/requiredIf/compare/unique/relation/readOnly/
  immutableAfter/lifecycle/noOverlap/deleteConstraints) e plugins. ⟨corr⟩ Duas lacunas abertas no motor:
  **GAP-MAP 7** (`unique`/`compositeUnique` sem gate in-tx — teste-guarda escrito em 23/09, ainda sem PR) e
  **GAP-MAP 8** (`deleteTableData` ignora `immutableAfter`/`lifecycle`).
- **PROPOSTO** Construtor visual de automações (equivalente ao Flow Builder): gatilho em evento de tabela →
  condições → ações. Fronteira: nunca toca o razão; ação financeira = evento que o binding traduz.
- **PROPOSTO** Construtor de formulários e páginas públicas (captura de lead, agendamento, pesquisa).
- **PROPOSTO/GATILHO P5** Marketplace de presets de setor e extensões.
- **PROPOSTO** Sandbox por tenant.

### 6.2 CRM e vendas — nível Salesforce Sales Cloud SMB
- **DECIDIDO** Funil fixo CRM-0 (pipelines, etapas, leads, atividades), propostas CRM-1, contas+contatos CRM-2,
  oportunidades CRM-3; conversão de lead; avanço de etapa nunca contabiliza. (Divisão em módulos instaláveis = I8.)
- **PROPOSTO** Score de lead preditivo (hoje BANT por regra) e próxima melhor ação.
- **PROPOSTO** Cotação → pedido → faturamento com tabela de preço, desconto com alçada, validade.
- **PROPOSTO** Previsão de vendas por período, vendedor e etapa (commit/best case).
- **PROPOSTO** Territórios e distribuição de lead.
- **PROPOSTO** Cadências de contato com agente redigindo e humano aprovando.
- **PROPOSTO** Contratos e renovações recorrentes com faturamento automático.
- Gap detalhado contra o Salesforce (P0/P1/P2): **Parte IV §IV.3**.

### 6.3 Atendimento e serviço — nível Service Cloud Starter
- **PROPOSTO** Caixa unificada (WhatsApp, e-mail, chat) virando tickets com SLA, fila e prioridade.
- **PROPOSTO** Base de conhecimento + agente de atendimento que escala para humano.
- **PROPOSTO** Ordem de serviço com peças do estoque, mão de obra, garantia.
- **PROPOSTO** Pesquisa NPS/CSAT pós-atendimento.

### 6.4 Marketing
> ⚠ **Texto não recebido** no SDD colado em 23/09 (só o título). Estado do repo: ver §IV.3 (gap CRM).

### 6.5 Agenda, serviços e pacotes (molde salão/clínica)
> ⚠ **Texto não recebido.** Estado do repo: agenda com `noOverlap` (TOCTOU fechado em `93945426`), saldo de pacote
> first-class (`CustomerPackageBalance`) — ver §M2.

### 6.6 Vendas no balcão, PDV e comércio
> ⚠ **Texto não recebido.** Estado do repo: venda "recebo depois" genérica (`SalesModule` + `RegisterPaymentService`,
> §IV.1 P4) — ver §M2.

### 6.7 Estoque, compras e custos — nível TOTVS Estoque/Compras
- **DECIDIDO** Estoque por unidade (operacional) + subrazão first-class (InventoryItem/StockMovement), sincronização
  física, custo por regime (D3/X6), NF-e de compra ingerida criando título a pagar.
- **GATILHO** Compras operacional: solicitação → cotação → pedido → recebimento → título (1º vertical com estoque a prazo).
- **PROPOSTO** Custo médio/FIFO com fechamento mensal, inventário cíclico, lote e validade, ponto de reposição,
  curva ABC, transferência entre unidades com nota.

### 6.8 Financeiro e tesouraria — nível TOTVS Financeiro
- **DECIDIDO** Contas a pagar/receber como subrazão com invariante contra o GL, baixa parcial, aging, caixa
  projetado, conciliação OFX/CNAB, retorno bancário → item de baixa confirmado por humano (F7).
- **DECIDIDO (em fila)** Pix como frente própria (F6); remessa CNAB/boleto multi-leiaute (F5). ⟨corr⟩ Ambos
  dependem de **D6** (convênio/leiaute do banco); a extração por IA (**ADR P-IA**) foi **adiada até D6 pela
  decisão R10** — não está "em fila".
- **PROPOSTO** Open Finance, conciliação de adquirente, cobrança automática com régua, orçamento vs realizado, DRE
  gerencial por centro de custo, multi-conta com transferências.
- **PROPOSTO** Split payment: valor líquido recebido + tributo retido pelo liquidante, conciliado contra a nota —
  obrigatório no horizonte 2027+.

### 6.9 Contabilidade — núcleo invariante
- **DECIDIDO** Plano de contas + referencial RFB, períodos, lançamento com numeração/estorno/proveniência,
  hash-chain, dimensões, aprovação maker-checker, relatórios (balancete, razão, BP, DRE, DFC, Diário), ECD com
  J930/0930 (C12 ✅ #353), revisão profissional editável (C11), pacote ao contador (C6/C6b), imobilizado com
  depreciação e baixa (C8 PR-1..3 ✅ #354–#356).
- ⟨corr⟩ **DECIDIDO (em fila)** Retificação versionada = **C8 PR-4** (⬜, autorizado "Executa C8" 18/09).
- **PROPOSTO** Rateio de despesas indiretas, provisões automáticas (férias, 13º, contingências), fechamento
  assistido com checklist e bloqueio. ⟨corr⟩ "Consolidação de unidades" **colide com T2** (tenancy =
  `AccountingScope`, sem torre LegalEntity) e com a rejeição de multiempresa (§M4) — só por ADR que reabra ambos.

### 6.10 Fiscal e tributário — nível TOTVS Fiscal
- **DECIDIDO** ECF Lucro Real (L/M/N, e-Lalur/Lacs, Parte B), NF-e de entrada, NFS-e nacional via parceiro com
  eventos e prazos (X10b ✅), IBS/CBS no adaptador, catálogo de adições/exclusões por dado, CNPJ alfanumérico.
- **DECIDIDO (em fila)** NF-e 55 emissão, apuração de tributos (X7), EFD-Contribuições (X8), DCTFWeb (X9).
- ⟨corr⟩ **GATILHO P4** Assinatura digital + transmissão SPED (ICP-Brasil/Receitanet) — ADR próprio, não está na
  fila nem na régua (§IV.1 P4).
- **PROPOSTO** Motor de regras tributárias por NCM/NBS/CFOP/CST/cClassTrib com tabela versionada por vigência;
  Simples Nacional (PGDAS-D, Anexos, fator R) e MEI (DAS); EFD ICMS/IPI; ST e DIFAL; CT-e/MDF-e; manifestação do
  destinatário/DF-e distribuição. ⟨corr⟩ Nomear "motor de regras" colide com o **rule engine rejeitado** (§M4) —
  o PRE-ADR deve provar que é **tabela versionada (dado)**, não engine em runtime.

### 6.11 Pessoas, RH e folha — nível TOTVS RH
> ⚠ **Texto não recebido.** Estado do repo: folha é **domínio diferido** (§M5); o SDD a propõe first-class (§8).

### 6.12 Projetos, produção leve e ativos operacionais
> ⚠ **Texto não recebido.** Ativo contábil (imobilizado) = §6.9.

### 6.13 Documentos, contratos e assinatura
> ⚠ **Texto não recebido.** Estado do repo: recibos/comprovantes PDF (puppeteer) — ver §M2.

### 6.14 Analytics e BI
> ⚠ **Texto não recebido.** Canônico de analytics: `AnalyticsDashboard`/`ChartRenderer`/`DashboardKpiCard` (Contrato §0).

### 6.15 Colaboração e produtividade
> ⚠ **Texto não recebido.**

### 6.16 Administração do tenant
> ⚠ **Texto não recebido.** Tenancy = `AccountingScope` (T2, §M1).
