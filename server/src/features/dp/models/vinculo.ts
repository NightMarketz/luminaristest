/**
 * Regras puras do trabalhador e do vínculo do DP — BE-INCR-DP-F0-F1 itens 39–45 e 47 (PR-4).
 *
 * Datas date-only (`YYYY-MM-DD`): a comparação é de string, como em `vigencia.ts`.
 */
import { createHmac } from 'crypto';
import type { KeyringSpec } from '../../../lib/secretBox';
import { dpValidationError } from './erros';
import { versaoVigente, type Vigencia } from './vigencia';

/** Item 40 (F-DPB-1, dono, 02/11: "101+103+901+723"). */
export const CATEGORIAS_NUCLEO = ['101', '103', '901', '723'] as const;
export type CategoriaNucleo = (typeof CATEGORIAS_NUCLEO)[number];

/**
 * Domínio `undSalFixo` do S-2200 (`2200_vinculo_infoContrato_remuneracao_undSalFixo`), leiaute S-1.3 [D09
 * `pesquisas-legais/brief-pes4-f0-f1/docs/D09_index-html.html`, linha 15913], transcrito no PR como o BRIEF manda (item 43).
 */
export const UND_SAL_FIXO = {
  '1': 'Por hora',
  '2': 'Por dia',
  '3': 'Por semana',
  '4': 'Por quinzena',
  '5': 'Por mês',
  '6': 'Por tarefa',
  '7': 'Não aplicável - Salário exclusivamente variável',
} as const;
export const UND_SAL_FIXO_CODIGOS = Object.keys(UND_SAL_FIXO) as [keyof typeof UND_SAL_FIXO, ...(keyof typeof UND_SAL_FIXO)[]];

export type NaturezaVinculo = 'EMPREGO' | 'TSVE';

/** Item 39 — natureza derivada do `evento` da categoria na ESOCIAL_CATEGORIA (item 23): S-2200 ⇒ EMPREGO; S-2300 ⇒ TSVE. */
export function naturezaDoEvento(evento: string | null): NaturezaVinculo | null {
  if (evento === 'S-2200') return 'EMPREGO';
  if (evento === 'S-2300') return 'TSVE';
  return null;
}

/** Anos completos em `data` de quem nasceu em `nascimento` (o aniversário conta no próprio dia). */
export function idadeEm(nascimento: string, data: string): number {
  const anos = Number(data.slice(0, 4)) - Number(nascimento.slice(0, 4));
  return data.slice(5) >= nascimento.slice(5) ? anos : anos - 1;
}

