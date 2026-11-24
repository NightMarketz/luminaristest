import { SchemaValidator } from '../SchemaValidator';
import { ValidationError } from '../../../../lib/errors';
import type { ITableSchema } from '../../models/DynamicTable.model';

/**
 * Teste-guarda — achado fora de escopo do #884 (FIX-FE-DASHBOARD, 24/10), item (c). O motor valida `datetime` com
 * `z.coerce.date()` (o tipo é normalizado para `date`), e `new Date('2026-10-24T12:30')` lê a hora de parede no fuso
 * do PROCESSO Node: o mesmo payload grava instantes diferentes conforme o TZ do servidor, em silêncio.
 * Decisão do dono (AskUserQuestion, chat, 2026-10-24): "Rejeitar com 400", só no tipo `datetime`.
 * Esperado: hora sem fuso num campo `datetime` → ValidationError no campo; com `Z`/offset, `Date` e epoch seguem
 * aceitos; o tipo `date` (date-only, lido como UTC) não muda.
 */
const schema = {
  fields: [
    { name: 'nextActionAt', label: 'Next action', type: 'datetime', required: false },
    { name: 'dueDate', label: 'Due', type: 'date', required: false },
  ],
} as unknown as ITableSchema;

const validator = new SchemaValidator();

function rejectedFields(data: Record<string, unknown>): string[] | 'aceito' {
  try {
    validator.validateDataAgainstSchema(data, schema);
    return 'aceito';
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e;
    return Object.keys((e as unknown as { details?: Record<string, unknown> }).details ?? {});
  }
}

describe('SchemaValidator — datetime exige fuso', () => {
  it.each(['2026-10-24T12:30', '2026-10-24T12:30:00', '2026-10-24T12:30:00.000', '2026-10-24 12:30'])(
    'hora sem fuso %s → ValidationError em nextActionAt',
    (value) => {
      expect(rejectedFields({ nextActionAt: value })).toEqual(['nextActionAt']);
    },
  );

  // Controles — aceitos hoje e depois.
  it('ISO com Z e com offset viram o mesmo instante', () => {
    const z = validator.validateDataAgainstSchema({ nextActionAt: '2026-10-24T15:30:00.000Z' }, schema) as Record<string, Date>;
    const off = validator.validateDataAgainstSchema({ nextActionAt: '2026-10-24T12:30:00-03:00' }, schema) as Record<string, Date>;
    expect(z.nextActionAt.toISOString()).toBe('2026-10-24T15:30:00.000Z');
    expect(off.nextActionAt.toISOString()).toBe('2026-10-24T15:30:00.000Z');
  });

  it('Date e epoch continuam aceitos; null limpa o campo opcional', () => {
    const d = validator.validateDataAgainstSchema({ nextActionAt: new Date('2026-10-24T15:30:00.000Z') }, schema) as Record<string, Date>;
    const n = validator.validateDataAgainstSchema({ nextActionAt: Date.UTC(2026, 9, 24, 15, 30) }, schema) as Record<string, Date>;
    expect(d.nextActionAt.toISOString()).toBe('2026-10-24T15:30:00.000Z');
    expect(n.nextActionAt.toISOString()).toBe('2026-10-24T15:30:00.000Z');
    expect(validator.validateDataAgainstSchema({ nextActionAt: null }, schema)).toEqual({ nextActionAt: null });
  });

  it('tipo date (date-only) não muda: 2026-10-24 → meia-noite UTC do dia escrito', () => {
    const out = validator.validateDataAgainstSchema({ dueDate: '2026-10-24' }, schema) as Record<string, Date>;
    expect(out.dueDate.toISOString()).toBe('2026-10-24T00:00:00.000Z');
  });
});
