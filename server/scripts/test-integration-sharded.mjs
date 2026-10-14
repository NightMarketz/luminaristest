// Roda a integração local como o CI: 4 shards em sequência, cada um num processo novo com heap de 8 GB.
// Num processo só, o heap estoura por volta do arquivo 110–120 (ts-jest e swc). Args extras vão pro jest.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SHARDS = Number(process.env.INTEGRATION_SHARDS ?? 4);
const jestBin = fileURLToPath(new URL('../node_modules/jest/bin/jest.js', import.meta.url));
const extra = process.argv.slice(2);
const failed = [];

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
