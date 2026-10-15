/**
 * BE-INCR-WIZARD-REMOVABILITY (nó W2) — itens 4, 5 e 6 do BRIEF: a sessão da Entrevista com IA usa a regra única de
 * trava (`presets/removability.ts`). Antes do W2, `TableExtractor` marcava as 17 tabelas do salão com `isCore:true` e
 * nada podia ser removido. A IA é stub: só `getAiResponse` (que nomeia a tabela a remover) é trocado.
 */
import { TableExtractor } from '../TableExtractor';
import { StateManager } from '../StateManager';
import { CustomizationService } from '../CustomizationService';
import { AIInteractions } from '../AIInteractions';
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

describe('item 5 — remoção recalcula as travas da sessão', () => {
  const sm = StateManager.getInstance();
  const abrir = (id: string) =>
    sm.createSessionState('beautySalon', 'Salão', new TableExtractor().extractTablesFromRealPreset(BeautySalonPreset), id);
  const removiveis = (id: string) => (sm.getSessionState(id)?.tables ?? []).filter((t) => !t.isCore).map((t) => t.key);

  it('stockMovements → libera productUnits; productUnits → libera products', () => {
    abrir('w2-s5');
    expect(sm.removeTable('w2-s5', 'products')).toBe(false);
    expect(sm.removeTable('w2-s5', 'stockMovements')).toBe(true);
    expect(removiveis('w2-s5')).toContain('productUnits');
    expect(removiveis('w2-s5')).not.toContain('products');
    expect(sm.removeTable('w2-s5', 'productUnits')).toBe(true);
    expect(removiveis('w2-s5')).toContain('products');
    expect(sm.removeTable('w2-s5', 'products')).toBe(true);
  });

  it('tabela adicionada pelo usuário segue removível e sem lock', () => {
    abrir('w2-s5b');
    expect(sm.addTable('w2-s5b', 'Fidelidade', 'Pontos de fidelidade')).toBe(true);
    sm.removeTable('w2-s5b', 'goals');
    const nova = sm.getSessionState('w2-s5b')?.tables.find((t) => t.key === 'fidelidade');
    expect(nova).toMatchObject({ isCore: false });
    expect(nova?.lock).toBeUndefined();
  });
});

describe('item 6 — recusa nomeia a trava', () => {
  const svc = CustomizationService.getInstance();
  const sm = StateManager.getInstance();
  const pedirRemocao = async (id: string, iaDevolve: string) => {
    expect(svc.createCustomizationSession('beautySalon', id)).not.toBeNull();
    sm.setCurrentAction(id, 'removing');
    jest.spyOn(AIInteractions.prototype, 'getAiResponse').mockResolvedValueOnce(iaDevolve);
    return svc.processCustomizationStep(id, [{ role: 'user', content: 'quero tirar isso' }]);
  };

  it('tabela travada pela contabilidade → diz o motivo, não "não encontrada"', async () => {
    const r = await pedirRemocao('w2-s6', 'sales');
    expect(r.response).toContain('é usada pela contabilidade');
    expect(r.response).not.toMatch(/não foi encontrada|Não encontrei/);
    expect(r.response).toContain('Tabelas disponíveis para remoção');
  });

  it('tabela travada por dependência → nomeia quem depende', async () => {
    const r = await pedirRemocao('w2-s6b', 'products');
    expect(r.response).toContain('productUnits, stockMovements depende(m) dela');
  });

  it('tabela inexistente → mensagem de não encontrada, separada da trava', async () => {
    const r = await pedirRemocao('w2-s6c', 'naoExiste');
    expect(r.response).toContain('Não encontrei a tabela "naoExiste"');
  });

  it('tabela livre → removida', async () => {
    const r = await pedirRemocao('w2-s6d', 'goals');
    expect(r.response).toContain('Tabela Removida com Sucesso');
  });
});
