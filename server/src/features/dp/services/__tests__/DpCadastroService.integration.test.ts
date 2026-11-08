/**
 * BE-INCR-DP-F0-F1 itens 28–33 e 36 (PR-3) — cadastros de estrutura no SQLite real: CRUD, Tier-0, unicidade viva por
 * gate na tx (apagar e recriar com o mesmo código funciona), regras de vigência do parâmetro e auditoria sem texto livre.
 */
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { pushTestSchema, resetDb } from '@test/helpers';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { DpPolicy } from '../../policies/DpPolicy';
import { DpCadastroRepository } from '../../repositories/DpCadastroRepository';
import { DpCadastroService } from '../DpCadastroService';
import type { AppError } from '@/lib/errors';

async function erro(p: Promise<unknown>): Promise<{ status: number; code: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as AppError;
    return { status: err.statusCode, code: err.errorCode };
  }
  throw new Error('não lançou');
}

const CNPJ = '11222333000181';

describe('DpCadastroService (itens 28–33, 36)', () => {
  let dono: string;
  let outro: string;
  let svc: DpCadastroService;
  const scopeDe = (userId: string) => resolveAccountingScopeInternal({ userId }, `unit-${userId}`);
  const u = (userId: string) => ({ unitId: `unit-${userId}` });

  beforeAll(() => pushTestSchema(), 120000);
  beforeEach(async () => {
    await resetDb();
    dono = (await prisma.user.create({ data: { name: 'dpc', username: 'dpc-dono', email: 'dpc@test.local', password: 'x', role: 'USER' } })).id;
    outro = (await prisma.user.create({ data: { name: 'dpc2', username: 'dpc-outro', email: 'dpc2@test.local', password: 'x', role: 'USER' } })).id;
    svc = new DpCadastroService(new DpCadastroRepository(), new DpPolicy(), getFactory().getAuditService(), getFactory().getLegalParameterService());
  });
  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('item 28 — lotação: CRUD, unitId do escopo, código vivo único (409), apagar e recriar com o mesmo código', async () => {
    const l = await svc.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'LOJA-1', descricao: 'Loja' });
    expect(l).toMatchObject({ unitId: `unit-${dono}`, codigo: 'LOJA-1', descricao: 'Loja' });
    expect(l).not.toHaveProperty('userId');
    expect(await erro(svc.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'LOJA-1', descricao: 'Outra' }))).toEqual({ status: 409, code: 'DP_CODIGO_DUPLICADO' });
    // Outro dono pode usar o mesmo código (unicidade por instância).
    await svc.createLotacao(scopeDe(outro), { ...u(outro), codigo: 'LOJA-1', descricao: 'Loja dele' });
    const l2 = await svc.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'LOJA-2', descricao: 'Loja 2' });
    expect(await erro(svc.updateLotacao(scopeDe(dono), l2.id, { ...u(dono), codigo: 'LOJA-1' }))).toEqual({ status: 409, code: 'DP_CODIGO_DUPLICADO' });
    expect((await svc.updateLotacao(scopeDe(dono), l.id, { ...u(dono), codigo: 'LOJA-1', descricao: 'Matriz' })).descricao).toBe('Matriz');
    await svc.deleteLotacao(scopeDe(dono), l.id);
    expect(await erro(svc.getLotacao(scopeDe(dono), l.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    await svc.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'LOJA-1', descricao: 'Recriada' });
    expect((await svc.listLotacoes(scopeDe(dono), 50)).map((x) => x.descricao)).toEqual(['Recriada', 'Loja 2']);
    expect(await prisma.dpLotacao.count({ where: { userId: dono } })).toBe(3); // soft-delete
  });

  it('Tier-0 — cadastro de outro dono ⇒ 404 em get, update, delete; listas separadas', async () => {
    const c = await svc.createCargo(scopeDe(outro), { ...u(outro), nome: 'Gerente', cbo: '141410' });
    const j = await svc.createJornada(scopeDe(outro), { ...u(outro), nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '4' });
    const s = await svc.createSindicato(scopeDe(outro), { ...u(outro), cnpj: CNPJ, nome: 'Sind' });
    expect(await erro(svc.getCargo(scopeDe(dono), c.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(await erro(svc.updateJornada(scopeDe(dono), j.id, { ...u(dono), nome: 'x' }))).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(await erro(svc.deleteSindicato(scopeDe(dono), s.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
    const conv = svc.createConvencao(scopeDe(dono), { ...u(dono), sindicatoId: s.id, identificacao: 'CCT', vigenteDesde: '2026-01-01', fonte: 'registro MTE' });
    expect(await erro(conv)).toEqual({ status: 404, code: 'NOT_FOUND' });
    expect(await svc.listCargos(scopeDe(dono), 50)).toEqual([]);
  });

  it('itens 29–31 — cargo e jornada: update parcial preserva o resto; sindicato: CNPJ vivo único e recriável', async () => {
    const j = await svc.createJornada(scopeDe(dono), { ...u(dono), nome: '44h', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '4', descricao: 'seg a sex 8h-17h, sáb 8h-12h' });
    const j2 = await svc.updateJornada(scopeDe(dono), j.id, { ...u(dono), nome: '44 horas' });
    expect(j2).toMatchObject({ nome: '44 horas', minutosSemanais: 2640, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'], minutosPorDia: 440, tipoJornada: '4', descricao: 'seg a sex 8h-17h, sáb 8h-12h' });
    const c = await svc.createCargo(scopeDe(dono), { ...u(dono), nome: 'Manicure', cbo: '516120' });
    expect((await svc.updateCargo(scopeDe(dono), c.id, { ...u(dono), cbo: '516110' })).nome).toBe('Manicure');

    const s = await svc.createSindicato(scopeDe(dono), { ...u(dono), cnpj: CNPJ, nome: 'Sind A' });
    expect(await erro(svc.createSindicato(scopeDe(dono), { ...u(dono), cnpj: CNPJ, nome: 'Sind B' }))).toEqual({ status: 409, code: 'DP_CODIGO_DUPLICADO' });
    await svc.deleteSindicato(scopeDe(dono), s.id);
    expect((await svc.createSindicato(scopeDe(dono), { ...u(dono), cnpj: CNPJ, nome: 'Sind B' })).nome).toBe('Sind B');
  });

  it('itens 32–33 — convenção e piso: discriminador = cargo do dono, vigência dentro da convenção, sem sobreposição', async () => {
    const s = await svc.createSindicato(scopeDe(dono), { ...u(dono), cnpj: CNPJ, nome: 'Sind' });
    const cargo = await svc.createCargo(scopeDe(dono), { ...u(dono), nome: 'Cabeleireiro', cbo: '516110' });
    const cargoAlheio = await svc.createCargo(scopeDe(outro), { ...u(outro), nome: 'X', cbo: '516110' });
    const conv = await svc.createConvencao(scopeDe(dono), {
      ...u(dono), sindicatoId: s.id, identificacao: 'MR000001/2026', vigenteDesde: '2026-03-01', vigenteAte: '2027-02-28', fonte: 'registro no Mediador',
    });
    const piso = (o: { vigenteDesde: string; vigenteAte?: string | null; discriminador?: string; valorInt?: bigint }) =>
      svc.createParametro(scopeDe(dono), conv.id, {
        ...u(dono), chave: 'PISO_SALARIAL_CENTS', discriminador: o.discriminador ?? cargo.id, valorInt: o.valorInt ?? 180000n,
        clausula: 'Cláusula 3ª — piso', vigenteDesde: o.vigenteDesde, vigenteAte: o.vigenteAte ?? undefined,
      });

    expect(await erro(piso({ vigenteDesde: '2026-03-01' }))).toEqual({ status: 400, code: 'VALIDATION_ERROR' }); // sem fim, conv com fim
    expect(await erro(piso({ vigenteDesde: '2026-02-01', vigenteAte: '2026-12-31' }))).toEqual({ status: 400, code: 'VALIDATION_ERROR' });
    expect(await erro(piso({ vigenteDesde: '2026-03-01', vigenteAte: '2026-08-31', discriminador: cargoAlheio.id }))).toEqual({ status: 404, code: 'NOT_FOUND' });
    const p1 = await piso({ vigenteDesde: '2026-03-01', vigenteAte: '2026-08-31' });
    expect(p1).toMatchObject({ chave: 'PISO_SALARIAL_CENTS', discriminador: cargo.id, valorInt: '180000' });
    expect(await erro(piso({ vigenteDesde: '2026-08-31', vigenteAte: '2027-02-28' }))).toEqual({ status: 409, code: 'DP_VERSAO_SOBREPOSTA' });
    const p2 = await piso({ vigenteDesde: '2026-09-01', vigenteAte: '2027-02-28', valorInt: 190000n });
    expect(await erro(svc.updateParametro(scopeDe(dono), conv.id, p2.id, { ...u(dono), vigenteDesde: '2026-08-01' }))).toEqual({ status: 409, code: 'DP_VERSAO_SOBREPOSTA' });
    expect((await svc.updateParametro(scopeDe(dono), conv.id, p2.id, { ...u(dono), valorInt: 195000n })).valorInt).toBe('195000');

    // Encolher a convenção deixaria p2 fora ⇒ 400; com p2 apagado, encolhe.
    expect(await erro(svc.updateConvencao(scopeDe(dono), conv.id, { ...u(dono), vigenteAte: '2026-12-31' }))).toEqual({ status: 400, code: 'VALIDATION_ERROR' });
    await svc.deleteParametro(scopeDe(dono), conv.id, p2.id);
    expect((await svc.updateConvencao(scopeDe(dono), conv.id, { ...u(dono), vigenteAte: '2026-12-31' })).vigenteAte).toBe('2026-12-31');
    expect((await svc.listParametros(scopeDe(dono), conv.id)).map((p) => p.id)).toEqual([p1.id]);
    expect(await erro(svc.listParametros(scopeDe(outro), conv.id))).toEqual({ status: 404, code: 'NOT_FOUND' });
  });

  it('item 36 — auditoria na mesma tx: ids, códigos e datas; piso em string; sem nome, descrição nem cláusula', async () => {
    const l = await svc.createLotacao(scopeDe(dono), { ...u(dono), codigo: 'L1', descricao: 'Descrição secreta' });
    await svc.deleteLotacao(scopeDe(dono), l.id);
    const s = await svc.createSindicato(scopeDe(dono), { ...u(dono), cnpj: CNPJ, nome: 'Nome do sindicato' });
    const cargo = await svc.createCargo(scopeDe(dono), { ...u(dono), nome: 'Nome do cargo', cbo: '516110' });
    await svc.createJornada(scopeDe(dono), { ...u(dono), nome: 'J', minutosSemanais: 2200, diasTrabalho: ['SEG', 'TER', 'QUA', 'QUI', 'SEX'], minutosPorDia: 440, tipoJornada: '9' });
    const conv = await svc.createConvencao(scopeDe(dono), { ...u(dono), sindicatoId: s.id, identificacao: 'CCT', vigenteDesde: '2026-01-01', fonte: 'registro' });
    await svc.createParametro(scopeDe(dono), conv.id, {
      ...u(dono), chave: 'PISO_SALARIAL_CENTS', discriminador: cargo.id, valorInt: 180000n, clausula: 'Texto da cláusula', vigenteDesde: '2026-01-01',
    });
    const ev = await prisma.auditEvent.findMany({ where: { eventType: { startsWith: 'dp.' } }, orderBy: { seq: 'asc' } });
    expect(ev.map((e) => e.eventType)).toEqual([
      'dp.lotacao.created', 'dp.lotacao.deleted', 'dp.sindicato.created', 'dp.cargo.created', 'dp.jornada.created',
      'dp.convencao.created', 'dp.convencao_parametro.created',
    ]);
    const tudo = ev.map((e) => JSON.stringify(e.payload)).join('\n');
    for (const texto of ['Descrição secreta', 'Nome do sindicato', 'Nome do cargo', 'Texto da cláusula']) expect(tudo).not.toContain(texto);
    expect(JSON.parse(String(ev[6].payload))).toMatchObject({ chave: 'PISO_SALARIAL_CENTS', discriminador: cargo.id, valorInt: '180000' });
  });
});
