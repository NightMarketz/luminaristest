/**
 * OpenAPI do assinador local (X10a EMENDA-4 AL-PR-2; AL-3, AL-4, AL-5, AL-12; tabela de rotas §4.2): rotas de usuário em
 * /api/accounting/dfe-assinador e a rota do dispositivo em /api/dfe-assinador/v1 (sem JWT).
 * @openapi
 * paths:
 *   /api/accounting/dfe-assinador/{unitId}/codigos:
 *     post:
 *       summary: Generate a single-use pairing code for the unit's local signer (shown once; only its hash is stored)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '201':
 *           description: Pairing code (12 chars, TTL 10 min)
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   data:
 *                     type: object
 *                     properties:
 *                       codigo:   { type: string }
 *                       expiraEm: { type: string, format: date-time }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '422': { description: unidade_sem_cnpj }
 *         '500': { $ref: '#/components/responses/InternalServerError' }
 *   /api/accounting/dfe-assinador/{unitId}:
 *     get:
 *       summary: State of the unit's local signer (no token hash, no certificate, no subject); data is null when unpaired
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: DfeSignerView (online, diasParaVencer, versaoMinima, outrasUnidades) or null }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     delete:
 *       summary: Revoke the signer link of this unit only; revoking the last link revokes the device (its token gets 401)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: Revoked }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *   /api/dfe-assinador/v1/pareamento:
 *     post:
 *       summary: Signer-side pairing (no user session). Without Bearer a new device is created and its token returned once; with the Bearer of an already paired device and the same certificate, only the unit link is added
 *       tags: [Accounting]
 *       parameters:
 *         - { in: header, name: Authorization, required: false, schema: { type: string }, description: 'Bearer <device token> (2nd link of the same device)' }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [codigo, nomeDispositivo, versaoAssinador, certificadoDerB64]
 *               properties:
 *                 codigo:            { type: string }
 *                 nomeDispositivo:   { type: string }
 *                 versaoAssinador:   { type: string, example: '1.0.0' }
 *                 certificadoDerB64: { type: string, description: public certificate only (DER, base64) }
 *       responses:
 *         '201': { description: 'New device: { dispositivoId, token, unidades, ambiente, protocolo }' }
 *         '200': { description: 'Link added to the existing device: { dispositivoId, unidades, ambiente, protocolo } (no token)' }
 *         '400': { description: dfe_signer_codigo_invalido | dfe_signer_cnpj_divergente | dfe_signer_certificado_vencido | dfe_signer_certificado_invalido | dfe_signer_certificado_divergente }
 *         '401': { description: Unknown or revoked device token }
 *         '422': { description: unidade_sem_cnpj }
 *         '429': { description: Rate limited }
 *         '503': { description: dfe_signer_ambiente_nao_configurado }
 *   /api/dfe-assinador/v1/tarefas:
 *     get:
 *       summary: Signer long-poll (AL-7). The poll is the heartbeat (lastSeenAt, version, token present; a certificate other than the paired one counts as no token). Returns the device tasks at once, or 204 after up to 'espera' seconds
 *       tags: [Accounting]
 *       parameters:
 *         - { in: header, name: Authorization, required: true, schema: { type: string }, description: 'Bearer <device token>' }
 *         - { in: query, name: espera, required: false, schema: { type: integer, minimum: 0, maximum: 25, default: 25 } }
 *         - { in: query, name: versaoAssinador, required: true, schema: { type: string, example: '1.0.0' } }
 *         - { in: query, name: tokenPresente, required: true, schema: { type: string, enum: ['true', 'false'] } }
 *         - { in: query, name: certThumbprintSha256, required: true, schema: { type: string, description: sha256 of the certificate DER, hex } }
 *       responses:
 *         '200': { description: '{ tarefas: [ASSINAR | TRANSMITIR] } (contract v1, dfeSigner.schema.json)' }
 *         '204': { description: No task within the wait }
 *         '400': { description: Invalid heartbeat query }
 *         '401': { description: Unknown or revoked device token }
 *         '429': { description: Rate limited }
 *   /api/dfe-assinador/v1/tarefas/{id}/resultado:
 *     post:
 *       summary: Result of a signer task (AL-6). Idempotent by task id; the ASSINAR result carries the public certificate that signed (L-AL-1), never stored
 *       tags: [Accounting]
 *       parameters:
 *         - { in: header, name: Authorization, required: true, schema: { type: string }, description: 'Bearer <device token>' }
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [ok]
 *               properties:
 *                 ok:                { type: boolean }
 *                 tipo:              { type: string, enum: [ASSINAR, TRANSMITIR] }
 *                 signatureValueB64: { type: string }
 *                 certificadoDerB64: { type: string }
 *                 httpStatus:        { type: integer }
 *                 corpoB64:          { type: string }
 *                 code:              { type: string, enum: [TOKEN_AUSENTE, PIN_CANCELADO, CERT_VENCIDO, CONTEUDO_RECUSADO, TLS, TIMEOUT, REDE, HTTP, HOST_FORA_DA_LISTA] }
 *                 message:           { type: string }
 *       responses:
 *         '200': { description: '{ idempotente } — true when the same result was already recorded' }
 *         '400': { description: Invalid body | dfe_signer_resultado_tipo_divergente }
 *         '401': { description: Unknown or revoked device token }
 *         '404': { description: dfe_signer_tarefa_nao_encontrada (not a task of this device) }
 *         '409': { description: dfe_signer_resultado_conflitante | dfe_signer_tarefa_vencida }
 *         '429': { description: Rate limited }
 *   /api/dfe-assinador/v1/tarefas/{id}/heartbeat:
 *     post:
 *       summary: Signer heartbeat for a delivered task (AL-6). Renews the lease (leaseAte = now + 30 s) only for a task of this device, DELIVERED and not expired
 *       tags: [Accounting]
 *       parameters:
 *         - { in: header, name: Authorization, required: true, schema: { type: string }, description: 'Bearer <device token>' }
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: '{ leaseAte } — ISO instant until which the task stays with this device' }
 *         '401': { description: Unknown or revoked device token }
 *         '404': { description: dfe_signer_tarefa_nao_encontrada (not a task of this device) }
 *         '409': { description: dfe_signer_tarefa_vencida | dfe_signer_tarefa_nao_entregue }
 *         '429': { description: Rate limited }
 */
export {};
