/**
 * FIX-CHAT-AGENTE lote C — testes-guarda dos achados §3.3 do ACHADOS-2026-10-19 (#19, #24).
 * Autorização: dono, chat, 2026-10-21 ("Autorizo instrumentar e corrigir os achados de … FIX-CHAT-AGENTE (§3.3)")
 * e 2026-10-22 ("Todos os 22 em série").
 *
 * Cada `it` afirma o comportamento correto; antes do fix falha na asserção final.
 */
import { KnowledgeGraphService, type KnowledgeGraphData } from '../services/KnowledgeGraphService';
import { ChatInstanceService } from '@/features/chatInstances/services/ChatInstanceService';
import type { UserContext } from '@/types/UserContext';
import { Role } from '@/features/users/models/User.model';

const user = {
  id: 'user_A', userId: 'user_A', name: 'A', username: 'a', email: 'a@test.co', userEmail: 'a@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
} as UserContext;

describe('#19 — o mapa de conhecimento do agente diz quais campos não aceitam escrita', () => {
  it('campo readOnly aparece marcado como somente leitura no prompt (escrever nele dá 400 no GovernanceEngine)', async () => {
    let saved: KnowledgeGraphData | null = null;
    /* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
    const repo = { upsert: jest.fn(async (_u: string, d: KnowledgeGraphData) => { saved = d; }), findByUserId: jest.fn(async () => (saved ? { data: saved } : null)) };
    const tables = {
      findTablesByUserId: jest.fn().mockResolvedValue([{
        id: 'tbl_sales', name: 'sales', category: 'finance',
        schema: { fields: [
          { name: 'total', label: 'Total', type: 'number', required: true },
          { name: 'isNewCustomer', label: 'Cliente novo', type: 'boolean', required: false, readOnly: true },
        ] },
      }]),
    };
    const svc = new KnowledgeGraphService(repo as any, tables as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const prompt = await svc.getGraphPrompt('user_A');

    const line = prompt.split('\n').find((l) => l.includes('isNewCustomer'));
    expect(line).toMatch(/somente leitura/i);
  });
});

describe('#24 — getOrCreateInstance não varre as instâncias do usuário', () => {
  it('busca a instância pelo widgetInstanceId (chave única), sem carregar a lista inteira', async () => {
    const existing = { id: 'ci_1', widgetInstanceId: 'w1', type: 'DOCUMENT', title: null, userId: 'user_A', createdAt: new Date(), updatedAt: new Date() };
    /* eslint-disable @typescript-eslint/no-explicit-any -- fakes de colaborador */
    const repo = {
      getInstancesByUser: jest.fn().mockResolvedValue([existing]),
      findByWidgetInstanceId: jest.fn().mockResolvedValue(existing),
      createInstance: jest.fn(),
    };
    const svc = new ChatInstanceService(repo as any, { canCreate: () => true } as any);
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const dto = await svc.getOrCreateInstance('w1', 'DOCUMENT', user);

    expect(dto.id).toBe('ci_1');
    expect(repo.getInstancesByUser).not.toHaveBeenCalled();
  });
});
