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

// Sem chave de OpenAI no projeto unit: o cliente nunca é chamado (getAiResponse é stub abaixo).
jest.mock('../../../../lib/openai/OpenAIService', () => ({ OpenAIService: { getInstance: () => ({}) } }));

beforeEach(() => jest.clearAllMocks());

const TRAVADAS_SALAO = ['customers', 'packages', 'sales', 'saleItems', 'products', 'services', 'productUnits'];

describe('item 4 — TableExtractor deriva isCore da trava', () => {
  it('salão: isCore só nas tabelas travadas; lock com o motivo', () => {
    const tables = new TableExtractor().extractTablesFromRealPreset(BeautySalonPreset);
    expect(tables).toHaveLength(17);
    expect(tables.filter((t) => t.isCore).map((t) => t.key).sort()).toEqual([...TRAVADAS_SALAO].sort());
    expect(tables.find((t) => t.key === 'sales')?.lock).toEqual({ reason: 'ACCOUNTING' });
    expect(tables.find((t) => t.key === 'goals')?.lock).toBeNull();
  });
});

// W4: a sessão é persistida (repositório falso aqui); cada operação relê a linha gravada.
const USER = 'w2-user';

describe('item 5 — remoção recalcula as travas da sessão', () => {
  const sm = new StateManager(new FakeInterviewSessionRepository());
  const abrir = () =>
    sm.createSessionState(USER, 'beautySalon', 'Salão', new TableExtractor().extractTablesFromRealPreset(BeautySalonPreset));
  const removiveis = async (s: IInterviewSessionHandle) =>
    (await sm.loadSession(s.id, USER)).state.tables.filter((t) => !t.isCore).map((t) => t.key);

  it('stockMovements → libera productUnits; productUnits → libera products', async () => {
    const s = await abrir();
    expect(await sm.removeTable(s, 'products')).toBe(false);
    expect(await sm.removeTable(s, 'stockMovements')).toBe(true);
    expect(await removiveis(s)).toContain('productUnits');
    expect(await removiveis(s)).not.toContain('products');
    expect(await sm.removeTable(s, 'productUnits')).toBe(true);
    expect(await removiveis(s)).toContain('products');
    expect(await sm.removeTable(s, 'products')).toBe(true);
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
