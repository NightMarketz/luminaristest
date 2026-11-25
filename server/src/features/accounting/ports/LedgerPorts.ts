import type { Prisma } from 'generated/prisma';
import type { AccountNature } from '../fixtures/ChartOfAccountsFixture';
import type { InTable } from '../../../lib/spreadsheet';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * Portas do NÚCLEO DO RAZÃO (Onda 1.2, regra `C1-ledger-core-not-fiscal` do `ADR-ARCH-BOUNDARIES`).
 *
 * O núcleo (`PostingService`, `PeriodService`, `AuditService`, `ExerciseClosingService`, `ReconciliationService` e os
 * repositórios do razão) não importa fiscal nem localização. O que ele precisa de lá entra por estas portas; cada uma é
 * implementada na borda do país (`features/accounting/paises/br/**`, F-PB-1 a — `ADR-PAIS-NA-BORDA`) e montada SÓ em
 * `lib/factory.ts`. Toda porta é argumento OBRIGATÓRIO do construtor: porta opcional esquecida na factory compila e
 * desliga a regra em silêncio.
 */

/**
 * Regra de estrutura do plano de contas de um país (código, nível, conta superior). BR: Manual da ECD
 * (REGRA_VALIDA_NIVEL_CONTAS + I050.COD_CTA_SUP) — `paises/br/EcdChartStructureRule`.
 */
export interface ChartStructureRule {
  /** Lança `ValidationError` quando a conta nova fere a regra. `findByCode` lê o plano do escopo (conta superior). */
  assertNewAccount(
    account: { code: string; nature: AccountNature; acceptsEntries: boolean },
    findByCode: (code: string) => Promise<{ acceptsEntries: boolean } | null>,
  ): Promise<void>;
}

/** Quem mais depende de uma conta e por isso a trava contra a exclusão (ex.: ajuste vivo do e-Lalur, BR). */
export interface AccountDeletionGuard {
  /** Lança o erro de conflito quando algo vivo aponta para a conta. Roda DENTRO da tx do soft-delete (gate autoritativo). */
  assertAccountDeletable(scope: AccountingScope, accountId: string, tx: Prisma.TransactionClient): Promise<void>;
}

/** Pré-requisito do encerramento do exercício que vem de fora do razão (BR: provisão de IRPJ/CSLL/PIS/Cofins pendente). */
export interface ClosingGuard {
  /** Lança `ValidationError` quando o exercício não pode ser encerrado ainda. */
  assertCanClose(scope: AccountingScope, year: number): Promise<void>;
}

/** Parser de extrato bancário de formato próprio do país/banco (OFX, CNAB), normalizado para a tabela comum do import. */
export interface StatementParser {
  parse(format: 'ofx' | 'cnab', buffer: Buffer): InTable;
}
