import type { DfeSignerDevice, DfeSignerDeviceUnit, DfeSignerPairingCode, Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

export interface DfeSignerDeviceData {
  userId: string;
  nome: string;
  tokenHash: string;
  certCnpj: string;
  certCnpjRaiz: string;
  certThumbprint: string;
  certNotAfter: string;
  ambiente: string;
  versaoAssinador: string;
}

export type DfeSignerDeviceWithUnits = DfeSignerDevice & { units: DfeSignerDeviceUnit[] };

/**
 * Contrato do repositório do assinador local (X10a EMENDA-4 AL-3, AL-4, AL-12): `dfe_signer_devices`,
 * `dfe_signer_device_units` e `dfe_signer_pairing_codes`. Tenancy do vínculo e do código via AccountingScope; o
 * dispositivo é achado pelo hash do token (rota do assinador) ou pelo vínculo vivo da unidade. Leitura só de linha viva;
 * revogação = soft-delete.
 */
export interface IDfeSignerRepository {
  createPairingCode(
    scope: AccountingScope,
    data: { codeHash: string; expiresAt: Date },
    tx?: Prisma.TransactionClient,
  ): Promise<DfeSignerPairingCode>;
  findPairingCode(codeHash: string): Promise<DfeSignerPairingCode | null>;
  /** Marca como usado só se ainda não usado e não vencido; false se outro pareamento chegou antes ou venceu. */
  consumePairingCode(id: string, at: Date, tx: Prisma.TransactionClient): Promise<boolean>;

  /** Dispositivo vivo pelo hash do token, com os vínculos vivos. */
  findLiveDeviceByTokenHash(tokenHash: string): Promise<DfeSignerDeviceWithUnits | null>;
  findLiveDeviceById(id: string): Promise<DfeSignerDeviceWithUnits | null>;
  /** Dispositivo vivo com vínculo vivo na unidade do escopo ("um ativo por unidade", AL-4). */
  findLiveDeviceForUnit(scope: AccountingScope, tx?: Prisma.TransactionClient): Promise<DfeSignerDeviceWithUnits | null>;
  createDevice(data: DfeSignerDeviceData, tx: Prisma.TransactionClient): Promise<DfeSignerDevice>;
  /** Cria o vínculo, ou reativa um vínculo antigo do mesmo par (deviceId, unitId) revogado antes. */
  linkUnit(deviceId: string, scope: AccountingScope, tx: Prisma.TransactionClient): Promise<DfeSignerDeviceUnit>;
  unlinkUnit(deviceId: string, unitId: string, at: Date, tx: Prisma.TransactionClient): Promise<void>;
  countLiveLinks(deviceId: string, tx: Prisma.TransactionClient): Promise<number>;
  revokeDevice(deviceId: string, at: Date, tx: Prisma.TransactionClient): Promise<void>;
  /**
   * AL-7 / AL-12 (AL-PR-3) — o poll é o heartbeat: grava `lastSeenAt`, a versão e `tokenPresente`. Devolve `true` só para
   * o poll que VOLTOU (antes sem poll desde `voltouSeAntesDe`, nunca visto, ou sem token) — update condicional, então
   * dois polls simultâneos não disparam a retomada (AL-14) duas vezes.
   */
  registrarHeartbeat(deviceId: string, data: { versaoAssinador: string; tokenPresente: boolean; at: Date }, voltouSeAntesDe: Date): Promise<boolean>;

  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
