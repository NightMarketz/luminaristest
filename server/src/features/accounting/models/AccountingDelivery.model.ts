import type { AccountingScope } from '../scope/AccountingScope';

/**
 * AccountingDeliveryLog domain constants + o manifesto puro (BE-INCR-CONTADOR-DELIVERY /
 * ADR-CONTADOR-DELIVERY). O pacote entregue ao contador é, por decisão ratificada (F-CD3-a),
 * **ECD.txt + ECF.txt + manifesto** — e o manifesto NÃO é um arquivo novo com cópia de conteúdo:
 * é a lista de referências (jobId + sha256) que prova QUAL par de arquivos foi entregue.
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

/** Os dois arquivos do pacote (F-CD3-a: sem PDF-resumo, sem zip). */
export const DELIVERY_FILE_KINDS = ['ECD', 'ECF'] as const;
export type DeliveryFileKind = (typeof DELIVERY_FILE_KINDS)[number];

/** Audit event keys da entrega — os três estão na allowlist de `auditCanonical.ts` (item 14). */
export const DELIVERY_PACKAGE_BUILT = 'delivery.package_built';
export const DELIVERY_SENT = 'delivery.sent';
export const DELIVERY_FAILED = 'delivery.failed';

/** Uma referência de arquivo no manifesto: identidade + hash, NUNCA conteúdo. */
export interface DeliveryManifestFile {
  kind: DeliveryFileKind;
  jobId: string;
  sha256: string;
}

/**
 * O manifesto (item 8 do BRIEF). `scope` é materializado como `{unitId, ledgerCode}` — só o que
 * identifica a escrituração para quem vai assinar. `ownerUserId`/`actorUserId` ficam de FORA por
 * minimização (§4 do ADR): são identificadores internos do sistema, não dizem nada ao contador e
 * viajariam junto do pacote sem necessidade.
 */
export interface DeliveryManifest {
  scope: { unitId: string; ledgerCode: string };
  /** Período coberto pelos dois arquivos (date-only), COPIADO do job — nunca digitado. */
  period: { start: string; end: string };
  contactId: string;
  files: DeliveryManifestFile[];
  generatedAt: string;
}

/**
 * Monta o manifesto a partir dos dois jobs já resolvidos. Função PURA (sem I/O, sem Date.now
 * escondido: `generatedAt` entra por parâmetro) — é o que permite testá-la sem banco e o que garante
 * que o mesmo par de jobs produz o mesmo manifesto.
 *
 * F-CD6-a/ACC-CD-3: os `sha256` chegam AQUI já lidos de `AccountingDataExchangeJob.sha256`. Esta
 * função nunca abre arquivo — quem recomputa hash do disco é quem quer divergir do que foi gerado.
 */
export function buildDeliveryManifest(params: {
  scope: AccountingScope;
  period: { start: Date; end: Date };
  contactId: string;
  ecd: { jobId: string; sha256: string };
  ecf: { jobId: string; sha256: string };
  generatedAt: Date;
}): DeliveryManifest {
  return {
    scope: { unitId: params.scope.unitId, ledgerCode: params.scope.ledgerCode },
    period: { start: toDateOnly(params.period.start), end: toDateOnly(params.period.end) },
    contactId: params.contactId,
    files: [
      { kind: 'ECD', jobId: params.ecd.jobId, sha256: params.ecd.sha256 },
      { kind: 'ECF', jobId: params.ecf.jobId, sha256: params.ecf.sha256 },
    ],
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
