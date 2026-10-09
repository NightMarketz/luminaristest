/**
 * Banco-modelo das suítes de integração. Só imports do Node: o `globalSetup` do projeto integration
 * (test/jest.integrationGlobalSetup.ts) o aquece antes do 1º arquivo, e lá o `moduleNameMapper` (alias `@/`) não vale.
 */
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import path from 'path';
import fs from 'fs';

export const SERVER_DIR = path.resolve(__dirname, '../..'); // test/helpers -> server
/**
 * BE-INCR-LEGAL-PARAMS PR-1 (BRIEF item 14): coeficientes de lei são dado de PLATAFORMA que a migração semeia. O
 * `db push` não roda migração, então o modelo aplica o mesmo arquivo de dados que o `migration.sql` carrega
 * (teste-guarda de igualdade em legalParameterSeed.test.ts) e o `resetDb()` o reaplica. BE-INCR-SIMPLES-NACIONAL PR-1
 * acrescenta o segundo arquivo (tabelas do Simples, `simplesAnexosSeed.test.ts`).
 */
// BE-INCR-LEGAL-PARAMS: uma semente por PR de migração (v1 = PR-1, v2 = PR-2, v3 = PR-3) + as do Simples (X14 PR-1 e PR-3), aplicadas em ordem.
export const LEGAL_PARAMS_SEEDS = ['legal_parameters_v1.sql', 'legal_parameters_v2.sql', 'legal_parameters_v3.sql', 'legal_parameters_v4.sql', 'legal_parameters_v5.sql', 'legal_parameters_simples_v1.sql', 'legal_parameters_simples_v2.sql', 'legal_parameters_simples_v3.sql', 'legal_parameters_simples_v4.sql'].map((f) => path.join(SERVER_DIR, 'prisma', 'data', f));

/**
 * Banco-modelo: o `db push` (~3–5 s, um subprocesso `npx`) roda UMA vez por versão do schema e cada arquivo de
 * integração copia o resultado (ms). Antes eram 83 pushes por execução da suíte. O hash do schema.prisma no nome
 * invalida o modelo sozinho quando o schema muda.
 * ponytail: modelos de hashes antigos ficam em prisma/ (gitignored, *.db) — apague à mão se incomodar.
 */
export function templateDb(): string {
  const schema = fs.readFileSync(path.join(SERVER_DIR, 'prisma', 'schema.prisma'));
  const hash = createHash('sha1').update(schema).update(LEGAL_PARAMS_SEEDS.map((f) => fs.readFileSync(f, 'utf8')).join('')).digest('hex').slice(0, 12);
  const template = path.join(SERVER_DIR, 'prisma', `test-integration.template-${hash}.db`);
  if (!fs.existsSync(template)) {
    // Push num nome temporário + rename: um modelo pela metade (push abortado) nunca fica com o nome definitivo.
    const tmpName = `test-integration.template-${hash}.${process.pid}.tmp.db`;
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      cwd: SERVER_DIR,
      env: { ...process.env, DATABASE_URL: `file:./${tmpName}` },
      stdio: 'inherit',
    });
    // Um `db execute` só (cada `npx` custa ~1–2 s; três estouravam o timeout de 5 s do beforeAll no CI).
    const seedTmp = path.join(SERVER_DIR, 'prisma', `${tmpName}.seed.sql`);
    fs.writeFileSync(seedTmp, LEGAL_PARAMS_SEEDS.map((f) => fs.readFileSync(f, 'utf8')).join('\n'));
    try {
      execSync(`npx prisma db execute --file "${seedTmp}" --url "file:${path.join(SERVER_DIR, 'prisma', tmpName)}"`, { cwd: SERVER_DIR, stdio: 'inherit' });
    } finally {
      fs.rmSync(seedTmp, { force: true });
    }
    fs.renameSync(path.join(SERVER_DIR, 'prisma', tmpName), template);
  }
  return template;
}
