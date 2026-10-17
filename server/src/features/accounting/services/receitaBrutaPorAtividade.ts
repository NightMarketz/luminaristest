import { ValidationError } from '../../../lib/errors';
import type { Account } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import type { IFiscalProfileRepository } from '../repositories/IFiscalProfileRepository';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { CLOSING_SOURCE_TYPE } from '../models/closing';
import { RECEITA_NAO_USO_CODE } from '../fixtures/ChartOfAccountsFixture';

/**
 * Ledger account codes that map to a presunção activity line (ADR-INCR-SPED-ECF §Emenda FASE 2 ponto 5). These
 * are the ONLY accounts whose receita bruta is segregated; any OTHER Revenue-nature account with movement fails
 * the exhaustiveness gate.
 *   3.1 Receita de Serviços        → serviço (P200(8) 32% IRPJ, P400(4) 32% CSLL)
 *   3.4 Receita por não uso (pacote vencido) → serviço, campo próprio (BE-INCR-H1-REFERENCIAL-3-4: decisão (b) do
 *       dono 2026-10-11 — receita bruta da atividade, DL 1.598 art. 12 IV; F-HR-3 b)
 *   3.3 Receita de Revenda de Merc. → revenda (P200(4) 8% IRPJ,  P400(2) 12% CSLL)
 */
export const SERVICO_ACCOUNT_CODE = '3.1';
export const REVENDA_ACCOUNT_CODE = '3.3';
const PRESUNCAO_ACCOUNT_CODES = new Set([SERVICO_ACCOUNT_CODE, RECEITA_NAO_USO_CODE, REVENDA_ACCOUNT_CODE]);

export interface ReceitaPorAtividade {
  servicoCents: number; // max(0, net 3.1)
  revendaCents: number; // max(0, net 3.3)
  /** Net da 3.4 COM sinal (estorno de vencimento reduz a base de serviço — `baseServicoCents` no model). */
  naoUsoCents: number;
}

interface Deps {
  accountRepo: IAccountRepository;
  postingRepo: IPostingRepository;
  /** F-PCB-1R (dono 13/10): o perfil fiscal diz quais contas são a dedução de PIS/COFINS — obrigatório, para nenhum
   *  chamador do gate esquecer a exclusão. */
  fiscalProfileRepo: Pick<IFiscalProfileRepository, 'findByScope'>;
}

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF item 6; ADR D5) — segregação da receita bruta do Presumido por
 * atividade na janela `[from, to]`, extraída de `SpedEcfGenerationService.generate` SEM mudança de comportamento:
 * uma leitura `groupByAccount` na janela alimenta o gate e a segregação.
 *
 * Gate (ECF D6 corrigido): toda conta natureza `Revenue`, analítica, com movimento na janela e código ∉ {3.1, 3.3}
 * ⇒ `ValidationError` com `unmappedRevenueAccounts` (receita não mapeada que some da base = subtributação).
 * Receita bruta = crédito líquido (devoluções/descontos entram como débito), ≥ 0.
 *
 * F-PCB-1R (a) (dono 13/10; DL 1.598/77 art. 12 §1º III): as contas de PIS/COFINS sobre o faturamento do perfil
 * fiscal (`pis|cofinsDespesaAccountId`) são DEDUÇÃO da receita bruta (natureza `Revenue`, saldo devedor) e saem do
 * gate — exatamente essas duas, nunca um prefixo: o PIS/COFINS cumulativo não reduz a base presumida (a segregação
 * continua lendo só 3.1/3.3/3.4).
 */
export async function receitaBrutaPorAtividade(
  deps: Deps,
  scope: AccountingScope,
  from: Date,
  to: Date,
  contasJaLidas?: Account[], // a ECF já leu o plano do escopo — evita a 2ª leitura
): Promise<ReceitaPorAtividade> {
  const accounts = contasJaLidas ?? (await deps.accountRepo.findManyByUnit(scope));
  const netById = await netCreditById(deps.postingRepo, scope, from, to);
  const perfil = await deps.fiscalProfileRepo.findByScope(scope);
  const deducaoIds = new Set([perfil?.pisDespesaAccountId, perfil?.cofinsDespesaAccountId].filter((id): id is string => !!id));
  const unmapped = accounts
    .filter(
      (a) =>
        a.nature === 'Revenue' &&
        a.acceptsEntries &&
        !PRESUNCAO_ACCOUNT_CODES.has(a.code) &&
        !deducaoIds.has(a.id) &&
        (netById.get(a.id) ?? 0) !== 0,
    )
    .map((a) => ({ code: a.code, name: a.name }));
  if (unmapped.length > 0) {
    throw new ValidationError(
      'Receita não segregável por atividade: contas de receita sem linha de presunção (3.1 serviço / 3.4 receita por não uso, serviço / 3.3 revenda). ' +
        'Reclassifique-as ou estenda o mapa de presunção antes de gerar a ECF.',
      { unmappedRevenueAccounts: unmapped },
    );
  }
  return segregar(accounts, netById);
}

/**
 * Segregação SEM o gate — para quem já passou pelo gate numa janela que contém esta (a ECF: gate no ano, segregação
 * por trimestre, exatamente como antes da extração).
 */
export async function receitaBrutaPorAtividadeSemGate(
  postingRepo: IPostingRepository,
  scope: AccountingScope,
  accounts: Account[],
  from: Date,
  to: Date,
): Promise<ReceitaPorAtividade> {
  return segregar(accounts, await netCreditById(postingRepo, scope, from, to));
}

async function netCreditById(postingRepo: IPostingRepository, scope: AccountingScope, from: Date, to: Date): Promise<Map<string, number>> {
  const totals = await postingRepo.groupByAccount(scope, LEDGER_STATUSES, { from, to, excludeSourceTypes: [CLOSING_SOURCE_TYPE] });
  return new Map(totals.map((t) => [t.accountId, t.creditCents - t.debitCents]));
}

function segregar(accounts: Account[], netById: Map<string, number>): ReceitaPorAtividade {
  const accountByCode = new Map(accounts.map((a) => [a.code, a]));
  const servico = accountByCode.get(SERVICO_ACCOUNT_CODE);
  const revenda = accountByCode.get(REVENDA_ACCOUNT_CODE);
  const naoUso = accountByCode.get(RECEITA_NAO_USO_CODE);
  return {
    servicoCents: servico ? Math.max(0, netById.get(servico.id) ?? 0) : 0,
    revendaCents: revenda ? Math.max(0, netById.get(revenda.id) ?? 0) : 0,
    naoUsoCents: naoUso ? (netById.get(naoUso.id) ?? 0) : 0,
  };
}
