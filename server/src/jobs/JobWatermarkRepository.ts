import prisma from '../lib/prisma';

/**
 * Prisma-backed repository for `job_watermarks` — a singleton row PER JOB NAME (BRIEF-W2-F).
 * Deliberately thin (2 operations, no Controller/Service/Policy): this table is background-job
 * infrastructure, never exposed over HTTP, so it does not carry the Route→Controller→Service→
 * Repository chain the Architecture Contract requires for user-facing resources — same class of
 * exception as the job's own direct `prisma.dynamicTable.findMany` / `prisma.account.findFirst`
 * calls in accountingSyncReconcile.job.ts.
 */
export class JobWatermarkRepository {
  /** Returns the persisted watermark, or `null` when the job has never completed a run. */
  async get(job: string): Promise<Date | null> {
    const row = await prisma.jobWatermark.findUnique({ where: { job } });
    return row?.watermarkAt ?? null;
  }

  /** Upserts the watermark — the job's ONLY writer, called after a full successful run. */
  async set(job: string, watermarkAt: Date): Promise<void> {
    await prisma.jobWatermark.upsert({
      where: { job },
      create: { job, watermarkAt },
      update: { watermarkAt },
    });
  }
}
