/**
 * ReferentialMappingDto — os dois `.refine` cross-field que o gate de forma não vê.
 *
 * `z.toJSONSchema()` não representa `.refine`, então o `dtoShapeSnapshot.test.ts` aprova um
 * lote com `accountId` duplicado e uma cópia de versão para ela mesma. As duas regras existem
 * por razão de escrita atômica, não de estética:
 *
 *  - BatchSet (D8, all-or-nothing): `accountId` duplicado dentro do lote deixaria o upsert
 *    atômico com um last-wins ambíguo — dois códigos referenciais diferentes para a mesma
 *    conta, e o vencedor decidido pela ordem do array.
 *  - Copy (D6, herança de ano): `fromVersion === toVersion` é uma cópia sobre si mesma —
 *    no-op que consome uma tx e mente que herdou.
 *
 * Cobre também o `shortText` (`.trim().min(1)`): o trim roda ANTES do min, coisa que o
 * snapshot registra apenas como `minLength: 1` — string só de espaços passa na leitura do
 * JSON Schema e é rejeitada pelo Zod. E o `idLike`, mesmo guarda anti-travessia do
 * ReconciliationDto.
 *
 * Molde: InventoryDto.test.ts / SpedEcdDto.test.ts — todo negativo com seu controle positivo.
 */
import {
  BatchSetReferentialMappingSchema,
  CopyReferentialMappingSchema,
  SetReferentialMappingSchema,
  UnsetReferentialMappingSchema,
  ReferentialVersionQuerySchema,
} from '../ReferentialMappingDto';

const item = (accountId: string, referentialCode = '1.01.01.01.00') => ({
  accountId,
  referentialCode,
  label: 'Caixa Geral',
});

const validBatch = {
  unitId: 'unit-1',
  mappingVersion: '2025',
  items: [item('acc-1'), item('acc-2', '1.01.01.02.00')],
};

const validCopy = { unitId: 'unit-1', fromVersion: '2025', toVersion: '2026' };

describe('BatchSetReferentialMappingSchema — accountId único no lote (refine)', () => {
  it('accepts um lote com contas distintas (CONTROLE — sem isto os negativos são vazios)', () => {
    expect(BatchSetReferentialMappingSchema.safeParse(validBatch).success).toBe(true);
  });

  it('rejects accountId duplicado no lote (last-wins ambíguo numa escrita atômica)', () => {
    const parsed = BatchSetReferentialMappingSchema.safeParse({
      ...validBatch,
      items: [item('acc-1'), item('acc-1', '9.99.99.99.99')],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === 'items')).toBe(true);
    }
  });

  it('rejects duplicata mesmo quando o par code/label é IDÊNTICO (a chave é a conta)', () => {
    expect(
      BatchSetReferentialMappingSchema.safeParse({
        ...validBatch,
        items: [item('acc-1'), item('acc-1')],
      }).success,
    ).toBe(false);
  });

  it('accepts referentialCode repetido em contas distintas (N contas → 1 código é legítimo)', () => {
    expect(
      BatchSetReferentialMappingSchema.safeParse({
        ...validBatch,
        items: [item('acc-1'), item('acc-2')],
      }).success,
    ).toBe(true);
  });

  it('rejects lote vazio e lote acima de 1000 itens', () => {
    expect(BatchSetReferentialMappingSchema.safeParse({ ...validBatch, items: [] }).success).toBe(false);
    const over = Array.from({ length: 1001 }, (_, i) => item(`acc-${i}`));
    expect(BatchSetReferentialMappingSchema.safeParse({ ...validBatch, items: over }).success).toBe(false);
  });

  it('rejects item com accountId fora do charset de id (travessia de caminho)', () => {
    expect(
      BatchSetReferentialMappingSchema.safeParse({
        ...validBatch,
        items: [item('../../etc/passwd')],
      }).success,
    ).toBe(false);
  });
});

describe('CopyReferentialMappingSchema — fromVersion ≠ toVersion (refine)', () => {
  it('accepts uma cópia entre anos distintos (CONTROLE)', () => {
    expect(CopyReferentialMappingSchema.safeParse(validCopy).success).toBe(true);
  });

  it('rejects cópia de uma versão sobre ela mesma (no-op que consome uma tx)', () => {
    const parsed = CopyReferentialMappingSchema.safeParse({ ...validCopy, toVersion: '2025' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path[0] === 'toVersion')).toBe(true);
    }
  });

  it('a igualdade é comparada APÓS o trim — " 2025" e "2025" são a mesma versão', () => {
    expect(
      CopyReferentialMappingSchema.safeParse({ ...validCopy, toVersion: ' 2025 ' }).success,
    ).toBe(false);
  });
});

describe('ReferentialMappingDto — shortText e idLike (invariantes de campo)', () => {
  const validSet = {
    unitId: 'unit-1',
    accountId: 'acc-1',
    referentialCode: '1.01.01.01.00',
    label: 'Caixa Geral',
    mappingVersion: '2025',
  };

  it('accepts o set bem-formado (CONTROLE)', () => {
    expect(SetReferentialMappingSchema.safeParse(validSet).success).toBe(true);
  });

  it('rejects texto só de espaços (o trim roda ANTES do min(1) — minLength do snapshot não vê)', () => {
    expect(SetReferentialMappingSchema.safeParse({ ...validSet, referentialCode: '   ' }).success).toBe(false);
    expect(SetReferentialMappingSchema.safeParse({ ...validSet, label: '\t\n ' }).success).toBe(false);
    expect(SetReferentialMappingSchema.safeParse({ ...validSet, mappingVersion: ' ' }).success).toBe(false);
  });

  it('normaliza o texto por trim quando há conteúdo (a versão gravada não carrega espaço)', () => {
    const parsed = SetReferentialMappingSchema.safeParse({ ...validSet, mappingVersion: ' 2025 ' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.mappingVersion).toBe('2025');
  });

  it('rejects id com separador de caminho ou ponto (guarda anti-travessia)', () => {
    for (const bad of ['../etc', 'a/b', 'a\\b', 'a.b', '']) {
      expect(SetReferentialMappingSchema.safeParse({ ...validSet, accountId: bad }).success).toBe(false);
      expect(UnsetReferentialMappingSchema.safeParse({
        unitId: 'unit-1', accountId: bad, mappingVersion: '2025',
      }).success).toBe(false);
    }
  });

  it('rejects chave desconhecida em todo schema do módulo (.strict())', () => {
    expect(SetReferentialMappingSchema.safeParse({ ...validSet, versionn: '2025' }).success).toBe(false);
    expect(BatchSetReferentialMappingSchema.safeParse({ ...validBatch, dryRun: true }).success).toBe(false);
    expect(CopyReferentialMappingSchema.safeParse({ ...validCopy, overwrite: true }).success).toBe(false);
    expect(ReferentialVersionQuerySchema.safeParse({
      unitId: 'unit-1', version: '2025', page: '1',
    }).success).toBe(false);
  });
});
