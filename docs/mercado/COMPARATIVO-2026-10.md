# Comparativo de mercado: Luminaris × estado da arte no Brasil (15/10/2026)

> **Resumo:** o Luminaris está à frente onde o mercado de salão e de ERP pequeno **não chega**: razão de partidas
> dobradas, ECD/ECF (Presumido e Real), LALUR e venda do salão virando lançamento contábil sozinha. Nenhum dos 4
> sistemas de salão e nenhum dos 4 ERPs anuncia isso no produto do empresário. A exceção é a Omie, que entrega via
> OneFlow, um produto separado e ainda sem Lucro Real.
> **Risco principal:** o comprador de salão compara primeiro a recepção. Agendamento online pelo cliente, lembrete
> automático por WhatsApp, app do profissional, maquininha e cashback/clube são básicos em Trinks, Avec e Belasis.
> O Luminaris não tem nenhum desses, e só agendamento, app e WhatsApp aparecem no destino do plano, como PROPOSTO,
> sem nó na fila. Some-se a isso que a emissão de NFS-e, que os 4 salões e os 4 ERPs têm, está pausada no Luminaris.
> Resultado: a lista de espera não pode se apresentar como "sistema de salão".

Escopo: só leitura e pesquisa. Nenhum código, plano ou nota de nó foi alterado. Documento não commitado.

## 0. Método e graus

- **Fontes de mercado:** só sites oficiais dos fornecedores (páginas de preço, central de ajuda, documentação) e
  código-fonte (GitHub) no caso de open source. Blog, review e comparador ficaram de fora; serviram, no máximo, de pista.
  A coleta foi feita por três agentes de pesquisa desta sessão em 15/10/2026, que leram as páginas via WebFetch, HTML
  bruto e navegador embutido. **Eu não reabri cada página.** O grau abaixo é o que o agente registrou: um WebFetch passa
  por um resumo automático, e por isso "V" de página lida via WebFetch vale um pouco menos que HTML bruto.
- **Graus:**
  - **V (verificado):** página oficial ou arquivo do repositório lido.
  - **I (inferido):** só snippet de busca restrita ao domínio oficial, dedução (ex.: 404 no repositório aberto ⇒
    Enterprise) ou, no Luminaris, conclusão tirada do nome do arquivo sem ler o código.
  - **A (assumido):** sem evidência direta. Sempre dito por extenso.
- **"Não encontrado"** quer dizer que o recurso não apareceu na fonte oficial lida. É ausência de evidência, não negativa
  do fornecedor. As centrais de ajuda da Avec e da Belasis não foram varridas a fundo.
- **Lado Luminaris:** inventário de `server/src/features/*`, `my-app/features/*` + `my-app/pages/*`, presets em
  `server/src/features/dynamicTables/presets/{modules,systems}`, a fila em `docs/plano/_INDEX.md` (régua 54/63) e o
  destino em `docs/plano/destino/` (§11, §12, §18).
- **Caso adversarial tentado:** testei a tese "ninguém do mercado faz contabilidade" contra os 11 concorrentes. Ela
  **caiu parcialmente** em dois pontos:
  - A Omie tem o OneFlow (razão, balancete, ECD e ECF), separado e sem Lucro Real [O5][O6][O7].
  - A OCA tem `l10n_br_sped_ecd`, só na branch 16.0 e em Alpha [D10].

  A tese foi reescrita como "ninguém entrega isso no mesmo produto do empresário de salão/PME, com Lucro Real".
  Também tentei "Salão VIP é um 4º concorrente": falso, o domínio redireciona para a Avec [A7].

## 1. Preço público (âncoras)

| Produto | Preço público | Grau / fonte |
|---|---|---|
| Trinks | Todas as 5 faixas (por nº de profissionais) "sob consulta"; teste de 5 dias; multa de 50% ao cancelar plano semestral/anual | V [T1] |
| Avec (absorveu o Salão VIP) | 1–2 profissionais: R$ 88,90/mês no anual ou R$ 99,90 no mensal; demais faixas "a consultar"; taxas Asaas sem valor | V [A1] [A7] |
| Belasis | Lite a partir de R$ 99, Pro a partir de R$ 189, Scale sob consulta (selo "-20%" no anual, sem dizer se já aplicado) | V [B1] |
| Conta Azul | Por faturamento: Essencial R$ 179,90 · Controle R$ 349,90 · Avançado R$ 439,90 · Performance R$ 799,90/mês no anual; PDV pago à parte sem valor | V [C1] [C5] |
| Omie | Por receita, a partir de: ERP R$ 119 / 309 / 569 / 749; Multivarejo R$ 229 / 419 / 679 / 859; acima de R$ 720 mil/ano "Consulte"; OneFlow com mínimo de R$ 180 | V [O1] [O8] |
| Bling | Cobalto R$ 60 · Titânio R$ 120 · Diamante R$ 650 · Elite a partir de R$ 1.250/mês (promoção "Black" só na 1ª mensalidade; valor anual do Titânio ambíguo na página) | V [G1] |
| Nibo (empresário) | Light R$ 166 · Plus R$ 250 · Premium R$ 383/mês no anual; portfólio do escritório "sob medida" | V [N1], I [N3] |
| Odoo | 1 app grátis; Padrão R$ 38,40/usuário/mês (anual, com desconto; cheio R$ 48); Personalizado R$ 69,10 (cheio R$ 86,40); NF-e/NFS-e via Avalara cobram crédito por chamada | V [D1] [D2] |
| ERPNext | Open source (GPL-3); Frappe Cloud a partir de US$ 5/mês por site; as duas páginas de preço de servidor divergem | V [E1] [E2] |
| Airtable / Glide | Airtable Team US$ 20–24 e Business US$ 45–54 por colaborador/mês · Glide US$ 25 a 125/mês | V [R1] [R4] |
| **Luminaris** | **Sem preço público.** `my-app/pages/users/subscription.tsx:47,70,92` tem R$ 50/200/1000, que parece placeholder de template (A) | V (arquivo lido) |

