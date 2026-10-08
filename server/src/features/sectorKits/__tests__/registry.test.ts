import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { KIT_REGISTRY, latestKit, listKits } from '../registry';
import { SECTOR_BINDING_REGISTRY, DEFAULT_SECTOR_KEY } from '../../accountingBinding/fixtures/sectorBindingRegistry';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../accountingBinding/fixtures/saleBinding';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../accountingBinding/fixtures/clinicBinding';

/**
 * BE-INCR-KIT-SETOR, PR-1 — registro (item 4), trava das versões publicadas (item 5), changelog
 * (item 6) e catálogo (item 7).
 */

/** JSON canônico: chaves ordenadas em todo nível, para o sha256 não depender da ordem de declaração. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const sha256 = (v: unknown) => createHash('sha256').update(canonicalJson(v)).digest('hex');

describe('KIT_REGISTRY e SECTOR_BINDING_REGISTRY derivado (item 4)', () => {
  it('o registro derivado é deep-equal ao de antes do kit (mesma ordem de chaves)', () => {
    const before = {
      beautySalon: { binding: SALE_BINDING_V1, operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT },
      aestheticClinic: { binding: CLINIC_BINDING_V1, operationalSchema: CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT },
    };
    expect(SECTOR_BINDING_REGISTRY).toStrictEqual(before);
    expect(Object.keys(SECTOR_BINDING_REGISTRY)).toEqual(Object.keys(before));
    expect(DEFAULT_SECTOR_KEY).toBe(SALE_BINDING_V1.sectorKey);
  });

  it('versões em ordem crescente e contíguas; kitKey = sectorKey do binding', () => {
    for (const [kitKey, versions] of Object.entries(KIT_REGISTRY)) {
      expect(versions.map((k) => k.kitVersion)).toEqual(versions.map((_, i) => i + 1));
      for (const k of versions) {
        expect(k.kitKey).toBe(kitKey);
        expect(k.binding.sectorKey).toBe(kitKey);
      }
    }
  });

  it('latestKit devolve a última versão; undefined para kit desconhecido', () => {
    const salon = KIT_REGISTRY.beautySalon;
    expect(latestKit('beautySalon')).toBe(salon[salon.length - 1]);
    expect(latestKit('naoExiste')).toBeUndefined();
  });
});

describe('versões publicadas congeladas por sha256 (item 5)', () => {
  it.each(Object.keys(KIT_REGISTRY))('%s: published.json lista toda versão e o hash bate', (kitKey) => {
    const published: Array<{ kitVersion: number; sha256: string }> = JSON.parse(
      readFileSync(join(__dirname, '..', 'kits', kitKey, 'published.json'), 'utf8'),
    );
    const actual = KIT_REGISTRY[kitKey].map((k) => ({ kitVersion: k.kitVersion, sha256: sha256(k) }));
    expect(actual).toEqual(published);
  });

  it('o hash é sensível a qualquer edição do kit', () => {
    const kit = structuredClone(KIT_REGISTRY.beautySalon[0]);
    const original = sha256(kit);
    kit.binding.eventBindings[0].roleSlots[0].accountCode = '1.1.3';
    expect(sha256(kit)).not.toBe(original);
  });
});

describe('changelog (item 6)', () => {
  it('toda versão tem ao menos 1 linha de changelog', () => {
    for (const versions of Object.values(KIT_REGISTRY)) {
      for (const k of versions) expect(k.changelog.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('listKits (item 7)', () => {
  it('devolve {kitKey, label, latestVersion} de cada kit', () => {
    expect(listKits()).toEqual([
      { kitKey: 'beautySalon', label: 'Salão de beleza', latestVersion: 1 },
      { kitKey: 'aestheticClinic', label: 'Clínica estética', latestVersion: 1 },
    ]);
  });
});
