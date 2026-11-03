/**
 * OpenAPI de /api/accounting/product-fiscal-profiles (BE-INCR-NFCE, nó X10a, item 30).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/product-fiscal-profiles:
 *     get:
 *       summary: List the per-product fiscal profiles of the owner (BE-INCR-NFCE, nó X10a, F-NFCE-3 b)
 *       description: >-
 *         One row per productRef (id of the `products` DynamicTable row), shared by every unit of the owner. NCM,
 *         origin, CFOP, CSOSN (CRT 1) / CST ICMS (CRT 3), commercial unit, GTIN and PIS/COFINS/IBS-CBS CST for the
 *         NF-e 55 / NFC-e 65 (MOC 7.0 Anexo I). unitId only resolves access. Soft-deleted rows are omitted.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ProductFiscalProfileView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/accounting/product-fiscal-profiles/{productRef}:
 *     get:
 *       summary: Read one product fiscal profile
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: productRef, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ProductFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: Create or replace a product fiscal profile (idempotent upsert)
 *       description: >-
 *         Codes accepted are those transcribed in TRANSCRICAO-MOC70-NFCe-NFe-saida-2026-10-26 (csosn 102/103/300/400/500,
 *         cstIcms 00, PIS/COFINS CST of groups Aliq/NT/Outr). Audited as product_fiscal_profile.updated (codes only).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: productRef, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, ncm, origem, cfopPadrao, uCom, cEan, cstPis, cstCofins]
 *               properties:
 *                 unitId: { type: string }
 *                 ncm: { type: string, description: '8 dígitos (I05)' }
 *                 cest: { type: string, nullable: true, description: '7 dígitos (I05c)' }
 *                 origem: { type: integer, minimum: 0, maximum: 8 }
 *                 cfopPadrao: { type: string, description: '4 dígitos (I08)' }
 *                 csosn: { type: string, nullable: true, enum: ['102', '103', '300', '400', '500'] }
 *                 cstIcms: { type: string, nullable: true, enum: ['00'] }
 *                 uCom: { type: string, maxLength: 6 }
 *                 cEan: { type: string, description: 'GTIN-8/12/13/14 ou "SEM GTIN"' }
 *                 cstPis: { type: string }
 *                 cstCofins: { type: string }
 *                 ibsCbsCst: { type: string, nullable: true }
 *                 ibsCbsClassTrib: { type: string, nullable: true }
 *                 xProd: { type: string, nullable: true, maxLength: 120 }
 *       responses:
 *         '200': { description: 'ProductFiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     delete:
 *       summary: Soft-delete a product fiscal profile (rename-on-delete frees the key)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: productRef, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'deleted' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 */
export {};
