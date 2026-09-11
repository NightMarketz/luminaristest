/**
 * AccountingContactService — cadastro do contador (BE-INCR-CONTADOR-DELIVERY, itens 1-3, 12, 14).
 * Unit: repos e auditoria são dublês; o que se prova aqui é ORDEM (policy antes de dado), tradução
 * de erro (cross-tenant → NotFound) e o conteúdo do payload de auditoria (PII fora).
 */
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { AccountingContactService } from '@/features/accounting/services/AccountingContactService';
import type { IAccountingContactRepository } from '@/features/accounting/repositories/IAccountingContactRepository';
import type { IAccountingPolicy } from '@/features/accounting/policies/IAccountingPolicy';
import type { AuditService } from '@/features/accounting/services/AuditService';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import {
  ACCOUNTING_CONTACT_ARCHIVED,
  ACCOUNTING_CONTACT_REGISTERED,
} from '@/features/accounting/models/AccountingContact.model';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');

const contactRow = {
  id: 'contact-1',
  userId: 'dono-a',
  unitId: 'unit-1',
  name: 'Contabilidade Silva',
  email: 'silva@exemplo.com.br',
  crcNumber: 'SP-123456/O-1',
  crcUf: 'SP',
  crcCertificate: 'SP/2026/000123' as string | null,
  crcCertificateValidUntil: new Date('2026-12-31T00:00:00.000Z') as Date | null,
  createdById: 'dono-a',
  createdAt: new Date('2026-09-10T12:00:00Z'),
  updatedAt: new Date('2026-09-10T12:00:00Z'),
  deletedAt: null as Date | null,
};

function build(opts: { canManage?: boolean; canRead?: boolean; found?: typeof contactRow | null } = {}) {
  const auditAppend = jest.fn(async (..._args: unknown[]) => undefined);
  const create = jest.fn(async () => contactRow);
  const update = jest.fn(async () => ({ ...contactRow, deletedAt: new Date() }));
  const findById = jest.fn(async () => (opts.found === undefined ? contactRow : opts.found));
  const findManyByUnit = jest.fn(async () => [contactRow]);
  const runTransaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ tx: true }));

  const repo = {
    create,
    findById,
    findManyByUnit,
    update,
    runTransaction,
  } as unknown as IAccountingContactRepository;
  const policy = {
    canManageAccountingContact: () => opts.canManage ?? true,
    canReadAccountingContact: () => opts.canRead ?? true,
  } as unknown as IAccountingPolicy;
  const audit = { append: auditAppend } as unknown as AuditService;

  return {
    service: new AccountingContactService(repo, audit, policy),
    create,
    findById,
    findManyByUnit,
    update,
    auditAppend,
  };
}

