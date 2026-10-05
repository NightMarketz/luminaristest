import {
  CreatePackageAcceptanceSchema,
  GetPackageAcceptanceQuerySchema,
  PackageSaleReceiptQuerySchema,
  ValidityNoticeQuerySchema,
} from '../PackageAcceptanceDto';

const SHA = 'a'.repeat(64);

describe('PackageAcceptanceDto — contrato de entrada (BRIEF §4.2)', () => {
  describe('ValidityNoticeQuerySchema', () => {
    const ok = { unitId: 'u1', packageId: 'p1', saleDate: '2026-11-25' };
    it('aceita a forma completa', () => expect(ValidityNoticeQuerySchema.safeParse(ok).success).toBe(true));
    it('recusa data impossível (calendário real, não só regex)', () => {
      expect(ValidityNoticeQuerySchema.safeParse({ ...ok, saleDate: '2026-02-30' }).success).toBe(false);
      expect(ValidityNoticeQuerySchema.safeParse({ ...ok, saleDate: '25/11/2026' }).success).toBe(false);
    });
    it('é .strict(): chave extra reprova', () => {
      expect(ValidityNoticeQuerySchema.safeParse({ ...ok, expiresOn: '2026-12-26' }).success).toBe(false);
    });
    it('exige os três campos', () => {
      expect(ValidityNoticeQuerySchema.safeParse({ unitId: 'u1', saleDate: '2026-11-25' }).success).toBe(false);
    });
  });

  describe('CreatePackageAcceptanceSchema', () => {
    const ok = { unitId: 'u1', saleId: 's1', textVersion: 'v1', textSha256: SHA };
    it('aceita a forma completa', () => expect(CreatePackageAcceptanceSchema.safeParse(ok).success).toBe(true));
    it('o servidor não aceita texto, cliente, data nem prazo vindos do FE (.strict())', () => {
      for (const extra of [{ textShown: 'x' }, { customerId: 'c' }, { saleDate: '2026-11-25' }, { validityDays: 30 }, { acceptedByUserId: 'u' }]) {
        expect(CreatePackageAcceptanceSchema.safeParse({ ...ok, ...extra }).success).toBe(false);
      }
    });
    it('textVersion é a literal da versão corrente; hash é hex minúsculo de 64', () => {
      expect(CreatePackageAcceptanceSchema.safeParse({ ...ok, textVersion: 'v2' }).success).toBe(false);
      expect(CreatePackageAcceptanceSchema.safeParse({ ...ok, textSha256: 'A'.repeat(64) }).success).toBe(false);
      expect(CreatePackageAcceptanceSchema.safeParse({ ...ok, textSha256: 'a'.repeat(63) }).success).toBe(false);
    });
  });

  describe('GetPackageAcceptanceQuerySchema / PackageSaleReceiptQuerySchema', () => {
    it('exigem unitId (e saleId no GET); recusam chave extra', () => {
      expect(GetPackageAcceptanceQuerySchema.safeParse({ unitId: 'u', saleId: 's' }).success).toBe(true);
      expect(GetPackageAcceptanceQuerySchema.safeParse({ unitId: 'u' }).success).toBe(false);
      expect(GetPackageAcceptanceQuerySchema.safeParse({ unitId: 'u', saleId: 's', x: 1 }).success).toBe(false);
      expect(PackageSaleReceiptQuerySchema.safeParse({ unitId: 'u' }).success).toBe(true);
      expect(PackageSaleReceiptQuerySchema.safeParse({}).success).toBe(false);
    });
  });
});
