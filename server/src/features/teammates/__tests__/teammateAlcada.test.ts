/**
 * BE-INCR-TEAMMATES PR-2 — itens 11 (alçada só aperta), 12 (allowedTools do registro ou MCP do tenant), 13 (allowlist
 * da trilha) e a L-PR1-3 (par de reserva no DTO). Régua A3: uma falta por caso, mensagem com o nome do teammate.
 */
import { TeammateCreateSchema, TeammateUpdateSchema } from '../dtos/TeammatesDto';
import { TeammateService } from '../services/TeammateService';
import { TeammatePolicy } from '../policies/TeammatePolicy';
import type { ITeammateRepository } from '../repositories/ITeammateRepository';
import type { IMcpServerRepository } from '../repositories/IMcpServerRepository';
import type { ITeammate } from '../models/Teammate.model';
import { PAYLOAD_ALLOWLIST } from '../../accounting/audit/auditCanonical';
import { MASKABLE_FREE_TEXT_KEYS } from '../../accounting/audit/auditFreeTextMask';
import type { AuditService } from '../../accounting/services/AuditService';
import type { IUser } from '../../users/models/User.model';

const dono = { id: 'u1', role: 'USER' } as unknown as IUser;
const base = {
  name: 'Conciliador',
  role: 'Conciliação bancária',
  playbook: 'Concilie.',
  allowedTools: ['query_table_data', 'request_record_creation'],
  provider: 'anthropic' as const,
  model: 'claude-x',
};

function fakeRepo(): ITeammateRepository {
  const rows = new Map<string, ITeammate>();
  const at = new Date('2026-11-07T12:00:00.000Z');
  return {
    create: async (userId, data) => {
      const row: ITeammate = { id: `t${rows.size + 1}`, userId, status: 'ACTIVE', createdAt: at, updatedAt: at, ...data };
      rows.set(row.id, row);
      return row;
    },
    listLive: async (userId) => [...rows.values()].filter((r) => r.userId === userId),
    findLiveById: async (userId, id) => (rows.get(id)?.userId === userId ? rows.get(id)! : null),
    update: async (_u, id, data) => {
      const row = { ...rows.get(id)!, ...data };
      rows.set(id, row);
      return row;
    },
    softDelete: async (_u, id) => void rows.delete(id),
    runTransaction: async (fn) => fn({} as never),
  };
}

const mcp: IMcpServerRepository = { findLiveIds: async (userId, ids) => new Set(userId === 'u1' ? ids.filter((i) => i === 'srv-meu') : []) };

function make() {
  const audit = { append: jest.fn(async () => undefined) };
  const svc = new TeammateService(fakeRepo(), mcp, new TeammatePolicy(), audit as unknown as AuditService);
  return { svc, audit };
}

describe('L-PR1-3 — fallbackProvider e fallbackModel vêm em par', () => {
  it.each([
    ['nenhum', {}, true],
    ['os dois', { fallbackProvider: 'openai', fallbackModel: 'gpt-x' }, true],
    ['só o provedor', { fallbackProvider: 'openai' }, false],
    ['só o modelo', { fallbackModel: 'gpt-x' }, false],
  ])('create com %s', (_n, extra, ok) => {
    expect(TeammateCreateSchema.safeParse({ ...base, ...extra }).success).toBe(ok);
  });
  it('update com só um deles → recusa; com os dois → aceita', () => {
    expect(TeammateUpdateSchema.safeParse({ fallbackProvider: 'openai' }).success).toBe(false);
    expect(TeammateUpdateSchema.safeParse({ fallbackProvider: 'openai', fallbackModel: 'g' }).success).toBe(true);
    expect(TeammateUpdateSchema.safeParse({ userId: 'x' }).success).toBe(false);
  });
});

describe('item 12 — allowedTools', () => {
  it('nome desconhecido → 400 FERRAMENTA_INVALIDA com o nome do teammate', async () => {
    await expect(make().svc.create(dono, { ...base, allowedTools: ['apagar_tudo'] })).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'FERRAMENTA_INVALIDA',
      message: expect.stringContaining('"Conciliador"'),
    });
  });
  it('ferramenta PROIBIDA nunca entra (registro com uma PROIBIDA de prova)', async () => {
    const { TOOL_CLASS } = await import('../models/ActionClass.model');
    (TOOL_CLASS as Record<string, string>).ferramenta_proibida_de_prova = 'PROIBIDA';
    try {
      await expect(make().svc.create(dono, { ...base, allowedTools: ['ferramenta_proibida_de_prova'] })).rejects.toMatchObject({
        errorCode: 'FERRAMENTA_INVALIDA',
        message: expect.stringContaining('proibida'),
      });
    } finally {
      delete (TOOL_CLASS as Record<string, string>).ferramenta_proibida_de_prova;
    }
  });
  it('servidor MCP de outro tenant (ou inexistente) → 400; do próprio tenant → aceita', async () => {
    const { svc } = make();
    await expect(svc.create(dono, { ...base, allowedTools: ['mcp:srv-alheio:buscar'] })).rejects.toMatchObject({ errorCode: 'FERRAMENTA_INVALIDA' });
    await expect(svc.create(dono, { ...base, allowedTools: ['mcp:srv-meu:buscar'] })).resolves.toMatchObject({ allowedTools: ['mcp:srv-meu:buscar'] });
  });
});

