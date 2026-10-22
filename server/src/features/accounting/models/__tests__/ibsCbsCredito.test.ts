/**
 * IBS-CBS-2027 PR-3 — crédito candidato da NF-e de entrada (BRIEF itens 14–15; LC 214 arts. 47 e 57). A lista de uso/consumo
 * nasce vazia (P-IBS-2): o mecanismo é provado com linha de fixture.
 */
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { creditoIbsCbsEntrada, listaUsoConsumoDe, usoConsumoDoNcm, type ItemEntradaIbsCbs } from '../ibsCbsCredito';
import { tabelaProvisoriaCbsDe } from '../ibsCbsParams';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';

const linha = (over: Partial<LinhaLegal>): LinhaLegal => ({
  id: 'l1', tabela: 'IBS_CBS_USO_CONSUMO', chave: '2203', discriminador: null, valorInt: null, valorTexto: null, valorJson: null,
  fonte: 'fixture — LC 214 art. 57 I c (bebidas alcoólicas)', vigenteDesde: '2027-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null, ...over,
});

const item = (nItem: number, ncm: string, ibs: bigint | null, cbs: bigint | null): ItemEntradaIbsCbs => ({ nItem, ncm, ibsCbs: { vIBSCents: ibs, vCBSCents: cbs } });

describe('item 14 — crédito candidato só no regime regular, a partir de 2027', () => {
  const itens = [item(1, '33049990', 10n, 880n), item(2, '34011190', 5n, 440n)];

  it('regime regular em 2027: soma o IBS e a CBS destacados por item', () => {
    const r = creditoIbsCbsEntrada({ dataEmissao: '2027-02-10', regimeRegular: true, itens, lista: listaUsoConsumoDe([linha({})]) });
    expect(r).toMatchObject({ ibsCents: 15, cbsCents: 1320, usoConsumo: [], avisos: [] });
  });

  it('Simples/MEI (fora do regime regular) ⇒ sem crédito (art. 47 caput e § 9º I)', () => {
    expect(creditoIbsCbsEntrada({ dataEmissao: '2027-02-10', regimeRegular: false, itens, lista: [] })).toMatchObject({ ibsCents: 0, cbsCents: 0 });
  });

  it('nota de 2026 ⇒ sem crédito (F-IBS-7 b)', () => {
    expect(creditoIbsCbsEntrada({ dataEmissao: '2026-12-31', regimeRegular: true, itens, lista: [] })).toMatchObject({ ibsCents: 0, cbsCents: 0, avisos: [] });
  });

  it('nota sem o grupo IBSCBS ⇒ zero, sem aviso', () => {
    expect(creditoIbsCbsEntrada({ dataEmissao: '2027-02-10', regimeRegular: true, itens: [{ nItem: 1, ncm: '33049990' }], lista: [] })).toMatchObject({ ibsCents: 0, avisos: [] });
  });
});

describe('item 15 — lista de uso/consumo pessoal (prefixo de NCM, dono 21/10)', () => {
  it('item da lista ⇒ não candidato; o IBS/CBS dele vira custo do próprio item', () => {
    const lista = listaUsoConsumoDe([linha({})]);
    const r = creditoIbsCbsEntrada({ dataEmissao: '2027-02-10', regimeRegular: true, itens: [item(1, '22030000', 10n, 880n), item(2, '33049990', 5n, 440n)], lista });
    expect(r.ibsCents).toBe(5);
    expect(r.cbsCents).toBe(440);
    expect(r.usoConsumo).toEqual([{ nItem: 1, ncm: '22030000', ibsCents: 10, cbsCents: 880, fonte: 'fixture — LC 214 art. 57 I c (bebidas alcoólicas)' }]);
    expect(r.naoCreditavelPorItem.get(1)).toBe(890);
  });

  it('lista vazia ou só DRAFT (P-IBS-2) ⇒ nenhum item excluído, com aviso', () => {
    const lista = listaUsoConsumoDe([linha({ status: 'DRAFT' })]);
    expect(lista).toEqual([]);
    const r = creditoIbsCbsEntrada({ dataEmissao: '2027-02-10', regimeRegular: true, itens: [item(1, '22030000', 10n, 880n)], lista });
    expect(r.cbsCents).toBe(880);
    expect(r.avisos[0]).toMatch(/sem linha publicada.*P-IBS-2/);
  });

  it('vigência da linha e prefixo mais longo', () => {
    const lista = listaUsoConsumoDe([linha({ id: 'a', chave: '22' }), linha({ id: 'b', chave: '2203', vigenteDesde: '2028-01-01', fonte: 'b' })]);
    expect(usoConsumoDoNcm(lista, '22030000', '2027-05-01')?.ncmPrefixo).toBe('22');
    expect(usoConsumoDoNcm(lista, '22030000', '2028-05-01')?.fonte).toBe('b');
    expect(usoConsumoDoNcm(lista, '33049990', '2028-05-01')).toBeNull();
  });

  it('chave fora do formato de NCM ⇒ erro (dado corrompido, nunca casa em silêncio)', () => {
    expect(() => listaUsoConsumoDe([linha({ chave: 'BEBIDAS' })])).toThrow(/prefixo de NCM/);
  });
});

// IBS-CBS-2027 PR-3: formato das linhas das tabelas novas (o operador publica pelo fluxo LEGAL-PARAMS) e leitura da provisória.
describe('formato de IBS_CBS_USO_CONSUMO e IBS_CBS_PROVISORIA', () => {
  it('uso/consumo: chave = prefixo de NCM com descrição; provisória: CBS/ALIQUOTA em bp', () => {
    expect(erroDeFormato({ tabela: 'IBS_CBS_USO_CONSUMO', chave: '2203', valorTexto: 'bebidas alcoólicas (art. 57 I c)' })).toBeNull();
    expect(erroDeFormato({ tabela: 'IBS_CBS_USO_CONSUMO', chave: 'CAFE', valorTexto: 'x' })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'IBS_CBS_PROVISORIA', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 880 })).toBeNull();
    expect(erroDeFormato({ tabela: 'IBS_CBS_PROVISORIA', chave: 'IBS', discriminador: 'ALIQUOTA', valorInt: 880 })).not.toBeNull();
    expect(erroDeFormato({ tabela: 'IBS_CBS_PROVISORIA', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 0 })).not.toBeNull();
  });

  it('tabelaProvisoriaCbsDe lê só PUBLISHED da tabela provisória', () => {
    const p = tabelaProvisoriaCbsDe([
      linha({ id: 'p1', tabela: 'IBS_CBS_PROVISORIA', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 880 }),
      linha({ id: 'p2', tabela: 'IBS_CBS_PROVISORIA', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 900, status: 'DRAFT' }),
    ]);
    expect(p.map((x) => x.aliquotaBp)).toEqual([880]);
  });
});
