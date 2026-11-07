/**
 * BE-INCR-WIZARD-REMOVABILITY (nó W2) — itens 4, 5 e 6 do BRIEF: a sessão da Entrevista com IA usa a regra única de
 * trava (`presets/removability.ts`). Antes do W2, `TableExtractor` marcava as 17 tabelas do salão com `isCore:true` e
 * nada podia ser removido. A IA é stub: só `getAiResponse` (que nomeia a tabela a remover) é trocado.
 */
import { TableExtractor } from '../TableExtractor';
import { IInterviewSessionHandle, StateManager } from '../StateManager';
import { CustomizationService } from '../CustomizationService';
import { AIInteractions } from '../AIInteractions';
import { FakeInterviewSessionRepository } from './fakeInterviewSessionRepository';
import type { OpenAIService } from '../../../../lib/openai/OpenAIService';
import BeautySalonPreset from '../../../dynamicTables/presets/systems/BeautySalonPreset';
import { composeSessionTables } from '../sessionComposition';
import { resolveModuleSelection } from '../../../dynamicTables/presets/modules/moduleSelection';

// BE-INCR-MODULOS-BASE-SUBMODULOS PR-2: customers/sales/… viraram tabelas de módulo — a sessão real nasce de
// `composeSessionTables` (módulos default ∪ suíte), como no `CustomizationService.createCustomizationSession`.
const salaoPreset = {
  key: BeautySalonPreset.key,
  tables: composeSessionTables(BeautySalonPreset, resolveModuleSelection([], BeautySalonPreset.modules)),
  bridges: BeautySalonPreset.bridges,
};

// Sem chave de OpenAI no projeto unit: o cliente nunca é chamado (getAiResponse é stub abaixo).
jest.mock('../../../../lib/openai/OpenAIService', () => ({ OpenAIService: { getInstance: () => ({}) } }));

beforeEach(() => jest.clearAllMocks());

// PR-3: productUnits/stockMovements (EST-0) e appointments (AGE-0) são bases fixas → FIXED_MODULE, como o CRM-0. Dono,
// 2026-10-31, questionário: "Aceitar até o PR-6 (Recommended)" — na entrevista o salão não tira Estoque/Agenda até o
// PR-6 (item 32) decidir a remoção da categoria inteira; no Controle Total a categoria inteira sai.
// BE-INCR-MODULOS-BASE-SUBMODULOS PR-5 (item 28, F-MB-5): VEN-PAC destravou — `packages` saiu da lista.
const TRAVADAS_SALAO = ['customers', 'sales', 'saleItems', 'products', 'services', 'productUnits', 'stockMovements', 'appointments'];
// CRM-0 (fixo) vem dos módulos default do salão, travado por FIXED_MODULE.
// PR-4: as bases fixas de FINANCEIRO (FIN-0 = expenses) e GESTÃO (GES-0 = reports) travam do mesmo jeito.
const FUNIL = ['leadPipelines', 'leadStages', 'leads', 'leadActivities', 'expenses', 'reports'];

describe('item 4 — TableExtractor deriva isCore da trava', () => {
  it('salão: isCore só nas tabelas travadas; lock com o motivo', () => {
    const tables = new TableExtractor().extractTablesFromRealPreset(salaoPreset);
    expect(tables).toHaveLength(22);
    expect(tables.filter((t) => t.isCore).map((t) => t.key).sort()).toEqual([...TRAVADAS_SALAO, ...FUNIL].sort());
    expect(tables.find((t) => t.key === 'sales')?.lock).toEqual({ reason: 'ACCOUNTING' });
    expect(tables.find((t) => t.key === 'goals')?.lock).toBeNull();
  });
});

// W4: a sessão é persistida (repositório falso aqui); cada operação relê a linha gravada.
const USER = 'w2-user';

describe('item 5 — remoção recalcula as travas da sessão', () => {
  const sm = new StateManager(new FakeInterviewSessionRepository());
  const abrir = () =>
    sm.createSessionState(
      USER, 'beautySalon', 'Salão', new TableExtractor().extractTablesFromRealPreset(salaoPreset),
      resolveModuleSelection([], BeautySalonPreset.modules),
    );
  const removiveis = async (s: IInterviewSessionHandle) =>
    (await sm.loadSession(s.id, USER)).state.tables.filter((t) => !t.isCore).map((t) => t.key);

  it('PR-3: tabela de base fixa (EST-0, AGE-0) fica travada na sessão; o alvo dela (products/services) segue travado', async () => {
    const s = await abrir();
    expect(await sm.removeTable(s, 'stockMovements')).toBe(false);
    expect(await sm.removeTable(s, 'appointments')).toBe(false);
    const tabelas = (await sm.loadSession(s.id, USER)).state.tables;
    expect(tabelas.find((t) => t.key === 'stockMovements')?.lock).toEqual({ reason: 'FIXED_MODULE', by: ['EST-0'] });
    expect(tabelas.find((t) => t.key === 'appointments')?.lock).toEqual({ reason: 'FIXED_MODULE', by: ['AGE-0'] });
    expect(await removiveis(s)).not.toContain('products');
    expect(await removiveis(s)).not.toContain('services');
    // a trava é dinâmica: submódulo de uma tabela segue removível
    expect(await sm.removeTable(s, 'suppliers')).toBe(true);
  });

  it('tabela adicionada pelo usuário segue removível e sem lock', async () => {
    const s = await abrir();
    expect(await sm.addTable(s, 'Fidelidade', 'Pontos de fidelidade')).toBe(true);
    await sm.removeTable(s, 'goals');
    const nova = (await sm.loadSession(s.id, USER)).state.tables.find((t) => t.key === 'fidelidade');
    expect(nova).toMatchObject({ isCore: false });
    expect(nova?.lock).toBeUndefined();
  });
});

