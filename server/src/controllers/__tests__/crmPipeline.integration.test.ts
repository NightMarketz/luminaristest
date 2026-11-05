/**
 * FIX-TESTES item 3 — BRIEF `docs/crm/FIX-TESTES-CRM-PIPELINE-PILHA-REAL-brief.md` (PR #1075): as 7 rotas do pipeline do
 * CRM pela HTTP (`makeApp` + `authHeader`), com os repositórios reais sobre o `test-integration.db`. O unit
 * (`CrmPipelineService.test.ts`) prova a regra contando chamadas; aqui cada escrita é relida do banco.
 *
 * Cenário (item 1, A4): o tenant nasce pelo caminho normal — `POST /api/dashboard/create` com a suíte `crmModule`
 * (CRM-0 + CRM-1 + CRM-2A/2B + CRM-3); a unidade semeia o pipeline e as 6 etapas (`LeadsSeedOnUnitPlugin`). As linhas
 * entram por `POST /api/dynamic-tables/:id/data`. Cada `describe` tem o seu tenant, para nenhum caso depender da ordem.
 *
 * F-CRM-1 (a): a falha da 2ª escrita do `advance` vem de estado real do banco — o campo `latestProposalAmount` da
 * tabela de leads do tenant ganha `validation.maxValue` (validação que o usuário configura), então a proposta passa e
 * o update do lead reprova dentro da mesma tx. Sem dublê.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();

type Actor = { id: string; username: string; role: string };
type Row = { id: string; dynamicTableId: string; data: Record<string, unknown>; deletedAt: Date | null };

/** Data de referência literal (A8) para os campos de agenda. */
const PROXIMA_ACAO = '2026-11-10T13:00:00.000Z';
const REAGENDADO = '2026-11-12T15:30:00.000Z';

let n = 0;
async function novoUsuario(): Promise<Actor> {
  n += 1;
  const u = await prisma.user.create({
    data: { name: `crmpipe-${n}`, username: `crmpipe-user-${n}`, email: `crmpipe-${n}@test.local`, password: 'x', role: 'USER' },
  });
  return { id: u.id, username: u.username, role: u.role };
}

const tabela = async (userId: string, internalName: string) => {
  const t = await prisma.dynamicTable.findFirst({ where: { userId, internalName } });
  if (!t) throw new Error(`tabela ${internalName} ausente no tenant`);
  return t;
};
const linhas = async (tableId: string): Promise<Row[]> =>
  (await prisma.dynamicTableData.findMany({ where: { dynamicTableId: tableId, deletedAt: null }, orderBy: { id: 'asc' } })) as unknown as Row[];
const linha = async (id: string): Promise<Row> =>
  (await prisma.dynamicTableData.findUniqueOrThrow({ where: { id } })) as unknown as Row;

/** Todo cuid que aparece no corpo tem de ser um dos ids que o próprio cliente mandou (F-MSG-1 a / F-CRM-2). */
function idsAlheios(body: unknown, enviados: string[]): string[] {
  const achados = JSON.stringify(body).match(/\bc[a-z0-9]{24}\b/g) ?? [];
  return achados.filter((id) => !enviados.includes(id));
}

interface Cenario {
  user: Actor;
  unitId: string;
  pipelineId: string;
  stages: Record<'init' | 'meeting' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost', string>;
  t: { leads: string; leadProposals: string; leadActivities: string; crmAccounts: string; crmContacts: string; crmOpportunities: string };
  leadAberto: string;
  leadConvertido: string;
  oportunidade: string;
}

