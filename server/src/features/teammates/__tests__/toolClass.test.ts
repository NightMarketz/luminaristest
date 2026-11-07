/**
 * BE-INCR-TEAMMATES PR-0 item 4 — toda ferramenta registrada no laço do chat (`LuminarisAgentService.getTools()`)
 * tem classe em `TOOL_CLASS`. Ferramenta nova sem classe reprova aqui, antes de chegar ao runner.
 */
import { LuminarisAgentService } from '@/features/chat/services/LuminarisAgentService';
import { ActionClassSchema, PROPOSAL_FORMAT, TOOL_CLASS } from '../models/ActionClass.model';

type Ctor = ConstructorParameters<typeof LuminarisAgentService>;

describe('TOOL_CLASS (item 4)', () => {
  it('cobre toda ferramenta registrada no laço do agente', async () => {
    // getTools() é estático: não toca nas dependências.
    const agent = new LuminarisAgentService(...([{}, {}, {}, {}] as unknown as Ctor));
    const names = (await agent.getTools()).map((t) => (t.type === 'function' ? t.function.name : String(t.type)));
    expect(names.length).toBeGreaterThan(0);
    const semClasse = names.filter((n) => !Object.prototype.hasOwnProperty.call(TOOL_CLASS, n));
    expect(semClasse).toEqual([]);
  });

  it('toda classe do mapa é um ActionClass válido', () => {
    for (const cls of Object.values(TOOL_CLASS)) expect(ActionClassSchema.safeParse(cls).success).toBe(true);
  });
});

describe('PROPOSAL_FORMAT (L-PR3-6)', () => {
  it('toda ferramenta PROPOSTA do registro tem formato de proposta (senão o runner não teria como gravá-la)', () => {
    const semFormato = Object.entries(TOOL_CLASS)
      .filter(([, cls]) => cls === 'PROPOSTA')
      .map(([name]) => name)
      .filter((name) => !Object.prototype.hasOwnProperty.call(PROPOSAL_FORMAT, name));
    expect(semFormato).toEqual([]);
  });

  it('toda entrada da tabela é ferramenta registrada e PROPOSTA (nada apertável fica fora da tabela por engano)', () => {
    for (const name of Object.keys(PROPOSAL_FORMAT)) {
      expect(Object.prototype.hasOwnProperty.call(TOOL_CLASS, name)).toBe(true);
      expect(TOOL_CLASS[name as keyof typeof TOOL_CLASS]).toBe('PROPOSTA');
    }
  });
});
