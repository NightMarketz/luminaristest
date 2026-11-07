/**
 * BE-INCR-TEAMMATES PR-3, itens 14 e 18 — repositórios do runner contra o SQLite real: o turno pega uma vez só, o fim
 * grava provedor/modelo/tokens, e a memória lê as últimas N mensagens da thread do canal do dono.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema, resetDb } from '@test/helpers';
import { AgentTurnRepository, TurnContextRepository } from '../repositories/AgentTurnRepository';

const turns = new AgentTurnRepository();
const context = new TurnContextRepository();
const FIM = new Date('2026-11-07T12:30:00.000Z');

describe('AgentTurnRepository / TurnContextRepository (PR-3)', () => {
  let dono: string;
  let outro: string;

  beforeAll(async () => {
    pushTestSchema();
    await resetDb();
    const mk = (u: string) => prisma.user.create({ data: { name: u, username: u, email: `${u}@test.local`, password: 'x', role: 'USER' } });
    dono = (await mk('turn-dono')).id;
    outro = (await mk('turn-outro')).id;
  });

  afterAll(async () => {
    await prisma.agentTurn.deleteMany({});
    await prisma.agentChannelMessage.deleteMany({});
    await prisma.agentChannel.deleteMany({});
    await prisma.teammateRoutine.deleteMany({});
  });

  it('claim pega o turno PENDING uma vez só; finish grava os campos do item 18', async () => {
    const t = await prisma.agentTurn.create({ data: { userId: dono, teammateId: 'tm1', trigger: 'MANUAL' } });
    expect(await turns.runTransaction((tx) => turns.claim(t.id, tx))).toBe(true);
    expect(await turns.runTransaction((tx) => turns.claim(t.id, tx))).toBe(false);
    await turns.runTransaction((tx) =>
      turns.finish(t.id, { status: 'DONE', provider: 'anthropic', model: 'claude-x', promptTokens: 500, completionTokens: 50, error: null, finishedAt: FIM }, tx),
    );
    const row = await prisma.agentTurn.findUniqueOrThrow({ where: { id: t.id } });
    expect(row).toMatchObject({ status: 'DONE', attempts: 1, provider: 'anthropic', model: 'claude-x', promptTokens: 500, completionTokens: 50, error: null, finishedAt: FIM });
    expect(await turns.findById(t.id)).toMatchObject({ id: t.id, status: 'DONE', trigger: 'MANUAL' });
  });

  it('memória: últimas N da thread em ordem; mensagem de canal de outro tenant não é lida', async () => {
    const ch = await prisma.agentChannel.create({ data: { userId: dono, name: 'financeiro' } });
    const alheio = await prisma.agentChannel.create({ data: { userId: outro, name: 'alheio' } });
    const base = Date.parse('2026-11-07T10:00:00.000Z');
    const root = await prisma.agentChannelMessage.create({ data: { channelId: ch.id, authorType: 'OWNER', authorId: dono, content: 'raiz', createdAt: new Date(base) } });
    for (let i = 1; i <= 3; i++) {
      await prisma.agentChannelMessage.create({ data: { channelId: ch.id, threadId: root.id, authorType: 'OWNER', authorId: dono, content: `r${i}`, createdAt: new Date(base + i * 1000) } });
    }
    await prisma.agentChannelMessage.create({ data: { channelId: ch.id, authorType: 'OWNER', authorId: dono, content: 'outra thread', createdAt: new Date(base + 9000) } });
    const msgAlheia = await prisma.agentChannelMessage.create({ data: { channelId: alheio.id, authorType: 'OWNER', authorId: outro, content: 'x' } });

    expect((await context.listThread(ch.id, root.id, 3)).map((m) => m.content)).toEqual(['r1', 'r2', 'r3']);
    expect((await context.listThread(ch.id, root.id, 10)).map((m) => m.content)).toEqual(['raiz', 'r1', 'r2', 'r3']);
    expect(await context.findChannelMessage(dono, root.id)).toMatchObject({ id: root.id, threadId: null });
    expect(await context.findChannelMessage(dono, msgAlheia.id)).toBeNull();
  });

  it('rotina viva do dono e o ator do turno', async () => {
    const r = await prisma.teammateRoutine.create({ data: { userId: dono, teammateId: 'tm1', prompt: 'Concilie.' } });
    expect(await context.findRoutinePrompt(dono, r.id)).toBe('Concilie.');
    expect(await context.findRoutinePrompt(outro, r.id)).toBeNull();
    expect(await context.findActor(dono)).toMatchObject({ id: dono, userId: dono, username: 'turn-dono', role: 'USER' });
  });
});