/** Véspera de uma data date-only. */
export function vespera(data: string): string {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface DadosIdade {
  categoria: CategoriaNucleo;
  nascimento: string;
  pcd: boolean;
  dataInicio: string;
  dataTermino: string | null;
}

/** Meses completos de `de` até `ate` (date-only); o dia de `ate` igual ao de `de` fecha o mês. */
export function mesesCompletos(de: string, ate: string): number {
  const m = (Number(ate.slice(0, 4)) - Number(de.slice(0, 4))) * 12 + (Number(ate.slice(5, 7)) - Number(de.slice(5, 7)));
  return ate.slice(8) >= de.slice(8) ? m : m - 1;
}

/** Valor de regra com a fonte da linha (`regrasFolha.ValorRegra`): o número e o artigo vêm do dado (item 73). */
export interface RegraNumero {
  valor: number;
  fonte: string;
}

/**
 * BE-INCR-DP-F2 item 72 — as regras de idade e prazo que a categoria usa, lidas da `FOLHA_REGRA` na `dataInicio`
 * (`regrasIdadeDaCategoria`). 101 usa só `empregadoIdadeMin`; 103 as do aprendiz; 901 e 723 nenhuma.
 */
export interface RegrasIdade {
  empregadoIdadeMin?: RegraNumero;
  aprendizIdadeMin?: RegraNumero;
  aprendizIdadeMax?: RegraNumero;
  aprendizPrazoMaxMeses?: RegraNumero;
}

/** Quais chaves de `FOLHA_REGRA` a categoria pede (o serviço só lê estas; 901 e 723 não leem nada). */
export const CHAVES_IDADE_POR_CATEGORIA = {
  '101': ['EMPREGADO_IDADE_MIN'],
  '103': ['APRENDIZ_IDADE_MIN', 'APRENDIZ_IDADE_MAX', 'APRENDIZ_PRAZO_MAX_MESES'],
  '901': [],
  '723': [],
} as const satisfies Record<CategoriaNucleo, readonly string[]>;

const exigir = (r: RegraNumero | undefined, nome: string): RegraNumero => {
  if (!r) throw new Error(`assertIdadeEPrazo: regra ${nome} não foi lida para a categoria.`);
  return r;
};
const msg = (modelo: string, r: RegraNumero) => modelo.replace('{n}', String(r.valor)).replace('{fonte}', r.fonte);

/**
 * Itens 41 e 42 do F0+F1 — idade e prazo por categoria. 400 com `reason`. Desde o F2 PR-0R (item 72) os números vêm da
 * `FOLHA_REGRA` (valores iniciais: 16 e 14 anos, CF art. 7º XXXIII [F1-D12]; menos de 24 anos e 24 meses, CLT arts. 428
 * caput e § 3º e 433 [F1-D05]), e a mensagem leva o número e a fonte da linha (item 73).
 * - 103 (aprendiz): idade mínima completa em `dataInicio`; sem `pcd`, abaixo da máxima em `dataInicio` e `dataTermino`
 *   antes do aniversário da máxima [art. 433]; `dataTermino` obrigatória e no máximo `dataInicio` + prazo − 1 dia, salvo
 *   `pcd` [art. 428 § 3º].
 * - 101 (empregado geral): idade mínima completa em `dataInicio`.
 */
export function assertIdadeEPrazo(d: DadosIdade, regras: RegrasIdade): void {
  if (d.categoria === '101') {
    const min = exigir(regras.empregadoIdadeMin, 'EMPREGADO_IDADE_MIN');
    if (idadeEm(d.nascimento, d.dataInicio) < min.valor) {
      throw dpValidationError('DP_IDADE_MINIMA', msg('O empregado precisa ter {n} anos completos na admissão ({fonte}).', min));
    }
  }
  if (d.categoria !== '103') return;
  const min = exigir(regras.aprendizIdadeMin, 'APRENDIZ_IDADE_MIN');
  const max = exigir(regras.aprendizIdadeMax, 'APRENDIZ_IDADE_MAX');
  const prazo = exigir(regras.aprendizPrazoMaxMeses, 'APRENDIZ_PRAZO_MAX_MESES');
  if (idadeEm(d.nascimento, d.dataInicio) < min.valor) {
    throw dpValidationError('DP_APRENDIZ_IDADE', msg('O aprendiz precisa ter {n} anos completos na admissão ({fonte}).', min));
  }
  if (!d.pcd && idadeEm(d.nascimento, d.dataInicio) >= max.valor) {
    throw dpValidationError('DP_APRENDIZ_IDADE', msg('O aprendiz sem deficiência precisa ter menos de {n} anos na admissão ({fonte}).', max));
  }
  if (d.dataTermino === null) {
    throw dpValidationError('DP_APRENDIZ_PRAZO', msg('O contrato de aprendizagem exige data de término ({fonte}).', prazo));
  }
  if (d.pcd) return;
  if (idadeEm(d.nascimento, d.dataTermino) >= max.valor) {
    throw dpValidationError('DP_APRENDIZ_PRAZO', msg('O contrato de aprendizagem termina antes do aniversário de {n} anos ({fonte}).', max));
  }
  // dataTermino <= dataInicio + N meses − 1 dia ⟺ do início ao término há menos de N meses completos.
  if (mesesCompletos(d.dataInicio, d.dataTermino) >= prazo.valor) {
    throw dpValidationError('DP_APRENDIZ_PRAZO', msg('O contrato de aprendizagem dura no máximo {n} meses ({fonte}).', prazo));
  }
}

/**
 * Chaveiro da auditoria do DP (dono, chat, 2026-11-04: "Trocar por HMAC" + "Chaveiro próprio" + "Recusa com 503"):
 * `DP_AUDIT_KEYS` / `DP_AUDIT_KEY_ACTIVE`, no formato versionado do `loadKeyring` (`lib/secretBox`). Sem ele, a correção
 * de trabalhador ou de versão recusa com 503 antes de gravar; criar e ler seguem funcionando.
 */
export const DP_AUDIT_KEY_MISSING = 'dp_audit_key_missing';
export const DP_AUDIT_KEYRING: KeyringSpec = { prefix: 'DP_AUDIT', missingCode: DP_AUDIT_KEY_MISSING, label: 'da auditoria do DP' };

/**
 * Item 45 (F-DPB-3, "audit sem valores") — HMAC-SHA256, com a chave do chaveiro do DP, do JSON canônico (chaves
 * ordenadas, BigInt em string) dos campos alterados. O hash muda quando o valor muda e não revela o valor. Sem a chave,
 * não se reverte por força bruta: SHA-256 sem sal devolvia salário e nascimento em menos de 0,3 s (revisor do #1032).
 */
export function hashCampos(registro: Record<string, unknown>, campos: readonly string[], chave: Buffer): string {
  const canon: Record<string, string | boolean | number | null> = {};
  for (const k of [...campos].sort()) {
    const v = registro[k];
    canon[k] = typeof v === 'bigint' ? v.toString() : v === undefined ? null : (v as string | boolean | number | null);
  }
  return createHmac('sha256', chave).update(JSON.stringify(canon)).digest('hex');
}

/** Campos de `patch` (definidos) cujo valor difere do `atual`. */
export function camposAlterados(atual: Record<string, unknown>, patch: Record<string, unknown>): string[] {
  return Object.keys(patch)
    .filter((k) => patch[k] !== undefined && patch[k] !== atual[k])
    .sort();
}

// ── Item 47 — vinculoNaData ──────────────────────────────────────────────────────────────────────────────────────────
type VersaoResolvida = Vigencia & { lotacao: unknown; cargo: unknown; jornada: unknown; sindicato: unknown };

/**
 * Item 47 — identidade + versão vigente em `data` + lotação, cargo, jornada e sindicato resolvidos, sobre as linhas já
 * carregadas (a entrada do snapshot do F2). Nenhuma versão cobre a data ⇒ `null`; mais de uma ⇒ `VigenciaSobrepostaError`.
 */
export function vinculoNaData<T extends { versoes: readonly VersaoResolvida[] }>(vinculo: T, data: string) {
  const v: T['versoes'][number] | null = versaoVigente(vinculo.versoes, data);
  if (!v) return null;
  const { versoes: _versoes, ...identidade } = vinculo;
  const { lotacao, cargo, jornada, sindicato, ...versao } = v;
  return { vinculo: identidade, versao, lotacao, cargo, jornada, sindicato };
}
