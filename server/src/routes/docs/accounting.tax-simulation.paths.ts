/**
 * OpenAPI dos simuladores de eficiência fiscal (EFICIENCIA-FISCAL PR-3, BRIEF BE-INCR-EFICIENCIA-FISCAL itens 15–18, §4.3).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/simples/simulacoes/fator-r:
 *     get:
 *       summary: Simples factor r simulation (current payroll x target payroll of the RBT12 window)
 *       description: >-
 *         Pure calculation, nothing is saved. folhaAlvoCents is the payroll of the 12 months of the RBT12 window of the
 *         period (FS12) and is never persisted (I-5). Cost of the extra payroll from table ENCARGO_FOLHA - PRO_LABORE pays
 *         the partner INSS of 11% up to the RGPS ceiling, EMPREGADO pays FGTS of 8%. Every answer carries the real-payroll
 *         warning. 400 SEM_ATIVIDADE_SUJEITA_AO_FATOR_R, ATIVIDADE_SEM_ANEXO, PARAMETRO_LEGAL_AUSENTE.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: competencia, required: true, schema: { type: string, description: YYYY-MM } }
 *         - { in: query, name: folhaAlvoCents, required: true, schema: { type: string } }
 *         - { in: query, name: tipoFolha, required: false, schema: { type: string, enum: [PRO_LABORE, EMPREGADO], default: PRO_LABORE } }
 *       responses:
 *         '200': { description: 'FatorRSimulacao (cents as strings; economiaLiquidaCents may be negative)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *   /api/accounting/simples/simulacoes/fator-r/sugestao:
 *     post:
 *       summary: Record the factor r simulation as a SYSTEM suggestion (FATOR_R_FOLHA)
 *       description: >-
 *         Same fields as the GET, in the body. Recalculates and records a PROPOSED suggestion proposed by SYSTEM (decided
 *         by the ACTIVE accountant or, without one, the owner). A live PROPOSED of the same period is reused and never
 *         recalculated; if its parametrosSha256 differs a warning is returned (I-10). 400 SIMULACAO_SEM_ECONOMIA.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, competencia, folhaAlvoCents]
 *               properties:
 *                 unitId: { type: string }
 *                 competencia: { type: string }
 *                 folhaAlvoCents: { type: string }
 *                 tipoFolha: { type: string, enum: [PRO_LABORE, EMPREGADO] }
 *       responses:
 *         '201': { description: 'SimulacaoSugestao { suggestionId, reaproveitada, avisos }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *   /api/accounting/simulacoes/regime:
 *     get:
 *       summary: Regime simulation for a year (Simples x Presumido x Real) over the ledger, with the 2027 projection
 *       description: >-
 *         Pure calculation. Simples = DAS month by month from the fiscal subledger; Presumido and Real = IRPJ/CSLL (X7 pure
 *         functions; Real on the book result without e-Lalur), PIS/COFINS (no credits) or CBS/IBS from 2027, CPP of 20%
 *         on the reported payroll and ISS at the unit profile rate. Year up to 2026 also returns projecao2027 with the same
 *         revenue (DRAFT CBS line = warning). Alerts for the sublimit (80%), EPP limit and the option window.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ano, required: true, schema: { type: integer } }
 *       responses:
 *         '200': { description: 'RegimeSimulacao (cents as strings)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *   /api/accounting/simulacoes/regime/sugestao:
 *     post:
 *       summary: Record the regime simulation as a SYSTEM suggestion (TROCA_DE_REGIME)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, ano]
 *               properties:
 *                 unitId: { type: string }
 *                 ano: { type: integer }
 *       responses:
 *         '201': { description: 'SimulacaoSugestao { suggestionId, reaproveitada, avisos }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *   /api/accounting/simulacoes/remuneracao-socio:
 *     get:
 *       summary: Partner pay simulation (pro-labore x dividends x JCP) for an annual amount
 *       description: >-
 *         Pure calculation. Three mixes of valorAnualCents - all pro-labore; one minimum wage of pro-labore plus dividends;
 *         minimum pro-labore plus JCP up to the partner share of the deductible limit (Real only) plus dividends. INSS 11%
 *         up to the ceiling, CPP 20% outside the DAS, IRRF table on pro-labore, IRRF 10% above R$ 50 thousand a month on
 *         dividends, IRRF 17.5% on JCP. 404 unknown partner; 400 SOCIO_FORA_DO_ESCOPO, SOCIO_FORA_DO_ANO.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ano, required: true, schema: { type: integer } }
 *         - { in: query, name: partnerId, required: true, schema: { type: string } }
 *         - { in: query, name: valorAnualCents, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'RemuneracaoSocioSimulacao (cents as strings)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { description: 'Unit or partner not found' }
 *   /api/accounting/simulacoes/remuneracao-socio/sugestao:
 *     post:
 *       summary: Record the partner pay simulation as a SYSTEM suggestion (REMUNERACAO_SOCIO)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, ano, partnerId, valorAnualCents]
 *               properties:
 *                 unitId: { type: string }
 *                 ano: { type: integer }
 *                 partnerId: { type: string }
 *                 valorAnualCents: { type: string }
 *       responses:
 *         '201': { description: 'SimulacaoSugestao { suggestionId, reaproveitada, avisos }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
