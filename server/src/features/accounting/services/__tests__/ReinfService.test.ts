/**
 * BE-INCR-EFD-REINF PR-1 — ReinfService com fakes (itens 1, 4, 8, 10, 11, 13; invariantes 1, 8, 9). As tabelas vêm da
 * semente REAL de `legal_parameters` (`fotografiaSemente`), a mesma que a migração carrega.
 */
import type { CompanyFiscalProfile, Prisma, ReinfBatch } from 'generated/prisma';
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

function montar(o: { perfil?: CompanyFiscalProfile | null; linhas?: WithholdingLineForReinf[]; agora?: Date; contato?: { cpf: string; phone: string | null } | null } = {}) {
  const repo = new FakeRepo();
  const state = { linhas: o.linhas ?? [linha()], perfil: o.perfil === undefined ? perfil() : o.perfil };
  const append = jest.fn();
  const svc = new ReinfService(
    repo,
    { findMadeForReinfDaPj: async () => state.linhas },
    { resumo: async () => ({ competencia: '2026-03', feitas: [{ codigoReceita: '170806', tributos: ['IRRF'], totalCents: '1500', vencimento: '2026-04-20', status: 'OPEN', competenciasSomadas: ['2026-03'], taxPayableId: 't1', linhas: 1 }], sofridas: [], avisos: [] }) },
    { findByYear: async () => state.perfil },
    { findById: async () => (o.contato === null ? null : ({ name: 'Ana Contadora', cpf: '52998224725', phone: '11987654321', email: 'ana@contab.test', ...o.contato }) as never) },
    new AccountingPolicy(),
    { append } as unknown as AuditService,
    { fotografia: async (t: readonly string[]) => fotografiaSemente(t) as never },
    { REINF_TP_AMB: '2' },
    () => o.agora ?? new Date('2026-10-26T15:00:00Z'),
  );
  return { svc, repo, state, append };
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

  it('fato só de PF/INSS e R-1000 já enviado ⇒ 422 REINF_SEM_EVENTO_GERAVEL com os avisos', async () => {
    const m = montar();
    await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-03' });
    m.state.linhas = [linha({ tributo: 'INSS', natRend: null, dataFatoGerador: '2026-04-02', competencia: '2026-04' })];
    const e = await m.svc.gerar(scope, { unitId: 'u1', competencia: '2026-04' }).catch((x: { errorCode: string; message: string }) => x);
    expect([(e as { errorCode: string }).errorCode, (e as { message: string }).message]).toEqual(['REINF_SEM_EVENTO_GERAVEL', expect.stringContaining('R2010_AINDA_NAO_GERADO')]);
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
