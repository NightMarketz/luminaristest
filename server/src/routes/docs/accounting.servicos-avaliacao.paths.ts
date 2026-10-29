/**
 * OpenAPI de /api/accounting/tax-optimization/servicos/avaliar (EFICIENCIA-FISCAL PR-5, BRIEF itens 27, 30, 31, 32).
 * Um arquivo por feature (dono, 2026-10-16).
 * @openapi
 * paths:
 *   /api/accounting/tax-optimization/servicos/avaliar:
 *     post:
 *       summary: Evaluate the unit's services for the year (enquadramento alerts and tax-efficiency suggestions)
 *       description: >-
 *         Alerts PROFISSAO_REGULAMENTADA_TIRA_16, MEDICO_COM_SERVICO_ESTETICO, LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES,
 *         CESSAO_MAO_DE_OBRA_MEDICA and PACOTE_FATO_GERADOR_FORA_DO_PADRAO (severity/motivoInformativo, each with its
 *         article), from declared data only. Proposes SYSTEM suggestions PRESUNCAO_HOSPITALAR (Presumido, TERAPEUTICA
 *         service with revenue at 32 %, Lei 9.249 art. 15 § 1º III "a") and NBS_SAUDE_2027 (aesthetic service with a
 *         health NBS, LC 214 art. 130 + Anexo III) — idempotent, one PROPOSED per subject; never changes a profile or an
 *         assessment.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ano, required: true, schema: { type: integer, minimum: 2025 } }
 *       responses:
 *         '200': { description: 'ServicoFiscalAvaliacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
