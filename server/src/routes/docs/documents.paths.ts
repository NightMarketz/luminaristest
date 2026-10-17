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
 *               properties:
 *                 query: { type: string }
 *                 limit: { type: integer, default: 5 }
 *       responses:
 *         '200': { description: Matching document excerpts }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
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
 *   /api/documents/qdrant-status:
 *     get:
 *       summary: Get Qdrant vector collection status
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Qdrant collection health and point count }
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
 *       summary: Update document metadata
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
 *             schema: { type: object }
 *       responses:
 *         '200': { description: Updated document }
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
 *
 *   /api/documents/{id}/qdrant:
 *     get:
 *       summary: Get Qdrant vector points for a specific document
 *       tags: [Documents]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: Vector points }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
export {};
