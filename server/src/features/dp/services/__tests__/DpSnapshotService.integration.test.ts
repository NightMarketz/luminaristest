/**
 * BE-INCR-DP-F2 itens 27, 29 e 33 (PR-3) — `DpSnapshotService.montar` no SQLite real com as cargas reais: lê só o que
 * toca a competência e é do dono (Tier-0 pela leitura), guarda ids e idades e nunca nome, CPF ou nascimento (item 29), e
 * dois `montar` seguidos sem escrita dão o mesmo hash (item 33, régua A6). Vínculo e versões entram pelos serviços do
 * F1 (gates reais); lançamento, dependente, outra remuneração e CCT entram direto, porque o teste é do leitor.
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb } from '@test/helpers';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { CompanyFiscalProfileRepository } from '@/features/accounting/repositories/CompanyFiscalProfileRepository';
import { FiscalProfileRepository } from '@/features/accounting/repositories/FiscalProfileRepository';
import { PartnerRepository } from '@/features/accounting/repositories/PartnerRepository';
import type { Competencia } from '../../models/competencia';
import { DpSnapshotSchema, snapshotSha256 } from '../../models/folha/snapshot';
import { DpPolicy } from '../../policies/DpPolicy';
import { DpPortResolver } from '../../ports/DpPortResolver';
import { DpAfastamentoFeriasRepository } from '../../repositories/DpAfastamentoFeriasRepository';
import { DpCadastroRepository } from '../../repositories/DpCadastroRepository';
import { DpDependenteRepository } from '../../repositories/DpDependenteRepository';
import { DpLancamentoRepository } from '../../repositories/DpLancamentoRepository';
import { DpVinculoRepository } from '../../repositories/DpVinculoRepository';
import { DpAfastamentoFeriasService } from '../DpAfastamentoFeriasService';
import { DpCadastroService } from '../DpCadastroService';
import { DpSnapshotService, type DpFolhaAnterioresReader } from '../DpSnapshotService';
import { DpVinculoService } from '../DpVinculoService';

const CPF = '52998224725';
const NOME = 'Ana Snapshot Teste';
const NASC = '1990-03-10';
const C = '2026-03' as Competencia;

describe('DpSnapshotService.montar (itens 27, 29 e 33)', () => {
  let dono: string;
  let outro: string;
  let svc: DpSnapshotService;
  let vinculoId: string;
  let trabalhadorId: string;
  let anteriores: DpFolhaAnterioresReader;
  const scopeDe = (userId: string) => resolveAccountingScopeInternal({ userId }, `unit-${userId}`);
  const u = (userId: string) => ({ unitId: `unit-${userId}` });

  beforeAll(() => pushTestSchema(), 120000);
  beforeEach(async () => {
    await resetDb();
    dono = (await prisma.user.create({ data: { name: 'dps', username: 'dps-dono', email: 'dps@test.local', password: 'x', role: 'USER' } })).id;
    outro = (await prisma.user.create({ data: { name: 'dps2', username: 'dps-outro', email: 'dps2@test.local', password: 'x', role: 'USER' } })).id;
    const cadRepo = new DpCadastroRepository();
    const vincRepo = new DpVinculoRepository();
    const afRepo = new DpAfastamentoFeriasRepository();
    const audit = getFactory().getAuditService();
    const legal = getFactory().getLegalParameterService();
    const cad = new DpCadastroService(cadRepo, new DpPolicy(), audit, legal);
    const vinculos = new DpVinculoService(vincRepo, cadRepo, new DpPolicy(), audit, {
      partners: new PartnerRepository(),
      fiscalProfiles: new CompanyFiscalProfileRepository(),
      legalParams: legal,
      employees: { employeeRowExists: async () => false },
      auditKeyring: () => {
        throw new Error('chaveiro não usado: o teste não corrige nada');
      },
    });
    const afast = new DpAfastamentoFeriasService(afRepo, vincRepo, new DpPolicy(), audit, legal);
    anteriores = {
      pagamentosAnteriores: async (_d, ids) => new Map(ids.map((id) => [id, { rendimentoCents: 1000n, irrfRetidoCents: 0n, adiantamentoPagoCents: 120000n }])),
      adiantamentoBp: async () => 4000,
    };
    svc = new DpSnapshotService({
      vinculos: vincRepo,
      cadastros: cadRepo,
      afastamentos: afRepo,
      lancamentos: new DpLancamentoRepository(),
      dependentes: new DpDependenteRepository(),
      fiscalProfiles: new FiscalProfileRepository(),
      legalParams: legal,
      modulosAtivosEm: async () => [],
      portas: new DpPortResolver(new Map(), async () => []),
      anteriores: { pagamentosAnteriores: (...a) => anteriores.pagamentosAnteriores(...a), adiantamentoBp: (...a) => anteriores.adiantamentoBp(...a) },
    });

    const lotacaoId = (await cad.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'L1', descricao: 'Loja' })).id;
    const cargoId = (await cad.createCargo(scopeDe(dono), { ...u(dono), nome: 'Manicure', cbo: '516120' })).id;
    const jornadaId = (
      await cad.createJornada(scopeDe(dono), { ...u(dono), nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '9' })
    ).id;
    const sindicatoId = (await prisma.dpSindicato.create({ data: { userId: dono, cnpj: '11222333000181', nome: 'Sind' } })).id;
    const conv = await prisma.dpConvencaoColetiva.create({ data: { userId: dono, sindicatoId, identificacao: 'CCT 2026', vigenteDesde: '2026-01-01', fonte: 'teste' } });
    await prisma.dpConvencaoParametro.create({
      data: { convencaoId: conv.id, chave: 'PISO_SALARIAL_CENTS', discriminador: cargoId, valorInt: 180000n, clausula: 'cl. 3', vigenteDesde: '2026-01-01' },
    });
    // Parâmetro que não toca março: não entra.
    await prisma.dpConvencaoParametro.create({
      data: { convencaoId: conv.id, chave: 'PISO_SALARIAL_CENTS', discriminador: cargoId, valorInt: 190000n, clausula: 'cl. 3', vigenteDesde: '2026-05-01' },
    });

    trabalhadorId = (await vinculos.createTrabalhador(scopeDe(dono), { ...u(dono), cpf: CPF, nome: NOME, nascimento: NASC, pcd: false })).id;
    vinculoId = (
      await vinculos.createVinculo(scopeDe(dono), {
        ...u(dono),
        trabalhadorId,
        matricula: 'M1',
        categoria: '101',
        dataInicio: '2025-02-01',
        versao: { lotacaoId, cargoId, jornadaId, sindicatoId, salarioCents: 300000n, unidadeSalario: '5' },
      })
    ).id;
    await vinculos.createVersao(scopeDe(dono), vinculoId, { ...u(dono), vigenteDesde: '2026-03-15', lotacaoId, cargoId, jornadaId, sindicatoId, salarioCents: 320000n, unidadeSalario: '5' });
    await afast.createAfastamento(scopeDe(dono), vinculoId, { ...u(dono), motivo: '03', inicio: '2026-03-10', fim: '2026-04-20' });
    await afast.createAfastamento(scopeDe(dono), vinculoId, { ...u(dono), motivo: '03', inicio: '2026-01-05', fim: '2026-01-06' }); // não toca março

    const lanc = (competencia: string, rubrica: string, q: { quantidadeMin?: number; valorCents?: bigint }) =>
      prisma.dpLancamento.create({ data: { vinculoId, competencia, rubrica, origem: 'MANUAL', informadoPorId: dono, ...q } });
    await lanc('2026-03', 'HORA_EXTRA_50', { quantidadeMin: 120 });
    await lanc('2026-03', 'COMISSAO', { valorCents: 5000n });
    await lanc('2026-04', 'HORA_EXTRA_50', { quantidadeMin: 60 }); // outra competência
    const apagado = await lanc('2026-03', 'FALTAS', { quantidadeMin: 440 });
    await prisma.dpLancamento.update({ where: { id: apagado.id }, data: { deletedAt: new Date() } });
    await prisma.dpOutraRemuneracao.create({
      data: { vinculoId, competencia: '2026-03', remuneracaoCents: 200000n, contribuicaoCents: 16000n, ordem: 'ANTES', categoriaOutraFonte: 'EMPREGADO', cnpjOutroEmpregador: '11444777000161', documento: 'declaração', informadoPorId: dono },
    });
    const dep = (extra: Record<string, unknown>) =>
      prisma.dpDependente.create({
        data: { trabalhadorId, nome: 'Filho Secreto', cpf: '11144477735', nascimento: '2020-05-01', tipo: '03', deduzIrrf: true, salarioFamilia: true, vigenteDesde: '2020-05-01', ...extra },
      });
    await dep({});
    await dep({ deduzIrrf: true, salarioFamilia: false, vigenteAte: '2026-03-31' }); // termina antes do pagamento
  });
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('item 27 — lê só o que toca a competência, os parâmetros nas duas datas e o que a fonte já pagou', async () => {
    const s = await svc.montar(scopeDe(dono), C, 'MENSAL', '2026-04-06');
    expect(DpSnapshotSchema.parse(s)).toEqual(s);
    expect(s.vinculos).toHaveLength(1);
    const v = s.vinculos[0];
    expect(v).toMatchObject({ vinculoId, trabalhadorId, matricula: 'M1', categoria: '101', idadeNaDataPagamento: 36, pcd: false });
    expect(v.versoes.map((x) => [x.vigenteDesde, x.vigenteAte, x.salarioCents, x.cargoNome, x.jornada?.escala?.minutosPorDia])).toEqual([
      ['2025-02-01', '2026-03-14', '300000', 'Manicure', 440],
      ['2026-03-15', null, '320000', 'Manicure', 440],
    ]);
    expect(v.cct.map((p) => [p.chave, p.valorInt, p.vigenteDesde])).toEqual([['PISO_SALARIAL_CENTS', '180000', '2026-01-01']]);
    expect(v.afastamentos.map((a) => [a.motivo, a.inicio, a.fim])).toEqual([['03', '2026-03-10', '2026-04-20']]);
    expect(v.lancamentos.map((l) => [l.rubrica, l.quantidadeMin ?? l.valorCents, l.origem]).sort()).toEqual([
      ['COMISSAO', '5000', 'MANUAL'],
      ['HORA_EXTRA_50', 120, 'MANUAL'],
    ]);
    expect(v.jornadaApurada.origem).toBe('NULO');
    expect(v.dependentes).toEqual({ irrf: 1, salarioFamilia: [{ idade: 5, invalido: false }] });
    expect(v.outrasRemuneracoes.map((o) => [o.remuneracaoCents, o.ordem, o.categoriaOutraFonte])).toEqual([['200000', 'ANTES', 'EMPREGADO']]);
    expect(v.jaPagoNoMesDePagamento).toEqual({ rendimentoCents: '1000', irrfRetidoCents: '0' });
    expect(v.adiantamentoPagoCents).toBe('120000');
    expect(s.parametros.adiantamentoBp).toBe(4000);
    expect(s.parametros.competencia.ok && s.parametros.pagamento.ok && s.regras.ok).toBe(true);
    expect(s.feriados[`unit-${dono}`]).toEqual([]); // março de 2026 sem feriado nacional; unidade sem perfil fiscal
  });

  it('item 29 — o snapshot serializado não contém nome, CPF nem nascimento do trabalhador ou do dependente', async () => {
    const json = JSON.stringify(await svc.montar(scopeDe(dono), C, 'MENSAL', '2026-04-06'));
    for (const pii of [CPF, NOME, NASC, 'Filho Secreto', '11144477735', '2020-05-01', '11444777000161']) expect(json).not.toContain(pii);
  });

  it('item 33 (A6) — dois montar seguidos sem escrita dão o mesmo hash; uma escrita muda o hash', async () => {
    const h1 = snapshotSha256(await svc.montar(scopeDe(dono), C, 'MENSAL', '2026-04-06'));
    const h2 = snapshotSha256(await svc.montar(scopeDe(dono), C, 'MENSAL', '2026-04-06'));
    expect(h2).toBe(h1);
    await prisma.dpLancamento.create({ data: { vinculoId, competencia: '2026-03', rubrica: 'HORA_EXTRA_100', quantidadeMin: 30, origem: 'MANUAL', informadoPorId: dono } });
    expect(snapshotSha256(await svc.montar(scopeDe(dono), C, 'MENSAL', '2026-04-06'))).not.toBe(h1);
  });

  it('L4 (cédula de 21/11) — regras no último dia da competência e parâmetros na data de pagamento: em 2026-12 vale a linha da EC 141 de 16/12', async () => {
    const s = await svc.montar(scopeDe(dono), '2026-12' as Competencia, 'MENSAL', '2027-01-06');
    expect(s.regras.ok).toBe(true);
    if (s.regras.ok) {
      expect(s.regras.valor.salarioHoraDivisor.valor).toBe('DIAS_DE_TRABALHO_DA_ESCALA');
      expect(s.regras.valor.repousoDiasMin.valor).toBe(2);
    }
    // A data de pagamento é a de 2027: sem a tabela de 2027 carregada, a ausência cita a data do pagamento, não a da competência.
    if (!s.parametros.pagamento.ok) expect(s.parametros.pagamento.ausente.data).toBe('2027-01-06');
    if (!s.parametros.competencia.ok) expect(s.parametros.competencia.ausente.data).toBe('2026-12-31');
  });

  it('Tier-0 — o outro dono não vê o vínculo; competência fora do vínculo não o lê', async () => {
    expect((await svc.montar(scopeDe(outro), C, 'MENSAL', '2026-04-06')).vinculos).toEqual([]);
    expect((await svc.montar(scopeDe(dono), '2025-01' as Competencia, 'MENSAL', '2025-02-05')).vinculos).toEqual([]);
  });

  it('item 27 — sem tabela legal na data, o snapshot guarda a ausência nomeada em vez de abortar', async () => {
    const s = await svc.montar(scopeDe(dono), '2019-03' as Competencia, 'MENSAL', '2019-04-05');
    expect(s.regras.ok).toBe(false);
    if (!s.regras.ok) expect(s.regras.ausente.tabela).toBe('FOLHA_REGRA');
    expect(s.parametros.competencia.ok).toBe(false);
  });
});
