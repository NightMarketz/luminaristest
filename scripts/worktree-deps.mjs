#!/usr/bin/env node
// Dependências de worktree por depósito compartilhado (dono, chat, 2026-11-04: "criar isso como politica do projeto").
// Medido em 03–04/11: 27 `npm ci` em 24 h, um por worktree nova, e 101 worktrees com node_modules próprio. Aqui cada
// versão de lockfile instala UMA vez em `<depósito>/<app>-<sha1 do lockfile>`, e a worktree ganha uma junção para lá.
// O cliente Prisma não é compartilhado: sai em `server/generated/prisma` da própria worktree (`prisma generate`).
//
// Uso (na raiz da worktree):  node scripts/worktree-deps.mjs            → server e my-app
//                              node scripts/worktree-deps.mjs server     → só um
// Depósito: $LUMINARIS_DEPS_STORE ou ~/.luminaris-deps. Apagar o depósito é seguro: a próxima chamada reinstala.
// Para remover uma worktree, use `git worktree remove` (não `rm -rf`, que pode seguir a junção para o depósito).
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const store = process.env.LUMINARIS_DEPS_STORE || path.join(os.homedir(), '.luminaris-deps');
const apps = process.argv.slice(2).length ? process.argv.slice(2) : ['server', 'my-app'];
// Arquivos que o `npm ci` do depósito precisa além do manifesto (o postinstall do server roda `prisma generate`).
const EXTRA = { server: ['prisma/schema.prisma'] };

const sha1 = (f) => createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' });

function isJunctionTo(link, target) {
  try {
    return fs.lstatSync(link).isSymbolicLink() && path.resolve(fs.realpathSync(link)) === path.resolve(target);
  } catch {
    return false;
  }
}

// Duas sessões pedindo o mesmo lockfile ao mesmo tempo: a segunda espera a primeira (mkdir é atômico).
function withLock(dir, fn) {
  const lock = `${dir}.lock`;
  const deadline = Date.now() + 15 * 60_000;
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  for (;;) {
    try {
      fs.mkdirSync(lock);
      break;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() > deadline) throw new Error(`trava antiga em ${lock}: apague-a se nenhuma instalação estiver rodando`);
      execSync(process.platform === 'win32' ? 'ping -n 6 127.0.0.1 >nul' : 'sleep 5');
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lock, { recursive: true, force: true });
  }
}

for (const app of apps) {
  const appDir = path.join(root, app);
  const lockFile = path.join(appDir, 'package-lock.json');
  if (!fs.existsSync(lockFile)) throw new Error(`${app}/package-lock.json não existe: rode na raiz da worktree`);
  const entry = path.join(store, `${app}-${sha1(lockFile)}`);
  const nm = path.join(appDir, 'node_modules');

  if (isJunctionTo(nm, path.join(entry, 'node_modules'))) {
    console.log(`${app}: já aponta para ${entry}`);
  } else {
    withLock(entry, () => {
      if (fs.existsSync(path.join(entry, '.ok'))) return;
      fs.rmSync(entry, { recursive: true, force: true });
      for (const f of ['package.json', 'package-lock.json', ...(EXTRA[app] ?? [])]) {
        fs.mkdirSync(path.dirname(path.join(entry, f)), { recursive: true });
        fs.copyFileSync(path.join(appDir, f), path.join(entry, f));
      }
      console.log(`${app}: instalando lockfile novo no depósito ${entry}`);
      run('npm ci --no-audit --no-fund', entry);
      fs.writeFileSync(path.join(entry, '.ok'), new Date().toISOString());
    });
    if (fs.existsSync(nm)) {
      // node_modules real de antes (npm ci local): não apaga sozinho, só avisa.
      console.log(`${app}: já tem node_modules próprio; para usar o depósito, apague-o e rode de novo`);
      continue;
    }
    fs.symlinkSync(path.join(entry, 'node_modules'), nm, 'junction');
    console.log(`${app}: node_modules → ${entry}`);
  }
  if (app === 'server') run('npx prisma generate', appDir);
}
