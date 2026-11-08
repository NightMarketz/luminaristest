import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Os componentes do SPED não importam React em todos os filhos (jsx preserve + runtime clássico) — shim só no teste.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, fireEvent, waitFor, cleanup, within, act, renderHook } from '@testing-library/react';
import { SpedGenerationPanel } from '../SpedGenerationPanel';
import { SpedEcfRealPanel } from '../SpedEcfRealPanel';
import { useY600Vigencias } from '../../hooks/useY600Vigencias';

/**
 * FE-INCR-ECF-Y600 PR-1 — teste-guarda do passo 14 do H2 (BRIEF item 13). Com uma vigência cadastrada, gerar a ECF pelos
 * dois painéis chama o service com `socios[0].partnerId` preenchido. Antes deste PR o body saía com `socios: []` fixo e o
 * servidor devolvia 400 ECF_Y600_COMPLEMENTO_FALTANDO (Presumido) / ECF_Y600_SEM_SOCIOS (Real).
 * O oráculo real é o passo 14 refeito pela tela em build de produção (gate humano, item 13b).
 */

vi.mock('../../../../lib/services/sped.service', () => ({
  spedService: {
    generateAndDownloadEcd: vi.fn(),
    generateAndDownloadEcf: vi.fn(async () => ({ id: 'job-1', fileName: 'ecf.txt' })),
    generateAndDownloadEcfReal: vi.fn(async () => ({ id: 'job-2', fileName: 'ecf-real.txt' })),
    getQualifAssinante: vi.fn(async () => [{ code: '205', description: 'Administrador' }, { code: '900', description: 'Contador' }]),
    listY600Vigencias: vi.fn(async (_u: string, year: number) => ({
      year,
      vigencias: [
        {
          partnerId: 'p1', nome: 'SOCIA UNICA', taxIdFinal: '4725', tipoPessoa: 'PF', residenteBrasil: true,
          participacaoBp: 10000, entradaEm: '2020-01-01', saidaEm: null, dtFimSoc: null, vigenteNoFim: true,
        },
      ],
      somaParticipacaoFimBp: 10000,
    })),
  },
}));
vi.mock('../../../../lib/services/accountingContacts.service', () => ({
  accountingContactsService: { listContacts: vi.fn(async () => []) },
}));

const ECF_TABLE = [{ code: '205', description: 'Administrador' }, { code: '900', description: 'Contador' }];
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const pick = (el: HTMLElement, value: string) => {
  fireEvent.change(el, { target: { value } });
  fireEvent.blur(el);
};
const ZEROS = { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 };

/** Declarante mínimo + contador (900) e sócio (205) no 0930 — o mesmo preenchimento dos testes do painel. */
function preencherBase(box: ReturnType<typeof within>, real: boolean) {
  if (real) fireEvent.change(box.getByPlaceholderText('PPPP'), { target: { value: 'PPPP' } });
  fireEvent.change(box.getByPlaceholderText('14 dígitos'), { target: { value: '11222333000181' } });
  fireEvent.change(box.getAllByPlaceholderText('Nome')[0], { target: { value: 'Contador' } });
  fireEvent.change(box.getAllByPlaceholderText('CPF/CNPJ')[0], { target: { value: '11122233396' } });
  pick(box.getAllByPlaceholderText('Qualif. (900=contador)')[0], '900');
  fireEvent.change(box.getAllByPlaceholderText('CRC')[0], { target: { value: 'SP-1' } });
  fireEvent.click(box.getByRole('button', { name: /^Adicionar$/ }));
  fireEvent.change(box.getAllByPlaceholderText('Nome')[1], { target: { value: 'Socia' } });
  fireEvent.change(box.getAllByPlaceholderText('CPF/CNPJ')[1], { target: { value: '52998224725' } });
  pick(box.getAllByPlaceholderText('Qualif. (900=contador)')[1], '205');
}

/** Complemento do Y600 da vigência p1: QUALIF 02 e, se `valor` for dado, os 5 valores. */
function preencherY600(box: ReturnType<typeof within>, valor: string | null) {
  const row = within(box.getByTestId('y600-socio-p1'));
  fireEvent.change(row.getAllByRole('combobox')[0], { target: { value: '02' } });
  if (valor !== null) for (const input of row.getAllByPlaceholderText('0,00')) fireEvent.change(input, { target: { value: valor } });
}

const painel = async (real: boolean) => {
  if (real) render(<SpedEcfRealPanel unitId="u1" qualifOptions={ECF_TABLE} qualifLoading={false} contacts={[]} />);
  else render(<SpedGenerationPanel unitId="u1" />);
  await flush();
  const heading = real ? /Gerar SPED ECF \(Lucro Real\)/ : 'Gerar SPED ECF';
  return within(screen.getByRole('heading', { name: heading }).closest('section') as HTMLElement);
};
const submit = (real: boolean) => (real ? /Gerar e baixar ECF \(Real\)/ : 'Gerar e baixar ECF');

