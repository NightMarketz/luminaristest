/**
 * BE-INCR-EFD-REINF PR-1 — ReinfService com fakes (itens 1, 4, 8, 10, 11, 13; invariantes 1, 8, 9). As tabelas vêm da
 * semente REAL de `legal_parameters` (`fotografiaSemente`), a mesma que a migração carrega.
 */
import { createHash } from 'node:crypto';
import type { CreateJobInput, UpdateJobInput } from '../../models/DataExchange.model';
import type { AccountingDataExchangeJob, CompanyFiscalProfile, InterestOnEquityAllocation, InterestOnEquityCalculation, Partner, Prisma, ProfitDistributionEvent, ReinfBatch } from 'generated/prisma';
import { AccountingPolicy } from '../../policies/AccountingPolicy';
import type { AuditService } from '../AuditService';
import { ReinfService, decidirR1000 } from '../ReinfService';
import type { CreateReinfBatchData, IReinfBatchRepository } from '../../repositories/IReinfBatchRepository';
import { WithholdingLineForReinfSchema, type WithholdingLineForReinf } from '../../dtos/WithholdingDto';
import { ReinfBatchCreatedSchema, ReinfBatchViewSchema } from '../../dtos/ReinfDto';
import { codigoReceitaDerivado } from '../../models/reinfLote';
import { conteudoSha256R1000, type ContribuinteR1000 } from '../../../../lib/reinf';
import type { AccountingScope } from '../../scope/AccountingScope';
import { fotografiaSemente } from '../../../../../test/helpers/legalParams';

const scope: AccountingScope = { ownerUserId: 'pj', actorUserId: 'pj', unitId: 'u1', ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo' };
const CNPJ_PJ = '12345678000195';
const CNPJ_A = '45997418000153';

class FakeRepo implements IReinfBatchRepository {
  rows: ReinfBatch[] = [];
  async create(d: CreateReinfBatchData): Promise<ReinfBatch> {
    const r = { id: `b${this.rows.length + 1}`, ...d, eventos: d.eventos as unknown as Prisma.JsonValue, status: 'GERADO', protocolo: null, createdAt: new Date(Date.UTC(2026, 3, 10 + this.rows.length)) };
    this.rows.unshift(r);
    return r;
  }
  async findByCompetencia(o: string, c: string) {
    return this.rows.filter((r) => r.userId === o && r.competencia === c);
  }
  async findByOwner(o: string) {
    return this.rows.filter((r) => r.userId === o);
  }
  async findById(o: string, id: string) {
    return this.rows.find((r) => r.userId === o && r.id === id) ?? null;
  }
  async runTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return fn({} as Prisma.TransactionClient);
  }
}

const perfil = (o: Partial<CompanyFiscalProfile> = {}): CompanyFiscalProfile =>
  ({ anoCalendario: 2026, regime: 'REAL', inativa: false, aporteInvestidorAnjo: null, livroCaixaSemEscrituracao: null, distribuicaoAcimaBase: null, declarante: { cnpj: CNPJ_PJ }, contadorContactId: 'ct1', reinfClassTrib: null, ...o }) as CompanyFiscalProfile;

let n = 0;
const linha = (o: Partial<WithholdingLineForReinf> = {}): WithholdingLineForReinf =>
  WithholdingLineForReinfSchema.parse({
    id: `w${++n}`, tributo: 'IRRF', event: 'RECOGNITION', dataFatoGerador: '2026-03-02', competencia: '2026-03',
    beneficiario: { counterpartyId: 'cp-a', nome: 'Fisio', taxId: CNPJ_A, kind: 'CNPJ', regime: 'PRESUMIDO' },
    natRend: '15022', codigoReceita: '170806', brutoCents: '100000', baseCents: '100000', amountCents: '1500', dispensa: null,
    titulo: { payableId: 'p1', documentNumber: 'NF-1', documentoSerie: null, issueDate: '2026-03-02' }, inss: null, pf: null,
    taxPayableId: 't1', settlementId: `s${n}`, originSettlementId: null, unitId: 'u1', ...o,
  });

