/**
 * BE-INCR-LEGAL-PARAMS PR-3 (nó LEGAL-PARAMS; BRIEF §3 item 9, D-3; emenda §9 L-1; F-LP-8 b, F-LP-10 b) — a parte de
 * DADO da migração 20261007170000 sobre SQLite REAL: o banco de teste nasce por `db push` (sem migração), então este
 * teste monta o estado de ANTES (Anexo semeado por escopo + bens apontando para ele) e roda os statements de repoint e
 * delete lidos do próprio `migration.sql`. Prova a ordem obrigatória do item 9: o bem antigo lê a mesma taxa antes e
 * depois, nenhuma referência fica pendurada, a CUSTOM fica intacta e uma 2ª execução não muda nada.
 */
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const MIGRATION = path.resolve(__dirname, '../../../../prisma/migrations/20261007170000_legal_parameters_v3_depreciacao/migration.sql');
const app = makeApp();
const UNIT = 'unit-legal-params-dep';

/** Os statements da migração depois da semente: o UPDATE do repoint e o DELETE físico. */
function statementsDeRepoint(): string[] {
  const sql = fs.readFileSync(MIGRATION, 'utf8').replace(/\r\n/g, '\n');
  const corpo = sql.slice(sql.indexOf('-- Repoint (3)'));
  return corpo
    .split(';')
    .map((st) => st.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim())
    .filter((st) => st.length > 0);
}

let dono: { id: string; username: string };
let classId: string;

const linhaAnexo = (source: string, sourceRow: number | null, annualRateBp: number) =>
  prisma.depreciationRate.create({
    data: { userId: dono.id, unitId: UNIT, ncm: null, sourceRow, description: `Anexo ${source} ${sourceRow}`, lifeYears: 10, annualRateBp, source },
  });
const bem = (code: string, rateId: string | null, annualRateBp: number) =>
  prisma.fixedAsset.create({
    data: { userId: dono.id, unitId: UNIT, classId, code, description: code, costCents: 100_000n, rateId, annualRateBp, acquiredAt: new Date('2025-01-01T00:00:00Z') },
  });

describe('migração v3 — repoint do imobilizado para o Anexo III de plataforma (item 9)', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'lp-dep', username: 'lp-dep', email: 'lp-dep@test.local', password: 'x', role: 'USER' } });
    const conta = (code: string) => prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name: code, nature: 'Asset', acceptsEntries: true } });
    const custo = await conta('1.2.1');
    const dep = await conta('1.2.9');
    classId = (await prisma.fixedAssetClass.create({
      data: { userId: dono.id, unitId: UNIT, code: 'MAQ', name: 'Máquinas', depreciable: true, costAccountId: custo.id, accumulatedDepreciationAccountId: dep.id },
    })).id;
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('bem antigo → linha de plataforma de mesma (source, sourceRow); rateId null; annualRateBp intacto; ANEXO_* por escopo apagadas; CUSTOM fica', async () => {
    const instalacoes = await linhaAnexo('ANEXO_III_IN_1700_2017', 2, 1000);
    const nota1 = await linhaAnexo('ANEXO_III_NOTA_1', null, 3330);
    const naoUsada = await linhaAnexo('ANEXO_III_IN_1700_2017', 3, 400);
    const custom = await prisma.depreciationRate.create({
      data: { userId: dono.id, unitId: UNIT, sourceRow: null, description: 'Laudo', lifeYears: 8, annualRateBp: 1250, source: 'CUSTOM', justification: 'Laudo' },
    });
    // Snapshot propositalmente diferente da taxa da linha: o repoint não pode recalcular o bem.
    const bemAnexo = await bem('B-ANEXO', instalacoes.id, 999);
    const bemNota = await bem('B-NOTA', nota1.id, 3330);
    const bemCustom = await bem('B-CUSTOM', custom.id, 1250);
    const bemSemTaxa = await bem('B-EXPLICITA', null, 500);

    for (const st of statementsDeRepoint()) await prisma.$executeRawUnsafe(st);

    const depois = async (id: string) => prisma.fixedAsset.findUniqueOrThrow({ where: { id }, select: { rateId: true, legalParameterId: true, annualRateBp: true } });
    expect(await depois(bemAnexo.id)).toEqual({ rateId: null, legalParameterId: 'lp3-dep-anexo-2', annualRateBp: 999 });
    expect(await depois(bemNota.id)).toEqual({ rateId: null, legalParameterId: 'lp3-dep-nota1-nota', annualRateBp: 3330 });
    expect(await depois(bemCustom.id)).toEqual({ rateId: custom.id, legalParameterId: null, annualRateBp: 1250 });
    expect(await depois(bemSemTaxa.id)).toEqual({ rateId: null, legalParameterId: null, annualRateBp: 500 });

    const restantes = await prisma.depreciationRate.findMany({ where: { userId: dono.id }, select: { id: true } });
    expect(restantes.map((r) => r.id)).toEqual([custom.id]); // instalacoes, nota1 e naoUsada saíram (delete físico)
    expect([instalacoes.id, nota1.id, naoUsada.id].some((id) => restantes.some((r) => r.id === id))).toBe(false);

    // Nenhuma referência pendurada: todo rateId/legalParameterId de bem resolve numa linha existente.
    const pendurados = await prisma.$queryRawUnsafe<{ n: bigint }[]>(
      `SELECT COUNT(*) AS n FROM fixed_assets fa
        WHERE (fa.rateId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM depreciation_rates d WHERE d.id = fa.rateId))
           OR (fa.legalParameterId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM legal_parameters l WHERE l.id = fa.legalParameterId))`,
    );
    expect(Number(pendurados[0].n)).toBe(0);

    // Retomável: 2ª execução não muda nada.
    for (const st of statementsDeRepoint()) await prisma.$executeRawUnsafe(st);
    expect(await depois(bemAnexo.id)).toEqual({ rateId: null, legalParameterId: 'lp3-dep-anexo-2', annualRateBp: 999 });
    expect(await prisma.depreciationRate.count({ where: { userId: dono.id } })).toBe(1);
  });

  it('linha de plataforma referenciada por bem não se apaga (FK Restrict)', async () => {
    await expect(prisma.legalParameter.delete({ where: { id: 'lp3-dep-anexo-2' } })).rejects.toThrow();
  });

  it('POST /fixed-assets com rateId do Anexo de plataforma grava legalParameterId e a taxa da linha (L-1)', async () => {
    const res = await request(app)
      .post('/api/accounting/fixed-assets')
      .set(authHeader(dono))
      .send({ unitId: UNIT, classId, code: 'B-NOVO', description: 'Forno de vidro', quantity: 1, costCents: 50_000, residualValueCents: 0, acquiredAt: '2026-01-01', rateId: 'lp3-dep-nota1-nota' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ rateId: null, legalParameterId: 'lp3-dep-nota1-nota', annualRateBp: 3330 });
  });
});
