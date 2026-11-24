/**
 * Onda 3.2 (auditoria fiscal/contábil de 24/11/2026), fatia 2 — teste-guarda da VIRADA POR LINHAS.
 *
 * Tese: a data de corte de uma lei é uma linha de `legal_parameters` (`vigenteDesde`/`vigenteAte`), nunca um literal de
 * código. A prova é que a virada do ano (2026-12-31 → 2027-01-01 e 2032-12-31 → 2033-01-01) se faz ALTERANDO SÓ LINHAS:
 * cada caso abaixo roda a MESMA função com a semente real (a lei como publicada) e com uma cópia em que só as datas das
 * linhas mudaram — o resultado tem de acompanhar as linhas. Os literais que o código tinha (`FIM_ISS`, `IBS_CBS_REDUCAO_NBS_DESDE`, `FIM_MONOFASICO_PIS_COFINS`) ignoravam a cópia, e é por isso que estes
 * casos eram vermelhos antes do fix.
 *
 * #3 (`INICIO_TRANSICAO_ISS`) fica de fora desta fatia: o dono (chat, 24/11/2026) escolheu esperar o `MARCO_LEGAL` (fatia 4).
 *
 * Autorização: dono, chat, 24/11/2026 (forks da Onda 3.2: #5 monofásico deriva da linha PIS_COFINS, revertendo
 * `D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO` nesse ponto).
 */
