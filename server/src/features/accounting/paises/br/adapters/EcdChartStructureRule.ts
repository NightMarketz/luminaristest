import { ValidationError } from '../../../../../lib/errors';
import type { AccountNature } from '../../../fixtures/ChartOfAccountsFixture';
import type { ChartStructureRule } from '../../../ports/LedgerPorts';

/** Natureza que entra na REGRA_VALIDA_NIVEL_CONTAS (Manual ECD L9 p. 120): COD_NAT 01/02/03. */
export const PATRIMONIAL_NATURES: ReadonlyArray<AccountNature> = ['Asset', 'Liability', 'Equity'];

/** Nível mínimo da analítica patrimonial (Manual ECD L9 p. 120 — a mensagem do PVA cita a Res. CFC 1.299/2010). */
export const NIVEL_MINIMO_ANALITICA_PATRIMONIAL = 4;

/**
 * BE-INCR-PLANO-4-NIVEIS (L8, item 6): a regra do PVA aplicada na origem. Manual da ECD L9 (maio/2026) p. 120,
 * REGRA_VALIDA_NIVEL_CONTAS: analítica de ativo/passivo/PL no nível ≥ 4 (o nível do I050 é a profundidade do
 * código); e toda conta abaixo do nível 1 precisa da conta superior (I050.COD_CTA_SUP), que é sintética.
 *
 * Onda 1.2: saiu do `PostingService` (núcleo do razão) para a borda do país (F-PB-1 a); o núcleo só conhece a porta
 * `ChartStructureRule` e a factory monta esta implementação.
 */
export const ecdChartStructureRule: ChartStructureRule = {
  async assertNewAccount(account, findByCode) {
    const segmentos = account.code.split('.');
    if (account.acceptsEntries && PATRIMONIAL_NATURES.includes(account.nature) && segmentos.length < NIVEL_MINIMO_ANALITICA_PATRIMONIAL) {
      throw new ValidationError(
        `Conta analítica de ativo, passivo ou patrimônio líquido precisa ter no mínimo ${NIVEL_MINIMO_ANALITICA_PATRIMONIAL} ` +
          `níveis no código (ex.: 1.1.1.01); '${account.code}' tem ${segmentos.length} (Manual da ECD, REGRA_VALIDA_NIVEL_CONTAS).`,
      );
    }
    if (segmentos.length > 1) {
      const pai = segmentos.slice(0, -1).join('.');
      const superior = await findByCode(pai);
      if (!superior || superior.acceptsEntries) {
        throw new ValidationError(
          `A conta superior '${pai}' de '${account.code}' precisa existir como conta sintética (que não recebe lançamento) ` +
            'antes da conta nova (I050.COD_CTA_SUP).',
        );
      }
    }
  },
};
