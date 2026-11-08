import { createHash } from 'node:crypto';
import type { DfeSignerTask } from 'generated/prisma';
import { AppError, ConflictError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import {
  DFE_ASSINADOR_TIMEOUT_PADRAO_MS,
  DFE_SIGNER_LEASE_MS,
  DFE_SIGNER_ONLINE_MS,
  DFE_SIGNER_RESULTADO_CONFLITANTE,
  DFE_SIGNER_RESULTADO_TIPO,
  DFE_SIGNER_TAREFA_NAO_ENCONTRADA,
  DFE_SIGNER_TAREFA_NAO_ENTREGUE,
  DFE_SIGNER_TAREFA_VENCIDA,
  DFE_TRANSMITIR_TIMEOUT_PADRAO_MS,
  type DfeSignerTaskTipo,
} from '../models/DfeSigner.model';
import { DfeSignerTarefaSchema, type DfeSignerHeartbeat, type DfeSignerResultadoBody, type DfeSignerTarefa } from '../dtos/DfeSignerDto';
import type { DfeSignerDeviceWithUnits, IDfeSignerRepository } from '../repositories/IDfeSignerRepository';
import type { IDfeSignerTaskRepository } from '../repositories/IDfeSignerTaskRepository';
import type { AccountingScope } from '../scope/AccountingScope';
import { resolveAccountingScopeInternal } from '../scope/resolveAccountingScopeInternal';
import type { FilaDoAssinador, NovaTarefaAssinador, SemResposta } from '../dfe/local/AssinadorLocal';

/** AL-13 (F-AL-6 a) — por que a unidade não assina agora pelo assinador local. */
export type MotivoSemAssinadorLocal =
  /** Sem dispositivo pareado na unidade ⇒ 400 com o faltante `assinador local`. */
  | 'ASSINADOR_AUSENTE'
  /** O certificado do pareamento venceu ⇒ 400 (parear de novo com o certificado novo). */
  | 'ASSINADOR_CERTIFICADO_VENCIDO'
  /** Sem poll há mais de 90 s ⇒ a nota espera em `PENDING_SIGNATURE` e sai quando ele volta (AL-14). */
  | 'ASSINADOR_FORA'
  /** O assinador responde, mas sem o token (ou com outro certificado, L-AL-6) ⇒ a nota espera. */
  | 'ASSINADOR_SEM_TOKEN';

/** Os motivos em que a nota espera o assinador (não bloqueia a emissão — F-FEAS-3 a). */
export const MOTIVOS_ASSINADOR_ESPERA: readonly MotivoSemAssinadorLocal[] = ['ASSINADOR_FORA', 'ASSINADOR_SEM_TOKEN'];

export type AssinadorLocalDaUnidade =
  | { ok: true; device: DfeSignerDeviceWithUnits; fila: FilaDoAssinador }
  | { ok: false; motivo: MotivoSemAssinadorLocal; device: DfeSignerDeviceWithUnits | null; fila: FilaDoAssinador | null };

export interface DfeSignerTaskServiceOptions {
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
}

type Resolver = (r: DfeSignerResultadoBody) => void;

/** sha256 do resultado em JSON de chaves ordenadas — a idempotência por taskId compara este hash (AL-6). */
function hashResultado(body: DfeSignerResultadoBody): string {
  const ordenado = Object.fromEntries(Object.entries(body).sort(([a], [b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify(ordenado), 'utf8').digest('hex');
}

function envMs(raw: string | undefined, padrao: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : padrao;
}

/**
 * DfeSignerTaskService — a fila servidor → assinador local (X10a EMENDA-4 AL-6, AL-7, AL-12, AL-13, AL-14; F-AL-2 a,
 * F-AL-6 a, F-AL-10 a; contrato §4.2/§4.3; L-AL-1, L-AL-6). FIRST-CLASS PRISMA.
 *
 * - `fila(device, scope)` dá ao adaptador (`AssinadorLocalSigner` / `AssinadorLocalTransporte`) a fila ligada ao
 *   dispositivo: cria a tarefa, acorda o long-poll e espera o resultado até o prazo; sem resultado, a tarefa vence.
 * - `poll` (GET /v1/tarefas): o poll é o heartbeat (AL-12; L-AL-6: certificado diferente do pareamento = sem token);
 *   entrega as tarefas na hora ou segura até `espera` s e devolve vazio (204). O primeiro poll depois de uma queda
 *   dispara a retomada das `PENDING_SIGNATURE` das unidades do dispositivo (AL-14), uma vez só (update condicional).
 * - `registrarResultado` (POST /v1/tarefas/:id/resultado): idempotente por taskId (mesmo corpo ⇒ 200 sem efeito; corpo
 *   diferente ⇒ 409); tarefa vencida ⇒ 409.
 * - **O resultado nunca é gravado** (o ASSINAR traz o certificado, com o CPF do responsável — L-AL-1): vai ao chamador
 *   em memória, e a tabela guarda só o hash. Uma instância por cliente (ADR-M2): a espera em memória é do processo que
 *   criou a tarefa. Resultado que chega depois do prazo encontra a tarefa vencida.
 */
export class DfeSignerTaskService {
  private readonly now: () => Date;
  private readonly env: NodeJS.ProcessEnv;
  private readonly esperandoResultado = new Map<string, Resolver>();
  private readonly esperandoTarefa = new Map<string, Set<() => void>>();
  private onRetomada: ((scope: AccountingScope) => Promise<unknown>) | null = null;

  constructor(
    private readonly repo: IDfeSignerTaskRepository,
    private readonly signerRepo: IDfeSignerRepository,
    opts: DfeSignerTaskServiceOptions = {},
  ) {
    this.now = opts.now ?? (() => new Date());
    this.env = opts.env ?? process.env;
  }

  /** AL-14 — late-bound pelo factory: o reenvio das `PENDING_SIGNATURE` da unidade (o mesmo gancho do callback OAuth). */
  setOnRetomada(fn: ((scope: AccountingScope) => Promise<unknown>) | null): void {
    this.onRetomada = fn;
  }

  /** AL-8 (F-AL-10 a): `DFE_ASSINADOR_TIMEOUT_MS`, padrão 20 s. */
  timeoutAssinaturaMs(): number {
    return envMs(this.env.DFE_ASSINADOR_TIMEOUT_MS, DFE_ASSINADOR_TIMEOUT_PADRAO_MS);
  }

  /** AL-9: `DFE_TRANSMITIR_TIMEOUT_MS`, padrão 30 s, dentro de 1 s..60 s (contrato §4.2). */
  timeoutTransmissaoMs(): number {
    return Math.min(60_000, Math.max(1_000, envMs(this.env.DFE_TRANSMITIR_TIMEOUT_MS, DFE_TRANSMITIR_TIMEOUT_PADRAO_MS)));
  }

  /**
   * AL-13 — o assinador da unidade do documento e o estado dele no pré-voo. Sem poll há mais de 90 s
   * (`DFE_SIGNER_ONLINE_MS`, a mesma fonte da tela) ⇒ fora; `tokenPresente = false` ⇒ sem token.
   */
  async paraUnidade(scope: AccountingScope): Promise<AssinadorLocalDaUnidade> {
    const device = await this.signerRepo.findLiveDeviceForUnit(scope);
    if (!device) return { ok: false, motivo: 'ASSINADOR_AUSENTE', device: null, fila: null };
    const fila = this.fila(device, scope);
    const now = this.now();
    if (device.certNotAfter < now.toISOString().slice(0, 10)) return { ok: false, motivo: 'ASSINADOR_CERTIFICADO_VENCIDO', device, fila };
    if (!device.lastSeenAt || now.getTime() - device.lastSeenAt.getTime() > DFE_SIGNER_ONLINE_MS) return { ok: false, motivo: 'ASSINADOR_FORA', device, fila };
    if (!device.tokenPresente) return { ok: false, motivo: 'ASSINADOR_SEM_TOKEN', device, fila };
    return { ok: true, device, fila };
  }

  /** A fila ligada ao dispositivo, para os adaptadores (a porta não lê Prisma). */
  fila(device: DfeSignerDeviceWithUnits, scope: AccountingScope): FilaDoAssinador {
    return { executar: (tarefa, esperaMs) => this.executar(device, scope, tarefa, esperaMs) };
  }

  /** AL-7 + AL-12 + AL-14 — o long-poll do dispositivo (o heartbeat vem na query). */
  async poll(device: DfeSignerDeviceWithUnits, hb: DfeSignerHeartbeat, esperaS: number, abort?: AbortSignal): Promise<DfeSignerTarefa[]> {
    const now = this.now();
    // L-AL-6 (dono, 07/11): certificado no caixa diferente do pareamento = sem token, até voltar o certo ou parear de novo.
    const tokenPresente = hb.tokenPresente && hb.certThumbprintSha256 === device.certThumbprint;
    const voltou = await this.signerRepo.registrarHeartbeat(
      device.id,
      { versaoAssinador: hb.versaoAssinador, tokenPresente, at: now },
      new Date(now.getTime() - DFE_SIGNER_ONLINE_MS),
    );
    if (voltou && tokenPresente) this.retomar(device);

    const fim = now.getTime() + esperaS * 1000;
    for (;;) {
      const tarefas = await this.entregar(device.id);
      if (tarefas.length || abort?.aborted) return tarefas;
      const resta = fim - this.now().getTime();
      if (resta <= 0) return [];
      await this.aguardarTarefa(device.id, resta, abort);
    }
  }

  /** AL-6 — o resultado de uma tarefa do dispositivo. `idempotente` = o mesmo resultado já estava registrado. */
  async registrarResultado(device: DfeSignerDeviceWithUnits, taskId: string, body: DfeSignerResultadoBody): Promise<{ idempotente: boolean }> {
    const task = await this.repo.findForDevice(device.id, taskId);
    if (!task) throw new AppError('Tarefa do assinador não encontrada.', 404, DFE_SIGNER_TAREFA_NAO_ENCONTRADA);
    const hash = hashResultado(body);
    const jaConcluida = (t: DfeSignerTask) => {
      if (t.status === 'EXPIRED') throw new ConflictError('A tarefa venceu antes do resultado chegar.', DFE_SIGNER_TAREFA_VENCIDA);
      if (t.resultHash === hash) return { idempotente: true };
      throw new ConflictError('Esta tarefa já tem outro resultado registrado.', DFE_SIGNER_RESULTADO_CONFLITANTE);
    };
    if (task.status !== 'PENDING' && task.status !== 'DELIVERED') return jaConcluida(task);
    if (task.expiresAt <= this.now()) {
      await this.repo.expire(task.id);
      throw new ConflictError('A tarefa venceu antes do resultado chegar.', DFE_SIGNER_TAREFA_VENCIDA);
    }
    if (body.ok && body.tipo !== (task.tipo as DfeSignerTaskTipo)) {
      throw new AppError(`Resultado de ${body.tipo} para uma tarefa ${task.tipo}.`, 400, DFE_SIGNER_RESULTADO_TIPO);
    }
    if (!(await this.repo.complete(task.id, body.ok ? 'DONE' : 'FAILED', hash))) {
      // Outro POST (ou o vencimento) chegou antes: o estado gravado decide.
      const atual = await this.repo.findForDevice(device.id, taskId);
      return jaConcluida(atual!);
    }
    this.esperandoResultado.get(task.id)?.(body);
    return { idempotente: false };
  }

  /**
   * AL-6 — heartbeat do caixa: renova o lease da tarefa entregue a este dispositivo (`leaseAte = agora + lease`). Só a
   * tarefa do próprio dispositivo (outra ⇒ 404); precisa estar `DELIVERED` e não vencida (vencida ⇒ 409, nunca renovada).
   */
  async renovarLease(device: DfeSignerDeviceWithUnits, taskId: string): Promise<{ leaseAte: string }> {
    const task = await this.repo.findForDevice(device.id, taskId);
    if (!task) throw new AppError('Tarefa do assinador não encontrada.', 404, DFE_SIGNER_TAREFA_NAO_ENCONTRADA);
    const agora = this.now();
    if (task.status === 'EXPIRED' || (task.status === 'DELIVERED' && task.expiresAt <= agora)) {
      if (task.status === 'DELIVERED') await this.repo.expire(task.id);
      throw new ConflictError('A tarefa venceu antes do heartbeat.', DFE_SIGNER_TAREFA_VENCIDA);
    }
    if (task.status !== 'DELIVERED') throw new ConflictError('A tarefa não está entregue a este assinador.', DFE_SIGNER_TAREFA_NAO_ENTREGUE);
    const leaseAte = new Date(agora.getTime() + DFE_SIGNER_LEASE_MS);
    if (await this.repo.renovarLease(task.id, device.id, agora, leaseAte)) return { leaseAte: leaseAte.toISOString() };
    // Mudou entre a leitura e a renovação (resultado ou vencimento): o estado gravado decide o erro.
    const atual = await this.repo.findForDevice(device.id, taskId);
    throw new ConflictError(
      atual?.status === 'EXPIRED' ? 'A tarefa venceu antes do heartbeat.' : 'A tarefa não está mais entregue a este assinador.',
      atual?.status === 'EXPIRED' ? DFE_SIGNER_TAREFA_VENCIDA : DFE_SIGNER_TAREFA_NAO_ENTREGUE,
    );
  }

  // ── Internos ───────────────────────────────────────────────────────────────
  private async executar(device: DfeSignerDeviceWithUnits, scope: AccountingScope, tarefa: NovaTarefaAssinador, esperaMs: number): Promise<DfeSignerResultadoBody | SemResposta> {
    const expiresAt = new Date(this.now().getTime() + esperaMs);
    const task = await this.repo.create({
      userId: scope.ownerUserId,
      deviceId: device.id,
      unitId: scope.unitId,
      tipo: tarefa.tipo,
      payload: JSON.stringify(tarefa),
      expiresAt,
    });
    const resultado = new Promise<DfeSignerResultadoBody | null>((resolve) => {
      const timer = setTimeout(() => {
        this.esperandoResultado.delete(task.id);
        resolve(null);
      }, esperaMs);
      this.esperandoResultado.set(task.id, (r) => {
        clearTimeout(timer);
        this.esperandoResultado.delete(task.id);
        resolve(r);
      });
    });
    this.acordar(device.id);
    const r = await resultado;
    if (r) return r;
    // Sem resultado no prazo. Ainda `PENDING` ⇒ ninguém a pega depois (a expiração é atômica com a entrega). Já entregue ⇒
    // o caixa pode estar executando: `ENTREGUE`, que o adaptador trata como timeout da SEFAZ (AL-9), nunca como "não saiu".
    if (await this.repo.expirarPendente(task.id)) return 'NAO_ENTREGUE';
    await this.repo.expire(task.id);
    return 'ENTREGUE';
  }

  private async entregar(deviceId: string): Promise<DfeSignerTarefa[]> {
    const now = this.now();
    const tarefas = await this.repo.claim(deviceId, now, new Date(now.getTime() + DFE_SIGNER_LEASE_MS));
    return tarefas.map((t) => DfeSignerTarefaSchema.parse({ ...(JSON.parse(t.payload ?? '{}') as object), id: t.id, expiraEm: t.expiresAt.toISOString() }));
  }

  private aguardarTarefa(deviceId: string, ms: number, abort?: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const set = this.esperandoTarefa.get(deviceId) ?? new Set<() => void>();
      this.esperandoTarefa.set(deviceId, set);
      const pronto = () => {
        clearTimeout(timer);
        set.delete(pronto);
        if (!set.size) this.esperandoTarefa.delete(deviceId);
        abort?.removeEventListener('abort', pronto);
        resolve();
      };
      const timer = setTimeout(pronto, ms);
      set.add(pronto);
      abort?.addEventListener('abort', pronto);
    });
  }

  private acordar(deviceId: string): void {
    for (const f of [...(this.esperandoTarefa.get(deviceId) ?? [])]) f();
  }

  /** AL-14 — fora do caminho do poll: o reenvio cria tarefas ASSINAR que este mesmo poll (ou o próximo) entrega. */
  private retomar(device: DfeSignerDeviceWithUnits): void {
    const fn = this.onRetomada;
    if (!fn) return;
    for (const u of device.units) {
      const scope = resolveAccountingScopeInternal({ userId: device.userId }, u.unitId);
      void fn(scope).catch((error: unknown) => {
        logger.warn('dfe_signer: retomada das notas pendentes falhou — ficam para o reenviar', {
          unitId: u.unitId,
          dispositivoId: device.id,
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
      });
    }
  }
}
