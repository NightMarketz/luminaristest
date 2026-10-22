/**
 * FIX-AUTH-CONTA — testes-guarda (sessao-instrumentacao, lote 2), §3.4 #9 e #23 de
 * `docs/operating-manual/ACHADOS-2026-10-19-DYNAMICTABLE-E-MODULOS-ANTIGOS.md`.
 *
 * Guarda estático: `server.ts` sobe o HTTP e os jobs no import, então não é importável em
 * teste; o guarda lê a fonte (como o auditAllowlistCoverage).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = readFileSync(path.resolve(__dirname, '../server.ts'), 'utf8');

/** Corpo do handler `process.on('<event>', ...)` até o `});` que o fecha. */
function handlerBody(event: string): string {
  const start = SRC.indexOf(`process.on('${event}'`);
  expect(start).toBeGreaterThanOrEqual(0);
  return SRC.slice(start, SRC.indexOf('\n});', start));
}

describe('§3.4 #9 — uncaughtException encerra com código 0', () => {
  it('o handler de uncaughtException marca saída com código diferente de 0', () => {
    const body = handlerBody('uncaughtException');
    // Hoje: chama gracefulShutdown(), cujo caminho feliz é process.exit(0).
    expect(body).toMatch(/process\.exitCode\s*=\s*[1-9]|process\.exit\(\s*[1-9]|gracefulShutdown\(\s*[1-9]/);
  });
});

describe('§3.4 #23 — timers de purge/watchdog nascem no import, sem clearInterval', () => {
  it('o gracefulShutdown limpa os timers de purge e do watchdog de PROCESSING', () => {
    const start = SRC.indexOf('function gracefulShutdown()');
    const body = SRC.slice(start, SRC.indexOf('\n}\n', start));
    // Hoje: para os 6 schedulers, mas os setInterval de purge e watchdog não têm handle nem clear.
    expect(body).toMatch(/clearInterval\(/);
  });
});
