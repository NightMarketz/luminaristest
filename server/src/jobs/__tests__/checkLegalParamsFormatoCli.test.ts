/**
 * Lacuna fora do #870 — linha publicada antes de a regra de formato apertar não é revalidada. O serviço lista as PUBLISHED
 * que a regra de hoje recusaria (a mesma do `propose`/`publish`); o comando sai 1 quando há alguma e não escreve nada.
 */
import type { LegalParameter } from 'generated/prisma';
import { checkLegalParamsFormato } from '../checkLegalParamsFormatoCli';
import { LegalParameterService } from '../../features/legalParameters/services/LegalParameterService';
import type { ILegalParameterRepository } from '../../features/legalParameters/repositories/ILegalParameterRepository';
import { createFormatRegistry, type LegalParameterFormatRegistration } from '../../features/legalParameters/models/formatRegistry';
import { LEGAL_PARAMETER_FORMATS } from '../../lib/factory';

const linha = (o: Partial<LegalParameter>): LegalParameter =>
  ({
    id: 'x', tabela: 'IBS_CBS', chave: 'CBS', discriminador: 'ALIQUOTA', valorInt: 90, valorTexto: null, valorJson: null, fonte: 'f', fonteUrl: null,
    fonteSha256: null, vigenteDesde: '2026-01-01', vigenteAte: null, status: 'PUBLISHED', supersedesId: null, motivo: 'm', proposedById: 'u',
    publishedById: 'u', publishedAt: null, revokedById: null, revokedAt: null, createdAt: new Date(0), ...o,
  }) as LegalParameter;

// PAIS-NA-BORDA-F3 item 10: o serviço recebe o registro composto da factory (a mesma constante que a produção usa).
function servico(publicadas: LegalParameter[], formatos: readonly LegalParameterFormatRegistration[] = LEGAL_PARAMETER_FORMATS) {
  const repo = { findPublished: jest.fn(async () => publicadas) } as unknown as ILegalParameterRepository;
  return new LegalParameterService(repo, {} as never, {} as never, {} as never, createFormatRegistry(formatos));
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

  it('PAIS-NA-BORDA-F3 item 10: a checagem entre tabelas também roda no CLI — B publicada cuja dependência A foi revogada sai 1', async () => {
    const toy: LegalParameterFormatRegistration[] = [
      { table: 'A', domain: 'toy', country: 'zz', value: 'int', check: () => null },
      {
        table: 'B', domain: 'toy', country: 'zz', value: 'int', check: () => null, requires: ['A'],
        checkAgainst: (_l, ctx) => (ctx.rowsInForce('A').length > 0 ? null : 'sem linha de A em vigor'),
      },
    ];
    const a = linha({ id: 'a', tabela: 'A', chave: 'K', discriminador: null });
    const b = linha({ id: 'b', tabela: 'B', chave: 'K', discriminador: null });
    expect(await checkLegalParamsFormato(servico([a, b], toy))).toBe(0);
    // A revogada não volta no findPublished: só B publicada.
    const s = servico([b], toy);
    expect((await s.linhasPublicadasForaDoFormato()).map((l) => [l.id, l.erro])).toEqual([['b', 'B/K: sem linha de A em vigor (em 2026-01-01).']]);
    expect(await checkLegalParamsFormato(s)).toBe(1);
  });
});
