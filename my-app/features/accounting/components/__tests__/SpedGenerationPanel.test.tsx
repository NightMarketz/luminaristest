import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import { SpedGenerationPanel, validateEcdSigners, validateEcfSigners } from '../SpedGenerationPanel';
import { SpedEcfRealPanel } from '../SpedEcfRealPanel';
import type { EcdSigner, EcfSigner } from '../../../../lib/services/sped.service';

// Stub the download service so mounting the panel never touches the network. SpedGenerationPanel
// now mounts SpedEcfRealPanel too (FE-INCR-COMPLIANCE-2), so generateAndDownloadEcfReal is stubbed
// here as well — both panels resolve `../../../../lib/services/sped.service` to the same module.
vi.mock('../../../../lib/services/sped.service', () => ({
  spedService: {
    generateAndDownloadEcd: vi.fn(),
    generateAndDownloadEcf: vi.fn(),
    generateAndDownloadEcfReal: vi.fn(),
  },
}));

const ecd = (o: Partial<EcdSigner> = {}): EcdSigner => ({
  identNom: 'Fulano',
  identCpfCnpj: '12345678901',
  codAssin: '205',
  indRespLegal: 'N',
  ...o,
});
const ecf = (o: Partial<EcfSigner> = {}): EcfSigner => ({
  identNom: 'Fulano',
  identCpfCnpj: '12345678901',
  identQualif: '205',
  indCrc: '',
  email: 'a@b.com',
  fone: '11999999999',
  ...o,
});

describe('validateEcdSigners (J930)', () => {
  it('accepts one legal-rep + one contador(900) + one non-contador', () => {
    const signers = [
      ecd({ codAssin: '900', indRespLegal: 'N', indCrc: 'SP123456/O-8', email: 'c@x.com', fone: '11999999999', ufCrc: 'SP' }),
      ecd({ codAssin: '205', indRespLegal: 'S' }),
    ];
    expect(validateEcdSigners(signers)).toBeNull();
  });

  it('rejects when no legal responsible', () => {
    expect(validateEcdSigners([ecd({ codAssin: '900' }), ecd({ codAssin: '205' })])).toBe('ecdRespLegal');
  });

  it('rejects when two legal responsibles', () => {
    const signers = [ecd({ codAssin: '900', indRespLegal: 'S' }), ecd({ codAssin: '205', indRespLegal: 'S' })];
    expect(validateEcdSigners(signers)).toBe('ecdRespLegal');
  });

  it('rejects when no contador (no 900)', () => {
    expect(validateEcdSigners([ecd({ codAssin: '205', indRespLegal: 'S' })])).toBe('ecdContador');
  });

  it('rejects when only contador (no non-900)', () => {
    const signers = [ecd({ codAssin: '900', indRespLegal: 'S' }), ecd({ codAssin: '900', indRespLegal: 'N' })];
    expect(validateEcdSigners(signers)).toBe('ecdContador');
  });

  it('rejects incomplete rows and empty set', () => {
    expect(validateEcdSigners([])).toBe('signersRequired');
    expect(validateEcdSigners([ecd({ identNom: '  ' })])).toBe('signersIncomplete');
  });
});

describe('validateEcfSigners (0930)', () => {
  it('accepts one contador(900, cpf11, crc) + one non-contador', () => {
    const signers = [
      ecf({ identQualif: '900', identCpfCnpj: '12345678901', indCrc: 'SP-123' }),
      ecf({ identQualif: '205' }),
    ];
    expect(validateEcfSigners(signers)).toBeNull();
  });

  it('rejects more than 2 signers', () => {
    expect(validateEcfSigners([ecf(), ecf(), ecf()])).toBe('ecfSignerCount');
  });

  it('rejects when no contador + non-contador mix', () => {
    expect(validateEcfSigners([ecf({ identQualif: '205' })])).toBe('ecfContador');
  });

  it('rejects contador without CRC', () => {
    const signers = [ecf({ identQualif: '900', identCpfCnpj: '12345678901', indCrc: '' }), ecf({ identQualif: '205' })];
    expect(validateEcfSigners(signers)).toBe('ecfContadorCrc');
  });

  it('rejects contador with CNPJ (not 11-digit CPF)', () => {
    const signers = [ecf({ identQualif: '900', identCpfCnpj: '12345678000199', indCrc: 'SP-1' }), ecf({ identQualif: '205' })];
    expect(validateEcfSigners(signers)).toBe('ecfContadorCrc');
  });
});

