/**
 * IBS-CBS-2027 PR-2 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 6, 7, 11) — débito por documento,
 * competência pelo dia escrito e conferência só como aviso. Tabela `IBS_CBS` lida da semente (mesmo texto da migração).
 *
 * Conta de mão: IBS 2027 = UF 5 bp + município 5 bp = 10 bp. Base R$ 1.000,00 ⇒ 100 centavos (R$ 1,00).
 */
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { agregarIbsCbsPorCompetencia, aliquotaBpNaData, IbsCbsDocumentoSchema, type IbsCbsDocumento } from '../ibsCbsCompetencia';
import { tabelaIbsCbsDe } from '../ibsCbsParams';

const tabela = tabelaIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS));

let n = 0;
const doc = (over: Partial<IbsCbsDocumento> = {}): IbsCbsDocumento => {
  n += 1;
  return { fiscalDocumentId: `fd-${n}`, kind: 'NFSE', dataEmissaoLocal: '2027-01-10', status: 'AUTHORIZED', ibsCents: 100n, cbsCents: 800n, baseCents: null, cClassTrib: null, ...over };
};
const de = (r: ReturnType<typeof agregarIbsCbsPorCompetencia>, competencia: string, tributo: 'IBS' | 'CBS') => r.find((x) => x.competencia === competencia && x.tributo === tributo)!;

describe('IBS-CBS-2027 PR-2 — agregarIbsCbsPorCompetencia', () => {
  it('item 6: soma o declarado em cada documento por competência × tributo, repartindo NFS-e (serviço) × NF-e (mercadoria)', () => {
    const r = agregarIbsCbsPorCompetencia(
      [doc({ ibsCents: 100n, cbsCents: 800n }), doc({ kind: 'NFE', status: 'AUTHORIZED_DIVERGENT', ibsCents: 30n, cbsCents: 270n }), doc({ dataEmissaoLocal: '2027-02-01', ibsCents: 7n, cbsCents: 9n })],
      tabela,
    );
    expect(r.map((x) => `${x.competencia}/${x.tributo}`)).toEqual(['2027-01/CBS', '2027-01/IBS', '2027-02/CBS', '2027-02/IBS']);
    const ibsJan = de(r, '2027-01', 'IBS');
    expect([ibsJan.debitosCents, ibsJan.debitoServicoCents, ibsJan.debitoMercadoriaCents, ibsJan.documentos]).toEqual([130n, 100n, 30n, 2]);
    expect(de(r, '2027-01', 'CBS').debitosCents).toBe(1070n);
    expect(ibsJan.memoria.filter((l) => l.codigo.startsWith('DEBITO_DOC_')).map((l) => l.valorCents)).toEqual(['100', '30']);
  });

  it('item 6 (invariante §10.2): documento sem o tributo soma 0 e conta em documentosSemGrupo', () => {
    const r = agregarIbsCbsPorCompetencia([doc({ ibsCents: null, cbsCents: null }), doc({ ibsCents: 50n, cbsCents: null })], tabela);
    expect([de(r, '2027-01', 'IBS').debitosCents, de(r, '2027-01', 'IBS').documentosSemGrupo]).toEqual([50n, 1]);
    expect([de(r, '2027-01', 'CBS').debitosCents, de(r, '2027-01', 'CBS').documentosSemGrupo]).toEqual([0n, 2]);
  });

  it('item 6: a competência é o dia ESCRITO — o contrato recusa ISO com hora (00:30 −03:00 viraria 03:30Z)', () => {
    expect(() => IbsCbsDocumentoSchema.parse(doc({ dataEmissaoLocal: '2027-02-01T00:30:00-03:00' }))).toThrow();
    expect(agregarIbsCbsPorCompetencia([doc({ dataEmissaoLocal: '2027-02-01' })], tabela)[0].competencia).toBe('2027-02');
  });

  it('item 6: só AUTHORIZED / AUTHORIZED_DIVERGENT entram — CANCELLED é recusado pelo contrato', () => {
    expect(() => agregarIbsCbsPorCompetencia([{ ...doc(), status: 'CANCELLED' as unknown as 'AUTHORIZED' }], tabela)).toThrow();
  });

  it('item 7: sem base gravada ⇒ CONFERENCIA_SEM_BASE (dono 21/10) e o débito é o declarado', () => {
    const ibs = de(agregarIbsCbsPorCompetencia([doc(), doc()], tabela), '2027-01', 'IBS');
    expect(ibs.debitosCents).toBe(200n);
    expect(ibs.memoria.find((l) => l.codigo === 'CONFERENCIA_SEM_BASE')!.descricao).toMatch(/^2 documento/);
  });

  it('item 7 / F-IBS-11 (a): CBS 2027 sem alíquota publicada ⇒ CONFERENCIA_SEM_ALIQUOTA, sem 400 e sem mudar o débito', () => {
    const cbs = de(agregarIbsCbsPorCompetencia([doc({ baseCents: 100_000n, cbsCents: 800n })], tabela), '2027-01', 'CBS');
    expect(cbs.debitosCents).toBe(800n);
    expect(cbs.memoria.map((l) => l.codigo)).toEqual(['DEBITO_DOC_1', 'CONFERENCIA_SEM_ALIQUOTA']);
  });

  it('item 7: com base e alíquota, divergência vira aviso DIVERGENCIA_DOC_n com a diferença — o débito continua o declarado', () => {
    expect(aliquotaBpNaData(tabela, 'IBS', '2027-01-10')).toBe(10);
    const ibs = de(agregarIbsCbsPorCompetencia([doc({ baseCents: 100_000n, ibsCents: 100n }), doc({ baseCents: 100_000n, ibsCents: 130n })], tabela), '2027-01', 'IBS');
    expect(ibs.debitosCents).toBe(230n);
    expect(ibs.memoria.filter((l) => l.codigo.startsWith('DIVERGENCIA_DOC_')).map((l) => [l.codigo, l.valorCents])).toEqual([['DIVERGENCIA_DOC_2', '30']]);
  });
});
