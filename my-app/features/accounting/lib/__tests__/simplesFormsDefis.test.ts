import { describe, it, expect } from 'vitest';
import { doacaoVazia, exportacaoVazia, normalizarCnpj, socioVazio, somaParticipacoesBp, toDefisForm, toDefisUpsert, type DefisForm } from '../simplesForms';

/** FE-INCR-SIMPLES PR-D item 14 — o mapper só valida forma; soma = 100% e DV do CNPJ são do BE (F-FS-8 c). */
const base = (): DefisForm => ({ ...toDefisForm(null), empregadosInicio: '1', empregadosFim: '0' });

describe('toDefisUpsert', () => {
  it('form mínimo: valores vazios viram 0 e listas vazias; corpo = SimplesDefisUpsertInput', () => {
    expect(toDefisUpsert('u1', base())).toEqual({
      ok: true,
      body: {
        unitId: 'u1', empregadosInicio: 1, empregadosFim: 0, ganhosCapitalCents: 0, ganhosRendaVariavelCents: 0, exportacaoDiretaCents: 0,
        exportacaoComercial: [], cotasTesourariaBp: 0, socios: [], doacoesEleitorais: [],
      },
    });
  });

  it('empregados obrigatórios e inteiros', () => {
    expect(toDefisUpsert('u1', { ...base(), empregadosInicio: '' })).toEqual({ ok: false, error: { campo: 'empregadosInicio' } });
    expect(toDefisUpsert('u1', { ...base(), empregadosFim: '1,5' })).toEqual({ ok: false, error: { campo: 'empregadosFim' } });
  });

  it('dinheiro em formato BR; texto inválido não vira 0 em silêncio', () => {
    expect(toDefisUpsert('u1', { ...base(), ganhosCapital: 'abc' })).toEqual({ ok: false, error: { campo: 'ganhosCapital' } });
    const r = toDefisUpsert('u1', { ...base(), ganhosRendaVariavel: '1.234,56', exportacaoDireta: '10' });
    expect(r.ok && [r.body.ganhosRendaVariavelCents, r.body.exportacaoDiretaCents]).toEqual([123456, 1000]);
  });

  it('tesouraria e participação: % → bp, acima de 100% é forma inválida', () => {
    expect(toDefisUpsert('u1', { ...base(), cotasTesouraria: '100,01' })).toEqual({ ok: false, error: { campo: 'cotasTesouraria' } });
    const socios = [{ ...socioVazio(), contactId: 'c1', participacao: '' }];
    expect(toDefisUpsert('u1', { ...base(), socios })).toEqual({ ok: false, error: { campo: 'socioParticipacao', linha: 1 } });
    const ok = toDefisUpsert('u1', { ...base(), cotasTesouraria: '12,5', socios: [{ ...socioVazio(), contactId: 'c1', participacao: '87,50' }] });
    expect(ok.ok && [ok.body.cotasTesourariaBp, ok.body.socios[0].participacaoBp]).toEqual([1250, 8750]);
  });

  it('não bloqueia soma ≠ 100% (regra do BE)', () => {
    const r = toDefisUpsert('u1', { ...base(), socios: [{ ...socioVazio(), contactId: 'c1', participacao: '60' }] });
    expect(r.ok).toBe(true);
  });

  it('sócio sem contato; linha apontada', () => {
    const socios = [{ ...socioVazio(), contactId: 'c1', participacao: '50' }, socioVazio()];
    expect(toDefisUpsert('u1', { ...base(), socios })).toEqual({ ok: false, error: { campo: 'socioContato', linha: 2 } });
  });

  it('comercial exportadora: CNPJ sem máscara, alfanumérico em maiúsculas; valor > 0', () => {
    const r = toDefisUpsert('u1', { ...base(), exportacaoComercial: [{ cnpj: '12.abc.345/01de-35', valor: '1,00' }] });
    expect(r.ok && r.body.exportacaoComercial).toEqual([{ cnpj: '12ABC34501DE35', valorCents: 100 }]);
    expect(toDefisUpsert('u1', { ...base(), exportacaoComercial: [{ cnpj: '123', valor: '1' }] })).toEqual({ ok: false, error: { campo: 'exportacaoCnpj', linha: 1 } });
    expect(toDefisUpsert('u1', { ...base(), exportacaoComercial: [{ ...exportacaoVazia(), cnpj: '11222333000181' }] })).toEqual({ ok: false, error: { campo: 'exportacaoValor', linha: 1 } });
  });

  it('doação: tipo e forma obrigatórios, valor > 0', () => {
    const d = { ...doacaoVazia(), cnpj: '11222333000181', valor: '5' };
    expect(toDefisUpsert('u1', { ...base(), doacoesEleitorais: [d] })).toEqual({ ok: false, error: { campo: 'doacaoTipo', linha: 1 } });
    expect(toDefisUpsert('u1', { ...base(), doacoesEleitorais: [{ ...d, tipoBeneficiario: 'CANDIDATO' }] })).toEqual({ ok: false, error: { campo: 'doacaoForma', linha: 1 } });
    expect(toDefisUpsert('u1', { ...base(), doacoesEleitorais: [{ ...d, tipoBeneficiario: 'CANDIDATO', formaDoacao: 'BENS', valor: '0' }] })).toEqual({
      ok: false, error: { campo: 'doacaoValor', linha: 1 },
    });
  });

  it('mais de 100 linhas numa lista', () => {
    const socios = Array.from({ length: 101 }, () => ({ ...socioVazio(), contactId: 'c', participacao: '0' }));
    expect(toDefisUpsert('u1', { ...base(), socios })).toEqual({ ok: false, error: { campo: 'demais', linha: 101 } });
  });
});

describe('toDefisForm / somaParticipacoesBp / normalizarCnpj', () => {
  it('ida e volta: o digitado do BE volta ao mesmo corpo', () => {
    const digitado = {
      empregadosInicio: 2, empregadosFim: 3, ganhosCapitalCents: 5, ganhosRendaVariavelCents: 12345, exportacaoDiretaCents: 100000,
      exportacaoComercial: [{ cnpj: '11222333000181', valorCents: 990 }], cotasTesourariaBp: 1000,
      socios: [{ contactId: 'c-1', rendimentosIsentosCents: 1, rendimentosTributaveisCents: 2, participacaoBp: 9000, irrfCents: 3 }],
      doacoesEleitorais: [{ cnpj: '11222333000181', tipoBeneficiario: 'COMITE_FINANCEIRO' as const, formaDoacao: 'CHEQUE' as const, valorCents: 4 }],
    };
    expect(toDefisUpsert('u1', toDefisForm(digitado))).toEqual({ ok: true, body: { unitId: 'u1', ...digitado } });
  });

  it('soma em bp (sócios + tesouraria); null se algum % não se lê', () => {
    expect(somaParticipacoesBp({ cotasTesouraria: '10', socios: [{ ...socioVazio(), participacao: '90,00' }] })).toBe(10000);
    expect(somaParticipacoesBp({ cotasTesouraria: '', socios: [] })).toBe(0);
    expect(somaParticipacoesBp({ cotasTesouraria: '', socios: [{ ...socioVazio(), participacao: 'x' }] })).toBeNull();
  });

  it('normalizarCnpj tira máscara e espaços', () => {
    expect(normalizarCnpj(' 11.222.333/0001-81 ')).toBe('11222333000181');
  });
});
