/**
 * BE-INCR-TEAMMATES PR-7, itens 31–33 — caixa única de propostas com repositório falso (régua: data literal, relógio
 * injetado). Cenário: dono "caixa-dono" com o teammate "Conciliador"; uma proposta do chat (sem payload, sem prazo) e
 * propostas do teammate (com payload e `expiresAt`). Decisões: D-2026-11-07-TM-PR7-LACUNAS (L-PR7-1..4).
 */
import type { ActionProposal } from 'generated/prisma';
import type { UserContext } from '../../../lib/authUtils';
import { Role } from '../../users/models/User.model';
import type { ActionProposalStatus, IActionProposalRepository } from '../../chat/repositories/IActionProposalRepository';
import {
  KIND_SEM_DESPACHANTE,
  PROPOSTA_EXPIRADA,
  PROPOSTA_NAO_PENDENTE,
  ProposalInboxService,
  TableRowProposalDispatcher,
  type ITableRowWriter,
} from '../services/ProposalInboxService';
import { ProposalExpiryScheduler } from '../../../jobs/ProposalExpiryScheduler';

const AGORA = new Date('2026-11-07T12:00:00.000Z');
const DEPOIS = new Date('2026-11-10T12:00:00.000Z'); // 72 h

const dono: UserContext = {
  id: 'u1', userId: 'u1', name: 'Dono', username: 'caixa-dono', email: 'd@test.local', role: Role.USER,
  createdAt: AGORA, updatedAt: AGORA, userRole: 'USER', userEmail: 'd@test.local',
};
const outro: UserContext = { ...dono, id: 'u2', userId: 'u2', username: 'caixa-outro' };

function row(p: Partial<ActionProposal>): ActionProposal {
  return {
    id: 'p', userId: 'u1', action: 'CREATE', tableId: 'tb1', tableName: 'Clientes', tableLabel: 'Clientes',
    data: { nome: 'Ana' }, status: 'PENDING', createdAt: AGORA, updatedAt: AGORA, kind: 'TABLE_ROW', payload: null,
    teammateId: null, channelMessageId: null, expiresAt: null, ...p,
  } as ActionProposal;
}

function setup(rows: ActionProposal[], clock: () => Date = () => AGORA) {
  const store = new Map(rows.map((r) => [r.id, { ...r }]));
  const repo = {
    listByStatus: jest.fn(async (userId: string, status: ActionProposalStatus) =>
      [...store.values()].filter((r) => r.userId === userId && r.status === status)),
    findOwned: jest.fn(async (userId: string, id: string) => {
      const r = store.get(id);
      return r && r.userId === userId ? { ...r } : null;
    }),
    transition: jest.fn(async (id: string, from: ActionProposalStatus, to: ActionProposalStatus) => {
      const r = store.get(id);
      if (!r || r.status !== from) return false;
      r.status = to;
      return true;
    }),
    expireDue: jest.fn(async (now: Date) => {
      let n = 0;
      for (const r of store.values()) {
        if (r.status === 'PENDING' && r.expiresAt && r.expiresAt < now) {
          r.status = 'EXPIRED';
          n++;
        }
      }
      return n;
    }),
    // tx de mentira com rollback: o que o callback mudou volta se ele lançar.
    runTransaction: jest.fn(async <T,>(fn: (tx: never) => Promise<T>) => {
      const snapshot = new Map([...store].map(([k, v]) => [k, { ...v }]));
      try {
        return await fn({ tx: true } as never);
      } catch (e) {
        store.clear();
        for (const [k, v] of snapshot) store.set(k, v);
        throw e;
      }
    }),
  } as unknown as IActionProposalRepository;
  const tables: jest.Mocked<ITableRowWriter> = {
    createTableData: jest.fn(async (..._a: unknown[]) => ({ id: "linha1" })) as never,
    updateTableData: jest.fn(async (..._a: unknown[]) => ({ id: "linha2" })) as never,
  };
  const effects = { afterDataWrite: jest.fn() };
  const teammates = { listLive: jest.fn(async () => [{ id: 'tm1', name: 'Conciliador' }]) };
  const svc = new ProposalInboxService(repo, teammates as never, [new TableRowProposalDispatcher(tables, effects)], clock);
  return { svc, store, tables, effects };
}

