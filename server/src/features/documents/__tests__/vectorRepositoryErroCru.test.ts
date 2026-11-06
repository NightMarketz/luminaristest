/**
 * ERRO-CRU-AO-CLIENTE (GAP-MAP, dono 2026-11-04) — `VectorRepository.search` embrulhava o erro do Qdrant num
 * `ServiceError` (um `AppError`), cuja mensagem o `handleApiError` repassa ao cliente. O texto do Qdrant fica no log.
 */
const INTERNO = 'Bad Request: Wrong input: Collection `documents` not found at http://qdrant.internal:6333';

jest.mock('@/lib/vector/qdrant', () => ({
  qdrant: { query: jest.fn(async () => { throw new Error(INTERNO); }) },
}));

import { VectorRepository } from '../repositories/VectorRepository';
import { ServiceError } from '@/lib/errors';

describe('VectorRepository.search — erro cru não chega ao cliente', () => {
  it('falha do Qdrant ⇒ ServiceError sem o texto do Qdrant', async () => {
    const repo = new VectorRepository();
    const err = await repo.search(new Array(1536).fill(0.1), 5, ['d1'], 'u1').catch((e) => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.message).not.toContain('qdrant.internal');
    expect(err.message).not.toContain('Collection');
  });
});
