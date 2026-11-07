import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor, within, act } from '@testing-library/react';
import { AssinadorLocalSection, RELEITURA_MS } from '../AssinadorLocalSection';
import { dfeAssinadorService, type DfeSignerView } from '../../../../../lib/services/dfeAssinador.service';
import pt from '../../../../../public/locales/pt/accounting.json';
import en from '../../../../../public/locales/en/accounting.json';

/**
 * AssinadorLocalSection (FE-INCR-NFCE-ASSINADOR FA-4..FA-11, FA-15, FA-17): carga por unidade com descarte da resposta
 * velha; estados pelo texto exibido; código no modal, uma vez, com expiração; pareamento visto pela releitura; revogar
 * com confirmação; erro do servidor íntegro; releitura só com a aba visível.
 */
vi.mock('../../../../../lib/services/dfeAssinador.service', () => ({
  dfeAssinadorService: { gerarCodigo: vi.fn(), getEstado: vi.fn(), revogar: vi.fn() },
}));

const view = (over: Partial<DfeSignerView> = {}): DfeSignerView => ({
  dispositivoId: 'd1', nome: 'Caixa Balcão', versaoAssinador: '1.0.0', versaoMinima: '1.0.0',
  lastSeenAt: '2026-11-07T12:00:00.000Z', online: true, tokenPresente: true, certCnpjRaiz: '11444777',
  certNotAfter: '2027-11-07', diasParaVencer: 365, certThumbprint: `abcdef12${'0'.repeat(48)}9876fedc`, ambiente: 'homologacao',
  pareadoEm: '2026-11-01T00:00:00.000Z', outrasUnidades: [], ...over,
});

const svc = vi.mocked(dfeAssinadorService);
const setVisibility = (v: 'visible' | 'hidden') => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });

