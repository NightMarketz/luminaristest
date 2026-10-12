import type { TaxAssessment, TributoApuracao } from '../../../lib/services/taxAssessments.service';

/** Colunas da grade (F-3 a: período × tributo; F-2 — X7 + X8 nesta fatia, PR-1 da §3 do BRIEF). */
export const TRIBUTOS_GRADE: readonly TributoApuracao[] = ['IRPJ', 'CSLL', 'PIS', 'COFINS'];

/** Ordem das linhas: trimestres, meses da estimativa, ajuste anual (A00 fecha o ano), meses do PIS/Cofins. */
const ORDEM_PERIODO = [
  'T01', 'T02', 'T03', 'T04',
  'A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A00',
  'M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'M12',
];

export interface CelulaTributo {
  /** A viva (CONFIRMED) do período; sem viva, a substituída mais recente (a cascata deixou o período a reconfirmar). */
  atual: TaxAssessment;
  versoes: TaxAssessment[];
  /** F-5 (a): aviso em QUALQUER versão, viva ou substituída. */
  aviso: boolean;
  pendente: boolean;
}

/** Espelho de `CelulaApuracao` (BRIEF §2). */
export interface CelulaApuracao {
  periodo: string;
  tributos: Partial<Record<TributoApuracao, CelulaTributo>>;
  aviso: boolean;
  pendente: boolean;
}

const porConfirmacao = (a: TaxAssessment, b: TaxAssessment) => a.confirmedAt.localeCompare(b.confirmedAt) || a.id.localeCompare(b.id);

/**
 * Monta a grade a partir da lista do ano. Só aparecem os períodos com apuração gravada (BRIEF §5: "a grade mostra
 * vazio até a primeira prévia ou confirmação").
 */
export function montarGrade(linhas: TaxAssessment[]): CelulaApuracao[] {
  const grupos = new Map<string, Map<TributoApuracao, TaxAssessment[]>>();
  for (const l of linhas) {
    const porTributo = grupos.get(l.periodo) ?? new Map<TributoApuracao, TaxAssessment[]>();
    porTributo.set(l.tributo, [...(porTributo.get(l.tributo) ?? []), l]);
    grupos.set(l.periodo, porTributo);
  }
  const rank = (p: string) => {
    const i = ORDEM_PERIODO.indexOf(p);
    return i === -1 ? ORDEM_PERIODO.length : i;
  };
  return Array.from(grupos.keys())
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((periodo): CelulaApuracao => {
      const tributos: Partial<Record<TributoApuracao, CelulaTributo>> = {};
      grupos.get(periodo)?.forEach((vs, tributo) => {
        const versoes = [...vs].sort(porConfirmacao);
        const viva = versoes.find((v) => v.status === 'CONFIRMED');
        tributos[tributo] = {
          atual: viva ?? versoes[versoes.length - 1],
          versoes,
          aviso: versoes.some((v) => !!v.avisoParametroLegal),
          pendente: versoes.some((v) => v.provisaoPendente),
        };
      });
      const cels = Object.values(tributos);
      return { periodo, tributos, aviso: cels.some((c) => c.aviso), pendente: cels.some((c) => c.pendente) };
    });
}

/** Formata centavos em string (BigInt no BE) como BRL sem passar por `number` (sem perda acima de 2^53). */
export function formatCentsStr(cents: string): string {
  if (!/^-?\d+$/.test(cents)) return cents;
  const neg = cents.startsWith('-');
  const abs = (neg ? cents.slice(1) : cents).padStart(3, '0');
  const inteiro = abs.slice(0, -2).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}R$ ${inteiro},${abs.slice(-2)}`;
}
