/**
 * Lacuna 03e4 (ressalva do #1357; dono, chat, 24/11/2026: "barrar na publicação"). A apuração lê o `vigenteAte` das linhas
 * `ISS_LIMITE/ALIQUOTA_MAX_BP` e `PIS_COFINS` como o FIM da lei (`diaSeguinteAoFimDeVigencia`, fail-closed desde o #1357).
 * Uma linha PUBLISHED sem fim nessas chaves derrubaria perfil fiscal, Simples e receita fiscal de TODA a plataforma —
 * então a publicação (e a proposta, que nasce rascunho para publicar) recusa com 400 dizendo a chave.
 *
 * Quem NÃO lê o fim como obrigatório (outras chaves de ISS_LIMITE/ISS_TRANSICAO, as demais tabelas) segue aceitando fim aberto.
 */
import type { LegalParameter } from 'generated/prisma';
import { LegalParameterService } from '../LegalParameterService';
import { createFormatRegistry } from '../../models/formatRegistry';
import { ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS } from '../../../accounting/paises/br/legalParameters';
import { DP_BR_LEGAL_PARAMETER_FORMATS } from '../../../dp/paises/br/legalParameters';

// PAIS-NA-BORDA-F3 item 6: o 5º argumento é o registro composto da borda.
const formatos = createFormatRegistry([...ACCOUNTING_BR_LEGAL_PARAMETER_FORMATS, ...DP_BR_LEGAL_PARAMETER_FORMATS]);
import { ValidationError } from '../../../../lib/errors';
import type { ProposeLegalParameterInput } from '../../dtos/LegalParameterDto';

const ATOR = { userId: 'padmin' } as never;

function linha(over: Partial<LegalParameter>): LegalParameter {
  return {
    id: 'lp-rascunho', tabela: 'PIS_COFINS', chave: 'PIS', discriminador: 'CUMULATIVO', valorInt: 65, valorTexto: null, valorJson: null,
    fonte: 'IN RFB 2.121/2022', fonteUrl: null, fonteSha256: null, vigenteDesde: '2027-01-01', vigenteAte: null,
    status: 'DRAFT', supersedesId: null, motivo: 'm', proposedById: 'u', publishedById: null,
    publishedAt: null, revokedById: null, revokedAt: null, createdAt: new Date('2026-11-24T00:00:00Z'),
    ...over,
  } as unknown as LegalParameter;
}

function montar(rascunho: LegalParameter) {
  const tx = {} as never;
  const repo = {
    runTransaction: jest.fn(async (fn: (t: never) => Promise<unknown>) => fn(tx)),
    findById: jest.fn().mockResolvedValue(rascunho),
    findPublished: jest.fn().mockResolvedValue([]),
    markPublished: jest.fn().mockResolvedValue(true),
    create: jest.fn(async (d: Record<string, unknown>) => ({ ...rascunho, ...d, id: 'lp-novo' })),
  };
  const policy = { canRead: () => true, canManage: () => true };
  const audit = { append: jest.fn().mockResolvedValue(undefined) };
  const recalc = { create: jest.fn().mockResolvedValue(undefined) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- colaboradores falsos, só o que o caminho toca
  const svc = new LegalParameterService(repo as any, policy, audit as any, recalc as any, formatos);
  return { svc, repo };
}

const SEM_FIM = [
  ['PIS_COFINS/PIS', { tabela: 'PIS_COFINS', chave: 'PIS', discriminador: 'CUMULATIVO', valorInt: 65 }],
  ['PIS_COFINS/COFINS', { tabela: 'PIS_COFINS', chave: 'COFINS', discriminador: 'NAO_CUMULATIVO', valorInt: 760 }],
  ['ISS_LIMITE/ALIQUOTA_MAX_BP', { tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MAX_BP', discriminador: null, valorInt: 500 }],
] as const;

describe('lacuna 03e4 — linha sem vigenteAte nas chaves em que a apuração lê o fim da lei', () => {
  it.each(SEM_FIM)('publish: %s sem vigenteAte ⇒ ValidationError que nomeia a chave e o vigenteAte; nada é publicado', async (nome, campos) => {
    const { svc, repo } = montar(linha({ ...campos, vigenteAte: null }));
    const err = await svc.publish(ATOR, 'lp-rascunho').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).toContain(nome);
    expect((err as Error).message).toContain('vigenteAte');
    expect(repo.markPublished).not.toHaveBeenCalled();
  });

  it.each(SEM_FIM)('propose: %s sem vigenteAte ⇒ 400 antes de gravar o rascunho', async (nome, campos) => {
    const { svc, repo } = montar(linha({}));
    const d = { ...campos, discriminador: campos.discriminador ?? undefined, fonte: 'f', vigenteDesde: '2027-01-01', motivo: 'm' } as unknown as ProposeLegalParameterInput;
    const err = await svc.propose(ATOR, d).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as Error).message).toContain(nome);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it.each(SEM_FIM)('publish: %s COM vigenteAte segue publicando', async (_nome, campos) => {
    const { svc, repo } = montar(linha({ ...campos, vigenteAte: '2026-12-31', vigenteDesde: '2025-01-01' }));
    await expect(svc.publish(ATOR, 'lp-rascunho')).resolves.toMatchObject({ status: 'PUBLISHED' });
    expect(repo.markPublished).toHaveBeenCalledTimes(1);
  });

  it('fora do conjunto, fim aberto continua válido: ISS_LIMITE/ALIQUOTA_MIN_BP e ISS_TRANSICAO/FATOR_REDUCAO_BP', async () => {
    for (const campos of [
      { tabela: 'ISS_LIMITE', chave: 'ALIQUOTA_MIN_BP', discriminador: null, valorInt: 200 },
      { tabela: 'ISS_TRANSICAO', chave: 'FATOR_REDUCAO_BP', discriminador: null, valorInt: 1000 },
    ]) {
      const { svc, repo } = montar(linha({ ...campos, vigenteAte: null }));
      await expect(svc.publish(ATOR, 'lp-rascunho')).resolves.toMatchObject({ status: 'PUBLISHED' });
      expect(repo.markPublished).toHaveBeenCalledTimes(1);
    }
  });
});
