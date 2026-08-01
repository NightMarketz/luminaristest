import { describe, it, expect } from 'vitest';
import { formatDate } from '../dates';

// `formatDate` renders in the browser-default locale (NO 'pt-BR' arg), so these
// assertions compare against a locally-computed reference rather than a literal
// string — that keeps them robust across the host locale AND timezone. The bug
// being locked out: a bare `new Date('2026-07-08')` parses as UTC midnight and,
// in UTC-3, `toLocaleDateString()` renders the PREVIOUS day. Parsing as local
// midnight (`+ 'T00:00:00'`) fixes it.
describe('crm formatDate — date-only UTC-shift regression', () => {
  it('renders a date-only ISO as the SAME calendar day (local-midnight reference)', () => {
    const reference = new Date('2026-07-08T00:00:00').toLocaleDateString();
    expect(formatDate('2026-07-08')).toBe(reference);
  });

  it('does NOT shift back to the previous UTC day', () => {
    // The pre-fix bug would have produced the day-07 rendering in UTC-3.
    const shifted = new Date('2026-07-07T00:00:00').toLocaleDateString();
    const correct = new Date('2026-07-08T00:00:00').toLocaleDateString();
    // Guard is only meaningful where the two days format differently (always true).
    expect(correct).not.toBe(shifted);
    expect(formatDate('2026-07-08')).toBe(correct);
  });

  it('leaves the datetime path unchanged (regex does not match → new Date(raw))', () => {
    const iso = '2026-07-08T15:30:00.000Z';
    expect(formatDate(iso)).toBe(new Date(iso).toLocaleDateString());
  });

  it('preserves the em-dash and raw-string fallbacks', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

// AV-L1 · F1 (fingerprint avl1-lead360-dateonly-utc-shift). The class was fixed once for
// the notes/tasks/attachments/timeline panels and came back in Lead360Modal, which had
// re-inlined `new Date(raw).toLocaleDateString('pt-BR', {…})` for the proposal ETA — a
// date-only field (`type: 'date'` in LeadsModule, `z.string()` in CrmPipelineDto). These
// cases lock the SHAPE the modal renders, not just the default one: the previous guards
// all ran through the no-arg path and would have stayed green with the modal broken.
// CI pins TZ=America/Sao_Paulo for vitest, so UTC-3 is exercised here.
describe('crm formatDate — Lead360Modal long-format shape (AV-L1 F1)', () => {
  const LONG: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };

  it('renders a date-only ISO on the SAME calendar day in the pt-BR long shape', () => {
    const reference = new Date('2026-07-08T00:00:00').toLocaleDateString('pt-BR', LONG);
    expect(formatDate('2026-07-08', LONG, 'pt-BR')).toBe(reference);
  });

  it('does NOT render the previous day (the exact pre-fix output)', () => {
    // Pre-fix, `new Date('2026-07-08')` was UTC midnight → 21h of the 7th in UTC-3.
    const preFixOutput = new Date('2026-07-07T00:00:00').toLocaleDateString('pt-BR', LONG);
    const correct = new Date('2026-07-08T00:00:00').toLocaleDateString('pt-BR', LONG);
    // The guard only discriminates where the two differ — assert that before trusting it.
    expect(correct).not.toBe(preFixOutput);
    expect(formatDate('2026-07-08', LONG, 'pt-BR')).toBe(correct);
  });

  it('leaves the datetime path unchanged under the long shape', () => {
    const iso = '2026-07-08T15:30:00.000Z';
    expect(formatDate(iso, LONG, 'pt-BR')).toBe(new Date(iso).toLocaleDateString('pt-BR', LONG));
  });

  it('omitting options and locale is identical to the no-arg call (callers unchanged)', () => {
    // LeadTasksPanel calls formatDate(value) with no extra args; adding the optional
    // params must not move it, since toLocaleDateString(undefined, undefined) === ().
    expect(formatDate('2026-07-08')).toBe(new Date('2026-07-08T00:00:00').toLocaleDateString());
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date', LONG, 'pt-BR')).toBe('not-a-date');
  });
});
