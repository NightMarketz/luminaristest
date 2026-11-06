/**
 * FIX-TESTES item 4, lote 2 (BRIEF `FIX-TESTES-REPO-FALSO-POR-ROTA`, itens 3–4): 8 das 16 escritas cadastrais que não
 * tinham `request(app)` em integração (`docs/operating-manual/COBERTURA-ROTAS-CONTABIL-2026-11-05.md`) — o bloco do
 * cadastro fiscal e referencial: de-para referencial (PUT, batch, copy, DELETE), import do catálogo RFB, perfil fiscal do
 * serviço (PUT, DELETE) e DELETE de PSC.
 *
 * Cada rota: caminho feliz pela HTTP (`makeApp` + `authHeader`, policy, auditoria e repositório reais, SQLite de
 * integração) com 2ª leitura depois da escrita, e uma guarda no estado em que ela morde (A2). Não repete os valores dos
 * units (A1).
 *
 * O que vem por `prisma.*`: usuário (o ADMIN do catálogo precisa da linha) e a leitura de conferência. O plano de contas
 * nasce pela rota `GET /api/accounting/accounts`; o catálogo, pela rota de import; o PSC, pela rota de cadastro.
 */
import request from 'supertest';
import { randomBytes } from 'node:crypto';
import { Role } from '@/features/users/models/User.model';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';

const app = makeApp();
type U = { id: string; username: string; role?: Role };

async function criarUsuario(tag: string, role: Role = Role.USER): Promise<U> {
  const u = await prisma.user.create({
    data: { name: tag, username: tag, email: `${tag}@test.local`, password: 'x', role },
  });
  return { id: u.id, username: u.username, role };
}

/** Unidade com o plano padrão semeado pela rota de listagem de contas; devolve `code → id`. */
async function unidadeComPlano(u: U, unitId: string): Promise<Record<string, string>> {
  await seedUnit({ userId: u.id, id: unitId });
  const res = await request(app).get('/api/accounting/accounts').query({ unitId }).set(authHeader(u));
  expect(res.status).toBe(200);
  const contas = await prisma.account.findMany({ where: { userId: u.id, unitId, deletedAt: null } });
  return Object.fromEntries(contas.map((c) => [c.code, c.id]));
}

/** De-para de uma versão pela rota de leitura, como `accountId → código|rótulo`. */
async function deParaLido(u: U, unitId: string, version: string): Promise<Record<string, string>> {
  const res = await request(app).get('/api/accounting/referential/mappings').query({ unitId, version }).set(authHeader(u));
  expect(res.status).toBe(200);
  return Object.fromEntries(
    (res.body.data as Array<{ accountId: string; referentialCode: string; label: string }>).map((m) => [
      m.accountId,
      `${m.referentialCode}|${m.label}`,
    ]),
  );
}

const csv = (linhas: string[]) => Buffer.from(['code,name,isAnalytic,parentCode', ...linhas].join('\n') + '\n', 'utf8');

const importar = (admin: U, unitId: string, layoutVersion: string, arquivo: Buffer) =>
  request(app)
    .post('/api/accounting/referential/catalog/import')
    .set(authHeader(admin))
    .field('unitId', unitId)
    .field('layoutVersion', layoutVersion)
    .attach('file', arquivo, { filename: 'catalogo.csv', contentType: 'text/csv' });

const eventos = (eventType: string, targetId?: string) =>
  prisma.auditEvent.count({ where: { eventType, ...(targetId ? { targetId } : {}) } });

beforeAll(() => {
  pushTestSchema();
}, 120000);

afterAll(async () => {
  await prisma.$disconnect();
});

