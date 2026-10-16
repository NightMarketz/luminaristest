/* eslint-disable @typescript-eslint/no-var-requires */
// Piso de paths do OpenAPI (src/__tests__/openapi-paths.test.ts) mantido pela main, não pelos PRs.
//   node scripts/openapi-baseline.js           → mede e mostra contagem × piso
//   node scripts/openapi-baseline.js --write   → sobe o piso para a contagem, se ela for maior
// Nunca desce: um piso maior que a contagem é o próprio teste reprovando (path sumiu — o bug do `: `).
// Roda no workflow `openapi-baseline` a cada push na main (dono, chat, 2026-10-16).
const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const { options } = require('./generate-openapi');

const TEST = path.resolve(__dirname, '..', 'src', '__tests__', 'openapi-paths.test.ts');
const LINE = /^const BASELINE = (\d+);$/m;

function baseline() {
  const src = fs.readFileSync(TEST, 'utf8');
  const m = src.match(LINE);
  if (!m) throw new Error(`linha "const BASELINE = <n>;" não encontrada em ${TEST}`);
  const count = Object.keys(swaggerJSDoc(options).paths || {}).length;
  return { src, piso: Number(m[1]), count };
}

if (require.main === module) {
  const { src, piso, count } = baseline();
  console.log(`paths=${count} piso=${piso}`);
  if (count < piso) console.log('contagem ABAIXO do piso — o openapi-paths.test.ts reprova (path sumiu do spec)');
  if (process.argv.includes('--write') && count > piso) {
    fs.writeFileSync(TEST, src.replace(LINE, `const BASELINE = ${count};`));
    console.log(`piso ${piso} → ${count}`);
  }
}

module.exports = { baseline };
