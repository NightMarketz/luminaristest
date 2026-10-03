import type { AccountantAssignment } from 'generated/prisma';
import { AppError, ForbiddenError, ConflictError, NotFoundError } from '../../../lib/errors';
import type { IUserRepository } from '../../users/repositories/IUserRepository';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type {
  AccountantAssignmentView,
  EndAccountantAssignmentInput,
  InviteAccountantInput,
  MyAccountantAssignmentView,
} from '../dtos/AccountantAssignmentDto';
import type { AssignmentStatus } from '../models/ledgerStatus';
import {
  ACCOUNTANT_ASSIGNMENT_ACCEPTED,
  ACCOUNTANT_ASSIGNMENT_ENDED,
  ACCOUNTANT_ASSIGNMENT_INVITED,
  ASSIGNMENT_SUPERSEDED_REASON,
} from '../models/AccountantAssignment.model';
import type { AuditService } from './AuditService';
import { resolveAccountingScope, type AccountingScope } from '../scope/AccountingScope';

/** Linha → resposta da API (§4.1): sem slots, ids de autoria nem `deletedAt`. */
export function toAccountantAssignmentView(a: AccountantAssignment): AccountantAssignmentView {
  return {
    id: a.id,
    unitId: a.unitId,
    status: a.status as AssignmentStatus,
    accountingContactId: a.accountingContactId,
    accountantUserId: a.accountantUserId,
    crcNumber: a.crcNumber,
    crcUf: a.crcUf,
    activeFrom: a.activeFrom ? a.activeFrom.toISOString() : null,
    activeUntil: a.activeUntil ? a.activeUntil.toISOString() : null,
    endReason: a.endReason,
    createdAt: a.createdAt.toISOString(),
  };
}

/** Escopo do livro do DONO da atribuição com o ator dado — a auditoria cai na cadeia do dono (item 7). */
function scopeFromAssignment(a: AccountantAssignment, actorUserId: string): AccountingScope {
  return { ...resolveAccountingScope({ userId: a.userId }, a.unitId), actorUserId };
}

/**
 * AccountantAssignmentService — contador responsável por escopo (BE-INCR-ACCOUNTANT-GOVERNANCE, nó
 * GOV-CONTADOR, BRIEF itens 5–9). FIRST-CLASS PRISMA; não chama `postEntry`.
 *
 * - Convite pelo dono (F-GOV-8 a: e-mail de usuário existente), aceite pelo contador com declaração de
 *   contrato escrito, encerramento por qualquer das partes com motivo (F-GOV-10 a).
 * - Toda transição de estado é CAS no repo; o aceite que substitui um contador encerra o anterior NA MESMA tx
 *   (sem janela destravada).
 * - `resolveGovernanceScope` é o resolver delegado dos 9 handlers do F-GOV-7 (a+). `resolveAccountingScope`
 *   não muda. A atribuição é identificada pelo par (contador, dono) — o cliente informa `ownerUserId`; um
 *   contador atende N donos e não tem livro próprio (decisão do dono, chat 03/10/2026).
 */
