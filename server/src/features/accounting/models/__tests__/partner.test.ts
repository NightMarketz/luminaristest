/** BE-INCR-IRRF-DISTRIBUICAO PR-1 (itens 1–3) — regras puras da vigência e do DTO do sócio. */
import { CreatePartnerSchema } from '../../dtos/PartnerDto';
import { somaParticipacaoBp, tipoPessoaDe, vigenciasSeSobrepoem, vigenteEm } from '../partner';

const BASE = { unitId: 'u', nome: 'Maria Sócia', taxId: '52998224725', residenteBrasil: true, participacaoBp: 5000, entradaEm: '2026-01-01' };

describe('Partner — DTO (item 1)', () => {
  it('CPF e CNPJ com DV certo passam; tipoPessoa sai do tamanho', () => {
    expect(CreatePartnerSchema.safeParse(BASE).success).toBe(true);
    expect(CreatePartnerSchema.safeParse({ ...BASE, taxId: '11222333000181' }).success).toBe(true);
    expect([tipoPessoaDe('52998224725'), tipoPessoaDe('11222333000181')]).toEqual(['PF', 'PJ']);
  });

  it('CPF ou CNPJ com DV errado, máscara, tamanho errado, participação fora de 0..10000, saída antes da entrada, chave extra → recusa', () => {
    for (const bad of [
      { taxId: '52998224724' },
      { taxId: '11222333000182' },
      { taxId: '529.982.247-25' },
      { taxId: '5299822472' },
      { participacaoBp: 10001 },
      { participacaoBp: -1 },
      { saidaEm: '2025-12-31' },
      { entradaEm: '2026-02-30' },
      { foo: 1 },
    ]) {
      expect([bad, CreatePartnerSchema.safeParse({ ...BASE, ...bad }).success]).toEqual([bad, false]);
    }
  });

  it('não residente é aceito no cadastro (F-IRD-7: a recusa é dos fluxos de dividendos e JCP)', () => {
    expect(CreatePartnerSchema.safeParse({ ...BASE, residenteBrasil: false }).success).toBe(true);
  });
});

describe('Partner — vigência (itens 2 e 3)', () => {
  it('vigente nas duas pontas, inclusive; saída nula = em aberto', () => {
    const v = { entradaEm: '2026-01-01', saidaEm: '2026-06-30' };
    expect(['2025-12-31', '2026-01-01', '2026-06-30', '2026-07-01'].map((d) => vigenteEm(v, d))).toEqual([false, true, true, false]);
    expect(vigenteEm({ entradaEm: '2026-01-01', saidaEm: null }, '2099-01-01')).toBe(true);
  });

  it('sobreposição: encostar no mesmo dia cruza; dia seguinte não; aberta cruza tudo depois', () => {
    const a = { entradaEm: '2026-01-01', saidaEm: '2026-06-30' };
    expect(vigenciasSeSobrepoem(a, { entradaEm: '2026-06-30', saidaEm: null })).toBe(true);
    expect(vigenciasSeSobrepoem(a, { entradaEm: '2026-07-01', saidaEm: null })).toBe(false);
    expect(vigenciasSeSobrepoem(a, { entradaEm: '2025-01-01', saidaEm: '2025-12-31' })).toBe(false);
    expect(vigenciasSeSobrepoem({ entradaEm: '2026-01-01', saidaEm: null }, { entradaEm: '2030-01-01', saidaEm: '2030-12-31' })).toBe(true);
  });

  it('soma das participações', () => {
    expect(somaParticipacaoBp([{ participacaoBp: 6000 }, { participacaoBp: 3000 }])).toBe(9000);
  });
});
