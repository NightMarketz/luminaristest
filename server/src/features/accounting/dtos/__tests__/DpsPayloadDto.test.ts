import { DpsPayloadSchema } from '../DpsPayloadDto';

/**
 * GAP-MAP Nível 3 — `pAliq` [312] da DPS. XSD v1.01: `TSDec1V2` = `0|[0-9](\.[0-9]{2})?` (UM dígito inteiro;
 * transcrição da NFS-e, PR #405, §8 item 3). O schema aceitava `\d{1,2}\.\d{2}` — "10.00" passava aqui e seria
 * recusado pelo leiaute.
 */
function payload(pAliq: string) {
  return {
    versao: '1.01',
    infDPS: {
      id: `DPS${'1'.repeat(42)}`,
      tpAmb: 2,
      dhEmi: '2026-09-27T10:00:00-03:00',
      verAplic: 'luminaris',
      serie: 1,
      nDPS: 1,
      dCompet: '2026-09-27',
      tpEmit: 1,
      cLocEmi: '3550308',
      prest: { CNPJ: '11222333000181', regTrib: { opSimpNac: 1, regEspTrib: 0 } },
      toma: { CPF: '52998224725', xNome: 'Cliente' },
      serv: {
        locPrest: { cLocPrestacao: '3550308' },
        cServ: { cTribNac: '060101', xDescServ: 'Corte' },
      },
      valores: {
        vServPrest: { vServ: '100.00' },
        trib: {
          tribMun: { tribISSQN: 1, tpRetISSQN: 1, pAliq },
          totTrib: { pTotTrib: { pTotTribFed: '10.00', pTotTribEst: '0.00', pTotTribMun: '5.00' } },
        },
      },
    },
  };
}

describe('DpsPayloadSchema — pAliq [312] (TSDec1V2)', () => {
  it('aceita alíquota com um dígito inteiro', () => {
    expect(DpsPayloadSchema.safeParse(payload('5.00')).success).toBe(true);
  });

  it('recusa alíquota com dois dígitos inteiros ("10.00"), como o XSD', () => {
    expect(DpsPayloadSchema.safeParse(payload('10.00')).success).toBe(false);
  });
});

describe('DpsPayloadSchema — opSimpNac [140] (X14 PR-4 item 30)', () => {
  const comOp = (opSimpNac: number) => {
    const p = payload('5.00');
    p.infDPS.prest.regTrib.opSimpNac = opSimpNac;
    return p;
  };
  it('aceita 2 (MEI) além de 1 e 3', () => {
    for (const op of [1, 2, 3]) expect(DpsPayloadSchema.safeParse(comOp(op)).success).toBe(true);
  });
  it('recusa código fora do leiaute', () => {
    expect(DpsPayloadSchema.safeParse(comOp(4)).success).toBe(false);
  });
});