Faixa de referência para o salão pequeno: **R$ 89–189/mês** pelo sistema de salão, mais nota e WhatsApp como
adicionais sem preço publicado [A1][B1][T1]. Para ter também um ERP com nota (Conta Azul/Omie), o salão soma
**R$ 119–440/mês** [C1][O1]. Contabilidade continua fora dessas duas contas, com o escritório contábil (A: prática de
mercado, sem fonte oficial nesta pesquisa).

## 2. (a) Tabelas de funcionalidade

Legenda: ✅ tem · 🟡 parcial · ❌ não tem · ∅ não encontrado na fonte oficial · `+$` adicional pago. Cada célula traz
fonte e grau. As fontes estão no §7.

### 2.1 Frente 1: gestão de salão

| Funcionalidade | Luminaris | Trinks | Avec | Belasis |
|---|---|---|---|---|
| Agenda interna (profissional × horário, conflito) | ✅ tabela `appointments` com noOverlap, jornada e ciclo de vida (`AppointmentsPlugin.ts:1-12`, V); tela calendário `PlanningCalendar.tsx` (FullCalendar, V) | ✅ V [T1] | ✅ V [A1] | ✅ V [B1] |
| **Agendamento online pelo cliente (link/site)** | ❌ só "portal do cliente: agendar" no destino §12, PROPOSTO e sem nó (V) | ✅ incluso, com Google/Instagram V [T1][T3] | ✅ V [A1] | ✅ com sinal V [B1] |
| App/marketplace do consumidor | ❌, não planejado (V: destino sem menção) | ✅ trinks.com V [T7]; app com marca `+$` V [T1] | ✅ avec.app V [A6] | 🟡 app com a marca do salão V [B3]; marketplace ∅ |
| **Lembrete automático WhatsApp/SMS** | ❌; "WhatsApp" só na onda 3 do destino §18, PROPOSTO, sem nó; "lembrete" sem menção no destino (V) | ✅ `+$` V [T1] | ✅ WhatsApp `+$` V [A1] | ✅ automações Pro/Scale; WhatsApp API oficial V [B1] |
| Ficha do cliente / anamnese | 🟡 cadastro com LGPD (preset, V); anamnese **adiada** como lacuna de spec (`AestheticClinicCustomerModule.ts:16-30`, V) | ✅ anamnese V [T2] | 🟡 histórico V [A1]; anamnese ∅ | ✅ anamnese Pro/Scale V [B1] |
| Comissão | 🟡 tabela `commissions` com ciclo Pendente→Pago e imutável após pago (`CommissionsPlugin.ts:1-13`, V); cálculo automático a partir da venda não encontrado (I) | ✅ pagamento automático V [T2] | ✅ mais antecipação "Vale Rápido" V [A1][A2] | ✅ automáticas V [B1] (página contraditória quanto ao plano) |
| Estoque | ✅ movimentos com plugins de estoque automático (V por nome) + `InventoryService` contábil (I) | ✅ V [T1] | ✅ V [A1] | ✅ mais importação de XML V [B1] |
| Caixa / comanda / PDV | 🟡 venda + `RegisterPaymentService` + cancelamento (I); "PDV + NFC-e" só na onda 3, PROPOSTO (V) | ✅ comanda V [T2] | ✅ comanda digital V [A1] | ✅ comandas e fechamento de caixa V [B1] |
| Financeiro (pagar/receber, fluxo de caixa) | ✅ AP/AR, fluxo, caixa projetado, aging, baixas, conciliação OFX/CNAB, com telas (`AccountsPayablePanel`, `CashForecastPanel`, `ReconciliationPanel`…, V por nome) | ✅ V [T1] | 🟡 caixa e entradas/saídas V [A4] | ✅ V [B1] |
| Pacotes pré-pagos | ✅ `packages` com saldo e aceite; **receita diferida e validade** em andamento (nó PACOTE-VALIDADE) (V) | ✅ V [T1] | ✅ V [A1] | ✅ V [B1] |
| Clube de assinatura | ❌; destino cita recorrência de forma genérica (I) | ✅ `+$` V [T1] | ✅ V [A2] | ✅ V [B1] |
| Fidelidade / cashback | ❌, não planejado (V: zero menção no destino; `CampaignsModule` só registra campanha) | 🟡 fidelidade `+$` V [T1]; cashback ∅ | 🟡 "fidelidade" V [A2] | ✅ cashback Pro/Scale V [B1] |
| **Emissão NFS-e** | 🟡 **pausada**. Modo manual: o Luminaris gera a DPS e o cliente emite no portal e devolve o XML (`ManualEmissor.ts:4-13`, V); emissor automático bloqueado (X10i, D5: ADN pausado) (V) | ✅ `+$` V [T1] | ✅ NFS-e, NFS-e Nacional e NFC-e `+$` V [A1][A3] | ✅ emissor integrado (Scale; `*` nos outros) V [B1] |
| Salão-parceiro (Lei 13.352/2016) | 🟡 na **apuração**: cota-parte excluída da base (PIS/COFINS, `pisCofinsCalc.ts:36,150-158`, V; Simples, I); nota segregada não emitida (depende da emissão) | ✅ divisão do valor na NFS-e `+$` V [T4] | ✅ CNPJ/MEI do parceiro em Multiempresa V [A3] | ∅ (só snippet, I) |
| Maquininha / pagamento integrado / split | ❌ maquininha; 🟡 cobrança Mercado Pago em andamento (`MercadoPagoCollectionProvider.ts`, nó F5) (V) | ✅ Stone/Belezinha V [T2] | ✅ Avec Pay + split `+$` V [A1] | ✅ Belasis Pay (sinal, recorrência, antecipação) V [B2] |
| Marketing (campanhas, aniversário) | 🟡 tabela `campaigns` só registra, não dispara envio (V) | ✅ aniversário, retorno, SMS/e-mail V [T3] | ✅ "Marketing IA" V [A2] | ✅ campanhas no Scale V [B1] |
| Relatórios / dashboards | ✅ dashboards de KPI; builder de relatórios do CRM em andamento (V: fila) | ✅ "+130 relatórios" V [T2] | ✅ BI `+$` V [A1] | ✅ V [B1] |
| Multi-unidade / rede | 🟡 tabela `units` + escopo contábil por unidade; validação de `unitId` aberta (nó I6) (V) | ✅ redes e franquias V [T2] | ✅ `+$` a partir de 6 profissionais V [A1] | ✅ Scale V [B1] |
| **App do profissional (mobile)** | ❌; "Mobile/PWA" no destino §12, PROPOSTO, sem nó (V) | ✅ incluso V [T1] | ✅ AVEC PRO V [A5] | ✅ V [B1] |
| IA | 🟡 entrevista de onboarding que gera o sistema (~35%, avaliação anterior desta conversa) + agente de chat RAG/ERP (`features/chat`, `features/interview`, V por nome) | ✅ agendamento por IA, via parceiros V [T2][T3] | ✅ IA para recepção `+$` V [A1] | ✅ assistente/insights V [B1][B2] |
| **Contabilidade (razão, balancete, DRE/BP contábil, SPED)** | ✅ ver §4. **Sem prova de PVA ainda** (gate H1 aberto) (V) | ❌ só DRE gerencial (I [T6]) e exportação de lançamentos para Conta Azul/Granatum/Nibo/F360 V [T5] | ∅; exporta XML/PDF para o contador V [A3] | ∅ |

