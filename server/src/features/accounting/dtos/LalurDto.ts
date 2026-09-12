import { z } from 'zod';
import { MAX_CENTS } from '../models/money';
import { isValidDateOnly } from '../models/dates';
import { queryBoolean } from './queryPrimitives';
import {
  LALUR_IND_RELACAO,
  LALUR_IND_SALDO,
  LALUR_LIVROS,
  LALUR_QUARTERS,
  LALUR_TRIBUTOS,
  isParteALivro,
} from '../models/Lalur.model';

/**
 * LalurDto — e-Lalur / e-Lacs request schemas (BE-INCR-SPED-ECF-FASE3B item 11, Fork 4→(b);
 * ADR EMENDA 2026-09-11 (2ª) D-M2..D-M4). Contract of ONE adjustment line = BRIEF §2.1
 * `LalurLineSchema` (EMENDA 2026-09-11, lacunas 1-5) + D-M3 (Bloco N lines carry no M300 fields).
 * The GENERATION DTO (`SpedEcfRealDto`) does NOT carry adjustments — the generator reads the model.
 *
 * What the DTO can and cannot mirror (BRIEF §2.1):
 *  - REGRA_RELACAO_INEXISTENTE (p.247, VERIFICADO): 1 ⇒ Parte B e nenhuma conta; 2 ⇒ conta e
 *    nenhuma Parte B; 3 ⇒ ambas; 4 ⇒ nenhuma. Mirrored in `.superRefine` for lalur/lacs.
 *  - HIST_LAN_LAL obrigatório com IND_RELACAO=4 (p.247, leitura INFERIDA — Nota N-3 do BRIEF).
 *  - `valorCents` ≥ 0 sempre (p.244: negativo = "Erro no programa"); direção vem do tipo derivado.
 *  - What depends on the CATALOG (código existe / é linha `E` / vigente no ano / TIPO_LANCAMENTO=P ⇒
 *    IND_RELACAO=1 — REGRA_IND_RELACAO p.247) lives in the SERVICE, 400 with code + reason (item 9).
 * Body schemas are `.strict()` (typo = 400, never silent drop); query schemas are not.
 */

const cents = (field: string) =>
  z
    .number()
    .int()
    .nonnegative({ message: `${field} deve ser ≥ 0 — a direção vem do tipo da linha, nunca do sinal (Manual p.244).` })
    .max(MAX_CENTS, { message: `${field} excede o limite suportado (máx ${MAX_CENTS}).` });

const dateOnly = (field: string) =>
  z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

/** Campos de uma linha (sem unitId) — reusados por create e update. */
const lineFields = {
  year: z.number().int().gte(2015).lte(2100),
  quarter: z.enum(LALUR_QUARTERS),
  livro: z.enum(LALUR_LIVROS),
  codigo: z.string().min(1).max(32), // validado contra o catálogo no serviço (item 9)
  valorCents: cents('valorCents'),
  histLancamento: z.string().min(1).max(500).optional(), // M300.HIST_LAN_LAL, C 500 (p.245)
  indRelacao: z.enum(LALUR_IND_RELACAO).optional(), // obrigatório em lalur/lacs; PROIBIDO em N (D-M3)
  parteBId: z.string().min(1).optional(), // → LalurParteBAccount (M305/M355) — indRelacao ∈ {1,3}
  accountId: z.string().min(1).optional(), // → Account id (M310/M360) — indRelacao ∈ {2,3}
};

type LineShape = {
  livro: string;
  indRelacao?: string;
  parteBId?: string;
  accountId?: string;
  histLancamento?: string;
};

/** Condicionais de REGRA_RELACAO_INEXISTENTE (p.247) + D-M3 — compartilhadas por create e pelo merge do update. */
export function refineLalurLine(l: LineShape, ctx: z.RefinementCtx): void {
  if (!isParteALivro(l.livro)) {
    // D-M3: N500/N630/N670 só têm REG, CODIGO, DESCRICAO, VALOR (pp.280/298/307).
    for (const k of ['indRelacao', 'parteBId', 'accountId', 'histLancamento'] as const) {
      if (l[k] !== undefined) {
        ctx.addIssue({ code: 'custom', path: [k], message: `${k} não existe em linha do Bloco N (livro=${l.livro}; Manual pp.280/298/307).` });
      }
    }
    return;
  }
  if (!l.indRelacao) {
    ctx.addIssue({ code: 'custom', path: ['indRelacao'], message: `indRelacao é obrigatório em linha E de ${l.livro} (Manual p.245/p.247).` });
    return;
  }
  const needsB = l.indRelacao === '1' || l.indRelacao === '3';
  const needsCta = l.indRelacao === '2' || l.indRelacao === '3';
  if (needsB !== Boolean(l.parteBId)) {
    ctx.addIssue({ code: 'custom', path: ['parteBId'], message: `parteBId ${needsB ? 'obrigatório' : 'proibido'} com indRelacao=${l.indRelacao} (Manual p.247).` });
  }
  if (needsCta !== Boolean(l.accountId)) {
    ctx.addIssue({ code: 'custom', path: ['accountId'], message: `accountId ${needsCta ? 'obrigatório' : 'proibido'} com indRelacao=${l.indRelacao} (Manual p.247/p.253).` });
  }
  if (l.indRelacao === '4' && !l.histLancamento) {
    ctx.addIssue({ code: 'custom', path: ['histLancamento'], message: 'histLancamento obrigatório com indRelacao=4 (Manual p.247, leitura INFERIDA).' });
  }
}

