/**
 * X10a PR-9 (BE-INCR-NFCE-EMENDA-1 E-9; D-2026-10-29-X10A-PR7-9-FORKS decisões 4, 6 e 8) — contrato HTTP da contingência
 * off-line da NFC-e por unidade e ambiente e o repositório Prisma real (estado e nota normal órfã): uma linha por
 * (unidade, ambiente), audit da allowlist sem o xJust, a saída AUTO que não derruba a MANUAL e tenancy.
 */
// A seleção do adaptador é a única dublê: a SEFAZ "calada" é o `consultar` da porta. O banco (SQLite), os repositórios, a numeração,
// a transação da contingência, a órfã e o audit são os reais — é o que o repositório em memória do teste unitário não prova.
const mockPorta = { current: null as unknown };
jest.mock('@/features/accounting/dfe/resolveEmissor', () => ({ __esModule: true, resolveEmissorFor: () => mockPorta.current }));
jest.mock('@/features/accounting/dfe/selectDfeEmissor', () => ({ __esModule: true, selectDfeEmissor: () => ({ enabled: true, port: mockPorta.current, ambiente: 'homologacao' }) }));

import request from 'supertest';
import prisma from '@/lib/prisma';
import { getFactory } from '@/lib/factory';
import { SefazTransporteError } from '@/features/accounting/dfe/sefaz/SefazSoapClient';
import { CONSULTA_FALHANDO_ATE_CONTINGENCIA_MS } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { inputNfce } from '@/features/accounting/models/__tests__/nfeMontagem.fixture';
import { montarNfe, numerarNfe } from '@/features/accounting/models/nfeMontagem';
import { NfceContingenciaViewSchema } from '@/features/accounting/dtos/NfceContingenciaDto';
import { NfceContingenciaRepository } from '@/features/accounting/repositories/NfceContingenciaRepository';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const BASE = '/api/accounting/nfce-contingencia';
const XJUST = 'Queda do link de internet da loja desde as 10h';

let dono: { id: string; username: string };
let outro: { id: string; username: string };
let unitId: string;
const payloadOf = (p: unknown) => (typeof p === 'string' ? JSON.parse(p) : p) as Record<string, unknown>;

