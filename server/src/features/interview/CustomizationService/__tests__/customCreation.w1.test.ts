/**
 * W1 — BRIEF `docs/accounting/W1-WIZARD-CUSTOM-CREATE-brief.md`, itens 1–3 (BE), com F-W1-1/2/4/5/6 → (a) e as
 * respostas do dono ao questionário de 2026-10-24 (módulos com sincronização; ausente conta como removida; tabela nova
 * em `other`; tabela nova nasce com "Nome"). Sessão sobre o repositório falso; a IA é stub (`AIInteractions`).
 */
import { CustomizationService } from '../CustomizationService';
import { StateManager, addedTableKey } from '../StateManager';
import { AIInteractions } from '../AIInteractions';
import { composeSessionTables, toCustomCreation } from '../sessionComposition';
import { FakeInterviewSessionRepository } from './fakeInterviewSessionRepository';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import type { ICustomizationState } from '../../models/InterviewTypes';
import BeautySalonPreset from '../../../dynamicTables/presets/systems/BeautySalonPreset';
import { CustomCreationDraftSchema } from '../../dtos/CustomCreationDraft.dto';
import { CustomCreationSchema } from '../../../dynamicTables/dtos/CreateDashboard.dto';
import { applyModuleRemovals, resolveModuleSelection } from '../../../dynamicTables/presets/modules/moduleSelection';
import { CoreSystemPreset } from '../../../dynamicTables/presets';
import { InterviewSessionNotFoundError } from '../../models/InterviewSession.model';
import type { ModuleKey } from '../../../dynamicTables/presets/modules/registry';

jest.mock('../../../../lib/openai/OpenAIService', () => ({ OpenAIService: { getInstance: () => ({}) } }));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

const USER = 'w1-user';
// BE-INCR-MODULOS-BASE-SUBMODULOS item 11: o salão declara também PESSOAS e VENDAS.
const PV: ModuleKey[] = ['PES-0', 'PES-FORN', 'VEN-0', 'VEN-SERV', 'VEN-PROD', 'VEN-PAC', 'VEN-COM'];
const SALAO_MODULOS: ModuleKey[] = ['CRM-0', 'CRM-1', ...PV];

const setup = () => {
  const sm = new StateManager(new FakeInterviewSessionRepository());
  const svc = new CustomizationService(sm, {} as OpenAIService);
  return { sm, svc };
};

/** Um turno da conversa com a intenção e a resposta da IA travadas. */
const turno = async (svc: CustomizationService, sessionId: string, intent: string, iaDevolve?: string) => {
  jest.spyOn(AIInteractions.prototype, 'analyzeUserIntent').mockResolvedValueOnce({ action: intent } as never);
  if (iaDevolve !== undefined) jest.spyOn(AIInteractions.prototype, 'getAiResponse').mockResolvedValueOnce(iaDevolve);
  jest.spyOn(AIInteractions.prototype, 'generateRemovingGuidance').mockResolvedValue('qual?');
  jest.spyOn(AIInteractions.prototype, 'generateAddingGuidance').mockResolvedValue('qual?');
  return svc.processCustomizationStep(sessionId, USER, [{ role: 'user', content: intent }]);
};

const remover = async (svc: CustomizationService, sessionId: string, tableKey: string) => {
  await turno(svc, sessionId, 'remove');
  jest.spyOn(AIInteractions.prototype, 'getAiResponse').mockResolvedValueOnce(tableKey);
  return svc.processCustomizationStep(sessionId, USER, [{ role: 'user', content: tableKey }]);
};

describe('F-W1-6 (a) — a sessão nasce da suíte ∪ módulos escolhidos', () => {
  it('sem modules: suíte + módulos padrão (salão: CRM-0, CRM-1)', async () => {
    const { svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    expect(s.state.modules).toEqual(SALAO_MODULOS);
    const keys = s.state.tables.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['leads', 'leadStages', 'leadProposals', 'goals']));
    expect(keys).not.toContain('crmOpportunities');
    expect(keys.some((k) => k in CoreSystemPreset.tables)).toBe(false);
  });

  it('modules do front entram fechados pelas dependências; tabela de módulo fixo fica travada', async () => {
    const { svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER, ['CRM-3']))!;
    expect(s.state.modules).toEqual(['CRM-0', 'CRM-1', 'CRM-3', ...PV]);
    expect(s.state.tables.find((t) => t.key === 'crmOpportunities')).toMatchObject({ isSelected: true, isCore: false });
    expect(s.state.tables.find((t) => t.key === 'leads')?.lock).toEqual({ reason: 'FIXED_MODULE', by: ['CRM-0'] });
  });
});

