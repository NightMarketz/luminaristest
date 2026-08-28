/**
 * SourceDocumentDto — BE-INCR-PROVENANCE-ATTACH (NFE-X), item 10 do §4.2 do BRIEF.
 *
 * POR QUE ESTE ARQUIVO EXISTE, e não só o snapshot de forma: o `dtoShapeSnapshot` serializa
 * com `z.toJSONSchema()`, que **pula `.refine`/`.superRefine`** (limite declarado no cabeçalho
 * daquele gate). O `documentDate` deste DTO é exatamente um `.refine` — logo, a validação de
 * CALENDÁRIO é invisível para o snapshot e só existe se for asserida aqui.
 *
 * A armadilha que isto morde (class-fix `date-only-regex-nao-valida-calendario`): a regex
 * `/^\d{4}-\d{2}-\d{2}$/` sozinha ACEITA `2026-02-30`, e `new Date('2026-02-30')` não dá
 * `Invalid Date` — rola em silêncio para 02-mar. Uma nota fiscal com data inexistente entraria
 * como proveniência de um mês diferente, sem erro.
 */
import { AttachSourceDocumentSchema, ListSourceDocumentsQuerySchema } from '../SourceDocumentDto';

const validBody = { unitId: 'clx1unit0000abcd' };

describe('AttachSourceDocumentSchema — controle', () => {
  it('aceita o corpo mínimo (só unitId) — sem isto todo negativo abaixo é vazio', () => {
    expect(AttachSourceDocumentSchema.safeParse(validBody).success).toBe(true);
  });

  it('aceita o corpo cheio da NF-e', () => {
    const parsed = AttachSourceDocumentSchema.safeParse({
      ...validBody,
      externalRef: '35260812345678000199550010000000011000000017',
      documentDate: '2026-06-20',
      description: 'NF-e 1/1',
      attachmentId: 'clx1att0000abcd',
      rawJson: '{"ide":{}}',
      sourceType: 'sale.finalized',
    });
    expect(parsed.success).toBe(true);
  });
});

describe('documentDate — calendário real, não só formato (o snapshot NÃO cobre isto)', () => {
  it('aceita datas reais', () => {
    for (const d of ['2026-06-20', '2024-02-29', '2026-12-31', '2026-01-01']) {
      expect(
        AttachSourceDocumentSchema.safeParse({ ...validBody, documentDate: d }).success,
      ).toBe(true);
    }
  });

  it('REJEITA data com formato válido mas dia inexistente', () => {
    // Cada uma passa na regex e rola em silêncio no `new Date()` — é o bug de classe.
    for (const d of ['2026-02-30', '2026-02-31', '2026-04-31', '2026-13-01', '2026-00-10', '2025-02-29']) {
      expect(
        AttachSourceDocumentSchema.safeParse({ ...validBody, documentDate: d }).success,
      ).toBe(false);
    }
  });

  it('rejeita formato que não é date-only', () => {
    for (const d of ['20-06-2026', '2026/06/20', '2026-6-2', '2026-06-20T00:00:00Z', 'hoje', '']) {
      expect(
        AttachSourceDocumentSchema.safeParse({ ...validBody, documentDate: d }).success,
      ).toBe(false);
    }
  });
});

describe('.strict() — campo desconhecido é 400, não descarte silencioso', () => {
  it('rejeita chave não declarada no corpo', () => {
    expect(
      AttachSourceDocumentSchema.safeParse({ ...validBody, externaRef: 'typo' }).success,
    ).toBe(false);
  });

  it('rejeita chave não declarada na query', () => {
    expect(
      ListSourceDocumentsQuerySchema.safeParse({ unitId: 'u1', extra: '1' }).success,
    ).toBe(false);
  });
});

describe('idLike — travessia de caminho em unitId/attachmentId', () => {
  const TRAVERSAL = ['../etc/passwd', '..', '.', 'a/b', 'a\\b', 'a.b', '%2e%2e%2f', 'unit 1', ''];

  it('rejeita travessia em unitId', () => {
    for (const bad of TRAVERSAL) {
      expect(AttachSourceDocumentSchema.safeParse({ unitId: bad }).success).toBe(false);
      expect(ListSourceDocumentsQuerySchema.safeParse({ unitId: bad }).success).toBe(false);
    }
  });

  it('rejeita travessia em attachmentId', () => {
    for (const bad of TRAVERSAL) {
      expect(
        AttachSourceDocumentSchema.safeParse({ ...validBody, attachmentId: bad }).success,
      ).toBe(false);
    }
  });
});

describe('limites de tamanho e vazio', () => {
  it('rejeita externalRef vazia e acima de 255', () => {
    expect(AttachSourceDocumentSchema.safeParse({ ...validBody, externalRef: '' }).success).toBe(false);
    expect(
      AttachSourceDocumentSchema.safeParse({ ...validBody, externalRef: 'x'.repeat(256) }).success,
    ).toBe(false);
    expect(
      AttachSourceDocumentSchema.safeParse({ ...validBody, externalRef: 'x'.repeat(255) }).success,
    ).toBe(true);
  });

  it('rejeita description acima de 500 e sourceType acima de 100', () => {
    expect(
      AttachSourceDocumentSchema.safeParse({ ...validBody, description: 'x'.repeat(501) }).success,
    ).toBe(false);
    expect(
      AttachSourceDocumentSchema.safeParse({ ...validBody, sourceType: 'x'.repeat(101) }).success,
    ).toBe(false);
  });
});
