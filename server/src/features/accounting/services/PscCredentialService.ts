import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Prisma, PscCredential, PscProvider } from 'generated/prisma';
import { AppError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import { loadKeyring, open, seal, type Keyring } from '../../../lib/secretBox';
import { readCertFacts } from '../../../lib/nfeSignature';
import { logger } from '../../../lib/logger';
import { outboundFetch } from '../../../lib/outboundHttp';
import {
  DFE_PSC_KEYRING,
  DFE_PSC_REDIRECT_ENV,
  DFE_PSC_REDIRECT_MISSING,
  PSC_AUTHORIZATION_TTL_MS,
  PSC_AUTORIZACAO_ERRO,
  PSC_AUTORIZACAO_NEGADA,
  PSC_AVISO_CERT_DIAS,
  PSC_AVISO_COTA_FRACAO,
  PSC_AVISO_SESSAO_MS,
  PSC_CERTIFICADO_NAO_E_DA_UNIDADE,
  PSC_CREDENTIAL_AUTHORIZED,
  PSC_CREDENTIAL_REMOVED,
  PSC_HTTP_TIMEOUT_MS,
  PSC_INDISPONIVEL,
  PSC_NAO_HOMOLOGADO,
  PSC_OAUTH_SCOPE,
  PSC_RESPOSTA_INVALIDA,
  PSC_STATE_INVALIDO,
} from '../models/PscCredential.model';
import { UNIDADE_SEM_CNPJ } from '../models/FiscalCertificate.model';
import type { AuthorizePscInput, PscAuthorizeResult, PscCallbackQuery, PscCredentialView } from '../dtos/PscCredentialDto';
import type { IPscCredentialRepository } from '../repositories/IPscCredentialRepository';
import type { IPscProviderRepository } from '../repositories/IPscProviderRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AuditService } from './AuditService';
import type { AccountingScope } from '../scope/AccountingScope';
import { accountingScopeWhere } from '../scope/AccountingScope';
import { resolveAccountingScopeInternal } from '../scope/resolveAccountingScopeInternal';
import type { CredencialPscResolvida, TipoDfeAssinado } from '../dfe/AssinadorRemotoPort';
import type { UnitCnpjResolver } from './FiscalCertificateService';

export type PscFetch = (url: string, init?: RequestInit) => Promise<Response>;
/** Gancho pós-autorização (decisão 5 de D-2026-10-29-X10A-PR7-9-FORKS: envia as PENDING_SIGNATURE da unidade). */
export type PscOnAuthorized = (scope: AccountingScope) => Promise<void>;

export type ResolveForEmissionResult =
  | { ok: true; credencial: CredencialPscResolvida; provider: { baseUrl: string; nome: string } }
  | { ok: false; motivo: 'SEM_CREDENCIAL' | 'CERTIFICADO_VENCIDO' | 'TOKEN_EXPIRADO' };

export interface PscCredentialServiceOptions {
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  fetch?: PscFetch;
  onAuthorized?: PscOnAuthorized;
}

const defaultFetch: PscFetch = (url, init) =>
  outboundFetch('psc', url, { ...init, signal: AbortSignal.timeout(PSC_HTTP_TIMEOUT_MS) });

/**
 * PscCredentialService — credencial OAuth do PSC por unidade (X10a PR-7; EMENDA-PSC E-3..E-6, E-9; F-PSC-3..5 a).
 * FIRST-CLASS PRISMA.
 *
 * - `authorize`: PKCE S256 (RFC 7636). O `code_verifier` fica cifrado (AAD = id) numa `PscAuthorization` de 10 min;
 *   o `state` é esse id assinado por HMAC-SHA256 com chave HKDF(info "psc-state") do keyring. URL conforme
 *   DOC-ICP-17.01 v3.0 §6.4.5.1.1 (`login_hint` = CNPJ da unidade).
 * - `callback` (sem auth de usuário: a prova é o `state` + a autorização pendente não expirada e não usada, consumida
 *   de forma atômica antes de qualquer chamada ao PSC): troca o `code` em `/oauth/token`, recupera o certificado em
 *   `/oauth/certificate-discovery` e confere o CNPJ pela RAIZ (8 primeiros) — NF-e/NFC-e: F-SIG-3 b / rej. 213
 *   (EMENDA-1 E-1, diferente da NFS-e F-ADN-11). O host vem só do `PscProvider` cadastrado.
 * - `remove`: soft-delete + ciphertext zerado na mesma tx. A API obrigatória v0 do DOC-ICP-17.01 não tem revogação de
 *   token, então nada é chamado no PSC (o token expira sozinho em `tokenExpiraEm`).
 * - Falha fechada: sem keyring ⇒ 503 antes de ler/gravar o banco.
 */
export class PscCredentialService {
  private readonly now: () => Date;
  private readonly env: NodeJS.ProcessEnv;
  private readonly fetchFn: PscFetch;
  private onAuthorized: PscOnAuthorized;

  constructor(
    private readonly repo: IPscCredentialRepository,
    private readonly providerRepo: IPscProviderRepository,
    private readonly auditService: AuditService,
    private readonly policy: IAccountingPolicy,
    private readonly resolveUnitCnpj: UnitCnpjResolver,
    opts: PscCredentialServiceOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.env = opts.env ?? process.env;
    this.fetchFn = opts.fetch ?? defaultFetch;
    this.onAuthorized = opts.onAuthorized ?? (async () => undefined);
  }

  /** Liga o gancho pós-autorização (wiring do envio das PENDING_SIGNATURE). */
  setOnAuthorized(fn: PscOnAuthorized): void {
    this.onAuthorized = fn;
  }

  async authorize(scope: AccountingScope, input: AuthorizePscInput): Promise<PscAuthorizeResult> {
    this.assertManage(scope);
    const keyring = loadKeyring(this.env, DFE_PSC_KEYRING);
    const redirectUri = this.redirectUri();
    const provider = await this.providerRepo.findLive(input.pscProviderId);
    assertHomologado(provider);
    const unitCnpj = await this.unitCnpjOr422(scope);

    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const expiresAt = new Date(this.now().getTime() + PSC_AUTHORIZATION_TTL_MS);
    const pending = await this.repo.runTransaction(async (tx) => {
      const shell = await this.repo.createAuthorization(
        scope,
        {
          actorUserId: scope.actorUserId,
          pscProviderId: provider.id,
          escopo: JSON.stringify(input.escopo),
          keyVersion: keyring.activeVersion,
          expiresAt,
        },
        tx,
      );
      await this.repo.writeVerifier(shell.id, seal(verifier, shell.id, keyring).blob, tx);
      return shell;
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      state: signState(pending.id, keyring, keyring.activeVersion),
      scope: PSC_OAUTH_SCOPE,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      login_hint: unitCnpj,
    });
    return { authorizationUrl: `${pscUrl(provider.baseUrl, 'oauth/authorize')}?${params.toString()}`, expiresAt: expiresAt.toISOString() };
  }

  async callback(q: PscCallbackQuery): Promise<PscCredentialView> {
    const keyring = loadKeyring(this.env, DFE_PSC_KEYRING);
    const redirectUri = this.redirectUri();
    const authId = verifyState(q.state, keyring);
    const pending = authId ? await this.repo.findAuthorization(authId) : null;
    if (!pending || pending.usedAt || !pending.codeVerifierCiphertext || pending.expiresAt <= this.now()) {
      throw new AppError('Autorização do PSC inválida, expirada ou já usada.', 400, PSC_STATE_INVALIDO);
    }
    const verifier = open(pending.codeVerifierCiphertext, pending.id, pending.keyVersion, keyring);
    if (!(await this.repo.consumeAuthorization(pending.id, this.now()))) {
      throw new AppError('Autorização do PSC inválida, expirada ou já usada.', 400, PSC_STATE_INVALIDO);
    }
    if (q.error) {
      if (q.error === 'user_denied') throw new AppError('O titular negou a autorização no PSC.', 400, PSC_AUTORIZACAO_NEGADA);
      throw new AppError('O PSC devolveu erro na autorização.', 400, PSC_AUTORIZACAO_ERRO);
    }
    if (!q.code) throw new AppError('Retorno do PSC sem código de autorização.', 400, PSC_AUTORIZACAO_ERRO);

    const scope: AccountingScope = {
      ...resolveAccountingScopeInternal({ userId: pending.userId }, pending.unitId),
      actorUserId: pending.actorUserId,
    };
    const provider = await this.providerRepo.findLive(pending.pscProviderId);
    assertHomologado(provider);
    if (!provider.clientSecretCipher || provider.keyVersion == null) {
      throw new AppError('PSC sem segredo OAuth cadastrado.', 422, PSC_NAO_HOMOLOGADO);
    }
    const clientSecret = open(provider.clientSecretCipher, provider.id, provider.keyVersion, keyring);
    const unitCnpj = await this.unitCnpjOr422(scope);

    const token = await this.exchangeCode(provider, clientSecret, q.code, redirectUri, verifier);
    const cert = await this.discoverCertificate(provider, token.accessToken, unitCnpj);
    const tokenExpiraEm = new Date(this.now().getTime() + token.expiresIn * 1000);

    const view = await this.repo.runTransaction(async (tx) => {
      const previous = await this.repo.findLive(scope, tx);
      if (previous) await this.repo.softDelete(previous.id, previous.unitId, tx);
      const shell = await this.repo.createShell(
        scope,
        {
          pscProviderId: provider.id,
          titularCnpj: cert.cnpj,
          certificadoPem: cert.pem,
          certNotAfter: cert.notAfter,
          tokenExpiraEm,
          escopo: pending.escopo,
          consumoAno: this.anoCivil(),
        },
        tx,
      );
      const sealed = seal(token.accessToken, shell.id, keyring);
      const saved = await this.repo.writeToken(shell.id, { accessTokenCiphertext: sealed.blob, keyVersion: sealed.keyVersion }, tx);
      await this.audit(tx, scope, PSC_CREDENTIAL_AUTHORIZED, saved);
      return this.toView(saved, provider);
    });

    try {
      await this.onAuthorized(scope);
    } catch (error) {
      logger.warn('psc_credential: gancho pós-autorização falhou; a credencial foi mantida', {
        unitId: scope.unitId,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
    return view;
  }

  async get(scope: AccountingScope): Promise<PscCredentialView> {
    this.assertManage(scope);
    const row = await this.repo.findLive(scope);
    if (!row) throw new NotFoundError('Esta unidade não tem credencial do PSC.');
    return this.toView(row, await this.providerRepo.findLive(row.pscProviderId));
  }

  async remove(scope: AccountingScope): Promise<void> {
    this.assertManage(scope);
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findLive(scope, tx);
      if (!row) throw new NotFoundError('Esta unidade não tem credencial do PSC.');
      await this.repo.softDelete(row.id, row.unitId, tx);
      await this.audit(tx, scope, PSC_CREDENTIAL_REMOVED, row);
      // Sem revogação no PSC: a API obrigatória v0 (DOC-ICP-17.01 v3.0 §6.4.5) não tem esse serviço.
    });
  }

  /**
   * F-PSC-5 a: o que a emissão usa. Sem credencial viva (ou PSC fora da lista) ⇒ SEM_CREDENCIAL; certificado vencido
   * ⇒ CERTIFICADO_VENCIDO; token vencido ⇒ TOKEN_EXPIRADO. Chamador interno (a policy já rodou na emissão).
   */
  async resolveForEmission(scope: AccountingScope): Promise<ResolveForEmissionResult> {
    const keyring = loadKeyring(this.env, DFE_PSC_KEYRING);
    const row = await this.repo.findLive(scope);
    if (!row || !row.accessTokenCiphertext || row.keyVersion == null) return { ok: false, motivo: 'SEM_CREDENCIAL' };
    const provider = await this.providerRepo.findLive(row.pscProviderId);
    if (!provider || !provider.habilitadoEm) return { ok: false, motivo: 'SEM_CREDENCIAL' };
    const now = this.now();
    if (row.certNotAfter < today(now)) return { ok: false, motivo: 'CERTIFICADO_VENCIDO' };
    if (row.tokenExpiraEm <= now) return { ok: false, motivo: 'TOKEN_EXPIRADO' };
    return {
      ok: true,
      credencial: {
        pscProviderId: provider.id,
        baseUrl: provider.baseUrl,
        accessToken: open(row.accessTokenCiphertext, row.id, row.keyVersion, keyring),
        titularCnpj: row.titularCnpj,
        certificadoPem: row.certificadoPem,
        escopo: JSON.parse(row.escopo) as TipoDfeAssinado[],
      },
      provider: { baseUrl: provider.baseUrl, nome: provider.nome },
    };
  }

  /** F-PSC-4 a / E-9: +n assinaturas no contador do ano civil; em ano novo o contador recomeça. */
  async registrarConsumo(scope: AccountingScope, n: number): Promise<void> {
    await this.repo.runTransaction(async (tx) => {
      const row = await this.repo.findLive(scope, tx);
      if (!row) return;
      const ano = this.anoCivil();
      await this.repo.setConsumo(row.id, { consumoAno: ano, consumoNoAno: (row.consumoAno === ano ? row.consumoNoAno : 0) + n }, tx);
    });
  }

  // ── Internos ───────────────────────────────────────────────────────────────
  private assertManage(scope: AccountingScope): void {
    if (!this.policy.canManagePscCredential(scope)) {
      throw new ForbiddenError('Você não tem permissão para gerenciar a credencial do PSC.');
    }
  }

  private redirectUri(): string {
    const uri = this.env[DFE_PSC_REDIRECT_ENV]?.trim();
    if (!uri) throw new AppError(`URI de retorno do PSC não configurada (${DFE_PSC_REDIRECT_ENV}).`, 503, DFE_PSC_REDIRECT_MISSING);
    return uri;
  }

  private async unitCnpjOr422(scope: AccountingScope): Promise<string> {
    const cnpj = await this.resolveUnitCnpj(scope);
    if (!cnpj) throw new AppError("CNPJ da unidade ausente ou inválido (cadastre em 'units').", 422, UNIDADE_SEM_CNPJ);
    return cnpj;
  }

  /** Ano civil no fuso do escopo (America/Sao_Paulo, UTC−3 sem horário de verão desde 2019). */
  private anoCivil(): number {
    return new Date(this.now().getTime() - 3 * 3_600_000).getUTCFullYear();
  }

  private async exchangeCode(
    provider: PscProvider,
    clientSecret: string,
    code: string,
    redirectUri: string,
    verifier: string,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });
    const res = await this.call(pscUrl(provider.baseUrl, 'oauth/token'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    if (res.status >= 400 && res.status < 500) throw new AppError('O PSC recusou o código de autorização.', 400, PSC_AUTORIZACAO_ERRO);
    const json = await this.jsonOk(res);
    const accessToken = json.access_token;
    const expiresIn = json.expires_in;
    if (typeof accessToken !== 'string' || !accessToken || typeof expiresIn !== 'number' || !(expiresIn > 0)) {
      throw new AppError('Resposta de token do PSC inválida.', 502, PSC_RESPOSTA_INVALIDA);
    }
    return { accessToken, expiresIn };
  }

  /** DOC-ICP-17.01 §6.4.5.4: lista de certificados; usa o primeiro cuja raiz de CNPJ é a da unidade. */
  private async discoverCertificate(
    provider: PscProvider,
    accessToken: string,
    unitCnpj: string,
  ): Promise<{ pem: string; cnpj: string; notAfter: string }> {
    const res = await this.call(pscUrl(provider.baseUrl, 'oauth/certificate-discovery'), {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
    });
    const json = await this.jsonOk(res);
    const list = Array.isArray(json.certificates) ? (json.certificates as Array<Record<string, unknown>>) : [];
    for (const item of list) {
      const pem = typeof item?.certificate === 'string' ? item.certificate : null;
      if (!pem) continue;
      let facts: ReturnType<typeof readCertFacts>;
      try {
        facts = readCertFacts(pemToDer(pem));
      } catch {
        continue;
      }
      if (facts.cnpj && facts.cnpj.slice(0, 8) === unitCnpj.slice(0, 8)) {
        return { pem, cnpj: facts.cnpj, notAfter: facts.notAfter };
      }
    }
    throw new AppError(
      'O certificado autorizado no PSC não é da raiz de CNPJ desta unidade.',
      422,
      PSC_CERTIFICADO_NAO_E_DA_UNIDADE,
    );
  }

  private async call(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(url, init);
    } catch {
      throw new AppError('PSC indisponível.', 502, PSC_INDISPONIVEL);
    }
  }

  private async jsonOk(res: Response): Promise<Record<string, unknown>> {
    if (!res.ok) throw new AppError(`PSC respondeu ${res.status}.`, 502, PSC_INDISPONIVEL);
    try {
      return (await res.json()) as Record<string, unknown>;
    } catch {
      throw new AppError('Resposta do PSC não é JSON.', 502, PSC_RESPOSTA_INVALIDA);
    }
  }

  private audit(tx: Prisma.TransactionClient, scope: AccountingScope, eventType: string, row: PscCredential): Promise<void> {
    return this.auditService.append(tx, scope, {
      actorUserId: scope.actorUserId,
      eventType,
      targetType: 'psc_credential',
      targetId: row.id,
      payload: { unitId: accountingScopeWhere(scope).unitId, pscProviderId: row.pscProviderId, certNotAfter: row.certNotAfter },
    });
  }

  private toView(row: PscCredential, provider: PscProvider | null): PscCredentialView {
    const now = this.now();
    const consumoNoAno = row.consumoAno === this.anoCivil() ? row.consumoNoAno : 0;
    const cotaAnual = provider?.cotaAnual ?? null;
    const avisos: string[] = [];
    const dias = daysBetween(today(now), row.certNotAfter);
    if (dias <= PSC_AVISO_CERT_DIAS) avisos.push(`certificado_vence_em_${dias}_dias`);
    if (row.tokenExpiraEm.getTime() - now.getTime() < PSC_AVISO_SESSAO_MS) avisos.push('sessao_psc_vence_em_menos_de_1h');
    if (cotaAnual && consumoNoAno >= PSC_AVISO_COTA_FRACAO * cotaAnual) avisos.push('cota_psc_acima_de_80');
    return {
      unitId: row.unitId,
      psc: provider?.nome ?? 'PSC removido',
      titularCnpj: row.titularCnpj,
      certNotAfter: row.certNotAfter,
      tokenExpiraEm: row.tokenExpiraEm.toISOString(),
      consumoNoAno,
      cotaAnual,
      avisos,
    };
  }
}

function assertHomologado(provider: PscProvider | null): asserts provider is PscProvider {
  if (!provider || !provider.habilitadoEm) {
    throw new AppError('PSC fora da lista de homologados do Luminaris.', 422, PSC_NAO_HOMOLOGADO);
  }
}

/** `<baseUrl>/<path>` sem barra dupla (a URI-base do PSC termina em `/v0/` ou `/v0`). */
function pscUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/${path}`;
}

function stateKey(keyring: Keyring, version: number): Buffer | null {
  const master = keyring.keys.get(version);
  return master ? Buffer.from(hkdfSync('sha256', master, Buffer.alloc(0), 'psc-state', 32)) : null;
}

/** `state` = `<versão>.<id>.<HMAC-SHA256(id)>` (base64url); a versão diz qual chave do keyring conferir. */
function signState(id: string, keyring: Keyring, version: number): string {
  const mac = createHmac('sha256', stateKey(keyring, version)!).update(id).digest('base64url');
  return `${version}.${id}.${mac}`;
}

function verifyState(state: string, keyring: Keyring): string | null {
  const [v, id, mac, ...rest] = state.split('.');
  if (rest.length || !v || !id || !mac) return null;
  const key = stateKey(keyring, Number(v));
  if (!key) return null;
  const expected = createHmac('sha256', key).update(id).digest();
  const got = Buffer.from(mac, 'base64url');
  return got.length === expected.length && timingSafeEqual(got, expected) ? id : null;
}

function pemToDer(pem: string): Buffer {
  return Buffer.from(pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, ''), 'base64');
}

function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86_400_000);
}
