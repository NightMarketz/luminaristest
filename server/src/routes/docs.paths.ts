// Tags e components do OpenAPI. Os paths moram em ./docs/<feature>.paths.ts (um arquivo por feature).
/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication and session management
 *   - name: Users
 *     description: User management (admin operations)
 *   - name: Documents
 *     description: Document upload, search and management
 *   - name: DynamicTables
 *     description: Dynamic data tables (schema + rows)
 *   - name: Dashboard
 *     description: Dashboard setup and data endpoints
 *   - name: DashboardLayout
 *     description: Saved widget layouts per user
 *   - name: SavedViews
 *     description: Per-user saved table views (query/filters/sort)
 *   - name: Analytics
 *     description: Analytics presets, chart data and KPI discovery
 *   - name: AnalyticsDefinitions
 *     description: Persisted analytics definition rows (CORE table proxy)
 *   - name: Chat
 *     description: AI chat completions
 *   - name: ChatInstances
 *     description: Chat session instances
 *   - name: ChatMessages
 *     description: Messages within a chat instance
 *   - name: Reports
 *     description: Server-sent-event report generation
 *   - name: StructuredData
 *     description: Structured data extracted from documents
 *
 * x-response-envelope: |
 *   Most success responses use { success: true, data: <payload> }.
 *   Error responses use { success: false, error: <string|object> } or, for
 *   framework-level errors, { error: <string>, message: <string> }.
 *   The 204 No Content responses have an empty body.
 *
 * components:
 *   responses:
 *     BadRequestError:
 *       description: Invalid request payload or missing required fields
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: false }
 *               error: { type: string }
 *     ValidationError:
 *       description: Request failed DTO (Zod) validation — error carries the flattened field issues
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: false }
 *               error: { type: object }
 *     UnauthorizedError:
 *       description: Missing or invalid authentication token
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: false }
 *               error: { type: string, example: Authentication required }
 *     ForbiddenError:
 *       description: Authenticated but not authorised to perform this action
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: false }
 *               error: { type: string, example: Forbidden }
 *     NotFoundError:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: false }
 *               error: { type: string, example: Not found }
 *     InternalServerError:
 *       description: Unexpected server error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               success: { type: boolean, example: false }
 *               error: { type: string }
 *   schemas:
 *     DocumentAttachment:
 *       type: object
 *       required: [id, targetType, targetId, fileName, mimeType, fileSize, sha256, createdAt]
 *       properties:
 *         id:           { type: string, format: cuid }
 *         targetType:   { type: string, enum: [JOURNAL_ENTRY] }
 *         targetId:     { type: string }
 *         fileName:     { type: string }
 *         mimeType:     { type: string }
 *         fileSize:     { type: integer }
 *         sha256:       { type: string, description: 64-char hex checksum }
 *         uploadedById: { type: string, nullable: true }
 *         createdAt:    { type: string, format: date-time }
 *         deletedAt:    { type: string, format: date-time, nullable: true }
 */
/**
 * @openapi
 * tags:
 *   - name: Accounting
 *     description: Double-entry accounting — journal entries, reversals, reports, chart of accounts (first-class Prisma)
 *
 */
/**
 * @openapi
 * components:
 *   schemas:
 *     DataExchangeJob:
 *       type: object
 *       properties:
 *         id:        { type: string }
 *         direction: { type: string, enum: [IMPORT, EXPORT] }
 *         kind:      { type: string }
 *         status:    { type: string }
 *         fileName:  { type: string, nullable: true }
 *         mimeType:  { type: string, nullable: true }
 *         sizeBytes: { type: integer, nullable: true }
 *         sha256:    { type: string, nullable: true }
 *         totalRows: { type: integer }
 *         createdAt: { type: string, format: date-time }
 *
 */
/**
 * @openapi
 * tags:
 *   - name: AccountingBinding
 *     description: >-
 *       A Prensa (BE-INCR-BINDING-PRESS) — compilador + validador determinístico do binding
 *       vertical→contabilidade (schema operacional do preset + plano de contas do tenant +
 *       escolhas papel→conta → AccountingBindingV1 versionado). F-BP-2(b): sem bloqueante,
 *       o compile auto-ativa; não há rota /activate separada.
 *   - name: AccountingKit
 *     description: >-
 *       Kit de setor (BE-INCR-KIT-SETOR) — ajuste papel→conta do contador sobre o binding do kit instalado
 *       (todo caminho que compila aplica os ajustes vivos) e as pendências da atualização em 3 níveis.
 *
 * components:
 *   schemas:
 *     AccountingBindingChartAccountSnapshot:
 *       type: object
 *       required: [code, nature, acceptsEntries]
 *       properties:
 *         code:           { type: string }
 *         nature:         { type: string }
 *         acceptsEntries: { type: boolean }
 *     AccountingBindingCompileRequest:
 *       type: object
 *       required: [unitId, sectorKey, operationalSchema, chart, eventBindings]
 *       properties:
 *         unitId:            { type: string }
 *         sectorKey:         { type: string, description: "ex.: 'beautySalon' — casa com o preset instalado" }
 *         operationalSchema: { type: object, description: "schema operacional do preset instalado, canonicalizado no hash de staleness" }
 *         chart:
 *           type: array
 *           minItems: 1
 *           items: { $ref: '#/components/schemas/AccountingBindingChartAccountSnapshot' }
 *         eventBindings:
 *           type: array
 *           minItems: 1
 *           items: { $ref: '#/components/schemas/AccountingBindingEventBinding' }
 *     AccountingBindingActivateDefaultRequest:
 *       type: object
 *       required: [unitId]
 *       additionalProperties: false
 *       properties:
 *         unitId:                     { type: string }
 *         sectorKey:                  { type: string, description: "default 'beautySalon'; setores com binding padrão: beautySalon, aestheticClinic" }
 *         installChartIfEmpty:        { type: boolean, description: 'plano de contas vazio ⇒ instala o plano canônico antes do compile' }
 *         openCurrentPeriodIfMissing: { type: boolean, description: 'período do mês corrente ausente/FUTURE ⇒ seed-year + open' }
 *
 */
export {};
