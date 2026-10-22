/**
 * IBS-CBS-2027 PR-3 — antecipação do pacote pré-pago e acerto no consumo (BRIEF itens 17–18; invariante §10.6; LC 214
 * art. 10 § 4º; Decreto 12.955 art. 11 §§ 5º–6º). Tabela real = semente `IBS_CBS` (CBS 2027 DRAFT ⇒ fora); as alíquotas
 * de CBS abaixo são FIXTURE (a resolução do Senado não saiu) — servem para mudar a alíquota entre pagamento e consumo.
 */
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { SemLinhaVigenteError } from '../../../legalParameters/models/legalParameter';
import { tabelaIbsCbsDe, type ParametroIbsCbs } from '../ibsCbsParams';
import { antecipacaoIbsCbsMes, IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA, type AntecipacaoInput, type MovimentoPacote } from '../ibsCbsAntecipacao';

const semente = tabelaIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS));
const cbs = (aliquotaBp: number, vigenteDesde: string, vigenteAte: string | null): ParametroIbsCbs => ({ tributo: 'CBS', chave: 'ALIQUOTA', aliquotaBp, fonte: 'fixture', vigenteDesde, vigenteAte });
const comCbs = [...semente, cbs(800, '2027-01-01', '2027-03-31'), cbs(900, '2027-04-01', null)];

const mov = (id: string, saleId: string, kind: MovimentoPacote['kind'], deltaCents: bigint, dia: string): MovimentoPacote => ({ id, saleId, kind, deltaCents, dia, instante: `${dia}T12:00:00.000Z` });

function entrada(over: Partial<AntecipacaoInput>): AntecipacaoInput {
  return { ano: 2027, mes: 3, tributo: 'IBS', tabela: semente, pagamentos: [], saldos: [], pagamentoDaVenda: {}, cancelamentos: [], ...over };
}
const codigos = (m: { codigo: string }[]) => m.map((l) => l.codigo);

describe('item 17 — antecipação na data de cada parcela paga', () => {
  it('base = parcela; IBS 2027 = UF 5 bp + Mun 5 bp; soma ao débito; aviso de alíquota cheia', () => {
    const r = antecipacaoIbsCbsMes(entrada({ pagamentos: [{ saleId: 'v1', pagoEm: '2027-03-10', dataDocumento: null, parcelaCents: 100_000n }] }));
    expect(r.debitosCents).toBe(100n); // 1.000,00 × 0,10% = 1,00
    expect(codigos(r.memoria)).toEqual(['ANTECIPACAO_ART10_1', 'ANTECIPACAO_SEM_REDUCAO']);
  });

  it('alíquota da data do documento ou do pagamento, o que vier primeiro', () => {
    const r = antecipacaoIbsCbsMes(entrada({ mes: 4, tributo: 'CBS', tabela: comCbs, pagamentos: [{ saleId: 'v1', pagoEm: '2027-04-02', dataDocumento: '2027-03-30', parcelaCents: 10_000n }] }));
    expect(r.debitosCents).toBe(800n); // documento em 30/03 (800 bp), não o pagamento em 02/04 (900 bp)
  });

  it('pagamento de outro mês não entra', () => {
    expect(antecipacaoIbsCbsMes(entrada({ pagamentos: [{ saleId: 'v1', pagoEm: '2027-02-28', dataDocumento: null, parcelaCents: 100_000n }] })).memoria).toEqual([]);
  });

  it('CBS 2027 sem linha publicada (DRAFT) ⇒ 400 nomeado — a antecipação precisa da alíquota (F-IBS-11)', () => {
    const tentar = () => antecipacaoIbsCbsMes(entrada({ tributo: 'CBS', pagamentos: [{ saleId: 'v1', pagoEm: '2027-03-10', dataDocumento: null, parcelaCents: 100n }] }));
    expect(tentar).toThrow(SemLinhaVigenteError);
    expect(tentar).toThrow(/antecipação do pacote pré-pago.*art\. 10 § 4º/);
    try { tentar(); } catch (e) { expect((e as SemLinhaVigenteError & { errorCode?: string }).errorCode).toBe(IBS_CBS_ANTECIPACAO_SEM_ALIQUOTA); }
  });

  it('sem pacote no mês, CBS DRAFT não atrapalha (nenhuma alíquota é pedida)', () => {
    expect(antecipacaoIbsCbsMes(entrada({ tributo: 'CBS' }))).toEqual({ debitosCents: 0n, memoria: [] });
  });
});

