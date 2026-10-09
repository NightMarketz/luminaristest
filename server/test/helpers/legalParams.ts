/**
 * BE-INCR-LEGAL-PARAMS PR-1 — as linhas que a migração semeia, lidas do MESMO arquivo (`prisma/data/
 * legal_parameters_v1.sql`) para os testes unitários dos cálculos (sem banco). Uma fonte só: o teste de igualdade
 * `legalParameterSeed.test.ts` garante que o `migration.sql` carrega este texto.
 */
import fs from 'fs';
import type { LegalParameter } from 'generated/prisma';
import path from 'path';
import type { LinhaLegal } from '@/features/legalParameters/models/legalParameter';
import { tabelaApuracaoDe, type TabelaApuracao } from '@/features/accounting/models/taxAssessmentParams';
import { razaoCreditoPisCofins, tabelaPisCofinsDe, type ParametroPisCofins } from '@/features/accounting/models/pisCofinsParams';
import { tabelaPisCofinsItemDe } from '@/features/accounting/models/pisCofinsMonofasicoNcm';
import { cfopsImobilizadoDe } from '@/features/accounting/models/itemDestination';
import { matrizObrigacoesDe } from '@/features/accounting/models/obrigacoesPorRegime';
import { listaLc116De } from '@/features/accounting/models/lc116ListaNacional';
import { resolveEcdCodVerLc } from '@/lib/sped';

export const LEGAL_PARAMS_SEED_FILE = path.resolve(__dirname, '../../prisma/data/legal_parameters_v1.sql');
/** BE-INCR-SIMPLES-NACIONAL PR-1 — gerado por `scripts/gen-simples-anexos.mjs`; a migração carrega o mesmo texto. */
export const SIMPLES_SEED_FILE = path.resolve(__dirname, '../../prisma/data/legal_parameters_simples_v1.sql');
/** X14 PR-3 — a linha à mão da cota de gestão da parceria. */
export const SIMPLES_SEED_FILE_V2 = path.resolve(__dirname, '../../prisma/data/legal_parameters_simples_v2.sql');
/** X14 PR-4 — SALARIO_MINIMO 2024–2026 (decretos do Planalto). */
export const SIMPLES_SEED_FILE_V3 = path.resolve(__dirname, '../../prisma/data/legal_parameters_simples_v3.sql');
/** X14 PR-4 (F-PR4-13) — SIMPLES_LIMITE/MEI_TAC do transportador autônomo de cargas. */
export const SIMPLES_SEED_FILE_V4 = path.resolve(__dirname, '../../prisma/data/legal_parameters_simples_v4.sql');
export const SIMPLES_SEED_FILES = [SIMPLES_SEED_FILE, SIMPLES_SEED_FILE_V2, SIMPLES_SEED_FILE_V3, SIMPLES_SEED_FILE_V4];
/** PR-2: as tabelas restantes (exceto DEPRECIACAO_ANEXO_III, PR-3). Mesma regra de igualdade com o migration.sql. */
export const LEGAL_PARAMS_SEED_FILE_V2 = path.resolve(__dirname, '../../prisma/data/legal_parameters_v2.sql');
/** PR-3: DEPRECIACAO_ANEXO_III (cópia do fixture do Anexo III). Mesma regra de igualdade com o migration.sql. */
export const LEGAL_PARAMS_SEED_FILE_V3 = path.resolve(__dirname, '../../prisma/data/legal_parameters_v3.sql');
/** CSLL-LC224: linhas v4 de CSLL_ALIQUOTA (LC 224/2025). Mesma regra de igualdade com o migration.sql. */
export const LEGAL_PARAMS_SEED_FILE_V4 = path.resolve(__dirname, '../../prisma/data/legal_parameters_v4.sql');
/** BE-INCR-CSLL-BANCOS-Q1: linha v5 de CSLL_ALIQUOTA (código 3 antes de 01/04/2026). Mesma regra de igualdade. */
export const LEGAL_PARAMS_SEED_FILE_V5 = path.resolve(__dirname, '../../prisma/data/legal_parameters_v5.sql');
export const LEGAL_PARAMS_SEED_FILES = [LEGAL_PARAMS_SEED_FILE, LEGAL_PARAMS_SEED_FILE_V2, LEGAL_PARAMS_SEED_FILE_V3, LEGAL_PARAMS_SEED_FILE_V4, LEGAL_PARAMS_SEED_FILE_V5];

type Valor = string | number | null;

