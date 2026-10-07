/**
 * BE-INCR-MIT-EXPORT PR-2 (nó X9, BRIEF itens 10–12, 15–17; testes 17 c, d, f) — geração e listagem do arquivo do MIT
 * ponta a ponta pelo HTTP. As apurações do X7 são gravadas direto no banco (o X9 só as LÊ; o cálculo é do X7 e tem
 * suíte própria). Os testes 17 (a), (b) e (e) da função pura estão em `src/lib/__tests__/mit.test.ts` (PR-1); aqui o
 * (e) volta só como 422 pela rota.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';
import { PAYLOAD_ALLOWLIST } from '@/features/accounting/audit/auditCanonical';
import { AVISOS_MIT_FIXOS } from '@/lib/mit';

const app = makeApp();
const UNIT = 'unit-x9-pr2';
const BASE = '/api/accounting/mit-exports';
const CPF = '52998224725';
const CNPJ = '12345678000195';
type Dono = { id: string; username: string };

let seq = 0;
async function novoDono(regime: string, extra: Record<string, unknown> = {}, opts: { contador?: 'vivo' | 'arquivado' | 'nenhum' } = {}): Promise<Dono> {
  seq += 1;
  const u = await prisma.user.create({ data: { name: `x9p2-${seq}`, username: `x9p2-${seq}`, email: `x9p2-${seq}@test.local`, password: 'x', role: 'USER' } });
  const modo = opts.contador ?? 'vivo';
  const contato =
    modo === 'nenhum'
      ? null
      : await prisma.accountingContact.create({
          data: {
            userId: u.id, unitId: UNIT, name: 'Contadora', email: 'contadora@escritorio.com.br', cpf: CPF, phone: '11987654321',
            crcNumber: 'SP-123456/O-3', crcUf: 'SP', deletedAt: modo === 'arquivado' ? new Date() : null,
          },
        });
  await prisma.companyFiscalProfile.create({
    data: {
      userId: u.id, anoCalendario: 2026, regime, createdById: u.id, updatedById: u.id,
      declarante: { cnpj: CNPJ }, contadorContactId: contato?.id ?? null, ...extra,
    },
  });
  return u;
}

async function apuracao(dono: Dono, tributo: 'IRPJ' | 'CSLL', periodo: string, aPagarCents: bigint, extra: Record<string, unknown> = {}) {
  return prisma.taxAssessment.create({
    data: {
      userId: dono.id, unitId: UNIT, anoCalendario: 2026, tributo, regime: 'PRESUMIDO', forma: 'TRIMESTRAL', periodo, modo: 'PRESUMIDO',
      codigoReceita: tributo === 'IRPJ' ? '208901' : '237201', baseCents: 0n, devidoCents: aPagarCents, deducoesCents: 0n, aPagarCents,
      memoria: [], tabelaVersao: 't', status: 'CONFIRMED', confirmedById: dono.id, confirmedAt: new Date(), ...extra,
    },
  });
}

const gerar = (dono: Dono, mes = 3, extra: Record<string, unknown> = {}) =>
  request(app).post(BASE).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2026, mes, ...extra });
const listar = (dono: Dono) => request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT, anoCalendario: 2026 });

describe('X9 PR-2 — arquivo do MIT: geração, registro, auditoria e defasagem', () => {
  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => jest.restoreAllMocks());

  it('Presumido T01 ⇒ 201 com o arquivo, grava MitExport e audita sem PII (17 c)', async () => {
    const dono = await novoDono('PRESUMIDO');
    const irpj = await apuracao(dono, 'IRPJ', 'T01', 7400000n);
    const csll = await apuracao(dono, 'CSLL', 'T01', 2880000n);
    const spies = (['info', 'warn', 'error', 'debug'] as const).map((m) => jest.spyOn(logger, m));

    const res = await gerar(dono);
    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.nomeArquivo).toBe('12345678-MIT-202603.json');
    expect(d.avisos).toEqual(expect.arrayContaining([...AVISOS_MIT_FIXOS]));
    const arq = JSON.parse(d.conteudo);
    expect(arq.DadosIniciais.ResponsavelApuracao.CpfResponsavel).toBe(CPF);
    expect(arq.Debitos.Irpj.ListaDebitos[0]).toEqual({ IdDebito: 1, CodigoDebito: '208901', ValorDebito: 74000 });
    expect(arq.Debitos.Csll.ListaDebitos[0]).toEqual({ IdDebito: 2, CodigoDebito: '237201', ValorDebito: 28800 });

    const row = await prisma.mitExport.findUniqueOrThrow({ where: { id: d.id } });
    expect(row).toMatchObject({ userId: dono.id, anoCalendario: 2026, mes: 3, sha256: d.sha256, geradoPorId: dono.id });
    expect([...(row.apuracaoIds as string[])].sort()).toEqual([irpj.id, csll.id].sort());

    const ev = await prisma.auditEvent.findMany({ where: { scopeUserId: dono.id, eventType: 'tax.mit_export.generated' } });
    expect(ev).toHaveLength(1);
    expect(Object.keys(JSON.parse(ev[0].payload)).sort()).toEqual([...PAYLOAD_ALLOWLIST['tax.mit_export.generated']].sort());
    expect(ev[0].targetId).toBe(d.id);

    // 17 (c): o CPF (e o contato) não estão na auditoria, na linha MitExport nem no log.
    for (const texto of [ev[0].payload, JSON.stringify(row), ...spies.flatMap((s) => s.mock.calls.map((c) => JSON.stringify(c)))]) {
      expect(texto).not.toContain(CPF);
      expect(texto).not.toContain('contadora@');
      expect(texto).not.toContain('987654321');
    }
  });

  it('17 (d) defasagem: substitui T01 ⇒ o velho fica defasado; o novo sai em dia', async () => {
    const dono = await novoDono('PRESUMIDO');
    const irpj = await apuracao(dono, 'IRPJ', 'T01', 100n);
    await apuracao(dono, 'CSLL', 'T01', 50n);
    const velho = (await gerar(dono)).body.data.id as string;
    expect((await listar(dono)).body.data).toEqual([expect.objectContaining({ id: velho, defasado: false })]);

    // Substituição do X7 (A-14): a linha velha vira SUPERSEDED e entra uma nova CONFIRMED no mesmo período.
    await prisma.taxAssessment.update({ where: { id: irpj.id }, data: { status: 'SUPERSEDED' } });
    await apuracao(dono, 'IRPJ', 'T01', 200n, { supersedesId: irpj.id });
    expect((await listar(dono)).body.data).toEqual([expect.objectContaining({ id: velho, defasado: true })]);

    const novo = (await gerar(dono)).body.data.id as string;
    const lista = (await listar(dono)).body.data as { id: string; defasado: boolean }[];
    expect(lista.find((l) => l.id === novo)?.defasado).toBe(false);
    expect(lista.find((l) => l.id === velho)?.defasado).toBe(true);
  });

  it('defasagem também quando a apuração exportada é apagada (deletedAt)', async () => {
    const dono = await novoDono('PRESUMIDO');
    const irpj = await apuracao(dono, 'IRPJ', 'T01', 100n);
    const id = (await gerar(dono)).body.data.id as string;
    await prisma.taxAssessment.update({ where: { id: irpj.id }, data: { deletedAt: new Date() } });
    expect((await listar(dono)).body.data).toEqual([expect.objectContaining({ id, defasado: true })]);
  });

  describe('17 (f) recusas, na ordem do item 10', () => {
    it('perfil do ano ausente ⇒ 400', async () => {
      const dono = await novoDono('PRESUMIDO');
      const res = await request(app).post(BASE).set(authHeader(dono)).send({ unitId: UNIT, anoCalendario: 2027, mes: 3 });
      expect(res.status).toBe(400);
    });

    it('SIMPLES ⇒ 400 (D10)', async () => {
      const dono = await novoDono('SIMPLES');
      const res = await gerar(dono);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toMatch(/Simples não informa no MIT/);
    });

    it('sem CNPJ do declarante ⇒ 400', async () => {
      const dono = await novoDono('PRESUMIDO', { declarante: {} });
      expect((await gerar(dono)).status).toBe(400);
    });

    it('sem contador ⇒ 400; contador arquivado ⇒ 400', async () => {
      const sem = await novoDono('PRESUMIDO', {}, { contador: 'nenhum' });
      await apuracao(sem, 'IRPJ', 'T01', 100n);
      expect((await gerar(sem)).status).toBe(400);
      const arq = await novoDono('PRESUMIDO', {}, { contador: 'arquivado' });
      await apuracao(arq, 'IRPJ', 'T01', 100n);
      expect((await gerar(arq)).status).toBe(400);
    });

    it('liminar LC 224 ligada ⇒ 409 (F-X9-5 c)', async () => {
      const dono = await novoDono('PRESUMIDO', { lc224AcrescimoSuspenso: true, lc224LiminarReferencia: '000' });
      await apuracao(dono, 'IRPJ', 'T01', 100n);
      const res = await gerar(dono);
      expect(res.status).toBe(409);
      expect(res.body.errorCode ?? JSON.stringify(res.body)).toMatch(/MIT_LC224_LIMINAR/);
    });

    it('todas as confirmadas com aPagar = 0 ⇒ 422 (17 e); mês sem apuração ⇒ 422; nada gravado', async () => {
      const dono = await novoDono('PRESUMIDO');
      await apuracao(dono, 'IRPJ', 'T01', 0n);
      await apuracao(dono, 'CSLL', 'T01', 0n);
      expect((await gerar(dono)).status).toBe(422);
      expect((await gerar(dono, 2)).status).toBe(422);
      expect(await prisma.mitExport.count({ where: { userId: dono.id } })).toBe(0);
    });
  });

  it('DTO .strict(): chave extra ou mês fora de 1..12 ⇒ 400; ano < 2025 na query ⇒ 400', async () => {
    const dono = await novoDono('PRESUMIDO');
    expect((await gerar(dono, 3, { extra: 1 })).status).toBe(400);
    expect((await gerar(dono, 13)).status).toBe(400);
    const r = await request(app).get(BASE).set(authHeader(dono)).query({ unitId: UNIT, anoCalendario: 2024 });
    expect(r.status).toBe(400);
  });

  it('a lista é da PJ: outro dono não vê as exportações', async () => {
    const a = await novoDono('PRESUMIDO');
    await apuracao(a, 'IRPJ', 'T01', 100n);
    expect((await gerar(a)).status).toBe(201);
    const b = await novoDono('PRESUMIDO');
    expect((await listar(b)).body.data).toEqual([]);
  });

  it('sem token ⇒ 401', async () => {
    expect((await request(app).post(BASE).send({ unitId: UNIT, anoCalendario: 2026, mes: 3 })).status).toBe(401);
  });
});
