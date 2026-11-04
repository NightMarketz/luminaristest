import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent, within, act } from '@testing-library/react';
import { PartnersSection, toPartnerPayload, validatePartnerForm, emptyPartnerForm } from '../PartnersSection';
import { partnersService, type Partner } from '../../../../lib/services/partners.service';

/**
 * FE-INCR-ECF-Y600 PR-2 (BRIEF itens 16–17; F-FE-Y600-2 → a, F-FE-Y600-5 → a) — seção "Sócios" da aba Perfil fiscal.
 * Sem filtro a lista pede TODAS as vigências vivas (`todas=true`, dono 03/11); CRUD com o service mockado; a soma ≠ 100%
 * avisa e não bloqueia; o CPF com DV inválido mostra o 400 do BE (o FE não reimplementa o DV); a edição devolve as
 * `outrasParticipacoes` que a tela não mostra (o PUT do BE regrava o campo com o que vier).
 */

vi.mock('next-i18next', () => {
  const t = (key: string, fallback?: unknown, vars?: Record<string, string>) =>
    typeof fallback === 'string' ? fallback.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '') : key;
  return { useTranslation: () => ({ t }) };
});
vi.mock('../../../../lib/services/partners.service', () => ({
  partnersService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const OUTRAS = [{ cnpj: '11222333000181', participacaoBp: 2000, empresaNoSimples: true, administrador: false }];
const socio = (o: Partial<Partner> = {}): Partner => ({
  id: 'p1', nome: 'MARIA SOCIA', taxId: '52998224725', tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: 6000,
  entradaEm: '2020-01-01', saidaEm: null, outrasParticipacoes: OUTRAS, updatedAt: '2026-01-01T00:00:00.000Z', ...o,
});
const lista = (socios: Partner[], aviso: string | null = null) => ({ data: '2026-11-03', socios, somaParticipacaoBp: 6000, aviso });
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const field = (label: string) => screen.getByLabelText(label, { exact: false }) as HTMLInputElement;

beforeEach(() => {
  vi.mocked(partnersService.list).mockResolvedValue(lista([socio(), socio({ id: 'p0', nome: 'JOAO SAIU', taxId: '39053344705', saidaEm: '2024-12-31' })], 'A soma das participações vigentes em 2026-11-03 é 6000 bp (esperado 10000).'));
  vi.mocked(partnersService.create).mockResolvedValue(socio({ id: 'novo' }));
  vi.mocked(partnersService.update).mockResolvedValue(socio());
  vi.mocked(partnersService.remove).mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PartnersSection', () => {
  it('sem filtro pede todas as vigências (inclusive a de quem saiu); com data pede só as vigentes nela', async () => {
    render(<PartnersSection unitId="u1" />);
    await flush();
    expect(partnersService.list).toHaveBeenCalledWith('u1', { todas: true });
    expect(screen.getByText('JOAO SAIU')).toBeTruthy();
    expect(screen.getByText('31/12/2024')).toBeTruthy();
    fireEvent.change(field('Vigentes em'), { target: { value: '2026-06-30' } });
    await flush();
    expect(partnersService.list).toHaveBeenLastCalledWith('u1', { data: '2026-06-30' });
  });

  it('soma ≠ 100% mostra o aviso do BE e não bloqueia: o cadastro segue e a lista recarrega', async () => {
    render(<PartnersSection unitId="u1" />);
    await flush();
    expect(screen.getByRole('status').textContent).toContain('6000 bp');
    fireEvent.click(screen.getByRole('button', { name: /Novo sócio/ }));
    fireEvent.change(field('Nome'), { target: { value: ' ANA NOVA ' } });
    fireEvent.change(field('CPF ou CNPJ'), { target: { value: '111.444.777-35' } });
    fireEvent.change(field('Participação no capital'), { target: { value: '40' } });
    fireEvent.change(field('Entrada'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(partnersService.create).toHaveBeenCalledTimes(1));
    expect(vi.mocked(partnersService.create).mock.calls[0][0]).toStrictEqual({
      unitId: 'u1', nome: 'ANA NOVA', taxId: '11144477735', residenteBrasil: true, participacaoBp: 4000, entradaEm: '2026-11-01', saidaEm: null,
    });
    await waitFor(() => expect(partnersService.list).toHaveBeenCalledTimes(2));
  });

  it('editar devolve as outrasParticipacoes do sócio no PUT (senão o BE as apagaria) e grava a saída', async () => {
    render(<PartnersSection unitId="u1" />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Editar MARIA SOCIA' }));
    expect(field('Nome').value).toBe('MARIA SOCIA');
    expect(field('Participação no capital').value).toBe('60');
    fireEvent.change(field('Saída'), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(partnersService.update).toHaveBeenCalledTimes(1));
    const [id, body] = vi.mocked(partnersService.update).mock.calls[0];
    expect(id).toBe('p1');
    expect(body).toStrictEqual({
      unitId: 'u1', nome: 'MARIA SOCIA', taxId: '52998224725', residenteBrasil: true, participacaoBp: 6000,
      entradaEm: '2020-01-01', saidaEm: '2026-10-31', outrasParticipacoes: OUTRAS,
    });
  });

  it('CPF com DV inválido não é barrado no FE: o 400 do BE aparece no modal', async () => {
    vi.mocked(partnersService.create).mockRejectedValueOnce({
      success: false, status: 400,
      error: { formErrors: [], fieldErrors: { taxId: ['CPF com dígito verificador inválido'] } },
    });
    render(<PartnersSection unitId="u1" />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /Novo sócio/ }));
    fireEvent.change(field('Nome'), { target: { value: 'ANA' } });
    fireEvent.change(field('CPF ou CNPJ'), { target: { value: '52998224724' } });
    fireEvent.change(field('Participação no capital'), { target: { value: '0' } });
    fireEvent.change(field('Entrada'), { target: { value: '2026-11-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('dígito verificador inválido'));
    expect(partnersService.create).toHaveBeenCalledTimes(1);
  });

  it('formulário incompleto não chama o service e mostra o erro', async () => {
    render(<PartnersSection unitId="u1" />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /Novo sócio/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert').textContent).toContain('Informe o nome do sócio.');
    expect(partnersService.create).not.toHaveBeenCalled();
  });

  it('remover pede confirmação; 409 SOCIO_COM_DISTRIBUICAO aparece no modal e nada sai da lista', async () => {
    vi.mocked(partnersService.remove).mockRejectedValueOnce({
      success: false, status: 409, code: 'SOCIO_COM_DISTRIBUICAO',
      message: 'SOCIO_COM_DISTRIBUICAO: o sócio tem distribuição de lucros ou JCP registrada e não pode ser removido.',
    });
    render(<PartnersSection unitId="u1" />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Remover MARIA SOCIA' }));
    expect(partnersService.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('distribuição de lucros'));
    expect(partnersService.remove).toHaveBeenCalledWith('p1', 'u1');
    expect(partnersService.list).toHaveBeenCalledTimes(1);
  });

  it('remoção aceita recarrega a lista', async () => {
    render(<PartnersSection unitId="u1" />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: 'Remover JOAO SAIU' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(partnersService.list).toHaveBeenCalledTimes(2));
    expect(partnersService.remove).toHaveBeenCalledWith('p0', 'u1');
    expect(within(document.body).queryByText('Remover sócio')).toBeNull();
  });
});

describe('validatePartnerForm / toPartnerPayload', () => {
  it('formato: CPF 11 ou CNPJ 14 dígitos; participação 0..100; entrada obrigatória', () => {
    const ok = { ...emptyPartnerForm(), nome: 'A', taxId: '52998224725', participacao: '100', entradaEm: '2026-01-01' };
    expect(validatePartnerForm(ok)).toBeNull();
    expect(validatePartnerForm({ ...ok, taxId: '123' })).toBe('taxIdFormato');
    expect(validatePartnerForm({ ...ok, participacao: '100,01' })).toBe('participacaoInvalida');
    expect(validatePartnerForm({ ...ok, entradaEm: '' })).toBe('entradaObrigatoria');
  });

  it('sócio novo sai sem outrasParticipacoes; saída vazia vira null', () => {
    const body = toPartnerPayload('u1', { ...emptyPartnerForm(), nome: 'A', taxId: '52998224725', participacao: '12,5', entradaEm: '2026-01-01' }, null);
    expect(body).toStrictEqual({ unitId: 'u1', nome: 'A', taxId: '52998224725', residenteBrasil: true, participacaoBp: 1250, entradaEm: '2026-01-01', saidaEm: null });
  });
});
