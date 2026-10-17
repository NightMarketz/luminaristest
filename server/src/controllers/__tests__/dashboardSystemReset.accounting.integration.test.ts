/**
 * BE-INCR-RESET-CONSISTENTE PR-2 (nó I7, F-I7-1 → "409 só com movimento", F-I7-4 → evento na trilha) — App Express REAL
 * sobre SQLite REAL.
 *   - item 10: o onboarding Rápido (salão e clínica, regime conhecido) só escreve tabelas contábeis de SETUP ∪ TRAIL —
 *     o SETUP é MEDIDO, não suposto.
 *   - item 11: `purgeSetupIfNoMovement` — (a) só SETUP ⇒ remove tudo, 1 evento por unidade, trilha anterior intacta e a
 *     cadeia válida; (b) 1 `JournalEntry` ⇒ lança e nada sai; (c) 2 unidades, só uma com movimento ⇒ nada sai nas duas.
 *   - companyLevel (dono, questionário, 2026-10-16: "Apaga, conta em toda unidade"): com 2 unidades, o
 *     `CompanyFiscalProfile` some e a contagem dele aparece IGUAL em `companyLevel` nos dois eventos.
 *   - AccountingPolicyVersion dividida (EMENDA; dono, chat, 2026-10-16: "Mas ela tbm deve depender de ter contador"):
 *     (i) só a versão do onboarding (sem contador) ⇒ reset ok e ela some; (ii) versão proposta com contador, mesmo sem
 *     AccountantAssignment ⇒ 409 e nada sai; (iii) as duas juntas ⇒ 409 e nada sai; (iv) decidida por contador
 *     (assignment) ⇒ 409 e nada sai.
 *   - só companyLevel (dono, questionário, 2026-10-16: "Evento na trilha da unidade"): clínica no REAL (Draft) grava só o
 *     perfil da empresa ⇒ ele some e o evento vai para a unidade com cadeia (removed {}); sem cadeia nenhuma ⇒ falha
 *     fechado (409) e o perfil fica — nenhum delete sem evento.
 *   - item 12: onboarding do salão → reset 204 → create ⇒ contabilidade da NOVA unidade `Active`, sem conflito de setor.
 *   - item 13: tenant com 1 lançamento ⇒ 409 `SYSTEM_RESET_BLOCKED_BY_ACCOUNTING` com `details.blocking` e as tabelas
 *     dinâmicas continuam lá.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { ConflictError, SystemResetBlockedByAccountingError } from '@/lib/errors';
import {
  ACCOUNTING_RESET_BLOCKING,
  ACCOUNTING_RESET_SETUP,
  ACCOUNTING_RESET_TRAIL,
} from '@/features/accounting/models/accountingResetClassification';
import { AccountingScopeResetRepository, resetDelegate } from '@/features/accounting/repositories/AccountingScopeResetRepository';
import { AccountingScopeResetPolicy } from '@/features/accounting/policies/AccountingScopeResetPolicy';
import { AccountingScopeResetService, ACCOUNTING_SCOPE_RESET } from '@/features/accounting/services/AccountingScopeResetService';
import { AuditService } from '@/features/accounting/services/AuditService';
import { AuditRepository } from '@/features/accounting/repositories/AuditRepository';
import { PostingRepository } from '@/features/accounting/repositories/PostingRepository';
import { CounterpartyRepository } from '@/features/accounting/repositories/CounterpartyRepository';
import { AccountingPolicy } from '@/features/accounting/policies/AccountingPolicy';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';

const app = makeApp();
type Who = { id: string; username: string };
let n = 0;

const audit = new AuditService(new AuditRepository(), new PostingRepository(), new AccountingPolicy(), new CounterpartyRepository());
const service = new AccountingScopeResetService(new AccountingScopeResetRepository(), new AccountingScopeResetPolicy(), audit);

async function novoUsuario(): Promise<Who> {
  n += 1;
  const u = await prisma.user.create({
    data: { name: `i7acc-${n}`, username: `i7-acc-${n}`, email: `i7acc-${n}@test.local`, password: 'x', role: 'USER' },
  });
  return { id: u.id, username: u.username };
}
const criar = (who: Who, suiteKey: string, fiscal: Record<string, unknown>) =>
  request(app).post('/api/dashboard/create').set(authHeader(who)).send({ suiteKey, unit: { name: 'Matriz' }, fiscal });
const resetar = (who: Who) => request(app).delete('/api/dashboard/system').set(authHeader(who));
const lancamento = (userId: string, unitId: string) =>
  prisma.journalEntry.create({ data: { userId, unitId, date: new Date(), description: 'movimento' } });

/** Contagem por tabela contábil classificada (SETUP + BLOCKING), filtrada pelo `userId`. */
async function linhasContabeis(userId: string): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of [...ACCOUNTING_RESET_SETUP, ...ACCOUNTING_RESET_BLOCKING]) {
    const c = await resetDelegate(prisma, t).count({ where: { userId } });
    if (c > 0) out[t] = c;
  }
  return out;
}
const trilha = (userId: string) => prisma.auditEvent.findMany({ where: { scopeUserId: userId }, orderBy: [{ unitId: 'asc' }, { seq: 'asc' }] });

