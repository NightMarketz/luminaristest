import type { Prisma, PscProvider } from 'generated/prisma';
import { ForbiddenError, NotFoundError } from '../../../lib/errors';
import { loadKeyring, seal } from '../../../lib/secretBox';
import { DFE_PSC_KEYRING, PSC_PROVIDER_REMOVED, PSC_PROVIDER_SET } from '../models/PscCredential.model';
import type { CreatePscProviderInput, PscProviderView, UpdatePscProviderInput } from '../dtos/PscCredentialDto';
import type { IPscProviderRepository, PscProviderData } from '../repositories/IPscProviderRepository';
import type { PscProviderActor, PscProviderPolicy } from '../policies/PscProviderPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Corrente de auditoria da PLATAFORMA para o cadastro de PSCs (mesmo desenho do `PLATFORM_AUDIT_SCOPE` dos parâmetros
 * legais): `ownerUserId` não é id de usuário, então nenhuma empresa vê estes eventos na própria trilha.
 */
export const PSC_PROVIDER_AUDIT_SCOPE: AccountingScope = {
  ownerUserId: 'PLATFORM',
  actorUserId: 'PLATFORM',
  unitId: 'psc-providers',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

/**
 * PscProviderService — cadastro dos PSCs homologados (X10a PR-7; EMENDA-PSC E-2; F-PSC-2 a, F-PSC-3 a). FIRST-CLASS
 * PRISMA. Só `PLATFORM_ADMIN`. O `clientSecret` é cifrado (keyring DFE_PSC_KEYS, AAD = id) e nunca devolvido.
 * Falha fechada: sem keyring ⇒ 503 antes de ler/gravar o banco (create e PATCH com segredo).
 */
export class PscProviderService {
  constructor(
    private readonly repo: IPscProviderRepository,
    private readonly auditService: AuditService,
    private readonly policy: PscProviderPolicy,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async list(actor: PscProviderActor): Promise<PscProviderView[]> {
    this.assertManage(actor);
    return (await this.repo.listLive()).map(toProviderView);
  }

  async create(actor: PscProviderActor, input: CreatePscProviderInput): Promise<PscProviderView> {
    this.assertManage(actor);
    const keyring = loadKeyring(this.env, DFE_PSC_KEYRING);
    return this.repo.runTransaction(async (tx) => {
      const row = await this.repo.create(
        {
          nome: input.nome,
          baseUrl: input.baseUrl,
          clientId: input.clientId,
          cotaAnual: input.cotaAnual ?? null,
          lifetimeMaxSegundos: input.lifetimeMaxSegundos ?? null,
          algoritmos: JSON.stringify(input.algoritmos),
          habilitadoEm: input.habilitadoEm ? new Date(input.habilitadoEm) : null,
        },
        tx,
      );
      const sealed = seal(input.clientSecret, row.id, keyring);
      const saved = await this.repo.writeSecret(row.id, { clientSecretCipher: sealed.blob, keyVersion: sealed.keyVersion }, tx);
      await this.audit(tx, actor, PSC_PROVIDER_SET, saved);
      return toProviderView(saved);
    });
  }

  async update(actor: PscProviderActor, id: string, input: UpdatePscProviderInput): Promise<PscProviderView> {
    this.assertManage(actor);
    const keyring = input.clientSecret !== undefined ? loadKeyring(this.env, DFE_PSC_KEYRING) : null;
    return this.repo.runTransaction(async (tx) => {
      const current = await this.repo.findLive(id, tx);
      if (!current) throw new NotFoundError('PSC não encontrado.');
      const data: Partial<PscProviderData> = {};
      if (input.nome !== undefined) data.nome = input.nome;
      if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl;
      if (input.clientId !== undefined) data.clientId = input.clientId;
      if (input.cotaAnual !== undefined) data.cotaAnual = input.cotaAnual;
      if (input.lifetimeMaxSegundos !== undefined) data.lifetimeMaxSegundos = input.lifetimeMaxSegundos;
      if (input.algoritmos !== undefined) data.algoritmos = JSON.stringify(input.algoritmos);
      if (input.habilitadoEm !== undefined) data.habilitadoEm = input.habilitadoEm ? new Date(input.habilitadoEm) : null;
      let saved = await this.repo.update(id, data, tx);
      if (keyring && input.clientSecret !== undefined) {
        const sealed = seal(input.clientSecret, id, keyring);
        saved = await this.repo.writeSecret(id, { clientSecretCipher: sealed.blob, keyVersion: sealed.keyVersion }, tx);
      }
      await this.audit(tx, actor, PSC_PROVIDER_SET, saved);
      return toProviderView(saved);
    });
  }

  async remove(actor: PscProviderActor, id: string): Promise<void> {
    this.assertManage(actor);
    await this.repo.runTransaction(async (tx) => {
      const current = await this.repo.findLive(id, tx);
      if (!current) throw new NotFoundError('PSC não encontrado.');
      const gone = await this.repo.softDelete(id, tx);
      await this.audit(tx, actor, PSC_PROVIDER_REMOVED, gone);
    });
  }

  private assertManage(actor: PscProviderActor): void {
    if (!this.policy.canManage(actor)) throw new ForbiddenError('Só o administrador da plataforma gerencia os PSCs.');
  }

  private audit(tx: Prisma.TransactionClient, actor: PscProviderActor, eventType: string, row: PscProvider): Promise<void> {
    return this.auditService.append(tx, PSC_PROVIDER_AUDIT_SCOPE, {
      actorUserId: actor.userId,
      eventType,
      targetType: 'psc_provider',
      targetId: row.id,
      payload: { pscProviderId: row.id, nome: row.nome },
    });
  }
}

export function toProviderView(row: PscProvider): PscProviderView {
  return {
    id: row.id,
    nome: row.nome,
    baseUrl: row.baseUrl,
    clientId: row.clientId,
    temClientSecret: !!row.clientSecretCipher,
    cotaAnual: row.cotaAnual,
    lifetimeMaxSegundos: row.lifetimeMaxSegundos,
    algoritmos: JSON.parse(row.algoritmos) as string[],
    habilitadoEm: row.habilitadoEm ? row.habilitadoEm.toISOString() : null,
  };
}
