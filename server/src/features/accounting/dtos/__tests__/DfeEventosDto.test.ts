/**
 * BE-INCR-DFE-EVENTOS (nó X11, PR-1) — lógica fina dos DTOs que o snapshot de shape não vê (memória
 * `dto-shape-snapshot-nao-cobre-logica-fina`): item 2 (prazos do perfil), item 9 (grupo `subst` da DPS, E0078) e o
 * corpo do `POST …/substituir` (item 17).
 */
import { UpsertFiscalProfileSchema } from '../FiscalProfileDto';
import { DpsManualPayloadSchema, DpsSubstSchema, toManualDps } from '../DpsPayloadDto';
import { CancelFiscalDocumentSchema, CancelamentoManualSchema, JanelaEventosSchema, SubstituirFiscalDocumentSchema } from '../FiscalDocumentDto';

const CH = '1'.repeat(50);
const PERFIL = { unitId: 'u', regimeTributario: 'REAL', icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' } as const;

describe('item 2 — prazos do município no FiscalProfile (F-EVT-1 a)', () => {
  it('substPrazoDias 731 → falha (Anexo I [114]: máximo parametrizável 2 anos); 730 passa', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, substPrazoDias: 731 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, substPrazoDias: 730 }).success).toBe(true);
  });

  it('null = desconhecido; cancelPrazoDias e prazoFonte aceitos', () => {
    const r = UpsertFiscalProfileSchema.parse({ ...PERFIL, cancelPrazoDias: null, substPrazoDias: null, prazoFonte: 'Decreto municipal X' });
    expect(r).toMatchObject({ cancelPrazoDias: null, substPrazoDias: null, prazoFonte: 'Decreto municipal X' });
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, cancelPrazoDias: 1.5 }).success).toBe(false);
  });
});

describe('item 9 — grupo infDPS/subst (Anexo I [113]–[116]; XSD TSCodJustSubst)', () => {
  it("cMotivo '99' sem xMotivo → falha (RN E0078); com xMotivo passa", () => {
    expect(DpsSubstSchema.safeParse({ chSubstda: CH, cMotivo: '99' }).success).toBe(false);
    expect(DpsSubstSchema.safeParse({ chSubstda: CH, cMotivo: '99', xMotivo: 'motivo com quinze+' }).success).toBe(true);
  });

  it('cMotivo número (1) → falha: o XSD é string de 2', () => {
    expect(DpsSubstSchema.safeParse({ chSubstda: CH, cMotivo: 1 }).success).toBe(false);
  });

  it('chSubstda fora de 50 dígitos → falha', () => {
    expect(DpsSubstSchema.safeParse({ chSubstda: '123', cMotivo: '01' }).success).toBe(false);
  });

  it('toManualDps mantém o subst na ficha (modo manual)', () => {
    const payload = {
      versao: '1.01' as const,
      infDPS: {
        id: 'DPS' + '0'.repeat(42), tpAmb: 1 as const, dhEmi: '2026-10-01T10:00:00-03:00', verAplic: 'x', serie: 1, nDPS: 1,
        dCompet: '2026-10-01', tpEmit: 1 as const, cLocEmi: '3550308',
        subst: { chSubstda: CH, cMotivo: '01' as const },
        prest: { CNPJ: '11222333000181', regTrib: { opSimpNac: 1 as const, regEspTrib: 0 } },
        toma: { CPF: '11144477735', xNome: 'C' },
        serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', xDescServ: 'x' } },
        valores: {
          vServPrest: { vServ: '100.00' },
          trib: { tribMun: { tribISSQN: 1 as const, tpRetISSQN: 1 as const }, totTrib: { pTotTribSN: '6.00' } },
        },
      },
    };
    const manual = DpsManualPayloadSchema.parse(toManualDps(payload));
    expect(manual.infDPS.subst).toEqual({ chSubstda: CH, cMotivo: '01' });
  });
});

