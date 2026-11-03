/**
 * `DpPortResolver` — BE-INCR-DP-F0-F1 item 17 (PR-1), no núcleo.
 *
 * Para cada porta, usa a implementação do módulo que (1) está ativo na competência, (2) declara a porta em `provides` e
 * (3) tem implementação no mapa. Na falta de qualquer um dos três, usa o adaptador nulo com o motivo nomeado (F14 do
 * BRIEF) — por isso o núcleo roda com todos os opcionais desligados. O mapa de implementações é montado pelo
 * `lib/factory.ts`, o único ponto que importa `features/dp<Nome>/` (regra D1); no F0 ele nasce vazio.
 */
import type { Competencia } from '../models/competencia';
import { DP_MODULE_REGISTRY, DP_PORT_KEYS, type DpModuleKey, type DpModuleRegistry, type DpPortKey } from '../models/moduleRegistry';
import { NullJornadaApurada, type JornadaApuradaPort } from './JornadaApuradaPort';

export interface DpPorts {
  JORNADA_APURADA: JornadaApuradaPort;
}

export type DpPortImplementations = ReadonlyMap<DpModuleKey, Partial<DpPorts>>;
export type ModulosAtivosEm = (ownerUserId: string, competencia: Competencia) => Promise<readonly DpModuleKey[]>;

const NULOS: { [K in DpPortKey]: (motivo: string) => DpPorts[K] } = {
  JORNADA_APURADA: (motivo) => new NullJornadaApurada(motivo),
};

export class DpPortResolver {
  constructor(
    private readonly implementacoes: DpPortImplementations,
    private readonly modulosAtivosEm: ModulosAtivosEm,
    private readonly registry: DpModuleRegistry = DP_MODULE_REGISTRY,
  ) {}

  async resolver(ownerUserId: string, competencia: Competencia): Promise<DpPorts> {
    const ativos = new Set(await this.modulosAtivosEm(ownerUserId, competencia));
    const portas = {} as { [K in DpPortKey]: DpPorts[K] };
    for (const porta of DP_PORT_KEYS) portas[porta] = this.resolverPorta(porta, ativos, competencia);
    return portas;
  }

  private resolverPorta<K extends DpPortKey>(porta: K, ativos: ReadonlySet<DpModuleKey>, competencia: Competencia): DpPorts[K] {
    const provedores = Object.values(this.registry).filter((d) => d.provides.includes(porta));
    const ativo = provedores.find((d) => ativos.has(d.key));
    if (!ativo) {
      const nomes = provedores.length ? provedores.map((d) => d.key).join('/') : `nenhum submódulo provê ${porta}`;
      return NULOS[porta](provedores.length ? `${nomes} desligado na competência ${competencia}` : nomes);
    }
    const impl = this.implementacoes.get(ativo.key)?.[porta];
    if (!impl) return NULOS[porta](`${ativo.key} ativo na competência ${competencia}, sem implementação de ${porta}`);
    return impl as DpPorts[K];
  }
}