### 2.2 Frente 2: ERP com financeiro/fiscal para pequena empresa

| Funcionalidade | Luminaris | Conta Azul | Omie | Bling | Nibo (empresário / escritório) |
|---|---|---|---|---|---|
| NF-e / NFC-e emissão | ❌ emissão bloqueada (X10a/X10i); NFC-e com 27 UFs ratificada, sem implementação (V: fila) | ✅ NFC-e só no Simples V [C3][C5] | ✅ NFC-e via PDV app (I [O12]) V [O2] | ✅ V [G1] | ∅ |
| NFS-e emissão | 🟡 só manual (ver 2.1) | ✅ 1.861 municípios, padrão nacional V [C3][C4] | ✅ "qualquer cidade" V [O2] | ✅ mais de 700 municípios, nacional V [G1], I [G4] | ✅ (GF) V [N1]; mais de 2 mil municípios (escritório) V [N3] |
| XML de compra / DF-e | ✅ `NfeImportService`, preview e conciliação de venda (I por nome); X10b DF-e fechado (V: memória/fila) | ✅ A1 automático I [C9] | ✅ captura e manifestação I [O13] | ✅ manifestação em massa I [G5] | ∅ |
| Pagar/receber, fluxo de caixa | ✅ (ver 2.1) | ✅ V [C2] | ✅ V [O2] | ✅ V [G1] | ✅ V [N1] |
| Conciliação bancária | 🟡 OFX/CNAB (`ReconciliationService.ts`, V por grep); Open Finance só no destino PROPOSTO (I) | ✅ Open Finance com C6/BB/Inter V [C4] | 🟡 OFX; Open Finance "em antecipação" V [O11] | 🟡 OFX / conta própria V [G1] | ✅ Open Finance com mais de 20 bancos V [N5] |
| Boleto / Pix / cobrança | 🟡 Mercado Pago em andamento (F5); Pix de saída bloqueado (F6) (V) | ✅ régua por WhatsApp/SMS V [C10] | ✅ V [O2] | ✅ V [G1] | ✅ V [N2] |
| DRE gerencial / relatórios | ✅ DRE, BP, DFC, comparativo de período, dimensões (painéis, V por nome) | ✅ 53 relatórios V [C7] | ∅ no ERP | ✅ V [G1] | ✅ V [N1] |
| Estoque / PDV | 🟡 estoque ✅; PDV ❌ | ✅ / PDV `+$` V [C2][C5] | ✅ / PDV no Multivarejo V [O1] | ✅ / ✅ V [G1] | ❌ V [N1] |
| CRM / funil | ✅ CRM completo: leads, pipeline, propostas, reuniões, contas (`my-app/pages/crm/*`, V) | ❌ nativo, só integra Kommo/Pipedrive V [C4] | ✅ V [O9] | ∅ nativo V [G1] | ❌ |
| **Partidas dobradas: razão, diário, balancete** | ✅ first-class em Prisma (`PostingService`, `LedgerPanel`, `DailyJournalPanel`, `TrialBalanceTable`, V por nome) | ∅; só sincroniza com o sistema contábil V [C6] | 🟡 só no **OneFlow**, produto à parte I [O6] | ∅ | ∅; exporta para mais de 50 sistemas V [N5] |
| **DRE/BP contábil, encerramento** | ✅ `ExerciseClosingService`, `PeriodService`, BP/DRE (V por nome) | ∅ | 🟡 OneFlow I [O6] | ∅ | ∅ |
| **SPED ECD** | ✅ `SpedGenerationService`; PVA ECD 10.4.1 instalado; **assinatura do H1 aberta** (V: fila P4/H1) | ∅ | 🟡 OneFlow I [O7] | ∅ | ∅ |
| **SPED ECF** | ✅ Presumido (`SpedEcfGenerationService`) + Real (`SpedEcfRealGenerationService`, H1b aberto) + LALUR (V por nome) | ∅ | 🟡 OneFlow: Simples e Presumido; **Real no "roadmap"** V [O5] | ∅ | ∅ |
| EFD ICMS/IPI / Contribuições | 🟡 cálculo PIS/COFINS ✅; arquivo EFD-Contribuições é o nó X8 (abre depois do X7) (V: fila/destino) | ∅ | 🟡 "não gera todos os blocos" V [O4] | 🟡 "arquivo auxiliar" I [G3] | ∅ |
| Apuração (Simples/DAS, Presumido, Real) | 🟡 Simples (`SimplesApuracaoService`, declaração, entradas), PIS/COFINS ✅; IRPJ/CSLL em andamento (X7); DEFIS e caixa planejados (V: fila) | ∅ ("pagamento de impostos" sem detalhe) V [C4] | 🟡 OneFlow V [O5] | 🟡 DAS-MEI e GNRE V [G1] | 🟡 recálculo DAS/DARF, Radar e-CAC (escritório) V [N4] |
| Portal / entrega ao contador | ✅ `AccountingDeliveryService`, `DataExchangeExport`, atribuição de contador; governança do CRC em andamento (GOV-CONTADOR) (V) | ✅ Domínio/SCI/Alterdata, mais de 25 sistemas V [C6] | ✅ layouts diversos V [O3] | ✅ "Espaço Meu Contador" V [G1] | ✅ é o produto (escritório) V [N3] |
| Imobilizado / depreciação | ✅ `FixedAssetService`, `DepreciationService` com telas (V por nome) | ∅ | ∅ | ∅ | ∅ |
| Folha / eSocial | ❌; onda 4 do destino, GATILHO (V) | ∅ | 🟡 OneFlow V [O8] | ❌ V [G1] | ❌ V [N1] |
| App mobile | ❌ (PWA PROPOSTO) | ✅ V [C2] | 🟡 só o app de PDV I [O12] | não verificado | 🟡 app do escritório V [N3] |
| API pública / integrações | ❌ pública; OpenAPI interno; onda 6 GATILHO (V) | ✅ mais de 100 integrações V [C2] | ✅ API aberta e Store V [O2] | ✅ mais de 250 integrações, MCP V [G2] | ✅ Premium V [N1] |
| IA | 🟡 (ver 2.1) | ✅ leitura de documento e WhatsApp gerando lançamento V [C8] | ✅ classificação fiscal V [O10] | ✅ assistente e MCP V [G1] | ✅ categoria e leitura de extrato V [N2] |
| Vertical salão | ✅ preset + kit de setor + binding contábil do salão (V) | ∅ V [C2] | ∅ (tem Clínicas) V | ∅ | ∅ |

