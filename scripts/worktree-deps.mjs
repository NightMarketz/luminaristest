#!/usr/bin/env node
// Dependências de worktree por depósito compartilhado (dono, chat, 2026-11-04: "criar isso como politica do projeto").
// Medido em 03–04/11: 27 `npm ci` em 24 h, um por worktree nova, e 101 worktrees com node_modules próprio. Aqui cada
// versão do lockfile da raiz instala UMA vez em `<depósito>/ws-<sha1>`, e a worktree ganha junções para lá.
// Desde o PR-3 do MONOREPO-WORKSPACES (dono, chat, 2026-11-04: "Executa o PR-3") o repo é um workspace npm: um
// `package-lock.json` só, na raiz. O `node_modules` da raiz tem o server e o que os dois apps compartilham; o
// `my-app/node_modules` tem o que o my-app resolve em versão diferente. As duas pastas viram junção.
// O cliente Prisma não é compartilhado: sai em `server/generated/prisma` da própria worktree (`prisma generate`).
//
// Uso (na raiz da worktree):  node scripts/worktree-deps.mjs
// Argumentos `server`/`my-app` de antes são aceitos e ignorados: o workspace instala inteiro.
// Depósito: $LUMINARIS_DEPS_STORE ou ~/.luminaris-deps. Apagar o depósito é seguro: a próxima chamada reinstala.
// Para remover uma worktree, use `git worktree remove` (não `rm -rf`, que pode seguir a junção para o depósito). Ele
// não segue a junção, mas a deixa para trás com as pastas-mãe (medido em 04/11: depósito intacto); a sobra sai com
// `rmdir <junção>` sem `/S`, que tira só o link.
// Não rode `npm ci` na worktree com as junções no lugar: ele apaga o `node_modules`, que é o do depósito.
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const store = process.env.LUMINARIS_DEPS_STORE || path.join(os.homedir(), '.luminaris-deps');
// O que o `npm ci` do depósito precisa: o lockfile, os manifestos do workspace e o schema (o postinstall do server roda
// `prisma generate`).
const ARQUIVOS = ['package.json', 'package-lock.json', 'server/package.json', 'my-app/package.json', 'server/prisma/schema.prisma'];
// Sem --legacy-peer-deps: com o lockfile da raiz o "Missing: openapi-types" do #949 não aparece (BRIEF §0.5, passo 1).
const NPM_CI = 'npm ci --no-audit --no-fund';
// Junções da worktree para o depósito. `server/node_modules` fica vazio (o server inteiro está na raiz), mas existe para
// que um `node_modules` ausente continue significando "worktree sem dependências".
const PASTAS = ['node_modules', 'my-app/node_modules', 'server/node_modules'];

// A chave junta o lockfile, os manifestos e o comando: o `allowScripts` (npm 11) mora no package.json da raiz, e a flag
// muda o que entra no node_modules.
const chave = (cmd, ...fs_) =>
  createHash('sha1').update([cmd, ...fs_.map((f) => fs.readFileSync(f))].join('\0')).digest('hex').slice(0, 12);
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

if (!fs.existsSync(path.join(root, 'package-lock.json'))) throw new Error('package-lock.json não existe: rode na raiz da worktree');
const entry = path.join(store, `ws-${chave(NPM_CI, ...ARQUIVOS.slice(0, 4).map((f) => path.join(root, f)))}`);

if (PASTAS.every((p) => isJunctionTo(path.join(root, p), path.join(entry, p)))) {
  console.log(`workspace: já aponta para ${entry}`);
} else {
  withLock(entry, () => {
    if (fs.existsSync(path.join(entry, '.ok'))) return;
    fs.rmSync(entry, { recursive: true, force: true });
    for (const f of ARQUIVOS) {
      fs.mkdirSync(path.dirname(path.join(entry, f)), { recursive: true });
      fs.copyFileSync(path.join(root, f), path.join(entry, f));
    }
    console.log(`workspace: instalando lockfile novo no depósito ${entry}`);
    // Os scripts de instalação rodam só para os pacotes do `allowScripts` da raiz.
    run(NPM_CI, entry);
    for (const p of PASTAS) fs.mkdirSync(path.join(entry, p), { recursive: true });
    fs.writeFileSync(path.join(entry, '.ok'), new Date().toISOString());
  });
  for (const p of PASTAS) {
    const nm = path.join(root, p);
    if (isJunctionTo(nm, path.join(entry, p))) continue;
    // Junção para outra entrada (lockfile ou comando mudou): troca só o link, o depósito antigo fica.
    if (fs.lstatSync(nm, { throwIfNoEntry: false })?.isSymbolicLink()) fs.unlinkSync(nm);
    if (fs.existsSync(nm)) {
      // node_modules real de antes (npm ci local): não apaga sozinho, só avisa.
      console.log(`${p}: já é uma pasta própria; para usar o depósito, apague-a e rode de novo`);
      continue;
    }
    fs.symlinkSync(path.join(entry, p), nm, 'junction');
    console.log(`${p} → ${path.join(entry, p)}`);
  }
}
run('npx prisma generate', path.join(root, 'server'));
