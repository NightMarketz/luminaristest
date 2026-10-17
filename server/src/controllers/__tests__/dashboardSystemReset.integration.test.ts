/**
 * BE-INCR-RESET-CONSISTENTE PR-1 (nó I7) — `DELETE /api/dashboard/system` coberto por HTTP (E3: a rota não tinha teste).
 *   - item 2 (F-I7-2): a purga alcança tabelas, KG, proposals, layouts, chats (+ mensagens), visões salvas, relatórios e
 *     anexos do CRM (linha + arquivo); o `Document` fica; o 2º usuário com as mesmas linhas não perde nada.
 *   - item 3: o cache de KPI do usuário é invalidado; o de outro usuário sobrevive.
 *   - item 5: sistema já vazio ⇒ 204 sem lançar.
 *   - item 6 (F-I7-3): install → T0₁ → reset → install ⇒ T0 continua T0₁.
 *   - item 7: 401 sem token; depois do reset o `POST /dashboard/create` passa da guarda one-shot (deixa de ser 403).
 * Suíte `crmModule` (sem setor): não escreve contabilidade — o gate contábil é o PR-2.
 */
import { existsSync } from 'fs';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { saveFile, resolveReadPath } from '@/lib/attachmentStorage';
import { kpiCacheService } from '@/features/analytics/services/KpiCacheService';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
type Who = { id: string; username: string };

const criar = (who: Who) =>
  request(app).post('/api/dashboard/create').set(authHeader(who)).send({ suiteKey: 'crmModule', unit: { name: 'Matriz' } });
const resetar = (who: Who) => request(app).delete('/api/dashboard/system').set(authHeader(who));

async function novoUsuario(tag: string): Promise<Who> {
  const u = await prisma.user.create({
    data: { name: tag, username: `reset-${tag}`, email: `reset-${tag}@test.local`, password: 'x', role: 'USER' },
  });
  return { id: u.id, username: u.username };
}

/** Uma linha viva de cada coisa que o reset deve alcançar (+ um Document, que deve ficar). */
async function semear(who: Who) {
  await prisma.knowledgeGraph.create({ data: { userId: who.id, data: {} } });
  await prisma.actionProposal.create({
    data: { userId: who.id, action: 'CREATE', tableId: 't', tableName: 'leads', tableLabel: 'Leads', data: {} },
  });
  await prisma.dashboardLayout.create({ data: { userId: who.id, name: 'Aba', layoutData: { type: 'grid', config: { columns: 1, widgets: [] } } } });
  await prisma.chatInstance.create({
    data: { userId: who.id, widgetInstanceId: 'w1', messages: { create: [{ content: 'oi', role: 'USER' }] } },
  });
  await prisma.savedTableView.create({ data: { userId: who.id, tableId: 't', name: 'Visão', config: {} } });
  await prisma.crmReportDefinition.create({ data: { userId: who.id, name: 'Rel', kind: 'table', chartType: 'none', spec: {} } });
  const { storageKey } = await saveFile(who.id, 'lead', 'row-1', 'contrato.pdf', Buffer.from('%PDF-1.4 teste'));
  await prisma.crmAttachment.create({
    data: { userId: who.id, entityType: 'lead', entityId: 'row-1', fileName: 'contrato.pdf', mimeType: 'application/pdf', fileSize: 14, storageKey },
  });
  const doc = await prisma.document.create({
    data: { userId: who.id, fileName: 'manual.pdf', mimeType: 'application/pdf', fileType: 'PDF', fileSize: 10, textContent: 'x' },
  });
  return { storageKey, documentId: doc.id };
}

