import type { FiscalDocument } from 'generated/prisma';
import logger from '../../../lib/logger';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import { isFalhaDeComunicacao, type DfeEmissorPort, type EmissaoResult, type EmitirInput } from '../dfe/DfeEmissorPort';
import { isAssinaturaPendente, type AssinaturaRemotaError } from '../dfe/AssinadorRemotoPort';

/** F-ADN-5 a — quem aplica o resultado síncrono do envio (o `applyResult` do ciclo). */
export type DfeResultApplier = (scope: AccountingScope, doc: FiscalDocument, result: EmissaoResult) => Promise<void>;

/** X10a PR-9 (decisão 4) — quem re-emite a NFC-e em contingência off-line quando o envio normal falha por comunicação. */
export type DfeContingenciaHandler = (scope: AccountingScope, doc: FiscalDocument, port: DfeEmissorPort, input: EmitirInput) => Promise<void>;

/** `tpEmis` (B22) do payload de NF-e/NFC-e; `null` na DPS. */
function tpEmisDe(payload: unknown): number | null {
  const tpEmis = (payload as { infNFe?: { ide?: { tpEmis?: unknown } } } | null)?.infNFe?.ide?.tpEmis;
  return typeof tpEmis === 'number' ? tpEmis : null;
}

/** Chave de 44 dígitos da NF-e/NFC-e (`infNFe/@Id` sem o prefixo "NFe"); `null` sem Id. */
function chaveDe(payload: unknown): string | null {
  const id = (payload as { infNFe?: { Id?: unknown } } | null)?.infNFe?.Id;
  return typeof id === 'string' && id.length > 3 ? id.slice(3) : null;
}

/**
 * Veredito da consulta da chave original, feita ANTES de entrar na contingência (sefaz_timeout de NFC-e com tpEmis=1):
 * - AUTORIZADA: a SEFAZ já tem a nota ⇒ grava AUTHORIZED com o protocolo dela, sem contingência (sem chave tpEmis 9).
 * - NAO_RECEBIDA: a SEFAZ responde 217 (não consta na base) ⇒ segue a contingência.
 * - INCONCLUSIVA: consulta falhou ou resposta sem veredito ⇒ NÃO entra na contingência; a nota fica SENT para reconsulta
 *   pela mesma chave. AL-9: assinador fora do ar cai aqui também (não liga contingência).
 */
type VereditoDaOriginal = { tipo: 'AUTORIZADA'; result: EmissaoResult } | { tipo: 'NAO_RECEBIDA' } | { tipo: 'INCONCLUSIVA' };

async function consultarOriginal(port: DfeEmissorPort, input: EmitirInput): Promise<VereditoDaOriginal> {
  const chave = chaveDe(input.payload);
  if (!chave) return { tipo: 'INCONCLUSIVA' };
  try {
    const result = await port.consultar(chave, {
      ambiente: input.ambiente,
      ...(input.ctx?.assinatura ? { assinatura: input.ctx.assinatura } : {}),
      ...(input.ctx?.csc ? { csc: input.ctx.csc } : {}),
      payload: input.payload,
    });
    if (result.status === 'AUTHORIZED') return { tipo: 'AUTORIZADA', result };
    if (result.status === 'PROCESSING' && result.errors.some((e) => e.code === '217')) return { tipo: 'NAO_RECEBIDA' };
    return { tipo: 'INCONCLUSIVA' };
  } catch (consultaError) {
    logger.warn('dfe_contingencia: consulta da chave original falhou — documento fica SENT para reconsulta, sem contingência', {
      chave,
      error: consultaError instanceof Error ? consultaError.message : String(consultaError),
    });
    return { tipo: 'INCONCLUSIVA' };
  }
}

