import { CreateSourceDocumentUploadSchema, DocumentoRefSchema, SourceDocumentUploadViewSchema } from '../SourceDocumentUploadDto';

/** BE-INCR-SOURCE-DOCUMENT-UPLOAD BRIEF item 2 + §2 — contrato de entrada e de saída materializados. */
describe('CreateSourceDocumentUploadSchema', () => {
  const ok = { unitId: 'unit-1', sourceType: 'tax.simples.das' };

  it('aceita o mínimo e os opcionais válidos', () => {
    expect(CreateSourceDocumentUploadSchema.parse(ok)).toEqual(ok);
    const full = { ...ok, externalRef: ' 07202617000000001 ', documentDate: '2026-07-20', description: 'DAS 06/2026' };
    expect(CreateSourceDocumentUploadSchema.parse(full)).toMatchObject({ externalRef: '07202617000000001', documentDate: '2026-07-20' });
    expect(CreateSourceDocumentUploadSchema.safeParse({ ...ok, sourceType: 'tax.simples.historico' }).success).toBe(true);
  });

  it.each([
    ['sourceType fora da lista fechada (F-SD-3 a)', { ...ok, sourceType: 'bank.statement' }],
    ['sem sourceType', { unitId: 'unit-1' }],
    ['campo desconhecido (.strict)', { ...ok, attachmentId: 'att-1' }],
    ['documentDate fora do calendário', { ...ok, documentDate: '2026-02-30' }],
    ['externalRef > 255', { ...ok, externalRef: 'x'.repeat(256) }],
    ['description > 500', { ...ok, description: 'x'.repeat(501) }],
    ['unitId com separador de caminho', { ...ok, unitId: '../u' }],
  ])('rejeita: %s', (_n, body) => {
    expect(CreateSourceDocumentUploadSchema.safeParse(body).success).toBe(false);
  });
});

describe('SourceDocumentUploadViewSchema / DocumentoRefSchema', () => {
  it('a view não carrega storageKey/userId/unitId (strict)', () => {
    const view = {
      id: 'sd-1',
      sourceType: 'tax.simples.das',
      externalRef: null,
      documentDate: null,
      description: null,
      createdAt: '2026-10-15T00:00:00.000Z',
      attachment: { id: 'att-1', fileName: 'das.pdf', mimeType: 'application/pdf', fileSize: 4, sha256: 'a'.repeat(64) },
    };
    expect(SourceDocumentUploadViewSchema.safeParse(view).success).toBe(true);
    expect(SourceDocumentUploadViewSchema.safeParse({ ...view, unitId: 'u' }).success).toBe(false);
    expect(SourceDocumentUploadViewSchema.safeParse({ ...view, attachment: { ...view.attachment, storageKey: 'k' } }).success).toBe(false);
  });

  it('documento: objeto com ids anuláveis ou null', () => {
    expect(DocumentoRefSchema.safeParse(null).success).toBe(true);
    expect(DocumentoRefSchema.safeParse({ sourceDocumentId: 'sd-1', attachmentId: null, fileName: null }).success).toBe(true);
    expect(DocumentoRefSchema.safeParse({ sourceDocumentId: 'sd-1' }).success).toBe(false);
  });
});
