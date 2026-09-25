import { Prisma } from 'generated/prisma';
import type { AccountingDataExchangeJob } from 'generated/prisma';
import { ConflictError, NotFoundError, ValidationError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IDataExchangeRepository } from '../repositories/IDataExchangeRepository';

/**
 * BE-INCR-FIXED-ASSETS PR-4 (nó C8, Bloco G, item 21) — gate compartilhado da retificação
 * versionada ECD/ECF (ACC-011, gate DENTRO da tx). Um único módulo para as 3 gerações (ECD, ECF
 * Presumido, ECF Real) em vez de repetir a mesma checagem 3x (choke point das services, não do
 * router/DTO). Ordem: existe no escopo (cross-tenant/wrong id → 404, NUNCA 403) → mesmo kind →
 * `EXPORTED` → mesmo período. A checagem "sem sucessor" (2º substituto do mesmo job → 409) é
 * FECHADA pela `@unique` de `supersedesJobId` — este helper faz o pré-cheque legível
 * (`findJobBySupersedesJobId`) para uma mensagem nomeada, mas quem fecha o TOCTOU é a unique
 * constraint em `createJob` (P2002 → `ConflictError`, `assertNoConcurrentSuccessor` abaixo).
 */
export async function resolveSupersededJob(
  repo: IDataExchangeRepository,
  scope: AccountingScope,
  supersedesJobId: string,
  expectedKind: string,
  period: { start: Date; end: Date },
): Promise<AccountingDataExchangeJob> {
  const job = await repo.findJobById(scope, supersedesJobId);
  if (!job) {
    throw new NotFoundError(`Job '${supersedesJobId}' não foi encontrado.`);
  }
  if (job.kind !== expectedKind) {
    throw new ValidationError(
      `O job '${supersedesJobId}' tem kind '${job.kind}' — esperado '${expectedKind}' para esta retificação.`,
    );
  }
  if (job.status !== 'EXPORTED') {
    throw new ValidationError(
      `O job '${supersedesJobId}' não está EXPORTED (status=${job.status}) — não pode ser substituído/retificado.`,
    );
  }
  if (!job.periodStart || !job.periodEnd) {
    throw new ValidationError(`O job '${supersedesJobId}' não tem período gravado.`);
  }
  if (job.periodStart.getTime() !== period.start.getTime() || job.periodEnd.getTime() !== period.end.getTime()) {
    throw new ValidationError(
      `O job '${supersedesJobId}' cobre um período diferente do arquivo sendo gerado — a retificação exige o MESMO período.`,
    );
  }
  // Pré-cheque legível (não fecha o TOCTOU — quem fecha é a `@unique` no createJob abaixo).
  // Review PR #368: só conta como sucessor um job EXPORTED — um FAILED tem `supersedesJobId`
  // limpo na própria escrita (ver `updateJob(status:'FAILED', supersedesJobId:null)` nos 3
  // serviços de geração), então nunca deveria aparecer aqui; o filtro por status é defesa em
  // profundidade caso a coluna fique com um valor de uma versão anterior do dado.
  const existingSuccessor = await repo.findJobBySupersedesJobId(scope, supersedesJobId);
  if (existingSuccessor && existingSuccessor.status === 'EXPORTED') {
    throw new ConflictError(
      `O job '${supersedesJobId}' já foi substituído/retificado pelo job '${existingSuccessor.id}' — só um sucessor por job.`,
    );
  }
  return job;
}

/** Traduz o P2002 da `@unique(supersedesJobId)` — corrida entre duas gerações concorrentes. */
export function isSupersedesUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes('supersedesJobId')
  );
}
