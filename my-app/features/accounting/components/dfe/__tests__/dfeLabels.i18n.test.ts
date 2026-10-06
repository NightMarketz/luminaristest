import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMBIENTE_LABEL, CAMPO_LABEL, MOTIVO_LABEL, PENDENCIA_LABEL, STATUS_LABEL, campoKey } from '../dfeLabels';
import type { CampoComparado } from '../../../../../lib/services/dfe.service';

/**
 * Item 26: toda chave dos enums (status, pendência, motivo, campo comparado, ambiente) tem tradução em pt E en, e o
 * `sales.emitNfse` existe no `finance_view` dos dois idiomas.
 */
const root = join(__dirname, '../../../../../public/locales');
const load = (loc: string, ns: string) => JSON.parse(readFileSync(join(root, loc, `${ns}.json`), 'utf-8')) as Record<string, unknown>;

function get(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

const keys = [
  ...Object.keys(STATUS_LABEL).map((k) => `dfe.status.${k}`),
  ...Object.keys(PENDENCIA_LABEL).map((k) => `dfe.pendencia.${k}`),
  ...Object.keys(MOTIVO_LABEL).map((k) => `dfe.motivo.${k}`),
  ...(Object.keys(CAMPO_LABEL) as CampoComparado[]).map(campoKey),
  ...Object.keys(AMBIENTE_LABEL).map((k) => `dfe.ambiente.${k}`),
];

describe.each(['pt', 'en'])('i18n dfe (%s)', (loc) => {
  const acc = load(loc, 'accounting');
  it.each(keys)('%s tem tradução', (key) => {
    expect(typeof get(acc, key)).toBe('string');
  });
  it('finance_view: sales.emitNfse', () => {
    expect(typeof get(load(loc, 'finance_view'), 'sales.emitNfse')).toBe('string');
  });
  it('pt: as traduções dos mapas são os textos de fallback do código', () => {
    if (loc !== 'pt') return;
    expect(get(acc, 'dfe.status.AUTHORIZED_DIVERGENT')).toBe(STATUS_LABEL.AUTHORIZED_DIVERGENT);
    expect(get(acc, campoKey('toma.doc'))).toBe(CAMPO_LABEL['toma.doc']);
  });
});
