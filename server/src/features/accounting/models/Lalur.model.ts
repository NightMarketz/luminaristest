import catalogJson from '../fixtures/ecf-l12-linhas.json';

/**
 * e-Lalur / e-Lacs domain constants (BE-INCR-SPED-ECF-FASE3B, Fork 4→(b); ADR-INCR-SPED-ECF-FASE3
 * EMENDA 2026-09-11 (2ª), D-M1..D-M5). The Prisma row types (`LalurEntry`, `LalurParteBAccount`) come
 * from `generated/prisma`; this file owns the enum-like unions, the audit event keys and the READ
 * access to the catalog fixture (`ecf-l12-linhas.json`, derived from the RFB XLSX by
 * `scripts/ecf-tabelas-dinamicas-to-catalog.mjs` — item 10). No line code is typed here.
 */

/** `livro` discriminator: which ECF register a LalurEntry feeds (BRIEF §2.1). */
export const LALUR_LIVROS = ['lalur', 'lacs', 'n500', 'n630', 'n670'] as const;
export type LalurLivro = (typeof LALUR_LIVROS)[number];

/** Livros whose lines carry M300/M350 fields (IND_RELACAO, filhos M305/M310) — D-M3. */
export const LALUR_LIVROS_PARTE_A = ['lalur', 'lacs'] as const;
export const isParteALivro = (livro: string): livro is 'lalur' | 'lacs' =>
  (LALUR_LIVROS_PARTE_A as readonly string[]).includes(livro);

/** Fork 5→(a) trimestral: the four PER_APUR windows (L030/M030/N030). */
export const LALUR_QUARTERS = ['T01', 'T02', 'T03', 'T04'] as const;
export type LalurQuarter = (typeof LALUR_QUARTERS)[number];

/** M300.IND_RELACAO (Manual p.245): 1 Parte B · 2 conta contábil · 3 ambas · 4 sem relacionamento. */
export const LALUR_IND_RELACAO = ['1', '2', '3', '4'] as const;
export type LalurIndRelacao = (typeof LALUR_IND_RELACAO)[number];

/** M010.COD_TRIBUTO (p.237): I = IRPJ (e-Lalur, M300/M305) · C = CSLL (e-Lacs, M350/M355). */
export const LALUR_TRIBUTOS = ['I', 'C'] as const;
export type LalurTributo = (typeof LALUR_TRIBUTOS)[number];

/** M010.IND_VL_SALDO_INI / M305.IND_VL_CTA (p.237/p.250). */
export const LALUR_IND_SALDO = ['D', 'C'] as const;

/** livro → tributo da conta da Parte B que ele pode relacionar (REGRA_PARTE_B_PARTE_A, p.237/p.250). */
export const LIVRO_TRIBUTO: Record<'lalur' | 'lacs', LalurTributo> = { lalur: 'I', lacs: 'C' };

/** Audit event keys (T8 — every state change auditable). Payloads are id/code/cents only — never `histLancamento`. */
export const LALUR_ENTRY_CREATED = 'lalur.entry_created';
export const LALUR_ENTRY_UPDATED = 'lalur.entry_updated';
export const LALUR_ENTRY_ARCHIVED = 'lalur.entry_archived';
export const LALUR_PARTE_B_CREATED = 'lalur.parte_b_created';
export const LALUR_PARTE_B_UPDATED = 'lalur.parte_b_updated';
export const LALUR_PARTE_B_ARCHIVED = 'lalur.parte_b_archived';

// ─── Catálogo das Tabelas Dinâmicas (Leiaute 12) ────────────────────────────

/** One row of a Tabela Dinâmica sheet (M300A/M350A/N500/N630A/N670). */
export interface EcfLinhaCatalogo {
  codigo: string;
  descricao: string;
  /** E = entrada (nossa) · CNA/CA = calculada pelo PVA · R = rótulo. Só `E` é aceita (item 9). */
  tipo: 'E' | 'CNA' | 'CA' | 'R';
  /** M300/M350.TIPO_LANCAMENTO derivado da coluna TIPO LANÇ (p.245: A|E|P|L); null nas abas N. */
  tipoLanc: 'A' | 'E' | 'P' | 'L' | null;
  dtIni: string | null; // ISO YYYY-MM-DD
  dtFim: string | null;
}

