import { describe, it, expect } from 'vitest';
import { humanizeZodFlatten } from '../zodFlatten';

/**
 * H2 C7 achado 22-3 (03/11, PR #982): o 400 do perfil fiscal saía "inscricaoEstadual: inscricaoEstadual: só
 * algarismos…" — a mensagem do DTO já começa com o campo e o humanizador prefixa de novo.
 */
describe('humanizeZodFlatten', () => {
  it('não repete o campo quando a mensagem do servidor já começa com ele', () => {
    expect(
      humanizeZodFlatten({ fieldErrors: { inscricaoEstadual: ['inscricaoEstadual: só algarismos, 2 a 14 (emit/IE, C17)'] } }),
    ).toBe('inscricaoEstadual: só algarismos, 2 a 14 (emit/IE, C17)');
  });

  it('mensagem sem o campo continua prefixada', () => {
    expect(humanizeZodFlatten({ fieldErrors: { codMun: ['código IBGE de 7 dígitos'] } })).toBe('codMun: código IBGE de 7 dígitos');
  });
});
