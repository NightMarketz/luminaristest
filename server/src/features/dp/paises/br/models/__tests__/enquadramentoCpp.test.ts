/**
 * BE-INCR-DP-PONTE-RAZAO PR-P1 item 9 — `enquadramentoNaCompetencia`: o que está publicado na data, e a pendência
 * bloqueante de cada tabela que falta, com o CNPJ formatado.
 */
import type { LinhaLegal } from '../../../../../legalParameters/models/legalParameter';
import { enquadramentoNaCompetencia } from '../enquadramentoCpp';

const CNPJ = '12ABC34501DE35';

function linha(tabela: string, chave: string, v: { valorInt?: number; valorTexto?: string }, vigenteDesde: string, vigenteAte: string | null = null): LinhaLegal {
  return {
    id: `${tabela}-${chave}-${vigenteDesde}`, tabela, chave, discriminador: null, valorInt: v.valorInt ?? null, valorTexto: v.valorTexto ?? null, valorJson: null,
    fonte: 'teste', vigenteDesde, vigenteAte, status: 'PUBLISHED', supersedesId: null,
  };
}

const FOTO: LinhaLegal[] = [
  linha('RAT_GRAU_ESTABELECIMENTO', CNPJ, { valorInt: 2 }, '2026-01-01'),
  linha('FAP_ESTABELECIMENTO', CNPJ, { valorInt: 12_345 }, '2026-01-01', '2026-12-31'),
  linha('FPAS_EMPRESA', CNPJ.slice(0, 8), { valorTexto: '515' }, '2026-01-01'),
];

describe('PR-P1 item 9 — enquadramentoNaCompetencia', () => {
  it('os três publicados na data ⇒ valores e nenhuma pendência; o FPAS sai pela raiz do CNPJ', () => {
    expect(enquadramentoNaCompetencia(FOTO, CNPJ, '2026-03-31')).toEqual({ ratGrau: 2, fapX10000: 12_345, fpas: '515', pendencias: [] });
    expect(enquadramentoNaCompetencia(FOTO, '12ABC34502DE16', '2026-03-31').fpas).toBe('515');
  });

  it('o FAP do ano acaba em 31/12: na competência seguinte é pendência bloqueante, com o CNPJ formatado e a tabela', () => {
    const r = enquadramentoNaCompetencia(FOTO, CNPJ, '2027-01-31');
    expect([r.ratGrau, r.fapX10000, r.fpas]).toEqual([2, null, '515']);
    expect(r.pendencias).toEqual([
      expect.objectContaining({ codigo: 'ENQUADRAMENTO_CPP_AUSENTE', bloqueante: true, tabela: 'FAP_ESTABELECIMENTO', cnpj: CNPJ, dado: 'FAP_ESTABELECIMENTO de 12.ABC.345/01DE-35 em 2027-01' }),
    ]);
  });

  it('estabelecimento sem nenhuma linha ⇒ as três pendências, na ordem das tabelas', () => {
    const r = enquadramentoNaCompetencia(FOTO, '11222333000181', '2026-03-31');
    expect(r.pendencias.map((p) => p.dado)).toEqual([
      'RAT_GRAU_ESTABELECIMENTO de 11.222.333/0001-81 em 2026-03',
      'FAP_ESTABELECIMENTO de 11.222.333/0001-81 em 2026-03',
      'FPAS_EMPRESA de 11.222.333/0001-81 em 2026-03',
    ]);
    expect([r.ratGrau, r.fapX10000, r.fpas]).toEqual([null, null, null]);
  });

  it('linha não publicada (DRAFT) não conta', () => {
    const rascunho = FOTO.map((l) => (l.tabela === 'RAT_GRAU_ESTABELECIMENTO' ? { ...l, status: 'DRAFT' } : l));
    expect(enquadramentoNaCompetencia(rascunho, CNPJ, '2026-03-31').pendencias.map((p) => p.tabela)).toEqual(['RAT_GRAU_ESTABELECIMENTO']);
  });
});
