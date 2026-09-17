import type { AccountingScope } from '../scope/AccountingScope';
import type { ExportKind } from './DataExchange.model';

/**
 * AccountingDeliveryLog domain constants + o manifesto puro (BE-INCR-CONTADOR-DELIVERY /
 * ADR-CONTADOR-DELIVERY; N-ário desde C6b PR-3). O pacote entregue ao contador é, por decisão
 * ratificada (F-CD3-a), **ECD.txt + ECF.txt (núcleo obrigatório) + extras configuráveis +
 * manifesto** — e o manifesto NÃO é um arquivo novo com cópia de conteúdo: é a lista de
 * referências (jobId + sha256) que prova QUAIS arquivos foram entregues.
 */

/**
 * Os três estados do log. `SENT` tem semântica NOMEADA (item 9 do BRIEF, achado do parecer sobre
 * F-CD1-a): significa **"o operador confirmou que despachou o pacote"**, jamais "o servidor
 * confirmou entrega real" — sob F-CD1-a (zero-dependência) não existe transporte no servidor para
 * confirmar coisa alguma. Um leitor futuro que trate `SENT` como prova de recebimento está lendo
 * errado, e é por isso que a frase mora no código e no texto de retorno da API.
 */
export const DELIVERY_STATUSES = ['QUEUED', 'SENT', 'FAILED'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/**
 * Os `kind` de export que podem entrar como EXTRA configurável do pacote (C6b PR-3, Bloco B, item
 * 5 do BRIEF §4). SPED (ECD/ECF/ECF_REAL) NUNCA é extra — é o núcleo obrigatório, resolvido à
 * parte por `resolveJobs`. Um `extraJobIds` apontando para um job SPED é 400 (não é um demonstrativo
 * "a mais": é o próprio núcleo, duplicado).
 */
export const DELIVERABLE_EXPORT_KINDS = [
  'EXPORT_TRIAL_BALANCE',
  'EXPORT_GENERAL_LEDGER',
  'EXPORT_BALANCE_SHEET',
  'EXPORT_INCOME_STATEMENT',
  'EXPORT_BANK_RECONCILIATION',
  'EXPORT_ENTRY_SAMPLE',
] as const;
export type DeliverableExportKind = (typeof DELIVERABLE_EXPORT_KINDS)[number];

/** Audit event keys da entrega — os três estão na allowlist de `auditCanonical.ts` (item 14). */
export const DELIVERY_PACKAGE_BUILT = 'delivery.package_built';
export const DELIVERY_SENT = 'delivery.sent';
export const DELIVERY_FAILED = 'delivery.failed';

/**
 * Uma referência de arquivo no manifesto: identidade + hash, NUNCA conteúdo.
 *
 * C6b PR-3 (Passo 4, F-C6b-1 a): `kind` deixa de ser a união fechada `DeliveryFileKind` ('ECD'|'ECF')
 * e passa a `ExportKind` — o núcleo continua `EXPORT_SPED_ECD`/`EXPORT_SPED_ECF*`, e os extras
 * carregam o `kind` real do export (`EXPORT_TRIAL_BALANCE`, …). `DELIVERY_FILE_KINDS` foi REMOVIDO:
 * era só um alias de 2 valores que a lista N-ária tornou obsoleto. Nota de contrato (achado fora de
 * escopo do plano de execução, §5.1): um consumidor FE que leia `files[].kind` esperando 'ECD'/'ECF'
 * quebra com esta mudança — não há consumidor em `main` hoje (grep confirmado no plano).
 */
export interface DeliveryManifestFile {
  kind: ExportKind;
  jobId: string;
  sha256: string;
}

/**
 * O manifesto (item 8 do BRIEF; N-ário desde C6b PR-3 Passo 4). `scope` é materializado como
 * `{unitId, ledgerCode}` — só o que identifica a escrituração para quem vai assinar.
 * `ownerUserId`/`actorUserId` ficam de FORA por minimização (§4 do ADR): são identificadores
 * internos do sistema, não dizem nada ao contador e viajariam junto do pacote sem necessidade.
 *
 * `core` dá acesso direto ao núcleo SEM índice mágico (`files[0]`/`files[1]` — a classe de bug que
 * o Passo 4 fecha); `files` é a lista completa NA ORDEM `position` (núcleo primeiro, extras depois)
 * — é o que um consumidor que só precisa "todos os arquivos" itera.
 */
export interface DeliveryManifest {
  scope: { unitId: string; ledgerCode: string };
  /** Período coberto pelo núcleo (date-only), COPIADO do job — nunca digitado. */
  period: { start: string; end: string };
  contactId: string;
  core: { ecd: DeliveryManifestFile; ecf: DeliveryManifestFile };
  /** `[core.ecd, core.ecf, ...extras]`, na ordem de `position`. */
  files: DeliveryManifestFile[];
  generatedAt: string;
}

/**
 * Monta o manifesto a partir do núcleo (ECD/ECF) já resolvido + extras já validados. Função PURA
 * (sem I/O, sem Date.now escondido: `generatedAt` entra por parâmetro) — é o que permite testá-la
 * sem banco e o que garante que o mesmo núcleo+extras produz o mesmo manifesto.
 *
 * F-CD6-a/ACC-CD-3: os `sha256` chegam AQUI já lidos de `AccountingDataExchangeJob.sha256`. Esta
 * função nunca abre arquivo — quem recomputa hash do disco é quem quer divergir do que foi gerado.
 */
export function buildDeliveryManifest(params: {
  scope: AccountingScope;
  period: { start: Date; end: Date };
  contactId: string;
  core: {
    ecd: { jobId: string; kind: ExportKind; sha256: string };
    ecf: { jobId: string; kind: ExportKind; sha256: string };
  };
  extras: Array<{ jobId: string; kind: ExportKind; sha256: string }>;
  generatedAt: Date;
}): DeliveryManifest {
  const ecd: DeliveryManifestFile = {
    kind: params.core.ecd.kind,
    jobId: params.core.ecd.jobId,
    sha256: params.core.ecd.sha256,
  };
  const ecf: DeliveryManifestFile = {
    kind: params.core.ecf.kind,
    jobId: params.core.ecf.jobId,
    sha256: params.core.ecf.sha256,
  };
  const extraFiles: DeliveryManifestFile[] = params.extras.map((e) => ({
    kind: e.kind,
    jobId: e.jobId,
    sha256: e.sha256,
  }));
  return {
    scope: { unitId: params.scope.unitId, ledgerCode: params.scope.ledgerCode },
    period: { start: toDateOnly(params.period.start), end: toDateOnly(params.period.end) },
    contactId: params.contactId,
    core: { ecd, ecf },
    files: [ecd, ecf, ...extraFiles],
    generatedAt: params.generatedAt.toISOString(),
  };
}

/** `Date` (UTC 00:00) → `YYYY-MM-DD`. */
export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Os meses `{year, month}` cobertos por um período date-only, inclusive nas duas pontas. O gate de
 * período (F-CD7-a, item 7) exige TODOS eles `HARD_CLOSED`: "12 meses seguidos sempre, ou período
 * selecionado" (decisão do dono 2026-09-10, cédula §6, F3) — para o exercício-calendário são os 12;
 * para uma situação especial, os meses que o arquivo de fato cobre. Um lançamento em qualquer mês
 * do período ainda `OPEN`/`SOFT_CLOSED` muda o resultado que o contador assinaria. Lança se o
 * período for vazio ou invertido — isso é dado corrompido no job, não caso de negócio.
 */
export function monthsCovered(start: Date, end: Date): Array<{ year: number; month: number }> {
  if (end.getTime() < start.getTime()) {
    throw new Error(`Período invertido: ${toDateOnly(start)} > ${toDateOnly(end)}`);
  }
  const out: Array<{ year: number; month: number }> = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1;
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) {
    out.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}
