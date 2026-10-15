import type { AlertaSimples, Apuracao, CodigoAlertaSimples } from '../../../lib/services/simples.service';
import { resolveErrorWithCode } from './resolveError';

/**
 * Helpers da grade do Simples (FE-INCR-SIMPLES PR-A, itens 2 e 6). A tela não decide regra fiscal: estado, selo e
 * ordem saem do que o BE devolveu.
 */

/** F-FS-3 (a): 3 GETs simultâneos — cada GET recalcula no BE (P4-2). */
export const CONCORRENCIA_ANO = 3;

/** Alertas que impedem o registro do DAS — espelho de `BLOQUEANTES` (SimplesApuracaoService.ts:61, item 20 do X14). */
export const BLOQUEANTES: readonly CodigoAlertaSimples[] = ['TIEOUT_DIVERGENTE', 'RBT12_INCOMPLETO', 'ATIVIDADE_SEM_ANEXO'];

export const ehBloqueante = (a: AlertaSimples) => BLOQUEANTES.includes(a.codigo);

/** As 12 competências AAAA-MM do ano. */
export function competenciasDoAno(ano: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
}

/** Roda `fn` sobre `itens` em ordem, com no máximo `limite` chamadas em voo (`fn` trata o próprio erro). */
export async function emLotes<T>(itens: readonly T[], limite: number, fn: (item: T) => Promise<void>): Promise<void> {
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const item = itens[proximo++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
}

export type EstadoCelula = 'carregando' | 'semPerfil' | 'naoRegulamentada' | 'calculado' | 'registrado' | 'erro';

/** BRIEF §3 `CelulaSimples` (+ `pendente` para o selo de `provisaoPendente` do item 2 e a mensagem do BE no erro). */
export interface CelulaSimples {
  competencia: string;
  estado: EstadoCelula;
  apuracao?: Apuracao;
  mensagem?: string;
  bloqueante: boolean;
  divergente: boolean;
  warning: boolean;
  pendente: boolean;
}

const vazia = (competencia: string, estado: EstadoCelula, mensagem?: string): CelulaSimples => ({
  competencia, estado, mensagem, bloqueante: false, divergente: false, warning: false, pendente: false,
});

export const celulaCarregando = (competencia: string) => vazia(competencia, 'carregando');

export function celulaDaApuracao(apuracao: Apuracao): CelulaSimples {
  return {
    competencia: apuracao.competencia,
    estado: apuracao.dasOficial ? 'registrado' : 'calculado',
    apuracao,
    bloqueante: apuracao.alertas.some(ehBloqueante),
    divergente: apuracao.divergenciaCents !== null && apuracao.divergenciaCents !== 0,
    warning: apuracao.alertas.some((a) => a.severity === 'WARNING'),
    pendente: !!apuracao.dasOficial?.provisaoPendente,
  };
}

/** 400 = perfil/declaração ausente (o texto do BE diz o quê); 422 `SIMPLES_REGRA_NAO_REGULAMENTADA`; o resto é erro. */
export function celulaDoErro(competencia: string, err: unknown, fallback: string): CelulaSimples {
  const { message, code } = resolveErrorWithCode(err, fallback);
  const status = err && typeof err === 'object' ? (err as { status?: unknown }).status : undefined;
  if (status === 422 && code === 'SIMPLES_REGRA_NAO_REGULAMENTADA') return vazia(competencia, 'naoRegulamentada', message);
  if (status === 400) return vazia(competencia, 'semPerfil', message);
  return vazia(competencia, 'erro', message);
}

/** Item 6: WARNING antes de INFO; dentro da mesma severidade, a ordem do BE. */
export function ordenarAlertas(alertas: readonly AlertaSimples[]): AlertaSimples[] {
  const peso = (a: AlertaSimples) => (a.severity === 'WARNING' ? 0 : 1);
  return alertas.map((a, i) => ({ a, i })).sort((x, y) => peso(x.a) - peso(y.a) || x.i - y.i).map(({ a }) => a);
}

/** F-FS-4 (a): milésimos de real com 3 casas, sem arredondar (o BE já devolve o valor final). */
export function formatMilesimos(milesimos: number): string {
  const neg = milesimos < 0;
  const abs = String(Math.abs(Math.trunc(milesimos))).padStart(4, '0');
  const inteiro = abs.slice(0, -3).replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '-' : ''}R$ ${inteiro},${abs.slice(-3)}`;
}

/** Pontos-base → percentual pt-BR sem zeros à direita (500 → "5%", 1250 → "12,5%"). */
export function formatBp(bp: number): string {
  const s = (bp / 100).toFixed(2).replace(/\.?0+$/, '');
  return `${s.replace('.', ',')}%`;
}

/** String decimal do BE ("12.3456") → pt-BR, sem reformatar casas ("12,3456"). */
export const decimalBR = (s: string) => s.replace('.', ',');
