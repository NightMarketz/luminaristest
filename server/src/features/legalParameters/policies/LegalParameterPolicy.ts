import type { ILegalParameterPolicy, LegalParameterActor } from './ILegalParameterPolicy';

/**
 * BE-INCR-LEGAL-PARAMS PR-1 (item 12) — policy PRÓPRIA: o escopo é a plataforma, não a empresa, então não reusa
 * `AccountingPolicy`. `ADMIN` (gestão de usuários) não publica coeficiente de lei (F-LP-2 b).
 */
export class LegalParameterPolicy implements ILegalParameterPolicy {
  canRead(actor: LegalParameterActor): boolean {
    return !!actor.userId;
  }

  canManage(actor: LegalParameterActor): boolean {
    return !!actor.userId && actor.role === 'PLATFORM_ADMIN';
  }
}
