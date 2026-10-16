/**
 * OpenAPI de /api/accounting/fixed-assets.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/fixed-assets:
 *     get:
 *       summary: List fixed assets of a unit (BE-INCR-FIXED-ASSETS, nó C8, item 8)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: status, schema: { type: string, enum: [PENDING_ACTIVATION, ACTIVE, FULLY_DEPRECIATED, DISPOSED] } }
 *         - { in: query, name: classId, schema: { type: string } }
 *       responses:
 *         '200': { description: 'FixedAsset[]' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     post:
 *       summary: Create a fixed asset (item 8) — born PENDING_ACTIVATION
 *       description: >-
 *         rateId (catalog) XOR annualRateBp (explicit) is required. costCents > MAX_CENTS is a plain
 *         400 (Zod ceiling, same pattern as PayableDto.amountCents). bookAnnualRateBp requires
 *         bookRateJustification.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateFixedAssetInput' }
 *       responses:
 *         '201': { description: 'FixedAsset' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/fixed-assets/{id}:
 *     get:
 *       summary: Get a fixed asset by id
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'FixedAsset' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Update a fixed asset — only while PENDING_ACTIVATION (ACC-016)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdateFixedAssetInput' }
 *       responses:
 *         '200': { description: 'FixedAsset' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Soft-delete a fixed asset — PENDING_ACTIVATION or ACTIVE without posted quota (item 8)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DeleteFixedAssetInput' }
 *       responses:
 *         '200': { description: 'FixedAsset' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/fixed-assets/{id}/activate:
 *     post:
 *       summary: Activate a fixed asset — PENDING_ACTIVATION → ACTIVE (item 9, ACC-016)
 *       description: >-
 *         CAS by version (409 on mismatch). openingAccumulatedCents is required when activatedAt
 *         predates the scope's earliest OPEN/SOFT_CLOSED period (retroactive activation, item 9) —
 *         a HARD_CLOSED period never accepts postEntry again, so the system cannot compute history
 *         before that point.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ActivateFixedAssetInput' }
 *       responses:
 *         '200': { description: 'FixedAsset' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'Version conflict (CAS)' }
 *
 *   /api/accounting/fixed-assets/{id}/dispose:
 *     post:
 *       summary: Dispose a fixed asset — ACTIVE → DISPOSED (item 18, ACC-016)
 *       description: >-
 *         Sequential baixa (PR-3, execution-plan Passo 14): first posts the depreciation quota of
 *         the disposedAt month (idempotent, same mechanism as depreciation/run), then posts a 2-4
 *         leg entry (D accumulated depreciation / C cost / D counterpart (if proceeds>0) / D loss or
 *         C gain by the difference) via postEntry (tx1, idempotent by sourceId), then CASes
 *         status+disposalEntryId by version (tx2, 409 on mismatch). The `version` in the body is
 *         checked against the CURRENT version before the quota posting (fail fast on an external
 *         conflict); non-depreciable classes (LAND) skip the quota step entirely.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/DisposeFixedAssetInput' }
 *       responses:
 *         '200': { description: 'FixedAsset' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'Version conflict (CAS)' }
 *
 *   /api/accounting/fixed-assets/depreciation/run:
 *     post:
 *       summary: Run monthly depreciation for all eligible assets of a unit (BE-INCR-FIXED-ASSETS, nó C8, PR-3, item 12)
 *       description: >-
 *         For every ACTIVE depreciable asset with activatedAt <= end of yearMonth: computes the
 *         month's quota (cumulative formula, capped at base − accumulated), posts a D expense / C
 *         accumulated-depreciation entry (tx1, idempotent by sourceId `${assetId}:${yearMonth}`),
 *         then CASes accumulatedDepreciationCents (+ status → FULLY_DEPRECIATED when it reaches
 *         base) in a separate tx2 (ACC-TIEOUT). A re-run of the same month is idempotent
 *         (posted=0, skipped=n on the second call). Only AccountingPeriodNotOpenError (period not
 *         OPEN — HARD_CLOSED/SOFT_CLOSED/FUTURE/inexistent) is caught per-asset into `failed[]`; any
 *         other error aborts the whole call. Missing depreciationExpenseAccountId (scope) or
 *         accumulatedDepreciationAccountId (any involved class) is rejected BEFORE posting any asset.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/RunDepreciationInput' }
 *       responses:
 *         '200': { description: '{ yearMonth, posted, skipped, failed: [{ assetId, code, message }] }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/fixed-assets/reconcile:
 *     post:
 *       summary: Reconcile accumulatedDepreciationCents against the ledger (BE-INCR-FIXED-ASSETS, nó C8, PR-3, item 13/14)
 *       description: >-
 *         Mirror of InventoryService.reconcileInventory: recomputes each asset's
 *         accumulatedDepreciationCents as opening + Σ ledger credits of its
 *         'fixed_asset.depreciation' entries and repairs drift (logged, best-effort per item — no
 *         CAS/version bump, not a command). Also carries the (currently empty) hook for re-driving
 *         payables with fixedAssetItems missing their draft asset (wired for PR-5).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ReconcileFixedAssetsInput' }
 *       responses:
 *         '200': { description: '{ checked, repaired, draftsCreated }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
