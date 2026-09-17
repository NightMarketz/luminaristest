/**
 * BE-INCR-DFE PR-1 (BRIEF item 6) — lógica fina dos DTOs do perfil fiscal (refine/superRefine são
 * invisíveis ao snapshot de shape — memória dto-shape-snapshot-nao-cobre-logica-fina). Cada caso cita a
 * linha do leiaute / RN que sustenta a regra.
 */
import { UpsertFiscalProfileSchema } from '../FiscalProfileDto';
import { UpsertServiceFiscalProfileSchema } from '../ServiceFiscalProfileDto';

const normal = {
  unitId: 'u1',
  regimeTributario: 'REAL' as const,
  icmsContribuinte: false,
  pisCofinsRegime: 'NAO_CUMULATIVO' as const,
};
const simples = { unitId: 'u1', regimeTributario: 'SIMPLES' as const, icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' as const };

describe('UpsertFiscalProfileSchema — campos BE-INCR-DFE', () => {
  it('defaults: dpsSerie=1, regEspTrib=0, issRetidoTomadorPj=false, pacoteFatoGerador=CONSUMO, emissaoForaDoMes=AVISAR; ibsCbsInformar fica undefined (regime decide no serviço)', () => {
    const r = UpsertFiscalProfileSchema.parse(normal);
    expect(r.dpsSerie).toBe(1);
    expect(r.regEspTrib).toBe(0);
    expect(r.issRetidoTomadorPj).toBe(false);
    expect(r.pacoteFatoGerador).toBe('CONSUMO');
    expect(r.emissaoForaDoMes).toBe('AVISAR');
    expect(r.ibsCbsInformar).toBeUndefined();
  });

  it('dpsSerie fora da faixa 1–49999 (serie [106], RN E0010) → 400', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, dpsSerie: 0 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, dpsSerie: 50000 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, dpsSerie: 49999 }).success).toBe(true);
  });

  it('issAliquotaBp > 500 (pAliq [312], RN E0595 "superior a 5%") → 400', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, issAliquotaBp: 501 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, issAliquotaBp: 500 }).success).toBe(true);
  });

  it('codMun precisa de 7 dígitos IBGE (cLocEmi [112])', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, codMun: '355030' }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, codMun: '3550308' }).success).toBe(true);
  });

  it('regApTribSN / pTotTribSNCent só em SIMPLES ([141]; RN E0713) — e pTotTrib{Fed,Est,Mun} só fora do SIMPLES (RN E0712)', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, regApTribSN: 1 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, pTotTribSNCent: 600 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...simples, regApTribSN: 1, pTotTribSNCent: 600 }).success).toBe(true);
    expect(UpsertFiscalProfileSchema.safeParse({ ...simples, regApTribSN: 4 }).success).toBe(false); // [141]: 1|2|3
    expect(UpsertFiscalProfileSchema.safeParse({ ...simples, pTotTribFedCent: 1300 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, pTotTribFedCent: 1300, pTotTribEstCent: 0, pTotTribMunCent: 500 }).success).toBe(true);
  });

  it('ibsCbsClassTrib deve começar pelo CST (RN E0959)', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, ibsCbsCst: '000', ibsCbsClassTrib: '010001' }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, ibsCbsCst: '000', ibsCbsClassTrib: '000001' }).success).toBe(true);
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, ibsCbsCst: '00', ibsCbsClassTrib: '000001' }).success).toBe(false);
  });

  it('campo extra → 400 (.strict()); regras X6 continuam (SIMPLES + icmsContribuinte → 400)', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...normal, foo: 1 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...simples, icmsContribuinte: true }).success).toBe(false);
  });
});

describe('UpsertServiceFiscalProfileSchema (BRIEF item 8)', () => {
  const base = { unitId: 'u1', cTribNac: '060101' };

  it('aceita o salão (060101 barbearia / 060201 esteticistas) e aplica cIndOp default 030101 (Anexo C)', () => {
    const r = UpsertServiceFiscalProfileSchema.parse(base);
    expect(r.cIndOp).toBe('030101');
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cTribNac: '060201' }).success).toBe(true);
  });

  it('cTribNac fora da lista nacional transcrita → 400 (6 dígitos válidos mas inexistentes: 069999)', () => {
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cTribNac: '069999' }).success).toBe(false);
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cTribNac: '60101' }).success).toBe(false); // zero à esquerda obrigatório
  });

  it('cIndOp fora do Anexo C → 400; cNBS exige 9 dígitos [198]; cLocPrestacao 7 dígitos [192]', () => {
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cIndOp: '999999' }).success).toBe(false);
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cNBS: '12602100' }).success).toBe(false);
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cNBS: '126021000' }).success).toBe(true);
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cLocPrestacao: '3550308' }).success).toBe(true);
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, cLocPrestacao: '35503' }).success).toBe(false);
  });

  it('campo extra → 400 (.strict())', () => {
    expect(UpsertServiceFiscalProfileSchema.safeParse({ ...base, serviceRef: 'x' }).success).toBe(false);
  });
});
