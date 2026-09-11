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
  year: number;
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
  year: number;
  contactId: string;
  ecd: { jobId: string; sha256: string };
  ecf: { jobId: string; sha256: string };
  generatedAt: Date;
}): DeliveryManifest {
  return {
    scope: { unitId: params.scope.unitId, ledgerCode: params.scope.ledgerCode },
    year: params.year,
    contactId: params.contactId,
    files: [
      { kind: 'ECD', jobId: params.ecd.jobId, sha256: params.ecd.sha256 },
      { kind: 'ECF', jobId: params.ecf.jobId, sha256: params.ecf.sha256 },
    ],
    generatedAt: params.generatedAt.toISOString(),
  };
}

/**
 * Os 12 meses do ano-calendário. O gate de período (F-CD7-a, item 7) exige TODOS eles
 * `HARD_CLOSED`, não só dezembro: ECD/ECF cobrem o ano inteiro, e um lançamento em qualquer mês
 * ainda `OPEN`/`SOFT_CLOSED` muda o resultado anual que o contador assinaria.
 */
export const CALENDAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
