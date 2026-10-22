/**
 * IBS-CBS-2027 PR-2 — função pura da apuração mensal (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6, 7,
 * 9, 11; invariantes §10.2 e §10.3). Tabela = semente `IBS_CBS` do PR-1 (CBS 2027 DRAFT ⇒ fora da fotografia).
 */
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { tabelaIbsCbsDe, type ParametroIbsCbs } from '../ibsCbsParams';
import { agregarIbsCbsPorCompetencia, apurarIbsCbsMes, IbsCbsDocumentoSchema, type IbsCbsDocumento } from '../ibsCbsCompetencia';
import type { IbsCbsCreditoNota } from '../ibsCbsCredito';

const tabela = tabelaIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS));

function doc(over: Partial<IbsCbsDocumento>): IbsCbsDocumento {
  return { fiscalDocumentId: 'fd1', dataEmissaoLocal: '2027-03-10', status: 'AUTHORIZED', ibsCents: 10n, cbsCents: 900n, baseCents: 10000n, cClassTrib: null, natureza: 'SERVICO', ...over };
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

describe('item 12 — reclassificação por natureza do documento', () => {
  it('NFS-e vai para serviço, NF-e para revenda; a soma é o débito', () => {
    const r = apurarIbsCbsMes({
      ano: 2027, mes: 3, tributo: 'IBS', tabela,
      documentos: [doc({ fiscalDocumentId: 'a', ibsCents: 10n }), doc({ fiscalDocumentId: 'b', ibsCents: 4n, baseCents: 4000n, natureza: 'MERCADORIA' })],
      vendasSemDocumento: [],
    });
    expect([r.servicoCents, r.revendaCents, r.debitosCents]).toEqual([10n, 4n, 14n]);
    expect(r.memoria.find((l) => l.codigo === 'RECLASSIFICACAO_SERVICO')?.valorCents).toBe('10');
    expect(r.memoria.find((l) => l.codigo === 'RECLASSIFICACAO_REVENDA')?.valorCents).toBe('4');
  });

  it('documento sem base ⇒ CONFERENCIA_SEM_BASE, débito inalterado (dono 21/10)', () => {
    const r = apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [doc({ ibsCents: 99n, baseCents: null })], vendasSemDocumento: [] });
    expect(r.debitosCents).toBe(99n);
    expect(codigos(r.memoria)).toContain('CONFERENCIA_SEM_BASE');
    expect(codigos(r.memoria).some((c) => c.startsWith('DIVERGENCIA_DOC'))).toBe(false);
  });
});

describe('itens 9 e 11 — saldo e memória', () => {
  it('saldo = débitos − créditos; sem nota de entrada, créditos 0 (PR-3: sem linha de "não implementado")', () => {
    const r = apurarIbsCbsMes({
      ano: 2027, mes: 3, tributo: 'IBS', tabela,
      documentos: [doc({ fiscalDocumentId: 'a', ibsCents: 10n }), doc({ fiscalDocumentId: 'b', ibsCents: null, baseCents: null })],
      vendasSemDocumento: [],
    });
    expect(r.creditosCents).toBe(0n);
    expect(r.saldoCents).toBe(r.debitosCents - r.creditosCents);
    expect(r.documentosSemGrupo).toBe(1);
    expect(codigos(r.memoria)).toEqual([
      'DEBITO_DOC_1', 'DEBITO_DOC_2', 'CONFERENCIA_SEM_BASE', 'DOCUMENTOS_SEM_GRUPO',
      'RECLASSIFICACAO_SERVICO', 'RECLASSIFICACAO_REVENDA', 'RECEITA_BRUTA_ATE_APURACAO', 'SALDO',
    ]);
    expect(r.memoria.at(-1)?.valorCents).toBe('10');
  });
});