const doChat = row({ id: 'chat1' });
const doTeammate = row({
  id: 'tm-p1', teammateId: 'tm1', expiresAt: DEPOIS, action: 'UPDATE',
  payload: { kind: 'TABLE_ROW', action: 'UPDATE', tableId: 'tb1', data: { id: 'linha2', nome: 'Bia' } },
});
const conciliacao = row({
  id: 'sm1', teammateId: 'tm1', expiresAt: DEPOIS, kind: 'SETTLEMENT_MATCH',
  payload: { kind: 'SETTLEMENT_MATCH', statementLineId: 'l1', targetType: 'RECEIVABLE', targetId: 'r1', amountCents: '1000', rationale: 'valor e data' },
});
const mcp = row({
  id: 'mcp1', teammateId: 'tm1', expiresAt: DEPOIS, kind: 'MCP_TOOL_CALL',
  payload: { kind: 'MCP_TOOL_CALL', mcpServerId: 'srv1', tool: 'buscar', arguments: {} },
});
const limite = row({
  id: 'lim1', teammateId: 'tm1', kind: 'LIMITE_ATINGIDO',
  payload: { kind: 'LIMITE_ATINGIDO', limit: 'DAILY_TURNS', teammateId: 'tm1' },
});

describe('item 31 — GET /proposals?status=PENDING: as duas origens juntas', () => {
  it('lista a do chat e a do teammate, com kind, teammate (nome exibido) e expiração', async () => {
    const { svc } = setup([doChat, doTeammate, row({ id: 'alheia', userId: 'u2' })]);
    const out = await svc.list(dono, 'PENDING');
    expect(out.map((p) => p.id).sort()).toEqual(['chat1', 'tm-p1']);
    const chat = out.find((p) => p.id === 'chat1')!;
    expect(chat).toMatchObject({ kind: 'TABLE_ROW', teammate: null, expiresAt: null });
    expect(chat.payload).toEqual({ kind: 'TABLE_ROW', action: 'CREATE', tableId: 'tb1', data: { nome: 'Ana' } });
    expect(out.find((p) => p.id === 'tm-p1')).toMatchObject({
      kind: 'TABLE_ROW', teammate: { id: 'tm1', name: 'Conciliador' }, expiresAt: DEPOIS.toISOString(),
    });
  });
});