describe('H2 passo 14 — a ECF pela tela leva o Y600 do cadastro (FE-INCR-ECF-Y600 item 13)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  for (const real of [false, true]) {
    const nome = real ? 'Real' : 'Presumido';

    it(`13a (${nome}): com uma vigência, o service recebe socios[0] com partnerId, QUALIF e os 5 valores`, async () => {
      const { spedService } = await import('../../../../lib/services/sped.service');
      const box = await painel(real);
      expect(spedService.listY600Vigencias).toHaveBeenCalledWith('u1', new Date().getFullYear() - 1);
      expect(box.getByText('SOCIA UNICA')).toBeTruthy();
      expect(box.getByText('CPF •••4725')).toBeTruthy();
      preencherBase(box, real);
      preencherY600(box, '0');
      fireEvent.click(box.getByRole('button', { name: submit(real) }));

      const gen = real ? spedService.generateAndDownloadEcfReal : spedService.generateAndDownloadEcf;
      await waitFor(() => expect(gen).toHaveBeenCalledTimes(1));
      const payload = vi.mocked(gen).mock.calls[0][0];
      expect(payload.socios).toEqual([{ partnerId: 'p1', qualif: '02', valores: ZEROS }]);
      expect(payload.dirigentes).toEqual([]);
      expect(box.queryByRole('alert')).toBeNull();
    });

    it(`13a' (${nome}): valores em branco não chamam o service e mostram y600.valorObrigatorio`, async () => {
      const { spedService } = await import('../../../../lib/services/sped.service');
      const box = await painel(real);
      preencherBase(box, real);
      preencherY600(box, null);
      fireEvent.click(box.getByRole('button', { name: submit(real) }));
      await flush();
      expect(box.getByText(/Preencha os 5 valores do Y600/)).toBeTruthy();
      const gen = real ? spedService.generateAndDownloadEcfReal : spedService.generateAndDownloadEcf;
      expect(gen).not.toHaveBeenCalled();
    });
  }

  it('item 11: ECF_Y600_COMPLEMENTO_FALTANDO do servidor relê as vigências e mostra a mensagem própria (sem nome nem CPF)', async () => {
    const { spedService } = await import('../../../../lib/services/sped.service');
    vi.mocked(spedService.generateAndDownloadEcfReal).mockRejectedValueOnce({
      success: false, code: 'ECF_Y600_COMPLEMENTO_FALTANDO', message: 'Y600: faltam os partnerId: p2.', status: 400,
    });
    const box = await painel(true);
    preencherBase(box, true);
    preencherY600(box, '0');
    expect(spedService.listY600Vigencias).toHaveBeenCalledTimes(1);
    fireEvent.click(box.getByRole('button', { name: submit(true) }));
    await waitFor(() => expect(box.getByText(/O cadastro de sócios mudou/)).toBeTruthy());
    expect(spedService.listY600Vigencias).toHaveBeenCalledTimes(2);
  });
});

describe('item 7 — ano sem vigência leva ao cadastro de sócios (F-FE-Y600-2 → a)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('o aviso mostra o atalho e ele chama onIrCadastroSocios', async () => {
    const { spedService } = await import('../../../../lib/services/sped.service');
    vi.mocked(spedService.listY600Vigencias).mockResolvedValueOnce({ year: 2025, vigencias: [], somaParticipacaoFimBp: 0 });
    const ir = vi.fn();
    render(<SpedEcfRealPanel unitId="u1" qualifOptions={ECF_TABLE} qualifLoading={false} contacts={[]} onIrCadastroSocios={ir} />);
    await flush();
    expect(screen.getByText(/Nenhum sócio com vigência em/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para o cadastro de sócios' }));
    expect(ir).toHaveBeenCalledTimes(1);
  });
});

describe('useY600Vigencias (item 6)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não busca com ano inválido; a resposta de um ano anterior que chega depois é descartada', async () => {
    const { spedService } = await import('../../../../lib/services/sped.service');
    const resolvers: Record<number, (v: unknown) => void> = {};
    vi.mocked(spedService.listY600Vigencias).mockImplementation(
      (_u: string, year: number) => new Promise((r) => { resolvers[year] = r as (v: unknown) => void; }) as never,
    );
    const { result, rerender } = renderHook(({ y }: { y: number | null }) => useY600Vigencias('u1', y), { initialProps: { y: null as number | null } });
    expect(spedService.listY600Vigencias).not.toHaveBeenCalled();

    rerender({ y: 2024 });
    rerender({ y: 2025 });
    const view = (year: number, id: string) => ({ year, vigencias: [{ partnerId: id }], somaParticipacaoFimBp: 0 });
    await act(async () => { resolvers[2025](view(2025, 'novo')); });
    await act(async () => { resolvers[2024](view(2024, 'velho')); });
    expect(result.current.vigencias.map((v) => v.partnerId)).toEqual(['novo']);
    expect(result.current.loading).toBe(false);
  });
});
