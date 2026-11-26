---
id: "PAIS-NA-BORDA"
tipo: "plataforma"
dominio: "plataforma"
titulo: "País na borda: centro em inglês, país em features/<dominio>/paises/<cc>/; guarda P1/P2 no check:arch e fatias F0–F8 do existente (ADR-PAIS-NA-BORDA)"
estado: "inflight"
estado_detalhe: "24/11: ADR-PAIS-NA-BORDA Accepted (R1–R7, F-PBA-1..7 na recomendação, F-PNT-PB-1 → b; [[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]]). Os 5 BRIEFs com executa foram emendados pela regra (PR #1338). Fatias F0–F8 com prazo (F-PBA-6 a); a F0 (guarda) é o item 0 do PR-0 do montador único; F1..F8 pedem BRIEF e executa próprios. 26/11: forks F-F3-1..5 ratificados, todos (a), e executa da F3 ([[D-2026-11-26-PAIS-NA-BORDA-F3-FORKS]]); a F3 traz a F0 (item 0) no PR-F3-0 (F-F3-4 a). Próximo: PR-F3-0 e PR-F3-1 em execução; depois, BRIEF da F1 (razão × fiscal BR)"
depende_de: ["[[D-2026-11-15-PAIS-NA-BORDA]]", "[[D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA]]", "[[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]]", "[[D-2026-11-26-PAIS-NA-BORDA-F3-FORKS]]"]
autorizacao: "dono, chat, 2026-11-24, questionário (AskUserQuestion) a pedido dele: ratifica o ADR-PAIS-NA-BORDA e os prazos e o dono das fatias (F-PBA-6 a: o nó nasce neste fold) — não é executa de nenhuma fatia; a F0 roda dentro do executa do BRIEF do montador único (D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA §4 e §6). FATIA F3 — dono, chat, 2026-11-26, questionário: P1 \"A sessão da ponte folha → razão travou no PR-P0/P1. O F-PBA-7 (ratificado (a) em 24/11) manda a fatia F3 do país-na-borda (registro de formato de LegalParameter por domínio e país) entrar antes. Só que a F3 tem os forks F-F3-1..5 pendentes, não tem executa e não tem código. Qual caminho?\" → \"F3 antes (Recomendado)\"; P2 \"Se for F3 antes: autoriza uma sessão nova que primeiro ratifica com você os forks F-F3-1..5 por questionário e, depois, executa o BRIEF da F3 inteiro, sem merge na main?\" → \"Ratificar e executar (Recomendado)\". Executa do BRIEF da F3 inteiro (PR-F3-0 e PR-F3-1, com o item 0/F0 pelo F-F3-4 a), sem merge na main; forks F-F3-1..5 todos (a) em D-2026-11-26-PAIS-NA-BORDA-F3-FORKS"
ancora_sdd: "§IV.1 (P-i18n, lei preventiva)"
atualizado: "2026-11-26"
prs: [1338, 1334]
perfil_previsto: "precisa-de-planejamento"
perfil_evidencia: "cada fatia F1..F8 pede BRIEF próprio; a F0 está no BRIEF do montador único (item 0)"
write_set: ["docs/adr/ADR-PAIS-NA-BORDA.md", "docs/adr/ADR-ARCH-BOUNDARIES.md", "server/.dependency-cruiser.cjs", "server/src/features/*/paises/**", "server/src/features/*/ports/**", "server/src/features/legalParameters/**", "server/src/features/accounting/models/{taxAssessmentParams,FixedAsset.model,meiAnexoXi,obrigacoesPorRegime}.ts", "server/src/features/accounting/models/__tests__/**", "server/src/features/accounting/services/{SimplesApuracaoService,TaxSimulationService,WithholdingService}.ts", "server/src/features/dp/models/{escala,parametrosFolha,regrasFolha}.ts", "server/src/features/dp/models/folha/fracao.ts", "server/src/features/dp/models/__tests__/**", "server/src/__tests__/legalParameter*.integration.test.ts", "server/src/jobs/__tests__/checkLegalParamsFormatoCli.test.ts", "server/src/controllers/legalParameterController.ts", "server/src/routes/legalParameters.ts", "server/public/openapi.json", "my-app/types/contracts/legalParameters/**", "docs/accounting/BE-INCR-PAIS-NA-BORDA-F1-brief.md", "server/src/features/accounting/services/PostingService.ts", "server/src/features/accounting/services/AccountingScopeSettingsService.ts", "server/src/features/accounting/services/AccountingPolicyVersionService.ts", "server/src/features/accounting/services/TaxAssessmentService.ts", "server/src/features/accounting/services/TaxAssessmentPeriodosService.ts", "server/src/features/accounting/services/SimplesApuracaoService.ts", "server/src/features/accounting/services/TaxSimulationService.ts", "server/src/features/accounting/services/PisCofinsAssessmentService.ts", "server/src/features/accounting/services/IbsCbsAssessmentService.ts", "server/src/features/accounting/services/ReceitaFiscalService.ts", "server/src/features/accounting/services/CompanyFiscalProfileService.ts", "server/src/features/accounting/services/InterestOnEquityService.ts", "server/src/features/accounting/services/SpedEcfRealGenerationService.ts", "server/src/features/accounting/services/LalurService.ts", "server/src/features/accounting/services/lalurParteBBalances.ts", "server/src/features/accounting/services/IFixedAssetReader.ts", "server/src/features/accounting/services/FixedAssetParteBReader.ts", "server/src/features/accounting/services/__tests__/**", "server/src/features/accounting/models/Lalur.model.ts", "server/src/features/accounting/models/lalurBlocoF.ts", "server/src/features/accounting/models/dates.ts", "server/src/features/accounting/models/taxAssessmentCalc.ts", "server/src/features/accounting/models/taxAssessmentCalcAnual.ts", "server/src/features/accounting/models/taxAssessmentEcfLinhas.ts", "server/src/features/accounting/models/taxAssessmentMemoExport.ts", "server/src/features/accounting/repositories/ILalurRepository.ts", "server/src/features/accounting/repositories/LalurRepository.ts", "server/src/features/accounting/dtos/LalurDto.ts", "server/src/features/accounting/dtos/TaxAssessmentDto.ts", "server/src/features/accounting/dtos/__tests__/LalurDto.test.ts", "server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts", "server/src/features/accounting/fixtures/ecf-l12-linhas.json", "server/src/features/accounting/fixtures/__tests__/ChartOfAccountsFixture.plano4niveis.test.ts", "server/src/jobs/migratePlano4NiveisCli.ts", "server/src/controllers/lalurController.ts", "server/src/lib/__tests__/ecfReal.test.ts", "scripts/ecf-tabelas-dinamicas-to-catalog.mjs", "my-app/types/contracts/accounting/LalurDto.gen.ts", "my-app/types/contracts/accounting/paises/br/**", "my-app/lib/services/lalur.service.ts"]
registros: ["server/src/lib/factory.ts", "server/prisma/schema.prisma", "server/src/routes/docs.paths.ts", "server/src/features/accounting/dtos/__tests__/__dto-shapes__.json"]
---
# PAIS-NA-BORDA — conceito universal no centro, país na borda

