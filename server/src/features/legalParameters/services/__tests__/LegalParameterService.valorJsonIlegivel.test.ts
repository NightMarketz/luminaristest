/**
 * BRD F-69.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-69 do inventário de estruturas implícitas).
 *
 * A leitura central de `LegalParameter.valorJson` (`toView`, em `LegalParameterService.ts`) fazia
 * `JSON.parse` sem `try`: uma linha ilegível fazia a listagem inteira lançar um `SyntaxError` cru (500
 * genérico, sem dizer qual linha). O esperado (ficha: "erro com tipo e identificação da linha"): um
 * `AppError` com código próprio e o id da linha na mensagem.
 */
import type { LegalParameter } from 'generated/prisma';
import { LegalParameterService } from '../LegalParameterService';
import { AppError } from '../../../../lib/errors';

function linha(id: string, valorJson: string | null): LegalParameter {
  return {
    id, tabela: 'SIMPLES_ANEXO', chave: 'I', discriminador: null, valorInt: null, valorTexto: null, valorJson,
    fonte: 'LC 123/2006', fonteUrl: null, fonteSha256: null, vigenteDesde: '2026-01-01', vigenteAte: null,
    status: 'PUBLISHED', supersedesId: null, motivo: null, proposedById: 'u', publishedById: 'u',
    publishedAt: new Date('2026-01-01T00:00:00Z'), revokedById: null, revokedAt: null, createdAt: new Date('2026-01-01T00:00:00Z'),
  } as unknown as LegalParameter;
}

describe('BRD F-69.1 — valorJson ilegível na leitura central', () => {
  it('BRD F-69.1: a listagem lança AppError com código próprio e o id da linha, não SyntaxError cru', async () => {
    const repo = { findMany: jest.fn().mockResolvedValue([linha('lp_ok', '{"a":1}'), linha('lp_ruim', '{"a": ')]) };
    const policy = { canRead: () => true, canManage: () => false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colaboradores não usados pela listagem
    const svc = new LegalParameterService(repo as any, policy, {} as any, {} as any);

    const err = await svc.list({ userId: 'u' } as never, {} as never).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).errorCode).toBe('PARAMETRO_LEGAL_ILEGIVEL');
    expect((err as Error).message).toContain('lp_ruim');
  });
});
