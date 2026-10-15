/** BE-INCR-SIMPLES-DEFIS-MANUAL (BRIEF itens 1–6 e 8) — contrato dos digitados da DEFIS pelo manual 9.4.3.1. */
import { SimplesDefisDigitadoLeituraSchema, SimplesDefisDigitadoSchema, SimplesDefisUpsertSchema } from '../SimplesDto';

const socio = (participacaoBp: number, contactId = 'ct-1') => ({ contactId, rendimentosIsentosCents: 0, rendimentosTributaveisCents: 0, participacaoBp, irrfCents: 0 });
const base = {
  unitId: 'u1',
  empregadosInicio: 1,
  empregadosFim: 1,
  ganhosCapitalCents: 0,
  ganhosRendaVariavelCents: 0,
  exportacaoDiretaCents: 0,
  exportacaoComercial: [] as Array<{ cnpj: string; valorCents: number }>,
  cotasTesourariaBp: 0,
  socios: [socio(10_000)],
  doacoesEleitorais: [] as unknown[],
};
const ok = (v: unknown) => SimplesDefisUpsertSchema.safeParse(v).success;

describe('item 1 — soma dos sócios + tesouraria = 100% (itens 7.3 e 8)', () => {
  it('60% + 40% ok; 60% + 30% recusa; 60% + 30% + tesouraria 10% ok; 101% recusa', () => {
    expect(ok({ ...base, socios: [socio(6000), socio(4000, 'ct-2')] })).toBe(true);
    expect(ok({ ...base, socios: [socio(6000), socio(3000, 'ct-2')] })).toBe(false);
    expect(ok({ ...base, socios: [socio(6000), socio(3000, 'ct-2')], cotasTesourariaBp: 1000 })).toBe(true);
    expect(ok({ ...base, socios: [socio(6000), socio(4100, 'ct-2')] })).toBe(false);
  });

  it('sem sócios a soma não se aplica', () => {
    expect(ok({ ...base, socios: [] })).toBe(true);
  });
});

describe('itens 2–5 — tesouraria, ganhos de capital, exportação direta e via comercial exportadora', () => {
  it('cotas em tesouraria: inteiro 0..10000 bp', () => {
    expect(ok({ ...base, socios: [socio(9000)], cotasTesourariaBp: 1000 })).toBe(true);
    expect(ok({ ...base, cotasTesourariaBp: 10_001 })).toBe(false);
    expect(ok({ ...base, cotasTesourariaBp: 1.5 })).toBe(false);
  });

  it('ganhos de capital e exportação direta: centavos ≥ 0', () => {
    expect(ok({ ...base, ganhosCapitalCents: 123_45, exportacaoDiretaCents: 50_000 })).toBe(true);
    expect(ok({ ...base, ganhosCapitalCents: -1 })).toBe(false);
    expect(ok({ ...base, exportacaoDiretaCents: 0.5 })).toBe(false);
  });

  it('comercial exportadora: CNPJ com DV (numérico e alfanumérico), valor > 0, sem repetir CNPJ', () => {
    const e = (cnpj: string, valorCents = 100) => ({ cnpj, valorCents });
    expect(ok({ ...base, exportacaoComercial: [e('11222333000181'), e('12ABC34501DE35')] })).toBe(true);
    expect(ok({ ...base, exportacaoComercial: [e('11222333000182')] })).toBe(false); // DV errado
    expect(ok({ ...base, exportacaoComercial: [e('11.222.333/0001-81')] })).toBe(false); // máscara
    expect(ok({ ...base, exportacaoComercial: [e('11222333000181', 0)] })).toBe(false);
    expect(ok({ ...base, exportacaoComercial: [e('11222333000181'), e('11222333000181', 5)] })).toBe(false);
  });
});

describe('item 6 (manual item 9) — doações à campanha eleitoral (p. 92, telas 9.1–9.4)', () => {
  const d = (over: Record<string, unknown> = {}) => ({ cnpj: '11222333000181', tipoBeneficiario: 'PARTIDO_POLITICO', formaDoacao: 'TRANSFERENCIA_ELETRONICA', valorCents: 1000, ...over });
  it('CNPJ com DV + tipo (3) + forma (7) + valor > 0; o mesmo CNPJ pode repetir', () => {
    expect(ok({ ...base, doacoesEleitorais: [d(), d({ formaDoacao: 'BENS' })] })).toBe(true);
    expect(ok({ ...base, doacoesEleitorais: [d({ tipoBeneficiario: 'OUTRO' })] })).toBe(false);
    expect(ok({ ...base, doacoesEleitorais: [d({ formaDoacao: 'PIX' })] })).toBe(false);
    expect(ok({ ...base, doacoesEleitorais: [d({ valorCents: 0 })] })).toBe(false);
    expect(ok({ ...base, doacoesEleitorais: [d({ cnpj: '11222333000182' })] })).toBe(false);
  });
});

describe('item 8 — linha gravada no formato antigo', () => {
  const antigo = { empregadosInicio: 2, empregadosFim: 3, ganhosRendaVariavelCents: 0, socios: [socio(10_000)] };
  it('a escrita exige os campos novos (sem default no schema de escrita)', () => {
    expect(SimplesDefisDigitadoSchema.safeParse(antigo).success).toBe(false);
    expect(ok({ unitId: 'u1', ...antigo })).toBe(false);
  });
  it('a leitura completa com 0 / []', () => {
    expect(SimplesDefisDigitadoLeituraSchema.parse(antigo)).toEqual({
      ...antigo,
      ganhosCapitalCents: 0,
      exportacaoDiretaCents: 0,
      exportacaoComercial: [],
      cotasTesourariaBp: 0,
      doacoesEleitorais: [],
    });
  });
});
