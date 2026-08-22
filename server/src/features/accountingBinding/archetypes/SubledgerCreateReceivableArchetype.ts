import type { SubledgerCommandArchetype } from '../models/types';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Corpo A, item 5 do BRIEF) — arquétipo classe 2
 * `subledger_command` ('criacao-titulo-receber' no dossiê). Extraído de
 * `server/src/features/accounting/sync/bridges/CrmReceivableBridge.ts` (`P1-DOSSIER-arquetipos.md`
 * §3) — F-P1-1(b) RATIFICADA: esta classe entra no catálogo v1.
 *
 * Efeito de runtime DIFERENTE da classe 1: não produz `PostEntryInput` — cria um `Receivable` no
 * subledger AR; quem posta (D controle-recebível / C receita-serviço) é o próprio ciclo de AR
 * (`ReceivableService`), não este arquétipo (`CrmReceivableBridge.ts:17-23`).
 *
 * Registro da ratificação F-P1-1(b) (ADR §11): os 3 guards de idempotência abaixo ficam EM CÓDIGO
 * do arquétipo, NUNCA em dado do binding — cerca anti-§4 (Motor de Regras rejeitado) que o dono
 * escolheu ciente ao ratificar (b). São extraídos VERBATIM da lógica pura de
 * `CrmReceivableBridge.ts`:
 *   1. Chave de negócio por `documentNumber` (business key), não pelo `id` técnico.
 *   2. Lookup tombstone-aware — uma linha soft-deleted só bloqueia re-emissão se for um tombstone
 *      ESTRITO no formato `deleted:<segmento>:<documentNumber>` (`isStrictTombstone`, espelha
 *      `CrmReceivableBridge.ts:210-222`); qualquer outro formato de `documentNumber` (ex.: um
 *      documentNumber manual que só termina com o sufixo por coincidência) NÃO conta.
 *   3. Cancelado nunca ressuscita — um tombstone estrito com `cancelledById !== null` (cancelamento
 *      HUMANO, decisão final) permanece bloqueado para sempre; um tombstone SEM `cancelledById`
 *      (compensação de MÁQUINA por falha de recognition) é retryable — senão uma falha transiente
 *      de postagem perderia a receita para sempre (`CrmReceivableBridge.ts:34-36`).
 *
 * A convergência de corrida (`convergeTwins`, `CrmReceivableBridge.ts:160-189`) tem sua SELEÇÃO
 * pura (sobrevivente = menor `id`, espelhando a ordem cronológica de cuids Prisma num processo
 * único — `CrmReceivableBridge.ts:152-158`) extraída aqui também: é o mecanismo que faz "a segunda
 * emissão do mesmo comando convergir sem duplicar" quando duas linhas VIVAS coexistem sob a mesma
 * chave (não é um 4º guard novo — é o efeito observável que o teste do item 5 do BRIEF exige).
 *
 * O ATO de ler/gravar (repositórios, transação) NÃO está aqui — é fiação da Fase B / do intérprete
 * (Corpo D), que chama estas funções puras com as linhas já lidas do subledger. Este arquivo só
 * contém a REGRA (testável isoladamente, sem banco).
 */

/** Shape mínimo de uma linha do subledger que a classificação de idempotência precisa enxergar —
 *  espelha os campos de `Receivable` (Prisma) usados por `CrmReceivableBridge`, sem importar o
 *  tipo Prisma do módulo `features/accounting` (fronteira de import do item 13 do BRIEF). */
export interface SubledgerRecordRow {
  id: string;
  documentNumber: string | null;
  /** `null` ⇔ linha viva; qualquer outro valor (Date, string) ⇔ soft-deleted. O tipo exato não
   *  importa para a classificação — só a distinção null/não-null (mesmo padrão de
   *  `Receivable.deletedAt` do Prisma, sem importar o tipo gerado aqui). */
  deletedAt: unknown;
  cancelledById: string | null;
}

export type SubledgerIdempotencyOutcome =
  /** Nenhuma linha viva nem tombstone bloqueante sob esta chave — seguro criar. */
  | { kind: 'not_booked' }
  /** Já existe uma linha viva com a chave, OU um tombstone de cancelamento humano — não recria. */
  | { kind: 'already_booked' }
  /** >1 linha VIVA compartilha a chave (corrida) — converge para a de menor id; as demais devem
   *  ser canceladas pelo chamador (o cancelamento em si é efeito colateral, fora deste arquivo). */
  | { kind: 'converge_twins'; survivorId: string; twinIdsToCancel: string[] };

/**
 * Guard 2 (tombstone-aware) — espelha `CrmReceivableBridge.ts:212-216` byte-a-byte na forma:
 * um tombstone só conta se for EXATAMENTE `deleted:<segmento-sem-':'>:<documentNumber>`.
 */
