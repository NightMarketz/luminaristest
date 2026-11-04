/**
 * BE-INCR-DP-F0-F1 itens 37–49 e a trava D-5 do item 30 (PR-4) — trabalhador, vínculo e versões no SQLite real, com a
 * ESOCIAL_CATEGORIA da carga real: CPF e matrícula vivos únicos, `employeeRef` pela porta, núcleo de categorias, idade,
 * pró-labore × sócio × MEI, cobertura contínua das versões, correção auditada sem valores e `vinculoNaData`.
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb } from '@test/helpers';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { CompanyFiscalProfileRepository } from '@/features/accounting/repositories/CompanyFiscalProfileRepository';
import { PartnerRepository } from '@/features/accounting/repositories/PartnerRepository';
import type { AppError } from '@/lib/errors';
import { DpPolicy } from '../../policies/DpPolicy';
import type { EmployeeRowLookup } from '../../ports/EmployeeRowLookup';
import { DpCadastroRepository } from '../../repositories/DpCadastroRepository';
import { DpVinculoRepository } from '../../repositories/DpVinculoRepository';
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
const CPF3 = '39053344705';

describe('DpVinculoService (itens 37–49, D-5)', () => {
  let dono: string;
  let outro: string;
  let svc: DpVinculoService;
  let cad: DpCadastroService;
  let linhasEmployees: Set<string>;
  const scopeDe = (userId: string) => resolveAccountingScopeInternal({ userId }, `unit-${userId}`);
  const u = (userId: string) => ({ unitId: `unit-${userId}` });
  // Porta do item 38 sobre um conjunto em memória; a implementação sobre o motor é do factory (teste de rota).
  const employees: EmployeeRowLookup = { employeeRowExists: async (_owner, ref) => linhasEmployees.has(ref) };

  let lotacaoId: string;
  let cargoId: string;
  let jornadaId: string;
  const versao = () => ({ lotacaoId, cargoId, jornadaId, salarioCents: 300000n, unidadeSalario: '5' as const });

  beforeAll(() => pushTestSchema(), 120000);
  beforeEach(async () => {
    await resetDb();
    linhasEmployees = new Set(['emp-1']);
    dono = (await prisma.user.create({ data: { name: 'dpv', username: 'dpv-dono', email: 'dpv@test.local', password: 'x', role: 'USER' } })).id;
    outro = (await prisma.user.create({ data: { name: 'dpv2', username: 'dpv-outro', email: 'dpv2@test.local', password: 'x', role: 'USER' } })).id;
    const cadRepo = new DpCadastroRepository();
    cad = new DpCadastroService(cadRepo, new DpPolicy(), getFactory().getAuditService());
    svc = new DpVinculoService(new DpVinculoRepository(), cadRepo, new DpPolicy(), getFactory().getAuditService(), {
      partners: new PartnerRepository(),
      fiscalProfiles: new CompanyFiscalProfileRepository(),
      legalParams: getFactory().getLegalParameterService(),
      employees,
    });
    lotacaoId = (await cad.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'L1', descricao: 'Loja' })).id;
    cargoId = (await cad.createCargo(scopeDe(dono), { ...u(dono), nome: 'Manicure', cbo: '516120' })).id;
    jornadaId = (await cad.createJornada(scopeDe(dono), { ...u(dono), nome: '44h', minutosSemanais: 2640, tipoJornada: '9' })).id;
  });
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  const trab = (cpf = CPF, extra: Record<string, unknown> = {}) =>
    svc.createTrabalhador(scopeDe(dono), { ...u(dono), cpf, nome: 'Ana', nascimento: '1990-03-10', pcd: false, ...extra });
  const vinc = (trabalhadorId: string, extra: Record<string, unknown> = {}) =>
    svc.createVinculo(scopeDe(dono), { ...u(dono), trabalhadorId, matricula: 'M1', categoria: '101', dataInicio: '2026-01-01', versao: versao(), ...extra });

  it('item 37 — trabalhador: CRUD, CPF vivo único (409), apagar e recriar com o mesmo CPF, Tier-0', async () => {
    const t = await trab();
    expect(t).toMatchObject({ cpf: CPF, nome: 'Ana', origem: 'DIGITADA', pessoaOperacionalRemovida: false });
    expect(t).not.toHaveProperty('userId');
    expect(await erro(trab())).toEqual({ status: 409, code: 'DP_CPF_DUPLICADO' });
    await svc.createTrabalhador(scopeDe(outro), { ...u(outro), cpf: CPF, nome: 'Outra', nascimento: '1990-03-10', pcd: false });
    expect(await erro(svc.getTrabalhador(scopeDe(outro), t.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect((await svc.updateTrabalhador(scopeDe(dono), t.id, { ...u(dono), nome: 'Ana B' })).nome).toBe('Ana B');
    await svc.deleteTrabalhador(scopeDe(dono), t.id);
    expect(await erro(svc.getTrabalhador(scopeDe(dono), t.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    await trab();
    expect(await prisma.dpTrabalhador.count({ where: { userId: dono } })).toBe(2); // soft-delete
  });

  it('item 38 — employeeRef inexistente ⇒ 400 DP_EMPLOYEE_REF_INVALIDO; linha apagada depois ⇒ leitura com a marca', async () => {
    expect(await erro(trab(CPF, { employeeRef: 'nao-existe' }))).toEqual({ status: 400, code: 'DP_EMPLOYEE_REF_INVALIDO' });
    const t = await trab(CPF, { employeeRef: 'emp-1' });
    expect(t.pessoaOperacionalRemovida).toBe(false);
    linhasEmployees.delete('emp-1');
    expect((await svc.getTrabalhador(scopeDe(dono), t.id)).pessoaOperacionalRemovida).toBe(true);
    expect((await svc.listTrabalhadores(scopeDe(dono), 50))[0].pessoaOperacionalRemovida).toBe(true);
  });

  it('itens 39–40 — 104 ⇒ 400 DP_CATEGORIA_FORA_DO_NUCLEO apontando DP-CAT; 101 nasce com a 1ª versão em dataInicio na mesma tx', async () => {
    const t = await trab();
    const fora = vinc(t.id, { categoria: '104' });
    expect(await erro(fora)).toEqual({ status: 400, code: 'DP_CATEGORIA_FORA_DO_NUCLEO' });
    await expect(vinc(t.id, { categoria: '104' })).rejects.toThrow(/DP-CAT/);
    const v = await vinc(t.id);
    expect(v).toMatchObject({ unitId: `unit-${dono}`, matricula: 'M1', categoria: '101', origem: 'DIGITADA' });
    expect(v.versoes).toEqual([expect.objectContaining({ vigenteDesde: '2026-01-01', vigenteAte: null, salarioCents: '300000' })]);
    expect(await erro(vinc(t.id))).toEqual({ status: 409, code: 'DP_MATRICULA_DUPLICADA' });
    // Natureza EMPREGO (101 ⇒ S-2200) exige cargo e jornada.
    const sem = svc.createVinculo(scopeDe(dono), { ...u(dono), trabalhadorId: t.id, matricula: 'M2', categoria: '101', dataInicio: '2026-01-01', versao: { lotacaoId, salarioCents: 1n, unidadeSalario: '5' } });
    expect(await erro(sem)).toEqual({ status: 400, code: 'VALIDATION_ERROR' });
    // Cadastro de outro dono ⇒ 404 (Tier-0).
    const lotOutro = (await cad.createLotacao(scopeDe(outro), { ...u(outro), codigo: 'X', descricao: 'X' })).id;
    expect(await erro(vinc(t.id, { matricula: 'M3', versao: { ...versao(), lotacaoId: lotOutro } }))).toEqual({ status: 404, code: 'NOT_FOUND' });
  });

  it('itens 41–42 — aprendiz e idade mínima chegam ao serviço com o nascimento do trabalhador', async () => {
    const jovem = await svc.createTrabalhador(scopeDe(dono), { ...u(dono), cpf: CPF2, nome: 'Bia', nascimento: '2012-01-01', pcd: false });
    expect(await erro(vinc(jovem.id, { dataInicio: '2026-06-01' }))).toEqual({ status: 400, code: 'DP_IDADE_MINIMA' });
    expect(await erro(vinc(jovem.id, { categoria: '103', dataInicio: '2026-06-01' }))).toEqual({ status: 400, code: 'DP_APRENDIZ_PRAZO' });
    const ap = await vinc(jovem.id, { categoria: '103', dataInicio: '2026-06-01', dataTermino: '2028-05-31' });
    expect(ap.dataTermino).toBe('2028-05-31');
  });

  it('item 44 — pró-labore (723): sem sócio ⇒ 400; fora da sociedade ⇒ 400; MEI no ano ⇒ 400; sócio PF com o CPF ⇒ aceito como TSVE', async () => {
    const semSocio = await trab();
    const pl = (trabalhadorId: string, extra: Record<string, unknown> = {}) =>
      vinc(trabalhadorId, { categoria: '723', matricula: `PL-${trabalhadorId}`, versao: { lotacaoId, salarioCents: 500000n, unidadeSalario: '5' }, ...extra });
    expect(await erro(pl(semSocio.id))).toEqual({ status: 400, code: 'DP_PRO_LABORE_SEM_SOCIO' });
    const socioErrado = await prisma.partner.create({
      data: { userId: dono, nome: 'Sócio', taxId: CPF3, tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: 5000, entradaEm: '2020-01-01' },
    });
    const tErrado = await trab(CPF2, { partnerId: socioErrado.id });
    expect(await erro(pl(tErrado.id))).toEqual({ status: 400, code: 'DP_PRO_LABORE_SEM_SOCIO' });
    const socio = await prisma.partner.create({
      data: { userId: dono, nome: 'Sócio', taxId: CPF3, tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: 5000, entradaEm: '2026-03-01' },
    });
    const t = await svc.createTrabalhador(scopeDe(dono), { ...u(dono), cpf: CPF3, nome: 'Caio', nascimento: '1980-01-01', pcd: false, partnerId: socio.id });
    expect(await erro(pl(t.id))).toEqual({ status: 400, code: 'DP_PRO_LABORE_FORA_DA_SOCIEDADE' });
    await prisma.companyFiscalProfile.create({ data: { userId: dono, anoCalendario: 2026, regime: 'MEI', createdById: dono, updatedById: dono } });
    expect(await erro(pl(t.id, { dataInicio: '2026-03-01' }))).toEqual({ status: 400, code: 'DP_PRO_LABORE_MEI' });
    await prisma.companyFiscalProfile.updateMany({ where: { userId: dono }, data: { regime: 'SIMPLES' } });
    // 723 ⇒ S-2300 (TSVE): só lotação e valor.
    const v = await pl(t.id, { dataInicio: '2026-03-01' });
    expect(v.versoes[0]).toMatchObject({ cargoId: null, jornadaId: null, salarioCents: '500000' });
  });

  it('item 43 — versão nova fecha a anterior na véspera; antes de dataInicio ⇒ 400; mesma data ⇒ 409', async () => {
    const v = await vinc((await trab()).id);
    const nova = await svc.createVersao(scopeDe(dono), v.id, { ...u(dono), vigenteDesde: '2026-06-01', ...versao(), salarioCents: 330000n });
    const versoes = (await svc.getVinculo(scopeDe(dono), v.id)).versoes;
    expect(versoes.map((x) => [x.vigenteDesde, x.vigenteAte, x.salarioCents])).toEqual([
      ['2026-01-01', '2026-05-31', '300000'],
      ['2026-06-01', null, '330000'],
    ]);
    expect(nova.id).toBe(versoes[1].id);
    expect(await erro(svc.createVersao(scopeDe(dono), v.id, { ...u(dono), vigenteDesde: '2025-12-31', ...versao() }))).toEqual({
      status: 400,
      code: 'DP_VERSAO_ANTES_DO_INICIO',
    });
    expect(await erro(svc.createVersao(scopeDe(dono), v.id, { ...u(dono), vigenteDesde: '2026-06-01', ...versao() }))).toEqual({
      status: 409,
      code: 'DP_VERSAO_SOBREPOSTA',
    });
    expect(await erro(svc.createVersao(scopeDe(outro), v.id, { ...u(outro), vigenteDesde: '2026-07-01', ...versao() }))).toEqual({ status: 404, code: 'NOT_FOUND' });
  });

  it('item 47 — vinculoNaData: versão vigente com lotação, cargo e jornada resolvidos; antes do início ⇒ null', async () => {
    const v = await vinc((await trab()).id);
    await svc.createVersao(scopeDe(dono), v.id, { ...u(dono), vigenteDesde: '2026-06-01', ...versao(), salarioCents: 330000n });
    const r = await svc.vinculoNaData(scopeDe(dono), v.id, '2026-05-31');
    expect(r).toMatchObject({ vinculo: { id: v.id, matricula: 'M1' }, versao: { salarioCents: 300000n }, lotacao: { codigo: 'L1' }, cargo: { cbo: '516120' }, jornada: { minutosSemanais: 2640 }, sindicato: null });
    expect((await svc.vinculoNaData(scopeDe(dono), v.id, '2026-06-01'))?.versao.salarioCents).toBe(330000n);
    expect(await svc.vinculoNaData(scopeDe(dono), v.id, '2025-12-31')).toBeNull();
  });

  it('item 45 — correção no lugar: evento corrected com campos e hashes, sem valores; append cru perde cpf, nome e salário', async () => {
    const t = await trab();
    const v = await vinc(t.id);
    const ver = v.versoes[0];
    const r = await svc.corrigirVersao(scopeDe(dono), v.id, ver.id, { ...u(dono), salarioCents: 310000n });
    expect([r.id, r.salarioCents, r.vigenteDesde]).toEqual([ver.id, '310000', '2026-01-01']);
    await svc.updateTrabalhador(scopeDe(dono), t.id, { ...u(dono), nome: 'Ana Corrigida', cpf: CPF2 });
    const ev = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'dp.' } }, orderBy: { seq: 'asc' } });
    const tipos = ev.map((e) => e.eventType).filter((e) => !e.startsWith('dp.lotacao') && !e.startsWith('dp.cargo') && !e.startsWith('dp.jornada'));
    expect(tipos).toEqual([
      'dp.trabalhador.created', 'dp.vinculo.created', 'dp.vinculo_versao.created', 'dp.vinculo_versao.corrected',
      'dp.trabalhador.updated', 'dp.trabalhador.corrected',
    ]);
    const corr = JSON.parse(String(ev.find((e) => e.eventType === 'dp.vinculo_versao.corrected')!.payload));
    expect(corr).toMatchObject({ vinculoId: v.id, versaoId: ver.id, campos: 'salarioCents' });
    expect(corr.antesSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(corr.depoisSha256).not.toBe(corr.antesSha256);
    const corrT = JSON.parse(String(ev.find((e) => e.eventType === 'dp.trabalhador.corrected')!.payload));
    expect(corrT.campos).toBe('cpf,nome');
    const tudo = ev.map((e) => String(e.payload)).join('\n');
    for (const valor of [CPF, CPF2, 'Ana', '1990-03-10', '300000', '310000']) expect(tudo).not.toContain(valor);

    // F17: append direto com payload cru que traz salarioCents, cpf e nome ⇒ o persistido não tem nenhum deles.
    await prisma.$transaction((tx) =>
      getFactory().getAuditService().append(tx, scopeDe(dono), {
        actorUserId: dono,
        eventType: 'dp.vinculo_versao.corrected',
        targetType: 'dp_vinculo_versao',
        targetId: ver.id,
        payload: { vinculoId: v.id, versaoId: ver.id, campos: 'x', salarioCents: 999999n, cpf: CPF3, nome: 'Vazou' },
      }),
    );
    const cru = await prisma.auditEvent.findFirst({ where: { eventType: 'dp.vinculo_versao.corrected', payload: { contains: '"campos":"x"' } } });
    expect(String(cru?.payload)).not.toMatch(/salarioCents|cpf|nome|999999|Vazou/);
  });

  it('item 30 (D-5) — jornada referenciada por versão: minutosSemanais/tipoJornada ⇒ 409 DP_JORNADA_EM_USO; nome muda', async () => {
    const livre = await cad.createJornada(scopeDe(dono), { ...u(dono), nome: 'Livre', minutosSemanais: 1200, tipoJornada: '9' });
    expect((await cad.updateJornada(scopeDe(dono), livre.id, { ...u(dono), minutosSemanais: 1300 })).minutosSemanais).toBe(1300);
    await vinc((await trab()).id);
    expect(await erro(cad.updateJornada(scopeDe(dono), jornadaId, { ...u(dono), minutosSemanais: 2200 }))).toEqual({ status: 409, code: 'DP_JORNADA_EM_USO' });
    expect(await erro(cad.updateJornada(scopeDe(dono), jornadaId, { ...u(dono), tipoJornada: '2' }))).toEqual({ status: 409, code: 'DP_JORNADA_EM_USO' });
    expect((await cad.updateJornada(scopeDe(dono), jornadaId, { ...u(dono), nome: '44 horas', minutosSemanais: 2640 })).nome).toBe('44 horas');
  });

  it('item 48 — trabalhador com vínculo vivo ⇒ 409; vínculo apaga livre e então o trabalhador apaga', async () => {
    const t = await trab();
    const v = await vinc(t.id);
    expect(await erro(svc.deleteTrabalhador(scopeDe(dono), t.id))).toEqual({ status: 409, code: 'DP_TRABALHADOR_COM_VINCULO' });
    await svc.deleteVinculo(scopeDe(dono), v.id);
    expect(await erro(svc.getVinculo(scopeDe(dono), v.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    await svc.deleteTrabalhador(scopeDe(dono), t.id);
    const tipos = (await prisma.auditEvent.findMany({ where: { eventType: { in: ['dp.vinculo.deleted', 'dp.trabalhador.deleted'] } } })).map((e) => e.eventType);
    expect(tipos.sort()).toEqual(['dp.trabalhador.deleted', 'dp.vinculo.deleted']);
  });
});
