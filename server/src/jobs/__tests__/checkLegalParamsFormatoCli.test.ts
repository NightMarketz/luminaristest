/**
 * Lacuna fora do #870 — linha publicada antes de a regra de formato apertar não é revalidada. O serviço lista as PUBLISHED
 * que a regra de hoje recusaria (a mesma do `propose`/`publish`); o comando sai 1 quando há alguma e não escreve nada.
 */
import type { LegalParameter } from 'generated/prisma';
import { checkLegalParamsFormato } from '../checkLegalParamsFormatoCli';
import { LegalParameterService } from '../../features/legalParameters/services/LegalParameterService';
import type { ILegalParameterRepository } from '../../features/legalParameters/repositories/ILegalParameterRepository';

const linha = (o: Partial<LegalParameter>): LegalParameter =>
  ({
    id: 'x', tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 90, valorTexto: null, valorJson: null, fonte: 'f', fonteUrl: null,
    fonteSha256: null, vigenteDesde: '2026-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null, motivo: 'm', proposedById: 'u',
    publishedById: 'u', publishedAt: null, revokedById: null, revokedAt: null, createdAt: new Date(0), ...o,
  }) as LegalParameter;

function servico(publicadas: LegalParameter[]) {
  const repo = { findPublished: jest.fn(async () => publicadas) } as unknown as ILegalParameterRepository;
  return new LegalParameterService(repo, {} as never, {} as never, {} as never);
}

describe('linhas PUBLISHED fora do formato', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('lista só a linha que a regra de hoje recusa (alíquota CBS com discriminador de IBS), com o erro', async () => {
    const s = servico([linha({ id: 'ok' }), linha({ id: 'ruim', discriminador: 'ALIQUOTA_UF' }), linha({ id: 'venc', discriminador: 'VENCIMENTO', valorInt: null, valorTexto: 'ULTIMO_DIA_UTIL_MES_SEGUINTE' })]);
    const fora = await s.linhasPublicadasForaDoFormato();
    expect(fora.map((l) => [l.id, l.erro.startsWith('IBS_CBS/CBS:')])).toEqual([['ruim', true]]);
  });

  it('o comando sai 0 sem linha fora do formato e 1 com alguma', async () => {
    expect(await checkLegalParamsFormato(servico([linha({ id: 'ok' })]))).toBe(0);
    expect(await checkLegalParamsFormato(servico([linha({ id: 'ruim', discriminador: 'OUTRO' })]))).toBe(1);
  });
});
