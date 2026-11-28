import { linhasEmVigor, type LinhaLegal } from './legalParameter';

/**
 * BE-INCR-PAIS-NA-BORDA-F3 (fatia F3 do ADR-PAIS-NA-BORDA; BRIEF §4.1, itens 1–2) — o registro de formato de
 * `LegalParameter`. A plataforma não conhece nenhuma tabela: cada domínio, e dentro dele cada país, declara as suas
 * em `features/<domínio>/paises/<cc>/legalParameters/`, e o `lib/factory.ts` entrega a lista composta ao serviço
 * (composição fixa no código, `ADR-DOMAIN-MOTOR-rejected` §3; nada de `register()` na importação).
 *
 * Forks: F-F3-1 (a) o registro é o catálogo de nomes; F-F3-5 (a) a dependência vale em toda a vigência da linha;
 * F-F3-6 (a) o "fim obrigatório" é gancho da registração; F-F3-7 (a) um envelope só de mensagem; F-F3-8 (a) a
 * plataforma percorre as datas de corte e a regra responde por data (D-2026-11-26-PAIS-NA-BORDA-F3-FORKS).
 */

/** A linha como a proposta, a publicação e o CLI a enxergam (era `formatoLinha.ts`; sobe para a plataforma). */
export interface LinhaParaFormato {
  tabela: string;
  chave: string;
  discriminador?: string | null;
  valorInt?: number | null;
  valorTexto?: string | null;
  valorJson?: unknown;
  /** A checagem entre tabelas precisa da vigência da linha (§4.2). Sem ela, a checagem cruzada não roda. */
  vigenteDesde?: string;
  vigenteAte?: string | null;
}

export type LegalParameterValueKind = 'int' | 'text' | 'json';

/** O que a checagem cruzada lê NUMA data: as linhas em vigor (`linhasEmVigor`) das tabelas de `requires` naquela data. */
export interface FormatCheckContext {
  /** A data de corte (YYYY-MM-DD) em que a regra está sendo perguntada. */
  readonly date: string;
  /** Tabela fora de `requires` ⇒ erro de programação (throw). */
  rowsInForce(table: string): readonly LinhaLegal[];
}

/** As linhas das tabelas requeridas, como o serviço as leu (qualquer status; a plataforma aplica `linhasEmVigor`). */
export interface CrossTableRows {
  rowsOf(table: string): readonly LinhaLegal[];
}

export interface LegalParameterFormatRegistration {
  /** Nome da tabela (catálogo: F-F3-1 a). */
  table: string;
  /** Pasta de `features/` do dono do formato ('accounting', 'dp', …). */
  domain: string;
  /** ISO 3166-1 alfa-2 minúsculo ('br'); dado, sem branch no núcleo. */
  country: string;
  /** Qual valor a linha traz. Função quando a tabela mistura chaves de tipos diferentes. */
  value: LegalParameterValueKind | ((l: LinhaParaFormato) => LegalParameterValueKind);
  /** Erro em português, ou `null` quando a linha está no formato. */
  check(l: LinhaParaFormato): string | null;
  /** Tabelas que a checagem entre tabelas lê. Ausente = só a linha. */
  requires?: readonly string[];
  /** Checagem entre tabelas, perguntada uma vez por data de corte (F-F3-8 a). Erro em português ou `null`. */
  checkAgainst?(l: LinhaParaFormato, ctx: FormatCheckContext): string | null;
  /**
   * F-F3-6 (a) — a linha que a apuração lê como o FIM da lei exige `vigenteAte` (lacuna 03e4). Vale só para a linha que
   * entra (propose/publish): o CLI e a semente não o chamam, porque linha histórica aberta não é erro de dado.
   */
  endRequired?(l: Pick<LinhaParaFormato, 'chave' | 'discriminador'>): boolean;
}

export interface LegalParameterTableInfo {
  table: string;
  domain: string;
  country: string;
  value: LegalParameterValueKind | 'mixed';
}

export interface LegalParameterFormatRegistry {
  tables(): readonly LegalParameterTableInfo[];
  has(table: string): boolean;
  /** As tabelas que a checagem entre tabelas de `table` lê (vazio quando não há). */
  requiredTables(table: string): readonly string[];
  /** `null` = no formato. Sem `deps` (ou sem `vigenteDesde`), a checagem entre tabelas não roda. */
  formatError(l: LinhaParaFormato, deps?: CrossTableRows): string | null;
  /** F-F3-6 (a) — `null` quando a linha não precisa de fim ou o traz. */
  endRequiredError(l: Pick<LinhaParaFormato, 'tabela' | 'chave' | 'discriminador' | 'vigenteAte'>): string | null;
}

/** Composição inválida (duplicata, `requires` órfão, `country` ou `domain` fora do formato): erro de programação. */
export class LegalParameterFormatRegistryError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, LegalParameterFormatRegistryError.prototype);
    this.name = 'LegalParameterFormatRegistryError';
  }
}

const NOME_DO_VALOR: Record<LegalParameterValueKind, string> = { int: 'valorInt', text: 'valorTexto', json: 'valorJson' };

