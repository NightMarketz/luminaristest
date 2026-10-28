/**
 * D-2026-10-28-LACUNAS-EXECUTA-27-28 item 1 ("Bloquear remoção") — `PartnerService.remove`: sócio com distribuição de
 * lucros ou JCP → 409 `SOCIO_COM_DISTRIBUICAO` sem soft-delete; a checagem lê com a MESMA tx do soft-delete.
 */
import { ConflictError, NotFoundError } from '../../../../lib/errors';
import { PartnerService, PARTNER_DELETED } from '../PartnerService';
import type { AccountingScope } from '../../scope/AccountingScope';

const scope = { ownerUserId: 'owner-1', unitId: 'unit-1', actorUserId: 'actor-1' } as unknown as AccountingScope;
const TX = { tx: true };
const ROW = { id: 'p-1', userId: 'owner-1' };

function build(opts: { row?: typeof ROW | null; dividendo?: boolean; jcp?: boolean } = {}) {
  const repo = {
    findById: jest.fn(async () => (opts.row === undefined ? ROW : opts.row)),
    softDelete: jest.fn(async () => ROW),
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(TX)),
  };
  const policy = { canManageFiscalProfile: () => true, canReadFiscalProfile: () => true };
  const audit = { append: jest.fn(async () => undefined) };
  const distribuicoes = { existsDoSocio: jest.fn(async () => opts.dividendo ?? false) };
  const jcp = { existsAlocacaoDoSocio: jest.fn(async () => opts.jcp ?? false) };
  const service = new PartnerService(repo as never, policy as never, audit as never, distribuicoes, jcp);
  return { service, repo, audit, distribuicoes, jcp };
}

describe('PartnerService.remove — gate de distribuição (D-2026-10-28 item 1)', () => {
  it.each([
    ['dividendo', { dividendo: true }],
    ['JCP', { jcp: true }],
  ])('sócio com %s → 409 SOCIO_COM_DISTRIBUICAO citando saidaEm; sem soft-delete nem auditoria', async (_, opts) => {
    const { service, repo, audit } = build(opts);
    const err = await service.remove(scope, 'p-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err).toMatchObject({ statusCode: 409, errorCode: 'SOCIO_COM_DISTRIBUICAO' });
    expect((err as Error).message).toContain('saidaEm');
    expect(repo.softDelete).not.toHaveBeenCalled();
    expect(audit.append).not.toHaveBeenCalled();
  });

  it('a checagem roda dentro da tx do soft-delete (mesma tx nos dois repositórios)', async () => {
    const { service, distribuicoes, jcp } = build({ jcp: true });
    await expect(service.remove(scope, 'p-1')).rejects.toBeInstanceOf(ConflictError);
    expect(distribuicoes.existsDoSocio).toHaveBeenCalledWith('owner-1', 'p-1', TX);
    expect(jcp.existsAlocacaoDoSocio).toHaveBeenCalledWith('owner-1', 'p-1', TX);
  });

  it('sem distribuição → soft-delete + partner.deleted na mesma tx', async () => {
    const { service, repo, audit } = build();
    await service.remove(scope, 'p-1');
    expect(repo.softDelete).toHaveBeenCalledWith(scope, 'p-1', TX);
    expect(audit.append).toHaveBeenCalledWith(TX, scope, expect.objectContaining({ eventType: PARTNER_DELETED, payload: { partnerId: 'p-1' } }));
  });

  it('sócio inexistente → 404 antes do gate', async () => {
    const { service, distribuicoes } = build({ row: null });
    await expect(service.remove(scope, 'p-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(distribuicoes.existsDoSocio).not.toHaveBeenCalled();
  });
});
