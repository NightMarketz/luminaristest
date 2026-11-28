import { z } from 'zod';
import { isValidDateOnly } from '../../accounting/models/dates';
import { LEGAL_PARAMETER_STATUS } from '../models/legalParameter';

/**
 * BE-INCR-LEGAL-PARAMS PR-1 (BRIEF §3 itens 2–4, 8, 11; §4) — DTOs `.strict()` da tabela de plataforma. Date-only
 * validado contra o calendário (memória date-only-regex-nao-valida-calendario).
 */
const dateOnly = z.string().refine(isValidDateOnly, { message: 'data YYYY-MM-DD de calendário' });
/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 13 (F-F3-1 a) — o DTO só confere a sintaxe do nome; quem diz se a tabela existe é o
 * registro de formato, no serviço (400 `PARAMETRO_LEGAL_TABELA_DESCONHECIDA`).
 */
const tabela = z.string().regex(/^[A-Z][A-Z0-9_]{1,63}$/, { message: 'nome de tabela: maiúsculas, dígitos e _ (2 a 64)' });

export const ProposeLegalParameterSchema = z
  .object({
    tabela,
    chave: z.string().min(1).max(64),
    discriminador: z.string().min(1).max(64).optional(),
    valorInt: z.number().int().optional(),
    valorTexto: z.string().min(1).max(64).optional(),
    valorJson: z.unknown().optional(),
    fonte: z.string().trim().min(1).max(500), // item 3: linha sem fonte ⇒ 400
    fonteUrl: z.string().url().optional(),
    fonteSha256: z.string().regex(/^[0-9a-f]{12,64}$/).optional(),
    vigenteDesde: dateOnly,
    vigenteAte: dateOnly.optional(),
    supersedesId: z.string().min(1).optional(),
    motivo: z.string().trim().min(1).max(500),
  })
  .strict()
  .refine((d) => [d.valorInt, d.valorTexto, d.valorJson].filter((v) => v !== undefined).length === 1, {
    message: 'exatamente um de valorInt | valorTexto | valorJson',
  })
  .refine((d) => d.vigenteAte === undefined || d.vigenteAte >= d.vigenteDesde, {
    message: 'vigenteAte anterior a vigenteDesde',
    path: ['vigenteAte'],
  });
export type ProposeLegalParameterInput = z.infer<typeof ProposeLegalParameterSchema>;

/** GET /api/legal-parameters — filtro por tabela e status. */
export const ListLegalParametersQuerySchema = z
  .object({
    tabela: tabela.optional(),
    status: z.enum(LEGAL_PARAMETER_STATUS).optional(),
  })
  .strict();
export type ListLegalParametersQuery = z.infer<typeof ListLegalParametersQuerySchema>;

/** GET /api/legal-parameters/recalc-jobs — status da fila de recálculo (RECALC-STATUS, itens 1–2). */
export const ListRecalcJobsQuerySchema = z
  .object({
    status: z.enum(['PENDING', 'DONE']).optional(),
    legalParameterId: z.string().min(1).max(64).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();
export type ListRecalcJobsQuery = z.infer<typeof ListRecalcJobsQuerySchema>;

/** Item 3 — o job com a linha legal que o disparou (null se a linha não existe mais). */
export type RecalcJobView = {
  id: string;
  evento: string;
  status: string;
  tentativas: number;
  ultimoErro: string | null;
  resumo: { reconfirmadas: number; avisos: number; inalteradas: number } | null;
  createdAt: string;
  processedAt: string | null;
  legalParameterId: string;
  linha: { tabela: string; chave: string; discriminador: string | null; vigenteDesde: string; vigenteAte: string | null; status: string } | null;
};

/** GET /api/legal-parameters/vigente — lookup do item 4. */
export const VigenteLegalParameterQuerySchema = z
  .object({
    tabela,
    chave: z.string().min(1).max(64),
    data: dateOnly,
    discriminador: z.string().min(1).max(64).optional(),
  })
  .strict();
export type VigenteLegalParameterQuery = z.infer<typeof VigenteLegalParameterQuerySchema>;

/**
 * GET /api/legal-parameters/tabelas (F-F3-1 a) — o catálogo, lido do registro de formato. `tipoValor` segue o formulário
 * do front (`int | texto | json`); `misto` = a tabela escolhe o valor por chave ou discriminador (F-F3-9).
 */
export type LegalParameterTableView = {
  tabela: string;
  dominio: string;
  pais: string;
  tipoValor: 'int' | 'texto' | 'json' | 'misto';
};

export type LegalParameterView = {
  id: string;
  tabela: string;
  chave: string;
  discriminador: string | null;
  valorInt: number | null;
  valorTexto: string | null;
  valorJson: unknown;
  fonte: string;
  fonteUrl: string | null;
  fonteSha256: string | null;
  vigenteDesde: string;
  vigenteAte: string | null;
  status: string;
  supersedesId: string | null;
  motivo: string;
  proposedById: string;
  publishedById: string | null;
  publishedAt: string | null;
  revokedById: string | null;
  revokedAt: string | null;
  createdAt: string;
};
