/**
 * BE-INCR-LEGAL-PARAMS PR-4 — unidade: o snapshot por apuração (item 7), a janela dos períodos e as famílias de
 * apuração que cada tabela alimenta (item 10).
 */
import { parametrosUsados, type LinhaLegal } from '../models/legalParameter';
import { chaveCronologica, janelaDoPeriodo } from '../../accounting/models/janelaApuracao';
import { familiasDaLinha } from '../../accounting/services/TaxAssessmentRecalcService';

const linha = (id: string, vigenteDesde: string, vigenteAte: string | null, extra: Partial<LinhaLegal> = {}): LinhaLegal => ({
  id, tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', discriminador: null, valorInt: 1500, valorTexto: null, valorJson: null,
  fonte: 'f', vigenteDesde, vigenteAte, status: 'PUBLISHED', supersedesId: null, ...extra,
});

describe('parametrosUsados (item 7)', () => {
  it('só as linhas em vigor que alcançam a janela; ids ordenados; mesmo conteúdo ⇒ mesmo hash, valor diferente ⇒ outro', () => {
    const linhas = [linha('b', '2025-01-01', null), linha('a', '2026-04-01', null), linha('c', '2024-01-01', '2024-12-31'), linha('d', '2026-01-01', null, { status: 'DRAFT' })];
    const t1 = parametrosUsados(linhas, '2026-01-01', '2026-03-31');
    expect(t1.ids).toEqual(['b']);
    expect(parametrosUsados(linhas, '2026-01-01', '2026-06-30').ids).toEqual(['a', 'b']);
    expect(parametrosUsados([...linhas].reverse(), '2026-01-01', '2026-03-31').sha256).toBe(t1.sha256);
    expect(parametrosUsados([linha('b', '2025-01-01', null, { valorInt: 1700 })], '2026-01-01', '2026-03-31').sha256).not.toBe(t1.sha256);
  });

  it('a substituída sai (L-7) e entra a substituta', () => {
    const linhas = [linha('velha', '2025-01-01', null), linha('nova', '2025-01-01', null, { supersedesId: 'velha', valorInt: 1600 })];
    expect(parametrosUsados(linhas, '2026-01-01', '2026-12-31').ids).toEqual(['nova']);
  });
});

describe('janelaDoPeriodo / chaveCronologica', () => {
  it('trimestre, mês do X7, ano, mês do X8', () => {
    expect(janelaDoPeriodo(2026, 'T01')).toEqual({ de: '2026-01-01', ate: '2026-03-31' });
    expect(janelaDoPeriodo(2024, 'A02')).toEqual({ de: '2024-02-01', ate: '2024-02-29' });
    expect(janelaDoPeriodo(2026, 'A00')).toEqual({ de: '2026-01-01', ate: '2026-12-31' });
    expect(janelaDoPeriodo(2026, 'M12')).toEqual({ de: '2026-12-01', ate: '2026-12-31' });
    expect(() => janelaDoPeriodo(2026, 'X9')).toThrow();
  });

  it('A00 vem depois do A12; o ano manda', () => {
    const ordem = [['A00', 2026], ['A12', 2026], ['A01', 2026], ['M01', 2027]] as const;
    expect([...ordem].sort((a, b) => chaveCronologica(a[1], a[0]) - chaveCronologica(b[1], b[0])).map((x) => x[0])).toEqual(['A01', 'A12', 'A00', 'M01']);
  });
});

describe('familiasDaLinha (item 10)', () => {
  it('X7 ⇐ TAX_ASSESSMENT/CSLL_ALIQUOTA; X8 ⇐ PIS_COFINS; CODIGO_RECEITA pela chave; o resto não entra em apuração', () => {
    expect(familiasDaLinha({ tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ' })).toEqual(['X7']);
    expect(familiasDaLinha({ tabela: 'CSLL_ALIQUOTA', chave: '1' })).toEqual(['X7']);
    expect(familiasDaLinha({ tabela: 'PIS_COFINS', chave: 'PIS' })).toEqual(['X8']);
    expect(familiasDaLinha({ tabela: 'CODIGO_RECEITA', chave: 'COFINS' })).toEqual(['X8']);
    expect(familiasDaLinha({ tabela: 'CODIGO_RECEITA', chave: 'IRPJ_PRESUMIDO' })).toEqual(['X7']);
    expect(familiasDaLinha({ tabela: 'DEPRECIACAO_ANEXO_III', chave: '2' })).toEqual([]);
  });
});
