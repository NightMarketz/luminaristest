/**
 * BE-INCR-SIMPLES-DEFIS-MANUAL item 7 (F-DM-1 a) — limite do art. 145 § 1º da Res. CGSN 140. Aritmética sobre a tabela
 * semente (32% serviço, 8% revenda), não oráculo: o oráculo é uma DEFIS real entregue (BRIEF §4).
 */
import { limiteIsencaoDefis } from '../simplesDefis';
import { tabelaApuracaoSemente } from '@test/helpers/legalParams';

const T = tabelaApuracaoSemente();
const mem = (...ats: Array<[string, number, number?]>) => ({
  competencia: '2026-01',
  totalCalculadoCents: 0,
  alertas: [],
  atividades: ats.map(([natureza, receitaCents, irpj]) => ({ natureza, receitaCents, anexo: 'III', tributos: irpj === undefined ? {} : { IRPJ: irpj } })),
});

describe('limiteIsencaoDefis', () => {
  it('Σ receita anual por natureza × presunção do IRPJ − IRPJ do DAS', () => {
    // serviço 100.000,00 + 50.000,00 → 32% = 48.000,00; revenda 200.000,00 → 8% = 16.000,00; IRPJ 1.000,00 + 500,00 + 300,00
    const r = limiteIsencaoDefis(2026, [mem(['SERVICO', 10_000_000, 100_000], ['REVENDA', 20_000_000, 30_000]), mem(['SERVICO', 5_000_000, 50_000])], T);
    expect(r.limiteCents).toBe(4_800_000n + 1_600_000n - 180_000n);
    expect(r.irpjDasCents).toBe(180_000n);
    expect(r.avisos).toEqual([]);
  });

  it('natureza sem presunção cadastrada com receita ⇒ limite null + aviso que a nomeia', () => {
    const r = limiteIsencaoDefis(2026, [mem(['SERVICO', 1_000_000, 0], ['PARCERIA_GESTAO', 500_000, 0], ['LOCACAO_MOVEL', 1, 0])], T);
    expect(r.limiteCents).toBeNull();
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toContain('LOCACAO_MOVEL, PARCERIA_GESTAO');
    expect(r.avisos[0]).toContain('art. 145 § 1º');
  });

  it('natureza sem presunção com receita zero não derruba o cálculo', () => {
    expect(limiteIsencaoDefis(2026, [mem(['SERVICO', 1_000_000], ['LOCACAO_MOVEL', 0])], T).limiteCents).toBe(320_000n);
  });

  it('sem apuração ⇒ limite 0', () => {
    expect(limiteIsencaoDefis(2026, [], T).limiteCents).toBe(0n);
  });
});
