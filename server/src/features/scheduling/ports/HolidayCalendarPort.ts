/**
 * BE-INCR-ESCALA-BASE item 37 (F-ESC-6 a; ADR-PAIS-NA-BORDA R3) — o calendário de feriados que o centro da escala lê.
 *
 * A porta mora no centro e não sabe de país: o adaptador da borda BR (`paises/br/adapters/BrHolidayCalendarAdapter.ts`)
 * a implementa e a `factory.ts` liga os dois. As datas são dia-calendário `YYYY-MM-DD` (date-only, sem fuso): quem
 * converte para instante no fuso da unidade é o `HolidayExceptionService` (item 39).
 */
export interface HolidayCalendarPort {
  /** Os feriados da unidade `unitId` do dono `userId` no ano `year`, em ordem, sem repetição. */
  holidaysFor(userId: string, unitId: string, year: number): Promise<string[]>;
}
