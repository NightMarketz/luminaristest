import { ForbiddenError } from '../../../lib/errors';
import { parseNfe } from '../../../lib/nfe';
import type { ParsedNfe } from '../../../lib/nfe';
import type { NfePreview, PreviewNfeInput } from '../dtos/NfeDto';
import type { IPayableRepository } from '../repositories/IPayableRepository';
import type { IAccountingPolicy } from '../policies/IAccountingPolicy';
import type { AccountingScope } from '../scope/AccountingScope';
import type { FiscalProfileService } from './FiscalProfileService';
import { acquisitionCost, type AcquisitionCost } from '../../../lib/nfeCost';
import { defaultByProductRefFrom, resolveDestinations, type ItemDestinationMapping } from '../models/itemDestination';
import type { IProductDestinationDefaultRepository } from '../repositories/IProductDestinationDefaultRepository';
import { mappedProductRefs } from './NfeImportService';

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
 * NÃO escreve, NÃO abre transação, NÃO emite evento de auditoria.
 *
 * ITEM-DESTINATION item 14 (F-ID-8 a): `itemMappings` opcional passa pelo MESMO `resolveDestinations` e pelos
 * mesmos `destinos` do import — preview = import a seco, inclusive a origem PRODUTO (PR-2, a mesma query de defaults). Sem mapeamento, todo item sai REVENDA/FALLBACK e o
 * número é o de antes. Item sem mapeamento NÃO é rejeitado aqui (o D6 é do import).
 */
export class NfePreviewService {
  constructor(
    private readonly payableRepo: IPayableRepository,
    private readonly policy: IAccountingPolicy,
    private readonly fiscalProfile: FiscalProfileService,
    private readonly productDestinationDefaults: IProductDestinationDefaultRepository,
  ) {}

  async preview(
    scope: AccountingScope,
    xml: string | Buffer,
    itemMappings: PreviewNfeInput['itemMappings'] = [],
  ): Promise<NfePreview> {
    if (!this.policy.canManagePayable(scope) && !this.policy.canReconcile(scope)) {
      throw new ForbiddenError('Você não tem permissão para pré-visualizar NF-e.');
    }
    const parsed = parseNfe(xml);
    const existing = await this.payableRepo.findByDocumentNumber(scope, parsed.chaveAcesso);
    // X6 (F-X6-6 a): sem perfil fiscal o preview NÃO inventa custo — 400 nomeado, igual ao import.
    const regime = await this.fiscalProfile.requireCostRegime(scope);
    const costed = parsed.itens.filter((it) => it.indTot !== '0');
    const defaults = await this.productDestinationDefaults.findManyByProductRefs(scope, mappedProductRefs(itemMappings));
    const resolved = resolveDestinations(
      costed,
      new Map<string, ItemDestinationMapping>(itemMappings.map((m) => [m.cProd, m])),
      defaultByProductRefFrom(defaults),
    );
    const custo = acquisitionCost(parsed, costed, regime, resolved.byNItem);
    return toNfePreview(parsed, existing?.id ?? null, custo, resolved);
  }
}

/** Espelho integral do `ParsedNfe` (F-PREV-1 → a) menos `protocolo.chNFe` (redundante com `chaveAcesso`,
 *  já conferido igual pelo parser), mais o indicador de idempotência. */
export function toNfePreview(
  parsed: ParsedNfe,
  existingPayableId: string | null,
  custo: AcquisitionCost,
  resolved: Pick<ReturnType<typeof resolveDestinations>, 'destinacoes' | 'warnings'> = resolveDestinations(
    parsed.itens.filter((it) => it.indTot !== '0'),
    new Map(),
  ),
): NfePreview {
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
    custo: {
      custoBrutoCents: custo.custoBrutoCents,
      custoEstoqueCents: custo.custoEstoqueCents,
      custoInsumoCents: custo.custoInsumoCents,
      destinacoes: resolved.destinacoes,
      creditoIcmsCents: custo.creditoIcmsCents,
      creditoPisCofinsCents: custo.creditoPisCofinsCents,
      baseCreditoPisCofinsCents: custo.baseCreditoPisCofinsCents,
      regimeAplicado: custo.regimeAplicado,
      pisCofinsAplicado: custo.pisCofinsAplicado,
      // mesma ordem do import (`NfePurchaseImportResult.warnings`): resolver, depois custo.
      warnings: [...resolved.warnings, ...custo.warnings],
    },
  };
}
