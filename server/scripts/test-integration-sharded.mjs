// Roda a integração local como o CI: 4 shards em sequência, cada um num processo novo com heap de 8 GB.
// Num processo só, o heap estoura por volta do arquivo 110–120 (ts-jest e swc). Args extras vão pro jest.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const SHARDS = Number(process.env.INTEGRATION_SHARDS ?? 4);
// Workspace npm: o jest fica içado no node_modules da raiz; server/node_modules é a junção vazia (worktree-deps.mjs).
const jestBin = ['../node_modules', '../../node_modules']
  .map((d) => fileURLToPath(new URL(`${d}/jest/bin/jest.js`, import.meta.url)))
  .find((f) => fs.existsSync(f));
const extra = process.argv.slice(2);
const failed = [];

// Os 4 shards são a suíte inteira: só no CI ou com FULL_SUITE=1 (scripts/test-scope-guard.cjs; dono, 03/11).
if (!process.env.CI && process.env.FULL_SUITE !== '1') {
  console.error(
    'Integração inteira (227 suítes, 4 shards de 8 GB) bloqueada fora do CI: pesa o PC (dono, 2026-11-03).\n' +
      'Rode um arquivo por vez: npx jest <arquivo> --selectProjects integration --runInBand\n' +
      'A suíte completa roda no CI do PR. Para rodar tudo aqui mesmo assim: FULL_SUITE=1 npm run test:integration',
  );
  process.exit(1);
}
if (!jestBin) {
  console.error('jest não está em server/node_modules nem no node_modules da raiz: rode node scripts/worktree-deps.mjs na raiz.');
  process.exit(1);
}

for (let i = 1; i <= SHARDS; i++) {
  console.log(`\n=== integração shard ${i}/${SHARDS} ===`);
  const r = spawnSync(
    process.execPath,
    ['--max-old-space-size=8192', jestBin, '--selectProjects', 'integration', '--runInBand', '--forceExit', `--shard=${i}/${SHARDS}`, ...extra],
    { stdio: 'inherit' },
  );
  if (r.status !== 0) failed.push(i);
}

if (failed.length) {
  console.error(`\nShards com falha: ${failed.join(', ')} (de ${SHARDS})`);
  process.exit(1);
}
console.log(`\n${SHARDS}/${SHARDS} shards verdes.`);
