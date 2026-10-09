/**
 * Guarda da convenção do jest.config.js: teste que abre SQLite real (roda `prisma migrate deploy` /
 * `prisma db push` / `prisma db execute`) é `*.integration.test.ts`. No projeto unit ele roda em paralelo
 * com os demais e estoura o hook de 60 s (GAP-MAP Nível 4, 2026-10-09).
 */
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const REAL_DB = /npx prisma (migrate deploy|db push|db execute)/;

function unitTestFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return e.name === 'node_modules' ? [] : unitTestFiles(full);
        const isUnit = /\.(test|spec)\.ts$/.test(e.name) && !e.name.endsWith('.integration.test.ts');
        return isUnit && full.includes(`${path.sep}__tests__${path.sep}`) ? [full] : [];
    });
}

describe('testes de banco real ficam no projeto integration', () => {
    it('nenhum teste do projeto unit roda o CLI do Prisma contra SQLite real', () => {
        const offenders = unitTestFiles(SRC)
            .filter((f) => REAL_DB.test(readFileSync(f, 'utf8')))
            .map((f) => path.relative(SRC, f).split(path.sep).join('/'));
        expect(offenders).toEqual([]);
    });
});
