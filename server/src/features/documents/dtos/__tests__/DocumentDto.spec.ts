/**
 * Unit tests for the documents DTOs (the Zod validation boundary) — pure, no I/O.
 *
 * The boundary rejects malformed/hostile input before it reaches the service, so we test the LIMITS
 * (what must be rejected) and the coercions/defaults, not just the happy path. Part of the gold test
 * template: every feature's `dtos/` gets a matching `*Dto.spec.ts`.
 */
import {
  CreateDocumentSchema,
  ListDocumentsQuerySchema,
  SearchDocumentsSchema,
  SearchDocumentsToolArgsSchema,
  UpdateDocumentContextSchema,
  GeneratedContextSchema,
} from '../DocumentDto';
import { DocumentPurpose } from '../../models/Document.model';

describe('CreateDocumentSchema', () => {
  const valid = { fileName: 'report.pdf', fileType: 'PDF', fileSize: 2048 };

  it('accepts a valid payload', () => {
    expect(CreateDocumentSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults documentPurpose to DATA_ANALYSIS when omitted', () => {
    const parsed = CreateDocumentSchema.parse(valid);
    expect(parsed.documentPurpose).toBe(DocumentPurpose.DATA_ANALYSIS);
  });

  it('accepts an explicit KNOWLEDGE_BASE purpose', () => {
    const parsed = CreateDocumentSchema.parse({ ...valid, documentPurpose: DocumentPurpose.KNOWLEDGE_BASE });
    expect(parsed.documentPurpose).toBe(DocumentPurpose.KNOWLEDGE_BASE);
  });

  it('rejects an empty fileName', () => {
    expect(CreateDocumentSchema.safeParse({ ...valid, fileName: '' }).success).toBe(false);
  });

  it('rejects an unsupported fileType', () => {
    expect(CreateDocumentSchema.safeParse({ ...valid, fileType: 'TXT' }).success).toBe(false);
    expect(CreateDocumentSchema.safeParse({ ...valid, fileType: 'pdf' }).success).toBe(false); // case-sensitive enum
  });

  it('rejects a non-positive fileSize', () => {
    expect(CreateDocumentSchema.safeParse({ ...valid, fileSize: 0 }).success).toBe(false);
    expect(CreateDocumentSchema.safeParse({ ...valid, fileSize: -1 }).success).toBe(false);
  });

  it('rejects an unknown documentPurpose', () => {
    expect(CreateDocumentSchema.safeParse({ ...valid, documentPurpose: 'WHATEVER' }).success).toBe(false);
  });
});

describe('ListDocumentsQuerySchema', () => {
  it('applies defaults when empty (page=1, limit=10)', () => {
    expect(ListDocumentsQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
  });

  it('coerces numeric strings', () => {
    expect(ListDocumentsQuerySchema.parse({ page: '3', limit: '25' })).toEqual({ page: 3, limit: 25 });
  });

  it('caps limit at 100 (rejects above)', () => {
    expect(ListDocumentsQuerySchema.safeParse({ limit: 200 }).success).toBe(false);
  });

  it('rejects page below 1', () => {
    expect(ListDocumentsQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });
});

describe('SearchDocumentsSchema', () => {
  it('accepts a valid query and defaults limit to 10', () => {
    const parsed = SearchDocumentsSchema.parse({ query: 'sales last month' });
    expect(parsed.limit).toBe(10);
  });

  it('rejects an empty query', () => {
    expect(SearchDocumentsSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('caps limit at 100 (rejects above)', () => {
    expect(SearchDocumentsSchema.safeParse({ query: 'x', limit: 500 }).success).toBe(false);
  });

  // RAG-PR-B item 14
  it('accepts documentIds up to 50 and rejects 51', () => {
    const ids = (n: number) => Array.from({ length: n }, (_, i) => `d${i}`);
    expect(SearchDocumentsSchema.safeParse({ query: 'x', documentIds: ids(50) }).success).toBe(true);
    expect(SearchDocumentsSchema.safeParse({ query: 'x', documentIds: ids(51) }).success).toBe(false);
  });

  it('is strict: an extra key → rejected', () => {
    expect(SearchDocumentsSchema.safeParse({ query: 'x', userId: 'other' }).success).toBe(false);
  });
});

describe('SearchDocumentsToolArgsSchema (RAG-PR-B item 16)', () => {
  it('defaults limit to 5 and caps it at 10', () => {
    expect(SearchDocumentsToolArgsSchema.parse({ query: 'x' }).limit).toBe(5);
    expect(SearchDocumentsToolArgsSchema.safeParse({ query: 'x', limit: 11 }).success).toBe(false);
  });

  it('rejects documentIds (agent mode searches every owned document) and a query over 2000 chars', () => {
    expect(SearchDocumentsToolArgsSchema.safeParse({ query: 'x', documentIds: ['d'] }).success).toBe(false);
    expect(SearchDocumentsToolArgsSchema.safeParse({ query: 'x'.repeat(2001) }).success).toBe(false);
  });
});

describe('UpdateDocumentContextSchema (RAG-PR-B item 18, F-RAG-4)', () => {
  it.each(['status', 'processingError', 'processingDate', 'contextJson', 'userEditedFields'])(
    'pipeline-owned key "%s" in the body → rejected (strict)',
    (key) => {
      expect(UpdateDocumentContextSchema.safeParse({ summary: 'x', [key]: null }).success).toBe(false);
    },
  );
  it('accepts the user-correctable fields', () => {
    const r = UpdateDocumentContextSchema.safeParse({
      fileName: 'a.pdf',
      documentPurpose: DocumentPurpose.KNOWLEDGE_BASE,
      summary: null,
      documentType: 'Contrato',
      entities: [{ type: 'PESSOA', value: 'Ana' }],
    });
    expect(r.success).toBe(true);
  });
  it('rejects an unknown entity type, an empty fileName and a summary over 4000 chars', () => {
    expect(UpdateDocumentContextSchema.safeParse({ entities: [{ type: 'CPF', value: '1' }] }).success).toBe(false);
    expect(UpdateDocumentContextSchema.safeParse({ fileName: '' }).success).toBe(false);
    expect(UpdateDocumentContextSchema.safeParse({ summary: 'x'.repeat(4001) }).success).toBe(false);
  });
  it('GeneratedContextSchema defaults userEditedFields to [] and is strict', () => {
    expect(GeneratedContextSchema.parse({ version: 1, documentType: null, entities: [] }).userEditedFields).toEqual([]);
    expect(GeneratedContextSchema.safeParse({ version: 1, documentType: null, entities: [], extra: 1 }).success).toBe(false);
  });
});
