/**
 * EFICIENCIA-FISCAL PR-5 (BRIEF itens 30, 31, 32; ADR §13 I-17, I-19) — alertas de enquadramento dos serviços e a carga de
 * IBS/CBS de 2027 do serviço (LC 214 art. 130 e Anexo III, lido na compilada do Planalto — dossiê eficiencia-fiscal-pr5-servicos).
 */
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { LEGAL_PARAMETER_TABELAS, type LegalParameterTabela, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { alertaPacote, alertasDeEnquadramento, cargaIbsCbsDoServico, reducaoNbsVigente, type ServicoParaAvaliar } from '../servicoFiscalAvaliacao';
import { LEGAL_PARAMS_SEED_FILE_EFICIENCIA_SERVICOS, fotografiaSemente, legalParamsSeedRows } from '@test/helpers/legalParams';

const svc = (serviceRef: string, finalidade: string | null, cTribNac = '060101', cNBS: string | null = null): ServicoParaAvaliar => ({ serviceRef, cTribNac, cNBS, finalidade });
const empresa = (o: Partial<Parameters<typeof alertasDeEnquadramento>[1]> = {}) => ({
  regime: 'PRESUMIDO', prestadoraExclusivaServicos: false, declaraLocacaoImovelProprio: null, declaraCessaoMaoDeObraMedica: null, ...o,
});

describe('item 30 — alertas de enquadramento', () => {
  it('PROFISSAO_REGULAMENTADA_TIRA_16 só com o 16 % declarado no Presumido: TERAPEUTICA/ESTETICA ⇒ WARN (Lei 13.643 art. 1º), BELEZA ⇒ INFO ambíguo, sem finalidade ⇒ INFO', () => {
    const servicos = [svc('a', 'TERAPEUTICA'), svc('b', 'ESTETICA'), svc('c', 'BELEZA'), svc('d', null)];
    expect(alertasDeEnquadramento(servicos, empresa())).toEqual([]);
    const al = alertasDeEnquadramento(servicos, empresa({ prestadoraExclusivaServicos: true })).filter((a) => a.code === 'PROFISSAO_REGULAMENTADA_TIRA_16');
    expect(al.map((a) => [a.severity, a.serviceRefs])).toEqual([['WARN', ['a', 'b']], ['INFO', ['c']], ['INFO', ['d']]]);
    expect(al[0].legalBasis).toContain('Lei 13.643/2018 art. 1º');
    expect(al[0].legalBasis).toContain('Lei 9.250/1995 art. 40 parágrafo único');
    expect(alertasDeEnquadramento(servicos, empresa({ regime: 'SIMPLES', prestadoraExclusivaServicos: true })).some((a) => a.code === 'PROFISSAO_REGULAMENTADA_TIRA_16')).toBe(false);
  });

  it('MEDICO_COM_SERVICO_ESTETICO: item 4 da lista com finalidade ESTETICA ou não informada (I-17); TERAPEUTICA não alerta', () => {
    const al = alertasDeEnquadramento([svc('m1', 'ESTETICA', '040101'), svc('m2', null, '040301'), svc('m3', 'TERAPEUTICA', '040101'), svc('s', 'ESTETICA', '060201')], empresa());
    expect(al).toEqual([expect.objectContaining({ code: 'MEDICO_COM_SERVICO_ESTETICO', severity: 'WARN', serviceRefs: ['m1', 'm2'] })]);
  });

  it('LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES e CESSAO_MAO_DE_OBRA_MEDICA só pelo dado declarado (I-19); null não alerta', () => {
    expect(alertasDeEnquadramento([], empresa({ regime: 'SIMPLES' }))).toEqual([]);
    const al = alertasDeEnquadramento([], empresa({ regime: 'SIMPLES', declaraLocacaoImovelProprio: true, declaraCessaoMaoDeObraMedica: true }));
    expect(al.map((a) => a.code)).toEqual(['LOCACAO_IMOVEL_PROPRIO_NO_SIMPLES', 'CESSAO_MAO_DE_OBRA_MEDICA']);
    expect(al[0].legalBasis).toContain('LC 123/2006 art. 17 XV');
    expect(alertasDeEnquadramento([], empresa({ regime: 'PRESUMIDO', declaraLocacaoImovelProprio: true })).map((a) => a.code)).toEqual([]);
  });
});

describe('item 31 — PACOTE_FATO_GERADOR_FORA_DO_PADRAO (F-EF-13/17 a: o campo não muda, só avisa)', () => {
  it('VENDA no Simples ou CONSUMO fora dele ⇒ INFO com o aviso de 2027 (LC 214 art. 10 § 4º); padrão do regime ⇒ nada', () => {
    expect(alertaPacote('CONSUMO', 'SIMPLES')).toBeNull();
    expect(alertaPacote('VENDA', 'PRESUMIDO')).toBeNull();
    expect(alertaPacote(null, 'SIMPLES')).toBeNull();
    for (const [p, r] of [['VENDA', 'SIMPLES'], ['CONSUMO', 'PRESUMIDO'], ['CONSUMO', 'REAL']] as const) {
      const a = alertaPacote(p, r)!;
      expect(a).toMatchObject({ code: 'PACOTE_FATO_GERADOR_FORA_DO_PADRAO', severity: 'INFO' });
      expect(a.motivoInformativo).toContain('LC 214 art. 10 § 4º');
    }
  });
});

describe('item 32 — IBS_CBS_REDUCAO_NBS e a carga de 2027 do serviço', () => {
  const seed = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_EFICIENCIA_SERVICOS).filter((l) => l.tabela === 'IBS_CBS_REDUCAO_NBS');

  it('semente: tabela no catálogo, 20 prefixos de NBS do Anexo III (30 itens), 6000 bp, desde 2027-01-01, PUBLISHED, formato aceito', () => {
    expect(LEGAL_PARAMETER_TABELAS).toContain('IBS_CBS_REDUCAO_NBS');
    expect(seed).toHaveLength(20);
    for (const l of seed) {
      expect(l).toMatchObject({ valorInt: 6000, vigenteDesde: '2027-01-01', status: 'PUBLISHED', discriminador: null });
      expect(erroDeFormato({ ...l, tabela: l.tabela as LegalParameterTabela })).toBeNull();
      expect(l.fonte).toContain('LC 214/2025 art. 130 e Anexo III');
    }
    expect(seed.map((l) => l.chave)).toEqual(expect.arrayContaining(['123011100', '123019900', '12302', '126030000']));
    expect(erroDeFormato({ ...seed[0], tabela: 'IBS_CBS_REDUCAO_NBS', chave: '1.2301' })).not.toBeNull();
  });

  it('casa o cNBS pelo prefixo (1.2302 cobre 1.2302.xx), fora do Anexo III ⇒ null; antes de 2027 ⇒ null', () => {
    const linhas = fotografiaSemente();
    expect(reducaoNbsVigente('123011100', '2027-01-01', linhas)?.chave).toBe('123011100');
    expect(reducaoNbsVigente('123029000', '2027-03-01', linhas)?.chave).toBe('12302');
    expect(reducaoNbsVigente('126021000', '2027-03-01', linhas)).toBeNull(); // salão (NBS 1.2602) não consta
    expect(reducaoNbsVigente('123011100', '2026-12-31', linhas)).toBeNull();
  });

  it('CBS de 2027 ainda DRAFT na semente ⇒ cargaBp null com aviso (a linha DRAFT gera aviso, nunca número)', () => {
    const c = cargaIbsCbsDoServico({ cNBS: '123012100', finalidade: 'TERAPEUTICA' }, '2027-01-01', fotografiaSemente());
    expect(c).toMatchObject({ cargaBp: null, nbsSaude: true, reducaoBp: 6000 });
    expect(c.avisos.join(' ')).toContain('LC 214 art. 349 I');
  });

  it('com a CBS publicada: redução de 60 % só com NBS de saúde E finalidade ≠ ESTETICA (F-EF-8/11 a; I-17: null ⇒ ESTETICA)', () => {
    const cbs: LinhaLegal = { id: 'cbs-2027-pub', tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 870, valorTexto: null, valorJson: null, fonte: 'teste', vigenteDesde: '2027-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null };
    const linhas = [...fotografiaSemente(), cbs];
    // cheia = 870 + 5 + 5 = 880 bp; com a redução: 880 × 40 % = 352 bp
    expect(cargaIbsCbsDoServico({ cNBS: '123012100', finalidade: 'TERAPEUTICA' }, '2027-02-01', linhas)).toMatchObject({ cheiaBp: 880, cargaBp: 352, reducaoBp: 6000 });
    expect(cargaIbsCbsDoServico({ cNBS: '123012100', finalidade: 'ESTETICA' }, '2027-02-01', linhas)).toMatchObject({ cargaBp: 880, reducaoBp: 0, nbsSaude: true });
    expect(cargaIbsCbsDoServico({ cNBS: '123012100', finalidade: null }, '2027-02-01', linhas)).toMatchObject({ cargaBp: 880, reducaoBp: 0 });
    expect(cargaIbsCbsDoServico({ cNBS: '126021000', finalidade: 'BELEZA' }, '2027-02-01', linhas)).toMatchObject({ cargaBp: 880, nbsSaude: false });
    expect(cargaIbsCbsDoServico({ cNBS: '123012100', finalidade: 'TERAPEUTICA' }, '2026-06-01', linhas).cargaBp).toBeNull();
  });
});
