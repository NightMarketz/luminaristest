import type { LegalParameterRecalcJob, Prisma } from 'generated/prisma';

export type LegalParameterRecalcEvento = 'PUBLISHED' | 'REVOKED';

/** Resumo de uma execução do job (o que a varredura fez). */
export interface RecalcResumo {
  reconfirmadas: number;
  avisos: number;
  inalteradas: number;
}

/**
 * Contrato do repositório de `legal_parameter_recalc_jobs` (BE-INCR-LEGAL-PARAMS PR-4, item 10; dono 07/10 "Tabela de
 * jobs"). Único lugar com `prisma.legalParameterRecalcJob.*`. Sem delete (registro de fato ocorrido).
 */
export interface ILegalParameterRecalcJobRepository {
  /** Publicar/revogar grava o job na MESMA tx da transição de status. */
  create(legalParameterId: string, evento: LegalParameterRecalcEvento, tx: Prisma.TransactionClient): Promise<LegalParameterRecalcJob>;
  /** Os PENDING mais antigos primeiro (a ordem de publicação é a ordem de recálculo). */
  findPending(limit: number): Promise<LegalParameterRecalcJob[]>;
  /** PENDING ⇒ DONE com o resumo. */
  markDone(id: string, resumo: RecalcResumo, at: Date): Promise<void>;
  /** Falha da execução inteira: fica PENDING, conta a tentativa e guarda o erro (o agendador tenta de novo). */
  markFailedAttempt(id: string, erro: string): Promise<void>;
}
