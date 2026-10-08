import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { LegalParametersPanel } from '../LegalParametersPanel';
import type { LegalParameter } from '../../../../lib/services/legalParameters.service';
import { cadeiaDe, paraProposta, propostaDeNovaVersao, propostaVazia, situacaoDe, validarProposta, valorResumo } from '../../lib/legalParameters';

(globalThis as unknown as { React: typeof React }).React = React;

const list = vi.fn();
const propose = vi.fn();
const publish = vi.fn();
const revoke = vi.fn();
vi.mock('../../../../lib/services/legalParameters.service', () => ({
  legalParametersService: {
    list: (...a: unknown[]) => list(...a),
    propose: (...a: unknown[]) => propose(...a),
    publish: (...a: unknown[]) => publish(...a),
    revoke: (...a: unknown[]) => revoke(...a),
  },
}));

let mockAuthUser: { role: string } | null = { role: 'USER' };
vi.mock('../../../../lib/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

const linha = (id: string, extra: Partial<LegalParameter> = {}): LegalParameter => ({
  id, tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', discriminador: null, valorInt: 1500, valorTexto: null, valorJson: null,
  fonte: 'IN RFB 1.700/2017 art. 29', fonteUrl: null, fonteSha256: null, vigenteDesde: '2025-01-01', vigenteAte: null,
  status: 'PUBLISHED', supersedesId: null, motivo: 'migração', proposedById: 'u', publishedById: 'u', publishedAt: '2026-10-07T00:00:00.000Z',
  revokedById: null, revokedAt: null, createdAt: '2026-10-07T00:00:00.000Z', ...extra,
});

const velha = linha('lp-velha');
const nova = linha('lp-nova', { valorInt: 1700, supersedesId: 'lp-velha', vigenteDesde: '2025-01-01', createdAt: '2026-10-08T00:00:00.000Z' });
const rascunho = linha('lp-draft', { chave: 'IRPJ_ADICIONAL_ALIQ', valorInt: 1000, status: 'DRAFT', publishedById: null, publishedAt: null });
const revogada = linha('lp-rev', { tabela: 'LEIAUTE_SPED', chave: 'ECD', valorInt: null, valorTexto: '9.00', status: 'REVOKED', revokedById: 'pa', revokedAt: '2026-10-08T00:00:00.000Z' });
const todas = [velha, nova, rascunho, revogada];

describe('helpers da aba Parâmetros legais (itens 4, 5, 7)', () => {
  it('situação: rascunho, revogada, substituída (L-7) e em vigor', () => {
    expect([velha, nova, rascunho, revogada].map((l) => situacaoDe(l, todas))).toEqual(['SUBSTITUIDA', 'EM_VIGOR', 'RASCUNHO', 'REVOGADA']);
  });

  it('cadeia = mesma tabela/chave/discriminador, por vigência e criação', () => {
    expect(cadeiaDe(nova, todas).map((l) => l.id)).toEqual(['lp-velha', 'lp-nova']);
    expect(cadeiaDe(rascunho, todas).map((l) => l.id)).toEqual(['lp-draft']);
  });

  it('valor resumido: inteiro, texto e JSON cortado', () => {
    expect(valorResumo(velha)).toBe('1500');
    expect(valorResumo(revogada)).toBe('9.00');
    expect(valorResumo({ valorInt: null, valorTexto: null, valorJson: { a: 'x'.repeat(100) } }, 20)).toHaveLength(20);
  });

  it('validação de presença/sintaxe e corpo com exatamente um valor', () => {
    const f = { ...propostaVazia(), chave: 'IRPJ_ALIQ', valor: '1600', fonte: 'IN 1.700', vigenteDesde: '2027-01-01', motivo: 'teste' };
    expect(validarProposta(f)).toBeNull();
    expect(validarProposta({ ...f, valor: '1,5' })).toBe('valorIntInvalid');
    expect(validarProposta({ ...f, tipoValor: 'json', valor: '{x' })).toBe('valorJsonInvalid');
    expect(validarProposta({ ...f, vigenteAte: '2026-12-31' })).toBe('vigenciaInvertida');
    expect(validarProposta({ ...f, fonte: ' ' })).toBe('fonteRequired');
    expect(validarProposta({ ...f, valor: '9007199254740993' })).toBe('valorIntInvalid'); // > 2^53
    expect(validarProposta({ ...f, tipoValor: 'json', valor: 'null' })).toBe('valorJsonInvalid');
    expect(validarProposta({ ...f, tipoValor: 'texto', valor: 'x'.repeat(65) })).toBe('valorTextoLongo');
    expect(paraProposta(f)).toEqual({
      tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', discriminador: undefined, valorInt: 1600, fonte: 'IN 1.700', fonteUrl: undefined,
      fonteSha256: undefined, vigenteDesde: '2027-01-01', vigenteAte: undefined, supersedesId: undefined, motivo: 'teste',
    });
    expect(paraProposta({ ...f, tipoValor: 'json', valor: '{"ordem":1}' })).toMatchObject({ valorJson: { ordem: 1 } });
    expect(paraProposta({ ...f, tipoValor: 'json', valor: '{"ordem":1}' })).not.toHaveProperty('valorInt');
  });

  it('nova versão mantém a linha lógica e aponta supersedesId', () => {
    expect(propostaDeNovaVersao(nova)).toMatchObject({ tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', tipoValor: 'int', valor: '1700', supersedesId: 'lp-nova' });
  });
});

describe('LegalParametersPanel (itens 3, 5, 6, 8)', () => {
  beforeEach(() => {
    list.mockResolvedValue(todas);
    mockAuthUser = { role: 'USER' };
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('usuário comum vê a lista e o histórico, sem nenhuma ação de gestão', async () => {
    render(<LegalParametersPanel />);
    expect(await screen.findByText('IRPJ_ADICIONAL_ALIQ')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Propor linha/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Publicar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Revogar/ })).toBeNull();

    fireEvent.click(screen.getAllByRole('button', { name: /Histórico/ })[1]); // lp-nova
    const hist = await screen.findByTestId('legal-params-history');
    expect(within(hist).getAllByRole('listitem')).toHaveLength(2);
    expect(within(hist).getByText('Substituída')).toBeInTheDocument();
  });

  it('filtro por status mostra só os rascunhos', async () => {
    render(<LegalParametersPanel />);
    await screen.findByText('IRPJ_ADICIONAL_ALIQ');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'DRAFT' } });
    expect(screen.getAllByRole('row')).toHaveLength(2); // cabeçalho + 1
  });

  it('PLATFORM_ADMIN publica um rascunho e a lista recarrega', async () => {
    mockAuthUser = { role: 'PLATFORM_ADMIN' };
    publish.mockResolvedValue({ ...rascunho, status: 'PUBLISHED' });
    render(<LegalParametersPanel />);
    await screen.findByText('IRPJ_ADICIONAL_ALIQ');
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(publish).toHaveBeenCalledWith('lp-draft'));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('PLATFORM_ADMIN propõe; o erro de formato do BE (400) aparece no modal', async () => {
    mockAuthUser = { role: 'PLATFORM_ADMIN' };
    propose.mockRejectedValue({ success: false, error: 'TAX_ASSESSMENT/IRPJ_ALIQ: o valor desta tabela é valorInt.', status: 400 });
    render(<LegalParametersPanel />);
    await screen.findByText('IRPJ_ADICIONAL_ALIQ');
    fireEvent.click(screen.getAllByRole('button', { name: 'Nova versão' })[0]);
    fireEvent.change(await screen.findByLabelText('Vigente desde'), { target: { value: '2027-01-01' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'reajuste' } });
    fireEvent.click(screen.getByRole('button', { name: /Propor \(rascunho\)/ }));
    await waitFor(() => expect(propose).toHaveBeenCalledWith(expect.objectContaining({ supersedesId: 'lp-nova', valorInt: 1700, vigenteDesde: '2027-01-01' })));
    expect(await screen.findByRole('alert')).toHaveTextContent('o valor desta tabela é valorInt');
  });
});
