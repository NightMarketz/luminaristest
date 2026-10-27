import { createHash } from 'crypto';
import { CCLASSTRIB_IBSCBS, CCREDPRES_IBSCBS, CST_IBSCBS, cClassTribIbsCbs, cstIbsCbs } from '../ibsCbsTabelas';

/**
 * BE-INCR-NFCE (X10a, item 20) — a transcrição das tabelas do IT 2025.002 v1.70 é fiel: reserializa as linhas no formato da
 * TSV extraída da planilha do Portal NF-e (mesmas colunas, datas de volta ao serial do Excel) e confere o sha256 que o
 * navegador calculou sobre a TSV no momento da leitura (27/10/2026). Um dígito trocado em qualquer linha muda o hash.
 */
const serial = (d: string | null): string => (d ? String(Math.round((Date.parse(`${d}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86_400_000)) : '');
const nul = (v: number | null): string => (v === null ? '' : String(v));
const sha = (linhas: string[]): string => createHash('sha256').update(`${linhas.join('\n')}\n`, 'utf8').digest('hex');

describe('ibsCbsTabelas — transcrição conferida por hash', () => {
  it('tabela de indicadores de CST', () => {
    const linhas = [
      'CST-IBS/CBS\tDescrição CST-IBS/CBS\tind_gIBSCBS\tind_gIBSCBSMono\tind_gRed\tind_gDif\tind_gTransfCred\tind_ gCredPresIBSZFM\tind_gAjusteCompet\tind_RedutorBC',
      ...CST_IBSCBS.map((c) =>
        [c.cst, c.descricao, c.ind_gIBSCBS, c.ind_gIBSCBSMono, c.ind_gRed, c.ind_gDif, c.ind_gTransfCred, c.ind_gCredPresIBSZFM, c.ind_gAjusteCompet, c.ind_RedutorBC].join('\t'),
      ),
    ];
    expect(sha(linhas)).toBe('805c43302b46576952fe02ccfc4fd2fc40e995dfb0a1772ad75ff8c59e5fce86');
  });

  it('tabela de cClassTrib', () => {
    const linhas = [
      'CST-IBS/CBS\tcClassTrib\tTipo de Alíquota\tpRedIBS\tpRedCBS\tind_gTribRegular\tind_gCredPresOper\tind_gMonoPadrao\tind_gMonoReten\tind_gMonoRet\tind_gpBioDiferenca\tind_gEstornoCred\ttpRBSN\ttpDoacao\tdIniVig\tdFimVig\tindNFe\tindNFCe',
      ...CCLASSTRIB_IBSCBS.map((c) =>
        [
          c.cst, c.cClassTrib, c.tipoAliquota, c.pRedIBS, c.pRedCBS, c.ind_gTribRegular, c.ind_gCredPresOper, c.ind_gMonoPadrao, c.ind_gMonoReten,
          c.ind_gMonoRet, c.ind_gpBioDiferenca, c.ind_gEstornoCred, c.tpRBSN, c.tpDoacao, serial(c.dIniVig), serial(c.dFimVig), c.indNFe, c.indNFCe,
        ].join('\t'),
      ),
    ];
    expect(sha(linhas)).toBe('1694f4aa04bdd4b91560fcf38a27d5c9cea25fb78cf35a41763882c155fde186');
  });

  it('tabela de cCredPres', () => {
    const linhas = [
      'cCredPres\tApropria via NF?\tApropria via evento?\tindDeduzCredPres\tind_gCBSCredPres\tind_gIBSCredPres\tcClassTrib nota referenciada\tdIniVigCBS\tdFimVigCBS\tdIniVigIBS\tdFimVigIBS\tindNFe\tindNFCe',
      ...CCREDPRES_IBSCBS.map((c) =>
        [
          c.cCredPres, c.apropriaViaNf, c.apropriaViaEvento, nul(c.indDeduzCredPres), nul(c.ind_gCBSCredPres), nul(c.ind_gIBSCredPres),
          c.cClassTribNotaReferenciada, serial(c.dIniVigCBS), serial(c.dFimVigCBS), serial(c.dIniVigIBS), serial(c.dFimVigIBS), c.indNFe, c.indNFCe,
        ].join('\t'),
      ),
    ];
    expect(sha(linhas)).toBe('d9befc11300061b773831eda19b497779c2b261fc3b6e8da1839897fb92f93cf');
  });

  it('o cClassTrib aponta para um CST da tabela de CST (UB14-20) e as datas saíram do serial certo', () => {
    for (const c of CCLASSTRIB_IBSCBS) expect(cstIbsCbs(c.cst)).toBeDefined();
    expect(cClassTribIbsCbs('000001')).toMatchObject({ cst: '000', dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 });
    expect(cClassTribIbsCbs('220001')?.dFimVig).toBe('2026-01-01');
  });
});
