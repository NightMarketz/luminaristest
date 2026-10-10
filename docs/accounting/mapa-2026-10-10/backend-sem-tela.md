# Mapa: backend contábil/fiscal/financeiro SEM tela no frontend

Base: worktree `brief-fe-tarifa-f7-b13fea` = origin/main `845d79ce` (10/10/2026). Só leitura.

**Resumo:** 265 operações HTTP no domínio (21 arquivos de rota + `collectionCharges.ts`). **175 consumidas** por tela,
**5 só no service** (o método existe em `my-app/lib/services/*`, mas nenhum componente o chama), **83 sem tela** e
**2 webhooks** servidor-a-servidor (não são caso de tela). Os maiores blocos sem tela são **Apuração de tributos + Simples
+ MIT (24 rotas)**, que têm BRIEF de FE (#585) ainda não executado, e **Cobrança MP (12 rotas)**, cujo BRIEF de FE existe
mas ainda não foi commitado nem executado.

## Método e grau

- Rotas: extraídas por regex dos arquivos de `server/src/routes/` montados em `routes/index.ts`, com o prefixo de cada
  mount. **Verificado:** o diff contra `server/public/openapi.json` dá 265 × 260. As 5 que faltam no openapi são
  `PATCH /api/accounting/accounts/{id}/requires-dimension` e as 4 de `/api/counterparties` (lacuna da documentação, não
  da API). Não há rota no openapi que falte nas rotas.
- Consumo no FE: chamadas `apiClient.<método>(path)`, `fetch`/`postMultipart`/stream em `my-app/lib/services/*.service.ts`.
  Fora de `lib/services` não há chamada a rota contábil (**verificado** por grep de `apiClient.`/`fetch(` em
  features/pages/components). Os paths com `${BASE}`/`${enc(id)}` foram normalizados para `*`, e o método HTTP foi casado.
- "Tela": o método do service precisa ter chamador em `features/`, `pages/` ou `components/` (fora de `__tests__`).
  **Verificado** com o diff entre os métodos definidos e os chamados (`xService.metodo`, inclusive chamada encadeada
  em linha nova). Nenhum componente de `features/accounting` está órfão de import. Todas as abas estão em
  `AccountingView.TABS` (`pages/accounting/index.tsx`).
- Limitação (assumido): não abri o navegador. "Consumida" quer dizer que um componente montado chama a rota, não que o
  fluxo funciona na tela. As abas fora de `DELEGATED_TABS` ficam escondidas no modo cliente.

## Tabela completa de rotas

| # | Método | Path | Arquivo de rota → handler | Consumida? | Arquivo FE (service#método) |
|---|---|---|---|---|---|
| 1 | POST | `/api/accounting/post` | accounting.ts → postEntry | CONSUMIDA | accounting.service.ts#postEntry |
| 2 | POST | `/api/accounting/reverse` | accounting.ts → reverseEntry | CONSUMIDA | accounting.service.ts#reverseEntry |
| 3 | GET | `/api/accounting/trial-balance` | accounting.ts → getTrialBalance | CONSUMIDA | accounting.service.ts#getTrialBalance |
| 4 | GET | `/api/accounting/ledger` | accounting.ts → getAccountLedger | CONSUMIDA | accounting.service.ts#getAccountLedger |
| 5 | GET | `/api/accounting/balance-sheet` | accounting.ts → getBalanceSheet | CONSUMIDA | accounting.service.ts#getBalanceSheet |
| 6 | GET | `/api/accounting/income-statement` | accounting.ts → getIncomeStatement | CONSUMIDA | accounting.service.ts#getIncomeStatement |
| 7 | GET | `/api/accounting/reports/cash-flow` | accounting.ts → getCashFlow | CONSUMIDA | accounting.service.ts#getCashFlow |
| 8 | GET | `/api/accounting/reports/period-comparison` | accounting.ts → getPeriodComparison | CONSUMIDA | accounting.service.ts#getPeriodComparison |
| 9 | GET | `/api/accounting/reports/daily-journal` | accounting.ts → getDailyJournal | CONSUMIDA | accounting.service.ts#getDailyJournal |
| 10 | GET | `/api/accounting/reports/aging` | accounting.ts → getAging | CONSUMIDA | accounting.service.ts#getAging |
| 11 | GET | `/api/accounting/reports/cash-forecast` | accounting.ts → getCashForecast | CONSUMIDA | accounting.service.ts#getCashForecast |
| 12 | GET | `/api/accounting/reports/tie-out` | accounting.ts → getTieOutDiagnostic | SEM TELA | — |
| 13 | GET | `/api/accounting/audit/verify-chain` | accounting.ts → getVerifyAuditChain | CONSUMIDA | accounting.service.ts#verifyAuditChain |
| 14 | GET | `/api/accounting/accounts` | accounting.ts → listAccounts | CONSUMIDA | accounting.service.ts#getAccounts |
| 15 | POST | `/api/accounting/accounts` | accounting.ts → createAccount | CONSUMIDA | accounting.service.ts#createAccount |
| 16 | DELETE | `/api/accounting/accounts/:id` | accounting.ts → deleteAccount | CONSUMIDA | accounting.service.ts#deleteAccount |
| 17 | PATCH | `/api/accounting/accounts/:id/requires-dimension` | accounting.ts → setAccountRequiresDimension | CONSUMIDA | accounting.service.ts#setAccountRequiresDimension |
| 18 | GET | `/api/accounting/entries` | accounting.ts → listEntries | CONSUMIDA | accounting.service.ts#listEntries |
| 19 | GET | `/api/accounting/journal-entries/:entryId/receipt` | accounting.ts → getEntryReceipt | CONSUMIDA | accounting.service.ts#downloadReceipt |
| 20 | POST | `/api/accounting/attachments` | accounting.ts → createDocumentAttachment | SEM TELA | — |
| 21 | GET | `/api/accounting/attachments/:id` | accounting.ts → downloadDocumentAttachment | CONSUMIDA | accounting.service.ts#downloadDocumentAttachment |
| 22 | DELETE | `/api/accounting/attachments/:id` | accounting.ts → deleteDocumentAttachment | SEM TELA | — |
| 23 | GET | `/api/accounting/journal-entries/:journalEntryId/attachments` | accounting.ts → listDocumentAttachments | SEM TELA | — |
| 24 | POST | `/api/accounting/journal-entries/:entryId/source-documents` | accounting.ts → attachSourceDocument | SEM TELA | — |
| 25 | GET | `/api/accounting/journal-entries/:entryId/source-documents` | accounting.ts → listSourceDocuments | CONSUMIDA | accounting.service.ts#listSourceDocuments |
| 26 | POST | `/api/accounting/data-exchange/exports` | accounting.ts → createDataExchangeExport | CONSUMIDA | dataExchange.service.ts#exportReport |
| 27 | POST | `/api/accounting/data-exchange/imports` | accounting.ts → createDataExchangeImport | CONSUMIDA | dataExchange.service.ts#importFile |
| 28 | GET | `/api/accounting/data-exchange/jobs` | accounting.ts → listDataExchangeJobs | CONSUMIDA | dataExchange.service.ts#listJobs |
| 29 | GET | `/api/accounting/data-exchange/jobs/:jobId` | accounting.ts → getDataExchangeJob | SÓ SERVICE | dataExchange.service.ts#getJob (método sem chamador em componente) |
| 30 | GET | `/api/accounting/data-exchange/jobs/:jobId/rows` | accounting.ts → listDataExchangeRows | CONSUMIDA | dataExchange.service.ts#getRows |
| 31 | GET | `/api/accounting/data-exchange/jobs/:jobId/download` | accounting.ts → downloadDataExchangeArtifact | CONSUMIDA | dataExchange.service.ts#downloadArtifact |
| 32 | POST | `/api/accounting/data-exchange/jobs/:jobId/commit` | accounting.ts → commitDataExchangeImport | CONSUMIDA | dataExchange.service.ts#commit |
| 33 | POST | `/api/accounting/data-exchange/jobs/:jobId/waive-ecf-rectification` | accounting.ts → waiveEcfRectification | SEM TELA | — |
| 34 | GET | `/api/accounting/sped/qualif-assinante` | accounting.ts → getSpedQualifAssinante | CONSUMIDA | sped.service.ts#getQualifAssinante |
| 35 | POST | `/api/accounting/sped/ecd/generate` | accounting.ts → generateSpedEcd | CONSUMIDA | sped.service.ts#generateAndDownloadEcd |
| 36 | POST | `/api/accounting/sped/ecf/generate` | accounting.ts → generateSpedEcf | CONSUMIDA | sped.service.ts#generateAndDownloadEcf |
| 37 | POST | `/api/accounting/sped/ecf/real/generate` | accounting.ts → generateSpedEcfReal | CONSUMIDA | sped.service.ts#generateAndDownloadEcfReal |
| 38 | POST | `/api/accounting/closing/exercise` | accounting.ts → closeExercise | CONSUMIDA | accounting.service.ts#closeExercise |
| 39 | POST | `/api/accounting/reconciliation/statements` | accounting.ts → importBankStatement | CONSUMIDA | accounting.service.ts#importBankStatement |
| 40 | GET | `/api/accounting/reconciliation/statements` | accounting.ts → listBankStatements | CONSUMIDA | accounting.service.ts#listBankStatements |
| 41 | GET | `/api/accounting/reconciliation/statements/:id/lines` | accounting.ts → listBankStatementLines | CONSUMIDA | accounting.service.ts#listStatementLines |
| 42 | DELETE | `/api/accounting/reconciliation/statements/:id` | accounting.ts → deleteBankStatement | CONSUMIDA | accounting.service.ts#deleteBankStatement |
| 43 | POST | `/api/accounting/reconciliation/statements/:id/auto-match` | accounting.ts → autoMatchBankStatement | CONSUMIDA | accounting.service.ts#autoMatchStatement |
| 44 | GET | `/api/accounting/reconciliation/lines/:id/suggestions` | accounting.ts → getLineSuggestions | CONSUMIDA | accounting.service.ts#getLineSuggestions |
| 45 | POST | `/api/accounting/reconciliation/lines/:id/ignore` | accounting.ts → setLineIgnored | CONSUMIDA | accounting.service.ts#setLineIgnored |
| 46 | POST | `/api/accounting/reconciliation/matches` | accounting.ts → createManualMatch | CONSUMIDA | accounting.service.ts#createMatch |
| 47 | POST | `/api/accounting/reconciliation/matches/:id/unmatch` | accounting.ts → unmatchReconciliation | CONSUMIDA | accounting.service.ts#unmatch |
| 48 | GET | `/api/accounting/reconciliation/pending` | accounting.ts → getPendingReport | CONSUMIDA | accounting.service.ts#getPendingReport |
| 49 | PUT | `/api/accounting/referential/mappings` | accounting.ts → setReferentialMapping | SEM TELA | — |
| 50 | POST | `/api/accounting/referential/mappings/batch` | accounting.ts → batchSetReferentialMappings | CONSUMIDA | referential.service.ts#batchSet |
| 51 | POST | `/api/accounting/referential/mappings/copy` | accounting.ts → copyReferentialMappingVersion | CONSUMIDA | referential.service.ts#copyVersion |
| 52 | DELETE | `/api/accounting/referential/mappings` | accounting.ts → unsetReferentialMapping | SÓ SERVICE | referential.service.ts#unset (método sem chamador em componente) |
| 53 | GET | `/api/accounting/referential/mappings` | accounting.ts → listReferentialMappings | SÓ SERVICE | referential.service.ts#listMappings (método sem chamador em componente) |
| 54 | GET | `/api/accounting/referential/coverage` | accounting.ts → getReferentialCoverage | CONSUMIDA | referential.service.ts#getCoverage |
| 55 | GET | `/api/accounting/referential/skeleton` | accounting.ts → getReferentialSkeleton | SÓ SERVICE | referential.service.ts#getSkeleton (método sem chamador em componente) |
| 56 | POST | `/api/accounting/referential/catalog/import` | accounting.ts → importReferentialCatalog | CONSUMIDA | referential.service.ts#importCatalog |
| 57 | GET | `/api/accounting/referential/catalog` | accounting.ts → listReferentialCatalog | SEM TELA | — |
| 58 | GET | `/api/accounting/contacts` | accounting.ts → listAccountingContacts | CONSUMIDA | accountingContacts.service.ts#listContacts |
| 59 | POST | `/api/accounting/contacts` | accounting.ts → registerAccountingContact | CONSUMIDA | accountingContacts.service.ts#registerContact |
| 60 | PATCH | `/api/accounting/contacts/:id` | accounting.ts → updateAccountingContact | CONSUMIDA | accountingContacts.service.ts#updateContact |
| 61 | DELETE | `/api/accounting/contacts/:id` | accounting.ts → archiveAccountingContact | CONSUMIDA | accountingContacts.service.ts#archiveContact |
| 62 | POST | `/api/accounting/delivery/build` | accounting.ts → buildDeliveryPackage | CONSUMIDA | accountingDelivery.service.ts#build |
| 63 | POST | `/api/accounting/delivery/confirm` | accounting.ts → confirmDelivery | CONSUMIDA | accountingDelivery.service.ts#confirm |
| 64 | GET | `/api/accounting/delivery` | accounting.ts → listDeliveries | CONSUMIDA | accountingDelivery.service.ts#list |
| 65 | GET | `/api/accounting/delivery/profile` | accounting.ts → getPackageProfile | CONSUMIDA | accountingDelivery.service.ts#getProfile |
| 66 | PUT | `/api/accounting/delivery/profile` | accounting.ts → setPackageProfile | CONSUMIDA | accountingDelivery.service.ts#setProfile |
| 67 | POST | `/api/accounting/delivery/:id/retry` | accounting.ts → retryDelivery | CONSUMIDA | accountingDelivery.service.ts#retry |
| 68 | GET | `/api/accounting/delivery/:id` | accounting.ts → getDelivery | SÓ SERVICE | accountingDelivery.service.ts#get (método sem chamador em componente) |
| 69 | POST | `/api/accounting/reviews` | accounting.ts → openReview | CONSUMIDA | accountingReview.service.ts#open |
| 70 | GET | `/api/accounting/reviews` | accounting.ts → listReviews | CONSUMIDA | accountingReview.service.ts#list |
| 71 | GET | `/api/accounting/reviews/:id` | accounting.ts → getReview | CONSUMIDA | accountingReview.service.ts#get |
| 72 | POST | `/api/accounting/reviews/:id/findings` | accounting.ts → addFinding | CONSUMIDA | accountingReview.service.ts#addFinding |
| 73 | POST | `/api/accounting/reviews/:id/findings/:findingId/resolve` | accounting.ts → resolveFinding | CONSUMIDA | accountingReview.service.ts#resolveFinding |
| 74 | POST | `/api/accounting/reviews/:id/findings/:findingId/adjustment` | accounting.ts → postAdjustment | CONSUMIDA | accountingReview.service.ts#postAdjustment |
| 75 | PATCH | `/api/accounting/reviews/:id/jobs` | accounting.ts → replaceReviewJobs | CONSUMIDA | accountingReview.service.ts#replaceJobs |
| 76 | POST | `/api/accounting/reviews/:id/sign-off` | accounting.ts → signOffReview | CONSUMIDA | accountingReview.service.ts#signOff |
| 77 | POST | `/api/accounting/reviews/:id/reject` | accounting.ts → rejectReview | CONSUMIDA | accountingReview.service.ts#reject |
| 78 | POST | `/api/accounting/accountant-assignments` | accounting.ts → inviteAccountant | CONSUMIDA | accountantAssignments.service.ts#invite |
| 79 | GET | `/api/accounting/accountant-assignments` | accounting.ts → listAccountantAssignments | CONSUMIDA | accountantAssignments.service.ts#list |
| 80 | GET | `/api/accounting/accountant-assignments/mine` | accounting.ts → listMyAccountantAssignments | CONSUMIDA | accountantAssignments.service.ts#listMine |
| 81 | POST | `/api/accounting/accountant-assignments/:id/accept` | accounting.ts → acceptAccountantAssignment | CONSUMIDA | accountantAssignments.service.ts#accept |
| 82 | POST | `/api/accounting/accountant-assignments/:id/end` | accounting.ts → endAccountantAssignment | CONSUMIDA | accountantAssignments.service.ts#end |
| 83 | POST | `/api/accounting/policy-versions` | accounting.ts → proposePolicyVersion | CONSUMIDA | policyVersions.service.ts#propose |
| 84 | GET | `/api/accounting/policy-versions` | accounting.ts → listPolicyVersions | CONSUMIDA | policyVersions.service.ts#list |
| 85 | GET | `/api/accounting/policy-versions/:id` | accounting.ts → getPolicyVersion | CONSUMIDA | policyVersions.service.ts#get |
| 86 | POST | `/api/accounting/policy-versions/:id/approve` | accounting.ts → approvePolicyVersion | CONSUMIDA | policyVersions.service.ts#approve |
| 87 | POST | `/api/accounting/policy-versions/:id/reject` | accounting.ts → rejectPolicyVersion | CONSUMIDA | policyVersions.service.ts#reject |
| 88 | GET | `/api/accounting/settings` | accounting.ts → getAccountingSettings | CONSUMIDA | accounting.service.ts#getSettings |
| 89 | PUT | `/api/accounting/settings` | accounting.ts → updateAccountingSettings | CONSUMIDA | accounting.service.ts#updateSettings |
| 90 | GET | `/api/accounting/fiscal-profile` | accounting.ts → getFiscalProfile | CONSUMIDA | fiscalProfile.service.ts#getUnitProfile |
| 91 | PUT | `/api/accounting/fiscal-profile` | accounting.ts → upsertFiscalProfile | CONSUMIDA | fiscalProfile.service.ts#putUnitProfile |
| 92 | GET | `/api/accounting/service-fiscal-profiles` | accounting.ts → listServiceFiscalProfiles | CONSUMIDA | fiscalProfile.service.ts#listServiceProfiles |
| 93 | GET | `/api/accounting/service-fiscal-profiles/:serviceRef` | accounting.ts → getServiceFiscalProfile | SEM TELA | — |
| 94 | PUT | `/api/accounting/service-fiscal-profiles/:serviceRef` | accounting.ts → upsertServiceFiscalProfile | CONSUMIDA | fiscalProfile.service.ts#putServiceProfile |
| 95 | DELETE | `/api/accounting/service-fiscal-profiles/:serviceRef` | accounting.ts → deleteServiceFiscalProfile | CONSUMIDA | fiscalProfile.service.ts#deleteServiceProfile |
| 96 | GET | `/api/accounting/iss-beneficios-municipais` | accounting.ts → listIssBeneficiosMunicipais | SEM TELA | — |
| 97 | POST | `/api/accounting/iss-beneficios-municipais` | accounting.ts → createIssBeneficioMunicipal | SEM TELA | — |
| 98 | GET | `/api/accounting/iss-beneficios-municipais/:id` | accounting.ts → getIssBeneficioMunicipal | SEM TELA | — |
| 99 | PUT | `/api/accounting/iss-beneficios-municipais/:id` | accounting.ts → updateIssBeneficioMunicipal | SEM TELA | — |
| 100 | DELETE | `/api/accounting/iss-beneficios-municipais/:id` | accounting.ts → deleteIssBeneficioMunicipal | SEM TELA | — |
| 101 | GET | `/api/accounting/product-destinations` | accounting.ts → listProductDestinations | SEM TELA | — |
| 102 | PUT | `/api/accounting/product-destinations` | accounting.ts → upsertProductDestination | SEM TELA | — |
| 103 | DELETE | `/api/accounting/product-destinations/:productRef` | accounting.ts → deleteProductDestination | SEM TELA | — |
| 104 | GET | `/api/accounting/company-fiscal-profile/:ano/obligations` | accounting.ts → getCompanyObligations | SEM TELA | — |
| 105 | POST | `/api/accounting/company-fiscal-profile/:ano/copiar-de/:anoAnterior` | accounting.ts → copyCompanyFiscalProfile | SEM TELA | — |
| 106 | POST | `/api/accounting/company-fiscal-profile/:ano/ecf-transmitida` | accounting.ts → markEcfTransmitida | SEM TELA | — |
| 107 | GET | `/api/accounting/company-fiscal-profile/:ano` | accounting.ts → getCompanyFiscalProfile | SEM TELA | — |
| 108 | PUT | `/api/accounting/company-fiscal-profile/:ano` | accounting.ts → upsertCompanyFiscalProfile | SEM TELA | — |
| 109 | DELETE | `/api/accounting/company-fiscal-profile/:ano` | accounting.ts → deleteCompanyFiscalProfile | SEM TELA | — |
| 110 | GET | `/api/accounting/company-signers` | accounting.ts → listCompanySigners | SEM TELA | — |
| 111 | POST | `/api/accounting/company-signers` | accounting.ts → createCompanySigner | SEM TELA | — |
| 112 | GET | `/api/accounting/company-signers/:id` | accounting.ts → getCompanySigner | SEM TELA | — |
| 113 | PUT | `/api/accounting/company-signers/:id` | accounting.ts → updateCompanySigner | SEM TELA | — |
| 114 | DELETE | `/api/accounting/company-signers/:id` | accounting.ts → deleteCompanySigner | SEM TELA | — |
| 115 | GET | `/api/accounting/depreciation-rates` | accounting.ts → listDepreciationRates | CONSUMIDA | fixedAssets.service.ts#listRates |
| 116 | POST | `/api/accounting/depreciation-rates` | accounting.ts → createDepreciationRate | CONSUMIDA | fixedAssets.service.ts#createRate |
| 117 | POST | `/api/accounting/depreciation-rates/:id/hide` | accounting.ts → hideDepreciationRate | CONSUMIDA | fixedAssets.service.ts#hideRate |
| 118 | GET | `/api/accounting/fixed-asset-classes` | accounting.ts → listFixedAssetClasses | CONSUMIDA | fixedAssets.service.ts#listClasses |
| 119 | POST | `/api/accounting/fixed-asset-classes` | accounting.ts → createFixedAssetClass | CONSUMIDA | fixedAssets.service.ts#createClass |
| 120 | PATCH | `/api/accounting/fixed-asset-classes/:id` | accounting.ts → updateFixedAssetClass | CONSUMIDA | fixedAssets.service.ts#updateClass |
| 121 | DELETE | `/api/accounting/fixed-asset-classes/:id` | accounting.ts → deleteFixedAssetClass | CONSUMIDA | fixedAssets.service.ts#deleteClass |
| 122 | POST | `/api/accounting/fixed-assets/depreciation/run` | accounting.ts → runDepreciation | CONSUMIDA | fixedAssets.service.ts#runDepreciation |
| 123 | POST | `/api/accounting/fixed-assets/reconcile` | accounting.ts → reconcileFixedAssets | CONSUMIDA | fixedAssets.service.ts#reconcile |
| 124 | GET | `/api/accounting/fixed-assets` | accounting.ts → listFixedAssets | CONSUMIDA | fixedAssets.service.ts#listAssets |
| 125 | GET | `/api/accounting/fixed-assets/:id` | accounting.ts → getFixedAsset | SEM TELA | — |
| 126 | POST | `/api/accounting/fixed-assets` | accounting.ts → createFixedAsset | CONSUMIDA | fixedAssets.service.ts#createAsset |
| 127 | PUT | `/api/accounting/fixed-assets/:id` | accounting.ts → updateFixedAsset | CONSUMIDA | fixedAssets.service.ts#updateAsset |
| 128 | DELETE | `/api/accounting/fixed-assets/:id` | accounting.ts → deleteFixedAsset | CONSUMIDA | fixedAssets.service.ts#deleteAsset |
| 129 | POST | `/api/accounting/fixed-assets/:id/activate` | accounting.ts → activateFixedAsset | CONSUMIDA | fixedAssets.service.ts#activateAsset |
| 130 | POST | `/api/accounting/fixed-assets/:id/dispose` | accounting.ts → disposeFixedAsset | CONSUMIDA | fixedAssets.service.ts#disposeAsset |
| 131 | GET | `/api/accounting/:unitId/periods` | accounting.ts → listPeriods | CONSUMIDA | accounting.service.ts#listPeriods |
| 132 | POST | `/api/accounting/:unitId/periods/seed-year` | accounting.ts → seedYear | CONSUMIDA | accounting.service.ts#seedYear |
| 133 | POST | `/api/accounting/periods/:id/open` | accounting.ts → openPeriod | CONSUMIDA | accounting.service.ts#openPeriod |
| 134 | POST | `/api/accounting/periods/:id/soft-close` | accounting.ts → softClosePeriod | CONSUMIDA | accounting.service.ts#softClosePeriod |
| 135 | POST | `/api/accounting/periods/:id/hard-close` | accounting.ts → hardClosePeriod | CONSUMIDA | accounting.service.ts#hardClosePeriod |
| 136 | POST | `/api/accounting/periods/:id/reopen` | accounting.ts → reopenPeriod | CONSUMIDA | accounting.service.ts#reopenPeriod |
| 137 | POST | `/api/accounting-binding/compile` | accounting-binding.ts → compileBinding | SEM TELA | — |
| 138 | POST | `/api/accounting-binding/validate` | accounting-binding.ts → validateBinding | SEM TELA | — |
| 139 | POST | `/api/accounting-binding/activate-default` | accounting-binding.ts → activateDefaultBinding | SEM TELA | — |
| 140 | GET | `/api/accounting-binding` | accounting-binding.ts → listBindings | SEM TELA | — |
| 141 | POST | `/api/accounting/tax-assessments/preview` | taxAssessments.ts → previewTaxAssessment | SEM TELA | — |
| 142 | POST | `/api/accounting/tax-assessments/pis-cofins/preview` | taxAssessments.ts → previewPisCofins | SEM TELA | — |
| 143 | POST | `/api/accounting/tax-assessments/pis-cofins` | taxAssessments.ts → confirmPisCofins | SEM TELA | — |
| 144 | GET | `/api/accounting/tax-assessments` | taxAssessments.ts → listTaxAssessments | SEM TELA | — |
| 145 | GET | `/api/accounting/tax-assessments/periodos` | taxAssessments.ts → listPeriodos | SEM TELA | — |
| 146 | POST | `/api/accounting/tax-assessments` | taxAssessments.ts → confirmTaxAssessment | SEM TELA | — |
| 147 | GET | `/api/accounting/tax-assessments/:id` | taxAssessments.ts → getTaxAssessment | SEM TELA | — |
| 148 | POST | `/api/accounting/tax-assessments/:id/provisao` | taxAssessments.ts → reconcileTaxAssessmentProvisao | SEM TELA | — |
| 149 | PUT | `/api/accounting/simples/historico/:competencia` | simples.ts → putSimplesHistorico | SEM TELA | — |
| 150 | PUT | `/api/accounting/simples/segregacao/:competencia` | simples.ts → putSimplesSegregacao | SEM TELA | — |
| 151 | POST | `/api/accounting/simples/parcerias` | simples.ts → createParceria | SEM TELA | — |
| 152 | GET | `/api/accounting/simples/parcerias` | simples.ts → listParcerias | SEM TELA | — |
| 153 | PATCH | `/api/accounting/simples/parcerias/:id` | simples.ts → updateParceria | SEM TELA | — |
| 154 | DELETE | `/api/accounting/simples/parcerias/:id` | simples.ts → deleteParceria | SEM TELA | — |
| 155 | POST | `/api/accounting/simples/apuracoes/:competencia/calcular` | simples.ts → calcularApuracaoSimples | SEM TELA | — |
| 156 | GET | `/api/accounting/simples/apuracoes/:competencia` | simples.ts → getApuracaoSimples | SEM TELA | — |
| 157 | PUT | `/api/accounting/simples/apuracoes/:competencia/das` | simples.ts → putDasSimples | SEM TELA | — |
| 158 | GET | `/api/accounting/simples/aliquotas/:competencia` | simples.ts → getAliquotasSimples | SEM TELA | — |
| 159 | GET | `/api/accounting/simples/dasn-simei/:ano` | simples.ts → getDasnSimei | SEM TELA | — |
| 160 | PUT | `/api/accounting/simples/dasn-simei/:ano` | simples.ts → putDasnSimei | SEM TELA | — |
| 161 | GET | `/api/accounting/simples/defis/:ano` | simples.ts → getDefis | SEM TELA | — |
| 162 | PUT | `/api/accounting/simples/defis/:ano` | simples.ts → putDefis | SEM TELA | — |
| 163 | POST | `/api/accounting/mit-exports` | mitExports.ts → createMitExport | SEM TELA | — |
| 164 | GET | `/api/accounting/mit-exports` | mitExports.ts → listMitExports | SEM TELA | — |
| 165 | GET | `/api/legal-parameters` | legalParameters.ts → listLegalParameters | CONSUMIDA | legalParameters.service.ts#list |
| 166 | GET | `/api/legal-parameters/vigente` | legalParameters.ts → getVigenteLegalParameter | SEM TELA | — |
| 167 | GET | `/api/legal-parameters/recalc-jobs` | legalParameters.ts → listLegalParameterRecalcJobs | CONSUMIDA | legalParameters.service.ts#listRecalcJobs |
| 168 | POST | `/api/legal-parameters` | legalParameters.ts → proposeLegalParameter | CONSUMIDA | legalParameters.service.ts#propose |
| 169 | POST | `/api/legal-parameters/:id/publish` | legalParameters.ts → publishLegalParameter | CONSUMIDA | legalParameters.service.ts#publish |
| 170 | POST | `/api/legal-parameters/:id/revoke` | legalParameters.ts → revokeLegalParameter | CONSUMIDA | legalParameters.service.ts#revoke |
| 171 | POST | `/api/payables/reconcile` | payables.ts → reconcilePayables | SEM TELA | — |
| 172 | POST | `/api/payables` | payables.ts → createPayable | CONSUMIDA | accountsPayable.service.ts#createPayable |
| 173 | GET | `/api/payables` | payables.ts → listPayables | CONSUMIDA | accountsPayable.service.ts#listPayables |
| 174 | GET | `/api/payables/:id` | payables.ts → getPayable | SEM TELA | — |
| 175 | POST | `/api/payables/:id/pay` | payables.ts → registerPayment | CONSUMIDA | accountsPayable.service.ts#registerPayment |
| 176 | POST | `/api/payables/:id/cancel` | payables.ts → cancelPayable | CONSUMIDA | accountsPayable.service.ts#cancelPayable |
| 177 | POST | `/api/payables/:id/payments/:paymentId/cancel` | payables.ts → cancelPayment | CONSUMIDA | accountsPayable.service.ts#cancelPayment |
| 178 | POST | `/api/payables/:id/settlements` | payables.ts → registerPayment | SEM TELA | — |
| 179 | POST | `/api/payables/:id/settlements/:settlementId/cancel` | payables.ts → cancelSettlement | SEM TELA | — |
| 180 | POST | `/api/receivables/reconcile` | receivables.ts → reconcileReceivables | SEM TELA | — |
| 181 | POST | `/api/receivables` | receivables.ts → createReceivable | CONSUMIDA | accountsReceivable.service.ts#createReceivable |
| 182 | GET | `/api/receivables` | receivables.ts → listReceivables | CONSUMIDA | accountsReceivable.service.ts#listReceivables |
| 183 | GET | `/api/receivables/:id` | receivables.ts → getReceivable | SEM TELA | — |
| 184 | POST | `/api/receivables/:id/receive` | receivables.ts → registerReceipt | CONSUMIDA | accountsReceivable.service.ts#registerReceipt |
| 185 | POST | `/api/receivables/:id/cancel` | receivables.ts → cancelReceivable | CONSUMIDA | accountsReceivable.service.ts#cancelReceivable |
| 186 | POST | `/api/receivables/:id/receipts/:receiptId/cancel` | receivables.ts → cancelReceipt | CONSUMIDA | accountsReceivable.service.ts#cancelReceipt |
| 187 | POST | `/api/receivables/:id/settlements` | receivables.ts → registerReceipt | SEM TELA | — |
| 188 | POST | `/api/receivables/:id/settlements/:settlementId/cancel` | receivables.ts → cancelSettlement | SEM TELA | — |
| 189 | GET | `/api/dimensions` | dimensions.ts → listDimensions | CONSUMIDA | dimensions.service.ts#listCatalog |
| 190 | POST | `/api/dimensions/definitions` | dimensions.ts → createDefinition | CONSUMIDA | dimensions.service.ts#createDefinition |
| 191 | POST | `/api/dimensions/definitions/:id/archive` | dimensions.ts → archiveDefinition | CONSUMIDA | dimensions.service.ts#archiveDefinition |
| 192 | POST | `/api/dimensions/values` | dimensions.ts → createValue | CONSUMIDA | dimensions.service.ts#createValue |
| 193 | POST | `/api/dimensions/values/:id/archive` | dimensions.ts → archiveValue | CONSUMIDA | dimensions.service.ts#archiveValue |
| 194 | GET | `/api/dimensions/reports/balance` | dimensions.ts → balanceByDimension | CONSUMIDA | dimensions.service.ts#balanceByDimension |
| 195 | GET | `/api/dimensions/reports/result` | dimensions.ts → resultByDimension | CONSUMIDA | dimensions.service.ts#resultByDimension |
| 196 | GET | `/api/counterparties` | counterparties.ts → listCounterparties | CONSUMIDA | counterparties.service.ts#listCounterparties |
| 197 | POST | `/api/counterparties` | counterparties.ts → createCounterparty | CONSUMIDA | counterparties.service.ts#createCounterparty |
| 198 | GET | `/api/counterparties/:id` | counterparties.ts → getCounterparty | SEM TELA | — |
| 199 | POST | `/api/counterparties/:id/archive` | counterparties.ts → archiveCounterparty | CONSUMIDA | counterparties.service.ts#archiveCounterparty |
| 200 | POST | `/api/nfe/preview` | nfe.ts → previewNfe | CONSUMIDA | nfe.service.ts#previewNfe |
| 201 | POST | `/api/nfe/purchase` | nfe.ts → importNfePurchase | CONSUMIDA | nfe.service.ts#importPurchaseNfe |
| 202 | POST | `/api/nfe/sale` | nfe.ts → reconcileNfeSale | CONSUMIDA | nfe.service.ts#reconcileSaleNfe |
| 203 | GET | `/api/nfe/dfe/status` | dfe.ts → getDfeStatus | CONSUMIDA | dfe.service.ts#getStatus |
| 204 | POST | `/api/nfe/dfe/preview` | dfe.ts → previewFiscalDocument | CONSUMIDA | dfe.service.ts#preview |
| 205 | POST | `/api/nfe/dfe/documents` | dfe.ts → emitFiscalDocument | CONSUMIDA | dfe.service.ts#emit |
| 206 | GET | `/api/nfe/dfe/documents` | dfe.ts → listFiscalDocuments | CONSUMIDA | dfe.service.ts#listBySale |
| 207 | GET | `/api/nfe/dfe/documents/:id` | dfe.ts → getFiscalDocument | CONSUMIDA | dfe.service.ts#get |
| 208 | POST | `/api/nfe/dfe/documents/:id/consultar` | dfe.ts → consultarFiscalDocument | SEM TELA | — |
| 209 | POST | `/api/nfe/dfe/documents/:id/reenviar` | dfe.ts → reenviarFiscalDocument | CONSUMIDA | dfe.service.ts#reenviar |
| 210 | POST | `/api/nfe/dfe/documents/:id/cancelar` | dfe.ts → cancelarFiscalDocument | SEM TELA | — |
| 211 | GET | `/api/nfe/dfe/documents/:id/ficha` | dfe.ts → getFichaFiscalDocument | CONSUMIDA | dfe.service.ts#ficha |
| 212 | POST | `/api/nfe/dfe/documents/:id/retorno-manual` | dfe.ts → retornoManualFiscalDocument | CONSUMIDA | dfe.service.ts#retornoManual |
| 213 | POST | `/api/nfe/dfe/documents/:id/rejeicao-manual` | dfe.ts → rejeicaoManualFiscalDocument | CONSUMIDA | dfe.service.ts#rejeicaoManual |
| 214 | POST | `/api/nfe/dfe/documents/:id/cancelamento-manual` | dfe.ts → cancelamentoManualFiscalDocument | CONSUMIDA | dfe.service.ts#cancelamentoManual |
| 215 | POST | `/api/nfe/dfe/webhook/:partner` | dfe.ts → receiveDfeWebhook | N/A (webhook S2S) | — |
| 216 | GET | `/api/entry-approvals/pending` | entryApprovals.ts → listPendingApproval | CONSUMIDA | entryApprovals.service.ts#listPending |
| 217 | POST | `/api/entry-approvals/drafts` | entryApprovals.ts → createDraft | CONSUMIDA | entryApprovals.service.ts#createDraft |
| 218 | PUT | `/api/entry-approvals/drafts/:id` | entryApprovals.ts → updateDraft | CONSUMIDA | entryApprovals.service.ts#updateDraft |
| 219 | POST | `/api/entry-approvals/drafts/:id/submit` | entryApprovals.ts → submitEntry | CONSUMIDA | entryApprovals.service.ts#submitDraft |
| 220 | POST | `/api/entry-approvals/:id/approve` | entryApprovals.ts → approveEntry | CONSUMIDA | entryApprovals.service.ts#approve |
| 221 | POST | `/api/entry-approvals/:id/reject` | entryApprovals.ts → rejectEntry | CONSUMIDA | entryApprovals.service.ts#reject |
| 222 | POST | `/api/sales/cancel` | sales.ts → cancelSale | CONSUMIDA | sales.service.ts#cancelSale |
| 223 | POST | `/api/sales/return` | sales.ts → returnSale | CONSUMIDA | sales.service.ts#returnSale |
| 224 | POST | `/api/sales/pay` | sales.ts → registerPayment | CONSUMIDA | sales.service.ts#paySale |
| 225 | GET | `/api/package-balances` | packageBalances.ts → listPackageBalances | CONSUMIDA | packageBalances.service.ts#listBalances |
| 226 | GET | `/api/package-acceptances/notice` | packageAcceptances.ts → getValidityNotice | CONSUMIDA | packageAcceptances.service.ts#getNotice |
| 227 | POST | `/api/package-acceptances` | packageAcceptances.ts → createPackageAcceptance | CONSUMIDA | packageAcceptances.service.ts#create |
| 228 | GET | `/api/package-acceptances` | packageAcceptances.ts → getPackageAcceptance | CONSUMIDA | packageAcceptances.service.ts#getBySale |
| 229 | GET | `/api/package-acceptances/:saleId/receipt` | packageAcceptances.ts → getPackageSaleReceipt | CONSUMIDA | packageAcceptances.service.ts#downloadReceipt |
| 230 | GET | `/api/reconcile-pending` | reconcilePending.ts → listReconcilePending | SEM TELA | — |
| 231 | POST | `/api/reconcile-pending/rescan` | reconcilePending.ts → rescanReconcilePending | SEM TELA | — |
| 232 | GET | `/api/bank-settlements` | bankSettlements.ts → listBankSettlements | CONSUMIDA | bankSettlement.service.ts#list |
| 233 | POST | `/api/bank-settlements/scan` | bankSettlements.ts → scanBankSettlements | CONSUMIDA | bankSettlement.service.ts#scan |
| 234 | POST | `/api/bank-settlements/:id/confirm` | bankSettlements.ts → confirmBankSettlement | CONSUMIDA | bankSettlement.service.ts#confirm |
| 235 | POST | `/api/bank-settlements/:id/reject` | bankSettlements.ts → rejectBankSettlement | CONSUMIDA | bankSettlement.service.ts#reject |
| 236 | POST | `/api/bank-settlements/:id/retry` | bankSettlements.ts → retryBankSettlement | CONSUMIDA | bankSettlement.service.ts#retry |
| 237 | GET | `/api/lalur/catalog` | lalur.ts → getLalurCatalog | CONSUMIDA | lalur.service.ts#getCatalog, lalur.service.ts#getParteBPadrao |
| 238 | GET | `/api/lalur/entries` | lalur.ts → listLalurEntries | CONSUMIDA | lalur.service.ts#listEntries |
| 239 | POST | `/api/lalur/entries` | lalur.ts → createLalurEntry | CONSUMIDA | lalur.service.ts#createEntry |
| 240 | PATCH | `/api/lalur/entries/:id` | lalur.ts → updateLalurEntry | CONSUMIDA | lalur.service.ts#updateEntry |
| 241 | POST | `/api/lalur/entries/:id/archive` | lalur.ts → archiveLalurEntry | CONSUMIDA | lalur.service.ts#archiveEntry |
| 242 | GET | `/api/lalur/parte-b/movements` | lalur.ts → listLalurMovements | CONSUMIDA | lalur.service.ts#listMovements |
| 243 | POST | `/api/lalur/parte-b/movements` | lalur.ts → createLalurMovement | CONSUMIDA | lalur.service.ts#createMovement |
| 244 | PATCH | `/api/lalur/parte-b/movements/:id` | lalur.ts → updateLalurMovement | CONSUMIDA | lalur.service.ts#updateMovement |
| 245 | POST | `/api/lalur/parte-b/movements/:id/archive` | lalur.ts → archiveLalurMovement | CONSUMIDA | lalur.service.ts#archiveMovement |
| 246 | POST | `/api/lalur/parte-b/close` | lalur.ts → closeLalurParteB | CONSUMIDA | lalur.service.ts#closeParteB |
| 247 | POST | `/api/lalur/parte-b/reopen` | lalur.ts → reopenLalurParteB | CONSUMIDA | lalur.service.ts#reopenParteB |
| 248 | GET | `/api/lalur/parte-b/balances` | lalur.ts → getLalurParteBBalances | CONSUMIDA | lalur.service.ts#getParteBBalances |
| 249 | GET | `/api/lalur/parte-b` | lalur.ts → listLalurParteB | CONSUMIDA | lalur.service.ts#listParteB |
| 250 | POST | `/api/lalur/parte-b` | lalur.ts → createLalurParteB | CONSUMIDA | lalur.service.ts#createParteB |
| 251 | PATCH | `/api/lalur/parte-b/:id` | lalur.ts → updateLalurParteB | CONSUMIDA | lalur.service.ts#updateParteB |
| 252 | POST | `/api/lalur/parte-b/:id/archive` | lalur.ts → archiveLalurParteB | CONSUMIDA | lalur.service.ts#archiveParteB |
| 253 | GET | `/api/payment-accounts` | paymentAccounts.ts → listPaymentAccounts | SEM TELA | — |
| 254 | POST | `/api/payment-accounts` | paymentAccounts.ts → createPaymentAccount | SEM TELA | — |
| 255 | GET | `/api/payment-accounts/:id` | paymentAccounts.ts → getPaymentAccount | SEM TELA | — |
| 256 | PATCH | `/api/payment-accounts/:id` | paymentAccounts.ts → updatePaymentAccount | SEM TELA | — |
| 257 | DELETE | `/api/payment-accounts/:id` | paymentAccounts.ts → deletePaymentAccount | SEM TELA | — |
| 258 | PUT | `/api/payment-accounts/:id/credential` | paymentAccounts.ts → setPaymentAccountCredential | SEM TELA | — |
| 259 | POST | `/api/payment-accounts/:id/release-report/unblock` | paymentAccounts.ts → unblockPaymentAccountReleaseReport | SEM TELA | — |
| 260 | POST | `/api/receivables/:receivableId/charges` | collectionCharges.ts → createCollectionCharge | SEM TELA | — |
| 261 | GET | `/api/receivables/:receivableId/charges` | collectionCharges.ts → listCollectionCharges | SEM TELA | — |
| 262 | GET | `/api/receivables/:receivableId/charges/payer-suggestion` | collectionCharges.ts → getPayerSuggestion | SEM TELA | — |
| 263 | GET | `/api/collection-charges/:id` | collectionCharges.ts → getCollectionCharge | SEM TELA | — |
| 264 | POST | `/api/collection-charges/:id/cancel` | collectionCharges.ts → cancelCollectionCharge | SEM TELA | — |
| 265 | POST | `/api/payment-collection/webhook/:provider/:accountId` | collectionCharges.ts → receiveCollectionWebhook | N/A (webhook S2S) | — |

## Grupos SEM TELA (por capacidade) e situação do BRIEF de FE

"Executado" = existe código de FE que chama as rotas. Para todos os grupos abaixo, **nenhum** tem código de FE: o grep
pelo segmento distintivo dá 0 em `my-app` fora de `__tests__` (verificado). "Não executado" se segue daí.

| # | Capacidade | Rotas | BRIEF / nó de FE | Executado? |
|---|---|---|---|---|
| G1 | **Apuração de tributos IRPJ/CSLL + PIS/Cofins** (`/accounting/tax-assessments/*`: preview, confirmar, listar, `periodos`, detalhe, provisão) | 8 | `FE-INCR-TAX-ASSESSMENT-brief.md` (#585, `de378247`). Insumo §5 = nó `TAX-ASSESSMENT-PERIODOS` (BRIEF + rota `periodos`) | **Não.** O BRIEF não tem "executa". Não existe nó de FE em `docs/plano/nos/` |
| G2 | **MIT / DCTFWeb** (`/accounting/mit-exports` POST/GET) | 2 | O mesmo `FE-INCR-TAX-ASSESSMENT`, PR-5 | Não |
| G3 | **Simples Nacional: apuração, histórico, segregação, parcerias, DAS** (`/accounting/simples/apuracoes|historico|segregacao|parcerias`) | 9 | `FE-INCR-TAX-ASSESSMENT`, PR-4 §3.1. O BE (`BE-INCR-SIMPLES-NACIONAL-brief.md:12,263`) chama o nó vizinho de `FE-INCR-SIMPLES` "a abrir" | Não |
| G3b | **Simples: alíquotas, DASN-SIMEI, DEFIS** (`/simples/aliquotas/:comp`, `/dasn-simei/:ano` GET/PUT, `/defis/:ano` GET/PUT) | 5 | **Sem BRIEF.** O `FE-INCR-TAX-ASSESSMENT` não cita dasn/defis/aliquotas (grep = 0) | — |
| G4 | **Cobrança por provedor (Mercado Pago)**: conta de recebimento + credencial + desbloqueio do relatório (`/payment-accounts/*`, 7) e cobrança do título (`/receivables/:id/charges*`, `/collection-charges/:id*`, 5) | 12 | `FE-INCR-PAYMENT-PROVIDER-brief.md`: **não commitado** (untracked no worktree). Autorização do dono de 10/10, "BRIEF tela de cobrança" | Não |
| G5 | **Ativação do binding / prensa** (`/accounting-binding` compile, validate, activate-default, list) | 4 | `FE-INCR-BINDING-ACTIVATION-brief.md` (#271) + `FE-INCR-BINDING-ACTIVATION-screen-brief.md` (#552). Nó `LAC-B` = **blocked**: o KIT-SETOR passou na frente (F-KS-0 → b) | Não |
| G6 | **Perfil fiscal da empresa por ano + obrigações + ECF transmitida** (`/accounting/company-fiscal-profile/:ano*`, 6) e **signatários da empresa** (`/accounting/company-signers*`, 5) | 11 | Só citado como `FE-INCR-FISCAL-OBLIGATION-PROFILE` "incremento separado" (`BE-INCR-FISCAL-OBLIGATION-PROFILE-brief.md:316`). **Sem BRIEF.** O `FE-INCR-SPED-SIGNERS` (done, #436) usa `qualif-assinante` + contato do contador, não `company-signers` | — |
| G7 | **Benefício municipal de ISS** (`/accounting/iss-beneficios-municipais*` CRUD) | 5 | **Sem BRIEF.** Nasceu no `BE-INCR-SIMPLES-PISO-ISS-ANEXO-XI` | — |
| G8 | **Destinação de produto** (uso/consumo × revenda, `/accounting/product-destinations*`) | 3 | **Sem BRIEF.** Nó `ITEM-DESTINATION` = done como "nó de régua" | — |
| G9 | **Pendências de reconciliação do AccountingSync** (`/reconcile-pending` GET + `/rescan`) | 2 | `BE-INCR-RECONCILE-PENDING-brief.md:182` deixa a tela fora (`FE-INCR-RECONCILE-PENDING`, nó vizinho). **Sem BRIEF e sem nó** | — |
| G10 | **Reconciliação subrazão AP/AR × razão** (`POST /payables/reconcile`, `POST /receivables/reconcile`) | 2 | Sem BRIEF | — |
| G11 | **Anexo documental genérico + vínculo de documento-fonte** (`POST /accounting/attachments`, `DELETE /attachments/:id`, `GET /journal-entries/:id/attachments`, `POST /journal-entries/:id/source-documents`) | 4 | O `FE-INCR-AUDIT-PROVENANCE` (executado) cobre só a leitura dos documentos-fonte. O `FE-INCR-DFE` cobre só o download do anexo. A escrita ficou "fora de escopo". **Sem BRIEF** | — |
| G12 | **Autoria referencial ECF avulsa**: `PUT /referential/mappings` (1 conta) e `GET /referential/catalog` (lista), mais 3 "só service": `GET mappings`, `DELETE mappings`, `GET skeleton` | 5 | O `FE-INCR-COMPLIANCE-2` (executado) cobre catálogo/import, batch, copy e coverage. Os métodos `listMappings/getSkeleton/unset` existem em `referential.service.ts` sem componente | Parcial (só o service) |
| G13 | **Dispensa da ECF retificadora** (`POST /data-exchange/jobs/:id/waive-ecf-rectification`) | 1 | Sem BRIEF. Origem: `BE-INCR-FIXED-ASSETS-brief.md:229-231` [S3] | — |
| G14 | **Diagnóstico de tie-out avulso** (`GET /accounting/reports/tie-out`) | 1 | Sem BRIEF. A aba Aging mostra o `tieOut` que vem **embutido** no relatório de aging, não esta rota | — |
| G15 | **NFS-e automática** (`POST /nfe/dfe/documents/:id/consultar`, `/cancelar`) | 2 | O `FE-INCR-DFE` (done) fez o fluxo **manual**. Estas rotas servem ao emissor automático (X10i espera D1f·D5·M2; o `NullEmissor` não tem a capacidade) | Fora de escopo por desenho |
| G16 | **Leituras unitárias e aliases** (as listas já embutem o dado): `GET /payables/:id`, `GET /receivables/:id`, `GET /counterparties/:id`, `GET /fixed-assets/:id`, `GET /service-fiscal-profiles/:ref`, `GET /legal-parameters/vigente`, mais os aliases `POST /payables|receivables/:id/settlements[/:sid/cancel]` (4: o FE usa `/pay`, `/receive` e `/payments|receipts/:id/cancel`, com o mesmo handler) e 2 "só service": `GET /delivery/:id`, `GET /data-exchange/jobs/:id` | 12 | n/a: baixo valor de tela | — |
| — | Webhooks S2S: `/payment-collection/webhook/:provider/:accountId`, `/nfe/dfe/webhook/:partner` | 2 | n/a | — |

Soma: 8+2+9+5+12+4+11+5+3+2+2+4+5+1+1+2+12 = 88 = 83 sem tela + 5 só service. Mais 2 webhooks.

**Com BRIEF de FE e não executado:** G1, G2, G3 (TAX-ASSESSMENT, #585), G4 (PAYMENT-PROVIDER, não commitado), G5
(BINDING-ACTIVATION, LAC-B bloqueada).
**Sem BRIEF:** G3b, G6, G7, G8, G9, G10, G11, G13, G14 (e G12 em parte).
**Fora da contagem de rota:** o `FE-INCR-BANK-SETTLEMENT-FEE` (+ EMENDA-1, #616/#617, planned, sem "executa") não depende
de rota nova. Depende de `feeCents/feeEntryId` no `BankSettlementItemView` (#620, sem merge). O
`FE-INCR-BANK-CHARGE-ACCOUNTS` foi **CANCELADO** em 09/10 (#613).

BRIEFs de FE da lista do pedido que **já foram executados** (as rotas aparecem como consumidas):
`FE-INCR-ACCOUNTANT-GOVERNANCE` (accountant-assignments, reviews, policy-versions), `FE-INCR-AUDIT-PROVENANCE`
(verify-chain, source-documents GET), `FE-INCR-COMPLIANCE-2` (ecf/real, catalog import), `FE-INCR-LEGAL-PARAMS` (#581),
`FE-INCR-BANK-SETTLEMENT` (#436), DFE, DELIVERY, FIXED-ASSETS, LALUR, REVIEW, VENDA-PACOTE, PACOTE-VALIDADE e SALE-ACTIONS.

## Órfãs do FE (o FE chama uma rota que não existe no backend)

**Nenhuma.** Todas as chamadas extraídas de `lib/services` casam com uma rota em método e path. Incluí as que a regex
perdeu e conferi à mão: dfe `${BASE}/documents*`, nfe multipart, `catalog/import`, as listas de policy-versions e
accountant-assignments, e `source-documents`.
Observação lateral: `accountingService.getEntries` duplica `listEntries` (mesma rota `GET /accounting/entries`) e não tem
chamador. É código morto do FE, não órfão.

## Jobs e CLIs contábeis só por linha de comando

| Arquivo | O que faz | Usuário final precisaria pela tela? |
|---|---|---|
| `server/src/jobs/installSectorKitCli.ts` | Instala o KIT de setor de uma unidade (7 passos com retomada; o binding é o passo de compile) | **Sim**: é a "prensa"/onboarding. A tela prevista é a da LAC-B (bloqueada) + um `FE-INCR-KIT-SETOR` "a abrir" (`BE-INCR-KIT-SETOR-brief.md:17`). Não existe rota HTTP de instalação de kit |
| `server/src/jobs/activateAccountingBindingCli.ts` | Alias do `installSectorKitCli` desde o KIT-SETOR PR-2 | Igual ao anterior. Já existe rota `POST /accounting-binding/activate-default` sem tela (G5) |
| `server/src/jobs/accountingSyncReconcileCli.ts` (`npm run accounting:reconcile`) | Reprocessa os fatos-fonte pendentes do AccountingSync | **Sim, em parte**: a fila tem rota (`/reconcile-pending` + `/rescan`, G9), mas não tem tela. O agendador `AccountingSyncScheduler` roda sozinho |
| `server/src/jobs/rekeyLegacyUnitCli.ts` | Migração de dado: dá linha real em `units` a um `unitId` legado | Não: é operação de implantação/operador (I1b) |
| `server/src/jobs/grantPlatformAdminCli.ts` | Concede `PLATFORM_ADMIN` | Não, **por desenho**: a decisão F-LP-2 b/L-2 manda que não exista rota |
| `server/src/jobs/seedAccountingFixtureCli.ts`, `proveP2ZeroDiffCli.ts` | Seed dos runbooks H1/H2; prova zero-diff | Não (dev/CI) |
| Agendadores ligados em `server.ts:57-60` (AccountingSync, DfePoll, CollectionChargePoll, MpReleaseReport, LegalParamsRecalc) | Rodam sozinhos | Não. O `LegalParamsRecalc` já tem leitura na tela (`recalc-jobs`). Os de cobrança MP dependem da tela G4 para ter o que processar |

`server/src/scripts/` só tem auditorias de KPI (cashflow/cost/profit/revenue) e nada contábil.

## Casos adversariais tentados

1. **`GET /accounting/entries` pareceu sem tela e está consumida.** O método `accountingService.getEntries` aparecia sem
   chamador nenhum. Mas `listEntries` (mesma rota, com paginação) é chamado por `JournalEntriesPanel.tsx:285`. A
   classificação final é por (método HTTP, path) e deu CONSUMIDA. `getEntries` fica registrado como código morto.
2. **`GET /accounting/reports/tie-out` pareceu consumida e não está.** O grep por "tie-out" acha `AgingPanel.tsx` e
   `accounting.service.ts`. Lendo o código, o `AgingPanel` renderiza `report.tieOut`, que vem embutido em
   `GET /reports/aging`. A linha do service é só um comentário. Ninguém chama a rota avulsa: SEM TELA.
3. **Falso "não usado" por chamada encadeada.** Nove métodos (`getSettings`, `ficha`, `getStatus`, `getParteBPadrao`,
   `getBySale`, `getNotice`, `listBalances`...) saíam como "sem chamador" porque o código escreve `xService\n  .metodo(`.
   Refiz a checagem por `^\s*\.metodo\(` e todos estão em uso. Só sobraram os 5 "só service" listados.
4. **Checagem que falharia se o mapa estivesse errado:** o diff de rotas contra o `openapi.json` (265 × 260, as 5 de
   diferença explicadas) e o diff entre métodos definidos e usados nos services. Uma rota contada a mais ou a menos
   apareceria num dos dois.
