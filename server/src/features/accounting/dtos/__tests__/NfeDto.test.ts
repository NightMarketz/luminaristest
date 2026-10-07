/**
 * NfeDto — BE-INCR-NFE-PREVIEW (rodada 2a) comportamentos 1 e 2: entrada `PreviewNfeSchema` (.strict(),
 * só `unitId`) e o contrato de SAÍDA `NfePreviewSchema` materializado em Zod — o `ParsedNfe` dos dois
 * fixtures sintéticos e da variante alfanumérica (BE-INCR-CNPJ-ALFA) tem de passar por ele após
 * `toNfePreview`; um campo a mais falha (todo nível é `.strict()`).
 */
import { readFileSync } from 'fs';
import { acquisitionCost } from '../../../../lib/nfeCost';
import { join } from 'path';
import { parseNfe } from '../../../../lib/nfe';
import { cnpjCheckDigits, nfeChaveCheckDigit } from '../../../../lib/cnpj';
import { ImportNfePurchaseSchema, NfePreviewSchema, PreviewNfeSchema } from '../NfeDto';
import { toNfePreview } from '../../services/NfePreviewService';
import { signNfeForTest } from '@test/helpers/nfeSignature';

import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';
const FIXTURE_DIR = join(__dirname, '../../../../lib/__tests__/fixtures/nfe');
const PURCHASE = readFileSync(join(FIXTURE_DIR, 'purchase-multi-item.SYNTHETIC.xml'), 'utf8');
const SALE = readFileSync(join(FIXTURE_DIR, 'sale.SYNTHETIC.xml'), 'utf8');

/** Variante com CNPJ alfanumérico do emitente (mesma construção do nfe.test.ts, F-CNPJ-5 → a). */
function alnumVariant(): string {
  const cnpj = '12ABC34501DE' + cnpjCheckDigits('12ABC34501DE');
  const base43 = '352509' + cnpj + '55' + '001' + '000000003' + '1' + '00000003';
  const chave = base43 + String(nfeChaveCheckDigit(base43));
  // SIG-NFE: a mutação toca o <infNFe> — re-assina com a chave de teste (F-SIG-4 b).
  return signNfeForTest(
    PURCHASE.replace(/35250712345678000195550010000000011000000012/g, chave).replace(
      '<CNPJ>12345678000195</CNPJ>',
      `<CNPJ>${cnpj}</CNPJ>`,
    ),
  );
}

