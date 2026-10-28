/**
 * BE-INCR-EFD-REINF PR-2 — `montarR4010` (itens 15–16; invariante 3) e `montarR2010` (item 17; invariante 13). As entradas têm a
 * forma dos contratos materializados (`DividendoParaReinfSchema`, `JcpParaReinfSchema`, `WithholdingLineForReinfSchema`).
 */
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { WithholdingLineForReinfSchema, type WithholdingLineForReinf } from '../../dtos/WithholdingDto';
import {
  AVISO_DIVIDENDO_PJ_FORA_DA_REINF,
  DividendoParaReinfSchema,
  dividendoParaReinf,
  JcpParaReinfSchema,
  jcpParaReinf,
  juntarBeneficiariosPJ,
  mascararCpf,
  montarR2010,
  montarR4010,
  totaisPorCodigo,
  type DividendoParaReinf,
  type JcpParaReinf,
} from '../reinfLote';

const linha = (o: Partial<Omit<LinhaLegal, 'id'>> & Pick<LinhaLegal, 'tabela' | 'chave'>): LinhaLegal => ({
  id: `${o.tabela}-${o.chave}-${o.discriminador ?? ''}-${o.vigenteDesde ?? ''}`,
  discriminador: null, valorInt: null, valorTexto: null, valorJson: null, fonte: 'teste', vigenteDesde: '2023-09-01', vigenteAte: null,
  status: 'PUBLISHED', supersedesId: null, ...o,
});
const TABELAS: LinhaLegal[] = [
  linha({ tabela: 'RETENCAO_CODIGO', chave: '12001', discriminador: 'IRPF', valorTexto: '184101', vigenteDesde: '2026-01-01' }),
  linha({ tabela: 'RETENCAO_CODIGO', chave: '12016', discriminador: 'IRPF', valorTexto: '570602' }),
  linha({ tabela: 'RETENCAO_CODIGO', chave: '12016', discriminador: 'IRPJ', valorTexto: '570602' }),
];

const CPF_A = '52998224725';
const CPF_B = '11144477735';
const CPF_C = '39053344705';
const CNPJ_S = '45997418000153';
let n = 0;
const div = (o: Partial<DividendoParaReinf> & Pick<DividendoParaReinf, 'taxId' | 'brutoCents'>): DividendoParaReinf =>
  DividendoParaReinfSchema.parse({ id: `d${++n}`, partnerId: `p-${o.taxId}`, tipoPessoa: 'PF', dataEvento: '2026-03-10', irrfCents: '0', origemLucro: 'CORRENTE', ...o });
const jcp = (o: Partial<JcpParaReinf> & Pick<JcpParaReinf, 'taxId' | 'brutoCents' | 'irrfCents'>): JcpParaReinf =>
  JcpParaReinfSchema.parse({ id: `a${++n}`, partnerId: `p-${o.taxId}`, tipoPessoa: 'PF', dataCredito: '2026-03-31', ...o });

const erro = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return e as { errorCode: string; details: Record<string, unknown> };
  }
  throw new Error('não recusou');
};

describe('contratos de entrada E4 (dividendos e JCP do IRRF-DISTRIBUICAO)', () => {
  it('dividendo: tipo do sócio pelo tamanho do taxId; centavos como string', () => {
    const base = { id: 'e1', partnerId: 'p1', dataEvento: '2026-03-10', brutoCents: 6_000_000n, irrfCents: 600_000n, origemLucro: 'CORRENTE' };
    expect(dividendoParaReinf({ ...base, taxId: CPF_A } as never)).toEqual({ ...base, taxId: CPF_A, tipoPessoa: 'PF', brutoCents: '6000000', irrfCents: '600000' });
    expect(dividendoParaReinf({ ...base, taxId: CNPJ_S } as never).tipoPessoa).toBe('PJ');
  });
  it('JCP: CPF/CNPJ do cadastro do sócio; sócio removido ⇒ 400 REINF_SOCIO_REMOVIDO', () => {
    const a = { id: 'a1', partnerId: 'p1', brutoCents: 100_000n, irrfCents: 17_500n } as never;
    const socios = new Map([['p1', { id: 'p1', tipoPessoa: 'PF', taxId: CPF_A }]]);
    expect(jcpParaReinf({ dataCredito: '2026-03-31' }, a, socios)).toEqual({ id: 'a1', partnerId: 'p1', taxId: CPF_A, tipoPessoa: 'PF', dataCredito: '2026-03-31', brutoCents: '100000', irrfCents: '17500' });
    expect(erro(() => jcpParaReinf({ dataCredito: '2026-03-31' }, a, new Map())).errorCode).toBe('REINF_SOCIO_REMOVIDO');
  });
  it('o schema é estrito: campo a mais é recusado', () => {
    expect(() => DividendoParaReinfSchema.parse({ ...div({ taxId: CPF_A, brutoCents: '1' }), extra: 1 })).toThrow();
  });
});