const CPF_A = '52998224725';
const dividendo = (o: Partial<ProfitDistributionEvent> = {}): ProfitDistributionEvent =>
  ({ id: `d${++n}`, partnerId: 'p-a', taxId: CPF_A, dataEvento: '2026-03-10', competencia: '2026-03', brutoCents: 6_000_000n, irrfCents: 600_000n, origemLucro: 'CORRENTE', status: 'POSTED', ...o }) as ProfitDistributionEvent;
const jcpCalc = (alocacoes: Partial<InterestOnEquityAllocation>[], o: Partial<InterestOnEquityCalculation> = {}) => {
  const id = `j${++n}`;
  return {
    id,
    dataCredito: '2026-03-31',
    status: 'POSTED',
    ...o,
    alocacoes: alocacoes.map((a, i) => ({ id: `${id}-a${i}`, calculationId: id, partnerId: 'p-a', participacaoBp: 10000, brutoCents: 200_000n, irrfCents: 35_000n, liquidoCents: 165_000n, ...a })),
  } as InterestOnEquityCalculation & { alocacoes: InterestOnEquityAllocation[] };
};
const socio = (id: string, taxId: string) => ({ id, taxId, tipoPessoa: taxId.length === 14 ? 'PJ' : 'PF' }) as Partner;

function montar(o: { perfil?: CompanyFiscalProfile | null; linhas?: WithholdingLineForReinf[]; agora?: Date; contato?: { cpf: string; phone: string | null } | null } = {}) {
  const repo = new FakeRepo();
  const state = {
    linhas: o.linhas ?? [linha()],
    perfil: o.perfil === undefined ? perfil() : o.perfil,
    // PR-2 (E4): dividendos POSTED e JCP POSTED com as alocações; os sócios vivos.
    dividendos: [] as ProfitDistributionEvent[],
    jcp: [] as (InterestOnEquityCalculation & { alocacoes: InterestOnEquityAllocation[] })[],
    socios: [] as Partner[],
  };
  const append = jest.fn();
  // PR-3 (item 22): os 2 jobs de export do lote, em memória.
  const jobs: Record<string, Record<string, unknown>> = {};
  const jobsFake = {
    createJob: async (d: CreateJobInput) => ((jobs[`j${Object.keys(jobs).length + 1}`] = { id: `j${Object.keys(jobs).length + 1}`, ...d }) as unknown as AccountingDataExchangeJob),
    updateJob: async (_s: AccountingScope, id: string, d: UpdateJobInput) => Object.assign(jobs[id], d) as unknown as AccountingDataExchangeJob,
  };
  const svc = new ReinfService(
    repo,
    { findMadeForReinfDaPj: async () => state.linhas },
    { resumo: async () => ({ competencia: '2026-03', feitas: [{ codigoReceita: '170806', tributos: ['IRRF'], totalCents: '1500', vencimento: '2026-04-20', status: 'OPEN', competenciasSomadas: ['2026-03'], taxPayableId: 't1', linhas: 1 }], sofridas: [], avisos: [] }) },
    { findByYear: async () => state.perfil },
    { findById: async () => (o.contato === null ? null : ({ name: 'Ana Contadora', cpf: '52998224725', phone: '11987654321', email: 'ana@contab.test', ...o.contato }) as never) },
    new AccountingPolicy(),
    { append } as unknown as AuditService,
    { fotografia: async (t: readonly string[]) => fotografiaSemente(t) as never },
    {
      dividendos: { listDaCompetencia: async (_o, c, st) => state.dividendos.filter((d) => d.competencia === c && st.includes(d.status)) },
      jcp: {
        listDaCompetencia: async (_o, c, st) => state.jcp.filter((j) => j.dataCredito.startsWith(c) && st.includes(j.status)),
        findById: async (_o, id) => state.jcp.find((j) => j.id === id) ?? null,
      },
      socios: { list: async () => state.socios },
    },
    { jobs: jobsFake, salvar: async (_o, _u, jobId) => ({ storageKey: `k/${jobId}` }) },
    { REINF_TP_AMB: '2' },
    () => o.agora ?? new Date('2026-10-26T15:00:00Z'),
  );
  return { svc, repo, state, append, jobs };
}
const codigo = async (p: Promise<unknown>) => p.then(() => 'OK', (e: { errorCode?: string; statusCode?: number }) => `${e.statusCode} ${e.errorCode}`);

