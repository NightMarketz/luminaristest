/**
 * OpenAPI de /api/scheduling (BE-INCR-ESCALA-BASE PR-3, item 35).
 * @openapi
 * paths:
 *   /api/scheduling/availability:
 *     get:
 *       summary: Available intervals of one person or resource in a unit (BE-INCR-ESCALA-BASE item 31)
 *       description: >-
 *         Shifts minus day-off, block, absence and holiday exceptions, plus EXTRA exceptions, in the unit time zone.
 *         A target without a live schedule is unrestricted (F-ESC-15 a) and the whole window comes back available.
 *         Window of at most 31 days (400 RANGE_TOO_LARGE).
 *       tags: [Scheduling]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: employeeId, required: false, schema: { type: string }, description: 'exactly one of employeeId or resourceId' }
 *         - { in: query, name: resourceId, required: false, schema: { type: string } }
 *         - { in: query, name: from, required: true, schema: { type: string, format: date-time } }
 *         - { in: query, name: to, required: true, schema: { type: string, format: date-time } }
 *       responses:
 *         '200': { description: 'data = { unrestricted, intervals[] of { startAt, endAt } }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'unit, person or resource not found for this user' }
 *   /api/scheduling/free-slots:
 *     get:
 *       summary: Free start times for a booking (BE-INCR-ESCALA-BASE item 32)
 *       description: >-
 *         Starts aligned to stepMinutes where the whole duration fits the availability and touches no Scheduled
 *         appointment of the person or resource. Duration from durationMinutes or, without it, services.duration.
 *         Without employeeId, one set per professional of the unit. Window of at most 31 days (400 RANGE_TOO_LARGE).
 *       tags: [Scheduling]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: employeeId, required: false, schema: { type: string } }
 *         - { in: query, name: resourceId, required: false, schema: { type: string } }
 *         - { in: query, name: serviceId, required: false, schema: { type: string } }
 *         - { in: query, name: durationMinutes, required: false, schema: { type: integer, minimum: 5, maximum: 1440 }, description: 'required without serviceId' }
 *         - { in: query, name: stepMinutes, required: false, schema: { type: integer, minimum: 5, maximum: 120, default: 15 } }
 *         - { in: query, name: from, required: true, schema: { type: string, format: date-time } }
 *         - { in: query, name: to, required: true, schema: { type: string, format: date-time } }
 *       responses:
 *         '200': { description: 'data = { slots[] of { employeeId, resourceId, startAt, endAt } }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'unit, person, resource or service not found for this user' }
 *   /api/scheduling/holidays/sync:
 *     post:
 *       summary: Project the holidays of a year as unit-wide schedule exceptions (BE-INCR-ESCALA-BASE items 39 and 40)
 *       description: >-
 *         One HOLIDAY exception per holiday of the unit (national, state and municipal, from the BR legal parameter
 *         tables and the unit municipality), the whole local day in the unit time zone. Idempotent by
 *         (sourceType, sourceId), counting the rows the user deleted, so a holiday the user removed does not come back.
 *         Without unitId, every live unit of the user.
 *       tags: [Scheduling]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [year]
 *               properties:
 *                 unitId: { type: string }
 *                 year: { type: integer, minimum: 2024, maximum: 2100 }
 *       responses:
 *         '200': { description: 'data = { created, skipped, deletedByUser }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { description: 'unit not found for this user' }
 */
export {};
