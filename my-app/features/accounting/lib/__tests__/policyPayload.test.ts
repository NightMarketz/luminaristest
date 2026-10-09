import { describe, it, expect } from 'vitest';
import { toFiscalProfileProposal, toPolicyDiffRows, toScopeSettingsProposal, type TFn } from '../policyPayload';
import { toFiscalProfileForm, toUpsertFiscalProfile } from '../fiscalProfileForm';
import type { FiscalProfileView } from '../../../../lib/services/fiscalProfile.service';

/**
 * FE-INCR-ACCOUNTING-POLICY-VERSION 12a (mapeadores) e 12e (diff): a proposta é o MESMO corpo do PUT menos `unitId`
 * (logo, nenhuma das 6 chaves que o espelho do FE não tem — E-6); a de contas leva só as 3 do imobilizado; o diff
 * mostra só chaves do `payload`, conta sem rótulo vira "conta não encontrada", e a base de uma APPLIED é o snapshot.
 */
const t: TFn = (_k, fb, vars) => fb.replace(/\{\{(\w+)\}\}/g, (_m, n: string) => vars?.[n] ?? '');

const view: FiscalProfileView = {
  unitId: 'u1', regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES',
  pisCofinsCreditExcludesIcms: true, pisCofinsCreditIncludesIpi: false, pisCofinsCreditFromSimplesSupplier: false,
  icmsRecuperavelAccountId: null, pisCofinsRecuperavelAccountId: null, insumoExpenseAccountId: null,
  irpjDespesaAccountId: null, csllDespesaAccountId: null, irpjRecolherAccountId: null, csllRecolherAccountId: null,
  partnerAccountRef: null, codMun: '3550308', inscricaoMunicipal: null, cnae: null,
  dpsSerie: 7, regEspTrib: 0, regApTribSN: 1, issAliquotaBp: 200, issRetidoTomadorPj: false,
  pacoteFatoGerador: 'CONSUMO', pacoteCTribNac: null, pacoteCNBS: null,
  ibsCbsInformar: false, ibsCbsCst: null, ibsCbsClassTrib: null,
  pTotTribFedCent: null, pTotTribEstCent: null, pTotTribMunCent: null, pTotTribSNCent: 1550,
  emissaoForaDoMes: 'BLOQUEAR', d1fConfirmado: true,
  emissao: { completo: true, faltantes: [], pendingExternalValidation: [] }, updatedAt: '2026-10-05T00:00:00.000Z',
};

const E6 = [
  'pisDespesaAccountId', 'cofinsDespesaAccountId', 'pisRecolherAccountId', 'cofinsRecolherAccountId',
  'irpjSaldoNegativoAccountId', 'csllSaldoNegativoAccountId',
];

describe('toFiscalProfileProposal', () => {
  it('payload = corpo do PUT menos unitId (mesmas chaves, mesmos valores); nenhuma das 6 do E-6', () => {
    const built = toUpsertFiscalProfile('u1', toFiscalProfileForm(view));
    if (!built.ok) throw new Error('corpo inválido');
    const proposal = toFiscalProfileProposal(built.body);
    expect(proposal.unitId).toBe('u1');
    expect(proposal.target).toBe('FISCAL_PROFILE');
    expect(proposal.payload).not.toHaveProperty('unitId');
    const { unitId, ...rest } = built.body;
    expect(unitId).toBe('u1');
    expect(proposal.payload).toEqual(rest);
    expect(Object.keys(proposal.payload).sort()).toEqual(Object.keys(built.body).filter((k) => k !== 'unitId').sort());
    for (const k of E6) expect(proposal.payload).not.toHaveProperty(k);
  });
});

describe('toScopeSettingsProposal', () => {
  it('leva só as 3 chaves do imobilizado (patch parcial), unitId no nível de cima', () => {
    const p = toScopeSettingsProposal({ unitId: 'u1', depreciationExpenseAccountId: 'a1', disposalGainAccountId: null, disposalLossAccountId: 'a3' });
    expect(p).toEqual({
      unitId: 'u1',
      target: 'SCOPE_SETTINGS',
      payload: { depreciationExpenseAccountId: 'a1', disposalGainAccountId: null, disposalLossAccountId: 'a3' },
    });
  });
});

describe('toPolicyDiffRows (12e)', () => {
  it('só chaves do payload; rótulos de campo, conta e enum; changed por valor', () => {
    const rows = toPolicyDiffRows(
      'FISCAL_PROFILE',
      { regimeTributario: 'REAL', icmsRecuperavelAccountId: 'acc-1', dpsSerie: 7, issAliquotaBp: 250 },
      { regimeTributario: 'SIMPLES', icmsRecuperavelAccountId: null, dpsSerie: 7, issAliquotaBp: 200, codMun: '3550308' },
      { 'acc-1': '1.1.7.01 — ICMS a recuperar' },
      t,
    );
    expect(rows.map((r) => r.key)).toEqual(['regimeTributario', 'icmsRecuperavelAccountId', 'dpsSerie', 'issAliquotaBp']);
    expect(rows[0]).toMatchObject({ label: 'Regime tributário', current: 'Simples Nacional', proposed: 'Lucro Real', changed: true });
    expect(rows[1]).toMatchObject({ current: '—', proposed: '1.1.7.01 — ICMS a recuperar', changed: true });
    expect(rows[2]).toMatchObject({ label: 'Série da DPS', changed: false });
    expect(rows[3]).toMatchObject({ current: '2,00', proposed: '2,50', changed: true });
  });

  it('conta sem accountLabels vira "conta não encontrada (id abreviado)"; campo sem rótulo de tela mostra o nome técnico', () => {
    const rows = toPolicyDiffRows('FISCAL_PROFILE', { pisDespesaAccountId: 'abcdef123456' }, {}, {}, t);
    expect(rows[0].label).toBe('pisDespesaAccountId');
    expect(rows[0].proposed).toBe('conta não encontrada (abcdef12…)');
  });

  it('versão APPLIED: o chamador passa o appliedSnapshot como base — o diff compara com ele, não com o current', () => {
    const payload = { depreciationExpenseAccountId: 'a2' };
    const snapshot = { depreciationExpenseAccountId: 'a1' };
    const labels = { a1: 'A1', a2: 'A2' };
    const rows = toPolicyDiffRows('SCOPE_SETTINGS', payload, snapshot, labels, t);
    expect(rows[0]).toMatchObject({ label: 'Despesa de depreciação', current: 'A1', proposed: 'A2', changed: true });
  });
});