### 2.3 Frente 3: "fábrica" de sistemas por setor

| Capacidade | Luminaris | Odoo (+ OCA l10n-brazil) | ERPNext / Frappe | Airtable (Glide) |
|---|---|---|---|---|
| Usuário modela tabela/app em runtime | ✅ DynamicTable (preset + plugin, ADR de fronteira) (V) | ✅ Studio, só no Personalizado V [D1] | ✅ Custom DocType pela tela V [E5] | ✅ é o produto V [R3] |
| Pacote pronto por setor (salão) | ✅ preset `beautySalon` + `aestheticClinic` + kits em `sectorKits/kits` (V); outros 7 setores PROPOSTO (destino §11, V) | ✅ "Hair Salon" e `beauty_parlor` (Enterprise, OEEL-1) V [D4][D5] | ∅ por setor | 🟡 templates (A: não lido) |
| IA gera o sistema a partir de descrição | 🟡 entrevista + seleção de preset/campos (~35%; W1–W7 e I4 abertos) (V: fila) | ∅; agentes executam ações e criam registros, mas não geram modelo de dados V [D8][D7] | 🟡 Frappe Flow (AGPL), monta DocType "em inglês simples", na sua máquina e com a sua chave V [E7] | ✅ Omni cria tabelas, interfaces e automações V [R3] (beta, I) |
| Contabilidade de partidas dobradas | ✅ núcleo Prisma, **não** linha de tabela (ADR-PERSISTENCE-BOUNDARY) (V) | ✅ V [D3] | ✅ V [E6] | ❌ (I: nada nas páginas lidas) |
| Binding setor → lançamento (venda vira partida) | ✅ `accountingBinding` + mappers `Sale*Mapper` + bridges (V por nome) | 🟡 a contabilização automática do PDV/venda existe no genérico (A: não verificado no código); sem binding brasileiro por setor | 🟡 idem (A) | ❌ |
| Localização Brasil: NF-e/NFS-e | 🟡 import ✅; emissão pausada | 🟡 S.A.: via **AvaTax**, crédito por chamada, cancelamento de NFS-e manual V [D2]; OCA: completo só em 16–18; 19.0 sem NF-e, 20.0 vazia V [D9] | ❌ sem Brasil em `regional/` V [E4]; app da comunidade dá 404 (I) | ❌ |
| Localização Brasil: ECD / ECF | ✅ ECD + ECF Presumido + Real + LALUR (sem PVA assinado) | 🟡 S.A.: doc não menciona ECD/ECF V [D2]; OCA: `sped_ecd` só 16.0 Alpha V [D10]; **ECF em nenhuma branch** V [D9] | ❌ | ❌ |
| Reforma (CBS/IBS, CNPJ alfanumérico) | 🟡 CNPJ alfanumérico diferido (M5); IBS/CBS na onda 3, PROPOSTO (V) | ✅ Odoo 20: CBS/IBS, cClassTrib, CNPJ alfanumérico V [D7] | ❌ | ❌ |
| Hospedagem / modelo | VPS, 1 instância por cliente, BYOK (M2 aberto) (V: fila) | Online / Odoo.sh / on-premise V [D1] | Frappe Cloud ou self-host V [E1] | SaaS V [R1] |

