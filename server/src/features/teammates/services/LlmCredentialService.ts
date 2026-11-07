import type { IUser } from '../../users/models/User.model';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { loadKeyring, open, seal } from '../../../lib/secretBox';
import type { LlmProviderId } from '../../../lib/llm/LlmProvider';
import { LlmCredentialReadSchema, type LlmCredentialCreateSchema } from '../dtos/TeammatesDto';
import type { z } from 'zod';
import { LLM_CREDENTIAL_KEYRING, type ILlmCredential } from '../models/LlmCredential.model';
import type { ILlmCredentialRepository } from '../repositories/ILlmCredentialRepository';
import type { ILlmCredentialPolicy } from '../policies/ILlmCredentialPolicy';
import type { AuditService } from '../../accounting/services/AuditService';
import { LLM_CREDENTIAL_CREATED, LLM_CREDENTIAL_DELETED, teammatesAuditScope } from '../models/Teammate.model';

export type LlmCredentialCreateInput = z.infer<typeof LlmCredentialCreateSchema>;
export type LlmCredentialView = z.infer<typeof LlmCredentialReadSchema>;

/** Quem o resolvedor de chave do turno (item 8) consome: só a chave viva do tenant para o provedor, ou `null`. */
export interface ILlmApiKeySource {
  findApiKey(userId: string, provider: LlmProviderId): Promise<string | null>;
}

/**
 * LlmCredentialService — chave BYOK do tenant por provedor (BE-INCR-TEAMMATES PR-1, item 7; F-TM-6 b).
 *
 * - `create`: cifra com `secretBox` (AAD = `LlmCredential.id`), keyring `LLM_CREDENTIAL_KEYS`; sem keyring ⇒ 503 antes
 *   de gravar. Segundo cadastro vivo do mesmo provedor ⇒ P2002 do `@@unique` ⇒ 409 (`handleApiError`).
 * - `list`: a view (`LlmCredentialReadSchema`, `.strict()`) nunca carrega a chave.
 * - `remove`: soft-delete que libera o provedor para recadastro.
 * - Item 13 (PR-2): `create`/`remove` gravam `llm_credential.created/deleted` na trilha encadeada, na mesma tx, sem a
 *   chave nem o `last4`.
 * - `findApiKey`: chamador interno (resolução por turno, item 8) — decifra só em memória.
 */
export class LlmCredentialService implements ILlmApiKeySource {
  constructor(
    private readonly repo: ILlmCredentialRepository,
    private readonly policy: ILlmCredentialPolicy,
    private readonly auditService: AuditService,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async create(actor: IUser, input: LlmCredentialCreateInput): Promise<LlmCredentialView> {
    this.assertManage(actor, actor.id);
    const keyring = loadKeyring(this.env, LLM_CREDENTIAL_KEYRING);
    const row = await this.repo.runTransaction(async (tx) => {
      const shell = await this.repo.createShell(
        { userId: actor.id, provider: input.provider, last4: input.apiKey.slice(-4), monthlyTokenBudget: input.monthlyTokenBudget ?? null },
        tx,
      );
      const sealed = seal(input.apiKey, shell.id, keyring);
      await this.repo.writeSecret(shell.id, { secret: sealed.blob, keyVersion: sealed.keyVersion }, tx);
      await this.auditService.append(tx, teammatesAuditScope(actor.id), {
        actorUserId: actor.id,
        eventType: LLM_CREDENTIAL_CREATED,
        targetType: 'LlmCredential',
        targetId: shell.id,
        payload: { credentialId: shell.id, provider: shell.provider, monthlyTokenBudget: shell.monthlyTokenBudget },
      });
      return shell;
    });
    return toView(row);
  }

  async list(actor: IUser): Promise<LlmCredentialView[]> {
    this.assertManage(actor, actor.id);
    return (await this.repo.listLive(actor.id)).map(toView);
  }

  async remove(actor: IUser, id: string): Promise<void> {
    const row = await this.repo.findLiveById(actor.id, id);
    if (!row) throw new NotFoundError('Credencial não encontrada.');
    this.assertManage(actor, row.userId);
    await this.repo.runTransaction(async (tx) => {
      await this.repo.softDelete(actor.id, id, tx);
      await this.auditService.append(tx, teammatesAuditScope(actor.id), {
        actorUserId: actor.id,
        eventType: LLM_CREDENTIAL_DELETED,
        targetType: 'LlmCredential',
        targetId: id,
        payload: { credentialId: id, provider: row.provider },
      });
    });
  }

  async findApiKey(userId: string, provider: LlmProviderId): Promise<string | null> {
    const row = await this.repo.findLiveSealed(userId, provider);
    if (!row) return null;
    const keyring = loadKeyring(this.env, LLM_CREDENTIAL_KEYRING);
    return open(row.secret, row.id, row.keyVersion, keyring);
  }

  private assertManage(actor: IUser, ownerId: string): void {
    if (!this.policy.canManage(actor, ownerId)) throw new ForbiddenError('Sem permissão para gerenciar esta credencial.');
  }
}

function toView(row: ILlmCredential): LlmCredentialView {
  return LlmCredentialReadSchema.parse({
    id: row.id,
    provider: row.provider,
    last4: row.last4,
    monthlyTokenBudget: row.monthlyTokenBudget,
    createdAt: row.createdAt.toISOString(),
  });
}