// ── Render smoke: all three generation forms mount with their submit buttons ──
// SpedGenerationPanel now also mounts SpedEcfRealPanel (FE-INCR-COMPLIANCE-2, Fork
// F-COMP2-1 → b) — headings/buttons use EXACT matches below so "ECF" (Presumido) and
// "ECF (Real)" (Real) don't collide as substrings of the same regex.
describe('SpedGenerationPanel (render)', () => {
  beforeEach(cleanup);

  it('renders the ECD, ECF and ECF (Real) sections with their submit buttons', () => {
    render(<SpedGenerationPanel unitId="u1" />);
    expect(screen.getByRole('heading', { name: /Gerar SPED ECD/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gerar SPED ECF' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Gerar SPED ECF \(Lucro Real\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar e baixar ECD' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gerar e baixar ECF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gerar e baixar ECF \(Real\)/ })).toBeInTheDocument();
  });

  it('starts each signer editor with exactly one signer row (ECD, ECF, ECF Real)', () => {
    render(<SpedGenerationPanel unitId="u1" />);
    // Three editors seed one row each → three "Adicionar" buttons, three "Remover" controls.
    expect(screen.getAllByRole('button', { name: /Adicionar/ })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /Remover/ })).toHaveLength(3);
  });
});

// ── SpedEcfRealPanel (Lucro Real, esqueleto) ───────────────────────────────────
describe('SpedEcfRealPanel (render + validation)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('always shows the permanent skeleton banner (Fork F-COMP2-4 → a)', () => {
    render(<SpedEcfRealPanel unitId="u1" />);
    expect(screen.getByText(/Esqueleto — blocos L, M e N saem vazios/)).toBeInTheDocument();
  });

  it('pre-fills formaTrib editable with the server default (Fork F-COMP2-2 → b)', () => {
    render(<SpedEcfRealPanel unitId="u1" />);
    const formaTribInput = screen.getByPlaceholderText('1') as HTMLInputElement;
    expect(formaTribInput.value).toBe('1');
  });

  it('blocks submit client-side when formaTribPer is not exactly 4 characters', async () => {
    const { spedService } = await import('../../../../lib/services/sped.service');
    render(<SpedEcfRealPanel unitId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /Gerar e baixar ECF \(Real\)/ }));
    expect(screen.getByText(/deve ter exatamente 4 posições/)).toBeInTheDocument();
    expect(spedService.generateAndDownloadEcfReal).not.toHaveBeenCalled();
  });

  it('sends a payload without formaApur once formaTribPer and signers are valid', async () => {
    const { spedService } = await import('../../../../lib/services/sped.service');
    render(<SpedEcfRealPanel unitId="u1" />);

    fireEvent.change(screen.getByPlaceholderText('PPPP'), { target: { value: 'PPPP' } });
    fireEvent.change(screen.getByPlaceholderText('14 dígitos'), { target: { value: '12345678000199' } });

    // Signer row (0930): contador (900, CPF 11, CRC) + non-contador — same shape as the
    // Presumido form (validateEcfSigners reused as-is — fiação, não regra nova, item 23).
    fireEvent.change(screen.getAllByPlaceholderText('Nome')[0], { target: { value: 'Fulano' } });
    fireEvent.change(screen.getAllByPlaceholderText('CPF/CNPJ')[0], { target: { value: '12345678901' } });
    fireEvent.change(screen.getAllByPlaceholderText('Qualif. (900=contador)')[0], { target: { value: '900' } });
    fireEvent.change(screen.getAllByPlaceholderText('CRC')[0], { target: { value: 'SP-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Adicionar/ }));
    fireEvent.change(screen.getAllByPlaceholderText('Nome')[1], { target: { value: 'Beltrano' } });
    fireEvent.change(screen.getAllByPlaceholderText('CPF/CNPJ')[1], { target: { value: '98765432100' } });
    fireEvent.change(screen.getAllByPlaceholderText('Qualif. (900=contador)')[1], { target: { value: '205' } });

    fireEvent.click(screen.getByRole('button', { name: /Gerar e baixar ECF \(Real\)/ }));

    await waitFor(() => expect(spedService.generateAndDownloadEcfReal).toHaveBeenCalledTimes(1));
    const payload = (spedService.generateAndDownloadEcfReal as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(payload.fiscal).toEqual({
      formaTrib: '1',
      formaTribPer: 'PPPP',
      indAliqCsll: '1',
      indRecReceita: '2',
    });
    expect(payload.fiscal).not.toHaveProperty('formaApur');
  });
});

// ── GAP-MAP N3 "SPED ECD pela tela" — J930 no contrato do SignerSchema (BRIEF FE-FIX-SPED-ECD-SIGNERS §2) ──
// Desde o C12 (#353, `edb80ec8`) o SignerSchema do J930 (`server/src/features/accounting/dtos/SpedEcdDto.ts:135-210`)
// é `.strict()` SEM `identQualif` e, com codAssin='900', exige indCrc + email + fone + ufCrc (REGRA_OBRIGATORIO_CONTADOR,
// Manual ECD L9 p. 202) — chave opcional com '' também é 400. Sondas 28/09 (SpedEcdRequestSchema.safeParse):
// payload da tela → unrecognized_keys ["identQualif"]; sem ela → 4 issues no contador; com os 4 e sem vazios → OK.
// Os testes do FE mockam o service, por isso a regressão passou verde: aqui a asserção é sobre o payload.
describe('SpedGenerationPanel — J930 no contrato do SignerSchema (GAP-MAP N3)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('cada linha oferece CRC/E-mail/Fone/UF do CRC e o payload sai no contrato (sem identQualif; contador com os 4; vazio omitido)', async () => {
    const { spedService } = await import('../../../../lib/services/sped.service');
    render(<SpedGenerationPanel unitId="u1" />);
    const section = screen.getByRole('heading', { name: /Gerar SPED ECD/ }).closest('section') as HTMLElement;
    const ecdForm = within(section);
    fireEvent.click(ecdForm.getByRole('button', { name: /Adicionar/ }));

    // O contador (900) só é aceito pelo BE com os 4 campos — a linha tem de oferecê-los (F-3 → a: em toda linha).
    expect(ecdForm.queryAllByPlaceholderText('CRC')).toHaveLength(2);
    expect(ecdForm.queryAllByPlaceholderText('E-mail')).toHaveLength(2);
    expect(ecdForm.queryAllByPlaceholderText('Fone')).toHaveLength(2);
    expect(ecdForm.queryAllByLabelText('UF do CRC')).toHaveLength(2); // F-2 → a: <select> de UF

    fireEvent.change(ecdForm.getByPlaceholderText('2026'), { target: { value: '2026' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('Nome')[0], { target: { value: 'Contador' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('CPF/CNPJ')[0], { target: { value: '11144477735' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('Cód. (900=contador)')[0], { target: { value: '900' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('CRC')[0], { target: { value: 'SP123456/O-8' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('E-mail')[0], { target: { value: 'c@x.com' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('Fone')[0], { target: { value: '11999999999' } });
    fireEvent.change(ecdForm.getAllByLabelText('UF do CRC')[0], { target: { value: 'SP' } });
    // Linha 2: não-contador, responsável legal, CRC/e-mail/fone/UF em branco.
    fireEvent.change(ecdForm.getAllByPlaceholderText('Nome')[1], { target: { value: 'Sócio' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('CPF/CNPJ')[1], { target: { value: '52998224725' } });
    fireEvent.change(ecdForm.getAllByPlaceholderText('Cód. (900=contador)')[1], { target: { value: '205' } });
    fireEvent.change(ecdForm.getAllByDisplayValue('Não resp. legal')[1], { target: { value: 'S' } });

    fireEvent.click(ecdForm.getByRole('button', { name: 'Gerar e baixar ECD' }));

    await waitFor(() => expect(spedService.generateAndDownloadEcd).toHaveBeenCalledTimes(1));
    const payload = (spedService.generateAndDownloadEcd as ReturnType<typeof vi.fn>).mock.calls[0][0];
    for (const signer of payload.signers) expect(signer).not.toHaveProperty('identQualif');
    // toStrictEqual: chave com '' ou undefined reprova — o BE recusa '' (F6 do BRIEF).
    expect(payload.signers).toStrictEqual([
      {
        identNom: 'Contador', identCpfCnpj: '11144477735', codAssin: '900', indRespLegal: 'N',
        indCrc: 'SP123456/O-8', email: 'c@x.com', fone: '11999999999', ufCrc: 'SP',
      },
      { identNom: 'Sócio', identCpfCnpj: '52998224725', codAssin: '205', indRespLegal: 'S' },
    ]);
  });

  it('validateEcdSigners: contador (900) exige CPF de 11 dígitos + CRC + e-mail + fone + UF do CRC', () => {
    const crc = { indCrc: 'SP123456/O-8', email: 'c@x.com', fone: '11999999999', ufCrc: 'SP' };
    const socio = ecd({ codAssin: '205', indRespLegal: 'S' });
    const contador = (o: Record<string, string> = {}) => ecd({ codAssin: '900', identCpfCnpj: '11144477735', ...crc, ...o });
    expect(validateEcdSigners([contador(), socio])).toBeNull();
    for (const k of ['indCrc', 'email', 'fone', 'ufCrc']) {
      expect(validateEcdSigners([contador({ [k]: ' ' }), socio]), k).toBe('ecdContadorCrc');
    }
    expect(validateEcdSigners([contador({ identCpfCnpj: '11222333000181' }), socio])).toBe('ecdContadorCrc');
  });
});