// IBS-CBS-2027 PR-3 (BRIEF item 16; invariante §10.3): só APROPRIADO no mês soma; PENDENTE nunca soma; uso/consumo fora.
describe('item 16 — créditos da entrada na apuração', () => {
  const nota = (over: Partial<IbsCbsCreditoNota>): IbsCbsCreditoNota => ({
    payableId: 'p1', documentNumber: 'NF-1', issueDate: '2027-03-05', tributo: 'IBS', amountCents: 4n, status: 'APROPRIADO', apropriadoEm: '2027-03-20', usoConsumoCents: 0n, ...over,
  });
  const apurar = (creditos: IbsCbsCreditoNota[]) =>
    apurarIbsCbsMes({ ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [doc({ ibsCents: 10n })], vendasSemDocumento: [], creditos });

  it('APROPRIADO no mês soma em creditosCents (CREDITO_ENTRADA_n); saldo = débitos − créditos', () => {
    const r = apurar([nota({}), nota({ payableId: 'p2', amountCents: 3n, apropriadoEm: '2027-03-31' })]);
    expect(r.creditosCents).toBe(7n);
    expect(r.saldoCents).toBe(3n);
    expect(r.memoria.filter((l) => l.codigo.startsWith('CREDITO_ENTRADA_')).map((l) => l.valorCents)).toEqual(['4', '3']);
  });

  it('PENDENTE (ou apropriado depois do mês) nunca soma — vira CREDITO_NAO_APROPRIADO_n', () => {
    const r = apurar([nota({ status: 'PENDENTE', apropriadoEm: null }), nota({ payableId: 'p2', apropriadoEm: '2027-04-02' })]);
    expect(r.creditosCents).toBe(0n);
    expect(r.saldoCents).toBe(10n);
    expect(codigos(r.memoria).filter((c) => c.startsWith('CREDITO_NAO_APROPRIADO_'))).toEqual(['CREDITO_NAO_APROPRIADO_1', 'CREDITO_NAO_APROPRIADO_2']);
  });

  it('crédito apropriado em mês anterior não soma de novo; outro tributo não entra (art. 47 § 1º I)', () => {
    const r = apurar([nota({ apropriadoEm: '2027-02-28' }), nota({ payableId: 'p2', tributo: 'CBS' })]);
    expect(r.creditosCents).toBe(0n);
    expect(codigos(r.memoria).some((c) => c.startsWith('CREDITO_'))).toBe(false);
  });

  it('saldo credor: créditos > débitos ⇒ saldo negativo', () => {
    expect(apurar([nota({ amountCents: 25n })]).saldoCents).toBe(-15n);
  });

  it('uso/consumo pessoal da nota do mês ⇒ USO_CONSUMO_PESSOAL_n, sem somar', () => {
    const r = apurar([nota({ status: 'PENDENTE', apropriadoEm: null, amountCents: 0n, usoConsumoCents: 6n })]);
    expect(r.creditosCents).toBe(0n);
    expect(r.memoria.find((l) => l.codigo === 'USO_CONSUMO_PESSOAL_1')?.valorCents).toBe('6');
    expect(codigos(r.memoria).some((c) => c.startsWith('CREDITO_NAO_APROPRIADO'))).toBe(false);
  });
});

// IBS-CBS-2027 PR-3 (itens 17–18): a antecipação soma ao débito, a reclassificação (documentosCents) não muda (V7).
describe('itens 17–18 — antecipação entra no débito, não na reclassificação', () => {
  it('debitosCents = documentos + antecipação; documentosCents = servico + revenda', () => {
    const r = apurarIbsCbsMes({
      ano: 2027, mes: 3, tributo: 'IBS', tabela, documentos: [doc({ ibsCents: 10n })], vendasSemDocumento: [],
      antecipacao: { debitosCents: 5n, memoria: [{ codigo: 'ANTECIPACAO_ART10_1', descricao: '', valorCents: '5', fonte: '' }] },
    });
    expect(r.debitosCents).toBe(15n);
    expect(r.documentosCents).toBe(10n);
    expect(r.servicoCents + r.revendaCents).toBe(r.documentosCents);
    expect(r.saldoCents).toBe(15n);
    expect(codigos(r.memoria)).toContain('ANTECIPACAO_ART10_1');
  });
});

