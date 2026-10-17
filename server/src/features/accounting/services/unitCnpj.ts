import { getFactory } from '../../../lib/factory';
import { isValidCnpj, stripCnpjMask } from '../../../lib/cnpj';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * CNPJ da unidade do escopo, lido do preset `units` (F-DFE-17 a), sem máscara e em maiúsculas; null se ausente ou
 * inválido. Mesma leitura do pré-voo de emissão (FiscalDocumentEmissionService). Usado pelo FiscalCertificateService
 * (BE-INCR-DFE-ADN-EMISSOR PR-1, item 5 iii).
 */
export async function resolveUnitCnpjFromUnits(scope: AccountingScope): Promise<string | null> {
  const dynamicTableRepo = getFactory().getDynamicTableRepository();
  const unitsTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'units');
  const unitRow = unitsTable ? await dynamicTableRepo.findDataById(scope.unitId) : null;
  const cnpj = stripCnpjMask(String((unitRow?.data as Record<string, unknown> | undefined)?.cnpj ?? '')).toUpperCase();
  return cnpj && isValidCnpj(cnpj) ? cnpj : null;
}
