/**
 * Efeitos de consumidor depois de uma escrita no motor DynamicTable (BE-INCR-DT-NO-CONSUMER-CALLS, F1 → b).
 *
 * O motor nunca chama o consumidor (Contrato §2.1). Quem orquestra a escrita — controller ou serviço de
 * integração — chama estes efeitos **depois do commit** do escopo que abriu a transação (F2 → i).
 *
 * Arquivo sem import de propósito: serviços de chat/CRM/vendas/contabilidade dependem só desta interface,
 * sem puxar o grafo de import de analytics/chat.
 */
export interface IDynamicTableWriteEffects {
  /** Linhas mudaram: invalida o cache de KPI do dono das tabelas. */
  afterDataWrite(ownerUserId: string): void;
  /**
   * Tabela ou schema mudou (criar, instalar por preset, evoluir schema, apagar): invalida o KPI e
   * reconstrói o KnowledgeGraph do dono. Falha do grafo é logada e propagada (F4).
   */
  afterStructureWrite(ownerUserId: string): Promise<void>;
}
