import { apiClient } from '../api/api-client';
import { dataExchangeService, type DataExchangeJob } from './dataExchange.service';
import type { SpedEcdRequestInput } from '@/types/contracts/accounting/SpedEcdDto.gen';
import type { SpedEcfRequestInput } from '@/types/contracts/accounting/SpedEcfDto.gen';
import type { SpedEcfRealRequestInput } from '@/types/contracts/accounting/SpedEcfRealDto.gen';

/**
 * SPED generation service — typed client over `/api/accounting/sped/{ecd,ecf}/generate`
 * (BE-INCR-SPED-ECD / ECF). Each endpoint stages an EXPORT_SPED_* job and returns its
 * summary; the `.txt` downloads through the existing data-exchange job route
 * (`dataExchangeService.downloadArtifact`).
 *
 * CONTRATO: o body é o tipo GERADO do DTO do servidor (`@/types/contracts/accounting/*.gen`,
 * PRE-ADR-FE-CONTRACT-TYPES) — nunca espelho à mão. Os `*Draft` abaixo são o estado de TELA
 * (strings livres dos inputs); o painel converte rascunho → payload por funções `to*Payload`
 * com retorno declarado (regra do mapper, my-app/CLAUDE.md).
 */

interface Envelope<T> {
  success: boolean;
  data: T;
}

// ── Payloads (contrato gerado) ──────────────────────────────────────────────────
export type GenerateEcdPayload = SpedEcdRequestInput;
export type GenerateEcfPayload = SpedEcfRequestInput;
export type GenerateEcfRealPayload = SpedEcfRealRequestInput;

// ── Rascunhos de tela (ECD) ─────────────────────────────────────────────────────
export interface EcdDeclarantDraft {
  nome: string;
  cnpj: string;
  uf: string;
  codMun: string;
  indNire: '0' | '1';
  indGrandePorte: '0' | '1';
}
export interface EcdBookDraft {
  numOrd: string;
  natLivr: string;
  dtExSocial: string; // YYYY-MM-DD
}
export interface EcdSignerDraft {
  identNom: string;
  identCpfCnpj: string;
  codAssin: string; // 3 digits ('900' = contador)
  indRespLegal: 'S' | 'N';
  // Required by the server when codAssin === '900' (REGRA_OBRIGATORIO_CONTADOR); an empty
  // string is a 400, so the mapper omits blanks.
  indCrc?: string;
  email?: string;
  fone?: string;
  ufCrc?: string;
}

// ── Rascunhos de tela (ECF / ECF Real — mesmo DeclarantSchema/SignerSchema no servidor) ──
export interface EcfDeclarantDraft {
  cnpj: string;
  nome: string;
  codNat: string;
  cnaeFiscal: string;
  endereco: string;
  bairro: string;
  uf: string;
  codMun: string;
  cep: string;
  email: string;
}
export interface EcfSignerDraft {
  identNom: string;
  identCpfCnpj: string;
  identQualif: string; // 3 digits ('900' = contador)
  indCrc?: string;
  email: string;
  fone: string;
}

export const spedService = {
  /** Generate the ECD .txt and immediately download it. Requires coverage.ready. */
  async generateAndDownloadEcd(payload: GenerateEcdPayload): Promise<DataExchangeJob> {
    const res = await apiClient.post<Envelope<DataExchangeJob>>(
      '/accounting/sped/ecd/generate',
      payload,
    );
    const job = res.data;
    await dataExchangeService.downloadArtifact(
      job.id,
      payload.unitId,
      job.fileName ?? `sped-ecd-${payload.year}.txt`,
    );
    return job;
  },

  /** Generate the ECF .txt and immediately download it. */
  async generateAndDownloadEcf(payload: GenerateEcfPayload): Promise<DataExchangeJob> {
    const res = await apiClient.post<Envelope<DataExchangeJob>>(
      '/accounting/sped/ecf/generate',
      payload,
    );
    const job = res.data;
    await dataExchangeService.downloadArtifact(
      job.id,
      payload.unitId,
      job.fileName ?? `sped-ecf-${payload.year}.txt`,
    );
    return job;
  },

  /**
   * Generate the ECF .txt for Lucro REAL and immediately download it (esqueleto,
   * ADR-INCR-SPED-ECF-FASE3 — blocks L/M/N ship empty, HASH_ECF_ANTERIOR always blank).
   * No revenue-exhaustiveness gate, unlike the Presumido form.
   */
  async generateAndDownloadEcfReal(payload: GenerateEcfRealPayload): Promise<DataExchangeJob> {
    const res = await apiClient.post<Envelope<DataExchangeJob>>(
      '/accounting/sped/ecf/real/generate',
      payload,
    );
    const job = res.data;
    await dataExchangeService.downloadArtifact(
      job.id,
      payload.unitId,
      job.fileName ?? `sped-ecf-real-${payload.year}.txt`,
    );
    return job;
  },
};
