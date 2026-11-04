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

/**
 * Itens 41 e 42 — idade e prazo por categoria. 400 com `reason`.
 * - 103 (aprendiz): 14 anos completos em `dataInicio` [D12 CF art. 7º XXXIII]; sem `pcd`, menos de 24 em `dataInicio`
 *   [D05 CLT art. 428 caput] e `dataTermino` antes do 24º aniversário [art. 433]; `dataTermino` obrigatória e no máximo
 *   `dataInicio` + 2 anos − 1 dia, salvo `pcd` [art. 428 § 3º].
 * - 101 (empregado geral): 16 anos completos em `dataInicio` [D12 CF art. 7º XXXIII].
 */
export function assertIdadeEPrazo(d: DadosIdade): void {
  if (d.categoria === '101' && idadeEm(d.nascimento, d.dataInicio) < 16) {
    throw dpValidationError('DP_IDADE_MINIMA', 'O empregado precisa ter 16 anos completos na admissão (CF art. 7º XXXIII).');
  }
  if (d.categoria !== '103') return;
  if (idadeEm(d.nascimento, d.dataInicio) < 14) {
    throw dpValidationError('DP_APRENDIZ_IDADE', 'O aprendiz precisa ter 14 anos completos na admissão (CF art. 7º XXXIII).');
  }
  if (!d.pcd && idadeEm(d.nascimento, d.dataInicio) >= 24) {
    throw dpValidationError('DP_APRENDIZ_IDADE', 'O aprendiz sem deficiência precisa ter menos de 24 anos na admissão (CLT art. 428).');
  }
  if (d.dataTermino === null) {
    throw dpValidationError('DP_APRENDIZ_PRAZO', 'O contrato de aprendizagem exige data de término (CLT art. 428 § 3º).');
  }
  if (d.pcd) return;
  if (idadeEm(d.nascimento, d.dataTermino) >= 24) {
    throw dpValidationError('DP_APRENDIZ_PRAZO', 'O contrato de aprendizagem termina antes do 24º aniversário (CLT art. 433).');
  }
  // dataTermino <= dataInicio + 2 anos − 1 dia ⟺ do início ao término há menos de 2 anos completos.
  if (idadeEm(d.dataInicio, d.dataTermino) >= 2) {
    throw dpValidationError('DP_APRENDIZ_PRAZO', 'O contrato de aprendizagem dura no máximo 2 anos (CLT art. 428 § 3º).');
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
