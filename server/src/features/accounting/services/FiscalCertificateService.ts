import { X509Certificate, createHash, createPrivateKey, randomBytes, sign, verify } from 'node:crypto';
import forge from 'node-forge';
import type { FiscalCertificate, Prisma } from 'generated/prisma';
import { AppError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import { loadKeyring, seal } from '../../../lib/secretBox';
import { readCertFacts } from '../../../lib/nfeSignature';
import {
  CERTIFICADO_CHAVE_NAO_CORRESPONDE,
  CERTIFICADO_CNPJ_DIVERGENTE,
  CERTIFICADO_ILEGIVEL,
  CERTIFICADO_SEM_CNPJ,
  CERTIFICADO_SENHA_INVALIDA,
  CERTIFICADO_VENCIDO,
  DFE_CERT_KEYRING,
  FISCAL_CERTIFICATE_REMOVED,
  FISCAL_CERTIFICATE_SET,
  UNIDADE_SEM_CNPJ,
} from '../models/FiscalCertificate.model';
import type { FiscalCertificateView } from '../dtos/FiscalCertificateDto';
import type { IFiscalCertificateRepository } from '../repositories/IFiscalCertificateRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';

/** CNPJ da unidade (preset `units`, já sem máscara e em maiúsculas), ou null se ausente/inválido. */
export type UnitCnpjResolver = (scope: AccountingScope) => Promise<string | null>;

export interface UploadFiscalCertificateCommand {
  pfx: Buffer;
  senha: string;
}

/** Chave e certificado extraídos do PKCS#12, só em memória. */
interface OpenedPfx {
  keyPem: string; // PKCS#8
  certDer: Buffer;
}

/**
 * FiscalCertificateService — guarda do certificado do cliente por unidade (BE-INCR-DFE-ADN-EMISSOR PR-1, itens 3–6;
 * ADR-INCR-DFE-EMISSAO-PARCEIRO §12; F-ADN-2 a, F-ADN-3 b, F-ADN-4 a, F-ADN-11 a). FIRST-CLASS PRISMA.
 *
 * - Policy-first: `canManageFiscalCertificate` (delega a `canManageFiscalProfile`) em todas as operações.
 * - `loadKeyring(DFE_CERT_KEYRING)` roda ANTES de ler o banco (sem chave ⇒ 503 `dfe_cert_key_missing`, sem efeito).
 * - O PFX é aberto em memória (node-forge), validado e descartado; o PFX e a senha nunca são persistidos nem logados.
 * - Validações do item 5, nessa ordem: (i) a chave corresponde ao certificado; (ii) OtherName de CNPJ presente;
 *   (iii) CNPJ do certificado = CNPJ da unidade nos 14 dígitos (F-ADN-11 a; FAQ NFS-e v1.1 17.7/28.2);
 *   (iv) `notAfter` no futuro. Falha ⇒ 422 com o motivo nomeado.
 * - Cifra com AAD = id da linha; trocar o certificado apaga (soft) a linha viva e cria outra na mesma tx.
 * - DELETE: soft-delete com ciphertext zerado na mesma tx; audit sem segredo nem CNPJ.
 */
export class FiscalCertificateService {
  constructor(
    private readonly repo: IFiscalCertificateRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly resolveUnitCnpj: UnitCnpjResolver,
    private readonly now: () => Date = () => new Date(),
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  async get(scope: AccountingScope): Promise<FiscalCertificateView> {
    this.assertManage(scope);
    const row = await this.repo.findLive(scope);
    if (!row) throw new NotFoundError('Esta unidade não tem certificado fiscal.');
    return this.toView(row);
  }

  async upload(scope: AccountingScope, cmd: UploadFiscalCertificateCommand): Promise<FiscalCertificateView> {
    this.assertManage(scope);
    const keyring = loadKeyring(this.env, DFE_CERT_KEYRING);

    const opened = openPfx(cmd.pfx, cmd.senha);
    assertKeyMatchesCert(opened);
    const facts = readFactsOr422(opened.certDer);
    if (!facts.cnpj) throw new AppError('Certificado sem CNPJ (OtherName 2.16.76.1.3.3).', 422, CERTIFICADO_SEM_CNPJ);
    const unitCnpj = await this.resolveUnitCnpj(scope);
    if (!unitCnpj) {
      throw new AppError("CNPJ da unidade ausente ou inválido (cadastre em 'units').", 422, UNIDADE_SEM_CNPJ);
    }
    if (facts.cnpj !== unitCnpj) {
      throw new AppError(
        `O certificado é do CNPJ ${facts.cnpj}, e a unidade é ${unitCnpj}. Cada unidade usa o certificado do próprio CNPJ.`,
        422,
        CERTIFICADO_CNPJ_DIVERGENTE,
      );
    }
    if (facts.notAfter <= today(this.now())) {
      throw new AppError(`Certificado vencido em ${facts.notAfter}.`, 422, CERTIFICADO_VENCIDO);
    }

    const projections = {
      keyVersion: keyring.activeVersion,
      cnpjCertificado: facts.cnpj,
      notBefore: facts.notBefore,
      notAfter: facts.notAfter,
      fingerprintSha256: createHash('sha256').update(opened.certDer).digest('hex'),
      setById: scope.actorUserId,
    };
    return this.repo.runTransaction(async (tx) => {
      const { unitId } = accountingScopeWhere(scope);
      const previous = await this.repo.findLive(scope, tx);
      if (previous) await this.repo.softDelete(previous.id, previous.unitId, tx);
      const shell = await this.repo.createShell(scope, projections, tx);
      const key = seal(opened.keyPem, shell.id, keyring);
      const cert = seal(opened.certDer.toString('base64'), shell.id, keyring);
      const saved = await this.repo.writeSecret(
        shell.id,
        { ...projections, keyVersion: key.keyVersion, keyCiphertext: key.blob, certCiphertext: cert.blob },
        tx,
      );
      await this.audit(tx, scope, FISCAL_CERTIFICATE_SET, saved.id, {
        unitId,
        fingerprintSha256: saved.fingerprintSha256,
        notAfter: saved.notAfter,
      });
      return this.toView(saved);
    });
  }

  async remove(scope: AccountingScope): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findLive(scope, tx);
      if (!row) throw new NotFoundError('Esta unidade não tem certificado fiscal.');
      await this.repo.softDelete(row.id, row.unitId, tx);
      await this.audit(tx, scope, FISCAL_CERTIFICATE_REMOVED, row.id, {
        unitId: row.unitId,
        fingerprintSha256: row.fingerprintSha256,
        notAfter: row.notAfter,
      });
    });
  }

  // ── Internos ───────────────────────────────────────────────────────────────
  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManageFiscalCertificate(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar o certificado fiscal.');
    }
  }

  private audit(
    tx: Prisma.TransactionClient,
    scope: AccountingScope,
    eventType: string,
    id: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    return this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'fiscal_certificate',
      targetId: id,
      payload,
    });
  }

  private toView(row: FiscalCertificate): FiscalCertificateView {
    return {
      unitId: row.unitId,
      cnpjCertificado: row.cnpjCertificado,
      notBefore: row.notBefore,
      notAfter: row.notAfter,
      diasParaVencer: daysBetween(today(this.now()), row.notAfter),
      fingerprintSha256: row.fingerprintSha256,
      setAt: row.setAt.toISOString(),
    };
  }
}

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000);
}

