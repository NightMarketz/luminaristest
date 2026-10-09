import type { CompanyFiscalProfile, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Colunas graváveis do perfil da empresa (X13, BRIEF §4.1) — sem ecfRecibo/regimeTravadoEm (PR-2, F-XP-5 a) e sem
 * `formaApuracaoTravadaEm` (X7: só a confirmação da apuração grava, na própria tx — F-X7-5 a).
 */
export interface CompanyFiscalProfileData {
  regime: string;
  grandePorte: boolean | null;
  inativa: boolean;
  aporteInvestidorAnjo: boolean | null;
  livroCaixaSemEscrituracao: boolean | null;
  distribuicaoAcimaBase: boolean | null;
  declarante: Prisma.InputJsonValue | typeof Prisma.DbNull;
  ecdIndNire: string | null;
  ecdNire: string | null;
  ecdNumOrd: string | null;
  ecdNatLivr: string | null;
  ecfIndAliqCsll: string | null;
  ecfIndRecReceita: string | null;
  contadorContactId: string | null;
  representanteLegalSignerId: string | null;
  // X7 Fase A (BRIEF itens 1, 2, 2b)
  formaApuracaoIrpjCsll: string | null;
  lucroRealObrigatorio: boolean | null;
  inicioAtividadeEm: string | null;
  encerramentoAtividadeEm: string | null;
  lc224AcrescimoSuspenso: boolean;
  lc224LiminarReferencia: string | null;
  // X7 Fase B (BRIEF B item 3b)
  prestadoraExclusivaServicos: boolean;
  declaraNaoProfissaoRegulamentada: boolean; // BE-INCR-TAX-PRESUMIDO-16 (F-P16-1 a)
  // BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, item 14): 'DAS' | 'REGULAR' | null (= DAS)
  ibsCbsOpcaoS1: string | null;
  ibsCbsOpcaoS2: string | null;
  // BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, item 25): enquadramento do MEI no Anexo XI
  meiContribuinteIcms: boolean | null;
  meiContribuinteIss: boolean | null;
  meiTransportadorCargas: boolean | null;
}

/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, BRIEF item 6) — único lugar com `prisma.companyFiscalProfile.*`.
 * Chave = (scope.ownerUserId, ano): instância = CNPJ raiz (R8); o `unitId` do escopo NÃO entra no where.
 */
export interface ICompanyFiscalProfileRepository {
  findByYear(scope: AccountingScope, ano: number, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile | null>;
  upsert(scope: AccountingScope, ano: number, data: CompanyFiscalProfileData, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile>;
  softDelete(scope: AccountingScope, ano: number, tx?: Prisma.TransactionClient): Promise<number>;
  /** PR-2 item 16 (F-XP-5 a): grava o recibo da ECF transmitida e trava o regime do ano. */
  setEcfTransmitida(scope: AccountingScope, ano: number, recibo: string, travadoEm: Date, tx?: Prisma.TransactionClient): Promise<CompanyFiscalProfile>;
  /**
   * X7 item 14 (D2, F-X7-5 a): grava `formaApuracaoTravadaEm` só se estiver nulo (CAS) — chamado DENTRO da tx da
   * confirmação. Devolve quantas linhas mudaram (0 = já travado).
   */
  travarFormaApuracao(scope: AccountingScope, ano: number, em: Date, tx: Prisma.TransactionClient): Promise<number>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
