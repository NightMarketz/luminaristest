# Cobertura por rota — `/api/accounting` e `/api/nfe` (05/11/2026)

> **Inventário, não gate** (F-RF-1 a, dono, 04/11). Medido uma vez sobre `main` em `d1d3f3fee`. O script que gerou a
> tabela ficou no scratchpad da sessão e não é versionado; não entra no CI. Atualizada à mão no PR de cada lote
> (item 6 do BRIEF [`FIX-TESTES-REPO-FALSO-POR-ROTA`](../accounting/FIX-TESTES-REPO-FALSO-POR-ROTA-brief.md)).

## Resultado

**256 rotas, 188 com `request(app)` em `*.integration.test.ts`, 68 sem** (medição de 05/11). **Depois do lote 1: 199 com, 57 sem.** As 68 da medição, por classe:

| Classe | Rotas | Onde |
|---|---|---|
| Escrita no razão, no período ou em documento fiscal | 8 | Lote 1 deste BRIEF (**feito**: `rotasSemIntegracao.lote1.integration.test.ts`) |
| Emissão de saída (`/api/nfe/dfe`), escrita fiscal | 11 | PILOTO-DFE (#1067, Fase B), fora dos lotes daqui |
| Emissão de saída (`/api/nfe/dfe`), leitura | 5 | idem |
| Escrita cadastral | 18 | Lotes 2–3 (`POST /reviews` e `POST /reviews/:id/findings` já passaram pelo cenário do lote 1: faltam 16) |
| Leitura e relatório (A7: esperados fixos) | 26 | Lotes 4 em diante (`GET /reviews/:id` é a 2ª leitura do lote 1: faltam 25) |

## Critério (o que "sim" quer dizer)

- **Rotas:** todo `router.<verbo>('<caminho>')` de `server/src/routes/{taxAssessments,simples,mitExports,reinfBatches,accounting,nfe,dfe}.ts`,
  com o prefixo do `router.use` de `server/src/routes/index.ts:77–91` (montagem sob `/api`). Ficam fora `/api/accounting-binding`
  e `/api/accounting-kit`: são outros prefixos, não sub-caminhos de `/api/accounting`.
- **Chamadas:** todo `.<verbo>(<literal ou const>)` em `server/src/**/*.integration.test.ts` cujo caminho começa com
  `/api/accounting` ou `/api/nfe`. `${CONST}` é resolvido quando a const é literal do mesmo arquivo; o resto de `${…}` vira um
  segmento qualquer, que casa com `:param`. Query string é ignorada.
- **Casamento:** a primeira rota do mesmo método que casa, na ordem de montagem e declaração (a ordem do Express). Segmento
  vindo de parâmetro de helper (ex.: `` `/sped/${rota}/generate` ``) casa com o literal só se o literal aparece como string
  no arquivo; esses hits levam `(helper)`.
- **Limite (grau: verificado nas amostras abaixo).** "sim" é **a rota ser chamada**, não "caminho feliz assertado". Um teste
  que só confere 401/403 conta como "sim" (ex.: `psc-providers` GET em `pscCredential.integration.test.ts:122`). A coluna aponta
  o primeiro hit; `+n` diz quantos outros há. Chamada por tabela (`request(app)[metodo](…)`) não seria vista; o grep acha uma só, fora do
  escopo (`/api/package-acceptances`, `packageAcceptance.integration.test.ts:143`).
- **Casos adversariais tentados contra o "não":** busca por fragmento de caminho (`balance-sheet`, `reviews`,
  `service-fiscal-profiles`, `closing/exercise`, `daily-journal`, `fator-r/sugestao`, `reconciliation`, `attachments`,
  `source-documents`, `psc-providers`, `company-signers`, `fixed-asset-classes`, `/ledger`, `/receipt`, `delivery`, `/jcp`) em
  todos os `*.integration.test.ts`. Onde houve arquivo, o hit era outra rota (ex.: `GET /attachments/:id` em
  `sourceDocumentUpload.integration.test.ts:62`, não `POST /attachments`), import (`ledgerStatus`) ou comentário. Nenhum "não"
  virou "sim". Variante do script resolvendo também consts em template: mesma contagem (188/68).

## Tabela

| # | Método | Caminho montado | Declarada em | Integração (`request(app)`) | Classe (só nas "não") |
|---|---|---|---|---|---|
| 1 | POST | `/api/accounting/tax-assessments/preview` | server/src/routes/taxAssessments.ts:22 | sim (server/src/controllers/__tests__/ecfPresumidoSegregacao.integration.test.ts:113; +10) |  |
| 2 | POST | `/api/accounting/tax-assessments/pis-cofins/preview` | server/src/routes/taxAssessments.ts:23 | sim (server/src/controllers/__tests__/pisCofins.integration.test.ts:75; +8) |  |
| 3 | POST | `/api/accounting/tax-assessments/pis-cofins` | server/src/routes/taxAssessments.ts:24 | sim (server/src/controllers/__tests__/pisCofins.integration.test.ts:78; +5) |  |
| 4 | GET | `/api/accounting/tax-assessments` | server/src/routes/taxAssessments.ts:25 | sim (server/src/controllers/__tests__/pisCofins.integration.test.ts:134; +2) |  |
| 5 | GET | `/api/accounting/tax-assessments/periodos` | server/src/routes/taxAssessments.ts:26 | sim (server/src/controllers/__tests__/taxAssessmentPeriodos.integration.test.ts:30; +1) |  |
| 6 | POST | `/api/accounting/tax-assessments` | server/src/routes/taxAssessments.ts:27 | sim (server/src/controllers/__tests__/ecfPresumidoSegregacao.integration.test.ts:116; +8) |  |
| 7 | GET | `/api/accounting/tax-assessments/:id` | server/src/routes/taxAssessments.ts:28 | sim (server/src/controllers/__tests__/pisCofins.integration.test.ts:137; +4) |  |
| 8 | POST | `/api/accounting/tax-assessments/:id/provisao` | server/src/routes/taxAssessments.ts:29 | sim (server/src/controllers/__tests__/pisCofins.integration.test.ts:143; +2) |  |
| 9 | PUT | `/api/accounting/simples/historico/:competencia` | server/src/routes/simples.ts:31 | sim (server/src/features/accounting/services/__tests__/simplesEntradas.integration.test.ts:74; +4) |  |
| 10 | PUT | `/api/accounting/simples/segregacao/:competencia` | server/src/routes/simples.ts:32 | sim (server/src/features/accounting/services/__tests__/simplesEntradas.integration.test.ts:133; +2) |  |
| 11 | GET | `/api/accounting/simples/historico/:competencia` | server/src/routes/simples.ts:34 | sim (server/src/features/accounting/services/__tests__/simplesEntradas.integration.test.ts:265 (helper); +1) |  |
| 12 | GET | `/api/accounting/simples/segregacao/:competencia` | server/src/routes/simples.ts:35 | sim (server/src/features/accounting/services/__tests__/simplesEntradas.integration.test.ts:265 (helper); +1) |  |
| 13 | POST | `/api/accounting/simples/parcerias` | server/src/routes/simples.ts:36 | sim (server/src/features/accounting/services/__tests__/eficienciaFiscalPr4.integration.test.ts:49; +5) |  |
| 14 | GET | `/api/accounting/simples/parcerias` | server/src/routes/simples.ts:37 | sim (server/src/features/accounting/services/__tests__/eficienciaFiscalPr4.integration.test.ts:92; +1) |  |
| 15 | PATCH | `/api/accounting/simples/parcerias/:id` | server/src/routes/simples.ts:38 | sim (server/src/features/accounting/services/__tests__/eficienciaFiscalPr4.integration.test.ts:90; +2) |  |
| 16 | DELETE | `/api/accounting/simples/parcerias/:id` | server/src/routes/simples.ts:39 | sim (server/src/features/accounting/services/__tests__/eficienciaFiscalPr4.integration.test.ts:103; +2) |  |
| 17 | POST | `/api/accounting/simples/apuracoes/:competencia/calcular` | server/src/routes/simples.ts:41 | sim (server/src/features/accounting/services/__tests__/eficienciaFiscalPr4.integration.test.ts:41; +11) |  |
| 18 | GET | `/api/accounting/simples/apuracoes/:competencia` | server/src/routes/simples.ts:42 | sim (server/src/features/accounting/services/__tests__/simplesApuracao.integration.test.ts:216; +3) |  |
| 19 | PUT | `/api/accounting/simples/apuracoes/:competencia/das` | server/src/routes/simples.ts:43 | sim (server/src/features/accounting/services/__tests__/simplesApuracao.integration.test.ts:51; +3) |  |
| 20 | GET | `/api/accounting/simples/aliquotas/:competencia` | server/src/routes/simples.ts:45 | sim (server/src/features/accounting/services/__tests__/issBeneficioMunicipal.integration.test.ts:56; +3) |  |
| 21 | GET | `/api/accounting/simples/dasn-simei/:ano` | server/src/routes/simples.ts:46 | sim (server/src/features/accounting/services/__tests__/simplesMei.integration.test.ts:151; +1) |  |
| 22 | PUT | `/api/accounting/simples/dasn-simei/:ano` | server/src/routes/simples.ts:47 | sim (server/src/features/accounting/services/__tests__/simplesMei.integration.test.ts:161; +1) |  |
| 23 | GET | `/api/accounting/simples/defis/:ano` | server/src/routes/simples.ts:48 | sim (server/src/features/accounting/services/__tests__/simplesApuracao.integration.test.ts:342; +1) |  |
| 24 | PUT | `/api/accounting/simples/defis/:ano` | server/src/routes/simples.ts:49 | sim (server/src/features/accounting/services/__tests__/simplesApuracao.integration.test.ts:384; +2) |  |
| 25 | GET | `/api/accounting/simples/registro-valores-a-receber` | server/src/routes/simples.ts:51 | sim (server/src/features/accounting/services/__tests__/simplesCaixaPr3.integration.test.ts:38) |  |
| 26 | POST | `/api/accounting/simples/creditos-incobraveis` | server/src/routes/simples.ts:52 | sim (server/src/features/accounting/services/__tests__/simplesCaixaPr1.integration.test.ts:214; +1) |  |
| 27 | DELETE | `/api/accounting/simples/creditos-incobraveis/:id` | server/src/routes/simples.ts:53 | sim (server/src/features/accounting/services/__tests__/simplesCaixaPr1.integration.test.ts:219; +3) |  |
| 28 | POST | `/api/accounting/mit-exports` | server/src/routes/mitExports.ts:11 | sim (server/src/controllers/__tests__/mitExport.integration.test.ts:58; +2) |  |
| 29 | GET | `/api/accounting/mit-exports` | server/src/routes/mitExports.ts:12 | sim (server/src/controllers/__tests__/mitExport.integration.test.ts:59; +1) |  |
| 30 | POST | `/api/accounting/reinf/batches` | server/src/routes/reinfBatches.ts:10 | sim (server/src/controllers/__tests__/reinfPr1.integration.test.ts:35; +3) |  |
| 31 | GET | `/api/accounting/reinf/batches` | server/src/routes/reinfBatches.ts:11 | sim (server/src/controllers/__tests__/reinfPr1.integration.test.ts:136; +1) |  |
| 32 | GET | `/api/accounting/reinf/batches/:id` | server/src/routes/reinfBatches.ts:12 | sim (server/src/controllers/__tests__/reinfPr1.integration.test.ts:141) |  |
| 33 | POST | `/api/accounting/post` | server/src/routes/accounting.ts:257 | sim (server/src/controllers/__tests__/accountingController.audit.integration.test.ts:57; +8) |  |
| 34 | POST | `/api/accounting/reverse` | server/src/routes/accounting.ts:258 | sim (server/src/controllers/__tests__/accountingController.integration.test.ts:293; +4) |  |
| 35 | GET | `/api/accounting/trial-balance` | server/src/routes/accounting.ts:261 | sim (server/src/controllers/__tests__/accountingController.integration.test.ts:391) |  |
| 36 | GET | `/api/accounting/ledger` | server/src/routes/accounting.ts:262 | **não** | Lote 4+ — leitura/relatório (A7) |
| 37 | GET | `/api/accounting/balance-sheet` | server/src/routes/accounting.ts:263 | **não** | Lote 4+ — leitura/relatório (A7) |
| 38 | GET | `/api/accounting/income-statement` | server/src/routes/accounting.ts:264 | **não** | Lote 4+ — leitura/relatório (A7) |
| 39 | GET | `/api/accounting/reports/cash-flow` | server/src/routes/accounting.ts:265 | **não** | Lote 4+ — leitura/relatório (A7) |
| 40 | GET | `/api/accounting/reports/period-comparison` | server/src/routes/accounting.ts:266 | **não** | Lote 4+ — leitura/relatório (A7) |
| 41 | GET | `/api/accounting/reports/daily-journal` | server/src/routes/accounting.ts:267 | **não** | Lote 4+ — leitura/relatório (A7) |
| 42 | GET | `/api/accounting/reports/aging` | server/src/routes/accounting.ts:268 | **não** | Lote 4+ — leitura/relatório (A7) |
| 43 | GET | `/api/accounting/reports/cash-forecast` | server/src/routes/accounting.ts:269 | sim (server/src/controllers/__tests__/accountingController.cashForecast.integration.test.ts:87; +1) |  |
| 44 | GET | `/api/accounting/reports/tie-out` | server/src/routes/accounting.ts:270 | sim (server/src/controllers/__tests__/retencoesFontePr2.integration.test.ts:483) |  |
| 45 | GET | `/api/accounting/audit/verify-chain` | server/src/routes/accounting.ts:271 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:135; +4) |  |
| 46 | GET | `/api/accounting/accounts` | server/src/routes/accounting.ts:274 | sim (server/src/controllers/__tests__/dashboardCreate.firstUnit.integration.test.ts:60; +9) |  |
| 47 | POST | `/api/accounting/accounts` | server/src/routes/accounting.ts:275 | sim (server/src/controllers/__tests__/accountingController.chartOfAccounts.integration.test.ts:133; +5) |  |
| 48 | DELETE | `/api/accounting/accounts/:id` | server/src/routes/accounting.ts:276 | sim (server/src/controllers/__tests__/accountingController.chartOfAccounts.integration.test.ts:182; +2) |  |
| 49 | PATCH | `/api/accounting/accounts/:id/requires-dimension` | server/src/routes/accounting.ts:277 | sim (server/src/controllers/__tests__/accountingController.chartOfAccounts.integration.test.ts:223; +1) |  |
| 50 | GET | `/api/accounting/entries` | server/src/routes/accounting.ts:280 | sim (server/src/controllers/__tests__/accountingController.integration.test.ts:261; +2) |  |
| 51 | GET | `/api/accounting/journal-entries/:entryId/receipt` | server/src/routes/accounting.ts:281 | **não** | Lote 4+ — leitura/relatório (A7) |
| 52 | POST | `/api/accounting/attachments` | server/src/routes/accounting.ts:284 | **não** | Lotes 2–3 — escrita cadastral |
| 53 | GET | `/api/accounting/attachments/:id` | server/src/routes/accounting.ts:285 | sim (server/src/controllers/__tests__/unitGuard.accounting.integration.test.ts:122; +2) |  |
| 54 | DELETE | `/api/accounting/attachments/:id` | server/src/routes/accounting.ts:286 | **não** | Lotes 2–3 — escrita cadastral |
| 55 | GET | `/api/accounting/journal-entries/:journalEntryId/attachments` | server/src/routes/accounting.ts:287 | **não** | Lote 4+ — leitura/relatório (A7) |
| 56 | PUT | `/api/accounting/fiscal-certificates/:unitId` | server/src/routes/accounting.ts:290 | sim (server/src/controllers/__tests__/fiscalCertificate.integration.test.ts:28) |  |
| 57 | GET | `/api/accounting/fiscal-certificates/:unitId` | server/src/routes/accounting.ts:291 | sim (server/src/controllers/__tests__/fiscalCertificate.integration.test.ts:110; +2) |  |
| 58 | DELETE | `/api/accounting/fiscal-certificates/:unitId` | server/src/routes/accounting.ts:292 | sim (server/src/controllers/__tests__/fiscalCertificate.integration.test.ts:130; +1) |  |
| 59 | GET | `/api/accounting/psc-credentials/callback` | server/src/routes/accounting.ts:296 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:63) |  |
| 60 | POST | `/api/accounting/psc-credentials/:unitId/authorize` | server/src/routes/accounting.ts:297 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:56) |  |
| 61 | GET | `/api/accounting/psc-credentials/:unitId` | server/src/routes/accounting.ts:298 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:216; +2) |  |
| 62 | DELETE | `/api/accounting/psc-credentials/:unitId` | server/src/routes/accounting.ts:299 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:254) |  |
| 63 | PUT | `/api/accounting/nfce-cscs/:unitId` | server/src/routes/accounting.ts:301 | sim (server/src/controllers/__tests__/nfceCsc.integration.test.ts:53; +6) |  |
| 64 | GET | `/api/accounting/nfce-cscs/:unitId` | server/src/routes/accounting.ts:302 | sim (server/src/controllers/__tests__/nfceCsc.integration.test.ts:95; +2) |  |
| 65 | DELETE | `/api/accounting/nfce-cscs/:unitId` | server/src/routes/accounting.ts:303 | sim (server/src/controllers/__tests__/nfceCsc.integration.test.ts:123; +2) |  |
| 66 | PUT | `/api/accounting/nfce-contingencia/:unitId` | server/src/routes/accounting.ts:305 | sim (server/src/controllers/__tests__/nfceContingencia.integration.test.ts:44; +3) |  |
| 67 | GET | `/api/accounting/nfce-contingencia/:unitId` | server/src/routes/accounting.ts:306 | sim (server/src/controllers/__tests__/nfceContingencia.integration.test.ts:50; +1) |  |
| 68 | GET | `/api/accounting/psc-providers` | server/src/routes/accounting.ts:307 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:122) |  |
| 69 | POST | `/api/accounting/psc-providers` | server/src/routes/accounting.ts:308 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:108; +3) |  |
| 70 | PATCH | `/api/accounting/psc-providers/:id` | server/src/routes/accounting.ts:309 | sim (server/src/controllers/__tests__/pscCredential.integration.test.ts:145) |  |
| 71 | DELETE | `/api/accounting/psc-providers/:id` | server/src/routes/accounting.ts:310 | **não** | Lotes 2–3 — escrita cadastral |
| 72 | POST | `/api/accounting/journal-entries/:entryId/source-documents` | server/src/routes/accounting.ts:315 | **não** | Lotes 2–3 — escrita cadastral |
| 73 | GET | `/api/accounting/journal-entries/:entryId/source-documents` | server/src/routes/accounting.ts:316 | **não** | Lote 4+ — leitura/relatório (A7) |
| 74 | POST | `/api/accounting/source-documents` | server/src/routes/accounting.ts:318 | sim (server/src/controllers/__tests__/unitGuard.accounting.integration.test.ts:101; +4) |  |
| 75 | POST | `/api/accounting/data-exchange/exports` | server/src/routes/accounting.ts:321 | sim (server/src/controllers/__tests__/ecfPresumidoSegregacao.integration.test.ts:126; +7) |  |
| 76 | POST | `/api/accounting/data-exchange/imports` | server/src/routes/accounting.ts:322 | sim (server/src/controllers/__tests__/itg2000ExtemporaneoC4.integration.test.ts:69) |  |
| 77 | GET | `/api/accounting/data-exchange/jobs` | server/src/routes/accounting.ts:325 | **não** | Lote 4+ — leitura/relatório (A7) |
| 78 | GET | `/api/accounting/data-exchange/jobs/:jobId` | server/src/routes/accounting.ts:326 | sim (server/src/controllers/__tests__/spedController.ecfReal.integration.test.ts:116; +1) |  |
| 79 | GET | `/api/accounting/data-exchange/jobs/:jobId/rows` | server/src/routes/accounting.ts:327 | sim (server/src/controllers/__tests__/itg2000ExtemporaneoC4.integration.test.ts:78) |  |
| 80 | GET | `/api/accounting/data-exchange/jobs/:jobId/download` | server/src/routes/accounting.ts:328 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:153; +14) |  |
| 81 | POST | `/api/accounting/data-exchange/jobs/:jobId/commit` | server/src/routes/accounting.ts:329 | sim (server/src/controllers/__tests__/itg2000ExtemporaneoC4.integration.test.ts:239) |  |
| 82 | POST | `/api/accounting/data-exchange/jobs/:jobId/waive-ecf-rectification` | server/src/routes/accounting.ts:331 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:353) | lote 1 |
| 83 | GET | `/api/accounting/sped/qualif-assinante` | server/src/routes/accounting.ts:334 | sim (server/src/controllers/__tests__/spedQualifAssinante.integration.test.ts:30; +4) |  |
| 84 | POST | `/api/accounting/sped/ecd/generate` | server/src/routes/accounting.ts:339 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:193; +4) |  |
| 85 | GET | `/api/accounting/sped/ecf/y600/vigencias` | server/src/routes/accounting.ts:342 | sim (server/src/features/accounting/services/__tests__/y600Vigencias.integration.test.ts:29) |  |
| 86 | POST | `/api/accounting/sped/ecf/generate` | server/src/routes/accounting.ts:345 | sim (server/src/controllers/__tests__/companyFiscalProfile.sped.integration.test.ts:29 (helper); +2) |  |
| 87 | POST | `/api/accounting/sped/ecf/real/generate` | server/src/routes/accounting.ts:348 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:143; +8) |  |
| 88 | POST | `/api/accounting/closing/exercise` | server/src/routes/accounting.ts:352 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:106) | lote 1 |
| 89 | POST | `/api/accounting/reconciliation/statements` | server/src/routes/accounting.ts:355 | sim (server/src/controllers/__tests__/releaseReport.integration.test.ts:56) |  |
| 90 | GET | `/api/accounting/reconciliation/statements` | server/src/routes/accounting.ts:356 | **não** | Lote 4+ — leitura/relatório (A7) |
| 91 | GET | `/api/accounting/reconciliation/statements/:id/lines` | server/src/routes/accounting.ts:357 | **não** | Lote 4+ — leitura/relatório (A7) |
| 92 | DELETE | `/api/accounting/reconciliation/statements/:id` | server/src/routes/accounting.ts:358 | **não** | Lotes 2–3 — escrita cadastral |
| 93 | POST | `/api/accounting/reconciliation/statements/:id/auto-match` | server/src/routes/accounting.ts:359 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:272) | lote 1 |
| 94 | GET | `/api/accounting/reconciliation/lines/:id/suggestions` | server/src/routes/accounting.ts:360 | **não** | Lote 4+ — leitura/relatório (A7) |
| 95 | POST | `/api/accounting/reconciliation/lines/:id/ignore` | server/src/routes/accounting.ts:361 | **não** | Lotes 2–3 — escrita cadastral |
| 96 | POST | `/api/accounting/reconciliation/matches` | server/src/routes/accounting.ts:362 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:274) | lote 1 |
| 97 | POST | `/api/accounting/reconciliation/matches/:id/unmatch` | server/src/routes/accounting.ts:363 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:276) | lote 1 |
| 98 | GET | `/api/accounting/reconciliation/pending` | server/src/routes/accounting.ts:364 | **não** | Lote 4+ — leitura/relatório (A7) |
| 99 | PUT | `/api/accounting/referential/mappings` | server/src/routes/accounting.ts:368 | **não** | Lotes 2–3 — escrita cadastral |
| 100 | POST | `/api/accounting/referential/mappings/batch` | server/src/routes/accounting.ts:369 | **não** | Lotes 2–3 — escrita cadastral |
| 101 | POST | `/api/accounting/referential/mappings/copy` | server/src/routes/accounting.ts:370 | **não** | Lotes 2–3 — escrita cadastral |
| 102 | DELETE | `/api/accounting/referential/mappings` | server/src/routes/accounting.ts:371 | **não** | Lotes 2–3 — escrita cadastral |
| 103 | GET | `/api/accounting/referential/mappings` | server/src/routes/accounting.ts:372 | **não** | Lote 4+ — leitura/relatório (A7) |
| 104 | GET | `/api/accounting/referential/coverage` | server/src/routes/accounting.ts:373 | sim (server/src/controllers/__tests__/irrfPlanoPadrao.integration.test.ts:71) |  |
| 105 | GET | `/api/accounting/referential/skeleton` | server/src/routes/accounting.ts:374 | **não** | Lote 4+ — leitura/relatório (A7) |
| 106 | POST | `/api/accounting/referential/catalog/import` | server/src/routes/accounting.ts:376 | **não** | Lotes 2–3 — escrita cadastral |
| 107 | GET | `/api/accounting/referential/catalog` | server/src/routes/accounting.ts:377 | **não** | Lote 4+ — leitura/relatório (A7) |
| 108 | GET | `/api/accounting/contacts` | server/src/routes/accounting.ts:407 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:56; +1) |  |
| 109 | POST | `/api/accounting/contacts` | server/src/routes/accounting.ts:408 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:57; +16) |  |
| 110 | PATCH | `/api/accounting/contacts/:id` | server/src/routes/accounting.ts:409 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:86; +1) |  |
| 111 | DELETE | `/api/accounting/contacts/:id` | server/src/routes/accounting.ts:410 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:421) |  |
| 112 | POST | `/api/accounting/delivery/build` | server/src/routes/accounting.ts:411 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:58) |  |
| 113 | POST | `/api/accounting/delivery/confirm` | server/src/routes/accounting.ts:412 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:306; +3) |  |
| 114 | GET | `/api/accounting/delivery` | server/src/routes/accounting.ts:416 | sim (server/src/controllers/__tests__/deliveryList.integration.test.ts:66; +7) |  |
| 115 | GET | `/api/accounting/delivery/profile` | server/src/routes/accounting.ts:417 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:360; +3) |  |
| 116 | PUT | `/api/accounting/delivery/profile` | server/src/routes/accounting.ts:418 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:373; +2) |  |
| 117 | POST | `/api/accounting/delivery/:id/retry` | server/src/routes/accounting.ts:419 | sim (server/src/controllers/__tests__/accountingContactController.integration.test.ts:103) |  |
| 118 | GET | `/api/accounting/delivery/:id` | server/src/routes/accounting.ts:420 | **não** | Lote 4+ — leitura/relatório (A7) |
| 119 | POST | `/api/accounting/reviews` | server/src/routes/accounting.ts:424 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:136) | cenário do lote 1 |
| 120 | GET | `/api/accounting/reviews` | server/src/routes/accounting.ts:425 | **não** | Lote 4+ — leitura/relatório (A7) |
| 121 | GET | `/api/accounting/reviews/:id` | server/src/routes/accounting.ts:426 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:149) | cenário do lote 1 |
| 122 | POST | `/api/accounting/reviews/:id/findings` | server/src/routes/accounting.ts:427 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:142) | cenário do lote 1 |
| 123 | POST | `/api/accounting/reviews/:id/findings/:findingId/resolve` | server/src/routes/accounting.ts:428 | **não** | Lotes 2–3 — escrita cadastral |
| 124 | POST | `/api/accounting/reviews/:id/findings/:findingId/adjustment` | server/src/routes/accounting.ts:429 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:155) | lote 1 |
| 125 | PATCH | `/api/accounting/reviews/:id/jobs` | server/src/routes/accounting.ts:430 | **não** | Lotes 2–3 — escrita cadastral |
| 126 | POST | `/api/accounting/reviews/:id/sign-off` | server/src/routes/accounting.ts:431 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:168) | lote 1 |
| 127 | POST | `/api/accounting/reviews/:id/reject` | server/src/routes/accounting.ts:432 | sim (server/src/controllers/__tests__/rotasSemIntegracao.lote1.integration.test.ts:172) | lote 1 |
| 128 | POST | `/api/accounting/accountant-assignments` | server/src/routes/accounting.ts:436 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:49; +4) |  |
| 129 | GET | `/api/accounting/accountant-assignments` | server/src/routes/accounting.ts:437 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:208) |  |
| 130 | GET | `/api/accounting/accountant-assignments/mine` | server/src/routes/accounting.ts:438 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:191) |  |
| 131 | POST | `/api/accounting/accountant-assignments/:id/accept` | server/src/routes/accounting.ts:439 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:54; +5) |  |
| 132 | POST | `/api/accounting/accountant-assignments/:id/end` | server/src/routes/accounting.ts:440 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:201; +3) |  |
| 133 | POST | `/api/accounting/policy-versions` | server/src/routes/accounting.ts:444 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:54) |  |
| 134 | GET | `/api/accounting/policy-versions` | server/src/routes/accounting.ts:445 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:151) |  |
| 135 | GET | `/api/accounting/policy-versions/:id` | server/src/routes/accounting.ts:446 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:132) |  |
| 136 | POST | `/api/accounting/policy-versions/:id/approve` | server/src/routes/accounting.ts:447 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:56) |  |
| 137 | POST | `/api/accounting/policy-versions/:id/reject` | server/src/routes/accounting.ts:448 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:59) |  |
| 138 | GET | `/api/accounting/settings` | server/src/routes/accounting.ts:451 | sim (server/src/controllers/__tests__/bankSettlementController.integration.test.ts:212) |  |
| 139 | PUT | `/api/accounting/settings` | server/src/routes/accounting.ts:452 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:84; +9) |  |
| 140 | GET | `/api/accounting/fiscal-profile` | server/src/routes/accounting.ts:455 | sim (server/src/controllers/__tests__/companyFiscalProfile.sped.integration.test.ts:155; +3) |  |
| 141 | PUT | `/api/accounting/fiscal-profile` | server/src/routes/accounting.ts:456 | sim (server/src/controllers/__tests__/accountingPolicyVersion.integration.test.ts:80; +21) |  |
| 142 | GET | `/api/accounting/service-fiscal-profiles` | server/src/routes/accounting.ts:458 | **não** | Lote 4+ — leitura/relatório (A7) |
| 143 | GET | `/api/accounting/service-fiscal-profiles/:serviceRef` | server/src/routes/accounting.ts:459 | **não** | Lote 4+ — leitura/relatório (A7) |
| 144 | PUT | `/api/accounting/service-fiscal-profiles/:serviceRef` | server/src/routes/accounting.ts:460 | **não** | Lotes 2–3 — escrita cadastral |
| 145 | DELETE | `/api/accounting/service-fiscal-profiles/:serviceRef` | server/src/routes/accounting.ts:461 | **não** | Lotes 2–3 — escrita cadastral |
| 146 | GET | `/api/accounting/product-fiscal-profiles` | server/src/routes/accounting.ts:463 | sim (server/src/features/accounting/services/__tests__/productFiscalProfile.integration.test.ts:58) |  |
| 147 | GET | `/api/accounting/product-fiscal-profiles/:productRef` | server/src/routes/accounting.ts:464 | sim (server/src/features/accounting/services/__tests__/productFiscalProfile.integration.test.ts:43; +2) |  |
| 148 | PUT | `/api/accounting/product-fiscal-profiles/:productRef` | server/src/routes/accounting.ts:465 | sim (server/src/features/accounting/services/__tests__/productFiscalProfile.integration.test.ts:36; +5) |  |
| 149 | DELETE | `/api/accounting/product-fiscal-profiles/:productRef` | server/src/routes/accounting.ts:466 | sim (server/src/features/accounting/services/__tests__/productFiscalProfile.integration.test.ts:64) |  |
| 150 | GET | `/api/accounting/iss-beneficios-municipais` | server/src/routes/accounting.ts:468 | sim (server/src/controllers/__tests__/unitGuard.fiscal.integration.test.ts:61; +6) |  |
| 151 | POST | `/api/accounting/iss-beneficios-municipais` | server/src/routes/accounting.ts:469 | sim (server/src/controllers/__tests__/unitGuard.fiscal.integration.test.ts:59; +4) |  |
| 152 | GET | `/api/accounting/iss-beneficios-municipais/:id` | server/src/routes/accounting.ts:470 | sim (server/src/features/accounting/services/__tests__/issBeneficioMunicipal.integration.test.ts:88; +1) |  |
| 153 | PUT | `/api/accounting/iss-beneficios-municipais/:id` | server/src/routes/accounting.ts:471 | sim (server/src/features/accounting/services/__tests__/issBeneficioMunicipal.integration.test.ts:83) |  |
| 154 | DELETE | `/api/accounting/iss-beneficios-municipais/:id` | server/src/routes/accounting.ts:472 | sim (server/src/features/accounting/services/__tests__/issBeneficioMunicipal.integration.test.ts:86) |  |
| 155 | GET | `/api/accounting/tax-optimization/policy` | server/src/routes/accounting.ts:474 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:53; +2) |  |
| 156 | PUT | `/api/accounting/tax-optimization/policy` | server/src/routes/accounting.ts:475 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:40) |  |
| 157 | GET | `/api/accounting/tax-optimization/service-costs` | server/src/routes/accounting.ts:476 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:156) |  |
| 158 | POST | `/api/accounting/tax-optimization/service-costs` | server/src/routes/accounting.ts:477 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:151; +1) |  |
| 159 | DELETE | `/api/accounting/tax-optimization/service-costs/:id` | server/src/routes/accounting.ts:478 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:155) |  |
| 160 | GET | `/api/accounting/tax-optimization/suggestions` | server/src/routes/accounting.ts:479 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:131) |  |
| 161 | POST | `/api/accounting/tax-optimization/suggestions/:id/accept` | server/src/routes/accounting.ts:480 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:43 (helper); +1) |  |
| 162 | POST | `/api/accounting/tax-optimization/suggestions/:id/reject` | server/src/routes/accounting.ts:481 | sim (server/src/features/accounting/services/__tests__/taxOptimization.integration.test.ts:43 (helper)) |  |
| 163 | GET | `/api/accounting/simples/simulacoes/fator-r` | server/src/routes/accounting.ts:484 | sim (server/src/features/accounting/services/__tests__/taxSimulation.integration.test.ts:100; +2) |  |
| 164 | POST | `/api/accounting/simples/simulacoes/fator-r/sugestao` | server/src/routes/accounting.ts:485 | **não** | Lote 4+ — leitura/relatório (A7) |
| 165 | GET | `/api/accounting/simulacoes/regime` | server/src/routes/accounting.ts:486 | sim (server/src/features/accounting/services/__tests__/taxSimulation.integration.test.ts:78; +1) |  |
| 166 | POST | `/api/accounting/simulacoes/regime/sugestao` | server/src/routes/accounting.ts:487 | sim (server/src/features/accounting/services/__tests__/taxSimulation.integration.test.ts:85) |  |
| 167 | GET | `/api/accounting/simulacoes/remuneracao-socio` | server/src/routes/accounting.ts:488 | sim (server/src/features/accounting/services/__tests__/taxSimulation.integration.test.ts:34; +4) |  |
| 168 | POST | `/api/accounting/simulacoes/remuneracao-socio/sugestao` | server/src/routes/accounting.ts:489 | sim (server/src/features/accounting/services/__tests__/taxSimulation.integration.test.ts:41; +2) |  |
| 169 | GET | `/api/accounting/tax-optimization/report` | server/src/routes/accounting.ts:490 | sim (server/src/features/accounting/services/__tests__/eficienciaFiscalPr4.integration.test.ts:47) |  |
| 170 | POST | `/api/accounting/tax-optimization/servicos/avaliar` | server/src/routes/accounting.ts:492 | sim (server/src/controllers/__tests__/servicoFiscalAvaliacao.integration.test.ts:44) |  |
| 171 | GET | `/api/accounting/product-destinations` | server/src/routes/accounting.ts:494 | sim (server/src/controllers/__tests__/productDestination.integration.test.ts:30) |  |
| 172 | PUT | `/api/accounting/product-destinations` | server/src/routes/accounting.ts:495 | sim (server/src/controllers/__tests__/productDestination.integration.test.ts:29) |  |
| 173 | DELETE | `/api/accounting/product-destinations/:productRef` | server/src/routes/accounting.ts:496 | sim (server/src/controllers/__tests__/productDestination.integration.test.ts:31) |  |
| 174 | GET | `/api/accounting/company-fiscal-profile/:ano/obligations` | server/src/routes/accounting.ts:499 | sim (server/src/controllers/__tests__/companyFiscalProfile.integration.test.ts:26; +3) |  |
| 175 | POST | `/api/accounting/company-fiscal-profile/:ano/copiar-de/:anoAnterior` | server/src/routes/accounting.ts:500 | sim (server/src/controllers/__tests__/companyFiscalProfile.formaLalur.integration.test.ts:80; +5) |  |
| 176 | POST | `/api/accounting/company-fiscal-profile/:ano/ecf-transmitida` | server/src/routes/accounting.ts:501 | sim (server/src/controllers/__tests__/companyFiscalProfile.sped.integration.test.ts:110; +2) |  |
| 177 | GET | `/api/accounting/company-fiscal-profile/:ano` | server/src/routes/accounting.ts:502 | sim (server/src/controllers/__tests__/companyFiscalProfile.integration.test.ts:25; +3) |  |
| 178 | PUT | `/api/accounting/company-fiscal-profile/:ano` | server/src/routes/accounting.ts:503 | sim (server/src/controllers/__tests__/companyFiscalProfile.formaLalur.integration.test.ts:21; +26) |  |
| 179 | DELETE | `/api/accounting/company-fiscal-profile/:ano` | server/src/routes/accounting.ts:504 | sim (server/src/controllers/__tests__/companyFiscalProfile.formaLalur.integration.test.ts:72; +3) |  |
| 180 | GET | `/api/accounting/company-signers` | server/src/routes/accounting.ts:505 | sim (server/src/controllers/__tests__/companyFiscalProfile.integration.test.ts:81) |  |
| 181 | POST | `/api/accounting/company-signers` | server/src/routes/accounting.ts:506 | sim (server/src/controllers/__tests__/companyFiscalProfile.integration.test.ts:77; +3) |  |
| 182 | GET | `/api/accounting/company-signers/:id` | server/src/routes/accounting.ts:507 | **não** | Lote 4+ — leitura/relatório (A7) |
| 183 | PUT | `/api/accounting/company-signers/:id` | server/src/routes/accounting.ts:508 | sim (server/src/controllers/__tests__/companyFiscalProfile.integration.test.ts:83) |  |
| 184 | DELETE | `/api/accounting/company-signers/:id` | server/src/routes/accounting.ts:509 | sim (server/src/controllers/__tests__/companyFiscalProfile.integration.test.ts:161) |  |
| 185 | GET | `/api/accounting/partners` | server/src/routes/accounting.ts:511 | sim (server/src/controllers/__tests__/partner.integration.test.ts:21; +1) |  |
| 186 | POST | `/api/accounting/partners` | server/src/routes/accounting.ts:512 | sim (server/src/controllers/__tests__/partner.integration.test.ts:20; +3) |  |
| 187 | GET | `/api/accounting/partners/:id` | server/src/routes/accounting.ts:513 | sim (server/src/controllers/__tests__/partner.integration.test.ts:120; +1) |  |
| 188 | PUT | `/api/accounting/partners/:id` | server/src/routes/accounting.ts:514 | sim (server/src/controllers/__tests__/partner.integration.test.ts:61; +2) |  |
| 189 | DELETE | `/api/accounting/partners/:id` | server/src/routes/accounting.ts:515 | sim (server/src/controllers/__tests__/partner.integration.test.ts:121; +2) |  |
| 190 | GET | `/api/accounting/withholding-profiles` | server/src/routes/accounting.ts:517 | sim (server/src/controllers/__tests__/retencoesFontePr1.integration.test.ts:148; +1) |  |
| 191 | POST | `/api/accounting/withholding-profiles` | server/src/routes/accounting.ts:518 | sim (server/src/controllers/__tests__/reinfPr1.integration.test.ts:59; +3) |  |
| 192 | GET | `/api/accounting/withholding-profiles/:id` | server/src/routes/accounting.ts:519 | sim (server/src/controllers/__tests__/retencoesFontePr1.integration.test.ts:166; +1) |  |
| 193 | PATCH | `/api/accounting/withholding-profiles/:id` | server/src/routes/accounting.ts:520 | sim (server/src/controllers/__tests__/retencoesFontePr1.integration.test.ts:150; +1) |  |
| 194 | DELETE | `/api/accounting/withholding-profiles/:id` | server/src/routes/accounting.ts:521 | sim (server/src/controllers/__tests__/retencoesFontePr1.integration.test.ts:169) |  |
| 195 | GET | `/api/accounting/withholdings/summary` | server/src/routes/accounting.ts:523 | sim (server/src/controllers/__tests__/retencoesFontePr2.integration.test.ts:254; +1) |  |
| 196 | GET | `/api/accounting/withholdings` | server/src/routes/accounting.ts:524 | sim (server/src/controllers/__tests__/retencoesFontePr2.integration.test.ts:342; +1) |  |
| 197 | POST | `/api/accounting/profit-distributions/preview` | server/src/routes/accounting.ts:526 | sim (server/src/__tests__/profitDistribution.integration.test.ts:166; +2) |  |
| 198 | GET | `/api/accounting/profit-distributions/irrf` | server/src/routes/accounting.ts:527 | sim (server/src/__tests__/profitDistribution.integration.test.ts:287) |  |
| 199 | POST | `/api/accounting/profit-distributions` | server/src/routes/accounting.ts:528 | sim (server/src/controllers/__tests__/reinfPr2.integration.test.ts:36; +1) |  |
| 200 | GET | `/api/accounting/profit-distributions/:id` | server/src/routes/accounting.ts:529 | sim (server/src/__tests__/profitDistribution.integration.test.ts:296) |  |
| 201 | POST | `/api/accounting/profit-distributions/:id/lancamento` | server/src/routes/accounting.ts:530 | sim (server/src/__tests__/profitDistribution.integration.test.ts:218; +1) |  |
| 202 | POST | `/api/accounting/profit-distributions/:id/cancel` | server/src/routes/accounting.ts:531 | sim (server/src/__tests__/profitDistribution.integration.test.ts:269) |  |
| 203 | POST | `/api/accounting/jcp/preview` | server/src/routes/accounting.ts:533 | sim (server/src/__tests__/jcpConfirm.integration.test.ts:101; +1) |  |
| 204 | POST | `/api/accounting/jcp` | server/src/routes/accounting.ts:535 | sim (server/src/__tests__/jcpConfirm.integration.test.ts:105; +1) |  |
| 205 | GET | `/api/accounting/jcp/irrf` | server/src/routes/accounting.ts:536 | sim (server/src/__tests__/jcpConfirm.integration.test.ts:233) |  |
| 206 | GET | `/api/accounting/jcp/:id` | server/src/routes/accounting.ts:537 | **não** | Lote 4+ — leitura/relatório (A7) |
| 207 | POST | `/api/accounting/jcp/:id/lancamento` | server/src/routes/accounting.ts:538 | sim (server/src/__tests__/jcpConfirm.integration.test.ts:188; +1) |  |
| 208 | POST | `/api/accounting/jcp/:id/cancel` | server/src/routes/accounting.ts:539 | sim (server/src/__tests__/jcpConfirm.integration.test.ts:215) |  |
| 209 | GET | `/api/accounting/depreciation-rates` | server/src/routes/accounting.ts:543 | sim (server/src/controllers/__tests__/depreciationRateController.integration.test.ts:39; +9) |  |
| 210 | POST | `/api/accounting/depreciation-rates` | server/src/routes/accounting.ts:544 | sim (server/src/controllers/__tests__/depreciationRateController.integration.test.ts:40; +10) |  |
| 211 | POST | `/api/accounting/depreciation-rates/:id/hide` | server/src/routes/accounting.ts:545 | sim (server/src/controllers/__tests__/depreciationRateController.integration.test.ts:41; +4) |  |
| 212 | GET | `/api/accounting/fixed-asset-classes` | server/src/routes/accounting.ts:548 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:61) |  |
| 213 | POST | `/api/accounting/fixed-asset-classes` | server/src/routes/accounting.ts:549 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:67; +12) |  |
| 214 | PATCH | `/api/accounting/fixed-asset-classes/:id` | server/src/routes/accounting.ts:550 | **não** | Lotes 2–3 — escrita cadastral |
| 215 | DELETE | `/api/accounting/fixed-asset-classes/:id` | server/src/routes/accounting.ts:551 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:114; +1) |  |
| 216 | POST | `/api/accounting/fixed-assets/depreciation/run` | server/src/routes/accounting.ts:555 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:225; +7) |  |
| 217 | POST | `/api/accounting/fixed-assets/reconcile` | server/src/routes/accounting.ts:556 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:374; +2) |  |
| 218 | GET | `/api/accounting/fixed-assets` | server/src/routes/accounting.ts:557 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:62; +1) |  |
| 219 | GET | `/api/accounting/fixed-assets/:id` | server/src/routes/accounting.ts:558 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:158) |  |
| 220 | POST | `/api/accounting/fixed-assets` | server/src/routes/accounting.ts:559 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:74; +13) |  |
| 221 | PUT | `/api/accounting/fixed-assets/:id` | server/src/routes/accounting.ts:560 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:143) |  |
| 222 | DELETE | `/api/accounting/fixed-assets/:id` | server/src/routes/accounting.ts:561 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:119) |  |
| 223 | POST | `/api/accounting/fixed-assets/:id/activate` | server/src/routes/accounting.ts:562 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:82; +9) |  |
| 224 | POST | `/api/accounting/fixed-assets/:id/dispose` | server/src/routes/accounting.ts:563 | sim (server/src/controllers/__tests__/fixedAssetController.integration.test.ts:178; +5) |  |
| 225 | POST | `/api/accounting/ibs-cbs-assessments/preview` | server/src/routes/accounting.ts:566 | sim (server/src/controllers/__tests__/bankSettlementSplit.integration.test.ts:132; +6) |  |
| 226 | POST | `/api/accounting/ibs-cbs-assessments` | server/src/routes/accounting.ts:567 | sim (server/src/controllers/__tests__/ibsCbsAssessment.integration.test.ts:50; +4) |  |
| 227 | GET | `/api/accounting/ibs-cbs-assessments` | server/src/routes/accounting.ts:568 | sim (server/src/controllers/__tests__/ibsCbsAssessment.integration.test.ts:51) |  |
| 228 | POST | `/api/accounting/ibs-cbs-assessments/:id/provisao` | server/src/routes/accounting.ts:569 | sim (server/src/__tests__/ibsCbsProvision.integration.test.ts:57) |  |
| 229 | GET | `/api/accounting/ibs-cbs-assessments/:id/resumo` | server/src/routes/accounting.ts:570 | sim (server/src/__tests__/ibsCbsPr5.integration.test.ts:46; +2) |  |
| 230 | POST | `/api/accounting/payables/:id/ibs-cbs-credits/apropriar` | server/src/routes/accounting.ts:572 | sim (server/src/__tests__/ibsCbsCredito.integration.test.ts:86) |  |
| 231 | GET | `/api/accounting/:unitId/periods` | server/src/routes/accounting.ts:576 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:144; +3) |  |
| 232 | POST | `/api/accounting/:unitId/periods/seed-year` | server/src/routes/accounting.ts:577 | sim (server/src/controllers/__tests__/accountingController.periods.integration.test.ts:129; +1) |  |
| 233 | POST | `/api/accounting/periods/:id/open` | server/src/routes/accounting.ts:578 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:66; +2) |  |
| 234 | POST | `/api/accounting/periods/:id/soft-close` | server/src/routes/accounting.ts:579 | sim (server/src/controllers/__tests__/accountingController.periods.integration.test.ts:206; +1) |  |
| 235 | POST | `/api/accounting/periods/:id/hard-close` | server/src/routes/accounting.ts:580 | sim (server/src/controllers/__tests__/accountingController.periods.integration.test.ts:279; +1) |  |
| 236 | POST | `/api/accounting/periods/:id/reopen` | server/src/routes/accounting.ts:581 | sim (server/src/controllers/__tests__/accountantAssignment.integration.test.ts:63; +2) |  |
| 237 | POST | `/api/nfe/preview` | server/src/routes/nfe.ts:17 | sim (server/src/controllers/__tests__/nfeController.preview.integration.test.ts:40; +7) |  |
| 238 | POST | `/api/nfe/purchase` | server/src/routes/nfe.ts:18 | sim (server/src/controllers/__tests__/nfeController.purchase.regime.integration.test.ts:28; +2) |  |
| 239 | POST | `/api/nfe/sale` | server/src/routes/nfe.ts:19 | sim (server/src/controllers/__tests__/nfeController.purchase.signature.integration.test.ts:141; +1) |  |
| 240 | GET | `/api/nfe/dfe/status` | server/src/routes/dfe.ts:36 | **não** | PILOTO-DFE (leitura) |
| 241 | POST | `/api/nfe/dfe/preview` | server/src/routes/dfe.ts:37 | **não** | PILOTO-DFE (escrita fiscal) |
| 242 | POST | `/api/nfe/dfe/documents` | server/src/routes/dfe.ts:38 | **não** | PILOTO-DFE (escrita fiscal) |
| 243 | GET | `/api/nfe/dfe/documents` | server/src/routes/dfe.ts:39 | **não** | PILOTO-DFE (leitura) |
| 244 | GET | `/api/nfe/dfe/documents/:id` | server/src/routes/dfe.ts:40 | **não** | PILOTO-DFE (leitura) |
| 245 | POST | `/api/nfe/dfe/documents/:id/consultar` | server/src/routes/dfe.ts:41 | **não** | PILOTO-DFE (escrita fiscal) |
| 246 | POST | `/api/nfe/dfe/documents/:id/reenviar` | server/src/routes/dfe.ts:42 | **não** | PILOTO-DFE (escrita fiscal) |
| 247 | POST | `/api/nfe/dfe/documents/:id/cancelar` | server/src/routes/dfe.ts:43 | **não** | PILOTO-DFE (escrita fiscal) |
| 248 | POST | `/api/nfe/dfe/documents/:id/substituir` | server/src/routes/dfe.ts:45 | **não** | PILOTO-DFE (escrita fiscal) |
| 249 | GET | `/api/nfe/dfe/documents/:id/ficha` | server/src/routes/dfe.ts:47 | **não** | PILOTO-DFE (leitura) |
| 250 | GET | `/api/nfe/dfe/documents/:id/danfe` | server/src/routes/dfe.ts:49 | sim (server/src/controllers/__tests__/danfe.integration.test.ts:31; +1) |  |
| 251 | POST | `/api/nfe/dfe/documents/:id/retorno-manual` | server/src/routes/dfe.ts:50 | **não** | PILOTO-DFE (escrita fiscal) |
| 252 | POST | `/api/nfe/dfe/documents/:id/rejeicao-manual` | server/src/routes/dfe.ts:51 | **não** | PILOTO-DFE (escrita fiscal) |
| 253 | POST | `/api/nfe/dfe/documents/:id/cancelamento-manual` | server/src/routes/dfe.ts:52 | **não** | PILOTO-DFE (escrita fiscal) |
| 254 | POST | `/api/nfe/dfe/inutilizacoes` | server/src/routes/dfe.ts:54 | **não** | PILOTO-DFE (escrita fiscal) |
| 255 | GET | `/api/nfe/dfe/inutilizacoes/pendentes` | server/src/routes/dfe.ts:55 | **não** | PILOTO-DFE (leitura) |
| 256 | POST | `/api/nfe/dfe/webhook/:partner` | server/src/routes/dfe.ts:58 | **não** | PILOTO-DFE (escrita fiscal) |
