/** BE-INCR-IRRF-DISTRIBUICAO PR-1 (itens 1–3) — regras puras da vigência e do DTO do sócio. */
import { CreatePartnerSchema } from '../../dtos/PartnerDto';
import { cnpjCheckDigits } from '../../../../lib/cnpj';
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

describe('Partner — CNPJ alfanumérico (IN RFB 2.229/2024; Onda 3.1)', () => {
  const ALFA_PJ = `${'12ABC34501DE'}${cnpjCheckDigits('12ABC34501DE')}`;

  it('o vetor de teste é o DV certo da lib (não um número mágico)', () => {
    expect(cnpjCheckDigits('12ABC34501DE')).toBe('35');
    expect(ALFA_PJ).toBe('12ABC34501DE35');
  });

  it('sócio PJ com CNPJ alfanumérico e DV certo é aceito e vira PJ', () => {
    expect(CreatePartnerSchema.safeParse({ ...BASE, taxId: ALFA_PJ }).success).toBe(true);
    expect(tipoPessoaDe(ALFA_PJ)).toBe('PJ');
  });

  it('CNPJ alfanumérico com DV errado, minúsculo, mascarado ou com letra no DV → recusa', () => {
    for (const taxId of ['12ABC34501DE36', '12abc34501de35', '12.ABC.345/01DE-35', '12ABC34501DEA5', '12ABC34501D35']) {
      expect([taxId, CreatePartnerSchema.safeParse({ ...BASE, taxId }).success]).toEqual([taxId, false]);
    }
  });

  it('outrasParticipacoes[].cnpj já aceitava o alfanumérico (controle de que a lib e o DTO concordam)', () => {
    const outra = { cnpj: ALFA_PJ, participacaoBp: 1000, empresaNoSimples: false, administrador: false };
    expect(CreatePartnerSchema.safeParse({ ...BASE, outrasParticipacoes: [outra] }).success).toBe(true);
  });
});
