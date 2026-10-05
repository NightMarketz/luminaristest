import { apiClient } from '../api/api-client';
import { multipartBaseUrl, multipartStreamDownload } from './multipart';
import type { CreatePackageAcceptanceInput } from '@/types/contracts/packages/PackageAcceptanceDto.gen';

/**
 * Package-validity acceptance client (FE-INCR-PACOTE-VALIDADE, F-JUR-4) — `/api/package-acceptances`.
 *
 * The legal text is NEVER composed here: it comes from the server (`getNotice`) and is shown literally; what goes back
 * on `create` is only the version + hash of the text the operator saw. Dates are date-only `YYYY-MM-DD` strings (format
 * them with `formatDateBR`, never `new Date(iso)` — memory date-only-rendering-utc-shift-class-bug).
 */

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/** GET /notice — every field except `saleDate`/`textVersion` is null when the package has no validity. */
export interface ValidityNotice {
  validityDays: number | null;
  saleDate: string;
  expiresOn: string | null;
  textVersion: string;
  text: string | null;
  textSha256: string | null;
}

export interface PackageAcceptance {
  id: string;
  saleId: string;
  customerId: string;
  packageId: string;
  saleDate: string;
  validityDays: number;
  expiresOn: string;
  textVersion: string;
  textShown: string;
  textSha256: string;
  acceptedByUserId: string;
  acceptedAt: string;
}

/** Notice that HAS validity (text + hash present) — what the screen needs to ask for the acceptance. */
export type ActiveValidityNotice = ValidityNotice & { validityDays: number; expiresOn: string; text: string; textSha256: string };

export function hasValidity(n: ValidityNotice): n is ActiveValidityNotice {
  return n.text != null && n.textSha256 != null && n.expiresOn != null && n.validityDays != null;
}

/** Body do aceite — função com retorno declarado (regra do mapper, my-app/CLAUDE.md). */
export function toAcceptanceInput(unitId: string, saleId: string, notice: ActiveValidityNotice): CreatePackageAcceptanceInput {
  return { unitId, saleId, textVersion: notice.textVersion as CreatePackageAcceptanceInput['textVersion'], textSha256: notice.textSha256 };
}

export const packageAcceptancesService = {
  async getNotice(unitId: string, packageId: string, saleDate: string): Promise<ValidityNotice> {
    const qs = new URLSearchParams({ unitId, packageId, saleDate });
    const res = await apiClient.get<ApiEnvelope<ValidityNotice>>(`/package-acceptances/notice?${qs.toString()}`);
    return res.data;
  },

  async create(input: CreatePackageAcceptanceInput): Promise<PackageAcceptance> {
    const res = await apiClient.post<ApiEnvelope<PackageAcceptance>>('/package-acceptances', input);
    return res.data;
  },

  async getBySale(unitId: string, saleId: string): Promise<PackageAcceptance | null> {
    const qs = new URLSearchParams({ unitId, saleId });
    const res = await apiClient.get<ApiEnvelope<PackageAcceptance | null>>(`/package-acceptances?${qs.toString()}`);
    return res.data;
  },

  /** Downloads the receipt PDF (binary → plain fetch, like the accounting receipt). */
  async downloadReceipt(unitId: string, saleId: string): Promise<void> {
    await multipartStreamDownload(
      `${multipartBaseUrl()}/package-acceptances/${encodeURIComponent(saleId)}/receipt?unitId=${encodeURIComponent(unitId)}`,
      `comprovante-pacote-${saleId}.pdf`,
    );
  },
};