describe('item 32 — confirmar despacha pelo kind; rejeitar; vencida → 409', () => {
  it('TABLE_ROW do chat (colunas antigas) → createTableData na tx; EXECUTED; efeito depois do commit', async () => {
    const { svc, store, tables, effects } = setup([doChat]);
    const out = await svc.confirm(dono, 'chat1');
    expect(out).toEqual({ id: 'chat1', status: 'EXECUTED', result: { id: 'linha1' } });
    expect(tables.createTableData).toHaveBeenCalledWith(dono, 'tb1', { data: { nome: 'Ana' } }, { tx: { tx: true } });
    expect(store.get('chat1')!.status).toBe('EXECUTED');
    expect(effects.afterDataWrite).toHaveBeenCalledWith('u1');
  });

  it('TABLE_ROW do teammate (payload UPDATE) → updateTableData do data.id, sem o id nos dados', async () => {
    const { svc, tables } = setup([doTeammate]);
    await svc.confirm(dono, 'tm-p1');
    expect(tables.updateTableData).toHaveBeenCalledWith(dono, 'linha2', { data: { nome: 'Bia' } }, { tx: { tx: true } });
  });

  it('serviço dono recusa → a proposta continua PENDING (rollback) e nada de efeito', async () => {
    const { svc, store, tables, effects } = setup([doChat]);
    tables.createTableData.mockRejectedValueOnce(new Error('campo obrigatório'));
    await expect(svc.confirm(dono, 'chat1')).rejects.toThrow('campo obrigatório');
    expect(store.get('chat1')!.status).toBe('PENDING');
    expect(effects.afterDataWrite).not.toHaveBeenCalled();
  });

  it.each([
    ['SETTLEMENT_MATCH', 'sm1', conciliacao],
    ['MCP_TOOL_CALL', 'mcp1', mcp],
    ['LIMITE_ATINGIDO', 'lim1', limite],
  ])('%s sem despachante registrado → 409 KIND_SEM_DESPACHANTE, segue PENDING (L-PR7-1/2)', async (_k, id, p) => {
    const { svc, store, tables } = setup([p]);
    await expect(svc.confirm(dono, id)).rejects.toMatchObject({ statusCode: 409, errorCode: KIND_SEM_DESPACHANTE });
    expect(store.get(id)!.status).toBe('PENDING');
    expect(tables.createTableData).not.toHaveBeenCalled();
  });

  it('rejeitar grava REJECTED e não executa nada', async () => {
    const { svc, store, tables } = setup([doTeammate]);
    expect(await svc.reject(dono, 'tm-p1')).toEqual({ id: 'tm-p1', status: 'REJECTED' });
    expect(store.get('tm-p1')!.status).toBe('REJECTED');
    expect(tables.updateTableData).not.toHaveBeenCalled();
  });

  it('proposta EXPIRED → 409 PROPOSTA_EXPIRADA', async () => {
    const { svc, tables } = setup([row({ id: 'velha', status: 'EXPIRED', expiresAt: AGORA })]);
    await expect(svc.confirm(dono, 'velha')).rejects.toMatchObject({ statusCode: 409, errorCode: PROPOSTA_EXPIRADA });
    expect(tables.createTableData).not.toHaveBeenCalled();
  });

  it('PENDING com expiresAt já passado, antes do scheduler → 409 e grava EXPIRED (L-PR7-4)', async () => {
    const depoisDoPrazo = () => new Date('2026-11-10T12:00:01.000Z');
    const { svc, store, tables } = setup([doTeammate], depoisDoPrazo);
    await expect(svc.confirm(dono, 'tm-p1')).rejects.toMatchObject({ statusCode: 409, errorCode: PROPOSTA_EXPIRADA });
    expect(store.get('tm-p1')!.status).toBe('EXPIRED');
    expect(tables.updateTableData).not.toHaveBeenCalled();
  });

  it('segundo clique depois do primeiro concluído → 409 PROPOSTA_NAO_PENDENTE, uma execução só (A2)', async () => {
    const { svc, tables } = setup([doChat]);
    await svc.confirm(dono, 'chat1');
    await expect(svc.confirm(dono, 'chat1')).rejects.toMatchObject({ statusCode: 409, errorCode: PROPOSTA_NAO_PENDENTE });
    await expect(svc.reject(dono, 'chat1')).rejects.toMatchObject({ statusCode: 409, errorCode: PROPOSTA_NAO_PENDENTE });
    expect(tables.createTableData).toHaveBeenCalledTimes(1);
  });

  it('proposta de outro dono → 404, sem tocar no status', async () => {
    const { svc, store } = setup([doChat]);
    await expect(svc.confirm(outro, 'chat1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(svc.reject(outro, 'chat1')).rejects.toMatchObject({ statusCode: 404 });
    expect(store.get('chat1')!.status).toBe('PENDING');
  });
});

describe('item 33 — ProposalExpiryScheduler marca EXPIRED o que passou de expiresAt (relógio fixo)', () => {
  it('só a PENDING vencida; a do chat (sem prazo) e a ainda no prazo ficam', async () => {
    const venceu = row({ id: 'venceu', teammateId: 'tm1', expiresAt: new Date('2026-11-07T11:59:59.000Z') });
    const { svc, store } = setup([doChat, doTeammate, venceu]);
    const log = { event: jest.fn() };
    const job = new ProposalExpiryScheduler({ expire: (now) => svc.expireDue(now), clock: () => AGORA, log: log as never, alert: jest.fn() });
    expect(await job.runOnce()).toEqual({ expired: 1 });
    expect(store.get('venceu')!.status).toBe('EXPIRED');
    expect(store.get('tm-p1')!.status).toBe('PENDING');
    expect(store.get('chat1')!.status).toBe('PENDING');
    expect(log.event).toHaveBeenCalledWith('info', 'job.completed', 'proposal_expiry', expect.objectContaining({ expired: 1 }));
  });

  it('falha → alerta job_failed e relança (OBS-R11)', async () => {
    const alert = jest.fn();
    const job = new ProposalExpiryScheduler({
      expire: async () => {
        throw new Error('db fora');
      },
      clock: () => AGORA,
      log: { event: jest.fn() } as never,
      alert,
    });
    await expect(job.runOnce()).rejects.toThrow('db fora');
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ source: 'proposal_expiry', event: 'job_failed', error: 'db fora' }));
  });
});
