/**
 * BRIEF MODULE-BOUNDARIES, PR-2b — a ligação de PRODUÇÃO do job de reconciliação, contra SQLite real e a
 * `ApplicationFactory` real (sem `jest.mock('../../lib/factory')`).
 *
 * Por que existe: os outros testes do job trocam a factory por um duplo, então nenhum executava
 * `runAccountingSyncReconcile()` com os colaboradores de verdade. Desde o PR-2b a marca d'água vem de
 * `getFactory().getJobWatermarkRepository()` (regra J1: o job não importa `jobs/repositories/`). Se o getter sumir,
 * devolver outra coisa ou o repositório não estiver no registro da factory, este teste falha; o `tsc` só garante o tipo.
 *
 * O QUE PROVA: num banco sem nenhuma tabela dinâmica o job roda até o fim, não reconcilia nada e grava a linha
 * `job_watermarks` do job; a linha gravada é a que o repositório exposto pela factory lê.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { RECONCILE_WATERMARK_JOB, runAccountingSyncReconcile } from '../accountingSyncReconcile.job';

describe('runAccountingSyncReconcile — ligação de produção (factory real, SQLite real)', () => {
  beforeAll(() => {
    // Recria o arquivo do zero (test/helpers/db.ts): nenhuma tabela dinâmica e nenhuma marca d'água.
    pushTestSchema();
  }, 120000);

  it("roda no banco vazio e grava a marca d'água pelo repositório que a factory expõe", async () => {
    expect(await prisma.jobWatermark.findUnique({ where: { job: RECONCILE_WATERMARK_JOB } })).toBeNull();

    const inicio = Date.now();
    const summary = await runAccountingSyncReconcile();

    expect(summary.total).toBe(0);
    expect(summary.failed).toBe(0);

    const linha = await prisma.jobWatermark.findUnique({ where: { job: RECONCILE_WATERMARK_JOB } });
    expect(linha).not.toBeNull();
    // A marca recua em relação ao início da rodada (janela de sobreposição), nunca avança além dele.
    expect(linha!.watermarkAt.getTime()).toBeLessThanOrEqual(inicio + 1000);

    const lida = await getFactory().getJobWatermarkRepository().get(RECONCILE_WATERMARK_JOB);
    expect(lida).toEqual(linha!.watermarkAt);
  }, 120000);
});