## 3. (b) O que o mercado trata como básico e o Luminaris não tem nem planeja (fora da régua)

"Básico" = presente em pelo menos 3 dos 4 concorrentes da frente. "Não planeja" = sem nó em `_INDEX.md`. Quando o
item aparece só no destino como PROPOSTO, sem nó, isso está dito.

| # | Lacuna | Quem tem (fonte) | Situação no Luminaris | Grau |
|---|---|---|---|---|
| B1 | **Agendamento online pelo cliente** (link/site) | Trinks, Avec, Belasis [T1][A1][B1] | Destino §12 "portal do cliente", PROPOSTO, sem nó | V |
| B2 | **Lembrete automático por WhatsApp/SMS** | Trinks, Avec, Belasis (pago à parte) [T1][A1][B1]; régua de cobrança por WhatsApp na Conta Azul [C10] | "WhatsApp" genérico na onda 3, sem nó; "lembrete" sem menção nenhuma | V |
| B3 | **App mobile do profissional** | Trinks, Avec, Belasis [T1][A5][B1] | "Mobile/PWA" no destino §12, PROPOSTO, sem nó | V |
| B4 | **Maquininha / pagamento integrado** | Trinks (Stone), Avec Pay, Belasis Pay [T2][A1][B2] | Só cobrança Mercado Pago (F5, em andamento); maquininha sem nó (o destino cita o tema, I) | V/I |
| B5 | **Clube de assinatura** | Trinks, Avec, Belasis [T1][A2][B1] | Nenhum nó; destino cita recorrência genérica | V/I |
| B6 | **Fidelidade / cashback** | Trinks (fidelidade `+$`), Avec, Belasis (cashback) [T1][A2][B1] | Nenhuma menção no plano nem no destino | V |
| B7 | **Disparo de marketing** (aniversário, retorno) | Trinks, Avec, Belasis [T3][A2][B1] | `campaigns` só registra campanha, não envia | V |
| B8 | Anamnese / ficha técnica | Trinks, Belasis [T2][B1] | Adiada como lacuna de spec do P2 clínica; destino só para consultório (PROPOSTO) | V |
| B9 | API pública / integrações | Conta Azul, Omie, Bling, Nibo [C2][O2][G2][N1] | Onda 6, GATILHO | V |
| B10 | App mobile do dono/empresário | Conta Azul [C2] (só 1 de 4 confirmado) | PWA PROPOSTO | V (abaixo do limiar de "básico") |

