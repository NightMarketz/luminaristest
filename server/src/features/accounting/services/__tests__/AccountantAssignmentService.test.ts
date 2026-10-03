/**
 * AccountantAssignmentService — BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR), BRIEF itens 5–9, testes 17f/17g.
 * Repositório e auditoria em dublê; policy REAL (as regras de quem pode o quê são o objeto do teste).
 */
import type { AccountantAssignment } from 'generated/prisma';
import { AccountantAssignmentService } from '../AccountantAssignmentService';
import { AccountingPolicy } from '../../policies/AccountingPolicy';
import type { ActiveAccountant } from '../../policies/IAccountingPolicy';
import type { IAccountantAssignmentRepository } from '../../repositories/IAccountantAssignmentRepository';
import type { IAccountingContactRepository } from '../../repositories/IAccountingContactRepository';
import type { IUserRepository } from '../../../users/repositories/IUserRepository';
import type { AuditService } from '../AuditService';
import { resolveAccountingScope } from '../../scope/AccountingScope';
import { ConflictError } from '../../../../lib/errors';

const T0 = new Date('2026-10-03T12:00:00.000Z');
const owner = resolveAccountingScope({ userId: 'dono' }, 'unit-1');

const row = (over: Partial<AccountantAssignment> = {}): AccountantAssignment => ({
  id: 'asg-1', userId: 'dono', unitId: 'unit-1', accountantUserId: 'contador', accountingContactId: 'ct-1',
  crcNumber: 'SP-123456/O-1', crcUf: 'SP', status: 'PENDING', activeSlot: null, pendingSlot: 'PENDING',
  activeFrom: null, activeUntil: null, createdById: 'dono', endedById: null, endReason: null,
  createdAt: T0, updatedAt: T0, deletedAt: null, ...over,
});

interface Opts {
  contact?: { id: string; crcNumber: string; crcUf: string } | null;
  user?: { id: string } | null;
  pending?: AccountantAssignment | null;
  active?: ActiveAccountant | null;
  byId?: AccountantAssignment | null;
  forPair?: ActiveAccountant | null;
}

function build(opts: Opts = {}) {
  const transition = jest.fn(async (id: string, _from: string, to: string, patch: Record<string, unknown>, _tx?: unknown) =>
    row({ id, status: to, ...patch }),
  );
  const create = jest.fn(async (d: Record<string, unknown>) => row({ ...d, id: 'asg-new' }));
  const findActive = jest.fn(async () => opts.active ?? null);
  const findActiveForPair = jest.fn(async () => opts.forPair ?? null);
  const repo = {
    findActive,
    findPending: jest.fn(async () => opts.pending ?? null),
    findActiveForPair,
    findById: jest.fn(async () => (opts.byId === undefined ? row() : opts.byId)),
    listByScope: jest.fn(async () => [row()]),
    listLiveForAccountant: jest.fn(async () => [{ ...row(), ownerEmail: 'dono@ex.com' }]),
    create,
    transition,
    runTransaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true })),
  } as unknown as IAccountantAssignmentRepository;
  const contactRepo = {
    findById: jest.fn(async () =>
      opts.contact === undefined ? { id: 'ct-1', crcNumber: 'SP-123456/O-1', crcUf: 'SP' } : opts.contact,
    ),
  } as unknown as IAccountingContactRepository;
  const userRepo = {
    getUserByEmail: jest.fn(async () => (opts.user === undefined ? { id: 'contador' } : opts.user)),
  } as unknown as IUserRepository;
  const append = jest.fn(async (_tx: unknown, _scope: unknown, _input: { eventType: string; actorUserId: string; payload: Record<string, unknown> }) => undefined);
  const audit = { append } as unknown as AuditService;
  const service = new AccountantAssignmentService(repo, contactRepo, userRepo, new AccountingPolicy(), audit);
  return { service, transition, create, append, findActiveForPair };
}

const invite = { unitId: 'unit-1', accountingContactId: 'ct-1', accountantEmail: 'contador@ex.com' };

