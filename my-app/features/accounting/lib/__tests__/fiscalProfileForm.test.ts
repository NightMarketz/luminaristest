import { describe, it, expect } from 'vitest';
import type { FiscalProfileView } from '../../../../lib/services/fiscalProfile.service';
import {
  emptyServiceProfileForm,
  formatPctHundredths,
  normalizeCTribNac,
  parsePctHundredths,
  toFiscalProfileForm,
  toUpsertFiscalProfile,
  toUpsertServiceFiscalProfile,
} from '../fiscalProfileForm';

/**
 * FE-INCR-DFE PR-0 itens 4–5: percentual em inteiro ida e volta; o PUT é TOTAL, então o corpo montado de uma view
 * hidratada e NÃO editada tem de devolver cada campo — a mordida da classe "default do Zod reseta o campo omitido".
 */

const view = (over: Partial<FiscalProfileView> = {}): FiscalProfileView => ({
  unitId: 'u1', regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES',
  pisCofinsCreditExcludesIcms: false, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: true,
  icmsRecuperavelAccountId: 'acc-icms', pisCofinsRecuperavelAccountId: null,
  insumoExpenseAccountId: 'acc-insumo', irpjDespesaAccountId: 'acc-irpj-d', csllDespesaAccountId: null,
  irpjRecolherAccountId: 'acc-irpj-r', csllRecolherAccountId: null,
  partnerAccountRef: 'conta-123', codMun: '3550308', inscricaoMunicipal: '1234567', cnae: '9602501',
  dpsSerie: 7, regEspTrib: 3, regApTribSN: 2, issAliquotaBp: 200, issRetidoTomadorPj: true,
  pacoteFatoGerador: 'VENDA', pacoteCTribNac: '060101', pacoteCNBS: '123456789',
  ibsCbsInformar: false, ibsCbsCst: '000', ibsCbsClassTrib: '000001',
  pTotTribFedCent: null, pTotTribEstCent: null, pTotTribMunCent: null, pTotTribSNCent: 1550,
  emissaoForaDoMes: 'BLOQUEAR', d1fConfirmado: true,
  emissao: { completo: true, faltantes: [], pendingExternalValidation: [] }, updatedAt: '2026-10-05T00:00:00.000Z',
  ...over,
});

describe('percentual ↔ centésimos (item 4)', () => {
  it.each([
    ['2,00', 200, '2,00'],
    ['15,5', 1550, '15,50'],
    ['', null, ''],
    ['0', 0, '0,00'],
    ['0,05', 5, '0,05'],
    ['5.00', 500, '5,00'],
  ])('%j → %j → %j', (input, cents, back) => {
    expect(parsePctHundredths(input)).toBe(cents);
    expect(formatPctHundredths(cents)).toBe(back);
  });

  it('formato ilegível é undefined — nunca arredonda 3ª casa nem aceita notação científica', () => {
    for (const bad of ['2,555', '1e3', '0x10', 'abc', '-1', '2,', '1000']) expect(parsePctHundredths(bad)).toBeUndefined();
  });
});

