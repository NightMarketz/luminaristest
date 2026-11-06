/**
 * FIX-TESTES item 5, lote 5 (BRIEF `docs/accounting/FIX-MENSAGENS-ID-INTERNO-brief.md`, item 5; inventário
 * `docs/operating-manual/MENSAGENS-ID-INTERNO-2026-11-05.md`). A mensagem que o operador lê nomeia o registro pelo rótulo
 * (F-MSG-2 a1), nunca pelo cuid de um registro já carregado ou que ele não mandou (F-MSG-1 a). Um caso por site "corrigir"
 * do lote 5: retificação ECD/ECF (gate comum + corrida da `@unique`), dispensa da ECF retificadora e a geração da ECF do
 * Lucro Real (ajuste do e-Lalur, movimento da Parte B, lançamento vinculado).
 *
 * Rótulos ratificados (dono, chat, 05/11, lote 3): job ECD/ECF = tipo + período (`describeExportJob`); ajuste do e-Lalur =
 * código + livro + período; movimento da Parte B = histórico + período; lançamento contábil = nº + data + descrição.
 *
 * Estado que a HTTP não produz (job FAILED, linha do e-Lalur fora do período, texto com '|', corrida da `@unique`) é montado
 * pelo prisma ou por espião que chama o original.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { Prisma } from 'generated/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { DataExchangeRepository } from '@/features/accounting/repositories/DataExchangeRepository';
import { LalurService } from '@/features/accounting/services/LalurService';
import { SpedEcfRealGenerationService } from '@/features/accounting/services/SpedEcfRealGenerationService';

const app = makeApp();
type U = { id: string; username: string };
const YEAR = 2025;
const ECF_REAL = 'EXPORT_SPED_ECF_REAL';
const ROTULO_ECF_REAL = 'ECF_REAL de 01/01/2025 a 31/12/2025';

/** Status certo, a mensagem contém o rótulo e não contém nenhum dos ids. A `msg` vai no objeto para o diff mostrá-la. */
function nomeiaSemId(res: request.Response, status: number, rotulo: string, ...ids: string[]) {
  const msg = String(res.body.message);
  expect({ status: res.status, nomeiaRotulo: msg.includes(rotulo), idNaMensagem: ids.filter((id) => msg.includes(id)), msg }).toEqual({
    status,
    nomeiaRotulo: true,
    idNaMensagem: [],
    msg,
  });
}

const p2002Supersedes = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`supersedesJobId`)', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['supersedesJobId'] },
  });