**Básico do mercado que está na régua, mas parado:** a **emissão de NFS-e e NF-e**. Os 4 salões têm (como adicional)
e os 4 ERPs têm (Nibo só NFS-e). No Luminaris está bloqueada (X10a/X10i, D5 com ADN pausado e pesquisa de PSC) e
existe só em modo manual. Não é lacuna de plano, é lacuna de entrega. Pesa mais que B1–B10 para o ERP e tanto quanto
eles para o salão. (V)

## 4. (c) Onde o Luminaris está à frente

| # | Vantagem | Contra quem | Evidência Luminaris | Ressalva | Grau |
|---|---|---|---|---|---|
| F1 | **Razão de partidas dobradas first-class no produto do empresário** (diário, razão, balancete, BP/DRE contábil, encerramento, imobilizado) | Os 4 salões e Conta Azul/Bling/Nibo: ∅. Omie: só no OneFlow, à parte. Odoo/ERPNext têm, mas sem Brasil completo | `PostingService`, `ExerciseClosingService`, `FixedAssetService` e painéis correspondentes | Ausência nos concorrentes = "não encontrado". Odoo e ERPNext **têm** partidas dobradas: a vantagem ali é a localização, não o razão | V (Luminaris por nome) / I (ausência) |
| F2 | **ECD + ECF Presumido + ECF Real + LALUR** | Nenhum dos 8 do Brasil no produto do empresário. OneFlow sem Real [O5]. OCA: ECD Alpha só na 16.0, ECF em nenhuma branch [D9][D10]. Odoo S.A.: doc sem ECD/ECF [D2] | `SpedGenerationService`, `SpedEcf*GenerationService`, `LalurService` | **Sem PVA assinado (H1 e H1b abertos).** Até lá, "gera ECD/ECF" é afirmação do código, não do validador da RFB | V (código) / **não provado em PVA** |
| F3 | **Venda do salão vira lançamento contábil sozinha** (binding por setor: venda, recebimento, pacote, estorno, CMV) | Trinks só **exporta** lançamento financeiro para Conta Azul/Nibo/F360 [T5]; Avec exporta XML/PDF [A3] | `accountingBinding/*`, `sync/mappers/Sale*Mapper.ts`, `sync/bridges/*`; pendência NO_MAPPER_FOR_UNIT (#684) | H2 (teste no navegador da venda conferida no razão) aberto | V (por nome) / I (concorrentes) |
| F4 | **Pacote pré-pago com receita diferida e baixa por não uso** | Os salões vendem pacote [T1][A1][B1], mas nada indica tratamento contábil | `SalePackageSoldMapper`, nó PACOTE-VALIDADE em andamento | Em andamento; tratamento dos concorrentes não pesquisado a fundo | I |
| F5 | **Salão-parceiro na apuração** (cota-parte fora da base de PIS/COFINS e Simples) | Trinks e Avec tratam **na nota** [T4][A3]; na apuração, ∅ | `pisCofinsCalc.ts:150-158` | Inverso também vale: o Luminaris **não** emite a nota segregada, coisa que eles fazem | V |
| F6 | **Fábrica com núcleo contábil brasileiro fixo** (o usuário desenha o operacional, a lei desenha o razão) | Airtable/Glide: sem fiscal. Odoo: setor pronto, mas Brasil via Avalara e sem ECD/ECF. ERPNext: sem Brasil | ADR-PERSISTENCE-BOUNDARY, `sectorKits`, presets | A fábrica está em ~35%. Airtable Omni **já gera** app por descrição [R3], e o Luminaris ainda não chega ao `/dashboard/create` (W1) | V / I |
| F7 | CRM nativo dentro do ERP de salão | Conta Azul sem CRM nativo [C4]; salões sem funil de vendas B2B (∅) | `my-app/pages/crm/*` | Para o salão, CRM de oportunidade importa pouco (A) | V |

**Leitura franca:** F1–F3 são profundidade de backoffice que **o dono de salão não compra diretamente**. Ele hoje
paga o escritório contábil por isso (A). A vantagem vira valor só se for vendida como "o contador recebe tudo pronto"
ou "menos trabalho no fechamento", e "contador incluso" segue vetado até a resposta do CRC-SP.

## 5. (d) Implicações

### 5.1 Para o texto da lista de espera de salões

1. **Não chamar de "sistema de gestão de salão" sem qualificador.** Quem tem salão vai comparar com Trinks/Avec/Belasis
   e procurar agendamento online, lembrete por WhatsApp e app (B1–B3), que o Luminaris não tem. Prometer isso por
   implicação esbarra na mesma regra de oferta já levantada no dossiê `pesquisas-legais/waitlist-lgpd-cdc` (CDC art. 30,
   a oferta vincula; art. 37, publicidade enganosa por omissão). *Aplicação minha da conclusão do dossiê, não nova
   pesquisa legal (I).*
2. **Posicionar no que só o Luminaris faz:** "os números do salão e a contabilidade no mesmo lugar: cada venda, pacote
   e recebimento já vira lançamento". Isso é F1/F3, verificável no código. Continua sem: "contador incluso", emissão de
   nota, preço e data (restrições já decididas na sessão anterior).
3. **Uma pergunta no formulário vale mais que um parágrafo de texto:** "Que sistema você usa hoje? (Trinks, Avec,
   Belasis, outro, planilha, nenhum)" e "Usaria junto com ele?". A resposta separa dois públicos: quem **trocaria**
   (precisa de B1–B3) e quem usaria o Luminaris **ao lado** do sistema atual, como camada de contabilidade (precisa de
   importação do que a Trinks já exporta [T5]). A coleta segue o que o dossiê LGPD diz sobre finalidade e minimização (I).
