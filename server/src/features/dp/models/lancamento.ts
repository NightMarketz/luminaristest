/**
 * Lançamento informado da competência — BE-INCR-DP-F2 itens 16–19 (PR-1). Funções puras sobre o catálogo de rubricas
 * (G4); a precedência MANUAL × MODULO (item 19) vira pendência, nunca soma silenciosa.
 */
import type { JornadaApurada } from '../ports/JornadaApuradaPort';
import { primeiroDia, ultimoDia, type Competencia } from './competencia';
import { dpValidationError } from './erros';
import type { DpPendenciaFolha } from './folha/pendencias';
import { DP_RUBRICAS } from './rubricas/catalogo';

export type RubricaInformada = Extract<(typeof DP_RUBRICAS)[number], { calculo: 'INFORMADO' }>['codigo'];

/**
 * Item 16 — o que cada rubrica `INFORMADO` recebe: minutos (`quantidadeMin`) ou centavos (`valorCents`), exatamente um.
 * `as const satisfies` sobre o catálogo: rubrica INFORMADO sem unidade não compila. FALTAS em minutos (a falta do dia
 * inteiro = os minutos do dia da escala; leitura registrada no PR).
 */
export const LANCAMENTO_UNIDADE = {
  HORA_EXTRA_50: 'MINUTOS',
  HORA_EXTRA_100: 'MINUTOS',
  ADICIONAL_NOTURNO: 'MINUTOS',
  FALTAS: 'MINUTOS',
  COMISSAO: 'VALOR',
} as const satisfies Record<RubricaInformada, 'MINUTOS' | 'VALOR'>;

/** Item 19 — as rubricas de jornada (HE, noturno, faltas): as que o `DP-PONTO` apura. */
export const RUBRICAS_DE_JORNADA = ['HORA_EXTRA_50', 'HORA_EXTRA_100', 'ADICIONAL_NOTURNO', 'FALTAS'] as const satisfies readonly RubricaInformada[];

export const LANCAMENTO_ORIGENS = ['MANUAL', 'MODULO'] as const;
export type LancamentoOrigem = (typeof LANCAMENTO_ORIGENS)[number];

export interface DadosLancamento {
  rubrica: string;
  competencia: Competencia;
  quantidadeMin: number | null;
  valorCents: bigint | null;
}
export interface VinculoDoLancamento {
  categoria: string;
  dataInicio: string;
  dataTermino: string | null;
}

const invalido = (campo: string, msg: string) => dpValidationError('DP_LANCAMENTO_INVALIDO', msg, { campo });

/**
 * Item 17 — a rubrica existe, é `INFORMADO` e aplica à categoria do vínculo; a competência cruza o vínculo
 * (`dataInicio`..`dataTermino`); vem só a quantidade da unidade da rubrica, e maior que zero. Erro:
 * 400 `DP_LANCAMENTO_INVALIDO` com o campo em `details.campo`.
 */
export function assertLancamentoValido(l: DadosLancamento, v: VinculoDoLancamento): void {
  const r = DP_RUBRICAS.find((x) => x.codigo === l.rubrica);
  if (!r) throw invalido('rubrica', `A rubrica ${l.rubrica} não existe no catálogo do DP.`);
  if (r.calculo !== 'INFORMADO') throw invalido('rubrica', `A rubrica ${l.rubrica} é ${r.calculo}, não INFORMADO: o motor a calcula.`);
  if (!(r.categorias as readonly string[]).includes(v.categoria)) {
    throw invalido('rubrica', `A rubrica ${l.rubrica} não se aplica à categoria ${v.categoria} do vínculo.`);
  }
  if (ultimoDia(l.competencia) < v.dataInicio || (v.dataTermino !== null && primeiroDia(l.competencia) > v.dataTermino)) {
    throw invalido('competencia', `A competência ${l.competencia} está fora do vínculo (${v.dataInicio} a ${v.dataTermino ?? 'em aberto'}).`);
  }
  const unidade = LANCAMENTO_UNIDADE[r.codigo as RubricaInformada];
  const [campo, outro] = unidade === 'MINUTOS' ? (['quantidadeMin', 'valorCents'] as const) : (['valorCents', 'quantidadeMin'] as const);
  if (l[outro] !== null) throw invalido(outro, `A rubrica ${l.rubrica} se informa em ${campo}, não em ${outro}.`);
  const q = l[campo];
  if (q === null || q <= 0) throw invalido(campo, `${campo} tem de ser maior que zero para a rubrica ${l.rubrica}.`);
}

/** Item 18 — o lançamento manual vivo que a precedência compara com o que o ponto apurou. */
export interface LancamentoParaPrecedencia {
  id: string;
  rubrica: string;
  origem: LancamentoOrigem;
}

/**
 * Item 19 — com o `DP-PONTO` ativo na competência devolvendo itens (`origem = MODULO`, lista não vazia), cada lançamento
 * `MANUAL` de rubrica de jornada da mesma competência vira pendência bloqueante `LANCAMENTO_DUPLICADO_COM_PONTO`. Ponto
 * nulo ou sem itens ⇒ nenhuma pendência (o manual vale).
 */
export function conflitosComPonto(
  vinculoId: string,
  competencia: Competencia,
  lancamentos: readonly LancamentoParaPrecedencia[],
  ponto: JornadaApurada,
): DpPendenciaFolha[] {
  if (ponto.origem !== 'MODULO' || ponto.itens.length === 0) return [];
  return lancamentos
    .filter((l) => l.origem === 'MANUAL' && (RUBRICAS_DE_JORNADA as readonly string[]).includes(l.rubrica))
    .map((l) => ({
      codigo: 'LANCAMENTO_DUPLICADO_COM_PONTO' as const,
      vinculoId,
      bloqueante: true,
      dado: `${l.rubrica} (lançamento ${l.id})`,
      mensagem: `O lançamento manual de ${l.rubrica} em ${competencia} duplica o que o DP-PONTO apurou; apague um dos dois.`,
    }));
}

