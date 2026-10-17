/**
 * Tipos do ledger de versões das DynamicTables (BE-INCR-DT-VERSION-LEDGER). Arquivo só de tipos e constante,
 * sem import de repositório — o `IDynamicTableRepository` depende dele sem ciclo (check:arch X3-no-circular).
 */
export type VersionOrigin = 'DIRECT' | 'RULE' | 'SYSTEM';
export type RowVersionOp = 'BASELINE' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
export type SchemaVersionOp = 'BASELINE' | 'CREATE' | 'UPDATE';

/**
 * Quem escreve (F-DTV-1 a): vai no construtor dos repositórios. `restoredFromVersion` só no repo DIRECT
 * do restore (item 14) — transforma o `UPDATE` daquela escrita em `RESTORE`.
 */
export interface VersionWriteContext {
  actorUserId: string | null;
  origin: VersionOrigin;
  restoredFromVersion?: number;
}

export const SYSTEM_VERSION_CONTEXT: VersionWriteContext = Object.freeze({ actorUserId: null, origin: 'SYSTEM' as const });
