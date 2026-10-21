import { describe, it, expect } from 'vitest';
import { setPrestadoraExclusiva, toMeiEnquadramentoForm, toPresumidoServicosForm, toUpsertComEnquadramentoMei, toUpsertComPresumidoServicos } from '../companyFiscalProfileForm';
import { perfilAno } from '../../components/__tests__/simplesFixtures';

/** FE-INCR-SIMPLES item 8 — o PUT do perfil do ano é substituição total: só os 4 campos MEI mudam. */
describe('toUpsertComEnquadramentoMei', () => {
  const mei = perfilAno(2026, { regime: 'MEI', meiContribuinteIcms: null, meiContribuinteIss: true, meiOcupacoes: ['A-0001'] });

  it('form nasce do GET (null = não declarado)', () => {
    expect(toMeiEnquadramentoForm(mei)).toEqual({ contribuinteIcms: '', contribuinteIss: 'true', transportadorCargas: '', ocupacoes: ['A-0001'] });
  });

  it('devolve o perfil inteiro, trocando só o enquadramento', () => {
    const r = toUpsertComEnquadramentoMei('u1', mei, { contribuinteIcms: 'false', contribuinteIss: 'true', transportadorCargas: 'true', ocupacoes: ['A-0001', 'B-0002'] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.body).toEqual({
      unitId: 'u1',
      regime: 'MEI',
      grandePorte: null,
      inativa: false,
      condicoes: { aporteInvestidorAnjo: false, livroCaixaSemEscrituracao: null, distribuicaoAcimaBase: null },
      declarante: { nome: 'Salão X', cnpj: '12345678000190', uf: 'SP', codMun: '3550308' },
      ecd: null,
      ecf: null,
      contadorContactId: 'c-1',
      representanteLegalSignerId: null,
      formaApuracaoIrpjCsll: null,
      lucroRealObrigatorio: null,
      inicioAtividadeEm: '2020-02-01',
      encerramentoAtividadeEm: null,
      lc224AcrescimoSuspenso: false,
      lc224LiminarReferencia: null,
      prestadoraExclusivaServicos: false,
      declaraNaoProfissaoRegulamentada: false,
      ibsCbsOpcaoS1: null,
      ibsCbsOpcaoS2: null,
      meiContribuinteIcms: false,
      meiContribuinteIss: true,
      meiTransportadorCargas: true,
      meiOcupacoes: ['A-0001', 'B-0002'],
      simplesRegimeApuracao: 'COMPETENCIA',
    });
  });

  it('nenhuma ocupação vira null (o DTO exige ≥ 1 ou null)', () => {
    const r = toUpsertComEnquadramentoMei('u1', mei, { contribuinteIcms: '', contribuinteIss: '', transportadorCargas: '', ocupacoes: [] });
    expect(r.ok && r.body.meiOcupacoes).toBeNull();
    expect(r.ok && r.body.meiContribuinteIcms).toBeNull();
  });

  it('recusa sem enviar: ECD com campo nulo que o PUT exige; regime não MEI', () => {
    const f = toMeiEnquadramentoForm(mei);
    expect(toUpsertComEnquadramentoMei('u1', { ...mei, ecd: { indNire: '0', nire: null, numOrd: null, natLivr: 'Diário' } }, f)).toEqual({ ok: false, error: 'ecdIncompleta' });
    expect(toUpsertComEnquadramentoMei('u1', { ...mei, ecf: { indAliqCsll: null, indRecReceita: '1' } }, f)).toEqual({ ok: false, error: 'ecfIncompleta' });
    expect(toUpsertComEnquadramentoMei('u1', { ...mei, regime: 'SIMPLES' }, f)).toEqual({ ok: false, error: 'naoMei' });
  });

  it('ECD completa vai inteira (nire só quando houver)', () => {
    const f = toMeiEnquadramentoForm(mei);
    const r = toUpsertComEnquadramentoMei('u1', { ...mei, ecd: { indNire: '1', nire: '35200000000', numOrd: '1', natLivr: 'Diário' } }, f);
    expect(r.ok && r.body.ecd).toEqual({ indNire: '1', nire: '35200000000', numOrd: '1', natLivr: 'Diário' });
  });
});

/** FE-INCR-PERFIL-FISCAL-PRESUMIDO itens 4, 5 e F-PP-3 — só os 2 campos do prestador exclusivo mudam. */
describe('toUpsertComPresumidoServicos', () => {
  const presumido = perfilAno(2026, { regime: 'PRESUMIDO' });
  const on = { prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true };

  it('devolve o perfil inteiro, trocando só os 2 campos', () => {
    const r = toUpsertComPresumidoServicos('u1', presumido, on);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const esperado = toUpsertComEnquadramentoMei('u1', { ...presumido, regime: 'MEI' }, toMeiEnquadramentoForm(presumido));
    if (!esperado.ok) throw new Error('fixture');
    expect(r.body).toEqual({ ...esperado.body, regime: 'PRESUMIDO', prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true });
  });

  it('PRESUMIDO + flag sem confirmação não envia (refine do DTO, Lei 9.250 art. 40)', () => {
    expect(toUpsertComPresumidoServicos('u1', presumido, { ...on, declaraNaoProfissaoRegulamentada: false })).toEqual({ ok: false, error: 'confirmacaoAusente' });
  });

  it('REAL + flag sem confirmação envia (o BE só exige no Presumido; F-PP-1 b)', () => {
    const r = toUpsertComPresumidoServicos('u1', perfilAno(2026, { regime: 'REAL' }), { ...on, declaraNaoProfissaoRegulamentada: false });
    expect(r.ok && r.body.prestadoraExclusivaServicos).toBe(true);
  });

  it('regime fora de Presumido/Real é recusado', () => {
    expect(toUpsertComPresumidoServicos('u1', perfilAno(2026, { regime: 'SIMPLES' }), on)).toEqual({ ok: false, error: 'regimeNaoSuportado' });
  });

  it('F-PP-3 (a): desligar a flag zera a confirmação', () => {
    expect(setPrestadoraExclusiva(on, false)).toEqual({ prestadoraExclusivaServicos: false, declaraNaoProfissaoRegulamentada: false });
    expect(setPrestadoraExclusiva({ prestadoraExclusivaServicos: false, declaraNaoProfissaoRegulamentada: false }, true).prestadoraExclusivaServicos).toBe(true);
  });

  it('form nasce do GET', () => {
    expect(toPresumidoServicosForm({ ...presumido, prestadoraExclusivaServicos: true, declaraNaoProfissaoRegulamentada: true })).toEqual(on);
  });
});