async function vivas(userId: string) {
  return {
    dynamicTable: await prisma.dynamicTable.count({ where: { userId } }),
    knowledgeGraph: await prisma.knowledgeGraph.count({ where: { userId } }),
    actionProposal: await prisma.actionProposal.count({ where: { userId } }),
    dashboardLayout: await prisma.dashboardLayout.count({ where: { userId } }),
    chatInstance: await prisma.chatInstance.count({ where: { userId } }),
    chatMessage: await prisma.chatMessage.count({ where: { chatInstance: { userId } } }),
    savedTableView: await prisma.savedTableView.count({ where: { userId, deletedAt: null } }),
    crmReportDefinition: await prisma.crmReportDefinition.count({ where: { userId, deletedAt: null } }),
    crmAttachment: await prisma.crmAttachment.count({ where: { userId, deletedAt: null } }),
    document: await prisma.document.count({ where: { userId } }),
  };
}

describe('DELETE /api/dashboard/system — reset consistente (I7 PR-1)', () => {
  beforeAll(() => {
    pushTestSchema();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('item 7: sem token ⇒ 401', async () => {
    const r = await request(app).delete('/api/dashboard/system');
    expect(r.status).toBe(401);
  });

  it('itens 2 e 3: purga tudo menos Documentos, apaga o arquivo do anexo, invalida o cache — e não toca o 2º usuário', async () => {
    const alvo = await novoUsuario('alvo');
    const vizinho = await novoUsuario('vizinho');
    expect((await criar(alvo)).status).toBe(201);
    expect((await criar(vizinho)).status).toBe(201);
    const sA = await semear(alvo);
    const sB = await semear(vizinho);
    const antesVizinho = await vivas(vizinho.id);
    kpiCacheService.set(`${alvo.id}:x`, 1);
    kpiCacheService.set(`${vizinho.id}:x`, 2);

    const r = await resetar(alvo);
    expect(r.status).toBe(204);

    expect(await vivas(alvo.id)).toEqual({
      dynamicTable: 0,
      knowledgeGraph: 0,
      actionProposal: 0,
      dashboardLayout: 0,
      chatInstance: 0,
      chatMessage: 0,
      savedTableView: 0,
      crmReportDefinition: 0,
      crmAttachment: 0,
      document: 1,
    });
    expect(await prisma.document.findUnique({ where: { id: sA.documentId } })).not.toBeNull();
    // soft-delete (convenção do dono, E6): as linhas ficam, com deletedAt
    expect(await prisma.crmAttachment.count({ where: { userId: alvo.id } })).toBe(1);
    expect(await prisma.savedTableView.count({ where: { userId: alvo.id } })).toBe(1);
    expect(await prisma.crmReportDefinition.count({ where: { userId: alvo.id } })).toBe(1);
    expect(existsSync(resolveReadPath(sA.storageKey))).toBe(false);

    expect(kpiCacheService.get(`${alvo.id}:x`)).toBeNull();
    expect(kpiCacheService.get(`${vizinho.id}:x`)).toBe(2);

    // isolamento de tenant: nada do vizinho mudou
    expect(await vivas(vizinho.id)).toEqual(antesVizinho);
    expect(antesVizinho.dynamicTable).toBeGreaterThan(0);
    expect(existsSync(resolveReadPath(sB.storageKey))).toBe(true);
  });

  it('item 5: sistema já vazio ⇒ 204, de novo 204', async () => {
    const vazio = await novoUsuario('vazio');
    expect((await resetar(vazio)).status).toBe(204);
    expect((await resetar(vazio)).status).toBe(204);
  });

  it('itens 6 e 7: depois do reset o create passa da guarda one-shot, e o 1º T0 é preservado', async () => {
    const u = await novoUsuario('t0');
    expect((await criar(u)).status).toBe(201);
    const t0 = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).onboardingCompletedAt;
    expect(t0).not.toBeNull();
    expect((await criar(u)).status).toBe(403); // a guarda one-shot de sempre

    expect((await resetar(u)).status).toBe(204);
    const recriado = await criar(u);
    expect(recriado.status).not.toBe(403);
    expect(recriado.status).toBe(201);

    const depois = (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).onboardingCompletedAt;
    expect(depois?.getTime()).toBe(t0!.getTime());
  });
});
