import { ValidationError } from '../../../../lib/errors';
import { provisaoPendente } from '../../models/taxAssessmentProvisao';
import type { ITaxAssessmentRepository } from '../../repositories/ITaxAssessmentRepository';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { ClosingGuard } from '../../ports/LedgerPorts';

/**
 * X7 Fase A item 18 (F-TA-8 a): sem a provisão de IRPJ/CSLL, a DRE e a ECD do ano saem sem imposto (ADR §7). Decisão do
 * dono 04/10 (L-D): QUALQUER apuração da PJ no ano bloqueia, não só as da unidade que encerra. Pendente = L-C.
 * X8 item 19 (precedente F-TA-8 a): vale igual para as linhas mensais de PIS/COFINS da mesma tabela.
 *
 * Onda 1.2: saiu do `ExerciseClosingService` (núcleo do razão) para a borda BR; o núcleo só conhece a porta `ClosingGuard`.
 */
export class TaxProvisionClosingGuard implements ClosingGuard {
  constructor(private readonly taxAssessmentRepo: Pick<ITaxAssessmentRepository, 'findConfirmedByYear'>) {}

  async assertCanClose(scope: AccountingScope, year: number): Promise<void> {
    const pendentes = (await this.taxAssessmentRepo.findConfirmedByYear(scope.ownerUserId, year)).filter(provisaoPendente);
    if (pendentes.length > 0) {
      const ids = pendentes.map((a) => a.id);
      throw new ValidationError(
        `Há apuração(ões) de tributo (IRPJ/CSLL/PIS/Cofins) de ${year} confirmada(s) com a provisão pendente: ${ids.join(', ')}. ` +
          'Configure as contas e reconcilie (POST /accounting/tax-assessments/:id/provisao) antes de encerrar.',
        { taxAssessmentIds: ids },
      );
    }
  }
}
