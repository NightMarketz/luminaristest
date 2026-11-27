/**
 * BE-INCR-PAIS-NA-BORDA-F3 item 13 (F-F3-1 a; D-2026-11-26-PAIS-NA-BORDA-F3-FORKS) — o registro de formato é o catálogo de
 * nomes. O DTO só confere a sintaxe; tabela fora do registro dá 400 `PARAMETRO_LEGAL_TABELA_DESCONHECIDA` no `propose`, no
 * filtro do `list` e no `vigente`, e `tabelas()` devolve o catálogo lido do registro, sem repositório.
 */
import type { LegalParameter } from 'generated/prisma';
import { LegalParameterService } from '../LegalParameterService';
import { createFormatRegistry } from '../../models/formatRegistry';
import { TabelaLegalDesconhecidaError } from '../../models/legalParameter';
import { ListLegalParametersQuerySchema, ProposeLegalParameterSchema, VigenteLegalParameterQuerySchema } from '../../dtos/LegalParameterDto';
import { ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS } from '../../../accounting/paises/br/legalParameters';
import { DP_BR_LEGAL_PARAMETER_FORMATS } from '../../../dp/paises/br/legalParameters';
import { ForbiddenError } from '../../../../lib/errors';

const formatos = createFormatRegistry([...ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS, ...DP_BR_LEGAL_PARAMETER_FORMATS]);
const ATOR = { userId: 'padmin', role: 'PLATFORM_ADMIN' };
const CODIGO = 'PARAMETRO_LEGAL_TABELA_DESCONHECIDA';

function montar(canRead = true) {
  const repo = {
    runTransaction: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn().mockResolvedValue([] as LegalParameter[]),
    findPublished: jest.fn().mockResolvedValue([] as LegalParameter[]),
    create: jest.fn(),
  };
  const policy = { canRead: () => canRead, canManage: () => true };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colaboradores falsos, só o que o caminho toca
  const svc = new LegalParameterService(repo as any, policy, {} as any, {} as any, formatos);
  return { svc, repo };
}

const proposta = {
  tabela: 'NAO_EXISTE', chave: 'X', valorInt: 1, fonte: 'Lei', vigenteDesde: '2027-01-01', motivo: 'm',
};

describe('item 13 — tabela fora do registro', () => {
  it('o DTO aceita a sintaxe do nome (quem recusa é o serviço) e recusa nome fora da regex', () => {
    expect(ProposeLegalParameterSchema.safeParse(proposta).success).toBe(true);
    expect(ProposeLegalParameterSchema.safeParse({ ...proposta, tabela: 'nao_existe' }).success).toBe(false);
    expect(ListLegalParametersQuerySchema.safeParse({ tabela: 'X' }).success).toBe(false); // 2 a 64 caracteres
    expect(VigenteLegalParameterQuerySchema.safeParse({ tabela: 'NAO-EXISTE', chave: 'X', data: '2027-01-01' }).success).toBe(false);
  });

  it('propose ⇒ 400 PARAMETRO_LEGAL_TABELA_DESCONHECIDA, sem gravar', async () => {
    const { svc, repo } = montar();
    const err = await svc.propose(ATOR, ProposeLegalParameterSchema.parse(proposta)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TabelaLegalDesconhecidaError);
    expect([(err as TabelaLegalDesconhecidaError).statusCode, (err as TabelaLegalDesconhecidaError).errorCode]).toEqual([400, CODIGO]);
    expect(repo.runTransaction).not.toHaveBeenCalled();
  });

  it('list com filtro desconhecido ⇒ 400 com o código; sem filtro ou com tabela registrada, lista', async () => {
    const { svc, repo } = montar();
    await expect(svc.list(ATOR, { tabela: 'NAO_EXISTE' })).rejects.toMatchObject({ errorCode: CODIGO, statusCode: 400 });
    expect(repo.findMany).not.toHaveBeenCalled();
    await expect(svc.list(ATOR, {})).resolves.toEqual([]);
    await expect(svc.list(ATOR, { tabela: 'FOLHA_REGRA' })).resolves.toEqual([]);
  });

  it('vigente desconhecida ⇒ 400 com o código, antes da fotografia (o nome não entra no cache)', async () => {
    const { svc, repo } = montar();
    await expect(svc.vigente(ATOR, { tabela: 'NAO_EXISTE', chave: 'X', data: '2027-01-01' })).rejects.toMatchObject({ errorCode: CODIGO, statusCode: 400 });
    expect(repo.findPublished).not.toHaveBeenCalled();
  });

  it('a policy de leitura vem antes do 400', async () => {
    const { svc } = montar(false);
    await expect(svc.list(ATOR, { tabela: 'NAO_EXISTE' })).rejects.toBeInstanceOf(ForbiddenError);
    expect(() => svc.tabelas(ATOR)).toThrow(ForbiddenError);
  });
});

describe('item 13 — tabelas(): o catálogo do registro', () => {
  it('56 itens, cada um com pais br, dono e tipoValor no vocabulário do front (misto = valor por chave)', () => {
    const { svc, repo } = montar();
    const tabelas = svc.tabelas(ATOR);
    expect(tabelas).toHaveLength(56);
    expect(tabelas.every((t) => t.pais === 'br')).toBe(true);
    const de = (n: string) => tabelas.find((t) => t.tabela === n);
    expect(de('INSS_EMPREGADO')).toEqual({ tabela: 'INSS_EMPREGADO', dominio: 'dp', pais: 'br', tipoValor: 'json' });
    expect(de('FOLHA_REGRA')).toMatchObject({ dominio: 'dp', tipoValor: 'misto' });
    expect(de('TAX_ASSESSMENT')).toMatchObject({ dominio: 'accounting', tipoValor: 'misto' });
    expect(de('MARCO_LEGAL')).toMatchObject({ dominio: 'accounting', tipoValor: 'texto' });
    expect(new Set(tabelas.map((t) => t.tipoValor))).toEqual(new Set(['int', 'texto', 'json', 'misto']));
    expect(repo.findPublished).not.toHaveBeenCalled();
  });
});
