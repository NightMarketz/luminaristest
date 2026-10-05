import { Prisma } from 'generated/prisma';
import { PackageAcceptanceService } from '../PackageAcceptanceService';
import type { IPackageAcceptanceRepository } from '../../repositories/IPackageAcceptanceRepository';
import type { IPackageAcceptancePolicy } from '../../policies/IPackageAcceptancePolicy';
import type { IDynamicTableRepository } from '../../../dynamicTables/repositories/IDynamicTableRepository';
import type { IUserRepository } from '../../../users/repositories/IUserRepository';
import type { AccountingScope } from '../../../accounting/scope/AccountingScope';
import { buildValidityNotice } from '../../models/validityNotice';
import {
  ForbiddenError,
  NotFoundError,
  PackageAcceptanceExistsError,
  PackageNoticeChangedError,
  PackageWithoutValidityError,
  ValidationError,
} from '../../../../lib/errors';
import { loadPackageValidityDays, loadSalePackageInfo } from '../../../accounting/sync/bridges/saleItems';
import { htmlToPdf } from '../../../../lib/pdf';

jest.mock('../../../accounting/sync/bridges/saleItems', () => ({
  loadSalePackageInfo: jest.fn(),
  loadPackageValidityDays: jest.fn(),
}));
jest.mock('../../../../lib/pdf', () => ({ htmlToPdf: jest.fn(async (html: string) => Buffer.from(`PDF:${html}`)) }));

const loadInfo = loadSalePackageInfo as jest.Mock;
const loadValidity = loadPackageValidityDays as jest.Mock;
const pdf = htmlToPdf as jest.Mock;

const scope: AccountingScope = {
  ownerUserId: 'owner-1',
  actorUserId: 'actor-1',
  unitId: 'unit-1',
  ledgerCode: 'DEFAULT',
  baseCurrencyCode: 'BRL',
  timeZone: 'America/Sao_Paulo',
};

const SALES_TABLE = 'tbl-sales';
const SALE = { id: 'sale-1', dynamicTableId: SALES_TABLE, data: { unitId: 'unit-1', customerId: 'cust-1', date: '2026-11-25', totalAmount: 250 } };
const NOTICE = buildValidityNotice('2026-11-25', 30)!;

function build(opts: { sale?: unknown; existing?: unknown; policy?: Partial<IPackageAcceptancePolicy>; createError?: unknown } = {}) {
  const repo = {
    findBySale: jest.fn(async () => ('existing' in opts ? opts.existing : null)),
    create: jest.fn(async (_s: AccountingScope, d: Record<string, unknown>) => {
      if (opts.createError) throw opts.createError;
      return { id: 'acc-1', acceptedAt: new Date('2026-11-25T15:00:00.000Z'), ...d };
    }),
  };
  const policy: IPackageAcceptancePolicy = { canRecord: () => true, canRead: () => true, ...opts.policy };
  const tables: Record<string, { id: string }> = { sales: { id: SALES_TABLE }, packages: { id: 'tbl-pkg' }, customers: { id: 'tbl-cust' }, units: { id: 'tbl-units' } };
  const rows: Record<string, { id: string; dynamicTableId: string; data: Record<string, unknown> }> = {
    'sale-1': { ...SALE },
    'cust-1': { id: 'cust-1', dynamicTableId: 'tbl-cust', data: { name: 'Ana Souza' } },
    'unit-1': { id: 'unit-1', dynamicTableId: 'tbl-units', data: { name: 'Matriz' } },
    'pkg-1': { id: 'pkg-1', dynamicTableId: 'tbl-pkg', data: { name: 'Pacote 10' } },
  };
  if ('sale' in opts) rows['sale-1'] = opts.sale as (typeof rows)[string];
  const dt = {
    findTableByInternalName: jest.fn(async (_u: string, n: string) => tables[n] ?? null),
    findDataById: jest.fn(async (id: string) => rows[id] ?? null),
    existsByIdInTable: jest.fn(async (id: string, t: string) => rows[id]?.dynamicTableId === t),
  };
  const users = { getUserById: jest.fn(async () => ({ id: 'actor-1', name: 'Bia', username: 'bia' })) };
  const svc = new PackageAcceptanceService(
    repo as unknown as IPackageAcceptanceRepository,
    policy,
    dt as unknown as IDynamicTableRepository,
    users as unknown as IUserRepository,
  );
  return { svc, repo, dt };
}

const input = { unitId: 'unit-1', saleId: 'sale-1', textVersion: 'v1' as const, textSha256: NOTICE.textSha256 };

beforeEach(() => {
  jest.clearAllMocks();
  loadInfo.mockResolvedValue({ kind: 'Package', packageIds: ['pkg-1'] });
  loadValidity.mockResolvedValue(30);
});