describe('X10a PR-9 — contingência off-line da NFC-e por unidade', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'cont', username: 'cont-dono', email: 'cont@test.local', password: 'x', role: 'USER' } });
    outro = await prisma.user.create({ data: { name: 'cont2', username: 'cont-outro', email: 'cont2@test.local', password: 'x', role: 'USER' } });
    const units = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Units', internalName: 'units', category: 'business', schema: { fields: [] } as never },
    });
    unitId = (await prisma.dynamicTableData.create({ data: { dynamicTableId: units.id, data: { name: 'Centro', cnpj: '11.444.777/0001-61' } as never } })).id;
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('DTO: ligar sem xJust, xJust curto, xJust ao desligar ou campo extra ⇒ 400', async () => {
    for (const body of [
      { ambiente: 'homologacao', ativa: true },
      { ambiente: 'homologacao', ativa: true, xJust: 'curto' },
      { ambiente: 'homologacao', ativa: false, xJust: XJUST },
      { ambiente: 'homologacao', ativa: true, xJust: XJUST, extra: 1 },
    ]) {
      expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send(body)).status).toBe(400);
    }
    expect(await prisma.nfceContingencia.count()).toBe(0);
  });

  it('GET sem linha ⇒ os dois ambientes desligados', async () => {
    const r = await request(app).get(`${BASE}/${unitId}`).set(authHeader(dono));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual([
      { unitId, ambiente: 'homologacao', ativa: false, origem: null, dhCont: null, xJust: null },
      { unitId, ambiente: 'producao', ativa: false, origem: null, dhCont: null, xJust: null },
    ]);
  });

  it('PUT liga (MANUAL, dhCont, xJust); audit dfe.contingency_entered sem o xJust; a saída AUTO não a derruba; PUT desliga ⇒ contingency_left', async () => {
    const r = await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', ativa: true, xJust: XJUST });
    expect(r.status).toBe(200);
    expect(NfceContingenciaViewSchema.parse(r.body.data)).toMatchObject({ unitId, ambiente: 'homologacao', ativa: true, origem: 'MANUAL', xJust: XJUST });
    const [ev] = await prisma.auditEvent.findMany({ where: { eventType: 'dfe.contingency_entered' } });
    expect(Object.keys(payloadOf(ev.payload)).sort()).toEqual(['ambiente', 'dhCont', 'origem', 'unitId']);
    expect(JSON.stringify(ev.payload)).not.toContain(XJUST);

    const repo = new NfceContingenciaRepository();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    expect(await repo.desligar(scope, 'homologacao', 'AUTO')).toBe(false); // decisão 8: a saída automática não tira a manual
    expect((await repo.findEstado(scope, 'homologacao'))?.ativa).toBe(true);

    const off = await request(app).put(`${BASE}/${unitId}`).set(authHeader(dono)).send({ ambiente: 'homologacao', ativa: false });
    expect(off.body.data).toMatchObject({ ativa: false, dhCont: null, xJust: null });
    expect(await prisma.auditEvent.count({ where: { eventType: 'dfe.contingency_left' } })).toBe(1);
    expect(await prisma.nfceContingencia.count({ where: { userId: dono.id } })).toBe(1); // uma linha por (unidade, ambiente)
  });

  it('repositório real: AUTO sai pelo desligar(AUTO); órfã PENDING listada só depois de olderThan, atualizada e achada pelo documento', async () => {
    const repo = new NfceContingenciaRepository();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    await repo.ligar(scope, 'producao', { origem: 'AUTO', dhCont: new Date(), xJust: 'Falha de comunicacao com a SEFAZ' });
    expect(await repo.desligar(scope, 'producao', 'AUTO')).toBe(true);
    expect(await repo.desligar(scope, 'producao', 'AUTO')).toBe(false);

    const chave = `35261011444777000161650030000000011${'12345678'}0`;
    const orfa = await repo.createOrfa(scope, { documentId: 'doc-x', ambiente: 'homologacao', serie: 3, numero: 1n, chave });
    expect(orfa).toMatchObject({ status: 'PENDING', tentativas: 0, numero: 1n });
    expect(await repo.listOrfasPendentes(new Date(orfa.createdAt.getTime() - 1), 10)).toHaveLength(0);
    expect((await repo.listOrfasPendentes(new Date(Date.now() + 1000), 10)).map((o) => o.id)).toEqual([orfa.id]);
    await repo.updateOrfa(orfa.id, { status: 'FAILED', tentativas: 1, ultimoErro: '501 fora do prazo' });
    expect(await repo.listOrfasPendentes(new Date(Date.now() + 1000), 10)).toHaveLength(0);
    expect(await repo.listOrfasDosDocumentos(scope, ['doc-x'])).toEqual([expect.objectContaining({ status: 'FAILED', ultimoErro: '501 fora do prazo' })]);
    const alheio = resolveAccountingScopeInternal({ userId: outro.id }, unitId);
    expect(await repo.listOrfasDosDocumentos(alheio, ['doc-x'])).toHaveLength(0);
  });

  it('revisão F (órfãs): a que espera é tocada e vai para o fim do rodízio — não toma o teto das outras', async () => {
    const repo = new NfceContingenciaRepository();
    const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
    const chave = (n: number) => `352610114447770001616500300000000${n}9${'12345678'}0`;
    const a = await repo.createOrfa(scope, { documentId: 'doc-r1', ambiente: 'homologacao', serie: 3, numero: 11n, chave: chave(11) });
    await new Promise((r) => setTimeout(r, 15));
    const b = await repo.createOrfa(scope, { documentId: 'doc-r2', ambiente: 'homologacao', serie: 3, numero: 12n, chave: chave(12) });
    const futuro = new Date(Date.now() + 1000);
    expect((await repo.listOrfasPendentes(futuro, 1)).map((o) => o.id)).toEqual([a.id]);
    await new Promise((r) => setTimeout(r, 15));
    await repo.updateOrfa(a.id, { tentativas: 1 }); // o job tocou a que espera
    expect((await repo.listOrfasPendentes(futuro, 1)).map((o) => o.id)).toEqual([b.id]);
  });

  // F-AL-6 (dono, 2026-11-24) em SQLite real: a SEFAZ calada ⇒ a consulta do poll falha por comunicação; depois de 5 min contingencia.
  describe('F-AL-6 — consulta da NFC-e normal que a SEFAZ não responde (SQLite real; só a porta é dublê)', () => {
    const consultar = jest.fn();
    let n = 800;
    const soData = () =>
      jest.useFakeTimers({
        doNotFake: ['hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'],
      });
    const avancar = (ms: number) => jest.setSystemTime(new Date(Date.now() + ms));

    beforeEach(() => {
      consultar.mockReset();
      mockPorta.current = { name: 'sefaz', capabilities: { consultar: true, contingenciaOffline: true, assinaturaRemota: false, resultadoSincrono: false }, consultar };
    });
    afterEach(() => jest.useRealTimers());

    /** Uma NFC-e normal (tpEmis 1) já `SENT` no banco — o estado depois do timeout do envio. */
    async function notaEnviada() {
      const scope = resolveAccountingScopeInternal({ userId: dono.id }, unitId);
      n += 1;
      const payload = numerarNfe(montarNfe(inputNfce({ ambiente: 'homologacao' })), n, String(48151623 + n));
      const doc = await getFactory().getFiscalDocumentRepository().createSent(scope, {
        kind: 'NFCE',
        saleId: `sale-${n}`,
        cTribNac: '',
        anchorEntryId: `entry-${n}`,
        ambiente: 'homologacao',
        partner: 'sefaz',
        serie: payload.infNFe.ide.serie,
        numero: BigInt(payload.infNFe.ide.nNF),
        dCompet: '2026-11-24',
        vServCents: 6000n,
        tpRetISSQN: 1,
        payloadJson: JSON.stringify(payload),
      });
      return { scope, doc, chave: payload.infNFe.Id.slice(3) };
    }
    const poll = () => getFactory().getFiscalDocumentLifecycleService().pollPendingOnce(new Date(Date.now() + 60_000));
    const attemptsDe = (id: string) => prisma.fiscalDocumentAttempt.findMany({ where: { documentId: id }, orderBy: { attemptNo: 'asc' } });
    const statusDe = async (id: string) => (await prisma.fiscalDocument.findUniqueOrThrow({ where: { id } })).status;

    it('consulta falhando < 5 min não contingencia; ≥ 5 min contingencia UMA vez — AUTO ligado, número novo da sequência, normal órfã, audit', async () => {
      const { doc, chave } = await notaEnviada();
      consultar.mockRejectedValue(new SefazTransporteError('sefaz_timeout', 'resposta'));
      soData();
      expect(await poll()).toMatchObject({ failed: 1, updated: 0 });
      const ancora = JSON.parse((await attemptsDe(doc.id))[0].resultJson!).consultaFalhandoDesde as string;
      expect(Date.parse(ancora)).toBe(Date.now()); // a âncora ficou na tentativa (não em updatedAt)
      avancar(CONSULTA_FALHANDO_ATE_CONTINGENCIA_MS - 1_000);
      expect(await poll()).toMatchObject({ failed: 1, updated: 0 });
      expect(await statusDe(doc.id)).toBe('SENT');
      expect(await prisma.nfceContingencia.count({ where: { userId: dono.id, ambiente: 'homologacao', ativa: true } })).toBe(0);

      avancar(2_000); // passou dos 5 min desde a 1ª falha
      expect(await poll()).toMatchObject({ failed: 0, updated: 1 });
      const depois = await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: doc.id } });
      expect(depois).toMatchObject({ status: 'CONTINGENCY', currentAttemptNo: 2 });
      expect(depois.numero).not.toBe(doc.numero); // número novo da sequência (Anexo IV p. 8)
      const tentativas = await attemptsDe(doc.id);
      expect(tentativas).toHaveLength(2);
      expect(JSON.parse(tentativas[1].payloadJson).infNFe.ide).toMatchObject({ tpEmis: 9 });
      expect(await prisma.nfceContingencia.findFirst({ where: { userId: dono.id, ambiente: 'homologacao' } })).toMatchObject({ ativa: true, origem: 'AUTO' });
      expect(await prisma.nfceContingenciaOrfa.findMany({ where: { documentId: doc.id } })).toEqual([expect.objectContaining({ status: 'PENDING', chave })]);
      expect(await prisma.auditEvent.count({ where: { eventType: 'dfe.contingency_entered' } })).toBeGreaterThanOrEqual(1);

      expect(await poll()).toMatchObject({ updated: 0 }); // uma vez só: a nota saiu do poll
      expect(await prisma.nfceContingenciaOrfa.count({ where: { documentId: doc.id } })).toBe(1);
    });

    it('217 duas vezes (PROCESSING no banco) contingencia pelo mesmo handler; autorizada na consulta não contingencia', async () => {
      const a = await notaEnviada();
      consultar.mockResolvedValue({ status: 'PROCESSING', partnerRef: a.chave, errors: [{ code: '217', message: 'NF-e nao consta na base de dados da SEFAZ' }] });
      soData();
      await poll();
      expect(await statusDe(a.doc.id)).toBe('PROCESSING');
      avancar(121_000);
      await poll();
      expect(await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: a.doc.id } })).toMatchObject({ status: 'CONTINGENCY', currentAttemptNo: 2 });
      expect(await prisma.nfceContingenciaOrfa.count({ where: { documentId: a.doc.id, chave: a.chave } })).toBe(1);

      const b = await notaEnviada();
      consultar.mockReset();
      consultar.mockResolvedValue({ status: 'AUTHORIZED', partnerRef: b.chave, chaveOuCodigo: b.chave, numero: String(b.doc.numero), errors: [] });
      await poll();
      expect(await prisma.fiscalDocument.findUniqueOrThrow({ where: { id: b.doc.id } })).toMatchObject({ status: 'AUTHORIZED', currentAttemptNo: 1 });
      expect(await prisma.nfceContingenciaOrfa.count({ where: { documentId: b.doc.id } })).toBe(0);
    });

    it('consulta falhando por erro que não é de comunicação (assinador/código) não ancora nem contingencia', async () => {
      const { doc } = await notaEnviada();
      consultar.mockRejectedValue(new Error('dfe_assinador_sem_dispositivo: sem caixa'));
      soData();
      await poll();
      avancar(10 * 60_000);
      expect(await poll()).toMatchObject({ failed: 1, updated: 0 });
      expect((await attemptsDe(doc.id))[0].resultJson).toBeNull();
      expect(await statusDe(doc.id)).toBe('SENT');
    });
  });

  it('tenancy: outro usuário não lê nem liga a contingência desta unidade', async () => {
    expect((await request(app).get(`${BASE}/${unitId}`).set(authHeader(outro))).status).toBeGreaterThanOrEqual(403);
    expect((await request(app).put(`${BASE}/${unitId}`).set(authHeader(outro)).send({ ambiente: 'homologacao', ativa: true, xJust: XJUST })).status).toBeGreaterThanOrEqual(403);
    expect(await prisma.nfceContingencia.count({ where: { userId: outro.id } })).toBe(0);
  });
});
