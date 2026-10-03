/**
 * I1b — ADR-INCR-UNIT-REKEY item 1: o re-key só roda por invocação explícita. Falha se Dockerfile, docker-compose,
 * `server.ts`, `postinstall` ou um script de start citar `rekey` (ADR-M2 decisão 4: migração nunca no boot).
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('rekeyLegacyUnitCli — invocação só explícita (item 1)', () => {
  const files = [
    ...fs.readdirSync(ROOT).filter((f) => /^docker-compose.*\.ya?ml$/.test(f)),
    ...['server', 'my-app', '.'].map((d) => path.join(d, 'Dockerfile')).filter((f) => fs.existsSync(path.join(ROOT, f))),
    'server/src/server.ts',
  ];

  it.each(files)('%s não cita rekey', (rel) => {
    expect(read(rel)).not.toMatch(/rekey/i);
  });

  it.each(['server/package.json', 'my-app/package.json'])('%s: postinstall/start/prestart não citam rekey', (rel) => {
    const scripts: Record<string, string> = JSON.parse(read(rel)).scripts ?? {};
    const boot = Object.entries(scripts).filter(([k]) => /^(postinstall|prestart|start|poststart)(:|$)/.test(k));
    for (const [, cmd] of boot) expect(cmd).not.toMatch(/rekey/i);
  });

  it('cobre ao menos o Dockerfile do server e o compose', () => {
    expect(files).toEqual(expect.arrayContaining(['docker-compose.yml', path.join('server', 'Dockerfile')]));
  });
});
