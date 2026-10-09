/** D-2026-10-10-X14-ALERTA-INFORMATIVO (dono, chat, 2026-10-10) — contrato do alerta da apuração do Simples. */
import { AlertaSimplesSchema } from '../SimplesDto';

describe('AlertaSimplesSchema', () => {
  it('INFO com motivo e WARNING sem motivo são válidos', () => {
    expect(AlertaSimplesSchema.safeParse({ codigo: 'NFSE_DIVERGE_RECEITA', detalhe: 'x', severity: 'INFO', motivoInformativo: 'REGIME_CAIXA' }).success).toBe(true);
    expect(AlertaSimplesSchema.safeParse({ codigo: 'NFSE_DIVERGE_RECEITA', detalhe: 'x', severity: 'INFO', motivoInformativo: 'DOCUMENTO_MUNICIPAL_TRANSIÇÃO' }).success).toBe(true);
    expect(AlertaSimplesSchema.safeParse({ codigo: 'RBT12_INCOMPLETO', detalhe: 'x', severity: 'WARNING' }).success).toBe(true);
  });

  it('motivoInformativo só com severity INFO', () => {
    expect(AlertaSimplesSchema.safeParse({ codigo: 'NFSE_DIVERGE_RECEITA', detalhe: 'x', severity: 'WARNING', motivoInformativo: 'REGIME_CAIXA' }).success).toBe(false);
  });

  it('severity é obrigatória e o objeto é estrito', () => {
    expect(AlertaSimplesSchema.safeParse({ codigo: 'NFSE_DIVERGE_RECEITA', detalhe: 'x' }).success).toBe(false);
    expect(AlertaSimplesSchema.safeParse({ codigo: 'NFSE_DIVERGE_RECEITA', detalhe: 'x', severity: 'INFO', extra: 1 }).success).toBe(false);
  });
});
