/**
 * OpenAPI de /api/accounting-binding.
 * Um arquivo por feature: dois PRs que documentam features distintas não tocam o mesmo arquivo
 * (dono, 2026-10-16). O gerador e o docs.ts já leem a pasta src/routes inteira, recursiva.
 * @openapi
 * paths:
 *
 *   # ─── ACCOUNTING BINDING (BE-INCR-BINDING-PRESS) ──────────────────────────
 *
 *   /api/accounting-binding/compile:
 *     post:
 *       summary: Compile a binding candidate — validates and persists (auto-activates on PASS)
 *       description: >-
 *         F-BP-2(b): sem issue bloqueante o validador determinístico aprova e a nova versão nasce
 *         'Active' (a Active anterior, se houver, vira 'Superseded' atomicamente na mesma tx);
 *         com bloqueante, a versão nasce 'Draft' e a Active vigente não é tocada. bindingVersion
 *         é sempre monotônico — recompilar NUNCA edita uma versão existente (invariante 4). LAC-B: binding
 *         Active de OUTRO setor na unidade ⇒ 409 BINDING_SECTOR_CONFLICT, nada gravado; depois de 'Active' os
 *         mappers recarregam — falha ⇒ 200 com warnings[ACCOUNTING_SYNC_RELOAD_FAILED].
 *       tags: [AccountingBinding]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AccountingBindingCompileRequest' }
 *       responses:
 *         '200': { description: 'binding + resultado de validação + status (Draft ou Active)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: "BINDING_SECTOR_CONFLICT — a unidade já tem binding Active de outro setor" }
 *
 *   /api/accounting-binding/validate:
 *     post:
 *       summary: Run the deterministic validator WITHOUT persisting (dry-run preview)
 *       description: Mesmo corpo de /compile; devolve o candidato + o BindingValidationResult, nada é gravado.
 *       tags: [AccountingBinding]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AccountingBindingCompileRequest' }
 *       responses:
 *         '200': { description: 'candidate (AccountingBindingV1) + validation result — nunca persistido' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *
 *   /api/accounting-binding/activate-default:
 *     post:
 *       summary: Activate the sector's DEFAULT binding (server-side fixture) — HTTP twin of the activation CLI
 *       description: >-
 *         LAC-B. Idempotente (Active existente ⇒ status 'already-active', nada compilado). Pré-condições
 *         checadas ANTES de gravar qualquer coisa: plano de contas vazio sem installChartIfEmpty ⇒
 *         bloqueante CHART_OF_ACCOUNTS_EMPTY; período do mês corrente ausente/FUTURE sem
 *         openCurrentPeriodIfMissing (ou fechado) ⇒ bloqueante ACCOUNTING_PERIOD_NOT_OPEN — em ambos
 *         status 'Draft' sem bindingVersion. Passando, instala o KIT do setor (BE-INCR-KIT-SETOR PR-2): 7 passos
 *         idempotentes com commit próprio (plano, extensão, contas-padrão, período, compile — o MESMO de
 *         /compile —, padrões fiscais por serviço, referencial), retomando do primeiro não concluído. Kit com
 *         contas-padrão do perfil fiscal e unidade sem perfil ⇒ bloqueante KIT_FISCAL_PROFILE_REQUIRED (nada
 *         gravado). Exceção num passo ⇒ 'Draft' com KIT_INSTALL_STEP_FAILED { step }; compile reprovado ⇒ 'Draft'
 *         com os bloqueantes do validador. 'already-active' = kit já instalado. LAC-B PR-0: a unidade com OUTRO
 *         setor (binding Active ou KitInstallation de outro kit) ⇒ 409 BINDING_SECTOR_CONFLICT, nada gravado (um setor
 *         por unidade). Depois de 'Active' a rota recarrega os mappers contábeis (as vendas da unidade lançam sem
 *         reiniciar); falha na recarga ⇒ 'Draft' com ACCOUNTING_SYNC_RELOAD_FAILED (o binding fica ativo; lança após o
 *         próximo reinício). POST /compile e o CLI não têm a guarda nem a recarga.
 *       tags: [AccountingBinding]
 *       security: [{ bearerAuth: [] }]
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AccountingBindingActivateDefaultRequest' }
 *       responses:
 *         '200': { description: "{ status: 'Active' | 'already-active' | 'Draft', bindingVersion?, blocking?: [{ code, message, period? ('YYYY-MM', só em ACCOUNTING_PERIOD_NOT_OPEN), step? (só em KIT_INSTALL_STEP_FAILED) }], kit?: { kitKey, kitVersion, status: INSTALLING | INSTALLED | FAILED } }" }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 *         '409': { description: "BINDING_SECTOR_CONFLICT — a unidade já tem outro setor (binding Active ou kit instalado)" }
 *
 *   /api/accounting-binding:
 *     get:
 *       summary: List the compiled bindings (versions) for a scope, most recent first
 *       tags: [AccountingBinding]
 *       security: [{ bearerAuth: [] }]
 *       parameters:
 *         - { in: query, name: unitId, required: true, schema: { type: string } }
 *         - { in: query, name: sectorKey, required: false, schema: { type: string } }
 *         - { in: query, name: status, required: false, schema: { type: string, enum: [Draft, Active, Superseded] } }
 *       responses:
 *         '200': { description: 'array of AccountingBinding rows (payload is the serialized AccountingBindingV1)' }
 *         '400': { $ref: '#/components/responses/BadRequestError' }
 *         '401': { $ref: '#/components/responses/UnauthorizedError' }
 *         '403': { $ref: '#/components/responses/ForbiddenError' }
 */
export {};