describe('item 18 — acerto no consumo (literal: definitivo − antecipado da mesma porção, FIFO)', () => {
  const saldo = (movimentos: MovimentoPacote[]) => [{ customerId: 'c1', packageId: 'pk1', movimentos }];

  it('alíquota maior no consumo ⇒ diferença a maior é débito em M+k (ACERTO_ART10_n)', () => {
    const r = antecipacaoIbsCbsMes(entrada({
      mes: 4, tributo: 'CBS', tabela: comCbs,
      saldos: saldo([mov('m1', 'v1', 'credit', 10_000n, '2027-03-10'), mov('m2', 'v2', 'debit', 4_000n, '2027-04-15')]),
      pagamentoDaVenda: { v1: { pagoEm: '2027-03-10', dataDocumento: null } },
    }));
    expect(r.debitosCents).toBe(40n); // 4.000 × 900 bp = 360 − 4.000 × 800 bp = 320
    expect(r.memoria.map((l) => [l.codigo, l.valorCents])).toEqual([['ACERTO_ART10_1', '40']]);
  });

  it('alíquota menor no consumo ⇒ aviso PAGAMENTO_INDEVIDO_ART38_n, sem somar', () => {
    const tabela = [...semente, cbs(900, '2027-01-01', '2027-03-31'), cbs(800, '2027-04-01', null)];
    const r = antecipacaoIbsCbsMes(entrada({
      mes: 4, tributo: 'CBS', tabela,
      saldos: saldo([mov('m1', 'v1', 'credit', 10_000n, '2027-03-10'), mov('m2', 'v2', 'debit', 4_000n, '2027-04-15')]),
      pagamentoDaVenda: { v1: { pagoEm: '2027-03-10', dataDocumento: null } },
    }));
    expect(r.debitosCents).toBe(0n);
    expect(r.memoria.map((l) => [l.codigo, l.valorCents])).toEqual([['PAGAMENTO_INDEVIDO_ART38_1', '40']]);
  });

  it('mesma alíquota ⇒ ACERTO_ART10_n de 0 (o consumo fica na memória)', () => {
    const r = antecipacaoIbsCbsMes(entrada({
      mes: 4,
      saldos: saldo([mov('m1', 'v1', 'credit', 10_000n, '2027-03-10'), mov('m2', 'v2', 'debit', 4_000n, '2027-04-15')]),
      pagamentoDaVenda: { v1: { pagoEm: '2027-03-10', dataDocumento: null } },
    }));
    expect(r.memoria.map((l) => [l.codigo, l.valorCents])).toEqual([['ACERTO_ART10_1', '0']]);
  });

  it('FIFO: o consumo come primeiro a venda mais antiga; porção não paga antes do consumo não teve antecipação', () => {
    const r = antecipacaoIbsCbsMes(entrada({
      mes: 4, tributo: 'CBS', tabela: comCbs,
      saldos: saldo([
        mov('m1', 'v1', 'credit', 1_000n, '2027-03-01'),
        mov('m2', 'v2', 'credit', 5_000n, '2027-03-05'),
        mov('m3', 'v3', 'debit', 3_000n, '2027-04-10'),
      ]),
      // v1 paga antes; v2 paga DEPOIS do consumo ⇒ só os 1.000 de v1 foram antecipados
      pagamentoDaVenda: { v1: { pagoEm: '2027-03-01', dataDocumento: null }, v2: { pagoEm: '2027-04-20', dataDocumento: null } },
    }));
    expect(r.debitosCents).toBe(10n); // 1.000 × (900 − 800) bp
    expect(r.memoria[0].descricao).toMatch(/base 1000/);
  });

  it('consumo de mês anterior consome a fila mas não gera linha em M', () => {
    const r = antecipacaoIbsCbsMes(entrada({
      mes: 4,
      saldos: saldo([mov('m1', 'v1', 'credit', 1_000n, '2027-03-01'), mov('m2', 'v2', 'debit', 1_000n, '2027-03-20')]),
      pagamentoDaVenda: { v1: { pagoEm: '2027-03-01', dataDocumento: null } },
    }));
    expect(r.memoria).toEqual([]);
  });

  it('vencimento sem uso ⇒ aviso das regras do cancelamento, sem débito (§10.6)', () => {
    const r = antecipacaoIbsCbsMes(entrada({
      mes: 4,
      saldos: saldo([mov('m1', 'v1', 'credit', 1_000n, '2027-03-01'), mov('m2', 'expiry:b:2027-04-01', 'expiry', 1_000n, '2027-04-01')]),
      pagamentoDaVenda: { v1: { pagoEm: '2027-03-01', dataDocumento: null } },
    }));
    expect(r.debitosCents).toBe(0n);
    expect(r.memoria).toHaveLength(1);
    expect(r.memoria[0]).toMatchObject({ codigo: 'ACERTO_ART10_1', valorCents: '0' });
    expect(r.memoria[0].descricao).toMatch(/vencido sem fornecimento.*art\. 57/);
  });

  it('cancelamento da venda de pacote no mês ⇒ aviso, sem lançamento', () => {
    const r = antecipacaoIbsCbsMes(entrada({ cancelamentos: [{ saleId: 'v9', dia: '2027-03-15' }, { saleId: 'v8', dia: '2027-02-15' }] }));
    expect(r.debitosCents).toBe(0n);
    expect(r.memoria.map((l) => l.descricao)).toEqual([expect.stringMatching(/v9 cancelada em 2027-03-15/)]);
  });
});
