import type { IFiscalProfileRepository } from '../../accounting/repositories/IFiscalProfileRepository';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { Feriados } from '../models/validity';

/** O calendário que `lastValidDay` precisa para UMA unidade: a fotografia dos feriados e o município da unidade. */
export interface UnitHolidayCalendar {
  feriados: Feriados;
  /** IBGE de 7 dígitos (`FiscalProfile.codMun`); `null` = unidade sem município cadastrado → só o nacional. */
  codMun: string | null;
}

/**
 * F-E4-1 (a) — dono, questionário, 2026-10-12; executa: dono, chat, 2026-10-17. Feriado estadual e municipal prorroga a
 * validade (CC 132 § 1º; Lei 9.093/1995 arts. 1º e 2º). O município é o do perfil fiscal da unidade (`codMun`, o mesmo
 * `cLocEmi` da NFS-e): é o único endereço estruturado da unidade no núcleo. Venda, aceite e saldo leem daqui — uma regra
 * só para a data que o cliente vê e a que o job vence.
 */
export async function unitHolidayCalendar(
  legalParams: Pick<LegalParameterService, 'fotografia'>,
  fiscalProfiles: Pick<IFiscalProfileRepository, 'findByScope'>,
  scope: AccountingScope,
): Promise<UnitHolidayCalendar> {
  const [feriados, perfil] = await Promise.all([
    legalParams.fotografia(['FERIADO_NACIONAL', 'FERIADO_LOCAL']),
    fiscalProfiles.findByScope(scope),
  ]);
  return { feriados, codMun: perfil?.codMun ?? null };
}