describe('item 11 — alçada só aperta', () => {
  // Categorias que existem hoje no registro: leitura (LIVRE), escrita em DynamicTable (PROPOSTA) e MCP (PROPOSTA por
  // regra). Dinheiro, fiscal, razão e envio externo não têm ferramenta registrada ainda (lacuna L-PR2-3).
  it('marcar LIVRE (escrita em DynamicTable, MCP) é recusado no DTO — o controller responde ALCADA_INVALIDA', () => {
    for (const tool of ['request_record_creation', 'mcp:srv-meu:buscar']) {
      const r = TeammateCreateSchema.safeParse({ ...base, allowedTools: [tool], toolOverrides: { [tool]: 'LIVRE' } });
      expect(r.success).toBe(false);
      expect(r.error!.issues[0].path[0]).toBe('toolOverrides');
    }
  });
  it('apertar leitura LIVRE → PROPOSTA é aceito (A2: o teammate sem a alçada não ganha nada)', async () => {
    const t = await make().svc.create(dono, { ...base, toolOverrides: { query_table_data: 'PROPOSTA' } });
    expect(t.toolOverrides).toEqual({ query_table_data: 'PROPOSTA' });
  });
  it('override de ferramenta fora de allowedTools → 400 ALCADA_INVALIDA', async () => {
    await expect(make().svc.create(dono, { ...base, toolOverrides: { request_record_update: 'PROPOSTA' } })).rejects.toMatchObject({
      errorCode: 'ALCADA_INVALIDA',
    });
  });
  it('PATCH que tira de allowedTools a ferramenta com override (sem mexer no override) → 400 e nada gravado', async () => {
    const { svc, audit } = make();
    const t = await svc.create(dono, { ...base, toolOverrides: { query_table_data: 'PROPOSTA' } });
    await expect(svc.update(dono, t.id, { allowedTools: ['request_record_creation'] })).rejects.toMatchObject({
      statusCode: 400,
      errorCode: 'ALCADA_INVALIDA',
      message: expect.stringContaining('"query_table_data"'),
    });
    expect(audit.append).not.toHaveBeenCalled();
    expect((await svc.get(dono, t.id)).allowedTools).toEqual(base.allowedTools);
  });
  it('PATCH lê o estado atual e valida a alçada dentro da transação (gate na tx, mesmo tx no repo)', async () => {
    const TX = { marca: 'tx' } as never;
    const repo = fakeRepo();
    const vistos: unknown[] = [];
    let dentro = false;
    repo.runTransaction = async (fn) => {
      dentro = true;
      try {
        return await fn(TX);
      } finally {
        dentro = false;
      }
    };
    const findLiveById = repo.findLiveById;
    repo.findLiveById = async (u, id, tx) => {
      vistos.push(['teammate', dentro, tx]);
      return findLiveById(u, id, tx);
    };
    const mcpTx: IMcpServerRepository = {
      findLiveIds: async (u, ids, tx) => {
        vistos.push(['mcp', dentro, tx]);
        return mcp.findLiveIds(u, ids);
      },
    };
    const svc = new TeammateService(repo, mcpTx, new TeammatePolicy(), { append: jest.fn(async () => undefined) } as unknown as AuditService);
    const t = await svc.create(dono, base);
    vistos.length = 0;
    await svc.update(dono, t.id, { allowedTools: ['query_table_data', 'mcp:srv-meu:buscar'] });
    expect(vistos).toEqual([
      ['teammate', true, TX],
      ['mcp', true, TX],
    ]);
  });
});

describe('item 13 — trilha', () => {
  it('mudar a alçada grava teammate.alcada_changed; mudar só o nome não grava', async () => {
    const { svc, audit } = make();
    const t = await svc.create(dono, base);
    await svc.update(dono, t.id, { name: 'Outro' });
    expect(audit.append).not.toHaveBeenCalled();
    await svc.update(dono, t.id, { toolOverrides: { query_table_data: 'PROPOSTA' } });
    expect(audit.append).toHaveBeenCalledTimes(1);
    expect(audit.append.mock.calls[0]).toEqual([
      expect.anything(),
      expect.objectContaining({ ownerUserId: 'u1', unitId: 'teammates' }),
      expect.objectContaining({ eventType: 'teammate.alcada_changed', targetId: t.id }),
    ]);
  });

  it('allowlist: os eventos existem e não carregam segredo, playbook, URL nem token', () => {
    for (const ev of ['llm_credential.created', 'llm_credential.deleted', 'teammate.alcada_changed']) {
      expect(PAYLOAD_ALLOWLIST[ev]).toBeDefined();
      for (const k of PAYLOAD_ALLOWLIST[ev]) expect(k).not.toMatch(/^(apiKey|key|secret|token|last4|playbook|url)$/i);
    }
  });

  it('MASKABLE_FREE_TEXT_KEYS: nenhum evento novo tem texto livre a mascarar', () => {
    for (const ev of ['llm_credential.created', 'llm_credential.deleted', 'teammate.alcada_changed']) {
      expect((MASKABLE_FREE_TEXT_KEYS as Record<string, unknown>)[ev]).toBeUndefined();
    }
  });
});
