// node --test scripts/plano-vault.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, buildIndex, loadVault, parseNote, fold } from './plano-vault.mjs';

function note(fm, body = '') {
  return ['---', ...Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`), '---', body, ''].join('\n');
}

function vault(files) {
  const dir = mkdtempSync(join(tmpdir(), 'vault-'));
  mkdirSync(join(dir, 'nos'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

const base = {
  'README.md': '# README\n',
  'nos/A.md': note({ id: 'A', tipo: 'regua', dominio: 'contabil', titulo: 'a', estado: 'done' }),
  'nos/B.md': note({ id: 'B', tipo: 'regua', dominio: 'contabil', titulo: 'b', estado: 'ready', depende_de: ['[[A]]'] }, 'ver [[A]]'),
  'nos/C.md': note({ id: 'C', tipo: 'regua', dominio: 'contabil', titulo: 'c', estado: 'planned', depende_de: ['[[B]]'] }),
};

function writeIndex(dir) {
  for (const [n, c] of Object.entries(buildIndex(loadVault(dir)))) writeFileSync(join(dir, n), c);
}

test('vault íntegro com índice regenerado → 0 problemas', () => {
  const dir = vault(base);
  writeIndex(dir);
  assert.deepEqual(check(dir), []);
});

test('índice desatualizado é pego', () => {
  const dir = vault(base);
  const errs = check(dir);
  assert.ok(errs.some((e) => e.includes('_INDEX.md desatualizado')), errs.join('\n'));
});

test('link [[x]] quebrado e depende_de inexistente são pegos', () => {
  const dir = vault({ ...base, 'nos/D.md': note({ id: 'D', tipo: 'motor', titulo: 'd', estado: 'ready', depende_de: ['[[ZZ]]'] }, 'ver [[NAO-EXISTE]]') });
  writeIndex(dir);
  const errs = check(dir);
  assert.ok(errs.some((e) => e.includes('[[NAO-EXISTE]] não resolve')), errs.join('\n'));
  assert.ok(errs.some((e) => e.includes('depende_de "ZZ"')), errs.join('\n'));
});

test('destravados: só B (dependência A fechada); C espera B aberto', () => {
  const idx = buildIndex(loadVault(vault(base)))['_INDEX.md'];
  const sec = idx.split('## Destravados agora')[1].split('## Fila aberta')[0];
  assert.match(sec, /\[\[B\]\]/);
  assert.doesNotMatch(sec, /\[\[C\]\]/);
  assert.match(idx, /\| contabil \| 1 \| 3 \|/);
});

test('fecha_regua=false: fica no denominador, não conta como fechado', () => {
  const dir = vault({ ...base, 'nos/X.md': note({ id: 'X', tipo: 'regua', dominio: 'contabil', titulo: 'x', estado: 'done', fecha_regua: false }) });
  assert.match(buildIndex(loadVault(dir))['_INDEX.md'], /\| contabil \| 1 \| 4 \|/);
});

test('blocked e diferido não aparecem em destravados', () => {
  const dir = vault({ ...base,
    'nos/K.md': note({ id: 'K', tipo: 'regua', dominio: 'fiscal', titulo: 'k', estado: 'blocked', depende_de: ['[[A]]'] }),
    'nos/M.md': note({ id: 'M', tipo: 'diferido', titulo: 'm', estado: 'ready' }) });
  const sec = buildIndex(loadVault(dir))['_INDEX.md'].split('## Destravados agora')[1].split('## Fila aberta')[0];
  assert.doesNotMatch(sec, /\[\[K\]\]|\[\[M\]\]/);
});

test('dependência pontilhada "[[A]]?" resolve para A', () => {
  const dir = vault({ ...base, 'nos/E.md': note({ id: 'E', tipo: 'motor', titulo: 'e', estado: 'ready', depende_de: ['[[A]]?'] }) });
  writeIndex(dir);
  assert.deepEqual(check(dir), []);
});

test('frontmatter com valor não-JSON falha alto', () => {
  assert.throws(() => parseNote('---\nid: sem aspas\n---\n'));
});

test('fold grava estado/prs/atualizado no frontmatter e no cabeçalho; índice segue íntegro', () => {
  const body = '# B\n\n**Estado:** `ready`  \n**PRs:** —  \n\nver [[A]]\n';
  const B = { id: 'B', tipo: 'regua', dominio: 'contabil', titulo: 'b', estado: 'ready', estado_detalhe: 'x', depende_de: ['[[A]]'], prs: ['#1'] };
  const dir = vault({ ...base, 'nos/B.md': note(B, body) });
  writeIndex(dir);
  fold(dir, 'B', { pr: 7, estado: 'done', hoje: '2026-10-07' });
  fold(dir, 'B', { pr: 7, hoje: '2026-10-07' }); // repetir no mesmo PR não duplica
  const { fm, body: b } = parseNote(readFileSync(join(dir, 'nos/B.md'), 'utf8'));
  assert.equal(fm.estado, 'done');
  assert.deepEqual(fm.prs, ['#1', '#7']);
  assert.equal(fm.atualizado, '2026-10-07');
  assert.match(b, /\*\*Estado:\*\* `done` — x/);
  assert.match(b, /\*\*PRs:\*\* #1, #7/);
  assert.deepEqual(check(dir), []);
});

test('fold recusa nó inexistente, estado inválido e PR ausente', () => {
  const dir = vault(base);
  assert.throws(() => fold(dir, 'ZZ', { pr: 1 }), /não existe/);
  assert.throws(() => fold(dir, 'B', { pr: 1, estado: 'review' }), /inválido/);
  assert.throws(() => fold(dir, 'B', { pr: NaN }), /--pr/);
});
