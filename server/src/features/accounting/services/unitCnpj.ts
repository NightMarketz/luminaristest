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

/**
 * Nome da unidade do escopo (campo `name` do preset `units`), com checagem de pertença à tabela do dono — o id de outra
 * unidade nunca vaza o nome. Sem nome ⇒ o próprio id. Régua A3 do X10a EMENDA-4: a recusa nomeia a unidade pelo nome.
 */
export async function resolveUnitNameFromUnits(scope: AccountingScope): Promise<string> {
  const dynamicTableRepo = getFactory().getDynamicTableRepository();
  const unitsTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'units');
  if (!unitsTable || !(await dynamicTableRepo.existsByIdInTable(scope.unitId, unitsTable.id))) return scope.unitId;
  const name = ((await dynamicTableRepo.findDataById(scope.unitId))?.data as Record<string, unknown> | undefined)?.name;
  return typeof name === 'string' && name ? name : scope.unitId;
}
