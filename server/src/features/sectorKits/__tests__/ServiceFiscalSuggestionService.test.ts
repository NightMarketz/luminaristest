import { ForbiddenError, ValidationError } from '../../../lib/errors';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import { BEAUTY_SALON_KIT_V4 } from '../kits/beautySalon/kit.v4';
import { MAX_IA_POR_VARREDURA, ServiceFiscalSuggestionService } from '../services/ServiceFiscalSuggestionService';
import type { ServiceClassifierPort } from '../services/serviceFiscalSuggestionPorts';

/**
 * BE-INCR-KIT-SETOR-EMENDA-1, PR-K3 — serviço de sugestão (7c–7f) sobre portas falsas. Não existe porta de gravação no
 * construtor: "nunca grava" (7d) é estrutural; a integração confere que o perfil fiscal de serviço não muda.
 */
const scope: BindingScope = { ownerUserId: 'u1', actorUserId: 'u1', unitId: 'unit-1' };

function build(opts: {
  kit?: boolean;
  linhas?: Array<{ id: string; name: string }>;
  comPerfil?: string[];
  classifier?: ServiceClassifierPort | null;
  canRead?: boolean;
} = {}) {
  const service = new ServiceFiscalSuggestionService(
    { canInstallKit: () => true, canManageKit: () => true, canReadServiceFiscalSuggestions: () => opts.canRead ?? true, canReadKitTrace: () => true },
    { findByScope: async () => (opts.kit === false ? null : ({ kitKey: 'beautySalon', kitVersion: 4 } as never)) },
    {
      findTableByInternalName: async () => ({ id: 't-services' }),
      findAllDataByTableId: async () => (opts.linhas ?? []).map((l) => ({ id: l.id, data: { name: l.name } })),
    },
    { serviceRefsComPerfil: async () => new Set(opts.comPerfil ?? []) },
    opts.classifier === undefined ? null : opts.classifier,
    () => [BEAUTY_SALON_KIT_V4],
  );
  return service;
}

const classificador = (resposta: string | null | Error) => {
  const fn = jest.fn(async () => {
    if (resposta instanceof Error) throw resposta;
    return resposta;
  });
  return { port: { classifyIntoEnum: fn }, fn };
};

describe('ServiceFiscalSuggestionService.preview (7f)', () => {
  it('camada 1 casa ⇒ sugestão do dicionário, sem chamar a IA', async () => {
    const ia = classificador('massagem');
    const out = await build({ classifier: ia.port }).preview(scope, 'Escova progressiva');
    expect(out[0]).toMatchObject({ key: 'cabeleireiro', cTribNac: '060101', origem: 'dicionario' });
    expect(ia.fn).not.toHaveBeenCalled();
  });

  it('camada 1 vazia ⇒ IA escolhe uma key do enum; cTribNac e cNBS vêm do catálogo; rótulo "confira"', async () => {
    const ia = classificador('estetica');
    const out = await build({ classifier: ia.port }).preview(scope, 'Ritual facial renovador');
    expect(out).toEqual([
      { key: 'estetica', cTribNac: '060201', cNBS: '126022000', label: expect.stringContaining('sugestão da IA, confira'), origem: 'ia' },
    ]);
    const [, , opcoes] = ia.fn.mock.calls[0] as unknown as [string, string, string[]];
    expect(opcoes).toEqual(BEAUTY_SALON_KIT_V4.serviceFiscalDefaults.map((i) => i.key));
  });

  it('7c: IA devolvendo key fora do enum ⇒ descartado ([])', async () => {
    expect(await build({ classifier: classificador('inventada').port }).preview(scope, 'Ritual facial renovador')).toEqual([]);
  });

  it('7c: IA com erro ⇒ [] sem derrubar; IA não configurada ⇒ []', async () => {
    expect(await build({ classifier: classificador(new Error('timeout')).port }).preview(scope, 'Ritual facial renovador')).toEqual([]);
    expect(await build({ classifier: null }).preview(scope, 'Ritual facial renovador')).toEqual([]);
  });

  it('L3: unidade sem kit ⇒ 400 UNIDADE_SEM_KIT', async () => {
    const erro = await build({ kit: false }).preview(scope, 'Corte').catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ValidationError);
    expect((erro as Error).message).toContain('UNIDADE_SEM_KIT');
  });

  it('policy nega ⇒ ForbiddenError', async () => {
    await expect(build({ canRead: false }).preview(scope, 'Corte')).rejects.toThrow(ForbiddenError);
  });
});

describe('ServiceFiscalSuggestionService.pendentes (7e)', () => {
  const linhas = [
    { id: 's1', name: 'Corte feminino' },
    { id: 's2', name: 'Manicure' },
    { id: 's3', name: 'Ritual facial renovador' },
  ];

  it('lista só os serviços sem perfil fiscal na unidade, com a sugestão da camada 1; sem ?ia=1 a IA não roda', async () => {
    const ia = classificador('estetica');
    const out = await build({ linhas, comPerfil: ['s2'], classifier: ia.port }).pendentes(scope, { ia: false });
    expect(out.map((p) => [p.serviceRef, p.nome, p.sugestoes.map((s) => s.key)])).toEqual([
      ['s1', 'Corte feminino', ['cabeleireiro']],
      ['s3', 'Ritual facial renovador', []],
    ]);
    expect(ia.fn).not.toHaveBeenCalled();
  });

  it('com ?ia=1 a IA roda só onde a camada 1 ficou vazia', async () => {
    const ia = classificador('estetica');
    const out = await build({ linhas, classifier: ia.port }).pendentes(scope, { ia: true });
    expect(out.find((p) => p.serviceRef === 's3')!.sugestoes[0]).toMatchObject({ key: 'estetica', origem: 'ia' });
    expect(ia.fn).toHaveBeenCalledTimes(1);
  });

  it(`teto: no máximo ${MAX_IA_POR_VARREDURA} chamadas de IA por varredura`, async () => {
    const muitos = Array.from({ length: MAX_IA_POR_VARREDURA + 5 }, (_, i) => ({ id: `x${i}`, name: `Serviço sem nome conhecido ${i}` }));
    const ia = classificador(null);
    const out = await build({ linhas: muitos, classifier: ia.port }).pendentes(scope, { ia: true });
    expect(out).toHaveLength(MAX_IA_POR_VARREDURA + 5);
    expect(ia.fn).toHaveBeenCalledTimes(MAX_IA_POR_VARREDURA);
  });
});
