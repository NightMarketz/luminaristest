import type { ActionProposal, Prisma } from 'generated/prisma';
import type { UserContext } from '../../../lib/authUtils';
import { ConflictError, NotFoundError, ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { ActionProposalStatus, IActionProposalRepository } from '../../chat/repositories/IActionProposalRepository';
import type { ITeammateRepository } from '../repositories/ITeammateRepository';
import { ProposalPayloadSchema, type ProposalKind, type ProposalPayload, type ProposalRead } from '../dtos/TeammatesDto';

/** Código do 409 de quem chega tarde (proposta já decidida, ou vencida). */
export const PROPOSTA_NAO_PENDENTE = 'PROPOSTA_NAO_PENDENTE';
export const PROPOSTA_EXPIRADA = 'PROPOSTA_EXPIRADA';
/** L-PR7-1 (D-2026-11-07-TM-PR7-LACUNAS): kind sem serviço dono registrado ainda (PR-4, PR-8, PR-10 registram os deles). */
export const KIND_SEM_DESPACHANTE = 'KIND_SEM_DESPACHANTE';

/**
 * Serviço dono de um `kind` (item 32). `dispatch` roda dentro da tx em que a proposta passa a `EXECUTED`: se o serviço
 * dono recusa, a proposta volta a `PENDING` com o rollback. `afterCommit` é o efeito fora da tx (cache, grafo).
 */
export interface IProposalDispatcher<K extends ProposalKind = ProposalKind> {
  readonly kind: K;
  dispatch(
    user: UserContext,
    payload: Extract<ProposalPayload, { kind: K }>,
    tx: Prisma.TransactionClient,
  ): Promise<{ result: unknown; afterCommit?: () => void }>;
}

/** O que o despachante de `TABLE_ROW` usa do `DynamicTableService` (porta estreita; o serviço dono continua lá). */
export interface ITableRowWriter {
  createTableData(user: UserContext, tableId: string, dto: { data: Record<string, unknown> }, options?: { tx?: Prisma.TransactionClient }): Promise<unknown>;
  updateTableData(user: UserContext, dataId: string, dto: { data: Record<string, unknown> }, options?: { tx?: Prisma.TransactionClient }): Promise<unknown>;
}

/**
 * `TABLE_ROW` → `DynamicTableService`, como o `LuminarisAgentService.executeProposal` do chat: `CREATE` cria, `UPDATE`
 * atualiza o `data.id`, e o efeito de escrita (KPI/grafo) roda depois do commit. `DELETE` está no contrato (§2.2) mas
 * nenhuma origem gera e o chat também recusa: mesma recusa (lacuna L-PR7-5, registrada).
 */
export class TableRowProposalDispatcher implements IProposalDispatcher<'TABLE_ROW'> {
  readonly kind = 'TABLE_ROW' as const;

  constructor(
    private readonly tables: ITableRowWriter,
    private readonly writeEffects: { afterDataWrite(userId: string): void },
  ) {}

  async dispatch(user: UserContext, payload: Extract<ProposalPayload, { kind: 'TABLE_ROW' }>, tx: Prisma.TransactionClient) {
    let result: unknown;
    if (payload.action === 'CREATE') {
      result = await this.tables.createTableData(user, payload.tableId, { data: payload.data }, { tx });
    } else if (payload.action === 'UPDATE') {
      const { id, ...data } = payload.data;
      if (typeof id !== 'string' || id === '') throw new ValidationError('Proposta de atualização sem o id do registro.');
      result = await this.tables.updateTableData(user, id, { data }, { tx });
    } else {
      throw new ValidationError(`Unsupported proposal action: ${payload.action}`);
    }
    return { result, afterCommit: () => this.writeEffects.afterDataWrite(user.userId) };
  }
}

/**
 * Caixa única de propostas (BE-INCR-TEAMMATES PR-7, itens 31–32; PRE-ADR-TEAMMATES F-TM-8 a).
 *
 * - Item 31: lista as propostas do chat e dos teammates do dono juntas, com `kind`, teammate e expiração.
 * - Item 32: confirmar despacha pelo `kind` para o serviço dono; rejeitar grava `REJECTED`; vencida → 409.
 *   Gate dentro da tx: a leitura, a troca de status (condicional a `PENDING`) e a escrita do serviço dono usam o mesmo
 *   `tx` — dois cliques, ou o clique e o scheduler, não executam duas vezes.
 * - L-PR7-4 (dono, 07/11): `PENDING` com `expiresAt` já passado é vencida mesmo antes do scheduler: grava `EXPIRED` e
 *   responde 409. L-PR7-1: `kind` sem despachante → 409 `KIND_SEM_DESPACHANTE`, a proposta fica `PENDING`.
 * - Outro dono → 404 (isolamento por tenant).
 */
export class ProposalInboxService {
  private readonly dispatchers = new Map<ProposalKind, IProposalDispatcher>();

  constructor(
    private readonly proposals: IActionProposalRepository,
    private readonly teammates: Pick<ITeammateRepository, 'listLive'>,
    dispatchers: IProposalDispatcher[],
    private readonly clock: () => Date = () => new Date(),
  ) {
    for (const d of dispatchers) this.dispatchers.set(d.kind, d);
  }

  async list(user: UserContext, status: ActionProposalStatus): Promise<ProposalRead[]> {
    const [rows, teammates] = await Promise.all([this.proposals.listByStatus(user.userId, status), this.teammates.listLive(user.userId)]);
    const names = new Map(teammates.map((t) => [t.id, t.name]));
    return rows.map((p) => ({
      id: p.id,
      kind: payloadOf(p).kind,
      status: p.status as ActionProposalStatus,
      payload: payloadOf(p),
      teammate: p.teammateId ? { id: p.teammateId, name: names.get(p.teammateId) ?? null } : null,
      channelMessageId: p.channelMessageId,
      expiresAt: p.expiresAt ? p.expiresAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async confirm(user: UserContext, id: string): Promise<{ id: string; status: 'EXECUTED'; result: unknown }> {
    const outcome = await this.proposals.runTransaction(async (tx) => {
      const p = await this.pending(user, id, tx);
      if (this.isDue(p)) {
        await this.proposals.transition(p.id, 'PENDING', 'EXPIRED', tx);
        return { expired: true as const };
      }
      const payload = payloadOf(p);
      const dispatcher = this.dispatchers.get(payload.kind);
      if (!dispatcher) {
        throw new ConflictError(`Ainda não há serviço que execute propostas do tipo ${payload.kind}.`, KIND_SEM_DESPACHANTE);
      }
      if (!(await this.proposals.transition(p.id, 'PENDING', 'EXECUTED', tx))) throw notPending();
      const done = await dispatcher.dispatch(user, payload as never, tx);
      return { expired: false as const, ...done };
    });
    // Fora da tx: a gravação de EXPIRED precisa do commit antes do 409.
    if (outcome.expired) throw new ConflictError('A proposta expirou.', PROPOSTA_EXPIRADA);
    logger.info('Proposal confirmed', { proposalId: id });
    outcome.afterCommit?.();
    return { id, status: 'EXECUTED', result: outcome.result };
  }

  async reject(user: UserContext, id: string): Promise<{ id: string; status: 'REJECTED' }> {
    const expired = await this.proposals.runTransaction(async (tx) => {
      const p = await this.pending(user, id, tx);
      if (this.isDue(p)) {
        await this.proposals.transition(p.id, 'PENDING', 'EXPIRED', tx);
        return true;
      }
      if (!(await this.proposals.transition(p.id, 'PENDING', 'REJECTED', tx))) throw notPending();
      return false;
    });
    if (expired) throw new ConflictError('A proposta expirou.', PROPOSTA_EXPIRADA);
    return { id, status: 'REJECTED' };
  }

  /** Item 33 (pelo `ProposalExpiryScheduler`): PENDING vencida → EXPIRED. */
  async expireDue(now: Date = this.clock()): Promise<number> {
    return this.proposals.expireDue(now);
  }

  private async pending(user: UserContext, id: string, tx: Prisma.TransactionClient): Promise<ActionProposal> {
    const p = await this.proposals.findOwned(user.userId, id, tx);
    if (!p) throw new NotFoundError('Proposta não encontrada.');
    if (p.status === 'EXPIRED') throw new ConflictError('A proposta expirou.', PROPOSTA_EXPIRADA);
    if (p.status !== 'PENDING') throw notPending();
    return p;
  }

  private isDue(p: ActionProposal): boolean {
    return p.expiresAt !== null && p.expiresAt.getTime() < this.clock().getTime();
  }
}

function notPending(): ConflictError {
  return new ConflictError('A proposta já foi decidida.', PROPOSTA_NAO_PENDENTE);
}

/**
 * A forma do contrato (§2.2). A proposta de teammate grava `payload`; a do chat (anterior ao F-TM-8) só tem as colunas
 * `action/tableId/data`, que são um `TABLE_ROW`.
 */
function payloadOf(p: ActionProposal): ProposalPayload {
  if (p.payload !== null && p.payload !== undefined) return ProposalPayloadSchema.parse(p.payload);
  return ProposalPayloadSchema.parse({ kind: 'TABLE_ROW', action: p.action, tableId: p.tableId, data: p.data ?? {} });
}