const SALAO_PRESUMIDO = { regime: 'PRESUMIDO', icmsContribuinte: false };

describe('I7 PR-2 — reset contábil: gate de movimento na tx, SETUP removido, trilha intacta', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it.each([
    ['beautySalon', { regime: 'PRESUMIDO', icmsContribuinte: false }],
    ['beautySalon', { regime: 'SIMPLES' }],
    ['aestheticClinic', { regime: 'PRESUMIDO', icmsContribuinte: false }],
    ['aestheticClinic', { regime: 'REAL', icmsContribuinte: false }],
    ['crmModule', { regime: 'PRESUMIDO', icmsContribuinte: false }], // sem setor: sem kit, mas com perfis fiscais
  ])('item 10: onboarding Rápido %s + %j só escreve tabelas contábeis de SETUP ∪ TRAIL', async (suiteKey, fiscal) => {
    const u = await novoUsuario();
    const r = await criar(u, suiteKey, fiscal);
    expect(r.status).toBe(201);
    const escritas = Object.keys(await linhasContabeis(u.id));
    const fora = escritas.filter((t) => !(ACCOUNTING_RESET_SETUP as readonly string[]).includes(t));
    expect(fora).toEqual([]);
    if (r.body.data.accounting.status === 'Active') {
      expect(escritas).toEqual(expect.arrayContaining(['Account', 'AccountingBinding', 'AccountingPeriod']));
    }
    expect(ACCOUNTING_RESET_TRAIL).toContain('AuditEvent');
    // medição registrada no log do teste (o SETUP é medido, não suposto)
    console.info(`[I7 item 10] ${suiteKey} ${JSON.stringify(fiscal)} → ${JSON.stringify(await linhasContabeis(u.id))}`);
  }, 120000);

  it('item 11 (a): só SETUP ⇒ remove tudo, 1 evento accounting.scope_reset por unidade, trilha anterior intacta e cadeia válida', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    expect(r.status).toBe(201);
    const unitId: string = r.body.data.unitId;
    const antes = await trilha(u.id);
    const setupAntes = await linhasContabeis(u.id);

    const outcome = await service.purgeSetupIfNoMovement(u.id);

    expect(outcome.removed).toHaveLength(1);
    expect(outcome.removed[0].unitId).toBe(unitId);
    expect(outcome.removed[0].counts.Account).toBe(setupAntes.Account);
    expect(await linhasContabeis(u.id)).toEqual({});

    const depois = await trilha(u.id);
    expect(depois.slice(0, antes.length)).toEqual(antes); // nada da trilha anterior mudou
    const novos = depois.slice(antes.length);
    expect(novos).toHaveLength(1);
    expect(novos[0]).toMatchObject({ unitId, eventType: ACCOUNTING_SCOPE_RESET, targetId: unitId, prevHash: antes[antes.length - 1].hash });
    expect(JSON.parse(JSON.parse(novos[0].payload).removed).Account).toBe(setupAntes.Account);
    const verify = await audit.verifyAuditChain(resolveAccountingScopeInternal({ userId: u.id }, unitId));
    expect(verify.ok).toBe(true);
    expect(await prisma.auditChainHead.count({ where: { scopeUserId: u.id } })).toBe(1);

    // idempotente: a contabilidade já vazia passa direto, sem evento novo
    await expect(service.purgeSetupIfNoMovement(u.id)).resolves.toEqual({ removed: [] });
    expect(await prisma.auditEvent.count({ where: { scopeUserId: u.id } })).toBe(depois.length);
  }, 120000);

  it('companyLevel: 2 unidades só com SETUP ⇒ o perfil da empresa some e a contagem dele vem igual nos 2 eventos', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    const unidade1: string = r.body.data.unitId;
    await prisma.accountingPeriod.create({ data: { userId: u.id, unitId: 'unidade-2', year: 2026, month: 1 } });
    expect(await prisma.companyFiscalProfile.count({ where: { userId: u.id } })).toBe(1);
    const antes = await prisma.auditEvent.count({ where: { scopeUserId: u.id } });

    const outcome = await service.purgeSetupIfNoMovement(u.id);

    expect(outcome.removed.map((x) => x.unitId).sort()).toEqual([unidade1, 'unidade-2'].sort());
    expect(await prisma.companyFiscalProfile.count({ where: { userId: u.id } })).toBe(0);
    expect(await linhasContabeis(u.id)).toEqual({});
    const eventos = await prisma.auditEvent.findMany({ where: { scopeUserId: u.id, eventType: ACCOUNTING_SCOPE_RESET } });
    expect(eventos).toHaveLength(2);
    expect(await prisma.auditEvent.count({ where: { scopeUserId: u.id } })).toBe(antes + 2);
    const companyLevels = eventos.map((e) => JSON.parse(e.payload).companyLevel);
    expect(companyLevels).toEqual(['{"CompanyFiscalProfile":1}', '{"CompanyFiscalProfile":1}']);
    const doisRemoved = eventos.find((e) => e.unitId === 'unidade-2')!;
    expect(JSON.parse(JSON.parse(doisRemoved.payload).removed)).toEqual({ AccountingPeriod: 1 });
    for (const unitId of [unidade1, 'unidade-2']) {
      expect((await audit.verifyAuditChain(resolveAccountingScopeInternal({ userId: u.id }, unitId))).ok).toBe(true);
    }
  }, 120000);

  /** Versão PROPOSED como o `propose` grava (proposedById = dono; só existe com contador ativo no momento). */
  const versaoComContador = (userId: string, unitId: string) =>
    prisma.accountingPolicyVersion.create({
      data: { userId, unitId, target: 'FISCAL_PROFILE', version: 99, status: 'PROPOSED', pendingSlot: 'PROPOSED', payload: {}, proposedById: userId },
    });

  it('AccountingPolicyVersion (i): só a versão do onboarding (sem contador) ⇒ reset ok e ela some', async () => {
    const u = await novoUsuario();
    await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    const versoes = await prisma.accountingPolicyVersion.findMany({ where: { userId: u.id } });
    expect(versoes.length).toBeGreaterThan(0);
    expect(versoes.every((v) => v.proposedById === null && v.assignmentId === null)).toBe(true);
    const outcome = await service.purgeSetupIfNoMovement(u.id);
    expect(outcome.removed[0].counts.AccountingPolicyVersion).toBe(versoes.length);
    expect(await prisma.accountingPolicyVersion.count({ where: { userId: u.id } })).toBe(0);
  }, 120000);

  it('AccountingPolicyVersion (ii): versão proposta com contador, mesmo SEM AccountantAssignment ⇒ 409 e nada sai', async () => {
    const u = await novoUsuario();
    await versaoComContador(u.id, 'unidade-x');
    const err = await service.purgeSetupIfNoMovement(u.id).catch((e) => e);
    expect(err).toBeInstanceOf(SystemResetBlockedByAccountingError);
    expect(err.details).toEqual({ blocking: [{ table: 'AccountingPolicyVersion', count: 1 }] });
    expect(await prisma.accountingPolicyVersion.count({ where: { userId: u.id } })).toBe(1);
    expect(await prisma.accountantAssignment.count({ where: { userId: u.id } })).toBe(0);
  }, 120000);

  it('AccountingPolicyVersion (iii): a do onboarding + uma com contador ⇒ 409 e nada sai (nem a sem contador)', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    await versaoComContador(u.id, r.body.data.unitId);
    const antes = await linhasContabeis(u.id);
    const err = await service.purgeSetupIfNoMovement(u.id).catch((e) => e);
    expect(err).toBeInstanceOf(SystemResetBlockedByAccountingError);
    expect(err.details).toEqual({ blocking: [{ table: 'AccountingPolicyVersion', count: 1 }] });
    expect(await linhasContabeis(u.id)).toEqual(antes);
    expect(antes.AccountingPolicyVersion).toBeGreaterThan(1);
  }, 120000);

  it('AccountingPolicyVersion (iv): decidida por contador (assignment) ⇒ 409 e nada é apagado', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    const unitId: string = r.body.data.unitId;
    const contador = await novoUsuario();
    const contato = await prisma.accountingContact.create({
      data: { userId: u.id, unitId, name: 'Contadora', email: 'contadora@test.local', cpf: '52998224725', crcNumber: 'SP-123456/O-3', crcUf: 'SP' },
    });
    const atribuicao = await prisma.accountantAssignment.create({
      data: {
        userId: u.id, unitId, accountantUserId: contador.id, accountingContactId: contato.id, crcNumber: 'SP-123456/O-3', crcUf: 'SP',
        status: 'ACTIVE', activeSlot: 'ACTIVE', activeFrom: new Date(), createdById: u.id,
      },
    });
    await prisma.accountingPolicyVersion.updateMany({ where: { userId: u.id }, data: { assignmentId: atribuicao.id } });
    const antes = await linhasContabeis(u.id);

    const err = await service.purgeSetupIfNoMovement(u.id).catch((e) => e);
    expect(err).toBeInstanceOf(SystemResetBlockedByAccountingError);
    expect(err.details.blocking).toEqual(
      expect.arrayContaining([{ table: 'AccountantAssignment', count: 1 }, { table: 'AccountingPolicyVersion', count: expect.any(Number) }]),
    );
    expect(await linhasContabeis(u.id)).toEqual(antes);
    expect(antes.AccountingPolicyVersion).toBeGreaterThan(0);
  }, 120000);

  it('só companyLevel: clínica no REAL ⇒ o perfil da empresa some e o evento vai para a unidade com cadeia', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'aestheticClinic', { regime: 'REAL', icmsContribuinte: false });
    expect(r.status).toBe(201);
    const unitId: string = r.body.data.unitId;
    expect(await linhasContabeis(u.id)).toEqual({ CompanyFiscalProfile: 1 });
    expect(await prisma.auditChainHead.count({ where: { scopeUserId: u.id, unitId } })).toBe(1);

    const outcome = await service.purgeSetupIfNoMovement(u.id);

    expect(outcome.removed).toEqual([{ unitId, counts: {} }]);
    expect(await prisma.companyFiscalProfile.count({ where: { userId: u.id } })).toBe(0);
    const [evento] = await prisma.auditEvent.findMany({ where: { scopeUserId: u.id, eventType: ACCOUNTING_SCOPE_RESET } });
    expect(evento.unitId).toBe(unitId);
    expect(JSON.parse(evento.payload)).toEqual({ removed: '{}', companyLevel: '{"CompanyFiscalProfile":1}' });
    expect((await audit.verifyAuditChain(resolveAccountingScopeInternal({ userId: u.id }, unitId))).ok).toBe(true);
  }, 120000);

  it('só companyLevel e NENHUMA unidade com cadeia ⇒ falha fechado (409) e o perfil fica — nenhum delete sem evento', async () => {
    const u = await novoUsuario();
    await prisma.companyFiscalProfile.create({ data: { userId: u.id, anoCalendario: 2026, regime: 'PRESUMIDO' } });
    const err = await service.purgeSetupIfNoMovement(u.id).catch((e) => e);
    expect(err).toBeInstanceOf(ConflictError);
    expect(err).toMatchObject({ statusCode: 409, errorCode: 'SYSTEM_RESET_COMPANY_LEVEL_WITHOUT_TRAIL' });
    expect(await prisma.companyFiscalProfile.count({ where: { userId: u.id } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { scopeUserId: u.id } })).toBe(0);
  }, 120000);

  it('item 11 (b): um JournalEntry ⇒ SystemResetBlockedByAccountingError e zero linhas removidas em qualquer classe', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    await lancamento(u.id, r.body.data.unitId);
    const antes = await linhasContabeis(u.id);
    const trilhaAntes = await prisma.auditEvent.count({ where: { scopeUserId: u.id } });

    const err = await service.purgeSetupIfNoMovement(u.id).catch((e) => e);
    expect(err).toBeInstanceOf(SystemResetBlockedByAccountingError);
    expect(err.details).toEqual({ blocking: [{ table: 'JournalEntry', count: 1 }] });
    expect(await linhasContabeis(u.id)).toEqual(antes);
    expect(await prisma.auditEvent.count({ where: { scopeUserId: u.id } })).toBe(trilhaAntes);
  }, 120000);

  it('item 11 (c): duas unidades, só uma com movimento ⇒ lança, e nada removido nas duas', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    const unidade1: string = r.body.data.unitId;
    // 2ª unidade com configuração (um período) e um lançamento — só ela tem movimento
    await prisma.accountingPeriod.create({ data: { userId: u.id, unitId: 'unidade-2', year: 2026, month: 1 } });
    await lancamento(u.id, 'unidade-2');
    const antes = await linhasContabeis(u.id);

    await expect(service.purgeSetupIfNoMovement(u.id)).rejects.toBeInstanceOf(SystemResetBlockedByAccountingError);
    expect(await linhasContabeis(u.id)).toEqual(antes);
    expect(await prisma.accountingBinding.count({ where: { userId: u.id, unitId: unidade1 } })).toBe(1);
    expect(await prisma.accountingPeriod.count({ where: { userId: u.id, unitId: 'unidade-2' } })).toBe(1);
  }, 120000);

  it('item 12: onboarding do salão → reset 204 → create ⇒ contabilidade da NOVA unidade Active, sem conflito de setor', async () => {
    const u = await novoUsuario();
    const r1 = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    expect(r1.body.data.accounting.status).toBe('Active');

    expect((await resetar(u)).status).toBe(204);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(0);

    const r2 = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    expect(r2.status).toBe(201);
    expect(r2.body.data.unitId).not.toBe(r1.body.data.unitId);
    expect(r2.body.data.accounting).toEqual({ status: 'Active', sectorKey: 'beautySalon', bindingVersion: 1 });
  }, 120000);

  it('item 13: tenant com 1 lançamento ⇒ 409 SYSTEM_RESET_BLOCKED_BY_ACCOUNTING com details, e as tabelas dinâmicas ficam', async () => {
    const u = await novoUsuario();
    const r = await criar(u, 'beautySalon', SALAO_PRESUMIDO);
    await lancamento(u.id, r.body.data.unitId);
    const tabelas = await prisma.dynamicTable.count({ where: { userId: u.id } });

    const res = await resetar(u);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: 'SYSTEM_RESET_BLOCKED_BY_ACCOUNTING',
      details: { blocking: [{ table: 'JournalEntry', count: 1 }] },
    });
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message).toMatch(/movimento contábil/);
    expect(await prisma.dynamicTable.count({ where: { userId: u.id } })).toBe(tabelas);
    expect(tabelas).toBeGreaterThan(0);
  }, 120000);
});