/** One row of the PARTEB_PADRAO sheet — M010.COD_PB_RFB universe (lacuna 7). */
export interface EcfParteBPadrao {
  codigo: string;
  descricao: string;
  tributo: 'I' | 'C' | 'A'; // A = ambos
  dtIni: string | null;
  dtFim: string | null;
}

interface EcfCatalog {
  origem: string;
  sha256: string;
  leiaute: string;
  abas: Record<'M300A' | 'M350A' | 'N500' | 'N630A' | 'N670', EcfLinhaCatalogo[]> & {
    PARTEB_PADRAO: EcfParteBPadrao[];
  };
}

export const ECF_L12_CATALOG = catalogJson as unknown as EcfCatalog;

/** livro → aba do XLSX (BRIEF §2.4). */
export const LIVRO_ABA: Record<LalurLivro, keyof Omit<EcfCatalog['abas'], 'PARTEB_PADRAO'>> = {
  lalur: 'M300A',
  lacs: 'M350A',
  n500: 'N500',
  n630: 'N630A',
  n670: 'N670',
};

const byAba = new Map<string, Map<string, EcfLinhaCatalogo>>();
/**
 * Códigos que aparecem MAIS DE UMA VEZ na mesma aba (anomalia da planilha oficial — em 28/05/2026 só
 * `M350A/13`, duas linhas `E` abertas com descrições diferentes). Lookup = PRIMEIRA ocorrência na ordem
 * da planilha (determinístico; para `13` é o texto igual ao de M300A/13). Registrado como lacuna de
 * spec no relatório da sessão; o teste do catálogo fixa a lista para que uma planilha nova a mova à vista.
 */
export const ECF_L12_CODIGOS_DUPLICADOS: string[] = [];
for (const aba of ['M300A', 'M350A', 'N500', 'N630A', 'N670'] as const) {
  const m = new Map<string, EcfLinhaCatalogo>();
  for (const r of ECF_L12_CATALOG.abas[aba]) {
    if (m.has(r.codigo)) ECF_L12_CODIGOS_DUPLICADOS.push(`${aba}/${r.codigo}`);
    else m.set(r.codigo, r);
  }
  byAba.set(aba, m);
}
const parteBPadrao = new Map(ECF_L12_CATALOG.abas.PARTEB_PADRAO.map((r) => [r.codigo, r]));

/** Catalog row for (livro, codigo), or undefined when the code is not in that sheet. */
export function findLinha(livro: LalurLivro, codigo: string): EcfLinhaCatalogo | undefined {
  return byAba.get(LIVRO_ABA[livro])?.get(codigo);
}

/** Every catalog row of a livro (tests iterate CNA/CA to prove they are never emitted — item 14). */
export function linhasDoLivro(livro: LalurLivro): EcfLinhaCatalogo[] {
  return ECF_L12_CATALOG.abas[LIVRO_ABA[livro]];
}

/** PARTEB_PADRAO row for a COD_PB_RFB, or undefined. */
export function findParteBPadrao(codPbRfb: string): EcfParteBPadrao | undefined {
  return parteBPadrao.get(codPbRfb);
}

/**
 * Whether a catalog row is in force for the calendar `year`: DT_INI ≤ 31/12/year and (DT_FIM empty or
 * DT_FIM ≥ 01/01/year). Dates are ISO strings — a lexicographic compare on `YYYY-…` is exact.
 */
export function vigenteNoAno(row: { dtIni: string | null; dtFim: string | null }, year: number): boolean {
  if (row.dtIni && row.dtIni > `${year}-12-31`) return false;
  if (row.dtFim && row.dtFim < `${year}-01-01`) return false;
  return true;
}
