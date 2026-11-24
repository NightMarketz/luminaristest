/** Dispositivo vivo com os vínculos vivos (AL-15). Sem certificado, subject nem token: só o que o alerta precisa. */
export interface DfeSignerHealthDevice {
  id: string;
  certNotAfter: string; // AAAA-MM-DD, como `readCertFacts`
  lastSeenAt: Date | null;
  unitIds: string[];
}

/** Notas de uma unidade esperando o assinador: `PENDING_SIGNATURE` (F-AL-6 a) ou NFC-e em `CONTINGENCY` (PR-9). */
export interface DfeSignerHealthEmEspera {
  unitId: string;
  status: 'PENDING_SIGNATURE' | 'CONTINGENCY';
  /** `NFSE | NFE | NFCE` — a NFS-e em `PENDING_SIGNATURE` espera o PSC, não o assinador local; quem decide é o serviço. */
  kind: string;
  quantidade: number;
  /** `updatedAt` da mais antiga desse estado e tipo na unidade. */
  maisAntigaDesde: Date;
}

/**
 * Leitura do estado do assinador para o `DfeSignerHealthScheduler` (X10a EMENDA-4 AL-15). Só leitura, de TODOS os
 * dispositivos vivos (job de sistema, sem sessão de usuário — mesmo desenho do `listPending` do documento fiscal).
 */
export interface IDfeSignerHealthRepository {
  listDevicesVivos(): Promise<DfeSignerHealthDevice[]>;
  resumoEmEspera(unitIds: readonly string[]): Promise<DfeSignerHealthEmEspera[]>;
}
