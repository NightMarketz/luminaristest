/**
 * CONTRATO dos filtros de lista dos subrazões AP/AR — integração contra SQLite REAL, sem mock.
 *
 * BE-INCR-SUBLEDGER-FILTERS §2 (comportamentos 1, 2, 4, 5, 6, 7). O comportamento 3 (`overdue`)
 * NÃO está aqui: está bloqueado pelo fork F9 do BRIEF (a fonte de "hoje" mora privada no
 * AgingReportService e promovê-la toca nó vizinho).
 *
 * POR QUE INTEGRAÇÃO, E NÃO UNIT. A suíte unit dos serviços injeta repositório FALSO — ela afirma o
 * fake. Nenhuma invariante deste arquivo é alcançável assim: a montagem do `where` é o objeto sob
 * teste, o vazamento entre inquilinos só existe com DOIS donos na mesma base, e a exclusão da tumba
 * de soft-delete só existe com linha realmente marcada. As asserções chamam o REPOSITÓRIO REAL
 * (`findManyByUnit`); o prisma só semeia.
 *
 * CADA FILTRO TEM CONTROLE POSITIVO E NEGATIVO. Um teste que espera lista vazia passa também quando
 * tudo está quebrado; é o par que separa "o filtro mordeu" de "nada funciona aqui".
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { PayableRepository } from '@/features/accounting/repositories/PayableRepository';
import { ReceivableRepository } from '@/features/accounting/repositories/ReceivableRepository';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-flt';
const DONO_A = 'u-flt-a';
const DONO_B = 'u-flt-b';

const CP1 = 'cp-flt-1';
const CP2 = 'cp-flt-2';

const apRepo = new PayableRepository();
const arRepo = new ReceivableRepository();

const escopo = (userId: string): AccountingScope => resolveAccountingScope({ userId }, UNIT);
const dia = (d: string) => new Date(`${d}T00:00:00.000Z`);

/** Página inteira — paginação não é o objeto deste arquivo. */
const PAGINA = { skip: 0, limit: 200 };

const listarAp = (p: Partial<Parameters<PayableRepository['findManyByUnit']>[1]> = {}, dono = DONO_A) =>
  apRepo.findManyByUnit(escopo(dono), { ...PAGINA, ...p });

const listarAr = (p: Partial<Parameters<ReceivableRepository['findManyByUnit']>[1]> = {}, dono = DONO_A) =>
  arRepo.findManyByUnit(escopo(dono), { ...PAGINA, ...p });

const nomes = (r: { payables: { description: string }[] }) => r.payables.map((x) => x.description).sort();

