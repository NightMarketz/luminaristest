/**
 * OpenAPI de /api/package-balances.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/package-balances:
 *     get:
 *       summary: List prepaid-package balances for a unit, optionally one customer (Incremento G)
 *       description: >-
 *         Read-only. One live row per customer × package (`balanceCents` is integer cents).
 *         Credit/debit movements are driven internally by the package-sale bridge and
 *         RegisterPaymentService — never exposed as a raw HTTP write.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: customerId, required: false, schema: { type: string } }
 *         - { in: query, name: expiresOnOrBefore, required: false, schema: { type: string, format: date }, description: 'BE-INCR-PACOTE-VALIDADE (F-PV-11 a) — só saldos com validade (expiresAt) até esta data; YYYY-MM-DD real, senão 400' }
 *       responses:
 *         '200': { description: 'balances (CustomerPackageBalance[] — id, unitId, customerId, packageId, balanceCents, expiresAt = último dia válido, date-only à meia-noite UTC; null = sem validade)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
