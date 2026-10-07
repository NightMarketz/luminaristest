/**
 * BE-INCR-LEGAL-PARAMS PR-1 (BRIEF §3 itens 1–5, 8, 11, 12; emenda §9 L-2, L-5, L-6, L-7) — a tabela de plataforma
 * ponta a ponta pelo HTTP: leitura por qualquer autenticado, gestão só por PLATFORM_ADMIN, DRAFT → PUBLISHED →
 * REVOKED, substituição, empate de vigência, auditoria na corrente da plataforma e o cache visto pela fotografia
 * que os cálculos recebem.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, resetDb, disconnectDb, authHeader } from '@test/helpers';
import { getFactory } from '@/lib/factory';
import { Role } from '@/features/users/models/User.model';
import { PLATFORM_AUDIT_SCOPE } from '@/features/legalParameters/services/LegalParameterService';
import { tabelaApuracaoDe, parametroVigente } from '@/features/accounting/models/taxAssessmentParams';

const app = makeApp();
const BASE = '/api/legal-parameters';
const USER = { id: 'lp-user', username: 'lp-user' };
const ADMIN = { id: 'lp-admin', username: 'lp-admin', role: Role.ADMIN };
// O papel não existe no enum do domínio (L-2: ninguém o recebe pela API) — só no Prisma e no JWT.
const PADMIN = { id: 'lp-padmin', username: 'lp-padmin', role: 'PLATFORM_ADMIN' as Role };

const proposta = (extra: Record<string, unknown> = {}) => ({
  tabela: 'TAX_ASSESSMENT',
  chave: 'IRPJ_ALIQ',
  valorInt: 1700,
  fonte: 'Lei hipotética de teste art. 1º',
  vigenteDesde: '2027-01-01',
  motivo: 'teste de publicação',
  ...extra,
});

async function propor(extra: Record<string, unknown> = {}): Promise<string> {
  const r = await request(app).post(BASE).set(authHeader(PADMIN)).send(proposta(extra));
  expect(r.status).toBe(201);
  return r.body.data.id as string;
}

const vigente = (chave: string, data: string, extra = '') =>
  request(app).get(`${BASE}/vigente?tabela=TAX_ASSESSMENT&chave=${chave}&data=${data}${extra}`).set(authHeader(USER));

describe('BE-INCR-LEGAL-PARAMS PR-1 — /api/legal-parameters', () => {
  beforeAll(() => pushTestSchema());
  afterEach(() => resetDb());
  afterAll(() => disconnectDb());

  it('item 11 — qualquer autenticado lê a lista e o lookup (a semente da migração está lá); sem token ⇒ 401', async () => {
    const lista = await request(app).get(`${BASE}?tabela=PIS_COFINS&status=PUBLISHED`).set(authHeader(USER));
    expect(lista.status).toBe(200);
    expect(lista.body.data).toHaveLength(4);
    const v = await vigente('PRESUNCAO_IRPJ', '2026-03-31', '&discriminador=SERVICO');
    expect(v.status).toBe(200);
    expect(v.body.data).toMatchObject({ valorInt: 3200, fonte: 'Lei 9.249/1995 art. 15 § 1º III a', status: 'PUBLISHED' });
    expect((await vigente('IRPJ_ALIQ', '1990-12-31')).status).toBe(404);
    expect((await request(app).get(BASE)).status).toBe(401);
  });

  it('F-LP-2 b / item 12 — USER e ADMIN não propõem, publicam nem revogam (403); PLATFORM_ADMIN propõe DRAFT', async () => {
    for (const ator of [USER, ADMIN]) {
      expect((await request(app).post(BASE).set(authHeader(ator)).send(proposta())).status).toBe(403);
      expect((await request(app).post(`${BASE}/lp1-ta-irpj_aliq/revoke`).set(authHeader(ator))).status).toBe(403);
    }
    const id = await propor();
    for (const ator of [USER, ADMIN]) expect((await request(app).post(`${BASE}/${id}/publish`).set(authHeader(ator))).status).toBe(403);
    const row = await prisma.legalParameter.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ status: 'DRAFT', proposedById: PADMIN.id, publishedAt: null });
  });

  it('itens 2–3 + DTO — fonte vazia, tabela fora do enum, data fora do calendário, dois valores, tabela não migrada ⇒ 400', async () => {
    const casos: Record<string, unknown>[] = [
      { fonte: '   ' },
      { tabela: 'INVENTADA' },
      { vigenteDesde: '2027-02-30' },
      { valorTexto: 'X' }, // com valorInt da proposta = dois valores
      { vigenteAte: '2026-12-31' }, // antes do vigenteDesde
      { tabela: 'FERIADO_NACIONAL', chave: '2027-11-20', valorInt: undefined, valorTexto: 'Consciência Negra' }, // PR-2
      { valorInt: undefined, valorTexto: 'TEXTO' }, // IRPJ_ALIQ é valorInt
      { tabela: 'PIS_COFINS', chave: 'PIS', discriminador: 'OUTRA' },
      { extra: 1 }, // .strict()
    ];
    for (const c of casos) {
      const r = await request(app).post(BASE).set(authHeader(PADMIN)).send(proposta(c));
      expect([JSON.stringify(c), r.status]).toEqual([JSON.stringify(c), 400]);
    }
    expect(await prisma.legalParameter.count({ where: { status: 'DRAFT' } })).toBe(0);
  });

  it('item 8 + item 5 — publicar faz a linha valer no lookup E na fotografia dos cálculos (cache invalidado); revogar volta', async () => {
    const svc = getFactory().getLegalParameterService();
    const aliq = async (data: string) => parametroVigente(tabelaApuracaoDe(await svc.fotografia(['TAX_ASSESSMENT', 'CSLL_ALIQUOTA'])), 'IRPJ_ALIQ', data);
    expect(await aliq('2027-03-31')).toBe(1500); // aquece o cache
    const id = await propor();
    expect(await aliq('2027-03-31')).toBe(1500); // DRAFT não vale
    const pub = await request(app).post(`${BASE}/${id}/publish`).set(authHeader(PADMIN));
    expect(pub.status).toBe(200);
    expect(pub.body.data).toMatchObject({ status: 'PUBLISHED', publishedById: PADMIN.id });
    expect(await aliq('2027-03-31')).toBe(1700);
    expect(await aliq('2026-12-31')).toBe(1500); // antes da vigência da nova
    expect((await vigente('IRPJ_ALIQ', '2027-03-31')).body.data.id).toBe(id);
    expect((await request(app).post(`${BASE}/${id}/publish`).set(authHeader(PADMIN))).status).toBe(409); // não é mais DRAFT

    const rev = await request(app).post(`${BASE}/${id}/revoke`).set(authHeader(PADMIN));
    expect(rev.status).toBe(200);
    expect(await aliq('2027-03-31')).toBe(1500);
    // L-6: só o status mudou — valor, fonte e vigência ficaram.
    expect(await prisma.legalParameter.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'REVOKED', valorInt: 1700, vigenteDesde: '2027-01-01', revokedById: PADMIN.id });
    expect((await request(app).post(`${BASE}/${id}/revoke`).set(authHeader(PADMIN))).status).toBe(409);
  });

  it('L-7 — substituta publicada tira a anterior do lookup mesmo com o mesmo vigenteDesde; outra chave ⇒ 400; revogar a substituta devolve a anterior', async () => {
    const outra = await request(app).post(BASE).set(authHeader(PADMIN)).send(proposta({ chave: 'IRPJ_ADIC_ALIQ', supersedesId: 'lp1-ta-irpj_aliq' }));
    expect(outra.status).toBe(400);
    expect((await request(app).post(BASE).set(authHeader(PADMIN)).send(proposta({ supersedesId: 'nao-existe' }))).status).toBe(404);

    const id = await propor({ vigenteDesde: '2017-03-16', valorInt: 1501, supersedesId: 'lp1-ta-irpj_aliq', fonte: 'IN RFB 1.700/2017 art. 29 caput (correção de teste)' });
    expect((await request(app).post(`${BASE}/${id}/publish`).set(authHeader(PADMIN))).status).toBe(200);
    expect((await vigente('IRPJ_ALIQ', '2026-03-31')).body.data).toMatchObject({ id, valorInt: 1501 });
    expect((await request(app).post(`${BASE}/${id}/revoke`).set(authHeader(PADMIN))).status).toBe(200);
    expect((await vigente('IRPJ_ALIQ', '2026-03-31')).body.data).toMatchObject({ id: 'lp1-ta-irpj_aliq', valorInt: 1500 });
  });

  it('publish — empate de vigenteDesde sem supersedesId ⇒ 409 (lookup ambíguo); substituída revogada antes da publicação ⇒ 409', async () => {
    const empate = await propor({ vigenteDesde: '2017-03-16' });
    expect((await request(app).post(`${BASE}/${empate}/publish`).set(authHeader(PADMIN))).status).toBe(409);

    const subst = await propor({ vigenteDesde: '2017-03-16', supersedesId: 'lp1-ta-irpj_aliq' });
    expect((await request(app).post(`${BASE}/lp1-ta-irpj_aliq/revoke`).set(authHeader(PADMIN))).status).toBe(200);
    expect((await request(app).post(`${BASE}/${subst}/publish`).set(authHeader(PADMIN))).status).toBe(409);
  });

  it('L-5 / item 8 — proposed, published e revoked na corrente da PLATAFORMA (nenhuma empresa), encadeados', async () => {
    const id = await propor();
    await request(app).post(`${BASE}/${id}/publish`).set(authHeader(PADMIN));
    await request(app).post(`${BASE}/${id}/revoke`).set(authHeader(PADMIN));
    const ev = await prisma.auditEvent.findMany({ where: { targetId: id }, orderBy: { seq: 'asc' } });
    expect(ev.map((e) => e.eventType)).toEqual(['legal_parameter.proposed', 'legal_parameter.published', 'legal_parameter.revoked']);
    expect(ev.every((e) => e.scopeUserId === PLATFORM_AUDIT_SCOPE.ownerUserId && e.unitId === PLATFORM_AUDIT_SCOPE.unitId && e.actorUserId === PADMIN.id)).toBe(true);
    expect(ev[1].prevHash).toBe(ev[0].hash);
    expect(JSON.parse(ev[0].payload)).toMatchObject({ legalParameterId: id, tabela: 'TAX_ASSESSMENT', chave: 'IRPJ_ALIQ', valorInt: '1700' });
    const verify = await getFactory().getAuditService().verifyAuditChain(PLATFORM_AUDIT_SCOPE);
    expect(verify).toMatchObject({ ok: true, checkedEvents: 3 });
  });
});
