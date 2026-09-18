import type { DpsPayload } from '../dtos/DpsPayloadDto';

/**
 * DfeEmissorPort — BE-INCR-DFE (nó X10b, BRIEF item 10; ADR-DFE D-X10b-1).
 *
 * Porta de APLICAÇÃO para a emissão de documento fiscal de saída (NFS-e nacional / NF-e 55),
 * invocada por serviço/controller, JAMAIS de um plugin ou de dentro de
 * DynamicTableService/RuleContext/RulePlugin (§2.1 boundary — mesmo desenho de
 * `AccountingSyncPort`). Este BRIEF implementa a NFS-e (Fase E / NF-e 55 é [pendente-insumo]);
 * o tipo `NfePayload` fica reservado como `unknown` até a Fase E transcrever o leiaute.
 */

export type DfeKind = 'NFSE' | 'NFE';
export type DfeAmbiente = 'producao' | 'homologacao';

export interface DfeCapabilities {
  /** true quando o parceiro numera a DPS/NF-e (a sequência local NÃO é consumida nesse caso). */
  numbersDps: boolean;
  consultar: boolean;
  cancelar: boolean;
  webhook: boolean;
}

/** Fase E (NF-e 55) é [pendente-insumo] — reservado até a transcrição do MOC 7.0 de saída. */
export type NfePayload = unknown;

export interface EmitirInput {
  kind: DfeKind;
  /** Chave de idempotência no parceiro — "<documentId>:<attemptNo>" (ADR §9.1). */
  ref: string;
  ambiente: DfeAmbiente;
  cnpjEmitente: string;
  partnerAccountRef: string | null;
  payload: DpsPayload | NfePayload;
}

export interface EmissaoResult {
  status: 'PROCESSING' | 'AUTHORIZED' | 'REJECTED';
  partnerRef: string;
  numero?: string;
  serie?: string;
  nNFSe?: string;
  chaveOuCodigo?: string;
  /** Strings — BigInt-safe (nunca cruze o parceiro com um `number` de centavos). */
  valores?: {
    vIssCents?: string;
    aliqIssBp?: number;
    vIbsCents?: string;
    vCbsCents?: string;
    baseIssCents?: string;
  };
  xml?: Buffer;
  pdf?: Buffer;
  errors: Array<{ code: string; message: string }>;
}

export interface CancelResult {
  status: 'CANCELLED' | 'OUT_OF_WINDOW' | 'REJECTED' | 'PROCESSING';
  errors: Array<{ code: string; message: string }>;
}

/**
 * A porta. Cada adaptador declara suas `capabilities`; o serviço nunca assume uma capacidade que o
 * adaptador corrente não anuncia (ex.: só consome a sequência local quando `numbersDps === false`).
 */
export interface DfeEmissorPort {
  readonly name: string;
  readonly capabilities: DfeCapabilities;
  emitir(input: EmitirInput): Promise<EmissaoResult>;
  consultar(partnerRef: string): Promise<EmissaoResult>;
  cancelar(partnerRef: string, motivo: { cMotivo: 1 | 2 | 9; xMotivo: string }): Promise<CancelResult>;
  verifyWebhook(
    headers: Record<string, string | undefined>,
    rawBody: Buffer,
  ): { ok: true; partnerRef: string } | { ok: false };
}
