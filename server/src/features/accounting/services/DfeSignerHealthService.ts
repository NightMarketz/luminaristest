import { logger } from '../../../lib/logger';
import { DFE_SIGNER_ALERTA_CERT_DIAS, DFE_SIGNER_ALERTA_PRESA_MS, DFE_SIGNER_ALERTA_SEM_POLL_MS, DFE_SIGNER_KINDS_QUE_DEPENDEM, type DfeSignerAlertaEvento } from '../models/DfeSigner.model';
import type { IDfeSignerHealthRepository } from '../repositories/IDfeSignerHealthRepository';

/** Um alerta do AL-15. Sem PII: ids, contagens e dias — nunca certificado, subject, token, nome ou XML (AL-16). */
export interface DfeSignerAlerta {
  evento: DfeSignerAlertaEvento;
  dispositivoId: string;
  unitIds: string[];
  /** Números do caso (`notasEmEspera`, `minutosSemPoll`, `diasParaVencer`…), para o alerta explicar sozinho. */
  detalhe: Record<string, number>;
}

export interface DfeSignerHealthSummary {
  dispositivos: number;
  alertas: DfeSignerAlerta[];
}

const DIA_MS = 24 * 60 * 60 * 1000;

/** `AAAA-MM-DD` → meia-noite UTC desse dia (o `certNotAfter` é data-só; o dia corrido do aviso é o UTC de `now`). */
function diaUtc(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/**
 * DfeSignerHealthService — X10a EMENDA-4 AL-15 (OBS-R11). Olha cada assinador local vivo e devolve os alertas dos três
 * casos do BRIEF (relógio injetado):
 *  (a) `ASSINADOR_SEM_POLL_COM_PENDENTE` — sem poll há mais de 15 min e com nota em `PENDING_SIGNATURE` há mais de 15 min
 *      (a retomada, AL-14, só vem quando ele volta; até lá a nota não sai);
 *  (b) `CERTIFICADO_VENCENDO` — o certificado do dispositivo vence em até 30 dias (ou já venceu: o pré-voo já bloqueia);
 *  (c) `CONTINGENCIA_COM_ASSINADOR_FORA` — NFC-e em contingência off-line com o assinador sem poll há mais de 15 min. O
 *      alerta do PRAZO da contingência é do PR-9 (`NfceContingenciaService.tick`); aqui só o MOTIVO por que ela não sai.
 *  (d) `ASSINADOR_ONLINE_COM_PENDENTE_PRESA` — o assinador está no ar e a nota está em `PENDING_SIGNATURE` há mais de 15 min: a
 *      retomada (AL-14) tem teto por dispositivo e janela, e depois dele só o `reenviar` do operador tira a nota (a perda da
 *      marca em memória ou o PIN sem resposta caem aqui também). Complementa (a): os dois nunca disparam juntos.
 * Um dispositivo que nunca fez poll conta como sem poll. Só NF-e e NFC-e contam como "nota esperando o assinador": a NFS-e em
 * `PENDING_SIGNATURE` espera a reautorização do PSC e não é culpa do assinador (lacuna 9228, `DFE_SIGNER_KINDS_QUE_DEPENDEM`).
 */
export class DfeSignerHealthService {
  constructor(private readonly repo: IDfeSignerHealthRepository) {}

  async verificar(now: Date = new Date()): Promise<DfeSignerHealthSummary> {
    const devices = await this.repo.listDevicesVivos();
    const emEspera = await this.repo.resumoEmEspera([...new Set(devices.flatMap((d) => d.unitIds))]);
    const alertas: DfeSignerAlerta[] = [];
    for (const d of devices) {
      const semPollMs = d.lastSeenAt ? now.getTime() - d.lastSeenAt.getTime() : Number.POSITIVE_INFINITY;
      const semPoll = semPollMs > DFE_SIGNER_ALERTA_SEM_POLL_MS;
      const minutosSemPoll = Number.isFinite(semPollMs) ? Math.floor(semPollMs / 60_000) : -1; // -1 = nunca fez poll
      // Só NF-e/NFC-e dependem do assinador local: a NFS-e em PENDING_SIGNATURE espera o PSC (lacuna 9228; DFE_SIGNER_KINDS_QUE_DEPENDEM).
      const doDispositivo = emEspera.filter((e) => d.unitIds.includes(e.unitId) && (DFE_SIGNER_KINDS_QUE_DEPENDEM as readonly string[]).includes(e.kind));
      const cobre = (status: 'PENDING_SIGNATURE' | 'CONTINGENCY', soAntigas: boolean) => {
        const linhas = doDispositivo.filter(
          (e) => e.status === status && (!soAntigas || now.getTime() - e.maisAntigaDesde.getTime() > DFE_SIGNER_ALERTA_SEM_POLL_MS),
        );
        const maisAntigaMs = linhas.reduce((m, l) => Math.max(m, now.getTime() - l.maisAntigaDesde.getTime()), 0);
        return { unitIds: [...new Set(linhas.map((l) => l.unitId))], notas: linhas.reduce((s, l) => s + l.quantidade, 0), maisAntigaMs };
      };

      if (!semPoll) {
        const presas = cobre('PENDING_SIGNATURE', true);
        if (presas.notas > 0 && presas.maisAntigaMs > DFE_SIGNER_ALERTA_PRESA_MS) {
          alertas.push({
            evento: 'ASSINADOR_ONLINE_COM_PENDENTE_PRESA',
            dispositivoId: d.id,
            unitIds: presas.unitIds,
            detalhe: { notasEmEspera: presas.notas, minutosPresa: Math.floor(presas.maisAntigaMs / 60_000) },
          });
        }
      }
      if (semPoll) {
        const pendentes = cobre('PENDING_SIGNATURE', true);
        if (pendentes.notas > 0) {
          alertas.push({
            evento: 'ASSINADOR_SEM_POLL_COM_PENDENTE',
            dispositivoId: d.id,
            unitIds: pendentes.unitIds,
            detalhe: { notasEmEspera: pendentes.notas, minutosSemPoll },
          });
        }
        const contingencia = cobre('CONTINGENCY', false);
        if (contingencia.notas > 0) {
          alertas.push({
            evento: 'CONTINGENCIA_COM_ASSINADOR_FORA',
            dispositivoId: d.id,
            unitIds: contingencia.unitIds,
            detalhe: { notasEmContingencia: contingencia.notas, minutosSemPoll },
          });
        }
      }

      const diasParaVencer = Math.floor((diaUtc(d.certNotAfter) - diaUtc(now.toISOString().slice(0, 10))) / DIA_MS);
      if (diasParaVencer <= DFE_SIGNER_ALERTA_CERT_DIAS) {
        alertas.push({ evento: 'CERTIFICADO_VENCENDO', dispositivoId: d.id, unitIds: d.unitIds, detalhe: { diasParaVencer } });
      }
    }
    for (const a of alertas) {
      const nome = a.evento === 'ASSINADOR_ONLINE_COM_PENDENTE_PRESA' ? 'dfe.signer_pendente_presa' : 'dfe.signer_offline';
      logger.event('warn', nome, `dfe_signer: ${a.evento}`, { dispositivoId: a.dispositivoId, evento: a.evento, ...a.detalhe });
    }
    return { dispositivos: devices.length, alertas };
  }
}
