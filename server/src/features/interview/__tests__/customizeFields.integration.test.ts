/**
 * BE-INCR-W6-CUSTOMIZE-FIELDS (nó W6) — item 1 (rota em 2 toques, 401) e o contrato HTTP dos itens 2–4 e 10 contra o
 * SQLite real: o estado (proposta pendente, histórico) atravessa a coluna `Json` da `InterviewSession` do W4.
 * O turno `message` (que chama o modelo) é coberto no teste unitário do serviço; aqui só o `decision`, determinístico.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { pushTestSchema, disconnectDb } from '@test/helpers/db';
import { makeApp } from '@test/helpers/app';
import { authHeader } from '@test/helpers/auth';
import { InterviewSessionRepository } from '@/features/interview/repositories/InterviewSessionRepository';
import type { ICustomizationState } from '@/features/interview/models/InterviewTypes';

process.env.OPENAI_API_KEY ??= 'ci-dummy-openai-key';

const DONO = { id: 'w6-dono', username: 'w6-dono' };
const OUTRO = { id: 'w6-outro', username: 'w6-outro' };
const URL = '/api/dashboard/ai/CustomizeFields';
const repo = new InterviewSessionRepository();
const HORA = 60 * 60 * 1000;

const estado = (): ICustomizationState => ({
  presetKey: 'beautySalon',
  presetName: 'Salão',
  customMessages: [],
  isCompleted: false,
  tables: [
    {
      name: 'Clientes',
      key: 'clientes',
      description: 'Cadastro de clientes',
      isSelected: true,
      isCore: false,
      conversationHistory: [],
      fields: [{ name: 'nome', label: 'Nome', type: 'string', required: true }],
      pendingProposal: {
        id: 'p-1',
        createdAt: '2026-10-16T12:00:00.000Z',
        changes: [
          {
            action: 'add',
            field: { name: 'alergias', label: 'Alergias', type: 'string', required: false },
            sensitiveCategory: 'health_or_other_unspecified',
            presetKey: null,
          },
        ],
      },
    },
  ],
});

const criarSessao = () =>
  repo.create({ userId: DONO.id, presetKey: 'beautySalon', state: estado(), expiresAt: new Date(Date.now() + HORA) });

describe('POST /api/dashboard/ai/CustomizeFields', () => {
  const app = makeApp();

  beforeAll(async () => {
    pushTestSchema();
    for (const u of [DONO, OUTRO]) {
      await prisma.user.create({ data: { id: u.id, username: u.username, email: `${u.id}@test.local`, password: 'x', role: 'USER' } });
    }
  }, 120000);

  afterEach(async () => {
    await prisma.interviewSession.deleteMany({ where: { userId: { in: [DONO.id, OUTRO.id] } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [DONO.id, OUTRO.id] } } });
    await disconnectDb();
  });

  it('item 1: sem token → 401', async () => {
    const res = await request(app).post(URL).send({ kind: 'message', sessionId: 's', tableKey: 'clientes', message: 'oi' });
    expect(res.status).toBe(401);
  });

  it('item 2: conversationHistory no corpo → 400', async () => {
    const s = await criarSessao();
    const res = await request(app)
      .post(URL)
      .set(authHeader(DONO))
      .send({ kind: 'message', sessionId: s.id, tableKey: 'clientes', message: 'oi', conversationHistory: [] });
    expect(res.status).toBe(400);
  });

  it('item 3: sessão de outro usuário → 404 INTERVIEW_SESSION_NOT_FOUND, e a de A fica intacta', async () => {
    const s = await criarSessao();
    const res = await request(app)
      .post(URL)
      .set(authHeader(OUTRO))
      .send({ kind: 'decision', sessionId: s.id, tableKey: 'clientes', proposalId: 'p-1', decision: 'apply', acknowledgeSensitive: true });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('INTERVIEW_SESSION_NOT_FOUND');
    expect(await repo.findActive(s.id, DONO.id, new Date())).toMatchObject({ version: 0, state: estado() });
  });

  it('item 4: tabela fora da sessão → 404 TABLE_NOT_IN_SESSION', async () => {
    const s = await criarSessao();
    const res = await request(app)
      .post(URL)
      .set(authHeader(DONO))
      .send({ kind: 'decision', sessionId: s.id, tableKey: 'nao_existe', proposalId: 'p-1', decision: 'discard' });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('TABLE_NOT_IN_SESSION');
  });

  it('item 10: sensível sem ack → 400; com ack aplica e grava; repetir → 409 PROPOSAL_STALE', async () => {
    const s = await criarSessao();
    const corpo = { kind: 'decision', sessionId: s.id, tableKey: 'clientes', proposalId: 'p-1', decision: 'apply' };

    const semAck = await request(app).post(URL).set(authHeader(DONO)).send(corpo);
    expect(semAck.status).toBe(400);
    expect(semAck.body.code).toBe('SENSITIVE_FIELD_NOT_ACKNOWLEDGED');

    const ok = await request(app).post(URL).set(authHeader(DONO)).send({ ...corpo, acknowledgeSensitive: true });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ sessionId: s.id, tableKey: 'clientes', proposal: null, discarded: [], applied: true });
    expect(ok.body.conversationHistory).toEqual([expect.objectContaining({ role: 'system', content: 'Proposta aplicada.' })]);

    const gravada = await repo.findActive(s.id, DONO.id, new Date());
    expect(gravada!.version).toBe(1);
    expect(gravada!.state.tables[0].fields!.map((f) => f.name)).toEqual(['nome', 'alergias']);
    expect(gravada!.state.tables[0].pendingProposal).toBeUndefined();

    const repetida = await request(app).post(URL).set(authHeader(DONO)).send({ ...corpo, acknowledgeSensitive: true });
    expect(repetida.status).toBe(409);
    expect(repetida.body.code).toBe('PROPOSAL_STALE');
  });
});
