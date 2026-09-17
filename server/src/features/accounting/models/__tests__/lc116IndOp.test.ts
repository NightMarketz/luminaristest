/**
 * BE-INCR-DFE PR-1 (BRIEF item 8) — guarda das transcrições da fonte primária (Anexo I aba MUN.INCID_INFO.SERV.
 * e Anexo C): contagem, chave por ordinal da fonte, códigos do salão e incidência EP do grupo 6 (que sustenta
 * `cLocPrestacao` default = codMun do prestador). Se o MANIFEST mudar de hash, regenerar e ajustar aqui.
 */
import { LC116_LISTA_NACIONAL, findLc116, isLc116Codigo } from '../lc116ListaNacional';
import { IND_OP, IND_OP_DEFAULT_SALAO, isIndOp } from '../indOp';

describe('LC116_LISTA_NACIONAL (Anexo I, MUN.INCID_INFO.SERV.)', () => {
  it('337 subitens, códigos únicos de 6 dígitos, ordinal crescente', () => {
    expect(LC116_LISTA_NACIONAL).toHaveLength(337);
    const codigos = LC116_LISTA_NACIONAL.map((s) => s.codigo);
    expect(new Set(codigos).size).toBe(337);
    expect(codigos.every((c) => /^\d{6}$/.test(c))).toBe(true);
    const linhas = LC116_LISTA_NACIONAL.map((s) => s.linha);
    expect([...linhas].sort((a, b) => a - b)).toEqual(linhas);
  });

  it('salão: 060101 (l.73) e 060201 (l.74) existem, com incidência EP e sem grupo obrigatório', () => {
    expect(findLc116('060101')).toMatchObject({ linha: 73, li: ['EP'], grupo: null });
    expect(findLc116('060201')).toMatchObject({ linha: 74, li: ['EP'], grupo: null });
    expect(findLc116('060201')?.descricao).toMatch(/^Esteticistas/);
  });

  it('isLc116Codigo: exige zero à esquerda; código inexistente é falso', () => {
    expect(isLc116Codigo('060101')).toBe(true);
    expect(isLc116Codigo('60101')).toBe(false);
    expect(isLc116Codigo('069999')).toBe(false);
  });

  it('grupos obrigatórios transcritos: 070601 exige obra, 120601 exige atvEvento (fora do MVP — BRIEF §1)', () => {
    expect(findLc116('070601')?.grupo).toBe('obra');
    expect(findLc116('120601')?.grupo).toBe('atvEvento');
    expect(findLc116('120601')?.li).toEqual(['LP']);
  });
});

describe('IND_OP (Anexo C)', () => {
  it('26 códigos únicos de 6 dígitos; default do salão 030101 = serviço sobre a pessoa no estabelecimento do fornecedor', () => {
    expect(IND_OP).toHaveLength(26);
    expect(new Set(IND_OP.map((o) => o.codigo)).size).toBe(26);
    expect(isIndOp(IND_OP_DEFAULT_SALAO)).toBe(true);
    expect(IND_OP.find((o) => o.codigo === '030101')).toMatchObject({ linha: 5, localFornecimento: 'Estabelecimento do fornecedor' });
    expect(isIndOp('999999')).toBe(false);
  });
});
