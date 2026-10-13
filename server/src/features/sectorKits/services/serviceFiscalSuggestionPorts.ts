/**
 * Portas da sugestão fiscal por serviço (BE-INCR-KIT-SETOR-EMENDA-1, PR-K3, item 7e). O `sectorKits` não importa
 * `dynamicTables` nem `accounting` (fronteira): quem monta as portas é a Factory, no nível de serviço de integração.
 * Nada aqui escreve — não existe porta de gravação (7d).
 */

/** Uma linha da tabela `services` do dono. */
export interface ServiceCatalogRow {
  id: string;
  data: unknown;
}

/**
 * Leitura da tabela `services` do dono (molde do `ProductRefPort`, `accounting/ports/OriginPorts.ts`): o repositório de
 * DynamicTables a implementa direto. Só leitura; o motor de DynamicTable não conhece este módulo (Contrato §2.1).
 */
export interface ServiceCatalogPort {
  findTableByInternalName(ownerUserId: string, internalName: string): Promise<{ id: string } | null>;
  /** Linhas vivas da tabela. */
  findAllDataByTableId(tableId: string): Promise<ServiceCatalogRow[]>;
}

/** `serviceRef`s que já têm `ServiceFiscalProfile` na unidade do escopo (porta fechada sobre o escopo). */
export interface ServiceProfileRefsPort {
  serviceRefsComPerfil(): Promise<Set<string>>;
}

/** Camada 2 (7c): classificação presa ao enum das `key` — `OpenAIService.classifyIntoEnum`. */
export interface ServiceClassifierPort {
  classifyIntoEnum(input: string, systemPrompt: string, options: readonly string[]): Promise<string | null>;
}
