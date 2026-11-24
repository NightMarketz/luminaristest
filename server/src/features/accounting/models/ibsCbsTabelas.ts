/**
 * BE-INCR-NFCE (nó X10a, item 20; F-NFCE-12b b) — tabelas de domínio do IBS/CBS que as regras do grupo UB consultam
 * (NT 2025.002 v1.52: "Consultar Tabela de Indicadores de CST", "…de cClassTrib", "…de Crédito Presumido"). Fonte: Portal
 * NF-e › Documentos › Diversos, IT 2025.002 v1.70 publicado em 01/10/2026, lido em 27/10/2026 pelo navegador:
 *  - `IT 2025.002 v.1.70 - cClassTrib.xlsx` sha256 bee3e106d24c06257d31105658679e97e2544dcc3ac61467fbe0ca4f78c6e850
 *    (abas "CST 2026-09-01" e "cClass 2026-09-01");
 *  - `IT 2025.002 v.1.70 - cCredPres.xlsx` sha256 5afee01483e532b342700f8c2786f95ba6cf91a4e23ceccfbeb34bf1afef9ee1 (aba "cCredPres").
 * Transcrição: `docs/accounting/fontes-oficiais/TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md` (as colunas usadas,
 * sem os textos de lei). Gerado das TSV da transcrição; o teste `ibsCbsTabelas.test.ts` reserializa e confere o sha256.
 * Datas da planilha (serial do Excel) convertidas para AAAA-MM-DD.
 */

export type Ind = 0 | 1;

/** Tabela de Indicadores de CST (aba "CST 2026-09-01"). */
export interface CstIbsCbs {
  cst: string;
  descricao: string;
  ind_gIBSCBS: Ind;
  ind_gIBSCBSMono: Ind;
  ind_gRed: Ind;
  ind_gDif: Ind;
  ind_gTransfCred: Ind;
  ind_gCredPresIBSZFM: Ind;
  ind_gAjusteCompet: Ind;
  ind_RedutorBC: Ind;
}

