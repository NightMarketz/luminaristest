/**
 * X10a EMENDA-4 AL-PR-4 (AL-15) — o scheduler do alerta do assinador local: payload do webhook, no máximo 1 alerta por
 * dispositivo, caso e dia, lock, `job_failed` e o timer desligado no teste. O alerta por falha do `runOnce` também está no
 * `schedulerFailureAlert.test.ts` (gate F-OBS-14).
 */
import { DfeSignerHealthScheduler } from '../DfeSignerHealthScheduler';
import type { DfeSignerAlerta, DfeSignerHealthSummary } from '@/features/accounting/services/DfeSignerHealthService';

const alertaSemPoll: DfeSignerAlerta = {
  evento: 'ASSINADOR_SEM_POLL_COM_PENDENTE', dispositivoId: 'dev-1', unitIds: ['u1'], detalhe: { notasEmEspera: 2, minutosSemPoll: 20 },
};
const alertaCert: DfeSignerAlerta = { evento: 'CERTIFICADO_VENCENDO', dispositivoId: 'dev-1', unitIds: ['u1'], detalhe: { diasParaVencer: 10 } };
const alertaContingencia: DfeSignerAlerta = {
  evento: 'CONTINGENCIA_COM_ASSINADOR_FORA', dispositivoId: 'dev-2', unitIds: ['u2'], detalhe: { notasEmContingencia: 1, minutosSemPoll: 40 },
};
const alertaPresa: DfeSignerAlerta = {
  evento: 'ASSINADOR_ONLINE_COM_PENDENTE_PRESA', dispositivoId: 'dev-3', unitIds: ['u3'], detalhe: { notasEmEspera: 2, minutosPresa: 60 },
};
const resumo = (alertas: DfeSignerAlerta[]): DfeSignerHealthSummary => ({ dispositivos: 2, alertas });

function montar(verificar: () => Promise<DfeSignerHealthSummary>) {
  const alert = jest.fn();
  const log = { event: jest.fn() };
  return { alert, log, scheduler: new DfeSignerHealthScheduler({ verificar, log, alert }) };
}

describe('DfeSignerHealthScheduler (AL-15)', () => {
  it('os três casos viram UM alerta de resumo, sem PII, com a fonte `dfe_signer_health`', async () => {
    const { scheduler, alert, log } = montar(async () => resumo([alertaSemPoll, alertaCert, alertaContingencia]));
    await scheduler.runOnce();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'dfe_signer_health', event: 'reconcile_summary', job: 'dfe_signer_health', timestamp: expect.any(String),
        semPollComPendente: 1, certificadoVencendo: 1, contingenciaComAssinadorFora: 1, alertas: [alertaSemPoll, alertaCert, alertaContingencia],
      }),
    );
    expect(log.event).toHaveBeenCalledWith('warn', 'job.completed', 'dfe_signer_health', expect.objectContaining({ dispositivos: 2, alertas: 3 }));
    expect(JSON.stringify(alert.mock.calls)).not.toMatch(/"(token\w*|cpf\w*|subject|nome|certificadoDer\w*|certificadoPem)"/i);
  });

  it('nota presa em PENDING_SIGNATURE com o assinador ONLINE (teto da retomada) vai ao webhook, contada à parte (L-…9d92)', async () => {
    const { scheduler, alert } = montar(async () => resumo([alertaPresa]));
    await scheduler.runOnce();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'dfe_signer_health', onlineComPendentePresa: 1, semPollComPendente: 0, alertas: [alertaPresa] }),
    );
  });

  it('sem alerta, nada vai ao webhook e o job.completed é info', async () => {
    const { scheduler, alert, log } = montar(async () => resumo([]));
    await scheduler.runOnce();
    expect(alert).not.toHaveBeenCalled();
    expect(log.event).toHaveBeenCalledWith('info', 'job.completed', 'dfe_signer_health', expect.anything());
  });

  it('no máximo 1 alerta por dispositivo, caso e dia: o tick seguinte repete só o que é novo', async () => {
    let atual = [alertaSemPoll];
    const { scheduler, alert } = montar(async () => resumo(atual));
    await scheduler.runOnce();
    await scheduler.runOnce(); // mesmo caso, mesmo dia: silêncio
    expect(alert).toHaveBeenCalledTimes(1);
    atual = [alertaSemPoll, alertaContingencia]; // caso novo de outro dispositivo
    await scheduler.runOnce();
    expect(alert).toHaveBeenCalledTimes(2);
    expect(alert.mock.calls[1][0]).toMatchObject({ alertas: [alertaContingencia], contingenciaComAssinadorFora: 1, semPollComPendente: 0 });
  });

  it('o dia virou: o mesmo caso alerta de novo', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-24T15:00:00Z'));
    try {
      const { scheduler, alert } = montar(async () => resumo([alertaCert]));
      await scheduler.runOnce();
      jest.setSystemTime(new Date('2026-11-25T15:00:00Z'));
      await scheduler.runOnce();
      expect(alert).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('lock: segundo runOnce em andamento é pulado com job.skipped', async () => {
    let solta!: () => void;
    const { scheduler, log } = montar(() => new Promise((r) => (solta = () => r(resumo([])))));
    const primeiro = scheduler.runOnce();
    expect(await scheduler.runOnce()).toEqual({ skipped: 'lock' });
    expect(log.event).toHaveBeenCalledWith('warn', 'job.skipped', 'dfe_signer_health', expect.objectContaining({ reason: 'skipped_due_to_lock' }));
    solta();
    await primeiro;
  });

  it('falha da consulta: job.failed no log, alerta job_failed e relança', async () => {
    const { scheduler, alert, log } = montar(() => Promise.reject(new Error('banco fora')));
    await expect(scheduler.runOnce()).rejects.toThrow('banco fora');
    expect(log.event).toHaveBeenCalledWith('error', 'job.failed', 'dfe_signer_health', expect.objectContaining({ error: 'banco fora' }));
    expect(alert).toHaveBeenCalledWith(expect.objectContaining({ source: 'dfe_signer_health', event: 'job_failed', error: 'banco fora' }));
  });

  it('sob NODE_ENV=test o timer não liga (disabled_in_test); com allowInTest liga e stop() desliga', () => {
    const { scheduler, log } = montar(async () => resumo([]));
    scheduler.start();
    expect(log.event).toHaveBeenCalledWith('info', 'job.skipped', 'dfe_signer_health', { job: 'dfe_signer_health', reason: 'disabled_in_test' });
    scheduler.start({ allowInTest: true, intervalMs: 1_000_000, initialDelayMs: 1_000_000 });
    expect(log.event).toHaveBeenCalledWith('info', 'job.scheduled', 'dfe_signer_health', expect.objectContaining({ intervalMs: 1_000_000 }));
    scheduler.stop();
  });
});
