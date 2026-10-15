import { z } from 'zod';
import { isValidDateOnly } from '../models/dates';
import { MAX_CENTS } from '../models/money';
import { CNPJ_REGEX, isValidCnpj } from '../../../lib/cnpj';
import { SEGREGACAO_EXCLUI, type TributoSimples } from '../models/simplesCalc';
import type { DocumentoRef } from './SourceDocumentUploadDto';

/**
 * BE-INCR-SIMPLES-NACIONAL PR-2 (nó X14, BRIEF itens 10–14; contrato §3) — entradas da apuração. Tudo `.strict()`;
 * centavos inteiros ≤ MAX_CENTS na API (BigInt na persistência); sem `.default` nos schemas de PUT/PATCH (memória
 * zod4-partial-aplica-default). `unitId` vem no corpo: a chave é (PJ, unidade, competência).
 */
const cents = z.number().int().min(0).max(MAX_CENTS);
const dateOnly = (field: string) => z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

export const CompetenciaParamSchema = z.object({ competencia: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competência = YYYY-MM') }).strict();

/** Item 10/11 — PUT /api/accounting/simples/historico/:competencia. */
export const SimplesHistoricoUpsertSchema = z
  .object({
    unitId: z.string().min(1),
    receitaBrutaCents: cents,
    folhaCents: cents.nullable().optional(),
    sourceDocumentId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type SimplesHistoricoUpsert = z.infer<typeof SimplesHistoricoUpsertSchema>;

/**
 * Item 12 — uma parcela da receita do mês e o motivo legal pelo qual parte do DAS não incide sobre ela. Monofásico
 * (PIS/COFINS) e ICMS-ST são indicações independentes da mesma receita (Res. CGSN 140 art. 25 §§ 6º e 8º), então a
 * declaração é por combinação, não por 4 totais (decisão pela lei, dono 07/10: "depende da lei"). Os tributos
 * excluídos derivam do motivo (`excluirDoMotivo`), nunca são digitados. ISS devido a outro município não é motivo:
 * continua no DAS (LC 123 art. 18 § 4º-A V).
 */
export const MOTIVOS_SEGREGACAO = ['MONOFASICO', 'ICMS_ST', 'ISS_RETIDO', 'MONOFASICO_E_ICMS_ST'] as const;
export type MotivoSegregacao = (typeof MOTIVOS_SEGREGACAO)[number];
export function excluirDoMotivo(m: MotivoSegregacao): TributoSimples[] {
  if (m === 'MONOFASICO') return [...SEGREGACAO_EXCLUI.monofasico];
  if (m === 'ICMS_ST') return [...SEGREGACAO_EXCLUI.icmsSt];
  if (m === 'ISS_RETIDO') return [...SEGREGACAO_EXCLUI.issRetido];
  return [...SEGREGACAO_EXCLUI.monofasico, ...SEGREGACAO_EXCLUI.icmsSt];
}

export const SimplesSegregacaoParcelaSchema = z
  .object({
    natureza: z.enum(['SERVICO', 'REVENDA', 'LOCACAO_MOVEL']),
    receitaCents: cents.refine((v) => v > 0, 'receita da parcela > 0'),
    motivo: z.enum(MOTIVOS_SEGREGACAO),
  })
  .strict();
export type SimplesSegregacaoParcela = z.infer<typeof SimplesSegregacaoParcelaSchema>;

export const SimplesSegregacaoUpsertSchema = z
  .object({ unitId: z.string().min(1), parcelas: z.array(SimplesSegregacaoParcelaSchema).max(50) })
  .strict();
export type SimplesSegregacaoUpsert = z.infer<typeof SimplesSegregacaoUpsertSchema>;

const parceriaCampos = {
  unitId: z.string().min(1),
  profissionalContactId: z.string().min(1),
  cotaSalaoBp: z.number().int().min(1).max(9999),
  naturezaCota: z.enum(['ALUGUEL_BEM_MOVEL', 'GESTAO']),
  homologadoEm: dateOnly('homologadoEm'),
  sindicato: z.string().trim().min(1).max(200),
  vigenteDesde: dateOnly('vigenteDesde'),
  vigenteAte: dateOnly('vigenteAte').nullable(),
};
const vigenciaOrdenada = (v: { vigenteDesde?: string; vigenteAte?: string | null }) =>
  !v.vigenteDesde || !v.vigenteAte || v.vigenteAte >= v.vigenteDesde;

/** Item 13 — POST /api/accounting/simples/parcerias. */
export const SalaoParceriaContratoSchema = z
  .object(parceriaCampos)
  .strict()
  .refine(vigenciaOrdenada, { message: 'vigenteAte antes de vigenteDesde', path: ['vigenteAte'] });
export type SalaoParceriaContratoInput = z.infer<typeof SalaoParceriaContratoSchema>;

/** PATCH /api/accounting/simples/parcerias/:id — `unitId` obrigatório (escopo), o resto parcial, sem default. */
export const SalaoParceriaContratoPatchSchema = z
  .object({ ...parceriaCampos, unitId: z.string().min(1) })
  .partial()
  .required({ unitId: true })
  .strict()
  .refine(vigenciaOrdenada, { message: 'vigenteAte antes de vigenteDesde', path: ['vigenteAte'] });
export type SalaoParceriaContratoPatch = z.infer<typeof SalaoParceriaContratoPatchSchema>;

/** Códigos de alerta da apuração do Simples (ME/EPP e MEI). */
export const CODIGOS_ALERTA_SIMPLES = [
  'ATIVIDADE_SEM_ANEXO',
  'RBT12_INCOMPLETO',
  'LIMITE_ME_EXCEDIDO',
  'LIMITE_EPP_EXCEDIDO',
  'SUBLIMITE_ICMS_ISS',
  'SEGREGACAO_MANUAL',
  'TIEOUT_DIVERGENTE',
  'HISTORICO_IGNORADO',
  'LIMITE_MEI_EXCEDIDO',
  'NFSE_DIVERGE_RECEITA',
  // SIMPLES-PISO-ANEXO-XI bloco 1 (F-PI-2; F-PI-5)
  'BENEFICIO_MUNICIPAL_INAPLICAVEL_DESVANTAJOSO',
  'ISS_VALOR_FIXO_MUNICIPAL',
  // SIMPLES-PISO-ANEXO-XI bloco 2 (itens 13, 14 e 16)
  'MEI_ENQUADRAMENTO_DIVERGE',
  'MEI_TAC_COM_OCUPACAO_A',
  'MEI_OCUPACAO_EXCLUIDA',
] as const;
/** D-2026-10-10-X14-ALERTA-INFORMATIVO (dono, chat, 2026-10-10), item 1: o código fica estável; o alerta ganha severidade. */
export const SEVERIDADES_ALERTA_SIMPLES = ['INFO', 'WARNING'] as const;
export const MOTIVOS_ALERTA_INFORMATIVO = ['DOCUMENTO_MUNICIPAL_TRANSIÇÃO', 'REGIME_CAIXA'] as const;
/** Alerta da apuração (saída). `motivoInformativo` só vem com `severity = INFO`. */
export const AlertaSimplesSchema = z
  .object({
    codigo: z.enum(CODIGOS_ALERTA_SIMPLES),
    detalhe: z.string(),
    severity: z.enum(SEVERIDADES_ALERTA_SIMPLES),
    motivoInformativo: z.enum(MOTIVOS_ALERTA_INFORMATIVO).optional(),
  })
  .strict()
  .refine((a) => a.motivoInformativo === undefined || a.severity === 'INFO', { message: 'motivoInformativo só com severity INFO', path: ['motivoInformativo'] });
export type AlertaSimples = z.infer<typeof AlertaSimplesSchema>;
export type CodigoAlertaSimples = AlertaSimples['codigo'];

export const SimplesUnitQuerySchema = z.object({ unitId: z.string().min(1) }).strict();
export const SimplesIdParamSchema = z.object({ id: z.string().min(1) }).strict();

export type SimplesHistoricoView = {
  id: string;
  unitId: string;
  competencia: string;
  receitaBrutaCents: number;
  folhaCents: number | null;
  sourceDocumentId: string | null;
  /** BE-INCR-SOURCE-DOCUMENT-UPLOAD F-SD-9 (a): o arquivo para o FE baixar pelo GET /attachments/:id; null sem SD ativo. */
  documento: DocumentoRef;
  updatedAt: string;
};
export type SimplesSegregacaoView = {
  id: string;
  unitId: string;
  competencia: string;
  parcelas: Array<SimplesSegregacaoParcela & { excluir: TributoSimples[] }>;
  updatedAt: string;
};
export type SalaoParceriaContratoView = {
  id: string;
  unitId: string;
  profissionalContactId: string;
  cotaSalaoBp: number;
  naturezaCota: 'ALUGUEL_BEM_MOVEL' | 'GESTAO';
  homologadoEm: string;
  sindicato: string;
  vigenteDesde: string;
  vigenteAte: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * BE-INCR-SIMPLES-NACIONAL PR-3 (nó X14, item 19; contrato §3) — PUT /api/accounting/simples/apuracoes/:competencia/das.
 * O DAS oficial (número, valor, vencimento e o PDF já anexado como `SourceDocument`) e a persistência da apuração.
 */
export const SimplesDasRegistroSchema = z
  .object({
    unitId: z.string().min(1),
    numeroDocumento: z.string().trim().min(1).max(40),
    valorCents: cents.refine((v) => v > 0, 'valor do DAS > 0'),
    vencimento: dateOnly('vencimento'),
    sourceDocumentId: z.string().min(1).nullable().optional(),
  })
  .strict();
export type SimplesDasRegistro = z.infer<typeof SimplesDasRegistroSchema>;

// ---- BE-INCR-SIMPLES-NACIONAL PR-4 (nó X14, itens 27–29; forks L3/L4, dono 08/10) ----

export const AnoParamSchema = z.object({ ano: z.coerce.number().int().min(2018).max(2100) }).strict();

/**
 * Item 27 — DASN-SIMEI, campo digitado (Res. CGSN 140 art. 109 III): contratação de empregado no ano. Receita total e
 * parcela sujeita ao ICMS (I–II) vêm do subrazão no GET.
 */
export const SimplesDasnDigitadoSchema = z.object({ contratouEmpregado: z.boolean() }).strict();
export type SimplesDasnDigitado = z.infer<typeof SimplesDasnDigitadoSchema>;
export const SimplesDasnUpsertSchema = z.object({ unitId: z.string().min(1), ...SimplesDasnDigitadoSchema.shape }).strict();
export type SimplesDasnUpsert = z.infer<typeof SimplesDasnUpsertSchema>;

/**
 * Item 28 — DEFIS, campos digitados do manual do PGDAS-D/DEFIS 9.4.3.1 (itens 2, 3, 7, 7.1–7.4 e 8). O sócio é
 * referenciado pelo contato (`contactId`), sem CPF/nome no registro (o portal pede; o FE resolve do cadastro). Lucro
 * contábil (item 4) e estoques (9.4.3.2 itens 1–2) vêm do razão no GET.
 * BE-INCR-SIMPLES-DEFIS-MANUAL (BRIEF §2, itens 1–5): ganhos de capital (item 1), exportação direta (item 5, F-DM-3 a:
 * digitada), via comercial exportadora (item 6), cotas em tesouraria (item 8, p. 93) e doações à campanha eleitoral
 * (item 9 — campos lidos nas telas da p. 92, F-DM-4 destravado 15/10). Manual versão 17/06/2025 (`fontes-oficiais/MANIFEST.md:56`).
 */
export const SimplesDefisSocioSchema = z
  .object({
    contactId: z.string().min(1),
    rendimentosIsentosCents: cents,
    rendimentosTributaveisCents: cents,
    participacaoBp: z.number().int().min(0).max(10000),
    irrfCents: cents,
  })
  .strict();
/** CNPJ alfanumérico, sem máscara, DV conferido (`lib/cnpj.ts`). */
const cnpjComDv = z.string().regex(CNPJ_REGEX, 'CNPJ = 14 posições sem máscara').refine(isValidCnpj, 'CNPJ com dígito verificador inválido');
/** Item 6 — CNPJ da comercial exportadora + valor. */
export const SimplesDefisExportacaoComercialSchema = z
  .object({
    cnpj: cnpjComDv,
    valorCents: cents.refine((v) => v > 0, 'valor da exportação via comercial exportadora deve ser maior que zero'),
  })
  .strict();
/** Item 9 (manual p. 92, telas 9.1–9.4) — as opções das listas, na ordem do portal. */
export const DEFIS_TIPOS_BENEFICIARIO = ['CANDIDATO', 'COMITE_FINANCEIRO', 'PARTIDO_POLITICO'] as const;
export const DEFIS_FORMAS_DOACAO = ['CHEQUE', 'OUTROS_TITULOS_CREDITO', 'TRANSFERENCIA_ELETRONICA', 'DEPOSITO_ESPECIE', 'DINHEIRO', 'BENS', 'SERVICOS'] as const;
/**
 * Item 9 — uma ocorrência de doação: 9.1 CNPJ beneficiário, 9.2 tipo, 9.3 forma, 9.4 valor. O mesmo CNPJ pode repetir
 * (uma linha por forma — dono, questionário 15/10). Aceito como o portal pede, sem bloqueio pela ADI 4650 (dono, 15/10):
 * a vedação é do ato de doar, não da declaração.
 */
export const SimplesDefisDoacaoEleitoralSchema = z
  .object({
    cnpj: cnpjComDv,
    tipoBeneficiario: z.enum(DEFIS_TIPOS_BENEFICIARIO),
    formaDoacao: z.enum(DEFIS_FORMAS_DOACAO),
    valorCents: cents.refine((v) => v > 0, 'valor da doação deve ser maior que zero'),
  })
  .strict();
export const SimplesDefisDigitadoSchema = z
  .object({
    empregadosInicio: z.number().int().min(0).max(1_000_000),
    empregadosFim: z.number().int().min(0).max(1_000_000),
    ganhosCapitalCents: cents,
    ganhosRendaVariavelCents: cents,
    exportacaoDiretaCents: cents,
    exportacaoComercial: z.array(SimplesDefisExportacaoComercialSchema).max(100),
    cotasTesourariaBp: z.number().int().min(0).max(10000),
    socios: z.array(SimplesDefisSocioSchema).max(100),
    doacoesEleitorais: z.array(SimplesDefisDoacaoEleitoralSchema).max(100),
  })
  .strict();
export type SimplesDefisDigitado = z.infer<typeof SimplesDefisDigitadoSchema>;
/**
 * BRIEF item 8 — leitura de `SimplesDeclaracaoAnual.dados` gravado antes dos campos novos: a falta vira 0 / [] SÓ aqui
 * (nunca `.default()` no schema de escrita — memória zod4-partial-aplica-default).
 */
export const SimplesDefisDigitadoLeituraSchema = SimplesDefisDigitadoSchema.extend({
  ganhosCapitalCents: cents.default(0),
  exportacaoDiretaCents: cents.default(0),
  exportacaoComercial: z.array(SimplesDefisExportacaoComercialSchema).max(100).default([]),
  cotasTesourariaBp: z.number().int().min(0).max(10000).default(0),
  doacoesEleitorais: z.array(SimplesDefisDoacaoEleitoralSchema).max(100).default([]),
});
export const SimplesDefisUpsertSchema = z
  .object({ unitId: z.string().min(1), ...SimplesDefisDigitadoSchema.shape })
  .strict()
  .refine((v) => v.socios.length === 0 || v.socios.reduce((s, x) => s + x.participacaoBp, 0) + v.cotasTesourariaBp === 10000, {
    message: 'a soma das participações dos sócios mais as cotas em tesouraria deve ser 100% (manual 9.4.3.1 itens 7.3 e 8)',
    path: ['socios'],
  })
  .refine((v) => new Set(v.exportacaoComercial.map((e) => e.cnpj)).size === v.exportacaoComercial.length, {
    message: 'cada comercial exportadora aparece uma vez só (manual 9.4.3.1 item 6)',
    path: ['exportacaoComercial'],
  });
export type SimplesDefisUpsert = z.infer<typeof SimplesDefisUpsertSchema>;

export type SimplesDasnSimeiView = {
  ano: number;
  prazo: string;
  receitaBrutaTotalCents: number;
  receitaIcmsCents: number;
  mesesSemSubrazao: string[];
  digitado: SimplesDasnDigitado | null;
};
/**
 * Item 4 — lucro contábil só se informa quando a ME/EPP escritura (F-DM-2 a: o razão do Luminaris é a escrituração) e o
 * lucro passa do limite do art. 145 § 1º (§ 2º). `limiteIsencaoCents = null` quando alguma atividade do ano não tem
 * presunção na tabela (F-DM-1 a); então `informar = true` e `avisos` diz por quê (dono, questionário 15/10).
 * `SEM_ESCRITURACAO` fica no contrato do BRIEF, mas pelo F-DM-2 (a) o serviço não o emite.
 */
export type SimplesDefisLucroContabil = {
  valorCents: number;
  limiteIsencaoCents: number | null;
  informar: boolean;
  calculo: 'PRESUNCAO' | 'SEM_ESCRITURACAO';
  avisos: string[];
};
export type SimplesDefisView = {
  ano: number;
  prazo: string;
  mesesApurados: string[];
  /** Item 4 + Res. CGSN 140 art. 145 §§ 1º–2º (F-DM-1 a, F-DM-5 a). */
  lucroContabil: SimplesDefisLucroContabil;
  estoqueInicialCents: number;
  estoqueFinalCents: number;
  digitado: SimplesDefisDigitado | null;
};
