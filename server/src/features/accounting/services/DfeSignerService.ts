import { createHash, randomBytes, randomInt } from 'node:crypto';
import type { DfeSignerDevice, Prisma } from 'generated/prisma';
import { AppError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import { readCertFacts } from '../../../lib/nfeSignature';
import { logger } from '../../../lib/logger';
import {
  DFE_SIGNER_AMBIENTE_NAO_CONFIGURADO,
  DFE_SIGNER_CERTIFICADO_DIVERGENTE,
  DFE_SIGNER_CERTIFICADO_INVALIDO,
  DFE_SIGNER_CERTIFICADO_VENCIDO,
  DFE_SIGNER_CNPJ_DIVERGENTE,
  DFE_SIGNER_CODIGO_ALFABETO,
  DFE_SIGNER_CODIGO_INVALIDO,
  DFE_SIGNER_CODIGO_TAMANHO,
  DFE_SIGNER_CODIGO_TTL_MS,
  DFE_SIGNER_ONLINE_MS,
  DFE_SIGNER_PAIRED,
  DFE_SIGNER_PROTOCOLO,
  DFE_SIGNER_REVOKED,
  DFE_SIGNER_TOKEN_BYTES,
  DFE_SIGNER_VERSAO_MINIMA,
  type DfeSignerRevokeMotivo,
} from '../models/DfeSigner.model';
import { UNIDADE_SEM_CNPJ } from '../models/FiscalCertificate.model';
import type { DfeSignerCodigoView, DfeSignerPareamentoBody, DfeSignerPareamentoResposta, DfeSignerView } from '../dtos/DfeSignerDto';
import type { DfeSignerDeviceWithUnits, IDfeSignerRepository } from '../repositories/IDfeSignerRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { resolveAccountingScopeInternal } from '../scope/resolveAccountingScopeInternal';
import type { DfeAmbiente } from '../dfe/DfeEmissorPort';
import type { UnitCnpjResolver } from './FiscalCertificateService';

/** Nome legível da unidade do escopo (régua A3: a recusa nomeia a unidade pelo nome); o id se não houver nome. */
export type UnitNameResolver = (scope: AccountingScope) => Promise<string>;

export interface DfeSignerServiceOptions {
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}

const AMBIENTES: readonly DfeAmbiente[] = ['producao', 'homologacao'];

/** sha256 hex — o banco guarda só isto do código e do token (AL-3). */
export function dfeSignerHash(segredo: string): string {
  return createHash('sha256').update(segredo, 'utf8').digest('hex');
}

/**
 * DfeSignerService — pareamento, estado e revogação do assinador local (X10a EMENDA-4 AL-3, AL-4, AL-5, AL-12, AL-16;
 * F-AL-3 a; D-2026-11-07-X10A-EMENDA-4-LACUNAS L-AL-2, L-AL-3). FIRST-CLASS PRISMA.
 *
 * - `gerarCodigo`: código de uso único de 12 caracteres sem ambíguos, TTL 10 min; só o sha256 no banco.
 * - `parear` (rota do assinador, sem sessão de usuário: a prova é o código não vencido e não usado, consumido de forma
 *   atômica dentro da tx): o certificado (só a parte pública) é lido por `readCertFacts` e conferido pela RAIZ do CNPJ
 *   (`[SIG-CERT-CNPJ]`, F-SIG-3 b) e pela validade cobrindo hoje. Sem Bearer ⇒ dispositivo novo com token de 32 bytes
 *   (devolvido uma vez; só o hash é gravado). Com o Bearer de um dispositivo já pareado (L-AL-2) ⇒ só o vínculo novo,
 *   com o MESMO certificado e a mesma raiz. Nos dois casos, o assinador que já servia a unidade perde o vínculo na mesma
 *   tx (AL-4: um ativo por unidade); se era o último vínculo dele, o dispositivo é revogado (token 401).
 * - `revogar` (L-AL-3): só o vínculo da unidade; o último vínculo revoga o dispositivo.
 * - EKU "Autenticação Cliente" não é conferido aqui: `readCertFacts` não lê EKU (AL-3 permite; runbook P4, §7 item 1).
 * - Auditoria e log (AL-16): CNPJ-raiz, validade e sha256 do DER; nunca o certificado, o subject, o token nem o código.
 */
export class DfeSignerService {
  private readonly now: () => Date;
  private readonly env: NodeJS.ProcessEnv;

  constructor(
    private readonly repo: IDfeSignerRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly resolveUnitCnpj: UnitCnpjResolver,
    private readonly resolveUnitName: UnitNameResolver,
    opts: DfeSignerServiceOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.env = opts.env ?? process.env;
  }

  async gerarCodigo(scope: AccountingScope): Promise<DfeSignerCodigoView> {
    this.assertManage(scope);
    await this.unitCnpjOr422(scope);
    const codigo = Array.from({ length: DFE_SIGNER_CODIGO_TAMANHO }, () => DFE_SIGNER_CODIGO_ALFABETO[randomInt(DFE_SIGNER_CODIGO_ALFABETO.length)]).join('');
    const expiresAt = new Date(this.now().getTime() + DFE_SIGNER_CODIGO_TTL_MS);
    await this.repo.createPairingCode(scope, { codeHash: dfeSignerHash(codigo), expiresAt });
    return { codigo, expiraEm: expiresAt.toISOString() };
  }

  /** AL-5: dispositivo vivo pelo token do `Authorization: Bearer`; null se desconhecido ou revogado. */
  async autenticarDispositivo(token: string): Promise<DfeSignerDeviceWithUnits | null> {
    return this.repo.findLiveDeviceByTokenHash(dfeSignerHash(token));
  }

  async parear(input: DfeSignerPareamentoBody, existente: DfeSignerDeviceWithUnits | null): Promise<DfeSignerPareamentoResposta> {
    const ambiente = this.ambiente();
    const caixa = input.nomeDispositivo;
    const code = await this.repo.findPairingCode(dfeSignerHash(normalizarCodigo(input.codigo)));
    const now = this.now();
    // Código de outro dono que o do dispositivo do Bearer = código inválido para este assinador (não vaza o outro dono).
    if (!code || code.usedAt || code.expiresAt <= now || (existente && existente.userId !== code.userId)) {
      throw new AppError(`O código de pareamento digitado no caixa "${caixa}" é inválido, venceu ou já foi usado. Gere outro na tela do perfil fiscal.`, 400, DFE_SIGNER_CODIGO_INVALIDO);
    }
    const scope: AccountingScope = { ...resolveAccountingScopeInternal({ userId: code.userId }, code.unitId), actorUserId: code.actorUserId };
    const unidade = await this.resolveUnitName(scope);
    const unitCnpj = await this.unitCnpjOr422(scope);

    const der = Buffer.from(input.certificadoDerB64, 'base64');
    let facts: ReturnType<typeof readCertFacts>;
    try {
      facts = readCertFacts(der);
    } catch {
      throw new AppError(`O certificado escolhido no caixa "${caixa}" não pôde ser lido (unidade ${unidade}).`, 400, DFE_SIGNER_CERTIFICADO_INVALIDO);
    }
    const raizUnidade = unitCnpj.slice(0, 8);
    if (!facts.cnpj || facts.cnpj.slice(0, 8) !== raizUnidade) {
      throw new AppError(
        `O certificado escolhido no caixa "${caixa}" não é da raiz de CNPJ da unidade ${unidade} (${raizUnidade}).`,
        400,
        DFE_SIGNER_CNPJ_DIVERGENTE,
      );
    }
    const hoje = today(now);
    if (facts.notBefore > hoje || facts.notAfter < hoje) {
      throw new AppError(
        `O certificado escolhido no caixa "${caixa}" não está válido hoje (validade ${facts.notBefore} a ${facts.notAfter}) — unidade ${unidade}.`,
        400,
        DFE_SIGNER_CERTIFICADO_VENCIDO,
      );
    }
    const thumbprint = createHash('sha256').update(der).digest('hex');
    if (existente && (existente.certThumbprint !== thumbprint || existente.certCnpjRaiz !== raizUnidade)) {
      throw new AppError(
        `O caixa "${caixa}" já está pareado com outro certificado; para servir a unidade ${unidade} ele precisa usar o mesmo certificado.`,
        400,
        DFE_SIGNER_CERTIFICADO_DIVERGENTE,
      );
    }

    const token = existente ? null : randomBytes(DFE_SIGNER_TOKEN_BYTES).toString('base64url');
    const result = await this.repo.runTransaction(async (tx) => {
      if (!(await this.repo.consumePairingCode(code.id, now, tx))) {
        throw new AppError(`O código de pareamento digitado no caixa "${caixa}" é inválido, venceu ou já foi usado. Gere outro na tela do perfil fiscal.`, 400, DFE_SIGNER_CODIGO_INVALIDO);
      }
      // AL-4: um ativo por unidade — o anterior perde o vínculo na mesma tx (gate dentro da tx).
      const anterior = await this.repo.findLiveDeviceForUnit(scope, tx);
      if (anterior && anterior.id !== existente?.id) await this.desvincular(tx, scope, anterior, 'substituido');
      const device: DfeSignerDevice =
        existente ??
        (await this.repo.createDevice(
          {
            userId: scope.ownerUserId,
            nome: input.nomeDispositivo,
            tokenHash: dfeSignerHash(token!),
            certCnpj: facts.cnpj!,
            certCnpjRaiz: raizUnidade,
            certThumbprint: thumbprint,
            certNotAfter: facts.notAfter,
            ambiente,
            versaoAssinador: input.versaoAssinador,
          },
          tx,
        ));
      await this.repo.linkUnit(device.id, scope, tx);
      await this.auditService.append(tx, scope, {
        actorUserId: scope.actorUserId,
        eventType: DFE_SIGNER_PAIRED,
        targetType: 'dfe_signer_device',
        targetId: device.id,
        payload: { ...this.payloadOf(scope, device), vinculo: existente ? 'adicional' : 'novo' },
      });
      return device;
    });
    logger.event('info', 'dfe.signer_paired', 'dfe_signer: assinador pareado', {
      unitId: scope.unitId,
      dispositivoId: result.id,
      vinculo: existente ? 'adicional' : 'novo',
      certCnpjRaiz: result.certCnpjRaiz,
      certNotAfter: result.certNotAfter,
    });

    const unidades = await this.unidadesDe(result.id, scope.ownerUserId);
    return {
      dispositivoId: result.id,
      ...(token ? { token } : {}),
      unidades,
      ambiente: result.ambiente as DfeAmbiente,
      protocolo: DFE_SIGNER_PROTOCOLO,
    };
  }

  /** AL-12 — a view sem segredo; null quando a unidade não tem assinador. */
  async get(scope: AccountingScope): Promise<DfeSignerView | null> {
    if (!this.policy.canReadFiscalProfile(scope)) throw new ForbiddenError('Você não tem permissão para ver o assinador desta unidade.');
    const device = await this.repo.findLiveDeviceForUnit(scope);
    if (!device) return null;
    const vinculo = device.units.find((u) => u.unitId === scope.unitId)!;
    const outrasUnidades = await Promise.all(
      device.units
        .filter((u) => u.unitId !== scope.unitId)
        .map(async (u) => ({ unitId: u.unitId, nome: await this.resolveUnitName({ ...scope, unitId: u.unitId }) })),
    );
    const now = this.now();
    return {
      dispositivoId: device.id,
      nome: device.nome,
      versaoAssinador: device.versaoAssinador,
      versaoMinima: DFE_SIGNER_VERSAO_MINIMA,
      lastSeenAt: device.lastSeenAt ? device.lastSeenAt.toISOString() : null,
      online: !!device.lastSeenAt && now.getTime() - device.lastSeenAt.getTime() <= DFE_SIGNER_ONLINE_MS,
      tokenPresente: device.tokenPresente,
      certCnpjRaiz: device.certCnpjRaiz,
      certNotAfter: device.certNotAfter,
      diasParaVencer: daysBetween(today(now), device.certNotAfter),
      certThumbprint: device.certThumbprint,
      ambiente: device.ambiente as DfeAmbiente,
      pareadoEm: vinculo.createdAt.toISOString(),
      outrasUnidades,
    };
  }

  /** L-AL-3: revoga só o vínculo desta unidade; o último vínculo revoga o dispositivo (token 401). */
  async revogar(scope: AccountingScope): Promise<void> {
    this.assertManage(scope);
    const device = await this.repo.runTransaction(async (tx) => {
      const live = await this.repo.findLiveDeviceForUnit(scope, tx);
      if (!live) throw new NotFoundError('Esta unidade não tem assinador local pareado.');
      await this.desvincular(tx, scope, live, 'revogado');
      return live;
    });
    logger.event('info', 'dfe.signer_revoked', 'dfe_signer: vínculo revogado', { unitId: scope.unitId, dispositivoId: device.id });
  }

  // ── Internos ───────────────────────────────────────────────────────────────
  private async desvincular(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    device: DfeSignerDevice,
    motivo: DfeSignerRevokeMotivo,
  ): Promise<void> {
    const at = this.now();
    await this.repo.unlinkUnit(device.id, scope.unitId, at, tx);
    const restantes = await this.repo.countLiveLinks(device.id, tx);
    if (restantes === 0) await this.repo.revokeDevice(device.id, at, tx);
    await this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType: DFE_SIGNER_REVOKED,
      targetType: 'dfe_signer_device',
      targetId: device.id,
      payload: { ...this.payloadOf(scope, device), motivo, dispositivoRevogado: restantes === 0 ? 'true' : 'false' },
    });
    if (motivo === 'substituido') {
      logger.event('info', 'dfe.signer_revoked', 'dfe_signer: vínculo substituído por pareamento novo', {
        unitId: scope.unitId,
        dispositivoId: device.id,
      });
    }
  }

  private payloadOf(scope: AccountingScope, device: DfeSignerDevice): Record<string, string> {
    return {
      unitId: scope.unitId,
      dispositivoId: device.id,
      certCnpjRaiz: device.certCnpjRaiz,
      certNotAfter: device.certNotAfter,
      certThumbprint: device.certThumbprint,
    };
  }

  private async unidadesDe(deviceId: string, ownerUserId: string): Promise<Array<{ unitId: string; cnpj: string }>> {
    const device = await this.repo.findLiveDeviceById(deviceId);
    const out: Array<{ unitId: string; cnpj: string }> = [];
    for (const u of device?.units ?? []) {
      const cnpj = await this.resolveUnitCnpj(resolveAccountingScopeInternal({ userId: ownerUserId }, u.unitId));
      if (cnpj) out.push({ unitId: u.unitId, cnpj });
    }
    return out;
  }

  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageDfeSigner(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar o assinador local desta unidade.');
    }
  }

  private async unitCnpjOr422(scope: AccountingScope): Promise<string> {
    const cnpj = await this.resolveUnitCnpj(scope);
    if (!cnpj) throw new AppError("CNPJ da unidade ausente ou inválido (cadastre em 'units').", 422, UNIDADE_SEM_CNPJ);
    return cnpj;
  }

  /**
   * O `tpAmb` do pareamento (AL-19 confere contra ele) é o ambiente da instância — o mesmo `DFE_PARTNER_ENV_<KIND>` /
   * `DFE_PARTNER_ENV` que o `selectDfeEmissor` lê. NF-e e NFC-e em ambientes diferentes não têm um ambiente só ⇒ 503.
   */
  private ambiente(): DfeAmbiente {
    const de = (kind: 'NFE' | 'NFCE') => this.env[`DFE_PARTNER_ENV_${kind}`] || this.env.DFE_PARTNER_ENV;
    const nfe = de('NFE');
    const nfce = de('NFCE');
    const valor = nfe && nfce && nfe !== nfce ? null : (nfe ?? nfce);
    if (!valor || !AMBIENTES.includes(valor as DfeAmbiente)) {
      throw new AppError('Ambiente da emissão (DFE_PARTNER_ENV) não configurado para NF-e/NFC-e.', 503, DFE_SIGNER_AMBIENTE_NAO_CONFIGURADO);
    }
    return valor as DfeAmbiente;
  }
}

/** O código é digitado à mão: espaços e hífens de agrupamento saem, minúsculas sobem. */
function normalizarCodigo(codigo: string): string {
  return codigo.replace(/[\s-]/g, '').toUpperCase();
}

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000);
}