describe('PreviewNfeSchema (comportamento 1)', () => {
  it('aceita só { unitId } não vazio', () => {
    expect(PreviewNfeSchema.safeParse({ unitId: 'unit-1' }).success).toBe(true);
    expect(PreviewNfeSchema.safeParse({ unitId: '' }).success).toBe(false);
    expect(PreviewNfeSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita campo extra (.strict()) — saleId não pertence ao preview', () => {
    expect(PreviewNfeSchema.safeParse({ unitId: 'unit-1', saleId: 'x' }).success).toBe(false);
  });

  // ITEM-DESTINATION item 3 / F-ID-8 (a): preview = import a seco — aceita o MESMO itemMapping, opcional.
  it('aceita itemMappings opcional com o mesmo shape do import (F-ID-8 a)', () => {
    expect(
      PreviewNfeSchema.safeParse({
        unitId: 'unit-1',
        itemMappings: [{ cProd: 'p1', productRef: 'prod-1', destination: 'INSUMO_SERVICO' }],
      }).success,
    ).toBe(true);
    expect(
      PreviewNfeSchema.safeParse({ unitId: 'unit-1', itemMappings: [{ cProd: 'p1', productRef: 'prod-1', classId: 'c' }] })
        .success,
    ).toBe(false);
  });
});

// ── ITEM-DESTINATION item 3 + EMENDA 29/09 item 22: destination no itemMapping ─────────────────────
describe('ImportNfePurchaseSchema — destination por item (ITEM-DESTINATION)', () => {
  const parse = (m: Record<string, unknown>) =>
    ImportNfePurchaseSchema.safeParse({ unitId: 'unit-1', itemMappings: [{ cProd: 'p1', ...m }] });

  it('productRef aceita REVENDA e INSUMO_SERVICO, e destination ausente', () => {
    expect(parse({ productRef: 'prod-1', destination: 'REVENDA' }).success).toBe(true);
    expect(parse({ productRef: 'prod-1', destination: 'INSUMO_SERVICO' }).success).toBe(true);
    expect(parse({ productRef: 'prod-1' }).success).toBe(true);
  });

  it('classId aceita IMOBILIZADO e destination ausente (o classId É a declaração, item 22)', () => {
    expect(parse({ classId: 'class-1', destination: 'IMOBILIZADO' }).success).toBe(true);
    expect(parse({ classId: 'class-1' }).success).toBe(true);
  });

  it('destination IMOBILIZADO sem classId → issue em destination (item 22)', () => {
    const r = parse({ productRef: 'prod-1', destination: 'IMOBILIZADO' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.some((i) => i.path.join('.') === 'itemMappings.0.destination')).toBe(true);
  });

  it('classId com destination ≠ IMOBILIZADO → issue em destination (item 22)', () => {
    for (const destination of ['REVENDA', 'INSUMO_SERVICO']) {
      const r = parse({ classId: 'class-1', destination });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues.some((i) => i.path.join('.') === 'itemMappings.0.destination')).toBe(true);
    }
  });

  it('destination fora do enum → falha', () => {
    expect(parse({ productRef: 'prod-1', destination: 'USO_CONSUMO' }).success).toBe(false);
  });
});

// ── BE-INCR-FIXED-ASSETS PR-5 (nó C8, F-FA12 → a): itemMapping XOR productRef/classId ─────────────
describe('ImportNfePurchaseSchema — itemMapping XOR (productRef estoque × classId imobilizado)', () => {
  const base = { unitId: 'unit-1' };

  it('aceita productRef sozinho (estoque)', () => {
    expect(
      ImportNfePurchaseSchema.safeParse({ ...base, itemMappings: [{ cProd: 'p1', productRef: 'prod-1' }] }).success,
    ).toBe(true);
  });

  it('aceita classId sozinho (imobilizado)', () => {
    expect(
      ImportNfePurchaseSchema.safeParse({ ...base, itemMappings: [{ cProd: 'p1', classId: 'class-1' }] }).success,
    ).toBe(true);
  });

  it('rejeita nem productRef nem classId', () => {
    expect(ImportNfePurchaseSchema.safeParse({ ...base, itemMappings: [{ cProd: 'p1' }] }).success).toBe(false);
  });

  it('rejeita productRef E classId juntos no mesmo item', () => {
    expect(
      ImportNfePurchaseSchema.safeParse({
        ...base,
        itemMappings: [{ cProd: 'p1', productRef: 'prod-1', classId: 'class-1' }],
      }).success,
    ).toBe(false);
  });
});

/** X6: custo por regime NEUTRO (não-contribuinte, CUMULATIVO) — o preview sempre carrega o bloco `custo`. */
const custoNeutro = (parsed: ReturnType<typeof parseNfe>) =>
  acquisitionCost(parsed, parsed.itens.filter((it) => it.indTot !== '0'), {
    icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false,
  }, undefined, LEGAIS_SEMENTE);

describe('NfePreviewSchema — contrato de saída (comportamento 2)', () => {
  it.each([
    ['compra (3 itens)', () => PURCHASE],
    ['venda', () => SALE],
    ['compra com CNPJ alfanumérico', alnumVariant],
  ])('o ParsedNfe do fixture de %s passa após toNfePreview', (_n, read) => {
    const preview = toNfePreview(parseNfe(read(), LEGAIS_SEMENTE), null, custoNeutro(parseNfe(read(), LEGAIS_SEMENTE)));
    const parsed = NfePreviewSchema.safeParse(preview);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.alreadyImported).toBe(false);
      expect(parsed.data.existingPayableId).toBeNull();
      expect(parsed.data.itens.length).toBeGreaterThan(0);
      expect((parsed.data.protocolo as Record<string, unknown>).chNFe).toBeUndefined();
    }
  });

  it('é .strict() em todo nível: campo a mais no topo, no item e no protocolo falha', () => {
    const base = toNfePreview(parseNfe(PURCHASE, LEGAIS_SEMENTE), null, custoNeutro(parseNfe(PURCHASE, LEGAIS_SEMENTE)));
    expect(NfePreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(
      NfePreviewSchema.safeParse({ ...base, itens: [{ ...base.itens[0], custo: 1 }, ...base.itens.slice(1)] })
        .success,
    ).toBe(false);
    expect(NfePreviewSchema.safeParse({ ...base, protocolo: { ...base.protocolo, chNFe: base.chaveAcesso } }).success).toBe(false);
  });

  it('centavos são inteiros não negativos e a chave respeita o regex da NT 2026.004', () => {
    const base = toNfePreview(parseNfe(PURCHASE, LEGAIS_SEMENTE), 'pay-1', custoNeutro(parseNfe(PURCHASE, LEGAIS_SEMENTE)));
    expect(NfePreviewSchema.safeParse({ ...base, totais: { ...base.totais, vNFCents: 193.33 } }).success).toBe(false);
    // letra fora das posições 7–20 (aqui na 1ª) viola [0-9]{6}[A-Z0-9]{12}[0-9]{26}
    expect(NfePreviewSchema.safeParse({ ...base, chaveAcesso: 'A' + base.chaveAcesso.slice(1) }).success).toBe(false);
    const ok = NfePreviewSchema.safeParse(base);
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.alreadyImported).toBe(true);
      expect(ok.data.existingPayableId).toBe('pay-1');
      expect(ok.data.totais.vNFCents).toBe(19333);
    }
  });
});
