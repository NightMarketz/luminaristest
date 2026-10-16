/**
 * BE-INCR-INTERVIEW-SESSION (nó W4) — itens 3, 4, 5, 8 e 12 do BRIEF (`docs/accounting/BE-INCR-INTERVIEW-SESSION-brief.md`).
 * A sessão sai do `Record` em memória para o repositório (falso aqui; o real no teste de integração): carregar → mutar →
 * salvar, TTL de 24 h deslizante (F-W4-3 a), 404 para sessão perdida (F-W4-2 b), 409 para turno concorrente (F-W4-4 a).
 */
import { INTERVIEW_SESSION_TTL_MS, StateManager } from '../StateManager';
import { CustomizationService } from '../CustomizationService';
import { AIInteractions } from '../AIInteractions';
import { TableExtractor } from '../TableExtractor';
import { InterviewService } from '../../InterviewService/InterviewService';
import { InterviewSessionConflictError, InterviewSessionNotFoundError } from '../../models/InterviewSession.model';
import { FakeInterviewSessionRepository } from './fakeInterviewSessionRepository';
import BeautySalonPreset from '../../../dynamicTables/presets/systems/BeautySalonPreset';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';

// Sem chave de OpenAI no projeto unit: o cliente nunca é chamado (a IA é stub abaixo).
jest.mock('../../../../lib/openai/OpenAIService', () => ({ OpenAIService: { getInstance: () => ({}) } }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

const USER = 'w4-user';
const T0 = new Date('2026-10-16T12:00:00.000Z');
const salao = () => new TableExtractor().extractTablesFromRealPreset(BeautySalonPreset);

/** Relógio controlável: `clock.at(ms)` move o "agora" a partir de T0. */
function setup() {
  let offset = 0;
  const repo = new FakeInterviewSessionRepository();
  const sm = new StateManager(repo, () => new Date(T0.getTime() + offset));
  return { repo, sm, at: (ms: number) => { offset = ms; } };
}

describe('item 3 — carregar → mutar → salvar', () => {
  it('removeTable persiste a lista sem a tabela; isCore continua bloqueando', async () => {
    const { sm } = setup();
    const s = await sm.createSessionState(USER, 'beautySalon', 'Salão', salao());

    expect(await sm.removeTable(s, 'goals')).toBe(true);
    expect(await sm.removeTable(s, 'sales')).toBe(false);

    const relida = await sm.loadSession(s.id, USER);
    expect(relida.state.tables.map((t) => t.key)).not.toContain('goals');
    expect(relida.state.tables.map((t) => t.key)).toContain('sales');
  });
});

describe('item 4 — TTL de 24 h deslizante', () => {
  it('create grava now+24h; saveState renova; leitura depois do prazo → 404', async () => {
    const { repo, sm, at } = setup();
    const s = await sm.createSessionState(USER, 'beautySalon', 'Salão', salao());
    expect(repo.rows.get(s.id)!.expiresAt.toISOString()).toBe(new Date(T0.getTime() + INTERVIEW_SESSION_TTL_MS).toISOString());

    const umaHora = 60 * 60 * 1000;
    at(umaHora);
    await sm.setCurrentAction(s, 'adding');
    const novoPrazo = T0.getTime() + umaHora + INTERVIEW_SESSION_TTL_MS;
    expect(repo.rows.get(s.id)!.expiresAt.getTime()).toBe(novoPrazo);

    at(novoPrazo - T0.getTime() - 1);
    await expect(sm.loadSession(s.id, USER)).resolves.toMatchObject({ id: s.id });
    at(novoPrazo - T0.getTime() + 1);
    await expect(sm.loadSession(s.id, USER)).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
  });
});

describe('item 5 — sessão perdida é 404 com code próprio', () => {
  it('de outro usuário, inexistente ou apagada → InterviewSessionNotFoundError (mesma resposta)', async () => {
    const { repo, sm } = setup();
    const s = await sm.createSessionState(USER, 'beautySalon', 'Salão', salao());

    await expect(sm.loadSession(s.id, 'outro-user')).rejects.toMatchObject({ statusCode: 404, errorCode: 'INTERVIEW_SESSION_NOT_FOUND' });
    await expect(sm.loadSession('00000000-0000-4000-8000-000000000000', USER)).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
    await repo.softDelete(s.id, USER);
    await expect(sm.loadSession(s.id, USER)).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
  });

  it('processCustomizationStep não devolve mais 200 "Vamos recomeçar" — relança o 404', async () => {
    const { sm } = setup();
    const svc = new CustomizationService(sm, {} as OpenAIService);

    await expect(
      svc.processCustomizationStep('00000000-0000-4000-8000-000000000000', USER, [{ role: 'user', content: 'oi' }]),
    ).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
  });

  it('o catch amplo do InterviewService relança (não vira 200 CANNOT_PROCEED)', async () => {
    const { sm } = setup();
    const interview = new InterviewService(new CustomizationService(sm, {} as OpenAIService), {} as OpenAIService);

    await expect(
      interview.processTurn('CUSTOMIZATION_IN_PROGRESS', [{ role: 'user', content: 'oi' }], USER, 'beautySalon', '00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
  });
});

describe('item 8 — fim da customização não apaga a sessão', () => {
  it("intenção 'done' marca isCompleted e a sessão segue ativa", async () => {
    const { sm } = setup();
    const svc = new CustomizationService(sm, {} as OpenAIService);
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    jest.spyOn(AIInteractions.prototype, 'analyzeUserIntent').mockResolvedValue({ action: 'done' });

    const r = await svc.processCustomizationStep(s.id, USER, [{ role: 'user', content: 'pode finalizar' }]);

    expect(r.nextStage).toBe('CUSTOMIZATION_COMPLETED');
    expect((await sm.loadSession(s.id, USER)).state).toMatchObject({ isCompleted: true, currentAction: null });
  });
});

describe('item 12 — turno concorrente (F-W4-4 a): update condicional → 409', () => {
  it('duas leituras na mesma versão: a 2ª gravação perde e o estado gravado é o da 1ª', async () => {
    const { sm } = setup();
    const s = await sm.createSessionState(USER, 'beautySalon', 'Salão', salao());
    const abaA = await sm.loadSession(s.id, USER);
    const abaB = await sm.loadSession(s.id, USER);

    await sm.removeTable(abaA, 'goals');
    await expect(sm.setCurrentAction(abaB, 'adding')).rejects.toMatchObject({ statusCode: 409, errorCode: 'INTERVIEW_SESSION_CONFLICT' });

    const gravada = await sm.loadSession(s.id, USER);
    expect(gravada.state.tables.map((t) => t.key)).not.toContain('goals');
    expect(gravada.state.currentAction).toBeUndefined();
  });

  it('a mesma aba grava várias vezes no turno sem conflito (a versão avança junto)', async () => {
    const { sm } = setup();
    const s = await sm.createSessionState(USER, 'beautySalon', 'Salão', salao());

    await sm.setCurrentAction(s, 'removing');
    await sm.removeTable(s, 'goals');
    await sm.setCurrentAction(s, null);

    expect(s.version).toBe(3);
  });

  it('outra aba grava durante a chamada à IA → o turno sai 409, não 200', async () => {
    const { sm } = setup();
    const svc = new CustomizationService(sm, {} as OpenAIService);
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    jest.spyOn(AIInteractions.prototype, 'analyzeUserIntent').mockImplementation(async () => {
      const outraAba = await sm.loadSession(s.id, USER);
      await sm.setCurrentAction(outraAba, 'removing');
      return { action: 'add' as const };
    });

    await expect(
      svc.processCustomizationStep(s.id, USER, [{ role: 'user', content: 'quero adicionar' }]),
    ).rejects.toBeInstanceOf(InterviewSessionConflictError);
    expect((await sm.loadSession(s.id, USER)).state.currentAction).toBe('removing');
  });
});