export class AccountantAssignmentService {
  constructor(
    private readonly assignmentRepo: IAccountantAssignmentRepository,
    private readonly contactRepo: IAccountingContactRepository,
    private readonly userRepo: IUserRepository,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Item 5: sem `ownerUserId` (ou = ator) → o escopo de sempre. Com `ownerUserId` de outro usuário → exige ACTIVE do
   * par (ator, dono) naquele `unitId` e devolve o escopo do dono com o contador como ator; senão 403
   * ACCOUNTANT_NOT_ASSIGNED — nunca cai em silêncio no escopo do ator.
   */
  async resolveGovernanceScope(
    user: { userId: string },
    unitId: string,
    ownerUserId?: string,
  ): Promise<AccountingScope> {
    if (!ownerUserId || ownerUserId === user.userId) return resolveAccountingScope(user, unitId);
    const active = await this.assignmentRepo.findActiveForPair(user.userId, ownerUserId, unitId);
    if (!active) {
      throw new AppError('Você não é o contador responsável ativo deste dono nesta unidade.', 403, 'ACCOUNTANT_NOT_ASSIGNED');
    }
    return { ...resolveAccountingScope({ userId: active.ownerUserId }, unitId), actorUserId: user.userId };
  }

  /** Item 6: convite (dono). */
  async invite(scope: AccountingScope, dto: InviteAccountantInput): Promise<AccountantAssignment> {
    if (!this.policy.canManageAccountantAssignment(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar o contador responsável deste escopo.');
    }
    const contact = await this.contactRepo.findById(scope, dto.accountingContactId);
    if (!contact) throw new NotFoundError(`Contador '${dto.accountingContactId}' não foi encontrado.`);
    const accountant = await this.userRepo.getUserByEmail(dto.accountantEmail);
    if (!accountant) {
      throw new AppError('Nenhum usuário cadastrado com este e-mail.', 400, 'ACCOUNTANT_USER_NOT_FOUND');
    }
    if (accountant.id === scope.ownerUserId) {
      throw new AppError('O dono do escopo não pode ser o próprio contador responsável.', 400, 'SELF_ASSIGNMENT');
    }
    return this.assignmentRepo.runTransaction(async (tx) => {
      if (await this.assignmentRepo.findPending(scope, tx)) {
        throw new ConflictError(
          'Já existe um convite pendente neste escopo — encerre-o antes de convidar outro contador.',
          'ASSIGNMENT_PENDING_EXISTS',
        );
      }
      const created = await this.assignmentRepo.create(
        {
          userId: scope.ownerUserId,
          unitId: scope.unitId,
          accountantUserId: accountant.id,
          accountingContactId: contact.id,
          crcNumber: contact.crcNumber, // snapshot (I-11) — já normalizado pelo DTO do contato
          crcUf: contact.crcUf,
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: ACCOUNTANT_ASSIGNMENT_INVITED,
        targetType: 'accountant_assignment',
        targetId: created.id,
        payload: {
          assignmentId: created.id,
          accountingContactId: contact.id,
          crcNumber: created.crcNumber,
          crcUf: created.crcUf,
        },
      });
      return created;
    });
  }

  /** Item 7: aceite (contador). A declaração de contrato escrito é validada no DTO (F-GOV-8 a reforçada). */
  async accept(actorUserId: string, id: string): Promise<AccountantAssignment> {
    const found = await this.assignmentRepo.findById(id);
    if (!found || !this.policy.canRespondToAssignment(actorUserId, found)) {
      throw new NotFoundError(`Atribuição '${id}' não foi encontrada.`);
    }
    const scope = scopeFromAssignment(found, actorUserId);
    return this.assignmentRepo.runTransaction(async (tx) => {
      const now = new Date();
      const previous = await this.assignmentRepo.findActive(scope, tx);
      if (previous) {
        await this.assignmentRepo.transition(
          previous.id,
          'ACTIVE',
          'ENDED',
          { activeUntil: now, endReason: ASSIGNMENT_SUPERSEDED_REASON, endedById: actorUserId },
          tx,
        );
      }
      const accepted = await this.assignmentRepo.transition(found.id, 'PENDING', 'ACTIVE', { activeFrom: now }, tx);
      if (previous) {
        await this.auditService.append(tx, scope, {
          actorUserId,
          eventType: ACCOUNTANT_ASSIGNMENT_ENDED,
          targetType: 'accountant_assignment',
          targetId: previous.id,
          payload: {
            assignmentId: previous.id,
            fromStatus: 'ACTIVE',
            endedBy: 'ACCOUNTANT',
            reason: ASSIGNMENT_SUPERSEDED_REASON,
          },
        });
      }
      await this.auditService.append(tx, scope, {
        actorUserId,
        eventType: ACCOUNTANT_ASSIGNMENT_ACCEPTED,
        targetType: 'accountant_assignment',
        targetId: accepted.id,
        payload: { assignmentId: accepted.id, supersededAssignmentId: previous?.id },
      });
      return accepted;
    });
  }

  /** Item 8: encerramento por qualquer das partes (F-GOV-10 a), motivo obrigatório. */
  async end(actorUserId: string, id: string, dto: EndAccountantAssignmentInput): Promise<AccountantAssignment> {
    const found = await this.assignmentRepo.findById(id);
    if (!found || !this.policy.canEndAssignment(actorUserId, found)) {
      throw new NotFoundError(`Atribuição '${id}' não foi encontrada.`);
    }
    if (found.status !== 'PENDING' && found.status !== 'ACTIVE') {
      throw new ConflictError(`A atribuição '${id}' já está encerrada.`, 'ASSIGNMENT_STATUS_CHANGED');
    }
    const fromStatus = found.status as 'PENDING' | 'ACTIVE';
    const scope = scopeFromAssignment(found, actorUserId);
    return this.assignmentRepo.runTransaction(async (tx) => {
      const ended = await this.assignmentRepo.transition(
        found.id,
        fromStatus,
        'ENDED',
        {
          ...(fromStatus === 'ACTIVE' ? { activeUntil: new Date() } : {}),
          endedById: actorUserId,
          endReason: dto.reason,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId,
        eventType: ACCOUNTANT_ASSIGNMENT_ENDED,
        targetType: 'accountant_assignment',
        targetId: found.id,
        payload: {
          assignmentId: found.id,
          fromStatus,
          endedBy: actorUserId === found.userId ? 'OWNER' : 'ACCOUNTANT',
          reason: dto.reason,
        },
      });
      return ended;
    });
  }

  /** Item 9: histórico do escopo (dono), do mais novo ao mais velho. */
  async listByScope(scope: AccountingScope): Promise<AccountantAssignment[]> {
    if (!this.policy.canManageAccountantAssignment(scope)) {
      throw new ForbiddenError('Você não tem permissão para ver o contador responsável deste escopo.');
    }
    return this.assignmentRepo.listByScope(scope);
  }

  /** Item 9: PENDING + ACTIVE do contador, com `ownerEmail` + `ownerUserId` para ele saber (e dizer) em que livro agir. */
  async listMine(actorUserId: string): Promise<MyAccountantAssignmentView[]> {
    const rows = await this.assignmentRepo.listLiveForAccountant(actorUserId);
    return rows.map(({ ownerEmail, ...a }) => ({ ...toAccountantAssignmentView(a), ownerEmail, ownerUserId: a.userId }));
  }
}