/** @openapi
 * components:
 *   schemas:
 *     CreateLalurEntryInput:
 *       type: object
 *       required: [unitId, year, quarter, livro, codigo, valorCents]
 *       properties:
 *         unitId:         { type: string }
 *         year:           { type: integer, example: 2025 }
 *         quarter:        { type: string, enum: [T01, T02, T03, T04] }
 *         livro:          { type: string, enum: [lalur, lacs, n500, n630, n670], description: "lalur=M300 (IRPJ) · lacs=M350 (CSLL) · n500/n630/n670 = linhas E do Bloco N" }
 *         codigo:         { type: string, description: "Código da linha na Tabela Dinâmica (aba M300A/M350A/N500/N630A/N670). Só linha tipo E, vigente no ano — senão 400 com código e motivo." }
 *         valorCents:     { type: integer, minimum: 0, maximum: 2147483647, description: "Sempre ≥ 0 — a direção (adição/exclusão) vem do TIPO_LANCAMENTO derivado do catálogo (Manual p.244)." }
 *         histLancamento: { type: string, maxLength: 500, description: "M300.HIST_LAN_LAL; obrigatório com indRelacao=4; proibido em livro N" }
 *         indRelacao:     { type: string, enum: ['1','2','3','4'], description: "M300.IND_RELACAO — obrigatório em lalur/lacs, proibido em livro N. 1=Parte B · 2=conta contábil · 3=ambas · 4=sem relacionamento" }
 *         parteBId:       { type: string, description: "id de LalurParteBAccount (M305/M355) — obrigatório com indRelacao 1 ou 3; tributo da conta tem de casar com o livro" }
 *         accountId:      { type: string, description: "id da Account do plano (M310/M360.COD_CTA) — obrigatório com indRelacao 2 ou 3" }
 */
export const CreateLalurEntrySchema = z
  .object({ unitId: z.string().min(1), ...lineFields })
  .strict()
  .superRefine(refineLalurLine);

/** @openapi
 * components:
 *   schemas:
 *     UpdateLalurEntryInput:
 *       type: object
 *       required: [unitId]
 *       description: "Patch parcial; o registro resultante (existente + patch) é revalidado por inteiro (mesmas regras do create). year/quarter/livro/codigo não mudam — arquive e recrie."
 *       properties:
 *         unitId:         { type: string }
 *         valorCents:     { type: integer, minimum: 0 }
 *         histLancamento: { type: string, maxLength: 500, nullable: true }
 *         indRelacao:     { type: string, enum: ['1','2','3','4'] }
 *         parteBId:       { type: string, nullable: true }
 *         accountId:      { type: string, nullable: true }
 */
