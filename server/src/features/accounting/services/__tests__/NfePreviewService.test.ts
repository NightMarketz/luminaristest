/**
 * NfePreviewService — BE-INCR-NFE-PREVIEW (rodada 2a). Comportamentos 3, 4, 5, 10 e 14:
 *  - policy → parse → lookup, nesta ordem; construtor = (IPayableRepository, IAccountingPolicy);
 *  - erros do parser propagam INALTERADOS (mesmas mensagens do import);
 *  - 403 quando nem canManagePayable nem canReconcile;
 *  - alreadyImported/existingPayableId a partir de `findByDocumentNumber(scope, chaveAcesso)`;
 *  - zero escrita, zero auditoria (o módulo não importa auditCanonical/AuditService).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import * as nfeLib from '../../../../lib/nfe';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';
import { NfePreviewSchema } from '../../dtos/NfeDto';
import { NfePreviewService } from '../NfePreviewService';
import type { IPayableRepository } from '../../repositories/IPayableRepository';
import type { IAccountingPolicy } from '../../policies/IAccountingPolicy';
import type { AccountingScope } from '../../scope/AccountingScope';
import type { Payable } from 'generated/prisma';

const FIXTURE_DIR = join(__dirname, '../../../../lib/__tests__/fixtures/nfe');
const PURCHASE = readFileSync(join(FIXTURE_DIR, 'purchase-multi-item.SYNTHETIC.xml'), 'utf8');
const CHAVE = '35250712345678000195550010000000011000000012';

const scope = { userId: 'user-1', unitId: 'unit-1', actorUserId: 'user-1', timeZone: 'America/Sao_Paulo' } as unknown as AccountingScope;

function build(opts: { existing?: Payable | null; canManage?: boolean; canReconcile?: boolean } = {}) {
  const findByDocumentNumber = jest.fn(async () => opts.existing ?? null);
  const payableRepo = { findByDocumentNumber } as unknown as IPayableRepository;
  const policy = {
    canManagePayable: () => opts.canManage ?? true,
    canReconcile: () => opts.canReconcile ?? false,
  } as unknown as IAccountingPolicy;
  return { service: new NfePreviewService(payableRepo, policy), findByDocumentNumber };
}

describe('NfePreviewService.preview', () => {
  afterEach(() => jest.restoreAllMocks());

  it('CONTROLE: fixture de compra → preview que passa no NfePreviewSchema, alreadyImported=false (comportamento 3)', async () => {
    const { service, findByDocumentNumber } = build();
    const preview = await service.preview(scope, PURCHASE);
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);
    expect(preview.chaveAcesso).toBe(CHAVE);
    expect(preview.itens).toHaveLength(3);
    expect(preview.alreadyImported).toBe(false);
    expect(preview.existingPayableId).toBeNull();
    expect(findByDocumentNumber).toHaveBeenCalledWith(scope, CHAVE);
  });

  it('chama o MESMO parseNfe do import exatamente uma vez (sem segundo parser)', async () => {
    const spy = jest.spyOn(nfeLib, 'parseNfe');
    const { service } = build();
    await service.preview(scope, PURCHASE);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('403 quando nem canManagePayable nem canReconcile; canReconcile sozinho basta (F-PREV-2 → a)', async () => {
    const denied = build({ canManage: false, canReconcile: false });
    await expect(denied.service.preview(scope, PURCHASE)).rejects.toThrow(ForbiddenError);
    expect(denied.findByDocumentNumber).not.toHaveBeenCalled();
    const reconcileOnly = build({ canManage: false, canReconcile: true });
    await expect(reconcileOnly.service.preview(scope, PURCHASE)).resolves.toMatchObject({ chaveAcesso: CHAVE });
  });

  it('erros do parser propagam inalterados e o repositório NÃO é consultado (comportamento 4; policy → parse → lookup)', async () => {
    const { service, findByDocumentNumber } = build();
    const cstat110 = PURCHASE.replace('<cStat>100</cStat>', '<cStat>110</cStat>');
    await expect(service.preview(scope, cstat110)).rejects.toThrow(ValidationError);
    await expect(service.preview(scope, cstat110)).rejects.toThrow(/cStat "110"/);
    const badDv = PURCHASE.replace(/35250712345678000195550010000000011000000012/g, '35250712345678000195550010000000011000000017');
    await expect(service.preview(scope, badDv)).rejects.toThrow(/dígito verificador da chave/);
    await expect(service.preview(scope, '<!DOCTYPE x><NFe/>')).rejects.toThrow(ValidationError);
    expect(findByDocumentNumber).not.toHaveBeenCalled();
  });

  it('alreadyImported=true + existingPayableId quando há título vivo com documentNumber = chave (comportamento 14)', async () => {
    const { service } = build({ existing: { id: 'pay-42' } as Payable });
    const preview = await service.preview(scope, PURCHASE);
    expect(preview.alreadyImported).toBe(true);
    expect(preview.existingPayableId).toBe('pay-42');
    expect(NfePreviewSchema.safeParse(preview).success).toBe(true);
  });

  it('o módulo não importa auditoria nem transação: dry-run por construção (comportamento 10)', () => {
    const src = readFileSync(join(__dirname, '../NfePreviewService.ts'), 'utf8');
    const imports = src.split('\n').filter((l) => l.startsWith('import ')).join('\n');
    expect(imports).not.toMatch(/auditCanonical|AuditService|runTransaction|PostingService|lib\/prisma|AttachmentService/);
    expect(src).not.toMatch(/runTransaction\(|\.create\(|\.update\(|\.delete\(/);
  });
});
