/**
 * Integration tests for DocumentService — business rules against a REAL SQLite DB with the real
 * DocumentRepository and DocumentPolicy. The vector index is a spy over the real `ChunkVectorRepository` (vec0 on a
 * temp file of its own, RAG-PR-A) and the embedder is a deterministic fake, so no network is touched.
 *
 * Covers what the policy unit test can't: Tier-0 (a USER only touches their own docs), the
 * existence-non-leak (404 not 403 for a foreign doc), the typed-error contract, and the privacy-
 * critical delete ordering — vectors are removed BEFORE the SQL row, and a vector-index failure must leave SQL intact
 * (RAG-PR-A item 9, path 2).
 *
 * Run via `npm run test:integration`.
 */
import { DocumentService } from '../DocumentService';
import { DocumentRepository } from '../../repositories/DocumentRepository';
import { DocumentPolicy } from '../../policies/DocumentPolicy';
import { Role } from '../../../users/models/User.model';
import { NotFoundError, ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { DocumentStatus } from '../../models/Document.model';
import { pushTestSchema, resetDb, disconnectDb, seedUser, seedDocument, ctxFor } from '@test/helpers';
import { ChunkRepository } from '../../repositories/ChunkRepository';
import { ChunkVectorRepository } from '../../repositories/ChunkVectorRepository';
import { getVecIndex } from '@/lib/vector/sqliteVec';
import prisma from '@/lib/prisma';

const repo = new DocumentRepository();

/** Per-test fakes for the external collaborators; only the SQL path is real. */
const STAMP = 'fake:det@768';
const unit = (hot: number) => {
  const a = new Float32Array(768);
  a[hot] = 1;
  return a;
};

function makeService() {
  const real = new ChunkVectorRepository(() => getVecIndex().db);
  const vector = {
    upsert: jest.fn((rows: Parameters<ChunkVectorRepository['upsert']>[0]) => real.upsert(rows)),
    search: jest.fn((q: Parameters<ChunkVectorRepository['search']>[0]) => real.search(q)),
    deleteByDocument: jest.fn((id: string) => real.deleteByDocument(id)),
    deleteByUser: jest.fn((id: string) => real.deleteByUser(id)),
  };
  const processing = {
    extractText: jest.fn().mockResolvedValue('text'),
  };
  const embedder = {
    currentStamp: jest.fn().mockResolvedValue(STAMP),
    embed: jest.fn(async (_u: string, texts: string[]) => ({ vectors: texts.map(() => unit(0)), stamp: STAMP, dims: 768 })),
  };
  const service = new DocumentService(
    repo,
    new ChunkRepository(),
    vector as any,
    processing as any,
    new DocumentPolicy(),
    {} as any, // userRepository — pipeline-only
    embedder
  );
  return { service, vector, processing, embedder, real };
}

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

describe('getDocumentById (Tier-0)', () => {
  it('lets the owner read their OWN document', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id, fileName: 'mine.pdf' });

    const got = await service.getDocumentById(doc.id, ctxFor({ id: owner.id, username: owner.username }));
    expect(got.id).toBe(doc.id);
    expect(got.fileName).toBe('mine.pdf');
  });

  it('throws NotFoundError (NOT Forbidden) for a foreign document — existence is not leaked', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const stranger = await seedUser({ username: 'stranger' });
    const doc = await seedDocument({ userId: owner.id });

    await expect(
      service.getDocumentById(doc.id, ctxFor({ id: stranger.id, username: stranger.username }))
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lets an ADMIN read any document', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id, fileName: 'target.pdf' });

    const got = await service.getDocumentById(doc.id, ctxFor({ id: 'admin-1', username: 'root', role: Role.ADMIN }));
    expect(got.fileName).toBe('target.pdf');
  });

  it('throws NotFoundError when the document does not exist', async () => {
    const { service } = makeService();
    await expect(
      service.getDocumentById('cl00000000000000000000000', ctxFor({ id: 'u1', username: 'u' }))
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('getAllDocuments', () => {
  it('returns only the caller documents (scoped to userId)', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const other = await seedUser({ username: 'other' });
    await seedDocument({ userId: owner.id, fileName: 'a.pdf' });
    await seedDocument({ userId: owner.id, fileName: 'b.pdf' });
    await seedDocument({ userId: other.id, fileName: 'foreign.pdf' });

    const { documents, totalCount } = await service.getAllDocuments(
      ctxFor({ id: owner.id, username: owner.username }),
      1,
      10
    );
    expect(totalCount).toBe(2);
    expect(documents.every((d) => d.userId === owner.id)).toBe(true);
  });

  it('throws UnauthorizedError when there is no userId', async () => {
    const { service } = makeService();
    const ctx = { ...ctxFor({ id: 'x', username: 'x' }), userId: '' };
    await expect(service.getAllDocuments(ctx, 1, 10)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('updateDocumentContext (Tier-0; RAG-PR-B item 18)', () => {
  const patch = { summary: 'resumo corrigido' };

  it('lets the owner correct summary/fileName and leaves the pipeline fields alone', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id, status: 'PENDING' });

    const updated = await service.updateDocumentContext(
      doc.id,
      { ...patch, fileName: 'contrato.pdf' },
      ctxFor({ id: owner.id, username: owner.username }),
    );
    expect(updated.summary).toBe('resumo corrigido');
    expect(updated.fileName).toBe('contrato.pdf');
    expect(updated.status).toBe(DocumentStatus.PENDING);
    expect(updated.generatedContext).toEqual({ version: 1, documentType: null, entities: [], userEditedFields: ['summary'] });
  });

  it('every corrected context field enters userEditedFields, cumulatively and without duplicates', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id });
    await prisma.document.update({
      where: { id: doc.id },
      data: { generatedContext: { version: 1, documentType: 'Contrato', entities: [], userEditedFields: ['summary'] } },
    });
    const ctx = ctxFor({ id: owner.id, username: owner.username });

    await service.updateDocumentContext(doc.id, { entities: [{ type: 'EMPRESA', value: 'ACME Ltda' }] }, ctx);
    const updated = await service.updateDocumentContext(doc.id, { documentType: 'Aditivo', summary: 's' }, ctx);
    expect(updated.generatedContext).toEqual({
      version: 1,
      documentType: 'Aditivo',
      entities: [{ type: 'EMPRESA', value: 'ACME Ltda' }],
      userEditedFields: ['summary', 'entities', 'documentType'],
    });
  });

  it('fileName/documentPurpose only: no generatedContext written', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id });
    const updated = await service.updateDocumentContext(doc.id, { fileName: 'x.pdf' }, ctxFor({ id: owner.id, username: owner.username }));
    expect(updated.generatedContext).toBeNull();
  });

  it('forbids a USER from updating ANOTHER user document (ForbiddenError)', async () => {
    const { service } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const stranger = await seedUser({ username: 'stranger' });
    const doc = await seedDocument({ userId: owner.id });

    await expect(
      service.updateDocumentContext(doc.id, patch, ctxFor({ id: stranger.id, username: stranger.username }))
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect((await prisma.document.findUniqueOrThrow({ where: { id: doc.id } })).summary).toBeNull();
  });

  it('throws NotFoundError for a missing document', async () => {
    const { service } = makeService();
    await expect(
      service.updateDocumentContext('cl00000000000000000000000', patch, ctxFor({ id: 'u', username: 'u' }))
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('deleteDocument (privacy-critical ordering)', () => {
  it('deletes the vectors BEFORE the SQL row, then removes the document', async () => {
    const { service, vector } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id });

    await service.deleteDocument(doc.id, ctxFor({ id: owner.id, username: owner.username }));

    // Vectors purged by document — so deleted content can't resurface in RAG.
    expect(vector.deleteByDocument).toHaveBeenCalledWith(doc.id);
    // SQL row is gone.
    expect(await repo.findById(doc.id)).toBeNull();
  });

  it('leaves the SQL row INTACT if the vector delete fails (vector-before-SQL ordering)', async () => {
    const { service, vector } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id });
    vector.deleteByDocument.mockRejectedValue(new Error('vector index down'));

    await expect(
      service.deleteDocument(doc.id, ctxFor({ id: owner.id, username: owner.username }))
    ).rejects.toThrow();
    // The document must still exist: we never reach the SQL delete if the vector delete failed.
    expect(await repo.findById(doc.id)).not.toBeNull();
  });

  it('forbids a USER from deleting ANOTHER user document and does NOT touch the vectors', async () => {
    const { service, vector } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const stranger = await seedUser({ username: 'stranger' });
    const doc = await seedDocument({ userId: owner.id });

    await expect(
      service.deleteDocument(doc.id, ctxFor({ id: stranger.id, username: stranger.username }))
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(vector.deleteByDocument).not.toHaveBeenCalled();
    expect(await repo.findById(doc.id)).not.toBeNull();
  });

  it('lets an ADMIN delete another user document', async () => {
    const { service, vector } = makeService();
    const owner = await seedUser({ username: 'owner' });
    const doc = await seedDocument({ userId: owner.id });

    await service.deleteDocument(doc.id, ctxFor({ id: 'admin-1', username: 'root', role: Role.ADMIN }));
    expect(vector.deleteByDocument).toHaveBeenCalledWith(doc.id);
    expect(await repo.findById(doc.id)).toBeNull();
  });

  it('throws NotFoundError for a missing document', async () => {
    const { service } = makeService();
    await expect(
      service.deleteDocument('cl00000000000000000000000', ctxFor({ id: 'u', username: 'u' }))
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// searchDocuments saiu do DocumentService (RAG-PR-B item 14): a busca é do DocumentSearchService —
// documentSearch.integration.test.ts.
