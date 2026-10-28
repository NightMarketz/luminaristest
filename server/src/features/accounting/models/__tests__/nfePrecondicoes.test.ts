import { crtDoRegime, faltantesDosItens } from '../nfePrecondicoes';

describe('crtDoRegime — BE-INCR-NFCE item 8 (C21)', () => {
  it('Simples ⇒ 1; Presumido e Real ⇒ 3', () => {
    expect([crtDoRegime('SIMPLES'), crtDoRegime('PRESUMIDO'), crtDoRegime('REAL')]).toEqual([1, 3, 3]);
  });

  it('regime fora do domínio não vira default', () => {
    expect(() => crtDoRegime('MEI')).toThrow(/crt_regime_desconhecido/);
  });
});

describe('faltantesDosItens — BE-INCR-NFCE item 11', () => {
  const ok = { productRef: 'p1', cfopPadrao: '5102', csosn: '102', cstIcms: null };

  it('produto sem perfil ⇒ faltante nomeado', () => {
    expect(faltantesDosItens('NFCE', 1, ['p1', 'p2'], [ok])).toEqual(['produto p2: perfil fiscal']);
  });

  it('NFC-e com CFOP fora da I08-150 ⇒ faltante; a NF-e 55 não tem essa lista', () => {
    const p = { ...ok, cfopPadrao: '5933' };
    expect(faltantesDosItens('NFCE', 1, ['p1'], [p])).toEqual(['produto p1: CFOP 5933 não aceito na NFC-e (I08-150, rej. 725)']);
    expect(faltantesDosItens('NFE', 1, ['p1'], [p])).toEqual([]);
  });

  it('CRT 1 exige csosn; CRT 3 exige cstIcms', () => {
    expect(faltantesDosItens('NFCE', 1, ['p1'], [{ ...ok, csosn: null, cstIcms: '00' }])).toEqual(['produto p1: csosn (CRT 1, N12a)']);
    expect(faltantesDosItens('NFCE', 3, ['p1'], [ok])).toEqual(['produto p1: cstIcms (CRT 3, N12)']);
  });

  it('produto repetido na venda conta uma vez', () => {
    expect(faltantesDosItens('NFCE', 1, ['p9', 'p9'], [])).toEqual(['produto p9: perfil fiscal']);
  });
});
