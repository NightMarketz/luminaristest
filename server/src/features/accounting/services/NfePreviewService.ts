import { ForbiddenError } from '../../../lib/errors';
import { parseNfe } from '../../../lib/nfe';
import type { ParsedNfe } from '../../../lib/nfe';
import type { NfePreview } from '../dtos/NfeDto';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';

/**
 * NfePreviewService — dry-run do parser da NF-e (BE-INCR-NFE-PREVIEW, rodada 2a). Existe para a tela
 * (FE-INCR-NFE, F-FENFE-1 → b) conhecer os itens da nota ANTES de montar o `itemMappings` do import.
 *
 * Faz exatamente três coisas, nesta ordem (BRIEF comportamento 3 + ratificação F-PREV-3 → b):
 *  1. policy — `canManagePayable || canReconcile` (F-PREV-2 → a): quem pode importar OU cruzar pode
 *     pré-visualizar; um perfil só-leitura não "ensaia" o import;
 *  2. `parseNfe(xml)` — o MESMO parser puro do import/venda; toda `ValidationError` propaga inalterada;
 *  3. `alreadyImported` — `Payable` vivo com `documentNumber = chaveAcesso` nesta unidade (a chave é a
 *     business key do import, `NfeImportService`); título cancelado tem o `documentNumber` renomeado
 *     para `deleted:<id>:<doc>` (schema.prisma), logo lê como NÃO importado — coerente com o import,
 *     que aceitaria a reimportação.
 *
 * NÃO escreve, NÃO abre transação, NÃO emite evento de auditoria, NÃO valora (D3 é do import).
 */
export class NfePreviewService {
  constructor(
    private readonly payableRepo: IPayableRepository,
    private readonly policy: IAccountingPolicy,
  ) {}

  async preview(scope: AccountingScope, xml: string | Buffer): Promise<NfePreview> {
    if (!this.policy.canManagePayable(scope) && !this.policy.canReconcile(scope)) {
      throw new ForbiddenError('Você não tem permissão para pré-visualizar NF-e.');
    }
    const parsed = parseNfe(xml);
    const existing = await this.payableRepo.findByDocumentNumber(scope, parsed.chaveAcesso);
    return toNfePreview(parsed, existing?.id ?? null);
  }
}

/** Espelho integral do `ParsedNfe` (F-PREV-1 → a) menos `protocolo.chNFe` (redundante com `chaveAcesso`,
 *  já conferido igual pelo parser), mais o indicador de idempotência. */
export function toNfePreview(parsed: ParsedNfe, existingPayableId: string | null): NfePreview {
  const { chNFe: _chNFe, ...protocolo } = parsed.protocolo;
  void _chNFe;
  return {
    chaveAcesso: parsed.chaveAcesso,
    ide: { ...parsed.ide },
    emit: { ...parsed.emit },
    dest: { ...parsed.dest },
    itens: parsed.itens.map((it) => ({ ...it, indTot: it.indTot === '0' ? '0' : '1' })),
    totais: { ...parsed.totais },
    protocolo,
    alreadyImported: existingPayableId !== null,
    existingPayableId,
  };
}
