import type { MitExport, Prisma } from 'generated/prisma';

/** Dados para gravar o registro de um arquivo do MIT gerado (BE-INCR-MIT-EXPORT PR-2, item 11). Sem conteúdo nem CPF (D12). */
export interface CreateMitExportData {
  userId: string;
  anoCalendario: number;
  mes: number;
  sha256: string;
  apuracaoIds: string[];
  geradoPorId: string;
}

/**
 * Contrato do repositório de `mit_exports` (nó X9, item 11). Único lugar com `prisma.mitExport.*`. A chave é a PJ
 * (`ownerUserId`, R8). Sem `delete`: registro de fato ocorrido (molde `AccountingDeliveryLog`).
 */
export interface IMitExportRepository {
  create(data: CreateMitExportData, tx?: Prisma.TransactionClient): Promise<MitExport>;
  /** Exportações do ano do PA, mais recentes primeiro. */
  findByYear(ownerUserId: string, anoCalendario: number, tx?: Prisma.TransactionClient): Promise<MitExport[]>;
  runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}