describe('montarR4010 — dividendos (item 16; L6; lacunas A e B do dono 27/10)', () => {
  const infoPgtos = (m: ReturnType<typeof montarR4010>, cpf: string) => m.beneficiariosPF.find((b) => b.cpf === cpf)!.porNatureza['12001'];

  it('teste do BRIEF: 3 sócios (49k, 60k, 30k de transição) ⇒ 3 eventos: um só bruto, um com IR, um com isenção 12', () => {
    const m = montarR4010(
      [div({ taxId: CPF_A, brutoCents: '4900000' }), div({ taxId: CPF_B, brutoCents: '6000000', irrfCents: '600000' }), div({ taxId: CPF_C, brutoCents: '3000000', origemLucro: 'TRANSICAO' })],
      [],
      TABELAS,
    );
    expect(m.beneficiariosPF).toHaveLength(3);
    expect(infoPgtos(m, CPF_A)).toEqual([{ dtFG: '2026-03-10', vlrRendBrutoCents: 4_900_000n, origemIds: [expect.any(String)] }]);
    expect(infoPgtos(m, CPF_B)).toEqual([{ dtFG: '2026-03-10', vlrRendBrutoCents: 6_000_000n, vlrRendTribCents: 6_000_000n, vlrIRCents: 600_000n, origemIds: [expect.any(String)] }]);
    expect(infoPgtos(m, CPF_C)).toEqual([{ dtFG: '2026-03-10', vlrRendBrutoCents: 3_000_000n, isencao: { tpIsencao: 12, valorCents: 3_000_000n }, origemIds: [expect.any(String)] }]);
  });

  it('lacuna B: mês que cruzou o limite ⇒ toda infoPgto CORRENTE tributável; vlrIR só onde reteve; Σ vlrRendTrib = base do mês', () => {
    const m = montarR4010([div({ taxId: CPF_A, brutoCents: '3000000', dataEvento: '2026-03-05' }), div({ taxId: CPF_A, brutoCents: '3000000', irrfCents: '600000', dataEvento: '2026-03-20' })], [], TABELAS);
    const ps = infoPgtos(m, CPF_A);
    expect(ps.map((p) => [p.dtFG, p.vlrRendTribCents, p.vlrIRCents])).toEqual([
      ['2026-03-05', 3_000_000n, undefined],
      ['2026-03-20', 3_000_000n, 600_000n],
    ]);
    expect(ps.reduce((s, p) => s + (p.vlrRendTribCents ?? 0n), 0n)).toBe(6_000_000n);
  });

  it('dois fatos do mesmo CPF no mesmo dia (corrente + transição) viram uma infoPgto com as partes somadas', () => {
    const m = montarR4010([div({ taxId: CPF_A, brutoCents: '4000000', irrfCents: '500000' }), div({ taxId: CPF_A, brutoCents: '1000000', origemLucro: 'TRANSICAO' })], [], TABELAS);
    expect(infoPgtos(m, CPF_A)).toEqual([
      { dtFG: '2026-03-10', vlrRendBrutoCents: 5_000_000n, vlrRendTribCents: 4_000_000n, vlrIRCents: 500_000n, isencao: { tpIsencao: 12, valorCents: 1_000_000n }, origemIds: [expect.any(String), expect.any(String)] },
    ]);
  });

  it('lacuna A: dividendo a sócio PJ não vai a evento nenhum; o relatório avisa', () => {
    const m = montarR4010([div({ taxId: CNPJ_S, tipoPessoa: 'PJ', brutoCents: '9000000' })], [], TABELAS);
    expect([m.beneficiariosPF, m.beneficiariosPJ, m.relatorio]).toEqual([[], [], []]);
    expect(m.avisos).toEqual([expect.stringContaining(AVISO_DIVIDENDO_PJ_FORA_DA_REINF)]);
  });

  it('invariante 3: CPF com DV inválido ⇒ 400 nomeado com o partnerId', () => {
    const e = erro(() => montarR4010([div({ taxId: '52998224724', partnerId: 'p-x', brutoCents: '1' })], [], TABELAS));
    expect([e.errorCode, e.details]).toEqual(['REINF_BENEFICIARIO_CPF_INVALIDO', { partnerId: 'p-x' }]);
  });
});