describe('AssinadorLocalSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setVisibility('visible');
    svc.getEstado.mockResolvedValue(null);
  });
  afterEach(async () => {
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 0));
    cleanup();
  });

  it('FA-6: sem pareamento mostra o que fazer e o botão de gerar código', async () => {
    render(<AssinadorLocalSection unitId="u1" />);
    expect(await screen.findByText(/Nenhum assinador pareado nesta unidade/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar código de pareamento' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Revogar' })).toBeNull();
    expect(svc.getEstado).toHaveBeenCalledWith('u1');
  });

  it('FA-6: pareado e online mostra caixa, versão, certificado, token e ambiente, sem NaN/Invalid Date/undefined', async () => {
    svc.getEstado.mockResolvedValue(view({ outrasUnidades: [{ unitId: 'u2', nome: 'Filial Norte' }] }));
    const { container } = render(<AssinadorLocalSection unitId="u1" />);
    expect(await screen.findByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Caixa Balcão')).toBeInTheDocument();
    expect(screen.getByText(/11\.444\.777/)).toBeInTheDocument();
    expect(screen.getByText(/07\/11\/2027/)).toBeInTheDocument();
    expect(screen.getByText(/abcdef12…9876fedc/)).toBeInTheDocument();
    expect(screen.getByText('detectado')).toBeInTheDocument();
    expect(screen.getByText('Homologação')).toBeInTheDocument();
    expect(screen.getByText('Filial Norte')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Invalid Date|undefined/);
  });

  it('FA-6/A3: fora do ar, nunca visto, token ausente, vencido e versão antiga — cada um pelo texto', async () => {
    svc.getEstado.mockResolvedValue(view({ online: false, lastSeenAt: null, tokenPresente: false, diasParaVencer: -3, versaoAssinador: '0.9.0' }));
    const { container } = render(<AssinadorLocalSection unitId="u1" />);
    expect(await screen.findByText('Fora do ar')).toBeInTheDocument();
    expect(screen.getByText('nunca')).toBeInTheDocument();
    expect(screen.getByText(/token ou cartão do certificado não foi detectado/)).toBeInTheDocument();
    expect(screen.getByText(/certificado do assinador está vencido/)).toBeInTheDocument();
    expect(screen.getByText(/anterior à mínima exigida/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/NaN|Invalid Date|undefined/);
  });

  it('FA-17/A3: os textos de erro e de estado existem em pt e em en, diferentes entre si', () => {
    const a = (pt as { dfe: { assinador: Record<string, unknown> } }).dfe.assinador;
    const b = (en as { dfe: { assinador: Record<string, unknown> } }).dfe.assinador;
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    for (const k of ['fora', 'semPareamento', 'codigoExpirado']) {
      expect(typeof a[k]).toBe('string');
      expect(typeof b[k]).toBe('string');
      expect(a[k]).not.toBe(b[k]);
    }
    const avisoPt = a.aviso as Record<string, string>;
    const avisoEn = b.aviso as Record<string, string>;
    expect(avisoEn['versao-antiga']).toMatch(/older than the required minimum/);
    expect(avisoPt['versao-antiga']).toMatch(/anterior à mínima exigida/);
  });

  it('FA-4: trocar de unidade com a 1ª resposta atrasada ⇒ a tela mostra só a da 2ª', async () => {
    let soltarPrimeira: (v: DfeSignerView) => void = () => undefined;
    svc.getEstado
      .mockImplementationOnce(() => new Promise((r) => { soltarPrimeira = r; }))
      .mockResolvedValueOnce(view({ nome: 'Caixa da Unidade 2' }));
    const { rerender } = render(<AssinadorLocalSection unitId="u1" />);
    rerender(<AssinadorLocalSection unitId="u2" />);
    expect(await screen.findByText('Caixa da Unidade 2')).toBeInTheDocument();
    await act(async () => soltarPrimeira(view({ nome: 'Caixa da Unidade 1' })));
    expect(screen.queryByText('Caixa da Unidade 1')).toBeNull();
    expect(screen.getByText('Caixa da Unidade 2')).toBeInTheDocument();
  });

  it('FA-4: erro de carga ⇒ mensagem do servidor e "tentar de novo" relê', async () => {
    svc.getEstado.mockRejectedValueOnce({ status: 500, error: 'Banco indisponível' }).mockResolvedValueOnce(null);
    render(<AssinadorLocalSection unitId="u1" />);
    expect(await screen.findByText('Banco indisponível')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByText(/Nenhum assinador pareado/)).toBeInTheDocument();
  });

  it('FA-7: o código aparece agrupado; depois de expirar some e oferece outro; fechar e reabrir não o mostra; nada no localStorage', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    svc.gerarCodigo.mockResolvedValue({ codigo: 'ABCDEFGHJKMN', expiraEm: new Date(Date.now() + 60_000).toISOString() });
    render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar código de pareamento' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('codigo-pareamento')).toHaveTextContent('ABCD EFGH JKMN');
    await act(async () => { vi.advanceTimersByTime(61_000); });
    expect(within(dialog).queryByTestId('codigo-pareamento')).toBeNull();
    expect(within(dialog).getByText('O código expirou.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Gerar outro' })).toBeInTheDocument();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('FA-7: fechar o modal descarta o código (não há como revê-lo)', async () => {
    svc.gerarCodigo.mockResolvedValue({ codigo: 'ABCDEFGHJKMN', expiraEm: new Date(Date.now() + 600_000).toISOString() });
    render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar código de pareamento' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('codigo-pareamento')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('codigo-pareamento')).toBeNull());
    expect(document.body.textContent).not.toContain('ABCD EFGH JKMN');
  });

  it('FA-8: com o modal aberto, a releitura que traz o dispositivo fecha o modal e avisa "pareado"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    svc.gerarCodigo.mockResolvedValue({ codigo: 'ABCDEFGHJKMN', expiraEm: new Date(Date.now() + 600_000).toISOString() });
    render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar código de pareamento' }));
    await screen.findByRole('dialog');
    svc.getEstado.mockResolvedValue(view());
    await act(async () => { vi.advanceTimersByTime(RELEITURA_MS); });
    expect(await screen.findByText('Assinador pareado.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Caixa Balcão')).toBeInTheDocument();
  });

  it('FA-4: o código pedido na unidade 1 que chega depois da troca para a unidade 2 não aparece', async () => {
    let soltar: (v: { codigo: string; expiraEm: string }) => void = () => undefined;
    svc.gerarCodigo.mockImplementationOnce(() => new Promise((r) => { soltar = r; }));
    const { rerender } = render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar código de pareamento' }));
    rerender(<AssinadorLocalSection unitId="u2" />);
    await act(async () => soltar({ codigo: 'ABCDEFGHJKMN', expiraEm: new Date(Date.now() + 600_000).toISOString() }));
    expect(screen.queryByTestId('codigo-pareamento')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(svc.gerarCodigo).toHaveBeenCalledWith('u1');
  });

  it('FA-10: com assinador pareado, o modal avisa que o pareamento novo substitui o atual', async () => {
    svc.getEstado.mockResolvedValue(view());
    svc.gerarCodigo.mockResolvedValue({ codigo: 'ABCDEFGHJKMN', expiraEm: new Date(Date.now() + 600_000).toISOString() });
    render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar código de pareamento' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/substitui o atual/)).toBeInTheDocument();
  });

  it('FA-11: 403 ao gerar ⇒ mensagem do servidor, sem modal de código', async () => {
    svc.gerarCodigo.mockRejectedValue({ status: 403, error: 'Você não tem permissão para gerenciar o assinador local desta unidade.' });
    render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar código de pareamento' }));
    expect(await screen.findByText('Você não tem permissão para gerenciar o assinador local desta unidade.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('FA-9: cancelar a revogação não chama o serviço; confirmar chama uma vez e volta a "sem pareamento"', async () => {
    svc.getEstado.mockResolvedValue(view({ outrasUnidades: [{ unitId: 'u2', nome: 'Filial Norte' }] }));
    svc.revogar.mockResolvedValue(undefined);
    render(<AssinadorLocalSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revogar' }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/O caixa para de assinar nesta unidade/)).toBeInTheDocument();
    expect(within(dialog).getByText(/continua atendendo/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(svc.revogar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Revogar' }));
    dialog = await screen.findByRole('dialog');
    svc.getEstado.mockResolvedValue(null);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Revogar' }));
    expect(await screen.findByText(/Nenhum assinador pareado/)).toBeInTheDocument();
    expect(svc.revogar).toHaveBeenCalledTimes(1);
    expect(svc.revogar).toHaveBeenCalledWith('u1');
  });

  it('FA-15: com a aba escondida a releitura não chama; ao voltar a visível, uma chamada', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<AssinadorLocalSection unitId="u1" />);
    await screen.findByText(/Nenhum assinador pareado/);
    expect(svc.getEstado).toHaveBeenCalledTimes(1);
    setVisibility('hidden');
    await act(async () => { vi.advanceTimersByTime(RELEITURA_MS * 2); });
    expect(svc.getEstado).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(svc.getEstado).toHaveBeenCalledTimes(2);
  });
});
