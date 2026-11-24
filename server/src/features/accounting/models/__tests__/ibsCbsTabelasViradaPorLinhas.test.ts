import { LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ParametroLegalAusenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { tabelasIbsCbsDe } from '../ibsCbsTabelas';
import { ibsCbsDoProduto } from '../nfeIbsCbsMontagem';

/**
 * Onda 3.2 fatia 5 (dono, 24/11/2026) — VIRADA SÓ POR LINHAS na montagem do item: o `ibsCbsDoProduto` recebe a fotografia lida
 * como `TabelasIbsCbs` e a vigência do cClassTrib (antes `dIniVig`/`dFimVig` da const) é o `vigenteDesde`/`vigenteAte` da
 * linha. Trocar só a linha muda o faltante, sem mexer em código. (A assinatura nova impede rodar este caso contra a const: o
 * caso vermelho-antes está em `NfeIbsCbsDto.viradaPorLinhas.test.ts`, que só usa API que já existia.)
 */
const seed = () => legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS) as LinhaLegal[];
const perfil = { ibsCbsCst: '000', ibsCbsClassTrib: '000001' };
const faltantes = (linhas: LinhaLegal[], data: string, mod: 55 | 65 = 65): string => {
  const r = ibsCbsDoProduto('p1', perfil, mod, data, tabelasIbsCbsDe(linhas, data));
  return 'faltantes' in r ? r.faltantes.join(' | ') : '';
};
const mudaLinha = (linhas: LinhaLegal[], id: string, patch: Partial<LinhaLegal>): LinhaLegal[] => linhas.map((l) => (l.id === id ? { ...l, ...patch } : l));

describe('virada só por linhas — ibsCbsDoProduto', () => {
  it('seed: 000001 está vigente desde 2026-01-01, sem fim — nenhum faltante', () => {
    expect(faltantes(seed(), '2026-10-27')).toBe('');
    expect(faltantes(seed(), '2030-01-01')).toBe('');
  });

  it('trocar só o vigenteAte da linha para 2026-06-30 ⇒ "fora da vigência" depois dessa data e nenhum faltante antes', () => {
    const l = mudaLinha(seed(), 'ibscbs-cclass-000001', { vigenteAte: '2026-06-30' });
    expect(faltantes(l, '2026-10-27')).toContain('cClassTrib 000001 fora da vigência (2026-01-01–2026-06-30, IT 2025.002 v1.70)');
    expect(faltantes(l, '2026-06-30')).toBe('');
  });

  it('trocar só o vigenteDesde para 2027-01-01 ⇒ "fora da vigência" em 2026', () => {
    const l = mudaLinha(seed(), 'ibscbs-cclass-000001', { vigenteDesde: '2027-01-01' });
    expect(faltantes(l, '2026-10-27')).toContain('fora da vigência (2027-01-01–…');
    expect(faltantes(l, '2027-01-01')).toBe('');
  });

  it('trocar só o indicador de modelo da linha ⇒ UB14-25 (rej. 1025)', () => {
    const l = seed().map((x) => (x.id === 'ibscbs-cclass-000001' ? { ...x, valorJson: JSON.stringify({ ...JSON.parse(x.valorJson ?? '{}'), indNFCe: 0 }) } : x));
    expect(faltantes(l, '2026-10-27', 65)).toContain('UB14-25, rej. 1025');
    expect(faltantes(l, '2026-10-27', 55)).toBe('');
  });

  it('sem linha de CST ⇒ PARAMETRO_LEGAL_AUSENTE (fail-closed); sem o código dentro de tabela existente ⇒ inexistente', () => {
    expect(() => faltantes(seed().filter((l) => l.tabela !== 'CST_IBS_CBS'), '2026-10-27')).toThrow(ParametroLegalAusenteError);
    expect(faltantes(seed().filter((l) => l.id !== 'ibscbs-cclass-000001'), '2026-10-27')).toContain('UB14-10, rej. 1023');
  });
});
