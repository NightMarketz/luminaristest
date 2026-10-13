import { ForbiddenError, ValidationError } from '../../../lib/errors';
import { logger } from '../../../lib/logger';
import type { BindingScope } from '../../accountingBinding/repositories/IAccountingBindingRepository';
import type { ServiceFiscalCatalogItem } from '../dtos/SectorKitDto';
import type { PendingServiceSuggestion, Suggestion } from '../dtos/ServiceFiscalSuggestionDto';
import type { ISectorKitPolicy } from '../policies/ISectorKitPolicy';
import type { IKitInstallationRepository } from '../repositories/IKitInstallationRepository';
import { suggestFromCatalog } from '../models/suggestFromCatalog';
import { KIT_REGISTRY } from '../registry';
import type { KitVersionsLookup } from './KitInstallService';
import type { ServiceCatalogPort, ServiceClassifierPort, ServiceProfileRefsPort } from './serviceFiscalSuggestionPorts';

/** Teto de chamadas à IA por varredura (`?ia=1`, 7e) — contém custo. Assumido, sem cédula (D-2026-10-13-KIT-SETOR-PR-K3-LACUNAS). */
export const MAX_IA_POR_VARREDURA = 20;

export const UNIDADE_SEM_KIT = 'UNIDADE_SEM_KIT';

/**
 * Sugestão fiscal por serviço (BE-INCR-KIT-SETOR-EMENDA-1, PR-K3, itens 7b–7f; F-KE-3 b, F-KE-4 — dono 13/10). Só LÊ e
 * sugere: não tem porta de gravação, então nenhum caminho daqui chega ao `ServiceFiscalProfileService.upsert` (7d) —
 * aceitar é o PUT do perfil que já existe. Não é motor de domínio (rejeitado): função pura + leitura.
 *
 * - Catálogo = o da versão do kit da unidade (`KitInstallation`); unidade sem kit ⇒ 400 (L3 de 13/10).
 * - Camada 1 (`suggestFromCatalog`) sempre; camada 2 (IA) só com a 1 vazia e a IA configurada (`classifier` presente).
 *   A IA escolhe uma `key` do catálogo (enum); o `cTribNac` vem do catálogo, nunca da resposta (7c). Erro ⇒ [] + warn.
 */
export class ServiceFiscalSuggestionService {
  constructor(
    private readonly policy: ISectorKitPolicy,
    private readonly kitRepo: Pick<IKitInstallationRepository, 'findByScope'>,
    private readonly services: ServiceCatalogPort,
    private readonly profileRefs: ServiceProfileRefsPort,
    private readonly classifier: ServiceClassifierPort | null,
    private readonly kitVersions: KitVersionsLookup = (kitKey) => KIT_REGISTRY[kitKey],
  ) {}

  /** 7f — sugestão para um nome, no formulário de serviço. */
  async preview(scope: BindingScope, nome: string): Promise<Suggestion[]> {
    this.assertCanRead(scope);
    const catalogo = await this.catalogo(scope);
    const camada1 = suggestFromCatalog(nome, catalogo);
    return camada1.length > 0 ? camada1 : this.sugestaoIa(nome, catalogo);
  }

  /** 7e — serviços do dono sem perfil fiscal nesta unidade, com a sugestão de cada um. IA só com `ia` e até o teto. */
  async pendentes(scope: BindingScope, opts: { ia: boolean }): Promise<PendingServiceSuggestion[]> {
    this.assertCanRead(scope);
    const catalogo = await this.catalogo(scope);
    const tabela = await this.services.findTableByInternalName(scope.ownerUserId, 'services');
    if (!tabela) return [];
    const comPerfil = await this.profileRefs.serviceRefsComPerfil();
    const linhas = (await this.services.findAllDataByTableId(tabela.id)).filter((l) => !comPerfil.has(l.id));

    let chamadasIa = 0;
    const out: PendingServiceSuggestion[] = [];
    for (const linha of linhas) {
      const nome = nomeDaLinha(linha.data);
      let sugestoes = suggestFromCatalog(nome, catalogo);
      if (sugestoes.length === 0 && opts.ia && nome.length > 0 && chamadasIa < MAX_IA_POR_VARREDURA) {
        chamadasIa += 1;
        sugestoes = await this.sugestaoIa(nome, catalogo);
      }
      out.push({ serviceRef: linha.id, nome, sugestoes });
    }
    return out;
  }

  private assertCanRead(scope: BindingScope): void {
    if (!this.policy.canReadServiceFiscalSuggestions(scope)) {
      throw new ForbiddenError('Você não tem permissão para ler as sugestões fiscais de serviço.');
    }
  }

  private async catalogo(scope: BindingScope): Promise<readonly ServiceFiscalCatalogItem[]> {
    const row = await this.kitRepo.findByScope(scope);
    const kit = row ? this.kitVersions(row.kitKey)?.find((k) => k.kitVersion === row.kitVersion) : undefined;
    if (!kit) {
      throw new ValidationError(`${UNIDADE_SEM_KIT}: a unidade não tem kit de setor; ative o kit antes de pedir sugestão fiscal por serviço.`);
    }
    return kit.serviceFiscalDefaults;
  }

  /** Camada 2 (7c): só com a IA configurada; resposta fora do enum, `null` ou erro ⇒ []. */
  private async sugestaoIa(nome: string, catalogo: readonly ServiceFiscalCatalogItem[]): Promise<Suggestion[]> {
    if (!this.classifier || catalogo.length === 0) return [];
    try {
      const key = await this.classifier.classifyIntoEnum(nome, promptDoCatalogo(catalogo), catalogo.map((i) => i.key));
      const item = catalogo.find((i) => i.key === key);
      if (!item) return [];
      return [
        {
          key: item.key,
          cTribNac: item.cTribNac,
          ...(item.cNBS ? { cNBS: item.cNBS } : {}),
          label: `${item.label} — sugestão da IA, confira`,
          origem: 'ia',
        },
      ];
    } catch (error) {
      logger.warn('[ServiceFiscalSuggestion] IA indisponível — sem sugestão da camada 2', { error: (error as Error)?.message });
      return [];
    }
  }
}

function nomeDaLinha(data: unknown): string {
  const nome = data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>).name : undefined;
  return typeof nome === 'string' ? nome.trim() : '';
}

function promptDoCatalogo(catalogo: readonly ServiceFiscalCatalogItem[]): string {
  return [
    'Você classifica o nome de um serviço de salão de beleza ou clínica estética numa das categorias fiscais abaixo.',
    'Responda a key da categoria que descreve o serviço, ou null se nenhuma servir. Não invente categoria.',
    ...catalogo.map((i) => `- ${i.key}: ${i.label} (ex.: ${i.sinonimos.slice(0, 5).join(', ')})`),
  ].join('\n');
}
