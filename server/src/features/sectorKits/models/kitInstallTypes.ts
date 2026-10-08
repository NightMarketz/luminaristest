import { AppError } from '../../../lib/errors';

/**
 * Instalação do kit de setor (BE-INCR-KIT-SETOR, PR-2, itens 9–14; emenda §10 do BRIEF).
 *
 * Os 7 passos rodam em ordem fixa, cada um com commit próprio. A ordem é a da emenda E-1 (dono, 08/10): o
 * período abre ANTES do compile, porque o dry-run do validador exige o mês aberto.
 */
export const KIT_INSTALL_STATUSES = ['INSTALLING', 'INSTALLED', 'FAILED'] as const;
export type KitInstallStatus = (typeof KIT_INSTALL_STATUSES)[number];

export const KIT_INSTALL_STEPS = {
  CANONICAL_CHART: 1,
  CHART_EXTENSION: 2,
  ROLE_DEFAULTS: 3,
  PERIOD: 4,
  COMPILE: 5,
  SERVICE_FISCAL_DEFAULTS: 6,
  REFERENTIAL: 7,
} as const;
export type KitInstallStep = (typeof KIT_INSTALL_STEPS)[keyof typeof KIT_INSTALL_STEPS];
export const LAST_KIT_INSTALL_STEP: KitInstallStep = KIT_INSTALL_STEPS.REFERENTIAL;

/** Avisos que não bloqueiam (itens 12–13): o referencial entra na próxima atualização. */
export const KIT_INSTALL_WARNINGS = ['KIT_REFERENTIAL_SKIPPED_NO_REGIME', 'KIT_REFERENTIAL_SKIPPED_NO_CATALOG'] as const;
export type KitInstallWarning = (typeof KIT_INSTALL_WARNINGS)[number];

/** Bloqueante de pré-check do kit (emenda E-5): kit com `roleDefaults.fiscalProfile` e unidade sem perfil fiscal. */
export const KIT_FISCAL_PROFILE_REQUIRED = 'KIT_FISCAL_PROFILE_REQUIRED';

/** Eventos de auditoria (item 15) — na allowlist do `auditCanonical.ts`. */
export const KIT_INSTALLED = 'kit.installed';
export const KIT_INSTALL_FAILED = 'kit.install_failed';

/**
 * Falha por exceção num passo (item 14). A instalação fica `FAILED` com `steps` preservado; quem chama devolve
 * `Draft` com `blocking:[{code:'KIT_INSTALL_STEP_FAILED', step}]`.
 */
export class KitInstallStepFailedError extends AppError {
  constructor(
    public readonly step: KitInstallStep,
    public readonly causeMessage: string,
  ) {
    super(`A instalação do kit falhou no passo ${step}: ${causeMessage}`, 500, 'KIT_INSTALL_STEP_FAILED');
    Object.setPrototypeOf(this, KitInstallStepFailedError.prototype);
  }
}