describe('item 2 — toCustomCreation (pura)', () => {
  const base = (): ICustomizationState => {
    const tables = Object.entries(composeSessionTables(BeautySalonPreset, SALAO_MODULOS)).map(([key, def]) => ({
      key,
      name: def.name,
      description: '',
      isSelected: true,
      isCore: false,
      lock: null,
      fields: def.schema.fields.map((f) => ({ name: f.name, label: f.label, type: f.type, required: !!f.required })),
      conversationHistory: [],
    }));
    return { presetKey: 'beautySalon', presetName: 'Salão', tables, customMessages: [], isCompleted: false, modules: SALAO_MODULOS };
  };

  it('sessão intocada → nada removido nem adicionado; o draft é um create custom válido', () => {
    const draft = toCustomCreation(base(), BeautySalonPreset);
    expect(draft).toEqual({ mode: 'custom', presetKey: 'beautySalon', removedTables: [], addedFields: {}, addedTables: [] });
    expect(CustomCreationDraftSchema.safeParse(draft).success).toBe(true);
    expect(CustomCreationSchema.safeParse({ ...draft, unit: { name: 'Matriz' }, modules: SALAO_MODULOS }).success).toBe(true);
  });

  it('removida: ausente da sessão OU isSelected:false; Core desmarcado não entra', () => {
    const st = base();
    st.tables = st.tables.filter((t) => t.key !== 'goals');
    st.tables.find((t) => t.key === 'expenses')!.isSelected = false;
    st.tables.push({ key: 'units', name: 'Unidades', description: '', isSelected: false, isCore: true, lock: null, fields: [], conversationHistory: [] });
    expect(toCustomCreation(st, BeautySalonPreset).removedTables.sort()).toEqual(['expenses', 'goals']);
  });

  it('addedFields: só o campo que a definição não declara (campo do preset não entra)', () => {
    const st = base();
    const goals = st.tables.find((t) => t.key === 'goals')!;
    const novo = { name: 'observacao', label: 'Observação', type: 'string' as const, required: false };
    goals.fields = [...goals.fields!, novo];
    expect(toCustomCreation(st, BeautySalonPreset).addedFields).toEqual({ goals: [novo] });
  });

  it('F-W1-4 (a): tabela criada na conversa (sem lock, fora da suíte) → addedTables com os campos', () => {
    const st = base();
    const nome = { name: 'name', label: 'Nome', type: 'string' as const, required: true };
    st.tables.push({ key: 'fidelidade', name: 'Fidelidade', description: 'x', isSelected: true, isCore: false, fields: [nome], conversationHistory: [] });
    expect(toCustomCreation(st, BeautySalonPreset).addedTables).toEqual([{ key: 'fidelidade', name: 'Fidelidade', fields: [nome] }]);
  });

  it('sessão anterior ao W1 (sem modules): tabela de módulo não vira remoção', () => {
    const st = base();
    delete st.modules;
    st.tables = st.tables.filter((t) => !t.key.startsWith('lead'));
    expect(toCustomCreation(st, BeautySalonPreset).removedTables).toEqual([]);
  });
});

