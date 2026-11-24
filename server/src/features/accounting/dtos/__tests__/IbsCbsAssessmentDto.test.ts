/**
 * IBS-CBS-2027 PR-2 — contrato de entrada/saída (BRIEF §4.2): `.strict()`, ano sem teto fixo (marco = linha, Onda 3.2), memória com
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

  // Onda 3.2: o início da apuração é a linha OBRIGACAO_REGIME/IBS_CBS_APURACAO — o DTO não a lê. A recusa de ano/competência
  // anterior ao marco é do serviço (400 com IBS_CBS_ANTES_DE_2027; ver ibsCbsAssessment.integration e ibsCbsViradaPorLinhas.test).
  it('ano não é limitado pelo schema (o marco vem das linhas): 2026 passa o DTO; a mensagem nomeada segue exportada', () => {
    expect(IbsCbsAssessmentPreviewSchema.safeParse({ ...base, anoCalendario: 2026 }).success).toBe(true);
    expect(IbsCbsAssessmentListQuerySchema.safeParse({ unitId: 'u1', anoCalendario: '2026' }).success).toBe(true);
    expect(IbsCbsAssessmentListQuerySchema.safeParse({ unitId: 'u1', anoCalendario: '2027' }).success).toBe(true);
    expect(IbsCbsAssessmentListQuerySchema.safeParse({ unitId: 'u1', anoCalendario: '2026.5' }).success).toBe(false);
    expect(IBS_CBS_ANTES_DE_2027).toMatch(/começa em 01\/2027/);
  });

  it('confirmação exige expectedSupersedesId (string ou null)', () => {
    expect(IbsCbsAssessmentConfirmSchema.safeParse(base).success).toBe(false);
    expect(IbsCbsAssessmentConfirmSchema.safeParse({ ...base, expectedSupersedesId: null }).success).toBe(true);
    expect(IbsCbsAssessmentConfirmSchema.safeParse({ ...base, expectedSupersedesId: 'x' }).success).toBe(true);
  });

  it('memória: códigos do enum; _n só nas linhas por documento/nota/pagamento/consumo', () => {
    const l = (codigo: string) => [{ codigo, descricao: '', valorCents: '0', fonte: '' }];
    for (const ok of [
      'DEBITO_DOC_3', 'DIVERGENCIA_DOC_1', 'RECLASSIFICACAO_SERVICO', 'CONFERENCIA_SEM_BASE', 'SALDO',
      // PR-3 (itens 16–18)
      'CREDITO_ENTRADA_2', 'CREDITO_NAO_APROPRIADO_1', 'USO_CONSUMO_PESSOAL_1', 'ANTECIPACAO_ART10_4', 'ANTECIPACAO_SEM_REDUCAO',
      'ACERTO_ART10_1', 'PAGAMENTO_INDEVIDO_ART38_1',
    ]) {
      expect(MemoriaIbsCbsSchema.safeParse(l(ok)).success).toBe(true);
    }
    // PR-3: CREDITOS_NAO_IMPLEMENTADOS_PR3 sai do enum (BRIEF §4.2).
    for (const ko of ['SALDO_1', 'DEBITO', 'QUALQUER', 'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'ANTECIPACAO_SEM_REDUCAO_1']) expect(MemoriaIbsCbsSchema.safeParse(l(ko)).success).toBe(false);
  });
});
