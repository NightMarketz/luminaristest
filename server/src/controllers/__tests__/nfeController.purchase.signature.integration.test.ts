/**
 * SIG-NFE — teste-guarda (PLANO-POS-CONTADOR-2026-09-23 Fase 2, passo 2.2; GAP-MAP 14). Autorização do
 * dono em chat, 2026-09-26: "instrumenta a assinatura".
 *
 * LACUNA: `parseNfe` (`lib/nfe.ts:270`) e `NfeImportService.importPurchase` (`:97`) nunca leem a
 * `<Signature>` (XMLDSig) da NF-e — checam DTD, modelo, protocolo, cStat e chave, e só. Uma nota cuja
 * assinatura não confere com o conteúdo (valor alterado depois de assinar) é contabilizada igual.
 * ESPERADO (passo 2.2): import de NF-e com `<Signature>` que não valida → 400, nada escrito.
 *
 * LIMITE DECLARADO do cenário: não há XML real assinado no repo (E9 espera D2) nem lib XMLDSig
 * instalada, então a nota não é assinada-e-depois-adulterada de verdade: o fixture sintético ganha um
 * bloco `<Signature>` bem-formado, com Reference ao `#NFe<chave>`, cujo DigestValue/SignatureValue não
 * conferem com o conteúdo. Para um verificador isso é a mesma coisa (assinatura presente e inválida);
 * o caso "nota sem nenhuma assinatura" é o fork F-SIG-1 e NÃO é afirmado aqui.
 *
 * Arquivo próprio (dono e unidade próprios): no arquivo do X6 a mesma chave de acesso colidiria com a
 * importação feliz — ou quebrando-a, ou fazendo este caso passar pela idempotência, não pela assinatura.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader } from '@test/helpers';

const app = makeApp();
const UNIT = 'unit-sig-nfe';
const ORIGINAL = readFileSync(
  join(__dirname, '../../lib/__tests__/fixtures/nfe/purchase-pis-cofins.SYNTHETIC.xml'),
  'utf8',
);

/** Assinatura enveloped bem-formada que NÃO confere com o conteúdo (digest/assinatura de outro documento). */
const SIGNATURE_QUE_NAO_CONFERE = `
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
      <SignedInfo>
        <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
        <Reference URI="#NFe35250712345678000195550010000000021000000010">
          <Transforms>
            <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          </Transforms>
          <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
          <DigestValue>AAAAAAAAAAAAAAAAAAAAAAAAAAA=</DigestValue>
        </Reference>
      </SignedInfo>
      <SignatureValue>QUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUE=</SignatureValue>
      <KeyInfo><X509Data><X509Certificate>QUFBQQ==</X509Certificate></X509Data></KeyInfo>
    </Signature>`;

// O fixture é CRLF — ancorar só na tag fechada, nunca no fim de linha.
const ADULTERADA = ORIGINAL.replace('</infNFe>', `</infNFe>${SIGNATURE_QUE_NAO_CONFERE}`);

let dono: { id: string; username: string };
let MAPPINGS = '[]';

describe('SIG-NFE — import de compra com <Signature> que não confere', () => {
  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({ data: { name: 'sig', username: 'sig-dono', email: 'sig@test.local', password: 'x', role: 'USER' } });
    await prisma.accountingPeriod.create({ data: { userId: dono.id, unitId: UNIT, year: 2025, month: 7, status: 'OPEN', openedAt: new Date(), openedById: dono.id } });
    for (const [code, name, nature] of [['1.1.6', 'Estoques', 'Asset'], ['2.1.2', 'Fornecedores a Pagar', 'Liability'], ['4.1', 'Despesas', 'Expense']]) {
      await prisma.account.create({ data: { userId: dono.id, unitId: UNIT, code, name, nature, acceptsEntries: true } });
    }
    const products = await prisma.dynamicTable.create({
      data: { userId: dono.id, name: 'Products', internalName: 'products', category: 'products', schema: { fields: [{ name: 'name', label: 'Name', type: 'string', required: true }] } },
    });
    const refs: string[] = [];
    for (const name of ['Toalha', 'Condicionador', 'Máscara']) {
      refs.push((await prisma.dynamicTableData.create({ data: { dynamicTableId: products.id, data: { name } } })).id);
    }
    MAPPINGS = JSON.stringify([
      { cProd: 'SHAMP-500', productRef: refs[0] },
      { cProd: 'COND-500', productRef: refs[1] },
      { cProd: 'MASC-300', productRef: refs[2] },
    ]);
    const perfil = await request(app).put('/api/accounting/fiscal-profile').set(authHeader(dono))
      .send({ unitId: UNIT, regimeTributario: 'SIMPLES', icmsContribuinte: false, pisCofinsRegime: 'SIMPLES' });
    expect(perfil.status).toBe(200);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Instrumentado VERMELHO 2026-09-26 como `it.failing`: "Expected: 400 / Received: 201" — a nota com
  // assinatura inválida é importada. A implementação (passo 2.4, pelo BRIEF do 2.3 + F-SIG-1) troca por `it`.
  it.failing('SIG-NFE: NF-e com assinatura que não confere é recusada (400) e nada é escrito', async () => {
    // Controle do cenário: o bloco foi mesmo inserido, dentro de <NFe>, irmão de <infNFe>.
    expect(ADULTERADA).toMatch(/<\/infNFe>\s*<Signature xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#">/);

    const res = await request(app).post('/api/nfe/purchase').set(authHeader(dono))
      .field('unitId', UNIT).field('itemMappings', MAPPINGS)
      .attach('file', Buffer.from(ADULTERADA, 'utf8'), { filename: 'nfe.xml', contentType: 'text/xml' });

    expect(res.status).toBe(400);
    expect(await prisma.payable.count({ where: { userId: dono.id } })).toBe(0);
  });
});