const criarLinha = async (user: Actor, tableId: string, data: Record<string, unknown>) => {
  const r = await request(app).post(`/api/dynamic-tables/${tableId}/data`).set(authHeader(user as never)).send({ data });
  if (r.status !== 201) throw new Error(`create em ${tableId} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data.id as string;
};

/** Item 1 (A4): tenant pelo caminho normal + 1 lead na 1ª etapa, 1 lead já Converted e 1 oportunidade aberta. */
async function montarCenario(): Promise<Cenario> {
  const user = await novoUsuario();
  const criado = await request(app)
    .post('/api/dashboard/create')
    .set(authHeader(user as never))
    .send({ suiteKey: 'crmModule', unit: { name: 'Matriz' } });
  expect(criado.status).toBe(201);
  expect(criado.body.data.modules.installed).toEqual(expect.arrayContaining(['CRM-0', 'CRM-1', 'CRM-2A', 'CRM-2B', 'CRM-3']));

  const t = {
    leads: (await tabela(user.id, 'leads')).id,
    leadProposals: (await tabela(user.id, 'leadProposals')).id,
    leadActivities: (await tabela(user.id, 'leadActivities')).id,
    crmAccounts: (await tabela(user.id, 'crmAccounts')).id,
    crmContacts: (await tabela(user.id, 'crmContacts')).id,
    crmOpportunities: (await tabela(user.id, 'crmOpportunities')).id,
  };
  const [unit] = await linhas((await tabela(user.id, 'units')).id);
  const [pipeline] = await linhas((await tabela(user.id, 'leadPipelines')).id);
  const stageRows = await linhas((await tabela(user.id, 'leadStages')).id);
  const stages = Object.fromEntries(stageRows.map((s) => [String(s.data.type), s.id])) as Cenario['stages'];
  expect(Object.keys(stages).sort()).toEqual(['closed_lost', 'closed_won', 'init', 'meeting', 'negotiation', 'proposal']);

  const base = { unitId: unit.id, pipelineId: pipeline.id };
  const leadAberto = await criarLinha(user, t.leads, {
    ...base, stageId: stages.init, leadName: 'Ana Souza', email: 'ana@cliente.test', phone: '11999990000',
    status: 'Open', nextActionAt: PROXIMA_ACAO,
  });
  const leadConvertido = await criarLinha(user, t.leads, {
    ...base, stageId: stages.meeting, leadName: 'Bruno Lima', status: 'Converted',
  });
  const oportunidade = await criarLinha(user, t.crmOpportunities, {
    ...base, stageId: stages.init, name: 'Contrato anual', amount: 1500, currency: 'BRL', status: 'Open',
  });
  return { user, unitId: unit.id, pipelineId: pipeline.id, stages, t, leadAberto, leadConvertido, oportunidade };
}

const post = (user: Actor, path: string, body: Record<string, unknown>) =>
  request(app).post(`/api/crm/pipeline/${path}`).set(authHeader(user as never)).send(body);

describe('CRM pipeline pela pilha real (FIX-TESTES item 3)', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('advance / proposal / no-show', () => {
    let c: Cenario;
    beforeAll(async () => {
      c = await montarCenario();
    }, 60000);

    it('item 2: advance para a etapa de proposta → 200; o lead relido está na etapa nova e a proposta existe', async () => {
      // O motor só deixa avançar uma etapa por vez: Sem Contato → Reunião Agendada → Proposta Enviada.
      const reuniao = await post(c.user, 'advance', { leadId: c.leadAberto, stageId: c.stages.meeting, meetingAt: PROXIMA_ACAO });
      expect(reuniao.status).toBe(200);
      expect((await linha(c.leadAberto)).data).toMatchObject({ stageId: c.stages.meeting, nextActionAt: PROXIMA_ACAO });
      expect(await linhas(c.t.leadProposals)).toHaveLength(0);

      const r = await post(c.user, 'advance', {
        leadId: c.leadAberto, stageId: c.stages.proposal, amount: 2500, currency: 'BRL', winProbability: 40,
      });
      expect(r.status).toBe(200);

      const lead = await linha(c.leadAberto);
      expect(lead.data).toMatchObject({
        stageId: c.stages.proposal, latestProposalAmount: 2500, latestProposalCurrency: 'BRL', latestProposalWinProbability: 40,
      });
      const propostas = await linhas(c.t.leadProposals);
      expect(propostas).toHaveLength(1);
      expect(propostas[0].data).toMatchObject({ leadId: c.leadAberto, amount: 2500, currency: 'BRL', winProbability: 40, status: 'Sent' });
    });

    it('item 3 (F-CRM-1 a): a 2ª escrita reprova pelo estado do banco → nem a proposta nem a etapa do lead mudam', async () => {
      // Estado real: a tabela de leads do tenant limita o snapshot da proposta a 1000; a de propostas não tem teto.
      const leads = await prisma.dynamicTable.findUniqueOrThrow({ where: { id: c.t.leads } });
      const schema = leads.schema as unknown as { fields: Array<{ name: string; validation?: Record<string, unknown> }> };
      const campo = schema.fields.find((f) => f.name === 'latestProposalAmount')!;
      campo.validation = { ...(campo.validation ?? {}), maxValue: 1000 };
      await prisma.dynamicTable.update({ where: { id: c.t.leads }, data: { schema: schema as never } });

      // Lead novo na etapa anterior à proposta (a transição em si é válida), sem proposta.
      const leadId = await criarLinha(c.user, c.t.leads, {
        unitId: c.unitId, pipelineId: c.pipelineId, stageId: c.stages.meeting, leadName: 'Carla Dias', status: 'Open',
      });
      const propostasAntes = (await linhas(c.t.leadProposals)).length;

      const r = await post(c.user, 'advance', { leadId, stageId: c.stages.proposal, amount: 5000, currency: 'BRL' });
      // A recusa é do teto do snapshot (2ª escrita), não da regra de transição.
      expect(r.status).toBe(400);
      expect(JSON.stringify(r.body)).toContain('latestProposalAmount');
      expect(JSON.stringify(r.body)).not.toContain('Só pode avançar');

      expect((await linhas(c.t.leadProposals)).length).toBe(propostasAntes);
      expect((await linhas(c.t.leadProposals)).some((p) => p.data.leadId === leadId)).toBe(false);
      const lead = await linha(leadId);
      expect(lead.data.stageId).toBe(c.stages.meeting);
      expect(lead.data.latestProposalAmount).toBeUndefined();

      // Desfaz o estado para os casos seguintes do bloco.
      delete campo.validation!.maxValue;
      await prisma.dynamicTable.update({ where: { id: c.t.leads }, data: { schema: schema as never } });
    });

    it('item 4: proposal → 201; a proposta relida e o snapshot do lead atualizado', async () => {
      const r = await post(c.user, 'proposal', {
        leadId: c.leadAberto, amount: 3200, currency: 'USD', winProbability: 70, estimatedCloseDate: '2026-12-15',
      });
      expect(r.status).toBe(201);

      const proposta = await linha(r.body.data.id);
      expect(proposta.dynamicTableId).toBe(c.t.leadProposals);
      expect(proposta.data).toMatchObject({ leadId: c.leadAberto, amount: 3200, currency: 'USD', winProbability: 70, status: 'Draft' });
      const lead = await linha(c.leadAberto);
      // O motor grava o campo `date` como ISO UTC (meia-noite); o dia escrito é o que importa.
      expect(String(lead.data.latestProposalEtaClose).slice(0, 10)).toBe('2026-12-15');
      expect(lead.data).toMatchObject({
        latestProposalAmount: 3200, latestProposalCurrency: 'USD', latestProposalWinProbability: 70,
      });
    });

    it('item 5a: no-show com reschedule → nextActionAt relido e atividade registrada', async () => {
      const r = await post(c.user, 'no-show', { leadId: c.leadAberto, option: 'reschedule', rescheduleAt: REAGENDADO });
      expect(r.status).toBe(200);

      expect((await linha(c.leadAberto)).data.nextActionAt).toBe(REAGENDADO);
      // Os plugins do lead também registram atividade ("Lead criado", "Proposta criada"); conta só as de no-show.
      const noShows = (await linhas(c.t.leadActivities)).filter((a) => a.data.leadId === c.leadAberto && a.data.type === 'meeting_no_show');
      expect(noShows).toHaveLength(1);
      expect(noShows[0].data).toMatchObject({ message: 'No-show — meeting rescheduled', payload: { when: REAGENDADO } });
    });

    it('item 5b: no-show com revert → stageId volta à etapa anterior e a atividade registra o revert', async () => {
      // O LeadsPlugin só aceita voltar uma etapa a partir da reunião (o caso do no-show): Reunião → Sem Contato.
      const leadId = await criarLinha(c.user, c.t.leads, {
        unitId: c.unitId, pipelineId: c.pipelineId, stageId: c.stages.meeting, leadName: 'Fábio Reis', status: 'Open',
      });
      const r = await post(c.user, 'no-show', { leadId, option: 'revert', previousStageId: c.stages.init });
      expect(r.status).toBe(200);

      expect((await linha(leadId)).data.stageId).toBe(c.stages.init);
      const noShows = (await linhas(c.t.leadActivities)).filter((a) => a.data.leadId === leadId && a.data.type === 'meeting_no_show');
      // O LeadsPlugin (:241) também grava 'Não compareceu à reunião' com o mesmo tipo nessa transição; o BRIEF não fixa a
      // contagem, então aqui só a atividade do serviço é exigida (a duplicata está no relatório do PR, achado a ratificar).
      expect(noShows.map((a) => a.data.message)).toContain('No-show — stage reverted');
    });
  });

  describe('convert-lead', () => {
    let c: Cenario;
    beforeAll(async () => {
      c = await montarCenario();
    }, 60000);

    it('item 6: convert-lead → 201; account, contact (accountId + leadId) e o lead Converted relidos', async () => {
      const r = await post(c.user, 'convert-lead', { leadId: c.leadAberto, account: { name: 'Souza Estética', city: 'São Paulo' } });
      expect(r.status).toBe(201);

      const contas = await linhas(c.t.crmAccounts);
      expect(contas).toHaveLength(1);
      expect(contas[0].data).toMatchObject({ name: 'Souza Estética', city: 'São Paulo', unitId: c.unitId });
      const contatos = await linhas(c.t.crmContacts);
      expect(contatos).toHaveLength(1);
      expect(contatos[0].data).toMatchObject({
        name: 'Ana Souza', email: 'ana@cliente.test', phone: '11999990000', accountId: contas[0].id, leadId: c.leadAberto, unitId: c.unitId,
      });
      const lead = await linha(c.leadAberto);
      expect(lead.data).toMatchObject({ status: 'Converted', accountId: contas[0].id, contactId: contatos[0].id });
      expect(typeof lead.data.convertedAt).toBe('string');
    });

    it('item 7: lead já Converted → 400 e as contagens de accounts e contacts não mudam', async () => {
      const contasAntes = (await linhas(c.t.crmAccounts)).length;
      const contatosAntes = (await linhas(c.t.crmContacts)).length;

      const r = await post(c.user, 'convert-lead', { leadId: c.leadConvertido, account: { name: 'Lima Ltda' } });
      expect(r.status).toBe(400);
      expect(r.body).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Lead already converted' });

      expect((await linhas(c.t.crmAccounts)).length).toBe(contasAntes);
      expect((await linhas(c.t.crmContacts)).length).toBe(contatosAntes);
    });
  });

  describe('oportunidades', () => {
    let c: Cenario;
    beforeAll(async () => {
      c = await montarCenario();
      // O fechamento grava `closedAt = agora`; a ponte CRM→AR exige período aberto no mês dele (fuso do escopo).
      const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      await prisma.accountingPeriod.create({
        data: {
          userId: c.user.id, unitId: c.unitId, year: agora.getFullYear(), month: agora.getMonth() + 1,
          status: 'OPEN', openedAt: new Date(), openedById: c.user.id,
        },
      });
      for (const [code, nature] of [['3.1', 'Revenue'], ['1.1.5', 'Asset']] as const) {
        await prisma.account.create({ data: { userId: c.user.id, unitId: c.unitId, code, name: `Conta ${code}`, nature, acceptsEntries: true } });
      }
    }, 60000);

    const receivablesDa = (opportunityId: string) =>
      prisma.receivable.findMany({ where: { documentNumber: `CRM-${opportunityId}`, deletedAt: null } });

    it('item 8: advance-opportunity para Won → 200; o título a receber existe uma vez, e o 2º Won não cria outro', async () => {
      const r = await post(c.user, 'advance-opportunity', { opportunityId: c.oportunidade, stageId: c.stages.closed_won });
      expect(r.status).toBe(200);

      const opp = await linha(c.oportunidade);
      expect(opp.data).toMatchObject({ status: 'Won', stageId: c.stages.closed_won });
      expect(typeof opp.data.closedAt).toBe('string');
      const titulos = await receivablesDa(c.oportunidade);
      expect(titulos).toHaveLength(1);
      expect(titulos[0]).toMatchObject({ unitId: c.unitId, amountCents: BigInt(150000), customerName: 'Contrato anual' });

      const again = await post(c.user, 'advance-opportunity', { opportunityId: c.oportunidade, stageId: c.stages.closed_won });
      expect(again.status).toBe(400);
      expect(await receivablesDa(c.oportunidade)).toHaveLength(1);
    });

    it('item 9: convert-lead-to-opportunity → 201; a oportunidade relida aponta o lead de origem e a 1ª etapa', async () => {
      const r = await post(c.user, 'convert-lead-to-opportunity', {
        leadId: c.leadAberto, name: 'Pacote facial', pipelineId: c.pipelineId, amount: 800,
      });
      expect(r.status).toBe(201);

      const opp = await linha(r.body.data.id);
      expect(opp.dynamicTableId).toBe(c.t.crmOpportunities);
      expect(opp.data).toMatchObject({
        leadId: c.leadAberto, unitId: c.unitId, pipelineId: c.pipelineId, stageId: c.stages.init,
        name: 'Pacote facial', amount: 800, currency: 'BRL', status: 'Open',
      });
      // O lead não é consumido.
      expect((await linha(c.leadAberto)).data.status).toBe('Open');
    });
  });

  describe('item 10: uma falta por vez (A3)', () => {
    let c: Cenario;
    beforeAll(async () => {
      c = await montarCenario();
    }, 60000);

    it('sem CRM-0 instalado → 409 CRM_MODULE_NOT_INSTALLED com moduleKey CRM-0', async () => {
      const u = await novoUsuario();
      const criado = await request(app)
        .post('/api/dashboard/create')
        .set(authHeader(u as never))
        .send({
          mode: 'custom', presetKey: 'beautySalon', unit: { name: 'M' },
          removedTables: ['leadPipelines', 'leadStages', 'leads', 'leadActivities', 'leadProposals', 'campaigns'],
        });
      expect(criado.status).toBe(201);

      const r = await post(u, 'advance', { leadId: c.leadAberto, stageId: c.stages.proposal });
      expect(r.status).toBe(409);
      expect(r.body).toMatchObject({ code: 'CRM_MODULE_NOT_INSTALLED', details: { moduleKey: 'CRM-0' } });
      expect(idsAlheios(r.body, [c.leadAberto, c.stages.proposal])).toEqual([]);
      expect((await linha(c.leadAberto)).data.stageId).toBe(c.stages.init);
    });

    it('lead de outro dono → 404, sem escrita no lead nem nas propostas', async () => {
      const outro = await montarCenario();
      const propostasAntes = (await linhas(c.t.leadProposals)).length;

      const r = await post(outro.user, 'advance', { leadId: c.leadAberto, stageId: outro.stages.proposal, amount: 900 });
      expect(r.status).toBe(404);
      expect(r.body.code).toBe('NOT_FOUND');
      expect(idsAlheios(r.body, [c.leadAberto, outro.stages.proposal])).toEqual([]);

      const lead = await linha(c.leadAberto);
      expect(lead.data.stageId).toBe(c.stages.init);
      expect(lead.data.latestProposalAmount).toBeUndefined();
      expect((await linhas(c.t.leadProposals)).length).toBe(propostasAntes);
      expect(await linhas(outro.t.leadProposals)).toHaveLength(0);
    });

    it('etapa inexistente → 404, lead intocado', async () => {
      const etapa = 'cetapainexistente00000000';
      const r = await post(c.user, 'advance', { leadId: c.leadAberto, stageId: etapa });
      expect(r.status).toBe(404);
      expect(r.body.code).toBe('NOT_FOUND');
      expect(idsAlheios(r.body, [c.leadAberto, etapa])).toEqual([]);
      expect((await linha(c.leadAberto)).data.stageId).toBe(c.stages.init);
    });
  });

  describe('item 11: pipeline-analytics contra valores fixos', () => {
    it('contagem por etapa e cartões de valor batem com o cenário montado', async () => {
      const c = await montarCenario();
      const base = { unitId: c.unitId, pipelineId: c.pipelineId };
      // Cenário do item 1 (leadAberto em init, leadConvertido em meeting, oportunidade Open 1500) + o que o funil precisa.
      await criarLinha(c.user, c.t.leads, { ...base, stageId: c.stages.init, leadName: 'Davi Rocha', status: 'Open' });
      await criarLinha(c.user, c.t.leads, {
        ...base, stageId: c.stages.proposal, leadName: 'Eva Prado', status: 'Open',
        latestProposalAmount: 1000, latestProposalWinProbability: 50,
      });
      await criarLinha(c.user, c.t.crmOpportunities, { ...base, stageId: c.stages.closed_won, name: 'Ganha', amount: 3000, currency: 'BRL', status: 'Won' });
      await criarLinha(c.user, c.t.crmOpportunities, { ...base, stageId: c.stages.closed_lost, name: 'Perdida', amount: 700, currency: 'BRL', status: 'Lost' });
      // A oportunidade aberta do cenário ganha a probabilidade que o forecast pondera.
      const opp = await linha(c.oportunidade);
      await prisma.dynamicTableData.update({ where: { id: c.oportunidade }, data: { data: { ...opp.data, winProbability: 20 } as never } });

      const r = await request(app)
        .get('/api/crm/pipeline-analytics')
        .query({ datePreset: 'thisYear' })
        .set(authHeader(c.user as never))
        .set('x-user-timezone', 'America/Sao_Paulo');
      expect(r.status).toBe(200);

      expect(r.body.data.funnel).toEqual([
        { name: 'Sem Contato', value: 2 },
        { name: 'Reunião Agendada', value: 1 },
        { name: 'Proposta Enviada', value: 1 },
      ]);
      const cards = Object.fromEntries((r.body.data.cards as Array<{ name: string; value: number }>).map((x) => [x.name, x.value]));
      expect(cards).toMatchObject({
        totalLeads: 4, // leads
        openLeads: 4, // Open ×3 + Converted (o processador só separa Won/Lost/Disqualified)
        wonLeads: 1, // oportunidades: 1 Won
        winRate: 50, // 1 Won / (1 Won + 1 Lost)
        pipelineValue: 1500, // só a oportunidade Open
        forecast: 300, // 1500 × 20%
        avgTicket: 3000, // a Won
      });
    });
  });
});
