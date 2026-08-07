import React from 'react';
import { describe, it, expect } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render } from '@testing-library/react';
import { useTranslation } from 'next-i18next';
import { useAccountingT } from '../useAccountingT';

/**
 * A premissa e o remedio da classe `t`-instavel, provados lado a lado.
 *
 * O primeiro teste NAO testa nosso codigo — ele fixa o FATO de ambiente do qual
 * todo o resto depende. Se um dia o vitest.setup passar a inicializar uma
 * instancia i18next, este teste fica vermelho e avisa que o remedio virou
 * desnecessario, em vez de o remedio apodrecer sem ninguem saber por que existe.
 */
describe('useAccountingT — a classe do `t` instável', () => {
  it('PREMISSA: `t` cru recebe identidade nova a cada render (sem instância i18next)', () => {
    const seen: unknown[] = [];
    function Probe({ n }: { n: number }) {
      const { t } = useTranslation('accounting');
      seen.push(t);
      return <span>{n}</span>;
    }
    const { rerender } = render(<Probe n={1} />);
    rerender(<Probe n={2} />);
    rerender(<Probe n={3} />);

    // É ISTO que fecha o laço quando `t` entra num dep array de fetch.
    expect(seen[0]).not.toBe(seen[1]);
    expect(seen[1]).not.toBe(seen[2]);
  });

  it('REMÉDIO: o `tRef` tem identidade estável, e `tRef.current` acompanha o `t` do render', () => {
    const refs: unknown[] = [];
    const currents: unknown[] = [];
    const raw: unknown[] = [];
    function Probe({ n }: { n: number }) {
      const { t, tRef } = useAccountingT();
      refs.push(tRef);
      currents.push(tRef.current);
      raw.push(t);
      return <span>{n}</span>;
    }
    const { rerender } = render(<Probe n={1} />);
    rerender(<Probe n={2} />);
    rerender(<Probe n={3} />);

    // Identidade estável → seguro num dep array; o efeito não re-dispara.
    expect(refs[0]).toBe(refs[1]);
    expect(refs[1]).toBe(refs[2]);
    // ...sem congelar a leitura: `current` é sempre o `t` DESTE render, não o do primeiro.
    expect(currents[2]).toBe(raw[2]);
    expect(currents[2]).not.toBe(raw[0]);
  });

  it('o `t` devolvido continua traduzindo (fallback inline preservado)', () => {
    let out = '';
    function Probe() {
      const { t } = useAccountingT();
      out = t('approvals.heading', 'Aprovações');
      return null;
    }
    render(<Probe />);
    expect(out).toBe('Aprovações');
  });
});
