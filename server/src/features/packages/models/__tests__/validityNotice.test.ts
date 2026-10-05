import {
  PACKAGE_VALIDITY_NOTICE_VERSION,
  buildValidityNotice,
  renderValidityNotice,
  validityNoticeSha256,
} from '../validityNotice';

/**
 * FE-INCR-PACOTE-VALIDADE (BRIEF §3 item 2) — texto v1 puro e determinístico. A data vem do `lastValidDay` (feriado
 * nacional empurra; sábado conta como útil, D2 do #483).
 */
describe('validityNotice (texto v1)', () => {
  it('a versão é v1', () => {
    expect(PACKAGE_VALIDITY_NOTICE_VERSION).toBe('v1');
  });

  it('render é determinístico e contém prazo, data da compra, último dia e a frase de não devolução', () => {
    const input = { validityDays: 365, saleDate: '2026-03-01', expiresOn: '2027-03-01' };
    const a = renderValidityNotice(input);
    expect(renderValidityNotice(input)).toBe(a);
    expect(a).toBe(
      'VALIDADE DO PACOTE: este pacote vale por 365 dias corridos a contar da data da compra (01/03/2026). ' +
        'Último dia para usar: 01/03/2027. ' +
        'Se o prazo terminar em feriado nacional, ele vai até o dia útil seguinte, e a data acima já considera isso. ' +
        'O saldo não usado até essa data não será devolvido nem trocado por dinheiro.',
    );
  });

  it('venda 25/11/2026, N=30 → último dia 26/12/2026 (25/12 é feriado; sábado conta como útil)', () => {
    const n = buildValidityNotice('2026-11-25', 30);
    expect(n).not.toBeNull();
    expect(n!.expiresOn).toBe('2026-12-26');
    expect(n!.text).toContain('(25/11/2026)');
    expect(n!.text).toContain('Último dia para usar: 26/12/2026.');
    expect(n!.textVersion).toBe('v1');
    expect(n!.validityDays).toBe(30);
  });

  it('N null ou 0 → null (pacote sem validade não tem texto)', () => {
    expect(buildValidityNotice('2026-11-25', null)).toBeNull();
    expect(buildValidityNotice('2026-11-25', 0)).toBeNull();
  });

  it('data impossível lança (2026-02-30 não rola para março)', () => {
    expect(() => buildValidityNotice('2026-02-30', 30)).toThrow(/data inválida/);
  });

  it('o hash é sha256 hex (64) do texto e muda com uma palavra', () => {
    const n = buildValidityNotice('2026-03-01', 30)!;
    expect(n.textSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(n.textSha256).toBe(validityNoticeSha256(n.text));
    expect(validityNoticeSha256(n.text.replace('não será', 'será'))).not.toBe(n.textSha256);
  });
});
