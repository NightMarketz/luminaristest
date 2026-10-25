/**
 * W1 — BRIEF `docs/accounting/W1-WIZARD-CUSTOM-CREATE-brief.md` contra o SQLite real: a customização persistida da
 * Entrevista com IA vira `creation` e o `POST /dashboard/create` instala exatamente ela (itens 1–2, F-W1-4 a), e a
 * rota de módulos da sessão (F-W1-6 a + sincronização, dono 2026-10-24). Sem IA: a sessão é montada pelo serviço.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { InterviewSessionRepository } from '@/features/interview/repositories/InterviewSessionRepository';
import { StateManager } from '@/features/interview/CustomizationService/StateManager';
import { CustomizationService } from '@/features/interview/CustomizationService/CustomizationService';
import { toCustomCreation } from '@/features/interview/CustomizationService/sessionComposition';
import { presetService } from '@/features/dynamicTables/services/PresetService';
import type { OpenAIService } from '@/lib/openai/OpenAIService';

process.env.OPENAI_API_KEY ??= 'ci-dummy-openai-key';

const app = makeApp();
const sm = new StateManager(new InterviewSessionRepository());
const svc = new CustomizationService(sm, {} as OpenAIService);
let n = 0;
const novoUsuario = () => {
  n += 1;
  return prisma.user
    .create({ data: { name: `w1-${n}`, username: `w1-user-${n}`, email: `w1-${n}@test.local`, password: 'x', role: 'USER' } })
    .then((u) => ({ id: u.id, username: u.username, role: u.role }));
};
const criar = (who: { id: string; username: string; role?: string }, body: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who as never)).send(body);
const tabelasDe = async (userId: string) =>
  prisma.dynamicTable.findMany({ where: { userId }, select: { internalName: true, category: true, schema: true } });
const nome = { name: 'name', label: 'Nome', type: 'string', required: true };

describe('W1 — customização da entrevista chega ao /dashboard/create', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('itens 1–2 + F-W1-4: sessão (−goals, +campo em expenses, +tabela nova) → creation → 201 com exatamente isso', async () => {
    const u = await novoUsuario();
    const s = (await svc.createCustomizationSession('beautySalon', u.id, ['CRM-3']))!;
    expect(await sm.removeTable(s, 'goals')).toBe(true);
    expect(await sm.addTable(s, 'Fidelidade', 'Pontos de fidelidade')).toBe(true);
    const expenses = s.state.tables.find((t) => t.key === 'expenses')!;
    expenses.fields = [...expenses.fields!, { name: 'nota', label: 'Nota', type: 'string', required: false }];
    await sm.saveSession(s);

    const creation = toCustomCreation((await sm.loadSession(s.id, u.id)).state, presetService.getPresetByKey('beautySalon')!);
    expect(creation).toMatchObject({ removedTables: ['goals'], addedTables: [{ key: 'fidelidade', fields: [nome] }] });

    const r = await criar(u, { ...creation, unit: { name: 'Matriz' }, modules: s.state.modules });
    expect(r.status).toBe(201);

    const tabelas = await tabelasDe(u.id);
    const por = (k: string) => tabelas.find((t) => t.internalName === k);
    expect(por('goals')).toBeUndefined();
    expect(por('crmOpportunities')).toBeDefined();
    expect(por('fidelidade')).toMatchObject({ category: 'other' });
    expect(JSON.stringify(por('fidelidade')?.schema)).toContain('"name":"name"');
    expect(JSON.stringify(por('expenses')?.schema)).toContain('"name":"nota"');
  });

  it('F-W1-4: addedTables com chave que já existe → 400 ADDED_TABLE_EXISTS, nada instalado', async () => {
    const u = await novoUsuario();
    const r = await criar(u, {
      mode: 'custom', presetKey: 'beautySalon', unit: { name: 'Matriz' },
      addedTables: [{ key: 'goals', name: 'Metas 2', fields: [nome] }],
    });
    expect({ status: r.status, details: r.body.details }).toMatchObject({ status: 400, details: { reason: 'ADDED_TABLE_EXISTS', table: 'goals' } });
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  it('F-W1-4: addedTables com campo inválido → 400 ADDED_TABLE_INVALID; sem campo → 400 do DTO', async () => {
    const u = await novoUsuario();
    const invalido = await criar(u, {
      mode: 'custom', presetKey: 'beautySalon', unit: { name: 'Matriz' },
      addedTables: [{ key: 'fidelidade', name: 'Fidelidade', fields: [{ name: 'id', label: 'Id', type: 'string', required: true }] }],
    });
    expect({ status: invalido.status, reason: invalido.body.details?.reason }).toEqual({ status: 400, reason: 'ADDED_TABLE_INVALID' });

    const vazio = await criar(u, {
      mode: 'custom', presetKey: 'beautySalon', unit: { name: 'Matriz' },
      addedTables: [{ key: 'fidelidade', name: 'Fidelidade', fields: [] }],
    });
    expect(vazio.status).toBe(400);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);
  });

  describe('POST /api/dashboard/ai/InterviewModules', () => {
    const URL = '/api/dashboard/ai/InterviewModules';

    it('200: regrava os módulos e devolve o estado com as tabelas do módulo novo', async () => {
      const u = await novoUsuario();
      const s = (await svc.createCustomizationSession('beautySalon', u.id))!;
      const r = await request(app).post(URL).set(authHeader(u as never)).send({ sessionId: s.id, modules: ['CRM-0', 'CRM-1', 'CRM-3'] });
      expect(r.status).toBe(200);
      expect(r.body.sessionId).toBe(s.id);
      expect(r.body.customizationState.modules).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
      expect(r.body.customizationState.tables.map((t: { key: string }) => t.key)).toContain('crmOpportunities');
      expect((await sm.loadSession(s.id, u.id)).state.modules).toEqual(['CRM-0', 'CRM-1', 'CRM-3']);
    });

    it('sessão de outro usuário → 404 INTERVIEW_SESSION_NOT_FOUND; chave extra → 400; módulo fora do registro → 400', async () => {
      const dono = await novoUsuario();
      const outro = await novoUsuario();
      const s = (await svc.createCustomizationSession('beautySalon', dono.id))!;

      const alheia = await request(app).post(URL).set(authHeader(outro as never)).send({ sessionId: s.id, modules: ['CRM-3'] });
      expect({ status: alheia.status, code: alheia.body.code }).toEqual({ status: 404, code: 'INTERVIEW_SESSION_NOT_FOUND' });

      const extra = await request(app).post(URL).set(authHeader(dono as never)).send({ sessionId: s.id, modules: [], version: 1 });
      expect(extra.status).toBe(400);

      const fora = await request(app).post(URL).set(authHeader(dono as never)).send({ sessionId: s.id, modules: ['CRM-9'] });
      expect(fora.status).toBe(400);
      expect((await sm.loadSession(s.id, dono.id)).state.modules).toEqual(['CRM-0', 'CRM-1']);
    });
  });
});
