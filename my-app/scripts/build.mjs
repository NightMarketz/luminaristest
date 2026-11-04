// `npm run build` = `next build` dentro de uma vaga de trabalho pesado da máquina (../../scripts/heavy-slot.cjs; dono,
// chat, 2026-11-04: "Me da um prompt para implementar todas as 7 sugestões"). O Dockerfile do my-app constrói só com
// esta pasta, sem o ../scripts do monorepo: aí o semáforo não existe e o build roda direto. No CI ele não faz nada.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

let heavySlot = null;
try {
  heavySlot = (await import('../../scripts/heavy-slot.cjs')).default;
} catch (e) {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
}

const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next');
const release = heavySlot ? await heavySlot.acquire({ label: `next build (${process.cwd()})` }) : () => {};
const r = spawnSync(process.execPath, [nextBin, 'build', ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: fileURLToPath(new URL('..', import.meta.url)),
});
release();
process.exit(r.status ?? 1);
