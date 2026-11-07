/**
 * BE-INCR-TEAMMATES PR-7, itens 31–33 — /api/proposals pela pilha real (makeApp + authHeader + SQLite; régua A6, com
 * 2ª leitura). Cenário "caixa-dono": uma tabela "Clientes", uma proposta do chat (colunas antigas, sem prazo) e uma do
 * teammate "Conciliador" (payload + expiresAt de 72 h); outro dono com proposta própria. Data de referência literal.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, seedUser, seedDynamicTable, authHeader } from '@test/helpers';
import { ActionProposalRepository } from '@/features/chat/repositories/ActionProposalRepository';

const app = makeApp();
const SCHEMA = { fields: [{ name: 'title', label: 'Title', type: 'string', required: true }] };
const CRIADA = new Date('2026-11-07T12:00:00.000Z');
const PRAZO_LONGE = new Date('2099-01-01T00:00:00.000Z');

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnectDb();
});

async function cenario() {
  const dono = await seedUser({ username: 'caixa-dono' });
  const outro = await seedUser({ username: 'caixa-outro' });
  const tabela = await seedDynamicTable({ userId: dono.id, name: 'Clientes', schema: SCHEMA });
  const tm = await prisma.teammate.create({
    data: { userId: dono.id, name: 'Conciliador', role: 'Conciliação', playbook: 'p', allowedTools: ['request_record_creation'], provider: 'anthropic', model: 'claude-x' },
  });
  const base = { tableId: tabela.id, tableName: 'Clientes', tableLabel: 'Clientes', action: 'CREATE', createdAt: CRIADA };
  const doChat = await prisma.actionProposal.create({ data: { ...base, userId: dono.id, data: { title: 'do chat' } } });
  const doTeammate = await prisma.actionProposal.create({
    data: {
      ...base, userId: dono.id, data: { title: 'do teammate' }, kind: 'TABLE_ROW', teammateId: tm.id, expiresAt: PRAZO_LONGE,
      payload: { kind: 'TABLE_ROW', action: 'CREATE', tableId: tabela.id, data: { title: 'do teammate' } },
    },
  });
  const alheia = await prisma.actionProposal.create({ data: { ...base, userId: outro.id, data: { title: 'alheia' } } });
  return { dono, outro, tabela, tm, doChat, doTeammate, alheia };
}

describe('/api/proposals (itens 31–32)', () => {
  it('GET lista as duas origens do dono, com kind, teammate e expiração; a do outro dono não aparece', async () => {
    const { dono, tm, doChat, doTeammate } = await cenario();
    const res = await request(app).get('/api/proposals?status=PENDING').set(authHeader({ id: dono.id, username: dono.username }));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((p: { id: string }) => p.id).sort();
    expect(ids).toEqual([doChat.id, doTeammate.id].sort());
    const tmItem = res.body.data.find((p: { id: string }) => p.id === doTeammate.id);
    expect(tmItem).toMatchObject({ kind: 'TABLE_ROW', status: 'PENDING', teammate: { id: tm.id, name: 'Conciliador' }, expiresAt: PRAZO_LONGE.toISOString() });
    expect(res.body.data.find((p: { id: string }) => p.id === doChat.id)).toMatchObject({ teammate: null, expiresAt: null });
  });

  it('GET com status inválido → 400', async () => {
    const { dono } = await cenario();
    const res = await request(app).get('/api/proposals?status=QUALQUER').set(authHeader({ id: dono.id, username: dono.username }));
    expect(res.status).toBe(400);
  });

  it('confirmar a do teammate cria a linha; a 2ª leitura mostra EXECUTED e a linha existe; 2º clique → 409', async () => {
    const { dono, tabela, doTeammate } = await cenario();
    const ok = await request(app).post(`/api/proposals/${doTeammate.id}/confirm`).set(authHeader({ id: dono.id, username: dono.username }));
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('EXECUTED');

    const executed = await request(app).get('/api/proposals?status=EXECUTED').set(authHeader({ id: dono.id, username: dono.username }));
    expect(executed.body.data.map((p: { id: string }) => p.id)).toEqual([doTeammate.id]);
    const linhas = await prisma.dynamicTableData.findMany({ where: { dynamicTableId: tabela.id } });
    expect(linhas.map((l) => (l.data as { title: string }).title)).toEqual(['do teammate']);

    const de_novo = await request(app).post(`/api/proposals/${doTeammate.id}/confirm`).set(authHeader({ id: dono.id, username: dono.username }));
    expect(de_novo.status).toBe(409);
    expect(de_novo.body.code).toBe('PROPOSTA_NAO_PENDENTE');
    expect(await prisma.dynamicTableData.count({ where: { dynamicTableId: tabela.id } })).toBe(1);
  });

  it('rejeitar a do chat grava REJECTED e não cria linha', async () => {
    const { dono, tabela, doChat } = await cenario();
    const res = await request(app).post(`/api/proposals/${doChat.id}/reject`).set(authHeader({ id: dono.id, username: dono.username }));
    expect(res.status).toBe(200);
    const rejected = await request(app).get('/api/proposals?status=REJECTED').set(authHeader({ id: dono.id, username: dono.username }));
    expect(rejected.body.data.map((p: { id: string }) => p.id)).toEqual([doChat.id]);
    expect(await prisma.dynamicTableData.count({ where: { dynamicTableId: tabela.id } })).toBe(0);
  });

  it('proposta de outro dono → 404 em confirmar e rejeitar; segue PENDING', async () => {
    const { dono, alheia } = await cenario();
    expect((await request(app).post(`/api/proposals/${alheia.id}/confirm`).set(authHeader({ id: dono.id, username: dono.username }))).status).toBe(404);
    expect((await request(app).post(`/api/proposals/${alheia.id}/reject`).set(authHeader({ id: dono.id, username: dono.username }))).status).toBe(404);
    expect((await prisma.actionProposal.findUniqueOrThrow({ where: { id: alheia.id } })).status).toBe('PENDING');
  });

  it('vencida (expiresAt no passado, ainda PENDING) → 409 PROPOSTA_EXPIRADA e a 2ª leitura mostra EXPIRED', async () => {
    const { dono, doTeammate } = await cenario();
    await prisma.actionProposal.update({ where: { id: doTeammate.id }, data: { expiresAt: new Date('2026-11-07T12:00:00.000Z') } });
    const res = await request(app).post(`/api/proposals/${doTeammate.id}/confirm`).set(authHeader({ id: dono.id, username: dono.username }));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PROPOSTA_EXPIRADA');
    const expired = await request(app).get('/api/proposals?status=EXPIRED').set(authHeader({ id: dono.id, username: dono.username }));
    expect(expired.body.data.map((p: { id: string }) => p.id)).toEqual([doTeammate.id]);
  });
});

describe('repositório real (itens 33 e L-PR7-3)', () => {
  it('expireDue marca só a PENDING vencida; a faxina do chat apaga só a velha sem expiresAt', async () => {
    const { doChat, doTeammate } = await cenario();
    const repo = new ActionProposalRepository();
    // As duas foram criadas em 07/11/2026; a do teammate vence em 2099.
    expect(await repo.expireDue(new Date('2026-11-08T00:00:00.000Z'))).toBe(0);
    await prisma.actionProposal.update({ where: { id: doTeammate.id }, data: { createdAt: new Date('2020-01-01T00:00:00.000Z') } });
    await prisma.actionProposal.update({ where: { id: doChat.id }, data: { createdAt: new Date('2020-01-01T00:00:00.000Z') } });
    await repo.deleteOldProposals(24);
    expect(await prisma.actionProposal.findUnique({ where: { id: doChat.id } })).toBeNull();
    expect(await prisma.actionProposal.findUnique({ where: { id: doTeammate.id } })).not.toBeNull();
    expect(await repo.expireDue(new Date('2099-01-02T00:00:00.000Z'))).toBe(1);
    expect((await prisma.actionProposal.findUniqueOrThrow({ where: { id: doTeammate.id } })).status).toBe('EXPIRED');
  });
});
