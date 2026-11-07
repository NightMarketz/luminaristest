/**
 * Porta `JORNADA_APURADA` — BE-INCR-DP-F0-F1 item 16 (PR-1). A única porta do F0 (D-3 do BRIEF): o exemplo da spec §3
 * regra 3, ligado ao gate legal do ponto. Provida pelo opcional `DP-PONTO`; desligado, o núcleo recebe o adaptador nulo
 * com o motivo nomeado (molde `DfeDisabledEmissor`: "nunca silêncio").
 */
import type { Competencia } from '../models/competencia';
import type { RubricaCodigo } from '../models/rubricas/catalogo';

/**
 * BE-INCR-DP-F2 item 18 (PR-1) — o formato do item: o mesmo do lançamento `MODULO` (rubrica de jornada, minutos e, se o
 * ponto souber, o dia). O `NullJornadaApurada` segue devolvendo lista vazia com motivo.
 */
export interface JornadaApuradaItem {
  /** Rubrica de jornada (`RUBRICAS_DE_JORNADA` em models/lancamento.ts). */
  rubrica: RubricaCodigo;
  quantidadeMin: number;
  /** YYYY-MM-DD, dentro da competência. */
  data?: string;
}

export interface JornadaApurada {
  origem: 'NULO' | 'MODULO';
  motivo?: string;
  itens: readonly JornadaApuradaItem[];
}

export interface JornadaApuradaPort {
  apurar(ownerUserId: string, vinculoId: string, competencia: Competencia): Promise<JornadaApurada>;
}

export class NullJornadaApurada implements JornadaApuradaPort {
  /** Sem `motivo`, o padrão é "DP-PONTO desligado na competência <c>". */
  constructor(private readonly motivo?: string) {}

  async apurar(_ownerUserId: string, _vinculoId: string, competencia: Competencia): Promise<JornadaApurada> {
    return { origem: 'NULO', motivo: this.motivo ?? `DP-PONTO desligado na competência ${competencia}`, itens: [] };
  }
}
