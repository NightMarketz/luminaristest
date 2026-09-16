import { z } from 'zod';
import { IMPORT_KINDS, ROW_STATUSES } from '../models/DataExchange.model';
import { isValidDateOnly } from '../models/dates';

/**
 * Zod DTOs for the accounting Data Exchange (BE-INCR-6). Validation happens at the
 * controller boundary; the service trusts the parsed types.
 */

const dateOnly = z
  .string()
  .refine(isValidDateOnly, 'Data deve ser uma data real no formato YYYY-MM-DD');

/** Export kinds wired so far (Phase 3). EXPORT_IMPORT_ERRORS joins in Phase 5. */
export const IMPLEMENTED_EXPORT_KINDS = [
  'EXPORT_TRIAL_BALANCE',
  'EXPORT_GENERAL_LEDGER',
  'EXPORT_BALANCE_SHEET',
  'EXPORT_INCOME_STATEMENT',
  'EXPORT_TEMPLATE',
] as const;

/**
 * POST /exports body — which report/template to render and in which format.
 *
 * `periodStart`/`periodEnd` (C6b PR-1, F-C6b-6/7 a): janela opcional gravada no job (as colunas
 * já existem — `AccountingDataExchangeJob.periodStart/periodEnd` — zero migração). `accountCode`
 * deixou de ser obrigatório para `EXPORT_GENERAL_LEDGER` (F-C6b-7 a): omitido, o export vira
 * "razão geral" (todas as contas com movimento na janela) — mas a janela em si CONTINUA opcional
 * neste DTO (plano, Passo 5 T: "razão sem accountCode → válido"); o guard de que a razão geral
 * exige periodStart/periodEnd para ser CONSTRUÍDA mora em `DataExchangeExportService.buildTable`
 * (consequência de `IJournalEntryRepository.findManyForExport` exigir `window` não-opcional —
 * não é regra de forma do DTO).
 */
export const ExportRequestSchema = z
  .object({
    kind: z.enum(IMPLEMENTED_EXPORT_KINDS),
    format: z.enum(['csv', 'xlsx']),
    unitId: z.string().min(1),
    asOf: dateOnly.optional(),
    accountCode: z.string().min(1).optional(),
    periodStart: dateOnly.optional(),
    periodEnd: dateOnly.optional(),
    templateKind: z.enum(IMPORT_KINDS).optional(),
  })
  .superRefine((val, ctx) => {
    if ((val.kind === 'EXPORT_BALANCE_SHEET' || val.kind === 'EXPORT_INCOME_STATEMENT') && !val.asOf) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['asOf'], message: 'asOf é obrigatório para BP/DRE.' });
    }
    if (val.kind === 'EXPORT_TEMPLATE' && !val.templateKind) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['templateKind'], message: 'templateKind é obrigatório para exportar template.' });
    }
    // Review #337 F1 (classe param-aceito-e-ignorado): periodStart/periodEnd só têm leitor em
    // EXPORT_GENERAL_LEDGER (buildTable) — para qualquer outro kind eram aceitos pelo DTO e
    // IGNORADOS em silêncio pelo service. Fecha na fronteira, não no service.
    if (val.kind !== 'EXPORT_GENERAL_LEDGER' && (val.periodStart || val.periodEnd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodStart'],
        message: 'periodStart/periodEnd só valem para o razão (EXPORT_GENERAL_LEDGER).',
      });
    }
    // Review #337 F1: um só dos dois caía em janela `undefined` silenciosamente dentro do
    // razão (buildTable fazia `periodStart && periodEnd`, então um só lado virava "sem janela",
    // não um erro) — a MESMA classe, só que dentro do kind que legitimamente usa o par.
    if ((val.periodStart == null) !== (val.periodEnd == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: val.periodStart ? ['periodEnd'] : ['periodStart'],
        message: 'Informe periodStart e periodEnd juntos, ou nenhum dos dois.',
      });
    }
    if (val.periodStart && val.periodEnd && val.periodEnd < val.periodStart) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['periodEnd'], message: 'periodEnd deve ser maior ou igual a periodStart.' });
    }
  });

export type ExportRequestDto = z.infer<typeof ExportRequestSchema>;

/** Query for job-scoped GET endpoints (job summary, artifact download). */
export const JobScopeQuerySchema = z.object({ unitId: z.string().min(1) });

/**
 * Query de `GET /jobs/:jobId/rows` — o escopo MAIS o filtro `status`.
 *
 * `status` já era publicado no contrato (docs.paths.ts, enum de 4 valores) e consumido pelo
 * serviço, mas era lido direto de `req.query` DEPOIS do parse, fora do DTO: chegava como
 * string crua, sem validação de enum. Declarado aqui, ele volta para dentro da fronteira.
 */
export const JobRowsQuerySchema = JobScopeQuerySchema.extend({
  status: z.enum(ROW_STATUSES).optional(),
});
export type JobRowsQueryDto = z.infer<typeof JobRowsQuerySchema>;

/** Body fields for a multipart import upload (kind + unitId travel as form fields). */
export const ImportUploadSchema = z.object({
  kind: z.enum(IMPORT_KINDS),
  unitId: z.string().min(1),
});
export type ImportUploadDto = z.infer<typeof ImportUploadSchema>;

/** Body for committing a staged import. */
export const CommitImportSchema = z.object({ unitId: z.string().min(1) });

/** GET /templates/:kind param. */
export const TemplateKindSchema = z.enum(IMPORT_KINDS);
