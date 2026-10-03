import { ProductDestinationParamsSchema, UpsertProductDestinationSchema } from '../ProductDestinationDto';

/** ITEM-DESTINATION PR-2 (§2 + EMENDA 29/09 item 25): o default aceita só REVENDA | INSUMO_SERVICO. */
describe('UpsertProductDestinationSchema', () => {
  const base = { unitId: 'u1', productRef: 'p1' };
  it.each(['REVENDA', 'INSUMO_SERVICO'])('aceita %s', (destination) => {
    expect(UpsertProductDestinationSchema.safeParse({ ...base, destination }).success).toBe(true);
  });
  it.each(['IMOBILIZADO', 'USO_CONSUMO', undefined])('recusa %s', (destination) => {
    expect(UpsertProductDestinationSchema.safeParse({ ...base, destination }).success).toBe(false);
  });
  it('strict: chave desconhecida e productRef vazio são recusados', () => {
    expect(UpsertProductDestinationSchema.safeParse({ ...base, destination: 'REVENDA', classId: 'c' }).success).toBe(false);
    expect(UpsertProductDestinationSchema.safeParse({ ...base, productRef: '', destination: 'REVENDA' }).success).toBe(false);
    expect(ProductDestinationParamsSchema.safeParse({ productRef: '' }).success).toBe(false);
  });
});
