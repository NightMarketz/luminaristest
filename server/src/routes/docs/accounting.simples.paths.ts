/**
 * OpenAPI de /api/accounting/simples.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/simples/historico/{competencia}:
 *     get:
 *       summary: Read the pre-adoption revenue/payroll of a month (BE-INCR-SIMPLES-GET-ENTRADAS item 1)
 *       description: >-
 *         O histórico gravado pelo PUT da mesma competência, na unidade. 404 - sem registro na competência (F-GE-1);
 *         o FE trata como formulário em branco.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'SimplesHistoricoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Upsert pre-adoption monthly gross revenue and payroll (BE-INCR-SIMPLES-NACIONAL PR-2, X14 items 10-11)
 *       description: >-
 *         Receita bruta (e, opcional, folha para o fator R) de um mês anterior ao uso do sistema, por unidade. Entra no
 *         RBT12; sem 12 meses declarados (histórico ou subrazão) a apuração alerta RBT12_INCOMPLETO. 404 - documento
 *         de origem fora da unidade.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, receitaBrutaCents]
 *               properties:
 *                 unitId:            { type: string, minLength: 1 }
 *                 receitaBrutaCents: { type: integer, minimum: 0 }
 *                 folhaCents:        { type: integer, minimum: 0, nullable: true }
 *                 sourceDocumentId:  { type: string, nullable: true }
 *       responses:
 *         '200': { description: 'SimplesHistoricoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/simples/segregacao/{competencia}:
 *     get:
 *       summary: Read the manual revenue segregation of a month (BE-INCR-SIMPLES-GET-ENTRADAS item 2)
 *       description: >-
 *         As parcelas gravadas pelo PUT da mesma competência, com os tributos excluídos derivados do motivo. 404 - sem
 *         registro na competência (F-GE-1).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'SimplesSegregacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *     put:
 *       summary: Upsert the manual revenue segregation of a month (X14 item 12)
 *       description: >-
 *         Parcelas da receita com o motivo legal que tira tributos do DAS (MONOFASICO, ICMS_ST, ISS_RETIDO ou
 *         MONOFASICO_E_ICMS_ST - Res. CGSN 140 art. 25 §§ 6º e 8º). Os tributos excluídos derivam do motivo. ISS devido
 *         a outro município não é motivo (continua no DAS).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, parcelas]
 *               properties:
 *                 unitId: { type: string, minLength: 1 }
 *                 parcelas:
 *                   type: array
 *                   maxItems: 50
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required: [natureza, receitaCents, motivo]
 *                     properties:
 *                       natureza:     { type: string, enum: [SERVICO, REVENDA, LOCACAO_MOVEL] }
 *                       receitaCents: { type: integer, minimum: 1 }
 *                       motivo:       { type: string, enum: [MONOFASICO, ICMS_ST, ISS_RETIDO, MONOFASICO_E_ICMS_ST] }
 *       responses:
 *         '200': { description: 'SimplesSegregacaoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/simples/parcerias:
 *     post:
 *       summary: Create a salon partnership contract (X14 item 13 - Lei 12.592 art. 1º-A)
 *       description: >-
 *         Contrato salão-parceiro × profissional-parceiro. A cota do profissional sai da receita bruta do salão (§ 5º)
 *         nos itens de serviço feitos por ele, a partir da homologação (§ 8º). 409 - outro contrato do mesmo
 *         profissional vigente no período.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, profissionalContactId, cotaSalaoBp, naturezaCota, homologadoEm, sindicato, vigenteDesde, vigenteAte]
 *               properties:
 *                 unitId:                { type: string, minLength: 1 }
 *                 profissionalContactId: { type: string, minLength: 1 }
 *                 cotaSalaoBp:           { type: integer, minimum: 1, maximum: 9999 }
 *                 naturezaCota:          { type: string, enum: [ALUGUEL_BEM_MOVEL, GESTAO] }
 *                 homologadoEm:          { type: string, format: date }
 *                 sindicato:             { type: string, minLength: 1, maxLength: 200 }
 *                 vigenteDesde:          { type: string, format: date }
 *                 vigenteAte:            { type: string, format: date, nullable: true }
 *       responses:
 *         '201': { description: 'SalaoParceriaContratoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'Outro contrato do profissional vigente no período' }
 *     get:
 *       summary: List the unit's partnership contracts (X14 item 13)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'SalaoParceriaContratoView[]' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/simples/parcerias/{id}:
 *     patch:
 *       summary: Update a partnership contract (X14 item 13)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId]
 *               properties:
 *                 unitId:                { type: string, minLength: 1 }
 *                 profissionalContactId: { type: string, minLength: 1 }
 *                 cotaSalaoBp:           { type: integer, minimum: 1, maximum: 9999 }
 *                 naturezaCota:          { type: string, enum: [ALUGUEL_BEM_MOVEL, GESTAO] }
 *                 homologadoEm:          { type: string, format: date }
 *                 sindicato:             { type: string, minLength: 1, maxLength: 200 }
 *                 vigenteDesde:          { type: string, format: date }
 *                 vigenteAte:            { type: string, format: date, nullable: true }
 *       responses:
 *         '200': { description: 'SalaoParceriaContratoView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *         '409': { description: 'Outro contrato do profissional vigente no período' }
 *     delete:
 *       summary: Soft-delete a partnership contract (X14 item 13)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: 'Removido (soft-delete)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/simples/apuracoes/{competencia}/calcular:
 *     post:
 *       summary: Compute the Simples Nacional assessment of a month on demand (BE-INCR-SIMPLES-NACIONAL PR-3, X14 item 17)
 *       description: >-
 *         Calcula a apuração ME/EPP da competência a partir do subrazão fiscal de receita, do histórico pré-adoção, da
 *         segregação manual e dos contratos de parceria. Nada é gravado. 400 - perfil do ano ausente ou fora do Simples.
 *         422 - regra não regulamentada (ex.: início de atividade a partir de 2027).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId]
 *               properties:
 *                 unitId: { type: string, minLength: 1 }
 *       responses:
 *         '200': { description: 'ApuracaoSimples (atividades, tributos, espelho do PGDAS-D, tie-out, alertas)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '422': { description: 'SIMPLES_REGRA_NAO_REGULAMENTADA' }
 *
 *   /api/accounting/simples/apuracoes/{competencia}:
 *     get:
 *       summary: PGDAS-D mirror of the month, with the registered official DAS and the divergence (X14 item 18)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'ApuracaoSimples' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/simples/apuracoes/{competencia}/das:
 *     put:
 *       summary: Register the official DAS and persist the assessment (X14 items 19-21)
 *       description: >-
 *         Grava a apuração (SimplesApuracao) com o DAS oficial e provisiona D dedução da receita / C Simples a recolher
 *         pelo valor oficial. Novo registro na mesma competência substitui o anterior e estorna a provisão dele. O mesmo
 *         número e valor de novo só completa a provisão pendente. 400 - alerta bloqueante (TIEOUT_DIVERGENTE,
 *         RBT12_INCOMPLETO, ATIVIDADE_SEM_ANEXO). 409 - a receita mudou depois do cálculo.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, numeroDocumento, valorCents, vencimento]
 *               properties:
 *                 unitId:           { type: string, minLength: 1 }
 *                 numeroDocumento:  { type: string, minLength: 1, maxLength: 40 }
 *                 valorCents:       { type: integer, minimum: 1 }
 *                 vencimento:       { type: string, format: date }
 *                 sourceDocumentId: { type: string, nullable: true }
 *       responses:
 *         '200': { description: 'ApuracaoSimples com dasOficial' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: 'A receita mudou depois do cálculo, ou registro concorrente' }
 *
 *   /api/accounting/simples/aliquotas/{competencia}:
 *     get:
 *       summary: Suggested rates for documents issued in the month, with the calculation trail (X14 PR-4 item 29)
 *       description: >-
 *         SUGESTÃO (o prestador responde pela alíquota informada, LC 123 art. 21 § 4º VI) por atividade do cadastro de
 *         serviços e das que tiveram receita no PA, com faixa do RBT12 global: no mês de abertura do CNPJ, 2% (§ 4º II);
 *         até 2026, a faixa do mês anterior (PA = M−1); a partir de 2027, a do mês da prestação (PA = M, LC 227 art. 169;
 *         janela M−13…M−2, LC 214 art. 517). Devolve PA, RBT12, janela, regra e avisos; o pTotTribSN só sugerido (B-4) e,
 *         a partir de 2027, os % de ICMS/IBS/CBS para o crédito do adquirente. 400 - MEI (SIMEI não tem alíquota).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: competencia, required: true, schema: { type: string, pattern: '^[0-9]{4}-(0[1-9]|1[0-2])$' } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'AliquotasSimples' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/simples/registro-valores-a-receber:
 *     get:
 *       summary: Registro de valores a receber do regime de caixa — Anexo IX da Res. CGSN 140 (X14-CAIXA item 19)
 *       description: >-
 *         Uma linha por venda finalizada no ano com saldo em algum momento (arts. 20 III e 77). Venda no cartão vem com
 *         dispensadaCartao (art. 77 § 3º). Só até 2026 (o caixa acaba em 01/01/2027, Res. CGSN 190/2026).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: ano, required: true, schema: { type: integer, minimum: 2018, maximum: 2026 } }
 *       responses:
 *         '200': { description: '{ ano, linhas: LinhaAnexoIx[] }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/simples/creditos-incobraveis:
 *     post:
 *       summary: Registra crédito considerado incobrável (Res. CGSN 140 art. 77 VI e §§ 5º–6º; X14-CAIXA item 20)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, saleId, valorCents, meioCobranca, data, evidencia]
 *               properties:
 *                 unitId:       { type: string, minLength: 1 }
 *                 saleId:       { type: string, minLength: 1 }
 *                 valorCents:   { type: integer, minimum: 1 }
 *                 meioCobranca: { type: string, enum: [NOTIFICACAO_EXTRAJUDICIAL, PROTESTO, COBRANCA_JUDICIAL, CADASTRO_PROTECAO_CREDITO] }
 *                 data:         { type: string, format: date }
 *                 evidencia:    { type: string, minLength: 1, maxLength: 500 }
 *       responses:
 *         '201': { description: 'SimplesCreditoIncobravelView' }
 *         '400': { description: 'Corpo inválido ou valor maior que o saldo a receber' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/simples/creditos-incobraveis/{id}:
 *     delete:
 *       summary: Soft-delete de crédito incobrável (X14-CAIXA item 20)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '204': { description: 'Removido (soft-delete)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/accounting/simples/dasn-simei/{ano}:
 *     get:
 *       summary: DASN-SIMEI mirror of the year (X14 PR-4 item 27)
 *       description: >-
 *         Receita bruta total e parcela sujeita ao ICMS do subrazão + contratação de empregado digitada (Res. CGSN 140 art.
 *         109). 400 - perfil do ano não é MEI.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'SimplesDasnSimeiView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     put:
 *       summary: Save the typed DASN-SIMEI field (X14 PR-4 item 27)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               required: [unitId, contratouEmpregado]
 *               properties:
 *                 unitId:             { type: string, minLength: 1 }
 *                 contratouEmpregado: { type: boolean }
 *       responses:
 *         '200': { description: 'SimplesDasnSimeiView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting/simples/defis/{ano}:
 *     get:
 *       summary: Minimal DEFIS mirror of the year (X14 PR-4 item 28)
 *       description: >-
 *         Só anos ≤ 2026 com mês apurado aqui. Lucro contábil (DRE do ano) e estoques inicial/final (conta de estoques em
 *         31/12) do razão + os digitados do manual do PGDAS-D/DEFIS 9.4.3.1. `lucroContabil` traz o limite de isenção do
 *         art. 145 § 1º da Res. CGSN 140 (presunção do IRPJ × receita das apurações − IRPJ calculado; null com aviso quando
 *         falta presunção) e `informar` (item 4; BE-INCR-SIMPLES-DEFIS-MANUAL).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'SimplesDefisView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *     put:
 *       summary: Save the typed DEFIS fields (X14 PR-4 item 28)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: ano, required: true, schema: { type: integer } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties: false
 *               description: Σ socios.participacaoBp + cotasTesourariaBp = 10000 quando há sócios (manual 9.4.3.1 itens 7.3 e 8).
 *               required: [unitId, empregadosInicio, empregadosFim, ganhosCapitalCents, ganhosRendaVariavelCents, exportacaoDiretaCents, exportacaoComercial, cotasTesourariaBp, socios, doacoesEleitorais]
 *               properties:
 *                 unitId:                   { type: string, minLength: 1 }
 *                 empregadosInicio:         { type: integer, minimum: 0 }
 *                 empregadosFim:            { type: integer, minimum: 0 }
 *                 ganhosCapitalCents:       { type: integer, minimum: 0 }
 *                 ganhosRendaVariavelCents: { type: integer, minimum: 0 }
 *                 exportacaoDiretaCents:    { type: integer, minimum: 0 }
 *                 cotasTesourariaBp:        { type: integer, minimum: 0, maximum: 10000 }
 *                 exportacaoComercial:
 *                   type: array
 *                   maxItems: 100
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required: [cnpj, valorCents]
 *                     properties:
 *                       cnpj:       { type: string, pattern: '^[A-Z0-9]{12}[0-9]{2}$' }
 *                       valorCents: { type: integer, minimum: 1 }
 *                 doacoesEleitorais:
 *                   type: array
 *                   maxItems: 100
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required: [cnpj, tipoBeneficiario, formaDoacao, valorCents]
 *                     properties:
 *                       cnpj:             { type: string, pattern: '^[A-Z0-9]{12}[0-9]{2}$' }
 *                       tipoBeneficiario: { type: string, enum: [CANDIDATO, COMITE_FINANCEIRO, PARTIDO_POLITICO] }
 *                       formaDoacao:      { type: string, enum: [CHEQUE, OUTROS_TITULOS_CREDITO, TRANSFERENCIA_ELETRONICA, DEPOSITO_ESPECIE, DINHEIRO, BENS, SERVICOS] }
 *                       valorCents:       { type: integer, minimum: 1 }
 *                 socios:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: false
 *                     required: [contactId, rendimentosIsentosCents, rendimentosTributaveisCents, participacaoBp, irrfCents]
 *                     properties:
 *                       contactId:                   { type: string, minLength: 1 }
 *                       rendimentosIsentosCents:     { type: integer, minimum: 0 }
 *                       rendimentosTributaveisCents: { type: integer, minimum: 0 }
 *                       participacaoBp:              { type: integer, minimum: 0, maximum: 10000 }
 *                       irrfCents:                   { type: integer, minimum: 0 }
 *       responses:
 *         '200': { description: 'SimplesDefisView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
