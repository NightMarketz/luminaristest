/**
 * OpenAPI de /api/lalur.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   /api/lalur/catalog:
 *     get:
 *       summary: Leiaute 12 catalog for the e-Lalur cadastro screen (linhas E of a livro, or PARTEB_PADRAO)
 *       description: >-
 *         FE-INCR-LALUR (Fork F-FE-1 - a). Read-only view of the Tabelas Dinamicas fixture, global
 *         (unitId is auth scope only). Exactly one of livro or aba=PARTEB_PADRAO. livro returns the
 *         ENTRY lines (tipo E) in force for the year - the same predicate the write path enforces,
 *         so the combobox never offers a code POST /entries would refuse; a code duplicated in the
 *         official sheet surfaces once (first occurrence, what findLinha resolves). aba=PARTEB_PADRAO
 *         returns the M010.COD_PB_RFB universe filtered by tributo (A matches both) with no vigencia
 *         filter (the write path applies none), so year is not used there. q (>= 2 chars) is an
 *         accent-insensitive substring filter on codigo/descricao.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: year, required: false, schema: { type: integer }, description: required with livro }
 *         - { in: query, name: livro, required: false, schema: { type: string, enum: [lalur, lacs, n500, n620, n630, n660, n670] } }
 *         - { in: query, name: aba, required: false, schema: { type: string, enum: [PARTEB_PADRAO] } }
 *         - { in: query, name: tributo, required: false, schema: { type: string, enum: [I, C] } }
 *         - { in: query, name: q, required: false, schema: { type: string, minLength: 2 } }
 *       responses:
 *         '200': { description: '{ rows: [{ codigo, descricao, tipo: E, tipoLanc?, vigencia: { de, ate } }] } or { rows: [{ codigo, descricao, tributo }] }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/lalur/entries:
 *     get:
 *       summary: List e-Lalur/e-Lacs adjustment lines (Parte A M300/M350 + linhas E do Bloco N)
 *       description: >-
 *         BE-INCR-SPED-ECF-FASE3B item 11 (Fork 4 - b, model persistido). One row per (year, quarter,
 *         livro, codigo). The ECF Real generator reads this store; the generation DTO never carries
 *         adjustments. Archived rows are hidden unless includeArchived=true.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: year, required: false, schema: { type: integer } }
 *         - { in: query, name: quarter, required: false, schema: { type: string, enum: [T01, T02, T03, T04, A00, A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A11, A12] } }
 *         - { in: query, name: livro, required: false, schema: { type: string, enum: [lalur, lacs, n500, n620, n630, n660, n670] } }
 *         - { in: query, name: includeArchived, required: false, schema: { type: boolean } }
 *       responses:
 *         '200': { description: 'adjustment lines' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Register one adjustment line (validated against the Leiaute 12 catalog)
 *       description: >-
 *         codigo must exist in the Tabela Dinamica sheet of the livro, be an ENTRY line (tipo E - CNA/CA/R
 *         are computed by the PVA) and be in force for the year; otherwise 400 with the code and the
 *         reason (never a silent drop). indRelacao conditionals mirror REGRA_RELACAO_INEXISTENTE (Manual
 *         p.247); TIPO_LANCAMENTO=P forces indRelacao=1 (REGRA_IND_RELACAO). Lines of livro n500/n630/n670
 *         carry no indRelacao/parteBId/accountId/histLancamento. valorCents is always >= 0. X7 Fase B (BRIEF B
 *         item 12): quarter accepts T01..T04 only when the year's effective form is TRIMESTRAL (also with no
 *         profile) and A00..A12 only when ANUAL; A0m before the start of activity is 400; n620/n660 only in
 *         A01..A12, validated against the N620/N660 sheets (catalog landed in X7 Fase B PR-4, item 22); n630/n670 only in T0x/A00.
 *         A compensation (P) in A0m is capped by the Parte B account's opening balance of the year.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateLalurEntryInput' }
 *       responses:
 *         '201': { description: 'the created line' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/entries/{id}:
 *     patch:
 *       summary: Update an adjustment line (partial; merged row fully re-validated)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdateLalurEntryInput' }
 *       responses:
 *         '200': { description: 'the updated line' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/entries/{id}/archive:
 *     post:
 *       summary: Archive an adjustment line (soft; the code is freed for re-registration)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ArchiveLalurInput' }
 *       responses:
 *         '200': { description: 'the archived line (idempotent)' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b:
 *     get:
 *       summary: List Parte B accounts (M010) of the e-Lalur/e-Lacs
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: codTributo, required: false, schema: { type: string, enum: [I, C] } }
 *         - { in: query, name: includeArchived, required: false, schema: { type: boolean } }
 *       responses:
 *         '200': { description: 'Parte B accounts' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Register a Parte B account (M010 - codCtaB + codTributo is the key)
 *       description: >-
 *         codPbRfb must exist in the PARTEB_PADRAO sheet for the tributo (REGRA_M010_COD_PB_RFB_TRIBUTO,
 *         Manual p.237). codCtaB is OUR stable code, reconciled by the PVA against the E020 recovered from
 *         the previous ECF - never renumber it between years.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateLalurParteBAccountInput' }
 *       responses:
 *         '201': { description: 'the created account' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/lalur/parte-b/{id}:
 *     patch:
 *       summary: Update a Parte B account (partial; key fields immutable)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdateLalurParteBAccountInput' }
 *       responses:
 *         '200': { description: 'the updated account' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b/{id}/archive:
 *     post:
 *       summary: Archive a Parte B account (soft; live related lines and movements must be archived first)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ArchiveLalurInput' }
 *       responses:
 *         '200': { description: 'the archived account (idempotent)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b/movements:
 *     get:
 *       summary: List Parte B movements without Parte A reflection (M410)
 *       description: >-
 *         ECF Fase 3C (ADR EMENDA 2026-09-12, 3a). One row per M410 line under the M030 of (year, quarter).
 *         origem=system rows are the PF/BC derived by the quarter close (Fork F-3C-2 a).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: year, required: false, schema: { type: integer } }
 *         - { in: query, name: quarter, required: false, schema: { type: string, enum: [T01, T02, T03, T04, A00, A01, A02, A03, A04, A05, A06, A07, A08, A09, A10, A11, A12] } }
 *         - { in: query, name: parteBId, required: false, schema: { type: string } }
 *         - { in: query, name: includeArchived, required: false, schema: { type: boolean } }
 *       responses:
 *         '200': { description: 'movements' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *     post:
 *       summary: Register an M410 movement (codTributo derived from the account; origem=user)
 *       description: >-
 *         parteBId must be a live Parte B account in scope; contrapartidaId (transfer) must be live and of the
 *         SAME tributo (REGRA_MESMO_TRIBUTO) and is forbidden with PF/BC (REGRA_NAO_PREENCHER_CTP, Manual p.269).
 *         historico may not contain '|' (SPED field separator). processos[] = M415 (replaces the set).
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/CreateLalurParteBMovementInput' }
 *       responses:
 *         '201': { description: 'the created movement' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b/movements/{id}:
 *     patch:
 *       summary: Update an M410 movement (partial; year/quarter/parteBId immutable; system PF/BC refuses value/indicador)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UpdateLalurParteBMovementInput' }
 *       responses:
 *         '200': { description: 'the updated movement' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b/movements/{id}/archive:
 *     post:
 *       summary: Archive an M410 movement (soft, idempotent)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: path, name: id, required: true, schema: { type: string } }
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ArchiveLalurInput' }
 *       responses:
 *         '200': { description: 'the archived movement' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b/close:
 *     post:
 *       summary: Close a Parte B quarter — materialize the M500 balances and derive PF/BC (Fork N-1 a)
 *       description: >-
 *         Requires the previous quarter closed (T01 requires the previous exercise fully closed when any
 *         earlier closing exists — continuity guard C3) and no later quarter closed. Re-closing recomputes.
 *         Derives the PF (IRPJ) / BC (CSLL) movement of the quarter from the ledger result + Parte A lines
 *         (Fork F-3C-2 a): base below zero with no prejuizo account (COD_PB_RFB 1000/1003) is 400; more than
 *         one is 400 (ambiguous). A compensation (P) that exceeds the account balance is 400 (item 13).
 *         Emits lalur.parte_b_closed with the sha256 of the balance set (never the values). X7 Fase B (BRIEF B
 *         item 12): when the year's effective form is ANUAL only A00 closes (A01..A12 and T0x are 400; IN RFB
 *         1.700 art. 50 II), and the exercise continuity links the last period of N (T04 or A00) to the first of N+1.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LalurParteBPeriodInput' }
 *       responses:
 *         '200': { description: 'the closing with its materialized balances' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/lalur/parte-b/reopen:
 *     post:
 *       summary: Reopen a Parte B quarter — drops the materialized balances (no later quarter may be closed)
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/LalurParteBPeriodInput' }
 *       responses:
 *         '200': { description: '{ year, quarter, reopened: true }' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/lalur/parte-b/balances:
 *     get:
 *       summary: Parte B balances diagnostic — materialized (closed) vs recomputed from the current store
 *       description: >-
 *         Per quarter and account: sdIni / vlA / vlB / sdFim (signed, D positive, C negative, as strings) on both
 *         sides plus divergences[]. The ECF Real generation runs this same diagnostic and refuses with 400 when
 *         divergences exist (re-close the period). BRIEF 3C item 11. X4-14 (item 14, EMENDA §2.4 2026-09-15):
 *         warnings[] lists every Parte A adjustment with an account relation (indRelacao 2|3) whose valorCents
 *         equals none of the account's 4 K155/K355 aggregates in the quarter (Σ debits, Σ credits, period balance,
 *         final balance) and cites no M312/M362 — REGRA_REGISTRO_M312_OBRIGATORIO (p.253). Warning only; the
 *         generation never refuses on it.
 *       tags: [Accounting]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: year, required: true, schema: { type: integer } }
 *       responses:
 *         '200': { description: 'diagnostic' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 */
export {};
