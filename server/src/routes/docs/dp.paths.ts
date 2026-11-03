/**
 * OpenAPI de /api/dp (nó PES-4, BE-INCR-DP-F0-F1). Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/dp/modules:
 *     get:
 *       summary: Catalog of the optional DP submodules (code registry; the core is always on and is not listed)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpModuleDef[] — key, name, aiDescription, dependsOn, requiresOneOf, featureDir, provides, disponivel' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *   /api/dp/modules/activations:
 *     get:
 *       summary: Activations of optional DP submodules of the instance (validity by competence YYYY-MM)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpModuloAtivacaoView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Activate an optional DP submodule from a competence on
 *       description: >-
 *         Per instance (only the owner is stored). Unavailable module → 409 DP_MODULE_UNAVAILABLE; missing dependency →
 *         400 DP_MODULE_MISSING_DEPENDENCY (all missing listed); empty requiresOneOf group → 400 DP_MODULE_REQUIRES_ONE_OF;
 *         overlapping activation of the same module → 409 DP_MODULE_ACTIVATION_OVERLAP. Audited as
 *         dp.module_activation.created.
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, moduleKey, competenciaInicio, motivo]
 *               properties:
 *                 unitId: { type: string }
 *                 moduleKey: { type: string, enum: [DP-PONTO, DP-PAG, DP-BEN, DP-ADM, DP-APP, DP-DES, DP-GED, DP-CAT, DP-BI] }
 *                 competenciaInicio: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$' }
 *                 motivo: { type: string, minLength: 3, maxLength: 500 }
 *       responses:
 *         '201': { description: 'DpModuloAtivacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { description: 'DP_MODULE_UNAVAILABLE | DP_MODULE_ACTIVATION_OVERLAP' }
 *   /api/dp/modules/activations/{id}/end:
 *     post:
 *       summary: End an activation at a competence (inclusive); data is never deleted
 *       description: >-
 *         competenciaFim before competenciaInicio → 400. Another module that depends on this one and stays active after
 *         competenciaFim → 409 DP_MODULE_DEPENDENT_ACTIVE. Activation of another owner → 404. Audited as
 *         dp.module_activation.ended.
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, competenciaFim, motivo]
 *               properties:
 *                 unitId: { type: string }
 *                 competenciaFim: { type: string, pattern: '^\d{4}-(0[1-9]|1[0-2])$' }
 *                 motivo: { type: string, minLength: 3, maxLength: 500 }
 *       responses:
 *         '200': { description: 'DpModuloAtivacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Activation or unit not found' }
 *         '409': { description: 'DP_MODULE_ACTIVATION_OVERLAP | DP_MODULE_DEPENDENT_ACTIVE' }
 */
export {};
