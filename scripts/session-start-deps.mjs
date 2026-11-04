#!/usr/bin/env node
// Hook SessionStart (.claude/settings.json): worktree sem node_modules ganha as dependências pelo depósito
// (scripts/worktree-deps.mjs, regra R1 de D-2026-11-04-RECURSOS-LOCAIS) antes da 1ª tarefa. Dono, chat, 2026-11-04:
// "Me da um prompt para implementar todas as 7 sugestões".
//
// O stdout de um hook SessionStart entra no contexto da sessão: com tudo pronto, não imprime nada; quando instala,
// imprime uma linha só, e a saída do npm vai para um log em os.tmpdir(). Falha não bloqueia a sessão (exit 0 com aviso).
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let root;
try {
  root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  process.exit(0); // fora de um checkout git: nada a fazer
}

// Workspace npm (PR-3 do MONOREPO-WORKSPACES): o worktree-deps liga as três pastas de uma vez, a partir do lockfile da raiz.
const faltando = ['node_modules', 'my-app/node_modules', 'server/node_modules'].filter((p) => !fs.existsSync(path.join(root, p)));
if (!faltando.length) process.exit(0);

const log = path.join(os.tmpdir(), `luminaris-worktree-deps-${path.basename(root)}.log`);
const fd = fs.openSync(log, 'w');
const t0 = Date.now();
const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'worktree-deps.mjs')], {
  cwd: root,
  stdio: ['ignore', fd, fd],
});
fs.closeSync(fd);
const s = Math.round((Date.now() - t0) / 1000);
console.log(
  r.status === 0
    ? `Dependências da worktree (${faltando.join(', ')}) ligadas ao depósito em ${s} s pelo scripts/worktree-deps.mjs (log: ${log}).`
    : `AVISO: scripts/worktree-deps.mjs falhou (exit ${r.status}) para ${faltando.join(', ')}; veja ${log} e rode-o na raiz da worktree.`,
);
