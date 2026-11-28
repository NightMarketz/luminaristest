/** BE-INCR-DP-PONTE-RAZAO itens 37–38 — precedência da folha do DP sobre o histórico digitado (F-PNT-6 a). */
import { AlertaSimplesSchema } from '../../../../dtos/SimplesDto';
import type { FolhaFatorR } from '../../ports/FolhaFatorRPort';
import { precedenciaFolhaFatorR } from '../folhaFatorRPrecedencia';

const dp = (mes: string, folhaCents: bigint, completa: boolean): [string, FolhaFatorR] => [
  mes,
  { mes, folhaCents, origem: 'DP', completa, falta: completa ? null : 'recolhimento de FGTS/CPP (F5)' },
];
const codigos = (r: ReturnType<typeof precedenciaFolhaFatorR>) => r.alertas.map((a) => a.codigo);

describe('itens 37–38 — precedenciaFolhaFatorR', () => {
  it('sem folha do DP: o histórico vale em todo mês, sem alerta (pré-adoção)', () => {
    const r = precedenciaFolhaFatorR(['2026-01', '2026-02'], new Map([['2026-01', 100n]]), new Map());
    expect([...r.folha]).toEqual([['2026-01', 100n], ['2026-02', null]]);
    expect(r.alertas).toEqual([]);
  });

  it('DP completo prevalece; histórico digitado no mesmo mês ⇒ HISTORICO_FOLHA_IGNORADO + leitura provisória', () => {
    const r = precedenciaFolhaFatorR(['2026-01', '2026-02'], new Map([['2026-01', 100n], ['2026-02', 50n]]), new Map([dp('2026-01', 999n, true)]));
    expect(r.folha.get('2026-01')).toBe(999n);
    expect(r.folha.get('2026-02')).toBe(50n);
    expect(codigos(r)).toEqual(['HISTORICO_FOLHA_IGNORADO', 'FOLHA_FATOR_R_LEITURA_PROVISORIA']);
    expect(r.alertas[0].detalhe).toContain('2026-01');
    expect(r.alertas[0].detalhe).not.toContain('2026-02');
  });

  it('DP completo sem histórico no mês: só a leitura provisória (item 38)', () => {
    const r = precedenciaFolhaFatorR(['2026-01'], new Map(), new Map([dp('2026-01', 999n, true)]));
    expect(r.folha.get('2026-01')).toBe(999n);
    expect(codigos(r)).toEqual(['FOLHA_FATOR_R_LEITURA_PROVISORIA']);
  });

  it('DP incompleto: o histórico manda, com FOLHA_DP_INCOMPLETA dizendo o mês e o que falta; sem leitura provisória', () => {
    const r = precedenciaFolhaFatorR(['2026-01'], new Map([['2026-01', 100n]]), new Map([dp('2026-01', 999n, false)]));
    expect(r.folha.get('2026-01')).toBe(100n);
    expect(codigos(r)).toEqual(['FOLHA_DP_INCOMPLETA']);
    expect(r.alertas[0].detalhe).toContain('2026-01 (falta recolhimento de FGTS/CPP (F5))');
  });

  it('DP incompleto e sem histórico: o mês fica sem folha (null), como hoje', () => {
    const r = precedenciaFolhaFatorR(['2026-01'], new Map(), new Map([dp('2026-01', 999n, false)]));
    expect(r.folha.get('2026-01')).toBeNull();
  });

  it('mês fora da lista (fora da janela do RBT12) não entra nem alerta', () => {
    const r = precedenciaFolhaFatorR(['2026-02'], new Map([['2025-01', 1n]]), new Map([dp('2025-01', 999n, true), dp('2025-02', 5n, false)]));
    expect(r.folha.has('2025-01')).toBe(false);
    expect(r.alertas).toEqual([]);
  });

  it('todo alerta emitido cumpre o contrato de saída (AlertaSimplesSchema)', () => {
    const r = precedenciaFolhaFatorR(['2026-01', '2026-02'], new Map([['2026-01', 1n]]), new Map([dp('2026-01', 2n, true), dp('2026-02', 3n, false)]));
    expect(r.alertas).toHaveLength(3);
    for (const a of r.alertas) expect(AlertaSimplesSchema.safeParse(a).success).toBe(true);
  });
});
