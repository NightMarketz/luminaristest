import type { DfeSignerTask } from 'generated/prisma';
import type { DfeSignerTaskStatus, DfeSignerTaskTipo } from '../models/DfeSigner.model';

export interface DfeSignerTaskData {
  userId: string;
  deviceId: string;
  unitId: string;
  tipo: DfeSignerTaskTipo;
  payload: string;
  expiresAt: Date;
}

/**
 * Contrato do repositório da fila do assinador local (X10a EMENDA-4 AL-6; `dfe_signer_tasks`). As rotas do assinador
 * não têm sessão de usuário: a tarefa é achada pelo DISPOSITIVO autenticado (nunca por id solto). Toda mudança de
 * estado é condicional ao estado de origem (o resultado e o vencimento podem chegar juntos).
 */
export interface IDfeSignerTaskRepository {
  create(data: DfeSignerTaskData): Promise<DfeSignerTask>;
  /**
   * Entrega ao dispositivo as tarefas `PENDING` e as `DELIVERED` com o lease vencido (reentrega), ainda não vencidas;
   * marca `DELIVERED` com `leaseUntil` (lease curto, AL-6). Só volta a que este chamador marcou (update condicional).
   */
  claim(deviceId: string, now: Date, leaseUntil: Date): Promise<DfeSignerTask[]>;
  /**
   * Heartbeat do caixa (AL-6): renova o lease só se a tarefa é deste dispositivo, está `DELIVERED` e não venceu
   * (`expiresAt > now`). false se nada foi renovado (o chamador decide o motivo pela leitura).
   */
  renovarLease(id: string, deviceId: string, now: Date, leaseUntil: Date): Promise<boolean>;
  findForDevice(deviceId: string, id: string): Promise<DfeSignerTask | null>;
  /** `PENDING | DELIVERED` ⇒ `status` final, apaga o payload e grava o hash do resultado; false se já saiu desses estados. */
  complete(id: string, status: Extract<DfeSignerTaskStatus, 'DONE' | 'FAILED'>, resultHash: string): Promise<boolean>;
  /** `PENDING | DELIVERED` ⇒ `EXPIRED` e apaga o payload; false se já saiu desses estados. */
  expire(id: string): Promise<boolean>;
  /** `PENDING` ⇒ `EXPIRED` só se ainda não foi entregue (atômico com `claim`); false se já foi entregue ou saiu. */
  expirarPendente(id: string): Promise<boolean>;}
