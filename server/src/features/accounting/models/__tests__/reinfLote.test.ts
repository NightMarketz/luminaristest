/**
 * BE-INCR-EFD-REINF PR-1 — `montarR4020` (itens 6, 7, 8, 14; invariantes 1, 3, 4, 5, 6). As linhas têm a forma da porta
 * (`WithholdingLineForReinfSchema`); as tabelas, a forma da fotografia de `legal_parameters`.
 */
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { WithholdingLineForReinfSchema, type WithholdingLineForReinf } from '../../dtos/WithholdingDto';
import { AVISO_PF_FORA_DA_REINF, AVISO_R2010_NAO_GERADO, mascararCnpj, montarR4020 } from '../reinfLote';

const linha = (o: Partial<Omit<LinhaLegal, 'id'>> & Pick<LinhaLegal, 'tabela' | 'chave'>): LinhaLegal => ({
  id: `${o.tabela}-${o.chave}-${o.discriminador ?? ''}-${o.vigenteDesde ?? ''}`,
  discriminador: null, valorInt: null, valorTexto: null, valorJson: null, fonte: 'teste', vigenteDesde: '2023-09-01', vigenteAte: null,
  status: 'PUBLISHED', supersedesId: null, ...o,
});
const NAT = (chave: string) =>
  linha({ tabela: 'NATUREZA_RENDIMENTO', chave, valorJson: JSON.stringify({ descricao: 'x', grupo: 15, declarante: 'PJ', tributos: ['IR', 'CSLL', 'COFINS', 'PP', 'AGREGADO'], tiposIsencao: [] }) });
const TABELAS: LinhaLegal[] = [
  NAT('15022'),
  NAT('15043'),
  // A CSRF tem as três contribuições até 2026-12-31 (Lei 10.833 art. 30); depois, só CSLL (LC 214 art. 509).
  linha({ tabela: 'RETENCAO', chave: 'CSRF', discriminador: 'COFINS', valorInt: 300, vigenteDesde: '2004-02-01', vigenteAte: '2026-12-31' }),
  linha({ tabela: 'RETENCAO', chave: 'CSRF', discriminador: 'CSLL', valorInt: 100, vigenteDesde: '2004-02-01' }),
  linha({ tabela: 'RETENCAO_CODIGO', chave: '15022', discriminador: 'IRPJ', valorTexto: '170806' }),
  linha({ tabela: 'RETENCAO_CODIGO', chave: '15022', discriminador: 'AGREGADO', valorTexto: '595207' }),
  linha({ tabela: 'RETENCAO_CODIGO', chave: '15022', discriminador: 'CSLL', valorTexto: '598707' }),
];

const CNPJ_A = '45997418000153';
const CNPJ_B = '19131243000197';
let n = 0;
const l = (o: Partial<WithholdingLineForReinf> & Pick<WithholdingLineForReinf, 'tributo' | 'dataFatoGerador'>): WithholdingLineForReinf =>
  WithholdingLineForReinfSchema.parse({
    id: `w${++n}`,
    event: o.tributo === 'IRRF' ? 'RECOGNITION' : 'SETTLEMENT',
    competencia: o.dataFatoGerador.slice(0, 7),
    beneficiario: { counterpartyId: 'cp-a', nome: 'Fisio', taxId: CNPJ_A, kind: 'CNPJ', regime: 'PRESUMIDO' },
    natRend: '15022',
    codigoReceita: null,
    brutoCents: '100000',
    baseCents: '100000',
    amountCents: '1500',
    dispensa: null,
    titulo: { payableId: 'p1', documentNumber: 'NF-1', documentoSerie: '1', issueDate: '2026-03-02' },
    inss: null,
    pf: null,
    taxPayableId: null,
    settlementId: `s${n}`,
    originSettlementId: null,
    unitId: 'u1',
    ...o,
  });
const csrf = (dt: string, baixa: string, bruto: string, base: string, valores: [string, string, string]) =>
  (['CSLL', 'COFINS', 'PIS'] as const).map((tributo, i) => l({ tributo, dataFatoGerador: dt, originSettlementId: baixa, brutoCents: bruto, baseCents: base, amountCents: valores[i] }));

