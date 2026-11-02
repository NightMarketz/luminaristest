import type { FiscalDocument } from 'generated/prisma';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { DfeEmissorPort, EmissaoResult, EmitirInput } from '../dfe/DfeEmissorPort';
import { isSessaoPscVencida } from '../dfe/AssinadorRemotoPort';

/** F-ADN-5 a — quem aplica o resultado síncrono do envio (o `applyResult` do ciclo). */
export type DfeResultApplier = (scope: AccountingScope, doc: FiscalDocument, result: EmissaoResult) => Promise<void>;

/**
 * Envio pós-commit de UMA tentativa — criação (`FiscalDocumentEmissionService.createAndSend`) e reenvio
 * (`FiscalDocumentLifecycleService`). `doc` é o documento já em `SENT` na tentativa que sai.
 *
 * - Falha de rede ⇒ fica `SENT` com `errorsJson` (`failCode`), sem tentativa automática (item 20).
 * - O PSC recusou por sessão vencida (CREDENCIAL_EXPIRADA/REVOGADA) ⇒ `PENDING_SIGNATURE` mantendo o número
 *   (E-13, F-PSC-6 a); nada foi ao fisco.
 * - Adaptador com `resultadoSincrono` ⇒ o retorno é aplicado por `applier` (F-ADN-5 a). Sem ele, o resultado imediato
 *   fica para o polling, como antes. Falha ao aplicar não propaga: o documento fica `SENT` e o polling reconsulta.
 */
export async function enviarTentativa(
  repo: Pick<IFiscalDocumentRepository, 'transition'>,
  applier: DfeResultApplier | null,
  scope: AccountingScope,
  doc: FiscalDocument,
  port: DfeEmissorPort,
  input: EmitirInput,
  failCode: string,
): Promise<void> {
  let result: EmissaoResult;
  try {
    result = await port.emitir(input);
  } catch (emitError) {
    const message = emitError instanceof Error ? emitError.message : String(emitError);
    if (isSessaoPscVencida(emitError)) {
      logger.warn('DfeEmissorPort.emitir: sessão do PSC vencida — documento fica PENDING_SIGNATURE', { documentId: doc.id });
      await repo.transition(scope, doc.id, {
        status: 'PENDING_SIGNATURE',
        errorsJson: JSON.stringify([{ code: 'psc_sessao_vencida', message }]),
        whenStatusIn: ['SENT'],
      });
      return;
    }
    logger.error('DfeEmissorPort.emitir falhou — documento fica SENT, sem tentativa automática', { documentId: doc.id, error: message });
    await repo.transition(scope, doc.id, { status: 'SENT', errorsJson: JSON.stringify([{ code: failCode, message }]) });
    return;
  }
  if (!port.capabilities.resultadoSincrono || !applier) return;
  try {
    await applier(scope, { ...doc, status: 'SENT' }, result);
  } catch (applyError) {
    logger.error('dfe_resultado_sincrono: falha ao aplicar o retorno do envio — o polling reconsulta', {
      documentId: doc.id,
      error: applyError instanceof Error ? applyError.message : String(applyError),
    });
  }
}
