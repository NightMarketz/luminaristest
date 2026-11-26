/**
 * BE-INCR-ESCALA-BASE item 12 — leva a escala a uma instância que já existia antes dela.
 *
 * Usa as primitivas da sincronização de preset (`PresetSyncService`): instala as quatro tabelas novas do Core na ordem
 * das relações (`resources` → `schedules` → `scheduleShifts` → `scheduleExceptions`) e roda o sync ADITIVO nas tabelas
 * que ganharam campo (`units.timeZone`). Cada passo é idempotente; nenhuma linha existente muda.
 */
import type { UserContext } from '../../../lib/authUtils';
import logger from '../../../lib/logger';

/** O que este serviço usa do `PresetSyncService` (interface estreita, injetada pela factory). */
export interface PresetRolloutPort {
  installTableFromPreset(user: UserContext, internalName: string): Promise<{ tableId: string; created: boolean }>;
  syncInstalledTableFromPreset(user: UserContext, internalName: string): Promise<{ added: string[] }>;
}

/** Existe a tabela `internalName` para o dono? */
export interface InstalledTableLookup {
  findTableByInternalName(userId: string, internalName: string): Promise<{ id: string } | null>;
}

export const SCHEDULING_NEW_TABLES = ['resources', 'schedules', 'scheduleShifts', 'scheduleExceptions'] as const;
/** Tabelas que ganharam campo com a escala e que o sync aditivo leva (só se a instância as tem). */
export const SCHEDULING_SYNCED_TABLES = ['units'] as const;

export interface RolloutResult {
  installed: string[];
  synced: Array<{ table: string; added: string[] }>;
}

export class SchedulingRolloutService {
  constructor(
    private readonly presets: PresetRolloutPort,
    private readonly tables: InstalledTableLookup,
  ) {}

  async ensureInstalled(user: UserContext): Promise<RolloutResult> {
    const installed: string[] = [];
    for (const t of SCHEDULING_NEW_TABLES) {
      const r = await this.presets.installTableFromPreset(user, t);
      if (r.created) installed.push(t);
    }
    const synced: RolloutResult['synced'] = [];
    for (const t of SCHEDULING_SYNCED_TABLES) {
      if (!(await this.tables.findTableByInternalName(user.userId, t))) continue;
      const r = await this.presets.syncInstalledTableFromPreset(user, t);
      if (r.added.length > 0) synced.push({ table: t, added: r.added });
    }
    logger.info('SchedulingRollout: escala garantida na instância', { userId: user.userId, installed, synced });
    return { installed, synced };
  }
}
