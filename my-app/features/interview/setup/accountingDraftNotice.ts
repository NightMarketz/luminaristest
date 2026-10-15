import { notify } from '../../../lib/notifications/notify';
import type { OnboardingAccountingResultInput } from '@/types/contracts/accountingBinding/ActivateDefaultBindingDto.gen';

type Translate = (key: string) => string;

/**
 * I4 PR-4 (item 21, F-I4-5 b + EMENDA 14/10 E14.4): o create devolve `data.accounting`; quando a ativação contábil sai
 * `Draft`, os 3 wizards mostram um aviso que NÃO bloqueia (o tenant já nasceu — F-I4-2 b) antes de navegar. Com o
 * bloqueante `KIT_FISCAL_PROFILE_REQUIRED` o texto nomeia o próximo passo. `Active`/`not-applicable`/ausente: nada.
 */
export function notifyAccountingDraft(accounting: OnboardingAccountingResultInput | undefined, t: Translate): void {
  if (accounting?.status !== 'Draft') return;
  const needsFiscalProfile = accounting.blocking?.some((b) => b.code === 'KIT_FISCAL_PROFILE_REQUIRED') ?? false;
  notify(
    t(needsFiscalProfile ? 'onboardingAccountingDraftFiscalProfile' : 'onboardingAccountingDraft'),
    'warning',
    t('onboardingAccountingDraftTitle'),
  );
}
