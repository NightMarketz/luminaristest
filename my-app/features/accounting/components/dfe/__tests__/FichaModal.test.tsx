import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { FichaModal, buildFichaSections } from '../FichaModal';
import { dfeService } from '../../../../../lib/services/dfe.service';
import { doc, ficha, simplesPayload } from './fixtures';

/**
 * FichaModal (FE-INCR-DFE itens 18–19): as 4 seções na ordem do portal; DPS do Simples mostra pTotTribSN e não os três
 * pTotTrib; copiar vServ escreve `1234,56`; ambiente do documento × do servidor → faixa âmbar; link do portal só em
 * produção; campos conferidos pela releitura levam a marca.
 */
vi.mock('../../../../../lib/services/dfe.service', () => ({ dfeService: { ficha: vi.fn() } }));

const idt = (_k: string, fallback: string) => fallback;

function renderFicha(over: Parameters<typeof doc>[0] = {}, serverAmbiente: 'producao' | 'homologacao' | null = 'homologacao') {
  return render(
    <FichaModal doc={doc(over)} unitId="u1" serverAmbiente={serverAmbiente} onClose={vi.fn()} onRetorno={vi.fn()} />,
  );
}

describe('FichaModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dfeService.ficha).mockResolvedValue(ficha());
  });
  afterEach(async () => { await new Promise((r) => setTimeout(r, 0)); cleanup(); });

  it('as 4 seções saem na ordem do portal (Pessoas, Serviço, Valores, Emitir)', async () => {
    renderFicha();
    await screen.findByTestId('ficha-section-pessoas');
    const ids = screen.getAllByTestId(/^ficha-section-/).map((el) => el.getAttribute('data-testid'));
    expect(ids).toEqual(['ficha-section-pessoas', 'ficha-section-servico', 'ficha-section-valores', 'ficha-section-emitir']);
    expect(dfeService.ficha).toHaveBeenCalledWith('d1', 'u1');
  });

  it('Simples: pTotTribSN aparece e os três pTotTrib não; valores no formato do portal', async () => {
    renderFicha();
    await screen.findByTestId('ficha-section-valores');
    expect(screen.getByTestId('ficha-value-pTotTribSN')).toHaveTextContent('6,00');
    expect(screen.queryByTestId('ficha-row-pTotTribFed')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ficha-row-pTotTribEst')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ficha-row-pTotTribMun')).not.toBeInTheDocument();
    expect(screen.getByTestId('ficha-value-dCompet')).toHaveTextContent('06/10/2026');
    expect(screen.getByTestId('ficha-value-cTribNac')).toHaveTextContent('06.01.01');
    expect(screen.getByTestId('ficha-value-tomaDoc')).toHaveTextContent('12345678909');
    // local da prestação = município do emitente ⇒ instrução (F-FE-DFE-7 a)
    expect(within(screen.getByTestId('ficha-row-cLocPrestacao')).getByText('O mesmo município do emitente.')).toBeInTheDocument();
    // tributação federal do Simples é instrução, não valor (G8)
    expect(within(screen.getByTestId('ficha-row-tribFed')).getByText(/Já preenchida pelo Simples/)).toBeInTheDocument();
  });

  it('copiar vServ escreve 1234,56 no clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderFicha();
    const row = await screen.findByTestId('ficha-row-vServ');
    fireEvent.click(within(row).getByRole('button', { name: /Copiar/ }));
    expect(writeText).toHaveBeenCalledWith('1234,56');
    expect(within(row).getByText('Copiado')).toBeInTheDocument();
  });

  it('campo conferido pela releitura leva a marca; instrução não', async () => {
    renderFicha();
    const vServ = await screen.findByTestId('ficha-row-vServ');
    expect(within(vServ).getByText('conferido na volta')).toBeInTheDocument();
    expect(within(screen.getByTestId('ficha-row-emitente')).queryByText('conferido na volta')).not.toBeInTheDocument();
  });

  it('ambiente: documento de homologação com servidor em produção → faixa âmbar; sem link do portal', async () => {
    renderFicha({ ambiente: 'homologacao' }, 'producao');
    await screen.findByTestId('ficha-section-pessoas');
    expect(screen.getByTestId('ficha-ambiente')).toHaveTextContent('Homologação');
    expect(screen.getByTestId('ficha-ambiente-divergente')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Emissor Nacional/ })).not.toBeInTheDocument();
  });

  it('ambiente igual → sem faixa; documento de produção leva o link do portal', async () => {
    renderFicha({ ambiente: 'producao' }, 'producao');
    await screen.findByTestId('ficha-section-pessoas');
    expect(screen.queryByTestId('ficha-ambiente-divergente')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Emissor Nacional/ })).toHaveAttribute('href', 'https://www.nfse.gov.br/EmissorNacional');
  });

  it('documento SENT do parceiro manual traz o upload do retorno; AUTHORIZED não', async () => {
    renderFicha({ status: 'SENT' });
    await screen.findByTestId('ficha-section-pessoas');
    expect(screen.getByTestId('retorno-manual-form')).toBeInTheDocument();
    cleanup();
    renderFicha({ status: 'AUTHORIZED' });
    await screen.findByTestId('ficha-section-pessoas');
    expect(screen.queryByTestId('retorno-manual-form')).not.toBeInTheDocument();
  });

  it('buildFichaSections: regime normal mostra os três pTotTrib e manda não informar PIS/COFINS', () => {
    const p = simplesPayload();
    p.infDPS.prest.regTrib = { opSimpNac: 1, regEspTrib: 0 };
    p.infDPS.valores.trib.totTrib = { pTotTrib: { pTotTribFed: '4.15', pTotTribEst: '0.00', pTotTribMun: '2.00' } };
    p.infDPS.valores.trib.tribMun.pAliq = '2.00';
    const rows = buildFichaSections(p, 's1', idt).find((s) => s.id === 'valores')?.rows ?? [];
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId.pTotTribSN).toBeUndefined();
    expect(byId.pTotTribFed.copy).toBe('4,15');
    expect(byId.pTotTribMun.copy).toBe('2,00');
    expect(byId.pAliq.copy).toBe('2,00');
    expect(byId.tribFed.instruction).toBe('Não informe PIS/COFINS.');
    const pessoas = buildFichaSections(p, 's1', idt)[0].rows.map((r) => r.id);
    expect(pessoas).not.toContain('regApTribSN');
  });
});