// ── 1–4. De-para referencial: PUT, POST batch, POST copy, DELETE ─────────────────────────────────────────────────
describe('de-para referencial: PUT|DELETE /referential/mappings, POST /mappings/batch, /mappings/copy', () => {
  let dono: U;
  let admin: U;
  const ADMIN_UNIT = 'unit-l2-ref-admin';

  const put = (unitId: string, accountId: string, mappingVersion: string, referentialCode: string, label: string) =>
    request(app)
      .put('/api/accounting/referential/mappings')
      .set(authHeader(dono))
      .send({ unitId, accountId, mappingVersion, referentialCode, label });
  const lote = (unitId: string, mappingVersion: string, items: Array<{ accountId: string; referentialCode: string; label: string }>) =>
    request(app).post('/api/accounting/referential/mappings/batch').set(authHeader(dono)).send({ unitId, mappingVersion, items });
  const copiar = (unitId: string, fromVersion: string, toVersion: string) =>
    request(app).post('/api/accounting/referential/mappings/copy').set(authHeader(dono)).send({ unitId, fromVersion, toVersion });
  const apagar = (unitId: string, accountId: string, mappingVersion: string) =>
    request(app).delete('/api/accounting/referential/mappings').query({ unitId, accountId, mappingVersion }).set(authHeader(dono));

  beforeAll(async () => {
    dono = await criarUsuario('l2-ref');
    admin = await criarUsuario('l2-ref-admin', Role.ADMIN);
    await seedUnit({ userId: admin.id, id: ADMIN_UNIT });
    // Catálogo da versão L2-CAT: um sintético e um analítico, pela rota de import.
    const imp = await importar(admin, ADMIN_UNIT, 'L2-CAT', csv(['7.01,Grupo L2,false,', '7.01.03,Bancos L2 (nome oficial),true,7.01']));
    expect(imp.status).toBe(201);
  }, 120000);

  it('PUT 200 sem catálogo: a releitura tem o código e o rótulo do usuário; o 2º PUT da mesma conta troca o código no lugar', async () => {
    const UNIT = 'unit-l2-ref-put';
    const contas = await unidadeComPlano(dono, UNIT);

    expect((await put(UNIT, contas['1.1.1.01'], 'L2-LIVRE', '9.10.20', 'Caixa (usuário)')).status).toBe(200);
    expect(await deParaLido(dono, UNIT, 'L2-LIVRE')).toEqual({ [contas['1.1.1.01']]: '9.10.20|Caixa (usuário)' });

    expect((await put(UNIT, contas['1.1.1.01'], 'L2-LIVRE', '9.10.21', 'Caixa (usuário)')).status).toBe(200);
    expect(await deParaLido(dono, UNIT, 'L2-LIVRE')).toEqual({ [contas['1.1.1.01']]: '9.10.21|Caixa (usuário)' });
  });

  it('guarda do PUT: versão com catálogo carregado → destino sintético 400 sem gravar; destino analítico grava o rótulo do catálogo', async () => {
    const UNIT = 'unit-l2-ref-put-cat';
    const contas = await unidadeComPlano(dono, UNIT);

    const sintetico = await put(UNIT, contas['1.1.1.01'], 'L2-CAT', '7.01', 'qualquer');
    expect(sintetico.status).toBe(400);
    expect(JSON.stringify(sintetico.body)).toContain('sintética');
    expect(await deParaLido(dono, UNIT, 'L2-CAT')).toEqual({});

    expect((await put(UNIT, contas['1.1.1.01'], 'L2-CAT', '7.01.03', 'rótulo digitado')).status).toBe(200);
    expect(await deParaLido(dono, UNIT, 'L2-CAT')).toEqual({ [contas['1.1.1.01']]: '7.01.03|Bancos L2 (nome oficial)' });
  });

  it('batch 200: as duas folhas entram na mesma versão e a releitura tem as duas', async () => {
    const UNIT = 'unit-l2-ref-lote';
    const contas = await unidadeComPlano(dono, UNIT);

    const res = await lote(UNIT, 'L2-LOTE', [
      { accountId: contas['1.1.1.01'], referentialCode: '8.1', label: 'Caixa L2' },
      { accountId: contas['3.1'], referentialCode: '8.3', label: 'Receita L2' },
    ]);
    expect(res.status).toBe(200);
    expect(await deParaLido(dono, UNIT, 'L2-LOTE')).toEqual({
      [contas['1.1.1.01']]: '8.1|Caixa L2',
      [contas['3.1']]: '8.3|Receita L2',
    });
  });

  it('guarda do batch: a conta A já mapeada e o 2º item numa conta sintética → 400 e A fica com o código antigo (tudo ou nada)', async () => {
    const UNIT = 'unit-l2-ref-lote-rb';
    const contas = await unidadeComPlano(dono, UNIT);
    const sintetica = (await prisma.account.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, acceptsEntries: false } })).id;
    expect((await put(UNIT, contas['1.1.1.01'], 'L2-LOTE-RB', '8.1.ANTIGO', 'Caixa antiga')).status).toBe(200);

    const res = await lote(UNIT, 'L2-LOTE-RB', [
      { accountId: contas['1.1.1.01'], referentialCode: '8.1.NOVO', label: 'Caixa nova' },
      { accountId: sintetica, referentialCode: '8.9', label: 'Grupo' },
    ]);
    expect(res.status).toBe(400);
    expect(await deParaLido(dono, UNIT, 'L2-LOTE-RB')).toEqual({ [contas['1.1.1.01']]: '8.1.ANTIGO|Caixa antiga' });
  });

  it('copy 200: a versão de destino relida tem as mesmas contas e códigos da origem, e a origem fica intacta', async () => {
    const UNIT = 'unit-l2-ref-copia';
    const contas = await unidadeComPlano(dono, UNIT);
    expect((await put(UNIT, contas['1.1.1.01'], 'L2-ORIG', '6.1', 'Caixa 6')).status).toBe(200);
    expect((await put(UNIT, contas['3.1'], 'L2-ORIG', '6.3', 'Receita 6')).status).toBe(200);

    const res = await copiar(UNIT, 'L2-ORIG', 'L2-DEST');
    expect(res.status).toBe(200);
    const origem = await deParaLido(dono, UNIT, 'L2-ORIG');
    expect(await deParaLido(dono, UNIT, 'L2-DEST')).toEqual(origem);
    expect(Object.keys(origem)).toHaveLength(2);
  });

  it('guarda do copy: destino com catálogo carregado que não tem o código da origem → 400 e o destino fica vazio', async () => {
    const UNIT = 'unit-l2-ref-copia-cat';
    const contas = await unidadeComPlano(dono, UNIT);
    expect((await put(UNIT, contas['1.1.1.01'], 'L2-ORIG2', '7.01.03', 'Bancos L2 (nome oficial)')).status).toBe(200);
    expect((await put(UNIT, contas['3.1'], 'L2-ORIG2', '6.3.FORA', 'Fora do catálogo')).status).toBe(200);

    const res = await copiar(UNIT, 'L2-ORIG2', 'L2-CAT');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('não existe no catálogo');
    expect(await deParaLido(dono, UNIT, 'L2-CAT')).toEqual({});
  });

  it('DELETE 200: a releitura da versão não tem mais a conta e a trilha tem um unset', async () => {
    const UNIT = 'unit-l2-ref-del';
    const contas = await unidadeComPlano(dono, UNIT);
    expect((await put(UNIT, contas['3.1'], 'L2-DEL', '5.3', 'Receita 5')).status).toBe(200);
    const id = (await prisma.referentialMapping.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, mappingVersion: 'L2-DEL' } })).id;

    const res = await apagar(UNIT, contas['3.1'], 'L2-DEL');
    expect(res.status).toBe(200);
    expect(await deParaLido(dono, UNIT, 'L2-DEL')).toEqual({});
    expect(await eventos('referential.mapping.unset', id)).toBe(1);
  });

  it('guarda do DELETE: de-para já apagado → 404 e a trilha não ganha 2º unset', async () => {
    const UNIT = 'unit-l2-ref-del2';
    const contas = await unidadeComPlano(dono, UNIT);
    expect((await put(UNIT, contas['3.1'], 'L2-DEL2', '5.3', 'Receita 5')).status).toBe(200);
    const id = (await prisma.referentialMapping.findFirstOrThrow({ where: { userId: dono.id, unitId: UNIT, mappingVersion: 'L2-DEL2' } })).id;
    expect((await apagar(UNIT, contas['3.1'], 'L2-DEL2')).status).toBe(200);

    const res = await apagar(UNIT, contas['3.1'], 'L2-DEL2');
    expect(res.status).toBe(404);
    expect(await eventos('referential.mapping.unset', id)).toBe(1);
  });
});