describe('Filtros de lista AP/AR — SQLite real (BE-INCR-SUBLEDGER-FILTERS §2)', () => {
  beforeAll(async () => {
    pushTestSchema();

    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }

    // AR exige revenueAccountId (FK obrigatória).
    await prisma.account.create({
      data: { id: 'acc-rev-flt', userId: DONO_A, unitId: UNIT, code: '3.1', name: 'Receita', nature: 'Revenue', acceptsEntries: true },
    });

    for (const [id, nome] of [[CP1, 'Contraparte Um'], [CP2, 'Contraparte Dois']]) {
      await prisma.counterparty.create({
        data: { id, userId: DONO_A, unitId: UNIT, type: 'SUPPLIER', name: nome, createdById: DONO_A },
      });
    }

    const ap = (over: Record<string, unknown>) => ({
      userId: DONO_A,
      unitId: UNIT,
      supplierName: 'Fornecedor',
      description: 'base',
      issueDate: dia('2026-02-01'),
      dueDate: dia('2026-03-15'),
      amountCents: 10_000,
      status: 'OPEN',
      ...over,
    });

    await prisma.payable.createMany({
      data: [
        // p1 — extremo INFERIOR da faixa; contraparte 1
        ap({ id: 'p1', description: 'Aluguel sala', documentNumber: 'NF-100', dueDate: dia('2026-03-01'), counterpartyId: CP1 }),
        // p2 — meio da faixa; contraparte 2
        ap({ id: 'p2', description: 'Energia eletrica', documentNumber: 'NF-200', dueDate: dia('2026-03-15'), counterpartyId: CP2 }),
        // p3 — extremo SUPERIOR da faixa; contraparte 1
        ap({ id: 'p3', description: 'Internet fibra', documentNumber: 'NF-300', dueDate: dia('2026-03-31'), counterpartyId: CP1 }),
        // p4 — TUMBA: casaria TODOS os filtros de p1, mas está soft-deletada
        ap({ id: 'p4', description: 'Aluguel sala', documentNumber: 'deleted:p4:NF-100', dueDate: dia('2026-03-01'), counterpartyId: CP1, deletedAt: new Date() }),
        // p5 — FORA da faixa pelos dois lados (controle do gte/lte)
        ap({ id: 'p5', description: 'Fora da faixa', documentNumber: 'NF-500', dueDate: dia('2026-04-01'), counterpartyId: CP1 }),
      ],
    });

    // p6 — OUTRO DONO, mesma unidade e mesmos valores: só o escopo o separa.
    await prisma.payable.create({
      data: ap({ id: 'p6', userId: DONO_B, description: 'Aluguel sala', documentNumber: 'NF-100', dueDate: dia('2026-03-01'), counterpartyId: null }),
    });

    await prisma.receivable.createMany({
      data: [
        {
          id: 'r1', userId: DONO_A, unitId: UNIT, customerName: 'Cliente', description: 'Mensalidade março',
          documentNumber: 'FAT-10', issueDate: dia('2026-02-01'), dueDate: dia('2026-03-01'),
          amountCents: 5_000, revenueAccountId: 'acc-rev-flt', status: 'OPEN', counterpartyId: CP1,
        },
        {
          id: 'r2', userId: DONO_A, unitId: UNIT, customerName: 'Cliente', description: 'Mensalidade abril',
          documentNumber: 'FAT-20', issueDate: dia('2026-03-01'), dueDate: dia('2026-04-01'),
          amountCents: 5_000, revenueAccountId: 'acc-rev-flt', status: 'OPEN', counterpartyId: CP2,
        },
      ],
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------- controle

  it('sem filtro devolve só as linhas vivas do dono (controle positivo)', async () => {
    const r = await listarAp();
    expect(nomes(r)).toEqual(['Aluguel sala', 'Energia eletrica', 'Fora da faixa', 'Internet fibra']);
    expect(r.total).toBe(4); // p4 (tumba) e p6 (outro dono) fora
  });

  // ------------------------------------------------- comportamento 1: contraparte

  it('comportamento 1 — counterpartyId filtra pela FK, e o par negativo confirma a mordida', async () => {
    const um = await listarAp({ counterpartyId: CP1 });
    expect(nomes(um)).toEqual(['Aluguel sala', 'Fora da faixa', 'Internet fibra']);

    const dois = await listarAp({ counterpartyId: CP2 });
    expect(nomes(dois)).toEqual(['Energia eletrica']);

    const nenhuma = await listarAp({ counterpartyId: 'cp-inexistente' });
    expect(nenhuma.payables).toHaveLength(0);
  });

  // --------------------------------------------- comportamento 2: faixa inclusiva

  it('comportamento 2 — a faixa de vencimento inclui OS DOIS extremos (F4)', async () => {
    const r = await listarAp({ dueFrom: '2026-03-01', dueTo: '2026-03-31' });
    // p1 está exatamente no piso e p3 exatamente no teto: se algum extremo fosse exclusivo,
    // um dos dois sumiria. p5 (2026-04-01) é o controle de que a faixa realmente corta.
    expect(nomes(r)).toEqual(['Aluguel sala', 'Energia eletrica', 'Internet fibra']);
  });

  it('comportamento 2 — faixa de um único dia devolve só aquele dia', async () => {
    const r = await listarAp({ dueFrom: '2026-03-15', dueTo: '2026-03-15' });
    expect(nomes(r)).toEqual(['Energia eletrica']);
  });

  it('comportamento 2 — extremo isolado funciona sem o par', async () => {
    expect(nomes(await listarAp({ dueFrom: '2026-03-31' }))).toEqual(['Fora da faixa', 'Internet fibra']);
    expect(nomes(await listarAp({ dueTo: '2026-03-01' }))).toEqual(['Aluguel sala']);
  });

  // ------------------------------------------------ comportamento 4: busca textual

  it('comportamento 4 — q casa description OU documentNumber', async () => {
    expect(nomes(await listarAp({ q: 'Aluguel' }))).toEqual(['Aluguel sala']);
    expect(nomes(await listarAp({ q: 'NF-200' }))).toEqual(['Energia eletrica']);
    expect(nomes(await listarAp({ q: 'fibra' }))).toEqual(['Internet fibra']);
    expect((await listarAp({ q: 'nao-existe-nada' })).payables).toHaveLength(0);
  });

  // -------------------------------------------------- comportamento 5: AND

  it('comportamento 5 — filtros distintos combinam por AND, não por OR', async () => {
    // CP1 sozinho traz 3; a faixa sozinha traz 3; juntos, só a interseção.
    const r = await listarAp({ counterpartyId: CP1, dueFrom: '2026-03-20', dueTo: '2026-03-31' });
    expect(nomes(r)).toEqual(['Internet fibra']);

    // Combinação impossível: contraparte 2 não tem linha nessa faixa. Se fosse OR, viria alguma.
    const vazio = await listarAp({ counterpartyId: CP2, dueFrom: '2026-03-20', dueTo: '2026-03-31' });
    expect(vazio.payables).toHaveLength(0);
  });

  it('comportamento 5 — q combina em AND com os demais (não amplia o conjunto)', async () => {
    const r = await listarAp({ counterpartyId: CP2, q: 'Aluguel' });
    // 'Aluguel' existe (p1) mas é da contraparte 1: o AND tem de zerar.
    expect(r.payables).toHaveLength(0);
    expect(r.total).toBe(0);
  });

  // ------------------------------- comportamento 6: base do where é intocável

  it('comportamento 6 — nenhum filtro alcança linha de OUTRO dono', async () => {
    // p6 é do DONO_B e casa description, documentNumber e dueDate de p1.
    for (const filtro of [
      { q: 'Aluguel' },
      { dueFrom: '2026-03-01', dueTo: '2026-03-01' },
      { q: 'NF-100' },
      {},
    ]) {
      const r = await listarAp(filtro);
      expect(r.payables.map((p) => p.id)).not.toContain('p6');
    }
    // Controle: o dono B enxerga a própria linha — a ausência acima é escopo, não base vazia.
    expect((await listarAp({ q: 'Aluguel' }, DONO_B)).payables.map((p) => p.id)).toEqual(['p6']);
  });

  it('comportamento 6 — nenhum filtro ressuscita linha soft-deletada', async () => {
    // p4 casa contraparte, faixa e texto de p1; só o deletedAt a separa.
    const r = await listarAp({ counterpartyId: CP1, dueFrom: '2026-03-01', dueTo: '2026-03-01', q: 'Aluguel' });
    expect(r.payables.map((p) => p.id)).toEqual(['p1']);
  });

  // ------------------------------------------- comportamento 7: total filtrado

  it('comportamento 7 — total conta o conjunto FILTRADO, não o total da unidade', async () => {
    const semFiltro = await listarAp();
    const comFiltro = await listarAp({ counterpartyId: CP2 });
    expect(semFiltro.total).toBe(4);
    expect(comFiltro.total).toBe(1);
    // O total tem de acompanhar a página, senão a paginação do FE mente.
    expect(comFiltro.total).toBe(comFiltro.payables.length);
  });

  // ------------------------------------------------ F6: AR é espelho literal

  it('F6 — AR aceita os mesmos filtros com o mesmo significado', async () => {
    const porContraparte = await listarAr({ counterpartyId: CP1 });
    expect(porContraparte.receivables.map((r) => r.id)).toEqual(['r1']);
    expect(porContraparte.total).toBe(1);

    const porFaixa = await listarAr({ dueFrom: '2026-03-01', dueTo: '2026-03-01' });
    expect(porFaixa.receivables.map((r) => r.id)).toEqual(['r1']);

    const porTexto = await listarAr({ q: 'FAT-20' });
    expect(porTexto.receivables.map((r) => r.id)).toEqual(['r2']);

    const combinado = await listarAr({ counterpartyId: CP2, q: 'março' });
    expect(combinado.receivables).toHaveLength(0);
  });
});
