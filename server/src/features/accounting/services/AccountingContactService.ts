import type { AccountingContact } from 'generated/prisma';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import {
  ACCOUNTING_CONTACT_ARCHIVED,
  ACCOUNTING_CONTACT_REGISTERED,
} from '../models/AccountingContact.model';
import type { RegisterContactInput, UpdateContactInput } from '../dtos/AccountingContactDto';
import type { IAccountingContactRepository } from '../repositories/IAccountingContactRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/**
 * AccountingContactService — cadastro do contador destinatário (BE-INCR-CONTADOR-DELIVERY, itens
 * 1-3). FIRST-CLASS PRISMA. Catálogo puro: gerencia a IDENTIDADE profissional que o log de entrega
 * referencia por FK; NUNCA posta no razão (um contato é metadado, não valor contábil).
 *
 * Invariantes provadas aqui:
 * - Policy-first: toda entrada checa `canManageAccountingContact`/`canReadAccountingContact` ANTES
 *   de qualquer acesso a dados (o teste prova que o repo não é tocado no caminho negado).
 * - Cross-tenant: id de outro escopo resolve `null` no repo e vira `NotFoundError` — nunca
 *   `ForbiddenError` (D8/ACC-CD-4: um 403 confirmaria que a linha existe em outro tenant).
 * - 1:N por escopo (F-CD5-a): não existe chave de negócio única. Dois contadores vivos no mesmo
 *   `(userId, unitId)` são válidos — por isso não há tratamento de P2002 aqui, ao contrário do
 *   `CounterpartyService`.
 * - Arquivar é SOFT (`deletedAt`) e NÃO é idempotente: a leitura é de linha viva, então a segunda
 *   chamada é `NotFoundError` (o teste prova). Não há rename-on-key (o análogo do `Counterparty`):
 *   sem `@@unique` de nome, não há chave para liberar.
 * - PII: `name`/`email` ficam na linha; o payload de auditoria carrega só `contactId` + o registro
 *   profissional (`crcNumber`/`crcUf`), que a allowlist autoriza explicitamente.
 */
export class AccountingContactService {
  constructor(
    private readonly contactRepo: IAccountingContactRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
  ) {}

  // ── Reads ──────────────────────────────────────────────────────────────────
  async listContacts(scope: AccountingScope): Promise<AccountingContact[]> {
    if (!this.policy.canReadAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para listar contadores.');
    }
    return this.contactRepo.findManyByUnit(scope);
  }

  async getContact(scope: AccountingScope, id: string): Promise<AccountingContact> {
    if (!this.policy.canReadAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler contadores.');
    }
    return this.requireContact(scope, id);
  }

  /**
   * Resolve um contato do escopo ou lança `NotFoundError`. É o ponto de reuso que o
   * `AccountingDeliveryService` chama para amarrar `contactId` ao pacote (F-CD8-a: o mesmo contato
   * pré-preenche o signatário do PRÓXIMO DTO de geração, responsabilidade do caller).
   */
  async requireContact(scope: AccountingScope, id: string): Promise<AccountingContact> {
    const contact = await this.contactRepo.findById(scope, id);
    if (!contact) throw new NotFoundError(`Contador '${id}' não foi encontrado.`);
    return contact;
  }

  // ── Commands ───────────────────────────────────────────────────────────────
  async registerContact(
    scope: AccountingScope,
    dto: RegisterContactInput,
  ): Promise<AccountingContact> {
    if (!this.policy.canManageAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para cadastrar contadores.');
    }
    const { userId, unitId } = accountingScopeWhere(scope);
    return this.contactRepo.runTransaction(async (tx) => {
      const created = await this.contactRepo.create(
        {
          userId,
          unitId,
          name: dto.name,
          email: dto.email,
          crcNumber: dto.crcNumber,
          crcUf: dto.crcUf,
          crcCertificate: dto.crcCertificate ?? null,
          crcCertificateValidUntil: dto.crcCertificateValidUntil
            ? new Date(`${dto.crcCertificateValidUntil}T00:00:00.000Z`)
            : null,
          createdById: scope.actorUserId,
        },
        tx,
      );
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: ACCOUNTING_CONTACT_REGISTERED,
        targetType: 'accounting_contact',
        targetId: created.id,
        // name/email JAMAIS entram aqui (D5): a trilha é append-only e hash-encadeada, então PII
        // que entra não sai. `contactId` resolve para a linha, que continua apagável/mascarável.
        payload: { contactId: created.id, crcNumber: created.crcNumber, crcUf: created.crcUf },
      });
      return created;
    });
  }

  /**
   * Atualiza nome/e-mail/CRC. **Sem evento de auditoria** — e isto é deliberado, não esquecimento:
   * o BRIEF (item 14) lista na allowlist apenas `contact.registered` e `contact.archived`, e
   * `canonicalizeAuditPayload` LANÇA para eventType desconhecido. Emitir um `contact.updated` que
   * a spec não previu quebraria o gate em runtime; a lacuna está registrada no relatório da sessão
   * para o dono decidir (regra 2 do formulário — não escolher por conta própria).
   */
  async updateContact(
    scope: AccountingScope,
    id: string,
    dto: UpdateContactInput,
  ): Promise<AccountingContact> {
    if (!this.policy.canManageAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para editar contadores.');
    }
    await this.requireContact(scope, id);
    return this.contactRepo.update(scope, id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.crcNumber !== undefined ? { crcNumber: dto.crcNumber } : {}),
      ...(dto.crcUf !== undefined ? { crcUf: dto.crcUf } : {}),
      ...(dto.crcCertificate !== undefined ? { crcCertificate: dto.crcCertificate } : {}),
      ...(dto.crcCertificateValidUntil !== undefined
        ? {
            crcCertificateValidUntil: dto.crcCertificateValidUntil
              ? new Date(`${dto.crcCertificateValidUntil}T00:00:00.000Z`)
              : null,
          }
        : {}),
    });
  }

  /**
   * Arquiva (soft-delete). **Não é idempotente e o teste prova isso:** `findById` lê só linha viva
   * (`deletedAt: null`), então a segunda chamada é `NotFoundError`, não um no-op silencioso. A FK
   * do log de entrega é `Restrict`, então um contato COM entregas históricas continua resolvível
   * pelo id — arquivar não apaga a trilha nem quebra o log.
   */
  async archiveContact(scope: AccountingScope, id: string): Promise<AccountingContact> {
    if (!this.policy.canManageAccountingContact(scope)) {
      throw new ForbiddenError('Você não tem permissão para arquivar contadores.');
    }
    const contact = await this.contactRepo.findById(scope, id);
    if (!contact) throw new NotFoundError(`Contador '${id}' não foi encontrado.`);

    return this.contactRepo.runTransaction(async (tx) => {
      const archived = await this.contactRepo.update(scope, id, { deletedAt: new Date() }, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: ACCOUNTING_CONTACT_ARCHIVED,
        targetType: 'accounting_contact',
        targetId: id,
        payload: { contactId: id },
      });
      return archived;
    });
  }
}
