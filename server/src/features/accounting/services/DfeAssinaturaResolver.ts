import { ValidationError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { AssinadorRemotoPort } from '../dfe/AssinadorRemotoPort';
import type { CscDaUnidade, DfeAmbiente, DfeCallContext, DfeEmissorPort } from '../dfe/DfeEmissorPort';
import type { PscCredentialService, ResolveForEmissionResult } from './PscCredentialService';
import type { NfceCscService } from './NfceCscService';
import type { DfeAssinadorKind } from '../dfe/selectDfeAssinador';
import { AssinadorLocalSigner, AssinadorLocalTransporte } from '../dfe/local/AssinadorLocal';
import { FALTANTE_ASSINADOR_LOCAL } from '../models/DfeSigner.model';
import { MOTIVOS_ASSINADOR_ESPERA, type DfeSignerTaskService, type MotivoSemAssinadorLocal } from './DfeSignerTaskService';

/** E-6 (F-PSC-5 a) — o faltante nomeado do pré-voo da assinatura. */
export const FALTANTE_SESSAO_PSC = 'sessão do PSC';

export type MotivoSemAssinatura = Extract<ResolveForEmissionResult, { ok: false }>['motivo'] | MotivoSemAssinadorLocal;

/**
 * Motivo em que a nota NASCE esperando a assinatura (sem número, E-13) em vez de 400: o token do PSC vencido (F-PSC-6 a)
 * e o assinador local fora do ar ou sem token (AL-13; F-AL-6 a, F-FEAS-3 a — a nota sai sozinha quando ele volta).
 */
export function motivoAguardaAssinatura(motivo: MotivoSemAssinatura): boolean {
  return motivo === 'TOKEN_EXPIRADO' || (MOTIVOS_ASSINADOR_ESPERA as readonly string[]).includes(motivo);
}

/** A porta do documento como o resolvedor a lê: `assinador` vem da seleção (`SefazNfeEmissor`, AL-2). */
export type PortaComAssinador = Pick<DfeEmissorPort, 'capabilities'> & { readonly assinador?: DfeAssinadorKind };

export type AssinaturaDaUnidade =
  | { ok: true; assinatura?: NonNullable<DfeCallContext['assinatura']> }
  | { ok: false; motivo: MotivoSemAssinatura };

/**
 * DfeAssinaturaResolver — X10a PR-7 (EMENDA-PSC E-6 e E-12; F-PSC-5 a): resolve, pela unidade do DOCUMENTO (o escopo
 * de quem chama — no job, o escopo reconstruído de `doc.unitId`), o `ctx.assinatura` do adaptador que assina pelo PSC.
 * Adaptador sem `capabilities.assinaturaRemota` não precisa de nada (`ok` sem assinatura). Cada assinatura aceita pelo
 * PSC soma 1 no contador da credencial (E-9, F-PSC-4 a) — inclusive a re-assinatura da consulta que remonta o `nfeProc`.
 *
 * X10a EMENDA-4 (AL-2, AL-8, AL-9, AL-13; F-AL-7 a): QUEM assina é o `assinador` da porta (a seleção
 * `DFE_ASSINADOR_<KIND>`): `local` resolve o assinador do caixa da unidade (pré-voo AL-13) e põe no contexto o
 * `AssinadorLocalSigner` e o `AssinadorLocalTransporte` do dispositivo; `psc` segue o caminho do PR-7 e, havendo
 * dispositivo pareado, transmite por ele (sem transmissor do Luminaris, F-AL-7 a).
 */
export class DfeAssinaturaResolver {
  constructor(
    private readonly psc: Pick<PscCredentialService, 'resolveForEmission' | 'registrarConsumo'>,
    private readonly assinador: AssinadorRemotoPort,
    /** X10a PR-8 (E-3, decisão 3): o CSC da unidade para o QR Code v2. */
    private readonly cscs?: Pick<NfceCscService, 'resolveForEmission'>,
    /** X10a EMENDA-4 AL-PR-3: a fila do assinador local; ausente ⇒ `local` responde sem assinador. */
    private readonly local?: Pick<DfeSignerTaskService, 'paraUnidade' | 'timeoutAssinaturaMs' | 'timeoutTransmissaoMs'>,
  ) {}

  /** X10a PR-8 — o CSC vivo da unidade no ambiente, só para a NFC-e do emissor próprio; sem cadastro ⇒ `undefined`. */
  async cscDaUnidade(scope: AccountingScope, port: Pick<DfeEmissorPort, 'capabilities'>, kind: string, ambiente: DfeAmbiente): Promise<CscDaUnidade | undefined> {
    if (kind !== 'NFCE' || !port.capabilities.assinaturaRemota || !this.cscs) return undefined;
    return (await this.cscs.resolveForEmission(scope, ambiente)) ?? undefined;
  }

  async paraUnidade(scope: AccountingScope, port: PortaComAssinador): Promise<AssinaturaDaUnidade> {
    if (!port.capabilities.assinaturaRemota) return { ok: true };
    if (port.assinador === 'local') return this.paraUnidadeLocal(scope);
    const r = await this.psc.resolveForEmission(scope);
    if (!r.ok) return { ok: false, motivo: r.motivo };
    const transporte = port.assinador === 'psc' ? await this.transporteLocal(scope) : undefined;
    return { ok: true, assinatura: { assinador: this.comConsumo(scope), credencial: r.credencial, ...(transporte ? { transporte } : {}) } };
  }

  /** Para quem não tem estado de espera (cancelar, inutilizar, reenviar): sem assinatura viva ⇒ 400 com o faltante. */
  async exigir(scope: AccountingScope, port: PortaComAssinador): Promise<NonNullable<DfeCallContext['assinatura']> | undefined> {
    const r = await this.paraUnidade(scope, port);
    if (!r.ok) throw bloqueioSessaoPsc(r.motivo);
    return r.assinatura;
  }

  /**
   * AL-13 — o assinador do caixa da unidade: sem dispositivo ou com o certificado vencido ⇒ motivo que vira 400; fora do
   * ar ou sem token ⇒ motivo em que a nota espera. A credencial não leva certificado: ele volta com cada assinatura
   * (L-AL-1) e o `KeyInfo` o recebe em memória.
   */
  private async paraUnidadeLocal(scope: AccountingScope): Promise<AssinaturaDaUnidade> {
    if (!this.local) return { ok: false, motivo: 'ASSINADOR_AUSENTE' };
    const r = await this.local.paraUnidade(scope);
    if (!r.ok) {
      if (r.motivo === 'ASSINADOR_FORA') {
        logger.event('warn', 'dfe.signer_offline', 'dfe_signer: assinador local fora do ar no pré-voo', {
          unitId: scope.unitId,
          dispositivoId: r.device?.id,
          ultimoPoll: r.device?.lastSeenAt ? r.device.lastSeenAt.toISOString() : null,
        });
      }
      return { ok: false, motivo: r.motivo };
    }
    const { device, fila } = r;
    return {
      ok: true,
      assinatura: {
        assinador: new AssinadorLocalSigner(fila, { dispositivoId: device.id, certThumbprint: device.certThumbprint, timeoutMs: this.local.timeoutAssinaturaMs() }),
        credencial: { pscProviderId: 'assinador-local', baseUrl: '', accessToken: '', titularCnpj: device.certCnpj, certificadoPem: '', escopo: ['NFE', 'NFCE'] },
        transporte: new AssinadorLocalTransporte(fila, { dispositivoId: device.id, timeoutMs: this.local.timeoutTransmissaoMs() }),
      },
    };
  }

  /** F-AL-7 a — no ramo PSC, a transmissão também sai pelo assinador do caixa, se a unidade tiver um pareado. */
  private async transporteLocal(scope: AccountingScope): Promise<AssinadorLocalTransporte | undefined> {
    if (!this.local) return undefined;
    const r = await this.local.paraUnidade(scope);
    if (!r.device || !r.fila) return undefined;
    return new AssinadorLocalTransporte(r.fila, { dispositivoId: r.device.id, timeoutMs: this.local.timeoutTransmissaoMs() });
  }

  private comConsumo(scope: AccountingScope): AssinadorRemotoPort {
    const { assinador, psc } = this;
    return {
      name: assinador.name,
      async assinarHash(digestB64, algoritmo, tipo, cred, conteudo) {
        const r = await assinador.assinarHash(digestB64, algoritmo, tipo, cred, conteudo);
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

/**
 * E-6 — 400 `emissao_bloqueada` com `faltantes: ['sessão do PSC']` e o caminho da reautorização da unidade. AL-13: o
 * motivo do assinador local nomeia o faltante `assinador local` e o caminho do pareamento.
 */
export function bloqueioSessaoPsc(motivo: MotivoSemAssinatura | 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA' | 'ASSINADOR_INDISPONIVEL'): ValidationError {
  if (motivo === 'ASSINADOR_INDISPONIVEL' || motivo.startsWith('ASSINADOR_')) {
    return new ValidationError(`emissao_bloqueada: ${FALTANTE_ASSINADOR_LOCAL} (${motivo}) — confira o assinador do caixa ou pareie de novo.`, {
      faltantes: [FALTANTE_ASSINADOR_LOCAL],
      motivo,
      parear: 'POST /api/accounting/dfe-assinador/:unitId/codigos',
    });
  }
  return new ValidationError(`emissao_bloqueada: ${FALTANTE_SESSAO_PSC} (${motivo}) — reautorize no PSC.`, {
    faltantes: [FALTANTE_SESSAO_PSC],
    motivo,
    reautorizar: 'POST /api/accounting/psc-credentials/:unitId/authorize',
  });
}
