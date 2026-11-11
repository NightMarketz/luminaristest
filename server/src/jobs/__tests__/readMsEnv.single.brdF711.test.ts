/**
 * BRD F-71.1 (GAP-MAP, faixa 1 de 2026-11-10; ficha BRD-71 do inventário de estruturas implícitas).
 *
 * `readMsEnv` estava copiado em 6 arquivos de `src/jobs`: 5 lançavam em valor inválido e 1
 * (`dfePollPending.job.ts`, `DFE_POLL_AFTER_MS`) caía no default em silêncio, a cada tick. Decisão do dono
 * (questionário de 10/11): "os dois falham no boot". Comportamento esperado: um leitor só, e `DFE_POLL_AFTER_MS`
 * inválido derruba o `start()` do scheduler, como os outros intervalos.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DfePollScheduler } from '../DfePollScheduler';

const JOBS_DIR = join(__dirname, '..');

describe('BRD F-71.1 — um leitor de ms do ambiente, que falha no boot', () => {
  const anterior = process.env.DFE_POLL_AFTER_MS;
  afterEach(() => {
    if (anterior === undefined) delete process.env.DFE_POLL_AFTER_MS;
    else process.env.DFE_POLL_AFTER_MS = anterior;
  });

  it('BRD F-71.1 DFE_POLL_AFTER_MS inválido ⇒ start() lança, nenhum timer fica de pé', () => {
    process.env.DFE_POLL_AFTER_MS = 'dois minutos';
    const s = new DfePollScheduler({ poll: jest.fn(), log: { event: jest.fn() } as never, alert: jest.fn() });
    let erro: unknown;
    try {
      s.start({ allowInTest: true, intervalMs: 60_000, initialDelayMs: 60_000 });
    } catch (e) {
      erro = e;
    } finally {
      s.stop();
    }
    expect(String(erro)).toMatch(/DFE_POLL_AFTER_MS/);
  });

  it('BRD F-71.1 uma definição só de readMsEnv em src/jobs', () => {
    const definicoes = readdirSync(JOBS_DIR)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /function readMsEnv\s*\(/.test(readFileSync(join(JOBS_DIR, f), 'utf8')));
    expect(definicoes).toHaveLength(1);
  });
});
