/**
 * OpenAPI de /api/accounting/jcp (BE-INCR-IRRF-DISTRIBUICAO PR-3, BRIEF itens 22–26).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * components:
 *   schemas:
 *     JcpPreviewInput:
 *       type: object
 *       required: [unitId, anoCalendario, periodo, dataCredito, forma, totalCents]
 *       properties:
 *         unitId: { type: string, description: 'Unit of the ledger read and of the future entry' }
 *         anoCalendario: { type: integer, minimum: 2026 }
 *         periodo: { type: string, enum: [T01, T02, T03, T04, A00], description: 'Quarterly real profit uses T0n; annual uses A00' }
 *         dataCredito: { type: string, format: date, description: 'Inside the period (L-IRD-3)' }
 *         forma: { type: string, enum: [DESPESA, PL] }
 *         totalCents: { type: integer, minimum: 1 }
 *         debitoPlAccountId: { type: string, description: 'PL only: the equity account debited instead of the expense' }
 *         rateio:
 *           type: array
 *           description: 'Optional split per partner (default: by share); only partners in force; must add up to totalCents'
 *           items:
 *             type: object
 *             required: [partnerId, brutoCents]
 *             properties:
 *               partnerId: { type: string }
 *               brutoCents: { type: integer, minimum: 0 }
 * paths:
 *   /api/accounting/jcp/preview:
 *     post:
 *       summary: Preview interest on equity (JCP) — TJLP pro rata die base, deductible limit, split and IRRF (nothing is saved)
 *       description: >-
 *         Real profit only (400 JCP_SO_NO_LUCRO_REAL). Base = daily balance of the mapped equity accounts (end of the
 *         previous day) × monthly TJLP ÷ days of the month, from the start of the period to dataCredito. Limit =
 *         min(TJLP interest, max(50% of the period profit before JCP and IRPJ, 50% of retained earnings + profit
 *         reserves at the start of the period)). IRRF 17.5% per partner. A total above the limit is accepted and shows
 *         excessoIndedutivelCents. Errors: PERIODO_INCOMPATIVEL_COM_A_FORMA, DATA_CREDITO_FORA_DO_PERIODO,
 *         SOMA_PARTICIPACOES_INVALIDA, SOCIO_NAO_RESIDENTE_FORA_DO_ESCOPO, JCP_MAPA_PL_NAO_CONFIGURADO, RATEIO_INVALIDO,
 *         PARAMETRO_LEGAL_AUSENTE (no TJLP on some day).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/JcpPreviewInput' }
 *       responses:
 *         '200': { description: 'JcpPreviewView (faixas, limits, alocacoes, lalurPrevisto, avisos)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'Equity account (PL form) not found in the unit' }
 */
export {};
