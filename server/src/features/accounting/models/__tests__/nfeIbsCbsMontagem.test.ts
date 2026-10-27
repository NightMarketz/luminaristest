import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { SemLinhaVigenteError } from '../../../legalParameters/models/legalParameter';
import { NfeIbsCbsSchema, NfeIbsCbsTotSchema } from '../../dtos/NfeIbsCbsDto';
import { tabelaIbsCbsDe } from '../ibsCbsParams';
import { aliquotasIbsCbsVigentes, baseIbsCbsCents, ibsCbsDoProduto, montarIbsCbsItem, totaisIbsCbs } from '../nfeIbsCbsMontagem';

/**
 * BE-INCR-NFCE (X10a, item 20) — montagem do grupo IBSCBS do CRT 3: grupo base + gRed pela tabela de cClassTrib, alíquotas da
 * semente `IBS_CBS`; o cClassTrib que exige subgrupo sem dado no perfil vira faltante (questionário do dono, 27/10).
 */
const tabela = tabelaIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS));
const DIA = '2026-10-27';
const aliq2026 = aliquotasIbsCbsVigentes(tabela, DIA);
const produto = (cst: string, cClassTrib: string, mod: 55 | 65 = 65) => {
  const r = ibsCbsDoProduto('p1', { ibsCbsCst: cst, ibsCbsClassTrib: cClassTrib }, mod, DIA);
  if ('faltantes' in r) throw new Error(r.faltantes.join(' | '));
  return r;
};

describe('aliquotasIbsCbsVigentes — tabela legal IBS_CBS (UB18/UB37/UB56)', () => {
  it('2026: IBS UF 0,1%, IBS municipal 0% (art. 343; UB37-10) e CBS 0,9% (art. 346)', () => {
    expect(aliq2026).toEqual({ pIBSUF: '0.1000', pIBSMun: '0.0000', pCBS: '0.9000' });
  });

  it('2027: a CBS de referência não tem linha publicada ⇒ 400 nomeado (SemLinhaVigenteError)', () => {
    expect(() => aliquotasIbsCbsVigentes(tabela, '2027-02-01')).toThrow(SemLinhaVigenteError);
  });
});

describe('ibsCbsDoProduto — pré-condições do item (item 20)', () => {
  it('produto sem CST/cClassTrib ⇒ os dois nos faltantes', () => {
    expect(ibsCbsDoProduto('p1', { ibsCbsCst: null, ibsCbsClassTrib: null }, 65, DIA)).toEqual({
      faltantes: ['produto p1: ibsCbsCst (CRT 3, UB13)', 'produto p1: ibsCbsClassTrib (CRT 3, UB14)'],
    });
  });

  it.each([
    ['999', '000001', 65, 'UB13-10'],
    ['000', '999999', 65, 'UB14-10'],
    ['000', '200030', 65, 'UB14-20'],
    ['000', '000003', 65, 'UB14-25'],
    ['220', '220001', 55, 'fora da vigência'],
    ['510', '510001', 55, 'diferimento'],
    ['620', '620006', 65, 'monofásico'],
    ['800', '800001', 55, 'transferência de crédito'],
    ['811', '811001', 55, 'ajuste de competência'],
    ['810', '810001', 55, 'ZFM'],
    ['222', '222001', 55, 'redução de base'],
    ['550', '550001', 55, 'tributação regular'],
    ['410', '410030', 55, 'estorno de crédito'],
    ['410', '410003', 65, 'indDoacao'],
  ] as const)('CST %s / cClassTrib %s no modelo %s ⇒ faltante (%s)', (cst, cc, mod, motivo) => {
    const r = ibsCbsDoProduto('p1', { ibsCbsCst: cst, ibsCbsClassTrib: cc }, mod, DIA);
    expect('faltantes' in r && r.faltantes.join(' ')).toContain(motivo);
  });

  it('perfil PRESUMIDO + produto com CST 000 / cClassTrib 000001 ⇒ pronto para montar', () => {
    expect(produto('000', '000001')).toMatchObject({ cst: { cst: '000' }, cClassTrib: { cClassTrib: '000001' } });
  });
});

describe('montarIbsCbsItem / totaisIbsCbs', () => {
  it('000001 — tributação integral: vBC × alíquota, vIBS = UF + Mun, schema aceita', () => {
    const g = montarIbsCbsItem(produto('000', '000001'), 5999, aliq2026);
    expect(g).toEqual({
      CST: '000',
      cClassTrib: '000001',
      gIBSCBS: {
        vBC: '59.99',
        gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.06' },
        gIBSMun: { pIBSMun: '0.0000', vIBSMun: '0.00' },
        vIBS: '0.06',
        gCBS: { pCBS: '0.9000', vCBS: '0.54' },
      },
    });
    expect(NfeIbsCbsSchema.safeParse(g).success).toBe(true);
  });

  it('200030 — redução de 60% (CST 200, ind_gRed = 1): gRed com o pRed da tabela e a alíquota efetiva de 4 casas', () => {
    const g = montarIbsCbsItem(produto('200', '200030'), 100_000, aliq2026);
    expect(g.gIBSCBS?.gIBSUF).toEqual({ pIBSUF: '0.1000', gRed: { pRedAliq: '60.0000', pAliqEfet: '0.0400' }, vIBSUF: '0.40' });
    expect(g.gIBSCBS?.gCBS).toEqual({ pCBS: '0.9000', gRed: { pRedAliq: '60.0000', pAliqEfet: '0.3600' }, vCBS: '3.60' });
  });

  it('410001 — imunidade (ind_gIBSCBS = 0): só CST e cClassTrib', () => {
    expect(montarIbsCbsItem(produto('410', '410001'), 5999, aliq2026)).toEqual({ CST: '410', cClassTrib: '410001' });
  });

  it('totais W34 somam os itens, e itens sem gIBSCBS não entram', () => {
    const itens = [
      montarIbsCbsItem(produto('000', '000001'), 5999, aliq2026),
      montarIbsCbsItem(produto('200', '200030'), 100_000, aliq2026),
      montarIbsCbsItem(produto('410', '410001'), 777, aliq2026),
    ];
    const t = totaisIbsCbs(itens);
    expect(t.vBCIBSCBS).toBe('1059.99');
    expect(t.gIBS?.gIBSUF.vIBSUF).toBe('0.46');
    expect(t.gIBS?.vIBS).toBe('0.46');
    expect(t.gCBS?.vCBS).toBe('4.14');
    expect(NfeIbsCbsTotSchema.safeParse(t).success).toBe(true);
  });

  it('UB16-10 — base = vProd − vDesc − vPIS − vCOFINS − vICMS', () => {
    expect(baseIbsCbsCents({ vProdCents: 10_000, vDescCents: 500, vPisCents: 65, vCofinsCents: 300, vIcmsCents: 1_800 })).toBe(7_335);
  });
});