4. Se houver comparação explícita com concorrente no texto, ela precisa citar fonte e data (preço "sob consulta" na
   Trinks [T1]; Avec R$ 88,90–99,90 só para 1–2 profissionais [A1]). Recomendo **não comparar** na lista de espera (A).

### 5.2 Para a ordem do plano (recomendação; não altera nada, a decisão é do dono)

1. **H1 → H2 → M2 continua primeiro.** É o que transforma F2/F3 de afirmação do código em fato. Sem PVA assinado, a
   única vantagem exclusiva frente aos 11 concorrentes fica sem prova. (I)
2. **A régua 54/63 mede a frente onde o Luminaris já lidera** (contábil/financeiro/fiscal). Fechá-la não diminui a
   distância para os salões, que está toda fora dela (B1–B8). Recomendo que o dono decida, antes de abrir a lista de
   espera ou logo depois de ler as respostas da pergunta 5.1.3, **entre dois caminhos**:
   - **(a) Camada contábil ao lado do sistema de salão.** Nó de importação dos lançamentos/vendas exportados pela
     Trinks (e similares) para o binding. Pequeno, aproveita F1–F3 e não briga com quem já tem 44 mil negócios (número
     que a Trinks anuncia [T2]). *Recomendado como primeiro teste*, porque depende só de dado que o concorrente já
     exporta (I; o formato do arquivo da Trinks não foi lido).
   - **(b) Recepção própria.** Nós para B1 (agendamento público), B2 (lembrete WhatsApp) e B3 (PWA do profissional).
     Necessários para disputar a troca, mas cada um é produto inteiro, e B2 traz custo por mensagem e um provedor novo
     (A).
3. **A emissão (X10i) é o maior "básico" parado.** Está na régua e bloqueada por gate externo (PSC/ADN). Ela continua
   sendo a frente que mais pesa contra os ERPs da frente 2. Hoje a resposta é o modo manual, que existe e deve ser
   apresentado como "nota pelo portal da prefeitura, com o XML de volta no sistema", nunca como "emite nota". (V)
4. **Fábrica (frente 3):** o diferencial real frente ao Airtable Omni é o núcleo fiscal, não a geração por IA, que o
   Airtable já entrega. Isso sustenta a ordem atual (contábil antes do wizard W1–W7) e desaconselha vender "IA que monta
   seu sistema" antes do I4/W1 fecharem. (I)

## 6. O que não foi verificado

- Preço da Trinks (todas as faixas), da Avec acima de 2 profissionais, dos adicionais de WhatsApp, nota e IA nos 3
  salões, do OneFlow por item, do PDV da Conta Azul e do portfólio do Nibo para escritório.
- Central de ajuda da Avec e da Belasis sem varredura dedicada por "contabilidade/SPED". O `*` da tabela da Belasis
  não tem legenda.
- Se o OneFlow pertence de fato à Omie (inferido pela ajuda em `ajuda.omie.com.br`).
- Grade Community × Enterprise do Odoo: inferida por 404 no repositório aberto e pela licença OEEL-1.
- Formato do arquivo de exportação da Trinks (pré-requisito do caminho 5.2.2-a).
- Notion e Bubble não pesquisados.
- No lado Luminaris, várias células se apoiam no **nome do arquivo** (grau I). Lidos por inteiro só os trechos citados
  com linha.
- Os dois agentes que usaram o navegador embutido viram a aba compartilhada mudar de site sem ação própria. Ambos
  pararam de usar a aba e não aproveitaram nada dela.

## 7. Fontes (todas acessadas em 15/10/2026)

**Trinks:** [T1] https://negocios.trinks.com/planos/ · [T2] https://negocios.trinks.com/ ·
[T3] https://negocios.trinks.com/solucoes/comunicacao-para-ir-alem/ · [T4] https://ajuda.trinks.com/profissional-parceiro-e-nfs-e ·
[T5] https://ajuda.trinks.com/exportacao-lancamentos-financeiros · [T6] https://ajuda.trinks.com/demonstrativo-de-resultado (I) ·
[T7] https://www.trinks.com/

**Avec:** [A1] https://negocios.avec.app/avec-planos · [A2] https://negocios.avec.app/ ·
[A3] https://negocios.avec.app/emissao-de-notas-fiscais-avec · [A4] https://negocios.avec.app/controle-financeiro-para-salao-de-beleza-avec ·
[A5] https://negocios.avec.app/avec-pro · [A6] https://www.avec.app/ ·
[A7] redirecionamentos https://www.salaovip.com.br/ → avec.beauty e https://admin.salaovip.com.br/ → www.avec.app

