/**
 * OpenAPI de /api/package-acceptances.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/package-acceptances/notice:
 *     get:
 *       summary: Texto e data de validade que a tela de venda deve mostrar para um pacote (FE-INCR-PACOTE-VALIDADE)
 *       description: >-
 *         Fonte unica do texto legal versionado e do ultimo dia valido (com feriado nacional). validityDays vem do catalogo
 *         no servidor. Pacote sem validade devolve text, expiresOn e textSha256 nulos. Pacote fora do catalogo do tenant e 404.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: packageId, required: true, schema: { type: string } }
 *         - { in: query, name: saleDate, required: true, schema: { type: string, format: date }, description: 'YYYY-MM-DD real, senao 400' }
 *       responses:
 *         '200': { description: 'validityDays, saleDate, expiresOn, textVersion, text, textSha256' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/package-acceptances:
 *     post:
 *       summary: Registra o aceite da validade do pacote de uma venda (append-only, um por venda)
 *       description: >-
 *         409: PACKAGE_ACCEPTANCE_EXISTS ou PACKAGE_NOTICE_CHANGED
 *         O servidor so confia no FE para textVersion e textSha256. Le a venda, o cliente e a data da venda e o
 *         validityDays do catalogo, re-renderiza o texto e compara o hash. Hash diferente e 409 PACKAGE_NOTICE_CHANGED;
 *         segundo aceite da mesma venda e 409 PACKAGE_ACCEPTANCE_EXISTS; pacote sem validade e 400 PACKAGE_WITHOUT_VALIDITY.
 *         Nao existe PUT nem DELETE - a linha e prova.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreatePackageAcceptance' }
 *       responses:
 *         '201': { description: 'Aceite gravado (PackageAcceptanceResponse)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *     get:
 *       summary: Aceite de uma venda de pacote, ou null
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: saleId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'PackageAcceptanceResponse ou null' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *
 *   /api/package-acceptances/{saleId}/receipt:
 *     get:
 *       summary: Comprovante da venda de pacote (PDF) com a validade em destaque e o aceite
 *       description: >-
 *         PDF pelo pipeline de lib/pdf.ts. A clausula sai em 12pt negrito dentro de caixa com borda, com o aceite
 *         (quem, quando, versao do texto) e linha de assinatura do cliente. Sem aceite, a clausula leva a marca
 *         ACEITE NAO REGISTRADO. Venda que nao e de um unico pacote ou pacote sem validade e 400.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: saleId, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'PDF (application/pdf, attachment)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 */
export {};