describe('montarR4010 — JCP (item 16)', () => {
  it('JCP a PF ⇒ R-4010 natureza 12016 com bruto tributável e IR; dividendos e JCP do mesmo CPF num só evento', () => {
    const m = montarR4010([div({ taxId: CPF_A, brutoCents: '100000' })], [jcp({ taxId: CPF_A, brutoCents: '200000', irrfCents: '35000' })], TABELAS);
    expect(m.beneficiariosPF).toHaveLength(1);
    expect(Object.keys(m.beneficiariosPF[0].porNatureza).sort()).toEqual(['12001', '12016']);
    expect(m.beneficiariosPF[0].porNatureza['12016']).toEqual([{ dtFG: '2026-03-31', vlrRendBrutoCents: 200_000n, vlrRendTribCents: 200_000n, vlrIRCents: 35_000n, origemIds: [expect.any(String)] }]);
    expect(m.beneficiariosPF[0].ref).toBe(`p-${CPF_A}`);
  });

  it('JCP a sócio PJ ⇒ beneficiário do R-4020 na 12016, juntado ao fornecedor de mesmo CNPJ (invariante 6)', () => {
    const m = montarR4010([], [jcp({ taxId: CNPJ_S, tipoPessoa: 'PJ', partnerId: 'p-pj', brutoCents: '200000', irrfCents: '30000' })], TABELAS);
    expect(m.beneficiariosPF).toEqual([]);
    expect(m.beneficiariosPJ).toEqual([{ cnpj: CNPJ_S, nome: '', ref: 'p-pj', porNatureza: { '12016': [{ dtFG: '2026-03-31', vlrBrutoCents: 200_000n, ir: { baseCents: 200_000n, valorCents: 30_000n }, origemIds: [expect.any(String)] }] } }]);
    const fornecedor = { cnpj: CNPJ_S, nome: 'X', ref: 'cp-1', porNatureza: { '15022': [{ dtFG: '2026-03-02', vlrBrutoCents: 1n, origemIds: ['w1'] }] } };
    const juntos = juntarBeneficiariosPJ([fornecedor], m.beneficiariosPJ);
    expect(juntos).toHaveLength(1);
    expect([Object.keys(juntos[0].porNatureza).sort(), juntos[0].ref]).toEqual([['12016', '15022'], 'cp-1,p-pj']);
  });
});

describe('relatório do R-4010 (lacuna D, dono 27/10)', () => {
  it('CPF mascarado ***.NNN.NNN-**, código derivado (1841-01 desde 2026; 5706-02 do JCP) e totais por código', () => {
    expect(mascararCpf(CPF_A)).toBe('***.982.247-**');
    const m = montarR4010([div({ taxId: CPF_A, brutoCents: '6000000', irrfCents: '600000' })], [jcp({ taxId: CPF_A, brutoCents: '200000', irrfCents: '35000' })], TABELAS);
    expect(m.relatorio.map((r) => [r.evento, r.beneficiario, r.natRend, r.codigoReceita, r.retidoCents])).toEqual([
      ['R-4010', '***.982.247-**', '12001', '184101', '600000'],
      ['R-4010', '***.982.247-**', '12016', '570602', '35000'],
    ]);
    expect(JSON.stringify(m.relatorio)).not.toContain(CPF_A);
    expect(totaisPorCodigo(m.relatorio)).toEqual([{ codigoReceita: '184101', totalCents: '600000' }, { codigoReceita: '570602', totalCents: '35000' }]);
  });
});

// ─── R-2010 ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const CNPJ_A = '45997418000153';
const CNPJ_B = '19131243000197';
const l = (o: Partial<WithholdingLineForReinf>): WithholdingLineForReinf =>
  WithholdingLineForReinfSchema.parse({
    id: `w${++n}`,
    tributo: 'INSS',
    event: 'RECOGNITION',
    dataFatoGerador: '2026-03-02',
    competencia: '2026-03',
    beneficiario: { counterpartyId: 'cp-a', nome: 'Limpeza', taxId: CNPJ_A, kind: 'CNPJ', regime: 'PRESUMIDO' },
    natRend: null,
    codigoReceita: '116201',
    brutoCents: '1000000',
    baseCents: '1000000',
    amountCents: '110000',
    dispensa: null,
    titulo: { payableId: 'p1', documentNumber: '123', documentoSerie: '1', issueDate: '2026-03-02' },
    inss: { tpServico: '100000001', cprb: false },
    pf: null,
    taxPayableId: null,
    settlementId: null,
    originSettlementId: null,
    unitId: 'u1',
    ...o,
  });