describe('item 6 — recusa nomeia a trava', () => {
  const sm = new StateManager(new FakeInterviewSessionRepository());
  const svc = new CustomizationService(sm, {} as OpenAIService);
  const pedirRemocao = async (iaDevolve: string) => {
    const s = await svc.createCustomizationSession('beautySalon', USER);
    expect(s).not.toBeNull();
    await sm.setCurrentAction(s!, 'removing');
    jest.spyOn(AIInteractions.prototype, 'getAiResponse').mockResolvedValueOnce(iaDevolve);
    return svc.processCustomizationStep(s!.id, USER, [{ role: 'user', content: 'quero tirar isso' }]);
  };

  it('tabela travada pela contabilidade → diz o motivo, não "não encontrada"', async () => {
    const r = await pedirRemocao('sales');
    expect(r.response).toContain('é usada pela contabilidade');
    expect(r.response).not.toMatch(/não foi encontrada|Não encontrei/);
    expect(r.response).toContain('Tabelas disponíveis para remoção');
  });

  it('PR-5 item 27 ("As duas juntas"): sales e customers → trava contábil E a ponte que exige o módulo', async () => {
    const vendas = await pedirRemocao('sales');
    expect(vendas.response).toContain('é usada pela contabilidade');
    expect(vendas.response).toContain("A contabilidade do setor (sales@1) exige o módulo 'VEN-0'.");
    const pessoas = await pedirRemocao('customers');
    expect(pessoas.response).toContain('é usada pela contabilidade');
    expect(pessoas.response).toContain("A contabilidade do setor (sales@1) exige o módulo 'PES-0'.");
  });

  // PR-6 item 32: F-W1-5 vale para todas as categorias; base fixa travada (BRIEF item 32 — a categoria inteira não sai
  // na entrevista; no Controle Total, sim).
  it('PR-6 item 32: desmarcar `sales` → recusa (base de VENDAS, exigida pela ponte) com os dois motivos', async () => {
    const r = await pedirRemocao('sales');
    expect(r.response).toContain('é usada pela contabilidade');
    expect(r.response).toContain("A contabilidade do setor (sales@1) exige o módulo 'VEN-0'.");
    expect(r.response).not.toContain('Tabela Removida com Sucesso');
  });

  it('PR-6 item 32: desmarcar `packages` desmarca VEN-PAC (submódulo de VENDAS) com aviso', async () => {
    const s = await svc.createCustomizationSession('beautySalon', USER);
    await sm.setCurrentAction(s!, 'removing');
    jest.spyOn(AIInteractions.prototype, 'getAiResponse').mockResolvedValueOnce('packages');
    const r = await svc.processCustomizationStep(s!.id, USER, [{ role: 'user', content: 'tira pacotes' }]);
    expect(r.response).toContain('Tabela Removida com Sucesso');
    expect(r.response).toContain('o módulo saiu junto');
    const state = (await sm.loadSession(s!.id, USER)).state;
    expect(state.modules).not.toContain('VEN-PAC');
    expect(state.modules).toContain('VEN-0');
    expect(state.tables.map((t) => t.key)).not.toContain('packages');
  });

  it('tabela travada fora de módulo de ponte → só a trava', async () => {
    const r = await pedirRemocao('products');
    expect(r.response).not.toContain('A contabilidade do setor');
  });

  it('tabela travada por dependência → nomeia quem depende', async () => {
    const r = await pedirRemocao('products');
    expect(r.response).toContain('productUnits, stockMovements depende(m) dela');
  });

  it('tabela inexistente → mensagem de não encontrada, separada da trava', async () => {
    const r = await pedirRemocao('naoExiste');
    expect(r.response).toContain('Não encontrei a tabela "naoExiste"');
  });

  it('tabela livre → removida', async () => {
    const r = await pedirRemocao('goals');
    expect(r.response).toContain('Tabela Removida com Sucesso');
  });
});
