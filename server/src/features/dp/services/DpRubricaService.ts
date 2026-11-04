import { ForbiddenError } from '../../../lib/errors';
import type { AccountingScope } from '../../accounting/scope/AccountingScope';
import { DP_RUBRICAS_VALIDADAS, RUBRICAS_CONFERIDAS_PELO_CONTADOR, type RubricaDef } from '../models/rubricas/catalogo';
import type { IDpPolicy } from '../policies/IDpPolicy';

export interface DpRubricasView {
  conferidoPeloContador: boolean;
  rubricas: readonly RubricaDef[];
}

/**
 * BE-INCR-DP-F0-F1 item 54 (PR-5) — catálogo de rubricas, só leitura. É dado de código (item 50), sem repositório; a
 * policy de leitura vale igual (contrato: policy em toda operação), como o `listCatalog` dos submódulos.
 */
export class DpRubricaService {
  constructor(
    private readonly policy: IDpPolicy,
    private readonly rubricas: readonly RubricaDef[] = DP_RUBRICAS_VALIDADAS,
  ) {}

  listCatalog(scope: AccountingScope): DpRubricasView {
    if (!this.policy.canRead(scope)) throw new ForbiddenError('Você não tem permissão para ler o catálogo de rubricas do DP.');
    return { conferidoPeloContador: RUBRICAS_CONFERIDAS_PELO_CONTADOR, rubricas: this.rubricas };
  }
}