describe('montarR2010 (item 17; lacuna C, dono 27/10)', () => {
  it('um prestador por CNPJ; NF = título com bruto da linha; uma infoTpServ por tpServico', () => {
    const m = montarR2010([
      l({ titulo: { payableId: 'p1', documentNumber: '123', documentoSerie: '1', issueDate: '2026-03-02' } }),
      l({ titulo: { payableId: 'p2', documentNumber: '124', documentoSerie: 'A', issueDate: '2026-03-15' }, brutoCents: '500000', baseCents: '500000', amountCents: '55000' }),
      l({ beneficiario: { counterpartyId: 'cp-b', nome: 'Vigia', taxId: CNPJ_B, kind: 'CNPJ', regime: null }, inss: { tpServico: '100000002', cprb: true } }),
    ]);
    expect(m.prestadores.map((p) => [p.cnpj, p.indCPRB, p.nfs.length])).toEqual([
      [CNPJ_B, 1, 1],
      [CNPJ_A, 0, 2],
    ]);
    const a = m.prestadores.find((p) => p.cnpj === CNPJ_A)!;
    expect(a.nfs[1]).toEqual({ serie: 'A', numDocto: '124', dtEmissaoNF: '2026-03-15', vlrBrutoCents: 500_000n, tiposServico: [{ tpServico: '100000001', baseCents: 500_000n, retencaoCents: 55_000n }], origemIds: [expect.any(String)] });
  });

  it('invariante 13: Σ retido nos prestadores = Σ amountCents das linhas INSS; ISS, IRRF e CSRF não entram', () => {
    const ls = [l({}), l({ amountCents: '22000' }), l({ tributo: 'ISS', amountCents: '5000' }), l({ tributo: 'IRRF', natRend: '15043', amountCents: '1500' })];
    const m = montarR2010(ls);
    const noEvento = m.prestadores.flatMap((p) => p.nfs.flatMap((nf) => nf.tiposServico)).reduce((s, t) => s + t.retencaoCents, 0n);
    expect(noEvento).toBe(132_000n);
    expect(m.linhasR2010.map((x) => x.tributo)).toEqual(['INSS', 'INSS']);
    expect(m.relatorio.map((r) => [r.evento, r.tributo, r.natRend, r.beneficiario, r.codigoReceita])).toEqual([
      ['R-2010', 'INSS', null, '**.***.***/0001-**', '116201'],
      ['R-2010', 'INSS', null, '**.***.***/0001-**', '116201'],
    ]);
  });

  it('série, número, tpServico ou CPRB nulos ⇒ 400 REINF_R2010_CAMPO_AUSENTE com os campos e a linha', () => {
    const e = erro(() => montarR2010([l({ id: 'w-s', titulo: { payableId: 'p1', documentNumber: null, documentoSerie: null, issueDate: '2026-03-02' }, inss: { tpServico: null, cprb: null } })]));
    expect([e.errorCode, e.details]).toEqual(['REINF_R2010_CAMPO_AUSENTE', { withholdingId: 'w-s', campos: ['serie', 'numDocto', 'tpServico', 'indCPRB'] }]);
  });

  it('prestador sem CNPJ válido ⇒ 400 REINF_PRESTADOR_CNPJ_INVALIDO; CPRB divergente ⇒ 400 REINF_R2010_CPRB_DIVERGENTE', () => {
    const e = erro(() => montarR2010([l({ beneficiario: { counterpartyId: 'cp-x', nome: 'X', taxId: '52998224725', kind: 'CPF', regime: null } })]));
    expect([e.errorCode, e.details.counterpartyId]).toEqual(['REINF_PRESTADOR_CNPJ_INVALIDO', 'cp-x']);
    expect(erro(() => montarR2010([l({}), l({ titulo: { payableId: 'p9', documentNumber: '9', documentoSerie: '1', issueDate: '2026-03-09' }, inss: { tpServico: '100000001', cprb: true } })])).errorCode).toBe('REINF_R2010_CPRB_DIVERGENTE');
  });
});
