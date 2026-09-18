import { createHash } from 'crypto';
import type { CancelResult, DfeCapabilities, DfeEmissorPort, EmissaoResult, EmitirInput } from './DfeEmissorPort';

/**
 * NullEmissor — BE-INCR-DFE (BRIEF item 11). Adaptador de desenvolvimento/teste: autoriza
 * sinteticamente sem tocar nenhuma rede. **Recusa `NODE_ENV=production`** no construtor (ADR §7 item 6)
 * — nunca deve rodar contra dado real.
 */
export class NullEmissor implements DfeEmissorPort {
  public readonly name = 'null';
  public readonly capabilities: DfeCapabilities = {
    numbersDps: false,
    consultar: true,
    cancelar: true,
    // Nenhum parceiro real por trás — sem webhook de verdade para verificar (item 28: Null/File ⇒ 401 sempre).
    webhook: false,
  };

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NullEmissor não pode rodar sob NODE_ENV=production (ADR-DFE §7 item 6).');
    }
  }

  async emitir(input: EmitirInput): Promise<EmissaoResult> {
    const chaveOuCodigo = this.fakeChave(input.ref);
    return {
      status: 'AUTHORIZED',
      partnerRef: input.ref,
      numero: this.extractNumeroSintetico(input),
      chaveOuCodigo,
      xml: Buffer.from(JSON.stringify(input.payload)),
      errors: [],
    };
  }

  async consultar(partnerRef: string): Promise<EmissaoResult> {
    return {
      status: 'AUTHORIZED',
      partnerRef,
      chaveOuCodigo: this.fakeChave(partnerRef),
      errors: [],
    };
  }

  async cancelar(partnerRef: string, motivo: { cMotivo: 1 | 2 | 9; xMotivo: string }): Promise<CancelResult> {
    void partnerRef;
    void motivo;
    return { status: 'CANCELLED', errors: [] };
  }

  verifyWebhook(): { ok: true; partnerRef: string } | { ok: false } {
    return { ok: false };
  }

  /** Determinístico a partir do `ref` (mesma tentativa -> mesma chave fake) — nunca aleatório. */
  private fakeChave(ref: string): string {
    return `NULL${createHash('sha256').update(ref).digest('hex').slice(0, 40).toUpperCase()}`;
  }

  private extractNumeroSintetico(input: EmitirInput): string {
    const payload = input.payload as { infDPS?: { nDPS?: number } } | undefined;
    return String(payload?.infDPS?.nDPS ?? '');
  }
}
