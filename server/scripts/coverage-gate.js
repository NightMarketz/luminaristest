/* eslint-disable */
// Gate de cobertura do CI. Os testes rodam em 7 shards (unit 3 + integration 4); o
// `coverageThreshold` do Jest, aplicado por shard, mediria cada fatia contra o código inteiro
// e reprovaria sempre. Aqui junta os `coverage-final.json` de todos os shards e aplica o
// MESMO `coverageThreshold.global` do jest.config.js — o piso continua tendo uma fonte só.
// Uso: node scripts/coverage-gate.js <dir-com-os-json>
const fs = require('fs');
const path = require('path');
const libCoverage = require('istanbul-lib-coverage');

const dir = process.argv[2];
if (!dir) {
  console.error('uso: node scripts/coverage-gate.js <dir>');
  process.exit(2);
}
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'coverage-final.json') files.push(p);
  }
})(dir);
// 7 shards esperados; menos que isso = shard sem artefato, e o número sairia baixo por falta de dado.
const EXPECTED = Number(process.env.COVERAGE_SHARDS || 7);
if (files.length !== EXPECTED) {
  console.error(`::error::esperava ${EXPECTED} coverage-final.json, achei ${files.length}`);
  process.exit(1);
}

const map = libCoverage.createCoverageMap({});
for (const f of files) map.merge(JSON.parse(fs.readFileSync(f, 'utf8')));
const summary = map.getCoverageSummary();

const threshold = require('../jest.config.js').coverageThreshold.global;
let failed = false;
for (const key of ['statements', 'branches', 'functions', 'lines']) {
  const pct = summary[key].pct;
  const min = threshold[key];
  const ok = pct >= min;
  if (!ok) failed = true;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${key.padEnd(10)} ${pct.toFixed(2)}% (piso ${min}%)`);
}
if (failed) {
  console.error('::error::cobertura abaixo do piso de server/jest.config.js coverageThreshold.global');
  process.exit(1);
}
