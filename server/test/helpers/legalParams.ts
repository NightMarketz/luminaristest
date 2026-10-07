/**
 * BE-INCR-LEGAL-PARAMS PR-1 — as linhas que a migração semeia, lidas do MESMO arquivo (`prisma/data/
 * legal_parameters_v1.sql`) para os testes unitários dos cálculos (sem banco). Uma fonte só: o teste de igualdade
 * `legalParameterSeed.test.ts` garante que o `migration.sql` carrega este texto.
 */
import fs from 'fs';
import path from 'path';
import type { LinhaLegal } from '@/features/legalParameters/models/legalParameter';
import { tabelaApuracaoDe, type TabelaApuracao } from '@/features/accounting/models/taxAssessmentParams';
import { tabelaPisCofinsDe, type ParametroPisCofins } from '@/features/accounting/models/pisCofinsParams';

export const LEGAL_PARAMS_SEED_FILE = path.resolve(__dirname, '../../prisma/data/legal_parameters_v1.sql');
/** PR-2: as tabelas restantes (exceto DEPRECIACAO_ANEXO_III, PR-3). Mesma regra de igualdade com o migration.sql. */
export const LEGAL_PARAMS_SEED_FILE_V2 = path.resolve(__dirname, '../../prisma/data/legal_parameters_v2.sql');
export const LEGAL_PARAMS_SEED_FILES = [LEGAL_PARAMS_SEED_FILE, LEGAL_PARAMS_SEED_FILE_V2];

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

export function legalParamsSeedRows(): LinhaLegal[] {
  return LEGAL_PARAMS_SEED_FILES.flatMap((f) => fs.readFileSync(f, 'utf8').split(/\r?\n/)
    .filter((l) => l.startsWith('INSERT'))
    .map((l) => {
      const m = /^INSERT OR IGNORE INTO "legal_parameters" \((.*)\) VALUES \((.*)\);$/.exec(l);
      if (!m) throw new Error(`legal_parameters_v*.sql: linha fora do formato: ${l.slice(0, 80)}`);
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