**Belasis:** [B1] https://www.belasis.com.br/precos · [B2] https://www.belasis.com.br/ · [B3] https://www.belasis.com.br/recursos

**Conta Azul:** [C1] https://contaazul.com/planos/ · [C2] https://contaazul.com/ ·
[C3] https://contaazul.com/funcionalidades/emissao-de-nota-fiscal/ ·
[C4] https://ajuda.contaazul.com/hc/pt-br/articles/12190214337933-Novidades-da-Conta-Azul-Pro-em-2026 ·
[C5] https://ajuda.contaazul.com/hc/pt-br/articles/20991568257165-Perguntas-frequentes-Frente-de-caixa-PDV ·
[C6] https://contaazul.com/contadores/ · [C7] https://contaazul.com/funcionalidades/relatorios/ ·
[C8] https://contaazul.com/funcionalidades/conta-azul-ia/ · [C9] https://ajuda.contaazul.com/hc/pt-br/articles/7767683926413 (I) ·
[C10] https://contaazul.com/funcionalidades/cobranca-automatica/

**Omie:** [O1] https://www.omie.com.br/precos/ (HTML, campo `pricesByRevenue`) · [O2] https://www.omie.com.br/funcionalidades/nota-fiscal/ ·
[O3] https://www.omie.com.br/funcionalidades/painel-do-contador/ · [O4] https://ajuda.omie.com.br/pt-BR/articles/6656207 ·
[O5] https://ajuda.omie.com.br/pt-BR/articles/9361273 · [O6] https://ajuda.omie.com.br/pt-BR/articles/6142046 (I) ·
[O7] https://ajuda.omie.com.br/pt-BR/articles/6377195 (I) · [O8] https://oneflow.com.br/ ·
[O9] https://www.omie.com.br/funcionalidades/crm/ · [O10] https://www.omie.com.br/inteligencia-artificial/ ·
[O11] https://ajuda.omie.com.br/pt-BR/articles/14347840 · [O12] https://ajuda.omie.com.br/pt-BR/articles/6980426-omie-pdv-mobile-varejo (I) ·
[O13] https://ajuda.omie.com.br/pt-BR/articles/1413816 (I)

**Bling:** [G1] https://www.bling.com.br/planos-e-precos · [G2] https://www.bling.com.br/ ·
[G3] https://ajuda.bling.com.br/hc/pt-br/articles/360036583373 (I) · [G4] https://ajuda.bling.com.br/hc/pt-br/articles/16774960762135 (I) ·
[G5] https://ajuda.bling.com.br/hc/pt-br/articles/360057118174 (I)

**Nibo:** [N1] https://www.nibo.com.br/empresa/planos-e-precos · [N2] https://www.nibo.com.br/empresa ·
[N3] https://www.nibo.com.br/contador · [N4] https://www.nibo.com.br/contador/obrigacoes/ ·
[N5] https://www.nibo.com.br/conciliador-open-finance

**Odoo / OCA:** [D1] https://www.odoo.com/pt_BR/pricing ·
[D2] https://www.odoo.com/documentation/19.0/applications/finance/fiscal_localizations/brazil.html ·
[D3] https://www.odoo.com/documentation/19.0/applications/finance/accounting.html ·
[D4] https://www.odoo.com/pt_BR/industries/hair-salon · [D5] https://raw.githubusercontent.com/odoo/industry/19.0/beauty_parlor/__manifest__.py ·
[D6] https://raw.githubusercontent.com/odoo/odoo/19.0/addons/l10n_br/__manifest__.py · [D7] https://www.odoo.com/odoo-20-release-notes ·
[D8] https://www.odoo.com/documentation/19.0/applications/productivity/ai/agents.html ·
[D9] https://api.github.com/repos/OCA/l10n-brazil/branches e `.../contents?ref={16.0..20.0}` ·
[D10] https://raw.githubusercontent.com/OCA/l10n-brazil/16.0/l10n_br_sped_ecd/__manifest__.py ·
[D11] https://raw.githubusercontent.com/OCA/l10n-brazil/18.0/l10n_br_nfse_nacional/__manifest__.py

**ERPNext / Frappe:** [E1] https://frappe.io/cloud/pricing · [E2] https://frappe.io/erpnext/pricing ·
[E3] https://api.github.com/repos/frappe/erpnext/contents/erpnext?ref=develop ·
[E4] https://api.github.com/repos/frappe/erpnext/contents/erpnext/regional?ref=develop ·
[E5] https://docs.frappe.io/erpnext/user/manual/en/custom-doctype · [E6] https://docs.frappe.io/erpnext/user/manual/en/general-ledger ·
[E7] https://github.com/frappe/flow_client

**Airtable / Glide:** [R1] https://www.airtable.com/pricing · [R2] https://support.airtable.com/docs/airtable-plans ·
[R3] https://www.airtable.com/platform/app-building · [R4] https://www.glideapps.com/pricing