describe('montarR4020 — agrupamento (itens 6–7; L2, L7)', () => {
  it('IR no reconhecimento + CSRF agregada em 2 baixas ⇒ 1 beneficiário, 1 natureza, 3 infoPgto (caso adversarial do BRIEF §12)', () => {
    const ls = [
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02' }),
      ...csrf('2026-03-10', 'pg1', '50000', '50000', ['500', '1500', '325']),
      ...csrf('2026-03-25', 'pg2', '50000', '50000', ['500', '1500', '325']),
    ];
    const m = montarR4020(ls, TABELAS, new Map());
    expect(m.beneficiarios).toHaveLength(1);
    const pgtos = m.beneficiarios[0].porNatureza['15022'];
    expect(pgtos.map((p) => [p.dtFG, p.vlrBrutoCents, p.ir?.valorCents, p.agregado?.baseCents, p.agregado?.valorCents])).toEqual([
      ['2026-03-02', 100_000n, 1_500n, undefined, undefined],
      ['2026-03-10', 50_000n, undefined, 50_000n, 2_325n],
      ['2026-03-25', 50_000n, undefined, 50_000n, 2_325n],
    ]);
    expect(m.temFato).toBe(true);
  });

  it('2 beneficiários ⇒ 2; o mesmo CNPJ em duas unidades (contrapartes distintas) ⇒ 1, com as duas refs (F-REINF-11 a)', () => {
    const ls = [
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02' }),
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-05', unitId: 'u2', beneficiario: { counterpartyId: 'cp-a2', nome: 'Fisio', taxId: CNPJ_A, kind: 'CNPJ', regime: 'PRESUMIDO' } }),
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-05', beneficiario: { counterpartyId: 'cp-b', nome: 'Outra', taxId: CNPJ_B, kind: 'CNPJ', regime: 'REAL' } }),
    ];
    const m = montarR4020(ls, TABELAS, new Map());
    expect(m.beneficiarios.map((b) => [b.cnpj, b.ref])).toEqual([[CNPJ_B, 'cp-b'], [CNPJ_A, 'cp-a,cp-a2']].sort());
  });

  it('IR e CSRF no mesmo dia: mesmo bruto ⇒ 1 infoPgto; brutos diferentes ⇒ 2 (dono 26/10)', () => {
    const igual = montarR4020([l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02' }), ...csrf('2026-03-02', 'pg1', '100000', '100000', ['1000', '3000', '650'])], TABELAS, new Map());
    expect(igual.beneficiarios[0].porNatureza['15022']).toHaveLength(1);
    expect(igual.beneficiarios[0].porNatureza['15022'][0]).toMatchObject({ ir: { valorCents: 1_500n }, agregado: { valorCents: 4_650n } });
    const parcial = montarR4020([l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02' }), ...csrf('2026-03-02', 'pg1', '40000', '40000', ['400', '1200', '260'])], TABELAS, new Map());
    expect(parcial.beneficiarios[0].porNatureza['15022'].map((p) => p.vlrBrutoCents)).toEqual([100_000n, 40_000n]);
  });

  it('invariante 5 (F-REINF-8 a): em 2027 a CSRF é só CSLL, separada', () => {
    const m = montarR4020([l({ tributo: 'CSLL', dataFatoGerador: '2027-01-08', brutoCents: '198000', baseCents: '200000', amountCents: '2000' })], TABELAS, new Map());
    expect(m.beneficiarios[0].porNatureza['15022'][0]).toMatchObject({ csll: { baseCents: 200_000n, valorCents: 2_000n } });
    expect(m.beneficiarios[0].porNatureza['15022'][0].agregado).toBeUndefined();
  });

  it('invariante 4: Σ retido do R-4020 = Σ amountCents das linhas IRRF/CSRF de CNPJ; INSS, ISS, PF e dispensa fora', () => {
    const ls = [
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02' }),
      ...csrf('2026-03-10', 'pg1', '50000', '50000', ['500', '1500', '325']),
      l({ tributo: 'INSS', dataFatoGerador: '2026-03-02', amountCents: '11000', natRend: null }),
      l({ tributo: 'ISS', dataFatoGerador: '2026-03-02', amountCents: '2000', natRend: null }),
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02', beneficiario: { counterpartyId: 'pf', nome: 'Autônomo', taxId: '52998224725', kind: 'CPF', regime: 'PF' } }),
      l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02', amountCents: '0', dispensa: 'OPTANTE_SIMPLES' }),
    ];
    const m = montarR4020(ls, TABELAS, new Map());
    const noEvento = m.beneficiarios.flatMap((b) => Object.values(b.porNatureza).flat()).reduce((s, p) => s + (p.ir?.valorCents ?? 0n) + (p.agregado?.valorCents ?? 0n) + (p.csll?.valorCents ?? 0n) + (p.cofins?.valorCents ?? 0n) + (p.pis?.valorCents ?? 0n), 0n);
    expect(noEvento).toBe(1_500n + 2_325n);
    expect(m.linhasR4020.reduce((s, x) => s + BigInt(x.amountCents), 0n)).toBe(noEvento);
    expect(m.totaisPorCodigo).toEqual(expect.arrayContaining([{ codigoReceita: '170806', totalCents: '1500' }, { codigoReceita: '595207', totalCents: '2325' }]));
    expect(m.avisos).toEqual([expect.stringContaining(AVISO_PF_FORA_DA_REINF), expect.stringContaining(AVISO_R2010_NAO_GERADO)]);
  });
});

describe('montarR4020 — recusas (item 7; invariantes 1, 3)', () => {
  const erro = (ls: WithholdingLineForReinf[]) => {
    try {
      montarR4020(ls, TABELAS, new Map());
    } catch (e) {
      return e as { errorCode: string; details: Record<string, unknown> };
    }
    throw new Error('não recusou');
  };
  it('CNPJ com DV inválido ⇒ 400 nomeado com o counterpartyId', () => {
    const e = erro([l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02', beneficiario: { counterpartyId: 'cp-x', nome: 'X', taxId: '11222333000180', kind: 'CNPJ', regime: null } })]);
    expect([e.errorCode, e.details.counterpartyId]).toEqual(['REINF_BENEFICIARIO_CNPJ_INVALIDO', 'cp-x']);
  });
  it('fornecedor sem taxId ⇒ o mesmo 400 (dono 26/10: nenhuma retenção some calada)', () => {
    const e = erro([l({ tributo: 'CSLL', dataFatoGerador: '2026-03-02', beneficiario: { counterpartyId: 'cp-y', nome: 'Y', taxId: null, kind: null, regime: null } })]);
    expect([e.errorCode, e.details.counterpartyId]).toEqual(['REINF_BENEFICIARIO_CNPJ_INVALIDO', 'cp-y']);
  });
  it('natRend nulo ou fora da Tabela 01 publicada ⇒ NATUREZA_RENDIMENTO_SEM_MAPA com a chave e a linha', () => {
    expect(erro([l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02', natRend: null })]).errorCode).toBe('NATUREZA_RENDIMENTO_SEM_MAPA');
    const e = erro([l({ id: 'w-99', tributo: 'IRRF', dataFatoGerador: '2026-03-02', natRend: '15999' })]);
    expect([e.errorCode, e.details]).toEqual(['NATUREZA_RENDIMENTO_SEM_MAPA', { natRend: '15999', withholdingId: 'w-99' }]);
  });
  it('só dispensa e ISS ⇒ sem fato (o serviço devolve 422)', () => {
    const m = montarR4020([l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02', amountCents: '0', dispensa: 'MINIMO_R10' }), l({ tributo: 'ISS', dataFatoGerador: '2026-03-02', natRend: null })], TABELAS, new Map());
    expect([m.temFato, m.beneficiarios.length]).toEqual([false, 0]);
  });
});

describe('relatório (item 14)', () => {
  it('beneficiário mascarado, código derivado e vencimento do título de imposto', () => {
    expect(mascararCnpj(CNPJ_A)).toBe('**.***.***/0001-**');
    const m = montarR4020([l({ tributo: 'IRRF', dataFatoGerador: '2026-03-02', taxPayableId: 't1' })], TABELAS, new Map([['t1', '2026-04-20']]));
    expect(m.relatorio).toEqual([
      { evento: 'R-4020', beneficiario: '**.***.***/0001-**', natRend: '15022', dtFG: '2026-03-02', tributo: 'IRRF', brutoCents: '100000', baseCents: '100000', retidoCents: '1500', codigoReceita: '170806', vencimentoDarf: '2026-04-20' },
    ]);
    expect(JSON.stringify(m.relatorio)).not.toContain(CNPJ_A);
  });
});
