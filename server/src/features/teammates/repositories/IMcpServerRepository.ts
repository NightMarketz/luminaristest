/**
 * Leitura de `mcp_servers` para validar `allowedTools` (BE-INCR-TEAMMATES PR-2, item 12). O CRUD do servidor MCP é do
 * PR-10 (item 40); aqui só a pergunta "estes servidores são vivos e do tenant?".
 */
export interface IMcpServerRepository {
  /** Dos `ids` pedidos, os que são `McpServer` vivos do `userId`. */
  findLiveIds(userId: string, ids: string[]): Promise<Set<string>>;
}