describe('toUpsertFiscalProfile (item 5)', () => {
  it('view hidratada e NÃO editada → o corpo leva cada campo, inclusive dpsSerie 7, BLOQUEAR e os que a tela não edita', () => {
    const built = toUpsertFiscalProfile('u1', toFiscalProfileForm(view()));
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.body).toMatchObject({
      unitId: 'u1', dpsSerie: 7, emissaoForaDoMes: 'BLOQUEAR', pacoteFatoGerador: 'VENDA',
      pisCofinsCreditExcludesIcms: false, pisCofinsCreditFromSimplesSupplier: true, pisCofinsCreditIncludesIpi: false,
      issAliquotaBp: 200, pTotTribSNCent: 1550, regApTribSN: 2, regEspTrib: 3, issRetidoTomadorPj: true,
      icmsRecuperavelAccountId: 'acc-icms', pisCofinsRecuperavelAccountId: null,
      // carregados sem controle na tela (lacuna L2): o PUT total os zeraria se não voltassem
      insumoExpenseAccountId: 'acc-insumo', irpjDespesaAccountId: 'acc-irpj-d', irpjRecolherAccountId: 'acc-irpj-r',
      csllDespesaAccountId: null, csllRecolherAccountId: null, pacoteCTribNac: '060101', pacoteCNBS: '123456789',
      ibsCbsInformar: false, ibsCbsCst: '000', ibsCbsClassTrib: '000001',
      codMun: '3550308', inscricaoMunicipal: '1234567', cnae: '9602501', partnerAccountRef: 'conta-123',
    });
  });

  it('o corpo tem exatamente as chaves do DTO (nenhuma a mais, nenhuma a menos além de ibsCbsInformar opcional)', () => {
    const built = toUpsertFiscalProfile('u1', toFiscalProfileForm(view()));
    if (!built.ok) throw new Error('esperava ok');
    expect(Object.keys(built.body).sort()).toEqual([
      'cnae', 'codMun', 'csllDespesaAccountId', 'csllRecolherAccountId', 'dpsSerie', 'emissaoForaDoMes', 'ibsCbsClassTrib',
      'ibsCbsCst', 'ibsCbsInformar', 'icmsContribuinte', 'icmsRecuperavelAccountId', 'inscricaoMunicipal',
      'insumoExpenseAccountId', 'irpjDespesaAccountId', 'irpjRecolherAccountId', 'issAliquotaBp', 'issRetidoTomadorPj',
      'pTotTribEstCent', 'pTotTribFedCent', 'pTotTribMunCent', 'pTotTribSNCent', 'pacoteCNBS', 'pacoteCTribNac',
      'pacoteFatoGerador', 'partnerAccountRef', 'pisCofinsCreditExcludesIcms', 'pisCofinsCreditFromSimplesSupplier',
      'pisCofinsCreditIncludesIpi', 'pisCofinsRecuperavelAccountId', 'pisCofinsRegime', 'regApTribSN', 'regEspTrib',
      'regimeTributario', 'unitId',
    ]);
  });

  it('SIMPLES força icmsContribuinte=false e pisCofinsRegime=SIMPLES e zera pTotTrib{Fed,Est,Mun}', () => {
    const f = { ...toFiscalProfileForm(view()), icmsContribuinte: true, pTotTribFed: '1,00', pTotTribEst: '2,00', pTotTribMun: '3,00' };
    const built = toUpsertFiscalProfile('u1', f);
    if (!built.ok) throw new Error('esperava ok');
    expect(built.body).toMatchObject({ icmsContribuinte: false, pisCofinsRegime: 'SIMPLES', pTotTribFedCent: null, pTotTribEstCent: null, pTotTribMunCent: null });
  });

  it('PRESUMIDO manda os três pTotTrib em centésimos e zera regApTribSN/pTotTribSN', () => {
    const f = {
      ...toFiscalProfileForm(view({ regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', icmsContribuinte: true, regApTribSN: null, pTotTribSNCent: null })),
      pTotTribFed: '15,5', pTotTribEst: '1', pTotTribMun: '0,5', pTotTribSN: '9,99', regApTribSN: '3',
    };
    const built = toUpsertFiscalProfile('u1', f);
    if (!built.ok) throw new Error('esperava ok');
    expect(built.body).toMatchObject({
      regimeTributario: 'PRESUMIDO', pisCofinsRegime: 'CUMULATIVO', icmsContribuinte: true,
      pTotTribFedCent: 1550, pTotTribEstCent: 100, pTotTribMunCent: 50, pTotTribSNCent: null, regApTribSN: null,
    });
  });

  it('perfil novo: regime não escolhido barra; ibsCbsInformar nunca escolhido é omitido (o BE decide por regime)', () => {
    expect(toUpsertFiscalProfile('u1', toFiscalProfileForm(null))).toEqual({ ok: false, error: 'regimeRequired' });
    const f = { ...toFiscalProfileForm(null), regimeTributario: 'REAL' as const };
    expect(toUpsertFiscalProfile('u1', f)).toEqual({ ok: false, error: 'pisCofinsRegimeRequired' });
    const ok = toUpsertFiscalProfile('u1', { ...f, pisCofinsRegime: 'NAO_CUMULATIVO' });
    if (!ok.ok) throw new Error('esperava ok');
    expect(ok.body.ibsCbsInformar).toBeUndefined();
    expect(ok.body).toMatchObject({ dpsSerie: 1, emissaoForaDoMes: 'AVISAR', pacoteFatoGerador: 'CONSUMO', pisCofinsCreditExcludesIcms: true });
  });

  it('série e percentual ilegíveis barram com a chave de erro', () => {
    const base = toFiscalProfileForm(view());
    expect(toUpsertFiscalProfile('u1', { ...base, dpsSerie: 'x' })).toEqual({ ok: false, error: 'dpsSerieInvalid' });
    expect(toUpsertFiscalProfile('u1', { ...base, issAliquota: '2,555' })).toEqual({ ok: false, error: 'pctInvalid' });
  });

  it('texto vazio vira null (limpa o campo no PUT total)', () => {
    const f = { ...toFiscalProfileForm(view()), codMun: '  ', cnae: '' };
    const built = toUpsertFiscalProfile('u1', f);
    if (!built.ok) throw new Error('esperava ok');
    expect(built.body).toMatchObject({ codMun: null, cnae: null });
  });
});

describe('toUpsertServiceFiscalProfile (item 7)', () => {
  it('"01.07.01" colado vira 010701; cIndOp vazio é omitido; os opcionais vazios viram null', () => {
    expect(normalizeCTribNac('01.07.01')).toBe('010701');
    const body = toUpsertServiceFiscalProfile('u1', { ...emptyServiceProfileForm(), cTribNac: '01.07.01', cNBS: '123456789' });
    expect(body).toEqual({ unitId: 'u1', cTribNac: '010701', cTribMun: null, cNBS: '123456789', cIndOp: undefined, cLocPrestacao: null, xDescServ: null });
    expect('cIndOp' in JSON.parse(JSON.stringify(body))).toBe(false);
  });
});