describe('FIX-MENSAGENS-ID-INTERNO lote 5 — retificação, dispensa e ECF do Lucro Real nomeiam pelo rótulo, nunca pelo cuid', () => {
  const criarDono = (tag: string): Promise<U> =>
    prisma.user.create({ data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role: 'USER' } });

  /** Uma unidade por caso, cada uma com o próprio dono: o cadastro de sócios é do dono, não da unidade (CPF único). */
  async function unidade(unitId: string): Promise<U> {
    const u = await criarDono(`msg-l5-${unitId}`);
    await seedUnit({ userId: u.id, id: unitId });
    return u;
  }

  const job = (u: U, unitId: string, over: Partial<Prisma.AccountingDataExchangeJobUncheckedCreateInput> = {}) =>
    prisma.accountingDataExchangeJob.create({
      data: {
        userId: u.id, unitId, direction: 'EXPORT', kind: ECF_REAL, status: 'EXPORTED', requestedById: u.id,
        periodStart: new Date(Date.UTC(YEAR, 0, 1)), periodEnd: new Date(Date.UTC(YEAR, 11, 31)), ...over,
      },
    });

  /** Unidade pronta para a ECF do Lucro Real: `antes` monta o estado do caso; depois a Parte B fecha os 4 trimestres. */
  async function unidadeEcfReal(unitId: string, antes?: (u: U) => Promise<void>) {
    const dono = await unidade(unitId);
    if (antes) await antes(dono);
    for (const quarter of ['T01', 'T02', 'T03', 'T04']) {
      const r = await request(app).post('/api/lalur/parte-b/close').set(authHeader(dono)).send({ unitId, year: YEAR, quarter });
      expect({ quarter, status: r.status, body: r.status === 200 ? undefined : r.body }).toEqual({ quarter, status: 200, body: undefined });
    }
    const partner = await request(app)
      .post('/api/accounting/partners')
      .set(authHeader(dono))
      .send({ unitId, nome: 'SOCIO MSG', taxId: '52998224725', residenteBrasil: true, participacaoBp: 10000, entradaEm: '2020-01-01' });
    expect(partner.status).toBe(201);
    return { dono, partnerId: partner.body.data.id as string };
  }

  const ecfRealBody = (unitId: string, partnerId: string, over: Record<string, unknown> = {}) => ({
    unitId,
    year: YEAR,
    declarant: {
      cnpj: '11222333000181', nome: 'INDUSTRIA MSG LTDA', codNat: '2062', cnaeFiscal: '9602501',
      endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'DF', codMun: '5300108',
      cep: '70000000', email: 'industria@teste.com',
    },
    fiscal: { formaTrib: '1', formaTribPer: 'RRRR' },
    signers: [
      { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'DF-123456/O-1', email: 'c@d.com', fone: '6133334444' },
      { identNom: 'SOCIO', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '6133335555' },
    ],
    socios: [{ partnerId, qualif: '02', valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } }],
    ...over,
  });
  const retificar = (supersedesJobId: string) => ({ retificadora: 'S', numRec: 'A'.repeat(40), supersedesJobId });
  const gerarEcfReal = (u: U, body: object) => request(app).post('/api/accounting/sped/ecf/real/generate').set(authHeader(u)).send(body);

  /** Ajuste do e-Lalur gravado por fora (estado que a rota recusa); código 7 = custos não dedutíveis, E, tipoLanc A. */
  const ajuste = (u: U, unitId: string, over: Partial<Prisma.LalurEntryUncheckedCreateInput> = {}) =>
    prisma.lalurEntry.create({
      data: {
        userId: u.id, unitId, year: YEAR, quarter: 'T01', livro: 'lalur', codigo: '7', valorCents: 1000n, indRelacao: '4',
        histLancamento: 'Custos MSG', origem: 'user', ...over,
      },
    });

  /** Conta da Parte B e um movimento em T01 pela rota; `historico` depois é corrompido por fora, se o caso pedir. */
  async function movimento(u: U, unitId: string, codCtaB: string) {
    const pb = await request(app).post('/api/lalur/parte-b').set(authHeader(u)).send({
      unitId, codCtaB, descricao: 'Prejuízo fiscal MSG', dtCriacao: '2024-12-31', codPbRfb: '1000', codTributo: 'I', saldoIniCents: 0, indSaldoIni: 'D',
    });
    expect(pb.status).toBe(201);
    const mv = await request(app).post('/api/lalur/parte-b/movements').set(authHeader(u)).send({
      unitId, parteBId: pb.body.data.id, year: YEAR, quarter: 'T01', indicador: 'DB', valorCents: 1000, historico: 'Hist MSG', indLanAnt: 'N',
    });
    expect(mv.status).toBe(201);
    return { parteBId: pb.body.data.id as string, movementId: mv.body.data.id as string };
  }

  beforeAll(async () => {
    pushTestSchema();
  }, 120000);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('spedRectificationGate (retificação da ECF do Lucro Real)', () => {
    const unitId = 'unit-msg-l5-gate';
    let dono: U;
    let partnerId: string;

    beforeAll(async () => {
      ({ dono, partnerId } = await unidadeEcfReal(unitId));
    }, 120000);

    it('spedRectificationGate:30 — job de outro tipo (400) nomeia o job pelo tipo + período', async () => {
      const ecd = await job(dono, unitId, { kind: 'EXPORT_SPED_ECD' });
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId, retificar(ecd.id)));
      nomeiaSemId(res, 400, 'ECD de 01/01/2025 a 31/12/2025', ecd.id);
    });

    it('spedRectificationGate:35 — job que não está EXPORTED (400) nomeia o job', async () => {
      const falho = await job(dono, unitId, { status: 'FAILED' });
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId, retificar(falho.id)));
      nomeiaSemId(res, 400, ROTULO_ECF_REAL, falho.id);
    });

    it('spedRectificationGate:39 — job sem período gravado (400) nomeia o job pela data de geração', async () => {
      const semPeriodo = await job(dono, unitId, { periodStart: null, periodEnd: null, createdAt: new Date(Date.UTC(2026, 0, 10, 12)) });
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId, retificar(semPeriodo.id)));
      nomeiaSemId(res, 400, 'ECF_REAL gerada em 10/01/2026', semPeriodo.id);
    });

    it('spedRectificationGate:43 — job de outro período (400) nomeia o job', async () => {
      const outro = await job(dono, unitId, { periodStart: new Date(Date.UTC(2024, 0, 1)), periodEnd: new Date(Date.UTC(2024, 11, 31)) });
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId, retificar(outro.id)));
      nomeiaSemId(res, 400, 'ECF_REAL de 01/01/2024 a 31/12/2024', outro.id);
    });

    it('spedRectificationGate:54 — job já retificado (409) nomeia os dois jobs, não os cuids', async () => {
      const original = await job(dono, unitId);
      const sucessor = await job(dono, unitId, { supersedesJobId: original.id, createdAt: new Date(Date.UTC(2026, 1, 2, 12)) });
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId, retificar(original.id)));
      nomeiaSemId(res, 409, ROTULO_ECF_REAL, original.id, sucessor.id);
    });

    it('SpedEcfRealGenerationService:516 — corrida da @unique na retificação (409) nomeia o job retificado', async () => {
      const original = await job(dono, unitId);
      jest.spyOn(DataExchangeRepository.prototype, 'createJob').mockRejectedValueOnce(p2002Supersedes());
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId, retificar(original.id)));
      nomeiaSemId(res, 409, ROTULO_ECF_REAL, original.id);
    });
  });

  it('SpedEcfGenerationService:255 — corrida da @unique na retificação da ECF do Presumido (409) nomeia o job retificado', async () => {
    const unitId = 'unit-msg-l5-ecf';
    const dono = await unidade(unitId);
    const original = await job(dono, unitId, { kind: 'EXPORT_SPED_ECF' });
    jest.spyOn(DataExchangeRepository.prototype, 'createJob').mockRejectedValueOnce(p2002Supersedes());
    const res = await request(app)
      .post('/api/accounting/sped/ecf/generate')
      .set(authHeader(dono))
      .send({
        unitId,
        year: YEAR,
        declarant: {
          cnpj: '11222333000181', nome: 'SALAO MSG LTDA', codNat: '2062', cnaeFiscal: '9602501',
          endereco: 'RUA DAS FLORES', num: '100', bairro: 'CENTRO', uf: 'SP', codMun: '3550308', cep: '01000000', email: 'salao@teste.com',
        },
        fiscal: { indAliqCsll: '1', indRecReceita: '2' },
        signers: [
          { identNom: 'CONTADOR', identCpfCnpj: '11122233396', identQualif: '900', indCrc: 'SP-123456/O-1', email: 'c@d.com', fone: '1133334444' },
          { identNom: 'SOCIA', identCpfCnpj: '98765432100', identQualif: '205', email: 's@d.com', fone: '1133335555' },
        ],
        socios: [],
        dirigentes: [{ nome: 'DIRETORA', cpf: '52998224725', qualif: '10', dtAltSoc: '2020-01-01', valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } }],
        ...retificar(original.id),
      });
    nomeiaSemId(res, 409, 'ECF de 01/01/2025 a 31/12/2025', original.id);
  });

  it('SpedGenerationService:221 — corrida da @unique na ECD substituta (409) nomeia o job substituído', async () => {
    const unitId = 'unit-msg-l5-ecd';
    const dono = await unidade(unitId);
    const original = await job(dono, unitId, { kind: 'EXPORT_SPED_ECD' });
    jest.spyOn(DataExchangeRepository.prototype, 'createJob').mockRejectedValueOnce(p2002Supersedes());
    const res = await request(app)
      .post('/api/accounting/sped/ecd/generate')
      .set(authHeader(dono))
      .field('unitId', unitId)
      .field('mappingVersion', 'RFB-2025')
      .field('year', String(YEAR))
      .field('supersedesJobId', original.id)
      .field(
        'declarant',
        JSON.stringify({
          nome: 'SALAO MSG LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
          indSitIniPer: '0', indNire: '0', indFinEsc: '1', codHashSub: 'a'.repeat(40), indGrandePorte: '0', tipEcd: '0',
          identMf: 'N', indEscCons: 'N', indCentralizada: '0', indMudancPc: '0',
        }),
      )
      .field('book', JSON.stringify({ numOrd: '1', natLivr: 'DIARIO GERAL', dtExSocial: `${YEAR}-12-31` }))
      .field(
        'signers',
        JSON.stringify([
          { identNom: 'SOCIA', identCpfCnpj: '98765432100', codAssin: '205', indRespLegal: 'S' },
          { identNom: 'CONTADOR', identCpfCnpj: '11122233396', codAssin: '900', indCrc: 'SP-123456/O-1', ufCrc: 'SP', email: 'c@d.com', fone: '1133334444', indRespLegal: 'N' },
        ]),
      )
      .field(
        'verificationTerm',
        JSON.stringify({
          codMotSubs: '001',
          signers: [{ identNom: 'CONTADOR', identCpfCnpj: '11122233396', codAssin: '910', indCrc: 'SP-123456/O-1', email: 'c@d.com', fone: '1133334444', ufCrc: 'SP' }],
        }),
      )
      .attach('rtf', Buffer.from('{\rtf1\ansi Termo de verificacao}'), { filename: 'termo.rtf', contentType: 'application/rtf' });
    nomeiaSemId(res, 409, 'ECD de 01/01/2025 a 31/12/2025', original.id);
  });

  it('DataExchangeExportService:707 — dispensar retificação de job que não a exige (400) nomeia o job', async () => {
    const unitId = 'unit-msg-l5-waive';
    const dono = await unidade(unitId);
    const ecd = await job(dono, unitId, { kind: 'EXPORT_SPED_ECD', ecfRectificationRequired: false });
    const res = await request(app)
      .post(`/api/accounting/data-exchange/jobs/${ecd.id}/waive-ecf-rectification`)
      .set(authHeader(dono))
      .send({ unitId, justification: 'Dispensa pedida pelo contador no teste' });
    nomeiaSemId(res, 400, 'ECD de 01/01/2025 a 31/12/2025', ecd.id);
  });

  describe('SpedEcfRealGenerationService — ajuste do e-Lalur, movimento da Parte B e lançamento vinculado', () => {
    it('SpedEcfRealGenerationService:176 — ajuste com código fora do catálogo (400) nomeia o ajuste', async () => {
      const unitId = 'unit-msg-l5-r176';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        id = (await ajuste(u, unitId, { codigo: 'ZZ-MSG' })).id;
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste 'ZZ-MSG' (lalur, T01/2025)", id);
    });

    it('SpedEcfRealGenerationService:186 — ajuste cujo código perdeu o TIPO_LANCAMENTO no catálogo (400) nomeia o ajuste', async () => {
      const unitId = 'unit-msg-l5-r186';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        id = (await ajuste(u, unitId)).id;
      });
      const original = LalurService.resolveLinha.bind(LalurService);
      jest.spyOn(LalurService, 'resolveLinha').mockImplementation((livro, codigo, year) => ({ ...original(livro, codigo, year), tipoLanc: 'R' as const }));
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, T01/2025)", id);
    });

    it('SpedEcfRealGenerationService:195 — ajuste com a conta contábil arquivada (400) nomeia o ajuste', async () => {
      const unitId = 'unit-msg-l5-r195';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        const conta = await prisma.account.create({
          data: { userId: u.id, unitId, code: '4.1.8', name: 'Despesa MSG', nature: 'Expense', deletedAt: new Date() },
        });
        id = (await ajuste(u, unitId, { indRelacao: '2', accountId: conta.id, histLancamento: null })).id;
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, T01/2025)", id);
    });

    it('SpedEcfRealGenerationService:201 — ajuste com conta de natureza fora de 01..04 (400) nomeia o ajuste', async () => {
      const unitId = 'unit-msg-l5-r201';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        const conta = await prisma.account.create({ data: { userId: u.id, unitId, code: '9.9', name: 'Memo MSG', nature: 'Memo' } });
        id = (await ajuste(u, unitId, { indRelacao: '2', accountId: conta.id, histLancamento: null })).id;
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, T01/2025)", id);
    });

    it('SpedEcfRealGenerationService:206 — ajuste vinculado a lançamento sem número (400) nomeia o ajuste e o lançamento', async () => {
      const unitId = 'unit-msg-l5-r206';
      let id = '';
      let lancamentoId = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        const conta = await prisma.account.create({ data: { userId: u.id, unitId, code: '4.1.9', name: 'Despesa MSG', nature: 'Expense' } });
        const e = await ajuste(u, unitId, { indRelacao: '2', accountId: conta.id, histLancamento: null });
        const rascunho = await prisma.journalEntry.create({
          data: { userId: u.id, unitId, date: new Date(Date.UTC(YEAR, 2, 15)), description: 'Provisão MSG', status: 'Draft' },
        });
        await prisma.lalurEntryJournalEntry.create({ data: { entryId: e.id, journalEntryId: rascunho.id } });
        id = e.id;
        lancamentoId = rascunho.id;
      });
      const res = await gerarEcfReal(dono, ecfRealBody(unitId, partnerId));
      nomeiaSemId(res, 400, "ajuste '7' (lalur, T01/2025)", id, lancamentoId);
      nomeiaSemId(res, 400, 'lançamento sem número de 15/03/2025 — Provisão MSG', id, lancamentoId);
    });

    it('SpedEcfRealGenerationService:235 — ajuste mensal numa ECF trimestral (400) nomeia o ajuste', async () => {
      const unitId = 'unit-msg-l5-r235';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        id = (await ajuste(u, unitId, { quarter: 'A03' })).id;
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, A03/2025)", id);
    });

    it('SpedEcfRealGenerationService:240 — ajuste num mês sem M030 da forma anual (400) nomeia o ajuste', async () => {
      const unitId = 'unit-msg-l5-r240';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        id = (await ajuste(u, unitId, { quarter: 'A04' })).id;
      });
      // A forma anual exige perfil + 12 apurações confirmadas; o espião chama o original com o MES_BAL_RED de um anual
      // em que o A04 não é 'B' (o que a forma anual produz), sem montar o ano inteiro.
      const original = SpedEcfRealGenerationService.assertLinhasNosPeriodos.bind(SpedEcfRealGenerationService);
      jest.spyOn(SpedEcfRealGenerationService, 'assertLinhasNosPeriodos').mockImplementation((entries, year) => original(entries, year, 'EEEEEEEEEEEE', [], []));
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, A04/2025)", id);
    });

    it("SpedEcfRealGenerationService:256 — ajuste com '|' no histórico (400) nomeia o ajuste", async () => {
      const unitId = 'unit-msg-l5-r256';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        id = (await ajuste(u, unitId, { histLancamento: 'Custos|MSG' })).id;
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, T01/2025)", id);
    });

    it("SpedEcfRealGenerationService:257 — processo do ajuste com '|' (400) nomeia o ajuste", async () => {
      const unitId = 'unit-msg-l5-r257';
      let id = '';
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        id = (await ajuste(u, unitId)).id;
        await prisma.lalurProcess.create({ data: { parentId: id, entryId: id, indProc: '2', numProc: 'ADM|9' } });
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "ajuste '7' (lalur, T01/2025)", id);
    });

    it("SpedEcfRealGenerationService:260 — movimento da Parte B com '|' no histórico (400) nomeia o movimento", async () => {
      const unitId = 'unit-msg-l5-r260';
      let ids = { parteBId: '', movementId: '' };
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        ids = await movimento(u, unitId, 'MSG-260');
        await prisma.lalurParteBMovement.update({ where: { id: ids.movementId }, data: { historico: 'Hist|MSG' } });
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "movimento da Parte B 'Hist|MSG' (T01/2025)", ids.movementId, ids.parteBId);
    });

    it("SpedEcfRealGenerationService:261 — processo do movimento com '|' (400) nomeia o movimento", async () => {
      const unitId = 'unit-msg-l5-r261';
      let ids = { parteBId: '', movementId: '' };
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        ids = await movimento(u, unitId, 'MSG-261');
        await prisma.lalurProcess.create({ data: { parentId: ids.movementId, movementId: ids.movementId, indProc: '2', numProc: 'ADM|9' } });
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "movimento da Parte B 'Hist MSG' (T01/2025)", ids.movementId, ids.parteBId);
    });

    it('SpedEcfRealGenerationService:394 — movimento da Parte B fora dos períodos da forma (400) nomeia o movimento', async () => {
      const unitId = 'unit-msg-l5-r394';
      let ids = { parteBId: '', movementId: '' };
      const { dono, partnerId } = await unidadeEcfReal(unitId, async (u) => {
        ids = await movimento(u, unitId, 'MSG-394');
        // Órfão de uma troca de forma: o movimento ficou no A00, que só a forma anual tem; o fechamento trimestral não o vê.
        await prisma.lalurParteBMovement.update({ where: { id: ids.movementId }, data: { quarter: 'A00' } });
      });
      nomeiaSemId(await gerarEcfReal(dono, ecfRealBody(unitId, partnerId)), 400, "movimento da Parte B 'Hist MSG' (A00/2025)", ids.movementId, ids.parteBId);
    });
  });
});
