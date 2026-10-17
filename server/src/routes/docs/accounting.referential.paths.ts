/**
 * OpenAPI de /api/accounting/referential.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/referential/mappings:
 *     put:
 *       summary: Set (upsert) a referential mapping of one leaf account in one version (BE-INCR-9)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, accountId, referentialCode, label, mappingVersion]
 *               properties:
 *                 unitId: { type: string }
 *                 accountId: { type: string, description: leaf account id (accounts.id) }
 *                 referentialCode: { type: string, description: RFB referential account code }
 *                 label: { type: string, description: referential account name (denormalized snapshot) }
 *                 mappingVersion: { type: string, description: calendar-year layout id, e.g. "2025" }
 *       responses:
 *         '200': { description: 'the created/updated ReferentialMapping' }
 *         '400': { $ref: '#/components/responses/ValidationError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     delete:
 *       summary: Unset (hard-delete) the mapping of one account in one version (BE-INCR-9)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: accountId, required: true, schema: { type: string } }
 *         - { in: query, name: mappingVersion, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'accountId + mappingVersion of the removed mapping' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     get:
 *       summary: List the referential mappings of a version (BE-INCR-9)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: version, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'array of ReferentialMapping for the version' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/referential/mappings/batch:
 *     post:
 *       summary: Batch set (upsert) many leaf-account mappings in one version, atomically (BE-INCR-9B)
 *       description: >-
 *         All-or-nothing (D8) — every item is upserted in a single transaction with the
 *         per-item account-liveness + leaf gate re-checked in-tx; one bad item rolls the
 *         whole batch back. Duplicate accountId within the batch is rejected.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, mappingVersion, items]
 *               properties:
 *                 unitId: { type: string }
 *                 mappingVersion: { type: string, description: calendar-year layout id, e.g. "2025" }
 *                 items:
 *                   type: array
 *                   minItems: 1
 *                   items:
 *                     type: object
 *                     required: [accountId, referentialCode, label]
 *                     properties:
 *                       accountId: { type: string, description: leaf account id (accounts.id) }
 *                       referentialCode: { type: string, description: RFB referential code (human-supplied) }
 *                       label: { type: string, description: referential account name (denormalized snapshot) }
 *       responses:
 *         '200': { description: 'array of upserted ReferentialMapping' }
 *         '400': { $ref: '#/components/responses/ValidationError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/referential/mappings/copy:
 *     post:
 *       summary: Copy every mapping of one version into another (year inheritance, BE-INCR-9B)
 *       description: >-
 *         Copies each mapping of fromVersion into toVersion in one transaction (D6),
 *         re-snapshotting the label literally (D9). Existing target rows are upserted in
 *         place (never P2002). Reuses the per-item set gate, so it is all-or-nothing.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, fromVersion, toVersion]
 *               properties:
 *                 unitId: { type: string }
 *                 fromVersion: { type: string, description: source mappingVersion, e.g. "2025" }
 *                 toVersion: { type: string, description: destination mappingVersion, e.g. "2026" }
 *       responses:
 *         '200': { description: 'array of upserted ReferentialMapping in the destination version' }
 *         '400': { $ref: '#/components/responses/ValidationError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/referential/coverage:
 *     get:
 *       summary: Coverage diagnostic — active leaf accounts unmapped in a version (ECD-readiness gate, BE-INCR-9)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: version, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'mappingVersion + unmappedAccounts[] + totals + ready flag' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/referential/skeleton:
 *     get:
 *       summary: Authoring skeleton — unmapped leaf accounts of a version as a batch template (BE-INCR-9B)
 *       description: >-
 *         Chart-driven (D5) — reuses coverage().unmappedAccounts, shaped as a
 *         fill-in-the-blanks template for batch authoring. Never invents an RFB code.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: version, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'unitId + mappingVersion + items[] (unmapped leaf accounts to author)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/referential/catalog/import:
 *     post:
 *       summary: Import the official RFB referential CATALOG for a layout version (BE-INCR-9B Track B)
 *       description: >-
 *         Uploads a CSV/XLSX (multipart field `file`) of the official referential layout and upserts
 *         it into the GLOBAL catalog, idempotent per layoutVersion. All-or-nothing; invents no code
 *         (isAnalytic is read from the file, D1/I052). Enables analytic-only destination validation.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [unitId, layoutVersion, file]
 *               properties:
 *                 unitId: { type: string, description: auth scope only (catalog is global) }
 *                 layoutVersion: { type: string, description: RFB layout/year id, e.g. "2025" }
 *                 file: { type: string, format: binary, description: CSV/XLSX catalog file }
 *       responses:
 *         '201': { description: 'layoutVersion + totalRows + imported + analyticCount + syntheticCount' }
 *         '400': { description: 'invalid header/rows or empty catalog' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *
 *   /api/accounting/referential/catalog:
 *     get:
 *       summary: Lookup/picker over a version's referential catalog (BE-INCR-9B Track B)
 *       description: >-
 *         Lists a layout version's referential accounts for the code picker; filter by substring
 *         (q) and restrict to analytic (leaf) destinations (analyticOnly).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: version, required: true, schema: { type: string } }
 *         - { in: query, name: q, required: false, schema: { type: string } }
 *         - { in: query, name: analyticOnly, required: false, schema: { type: boolean } }
 *       responses:
 *         '200': { description: 'referential accounts of the version (code, name, isAnalytic, parentCode)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