function isStrictTombstone(candidateDocumentNumber: string, documentNumber: string): boolean {
  const suffix = `:${documentNumber}`;
  if (!candidateDocumentNumber.startsWith('deleted:') || !candidateDocumentNumber.endsWith(suffix)) {
    return false;
  }
  const middle = candidateDocumentNumber.slice(
    'deleted:'.length,
    candidateDocumentNumber.length - suffix.length,
  );
  return middle.length > 0 && !middle.includes(':');
}

/**
 * Guards 2+3 combinados (classificador) — espelha `CrmReceivableBridge.ts:210-222`
 * (`isAlreadyBooked`): uma linha viva com a chave exata bloqueia sempre; uma linha soft-deleted só
 * bloqueia se for tombstone estrito COM `cancelledById` (cancelamento humano, final).
 */
function isAlreadyBooked(rows: readonly SubledgerRecordRow[], documentNumber: string): boolean {
  return rows.some((row) => {
    if (row.deletedAt === null) return row.documentNumber === documentNumber;
    if (!row.documentNumber || !isStrictTombstone(row.documentNumber, documentNumber)) return false;
    return row.cancelledById !== null;
  });
}

/**
 * Classifica o efeito de (re)emitir o comando `criacao-titulo-receber` para `documentNumber`,
 * dado o snapshot atual de linhas do subledger que carregam essa chave (viva ou tombstone). Pura —
 * nenhuma leitura/escrita própria; o chamador (Fase B) já leu `rows` do repositório.
 *
 * Ordem espelha `CrmReceivableBridge.bookWonOpportunity` (guard 2, `:104-110`): primeiro checa
 * corrida (>1 linha viva), depois já-emitido (guard 1+2 combinados).
 */
export function classifySubledgerIdempotency(
  rows: readonly SubledgerRecordRow[],
  documentNumber: string,
): SubledgerIdempotencyOutcome {
  const liveRows = rows.filter((r) => r.deletedAt === null && r.documentNumber === documentNumber);
  if (liveRows.length > 1) {
    const survivor = liveRows.reduce((a, b) => (a.id < b.id ? a : b));
    return {
      kind: 'converge_twins',
      survivorId: survivor.id,
      twinIdsToCancel: liveRows.filter((r) => r.id !== survivor.id).map((r) => r.id),
    };
  }
  if (isAlreadyBooked(rows, documentNumber)) {
    return { kind: 'already_booked' };
  }
  return { kind: 'not_booked' };
}

export const subledgerCreateReceivableArchetype: SubledgerCommandArchetype = {
  kind: 'createSubledgerRecord',
  name: 'criacao-titulo-receber',
  // Origem documentada no dossiê (`WonOpportunityFact`, P1-DOSSIER-arquetipos.md §3) — o bridge em
  // si não se registra por `sourceType` como os mappers da classe 1 (não implementa
  // IAccountingEventMapper); este campo nomeia o evento de origem que aciona o comando.
  sourceType: 'crm.opportunity.won',
  targetSubledger: 'receivable',
  slots: [
    {
      name: 'amount',
      type: 'moneyReais',
      // CrmReceivableBridge.ts:242-256 (toCents) — nota do dossiê §3: isSafeInteger e MAX_CENTS
      // combinados num único guard aqui, diferente do padrão da classe 1 que separa as duas
      // checagens; preservado verbatim (não é decisão deste arquivo, é fidelidade ao corpus).
      guards: ['isFinite', 'round', 'isSafeInteger', 'maxCents', 'positive'],
    },
    {
      name: 'occurredAt',
      type: 'dateISO',
      // CrmReceivableBridge.ts:270-285 (toDateOnly) — scopeDay no fuso do escopo, depois
      // isValidDateOnly; documenta o fix de UTC-shift (comentário original :261-269).
      guards: ['scopeDayInTenantTimezone', 'isValidDateOnly'],
    },
    {
      name: 'label',
      type: 'string',
      guards: ['nonEmptyPassthrough'],
    },
    {
      name: 'accountRef',
      type: 'string',
      // Opcional na origem (`WonOpportunityFact.accountRef?: string`) — `ArchetypeSlotSpec` não
      // tem flag de opcionalidade própria (Fase 0); o guard nomeia a tolerância a ausência.
      guards: ['optionalPassthrough'],
    },
    // Slot opcional de etiqueta de dimensão (emenda 2, ADR §11) — ver nota completa em
    // `RevenueRecognitionArchetype.ts`.
    {
      name: 'dimension',
      type: 'string',
      guards: ['dimensionOptionalPassthrough'],
    },
  ],
  idempotencyKey: 'documentNumber',
  invariants: [
    'idempotency-document-number-key',
    'tombstone-aware-lookup',
    'cancelled-never-resurrected',
    'twin-race-converge-lowest-id',
    'period-preflight-nonauthoritative',
    'source-passthrough-pure',
    'dimension-slot-optional',
  ],
};
