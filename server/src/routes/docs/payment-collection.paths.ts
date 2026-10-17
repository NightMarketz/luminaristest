/**
 * OpenAPI de /api/payment-collection.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/payment-collection/webhook/{provider}/{accountId}:
 *     post:
 *       summary: Provider webhook (public) — wakes up a re-query, never transitions from the body (P2-5)
 *       description: >-
 *         Assinatura x-signature com o segredo da conta; janela de 15 dias. Conta inexistente, inativa, de outro
 *         provedor, assinatura ou janela inválida ⇒ 401 sem escrita.
 *       tags: [Accounting]
 *       parameters:
 *         - { in: path, name: provider, required: true, schema: { type: string } }
 *         - { in: path, name: accountId, required: true, schema: { type: string } }
 *         - { in: query, name: data.id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'recebido' }
 *         '401': { description: 'assinatura inválida / conta não habilitada' }
 */
export {};
