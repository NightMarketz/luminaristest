/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 12) — invariantes nacionais nível 2 da substituta: E0060 (Anexo I [176]) e
 * E0061 ([177]).
 */
import { invariantesSubstituicao } from '../substituicaoInvariantes';

function dps(over: { opSimpNac?: number; dCompet?: string; vServ?: string; cTribNac?: string; cTribMun?: string; cLoc?: string; toma?: { CPF?: string; CNPJ?: string } } = {}) {
  return {
    infDPS: {
      dCompet: over.dCompet ?? '2026-10-01',
      prest: { regTrib: { opSimpNac: over.opSimpNac ?? 1 } },
      toma: over.toma ?? { CPF: '11144477735' },
      serv: { locPrest: { cLocPrestacao: over.cLoc ?? '3550308' }, cServ: { cTribNac: over.cTribNac ?? '060101', ...(over.cTribMun ? { cTribMun: over.cTribMun } : {}) } },
      valores: { vServPrest: { vServ: over.vServ ?? '100.00' } },
    },
  };
}

describe('invariantesSubstituicao — item 12', () => {
  it('Simples (opSimpNac 3) com valor alterado → E0061', () => {
    expect(invariantesSubstituicao(dps({ opSimpNac: 3 }), dps({ opSimpNac: 3, vServ: '120.00' }))).toEqual(["E0061: vServ mudou ('100.00' → '120.00')"]);
  });

  it('Simples: documento do tomador e dCompet também congelados', () => {
    const f = invariantesSubstituicao(dps({ opSimpNac: 3 }), dps({ opSimpNac: 3, dCompet: '2026-10-02', toma: { CPF: '52998224725' } }));
    expect(f).toHaveLength(2);
    expect(f.every((x) => x.startsWith('E0061'))).toBe(true);
  });

  it('não optante mudando vServ → passa', () => {
    expect(invariantesSubstituicao(dps({ opSimpNac: 1 }), dps({ opSimpNac: 1, vServ: '120.00' }))).toEqual([]);
  });

  it('não optante mudando dCompet/cTribNac/cTribMun/cLocPrestacao → E0060 (os 4)', () => {
    const f = invariantesSubstituicao(dps(), dps({ dCompet: '2026-10-02', cTribNac: '060102', cTribMun: '001', cLoc: '3304557' }));
    expect(f).toHaveLength(4);
    expect(f.every((x) => x.startsWith('E0060'))).toBe(true);
  });
});
