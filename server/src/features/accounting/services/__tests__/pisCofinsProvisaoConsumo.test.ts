/**
 * BE-INCR-PIS-COFINS PR-3 (nó X8, item 17) — o que a provisão baixa do "PIS/COFINS a recuperar" no não cumulativo.
 * L-1 (a) ratificado: a NF-e do mês consome primeiro; L-2 ("baixar também o saldo usado", dono 06/10): o saldo credor
 * anterior consumido também sai; L-4 (desta sessão): os outros créditos do mês consomem ANTES do saldo anterior.
 */
import { consumoPisCofins, creditoNfeAproveitado, provisaoPendente, saldoAnteriorAproveitado } from '../TaxAssessmentService';

const NC = 'PIS_COFINS_NAO_CUMULATIVO';
const linha = (codigo: string, valorCents: number) => ({ codigo, descricao: codigo, valorCents: String(valorCents), fonte: 'f' });
const row = (modo: string, devido: number, memoria: ReturnType<typeof linha>[]) => ({ modo, periodo: 'M02', devidoCents: BigInt(devido), memoria });

describe('X8 PR-3 — consumo do crédito na provisão (L-1, L-2, L-4)', () => {
  it('NF-e acima do débito: baixa só o débito; saldo anterior não é consumido', () => {
    const r = row(NC, 165, [linha('CREDITO_NFE', 1000), linha('SALDO_CREDOR_ANTERIOR', 50)]);
    expect([creditoNfeAproveitado(r), saldoAnteriorAproveitado(r)]).toEqual([165n, 0n]);
  });

  it('saldo anterior parcialmente consumido: só o que sobra do débito depois da NF-e (com DERIVADO)', () => {
    const r = row(NC, 1000, [linha('CREDITO_NFE', 300), linha('CREDITO_NFE_DERIVADO', 100), linha('SALDO_CREDOR_ANTERIOR', 900)]);
    expect([creditoNfeAproveitado(r), saldoAnteriorAproveitado(r)]).toEqual([400n, 600n]);
  });

  it('L-4: outros créditos do mês consomem antes do saldo anterior (e não são baixados)', () => {
    const r = row(NC, 1000, [linha('CREDITO_NFE', 300), linha('CREDITO_IV_ALUGUEL_PJ_1', 500), linha('SALDO_CREDOR_ANTERIOR', 900)]);
    expect([creditoNfeAproveitado(r), saldoAnteriorAproveitado(r)]).toEqual([300n, 200n]);
  });

  it('mês sem débito: nada é consumido', () => {
    const r = row(NC, 0, [linha('CREDITO_NFE', 300), linha('SALDO_CREDOR_ANTERIOR', 900)]);
    expect([creditoNfeAproveitado(r), saldoAnteriorAproveitado(r)]).toEqual([0n, 0n]);
  });

  it('cumulativo: sem crédito, sem baixa', () => {
    const r = row('PIS_COFINS_CUMULATIVO', 65_000, [linha('SALDO_CREDOR_ANTERIOR', 900)]);
    expect([creditoNfeAproveitado(r), saldoAnteriorAproveitado(r)]).toEqual([0n, 0n]);
  });

  it('L-5: outros créditos do mês entram inteiros no a recuperar e consomem depois da NF-e', () => {
    const r = row(NC, 1000, [linha('CREDITO_NFE', 300), linha('CREDITO_III_ENERGIA_1', 900), linha('SALDO_CREDOR_ANTERIOR', 50)]);
    expect(consumoPisCofins(r)).toEqual({ outrosDoMes: 900n, nfe: 300n, outros: 700n, saldoAnterior: 0n });
  });

  it('L-5: mês sem débito mas com outros créditos ⇒ provisão pendente (há o reconhecimento a lançar)', () => {
    const base = { status: 'CONFIRMED', provisaoEntryId: null, diferencaPostergadaCents: 0n };
    expect(provisaoPendente({ ...row(NC, 0, [linha('CREDITO_IV_ALUGUEL_PJ_1', 500)]), ...base })).toBe(true);
    expect(provisaoPendente({ ...row(NC, 0, [linha('CREDITO_NFE', 500)]), ...base })).toBe(false);
  });
});