describe('AccountingContactService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ------------------------------------------------------------------ policy-first
  it('canManage=false lança ForbiddenError ANTES de tocar o repositório', async () => {
    const { service, create } = build({ canManage: false });
    await expect(
      service.registerContact(scope, {
        unitId: 'unit-1',
        name: 'X',
        email: 'x@y.com',
        crcNumber: '1',
        crcUf: 'SP',
      }),
    ).rejects.toThrow(ForbiddenError);
    expect(create).not.toHaveBeenCalled();
  });

  it('canRead=false lança ForbiddenError ANTES de listar', async () => {
    const { service, findManyByUnit } = build({ canRead: false });
    await expect(service.listContacts(scope)).rejects.toThrow(ForbiddenError);
    expect(findManyByUnit).not.toHaveBeenCalled();
  });

  // ------------------------------------------------------------------ D5 — PII fora da trilha
  it('registerContact audita contactId + crc e NUNCA name/email (D5)', async () => {
    const { service, auditAppend } = build();
    await service.registerContact(scope, {
      unitId: 'unit-1',
      name: 'Contabilidade Silva',
      email: 'silva@exemplo.com.br',
      crcNumber: 'SP-123456/O-1',
      crcUf: 'SP',
    });

    expect(auditAppend).toHaveBeenCalledTimes(1);
    const [, , event] = auditAppend.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { eventType: string; payload: Record<string, unknown> },
    ];
    expect(event.eventType).toBe(ACCOUNTING_CONTACT_REGISTERED);
    expect(event.payload).toEqual({
      contactId: 'contact-1',
      crcNumber: 'SP-123456/O-1',
      crcUf: 'SP',
    });
    // A asserção que morde: qualquer valor de PII no payload reprova, venha em que chave vier.
    const serialized = JSON.stringify(event.payload);
    expect(serialized).not.toContain('Contabilidade Silva');
    expect(serialized).not.toContain('silva@exemplo.com.br');
  });

  it('a escrita e o evento saem na MESMA tx (o append recebe o handle da tx)', async () => {
    const { service, auditAppend } = build();
    await service.registerContact(scope, {
      unitId: 'unit-1',
      name: 'X',
      email: 'x@y.com',
      crcNumber: '1',
      crcUf: 'SP',
    });
    expect(auditAppend.mock.calls[0]![0]).toEqual({ tx: true });
  });

  // ------------------------------------------------------------------ cross-tenant (D8/ACC-CD-4)
  it('id de outro escopo vira NotFoundError, NUNCA ForbiddenError (403 confirmaria a existência)', async () => {
    const { service } = build({ found: null });
    await expect(service.getContact(scope, 'contact-de-outro-tenant')).rejects.toThrow(NotFoundError);
    await expect(service.getContact(scope, 'contact-de-outro-tenant')).rejects.not.toThrow(
      ForbiddenError,
    );
  });

  // ------------------------------------------------------------------ arquivar (soft)
  it('archiveContact é soft (deletedAt) e audita só o contactId', async () => {
    const { service, update, auditAppend } = build();
    await service.archiveContact(scope, 'contact-1');

    expect(update).toHaveBeenCalledTimes(1);
    const [, , data] = update.mock.calls[0] as unknown as [unknown, string, { deletedAt: Date }];
    expect(data.deletedAt).toBeInstanceOf(Date);
    const [, , event] = auditAppend.mock.calls[0] as unknown as [
      unknown,
      unknown,
      { eventType: string; payload: Record<string, unknown> },
    ];
    expect(event.eventType).toBe(ACCOUNTING_CONTACT_ARCHIVED);
    expect(event.payload).toEqual({ contactId: 'contact-1' });
  });

  it('arquivar de novo é NotFoundError — a leitura é de linha VIVA, não no-op silencioso', async () => {
    const { service } = build({ found: null });
    await expect(service.archiveContact(scope, 'contact-1')).rejects.toThrow(NotFoundError);
  });

  // ------------------------------------------------------------------ update parcial
  it('updateContact só envia os campos presentes no DTO (patch, não substituição)', async () => {
    const { service, update } = build();
    await service.updateContact(scope, 'contact-1', {
      unitId: 'unit-1',
      contactId: 'contact-1',
      email: 'novo@exemplo.com.br',
    });
    const [, , data] = update.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>];
    expect(data).toEqual({ email: 'novo@exemplo.com.br' });
  });

  // Review-delta M7: o ramo `null` virava `new Date('nullT00:00:00.000Z')` (Invalid Date) sem que
  // teste nenhum notasse. `null` LIMPA a coluna; `undefined` não entra no patch.
  it('updateContact traduz null das duas colunas do J930 10/11 para coluna null, e undefined não mexe', async () => {
    const { service, update } = build();
    await service.updateContact(scope, 'contact-1', {
      unitId: 'unit-1',
      contactId: 'contact-1',
      crcCertificate: null,
      crcCertificateValidUntil: null,
    });
    const [, , data] = update.mock.calls[0] as unknown as [unknown, string, Record<string, unknown>];
    expect(data).toEqual({ crcCertificate: null, crcCertificateValidUntil: null });

    await service.updateContact(scope, 'contact-1', {
      unitId: 'unit-1',
      contactId: 'contact-1',
      crcCertificateValidUntil: '2027-01-31',
    });
    const [, , data2] = update.mock.calls[1] as unknown as [unknown, string, Record<string, unknown>];
    expect(data2).toEqual({ crcCertificateValidUntil: new Date('2027-01-31T00:00:00.000Z') });
  });

  it('updateContact NÃO emite evento de auditoria (lacuna de spec registrada, não esquecimento)', async () => {
    const { service, auditAppend } = build();
    await service.updateContact(scope, 'contact-1', {
      unitId: 'unit-1',
      contactId: 'contact-1',
      crcNumber: 'RJ-9',
    });
    // O BRIEF (item 14) não listou `contact.updated` na allowlist, e canonicalizeAuditPayload LANÇA
    // para eventType desconhecido. Este teste CONGELA a decisão: quando o dono ratificar o evento,
    // ele falha e obriga a atualizar allowlist + serviço juntos.
    expect(auditAppend).not.toHaveBeenCalled();
  });
});
