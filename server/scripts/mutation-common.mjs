// Peças comuns dos scripts de mutation testing (mutation-diff.mjs e mutation-slices.mjs).
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE_CONFIG = path.join(SERVER, 'stryker.config.mjs');
export const OUT = path.join(SERVER, 'reports', 'mutation');

export async function loadBaseConfig() {
  return (await import(pathToFileURL(BASE_CONFIG).href)).default;
}

/** Expande os globs do `mutate` (com exclusões `!`) na lista de arquivos, caminhos relativos a server/. */
export function expandMutate(patterns) {
  const include = patterns.filter((p) => !p.startsWith('!'));
  const exclude = patterns.filter((p) => p.startsWith('!')).map((p) => p.slice(1));
  const files = new Set();
  for (const p of include) {
    for (const f of fs.globSync(p, { cwd: SERVER, exclude })) files.add(f.split(path.sep).join('/'));
  }
  return [...files].sort();
}

export function git(args) {
  return execFileSync('git', args, { cwd: SERVER, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

export function srcIsClean() {
  return git(['status', '--porcelain', '--', 'src']).trim() === '';
}

export function headCommit() {
  return git(['rev-parse', '--short', 'HEAD']).trim();
}

/**
 * Config derivada: herda o stryker.config.mjs e troca `mutate` e os caminhos de saída (relativos a
 * server/). Grava em `dir/<name>` e devolve o caminho.
 */
export function writeDerivedConfig(dir, name, mutate) {
  fs.mkdirSync(dir, { recursive: true });
  const rel = (p) => path.relative(SERVER, path.join(dir, p)).split(path.sep).join('/');
  const configPath = path.join(dir, name);
  const body = `// Gerado por scripts/mutation-*.mjs — não editar.
import base from ${JSON.stringify(pathToFileURL(BASE_CONFIG).href)};
export default {
  ...base,
  mutate: ${JSON.stringify(mutate, null, 2)},
  reporters: ['clear-text', 'progress', 'html', 'json'],
  htmlReporter: { fileName: ${JSON.stringify(rel('mutation.html'))} },
  jsonReporter: { fileName: ${JSON.stringify(rel('mutation.json'))} },
  incrementalFile: ${JSON.stringify(rel('stryker-incremental.json'))},
};
`;
  fs.writeFileSync(configPath, body);
  return configPath;
}

export function runStryker(configPath, logPath) {
  return new Promise((resolve) => {
    const log = fs.createWriteStream(logPath, { flags: 'a' });
    const bin = path.join(SERVER, 'node_modules', '@stryker-mutator', 'core', 'bin', 'stryker.js');
    const child = spawn(process.execPath, [bin, 'run', configPath], {
      cwd: SERVER,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const tee = (chunk) => {
      process.stdout.write(chunk);
      log.write(chunk);
    };
    child.stdout.on('data', tee);
    child.stderr.on('data', tee);
    // Ctrl+C já chega ao Stryker (mesmo grupo de processo/console). O pai só não pode morrer antes
    // dele: o Stryker precisa restaurar o src (inPlace) e o estado precisa ser gravado.
    // Não repassamos com child.kill — no Windows isso é TerminateProcess e o src ficaria instrumentado.
    const wait = () => console.log('\nCtrl+C: esperando o Stryker restaurar os arquivos…');
    process.on('SIGINT', wait);
    child.on('close', (code) => {
      process.off('SIGINT', wait);
      log.end();
      resolve(code ?? 1);
    });
  });
}

export const RECOVERY_HINT =
  'server/src ficou alterado depois do Stryker (instrumentado). Recupere com: git checkout -- src && rm -rf .stryker-tmp';
