import { readFile } from 'fs/promises';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../../../lib/errors';
import { htmlToPdf } from '../../../lib/pdf';
import * as storage from '../../../lib/attachmentStorage';
import { readDanfeModel } from '../../../lib/danfe/danfeModel';
import { DANFE_PDF_MARGIN, renderDanfeHtml } from '../../../lib/danfe/danfeHtml';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IDocumentAttachmentRepository } from '../repositories/IDocumentAttachmentRepository';

/** Bytes + metadados do DANFE gerado, no molde de `ReceiptArtifact`. */
export interface DanfeArtifact {
  buffer: Buffer;
  fileName: string;
  mimeType: 'application/pdf';
}

/** cl. 9ª §1º do Aj. SINIEF 07/05 (`[DANFE-BASE]`): o DANFE só sai depois da Autorização de Uso (I10). */
const STATUS_AUTORIZADOS = new Set(['AUTHORIZED', 'AUTHORIZED_DIVERGENT']);

/**
 * NFE-DANFE-IBSCBS PR-3 (itens 17–18, `docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md`) — DANFE da NF-e 55, no molde
 * de `ReceiptService`.
 *
 * LEITURA PURA, SOB DEMANDA (F-DANFE-5 a): busca o `FiscalDocument` pelo repositório com escopo, lê o anexo
 * `xmlAttachmentId` (o `nfeProc` autorizado) e chama `readDanfeModel` → `renderDanfeHtml` → `htmlToPdf`. Não grava nada
 * e não emite evento de auditoria. Invariante de origem (I1): o DANFE sai SÓ do XML — nenhuma coluna do
 * `FiscalDocument` (valores, chave, número) entra no model; o documento serve só para achar o anexo e para os gates.
 */
export class DanfeService {
  constructor(
    private readonly fiscalDocuments: IFiscalDocumentRepository,
    private readonly attachments: IDocumentAttachmentRepository,
    private readonly policy: IAccountingPolicy,
    /** F-LP-4 (a): tabela `NFE_CSTAT_AUTORIZADA` dos gates do `readDanfeModel` (os mesmos do `parseNfe`). */
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  public async gerar(scope: AccountingScope, fiscalDocumentId: string): Promise<DanfeArtifact> {
    if (!this.policy.canReadFiscalDocument(scope)) throw new ForbiddenError('Você não tem permissão para ler documentos fiscais.');

    const doc = await this.fiscalDocuments.findById(scope, fiscalDocumentId);
    if (!doc) throw new NotFoundError(`Documento fiscal '${fiscalDocumentId}' não encontrado.`);

    // I8: só modelo 55. NFC-e: o DANFE é do BRIEF de FE (F-NFCE-E1-6 b, F-DANFE-2 a).
    if (doc.kind === 'NFCE') throw new AppError('O DANFE NFC-e é gerado pelo frontend.', 422, 'DANFE_NFCE_NO_FE');
    if (doc.kind !== 'NFE') throw new AppError('DANFE só para NF-e modelo 55.', 422, 'DANFE_SO_NFE');
    if (!STATUS_AUTORIZADOS.has(doc.status)) {
      throw new ConflictError(`DANFE só para documento autorizado (status ${doc.status}).`, 'DANFE_DOCUMENTO_NAO_AUTORIZADO');
    }

    const xml = await this.lerXml(scope, doc.xmlAttachmentId);
    const model = readDanfeModel(xml, await this.legalParams.fotografia(['NFE_CSTAT_AUTORIZADA']));
    const buffer = await htmlToPdf(renderDanfeHtml(model), { margin: DANFE_PDF_MARGIN });
    return { buffer, fileName: `danfe-${model.chave}.pdf`, mimeType: 'application/pdf' };
  }

  /** O `nfeProc` guardado (X10a EMENDA-1 E-5). Sem anexo ou com o anexo apagado ⇒ 409 `DANFE_SEM_XML`. */
  private async lerXml(scope: AccountingScope, xmlAttachmentId: string | null): Promise<Buffer> {
    const att = xmlAttachmentId ? await this.attachments.findById(scope, xmlAttachmentId) : null;
    if (!att) throw new ConflictError('Documento autorizado sem o XML anexado; o DANFE não pode ser gerado.', 'DANFE_SEM_XML');
    return readFile(storage.resolveReadPath(att.storageKey));
  }
}
