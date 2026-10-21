/**
 * IBS-CBS-2027 PR-2 — função pura da apuração mensal (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6, 7,
 * 9, 11; invariantes §10.2 e §10.3). Tabela = semente `IBS_CBS` do PR-1 (CBS 2027 DRAFT ⇒ fora da fotografia).
 */
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { tabelaIbsCbsDe, type ParametroIbsCbs } from '../ibsCbsParams';
import { agregarIbsCbsPorCompetencia, apurarIbsCbsMes, IbsCbsDocumentoSchema, type IbsCbsDocumento } from '../ibsCbsCompetencia';

const tabela = tabelaIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS));

function doc(over: Partial<IbsCbsDocumento>): IbsCbsDocumento {
  return { fiscalDocumentId: 'fd1', dataEmissaoLocal: '2027-03-10', status: 'AUTHORIZED', ibsCents: 10n, cbsCents: 900n, baseCents: 10000n, cClassTrib: null, ...over };
}

const codigos = (m: { codigo: string }[]) => m.map((l) => l.codigo);

describe('item 6 — competência × tributo, valor do documento', () => {
  it('soma o IBS/CBS destacado por competência; sem grupo soma 0 e conta', () => {
    const r = agregarIbsCbsPorCompetencia([
      doc({ fiscalDocumentId: 'a', ibsCents: 10n, cbsCents: 900n }),
      doc({ fiscalDocumentId: 'b', status: 'AUTHORIZED_DIVERGENT', ibsCents: 5n, cbsCents: null }),
      doc({ fiscalDocumentId: 'c', dataEmissaoLocal: '2027-04-01', ibsCents: 7n, cbsCents: 1n }),
    ]);
    expect(r).toEqual([
      { competencia: '2027-03', tributo: 'CBS', documentos: 2, documentosSemGrupo: 1, debitosCents: 900n },
      { competencia: '2027-03', tributo: 'IBS', documentos: 2, documentosSemGrupo: 0, debitosCents: 15n },
      { competencia: '2027-04', tributo: 'CBS', documentos: 1, documentosSemGrupo: 0, debitosCents: 1n },
      { competencia: '2027-04', tributo: 'IBS', documentos: 1, documentosSemGrupo: 0, debitosCents: 7n },
    ]);
  });

  it('cancelado não entra (o contrato só aceita os 2 status vivos)', () => {
    expect(IbsCbsDocumentoSchema.safeParse({ ...doc({}), status: 'CANCELLED' }).success).toBe(false);
  });

  it('competência = dia ESCRITO: nota emitida em 2027-04-01T00:30:00-03:00 é de abril, não de março', () => {
    const emitidaEm = new Date('2027-04-01T00:30:00-03:00');
    // O instante em UTC ainda é 1º/04 03:30; o erro clássico é usar o dia UTC de um Date gravado à meia-noite UTC.
    expect(emitidaEm.toISOString().slice(0, 10)).toBe('2027-04-01');
    // O documento carrega o dia escrito (dCompet); um ISO cru é recusado pelo contrato.
    expect(IbsCbsDocumentoSchema.safeParse({ ...doc({}), dataEmissaoLocal: emitidaEm.toISOString() }).success).toBe(false);
    const r = apurarIbsCbsMes({ ano: 2027, mes: 4, tributo: 'IBS', tabela, documentos: [doc({ dataEmissaoLocal: '2027-04-01', baseCents: null })], vendasSemDocumento: [] });
    expect(r.debitosCents).toBe(10n);
    const marco = apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [doc({ dataEmissaoLocal: '2027-04-01' })], vendasSemDocumento: [] });
    expect(marco.debitosCents).toBe(0n);
  });
});

describe('item 7 — conferência só avisa', () => {
  it('IBS 2027: base × (5 + 5) bp diferente do documento ⇒ DIVERGENCIA_DOC_n; o débito segue o documento', () => {
    const r = apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [doc({ ibsCents: 12n, baseCents: 10000n })], vendasSemDocumento: [] });
    expect(r.debitosCents).toBe(12n);
    const div = r.memoria.find((l) => l.codigo === 'DIVERGENCIA_DOC_1');
    expect(div?.valorCents).toBe('2'); // 12 − 10
    expect(r.memoria.find((l) => l.codigo === 'SALDO')?.descricao).toContain('IBS UF 5 bp + Mun 5 bp');
  });

  it('documento igual à conferência ⇒ sem aviso', () => {
    const r = apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [doc({ ibsCents: 10n })], vendasSemDocumento: [] });
    expect(codigos(r.memoria).some((c) => c.startsWith('DIVERGENCIA_DOC'))).toBe(false);
  });

  it('CBS 2027 sem linha publicada ⇒ conferência pulada com CONFERENCIA_SEM_ALIQUOTA, débito apurado (F-IBS-11 a)', () => {
    const r = apurarIbsCbsMes({ ano: 2027, mes: 1, tributo: 'CBS', tabela, documentos: [doc({ dataEmissaoLocal: '2027-01-05', cbsCents: 870n })], vendasSemDocumento: [] });
    expect(r.debitosCents).toBe(870n);
    expect(codigos(r.memoria)).toContain('CONFERENCIA_SEM_ALIQUOTA');
  });

  it('CBS com linha publicada confere pela tabela', () => {
    const publicada: ParametroIbsCbs[] = [...tabela, { tributo: 'CBS', chave: 'ALIQUOTA', aliquotaBp: 870, fonte: 'fixture', vigenteDesde: '2027-01-01', vigenteAte: null }];
    const r = apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'CBS', tabela: publicada, documentos: [doc({ cbsCents: 900n })], vendasSemDocumento: [] });
    expect(r.memoria.find((l) => l.codigo === 'DIVERGENCIA_DOC_1')?.valorCents).toBe('30');
  });

  it('venda finalizada sem documento ⇒ VENDA_SEM_DOCUMENTO, valor 0', () => {
    const r = apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [], vendasSemDocumento: ['sale-9'] });
    expect(r.memoria.filter((l) => l.codigo === 'VENDA_SEM_DOCUMENTO')).toHaveLength(1);
    expect(r.debitosCents).toBe(0n);
  });
});

describe('itens 9 e 11 — saldo e memória', () => {
  it('saldo = débitos − créditos; créditos 0 declarados; provisão do item 12 declarada pendente', () => {
    const r = apurarIbsCbsMes({
      ano: 2027, mes: 3, tributo: 'IBS', tabela,
      documentos: [doc({ fiscalDocumentId: 'a', ibsCents: 10n }), doc({ fiscalDocumentId: 'b', ibsCents: null, baseCents: null })],
      vendasSemDocumento: [],
    });
    expect(r.creditosCents).toBe(0n);
    expect(r.saldoCents).toBe(r.debitosCents - r.creditosCents);
    expect(r.documentosSemGrupo).toBe(1);
    expect(codigos(r.memoria)).toEqual(['DEBITO_DOC_1', 'DEBITO_DOC_2', 'DOCUMENTOS_SEM_GRUPO', 'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'PROVISAO_PENDENTE_ITEM_12', 'SALDO']);
    expect(r.memoria.at(-1)?.valorCents).toBe('10');
  });
});