function temValor(l: LinhaParaFormato, k: LegalParameterValueKind): boolean {
  const v = k === 'int' ? l.valorInt : k === 'text' ? l.valorTexto : l.valorJson;
  return v !== undefined && v !== null;
}

function diaSeguinte(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const vigeEm = (r: LinhaLegal, dia: string) => r.vigenteDesde <= dia && (r.vigenteAte === null || dia <= r.vigenteAte);

/**
 * F-F3-5 (a) + F-F3-8 (a) — as datas em que o conjunto das linhas requeridas pode mudar dentro de
 * `[vigenteDesde, vigenteAte]` da linha: o próprio `vigenteDesde`, o início de cada versão em vigor e o dia seguinte ao
 * fim de cada uma. Entre duas datas de corte o conjunto não muda, então perguntar em cada corte cobre a vigência inteira.
 */
function datasDeCorte(l: Required<Pick<LinhaParaFormato, 'vigenteDesde'>> & Pick<LinhaParaFormato, 'vigenteAte'>, linhas: readonly LinhaLegal[]): string[] {
  const ate = l.vigenteAte ?? null;
  const dentro = (d: string) => d > l.vigenteDesde && (ate === null || d <= ate);
  const datas = new Set<string>([l.vigenteDesde]);
  for (const r of linhas) {
    if (dentro(r.vigenteDesde)) datas.add(r.vigenteDesde);
    if (r.vigenteAte !== null) {
      const depois = diaSeguinte(r.vigenteAte);
      if (dentro(depois)) datas.add(depois);
    }
  }
  return [...datas].sort();
}

export function createFormatRegistry(registrations: readonly LegalParameterFormatRegistration[]): LegalParameterFormatRegistry {
  const porTabela = new Map<string, LegalParameterFormatRegistration>();
  for (const r of registrations) {
    if (porTabela.has(r.table)) throw new LegalParameterFormatRegistryError(`Tabela ${r.table} registrada duas vezes (${porTabela.get(r.table)?.domain}, ${r.domain}).`);
    if (!/^[a-z]{2}$/.test(r.country)) throw new LegalParameterFormatRegistryError(`Tabela ${r.table}: country "${r.country}" fora de ISO 3166-1 alfa-2 minúsculo.`);
    if (r.domain.trim() === '') throw new LegalParameterFormatRegistryError(`Tabela ${r.table}: domain vazio.`);
    porTabela.set(r.table, r);
  }
  for (const r of registrations) {
    for (const req of r.requires ?? []) {
      if (!porTabela.has(req)) throw new LegalParameterFormatRegistryError(`Tabela ${r.table}: requires aponta para ${req}, que não está registrada.`);
    }
  }

  const tabelas: LegalParameterTableInfo[] = registrations.map((r) => ({
    table: r.table,
    domain: r.domain,
    country: r.country,
    value: typeof r.value === 'function' ? 'mixed' : r.value,
  }));

  return {
    tables: () => tabelas,
    has: (t) => porTabela.has(t),
    requiredTables: (t) => porTabela.get(t)?.requires ?? [],
    formatError(l, deps) {
      const r = porTabela.get(l.tabela);
      if (!r) return `${l.tabela}: tabela sem formato registrado.`;
      const valor = typeof r.value === 'function' ? r.value(l) : r.value;
      if (!temValor(l, valor)) return `${l.tabela}: o valor desta tabela é ${NOME_DO_VALOR[valor]}.`;
      const erro = r.check(l);
      if (erro) return `${l.tabela}/${l.chave}: ${erro}.`;
      if (!deps || !r.checkAgainst || l.vigenteDesde === undefined) return null;

      const requeridas = r.requires ?? [];
      const emVigor = new Map(requeridas.map((t) => [t, linhasEmVigor(deps.rowsOf(t))]));
      const desde = l.vigenteDesde;
      for (const dia of datasDeCorte({ vigenteDesde: desde, vigenteAte: l.vigenteAte }, [...emVigor.values()].flat())) {
        const ctx: FormatCheckContext = {
          date: dia,
          rowsInForce(table) {
            const linhas = emVigor.get(table);
            if (!linhas) throw new LegalParameterFormatRegistryError(`Tabela ${l.tabela}: checkAgainst leu ${table}, fora de requires.`);
            return linhas.filter((x) => vigeEm(x, dia));
          },
        };
        const cruzado = r.checkAgainst(l, ctx);
        if (cruzado) return `${l.tabela}/${l.chave}: ${cruzado} (em ${dia}).`;
      }
      return null;
    },
    endRequiredError(l) {
      const r = porTabela.get(l.tabela);
      if (!r?.endRequired?.(l) || (l.vigenteAte !== undefined && l.vigenteAte !== null)) return null;
      return `${l.tabela}/${l.chave}: vigenteAte é obrigatório — a apuração lê o fim da lei desta linha; sem ele a publicação derrubaria o cálculo de toda a plataforma.`;
    },
  };
}