import { UpsertFiscalProfileSchema } from '../../dtos/FiscalProfileDto';
import { storePublished, linhasEmCacheSincrono } from '../../../legalParameters/services/legalParameterCache';
import { SemLinhaVigenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';
import { fatorReducaoIssBp, IssExtintoError } from '../issTransicao';
import { cargaIbsCbsDoServico } from '../servicoFiscalAvaliacao';
import { segregacaoPorNcm } from '../segregacaoNcm';

const seed = [...LEGAIS_SEMENTE];
const semTabela = (linhas: readonly LinhaLegal[], tabela: string) => linhas.filter((l) => l.tabela !== tabela);
/** Muda só as datas das linhas escolhidas — o ato de "publicar a virada" que o operador faria. */
const mudaDatas = (linhas: readonly LinhaLegal[], onde: (l: LinhaLegal) => boolean, f: (l: LinhaLegal) => Partial<LinhaLegal>): LinhaLegal[] =>
  linhas.map((l) => (onde(l) ? { ...l, ...f(l) } : l));
const ano = (d: string, n: number): string => `${Number(d.slice(0, 4)) + n}${d.slice(4)}`;

const ehMaxIss = (l: LinhaLegal) => l.tabela === 'ISS_LIMITE' && l.chave === 'ALIQUOTA_MAX_BP';

describe('#4 FIM_ISS — o fim do ISS é o vigenteAte da ISS_LIMITE/ALIQUOTA_MAX_BP + 1 dia (LC 214 art. 543 IV)', () => {
  it('semente real: 2032-12-31 ainda tem fator; 2033-01-01 é IssExtintoError (controle verde)', () => {
    expect(fatorReducaoIssBp(seed, '2032-12-31')).toBe(4000);
    expect(() => fatorReducaoIssBp(seed, '2033-01-01')).toThrow(IssExtintoError);
  });

  it('linhas com o fim adiado um ano (ISS_LIMITE até 2033-12-31 + fator de 2033): 2033-06-01 tem fator; 2034-01-01 é extinto', () => {
    const adiada = [
      ...mudaDatas(seed, ehMaxIss, (l) => ({ vigenteAte: l.vigenteAte ? ano(l.vigenteAte, 1) : l.vigenteAte })),
      { ...seed.find((l) => l.tabela === 'ISS_TRANSICAO' && l.vigenteDesde === '2032-01-01')!, id: 'teste-iss-2033', valorInt: 5000, vigenteDesde: '2033-01-01', vigenteAte: '2033-12-31' },
    ];
    expect(adiada.find((l) => l.id === 'lp-iss-max-2025-2032')?.vigenteAte).toBe('2033-12-31');
    expect(fatorReducaoIssBp(adiada, '2033-06-01')).toBe(5000);
    expect(() => fatorReducaoIssBp(adiada, '2034-01-01')).toThrow(IssExtintoError);
  });

  it('sem nenhuma linha de ISS_LIMITE/ALIQUOTA_MAX_BP não há fim publicado ⇒ fail-closed (SemLinhaVigenteError), nunca o literal', () => {
    const semLimite = seed.filter((l) => !ehMaxIss(l));
    expect(() => fatorReducaoIssBp(semLimite, '2030-01-01')).toThrow(SemLinhaVigenteError);
  });

  it('DTO do perfil fiscal: com o fim da ISS_LIMITE adiado, 2033-06-01 não é recusado pelo DTO (a data é da linha)', () => {
    const original = linhasEmCacheSincrono('ISS_LIMITE');
    const adiada = mudaDatas(original as unknown as LinhaLegal[], ehMaxIss, (l) => ({ vigenteAte: l.vigenteAte ? ano(l.vigenteAte, 1) : l.vigenteAte })) as unknown as typeof original;
    storePublished('ISS_LIMITE', adiada);
    jest.useFakeTimers({ now: new Date('2033-06-01T12:00:00-03:00'), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
    try {
      const r = UpsertFiscalProfileSchema.safeParse({ unitId: 'u1', regimeTributario: 'PRESUMIDO', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO', issAliquotaBp: 300 });
      expect(r.error?.issues.map((i) => i.message) ?? []).toEqual([]);
    } finally {
      jest.useRealTimers();
      storePublished('ISS_LIMITE', original);
    }
  });
});

describe('#7 IBS_CBS_REDUCAO_NBS_DESDE — o início da redução é o menor vigenteDesde da IBS_CBS_REDUCAO_NBS (LC 214 art. 130)', () => {
  const cbs = (desde: string): LinhaLegal => ({ id: `cbs-${desde}`, tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 870, valorTexto: null, valorJson: null, fonte: 'teste', vigenteDesde: desde, vigenteAte: null, status: 'PUBLISHED', supersedesId: null });
  const servico = { cNBS: '123012100', finalidade: 'TERAPEUTICA' };

  it('semente real: 2026-12-31 avisa "só a partir de 2027-01-01"; 2027-01-01 aplica a redução (controle verde)', () => {
    const l = [...seed, cbs('2027-01-01')];
    const antes = cargaIbsCbsDoServico(servico, '2026-12-31', l);
    expect(antes.cargaBp).toBeNull();
    expect(antes.avisos.join(' ')).toContain('só a partir de 2027-01-01');
    expect(cargaIbsCbsDoServico(servico, '2027-01-01', l)).toMatchObject({ nbsSaude: true, reducaoBp: 6000, cargaBp: 352 });
  });

  it('linhas da redução publicadas para 2028-01-01: 2027-06-01 avisa "só a partir de 2028-01-01"; 2028-01-01 aplica a redução', () => {
    const l = [...mudaDatas(seed, (x) => x.tabela === 'IBS_CBS_REDUCAO_NBS', () => ({ vigenteDesde: '2028-01-01' })), cbs('2027-01-01')];
    const antes = cargaIbsCbsDoServico(servico, '2027-06-01', l);
    expect(antes.cargaBp).toBeNull();
    expect(antes.avisos.join(' ')).toContain('só a partir de 2028-01-01');
    expect(cargaIbsCbsDoServico(servico, '2028-01-01', l)).toMatchObject({ nbsSaude: true, reducaoBp: 6000, cargaBp: 352 });
  });

  it('sem nenhuma linha de IBS_CBS_REDUCAO_NBS não há início publicado ⇒ fail-closed (SemLinhaVigenteError)', () => {
    expect(() => cargaIbsCbsDoServico(servico, '2027-06-01', semTabela(seed, 'IBS_CBS_REDUCAO_NBS'))).toThrow(SemLinhaVigenteError);
  });
});

describe('#5 FIM_MONOFASICO_PIS_COFINS — o fim do monofásico é o vigenteAte da PIS_COFINS + 1 dia (LC 214 art. 542 XI)', () => {
  const SP = '35';
  const CREME = '33049910';
  const pisCofins = (l: LinhaLegal) => l.tabela === 'PIS_COFINS';

  it('semente real: 2026-12-31 exclui PIS/COFINS; 2027-01-01 não (controle verde)', () => {
    expect(segregacaoPorNcm(CREME, SP, '2026-12-31', seed)).toEqual(['PIS', 'COFINS']);
    expect(segregacaoPorNcm(CREME, SP, '2027-01-01', seed)).toEqual([]);
  });

  it('PIS_COFINS publicada até 2027-12-31: 2027-06-01 ainda exclui; 2028-01-01 não', () => {
    const l = mudaDatas(seed, pisCofins, () => ({ vigenteAte: '2027-12-31' }));
    expect(segregacaoPorNcm(CREME, SP, '2027-06-01', l)).toEqual(['PIS', 'COFINS']);
    expect(segregacaoPorNcm(CREME, SP, '2028-01-01', l)).toEqual([]);
  });

  it('NCM monofásica sem nenhuma linha de PIS_COFINS ⇒ fail-closed (SemLinhaVigenteError); NCM fora da tabela segue []', () => {
    const l = semTabela(seed, 'PIS_COFINS');
    expect(() => segregacaoPorNcm(CREME, SP, '2026-06-01', l)).toThrow(SemLinhaVigenteError);
    expect(segregacaoPorNcm('82130000', SP, '2026-06-01', l)).toEqual([]);
  });
});