// ── 5. POST /api/accounting/referential/catalog/import ───────────────────────────────────────────────────────────
describe('POST /api/accounting/referential/catalog/import', () => {
  const UNIT = 'unit-l2-cat';
  let admin: U;
  const lido = async (version: string) => {
    const res = await request(app).get('/api/accounting/referential/catalog').query({ unitId: UNIT, version }).set(authHeader(admin));
    expect(res.status).toBe(200);
    return Object.fromEntries(
      (res.body.data as Array<{ code: string; name: string; isAnalytic: boolean; parentCode: string | null }>).map((a) => [
        a.code,
        `${a.name}|${a.isAnalytic ? 'A' : 'S'}|${a.parentCode ?? ''}`,
      ]),
    );
  };

  beforeAll(async () => {
    admin = await criarUsuario('l2-cat-admin', Role.ADMIN);
    await seedUnit({ userId: admin.id, id: UNIT });
  }, 120000);

  it('201: a releitura do catálogo tem as 3 contas com o indicador e o pai do arquivo; reimportar troca o nome no lugar', async () => {
    const res = await importar(admin, UNIT, 'L2-IMP', csv(['4.02,Passivo L2,false,', '4.02.01,Fornecedores L2,true,4.02', '4.02.02,Salários L2,1,4.02']));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ layoutVersion: 'L2-IMP', imported: 3, analyticCount: 2, syntheticCount: 1 });
    expect(await lido('L2-IMP')).toEqual({
      '4.02': 'Passivo L2|S|',
      '4.02.01': 'Fornecedores L2|A|4.02',
      '4.02.02': 'Salários L2|A|4.02',
    });

    expect((await importar(admin, UNIT, 'L2-IMP', csv(['4.02.01,Fornecedores nacionais L2,true,4.02']))).status).toBe(201);
    expect(await lido('L2-IMP')).toMatchObject({ '4.02.01': 'Fornecedores nacionais L2|A|4.02' });
    expect(await prisma.referentialAccount.count({ where: { layoutVersion: 'L2-IMP' } })).toBe(3);
  });

  it('guarda: versão já importada + arquivo novo com 1 linha boa e 1 código duplicado → 400 e o catálogo relido não muda', async () => {
    expect((await importar(admin, UNIT, 'L2-IMP2', csv(['5.01,Ativo L2,false,', '5.01.01,Caixa L2,true,5.01']))).status).toBe(201);
    const antes = await lido('L2-IMP2');

    const res = await importar(admin, UNIT, 'L2-IMP2', csv(['5.01.01,Caixa renomeada,true,5.01', '5.01.09,Nova,true,5.01', '5.01.09,Nova de novo,true,5.01']));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('duplicado');
    expect(await lido('L2-IMP2')).toEqual(antes);
  });
});

