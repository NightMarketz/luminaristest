/**
 * BE-INCR-ESCALA-BASE item 38 (F-ESC-6 a) — feriados da unidade pela borda BR.
 *
 * Reusa o calendário que os pacotes já usam (`packages/services/unitHolidayCalendar.ts`, F-E4-1 a): a fotografia das
 * tabelas `FERIADO_NACIONAL` e `FERIADO_LOCAL` vigentes e o município da unidade (`FiscalProfile.codMun`). O dia é feriado
 * pela mesma regra `isHoliday` (nacional, estadual pela UF do IBGE, municipal, datas móveis pela Páscoa e os domingos de
 * eleição, como lá). Unidade sem município cadastrado → só o nacional.
 */
import { dateOnlyFromDayNumber, dayNumberFromDateOnly } from '../../../../accounting/models/dates';
import type { IFiscalProfileRepository } from '../../../../accounting/repositories/IFiscalProfileRepository';
import { resolveAccountingScopeInternal } from '../../../../accounting/scope/resolveAccountingScopeInternal';
import type { LegalParameterService } from '../../../../legalParameters/services/LegalParameterService';
import { isHoliday } from '../../../../packages/models/validity';
import { unitHolidayCalendar } from '../../../../packages/services/unitHolidayCalendar';
import type { HolidayCalendarPort } from '../../../ports/HolidayCalendarPort';

export class BrHolidayCalendarAdapter implements HolidayCalendarPort {
  constructor(
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
    private readonly fiscalProfiles: Pick<IFiscalProfileRepository, 'findByScope'>,
  ) {}

  async holidaysFor(userId: string, unitId: string, year: number): Promise<string[]> {
    // O unitId vem de linha `units` já lida pelo serviço do centro (dono conferido lá); aqui só monta a chave do perfil.
    const { feriados, codMun } = await unitHolidayCalendar(this.legalParams, this.fiscalProfiles, resolveAccountingScopeInternal({ userId }, unitId));
    const first = dayNumberFromDateOnly(`${year}-01-01`);
    const last = dayNumberFromDateOnly(`${year}-12-31`);
    const out: string[] = [];
    for (let day = first; day <= last; day += 1) {
      const date = dateOnlyFromDayNumber(day);
      if (isHoliday(date, feriados, codMun)) out.push(date);
    }
    return out;
  }
}
