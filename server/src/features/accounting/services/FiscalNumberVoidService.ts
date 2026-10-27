import type { FiscalNumberVoid } from 'generated/prisma';
import { ConflictError, ForbiddenError, ValidationError } from '../../../lib/errors';
import { getFactory } from '../../../lib/factory';
import logger from '../../../lib/logger';
import { isValidCnpj, stripCnpjMask } from '../../../lib/cnpj';
import type { AccountingScope } from '../scope/AccountingScope';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { IFiscalDocumentRepository } from '../repositories/IFiscalDocumentRepository';
import type { IFiscalNumberVoidRepository } from '../repositories/IFiscalNumberVoidRepository';
import { OCCUPYING_VOID_STATUSES } from '../repositories/IFiscalNumberVoidRepository';
import type { FiscalProfileService } from './FiscalProfileService';
import type { AuditService } from './AuditService';
import type { LegalParameterService } from '../../legalParameters/services/LegalParameterService';
import { selectDfeEmissor } from '../dfe/selectDfeEmissor';
import type { DfeAmbiente, InutilizarResult } from '../dfe/DfeEmissorPort';
import { scopeToday } from '../models/dates';
import { ufDoCodMun } from '../models/nfeMontagem';
import { STATUS_QUE_OCUPAM_NUMERO, avisoDeInutilizacao, guardaDaFaixa, lacunasDeNumeracao } from '../models/inutilizacao';
import {
  FiscalNumberVoidViewSchema,
  LacunaDeNumeracaoSchema,
  type FiscalNumberVoidView,
  type LacunaDeNumeracaoView,
  type VoidNumberRangeInput,
} from '../dtos/FiscalDocumentDto';

export const DFE_NUMBER_VOIDED_EVENT = 'dfe.number_voided';

/**
 * BE-INCR-NFCE (nó X10a, itens 24–26; F-NFCE-5 a; EMENDA-3 E3-1 c e E3-2 a) — inutilização de faixa de NF-e/NFC-e e
 * lista das lacunas de numeração. O sistema LISTA, o operador PEDE (nada automático).
 *
 * `inutilizar`: guardas `[NFE-INUT-REGRAS]` (MOC VG §5.3.4, Tabela 5-12) ANTES da porta; a do número usado (241) e a da
 * faixa já pedida/inutilizada (563/256) rodam DENTRO da tx que grava o pedido (memória authoritative-gate-inside-tx); a
 * porta é chamada PÓS-COMMIT (mesma regra do `createAndSend`). Faixa homologada ⇒ `dfe.number_voided` na tx do resultado.
 * Sem tabela de exclusão por UF (E3-1 c): AC/BA/SP depois de 01/11/2026 também chamam a porta — a SEFAZ decide.
 */
export class FiscalNumberVoidService {
  constructor(
    private readonly docRepo: IFiscalDocumentRepository,
    private readonly voidRepo: IFiscalNumberVoidRepository,
    private readonly fiscalProfileService: Pick<FiscalProfileService, 'get'>,
    private readonly policy: IAccountingPolicy,
    private readonly auditService: AuditService,
    private readonly legalParams: Pick<LegalParameterService, 'fotografia'>,
  ) {}

