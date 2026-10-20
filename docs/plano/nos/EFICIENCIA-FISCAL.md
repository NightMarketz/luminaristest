---
id: "EFICIENCIA-FISCAL"
tipo: "regua-f"
dominio: "fiscal"
titulo: "Eficiência fiscal lícita como sugestão e guarda: combo itemizado com desconto incondicional rateado e piso por item, segregação por NCM, simuladores (fator r, regime, remuneração do sócio), alertas (sublimite, salão-parceiro, interdependência), guarda anti-simulação no documento fiscal e relatório de economia"
estado: "planned"
estado_detalhe: "20/10: PRE-ADR **Proposed** (ADR-INCR-EFICIENCIA-FISCAL) pela sessao-planejamento sob a cédula D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR — forks F-EF-1..9 PENDENTES, P-EF-1..6 ao contador (A1–A3 do dossiê como perguntas exatas). **Não roteia até a ratificação.** Sem BRIEF, sem 'executa'. **O exemplo do combo (realocar preço mantendo o total) não entra e é invariante I-1** — CTN 148/149 VII, Lei 8.137 art. 1º II/IV, LC 214 art. 7º § 3º + 13 I b (cédula). Hoje: desconto por venda sem rateio por item (SalesModule.discountAmount); PackageCatalogModule não é combo itemizado; segregação do Simples manual por parcela; fator r calculado sem simulação; `grep simula` em server/src = só testes. Posição oficial sobre alocação de desconto em kit: não encontrada — PR-1 só recebe 'executa' depois do P-EF-1"
depende_de: ["[[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]]", "[[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]", "[[X14]]", "[[X7]]", "[[X13]]", "[[LEGAL-PARAMS]]", "[[IRRF-DISTRIBUICAO]]?", "[[RETENCOES-FONTE]]?", "[[IBS-CBS-2027]]?", "[[X10a]]?", "[[GOV-CONTADOR]]?", "[[D1]]?"]
autorizacao: "dono, chat, 2026-10-20: \"Commita a pesquisa e a linha F1.5 no PR #776. Autorizo planejar o PRE-ADR do EFICIENCIA-FISCAL — sessao-planejamento, sem 'executa'.\" — só o PRE-ADR e esta nota (cédula [[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]]). Pedido de origem no mesmo dia: \"precisamos ter uma sessão de instalar práticas de eficiência fiscal, pesquise aqui algumas… para deixarmos automática no sistema\" — a cédula fixou que o exemplo do combo não entra. BRIEF e código exigem pedido próprio"
ancora_sdd: "—"
atualizado: "2026-10-20"
prs: []
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "regra 1: 9 forks pendentes (piso, rateio/concentração, aprovador, kit sem NCM, fonte da NCM/ST, fatiamento, Lucro Real no simulador, estética × Anexo III, desconto condicional) e uma ambiguidade sem fonte oficial (A1) ao contador; depois deles: opus-medio (2 models novos, campos novos em 2 presets + guarda no SalesPlugin, serviço Prisma-side no molde do RegisterPaymentService, 3 simuladores puros sobre simplesCalc/X7, relatório)"
write_set: ["server/prisma/schema.prisma", "server/prisma/migrations/**", "server/src/features/dynamicTables/presets/modules/finance/SalesModule.ts", "server/src/features/dynamicTables/presets/modules/finance/SalesItemsMixed.ts", "server/src/features/dynamicTables/presets/modules/finance/SalesItemsProductsOnly.ts", "server/src/features/dynamicTables/presets/modules/finance/SalesItemsServicesOnly.ts", "server/src/features/dynamicTables/presets/fields/number/NumberPresets.ts", "server/src/features/dynamicTables/rules/plugins/SalesPlugin.ts", "server/src/features/dynamicTables/rules/plugins/sales/**", "server/src/features/sales/models/**", "server/src/features/sales/dtos/FiscalCheckDto.ts", "server/src/features/sales/services/SaleFiscalGuardService.ts", "server/src/features/accounting/models/segregacaoNcm.ts", "server/src/features/accounting/models/taxOptimization*", "server/src/features/accounting/dtos/TaxOptimizationDto.ts", "server/src/features/accounting/dtos/SimplesDto.ts", "server/src/features/accounting/services/TaxOptimizationService.ts", "server/src/features/accounting/services/TaxSimulationService.ts", "server/src/features/accounting/services/ReceitaFiscalService.ts", "server/src/features/accounting/services/SimplesApuracaoService.ts", "server/src/features/accounting/services/DataExchangeExportService.ts", "server/src/features/accounting/repositories/*TaxOptimization*", "server/src/features/accounting/policies/**", "server/src/features/accounting/sync/mappers/*Sale*", "server/src/features/legalParameters/models/legalParameter.ts", "server/src/controllers/salesController.ts", "server/src/controllers/*TaxOptimization*", "server/src/controllers/*TaxSimulation*", "server/src/features/**/__tests__/**", "server/src/controllers/__tests__/**"]
registros: ["server/src/lib/factory.ts", "server/src/routes/sales.ts", "server/src/routes/accounting.ts", "server/src/routes/docs/accounting.tax-optimization.paths.ts", "server/src/routes/docs/sales.paths.ts", "server/src/routes/docs.paths.ts", "server/public/openapi.json", "server/src/features/accounting/audit/auditCanonical.ts", "server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts", "server/src/features/dynamicTables/presets/systems/*.ts", "server/test/helpers/db.ts"]
---
# EFICIENCIA-FISCAL — Eficiência fiscal lícita: sugestão + guarda (combo itemizado, segregação por NCM, simuladores, alertas, relatório)

