import { ValidationError } from '../../../lib/errors';
import type { Account } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountRepository } from '../repositories/IAccountRepository';
import type { IPostingRepository } from '../repositories/IPostingRepository';
import { LEDGER_STATUSES } from '../models/ledgerStatus';
import { CLOSING_SOURCE_TYPE } from '../models/closing';

/**
 * Ledger account codes that map to a presunção activity line (ADR-INCR-SPED-ECF §Emenda FASE 2 ponto 5). These
 * are the ONLY accounts whose receita bruta is segregated; any OTHER Revenue-nature account with movement fails
 * the exhaustiveness gate.
 *   3.1 Receita de Serviços        → serviço (P200(8) 32% IRPJ, P400(4) 32% CSLL)
 *   3.3 Receita de Revenda de Merc. → revenda (P200(4) 8% IRPJ,  P400(2) 12% CSLL)
 */
export const SERVICO_ACCOUNT_CODE = '3.1';
export const REVENDA_ACCOUNT_CODE = '3.3';
const PRESUNCAO_ACCOUNT_CODES = new Set([SERVICO_ACCOUNT_CODE, REVENDA_ACCOUNT_CODE]);

export interface ReceitaPorAtividade {
  servicoCents: number;
  revendaCents: number;
}

interface Deps {
  accountRepo: IAccountRepository;
  postingRepo: IPostingRepository;
}

/**
 * BE-INCR-TAX-ASSESSMENT Fase A (nó X7, BRIEF item 6; ADR D5) — segregação da receita bruta do Presumido por
 * atividade na janela `[from, to]`, extraída de `SpedEcfGenerationService.generate` SEM mudança de comportamento:
 * uma leitura `groupByAccount` na janela alimenta o gate e a segregação.
 *
 * Gate (ECF D6 corrigido): toda conta natureza `Revenue`, analítica, com movimento na janela e código ∉ {3.1, 3.3}
 * ⇒ `ValidationError` com `unmappedRevenueAccounts` (receita não mapeada que some da base = subtributação).
 * Receita bruta = crédito líquido (devoluções/descontos entram como débito), ≥ 0.
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
  const unmapped = accounts
    .filter((a) => a.nature === 'Revenue' && a.acceptsEntries && !PRESUNCAO_ACCOUNT_CODES.has(a.code) && (netById.get(a.id) ?? 0) !== 0)
    .map((a) => ({ code: a.code, name: a.name }));
  if (unmapped.length > 0) {
    throw new ValidationError(
      'Receita não segregável por atividade: contas de receita sem linha de presunção (3.1 serviço / 3.3 revenda). ' +
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
  return {
    servicoCents: servico ? Math.max(0, netById.get(servico.id) ?? 0) : 0,
    revendaCents: revenda ? Math.max(0, netById.get(revenda.id) ?? 0) : 0,
  };
}