  async inutilizar(scope: AccountingScope, input: Omit<VoidNumberRangeInput, 'unitId'>): Promise<FiscalNumberVoidView> {
    if (!this.policy.canCancelFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para inutilizar numeração de documento fiscal.');
    }
    const selection = selectDfeEmissor(process.env, input.kind);
    if (!selection.enabled || selection.ambiente === null) {
      throw new ValidationError(`dfe_disabled: ${selection.reason}`, { faltantes: [selection.reason ?? 'porta desabilitada'] });
    }
    const port = selection.port;
    if (!port.capabilities.inutilizar || !port.inutilizar) {
      throw new ConflictError(`dfe_inut_nao_suportada: o adaptador '${port.name}' não pede inutilização.`, 'DFE_INUT_NAO_SUPORTADA');
    }
    const ambiente = selection.ambiente as DfeAmbiente;
    const nIni = BigInt(input.nIni);
    const nFin = BigInt(input.nFin);
    const ano = Number(scopeToday(scope).slice(0, 4));

    const fp = await this.fiscalProfileService.get(scope);
    const cnpjEmitente = await this.unitCnpj(scope);
    if (!cnpjEmitente) throw new ValidationError("inut_bloqueada: CNPJ da unidade ausente ou inválido (cadastre em 'units')", null);

    const created = await this.voidRepo.runTransaction(async (tx) => {
      const last = (await this.docRepo.listSequences(scope, input.kind, tx)).find((s) => s.ambiente === ambiente && s.serie === input.serie)?.last ?? 0n;
      const guarda = guardaDaFaixa({ nIni, nFin, ano, anoAtual: ano, last });
      if (guarda) throw new ValidationError(`${guarda.code}: ${guarda.message}`, { faltantes: [guarda.message] });

      const usados = (await this.docRepo.listNumbered(scope, input.kind, { ambiente, serie: input.serie, nIni, nFin }, tx)).filter((d) =>
        STATUS_QUE_OCUPAM_NUMERO.includes(d.status),
      );
      if (usados.length > 0) {
        throw new ConflictError(
          `inut_numero_usado: número(s) ${usados.map((d) => String(d.numero)).join(', ')} da faixa já têm documento (rej. 241).`,
          'INUT_NUMERO_USADO',
        );
      }
      const sobrepostos = await this.voidRepo.findOverlapping(scope, { kind: input.kind, ambiente, serie: input.serie, nIni, nFin }, OCCUPYING_VOID_STATUSES, tx);
      if (sobrepostos.length > 0) {
        throw new ConflictError(
          `inut_faixa_ja_pedida: a faixa cruza pedido(s) ${sobrepostos.map((v) => `${v.nIni}–${v.nFin} (${v.status})`).join(', ')} (rej. 256/563).`,
          'INUT_FAIXA_JA_PEDIDA',
        );
      }
      return this.voidRepo.create(scope, { kind: input.kind, ambiente, serie: input.serie, nIni, nFin, ano, xJust: input.xJust, partner: port.name }, tx);
    });

    let result: InutilizarResult;
    try {
      result = await port.inutilizar({
        kind: input.kind,
        ambiente,
        cnpjEmitente,
        partnerAccountRef: fp?.partnerAccountRef ?? null,
        ano,
        serie: input.serie,
        nIni,
        nFin,
        xJust: input.xJust,
      });
    } catch (portError) {
      const message = portError instanceof Error ? portError.message : String(portError);
      logger.error('DfeEmissorPort.inutilizar falhou — pedido fica REQUESTED', { voidId: created.id, error: message });
      const kept = await this.voidRepo.applyResult(scope, created.id, {
        status: 'REQUESTED',
        errorsJson: JSON.stringify([{ code: 'dfe_inutilizar_failed', message }]),
      });
      return this.toView(kept);
    }

    if (result.status === 'PROCESSING') {
      return this.toView(await this.voidRepo.applyResult(scope, created.id, { status: 'REQUESTED', errorsJson: JSON.stringify(result.errors) }));
    }
    const status: 'HOMOLOGATED' | 'REJECTED' = result.status;
    const applied = await this.voidRepo.runTransaction(async (tx) => {
      const row = await this.voidRepo.applyResult(
        scope,
        created.id,
        { status, nProt: result.nProt ?? null, errorsJson: JSON.stringify(result.errors) },
        tx,
      );
      if (status === 'HOMOLOGATED') {
        await this.auditService.append(tx, scope, {
          actorUserId: scope.actorUserId,
          eventType: DFE_NUMBER_VOIDED_EVENT,
          targetType: 'fiscal_number_void',
          targetId: row.id,
          payload: { voidId: row.id, kind: row.kind, serie: row.serie, nIni: String(row.nIni), nFin: String(row.nFin), ambiente: row.ambiente },
        });
      }
      return row;
    });
    return this.toView(applied);
  }

  /** Item 25 + E3-2 (a) — lacunas de todas as séries e ambientes do tipo, com o aviso da UF na data de hoje. */
  async pendentes(scope: AccountingScope, kind: 'NFE' | 'NFCE'): Promise<LacunaDeNumeracaoView[]> {
    if (!this.policy.canReadFiscalDocument(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler documentos fiscais.');
    }
    const [sequencias, documentos, homologadas, fp] = await Promise.all([
      this.docRepo.listSequences(scope, kind),
      this.docRepo.listNumbered(scope, kind),
      this.voidRepo.listByKind(scope, kind, ['HOMOLOGATED']),
      this.fiscalProfileService.get(scope),
    ]);
    const cUF = fp?.codMun ? ufDoCodMun(fp.codMun).cUF : null;
    const aviso = avisoDeInutilizacao(await this.legalParams.fotografia(['INUT_NAO_SE_APLICA']), kind, cUF, scopeToday(scope));
    return lacunasDeNumeracao({ sequencias, documentos, homologadas, aviso }).map((l) => LacunaDeNumeracaoSchema.parse(l));
  }

  private async unitCnpj(scope: AccountingScope): Promise<string | null> {
    const dynamicTableRepo = getFactory().getDynamicTableRepository();
    const unitsTable = await dynamicTableRepo.findTableByInternalName(scope.ownerUserId, 'units');
    const unitRow = unitsTable ? await dynamicTableRepo.findDataById(scope.unitId) : null;
    const cnpj = stripCnpjMask(String((unitRow?.data as Record<string, unknown> | undefined)?.cnpj ?? '')).toUpperCase();
    return cnpj && isValidCnpj(cnpj) ? cnpj : null;
  }

  private toView(row: FiscalNumberVoid): FiscalNumberVoidView {
    return FiscalNumberVoidViewSchema.parse({
      id: row.id,
      kind: row.kind,
      ambiente: row.ambiente,
      serie: row.serie,
      nIni: String(row.nIni),
      nFin: String(row.nFin),
      ano: row.ano,
      status: row.status,
      partner: row.partner,
      nProt: row.nProt,
      errors: row.errorsJson ? (JSON.parse(row.errorsJson) as unknown[]) : [],
    });
  }
}
