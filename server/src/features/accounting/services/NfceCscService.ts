import type { NfceCsc, Prisma } from 'generated/prisma';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { loadKeyring, open, seal } from '../../../lib/secretBox';
import { DFE_PSC_KEYRING } from '../models/PscCredential.model';
import type { NfceCscView, PutNfceCscInput } from '../dtos/NfceCscDto';
import { NfceCscViewSchema } from '../dtos/NfceCscDto';
import type { INfceCscRepository } from '../repositories/INfceCscRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import type { DfeAmbiente } from '../dfe/DfeEmissorPort';

export const NFCE_CSC_SET = 'nfce_csc.set';
export const NFCE_CSC_REMOVED = 'nfce_csc.removed';

/**
 * NfceCscService — CSC da NFC-e por unidade e ambiente (X10a PR-8; BE-INCR-NFCE-EMENDA-1 §4; EMENDA-2 §1 item 1: o
 * "keyring do F-ADN-3" lê-se como o da credencial do PSC; D-2026-10-29-X10A-PR7-9-FORKS decisão 3). FIRST-CLASS PRISMA.
 *
 * - `set` (PUT): uma linha viva por (unidade, ambiente) — a anterior é apagada na mesma tx; o CSC vai cifrado
 *   (`secretBox`, AAD = id, keyring `DFE_PSC_KEYS`, falha fechada: sem keyring ⇒ 503 antes de gravar).
 * - `list` (GET) e `remove` (DELETE): a view nunca carrega o CSC. Policy do perfil fiscal (`canManageFiscalProfile`).
 * - `resolveForEmission`: chamador interno (a policy da emissão já rodou) — `{ id, csc }` ou `null`.
 */
export class NfceCscService {
  constructor(
    private readonly repo: INfceCscRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async set(scope: AccountingScope, input: PutNfceCscInput): Promise<NfceCscView> {
    this.assertManage(scope);
    const keyring = loadKeyring(this.env, DFE_PSC_KEYRING);
    const saved = await this.repo.runTransaction(async (tx) => {
      const anterior = await this.repo.findLive(scope, input.ambiente, tx);
      if (anterior) await this.repo.softDelete(anterior.id, tx);
      const shell = await this.repo.createShell(scope, { ambiente: input.ambiente, cscId: input.cscId }, tx);
      const sealed = seal(input.csc, shell.id, keyring);
      const row = await this.repo.writeCipher(shell.id, { cscCiphertext: sealed.blob, keyVersion: sealed.keyVersion }, tx);
      await this.audit(tx, scope, NFCE_CSC_SET, row);
      return row;
    });
    return this.toView(saved);
  }

  async list(scope: AccountingScope): Promise<NfceCscView[]> {
    this.assertManage(scope);
    return (await this.repo.listLive(scope)).map((r) => this.toView(r));
  }

  async remove(scope: AccountingScope, ambiente: DfeAmbiente): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findLive(scope, ambiente, tx);
      if (!row) throw new NotFoundError(`Esta unidade não tem CSC da NFC-e em ${ambiente}.`);
      await this.repo.softDelete(row.id, tx);
      await this.audit(tx, scope, NFCE_CSC_REMOVED, row);
    });
  }

  /** O CSC vivo da unidade no ambiente, decifrado só em memória; sem cadastro ⇒ `null`. */
  async resolveForEmission(scope: AccountingScope, ambiente: DfeAmbiente): Promise<{ id: string; csc: string } | null> {
    const row = await this.repo.findLive(scope, ambiente);
    if (!row || !row.cscCiphertext || row.keyVersion == null) return null;
    const keyring = loadKeyring(this.env, DFE_PSC_KEYRING);
    return { id: row.cscId, csc: open(row.cscCiphertext, row.id, row.keyVersion, keyring) };
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalProfile(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar o CSC da NFC-e.');
    }
  }

  private audit(tx: Prisma.TransactionClient, scope: AccountingScope, eventType: string, row: NfceCsc): Promise<void> {
    return this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'nfce_csc',
      targetId: row.id,
      payload: { unitId: accountingScopeWhere(scope).unitId, ambiente: row.ambiente, cscId: row.cscId },
    });
  }

  private toView(row: NfceCsc): NfceCscView {
    return NfceCscViewSchema.parse({ unitId: row.unitId, ambiente: row.ambiente, cscId: row.cscId, createdAt: row.createdAt.toISOString() });
  }
}
