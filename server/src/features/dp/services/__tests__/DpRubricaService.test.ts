/** BE-INCR-DP-F0-F1 item 54 (PR-5) — o catálogo passa pela policy de leitura antes de sair. */
import { ForbiddenError } from '../../../../lib/errors';
import type { AccountingScope } from '../../../accounting/scope/AccountingScope';
import { DP_RUBRICAS } from '../../models/rubricas/catalogo';
import { DpRubricaService } from '../DpRubricaService';

const scope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' } as unknown as AccountingScope;

describe('DpRubricaService.listCatalog', () => {
  it('policy nega ⇒ ForbiddenError', () => {
    const svc = new DpRubricaService({ canRead: () => false, canManage: () => false });
    expect(() => svc.listCatalog(scope)).toThrow(ForbiddenError);
  });

  it('policy permite ⇒ catálogo e a marca de conferência', () => {
    const svc = new DpRubricaService({ canRead: () => true, canManage: () => false });
    expect(svc.listCatalog(scope)).toEqual({ conferidoPeloContador: false, rubricas: DP_RUBRICAS });
  });
});
