/**
 * BE-INCR-DP-F0-F1 itens 24, 26 e 27 (PR-2) — o leitor da folha sobre o banco migrado (cargas reais: a do DP e as de
 * F5 que o DP só lê), pela `fotografia` do `LegalParameterService`, como o F2 vai ler.
 */
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { exigirLinhaVigente, ParametroLegalAusenteError } from '../../../legalParameters/models/legalParameter';
import { parametrosFolha, TABELAS_PARAMETROS_FOLHA } from '../parametrosFolha';

describe('DP-F0-F1 PR-2 — parâmetros da folha com as cargas reais', () => {
  beforeAll(() => pushTestSchema());
  afterEach(() => resetDb());
  afterAll(() => disconnectDb());

  const fotografia = () => getFactory().getLegalParameterService().fotografia(TABELAS_PARAMETROS_FOLHA);

  it('item 26 — em 2026-03-15: 4 faixas do INSS, teto, FGTS 8% e 2%, CI 11%, patronal 20%, mínimo e IRRF', async () => {
    const p = parametrosFolha(await fotografia(), '2026-03-15');
    expect(p.inssEmpregado).toEqual([
      { ateCents: 162100n, aliquotaBp: 750 },
      { ateCents: 290284n, aliquotaBp: 900 },
      { ateCents: 435427n, aliquotaBp: 1200 },
      { ateCents: null, aliquotaBp: 1400 },
    ]);
    expect([p.tetoRgpsCents, p.fgtsBp, p.fgtsAprendizBp, p.ciSeguradoBp, p.patronalBp, p.salarioMinimoCents]).toEqual([847555n, 800, 200, 1100, 2000, 162100n]);
    expect(p.irrf.faixas.length).toBeGreaterThan(0);
    expect(p.irrf.reducaoArt3A).not.toBeNull();
    expect(p.irrf.dependenteCents).toBeGreaterThan(0n);
    expect(p.irrf.descontoSimplificadoBp).toBeGreaterThan(0);
  });

  it('item 26 — em 2025-12-31 ⇒ ParametroLegalAusenteError("INSS_EMPREGADO"): nunca cai na tabela de outro ano', async () => {
    const f = await fotografia();
    expect(() => parametrosFolha(f, '2025-12-31')).toThrow(ParametroLegalAusenteError);
    expect(() => parametrosFolha(f, '2025-12-31')).toThrow(/INSS_EMPREGADO/);
  });

  it('item 27 — em 2026, o limite da FAIXA_1 do INSS é o salário mínimo (EC 103 art. 28 I: "até 1 (um) salário-mínimo")', async () => {
    const f = await fotografia();
    for (const data of ['2026-01-01', '2026-06-30', '2026-12-31']) {
      expect(parametrosFolha(f, data).inssEmpregado[0].ateCents).toBe(BigInt(exigirLinhaVigente(f, 'SALARIO_MINIMO', 'NACIONAL', data).valorInt ?? -1));
    }
  });

  it('item 24 — nenhuma linha publicada fora do formato depois da carga', async () => {
    expect(await getFactory().getLegalParameterService().linhasPublicadasForaDoFormato()).toEqual([]);
  });
});
