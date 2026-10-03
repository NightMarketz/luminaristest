/**
 * FE-INCR-DFE PR-1 (item 12) — a releitura e os ids de anexo saem da `FiscalDocumentView` LIDA DO BANCO.
 * Premissa F2 do BRIEF ("a releitura já é persistida em FiscalDocumentAttempt.resultJson") só era provada com repositório
 * falso (memória repositorios-de-contabilidade-nao-sao-exercitados): aqui o repositório é o real, em SQLite. Anexo, proveniência
 * e auditoria são dublês (não são o objeto). Produção de teste = `doc.ambiente = 'producao'` (campo do documento, não NODE_ENV).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { signNfseForTest } from '@test/helpers/nfeSignature';
import { FiscalDocumentRepository } from '@/features/accounting/repositories/FiscalDocumentRepository';
import { FiscalDocumentEmissionService } from '@/features/accounting/services/FiscalDocumentEmissionService';
import { FiscalDocumentLifecycleService } from '@/features/accounting/services/FiscalDocumentLifecycleService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-retorno';
const DONO = 'u-retorno';
const scope = resolveAccountingScope({ userId: DONO }, UNIT);

const XML_OK = Buffer.from(
  signNfseForTest(readFileSync(join(__dirname, '../../../../lib/__tests__/fixtures/nfse/nfse-autorizada-web.SYNTHETIC.xml'), 'utf8')),
);

/** DPS enviada = a da fixture (mesma de FiscalDocumentLifecycleService.manual.test.ts); `vServ` diferente ⇒ DIVERGENTE. */
function dps(vServ: string, tomaCpf = '12345678909') {
  return JSON.stringify({
    versao: '1.01',
    infDPS: {
      tpAmb: 1, dhEmi: '2026-09-15T17:30:00.000Z', verAplic: 'luminaris-1.0', dCompet: '2026-09-15', tpEmit: 1, cLocEmi: '3550308',
      prest: { CNPJ: '11222333000181', regTrib: { opSimpNac: 1, regEspTrib: 0 } },
      toma: { CPF: tomaCpf, xNome: 'CLIENTE FICTICIA' },
      serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', xDescServ: 'Corte e escova', cNBS: '126021000' } },
      valores: {
        vServPrest: { vServ },
        vDescCondIncond: { vDescIncond: '15.00' },
        trib: { tribMun: { tribISSQN: 1, tpRetISSQN: 1 }, totTrib: { pTotTrib: { pTotTribFed: '4.00', pTotTribEst: '0.00', pTotTribMun: '5.00' } } },
      },
    },
  });
}

describe('retorno manual → GET /documents/:id (FE-INCR-DFE PR-1, itens 10–13) — SQLite real', () => {
  const repo = new FiscalDocumentRepository();
  const policy = { canEmitFiscalDocument: () => true, canReadFiscalDocument: () => true, canCancelFiscalDocument: () => true };
  const emission = new FiscalDocumentEmissionService(repo, null as never, null as never, null as never, null as never, policy as never, null as never);
  const lifecycle = new FiscalDocumentLifecycleService(
    repo,
    emission,
    { upload: async (_s: unknown, a: { fileName: string }) => ({ id: `att-${a.fileName}` }) } as never,
    { attachSourceDocument: async () => ({ id: 'src-1' }), retireSourceDocument: async () => undefined } as never,
    policy as never,
    { append: async () => undefined } as never,
  );

  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({ data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' } });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function seed(saleId: string, vServ: string, tomaCpf?: string) {
    // a mesma fixture (mesma chave de acesso) serve a todos os casos; a guarda "chave já em outro documento" é real, então libera a anterior
    await prisma.fiscalDocument.updateMany({ data: { chaveOuCodigo: null } });
    const doc = await repo.createSent(scope, {
      kind: 'NFSE', saleId, cTribNac: '060101', anchorEntryId: 'entry-x', ambiente: 'producao', partner: 'manual',
      serie: 1, numero: null, dCompet: '2026-09-15', vServCents: 15000n, tpRetISSQN: 1, payloadJson: dps(vServ, tomaCpf),
    });
    // a guarda "nota anterior ao documento" compara com createdAt; a fixture é de 15/09/2026
    await prisma.fiscalDocument.update({ where: { id: doc.id }, data: { createdAt: new Date('2026-09-15T17:00:00Z') } });
    return doc.id;
  }

  it('antes do retorno: releitura e ids de anexo nulos', async () => {
    const id = await seed('sale-pre', '150.00');
    const view = await emission.getById(scope, id);
    expect(view).toMatchObject({ status: 'SENT', releitura: null, xmlAttachmentId: null, pdfAttachmentId: null });
  });

  it('IGUAL: a resposta do upload e o GET seguinte trazem a mesma releitura, e o id do XML (produção) vem do banco', async () => {
    const id = await seed('sale-igual', '150.00');
    const resposta = await lifecycle.retornoManual(scope, id, XML_OK, Buffer.from('%PDF-1.4 fake'));
    const relido = await emission.getById(scope, id);
    expect(relido.status).toBe('AUTHORIZED');
    expect(relido.releitura).toEqual({ status: 'IGUAL', divergencias: [] });
    expect(resposta.releitura).toEqual(relido.releitura);
    expect(relido.xmlAttachmentId).toBe(`att-${id}.xml`);
    expect(relido.pdfAttachmentId).toBe(`att-${id}.pdf`);
  });

  it('DIVERGENTE: status e divergências sobrevivem ao reload, vindos do resultJson da tentativa corrente', async () => {
    const id = await seed('sale-div', '160.00');
    await lifecycle.retornoManual(scope, id, XML_OK);
    const relido = await emission.getById(scope, id);
    expect(relido.status).toBe('AUTHORIZED_DIVERGENT');
    expect(relido.releitura?.status).toBe('DIVERGENTE');
    expect(relido.releitura?.divergencias).toEqual([{ campo: 'vServ', grupo: 'conteudo', tipo: 'diferente', enviado: '16000', autorizado: '15000' }]);
  });

  it('item 13 / sem PII: toma.doc divergente sai SEM o documento do tomador em qualquer campo da view', async () => {
    const id = await seed('sale-pii', '150.00', '98765432100'); // o XML autorizado traz outro CPF (12345678909)
    await lifecycle.retornoManual(scope, id, XML_OK);
    const view = await emission.getById(scope, id);
    expect(view.status).toBe('AUTHORIZED_DIVERGENT');
    expect(view.releitura?.divergencias).toEqual([{ campo: 'toma.doc', grupo: 'conteudo', tipo: 'diferente' }]);
    expect(JSON.stringify(view)).not.toMatch(/12345678909|98765432100/);
  });
});
