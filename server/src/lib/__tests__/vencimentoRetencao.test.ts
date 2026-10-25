/**
 * BE-INCR-RETENCOES-FONTE PR-1 (BRIEF item 4; invariante 8) — dia 20 do mês seguinte, recuado ao dia útil anterior
 * (Lei 11.196 art. 70 I "e"; Lei 10.833 art. 35; Lei 8.212 art. 31). Feriados = fotografia da semente da migração.
 */
import { FERIADOS_SEMENTE } from '@test/helpers/legalParams';
import type { LinhaLegal } from '../../features/legalParameters/models/legalParameter';
import { ultimoDiaUtilAteDia20 } from '../vencimentoRetencao';

describe('ultimoDiaUtilAteDia20 (item 4)', () => {
  it('2026-03 ⇒ 2026-04-20 (segunda-feira)', () => {
    expect(ultimoDiaUtilAteDia20('2026-03', FERIADOS_SEMENTE, null)).toBe('2026-04-20');
  });

  it('dia 20 no sábado recua para sexta; no domingo, para sexta', () => {
    expect(ultimoDiaUtilAteDia20('2026-05', FERIADOS_SEMENTE, null)).toBe('2026-06-19'); // 20/06/2026 = sábado
    expect(ultimoDiaUtilAteDia20('2026-08', FERIADOS_SEMENTE, null)).toBe('2026-09-18'); // 20/09/2026 = domingo
  });

  it('feriado nacional no dia 20 recua (20/11, Lei 14.759/2023)', () => {
    expect(ultimoDiaUtilAteDia20('2026-10', FERIADOS_SEMENTE, null)).toBe('2026-11-19');
  });

  it('dezembro vira o ano', () => {
    expect(ultimoDiaUtilAteDia20('2026-12', FERIADOS_SEMENTE, null)).toBe('2027-01-20');
  });

  it('feriado municipal no dia 20 recua só no município do perfil', () => {
    const local: LinhaLegal = {
      id: 'fer-teste-04-20', tabela: 'FERIADO_LOCAL', chave: '04-20', discriminador: '3550308', valorInt: null, valorTexto: 'FIXO',
      valorJson: null, fonte: 'teste', vigenteDesde: '2024-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null,
    };
    const feriados = [...FERIADOS_SEMENTE, local];
    expect(ultimoDiaUtilAteDia20('2026-03', feriados, '3550308')).toBe('2026-04-17'); // 20/04 feriado, 18–19 fim de semana
    expect(ultimoDiaUtilAteDia20('2026-03', feriados, '3304557')).toBe('2026-04-20');
  });

  it('competência fora de YYYY-MM ⇒ erro', () => {
    expect(() => ultimoDiaUtilAteDia20('2026-13', FERIADOS_SEMENTE, null)).toThrow();
    expect(() => ultimoDiaUtilAteDia20('202603', FERIADOS_SEMENTE, null)).toThrow();
  });
});