describe('item 1 — o turno done devolve COMPLETED + creation consolidada pelo servidor', () => {
  it('1 tabela removida + 1 campo novo → creation contém exatamente os dois', async () => {
    const { sm, svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    expect((await remover(svc, s.id, 'goals')).response).toContain('removida');

    const h = await sm.loadSession(s.id, USER);
    const expenses = h.state.tables.find((t) => t.key === 'expenses')!;
    expenses.fields = [...expenses.fields!, { name: 'nota', label: 'Nota', type: 'string', required: false }];
    await sm.saveSession(h);

    const r = await turno(svc, s.id, 'done');
    expect(r).toMatchObject({ nextStage: 'COMPLETED', presetKey: 'beautySalon', sessionId: s.id });
    expect(r.creation).toEqual({
      mode: 'custom',
      presetKey: 'beautySalon',
      removedTables: ['goals'],
      addedFields: { expenses: [{ name: 'nota', label: 'Nota', type: 'string', required: false }] },
      addedTables: [],
    });
    expect((await sm.loadSession(s.id, USER)).state.isCompleted).toBe(true);
  });
});

describe('item 3 / F-W1-5 (a) — remoção nunca parcial de módulo', () => {
  it('tabela de módulo não-fixo sai com o módulo; a resposta avisa; o create não dá 400', async () => {
    const { sm, svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER, ['CRM-3']))!;
    const r = await remover(svc, s.id, 'leadProposals');
    expect(r.response).toContain('o módulo saiu junto');
    expect(r.customizationState?.modules).toEqual(['CRM-0', 'CRM-3', ...PV]);

    const st = (await sm.loadSession(s.id, USER)).state;
    const draft = toCustomCreation(st, BeautySalonPreset);
    expect(draft.removedTables).toEqual(['leadProposals']);
    // O create resolve `modules` ∪ padrão da suíte e aplica as remoções: módulo inteiro, sem MODULE_PARTIAL.
    const instalados = resolveModuleSelection(st.modules!, BeautySalonPreset.modules);
    expect(applyModuleRemovals(instalados, draft.removedTables)).toEqual(['CRM-0', 'CRM-3', ...PV]);
  });

  it('tabela de módulo fixo → recusada pela trava (FIXED_MODULE)', async () => {
    const { sm, svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    const r = await remover(svc, s.id, 'leads');
    expect(r.response).toContain("módulo fixo 'CRM-0'");
    expect((await sm.loadSession(s.id, USER)).state.tables.some((t) => t.key === 'leads')).toBe(true);
  });
});

describe("F-W1-4 (a) — tabela nova da conversa nasce com 'Nome' e chave aceita pelo create", () => {
  it('addedTableKey normaliza acento/espaço e recusa nome sem letra', () => {
    expect(addedTableKey('Fidelidade de Clientes')).toBe('fidelidade_de_clientes');
    expect(addedTableKey('Ações')).toBe('acoes');
    expect(addedTableKey('123')).toBeNull();
    expect(addedTableKey('!!!')).toBeNull();
  });

  it('addTable grava o campo Nome; chave do Core ou de módulo é recusada', async () => {
    const { sm, svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    expect(await sm.addTable(s, 'Fidelidade', 'pontos')).toBe(true);
    expect((await sm.loadSession(s.id, USER)).state.tables.find((t) => t.key === 'fidelidade')?.fields).toEqual([
      { name: 'name', label: 'Nome', type: 'string', required: true },
    ]);
    const core = Object.keys(CoreSystemPreset.tables).find((k) => /^[a-z]+$/.test(k))!;
    expect(core).toBeDefined();
    expect(await sm.addTable(s, core, 'x')).toBe(false);
    // Chave de módulo (CRM-0 → `leads`); a checagem vale também para módulo fora da sessão (`moduleOfTable`).
    expect(await sm.addTable(s, 'Leads', 'x')).toBe(false);
  });
});

describe('F-W1-6 (a) + sincronização — syncModules', () => {
  it('entra CRM-3 → tabela aparece; sai CRM-3 → some; customização das outras fica', async () => {
    const { sm, svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    const h = await sm.loadSession(s.id, USER);
    const goals = h.state.tables.find((t) => t.key === 'goals')!;
    goals.fields = [...goals.fields!, { name: 'nota', label: 'Nota', type: 'string', required: false }];
    await sm.saveSession(h);

    const com = await svc.syncModules(s.id, USER, ['CRM-0', 'CRM-1', 'CRM-3']);
    expect(com.modules).toEqual(['CRM-0', 'CRM-1', 'CRM-3', ...PV]);
    expect(com.tables.filter((t) => t.key === 'crmOpportunities')).toHaveLength(1);

    const sem = await svc.syncModules(s.id, USER, ['CRM-0', 'CRM-1']);
    expect(sem.modules).toEqual(['CRM-0', 'CRM-1', ...PV]);
    expect(sem.tables.some((t) => t.key === 'crmOpportunities')).toBe(false);
    expect(sem.tables.find((t) => t.key === 'goals')?.fields?.some((f) => f.name === 'nota')).toBe(true);
  });

  it('módulo da suíte não sai pela lista; o que a conversa tirou não volta sozinho', async () => {
    const { svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    expect((await svc.syncModules(s.id, USER, [])).modules).toEqual(SALAO_MODULOS);

    await remover(svc, s.id, 'leadProposals');
    const depois = await svc.syncModules(s.id, USER, ['CRM-0', 'CRM-3']);
    expect(depois.modules).toEqual(['CRM-0', 'CRM-3', ...PV]);
    expect(depois.tables.some((t) => t.key === 'leadProposals')).toBe(false);
  });

  it('sessão de outro usuário → 404', async () => {
    const { svc } = setup();
    const s = (await svc.createCustomizationSession('beautySalon', USER))!;
    await expect(svc.syncModules(s.id, 'outro', ['CRM-3'])).rejects.toBeInstanceOf(InterviewSessionNotFoundError);
  });
});
