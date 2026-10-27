import type { SystemResetBlockedDetails } from '../features/accounting/models/accountingResetClassification';

/**
 * Base application error class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;

  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    // Set the prototype explicitly to ensure instanceof works correctly
    Object.setPrototypeOf(this, AppError.prototype);
    // Capture stack trace, excluding constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error for resource not found (404).
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error for forbidden access (403).
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Error for unauthorized access (401).
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Error for resource conflicts (409) — e.g. a unique-constraint violation surfaced as a domain rule.
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', errorCode: string = 'CONFLICT') {
    super(message, 409, errorCode);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Error for validation failures (400 - Bad Request).
 */
export class ValidationError extends AppError {
  // Holds the flattened Zod error details
  public readonly details: { [key: string]: string[] | undefined } | Record<string, unknown> | null; // Broader type for details

  constructor(
    message: string = 'Validation failed',
    details: { [key: string]: string[] | undefined } | Record<string, unknown> | null = null, // Broader type for details
    errorCode: string = 'VALIDATION_ERROR' // subclasses with their own code stay 400 (e.g. PARAMETRO_LEGAL_AUSENTE)
  ) {
    super(message, 400, errorCode); // Use 400 Bad Request for validation errors
    this.details = details;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// You can add more specific error classes as needed
// e.g., DatabaseError, ServiceUnavailableError, etc.

/**
 * BE-INCR-CRM-REPORT-BUILDER PR-2 (item 12): relatório do CRM inexistente, apagado ou alheio (sem ser ADMIN) — 404
 * nomeado; os três casos são indistinguíveis de propósito (anti-enumeração, como SavedTableView).
 */
export class ReportNotFoundError extends AppError {
  constructor(message: string = 'Relatório não encontrado.') {
    super(message, 404, 'REPORT_NOT_FOUND');
    Object.setPrototypeOf(this, ReportNotFoundError.prototype);
  }
}

/**
 * BE-INCR-CRM-REPORT-BUILDER PR-2 (item 9, F-RB5; emenda §9 E2): a execução passou do teto de linhas lidas — 422 com
 * `{rowsRead, cap}`, nunca truncamento silencioso. Lançado DURANTE a leitura em lotes, antes do lote seguinte.
 */
export class ReportTooLargeError extends AppError {
  public readonly details: { rowsRead: number; cap: number };

  constructor(rowsRead: number, cap: number) {
    super(`O relatório lê mais de ${cap} linhas.`, 422, 'REPORT_TOO_LARGE');
    this.details = { rowsRead, cap };
    Object.setPrototypeOf(this, ReportTooLargeError.prototype);
  }
}

/**
 * BE-INCR-KIT-SETOR PR-3 (item 21; emenda §11 E-11.2 do BRIEF): o ajuste papel→conta foi desfeito porque a
 * recompilação deu `Draft` — 422 com a versão `Draft` gravada e os bloqueantes do validador/cobertura, como o
 * `POST /accounting-binding/compile` devolve hoje. A contabilidade não mudou: a versão `Active` segue a anterior.
 */
export class RoleOverrideCompileDraftError extends AppError {
  public readonly details: {
    binding: { status: string; bindingVersion: number };
    blocking: unknown[];
    missingEventKeys: string[];
  };

  /** PR-4 (aceitar pendência): mesma forma, com mensagem e código próprios (`KIT_PENDING_COMPILE_DRAFT`). */
  constructor(
    details: RoleOverrideCompileDraftError['details'],
    message = 'A recompilação com o ajuste reprovou; o ajuste não foi gravado.',
    errorCode = 'ROLE_OVERRIDE_COMPILE_DRAFT',
  ) {
    super(message, 422, errorCode);
    this.details = details;
    Object.setPrototypeOf(this, RoleOverrideCompileDraftError.prototype);
  }
}

/**
 * Specific error class for issues within service layer operations.
 */
export class ServiceError extends AppError {
  constructor(message: string = 'A service error occurred', errorCode: string = 'SERVICE_ERROR') {
    super(message, 500, errorCode);
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — comportamento 7 (F-I8-2). A CRM service resolved a table
 * whose module is not installed for this tenant. Degrades by contract (409 + the missing module
 * named in `details.moduleKey`), never by a generic 404/crash.
 */
export class ModuleNotInstalledError extends AppError {
  public readonly details: { moduleKey: string; missingModules?: string[] };

  /**
   * `missingModules` (BE-INCR-CRM-SUBMODULES item 8, F-SUB-7 → a′): quando a operação exige vários módulos,
   * lista TODOS os que faltam; `moduleKey` segue sendo o primeiro deles.
   */
  constructor(moduleKey: string, internalName: string, missingModules?: string[]) {
    super(
      `O módulo '${moduleKey}' não está instalado para este usuário (tabela '${internalName}').`,
      409,
      'CRM_MODULE_NOT_INSTALLED',
    );
    this.details = missingModules ? { moduleKey, missingModules } : { moduleKey };
    Object.setPrototypeOf(this, ModuleNotInstalledError.prototype);
  }
}

/**
 * Raised when a posting leg exceeds the MAX_CENTS policy ceiling (ACC-014).
 * Thrown by the PostingService choke-point guard (Council 1.5) with its OWN code,
 * DISTINCT from ACCOUNTING_PERIOD_NOT_OPEN: bridges/reconcile treat both as
 * skip+log, but period-closed is transient (reopens) while this one is a POISON
 * event — it can never succeed until the source amount itself is fixed.
 */
export class MaxCentsExceededError extends AppError {
  constructor(accountCode: string, magnitudeCents: number, maxCents: number) {
    super(
      `Partida da conta '${accountCode}' excede o teto de centavos suportado ` +
        `(${magnitudeCents} > máx ${maxCents}).`,
      422,
      'MAX_CENTS_EXCEEDED',
    );
    Object.setPrototypeOf(this, MaxCentsExceededError.prototype);
  }
}

/**
 * Raised when a posting is attempted against a period that is not OPEN.
 * Bridge/reconcile jobs must catch this specific code to skip+log (not fatal).
 */
/**
 * BE-INCR-IRRF-DISTRIBUICAO PR-2 (BRIEF item 16; F-IRD-5R) — o IRRF do mês que cabe a este evento passa do bruto: 422
 * `RETENCAO_EXCEDE_PAGAMENTO` com `brutoMinimoCents` (o menor bruto que cobre a retenção). A PJ nunca assume o imposto.
 */
export class RetencaoExcedePagamentoError extends AppError {
  public readonly details: { brutoMinimoCents: number; irrfEventoCents: number };

  constructor(message: string, details: { brutoMinimoCents: number; irrfEventoCents: number }) {
    super(message, 422, 'RETENCAO_EXCEDE_PAGAMENTO');
    this.details = details;
    Object.setPrototypeOf(this, RetencaoExcedePagamentoError.prototype);
  }
}

export class AccountingPeriodNotOpenError extends AppError {
  constructor(year: number, month: number) {
    super(
      `Período contábil ${year}/${String(month).padStart(2, '0')} não está aberto para lançamentos.`,
      422,
      'ACCOUNTING_PERIOD_NOT_OPEN',
    );
    Object.setPrototypeOf(this, AccountingPeriodNotOpenError.prototype);
  }
}

/**
 * BE-INCR-MIT-EXPORT (nó X9, BRIEF itens 4–5; ADR-INCR-DCTFWEB-MIT D7): o PA não tem o que exportar no MIT — sem
 * apuração confirmada, só débitos zero, ou forma ainda não suportada. 422 com código próprio (lacuna do PR-1 decidida
 * pelo dono em 06/10: classe nova, não ValidationError 400). A mensagem diz qual dos casos.
 */
export class MitNadaAExportarError extends AppError {
  constructor(message: string) {
    super(message, 422, 'MIT_NADA_A_EXPORTAR');
    Object.setPrototypeOf(this, MitNadaAExportarError.prototype);
  }
}

/**
 * BE-INCR-EFD-REINF PR-1 (BRIEF item 8; PRE-ADR D6): a competência não tem o que declarar na Reinf. 422 com código próprio,
 * molde `MitNadaAExportarError`: `REINF_SEM_FATO` (nenhuma retenção — a Reinf é dispensada sem fato, IN RFB 2.043 art. 4º) ou
 * `REINF_SEM_EVENTO_GERAVEL` (há fato, mas só de eventos que este PR ainda não gera — os avisos dizem quais).
 */
export class ReinfNadaAGerarError extends AppError {
  constructor(message: string, errorCode: 'REINF_SEM_FATO' | 'REINF_SEM_EVENTO_GERAVEL') {
    super(message, 422, errorCode);
    Object.setPrototypeOf(this, ReinfNadaAGerarError.prototype);
  }
}

/**
 * BE-INCR-SIMPLES-NACIONAL (nó X14, BRIEF item 4; F-SN-3 → a): atividade sem linha `SIMPLES_ENQUADRAMENTO` vigente —
 * o cálculo não escolhe anexo por conta própria. 422.
 */
export class AtividadeSemAnexoError extends AppError {
  constructor(message: string) {
    super(message, 422, 'ATIVIDADE_SEM_ANEXO');
    Object.setPrototypeOf(this, AtividadeSemAnexoError.prototype);
  }
}

/**
 * BE-INCR-SIMPLES-NACIONAL PR-1: caso que a norma lida não regula (teto do ISS excedido fora da 5ª e da 6ª faixa; o
 * início de atividade de 2027 saiu daqui com a Res. CGSN 190/2026). O cálculo recusa em vez de inventar a regra. 422.
 */
export class SimplesRegraNaoRegulamentadaError extends AppError {
  constructor(message: string) {
    super(message, 422, 'SIMPLES_REGRA_NAO_REGULAMENTADA');
    Object.setPrototypeOf(this, SimplesRegraNaoRegulamentadaError.prototype);
  }
}

/**
 * BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR, BRIEF item 13): há contador responsável ativo no escopo e
 * só ele reabre período ou assina/rejeita a revisão (F-GOV-3 a).
 */
export class AccountantRequiredError extends AppError {
  constructor(action: 'reabrir o período' | 'assinar ou rejeitar a revisão' | 'aprovar ou rejeitar a versão de política') {
    super(
      `Este escopo tem contador responsável ativo — só ele pode ${action}.`,
      403,
      'ACCOUNTANT_REQUIRED',
    );
    Object.setPrototypeOf(this, AccountantRequiredError.prototype);
  }
}

/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION (F-POL-3 a + F-POL-4 b): com contador responsável ativo, o `PUT` de parâmetro
 * governado não aplica — falha alto (409) e aponta a rota de proposta.
 */
export class PolicyApprovalRequiredError extends AppError {
  constructor() {
    super(
      'Este escopo tem contador responsável ativo — a mudança precisa da aprovação dele. Proponha em POST /api/accounting/policy-versions.',
      409,
      'POLICY_APPROVAL_REQUIRED',
    );
    Object.setPrototypeOf(this, PolicyApprovalRequiredError.prototype);
  }
}

/** BE-INCR-ACCOUNTING-POLICY-VERSION (item 7.4): proposta sem contador ativo — não há quem aprove (F-GOV-4 a). */
export class PolicyNoAccountantError extends AppError {
  constructor() {
    super(
      'Este escopo não tem contador responsável ativo — não há quem aprove. Use o PUT do parâmetro para aplicar direto.',
      409,
      'POLICY_NO_ACCOUNTANT',
    );
    Object.setPrototypeOf(this, PolicyNoAccountantError.prototype);
  }
}

/**
 * BE-INCR-BINDING-FEEDER (F-FEEDER-3 → composite key). Raised by `AccountingSyncService`'s
 * constructor when two mapper registrations resolve to the SAME `unitId:sourceType` composite
 * key — two `Active` bindings of the SAME business unit emitting the SAME `eventKey`. This is a
 * data-integrity fault (invalid binding data within one unit), never the cross-unit/cross-sector
 * path the composite key exists to keep collision-free by construction. Distinguishable in
 * logs/alerts from `NoActiveAccountingBindingsError` — DIFFERENT failure mode, DIFFERENT code.
 */
export class AccountingEventMapperCollisionError extends AppError {
  constructor(sourceType: string, unitId?: string) {
    super(
      unitId
        ? `Dois mappers registrados para o evento '${sourceType}' na unidade '${unitId}' — ` +
          `colisão de eventKey dentro do mesmo escopo (dado de binding inválido).`
        : `Dois mappers registrados para o evento '${sourceType}' sem unidade (registro global) — ` +
          `colisão de eventKey.`,
      500,
      'ACCOUNTING_EVENT_MAPPER_COLLISION',
    );
    Object.setPrototypeOf(this, AccountingEventMapperCollisionError.prototype);
  }
}

/**
 * BE-INCR-BINDING-FEEDER (F-FEEDER-4 → boot falha sem binding Active). Raised by
 * `AccountingBindingFeederService` when the global read of `Active` bindings returns ZERO rows.
 * Vetoes the silent failure mode described in the BRIEF (comportamento 4): a boot with no binding
 * at all must never come up mute and fail only per-event — it must fail LOUD, here, before any
 * mapper is even attempted. Distinguishable in logs/alerts from
 * `AccountingEventMapperCollisionError` — DIFFERENT failure mode, DIFFERENT code.
 */
export class NoActiveAccountingBindingsError extends AppError {
  constructor() {
    super(
      'Nenhum AccountingBinding com status Active encontrado — o alimentador não tem nenhum ' +
        'mapper para registrar (ambiente mal-provisionado: chart→binding precisa rodar antes do boot).',
      500,
      'NO_ACTIVE_ACCOUNTING_BINDINGS',
    );
    Object.setPrototypeOf(this, NoActiveAccountingBindingsError.prototype);
  }
}

// ── BE-INCR-PACOTE-VALIDADE (BRIEF §4.2) — erros de código próprio (memória erro-especifico-para-skip-em-job):
// o passe de vencimento classifica pelo `errorCode`, nunca pela classe base.

/** Pré-check de consumo (item 4): saldo vencido não paga venda — 400 antes de qualquer escrita. */
export class PackageBalanceExpiredError extends AppError {
  /** `expiresOn` = último dia válido, 'YYYY-MM-DD'. A mensagem é a que o operador lê no toast: só a data, DD/MM/AAAA (F-PP-1 a). */
  constructor(expiresOn: string) {
    const [y, m, d] = expiresOn.split('-');
    super(`Saldo de pacote vencido em ${d}/${m}/${y}.`, 400, 'PACKAGE_BALANCE_EXPIRED');
    Object.setPrototypeOf(this, PackageBalanceExpiredError.prototype);
  }
}

/** Guarda 9.1 do job: consumo pago ainda sem débito no saldo — pendência transitória. */
export class PackageConsumptionPendingError extends AppError {
  constructor(balanceId: string, saleId: string) {
    super(`Vencimento adiado: consumo da venda ${saleId} ainda sem débito no saldo ${balanceId}.`, 409, 'PACKAGE_CONSUMPTION_PENDING');
    Object.setPrototypeOf(this, PackageConsumptionPendingError.prototype);
  }
}

/** Guarda 9.2 do job (F-PV-8 a): crédito de venda cancelada/devolvida — pendência poison até o E-1. */
export class PackageOriginReversedError extends AppError {
  constructor(balanceId: string, saleId: string) {
    super(`Vencimento bloqueado: a venda de origem ${saleId} do saldo ${balanceId} foi cancelada/devolvida (E-1).`, 409, 'PACKAGE_ORIGIN_REVERSED');
    Object.setPrototypeOf(this, PackageOriginReversedError.prototype);
  }
}

/** Guarda 9.3 do job (F-PV-6 a): a unidade não tem mapper para o evento — o binding Active precisa recompilar.
 *  Nome e código são os que o I5 (F-I5-1 a) ratificou; quem executar primeiro cria, o outro reusa. */
export class NoMapperForUnitError extends AppError {
  constructor(unitId: string, sourceType: string) {
    // BE-INCR-ONBOARDING-ACTIVATION item 2 (F-I5-3 → a, todo miss): a mensagem vale para as duas causas e não afirma qual.
    super(
      `Nenhum mapper registrado para o evento '${sourceType}' na unidade '${unitId}' — ` +
        'a contabilidade da unidade não está ativa ou o binding não cobre o evento.',
      409,
      'NO_MAPPER_FOR_UNIT',
    );
    Object.setPrototypeOf(this, NoMapperForUnitError.prototype);
  }
}

/** BE-INCR-KIT-SETOR PR-6 (item 47): nenhum kit declara este `eventKey` — erro de fiação da origem, não de binding. */
export class UnknownEventKeyError extends AppError {
  constructor(sourceType: string) {
    super(`Evento '${sourceType}' desconhecido: nenhum kit de setor o declara.`, 400, 'UNKNOWN_EVENT_KEY');
    Object.setPrototypeOf(this, UnknownEventKeyError.prototype);
  }
}

/** Item 9.5 (§5.2): faltante para emitir a NFS-e do vencido — pendência transitória; o vencimento fica. */
export class PackageExpiryNfsePendingError extends AppError {
  constructor(movementKey: string, faltantes: string[]) {
    super(`NFS-e do vencimento ${movementKey} pendente: ${faltantes.join('; ')}.`, 409, 'PACKAGE_EXPIRY_NFSE_PENDING');
    Object.setPrototypeOf(this, PackageExpiryNfsePendingError.prototype);
  }
}

/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 12) — a DPS substituta muda campo que a RN nacional nível 2 congela (E0060/E0061,
 * Anexo I [176]/[177]). 422 com os faltantes nomeados; nada é escrito.
 */
export class SubstituicaoBloqueadaError extends AppError {
  public readonly faltantes: string[];
  constructor(faltantes: string[]) {
    super(`substituicao_bloqueada: ${faltantes.join('; ')}`, 422, 'SUBSTITUICAO_BLOQUEADA');
    this.faltantes = faltantes;
    Object.setPrototypeOf(this, SubstituicaoBloqueadaError.prototype);
  }
}

// ── FE-INCR-PACOTE-VALIDADE (BRIEF §4.4) — aceite da validade do pacote (F-JUR-4): códigos próprios.

/** Item 1: a venda já tem aceite (append-only, um por venda) — 409 antes de qualquer escrita. */
export class PackageAcceptanceExistsError extends AppError {
  constructor(saleId: string) {
    super(`A venda ${saleId} já tem aceite de validade registrado.`, 409, 'PACKAGE_ACCEPTANCE_EXISTS');
    Object.setPrototypeOf(this, PackageAcceptanceExistsError.prototype);
  }
}

/** Item 4: o texto/data mostrados não são mais os que o servidor renderiza agora (hash diferente). */
export class PackageNoticeChangedError extends AppError {
  constructor(saleId: string) {
    super(`O texto da validade mudou entre a exibição e o aceite (venda ${saleId}). Releia e aceite de novo.`, 409, 'PACKAGE_NOTICE_CHANGED');
    Object.setPrototypeOf(this, PackageNoticeChangedError.prototype);
  }
}

/** Itens 4 e 13: pacote sem validade (catálogo `validityDays` ausente ou 0) não tem o que aceitar nem comprovar. */
export class PackageWithoutValidityError extends AppError {
  constructor(packageId: string) {
    super(`O pacote ${packageId} não tem validade: não há texto de validade para aceitar.`, 400, 'PACKAGE_WITHOUT_VALIDITY');
    Object.setPrototypeOf(this, PackageWithoutValidityError.prototype);
  }
}

/**
 * BE-INCR-SEED-UNIDADE-E-ENV (item 2) — onboarding: a unidade ou o perfil fiscal não nasceu e o sistema recém-instalado
 * foi DESFEITO (compensação). Um novo create não esbarra no 403 one-shot. `message` já vem montada pelo
 * `SystemProvisioningService` (o HTTP do `POST /dashboard/create` a devolve em `error`).
 */
export class OnboardingRolledBackError extends AppError {
  constructor(message: string) {
    super(message, 500, 'ONBOARDING_ROLLED_BACK');
    Object.setPrototypeOf(this, OnboardingRolledBackError.prototype);
  }
}

/**
 * Compensação do onboarding FALHOU: o sistema instalado ficou de pé sem unidade/perfil. O usuário precisa de
 * "Resetar sistema" antes de tentar de novo. Distinto de `OnboardingRolledBackError` — OUTRO modo de falha, OUTRO código.
 */
export class OnboardingRollbackFailedError extends AppError {
  constructor(message: string) {
    super(message, 500, 'ONBOARDING_ROLLBACK_FAILED');
    Object.setPrototypeOf(this, OnboardingRollbackFailedError.prototype);
  }
}

// ── BE-INCR-SCOPE-UNIT-GUARD (nó I6, BRIEF item 1) — o `unitId` do cliente é validado contra a tabela `units` do dono.

/**
 * F-I6-3: id que não é linha de `units` do dono (outro dono, outra tabela, string livre, dono sem `units`) — 404; os
 * casos são indistinguíveis de propósito (não revela se o id existe em outro dono).
 */
export class UnitNotFoundError extends AppError {
  constructor() {
    super('Unidade não encontrada.', 404, 'UNIT_NOT_FOUND');
    Object.setPrototypeOf(this, UnitNotFoundError.prototype);
  }
}

/** F-I6-4 (b) + F-I6-9: escrita em linha de `units` soft-deleted do dono — 409 (a leitura segue). */
export class UnitDeletedError extends ConflictError {
  constructor() {
    super('Unidade apagada — restaure-a para lançar.', 'UNIT_DELETED');
    Object.setPrototypeOf(this, UnitDeletedError.prototype);
  }
}

/**
 * BE-INCR-RESET-CONSISTENTE item 13 (nó I7, F-I7-1 → "409 só com movimento") — o "Resetar sistema" foi recusado porque
 * há movimento contábil (linha em tabela BLOCKING) em alguma unidade do usuário. Nada foi apagado. `details` validado
 * pelo `SystemResetBlockedDetailsSchema` antes de lançar; `handleApiError` o expõe.
 */
export class SystemResetBlockedByAccountingError extends AppError {
  public readonly details: SystemResetBlockedDetails;

  constructor(details: SystemResetBlockedDetails) {
    const total = details.blocking.reduce((sum, b) => sum + b.count, 0);
    super(
      `O sistema tem movimento contábil (${total} registro(s) em ${details.blocking.length} tipo(s)) e não pode ser resetado: a escrituração precisa ser preservada.`,
      409,
      'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING',
    );
    this.details = details;
    Object.setPrototypeOf(this, SystemResetBlockedByAccountingError.prototype);
  }
}
