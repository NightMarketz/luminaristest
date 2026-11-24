/**
 * Onda 3.2 / fatia 3 (#8) — a recusa "apuração de IBS/CBS começa em 01/2027" é do SERVIÇO e lê o marco da linha
 * `OBRIGACAO_REGIME/IBS_CBS_APURACAO` (não mais `min(2027)` no DTO). Prova de virada: o mesmo pedido (ano 2027) é recusado
 * ou aceito conforme a linha, sem tocar em código. Só a guarda é exercida (repositórios falsos mínimos).
 */
import { fotografiaSemente } from '@test/helpers/legalParams';
import type { LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { IBS_CBS_ANTES_DE_2027 } from '../../dtos/IbsCbsAssessmentDto';
import { IbsCbsAssessmentService } from '../IbsCbsAssessmentService';

const scope = { ownerUserId: 'owner-1', unitId: 'unit-1' } as never;

function build(linhasMarco: readonly LinhaLegal[]) {
  const findByYear = jest.fn(async () => null);
  const findMany = jest.fn(async () => []);
  const svc = Object.create(IbsCbsAssessmentService.prototype) as IbsCbsAssessmentService;
  Object.assign(svc, {
    policy: { canReadTaxAssessment: () => true },
    legalParams: { fotografia: async () => linhasMarco },
    companyProfileRepo: { findByYear },
    repo: { findMany },
  });
  return { svc, findByYear, findMany };
}

const comMarcoEm = (desde: string | null): LinhaLegal[] =>
  fotografiaSemente(['OBRIGACAO_REGIME']).flatMap((l) => {
    if (l.chave !== 'IBS_CBS_APURACAO' || l.discriminador === 'SIMPLES' || l.discriminador === 'MEI') return [l];
    return desde === null ? [] : [{ ...l, vigenteDesde: desde }];
  });

describe('IbsCbsAssessmentService — marco do início da apuração vem da linha (Onda 3.2 #8)', () => {
  it('semente (2027-01-01): list de 2026 ⇒ 400 IBS_CBS_ANTES_DE_2027 antes de ler qualquer repositório; 2027 passa a guarda', async () => {
    const { svc, findByYear, findMany } = build(comMarcoEm('2027-01-01'));
    await expect(svc.list(scope, { unitId: 'unit-1', anoCalendario: 2026 })).rejects.toMatchObject({ message: IBS_CBS_ANTES_DE_2027, statusCode: 400, errorCode: 'IBS_CBS_ANTES_DE_2027' });
    expect(findByYear).not.toHaveBeenCalled();
    await expect(svc.list(scope, { unitId: 'unit-1', anoCalendario: 2027 })).resolves.toEqual([]);
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it('VIRADA: marco adiado para 2028-01-01 ⇒ o MESMO list de 2027 passa a ser recusado; antecipado para 2026-01-01 ⇒ 2026 passa', async () => {
    await expect(build(comMarcoEm('2028-01-01')).svc.list(scope, { unitId: 'unit-1', anoCalendario: 2027 })).rejects.toMatchObject({ statusCode: 400, errorCode: 'IBS_CBS_ANTES_DE_2027' });
    await expect(build(comMarcoEm('2026-01-01')).svc.list(scope, { unitId: 'unit-1', anoCalendario: 2026 })).resolves.toEqual([]);
  });

  it('preview: mês anterior ao do marco ⇒ 400 (2027-03 como marco recusa 2027-02, ao nível do mês)', async () => {
    const { svc, findByYear } = build(comMarcoEm('2027-03-01'));
    await expect(svc.preview(scope, { unitId: 'unit-1', anoCalendario: 2027, mes: 2, tributo: 'IBS' })).rejects.toMatchObject({ statusCode: 400, errorCode: 'IBS_CBS_ANTES_DE_2027' });
    expect(findByYear).not.toHaveBeenCalled();
  });

  it('sem linha do marco ⇒ 400 PARAMETRO_LEGAL_AUSENTE (fail-closed), nunca "passa por falta de dado"', async () => {
    await expect(build(comMarcoEm(null)).svc.list(scope, { unitId: 'unit-1', anoCalendario: 2027 })).rejects.toMatchObject({ statusCode: 400, errorCode: 'PARAMETRO_LEGAL_AUSENTE' });
  });
});
