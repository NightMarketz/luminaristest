---
id: "EFICIENCIA-FISCAL"
tipo: "regua-f"
dominio: "fiscal"
titulo: "Eficiência fiscal lícita como sugestão e guarda: combo itemizado com desconto incondicional rateado e piso por item, segregação por NCM, simuladores (fator r, regime, remuneração do sócio), alertas (sublimite, salão-parceiro, interdependência), guarda anti-simulação no documento fiscal e relatório de economia"
estado: "inflight"
estado_detalhe: "27/10 (execução): **PR-2 executado (#930, empilhado no #913, não mergear sem OK)** — itens 11–14 do BRIEF sob o 'Executa' do dono (chat, 27/10), [[D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO]]: tabela ICMS_ST_NCM_UF (só SP, DRAFT até 31/03/2026 — Portaria SRE 94/2025 tirou cosméticos da ST em SP), segregacaoPorNcm pura (monofásico até 2026-12-31 na função, LC 214 art. 542 XI), excluir gravado na subrazão pela NCM do ProductFiscalProfile, manual prevalece com SEGREGACAO_DIVERGE, alertas SEGREGACAO_INDEVIDA/SEM_NCM/ICMS_ST_NAO_CONFERIDA. Três lacunas decididas pelo dono no AskUserQuestion. Abertas: publicar as linhas SP (ler Anexo XI da Portaria CAT 68/2019), fechar vigência do monofásico (IBS-CBS-2027), outras UFs. Faltam PR-3..5 (sem 'executa') · 26/10 (execução): **PR-1 executado (#913, não mergear sem OK)** — itens 1–10 do BRIEF sob o 'faz' do dono (chat, 26/10), [[D-2026-10-26-EFICIENCIA-FISCAL-PR1-EXECUCAO]]: presets do combo itemizado, guarda do finalize, alocação/piso puros, TaxOptimizationPolicy/ServiceCostEvidence/TaxOptimizationSuggestion, fiscal-check + guarda na NFS-e, peso líquido (F-EF-15 a) e vDescIncond (F-EF-16 a). Dono no AskUserQuestion: discountKind obrigatório só com desconto por item. Lacunas abertas: fonte da carga por item (CARGA cai no proporcional), CONDITIONAL bruto × tie-out. PR-2 segue bloqueado pelo X10a · 22/10 (ratificação): forks F-EF-14..17 RATIFICADOS pelo dono, todos (a) ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]); F-EF-16 reabre o F-DFE-15 (a). PR-1 sem fork pendente, espera o 'executa'; PR-2 segue bloqueado pelo X10a · 20/10: PRE-ADR **Proposed** (ADR-INCR-EFICIENCIA-FISCAL) pela sessao-planejamento sob a cédula D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR — forks F-EF-1..13 PENDENTES, P-EF-1..10 ao contador (A1–A3 do dossiê de produto e S1–S4 do de serviços como perguntas exatas); PR-5 de serviços (S-1..S-6) incluído por pedido do dono de 20/10. **Não roteia até a ratificação.** Sem BRIEF, sem 'executa'. Regra do item 1 fixada pelo dono no mesmo dia (\"colocar preco de custo em produtos com muito imposto, nao precisa ser um preco fora da realidade\"): desconto do combo alocado primeiro aos itens de maior carga até o piso = custo (nunca abaixo), teto = catálogo (nunca acima), tudo destacado na nota, proporcional como alternativa configurável — D5/D6 do ADR; **preço fictício (abaixo do custo ou acima do catálogo) continua fora, invariante I-1** — CTN 148/149 VII, Lei 8.137 art. 1º II/IV, LC 214 art. 7º § 3º + 13 I b; LC 87 art. 13 I / 15 funda o preço de custo como base. Hoje: desconto por venda sem rateio por item (SalesModule.discountAmount); PackageCatalogModule não é combo itemizado; sem custo de serviço (F-EF-1 é o fork que mais importa); segregação do Simples manual por parcela; fator r sem simulação; `grep simula` em server/src = só testes. Posição oficial sobre alocação de desconto em kit: não encontrada — PR-1 só recebe 'executa' depois do P-EF-1 · 21/10: forks RATIFICADOS por questionário ([[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]]). Próximo: BRIEF por pedido próprio · 22/10: BRIEF escrito (BE-INCR-EFICIENCIA-FISCAL-brief.md, 33 itens em 5 PRs) pela sessao-planejamento sob o pedido do dono de 22/10 (\"Precisamos agora de sessões para a falta de brief\" — só BRIEF, sem 'executa'); padrão do combo = PROPORCIONAL_CATALOGO pela triagem [[D-2026-10-21-TRIAGEM-CONTADOR-F1]] (CARGA só com aceite do contador); forks novos F-EF-14..17 PENDENTES (piso sob proporcional, razão/DPS pelo desconto por item, destaque vDescIncond reabre F-DFE-15, padrão do pacote sobre pacoteFatoGerador); PR-2 bloqueado por X10a (ProductFiscalProfile fora de main). Próximo: ratificar F-EF-14..17, depois 'executa' do PR-1"
depende_de: ["[[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]]", "[[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]]", "[[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]", "[[X14]]", "[[X7]]", "[[X13]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]?", "[[RETENCOES-FONTE]]?", "[[IBS-CBS-2027]]?", "[[X10a]]?", "[[GOV-CONTADOR]]?", "[[D1]]?"]
autorizacao: "dono, chat, 2026-10-20: \"Commita a pesquisa e a linha F1.5 no PR #776. Autorizo planejar o PRE-ADR do EFICIENCIA-FISCAL — sessao-planejamento, sem 'executa'.\" — só o PRE-ADR e esta nota (cédula [[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]]). Pedido de origem no mesmo dia: \"precisamos ter uma sessão de instalar práticas de eficiência fiscal, pesquise aqui algumas… para deixarmos automática no sistema\" — a cédula fixou que o exemplo do combo (preço fictício) não entra; esclarecimento do dono no mesmo dia (pesquisa §0, commit 7f2a7609 do #776): \"A ideia era colocar preco de custo em produtos com muito imposto, nao precisa ser um preco fora da realidade\" — regra do item 1 (D5/D6), não é fork. BRIEF e código exigem pedido próprio"
ancora_sdd: "—"
atualizado: "2026-10-27"
prs: ["#859", "#913", "#930"]
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: 13 forks pendentes (piso do serviço, critério de alocação, aprovador, kit sem NCM, fonte da NCM/ST, fatiamento, Lucro Real no simulador, estética × Anexo III, desconto condicional; serviços: elegibilidade hospitalar, procedimento estético, ISS fixo SUP, NFS-e do pacote) e uma ambiguidade sem fonte oficial (A1) ao contador; depois deles: opus-medio (2 models novos, campos novos em 2 presets + guarda no SalesPlugin, serviço Prisma-side no molde do RegisterPaymentService, 3 simuladores puros sobre simplesCalc/X7, relatório)"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/features/dynamicTables/presets/modules/finance/SalesModule.ts", "server/src/features/dynamicTables/presets/modules/finance/SalesItemsMixed.ts", "server/src/features/dynamicTables/presets/modules/finance/SalesItemsProductsOnly.ts", "server/src/features/dynamicTables/presets/modules/finance/SalesItemsServicesOnly.ts", "server/src/features/dynamicTables/presets/fields/number/NumberPresets.ts", "server/src/features/dynamicTables/rules/plugins/SalesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/sales/**", "server/src/features/sales/models/**", "server/src/features/sales/dtos/FiscalCheckDto.ts", "server/src/features/sales/services/SaleFiscalGuardService.ts", "server/src/features/accounting/models/segregacaoNcm.ts", "server/src/features/accounting/models/taxOptimization*", "server/src/features/accounting/dtos/TaxOptimizationDto.ts", "server/src/features/accounting/dtos/SimplesDto.ts", "server/src/features/accounting/services/TaxOptimizationService.ts", "server/src/features/accounting/services/TaxSimulationService.ts", "server/src/features/accounting/services/ReceitaFiscalService.ts", "server/src/features/accounting/services/SimplesApuracaoService.ts", "server/src/features/accounting/services/DataExchangeExportService.ts", "server/src/features/accounting/models/taxAssessmentCalc.ts", "server/src/features/accounting/models/taxAssessmentParams.ts", "server/src/features/accounting/models/issCompetencia.ts", "server/src/features/accounting/models/issFixoSup.ts", "server/src/features/accounting/services/TaxAssessmentService.ts", "server/src/features/accounting/services/ServiceFiscalProfileService.ts", "server/src/features/accounting/services/CompanyFiscalProfileService.ts", "server/src/features/accounting/services/FiscalDocumentEmissionService.ts", "server/src/features/accounting/dtos/ServiceFiscalProfileDto.ts", "server/src/features/accounting/dtos/CompanyFiscalProfileDto.ts", "server/src/features/accounting/repositories/*TaxOptimization*", "server/src/features/accounting/policies/**", "server/src/features/accounting/sync/mappers/*Sale*", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/controllers/salesController.ts", "server/src/controllers/*TaxOptimization*", "server/src/controllers/*TaxSimulation*", "server/src/features/**/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/sales.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.tax-optimization.paths.ts", "server/src/routes/docs/sales.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/src/features/dynamicTables/presets/systems/*.ts", "server/test/helpers/db.ts"]
---
# EFICIENCIA-FISCAL — Eficiência fiscal lícita: sugestão + guarda (combo itemizado, segregação por NCM, simuladores, alertas, relatório)

**Estado:** `inflight` — 27/10 (execução): **PR-2 executado (#930, empilhado no #913, não mergear sem OK)** — itens 11–14 do BRIEF sob o 'Executa' do dono (chat, 27/10), [[D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO]]: tabela ICMS_ST_NCM_UF (só SP, DRAFT até 31/03/2026 — Portaria SRE 94/2025 tirou cosméticos da ST em SP), segregacaoPorNcm pura (monofásico até 2026-12-31 na função, LC 214 art. 542 XI), excluir gravado na subrazão pela NCM do ProductFiscalProfile, manual prevalece com SEGREGACAO_DIVERGE, alertas SEGREGACAO_INDEVIDA/SEM_NCM/ICMS_ST_NAO_CONFERIDA. Três lacunas decididas pelo dono no AskUserQuestion. Abertas: publicar as linhas SP (ler Anexo XI da Portaria CAT 68/2019), fechar vigência do monofásico (IBS-CBS-2027), outras UFs. Faltam PR-3..5 (sem 'executa') · 26/10 (execução): **PR-1 executado (#913, não mergear sem OK)** — itens 1–10 do BRIEF sob o 'faz' do dono (chat, 26/10), [[D-2026-10-26-EFICIENCIA-FISCAL-PR1-EXECUCAO]]: presets do combo itemizado, guarda do finalize, alocação/piso puros, TaxOptimizationPolicy/ServiceCostEvidence/TaxOptimizationSuggestion, fiscal-check + guarda na NFS-e, peso líquido (F-EF-15 a) e vDescIncond (F-EF-16 a). Dono no AskUserQuestion: discountKind obrigatório só com desconto por item. Lacunas abertas: fonte da carga por item (CARGA cai no proporcional), CONDITIONAL bruto × tie-out. PR-2 segue bloqueado pelo X10a · 22/10 (ratificação): forks F-EF-14..17 RATIFICADOS pelo dono, todos (a) ([[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]]); F-EF-16 reabre o F-DFE-15 (a). PR-1 sem fork pendente, espera o 'executa'; PR-2 segue bloqueado pelo X10a · 20/10: PRE-ADR **Proposed** (ADR-INCR-EFICIENCIA-FISCAL) pela sessao-planejamento sob a cédula D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR — forks F-EF-1..13 PENDENTES, P-EF-1..10 ao contador (A1–A3 do dossiê de produto e S1–S4 do de serviços como perguntas exatas); PR-5 de serviços (S-1..S-6) incluído por pedido do dono de 20/10. **Não roteia até a ratificação.** Sem BRIEF, sem 'executa'. Regra do item 1 fixada pelo dono no mesmo dia ("colocar preco de custo em produtos com muito imposto, nao precisa ser um preco fora da realidade"): desconto do combo alocado primeiro aos itens de maior carga até o piso = custo (nunca abaixo), teto = catálogo (nunca acima), tudo destacado na nota, proporcional como alternativa configurável — D5/D6 do ADR; **preço fictício (abaixo do custo ou acima do catálogo) continua fora, invariante I-1** — CTN 148/149 VII, Lei 8.137 art. 1º II/IV, LC 214 art. 7º § 3º + 13 I b; LC 87 art. 13 I / 15 funda o preço de custo como base. Hoje: desconto por venda sem rateio por item (SalesModule.discountAmount); PackageCatalogModule não é combo itemizado; sem custo de serviço (F-EF-1 é o fork que mais importa); segregação do Simples manual por parcela; fator r sem simulação; `grep simula` em server/src = só testes. Posição oficial sobre alocação de desconto em kit: não encontrada — PR-1 só recebe 'executa' depois do P-EF-1 · 21/10: forks RATIFICADOS por questionário ([[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]]). Próximo: BRIEF por pedido próprio · 22/10: BRIEF escrito (BE-INCR-EFICIENCIA-FISCAL-brief.md, 33 itens em 5 PRs) pela sessao-planejamento sob o pedido do dono de 22/10 ("Precisamos agora de sessões para a falta de brief" — só BRIEF, sem 'executa'); padrão do combo = PROPORCIONAL_CATALOGO pela triagem [[D-2026-10-21-TRIAGEM-CONTADOR-F1]] (CARGA só com aceite do contador); forks novos F-EF-14..17 PENDENTES (piso sob proporcional, razão/DPS pelo desconto por item, destaque vDescIncond reabre F-DFE-15, padrão do pacote sobre pacoteFatoGerador); PR-2 bloqueado por X10a (ProductFiscalProfile fora de main). Próximo: ratificar F-EF-14..17, depois 'executa' do PR-1  
**Autorização:** dono, chat, 2026-10-20: "Commita a pesquisa e a linha F1.5 no PR #776. Autorizo planejar o PRE-ADR do EFICIENCIA-FISCAL — sessao-planejamento, sem 'executa'." — só o PRE-ADR e esta nota ([[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]]); esclarecimento do dono no mesmo dia: "A ideia era colocar preco de custo em produtos com muito imposto, nao precisa ser um preco fora da realidade" (regra do item 1); serviços, mesmo dia: "Inclua as propostas S-1..S-6 de serviços no PRE-ADR do EFICIENCIA-FISCAL como comportamentos e forks pendentes."  
**Depende de:** [[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]] (cédula), [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] (régua F, posição F1.5), [[X14]] (`simplesCalc.apurar`/`fatorR`, `ReceitaFiscalLinha.excluir`, `SalaoParceriaContrato`), [[X7]] (`TaxAssessment`, `entradaInformada`, presunção do Presumido para o simulador), [[X13]] (`CompanyFiscalProfile.regime` por ano), [[LEGAL-PARAMS]] (`PIS_COFINS_MONOFASICO_NCM` com vigência; nova `ICMS_ST_NCM_UF`); pontilhadas: [[IRRF-DISTRIBUICAO]] (sócios + cálculo de dividendos/JCP para o simulador de remuneração e o alerta de interdependência), [[RETENCOES-FONTE]] (linha "retenções sofridas" do relatório — só consome), [[IBS-CBS-2027]] (tabela 2027 do simulador de regime; crédito não tomado), [[X10a]] (`ProductFiscalProfile.ncm` — F-EF-5; pré-condição de emissão onde a guarda bloqueia), [[GOV-CONTADOR]] (aprovador = contador responsável ACTIVE — F-EF-3), [[D1]] (item 1b — P-EF-1..10)  
**Desbloqueia:** `FE-INCR-EFICIENCIA-FISCAL` (tela de sugestões, simuladores e relatório — nó posterior, sem nota); linha "economia" do pacote do contador (C6b)  
**Âncora no SDD consolidado:** —  
**Régua:** seção **F1.5** da régua F (cédula de 20/10) — depois de F1, antes de F2; não entra na régua de 63

## Escopo (D1–D10 do ADR)

- **Sugere e guarda; não decide (D1).** Cada prática = cálculo puro com artigo citado + `TaxOptimizationSuggestion`
  (PROPOSED → ACCEPTED/REJECTED, por quem, base legal, economia estimada, `parametrosSha256`) + guarda no documento
  fiscal (bloqueio 400/409 nomeado ou alerta no molde do X14).
- **A fronteira do lícito é invariante, não configuração (D2, I-1..I-7):** preço de item = catálogo (ou desconto
  destacado por item), item ≥ piso, desconto só se consta do documento, condicional nunca abate a receita bruta,
  folha simulada ≠ folha real, kit explodido em itens.
- **Onde a venda valida sem tocar `DynamicTableService` (D4):** dado novo só de preset (`saleItems.catalogUnitPrice`,
  `discountCents`; `SalesModule.discountKind`) com guarda aritmética no `SalesPlugin`; piso, rateio e invariantes num
  `SaleFiscalGuardService` Prisma-side (`features/sales`, molde `RegisterPaymentService`) chamado em
  `POST /sales/:id/fiscal-check` e como pré-condição da montagem do `FiscalDocument` (onde Lei 8.137 e LC 214 art. 7º
  mordem). O mapper pós-commit grava `ReceitaFiscalLinha.receitaCents` líquido do desconto incondicional rateado.
- **Alocação fiscal do desconto (D5, regra do dono):** `desconto = Σ catálogo − preço do combo`, alocado em ordem
  decrescente de carga tributária (`cargaBp` por item, da tabela vigente: anexo/segregação no Simples, CST/NCM, IBS/CBS
  2027), cada item até o piso = custo, resto ao seguinte; nenhum item acima do catálogo; proporcional como alternativa
  configurável (`TaxOptimizationPolicy.criterioAlocacao`). **Piso (D6):** produto = custo médio do estoque na data
  (snapshot no item); serviço = F-EF-1; desconto > Σ (catálogo − custo) ⇒ bloqueio `COMBO_ABAIXO_DO_CUSTO`.
- **Segregação por NCM é derivação (D7):** `ReceitaFiscalLinha.excluir` a partir de `ProductFiscalProfile.ncm` ×
  `PIS_COFINS_MONOFASICO_NCM` (vigente até 31/12/2026 — Lei 10.147 revogada pela LC 214 art. 542 XI) + `ICMS_ST_NCM_UF`
  (DRAFT); `SimplesSegregacaoManual` prevalece com aviso.
- **Simuladores puros com `parametrosSha256` (D8):** fator r (folha-alvo), regime (Simples × Presumido × Real; 2027),
  remuneração do sócio (pró-labore × dividendos × JCP) — gravam sugestão, nunca apuração.
- **Serviços (D11, PR-5, S-1..S-6):** presunção por serviço no Presumido com equiparação hospitalar 8 %/12 %
  (`ServiceFiscalProfile.finalidade` + `elegivelHospitalar`, checklist da empresa com alvará); simulador e modo de apuração
  do ISS fixo de sociedade uniprofissional (vedado no Simples); alertas de enquadramento (16 % com profissão
  regulamentada, médico com serviço estético, locação de imóvel próprio, cessão de mão de obra médica); NFS-e do pacote
  por sessão consumida; NBS da saúde para o 60 % de 2027 com estética na alíquota cheia; alertas de parceria completos.
- **Relatório de economia (D9):** só sugestões ACCEPTED, com artigo, no pacote do contador.
- **Fora (D10):** retenções (RETENCOES-FONTE), crédito/split IBS-CBS, Tema 69 (emenda do X8), cálculo de dividendos/JCP,
  `ProductFiscalProfile` em si, emissão, FE.

## Gatilho

- Pedido do dono de 20/10 (pesquisa §0): "instalar práticas de eficiência fiscal… para deixarmos automática no sistema".
- Verificação legal de 20/10: o exemplo do combo é preço inexato no documento fiscal (CTN 148/149 VII; Lei 8.137 art.
  1º II/IV; LC 214 art. 7º § 3º e 13 I "b") — a cédula fixou "bloqueia"; as 11 automações lícitas da pesquisa §5 são o nó.
- Lacuna medida em 20/10 (pesquisa §4): desconto por venda sem rateio 🟡; combo itemizado ⬜; piso ⬜; simulação de
  regime/anexo ⬜; pró-labore ⬜.
- Data legal: **01/01/2027** — LC 214 art. 7º exige valor por item quando os tratamentos diferem; Lei 10.147 (monofásico)
  revogada; saúde 60 % só Anexo III (estética não consta).

## Docs

- [`BE-INCR-EFICIENCIA-FISCAL-brief.md`](../../accounting/BE-INCR-EFICIENCIA-FISCAL-brief.md) — **BRIEF (22/10)**:
  33 itens em 5 PRs contra o código de `main` `65e1dd6b`; padrão proporcional (triagem 21/10); forks novos F-EF-14..17
  PENDENTES (§5); P-EF residuais (§6); dossiê [`brief-eficiencia-fiscal/relatorio.md`](../../../pesquisas-legais/brief-eficiencia-fiscal/relatorio.md)
- [`ADR-INCR-EFICIENCIA-FISCAL.md`](../../adr/ADR-INCR-EFICIENCIA-FISCAL.md) — **PRE-ADR Proposed (20/10)**: fronteira
  do lícito com artigo + link do acervo por guarda (§3, L1–L26), D1–D11, esqueleto de 33 comportamentos em 5 PRs (PR-5 = serviços)
  cobrindo as 11 práticas (§6), contratos (`TaxOptimizationPolicy`, `TaxOptimizationSuggestion`, `FiscalCheckResponse`,
  `alocarDescontoFiscal`, `cargaTributariaDoItem`, `verificarItens`, simulação de fator r), forks F-EF-1..13 PENDENTES (§8), P-EF-1..10 (§9),
  Odoo/ERPNext lidos em §11.1, invariantes I-1..19 (§13)
- [`PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md`](../../accounting/PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md) — práticas
  classificadas (lícita/cinzenta/ilícita), o que o sistema já faz (§4), as 11 automações (§5); §0/§2 com o
  esclarecimento do dono (combo a preço de custo = lícito com guardas; A1 reescrita; LC 87 art. 13 I / 15 [D31])
- [`relatorio.md`](../../../pesquisas-legais/eficiencia-fiscal-praticas/relatorio.md) — dossiê legal de 20/10 (30
  fontes; ambiguidades A1–A3; lacunas)
- [`PESQUISA-EFICIENCIA-FISCAL-SERVICOS-2026-10-20.md`](../../accounting/PESQUISA-EFICIENCIA-FISCAL-SERVICOS-2026-10-20.md)
  — pedido do dono de 20/10 ("pesquise… em serviços tbm"): equiparação hospitalar 8 %/12 % (IN 2.343/2026), fator r em
  saúde, ISS fixo de sociedade uniprofissional só fora do Simples, salão-parceiro, pré-pago, saúde 60 % em 2027 (estética
  fora); propostas S-1..S-6 **incluídas como PR-5** do PRE-ADR (dono, 20/10); dossiê
  [`eficiencia-fiscal-servicos/relatorio.md`](../../../pesquisas-legais/eficiencia-fiscal-servicos/relatorio.md) com
  S1–S4 ao contador
- [[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]] — cédula que abriu o nó e fixou "o exemplo do combo não entra"
- [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] — régua F; linha F1.5 em [[FILA-ORDEM]] §F
- [`PRE-ADR-SIMPLES-NACIONAL-CALCULO.md`](../../adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md) e
  [`BE-INCR-SIMPLES-NACIONAL-brief.md`](../../accounting/BE-INCR-SIMPLES-NACIONAL-brief.md) — X14: fator r, segregação,
  parceria, subrazão `ReceitaFiscalLinha`
- [`BE-INCR-NFCE-brief.md`](../../accounting/BE-INCR-NFCE-brief.md) item 10 — `ProductFiscalProfile.ncm` (F-NFCE-3 b),
  insumo do PR-2 (F-EF-5)
- [`ADR-INCR-APPROVAL-maker-checker.md`](../../adr/ADR-INCR-APPROVAL-maker-checker.md) — ciclo proposta → aprovação
  reusado na sugestão

## O que espera o dono

- **22/10 — BRIEF escrito.** Ratificar os forks novos F-EF-14..17 (BRIEF §5): **F-EF-14** severidade do piso sob o
  proporcional (rec. WARN no proporcional, BLOCK na carga); **F-EF-15** razão e DPS seguem o desconto por item (rec. sim —
  toca o ADR-INCR-REVENUE-SPLIT D5); **F-EF-16** destacar `vDescIncond` na NFS-e (rec. sim — reabre F-DFE-15 a);
  **F-EF-17** padrão do pacote por regime só como alerta sobre `pacoteFatoGerador` (rec. não mudar o default).
- Depois: `executa` por PR (F-EF-6 a). PR-1, PR-3 (menos o item 17), PR-4 e PR-5 não têm trava externa; **PR-2 espera o
  `ProductFiscalProfile` (X10a)**; item 17 espera o cálculo de dividendos/JCP do IRRF-DISTRIBUICAO.
- F-EF-1..13 ratificados em 21/10 ([[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]]); padrão do combo emendado para
  PROPORCIONAL_CATALOGO em 21/10 ([[D-2026-10-21-TRIAGEM-CONTADOR-F1]]); P-EF-1..10 respondidas — restam a evidência de
  custo sob CARGA (P-EF-1), valores DRAFT (P-EF-6, P-EF-8) e as fontes não lidas (BRIEF §6).

## Evidência

- `server/src/features/dynamicTables/presets/modules/finance/SalesModule.ts:14,49-52` — `discountAmount` por venda;
  `SalesItemsMixed.ts:14-25` — item sem desconto, sem preço de catálogo, sem NCM.
- `PackageCatalogModule.ts:9-13` — "monetary credit, NOT an itemized combo".
- `rules/plugins/SalesPlugin.ts:140-151` — única guarda do finalize: `discount > subtotal ⇒ 400`.
- `features/sales/services/RegisterPaymentService.ts:4-34` + `routes/sales.ts:8-11` — seam Prisma-side da venda (molde
  do `SaleFiscalGuardService`); `sync/bridges/saleItems.ts:9-12` — leitura dos itens só pelo repositório.
- `prisma/schema.prisma:2871-2903` — `ReceitaFiscalLinha.excluir` "vazio até o X10a".
- `models/simplesCalc.ts:257-275, 317` — `fatorR`, `apurar` puros; `SimplesDto.ts:36` — segregação manual.
- `legalParameters/models/legalParameter.ts:9-36` — `PIS_COFINS_MONOFASICO_NCM` já existe; sem tabela de ST.
- `grep simula server/src` = só testes (pesquisa §4).