/** Tokens de uma lista SQL `(a, 'b', NULL, 1)` — strings com `''`, NULL, inteiros e palavras (CURRENT_TIMESTAMP). */
function tokens(lista: string): Valor[] {
  const out: Valor[] = [];
  let i = 0;
  while (i < lista.length) {
    const c = lista[i];
    if (c === ' ' || c === ',') {
      i++;
    } else if (c === "'") {
      let s = '';
      i++;
      for (;;) {
        if (lista[i] === "'" && lista[i + 1] === "'") {
          s += "'";
          i += 2;
        } else if (lista[i] === "'") {
          i++;
          break;
        } else s += lista[i++];
      }
      out.push(s);
    } else if (c === '"') {
      const fim = lista.indexOf('"', i + 1);
      out.push(lista.slice(i + 1, fim));
      i = fim + 1;
    } else {
      let w = '';
      while (i < lista.length && lista[i] !== ',' && lista[i] !== ' ') w += lista[i++];
      out.push(w === 'NULL' ? null : /^-?\d+$/.test(w) ? Number(w) : w);
    }
  }
  return out;
}

export function legalParamsSeedRows(arquivos: string | readonly string[] = LEGAL_PARAMS_SEED_FILES): (LinhaLegal & { fonteUrl: string | null; fonteSha256: string | null; createdAt: Date })[] {
  return (typeof arquivos === 'string' ? [arquivos] : arquivos).flatMap((f) => fs.readFileSync(f, 'utf8').split(/\r?\n/)
    .filter((l) => l.startsWith('INSERT'))
    .map((l) => {
      const m = /^INSERT OR IGNORE INTO "legal_parameters" \((.*)\) VALUES \((.*)\);$/.exec(l);
      if (!m) throw new Error(`${path.basename(f)}: linha fora do formato: ${l.slice(0, 80)}`);
      const cols = tokens(m[1]) as string[];
      const vals = tokens(m[2]);
      const r = Object.fromEntries(cols.map((c, k) => [c, vals[k]])) as Record<string, Valor>;
      return {
        id: r.id as string,
        tabela: r.tabela as string,
        chave: r.chave as string,
        discriminador: r.discriminador as string | null,
        valorInt: r.valorInt as number | null,
        valorTexto: r.valorTexto as string | null,
        valorJson: r.valorJson as string | null,
        fonte: r.fonte as string,
        // PR-3: a lista de taxas (Anexo III de plataforma) mostra a fonte e a data da linha.
        fonteUrl: r.fonteUrl as string | null,
        fonteSha256: r.fonteSha256 as string | null,
        createdAt: new Date('2026-10-07T00:00:00.000Z'),
        vigenteDesde: r.vigenteDesde as string,
        vigenteAte: r.vigenteAte as string | null,
        status: r.status as string,
        supersedesId: r.supersedesId as string | null,
      };
    }));
}

/** Fotografia da semente (o que `LegalParameterService.fotografia` devolve do banco recém-migrado), só das tabelas pedidas. */
export function fotografiaSemente(tabelas?: readonly string[]): LinhaLegal[] {
  const rows = legalParamsSeedRows();
  return tabelas ? rows.filter((r) => tabelas.includes(r.tabela)) : rows;
}

/** Fotografia TAX_ASSESSMENT + CSLL_ALIQUOTA da semente — o que o serviço passa às funções puras do X7. */
export function tabelaApuracaoSemente(): TabelaApuracao {
  return tabelaApuracaoDe(legalParamsSeedRows());
}

/** Fotografia PIS_COFINS da semente — o que o serviço passa à função pura do X8. */
export function tabelaPisCofinsSemente(): readonly ParametroPisCofins[] {
  return tabelaPisCofinsDe(legalParamsSeedRows());
}

/** Dublê do `LegalParameterService` para testes unitários de serviço: a fotografia é a semente da migração. */
export const legalParamsSemente = {
  // A semente tem só os campos de `LinhaLegal`; os serviços só leem esses (o resto do model é auditoria/publicação).
  fotografia: async (tabelas: readonly string[]): Promise<LegalParameter[]> => fotografiaSemente(tabelas) as unknown as LegalParameter[],
};

// ─── BE-INCR-LEGAL-PARAMS PR-2 — as fotografias que os serviços passam às funções puras, montadas da semente ──────
// (datas ≥ 2025-01-01: emenda §9 L-10 — as tabelas sem vigência em código começam no 1º ano apurável).
export const LEGAIS_SEMENTE: readonly LinhaLegal[] = fotografiaSemente();
export const FERIADOS_SEMENTE: readonly LinhaLegal[] = fotografiaSemente(['FERIADO_NACIONAL']);
export const TABELA_ITEM_SEMENTE = tabelaPisCofinsItemDe(LEGAIS_SEMENTE, '2026-01-01');
export const CFOPS_IMOBILIZADO_SEMENTE = cfopsImobilizadoDe(LEGAIS_SEMENTE, '2026-01-01');
export const RAZAO_CREDITO_SEMENTE = razaoCreditoPisCofins(LEGAIS_SEMENTE, '2026-01-31');
export const MATRIZ_OBRIGACOES_SEMENTE = matrizObrigacoesDe(LEGAIS_SEMENTE, '2026-12-31');
export const LISTA_LC116_SEMENTE = listaLc116De(LEGAIS_SEMENTE, '2026-01-01');
export const COD_VER_ECD_SEMENTE = resolveEcdCodVerLc(LEGAIS_SEMENTE, '2025-12-31');