// ── 6–7. Perfil fiscal do serviço: PUT, DELETE /service-fiscal-profiles/:serviceRef ──────────────────────────────
describe('PUT|DELETE /api/accounting/service-fiscal-profiles/:serviceRef', () => {
  const UNIT = 'unit-l2-sfp';
  let dono: U;
  const url = (ref: string) => `/api/accounting/service-fiscal-profiles/${ref}`;
  const put = (ref: string, body: Record<string, unknown>) => request(app).put(url(ref)).set(authHeader(dono)).send({ unitId: UNIT, ...body });
  const ler = (ref: string) => request(app).get(url(ref)).query({ unitId: UNIT }).set(authHeader(dono));
  const apagar = (ref: string) => request(app).delete(url(ref)).query({ unitId: UNIT }).set(authHeader(dono));

  beforeAll(async () => {
    dono = await criarUsuario('l2-sfp');
    await seedUnit({ userId: dono.id, id: UNIT });
  }, 120000);

  it('PUT 200: a releitura tem o perfil gravado; o 2º PUT sem finalidade mantém a gravada e troca o NBS', async () => {
    expect((await put('drenagem-l2', { cTribNac: '060201', cNBS: '123456789', finalidade: 'ESTETICA' })).status).toBe(200);
    expect((await ler('drenagem-l2')).body.data).toMatchObject({ serviceRef: 'drenagem-l2', cTribNac: '060201', cNBS: '123456789', finalidade: 'ESTETICA', elegivelHospitalar: false });

    expect((await put('drenagem-l2', { cTribNac: '060201', cNBS: '987654321' })).status).toBe(200);
    expect((await ler('drenagem-l2')).body.data).toMatchObject({ cNBS: '987654321', finalidade: 'ESTETICA' });
    expect(await prisma.serviceFiscalProfile.count({ where: { userId: dono.id, unitId: UNIT, serviceRef: 'drenagem-l2' } })).toBe(1);
  });

  it('guarda do PUT: perfil já TERAPEUTICA + hospitalar; PUT que só troca a finalidade para BELEZA → 400 e a releitura segue hospitalar', async () => {
    const hosp = { cTribNac: '060201', finalidade: 'TERAPEUTICA', elegivelHospitalar: true, fundamentoHospitalar: 'RDC 50, Atribuição 4, item 4.1' };
    expect((await put('fisio-l2', hosp)).status).toBe(200);

    // O DTO aceita (elegivelHospitalar omitido); só a combinação com o gravado, lida dentro da tx, reprova.
    const res = await put('fisio-l2', { cTribNac: '060201', finalidade: 'BELEZA' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('HOSPITALAR_SO_TERAPEUTICA');
    expect((await ler('fisio-l2')).body.data).toMatchObject({ finalidade: 'TERAPEUTICA', elegivelHospitalar: true });
  });

  it('DELETE 200: a releitura dá 404, a linha fica soft-deleted e um PUT novo do mesmo serviço volta a gravar', async () => {
    expect((await put('massagem-l2', { cTribNac: '060201' })).status).toBe(200);

    expect((await apagar('massagem-l2')).status).toBe(200);
    expect((await ler('massagem-l2')).status).toBe(404);
    // Rename-on-delete: a linha apagada sai do serviceRef e libera o @@unique para o PUT seguinte.
    const apagadas = await prisma.serviceFiscalProfile.findMany({ where: { userId: dono.id, unitId: UNIT, deletedAt: { not: null } } });
    expect(apagadas).toHaveLength(1);
    expect(apagadas[0].serviceRef).not.toBe('massagem-l2');
    expect(await eventos('service_fiscal_profile.deleted', apagadas[0].id)).toBe(1);

    expect((await put('massagem-l2', { cTribNac: '060201' })).status).toBe(200);
    expect((await ler('massagem-l2')).status).toBe(200);
  });

  it('guarda do DELETE: perfil já apagado → 404 e a trilha não ganha 2º evento de exclusão', async () => {
    expect((await put('pele-l2', { cTribNac: '060201' })).status).toBe(200);
    expect((await apagar('pele-l2')).status).toBe(200);
    const antes = await eventos('service_fiscal_profile.deleted');

    const res = await apagar('pele-l2');
    expect(res.status).toBe(404);
    expect(await eventos('service_fiscal_profile.deleted')).toBe(antes);
  });
});

// ── 8. DELETE /api/accounting/psc-providers/:id ──────────────────────────────────────────────────────────────────
describe('DELETE /api/accounting/psc-providers/:id', () => {
  const PADMIN: U = { id: 'l2-psc-padmin', username: 'l2-psc-padmin', role: 'PLATFORM_ADMIN' as Role }; // fora do enum do modelo, como em pscCredential.integration.test.ts:32
  const criar = async (nome: string) => {
    const res = await request(app)
      .post('/api/accounting/psc-providers')
      .set(authHeader(PADMIN))
      .send({ nome, baseUrl: 'https://psc-l2.example/v1/', clientId: `cli-${nome}`, clientSecret: 'segredo-FIXTURE-l2', algoritmos: ['rsa-sha256'] });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  };
  const apagar = (id: string) => request(app).delete(`/api/accounting/psc-providers/${id}`).set(authHeader(PADMIN));
  const listados = async () => {
    const res = await request(app).get('/api/accounting/psc-providers').set(authHeader(PADMIN));
    expect(res.status).toBe(200);
    return (res.body.data as Array<{ id: string }>).map((p) => p.id);
  };

  beforeAll(() => {
    process.env.DFE_PSC_KEYS = `1:${randomBytes(32).toString('base64')}`;
    process.env.DFE_PSC_KEY_ACTIVE = '1';
  });
  afterAll(() => {
    delete process.env.DFE_PSC_KEYS;
    delete process.env.DFE_PSC_KEY_ACTIVE;
  });

  it('204: a listagem relida não tem o PSC, a linha guarda deletedAt e perde o segredo; o outro PSC fica', async () => {
    const fica = await criar('PSC-L2-fica');
    const sai = await criar('PSC-L2-sai');

    const res = await apagar(sai);
    expect(res.status).toBe(204);
    expect(await listados()).toEqual([fica]);
    const linha = await prisma.pscProvider.findUniqueOrThrow({ where: { id: sai } });
    expect(linha.deletedAt).not.toBeNull();
    expect(linha.clientSecretCipher).toBeNull();
    expect(await eventos('psc_provider.removed', sai)).toBe(1);
  });

  it('guarda: PSC já removido → 404, deletedAt não muda e a trilha não ganha 2º evento', async () => {
    const id = await criar('PSC-L2-duas-vezes');
    expect((await apagar(id)).status).toBe(204);
    const antes = (await prisma.pscProvider.findUniqueOrThrow({ where: { id } })).deletedAt;

    const res = await apagar(id);
    expect(res.status).toBe(404);
    expect((await prisma.pscProvider.findUniqueOrThrow({ where: { id } })).deletedAt).toEqual(antes);
    expect(await eventos('psc_provider.removed', id)).toBe(1);
  });
});