**Estado:** `planned`. **ADR:** [`ADR-PAIS-NA-BORDA.md`](../../adr/ADR-PAIS-NA-BORDA.md), Accepted em 24/11/2026.
**Autorização:** frontmatter. Cada fatia pede `executa` próprio do dono.

## Fatias (ADR §5; prazos ratificados, F-PBA-6 a)

| # | Fatia | Prazo | Onde está |
|---|---|---|---|
| F0 | Guarda `P1`/`P2` + ajustes G1–G5 | com o 1º PR de código emendado (a F3, desde 26/11) | item 0 do PR-F3-0 (F-F3-4 a, 26/11); antes, do PR-0 do montador único |
| F1 | Razão × fiscal BR em `features/accounting` | 18/12/2026 | sem BRIEF |
| F2 | Primitivas de plataforma, allowlist por domínio, slots de moeda e fuso | 29/01/2027 | sem BRIEF |
| F3 | Registro de formato de `LegalParameter` por domínio e país; vigência em código depois do F-ML-0 | **antes** do PR-0 do ciclo e do PR-P0 da ponte | BRIEF 24/11; forks (a) e executa 26/11 |
| F4 | Formato de documento do motor DynamicTable por registro | 26/02/2027 | sem BRIEF |
| F5 | Fiscal BR com nome de instância e o escopo `LEGADO_BR` | 31/03/2027 | sem BRIEF |
| F6 | Models mistos (27), um por mês | 04/2027 a 09/2027 | sem BRIEF |
| F7 | DP existente | junto do F3 do DP | sem BRIEF |
| F8 | Libs fiscais puras de `lib/` | 30/06/2027 | sem BRIEF |
| — | Fim da convivência (`LEGADO_BR` vazio) | 31/12/2027 | — |

## Docs

- [`ADR-PAIS-NA-BORDA.md`](../../adr/ADR-PAIS-NA-BORDA.md) e [`PRE-ADR-PAIS-NA-BORDA.md`](../../adr/PRE-ADR-PAIS-NA-BORDA.md).
- Decisões: [[D-2026-11-15-PAIS-NA-BORDA]], [[D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA]], [[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]].
- BRIEF da F3: [`BE-INCR-PAIS-NA-BORDA-F3-brief.md`](../../accounting/BE-INCR-PAIS-NA-BORDA-F3-brief.md) (24/11; forks F-F3-1..5 (a) e `executa` em 26/11, [[D-2026-11-26-PAIS-NA-BORDA-F3-FORKS]]).
- BRIEFs emendados pela regra (24/11): [[EFICIENCIA-FISCAL]] (montador único), [[CICLO-FISCAL]], [[NFSE-PAULISTANA]],
  [[PES-4]] (ponte do DP), [[SIMULACAO-CENARIO]] (PR-0).
