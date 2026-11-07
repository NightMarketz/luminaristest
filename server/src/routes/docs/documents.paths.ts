/**
 * OpenAPI de /api/documents.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── DOCUMENTS ──────────────────────────────────────────────────────────
 *   /api/documents:
 *     get:
 *       summary: List documents (paginated)
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: query
 *           name: page
 *           schema: { type: integer, default: 1 }
 *         - in: query
 *           name: limit
 *           schema: { type: integer, default: 10 }
 *       responses:
 *         '200': { description: Paginated document list }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/documents/list:
 *     get:
 *       summary: Get a lightweight list of document names and IDs
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: 'Array of id and name objects' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/documents/upload:
 *     post:
 *       summary: Upload a document file
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               properties:
 *                 file: { type: string, format: binary }
 *       responses:
 *         '201': { description: Document uploaded and queued for processing }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/documents/search:
 *     post:
 *       summary: Semantic / vector search across documents
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [query]
 *               additionalProperties: false
 *               properties:
 *                 query: { type: string }
 *                 documentIds: { type: array, maxItems: 50, items: { type: string } }
 *                 limit: { type: integer, default: 10, maximum: 100 }
 *       responses:
 *         '200': { description: 'Matching excerpts { hits, stamp }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/documents/token-cost:
 *     post:
 *       summary: Estimate token cost for a file before uploading
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           multipart/form-data:
 *             schema:
 *               type: object
 *               properties:
 *                 file: { type: string, format: binary }
 *       responses:
 *         '200': { description: Token count estimate }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/documents/{id}:
 *     get:
 *       summary: Get a document by ID
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '200': { description: Document object }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     patch:
 *       summary: Correct document metadata and generated context (user-correctable fields only)
 *       description: >-
 *         RAG-PR-B item 18 (F-RAG-4). Status, processingError, processingDate and contextJson belong to the
 *         processing pipeline and are rejected (strict body, extra key → 400). Every corrected context field
 *         (summary, documentType, entities) is recorded in generatedContext.userEditedFields.
 *       tags: [Documents]
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
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               properties:
 *                 fileName: { type: string, minLength: 1, maxLength: 255 }
 *                 documentPurpose: { type: string, enum: [DATA_ANALYSIS, KNOWLEDGE_BASE] }
 *                 summary: { type: string, maxLength: 4000, nullable: true }
 *                 documentType: { type: string, minLength: 1, maxLength: 60, nullable: true }
 *                 entities:
 *                   type: array
 *                   maxItems: 50
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required: [type, value]
 *                     properties:
 *                       type: { type: string, enum: [PESSOA, EMPRESA, DATA, VALOR, IDENTIFICADOR, OUTRO] }
 *                       value: { type: string, minLength: 1, maxLength: 200 }
 *       responses:
 *         '200': { description: Updated document }
 *         '400': { description: Invalid body (including any pipeline-owned key) }
 *         '403': { description: Not the owner }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     delete:
 *       summary: Delete a document
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string, format: cuid }
 *       responses:
 *         '204': { description: Deleted }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 */
export {};