describe('ReinfService.gerar', () => {
  it('itens 10–11: lote R-1000 → R-4020 → R-4099; registro sem XML nem CNPJ; auditoria só com ids/hash/contagem (invariante 8)', async () => {
    const { svc, repo, append } = montar();
    const r = ReinfBatchCreatedSchema.parse(await svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }));
    const row = repo.rows[0];
    expect((row.eventos as { tipo: string }[]).map((e) => e.tipo)).toEqual(['R-1000', 'R-4020', 'R-4099']);
    expect([row.tpAmb, row.sha256, row.status]).toEqual([2, r.sha256, 'GERADO']);
    expect(JSON.stringify(row)).not.toContain(CNPJ_A);
    expect(JSON.stringify(row)).not.toContain('<Reinf');
    expect(r.xml).toContain('<iniValid>2026-03</iniValid>');
    expect(r.xml).toContain('<classTrib>99</classTrib><indEscrituracao>1</indEscrituracao>'); // REAL: ECD OBRIGATORIA
    expect(r.xml).toContain('<ideRespInf><nmResp>Ana Contadora</nmResp><cpfResp>52998224725</cpfResp>'); // F-REINF-12 a
    expect(r.relatorio).toMatchObject({ prazo: '2026-04-15', linhas: [{ beneficiario: '**.***.***/0001-**', codigoReceita: '170806', vencimentoDarf: '2026-04-20' }] });
    expect(append.mock.calls[0][2]).toMatchObject({ eventType: 'tax.reinf_batch.generated', payload: { batchId: row.id, competencia: '2026-03', sha256: r.sha256, contagemPorTipo: '{"R-1000":1,"R-4020":1,"R-4099":1}' } });
  });

  it('item 8: competência sem retenção ⇒ 422 REINF_SEM_FATO — perfil SIMPLES não é recusado antes (difere do X9 D10)', async () => {
    const { svc } = montar({ linhas: [], perfil: perfil({ regime: 'SIMPLES' }) });
    expect(await codigo(svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('422 REINF_SEM_FATO');
  });

  it('item 11: competência maior que o mês corrente ⇒ 400', async () => {
    const { svc } = montar({ agora: new Date('2026-03-31T12:00:00Z') });
    expect(await codigo(svc.gerar(scope, { unitId: 'u1', competencia: '2026-04' }))).toBe('400 REINF_COMPETENCIA_FUTURA');
    // 2026-04-01 01:00 UTC ainda é 31/03 em São Paulo.
    expect(await codigo(montar({ agora: new Date('2026-04-01T01:00:00Z') }).svc.gerar(scope, { unitId: 'u1', competencia: '2026-04' }))).toBe('400 REINF_COMPETENCIA_FUTURA');
  });

  it('item 4: classTrib — MEI 04; Simples lê o perfil; Simples sem o campo ⇒ 400 REINF_CLASSTRIB_PENDENTE (lacuna B)', async () => {
    const mei = await montar({ perfil: perfil({ regime: 'MEI' }) }).svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(mei.xml).toContain('<classTrib>04</classTrib>');
    const semCampo = montar({ perfil: perfil({ regime: 'SIMPLES', aporteInvestidorAnjo: false }) });
    expect(await codigo(semCampo.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('400 REINF_CLASSTRIB_PENDENTE');
    const comCampo = await montar({ perfil: perfil({ regime: 'SIMPLES', aporteInvestidorAnjo: false, reinfClassTrib: '02' }) }).svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(comCampo.xml).toContain('<classTrib>02</classTrib><indEscrituracao>0</indEscrituracao>'); // Simples: ECD FACULTATIVA
  });

  it('item 4 (lacuna C): ECD CONDICIONAL sem resposta ⇒ 400 REINF_ECD_INDEFINIDA', async () => {
    const { svc } = montar({ perfil: perfil({ regime: 'SIMPLES', reinfClassTrib: '01', aporteInvestidorAnjo: null }) });
    expect(await codigo(svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('400 REINF_ECD_INDEFINIDA');
  });

  it('item 4: sem contato com CPF ⇒ 400 REINF_SEM_CONTATO; sem CNPJ do declarante ⇒ 400; sem perfil ⇒ 400', async () => {
    expect(await codigo(montar({ contato: null }).svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('400 REINF_SEM_CONTATO');
    expect(await codigo(montar({ perfil: perfil({ declarante: null }) }).svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('400 REINF_SEM_CNPJ_DECLARANTE');
    expect(await codigo(montar({ perfil: null }).svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('400 VALIDATION_ERROR');
  });

  it('fato só de PF por serviço (item 19) ou dividendo a PJ (lacuna A do PR-2) e R-1000 já enviado ⇒ 422 REINF_SEM_EVENTO_GERAVEL com os avisos', async () => {
    const m = montar();
    await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    m.state.linhas = [linha({ dataFatoGerador: '2026-04-02', competencia: '2026-04', beneficiario: { counterpartyId: 'pf', nome: 'Autônomo', taxId: CPF_A, kind: 'CPF', regime: 'PF' } })];
    m.state.dividendos = [dividendo({ taxId: CNPJ_A, competencia: '2026-04', dataEvento: '2026-04-10' })];
    const e = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-04' }).catch((x: { errorCode: string; message: string }) => x);
    expect([(e as { errorCode: string }).errorCode, (e as { message: string }).message]).toEqual([
      'REINF_SEM_EVENTO_GERAVEL',
      expect.stringMatching(/PF_SERVICO_FORA_DA_REINF.*DIVIDENDO_PJ_FORA_DA_REINF/),
    ]);
  });

  it('itens 13 e invariante 9: estorno depois do lote ⇒ defasado; o próximo relatório pede RETIFICAR o evento', async () => {
    const m = montar();
    const l2 = linha();
    m.state.linhas = [linha(), l2];
    await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect((await m.svc.list(scope, { unitId: 'u1', competencia: '2026-03' })).map((v) => v.defasado)).toEqual([false]);
    m.state.linhas = m.state.linhas.filter((x) => x.id !== l2.id); // estornada: sai da porta (só ACTIVE)
    const [v] = await m.svc.list(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(ReinfBatchViewSchema.parse(v)).toMatchObject({ defasado: true, prazo: '2026-04-15' });
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r.relatorio.marcacoes).toEqual([{ batchId: v.id, idEvento: v.eventos[1].idEvento, tipo: 'R-4020', acao: 'RETIFICAR' }]);
    expect(await m.svc.get(scope, v.id)).toMatchObject({ id: v.id, defasado: true });
    expect(await codigo(m.svc.get(scope, 'nao-existe'))).toBe('404 NOT_FOUND');
  });
});

describe('ReinfService.gerar — PR-2 (itens 15–18)', () => {
  const tipos = (repo: FakeRepo) => (repo.rows[0].eventos as { tipo: string }[]).map((e) => e.tipo);

  it('item 8: só dividendo POSTED já é fato; lote R-1000 → R-4010 → R-4099; registro sem CPF; relatório mascarado', async () => {
    const m = montar({ linhas: [] });
    m.state.dividendos = [dividendo(), dividendo({ status: 'CANCELLED', id: 'd-canc' })];
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(tipos(m.repo)).toEqual(['R-1000', 'R-4010', 'R-4099']);
    expect(JSON.stringify(m.repo.rows[0])).not.toContain(CPF_A);
    expect((m.repo.rows[0].eventos as { origemIds: string[]; beneficiarioRef?: string }[])[1]).toMatchObject({ beneficiarioRef: 'p-a', origemIds: [expect.stringMatching(/^d\d+$/)] });
    expect(r.xml).not.toContain('d-canc');
    expect(r.relatorio.linhas).toEqual([expect.objectContaining({ evento: 'R-4010', beneficiario: '***.982.247-**', natRend: '12001', codigoReceita: '184101', retidoCents: '600000' })]);
    expect(r.relatorio.csv.split('\n')[1]).toBe('R-4010;***.982.247-**;12001;2026-03-10;IRRF;6000000;6000000;600000;184101;;2026-04-15');
  });

  it('itens 17–18: INSS ⇒ R-2010 + R-2099 (sem R-4099); lote completo na ordem R-1000 → R-2010 → R-4010 → R-4020 → R-2099 → R-4099', async () => {
    const inss = linha({ tributo: 'INSS', natRend: null, codigoReceita: '116201', amountCents: '11000', titulo: { payableId: 'p9', documentNumber: '77', documentoSerie: '1', issueDate: '2026-03-05' }, inss: { tpServico: '100000001', cprb: false } });
    const soInss = montar({ linhas: [inss] });
    await soInss.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(tipos(soInss.repo)).toEqual(['R-1000', 'R-2010', 'R-2099']);

    const m = montar({ linhas: [linha(), inss] });
    m.state.dividendos = [dividendo()];
    m.state.jcp = [jcpCalc([{ partnerId: 'p-pj', brutoCents: 100_000n, irrfCents: 15_000n }])];
    m.state.socios = [socio('p-a', CPF_A), socio('p-pj', CNPJ_A)];
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(tipos(m.repo)).toEqual(['R-1000', 'R-2010', 'R-4010', 'R-4020', 'R-2099', 'R-4099']);
    // JCP a sócio PJ de mesmo CNPJ do fornecedor ⇒ um só R-4020 com as naturezas 12016 e 15022 (invariante 6)
    expect(r.xml.match(/<natRend>(1[25]0\d\d)<\/natRend>/g)).toEqual(['<natRend>12001</natRend>', '<natRend>12016</natRend>', '<natRend>15022</natRend>']);
    expect(r.relatorio.linhas.map((x) => x.evento)).toEqual(['R-2010', 'R-4010', 'R-4020', 'R-4020']);
    expect(r.relatorio.totaisPorCodigo).toEqual(expect.arrayContaining([{ codigoReceita: '116201', totalCents: '11000' }, { codigoReceita: '570602', totalCents: '15000' }]));
  });

  it('item 13: dividendo cancelado depois do lote ⇒ defasado; o próximo relatório pede RETIFICAR o R-4010', async () => {
    const m = montar({ linhas: [] });
    const d = dividendo();
    m.state.dividendos = [d, dividendo({ partnerId: 'p-b', taxId: '11144477735' })];
    await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect((await m.svc.list(scope, { unitId: 'u1', competencia: '2026-03' }))[0].defasado).toBe(false);
    d.status = 'CANCELLED';
    const [v] = await m.svc.list(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(v.defasado).toBe(true);
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r.relatorio.marcacoes).toEqual([{ batchId: v.id, idEvento: expect.any(String), tipo: 'R-4010', acao: 'RETIFICAR' }]);
  });

  it('JCP de sócio removido do cadastro ⇒ 400 REINF_SOCIO_REMOVIDO', async () => {
    const m = montar({ linhas: [] });
    m.state.jcp = [jcpCalc([{ partnerId: 'p-sumiu' }])];
    expect(await codigo(m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' }))).toBe('400 REINF_SOCIO_REMOVIDO');
  });
});

describe('decidirR1000 (lacuna D, pacote A)', () => {
  const c: ContribuinteR1000 = { cnpjRaiz: '12345678', classTrib: '99', indEscrituracao: 1, contato: { nome: 'Ana', cpf: '52998224725' } };
  const lote = (competencia: string, conteudoSha256?: string) =>
    ({ competencia, eventos: conteudoSha256 ? [{ tipo: 'R-1000', idEvento: 'x', sha256: 'y', origemIds: [], conteudoSha256 }] : [] }) as unknown as ReinfBatch;
  it('sem lote de competência anterior ⇒ inclusão (mesmo regenerando a primeira)', () => {
    expect(decidirR1000(c, '2026-03', [])).toBe('inclusao');
    expect(decidirR1000(c, '2026-03', [lote('2026-03', conteudoSha256R1000(c)), lote('2026-05')])).toBe('inclusao');
  });
  it('cadastro igual ao último R-1000 ⇒ nenhum; diferente ⇒ alteração', () => {
    expect(decidirR1000(c, '2026-04', [lote('2026-03', conteudoSha256R1000(c))])).toBeNull();
    expect(decidirR1000({ ...c, contato: { ...c.contato, email: 'novo@x.test' } }, '2026-04', [lote('2026-03', conteudoSha256R1000(c))])).toBe('alteracao');
  });
});

describe('item 1: códigos de receita contra as tabelas do RETENCOES-FONTE (fotografia da semente)', () => {
  const t = fotografiaSemente(['NATUREZA_RENDIMENTO', 'RETENCAO_CODIGO', 'RETENCAO']);
  const cod = (tributo: WithholdingLineForReinf['tributo'], natRend: string, data: string, kind: 'CPF' | 'CNPJ' = 'CNPJ') => codigoReceitaDerivado(t, { tributo, natRend, dataFatoGerador: data }, kind);
  it('15022 × IRRF = 170806, × CSRF (AGREGADO) = 595207; 15052 só IRRF 804506; 12016 = 570602; 12001 em 2026-03 = 184101', () => {
    expect([cod('IRRF', '15022', '2026-03-02'), cod('COFINS', '15022', '2026-03-02'), cod('IRRF', '15052', '2026-03-02'), cod('CSLL', '15052', '2026-03-02')]).toEqual(['170806', '595207', '804506', null]);
    expect([cod('IRRF', '12016', '2026-03-02'), cod('IRRF', '12001', '2026-03-02', 'CPF')]).toEqual(['570602', '184101']);
  });
});

describe('ReinfService — PR-3 (itens 21–23)', () => {
  const CPF_B = '11144477735';
  const transicao = (o: Partial<ProfitDistributionEvent> = {}) => dividendo({ partnerId: 'p-b', taxId: CPF_B, brutoCents: 3_000_000n, irrfCents: 0n, origemLucro: 'TRANSICAO', ...o });

  it('item 21: R-4010 só de isenção 12 ⇒ prazo trimestral (2026-T1 ⇒ 2026-05-15) no evento, na linha, no CSV e no lote', async () => {
    const m = montar({ linhas: [] });
    m.state.dividendos = [transicao()];
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect((m.repo.rows[0].eventos as { tipo: string; prazo?: string }[]).map((e) => [e.tipo, e.prazo])).toEqual([['R-1000', undefined], ['R-4010', '2026-05-15'], ['R-4099', undefined]]);
    expect([r.relatorio.prazo, r.relatorio.linhas.map((l) => l.prazoReinf)]).toEqual(['2026-05-15', ['2026-05-15']]);
    expect(r.relatorio.csv.split('\n')[1].endsWith(';2026-05-15')).toBe(true);
    expect((await m.svc.list(scope, { unitId: 'u1', competencia: '2026-03' }))[0].prazo).toBe('2026-05-15');
  });

  it('item 21 (lacuna B): ≤ R$ 50 mil sem retenção e transição + corrente no mesmo CPF ficam no mensal; o lote leva o mais cedo', async () => {
    const m = montar({ linhas: [] });
    m.state.dividendos = [transicao(), dividendo({ brutoCents: 4_000_000n, irrfCents: 0n })];
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r.relatorio.linhas.map((l) => [l.beneficiario, l.prazoReinf])).toEqual([['***.444.777-**', '2026-05-15'], ['***.982.247-**', '2026-04-15']]);
    expect(r.relatorio.prazo).toBe('2026-04-15');

    const mesmoCpf = montar({ linhas: [] });
    mesmoCpf.state.dividendos = [transicao({ partnerId: 'p-a', taxId: CPF_A }), dividendo({ brutoCents: 1_000_000n, irrfCents: 0n })];
    const r2 = await mesmoCpf.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r2.relatorio.linhas.map((l) => l.prazoReinf)).toEqual(['2026-04-15', '2026-04-15']);
  });

  it('item 22: 2 jobs EXPORTED (XML com o sha256 do lote; CSV do relatório) no mês da competência, com auditoria de export', async () => {
    const m = montar();
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    const xml = m.jobs[r.exportJobIds.xml];
    const csv = m.jobs[r.exportJobIds.relatorio];
    expect(xml).toMatchObject({ kind: 'EXPORT_REINF', status: 'EXPORTED', sha256: r.sha256, storageKey: `k/${r.exportJobIds.xml}`, mimeType: 'application/xml', unitId: 'u1', userId: 'pj' });
    expect([xml.periodStart, xml.periodEnd]).toEqual([new Date('2026-03-01T00:00:00Z'), new Date('2026-03-31T00:00:00Z')]);
    expect(csv).toMatchObject({ kind: 'EXPORT_REINF_RELATORIO', status: 'EXPORTED', mimeType: 'text/csv', totalRows: r.relatorio.linhas.length });
    expect(csv.sha256).toBe(createHash('sha256').update(Buffer.from(r.relatorio.csv, 'utf8')).digest('hex'));
    expect(m.append.mock.calls.map((c) => (c[2] as { eventType: string }).eventType)).toEqual(['tax.reinf_batch.generated', 'data_exchange.export_generated', 'data_exchange.export_generated']);
  });

  it('item 22: disco falhou ⇒ job FAILED, erro sobe e nenhum lote é gravado', async () => {
    const m = montar();
    (m.svc as unknown as { artefatos: { salvar: () => Promise<never> } }).artefatos.salvar = async () => {
      throw new Error('EIO');
    };
    await expect(m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' })).rejects.toThrow('EIO');
    expect([Object.values(m.jobs).map((j) => j.status), m.repo.rows.length]).toEqual([['FAILED'], 0]);
  });

  it('item 23: NATUREZA_NAO_CONFERIDA com as naturezas do R-4020 de retenção; lote só de dividendos não traz o aviso', async () => {
    const m = montar({ linhas: [linha(), linha({ natRend: '15052', codigoReceita: '804506' })] });
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r.relatorio.avisos).toEqual([{ codigo: 'NATUREZA_NAO_CONFERIDA', quantidade: 2, detalhe: expect.stringContaining('15022, 15052') }]);
    const so = montar({ linhas: [] });
    so.state.dividendos = [dividendo()];
    expect((await so.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' })).relatorio.avisos).toEqual([]);
  });

  it('item 23: origem estornada ⇒ DEFASADO_RETIFICAR; lote anterior TRANSMITIDO ⇒ também REABRIR_ANTES (L4)', async () => {
    const m = montar({ linhas: [] });
    const d = dividendo();
    m.state.dividendos = [d, dividendo({ partnerId: 'p-b', taxId: CPF_B })];
    await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    d.status = 'CANCELLED';
    const r = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r.relatorio.avisos.map((a) => [a.codigo, a.quantidade])).toEqual([['DEFASADO_RETIFICAR', 1]]);

    const t = montar({ linhas: [] });
    const d2 = dividendo();
    t.state.dividendos = [d2, dividendo({ partnerId: 'p-b', taxId: CPF_B })];
    await t.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    t.repo.rows[0].status = 'TRANSMITIDO';
    d2.status = 'CANCELLED';
    const r2 = await t.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    expect(r2.relatorio.avisos.map((a) => [a.codigo, a.quantidade])).toEqual([['DEFASADO_RETIFICAR', 1], ['REABRIR_ANTES', 1]]);
  });
});