**Estado:** `planned` — 20/10: PRE-ADR **Proposed** (ADR-INCR-EFICIENCIA-FISCAL) pela sessao-planejamento sob a cédula D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR — forks F-EF-1..9 PENDENTES, P-EF-1..6 ao contador (A1–A3 do dossiê como perguntas exatas). **Não roteia até a ratificação.** Sem BRIEF, sem 'executa'. O exemplo do combo (realocar preço mantendo o total) não entra e é invariante I-1. Hoje: desconto por venda sem rateio por item; pacote não é combo itemizado; segregação manual; fator r sem simulação; posição oficial sobre alocação de desconto em kit não encontrada — PR-1 só recebe 'executa' depois do P-EF-1  
**Autorização:** dono, chat, 2026-10-20: "Commita a pesquisa e a linha F1.5 no PR #776. Autorizo planejar o PRE-ADR do EFICIENCIA-FISCAL — sessao-planejamento, sem 'executa'." — só o PRE-ADR e esta nota ([[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]])  
**Depende de:** [[D-2026-10-20-EFICIENCIA-FISCAL-PRE-ADR]] (cédula), [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] (régua F, posição F1.5), [[X14]] (`simplesCalc.apurar`/`fatorR`, `ReceitaFiscalLinha.excluir`, `SalaoParceriaContrato`), [[X7]] (`TaxAssessment`, `entradaInformada`, presunção do Presumido para o simulador), [[X13]] (`CompanyFiscalProfile.regime` por ano), [[LEGAL-PARAMS]] (`PIS_COFINS_MONOFASICO_NCM` com vigência; nova `ICMS_ST_NCM_UF`); pontilhadas: [[IRRF-DISTRIBUICAO]] (sócios + cálculo de dividendos/JCP para o simulador de remuneração e o alerta de interdependência), [[RETENCOES-FONTE]] (linha "retenções sofridas" do relatório — só consome), [[IBS-CBS-2027]] (tabela 2027 do simulador de regime; crédito não tomado), [[X10a]] (`ProductFiscalProfile.ncm` — F-EF-5; pré-condição de emissão onde a guarda bloqueia), [[GOV-CONTADOR]] (aprovador = contador responsável ACTIVE — F-EF-3), [[D1]] (item 1b — P-EF-1..6)  
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
- **Rateio padrão proporcional ao catálogo (D5); piso = custo médio × (1 + margem) ou preço mínimo (D6);** política
  comercial em `TaxOptimizationPolicy` versionada.
- **Segregação por NCM é derivação (D7):** `ReceitaFiscalLinha.excluir` a partir de `ProductFiscalProfile.ncm` ×
  `PIS_COFINS_MONOFASICO_NCM` (vigente até 31/12/2026 — Lei 10.147 revogada pela LC 214 art. 542 XI) + `ICMS_ST_NCM_UF`
  (DRAFT); `SimplesSegregacaoManual` prevalece com aviso.
- **Simuladores puros com `parametrosSha256` (D8):** fator r (folha-alvo), regime (Simples × Presumido × Real; 2027),
  remuneração do sócio (pró-labore × dividendos × JCP) — gravam sugestão, nunca apuração.
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

- [`ADR-INCR-EFICIENCIA-FISCAL.md`](../../adr/ADR-INCR-EFICIENCIA-FISCAL.md) — **PRE-ADR Proposed (20/10)**: fronteira
  do lícito com artigo + link do acervo por guarda (§3, L1–L16), D1–D10, esqueleto de 24 comportamentos em 4 PRs
  cobrindo as 11 práticas (§6), contratos (`TaxOptimizationPolicy`, `TaxOptimizationSuggestion`, `FiscalCheckResponse`,
  `ratearDesconto`, `verificarItens`, simulação de fator r), forks F-EF-1..9 PENDENTES (§8), P-EF-1..6 (§9),
  Odoo/ERPNext lidos em §11.1, invariantes I-1..13 (§13)
- [`PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md`](../../accounting/PESQUISA-EFICIENCIA-FISCAL-2026-10-20.md) — práticas
  classificadas (lícita/cinzenta/ilícita), o que o sistema já faz (§4), as 11 automações (§5)
- [`relatorio.md`](../../../pesquisas-legais/eficiencia-fiscal-praticas/relatorio.md) — dossiê legal de 20/10 (30
  fontes; ambiguidades A1–A3; lacunas)
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

- Ratificar F-EF-1..9 (recomendação = opção que fecha a lacuna por inteiro: piso completo, rateio proporcional com
  concentração só por sugestão aceita, aprovador = contador responsável quando houver, kit explodido com classificação
  do contador por kit, NCM do `ProductFiscalProfile`, 4 PRs, simulador com Lucro Real, 2027 conservador, desconto
  condicional como campo).
- Enviar P-EF-1..6 ao contador (item 1b do [[D1]]) — **o PR-1 não recebe `executa` antes do P-EF-1** (piso e rateio).
- Depois: BRIEF e `executa` por PR (F-EF-6: 4 PRs).

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