describe('item 17 — SubstituirFiscalDocumentSchema (.strict, E0078)', () => {
  it('aceita o corpo mínimo; recusa campo extra; 99 exige xMotivo', () => {
    expect(SubstituirFiscalDocumentSchema.safeParse({ unitId: 'u', cMotivo: '02' }).success).toBe(true);
    expect(SubstituirFiscalDocumentSchema.safeParse({ unitId: 'u', cMotivo: '02', extra: 1 }).success).toBe(false);
    expect(SubstituirFiscalDocumentSchema.safeParse({ unitId: 'u', cMotivo: '99' }).success).toBe(false);
    expect(SubstituirFiscalDocumentSchema.safeParse({ unitId: 'u', cMotivo: '99', xMotivo: 'x'.repeat(15) }).success).toBe(true);
  });
});

describe('item 4 — contrato de saída JanelaEventosSchema', () => {
  it('ISO com fuso ou null; fonte perfil|desconhecida; .strict', () => {
    expect(JanelaEventosSchema.safeParse({ cancelarAte: '2026-10-02T23:59:59-03:00', substituirAte: null, substituirTeto: null, fonte: 'perfil' }).success).toBe(true);
    expect(JanelaEventosSchema.safeParse({ cancelarAte: '2026-10-02', substituirAte: null, substituirTeto: null, fonte: 'perfil' }).success).toBe(false);
    expect(JanelaEventosSchema.safeParse({ cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'outra' }).success).toBe(false);
  });
});

describe('BE-INCR-NFCE item 27 — corpo do cancelamento como união e prazos 55/65 no perfil', () => {
  it('CancelFiscalDocumentSchema aceita as duas formas e recusa a mistura', () => {
    expect(CancelFiscalDocumentSchema.safeParse({ unitId: 'u', cMotivo: 1, xMotivo: 'erro na emissao da nota' }).success).toBe(true);
    expect(CancelFiscalDocumentSchema.safeParse({ unitId: 'u', xJust: 'x'.repeat(15) }).success).toBe(true);
    expect(CancelFiscalDocumentSchema.safeParse({ unitId: 'u', xJust: 'x'.repeat(15), cMotivo: 1, xMotivo: 'erro na emissao da nota' }).success).toBe(false);
  });

  it('xJust de 15 a 255 caracteres (MOC 7.0 VG Tabela 5-37)', () => {
    expect(CancelFiscalDocumentSchema.safeParse({ unitId: 'u', xJust: 'x'.repeat(14) }).success).toBe(false);
    expect(CancelFiscalDocumentSchema.safeParse({ unitId: 'u', xJust: 'x'.repeat(255) }).success).toBe(true);
    expect(CancelFiscalDocumentSchema.safeParse({ unitId: 'u', xJust: 'x'.repeat(256) }).success).toBe(false);
  });

  it('o cancelamento manual segue só com a forma da NFS-e', () => {
    expect(CancelamentoManualSchema.safeParse({ unitId: 'u', xJust: 'x'.repeat(15) }).success).toBe(false);
    expect(CancelamentoManualSchema.safeParse({ unitId: 'u', cMotivo: 9, xMotivo: 'outro motivo qualquer' }).success).toBe(true);
  });

  it('nfceCancelPrazoMinutos 1–30 (teto do Aj. SINIEF 19/16 cl. 15ª); nfeCancelPrazoHoras ≥ 1, sem teto; null aceito', () => {
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, nfceCancelPrazoMinutos: 31 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, nfceCancelPrazoMinutos: 0 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, nfceCancelPrazoMinutos: 30 }).success).toBe(true);
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, nfeCancelPrazoHoras: 0 }).success).toBe(false);
    expect(UpsertFiscalProfileSchema.safeParse({ ...PERFIL, nfeCancelPrazoHoras: 168 }).success).toBe(true);
    expect(UpsertFiscalProfileSchema.parse({ ...PERFIL, nfeCancelPrazoHoras: null, nfceCancelPrazoMinutos: null })).toMatchObject({ nfeCancelPrazoHoras: null, nfceCancelPrazoMinutos: null });
  });

  it("JanelaEventosSchema aceita fonte 'nacional'", () => {
    expect(JanelaEventosSchema.safeParse({ cancelarAte: null, substituirAte: null, substituirTeto: null, fonte: 'nacional' }).success).toBe(true);
  });
});
