/**
 * BE-INCR-DP-F0-F1 itens 56–62 (PR-6) — afastamento e férias no SQLite real, com a ESOCIAL_MOTIVO_AFASTAMENTO e a
 * ESOCIAL_CATEGORIA da carga real: motivo vigente no início, início ≥ admissão, sem sobreposição (409), Tier-0 pelo
 * vínculo, períodos só na natureza EMPREGO, implantação casando com o período e viva única, e a auditoria sem o motivo.
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb } from '@test/helpers';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { CompanyFiscalProfileRepository } from '@/features/accounting/repositories/CompanyFiscalProfileRepository';
import { PartnerRepository } from '@/features/accounting/repositories/PartnerRepository';
import type { AppError } from '@/lib/errors';
import { DpPolicy } from '../../policies/DpPolicy';
import { DpAfastamentoFeriasRepository } from '../../repositories/DpAfastamentoFeriasRepository';
import { DpCadastroRepository } from '../../repositories/DpCadastroRepository';
import { DpVinculoRepository } from '../../repositories/DpVinculoRepository';
import { DpAfastamentoFeriasService } from '../DpAfastamentoFeriasService';
import { DpCadastroService } from '../DpCadastroService';
import { DpVinculoService } from '../DpVinculoService';

async function erro(p: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as AppError;
    return { status: err.statusCode, code: err.errorCode };
  }
  throw new Error('não lançou');
}

const CPF = '52998224725';
const CPF2 = '11144477735';

describe('DpAfastamentoFeriasService (itens 56–62)', () => {
  let dono: string;
  let outro: string;
  let svc: DpAfastamentoFeriasService;
  let vinculos: DpVinculoService;
  let vinculoId: string;
  const scopeDe = (userId: string) => resolveAccountingScopeInternal({ userId }, `unit-${userId}`);
  const u = (userId: string) => ({ unitId: `unit-${userId}` });

  beforeAll(() => pushTestSchema(), 120000);
  beforeEach(async () => {
    await resetDb();
    dono = (await prisma.user.create({ data: { name: 'dpa', username: 'dpa-dono', email: 'dpa@test.local', password: 'x', role: 'USER' } })).id;
    outro = (await prisma.user.create({ data: { name: 'dpa2', username: 'dpa-outro', email: 'dpa2@test.local', password: 'x', role: 'USER' } })).id;
    const cadRepo = new DpCadastroRepository();
    const vincRepo = new DpVinculoRepository();
    const audit = getFactory().getAuditService();
    const legal = getFactory().getLegalParameterService();
    const cad = new DpCadastroService(cadRepo, new DpPolicy(), audit);
    vinculos = new DpVinculoService(vincRepo, cadRepo, new DpPolicy(), audit, {
      partners: new PartnerRepository(),
      fiscalProfiles: new CompanyFiscalProfileRepository(),
      legalParams: legal,
      employees: { employeeRowExists: async () => false },
      // Só a correção do PR-4 cifra com o chaveiro; este teste não corrige nada.
      auditKeyring: () => {
        throw new Error('chaveiro não usado no PR-6');
      },
    });
    svc = new DpAfastamentoFeriasService(new DpAfastamentoFeriasRepository(), vincRepo, new DpPolicy(), audit, legal);
    const lotacaoId = (await cad.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'L1', descricao: 'Loja' })).id;
    const cargoId = (await cad.createCargo(scopeDe(dono), { ...u(dono), nome: 'Manicure', cbo: '516120' })).id;
    const jornadaId = (await cad.createJornada(scopeDe(dono), { ...u(dono), nome: '44h', minutosSemanais: 2640, tipoJornada: '9' })).id;
    const t = await vinculos.createTrabalhador(scopeDe(dono), { ...u(dono), cpf: CPF, nome: 'Ana', nascimento: '1990-03-10', pcd: false });
    vinculoId = (
      await vinculos.createVinculo(scopeDe(dono), {
        ...u(dono),
        trabalhadorId: t.id,
        matricula: 'M1',
        categoria: '101',
        dataInicio: '2024-02-29',
        versao: { lotacaoId, cargoId, jornadaId, salarioCents: 300000n, unidadeSalario: '5' },
      })
    ).id;
  });
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  const afast = (extra: Record<string, unknown> = {}) =>
    svc.createAfastamento(scopeDe(dono), vinculoId, { ...u(dono), motivo: '01', inicio: '2026-03-01', fim: '2026-03-20', ...extra });

  it('item 56 — cria, lista, altera e apaga (soft-delete); fim em aberto', async () => {
    const a = await afast({ observacao: 'atestado entregue' });
    expect(a).toMatchObject({ vinculoId, motivo: '01', inicio: '2026-03-01', fim: '2026-03-20', observacao: 'atestado entregue' });
    const aberto = await svc.updateAfastamento(scopeDe(dono), vinculoId, a.id, { ...u(dono), fim: null });
    expect(aberto.fim).toBeNull();
    expect((await svc.listAfastamentos(scopeDe(dono), vinculoId)).map((x) => x.id)).toEqual([a.id]);
    await svc.deleteAfastamento(scopeDe(dono), vinculoId, a.id);
    expect(await svc.listAfastamentos(scopeDe(dono), vinculoId)).toEqual([]);
    expect((await prisma.dpAfastamento.findUnique({ where: { id: a.id } }))?.deletedAt).not.toBeNull();
  });

  it('item 56 — motivo fora da Tabela 18 ou encerrado no início ⇒ 400; início antes da admissão ⇒ 400', async () => {
    expect((await erro(afast({ motivo: '99' }))).status).toBe(400);
    // Motivo 08 terminou em 2021-07-18 na Tabela 18 [D10]: em 2026 não vale.
    expect((await erro(afast({ motivo: '08' }))).status).toBe(400);
    expect((await erro(afast({ inicio: '2024-02-28', fim: null }))).status).toBe(400);
    expect(await prisma.dpAfastamento.count()).toBe(0);
  });

  it('item 56 — sem sobreposição no mesmo vínculo (gate na tx): 409 DP_AFASTAMENTO_SOBREPOSTO; contíguo passa; aberto cobre o futuro', async () => {
    const a = await afast();
    expect(await erro(afast({ inicio: '2026-03-20', fim: '2026-03-25' }))).toEqual({ status: 409, code: 'DP_AFASTAMENTO_SOBREPOSTO' });
    const b = await afast({ inicio: '2026-03-21', fim: undefined });
    expect(await erro(afast({ inicio: '2027-01-01', fim: '2027-01-05' }))).toEqual({ status: 409, code: 'DP_AFASTAMENTO_SOBREPOSTO' });
    // Alterar um para cobrir o outro também é sobreposição; alterar a si mesmo, não.
    expect(await erro(svc.updateAfastamento(scopeDe(dono), vinculoId, a.id, { ...u(dono), fim: '2026-04-01' }))).toEqual({ status: 409, code: 'DP_AFASTAMENTO_SOBREPOSTO' });
    expect((await svc.updateAfastamento(scopeDe(dono), vinculoId, b.id, { ...u(dono), fim: '2026-04-30' })).fim).toBe('2026-04-30');
    // Apagado não conta.
    await svc.deleteAfastamento(scopeDe(dono), vinculoId, a.id);
    expect((await afast({ inicio: '2026-03-05', fim: '2026-03-06' })).inicio).toBe('2026-03-05');
  });

  it('Tier-0 — vínculo de outro dono ⇒ 404 em todas as operações; nada gravado', async () => {
    const a = await afast();
    const s = scopeDe(outro);
    const uo = u(outro);
    expect((await erro(svc.listAfastamentos(s, vinculoId))).status).toBe(404);
    expect((await erro(svc.createAfastamento(s, vinculoId, { ...uo, motivo: '01', inicio: '2026-05-01' }))).status).toBe(404);
    expect((await erro(svc.updateAfastamento(s, vinculoId, a.id, { ...uo, fim: null }))).status).toBe(404);
    expect((await erro(svc.deleteAfastamento(s, vinculoId, a.id))).status).toBe(404);
    expect((await erro(svc.getFerias(s, vinculoId, '2026-01-01'))).status).toBe(404);
    expect((await erro(svc.createImplantacao(s, vinculoId, { ...uo, aquisitivoInicio: '2024-02-29', diasGozados: 30, fonte: 'x' }))).status).toBe(404);
    expect(await prisma.dpAfastamento.count()).toBe(1);
    expect(await prisma.dpFeriasImplantacao.count()).toBe(0);
  });

  it('itens 57 e 59 — períodos até a dataRef (admissão em 29/02) com os dias implantados; sem saldo', async () => {
    await svc.createImplantacao(scopeDe(dono), vinculoId, { ...u(dono), aquisitivoInicio: '2025-03-01', diasGozados: 20, fonte: 'ficha do sistema anterior' });
    const f = await svc.getFerias(scopeDe(dono), vinculoId, '2026-03-01');
    expect(f).toEqual({
      vinculoId,
      natureza: 'EMPREGO',
      dataRef: '2026-03-01',
      periodos: [
        { aquisitivoInicio: '2024-02-29', aquisitivoFim: '2025-02-28', concessivoFim: '2026-02-28', diasGozadosImplantados: null },
        { aquisitivoInicio: '2025-03-01', aquisitivoFim: '2026-02-28', concessivoFim: '2027-02-28', diasGozadosImplantados: 20 },
        { aquisitivoInicio: '2026-03-01', aquisitivoFim: '2027-02-28', concessivoFim: '2028-02-28', diasGozadosImplantados: null },
      ],
    });
  });

  it('item 57 — natureza TSVE (estagiário 901) não tem período de férias; implantação ⇒ 400 DP_FERIAS_PERIODO_INEXISTENTE', async () => {
    const lot = (await prisma.dpLotacao.findFirst({ where: { userId: dono } }))!.id;
    const t = await vinculos.createTrabalhador(scopeDe(dono), { ...u(dono), cpf: CPF2, nome: 'Bia', nascimento: '2004-01-01', pcd: false });
    const est = await vinculos.createVinculo(scopeDe(dono), {
      ...u(dono),
      trabalhadorId: t.id,
      matricula: 'E1',
      categoria: '901',
      dataInicio: '2026-01-05',
      versao: { lotacaoId: lot, salarioCents: 100000n, unidadeSalario: '5' },
    });
    expect(await svc.getFerias(scopeDe(dono), est.id, '2027-06-01')).toMatchObject({ natureza: 'TSVE', periodos: [] });
    expect(await erro(svc.createImplantacao(scopeDe(dono), est.id, { ...u(dono), aquisitivoInicio: '2026-01-05', diasGozados: 0, fonte: 'x' }))).toEqual({
      status: 400,
      code: 'DP_FERIAS_PERIODO_INEXISTENTE',
    });
  });

  it('item 58 — aquisitivo tem de casar com um período; viva única por (vínculo, aquisitivo); apagar e implantar de novo', async () => {
    const corpo = { ...u(dono), aquisitivoInicio: '2024-02-29', diasGozados: 30, fonte: 'ficha' };
    expect(await erro(svc.createImplantacao(scopeDe(dono), vinculoId, { ...corpo, aquisitivoInicio: '2024-03-01' }))).toEqual({
      status: 400,
      code: 'DP_FERIAS_PERIODO_INEXISTENTE',
    });
    expect(await erro(svc.createImplantacao(scopeDe(dono), vinculoId, { ...corpo, aquisitivoInicio: '2023-02-28' }))).toEqual({
      status: 400,
      code: 'DP_FERIAS_PERIODO_INEXISTENTE',
    });
    const i = await svc.createImplantacao(scopeDe(dono), vinculoId, corpo);
    expect(i).toMatchObject({ vinculoId, aquisitivoInicio: '2024-02-29', diasGozados: 30, fonte: 'ficha', informadoPorId: dono });
    expect((await erro(svc.createImplantacao(scopeDe(dono), vinculoId, corpo))).status).toBe(409);
    expect((await svc.updateImplantacao(scopeDe(dono), vinculoId, i.id, { ...u(dono), diasGozados: 10 })).diasGozados).toBe(10);
    await svc.deleteImplantacao(scopeDe(dono), vinculoId, i.id);
    expect((await svc.createImplantacao(scopeDe(dono), vinculoId, corpo)).id).not.toBe(i.id);
    expect((await svc.listImplantacoes(scopeDe(dono), vinculoId)).map((x) => x.diasGozados)).toEqual([30]);
  });

  it('item 61 — auditoria: afastamento sem motivo nem observação; implantação com ids, aquisitivo e dias; append cru perde o motivo', async () => {
    const a = await afast({ observacao: 'CID não vai aqui' });
    await svc.updateAfastamento(scopeDe(dono), vinculoId, a.id, { ...u(dono), fim: null });
    await svc.deleteAfastamento(scopeDe(dono), vinculoId, a.id);
    const i = await svc.createImplantacao(scopeDe(dono), vinculoId, { ...u(dono), aquisitivoInicio: '2024-02-29', diasGozados: 12, fonte: 'ficha' });
    const eventos = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'dp.' }, targetId: { in: [a.id, i.id] } }, orderBy: { seq: 'asc' } });
    const payloads = eventos.map((e) => [e.eventType, JSON.parse(String(e.payload))]);
    expect(payloads).toEqual([
      ['dp.afastamento.created', { afastamentoId: a.id, vinculoId, inicio: '2026-03-01', fim: '2026-03-20' }],
      // A canonicalização do auditCanonical omite campo nulo: fim em aberto sai sem a chave.
      ['dp.afastamento.updated', { afastamentoId: a.id, vinculoId, inicio: '2026-03-01' }],
      ['dp.afastamento.deleted', { afastamentoId: a.id, vinculoId, inicio: '2026-03-01' }],
      ['dp.ferias_implantacao.created', { implantacaoId: i.id, vinculoId, aquisitivoInicio: '2024-02-29', diasGozados: '12' }],
    ]);
    // Item 62 / F17: append direto com payload cru que traz motivo e observação ⇒ o persistido não tem nenhum deles.
    await prisma.$transaction((tx) =>
      getFactory().getAuditService().append(tx, scopeDe(dono), {
        actorUserId: dono,
        eventType: 'dp.afastamento.created',
        targetType: 'dp_afastamento',
        targetId: 'cru',
        payload: { afastamentoId: 'cru', vinculoId, inicio: '2026-01-01', fim: null, motivo: '03', observacao: 'Vazou' },
      }),
    );
    const cru = await prisma.auditEvent.findFirst({ where: { targetId: 'cru' } });
    expect(String(cru?.payload)).not.toMatch(/motivo|observacao|Vazou|"03"/);
  });
});
