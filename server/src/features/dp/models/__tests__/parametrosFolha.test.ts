/**
 * BE-INCR-DP-F0-F1 item 26 (PR-2) — validação das faixas do INSS no leitor `parametrosFolha`: ordenadas, contíguas e só
 * a última sem limite. A leitura com as cargas reais está no teste de integração ao lado.
 */
import { LEGAL_PARAMS_SEED_FILES, SIMPLES_SEED_FILES, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ParametroLegalAusenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { parametrosFolha, TABELAS_PARAMETROS_FOLHA } from '../parametrosFolha';

// O salário mínimo é semeado pelas cargas do Simples (X14), fora de LEGAL_PARAMS_SEED_FILES.
const SEMENTE = legalParamsSeedRows([...LEGAL_PARAMS_SEED_FILES, ...SIMPLES_SEED_FILES]).filter((l) => (TABELAS_PARAMETROS_FOLHA as readonly string[]).includes(l.tabela));
const semInss = SEMENTE.filter((l) => l.tabela !== 'INSS_EMPREGADO');
const faixa = (n: number, ateCents: number | null, aliquotaBp = 750): LinhaLegal => ({
  id: `f${n}`, tabela: 'INSS_EMPREGADO', chave: `FAIXA_${n}`, discriminador: null, valorInt: null, valorTexto: null,
  valorJson: JSON.stringify({ ateCents, aliquotaBp }), fonte: 'teste', vigenteDesde: '2026-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null,
});

describe('parametrosFolha — faixas do INSS', () => {
  it('faixas fora de ordem na fotografia saem ordenadas por FAIXA_n', () => {
    const p = parametrosFolha([...semInss, faixa(2, null, 900), faixa(1, 162100)], '2026-03-15');
    expect(p.inssEmpregado).toEqual([{ ateCents: 162100n, aliquotaBp: 750 }, { ateCents: null, aliquotaBp: 900 }]);
  });

  it('buraco na sequência (FAIXA_1 e FAIXA_3) ⇒ erro', () => {
    expect(() => parametrosFolha([...semInss, faixa(1, 162100), faixa(3, null)], '2026-03-15')).toThrow('sem FAIXA_2');
  });

  it('faixa do meio sem limite, ou última com limite ⇒ erro', () => {
    expect(() => parametrosFolha([...semInss, faixa(1, null), faixa(2, null)], '2026-03-15')).toThrow('só a última faixa');
    expect(() => parametrosFolha([...semInss, faixa(1, 162100), faixa(2, 290284)], '2026-03-15')).toThrow('só a última faixa');
  });

  it('limite que não cresce ⇒ erro', () => {
    expect(() => parametrosFolha([...semInss, faixa(1, 290284), faixa(2, 162100), faixa(3, null)], '2026-03-15')).toThrow('fora de ordem');
  });

  it('sem linha de INSS na data ⇒ ParametroLegalAusenteError da tabela, antes de olhar as outras', () => {
    expect(() => parametrosFolha(semInss, '2026-03-15')).toThrow(ParametroLegalAusenteError);
    expect(() => parametrosFolha(semInss, '2026-03-15')).toThrow(/INSS_EMPREGADO/);
  });
});