/** Abre o PKCS#12 em memória (F-ADN-4 a). Senha errada ⇒ 422 `certificado_senha_invalida`. */
function openPfx(pfx: Buffer, senha: string): OpenedPfx {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')));
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, true, senha);
    } catch (err) {
      if (/password|MAC/i.test(String((err as Error)?.message))) {
        throw new AppError('Senha do certificado incorreta.', 422, CERTIFICADO_SENHA_INVALIDA);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Arquivo de certificado ilegível (esperado PFX/P12).', 422, CERTIFICADO_ILEGIVEL);
  }

  const keyBags = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
  ];
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const key = keyBags.find((b) => b.key)?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!key || certBags.length === 0) {
    throw new AppError('O arquivo não contém chave privada e certificado.', 422, CERTIFICADO_ILEGIVEL);
  }
  // Certificado do usuário final = o que tem a mesma chave pública da chave privada; a cadeia (ACs) é descartada.
  const endEntity =
    certBags.find((b) => {
      const pub = b.cert?.publicKey as forge.pki.rsa.PublicKey | undefined;
      return pub?.n && pub.n.equals(key.n);
    })?.cert ?? certBags[0].cert;
  if (!endEntity) throw new AppError('O arquivo não contém certificado legível.', 422, CERTIFICADO_ILEGIVEL);

  const keyPem = forge.pki.privateKeyInfoToPem(forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(key)));
  const certDer = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(endEntity)).getBytes(), 'binary');
  return { keyPem, certDer };
}

/** Item 5 (i): a chave assina um desafio que a chave pública do certificado verifica (node:crypto, não a forge). */
function assertKeyMatchesCert(opened: OpenedPfx): void {
  const challenge = randomBytes(32);
  let ok = false;
  try {
    const signature = sign('sha256', challenge, createPrivateKey(opened.keyPem));
    ok = verify('sha256', challenge, new X509Certificate(opened.certDer).publicKey, signature);
  } catch {
    ok = false;
  }
  if (!ok) {
    throw new AppError('A chave privada não corresponde ao certificado.', 422, CERTIFICADO_CHAVE_NAO_CORRESPONDE);
  }
}

function readFactsOr422(der: Buffer) {
  try {
    return readCertFacts(der);
  } catch {
    throw new AppError('Certificado ilegível.', 422, CERTIFICADO_ILEGIVEL);
  }
}
