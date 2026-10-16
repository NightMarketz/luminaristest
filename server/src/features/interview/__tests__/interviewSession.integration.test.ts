/**
 * BE-INCR-INTERVIEW-SESSION (nó W4) — itens 1, 2, 5 e 7 do BRIEF contra o SQLite real.
 * Repositório: dono, soft-delete e TTL num só `where`; update condicional por `version` (F-W4-4 a).
 * HTTP: sessão de outro usuário ou expirada → 404 `INTERVIEW_SESSION_NOT_FOUND`; chave desconhecida → 400;
 * turno sem sessão → 200 inalterado.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { pushTestSchema, disconnectDb } from '@test/helpers/db';
import { makeApp } from '@test/helpers/app';
import { authHeader } from '@test/helpers/auth';
import { InterviewSessionRepository } from '@/features/interview/repositories/InterviewSessionRepository';
import type { ICustomizationState } from '@/features/interview/models/InterviewTypes';

process.env.OPENAI_API_KEY ??= 'ci-dummy-openai-key';

const DONO = { id: 'w4-dono', username: 'w4-dono' };
const OUTRO = { id: 'w4-outro', username: 'w4-outro' };
const URL = '/api/dashboard/ai/ChatInterview';
const repo = new InterviewSessionRepository();
const HORA = 60 * 60 * 1000;

const estado = (presetName = 'Salão'): ICustomizationState => ({
  presetKey: 'beautySalon',
  presetName,
  tables: [],
  customMessages: [],
  isCompleted: false,
});

describe('InterviewSession — persistência, dono e TTL', () => {
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

  describe('repositório (itens 1–2)', () => {
    it('cria e relê a linha com o estado Json e versão 0', async () => {
      const now = new Date();
      const criada = await repo.create({ userId: DONO.id, presetKey: 'beautySalon', state: estado(), expiresAt: new Date(now.getTime() + HORA) });

      const lida = await repo.findActive(criada.id, DONO.id, now);
      expect(lida).toEqual({ id: criada.id, userId: DONO.id, presetKey: 'beautySalon', version: 0, state: estado() });
    });

    it('de outro usuário, expirada ou apagada → null', async () => {
      const now = new Date();
      const s = await repo.create({ userId: DONO.id, presetKey: 'beautySalon', state: estado(), expiresAt: new Date(now.getTime() + HORA) });

      expect(await repo.findActive(s.id, OUTRO.id, now)).toBeNull();
      expect(await repo.findActive(s.id, DONO.id, new Date(now.getTime() + HORA))).toBeNull();
      await repo.softDelete(s.id, DONO.id);
      expect(await repo.findActive(s.id, DONO.id, now)).toBeNull();
      expect(await prisma.interviewSession.count({ where: { id: s.id } })).toBe(1); // soft-delete, a linha fica
    });

    it('saveState só grava na versão lida; versão velha → false e nada muda', async () => {
      const now = new Date();
      const s = await repo.create({ userId: DONO.id, presetKey: 'beautySalon', state: estado(), expiresAt: new Date(now.getTime() + HORA) });
      const prazo = new Date(now.getTime() + 2 * HORA);

      expect(await repo.saveState({ id: s.id, userId: DONO.id, expectedVersion: 0, state: estado('A'), expiresAt: prazo, now })).toBe(true);
      expect(await repo.saveState({ id: s.id, userId: DONO.id, expectedVersion: 0, state: estado('B'), expiresAt: prazo, now })).toBe(false);
      expect(await repo.saveState({ id: s.id, userId: OUTRO.id, expectedVersion: 1, state: estado('C'), expiresAt: prazo, now })).toBe(false);

      const lida = await repo.findActive(s.id, DONO.id, now);
      expect(lida).toMatchObject({ version: 1, state: { presetName: 'A' } });
      const row = await prisma.interviewSession.findUniqueOrThrow({ where: { id: s.id } });
      expect(row.expiresAt.getTime()).toBe(prazo.getTime());
    });
  });

  describe('HTTP (itens 5 e 7)', () => {
    const turnoDeCustomizacao = (sessionId: string) => ({
      stage: 'CUSTOMIZATION_IN_PROGRESS',
      presetKey: 'beautySalon',
      sessionId,
      messages: [{ sender: 'user', text: 'quero adicionar uma tabela' }],
    });

    it('sessionId de outro usuário → 404 INTERVIEW_SESSION_NOT_FOUND', async () => {
      const s = await repo.create({ userId: DONO.id, presetKey: 'beautySalon', state: estado(), expiresAt: new Date(Date.now() + HORA) });

      const res = await request(app).post(URL).set(authHeader(OUTRO)).send(turnoDeCustomizacao(s.id));

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ code: 'INTERVIEW_SESSION_NOT_FOUND' });
    });

    it('sessão expirada → 404 INTERVIEW_SESSION_NOT_FOUND', async () => {
      const s = await repo.create({ userId: DONO.id, presetKey: 'beautySalon', state: estado(), expiresAt: new Date(Date.now() - 1000) });

      const res = await request(app).post(URL).set(authHeader(DONO)).send(turnoDeCustomizacao(s.id));

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ code: 'INTERVIEW_SESSION_NOT_FOUND' });
    });

    it('chave desconhecida no corpo → 400', async () => {
      const res = await request(app).post(URL).set(authHeader(DONO)).send({ stage: 'GREETING', userId: OUTRO.id });

      expect(res.status).toBe(400);
    });

    it('turno sem sessão (GREETING) → 200 inalterado', async () => {
      const res = await request(app).post(URL).set(authHeader(DONO)).send({ stage: 'GREETING', messages: [] });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ nextStage: 'DISCOVERING_BUSINESS' });
    });
  });
});
