import { IbsCbsResumoSchema } from '../../dtos/IbsCbsAssessmentDto';
import { ImpedimentoCaixaSchema } from '../../dtos/SimplesDto';
import { IbsCbsDocumentoSchema } from '../ibsCbsCompetencia';
import { IssDocInputSchema, IssLinhaSchema } from '../issCompetencia';
import { RastreioContaSchema } from '../taxAssessmentRastreio';
import { competenciaDaSugestao, type SugestaoDoRelatorio } from '../taxOptimizationReport';

/**
 * SOT F-12.1 — data (`AAAA-MM-DD`) e competência (`AAAA-MM`) validadas só por regex aceitam o que o calendário não
 * tem: `2026-02-30` (o `Date` do JS rola para março) e mês `13`. A regra canônica é `isValidDateOnly`
 * (`models/dates.ts`); a competência vale se `AAAA-MM-01` for data real. Um caso por sítio fora de zona proibida.
 * Fora (ZP "transmissão fiscal e assinatura", `CONTEXTO.md`): `FiscalCertificateDto`, `DfeSignerDto`,
 * `PscCredentialDto`, `DpsPayloadDto`. Fora também `WithholdingService.ts:620` (string montada pelo próprio servidor) e os
 * sítios de `sectorKits` (`KitInstallationDto.today`) e `accountingBinding` (`ActivateDefaultBindingDto.period`): a
 * fronteira de import (`importBoundary.test.ts` de cada um) só libera nomes listados de `features/accounting`, e
 * `models/dates` não está na lista — liberar é decisão do dono.
 */
const DIA_INVALIDO = '2026-02-30';
const MES_INVALIDO = '2026-13';

describe('SOT F-12.1 — data e competência validadas pelo calendário, não só pela regex', () => {
  it('SOT F-12.1: IbsCbsAssessmentDto (resumo) vencimento recusa 2026-02-30', () => {
    expect(IbsCbsResumoSchema.shape.vencimento.safeParse(DIA_INVALIDO).success).toBe(false);
  });

  it('SOT F-12.1: ibsCbsCompetencia dataEmissaoLocal recusa 2026-02-30', () => {
    expect(IbsCbsDocumentoSchema.shape.dataEmissaoLocal.safeParse(DIA_INVALIDO).success).toBe(false);
  });

  it('SOT F-12.1: issCompetencia dCompet recusa 2026-02-30', () => {
    expect(IssDocInputSchema.shape.dCompet.safeParse(DIA_INVALIDO).success).toBe(false);
  });

  it('SOT F-12.1: taxAssessmentRastreio from/to recusam 2026-02-30', () => {
    expect(RastreioContaSchema.shape.from.safeParse(DIA_INVALIDO).success).toBe(false);
    expect(RastreioContaSchema.shape.to.safeParse(DIA_INVALIDO).success).toBe(false);
  });

  it('SOT F-12.1: issCompetencia competencia recusa mês 13', () => {
    expect(IssLinhaSchema.shape.competencia.safeParse(MES_INVALIDO).success).toBe(false);
  });

  it('SOT F-12.1: SimplesDto mesBase recusa mês 13', () => {
    expect(ImpedimentoCaixaSchema.shape.mesBase.safeParse(MES_INVALIDO).success).toBe(false);
  });

  it('SOT F-12.1: taxOptimizationReport não devolve competência de mês 13 (cai na data da decisão)', () => {
    const s = {
      subjectType: 'COMPETENCIA', subjectId: MES_INVALIDO,
      decidedAt: new Date('2026-05-10T12:00:00Z'), createdAt: new Date('2026-05-01T12:00:00Z'),
    } as SugestaoDoRelatorio;
    expect(competenciaDaSugestao(s, new Map(), (d) => d.toISOString().slice(0, 10))).toBe('2026-05');
  });

  it('controle: data e competência reais continuam aceitas', () => {
    expect(IssDocInputSchema.shape.dCompet.safeParse('2026-02-28').success).toBe(true);
    expect(IssLinhaSchema.shape.competencia.safeParse('2026-12').success).toBe(true);
    expect(ImpedimentoCaixaSchema.shape.mesBase.safeParse('2024-02').success).toBe(true);
  });
});