export const UpdateLalurEntrySchema = z
  .object({
    unitId: z.string().min(1),
    valorCents: lineFields.valorCents.optional(),
    histLancamento: lineFields.histLancamento.nullable(),
    indRelacao: lineFields.indRelacao,
    parteBId: lineFields.parteBId.nullable(),
    accountId: lineFields.accountId.nullable(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ArchiveLalurInput:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 */
export const ArchiveLalurSchema = z.object({ unitId: z.string().min(1) }).strict();

/** Query DTO — GET /lalur/entries?unitId=&year=&quarter=&livro=&includeArchived= */
export const ListLalurEntriesQuerySchema = z.object({
  unitId: z.string().min(1),
  year: z.coerce.number().int().gte(2015).lte(2100).optional(),
  quarter: z.enum(LALUR_QUARTERS).optional(),
  livro: z.enum(LALUR_LIVROS).optional(),
  // queryBoolean, não z.coerce.boolean(): `?includeArchived=false` devolveria os arquivados.
  includeArchived: queryBoolean(),
});

/** @openapi
 * components:
 *   schemas:
 *     CreateLalurParteBAccountInput:
 *       type: object
 *       required: [unitId, codCtaB, descricao, dtCriacao, codPbRfb, codTributo, saldoIniCents, indSaldoIni]
 *       description: "M010 — conta da Parte B do e-Lalur/e-Lacs (Manual do Leiaute 12, p.237). Chave = codCtaB + codTributo."
 *       properties:
 *         unitId:        { type: string }
 *         codCtaB:       { type: string, description: "M010.COD_CTA_B — código NOSSO, estável entre exercícios (reconcilia com o E020 recuperado pelo PVA)" }
 *         descricao:     { type: string, description: "M010.DESC_CTA_LAL" }
 *         dtCriacao:     { type: string, description: "M010.DT_AP_LAL — YYYY-MM-DD, data FINAL do período de apuração em que a conta foi criada" }
 *         codPbRfb:      { type: string, description: "M010.COD_PB_RFB — código da aba PARTEB_PADRAO; tem de existir para o tributo (REGRA_M010_COD_PB_RFB_TRIBUTO)" }
 *         dtLimite:      { type: string, description: "M010.DT_LIM_LAL — YYYY-MM-DD, opcional" }
 *         codTributo:    { type: string, enum: [I, C], description: "M010.COD_TRIBUTO — I=IRPJ (e-Lalur) · C=CSLL (e-Lacs)" }
 *         saldoIniCents: { type: integer, minimum: 0, description: "M010.VL_SALDO_INI em centavos, sinal em indSaldoIni" }
 *         indSaldoIni:   { type: string, enum: [D, C], description: "M010.IND_VL_SALDO_INI" }
 *         cnpjSitEsp:    { type: string, description: "M010.CNPJ_SIT_ESP — 14 dígitos, opcional" }
 */
export const CreateLalurParteBAccountSchema = z
  .object({
    unitId: z.string().min(1),
    codCtaB: z.string().min(1).max(64),
    descricao: z.string().min(1).max(255),
    dtCriacao: dateOnly('dtCriacao'),
    codPbRfb: z.string().min(1).max(6), // C 6 (p.237); existência na aba PARTEB_PADRAO é do serviço
    dtLimite: dateOnly('dtLimite').optional(),
    codTributo: z.enum(LALUR_TRIBUTOS),
    saldoIniCents: cents('saldoIniCents'),
    indSaldoIni: z.enum(LALUR_IND_SALDO),
    cnpjSitEsp: z.string().regex(/^\d{14}$/, 'cnpjSitEsp = 14 dígitos').optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     UpdateLalurParteBAccountInput:
 *       type: object
 *       required: [unitId]
 *       description: "Patch parcial da conta da Parte B; codCtaB/codTributo (chave) não mudam — arquive e recrie."
 *       properties:
 *         unitId:        { type: string }
 *         descricao:     { type: string }
 *         dtCriacao:     { type: string }
 *         codPbRfb:      { type: string }
 *         dtLimite:      { type: string, nullable: true }
 *         saldoIniCents: { type: integer, minimum: 0 }
 *         indSaldoIni:   { type: string, enum: [D, C] }
 *         cnpjSitEsp:    { type: string, nullable: true }
 */
export const UpdateLalurParteBAccountSchema = z
  .object({
    unitId: z.string().min(1),
    descricao: z.string().min(1).max(255).optional(),
    dtCriacao: dateOnly('dtCriacao').optional(),
    codPbRfb: z.string().min(1).max(6).optional(),
    dtLimite: dateOnly('dtLimite').nullable().optional(),
    saldoIniCents: cents('saldoIniCents').optional(),
    indSaldoIni: z.enum(LALUR_IND_SALDO).optional(),
    cnpjSitEsp: z.string().regex(/^\d{14}$/, 'cnpjSitEsp = 14 dígitos').nullable().optional(),
  })
  .strict();

/** Query DTO — GET /lalur/parte-b?unitId=&codTributo=&includeArchived= */
export const ListLalurParteBQuerySchema = z.object({
  unitId: z.string().min(1),
  codTributo: z.enum(LALUR_TRIBUTOS).optional(),
  includeArchived: queryBoolean(),
});

export type CreateLalurEntryInput = z.infer<typeof CreateLalurEntrySchema>;
export type UpdateLalurEntryInput = z.infer<typeof UpdateLalurEntrySchema>;
export type ArchiveLalurInput = z.infer<typeof ArchiveLalurSchema>;
export type ListLalurEntriesQueryInput = z.infer<typeof ListLalurEntriesQuerySchema>;
export type CreateLalurParteBAccountInput = z.infer<typeof CreateLalurParteBAccountSchema>;
export type UpdateLalurParteBAccountInput = z.infer<typeof UpdateLalurParteBAccountSchema>;
export type ListLalurParteBQueryInput = z.infer<typeof ListLalurParteBQuerySchema>;
