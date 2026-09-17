import { ValidationError } from '../../../lib/errors';
import type { CancelResult, DfeCapabilities, DfeEmissorPort, EmissaoResult } from './DfeEmissorPort';

/**
 * DfeDisabledEmissor — BE-INCR-DFE (BRIEF item 13). Adaptador usado quando `DFE_PARTNER` está ausente
 * ou aponta a um parceiro sem implementação: desabilitada COM AVISO, nunca em silêncio (ADR §7 item 6).
 * `emitir` lança; as demais operações também recusam — não há nenhum documento em voo para consultar
 * ou cancelar quando a porta nunca emitiu nada.
 */
export class DfeDisabledEmissor implements DfeEmissorPort {
  public readonly name = 'disabled';
  public readonly capabilities: DfeCapabilities = {
    numbersDps: false,
    consultar: false,
    cancelar: false,
    webhook: false,
  };

  constructor(public readonly reason: string) {}

  async emitir(): Promise<EmissaoResult> {
    throw new ValidationError(`dfe_disabled: ${this.reason}`);
  }

  async consultar(): Promise<EmissaoResult> {
    throw new ValidationError(`dfe_disabled: ${this.reason}`);
  }

  async cancelar(): Promise<CancelResult> {
    throw new ValidationError(`dfe_disabled: ${this.reason}`);
  }

  verifyWebhook(): { ok: true; partnerRef: string } | { ok: false } {
    return { ok: false };
  }
}
