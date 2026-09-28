import { ValidationError } from '../../../lib/errors';
import type { CancelResult, DfeCapabilities, DfeEmissorPort, EmissaoResult, EmitirInput } from './DfeEmissorPort';

/**
 * ManualEmissor — BE-INCR-DFE-MANUAL (item 7; F-MAN-3 → a, substitui o FileEmissor do X10b). O cliente sem parceiro
 * emite a NFS-e no portal público a partir da ficha (a DPS já está em `FiscalDocumentAttempt.payloadJson` — nada vai
 * para disco) e devolve o XML autorizado pela rota de retorno manual, que o relê.
 *
 * - `numbersDps: true` — o PORTAL numera a DPS (F-MAN-4 a; RN E0010: série 70000–79999 no emissor web): a sequência
 *   local não é consumida e série/número voltam pelo XML.
 * - `consultar`/`cancelar: false` — não há o que consultar nem cancelar por máquina: o job de polling pula estes
 *   documentos (item 10) e o cancelamento é registrado com o XML do evento (item 13). Chamar os métodos é erro de
 *   código próprio `dfe_manual` (nunca um resultado inventado).
 */
export class ManualEmissor implements DfeEmissorPort {
  public readonly name = 'manual';
  public readonly capabilities: DfeCapabilities = {
    numbersDps: true,
    consultar: false,
    cancelar: false,
    webhook: false,
  };

  async emitir(input: EmitirInput): Promise<EmissaoResult> {
    return { status: 'PROCESSING', partnerRef: input.ref, errors: [] };
  }

  async consultar(partnerRef: string): Promise<EmissaoResult> {
    throw new ValidationError(`dfe_manual: documento ${partnerRef} é do modo manual — registre o retorno pelo XML da NFS-e.`);
  }

  async cancelar(partnerRef: string): Promise<CancelResult> {
    throw new ValidationError(`dfe_manual: documento ${partnerRef} é do modo manual — registre o cancelamento com o XML do evento.`);
  }

  verifyWebhook(): { ok: true; partnerRef: string } | { ok: false } {
    return { ok: false };
  }
}
