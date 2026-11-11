/**
 * BRD F-57.2 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-57 do inventário de estruturas implícitas).
 *
 * Erro de argumento vindo do MODELO tinha dois destinos: `query_table_data` devolvia `agentToolError` ao
 * modelo (F-I11-3 a), mas `search_documents` com args fora do schema e nome de ferramenta desconhecido
 * lançavam `ValidationError`, que sobe sem `try` até o controller e vira HTTP 4xx para o usuário, que não
 * errou nada. O esperado (ficha, aprovado pelo dono): o mesmo caminho para os três — a recusa volta ao
 * modelo no formato `AgentToolError`.
 */
import { LuminarisAgentService } from '../LuminarisAgentService';
import { AgentToolErrorSchema } from '../../models/AgentTool.model';
import type { UserContext } from '@/lib/authUtils';
import { Role } from '@/features/users/models/User.model';

const ana: UserContext = {
  id: 'ana', userId: 'ana', name: 'ana', username: 'ana', email: 'ana@test.co', userEmail: 'ana@test.co',
  role: Role.USER, userRole: Role.USER, createdAt: new Date(), updatedAt: new Date(),
};

function makeAgent() {
  const search = jest.fn();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colaboradores não usados nestes ramos
  const agent = new LuminarisAgentService({} as any, {} as any, {} as any, {} as any, { search } as any);
  return { agent, search };
}

describe('BRD F-57.2 — erro de argumento do modelo volta ao modelo', () => {
  it('BRD F-57.2: search_documents com args fora do schema → AgentToolError, sem busca', async () => {
    const { agent, search } = makeAgent();
    const out = await agent.handleToolCall(ana, 'search_documents', { query: 'x', documentIds: ['d'] }).catch((e: unknown) => e);
    expect(AgentToolErrorSchema.safeParse(out).success).toBe(true);
    expect(search).not.toHaveBeenCalled();
  });

  it('BRD F-57.2: nome de ferramenta desconhecido → AgentToolError', async () => {
    const { agent } = makeAgent();
    const out = await agent.handleToolCall(ana, 'delete_everything', {}).catch((e: unknown) => e);
    expect(AgentToolErrorSchema.safeParse(out).success).toBe(true);
  });
});
