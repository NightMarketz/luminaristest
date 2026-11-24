/**
 * BRD F-03.4 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-03 do inventário de estruturas implícitas).
 *
 * `NODE_ENV` ausente valia `development` (`env.ts`, `validateEnv`): num deploy sem a variável, o 500 levava
 * `stack` ao cliente e as guardas "recusa produção" dos adaptadores falsos não disparavam. Decisão do dono
 * (questionário, 2026-11-10, BRD Q6 = (a)): o servidor não sobe sem `NODE_ENV`.
 */
import { validateEnv } from '../env';

describe('BRD F-03.4 — NODE_ENV é obrigatório no boot', () => {
  it('BRD F-03.4: validateEnv sem NODE_ENV lança, nomeando a variável', () => {
    expect(() => validateEnv({ DATABASE_URL: 'file:./t.db' } as NodeJS.ProcessEnv)).toThrow(/NODE_ENV/);
  });

  it('BRD F-03.4: NODE_ENV presente segue passando', () => {
    expect(validateEnv({ NODE_ENV: 'development', DATABASE_URL: 'file:./t.db' } as NodeJS.ProcessEnv).NODE_ENV).toBe('development');
  });
});
