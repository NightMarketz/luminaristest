/**
 * BE-INCR-DP-F0-F1 itens 30, 33 e 34 (PR-3) — domínio `tpJornada` conferido contra o leiaute do dossiê [D09], leitor
 * puro `parametroCctVigente` e contenção de vigência.
 */
import fs from 'fs';
import path from 'path';
import { CCT_CHAVES, TP_JORNADA, parametroCctVigente, vigenciaContida, type ParametroCct } from '../cadastros';

const D09 = path.resolve(__dirname, '../../../../../../pesquisas-legais/brief-pes4-f0-f1/docs/D09_index-html.html');

const p = (o: Partial<ParametroCct> & { vigenteDesde: string }): ParametroCct & { id: string } => ({
  id: o.vigenteDesde,
  chave: 'PISO_SALARIAL_CENTS',
  discriminador: 'cargo-a',
  valorInt: 100n,
  vigenteAte: null,
  deletedAt: null,
  ...o,
});

describe('cadastros do DP (itens 30, 33, 34)', () => {
  it('item 30 — TP_JORNADA = itens do campo tpJornada do S-2200 no leiaute [D09]', () => {
    const html = fs.readFileSync(D09, 'utf8');
    const i = html.indexOf('id="2200_vinculo_infoContrato_horContratual_tpJornada"');
    expect(i).toBeGreaterThan(0);
    const celula = html.slice(i, html.indexOf('</tr>', i));
    const itens = [...celula.matchAll(/<strong>(\d+)<\/strong>\s*-\s*([^<]+)/g)].map((m) => [m[1], m[2].replace(/\s+/g, ' ').trim()]);
    expect(Object.fromEntries(itens)).toEqual(TP_JORNADA);
  });

  it('item 33 — CCT_CHAVES no F1 é só o piso', () => {
    expect(CCT_CHAVES).toEqual(['PISO_SALARIAL_CENTS']);
  });

  it('item 34 — parametroCctVigente: chave, discriminador, vigência inclusiva, apagado fora, mais recente vence', () => {
    const params = [
      p({ vigenteDesde: '2026-01-01', vigenteAte: '2026-04-30', valorInt: 150000n }),
      p({ vigenteDesde: '2026-05-01', valorInt: 165000n }),
      p({ vigenteDesde: '2026-05-01', discriminador: 'cargo-b', valorInt: 999n }),
      p({ vigenteDesde: '2026-06-01', valorInt: 1n, deletedAt: new Date() }),
    ];
    expect(parametroCctVigente(params, 'PISO_SALARIAL_CENTS', 'cargo-a', '2025-12-31')).toBeUndefined();
    expect(parametroCctVigente(params, 'PISO_SALARIAL_CENTS', 'cargo-a', '2026-04-30')?.valorInt).toBe(150000n);
    expect(parametroCctVigente(params, 'PISO_SALARIAL_CENTS', 'cargo-a', '2026-05-01')?.valorInt).toBe(165000n);
    expect(parametroCctVigente(params, 'PISO_SALARIAL_CENTS', 'cargo-a', '2026-07-01')?.valorInt).toBe(165000n);
    expect(parametroCctVigente(params, 'PISO_SALARIAL_CENTS', 'cargo-b', '2026-07-01')?.valorInt).toBe(999n);
    expect(parametroCctVigente(params, 'PISO_SALARIAL_CENTS', null, '2026-07-01')).toBeUndefined();
  });

  it('item 33 — vigenciaContida: início antes, fim nulo dentro de convenção com fim e fim depois ⇒ false', () => {
    const conv = { vigenteDesde: '2026-01-01', vigenteAte: '2026-12-31' };
    expect(vigenciaContida({ vigenteDesde: '2026-01-01', vigenteAte: '2026-12-31' }, conv)).toBe(true);
    expect(vigenciaContida({ vigenteDesde: '2025-12-31', vigenteAte: '2026-06-30' }, conv)).toBe(false);
    expect(vigenciaContida({ vigenteDesde: '2026-02-01', vigenteAte: null }, conv)).toBe(false);
    expect(vigenciaContida({ vigenteDesde: '2026-02-01', vigenteAte: '2027-01-01' }, conv)).toBe(false);
    expect(vigenciaContida({ vigenteDesde: '2030-01-01', vigenteAte: null }, { vigenteDesde: '2026-01-01', vigenteAte: null })).toBe(true);
  });
});
