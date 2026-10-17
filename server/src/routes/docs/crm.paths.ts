/**
 * OpenAPI de /api/crm.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/crm/pipeline/advance:
 *     post:
 *       summary: Advance a lead to a target stage (with optional proposal side-effect)
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AdvanceStageInput' }
 *       responses:
 *         '200':
 *           description: Updated lead record
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/pipeline/proposal:
 *     post:
 *       summary: Create a standalone proposal and refresh the lead snapshot
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [leadId, amount]
 *               properties:
 *                 leadId: { type: string }
 *                 amount: { type: number }
 *                 currency: { type: string, enum: [BRL, USD, EUR] }
 *                 winProbability: { type: number }
 *                 estimatedCloseDate: { type: string }
 *       responses:
 *         '201':
 *           description: Created proposal record
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/pipeline/no-show:
 *     post:
 *       summary: Record a meeting no-show (reschedule or revert the lead stage)
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [leadId, option]
 *               properties:
 *                 leadId: { type: string }
 *                 option: { type: string, enum: [reschedule, revert] }
 *                 rescheduleAt: { type: string, format: date-time }
 *                 previousStageId: { type: string }
 *       responses:
 *         '200':
 *           description: Acknowledgement
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object, properties: { ok: { type: boolean } } }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/pipeline/convert-lead:
 *     post:
 *       summary: Convert a lead into an Account (+ optional Contact), atomically
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ConvertLeadInput' }
 *       responses:
 *         '201':
 *           description: Created account + contact and the updated (converted) lead
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       account: { type: object }
 *                       contact: { type: object }
 *                       lead:    { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/pipeline/advance-opportunity:
 *     post:
 *       summary: Advance an opportunity to a target stage (first-class Opportunity)
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AdvanceOpportunityInput' }
 *       responses:
 *         '200': { description: The updated opportunity }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/pipeline/convert-lead-to-opportunity:
 *     post:
 *       summary: Create a first-class opportunity from a lead (the lead is NOT consumed)
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ConvertLeadToOpportunityInput' }
 *       responses:
 *         '201': { description: The created opportunity }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/pipeline-analytics:
 *     get:
 *       summary: Aggregated CRM KPI bundle over the leads dataset
 *       tags: [CRM]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: datePreset
 *           schema: { type: string, enum: [today, thisWeek, thisMonth, last30Days, lastMonth, thisYear] }
 *       responses:
 *         '200':
 *           description: Keyed bundle of chart-ready KPI series (cards, funnel, source, status, bant, proposals, activities)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   # CRM report builder (BE-INCR-CRM-REPORT-BUILDER PR-2, item 10). Erros nomeados: 400 REPORT_FIELD_NOT_FOUND {field},
 *   # REPORT_CURRENCY_MIXED {field, currencyField}, REPORT_CONVERSION_NOT_APPLICABLE, REPORT_SORT_KEY_NOT_FOUND {key},
 *   # REPORT_JOIN_ALIAS_DUPLICATE {alias}; 404 REPORT_NOT_FOUND; 409 CRM_MODULE_NOT_INSTALLED; 422 REPORT_TOO_LARGE {rowsRead, cap}.
 *   /api/crm/reports:
 *     get:
 *       summary: List saved CRM report definitions (own; ADMIN sees all)
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Array of report definitions }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Create a CRM report definition (spec validated against the live table schema)
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateCrmReport' }
 *       responses:
 *         '201': { description: Report definition created }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '409': { description: CRM_MODULE_NOT_INSTALLED — source/join table not installed }
 *
 *   /api/crm/reports/templates:
 *     get:
 *       summary: List the ready-made CRM report templates and the money→currency field pairs (BE-INCR-CRM-REPORT-TEMPLATES)
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: "{ templates: CreateCrmReport & { key }[], moneyCurrencyPairs: Record<source, Record<valueField, currencyField>> }" }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/crm/reports/run:
 *     post:
 *       summary: Run an unsaved report spec (preview) over the caller's CRM tables
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [spec]
 *               properties:
 *                 spec: { $ref: '#/components/schemas/CrmReportSpec' }
 *                 timeZone: { type: string, description: 'IANA; default America/Sao_Paulo' }
 *       responses:
 *         '200': { description: 'series[] (one per measure, per currency) + meta; converted only with spec.convertTo' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '409': { description: CRM_MODULE_NOT_INSTALLED }
 *         '422': { description: REPORT_TOO_LARGE }
 *
 *   /api/crm/reports/{id}:
 *     get:
 *       summary: Get a report definition (owner or ADMIN)
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Report definition }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Update a report definition (owner or ADMIN; ownership never changes)
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateCrmReport' }
 *       responses:
 *         '200': { description: Updated report definition }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete a report definition (soft-delete; owner or ADMIN)
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Report definition deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/reports/{id}/run:
 *     post:
 *       summary: Run a saved report (also the dashboard crmReport widget); ADMIN reads the owner's tables
 *       tags: [CRM Reports]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       requestBody:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timeZone: { type: string, description: 'IANA; default America/Sao_Paulo' }
 *       responses:
 *         '200': { description: 'series[] + meta (+ converted)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: CRM_MODULE_NOT_INSTALLED }
 *         '422': { description: REPORT_TOO_LARGE }
 *
 *   /api/crm/attachments:
 *     post:
 *       summary: Upload a downloadable file attachment for a CRM record
 *       tags: [CRM Attachments]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               required: [file, entityType, entityId]
 *               properties:
 *                 file: { type: string, format: binary }
 *                 entityType: { type: string, enum: [lead, account, contact] }
 *                 entityId: { type: string }
 *       responses:
 *         '201':
 *           description: Created attachment metadata
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { $ref: '#/components/schemas/Attachment' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '413': { description: File too large (max 25 MB) }
 *         '415': { description: File type not supported or content/type mismatch }
 *     get:
 *       summary: List active attachments for a CRM record
 *       tags: [CRM Attachments]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: entityType
 *           required: true
 *           schema: { type: string, enum: [lead, account, contact] }
 *         - in: query
 *           name: entityId
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200':
 *           description: List of attachment metadata
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: array
 *                     items: { $ref: '#/components/schemas/Attachment' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/crm/attachments/{id}/download:
 *     get:
 *       summary: Download an attachment binary (streamed)
 *       tags: [CRM Attachments]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200':
 *           description: The attachment file stream
 *           content:
 *             application/octet-stream:
 *               schema: { type: string, format: binary }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/crm/attachments/{id}:
 *     delete:
 *       summary: Soft-delete an attachment (and remove its binary)
 *       tags: [CRM Attachments]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200':
 *           description: Acknowledgement
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data: { type: object, properties: { ok: { type: boolean } } }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
