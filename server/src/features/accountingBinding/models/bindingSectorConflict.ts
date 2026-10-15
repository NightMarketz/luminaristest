import { ConflictError } from '../../../lib/errors';

/**
 * LAC-B PR-0 (FE-INCR-BINDING-ACTIVATION-screen-brief.md item 0, F-BA-5 → a): a unidade já tem OUTRO setor — binding
 * `Active` ou `KitInstallation` em qualquer status (lacuna decidida pelo dono em 14/10, D-2026-10-14-LAC-B-PR0-LACUNAS).
 * Dois setores na mesma unidade repetem os 6 `eventKey` e colidem no registro de mappers (`unitId:sourceType`) — no
 * boot e, desde a recarga da EMENDA-1, na recarga em runtime. 409, nada gravado.
 */
export class BindingSectorConflictError extends ConflictError {
  constructor(
    public readonly unitId: string,
    public readonly activeSectorKey: string,
    public readonly requestedSectorKey: string,
  ) {
    super(
      `A unidade '${unitId}' já tem a contabilidade do setor '${activeSectorKey}'; um setor por unidade — não ativa '${requestedSectorKey}'.`,
      'BINDING_SECTOR_CONFLICT',
    );
    Object.setPrototypeOf(this, BindingSectorConflictError.prototype);
  }
}
