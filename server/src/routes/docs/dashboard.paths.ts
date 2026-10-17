/**
 * OpenAPI de /api/dashboard.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *   # ─── DASHBOARD ──────────────────────────────────────────────────────────
 *   /api/dashboard/create:
 *     post:
 *       summary: Create a new dashboard (installs table preset suite for the user)
 *       description: >
 *         Accepts either a quick creation payload (suiteKey) or a custom preset
 *         payload (presetKey + optional removedTables / addedFields). Both require `unit`
 *         (BE-INCR-ONBOARDING-FIRST-UNIT, F-I1-2 b) - the first row of `units` is created through
 *         the normal write path (plugins run) and its id is returned as `data.unitId`. If creating
 *         the unit fails the install is undone and the answer is 500 ONBOARDING_ROLLED_BACK.
 *         With `fiscal.regime` known, the company fiscal profile of the current year is created after the
 *         unit and `data.fiscal` carries status criado and the resolved SPED obligations (X13 PR-3).
 *         When the regime (and, for PRESUMIDO/REAL, `fiscal.icmsContribuinte`) allows it, the unit fiscal
 *         profile is derived and created next (I4 EMENDA 14/10, F-I4-6 a; REAL derives only for beautySalon,
 *         F-I4-8 a); a failure there is logged and the request goes on (F-I4-10 a).
 *         Last, `data.accounting` (I4, BE-INCR-ONBOARDING-ACTIVATION) reports the accounting of the unit:
 *         for a preset with a sector binding (beautySalon, aestheticClinic) the default binding is activated
 *         with installChartIfEmpty and openCurrentPeriodIfMissing, and the accounting mappers are reloaded so
 *         the first sale posts without a restart - status Active with sectorKey and bindingVersion. If the
 *         activation returns Draft or throws, or the reload fails, the system is NOT undone: 201 with status
 *         Draft and `blocking` (e.g. KIT_FISCAL_PROFILE_REQUIRED, ACCOUNTING_ACTIVATION_FAILED,
 *         ACCOUNTING_SYNC_RELOAD_FAILED) - unlike unit and fiscal failures, which answer 500 (F-I4-2 b).
 *         A preset without a sector binding (crmModule) gives status not-applicable and writes nothing.
 *         Returns 403 if the user already has tables configured.
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required: [suiteKey, unit]
 *                   properties:
 *                     mode: { type: string, enum: [quick] }
 *                     suiteKey: { type: string, description: Preset suite key, e.g. "agronegocio" }
 *                     unit:
 *                       type: object
 *                       required: [name]
 *                       additionalProperties: false
 *                       properties:
 *                         name: { type: string, maxLength: 120 }
 *                         cnpj: { type: string, maxLength: 18 }
 *                         type: { type: string, enum: [Own, Franchise, Department] }
 *                     fiscal:
 *                       type: object
 *                       description: 'X13 PR-3 - regime and size asked at onboarding; NAO_SEI creates nothing (data.fiscal.status pendente)'
 *                       required: [regime]
 *                       additionalProperties: false
 *                       properties:
 *                         regime: { type: string, enum: [MEI, SIMPLES, PRESUMIDO, REAL, NAO_SEI] }
 *                         grandePorte: { type: boolean, nullable: true }
 *                         icmsContribuinte: { type: boolean, nullable: true, description: 'I4 F-I4-7 a - sells goods with state registration? null/absent = do not know (no unit fiscal profile in PRESUMIDO/REAL)' }
 *                     modules:
 *                       type: array
 *                       description: 'I8 - module keys (flat list, F-CRM-9 b). Summed to the suite default; dependencies come from the registry (CRM-0 implicit). CRM-2 is a group key (BE-INCR-CRM-SUBMODULES F-SUB-2 a) that expands to CRM-2A + CRM-2B; data.modules.installed lists only atomic keys'
 *                       items: { type: string, enum: [CRM-0, CRM-1, CRM-2A, CRM-2B, CRM-3, CRM-2] }
 *                     selectOverrides:
 *                       type: object
 *                       description: 'I8 c11 (F-I8-C11) - { table: { field: options[] } }; only fields that are already select and in the module freeSelects allowlist; a text field yields 400 NOT_A_SELECT'
 *                       additionalProperties: { type: object, additionalProperties: { type: array, items: { type: string } } }
 *                 - type: object
 *                   required: [mode, presetKey, unit]
 *                   properties:
 *                     mode: { type: string, enum: [custom] }
 *                     presetKey: { type: string }
 *                     unit:
 *                       type: object
 *                       required: [name]
 *                       additionalProperties: false
 *                       properties:
 *                         name: { type: string, maxLength: 120 }
 *                         cnpj: { type: string, maxLength: 18 }
 *                         type: { type: string, enum: [Own, Franchise, Department] }
 *                     fiscal:
 *                       type: object
 *                       description: 'X13 PR-3 - regime and size asked at onboarding; NAO_SEI creates nothing (data.fiscal.status pendente)'
 *                       required: [regime]
 *                       additionalProperties: false
 *                       properties:
 *                         regime: { type: string, enum: [MEI, SIMPLES, PRESUMIDO, REAL, NAO_SEI] }
 *                         grandePorte: { type: boolean, nullable: true }
 *                         icmsContribuinte: { type: boolean, nullable: true, description: 'I4 F-I4-7 a - sells goods with state registration? null/absent = do not know (no unit fiscal profile in PRESUMIDO/REAL)' }
 *                     removedTables:
 *                       type: array
 *                       description: 'W2 (BE-INCR-WIZARD-REMOVABILITY) - a sector table that stays locked against the final kept set yields 400 with details { reason: TABLE_LOCKED, table, lock: { reason: ACCOUNTING | REQUIRED_RELATION | REQUIRED_TABLE | REQUIRED_CAPABILITY, by? } }; removing the dependents together with the target passes. Module tables follow the I8 module rules; Core tables are ignored'
 *                       items: { type: string }
 *                     addedFields:
 *                       type: object
 *                       description: 'I8 - a field declared by a module table cannot be shadowed (400)'
 *                       additionalProperties:
 *                         type: array
 *                         items: { type: object }
 *                     modules:
 *                       type: array
 *                       description: 'I8 - module keys (flat list, F-CRM-9 b). Summed to the suite default; dependencies come from the registry (CRM-0 implicit). CRM-2 is a group key (BE-INCR-CRM-SUBMODULES F-SUB-2 a) that expands to CRM-2A + CRM-2B; data.modules.installed lists only atomic keys'
 *                       items: { type: string, enum: [CRM-0, CRM-1, CRM-2A, CRM-2B, CRM-3, CRM-2] }
 *                     selectOverrides:
 *                       type: object
 *                       description: 'I8 c11 (F-I8-C11) - { table: { field: options[] } }; only fields that are already select and in the module freeSelects allowlist; a text field yields 400 NOT_A_SELECT'
 *                       additionalProperties: { type: object, additionalProperties: { type: array, items: { type: string } } }
 *       responses:
 *         '201':
 *           description: Dashboard created successfully
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean, example: true }
 *                   message: { type: string }
 *                   data: { type: object }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/dashboard/modules/install:
 *     post:
 *       summary: Turn on ONE module of the registry for an existing tenant (admin-only)
 *       description: >
 *         BE-INCR-CRM-MODULE-COMPOSITION (I8) behavior 8. Installs the module tables in registry order
 *         (install-table primitive), then runs the additive sync-preset on installed tables whose preset
 *         relates to the module (e.g. leads.accountId after CRM-2A). Idempotent - an installed module answers
 *         status already-installed. A dependency module not installed yields 400 naming it. Requires ADMIN.
 *         The group key CRM-2 (BE-INCR-CRM-SUBMODULES F-SUB-2 a) installs CRM-2A then CRM-2B and answers the
 *         aggregated result plus modules (atomic keys).
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [moduleKey]
 *               additionalProperties: false
 *               properties:
 *                 moduleKey: { type: string, enum: [CRM-0, CRM-1, CRM-2A, CRM-2B, CRM-3, CRM-2] }
 *       responses:
 *         '200':
 *           description: 'Install result { status: installed | already-installed, tables, synced, modules? } - modules only for a group key'
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/dashboard/data:
 *     get:
 *       summary: Get all dynamic tables belonging to the current user (dashboard data)
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Array of table definitions }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/dashboard/presets:
 *     get:
 *       summary: List available dashboard preset suites
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200': { description: Array of preset summaries }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/dashboard/presets/{presetKey}:
 *     get:
 *       summary: Get a specific dashboard preset by key
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - in: path
 *           name: presetKey
 *           required: true
 *           schema: { type: string }
 *       responses:
 *         '200': { description: 'Preset detail - the raw suite plus moduleViews (BE-INCR-CRM-SUBMODULES item 11): the registry modules the suite composes, each { key, group?, name, fixed, tables, dependsOn }' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404': { $ref: '#/components/responses/NotFoundError' }
 *
 *   /api/dashboard/sidebar:
 *     get:
 *       summary: Get sidebar category counts for the current user's tables
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '200':
 *           description: Array of category entries with display info and table count
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   success: { type: boolean }
 *                   data:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         key: { type: string }
 *                         displayName: { type: string }
 *                         i18nKey: { type: string }
 *                         icon: { type: string }
 *                         count: { type: integer }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *
 *   /api/dashboard/system:
 *     delete:
 *       summary: Reset the current user's system (reset dashboard)
 *       description: >
 *         Deletes the dynamic tables and their data, the knowledge graph, action proposals, dashboard layouts, chat
 *         instances, saved table views, CRM reports and CRM attachments (row + file), and invalidates the KPI cache.
 *         Documents are kept. Idempotent: an empty system also returns 204. Accounting configuration written by the
 *         onboarding (chart, period, binding, kit, fiscal profiles) is removed first, in one transaction, with an
 *         accounting.scope_reset event appended to the audit trail (never deleted). Any accounting movement in any
 *         unit refuses the reset with 409 and nothing is deleted.
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       responses:
 *         '204': { description: System reset (or already empty) }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409':
 *           description: SYSTEM_RESET_BLOCKED_BY_ACCOUNTING — the system has accounting movement; nothing was deleted
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   code: { type: string, enum: [SYSTEM_RESET_BLOCKED_BY_ACCOUNTING] }
 *                   message: { type: string }
 *                   details:
 *                     type: object
 *                     properties:
 *                       blocking:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             table: { type: string }
 *                             count: { type: integer, minimum: 1 }
 *
 *   /api/dashboard/ai/ChatInterview:
 *     post:
 *       summary: One turn of the AI onboarding interview
 *       description: >
 *         The client keeps the stage and sends it back each turn. In AWAITING_CREATION_TYPE_CONFIRMATION a
 *         `choice` (button, W3 b) decides create x customize without reading the text; without it only an
 *         explicit text decides. Every turn that asks the choice again carries `choicePrompt.reason`.
 *         The customization session (W4) is persisted, owned by the caller and expires 24 h after its last write;
 *         the body is strict (unknown keys are rejected).
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 stage: { type: string, description: 'InterviewStage; unknown values fall back to GREETING' }
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role: { type: string, enum: [user, assistant] }
 *                       sender: { type: string, enum: [user, ai] }
 *                       content: { type: string }
 *                       text: { type: string }
 *                 presetKey: { type: string }
 *                 sessionId: { type: string, format: uuid }
 *                 choice: { type: string, enum: [create, customize] }
 *       responses:
 *         '200':
 *           description: Interview turn result
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 required: [response, nextStage]
 *                 properties:
 *                   response: { type: string }
 *                   nextStage: { type: string }
 *                   presetKey: { type: string }
 *                   startCustomization: { type: boolean }
 *                   sessionId: { type: string }
 *                   customizationState: { type: object }
 *                   choicePrompt:
 *                     type: object
 *                     description: 'Only with nextStage AWAITING_CREATION_TYPE_CONFIRMATION'
 *                     properties:
 *                       kind: { type: string, enum: [creation_type] }
 *                       reason: { type: string, enum: [initial, unclear, declined_customize, error] }
 *                   moduleOptions:
 *                     type: array
 *                     description: 'W5/I8-c12 - only on MATCHING_PRESET with a matched preset. Registry modules in registry order; locked = the suite already installs it (cannot be unchecked); suggested = locked plus the AI pick, closed by dependencies'
 *                     items:
 *                       type: object
 *                       properties:
 *                         key: { type: string, enum: [CRM-0, CRM-1, CRM-2A, CRM-2B, CRM-3] }
 *                         name:
 *                           type: object
 *                           properties:
 *                             pt: { type: string }
 *                             en: { type: string }
 *                         dependsOn: { type: array, items: { type: string } }
 *                         locked: { type: boolean }
 *                         suggested: { type: boolean }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404':
 *           description: >
 *             INTERVIEW_SESSION_NOT_FOUND — the customization session does not exist, expired, was deleted or belongs
 *             to another user (same answer in all cases). The client goes back to the create x customize choice.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 required: [code, message]
 *                 properties:
 *                   code: { type: string, enum: [INTERVIEW_SESSION_NOT_FOUND] }
 *                   message: { type: string }
 *         '409':
 *           description: >
 *             INTERVIEW_SESSION_CONFLICT — another turn (e.g. a second tab) wrote the session after this turn read it;
 *             nothing from this turn was lost on the server beyond what it had already saved. Resend the message.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 required: [code, message]
 *                 properties:
 *                   code: { type: string, enum: [INTERVIEW_SESSION_CONFLICT] }
 *                   message: { type: string }
 *
 *   /api/dashboard/ai/CustomizeFields:
 *     post:
 *       summary: One turn of the AI field panel (W6) — propose, then apply or discard
 *       description: >
 *         Works on the customization session of the interview (W4). `kind: message` sends the user's request to the
 *         model once (output bound to a strict JSON schema) and returns a proposal; it never changes the fields.
 *         `kind: decision` applies or discards the pending proposal of that table, deterministically. The field
 *         history lives on the server; system lines (decisions) are not sent to the model. A proposal with a field
 *         marked as sensitive personal data (LGPD art. 5, II) needs `acknowledgeSensitive: true` to be applied.
 *         A model error or an answer outside the schema returns 200 with `proposal: null`.
 *       tags: [Dashboard]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   required: [kind, sessionId, tableKey, message]
 *                   additionalProperties: false
 *                   properties:
 *                     kind: { type: string, enum: [message] }
 *                     sessionId: { type: string }
 *                     tableKey: { type: string }
 *                     message: { type: string, minLength: 1, maxLength: 2000 }
 *                 - type: object
 *                   required: [kind, sessionId, tableKey, proposalId, decision]
 *                   additionalProperties: false
 *                   properties:
 *                     kind: { type: string, enum: [decision] }
 *                     sessionId: { type: string }
 *                     tableKey: { type: string }
 *                     proposalId: { type: string }
 *                     decision: { type: string, enum: [apply, discard] }
 *                     acknowledgeSensitive: { type: boolean, enum: [true] }
 *       responses:
 *         '200':
 *           description: Turn result
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 required: [sessionId, tableKey, table, conversationHistory, proposal, discarded]
 *                 properties:
 *                   sessionId: { type: string }
 *                   tableKey: { type: string }
 *                   table: { type: object, description: 'The table in the session after the turn' }
 *                   conversationHistory:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         role: { type: string, enum: [user, assistant, system] }
 *                         content: { type: string }
 *                         at: { type: string, format: date-time }
 *                   proposal:
 *                     type: object
 *                     nullable: true
 *                     properties:
 *                       id: { type: string }
 *                       requiresSensitiveAck: { type: boolean }
 *                       changes:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             action: { type: string, enum: [add, update, remove] }
 *                             originalName: { type: string }
 *                             field: { type: object }
 *                             sensitiveCategory:
 *                               type: string
 *                               nullable: true
 *                               enum: [health, sex_life, genetic, biometric, racial_ethnic, religious, political, union_or_org, health_or_other_unspecified]
 *                             presetKey: { type: string, nullable: true }
 *                   discarded:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         name: { type: string }
 *                         reason: { type: string, enum: [reserved, type_not_allowed, exists, not_found, invalid] }
 *                   applied: { type: boolean, description: 'Only on kind decision' }
 *         '400':
 *           description: Invalid body, or SENSITIVE_FIELD_NOT_ACKNOWLEDGED (nothing was applied)
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '404':
 *           description: INTERVIEW_SESSION_NOT_FOUND (missing, expired or another user's session) or TABLE_NOT_IN_SESSION
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 required: [code, message]
 *                 properties:
 *                   code: { type: string, enum: [INTERVIEW_SESSION_NOT_FOUND, TABLE_NOT_IN_SESSION] }
 *                   message: { type: string }
 *         '409':
 *           description: PROPOSAL_STALE (the proposal id is not the pending one) or INTERVIEW_SESSION_CONFLICT
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 required: [code, message]
 *                 properties:
 *                   code: { type: string, enum: [PROPOSAL_STALE, INTERVIEW_SESSION_CONFLICT] }
 *                   message: { type: string }
 */
export {};
