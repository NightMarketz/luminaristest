/**
 * NfeDto — BE-INCR-NFE-PREVIEW (rodada 2a) comportamentos 1 e 2: entrada `PreviewNfeSchema` (.strict(),
 * só `unitId`) e o contrato de SAÍDA `NfePreviewSchema` materializado em Zod — o `ParsedNfe` dos dois
 * fixtures sintéticos e da variante alfanumérica (BE-INCR-CNPJ-ALFA) tem de passar por ele após
 * `toNfePreview`; um campo a mais falha (todo nível é `.strict()`).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfe } from '../../../../lib/nfe';
import { cnpjCheckDigits, nfeChaveCheckDigit } from '../../../../lib/cnpj';
import { NfePreviewSchema, PreviewNfeSchema } from '../NfeDto';
import { toNfePreview } from '../../services/NfePreviewService';

const FIXTURE_DIR = join(__dirname, '../../../../lib/__tests__/fixtures/nfe');
const PURCHASE = readFileSync(join(FIXTURE_DIR, 'purchase-multi-item.SYNTHETIC.xml'), 'utf8');
const SALE = readFileSync(join(FIXTURE_DIR, 'sale.SYNTHETIC.xml'), 'utf8');

/** Variante com CNPJ alfanumérico do emitente (mesma construção do nfe.test.ts, F-CNPJ-5 → a). */
function alnumVariant(): string {
  const cnpj = '12ABC34501DE' + cnpjCheckDigits('12ABC34501DE');
  const base43 = '352509' + cnpj + '55' + '001' + '000000003' + '1' + '00000003';
  const chave = base43 + String(nfeChaveCheckDigit(base43));
  return PURCHASE.replace(/35250712345678000195550010000000011000000012/g, chave).replace(
    '<CNPJ>12345678000195</CNPJ>',
    `<CNPJ>${cnpj}</CNPJ>`,
  );
}

describe('PreviewNfeSchema (comportamento 1)', () => {
  it('aceita só { unitId } não vazio', () => {
    expect(PreviewNfeSchema.safeParse({ unitId: 'unit-1' }).success).toBe(true);
    expect(PreviewNfeSchema.safeParse({ unitId: '' }).success).toBe(false);
    expect(PreviewNfeSchema.safeParse({}).success).toBe(false);
  });

  it('rejeita campo extra (.strict()) — saleId ou itemMappings não pertencem ao preview', () => {
    expect(PreviewNfeSchema.safeParse({ unitId: 'unit-1', saleId: 'x' }).success).toBe(false);
    expect(PreviewNfeSchema.safeParse({ unitId: 'unit-1', itemMappings: [] }).success).toBe(false);
  });
});

describe('NfePreviewSchema — contrato de saída (comportamento 2)', () => {
  it.each([
    ['compra (3 itens)', () => PURCHASE],
    ['venda', () => SALE],
    ['compra com CNPJ alfanumérico', alnumVariant],
  ])('o ParsedNfe do fixture de %s passa após toNfePreview', (_n, read) => {
    const preview = toNfePreview(parseNfe(read()), null);
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
    const base = toNfePreview(parseNfe(PURCHASE), null);
    expect(NfePreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(
      NfePreviewSchema.safeParse({ ...base, itens: [{ ...base.itens[0], custo: 1 }, ...base.itens.slice(1)] })
        .success,
    ).toBe(false);
    expect(NfePreviewSchema.safeParse({ ...base, protocolo: { ...base.protocolo, chNFe: base.chaveAcesso } }).success).toBe(false);
  });

  it('centavos são inteiros não negativos e a chave respeita o regex da NT 2026.004', () => {
    const base = toNfePreview(parseNfe(PURCHASE), 'pay-1');
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
