import { createHash } from 'crypto';
import type {
  CancelInput,
  CancelResult,
  DfeCapabilities,
  DfeEmissorPort,
  EmissaoResult,
  EmitirInput,
  EventoNfse,
  InutilizarInput,
  InutilizarResult,
} from './DfeEmissorPort';

/**
 * NullEmissor — BE-INCR-DFE (BRIEF item 11). Adaptador de desenvolvimento/teste: autoriza
 * sinteticamente sem tocar nenhuma rede. **Recusa `NODE_ENV=production`** no construtor (ADR §7 item 6)
 * — nunca deve rodar contra dado real.
 */
export class NullEmissor implements DfeEmissorPort {
  public readonly name = 'null';
  public readonly capabilities: DfeCapabilities = {
    kinds: ['NFSE', 'NFE', 'NFCE'], // BE-INCR-NFCE item 4
    numbersDps: false,
    consultar: true,
    cancelar: true,
    // Nenhum parceiro real por trás — sem webhook de verdade para verificar (item 28: Null/File ⇒ 401 sempre).
    webhook: false,
    substituir: false, // X11 review M3: a chave sintética NULL<hex> não é TSChaveNFSe (50 dígitos) — não monta o subst
    inutilizar: true, // BE-INCR-NFCE item 24: homologa sinteticamente (faixa válida + Null ⇒ HOMOLOGATED)
    cce: false, // BE-INCR-NFCE item 28 (F-NFCE-9 c): a CC-e não está implementada em adaptador nenhum
    consultarEventos: true, // BE-INCR-DFE-EVENTOS item 18: o contrato do PR-2 é exercido por aqui (roteiro abaixo)
    analiseFiscal: true, // BE-INCR-DFE-EVENTOS item 20 (PR-3): o pedido de análise (e101103) é exercido por aqui
  };

  /**
   * BE-INCR-DFE-EVENTOS (PR-2, itens 18–19) — roteiro do adaptador falso, compartilhado entre instâncias (a porta é
   * resolvida por documento, `resolveEmissorFor`): os eventos que `consultarEventos(chave)` devolve e o status que
   * `cancelar(partnerRef)` devolve. Vazio = comportamento de sempre (nenhum evento; cancelamento `CANCELLED`).
   * Só existe fora de produção (o construtor recusa `NODE_ENV=production`).
   */
  private static readonly roteiro = {
    eventos: new Map<string, EventoNfse[]>(),
    cancelar: new Map<string, CancelResult>(),
  };

  static programarEventos(chave: string, eventos: EventoNfse[]): void {
    NullEmissor.roteiro.eventos.set(chave, eventos);
  }

  static programarCancelamento(partnerRef: string, result: CancelResult): void {
    NullEmissor.roteiro.cancelar.set(partnerRef, result);
  }

  static limparRoteiro(): void {
    NullEmissor.roteiro.eventos.clear();
    NullEmissor.roteiro.cancelar.clear();
  }

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

  async cancelar(partnerRef: string, input: CancelInput): Promise<CancelResult> {
    const programado = NullEmissor.roteiro.cancelar.get(partnerRef);
    if (programado) return programado;
    // PR-3 (item 20): o pedido de análise fiscal (e101103) é registrado; o cancelamento direto, cancelado.
    return input.kind === 'NFSE' && input.analiseFiscal ? { status: 'ANALYSIS_REQUESTED', errors: [] } : { status: 'CANCELLED', errors: [] };
  }

  /** BE-INCR-DFE-EVENTOS item 18 — os eventos programados para a chave (cópia: o chamador não altera o roteiro). */
  async consultarEventos(chave: string): Promise<EventoNfse[]> {
    return [...(NullEmissor.roteiro.eventos.get(chave) ?? [])];
  }

  /** BE-INCR-NFCE item 24 — protocolo sintético determinístico a partir da faixa (nunca aleatório). */
  async inutilizar(input: InutilizarInput): Promise<InutilizarResult> {
    const chave = `${input.kind}:${input.ambiente}:${input.serie}:${input.nIni}:${input.nFin}`;
    return { status: 'HOMOLOGATED', nProt: `NULL${createHash('sha256').update(chave).digest('hex').slice(0, 11).toUpperCase()}`, errors: [] };
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
