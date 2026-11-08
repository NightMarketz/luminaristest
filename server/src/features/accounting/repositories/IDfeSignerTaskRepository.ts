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
   * marca `DELIVERED` com o lease até o MAIOR entre `leaseUntil` e o vencimento da tarefa: uma tarefa entregue (um
   * TRANSMITIR, por exemplo, com o timeout da SEFAZ correndo) não volta ao poll antes do próprio prazo (AL-9).
   * Só volta a que este chamador marcou (update condicional).
   */
  claim(deviceId: string, now: Date, leaseUntil: Date): Promise<DfeSignerTask[]>;
  findForDevice(deviceId: string, id: string): Promise<DfeSignerTask | null>;
  /** `PENDING | DELIVERED` ⇒ `status` final, apaga o payload e grava o hash do resultado; false se já saiu desses estados. */
  complete(id: string, status: Extract<DfeSignerTaskStatus, 'DONE' | 'FAILED'>, resultHash: string): Promise<boolean>;
  /** `PENDING | DELIVERED` ⇒ `EXPIRED` e apaga o payload; false se já saiu desses estados. */
  expire(id: string): Promise<boolean>;}
