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
 *   /api/dp/lotacoes:
 *     get:
 *       summary: List live DP payroll allocation unit (lotacao, S-1020 concept) records of the instance
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 200, default: 50 } }
 *       responses:
 *         '200': { description: 'DpLotacaoView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a DP payroll allocation unit (lotacao, S-1020 concept) record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, codigo, descricao]
 *               properties:
 *                 unitId: { type: string }
 *                 codigo: { type: string, minLength: 1, maxLength: 30 }
 *                 descricao: { type: string, minLength: 1, maxLength: 200 }
 *       responses:
 *         '201': { description: 'DpLotacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Unit or referenced record not found' }
 *         '409': { description: 'DP_CODIGO_DUPLICADO (live code per instance)' }
 *   /api/dp/lotacoes/{id}:
 *     get:
 *       summary: Get one DP payroll allocation unit (lotacao, S-1020 concept) record
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpLotacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found (other owner => 404)' }
 *     patch:
 *       summary: Partially update a DP payroll allocation unit (lotacao, S-1020 concept) record (absent fields are kept; audited)
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
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 codigo: { type: string, minLength: 1, maxLength: 30 }
 *                 descricao: { type: string, minLength: 1, maxLength: 200 }
 *       responses:
 *         '200': { description: 'DpLotacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *         '409': { description: 'DP_CODIGO_DUPLICADO (live code per instance)' }
 *     delete:
 *       summary: Soft-delete a DP payroll allocation unit (lotacao, S-1020 concept) record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *   /api/dp/cargos:
 *     get:
 *       summary: List live DP job title with CBO records of the instance
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 200, default: 50 } }
 *       responses:
 *         '200': { description: 'DpCargoView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a DP job title with CBO record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, nome, cbo]
 *               properties:
 *                 unitId: { type: string }
 *                 nome: { type: string, minLength: 1, maxLength: 120 }
 *                 cbo: { type: string, pattern: '^\d{6}$' }
 *       responses:
 *         '201': { description: 'DpCargoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Unit or referenced record not found' }
 *   /api/dp/cargos/{id}:
 *     get:
 *       summary: Get one DP job title with CBO record
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpCargoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found (other owner => 404)' }
 *     patch:
 *       summary: Partially update a DP job title with CBO record (absent fields are kept; audited)
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
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 nome: { type: string, minLength: 1, maxLength: 120 }
 *                 cbo: { type: string, pattern: '^\d{6}$' }
 *       responses:
 *         '200': { description: 'DpCargoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *     delete:
 *       summary: Soft-delete a DP job title with CBO record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *   /api/dp/jornadas:
 *     get:
 *       summary: List live DP working schedule (horContratual of S-2200) records of the instance
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 200, default: 50 } }
 *       responses:
 *         '200': { description: 'DpJornadaView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a DP working schedule (horContratual of S-2200) record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, nome, minutosSemanais, tipoJornada]
 *               properties:
 *                 unitId: { type: string }
 *                 nome: { type: string, minLength: 1, maxLength: 120 }
 *                 minutosSemanais: { type: integer, minimum: 1, maximum: 10080 }
 *                 tipoJornada: { type: string, enum: ['2', '3', '4', '5', '6', '7', '9'] }
 *                 descricao: { type: string, nullable: true, maxLength: 999 }
 *       responses:
 *         '201': { description: 'DpJornadaView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Unit or referenced record not found' }
 *   /api/dp/jornadas/{id}:
 *     get:
 *       summary: Get one DP working schedule (horContratual of S-2200) record
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpJornadaView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found (other owner => 404)' }
 *     patch:
 *       summary: Partially update a DP working schedule (horContratual of S-2200) record (absent fields are kept; audited)
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
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 nome: { type: string, minLength: 1, maxLength: 120 }
 *                 minutosSemanais: { type: integer, minimum: 1, maximum: 10080 }
 *                 tipoJornada: { type: string, enum: ['2', '3', '4', '5', '6', '7', '9'] }
 *                 descricao: { type: string, nullable: true, maxLength: 999 }
 *       responses:
 *         '200': { description: 'DpJornadaView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *     delete:
 *       summary: Soft-delete a DP working schedule (horContratual of S-2200) record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *   /api/dp/sindicatos:
 *     get:
 *       summary: List live DP trade union records of the instance
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 200, default: 50 } }
 *       responses:
 *         '200': { description: 'DpSindicatoView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a DP trade union record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, cnpj, nome]
 *               properties:
 *                 unitId: { type: string }
 *                 cnpj: { type: string, description: '14 positions with check digits' }
 *                 nome: { type: string, minLength: 1, maxLength: 200 }
 *       responses:
 *         '201': { description: 'DpSindicatoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Unit or referenced record not found' }
 *         '409': { description: 'DP_CODIGO_DUPLICADO (live CNPJ per instance)' }
 *   /api/dp/sindicatos/{id}:
 *     get:
 *       summary: Get one DP trade union record
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpSindicatoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found (other owner => 404)' }
 *     patch:
 *       summary: Partially update a DP trade union record (absent fields are kept; audited)
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
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 cnpj: { type: string, description: '14 positions with check digits' }
 *                 nome: { type: string, minLength: 1, maxLength: 200 }
 *       responses:
 *         '200': { description: 'DpSindicatoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *         '409': { description: 'DP_CODIGO_DUPLICADO (live CNPJ per instance)' }
 *     delete:
 *       summary: Soft-delete a DP trade union record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *   /api/dp/convencoes:
 *     get:
 *       summary: List live DP collective agreement (CCT/ACT) with source and validity records of the instance
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: limit, schema: { type: integer, minimum: 1, maximum: 200, default: 50 } }
 *       responses:
 *         '200': { description: 'DpConvencaoView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     post:
 *       summary: Create a DP collective agreement (CCT/ACT) with source and validity record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, sindicatoId, identificacao, vigenteDesde, fonte]
 *               properties:
 *                 unitId: { type: string }
 *                 sindicatoId: { type: string }
 *                 identificacao: { type: string, minLength: 1, maxLength: 200 }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *                 fonte: { type: string, minLength: 3, maxLength: 500 }
 *       responses:
 *         '201': { description: 'DpConvencaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Unit or referenced record not found' }
 *   /api/dp/convencoes/{id}:
 *     get:
 *       summary: Get one DP collective agreement (CCT/ACT) with source and validity record
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpConvencaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found (other owner => 404)' }
 *     patch:
 *       summary: Partially update a DP collective agreement (CCT/ACT) with source and validity record (absent fields are kept; audited)
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
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 identificacao: { type: string, minLength: 1, maxLength: 200 }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *                 fonte: { type: string, minLength: 3, maxLength: 500 }
 *       responses:
 *         '200': { description: 'DpConvencaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *     delete:
 *       summary: Soft-delete a DP collective agreement (CCT/ACT) with source and validity record (audited)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Record or unit not found' }
 *   /api/dp/convencoes/{id}/parametros:
 *     get:
 *       summary: Live parameters of a collective agreement (valorInt as string)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'DpConvencaoParametroView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Agreement or unit not found' }
 *     post:
 *       summary: Add a parameter to a collective agreement
 *       description: >-
 *         CCT_CHAVES = [PISO_SALARIAL_CENTS] with discriminador = cargoId of the same owner. Validity must lie inside the
 *         agreement validity (400) and must not overlap another parameter with the same (chave, discriminador), 409
 *         DP_VERSAO_SOBREPOSTA. Audited as dp.convencao_parametro.created.
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
 *               required: [unitId, chave, discriminador, valorInt, clausula, vigenteDesde]
 *               properties:
 *                 unitId: { type: string }
 *                 chave: { type: string, enum: [PISO_SALARIAL_CENTS] }
 *                 discriminador: { type: string, description: cargoId }
 *                 valorInt: { type: string, pattern: '^\d+$', description: 'PISO_SALARIAL_CENTS in cents, 1..2147483647' }
 *                 clausula: { type: string, minLength: 1, maxLength: 4000 }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *       responses:
 *         '201': { description: 'DpConvencaoParametroView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Agreement, cargo or unit not found' }
 *         '409': { description: 'DP_VERSAO_SOBREPOSTA' }
 *   /api/dp/convencoes/{id}/parametros/{parametroId}:
 *     patch:
 *       summary: Partially update a parameter of a collective agreement (chave and discriminador are fixed)
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: parametroId, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string }
 *                 valorInt: { type: string, pattern: '^\d+$', description: 'PISO_SALARIAL_CENTS in cents, 1..2147483647' }
 *                 clausula: { type: string, minLength: 1, maxLength: 4000 }
 *                 vigenteDesde: { type: string, format: date }
 *                 vigenteAte: { type: string, format: date, nullable: true }
 *       responses:
 *         '200': { description: 'DpConvencaoParametroView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Parameter, agreement or unit not found' }
 *         '409': { description: 'DP_VERSAO_SOBREPOSTA' }
 *     delete:
 *       summary: Soft-delete a parameter of a collective agreement
 *       tags: [DP]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: path, name: parametroId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Deleted }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'Parameter, agreement or unit not found' }
 */
export {};
