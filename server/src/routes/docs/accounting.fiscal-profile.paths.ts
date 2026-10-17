/**
 * OpenAPI de /api/accounting/fiscal-profile.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/accounting/fiscal-profile:
 *     get:
 *       summary: Read the unit fiscal profile (BE-INCR-NFE-COST-REGIME, nó X6, F-X6-1 a)
 *       description: >-
 *         404: fiscal_profile_missing
 *         The axes that decide the NF-e acquisition cost (D3): icmsContribuinte (ICMS credit on
 *         purchase for resale), pisCofinsRegime (credit only under NAO_CUMULATIVO), the 3 exception
 *         flags with conservative defaults (F-X6-3 b — cédula 14/09), the recoverable-tax accounts
 *         (F-X6-8 a) and partnerAccountRef (R8). 404 when the unit has no profile — the import and
 *         the preview answer 400 fiscal_profile_missing in that case (F-X6-6 a).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *       responses:
 *         '200': { description: 'FiscalProfileView' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *     put:
 *       summary: Create or replace the unit fiscal profile (idempotent upsert, item 4)
 *       description: >-
 *         409: POLICY_APPROVAL_REQUIRED — escopo com contador responsável ativo; proponha em POST /api/accounting/policy-versions (F-POL-4 b)
 *         Consistency (LC 123/2006 art. 23): SIMPLES cannot combine with icmsContribuinte=true nor
 *         pisCofinsRegime≠SIMPLES; a normal regime cannot use pisCofinsRegime=SIMPLES. Recoverable-tax
 *         account ids must be existing Asset leaves of this scope (the codes are the accountant's).
 *         Audited as fiscal_profile.updated (enum/boolean/id only).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [unitId, regimeTributario, icmsContribuinte, pisCofinsRegime]
 *               properties:
 *                 unitId: { type: string }
 *                 regimeTributario: { type: string, enum: [SIMPLES, PRESUMIDO, REAL] }
 *                 icmsContribuinte: { type: boolean }
 *                 pisCofinsRegime: { type: string, enum: [SIMPLES, CUMULATIVO, NAO_CUMULATIVO] }
 *                 pisCofinsCreditExcludesIcms: { type: boolean, default: true, description: 'Lei 10.833/2003 art. 3º § 2º III (redação da Lei 14.592/2023)' }
 *                 pisCofinsCreditIncludesIpi: { type: boolean, default: false }
 *                 pisCofinsCreditFromSimplesSupplier: { type: boolean, default: false }
 *                 icmsRecuperavelAccountId: { type: string, nullable: true }
 *                 pisCofinsRecuperavelAccountId: { type: string, nullable: true }
 *                 partnerAccountRef: { type: string, nullable: true }
 *                 codMun: { type: string, nullable: true, description: 'BE-INCR-DFE — IBGE 7 dígitos (cLocEmi)' }
 *                 inscricaoMunicipal: { type: string, nullable: true }
 *                 cnae: { type: string, nullable: true }
 *                 dpsSerie: { type: integer, default: 1, description: 'série da DPS, 1–49999 (RN E0010)' }
 *                 regEspTrib: { type: integer, default: 0 }
 *                 regApTribSN: { type: integer, nullable: true, description: 'só SIMPLES — 1|2|3 (leiaute [141])' }
 *                 issAliquotaBp: { type: integer, nullable: true, description: '5a — só município NÃO conveniado; ≤ 500 (E0595)' }
 *                 issRetidoTomadorPj: { type: boolean, default: false, description: '5b' }
 *                 pacoteFatoGerador: { type: string, enum: [CONSUMO, VENDA], default: CONSUMO, description: '5c' }
 *                 pacoteCTribNac: { type: string, nullable: true, pattern: '^\d{6}$', description: 'BE-INCR-PACOTE-VALIDADE 13a (F-PV-9b a) — cTribNac do pacote (lista nacional); NFS-e do pacote VENDA e do saldo vencido em CONSUMO' }
 *                 pacoteCNBS: { type: string, nullable: true, pattern: '^\d{9}$', description: 'BE-INCR-PACOTE-VALIDADE 13a — cNBS do pacote (Anexo B)' }
 *                 ibsCbsInformar: { type: boolean, description: '5d — default true fora do SIMPLES' }
 *                 ibsCbsCst: { type: string, nullable: true }
 *                 ibsCbsClassTrib: { type: string, nullable: true, description: 'prefixo 3 dígitos = CST (E0959)' }
 *                 pTotTribFedCent: { type: integer, nullable: true, description: 'Lei 12.741 — centésimos de %; obrigatório p/ não-optante (E0713)' }
 *                 pTotTribEstCent: { type: integer, nullable: true }
 *                 pTotTribMunCent: { type: integer, nullable: true }
 *                 pTotTribSNCent: { type: integer, nullable: true, description: 'só SIMPLES' }
 *                 emissaoForaDoMes: { type: string, enum: [AVISAR, BLOQUEAR], default: AVISAR, description: '5f' }
 *       responses:
 *         '200': { description: 'FiscalProfileView (inclui emissao.completo/faltantes/pendingExternalValidation — BE-INCR-DFE item 7)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/UnitNotFound' }
 *         '409': { $ref: '#/components/responses/UnitDeleted' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