describe('PackageAcceptanceService.create (item 4)', () => {
  it('grava: quem = o ator, venda/cliente/data/prazo do servidor, texto mostrado = o renderizado', async () => {
    const { svc, repo } = build();
    const out = await svc.create(scope, input);
    expect(repo.create).toHaveBeenCalledTimes(1);
    const written = repo.create.mock.calls[0][1] as Record<string, unknown>;
    expect(written).toMatchObject({
      saleId: 'sale-1',
      customerId: 'cust-1',
      packageId: 'pkg-1',
      validityDays: 30,
      textVersion: 'v1',
      textShown: NOTICE.text,
      textSha256: NOTICE.textSha256,
      acceptedByUserId: 'actor-1',
    });
    expect((written.saleDate as Date).toISOString()).toBe('2026-11-25T00:00:00.000Z');
    expect((written.expiresOn as Date).toISOString()).toBe('2026-12-26T00:00:00.000Z');
    expect(out).toMatchObject({ saleId: 'sale-1', expiresOn: '2026-12-26', saleDate: '2026-11-25', acceptedByUserId: 'actor-1' });
  });

  it('data da venda como o MOTOR a grava (ISO à meia-noite UTC) é o MESMO dia-calendário — não o dia anterior em Brasília', async () => {
    // Achado da verificação em build de produção (05/10): o DynamicTable normaliza o campo `date` para
    // '2026-11-25T00:00:00.000Z'; converter esse instante para America/Sao_Paulo daria 24/11 e o hash nunca bateria.
    const { svc, repo } = build({ sale: { ...SALE, data: { ...SALE.data, date: '2026-11-25T00:00:00.000Z' } } });
    await svc.create(scope, input);
    const written = repo.create.mock.calls[0][1] as Record<string, unknown>;
    expect((written.saleDate as Date).toISOString()).toBe('2026-11-25T00:00:00.000Z');
    expect((written.expiresOn as Date).toISOString()).toBe('2026-12-26T00:00:00.000Z');
  });

  it('data da venda que não é dia-calendário (lixo, 2026-02-30) → 400, nunca "hoje"', async () => {
    for (const date of ['lixo', '2026-02-30T00:00:00.000Z']) {
      const { svc } = build({ sale: { ...SALE, data: { ...SALE.data, date } } });
      await expect(svc.create(scope, input)).rejects.toBeInstanceOf(ValidationError);
    }
  });

  it('2º aceite da mesma venda → 409 PACKAGE_ACCEPTANCE_EXISTS, sem escrever', async () => {
    const { svc, repo } = build({ existing: { id: 'acc-0' } });
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(PackageAcceptanceExistsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('corrida: P2002 do @@unique vira o mesmo 409', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'test' });
    const { svc } = build({ createError: p2002 });
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(PackageAcceptanceExistsError);
  });

  it('hash diferente (o texto mudou entre mostrar e aceitar) → 409 PACKAGE_NOTICE_CHANGED, sem escrever', async () => {
    const { svc, repo } = build();
    await expect(svc.create(scope, { ...input, textSha256: 'b'.repeat(64) })).rejects.toBeInstanceOf(PackageNoticeChangedError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('o prazo mudou no catálogo depois da exibição → o hash não bate (409 CHANGED)', async () => {
    loadValidity.mockResolvedValue(60);
    const { svc } = build();
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(PackageNoticeChangedError);
  });

  it.each([null, 0])('pacote sem validade (%s) → 400 PACKAGE_WITHOUT_VALIDITY', async (v) => {
    loadValidity.mockResolvedValue(v);
    const { svc, repo } = build();
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(PackageWithoutValidityError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('venda que não é de pacote → 400', async () => {
    loadInfo.mockResolvedValue({ kind: 'Service', packageIds: [] });
    const { svc } = build();
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(ValidationError);
  });

  it('venda com mais de um pacote → 400 (um packageId por venda)', async () => {
    loadInfo.mockResolvedValue({ kind: 'Package', packageIds: ['pkg-1', 'pkg-2'] });
    const { svc } = build();
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(ValidationError);
  });

  it('venda sem cliente → 400', async () => {
    const { svc } = build({ sale: { ...SALE, data: { ...SALE.data, customerId: undefined } } });
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(ValidationError);
  });

  it('venda de outra unidade ou de outra tabela (outro tenant) → 404, sem enumerar', async () => {
    const otherUnit = build({ sale: { ...SALE, data: { ...SALE.data, unitId: 'unit-9' } } });
    await expect(otherUnit.svc.create(scope, input)).rejects.toBeInstanceOf(NotFoundError);
    const otherTenant = build({ sale: { ...SALE, dynamicTableId: 'tbl-de-outro-tenant' } });
    await expect(otherTenant.svc.create(scope, input)).rejects.toBeInstanceOf(NotFoundError);
    const missing = build({ sale: undefined });
    await expect(missing.svc.create(scope, input)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('sem permissão → 403 antes de ler qualquer coisa', async () => {
    const { svc, dt } = build({ policy: { canRecord: () => false } });
    await expect(svc.create(scope, input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(dt.findTableByInternalName).not.toHaveBeenCalled();
  });
});

describe('PackageAcceptanceService.getNotice (item 3)', () => {
  it('devolve o texto, a data e o hash — a mesma fonte que o create recompara', async () => {
    const { svc } = build();
    const n = await svc.getNotice(scope, { packageId: 'pkg-1', saleDate: '2026-11-25' });
    expect(n).toMatchObject({ validityDays: 30, saleDate: '2026-11-25', expiresOn: '2026-12-26', textVersion: 'v1', text: NOTICE.text, textSha256: NOTICE.textSha256 });
  });

  it('pacote sem validade → text/expiresOn/hash nulos (não é erro)', async () => {
    loadValidity.mockResolvedValue(null);
    const { svc } = build();
    const n = await svc.getNotice(scope, { packageId: 'pkg-1', saleDate: '2026-11-25' });
    expect(n).toMatchObject({ validityDays: null, expiresOn: null, text: null, textSha256: null });
  });

  it('pacote que não está no catálogo do tenant → 404 (nunca "sem validade" por engano)', async () => {
    const { svc } = build();
    await expect(svc.getNotice(scope, { packageId: 'pkg-de-outro-tenant', saleDate: '2026-11-25' })).rejects.toBeInstanceOf(NotFoundError);
    expect(loadValidity).not.toHaveBeenCalled();
  });
});

describe('PackageAcceptanceService.getBySale (item 5)', () => {
  it('null quando não há aceite; a linha mapeada quando há', async () => {
    expect(await build().svc.getBySale(scope, 'sale-1')).toBeNull();
    const row = {
      id: 'acc-1', saleId: 'sale-1', customerId: 'cust-1', packageId: 'pkg-1',
      saleDate: new Date('2026-11-25T00:00:00.000Z'), validityDays: 30, expiresOn: new Date('2026-12-26T00:00:00.000Z'),
      textVersion: 'v1', textShown: 't', textSha256: 'h', acceptedByUserId: 'actor-1', acceptedAt: new Date('2026-11-25T15:00:00.000Z'),
    };
    expect(await build({ existing: row }).svc.getBySale(scope, 'sale-1')).toMatchObject({ saleDate: '2026-11-25', expiresOn: '2026-12-26', acceptedAt: '2026-11-25T15:00:00.000Z' });
  });
});

describe('PackageAcceptanceService.generateReceipt (item 13)', () => {
  it('com aceite: a cláusula é o textShown GRAVADO (não o re-renderizado) e traz o aceite', async () => {
    const row = { id: 'acc-1', textShown: 'TEXTO GRAVADO ANTIGO', textVersion: 'v1', acceptedByUserId: 'actor-1', acceptedAt: new Date('2026-11-25T15:00:00.000Z') };
    const { svc } = build({ existing: row });
    const out = await svc.generateReceipt(scope, 'sale-1');
    const html = out.buffer.toString();
    expect(out.mimeType).toBe('application/pdf');
    expect(out.fileName).toBe('comprovante-pacote-sale-1.pdf');
    expect(html).toContain('TEXTO GRAVADO ANTIGO');
    expect(html).toContain('Bia');
    expect(html).toContain('Ana Souza');
    expect(html).toContain('Pacote 10');
    expect(html).toContain('Matriz');
    expect(html).toContain('R$ 250,00');
    expect(html).not.toContain('ACEITE NÃO REGISTRADO');
  });

  it('sem aceite: a cláusula é o notice de agora, com a marca ACEITE NÃO REGISTRADO', async () => {
    const { svc } = build();
    const html = (await svc.generateReceipt(scope, 'sale-1')).buffer.toString();
    expect(html).toContain(NOTICE.text);
    expect(html).toContain('ACEITE NÃO REGISTRADO');
  });

  it('venda que não é de pacote → 400; pacote sem validade → 400; venda de outra unidade → 404 (e nada de PDF)', async () => {
    loadInfo.mockResolvedValueOnce({ kind: 'Product', packageIds: [] });
    await expect(build().svc.generateReceipt(scope, 'sale-1')).rejects.toBeInstanceOf(ValidationError);
    loadValidity.mockResolvedValueOnce(null);
    await expect(build().svc.generateReceipt(scope, 'sale-1')).rejects.toBeInstanceOf(PackageWithoutValidityError);
    await expect(build({ sale: { ...SALE, data: { ...SALE.data, unitId: 'unit-9' } } }).svc.generateReceipt(scope, 'sale-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(pdf).not.toHaveBeenCalled();
  });

  it('nome de linha de outro tenant não vaza: o id volta no lugar do nome', async () => {
    const { svc, dt } = build();
    dt.existsByIdInTable.mockImplementation(async (id: string) => id === 'sale-1' ? true : false);
    const html = (await svc.generateReceipt(scope, 'sale-1')).buffer.toString();
    expect(html).not.toContain('Ana Souza');
    expect(html).toContain('cust-1');
  });
});
