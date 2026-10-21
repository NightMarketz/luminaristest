/**
 * IBS-CBS-2027 PR-2 — contrato de entrada/saída (BRIEF §4.2): `.strict()`, ano ≥ 2027 com 400 nomeado, memória com
 * código do enum (sufixo `_n` só nas linhas por documento).
 */
import { IBS_CBS_ANTES_DE_2027, IbsCbsAssessmentConfirmSchema, IbsCbsAssessmentListQuerySchema, IbsCbsAssessmentPreviewSchema, MemoriaIbsCbsSchema } from '../IbsCbsAssessmentDto';

const base = { unitId: 'u1', anoCalendario: 2027, mes: 2, tributo: 'IBS' };

describe('IbsCbsAssessmentDto', () => {
  it('prévia: strict, mês 1..12, tributo IBS|CBS', () => {
    expect(IbsCbsAssessmentPreviewSchema.safeParse(base).success).toBe(true);
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, extra: 1 }).success).toBe(false);
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, mes: 13 }).success).toBe(false);
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, tributo: 'PIS' }).success).toBe(false);
  });

  it('ano < 2027 ⇒ mensagem nomeada (F-IBS-7 b), também na query', () => {
    const r = IbsCbsAssessmentPreviewSchema.safeParse({ ...base, anoCalendario: 2026 });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.flatten())).toContain(IBS_CBS_ANTES_DE_2027);
    expect(IbsCbsAssessmentListQuerySchema.safeParse({ unitId: 'u1', anoCalendario: '2026' }).success).toBe(false);
    expect(IbsCbsAssessmentListQuerySchema.safeParse({ unitId: 'u1', anoCalendario: '2027' }).success).toBe(true);
  });

  it('confirmação exige expectedSupersedesId (string ou null)', () => {
    expect(IbsCbsAssessmentConfirmSchema.safeParse(base).success).toBe(false);
    expect(IbsCbsAssessmentConfirmSchema.safeParse({ ...base, expectedSupersedesId: null }).success).toBe(true);
    expect(IbsCbsAssessmentConfirmSchema.safeParse({ ...base, expectedSupersedesId: 'x' }).success).toBe(true);
  });

  it('memória: códigos do enum; _n só em DEBITO_DOC/DIVERGENCIA_DOC', () => {
    const l = (codigo: string) => [{ codigo, descricao: '', valorCents: '0', fonte: '' }];
    for (const ok of ['DEBITO_DOC_3', 'DIVERGENCIA_DOC_1', 'RECLASSIFICACAO_SERVICO', 'CONFERENCIA_SEM_BASE', 'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'SALDO']) {
      expect(MemoriaIbsCbsSchema.safeParse(l(ok)).success).toBe(true);
    }
    for (const ko of ['SALDO_1', 'DEBITO', 'QUALQUER']) expect(MemoriaIbsCbsSchema.safeParse(l(ko)).success).toBe(false);
  });
});