/**
 * Envio pós-commit de UMA tentativa — criação (`FiscalDocumentEmissionService.createAndSend`) e reenvio
 * (`FiscalDocumentLifecycleService`). `doc` é o documento já em `SENT` na tentativa que sai.
 *
 * - Falha de rede ⇒ fica `SENT` com `errorsJson` (`failCode`), sem tentativa automática (item 20).
 * - O PSC recusou por sessão vencida (CREDENCIAL_EXPIRADA/REVOGADA) ⇒ `PENDING_SIGNATURE` mantendo o número
 *   (E-13, F-PSC-6 a); nada foi ao fisco.
 * - Adaptador com `resultadoSincrono` ⇒ o retorno é aplicado por `applier` (F-ADN-5 a). Sem ele, o resultado imediato
 *   fica para o polling, como antes. Falha ao aplicar não propaga: o documento fica `SENT` e o polling reconsulta.
 * - X10a PR-9 (E-9; decisão 4 de D-2026-10-29-X10A-PR7-9-FORKS): falha de COMUNICAÇÃO (`DfeTransporteError`, nunca
 *   rejeição) no envio de uma NFC-e normal por adaptador com `contingenciaOffline` ⇒ `contingencia` re-emite a venda
 *   off-line. A NFC-e que JÁ é de contingência (reenvio da rejeitada) volta a `CONTINGENCY`: o job a transmite.
 *   ANTES dessa entrada, consulta a chave original (`consultarOriginal`): autorizada ⇒ grava AUTHORIZED; 217 ⇒ contingência;
 *   consulta falha ou inconclusiva ⇒ fica SENT para reconsulta, sem chave tpEmis 9.
 */
export async function enviarTentativa(
  repo: Pick<IFiscalDocumentRepository, 'transition'>,
  applier: DfeResultApplier | null,
  scope: AccountingScope,
  doc: FiscalDocument,
  port: DfeEmissorPort,
  input: EmitirInput,
  failCode: string,
  contingencia: DfeContingenciaHandler | null = null,
): Promise<void> {
  let result: EmissaoResult;
  try {
    result = await port.emitir(input);
  } catch (emitError) {
    const message = emitError instanceof Error ? emitError.message : String(emitError);
    // EMENDA-4 (F-AL-6 a): o assinador local fora do ar no meio do envio também deixa a nota esperando — sem contingência.
    if (isAssinaturaPendente(emitError)) {
      logger.warn('DfeEmissorPort.emitir: assinatura indisponível (sessão do PSC ou assinador local) — documento fica PENDING_SIGNATURE', { documentId: doc.id });
      await repo.transition(scope, doc.id, {
        status: 'PENDING_SIGNATURE',
        errorsJson: JSON.stringify([{ code: (emitError as AssinaturaRemotaError).code === 'ASSINADOR_INDISPONIVEL' ? 'assinador_indisponivel' : 'psc_sessao_vencida', message }]),
        whenStatusIn: ['SENT'],
      });
      return;
    }
    if (isFalhaDeComunicacao(emitError) && input.kind === 'NFCE' && port.capabilities.contingenciaOffline) {
      const tpEmis = tpEmisDe(input.payload);
      if (tpEmis === 9) {
        await repo.transition(scope, doc.id, {
          status: 'CONTINGENCY',
          errorsJson: JSON.stringify([{ code: failCode, message }]),
          contingenciaSuplJson: null, // o tick gera o QR da chave desta tentativa antes de transmitir
          whenStatusIn: ['SENT'],
        });
        return;
      }
      if (tpEmis === 1 && contingencia) {
        // Antes de qualquer chave tpEmis 9, pergunta à SEFAZ pela original: se ela já está autorizada, a contingência
        // duplicaria a nota (o caso do timeout com a resposta perdida).
        const veredito = await consultarOriginal(port, input);
        if (veredito.tipo === 'AUTORIZADA' && applier) {
          try {
            await applier(scope, { ...doc, status: 'SENT' }, veredito.result);
            return;
          } catch (applyError) {
            logger.error('dfe_contingencia: a original está autorizada, mas falhou ao gravá-la — documento fica SENT', {
              documentId: doc.id,
              error: applyError instanceof Error ? applyError.message : String(applyError),
            });
          }
        } else if (veredito.tipo === 'NAO_RECEBIDA') {
          try {
            await contingencia(scope, doc, port, input);
            return;
          } catch (contError) {
            logger.error('dfe_contingencia: a entrada em contingência falhou — documento fica SENT', {
              documentId: doc.id,
              error: contError instanceof Error ? contError.message : String(contError),
            });
          }
        }
      }
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