export const CST_IBSCBS: readonly CstIbsCbs[] = [
  { cst: '000', descricao: 'Tributação integral', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '010', descricao: 'Tributação com alíquotas uniformes', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '011', descricao: 'Tributação com alíquotas uniformes reduzidas', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 1, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '200', descricao: 'Alíquota reduzida', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 1, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '220', descricao: 'Alíquota fixa', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '222', descricao: 'Redução de base de cálculo', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 1 },
  { cst: '221', descricao: 'Alíquota fixa proporcional', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '400', descricao: 'Isenção', ind_gIBSCBS: 0, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '410', descricao: 'Imunidade e não incidência', ind_gIBSCBS: 0, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '510', descricao: 'Diferimento', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 1, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '515', descricao: 'Diferimento com redução de alíquota', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 1, ind_gDif: 1, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '550', descricao: 'Suspensão', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '620', descricao: 'Tributação monofásica', ind_gIBSCBS: 0, ind_gIBSCBSMono: 1, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '800', descricao: 'Transferência de crédito', ind_gIBSCBS: 0, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 1, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '810', descricao: 'Ajuste de IBS na ZFM', ind_gIBSCBS: 0, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 1, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '811', descricao: 'Ajustes', ind_gIBSCBS: 0, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 1, ind_RedutorBC: 0 },
  { cst: '820', descricao: 'Tributação em documento específico', ind_gIBSCBS: 0, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
  { cst: '830', descricao: 'Exclusão de base de cálculo', ind_gIBSCBS: 1, ind_gIBSCBSMono: 0, ind_gRed: 0, ind_gDif: 0, ind_gTransfCred: 0, ind_gCredPresIBSZFM: 0, ind_gAjusteCompet: 0, ind_RedutorBC: 0 },
];

/** Tabela de cClassTrib (aba "cClass 2026-09-01") — só as colunas que a montagem e as regras do UB leem. */
export interface CClassTribIbsCbs {
  cst: string;
  cClassTrib: string;
  tipoAliquota: string;
  pRedIBS: number;
  pRedCBS: number;
  ind_gTribRegular: Ind;
  ind_gCredPresOper: Ind;
  ind_gMonoPadrao: Ind;
  ind_gMonoReten: Ind;
  ind_gMonoRet: Ind;
  ind_gpBioDiferenca: Ind;
  ind_gEstornoCred: Ind;
  tpRBSN: number;
  tpDoacao: number;
  dIniVig: string;
  dFimVig: string | null;
  indNFe: Ind;
  indNFCe: Ind;
}

export const CCLASSTRIB_IBSCBS: readonly CClassTribIbsCbs[] = [
  { cst: '000', cClassTrib: '000001', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '000', cClassTrib: '000002', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '000', cClassTrib: '000003', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 1, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '000', cClassTrib: '000004', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 1, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '000', cClassTrib: '000005', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '000', cClassTrib: '000006', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '010', cClassTrib: '010001', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '010', cClassTrib: '010002', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '011', cClassTrib: '011001', tipoAliquota: 'Uniforme nacional (referência)', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '011', cClassTrib: '011002', tipoAliquota: 'Uniforme nacional (referência)', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '011', cClassTrib: '011003', tipoAliquota: 'Uniforme nacional (referência)', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '011', cClassTrib: '011004', tipoAliquota: 'Uniforme nacional (referência)', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '011', cClassTrib: '011005', tipoAliquota: 'Uniforme nacional (referência)', pRedIBS: 30, pRedCBS: 30, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200001', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 3, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200002', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200003', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200004', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200005', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200006', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200007', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200008', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200009', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200010', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200011', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200012', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200013', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200014', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200015', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200016', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200017', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200018', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200019', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200020', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200021', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200022', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200023', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200024', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200025', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200026', tipoAliquota: 'Padrão', pRedIBS: 80, pRedCBS: 80, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200027', tipoAliquota: 'Padrão', pRedIBS: 70, pRedCBS: 70, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200028', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200029', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200030', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200031', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200032', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200033', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200034', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200035', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200036', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200037', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200038', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200039', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200040', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200041', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200042', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200043', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '200', cClassTrib: '200044', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200045', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200046', tipoAliquota: 'Padrão', pRedIBS: 50, pRedCBS: 50, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200047', tipoAliquota: 'Padrão', pRedIBS: 40, pRedCBS: 40, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200048', tipoAliquota: 'Padrão', pRedIBS: 40, pRedCBS: 40, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200049', tipoAliquota: 'Padrão', pRedIBS: 40, pRedCBS: 40, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200050', tipoAliquota: 'Padrão', pRedIBS: 40, pRedCBS: 40, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200051', tipoAliquota: 'Padrão', pRedIBS: 40, pRedCBS: 40, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200052', tipoAliquota: 'Padrão', pRedIBS: 30, pRedCBS: 30, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200053', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200054', tipoAliquota: 'Padrão', pRedIBS: 100, pRedCBS: 100, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 1, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '200', cClassTrib: '200055', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '200', cClassTrib: '200056', tipoAliquota: 'Padrão', pRedIBS: 30, pRedCBS: 30, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '220', cClassTrib: '220001', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: '2026-01-01', indNFe: 0, indNFCe: 0 },
  { cst: '220', cClassTrib: '220002', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: '2026-01-01', indNFe: 0, indNFCe: 0 },
  { cst: '220', cClassTrib: '220003', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: '2026-01-01', indNFe: 0, indNFCe: 0 },
  { cst: '221', cClassTrib: '221001', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '221', cClassTrib: '221002', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '221', cClassTrib: '221003', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '221', cClassTrib: '221004', tipoAliquota: 'Fixa', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '222', cClassTrib: '222001', tipoAliquota: 'Padrão', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 5, tpDoacao: 2, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '400', cClassTrib: '400001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '400', cClassTrib: '400002', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '400', cClassTrib: '400003', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '400', cClassTrib: '400004', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410002', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410003', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 1, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410004', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 3, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410005', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410006', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410007', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410008', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 2, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410009', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 2, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410010', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 2, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410011', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 2, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410012', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410013', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 3, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410014', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410015', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410016', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 1, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410017', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410018', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410019', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410020', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410021', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410022', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410023', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410024', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410025', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410026', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 1, tpRBSN: 0, tpDoacao: 1, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410027', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 3, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410028', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410029', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410030', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 1, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410031', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '410', cClassTrib: '410032', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410033', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410034', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410035', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '410', cClassTrib: '410036', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410037', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '410', cClassTrib: '410999', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '510', cClassTrib: '510001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 2, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '515', cClassTrib: '515001', tipoAliquota: 'Padrão', pRedIBS: 60, pRedCBS: 60, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 4, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550002', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '550', cClassTrib: '550003', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550004', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 4, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550005', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 4, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550006', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550007', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550008', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550009', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550010', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550011', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550012', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550013', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550014', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 4, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550015', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550016', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550017', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550018', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550019', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550020', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550021', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 4, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550022', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550023', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550024', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '550', cClassTrib: '550025', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 1, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '550', cClassTrib: '550026', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550027', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550028', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '550', cClassTrib: '550029', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 1, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 4, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '620', cClassTrib: '620001', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 1, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '620', cClassTrib: '620002', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 1, ind_gMonoReten: 1, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '620', cClassTrib: '620003', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '620', cClassTrib: '620004', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 1, ind_gpBioDiferenca: 1, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '620', cClassTrib: '620005', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 1, ind_gpBioDiferenca: 1, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '620', cClassTrib: '620006', tipoAliquota: 'Uniforme setorial', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 1, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 2, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 },
  { cst: '620', cClassTrib: '620007', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '800', cClassTrib: '800001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '800', cClassTrib: '800002', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '810', cClassTrib: '810001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '811', cClassTrib: '811001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '811', cClassTrib: '811002', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '811', cClassTrib: '811003', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
  { cst: '820', cClassTrib: '820001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820002', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820003', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820004', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820005', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820006', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820007', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 9, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820008', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '820', cClassTrib: '820009', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 0, indNFCe: 0 },
  { cst: '830', cClassTrib: '830001', tipoAliquota: 'Sem alíquota', pRedIBS: 0, pRedCBS: 0, ind_gTribRegular: 0, ind_gCredPresOper: 0, ind_gMonoPadrao: 0, ind_gMonoReten: 0, ind_gMonoRet: 0, ind_gpBioDiferenca: 0, ind_gEstornoCred: 0, tpRBSN: 0, tpDoacao: 0, dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 0 },
];

/** Tabela de cCredPres (aba "cCredPres") — `null` onde a planilha deixa a célula vazia. */
export interface CCredPresIbsCbs {
  cCredPres: string;
  apropriaViaNf: Ind;
  apropriaViaEvento: Ind;
  indDeduzCredPres: Ind | null;
  ind_gCBSCredPres: Ind | null;
  ind_gIBSCredPres: Ind | null;
  cClassTribNotaReferenciada: string;
  dIniVigCBS: string | null;
  dFimVigCBS: string | null;
  dIniVigIBS: string | null;
  dFimVigIBS: string | null;
  indNFe: Ind;
  indNFCe: Ind;
}

export const CCREDPRES_IBSCBS: readonly CCredPresIbsCbs[] = [
  { cCredPres: '01', apropriaViaNf: 0, apropriaViaEvento: 1, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: '410014', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: '2027-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '02', apropriaViaNf: 0, apropriaViaEvento: 1, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: '410015', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: '2027-01-01', dFimVigIBS: null, indNFe: 0, indNFCe: 0 },
  { cCredPres: '03', apropriaViaNf: 0, apropriaViaEvento: 1, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: '410016', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: '2029-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '04', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: 1, ind_gCBSCredPres: 1, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: '410017', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: '2027-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 1 },
  { cCredPres: '05', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 0, cClassTribNotaReferenciada: 'Com incidência de CBS', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: null, dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '06', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 0, cClassTribNotaReferenciada: 'Com incidência de CBS', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: null, dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '07', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: 1, ind_gCBSCredPres: null, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: 'Com incidência de IBS', dIniVigCBS: null, dFimVigCBS: null, dIniVigIBS: '2027-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '08', apropriaViaNf: 0, apropriaViaEvento: 1, indDeduzCredPres: null, ind_gCBSCredPres: 0, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: 'cClass de alíquota zero', dIniVigCBS: null, dFimVigCBS: null, dIniVigIBS: '2029-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '09', apropriaViaNf: 0, apropriaViaEvento: 1, indDeduzCredPres: null, ind_gCBSCredPres: 0, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: 'cClass de alíquota zero', dIniVigCBS: null, dFimVigCBS: null, dIniVigIBS: '2029-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '10', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 0, cClassTribNotaReferenciada: 'Com incidência de CBS', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: null, dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '11', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: 1, ind_gCBSCredPres: 0, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: 'Com incidência de IBS', dIniVigCBS: null, dFimVigCBS: null, dIniVigIBS: '2027-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '12', apropriaViaNf: 0, apropriaViaEvento: 1, indDeduzCredPres: null, ind_gCBSCredPres: 0, ind_gIBSCredPres: 1, cClassTribNotaReferenciada: 'cClass de alíquota zero', dIniVigCBS: null, dFimVigCBS: null, dIniVigIBS: '2029-01-01', dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
  { cCredPres: '13', apropriaViaNf: 1, apropriaViaEvento: 0, indDeduzCredPres: null, ind_gCBSCredPres: 1, ind_gIBSCredPres: 0, cClassTribNotaReferenciada: 'Com incidência de CBS', dIniVigCBS: '2027-01-01', dFimVigCBS: null, dIniVigIBS: null, dFimVigIBS: null, indNFe: 1, indNFCe: 0 },
];

const CST_POR_CODIGO = new Map(CST_IBSCBS.map((c) => [c.cst, c]));
const CCLASS_POR_CODIGO = new Map(CCLASSTRIB_IBSCBS.map((c) => [c.cClassTrib, c]));
const CCRED_POR_CODIGO = new Map(CCREDPRES_IBSCBS.map((c) => [c.cCredPres, c]));

export const cstIbsCbs = (cst: string): CstIbsCbs | undefined => CST_POR_CODIGO.get(cst);
export const cClassTribIbsCbs = (c: string): CClassTribIbsCbs | undefined => CCLASS_POR_CODIGO.get(c);
export const cCredPresIbsCbs = (c: string): CCredPresIbsCbs | undefined => CCRED_POR_CODIGO.get(c);

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Onda 3.2 fatia 5 (dono, 24/11/2026) — as mesmas tabelas como LegalParameter: CST_IBS_CBS, CCLASSTRIB_IBS_CBS e
// CCREDPRES_IBS_CBS (seed gerado da TSV por `scripts/gerar-carga-ibs-cbs-tabelas.mjs`). A leitura é PURA, parametrizada pela
// fotografia das três tabelas; sem linha de uma delas ⇒ `PARAMETRO_LEGAL_AUSENTE` (fail-closed, nunca "tudo inexistente").
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

import { z } from 'zod';
import { LinhaLegalIlegivelError, ParametroLegalAusenteError, linhasEmVigor, type LinhaLegal, type LegalParameterTabela } from '../../legalParameters/models/legalParameter';
import { linhasEmCacheSincrono } from '../../legalParameters/services/legalParameterCache';
import { hojeDateOnly } from '../../legalParameters/models/hoje';

export const TABELAS_IBS_CBS = ['CST_IBS_CBS', 'CCLASSTRIB_IBS_CBS', 'CCREDPRES_IBS_CBS'] as const satisfies readonly LegalParameterTabela[];

const IndJson = z.union([z.literal(0), z.literal(1)]);
const Ordem = z.number().int().min(1);
const DataJson = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** `valorJson` das linhas de CST_IBS_CBS (chave = CST de 3 dígitos). */
export const CstIbsCbsJson = z
  .object({
    ordem: Ordem, descricao: z.string().min(1), ind_gIBSCBS: IndJson, ind_gIBSCBSMono: IndJson, ind_gRed: IndJson, ind_gDif: IndJson,
    ind_gTransfCred: IndJson, ind_gCredPresIBSZFM: IndJson, ind_gAjusteCompet: IndJson, ind_RedutorBC: IndJson,
  })
  .strict();
/** `valorJson` das linhas de CCLASSTRIB_IBS_CBS (chave = cClassTrib de 6 dígitos; vigência da planilha = vigenteDesde/vigenteAte). */
export const CClassTribIbsCbsJson = z
  .object({
    ordem: Ordem, cst: z.string().regex(/^\d{3}$/), tipoAliquota: z.string().min(1), pRedIBS: z.number().min(0).max(100), pRedCBS: z.number().min(0).max(100),
    ind_gTribRegular: IndJson, ind_gCredPresOper: IndJson, ind_gMonoPadrao: IndJson, ind_gMonoReten: IndJson, ind_gMonoRet: IndJson,
    ind_gpBioDiferenca: IndJson, ind_gEstornoCred: IndJson, tpRBSN: z.number().int(), tpDoacao: z.number().int(), indNFe: IndJson, indNFCe: IndJson,
  })
  .strict();
/** `valorJson` das linhas de CCREDPRES_IBS_CBS (chave = cCredPres de 2 dígitos; as duas vigências, CBS e IBS, ficam aqui). */
export const CCredPresIbsCbsJson = z
  .object({
    ordem: Ordem, apropriaViaNf: IndJson, apropriaViaEvento: IndJson, indDeduzCredPres: IndJson.nullable(), ind_gCBSCredPres: IndJson.nullable(),
    ind_gIBSCredPres: IndJson.nullable(), cClassTribNotaReferenciada: z.string().min(1), dIniVigCBS: DataJson.nullable(), dFimVigCBS: DataJson.nullable(),
    dIniVigIBS: DataJson.nullable(), dFimVigIBS: DataJson.nullable(), indNFe: IndJson, indNFCe: IndJson,
  })
  .strict();

/** As três tabelas lidas da fotografia: em ordem da planilha (para reserializar a TSV) e indexadas por código. */
export interface TabelasIbsCbs {
  cst: readonly CstIbsCbs[];
  cClassTrib: readonly CClassTribIbsCbs[];
  cCredPres: readonly CCredPresIbsCbs[];
  /** cClassTrib → todas as versões (vigências) do código, da mais antiga para a mais nova. */
  readonly cClassTribPorCodigo: ReadonlyMap<string, readonly CClassTribIbsCbs[]>;
  readonly cstPorCodigo: ReadonlyMap<string, CstIbsCbs>;
  readonly cCredPresPorCodigo: ReadonlyMap<string, CCredPresIbsCbs>;
}

function lerJson<S extends z.ZodType>(schema: S, l: LinhaLegal): z.infer<S> & { ordem: number } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(l.valorJson ?? '');
  } catch {
    throw new LinhaLegalIlegivelError(l.id, l.tabela, l.chave);
  }
  const r = schema.safeParse(bruto);
  if (!r.success) throw new LinhaLegalIlegivelError(l.id, l.tabela, l.chave);
  return r.data as z.infer<S> & { ordem: number };
}

/** Uma linha por código: a de `vigenteDesde` mais recente (supersedes já resolvido por `linhasEmVigor`). */
function maisNovaPorChave(linhas: readonly LinhaLegal[], tabela: string): LinhaLegal[] {
  const porChave = new Map<string, LinhaLegal>();
  for (const l of linhasEmVigor(linhas)) {
    if (l.tabela !== tabela) continue;
    const atual = porChave.get(l.chave);
    if (!atual || l.vigenteDesde > atual.vigenteDesde) porChave.set(l.chave, l);
  }
  return [...porChave.values()];
}

/**
 * A fotografia → as três tabelas. Falta tabela INTEIRA (carga incompleta) ⇒ `ParametroLegalAusenteError` (400
 * `PARAMETRO_LEGAL_AUSENTE`), nunca uma tabela vazia que recusaria todo CST/cClassTrib como "inexistente" em silêncio.
 * Ausência de UM código dentro de tabela existente continua sendo "inexistente" (rej. 1020/1023/1055).
 */
export function tabelasIbsCbsDe(linhas: readonly LinhaLegal[], data: string): TabelasIbsCbs {
  const cstLinhas = maisNovaPorChave(linhas, 'CST_IBS_CBS');
  const credLinhas = maisNovaPorChave(linhas, 'CCREDPRES_IBS_CBS');
  // cClassTrib guarda TODAS as versões do código: a virada de vigência é uma linha nova, não a troca da antiga.
  const classLinhas = linhasEmVigor(linhas).filter((l) => l.tabela === 'CCLASSTRIB_IBS_CBS');
  if (cstLinhas.length === 0) throw new ParametroLegalAusenteError('CST_IBS_CBS', data);
  if (classLinhas.length === 0) throw new ParametroLegalAusenteError('CCLASSTRIB_IBS_CBS', data);
  if (credLinhas.length === 0) throw new ParametroLegalAusenteError('CCREDPRES_IBS_CBS', data);

  const porOrdem = <T extends { ordem: number }>(xs: T[]): T[] => xs.sort((a, b) => a.ordem - b.ordem);
  const semOrdem = <T extends { ordem: number }>(xs: T[]): Omit<T, 'ordem'>[] => xs.map(({ ordem: _o, ...r }) => r);
  const cst = semOrdem(
    porOrdem(
      cstLinhas.map((l) => {
        const v = lerJson(CstIbsCbsJson, l);
        return { ...v, cst: l.chave };
      }),
    ),
  ) as CstIbsCbs[];
  const cClassTrib = semOrdem(
    porOrdem(
      classLinhas.map((l) => {
        const v = lerJson(CClassTribIbsCbsJson, l);
        return { ...v, cClassTrib: l.chave, dIniVig: l.vigenteDesde, dFimVig: l.vigenteAte };
      }),
    ),
  ) as CClassTribIbsCbs[];
  const cCredPres = semOrdem(
    porOrdem(
      credLinhas.map((l) => {
        const v = lerJson(CCredPresIbsCbsJson, l);
        return { ...v, cCredPres: l.chave };
      }),
    ),
  ) as CCredPresIbsCbs[];

  const versoes = new Map<string, CClassTribIbsCbs[]>();
  for (const c of cClassTrib) versoes.set(c.cClassTrib, [...(versoes.get(c.cClassTrib) ?? []), c]);
  for (const v of versoes.values()) v.sort((a, b) => a.dIniVig.localeCompare(b.dIniVig));
  return {
    cst,
    cClassTrib,
    cCredPres,
    cClassTribPorCodigo: versoes,
    cstPorCodigo: new Map(cst.map((c) => [c.cst, c])),
    cCredPresPorCodigo: new Map(cCredPres.map((c) => [c.cCredPres, c])),
  };
}

/**
 * Só para o DTO Zod estático (emenda §9 L-8, dono 07/10: "DTO lê o cache síncrono"): as tabelas do cache aquecido no boot.
 * Cache frio é defeito de inicialização (erro explícito de `linhasEmCacheSincrono`), tabela vazia é `PARAMETRO_LEGAL_AUSENTE`.
 */
export function tabelasIbsCbsDoCache(data: string = hojeDateOnly()): TabelasIbsCbs {
  return tabelasIbsCbsDe(TABELAS_IBS_CBS.flatMap((t) => linhasEmCacheSincrono(t)) as unknown as LinhaLegal[], data);
}

export const buscarCst = (t: TabelasIbsCbs, cst: string): CstIbsCbs | undefined => t.cstPorCodigo.get(cst);
export const buscarCCredPres = (t: TabelasIbsCbs, c: string): CCredPresIbsCbs | undefined => t.cCredPresPorCodigo.get(c);
/**
 * O cClassTrib do código: a versão vigente em `data`; se nenhuma cobre a data, a mais recente (o código EXISTE — a vigência
 * é outra regra, a da montagem, que dá a mensagem "fora da vigência"). Sem `data`, a mais recente.
 */
export function buscarCClassTrib(t: TabelasIbsCbs, codigo: string, data?: string): CClassTribIbsCbs | undefined {
  const v = t.cClassTribPorCodigo.get(codigo);
  if (!v || v.length === 0) return undefined;
  if (data) {
    for (let i = v.length - 1; i >= 0; i--) {
      const fim = v[i].dFimVig;
      if (data >= v[i].dIniVig && (fim === null || data <= fim)) return v[i];
    }
  }
  return v[v.length - 1];
}