describe('AccountantAssignmentService', () => {
  describe('invite (item 6)', () => {
    it('cria PENDING com snapshot do CRC do contato e audita sem e-mail', async () => {
      const { service, create, append } = build();
      await service.invite(owner, invite);
      expect(create.mock.calls[0][0]).toMatchObject({
        userId: 'dono', unitId: 'unit-1', accountantUserId: 'contador', accountingContactId: 'ct-1',
        crcNumber: 'SP-123456/O-1', crcUf: 'SP', createdById: 'dono',
      });
      expect(append.mock.calls[0][2]).toMatchObject({
        eventType: 'accountant_assignment.invited',
        payload: { assignmentId: 'asg-new', accountingContactId: 'ct-1', crcNumber: 'SP-123456/O-1', crcUf: 'SP' },
      });
      expect(JSON.stringify(append.mock.calls[0][2].payload)).not.toContain('@');
    });

    it('contato de outro escopo → 404', async () => {
      const { service, create } = build({ contact: null });
      await expect(service.invite(owner, invite)).rejects.toMatchObject({ statusCode: 404 });
      expect(create).not.toHaveBeenCalled();
    });

    it('e-mail sem usuário → 400 ACCOUNTANT_USER_NOT_FOUND', async () => {
      const { service } = build({ user: null });
      await expect(service.invite(owner, invite)).rejects.toMatchObject({ statusCode: 400, errorCode: 'ACCOUNTANT_USER_NOT_FOUND' });
    });

    it('autoatribuição → 400 SELF_ASSIGNMENT', async () => {
      const { service } = build({ user: { id: 'dono' } });
      await expect(service.invite(owner, invite)).rejects.toMatchObject({ statusCode: 400, errorCode: 'SELF_ASSIGNMENT' });
    });

    it('PENDING já existente no escopo → 409 ASSIGNMENT_PENDING_EXISTS', async () => {
      const { service, create } = build({ pending: row() });
      await expect(service.invite(owner, invite)).rejects.toMatchObject({ statusCode: 409, errorCode: 'ASSIGNMENT_PENDING_EXISTS' });
      expect(create).not.toHaveBeenCalled();
    });

    it('escopo delegado (ator ≠ dono) não convida → 403', async () => {
      const { service } = build();
      await expect(service.invite({ ...owner, actorUserId: 'contador' }, invite)).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('accept (item 7)', () => {
    it('ator que não é o contador convidado → 404 (não vaza a existência)', async () => {
      const { service, transition } = build();
      await expect(service.accept('dono', 'asg-1')).rejects.toMatchObject({ statusCode: 404 });
      expect(transition).not.toHaveBeenCalled();
    });

    it('sem ativo: PENDING → ACTIVE com activeFrom; auditoria na cadeia do dono com o contador como ator', async () => {
      const { service, transition, append } = build();
      await service.accept('contador', 'asg-1');
      expect(transition).toHaveBeenCalledTimes(1);
      expect(transition.mock.calls[0].slice(0, 3)).toEqual(['asg-1', 'PENDING', 'ACTIVE']);
      expect(transition.mock.calls[0][3]).toHaveProperty('activeFrom');
      const [, scopeArg, input] = append.mock.calls[0];
      expect(scopeArg).toMatchObject({ ownerUserId: 'dono', actorUserId: 'contador', unitId: 'unit-1' });
      expect(input).toMatchObject({ eventType: 'accountant_assignment.accepted', actorUserId: 'contador' });
    });

    it('substituição: encerra o ACTIVE anterior (SUPERSEDED) ANTES de ativar, na mesma tx', async () => {
      const previous: ActiveAccountant = { id: 'asg-old', ownerUserId: 'dono', unitId: 'unit-1', accountantUserId: 'velho', crcNumber: 'RJ-654321/O-2' };
      const { service, transition, append } = build({ active: previous });
      await service.accept('contador', 'asg-1');
      expect(transition.mock.calls.map((c) => c.slice(0, 3))).toEqual([
        ['asg-old', 'ACTIVE', 'ENDED'],
        ['asg-1', 'PENDING', 'ACTIVE'],
      ]);
      expect(transition.mock.calls[0][3]).toMatchObject({ endReason: 'SUPERSEDED', endedById: 'contador' });
      expect(transition.mock.calls[0][4]).toEqual(transition.mock.calls[1][4]); // mesmo tx
      expect(append.mock.calls.map((c) => c[2].eventType)).toEqual(['accountant_assignment.ended', 'accountant_assignment.accepted']);
      expect(append.mock.calls[1][2].payload).toMatchObject({ supersededAssignmentId: 'asg-old' });
    });

    it('CAS perdido (a linha saiu de PENDING) propaga 409 ASSIGNMENT_STATUS_CHANGED', async () => {
      const { service, transition } = build();
      transition.mockRejectedValueOnce(new ConflictError('mudou', 'ASSIGNMENT_STATUS_CHANGED'));
      await expect(service.accept('contador', 'asg-1')).rejects.toMatchObject({ errorCode: 'ASSIGNMENT_STATUS_CHANGED' });
    });
  });

  describe('end (item 8)', () => {
    it.each([
      ['dono', 'OWNER'],
      ['contador', 'ACCOUNTANT'],
    ])('%s encerra ACTIVE com motivo; activeUntil gravado; endedBy=%s', async (actor, endedBy) => {
      const { service, transition, append } = build({ byId: row({ status: 'ACTIVE', activeSlot: 'ACTIVE', pendingSlot: null }) });
      await service.end(actor, 'asg-1', { reason: 'distrato' });
      expect(transition.mock.calls[0].slice(0, 3)).toEqual(['asg-1', 'ACTIVE', 'ENDED']);
      expect(transition.mock.calls[0][3]).toMatchObject({ endedById: actor, endReason: 'distrato' });
      expect(transition.mock.calls[0][3]).toHaveProperty('activeUntil');
      expect(append.mock.calls[0][2]).toMatchObject({
        eventType: 'accountant_assignment.ended',
        payload: { assignmentId: 'asg-1', fromStatus: 'ACTIVE', endedBy, reason: 'distrato' },
      });
    });

    it('encerrar PENDING não grava activeUntil', async () => {
      const { service, transition } = build();
      await service.end('dono', 'asg-1', { reason: 'desisti' });
      expect(transition.mock.calls[0].slice(0, 3)).toEqual(['asg-1', 'PENDING', 'ENDED']);
      expect(transition.mock.calls[0][3]).not.toHaveProperty('activeUntil');
    });

    it('terceiro → 404', async () => {
      const { service, transition } = build();
      await expect(service.end('terceiro', 'asg-1', { reason: 'x' })).rejects.toMatchObject({ statusCode: 404 });
      expect(transition).not.toHaveBeenCalled();
    });

    it('já ENDED → 409', async () => {
      const { service } = build({ byId: row({ status: 'ENDED', pendingSlot: null }) });
      await expect(service.end('dono', 'asg-1', { reason: 'x' })).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('resolveGovernanceScope (item 5, 17g)', () => {
    it('sem ownerUserId (ou = ator): igual a resolveAccountingScope, sem consultar atribuição', async () => {
      const { service, findActiveForPair } = build();
      await expect(service.resolveGovernanceScope({ userId: 'contador' }, 'unit-1')).resolves.toEqual(
        resolveAccountingScope({ userId: 'contador' }, 'unit-1'),
      );
      await expect(service.resolveGovernanceScope({ userId: 'dono' }, 'unit-1', 'dono')).resolves.toEqual(
        resolveAccountingScope({ userId: 'dono' }, 'unit-1'),
      );
      expect(findActiveForPair).not.toHaveBeenCalled();
    });

    it('ownerUserId sem ACTIVE do par: 403 ACCOUNTANT_NOT_ASSIGNED (nunca cai no escopo do ator)', async () => {
      const { service } = build({ forPair: null });
      await expect(service.resolveGovernanceScope({ userId: 'contador' }, 'unit-1', 'dono')).rejects.toMatchObject({
        statusCode: 403,
        errorCode: 'ACCOUNTANT_NOT_ASSIGNED',
      });
    });

    it('ownerUserId com ACTIVE do par: escopo do dono com o contador como ator', async () => {
      const { service, findActiveForPair } = build({
        forPair: { id: 'asg-1', ownerUserId: 'dono', unitId: 'unit-1', accountantUserId: 'contador', crcNumber: 'SP-123456/O-1' },
      });
      const s = await service.resolveGovernanceScope({ userId: 'contador' }, 'unit-1', 'dono');
      expect(s).toEqual({ ...resolveAccountingScope({ userId: 'dono' }, 'unit-1'), actorUserId: 'contador' });
      expect(findActiveForPair).toHaveBeenCalledWith('contador', 'dono', 'unit-1');
    });
  });

  it('listMine devolve a view com ownerEmail, sem slots nem ids de autoria', async () => {
    const { service } = build();
    const [v] = await service.listMine('contador');
    expect(v).toMatchObject({ id: 'asg-1', status: 'PENDING', ownerEmail: 'dono@ex.com', ownerUserId: row().userId, crcNumber: 'SP-123456/O-1' });
    expect(v).not.toHaveProperty('pendingSlot');
    expect(v).not.toHaveProperty('createdById');
  });
});
