import { ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { AssinadorRemotoPort } from '../dfe/AssinadorRemotoPort';
import type { DfeAmbiente, DfeCallContext, DfeEmissorPort } from '../dfe/DfeEmissorPort';
import type { PscCredentialService, ResolveForEmissionResult } from './PscCredentialService';
import type { NfceCscService } from './NfceCscService';

/** E-6 (F-PSC-5 a) — o faltante nomeado do pré-voo da assinatura. */
export const FALTANTE_SESSAO_PSC = 'sessão do PSC';

export type MotivoSemAssinatura = Extract<ResolveForEmissionResult, { ok: false }>['motivo'];

export type AssinaturaDaUnidade =
  | { ok: true; assinatura?: NonNullable<DfeCallContext['assinatura']> }
  | { ok: false; motivo: MotivoSemAssinatura };

/**
 * DfeAssinaturaResolver — X10a PR-7 (EMENDA-PSC E-6 e E-12; F-PSC-5 a): resolve, pela unidade do DOCUMENTO (o escopo
 * de quem chama — no job, o escopo reconstruído de `doc.unitId`), o `ctx.assinatura` do adaptador que assina pelo PSC.
 * Adaptador sem `capabilities.assinaturaRemota` não precisa de nada (`ok` sem assinatura). Cada assinatura aceita pelo
 * PSC soma 1 no contador da credencial (E-9, F-PSC-4 a) — inclusive a re-assinatura da consulta que remonta o `nfeProc`.
 */
export class DfeAssinaturaResolver {
  constructor(
    private readonly psc: Pick<PscCredentialService, 'resolveForEmission' | 'registrarConsumo'>,
    private readonly assinador: AssinadorRemotoPort,
    /** X10a PR-8 (E-3, decisão 3): o CSC da unidade para o QR Code v2. */
    private readonly cscs?: Pick<NfceCscService, 'resolveForEmission'>,
  ) {}

  /** X10a PR-8 — o CSC vivo da unidade no ambiente, só para a NFC-e do emissor próprio; sem cadastro ⇒ `undefined`. */
  async cscDaUnidade(scope: AccountingScope, port: Pick<DfeEmissorPort, 'capabilities'>, kind: string, ambiente: DfeAmbiente): Promise<{ id: string; csc: string } | undefined> {
    if (kind !== 'NFCE' || !port.capabilities.assinaturaRemota || !this.cscs) return undefined;
    return (await this.cscs.resolveForEmission(scope, ambiente)) ?? undefined;
  }

  async paraUnidade(scope: AccountingScope, port: Pick<DfeEmissorPort, 'capabilities'>): Promise<AssinaturaDaUnidade> {
    if (!port.capabilities.assinaturaRemota) return { ok: true };
    const r = await this.psc.resolveForEmission(scope);
    if (!r.ok) return { ok: false, motivo: r.motivo };
    return { ok: true, assinatura: { assinador: this.comConsumo(scope), credencial: r.credencial } };
  }

  /** Para quem não tem estado de espera (cancelar, inutilizar, reenviar): sem assinatura viva ⇒ 400 com o faltante. */
  async exigir(scope: AccountingScope, port: Pick<DfeEmissorPort, 'capabilities'>): Promise<NonNullable<DfeCallContext['assinatura']> | undefined> {
    const r = await this.paraUnidade(scope, port);
    if (!r.ok) throw bloqueioSessaoPsc(r.motivo);
    return r.assinatura;
  }

  private comConsumo(scope: AccountingScope): AssinadorRemotoPort {
    const { assinador, psc } = this;
    return {
      name: assinador.name,
      async assinarHash(digestB64, algoritmo, tipo, cred) {
        const r = await assinador.assinarHash(digestB64, algoritmo, tipo, cred);
        if (r.ok) {
          // A contagem é aviso de cota (F-PSC-4 a), não gate: falha aqui não derruba a assinatura já feita.
          await psc.registrarConsumo(scope, 1).catch((error: unknown) => {
            logger.warn('psc_consumo: falha ao somar a assinatura no contador', {
              unitId: scope.unitId,
              errorName: error instanceof Error ? error.name : 'UnknownError',
            });
          });
        }
        return r;
      },
    };
  }
}

/** E-6 — 400 `emissao_bloqueada` com `faltantes: ['sessão do PSC']` e o caminho da reautorização da unidade. */
export function bloqueioSessaoPsc(motivo: MotivoSemAssinatura | 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA'): ValidationError {
  return new ValidationError(`emissao_bloqueada: ${FALTANTE_SESSAO_PSC} (${motivo}) — reautorize no PSC.`, {
    faltantes: [FALTANTE_SESSAO_PSC],
    motivo,
    reautorizar: 'POST /api/accounting/psc-credentials/:unitId/authorize',
  });
}
