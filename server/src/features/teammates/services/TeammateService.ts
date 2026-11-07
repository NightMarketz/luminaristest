import type { IUser } from '../../users/models/User.model';
import type { AuditService } from '../../accounting/services/AuditService';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../lib/errors';
import { TeammateReadSchema, type TeammateCreateInput, type TeammateRead, type TeammateUpdateInput } from '../dtos/TeammatesDto';
import { TOOL_CLASS } from '../models/ActionClass.model';
import {
  ALCADA_INVALIDA,
  FERRAMENTA_INVALIDA,
  MCP_TOOL_RE,
  TEAMMATE_ALCADA_CHANGED,
  teammatesAuditScope,
  type ITeammate,
  type TeammateWrite,
} from '../models/Teammate.model';
import type { ITeammateRepository } from '../repositories/ITeammateRepository';
import type { IMcpServerRepository } from '../repositories/IMcpServerRepository';
import type { ITeammatePolicy } from '../policies/ITeammatePolicy';

const isRegistered = (tool: string): tool is keyof typeof TOOL_CLASS => Object.prototype.hasOwnProperty.call(TOOL_CLASS, tool);

/**
 * TeammateService — CRUD do teammate (BE-INCR-TEAMMATES PR-2, itens 10–13).
 *
 * - Escopo por `userId`: o repositório só enxerga linhas vivas do dono; teammate de outro tenant ⇒ 404 (item 10).
 * - Item 12: `allowedTools` só com nomes do `TOOL_CLASS` (nunca `PROIBIDA`) ou `mcp:<serverId>:<tool>` de `McpServer`
 *   vivo do tenant ⇒ senão 400 `FERRAMENTA_INVALIDA`.
 * - Item 11: `toolOverrides` só aperta. O DTO já recusa valor diferente de `PROPOSTA`; aqui se recusa o override que
 *   afrouxaria (`PROIBIDA` → `PROPOSTA`) ou que mira ferramenta fora de `allowedTools` ⇒ 400 `ALCADA_INVALIDA`.
 * - Item 13: mudar `allowedTools`/`toolOverrides` grava `teammate.alcada_changed` na trilha encadeada, na mesma tx.
 */
export class TeammateService {
  constructor(
    private readonly repo: ITeammateRepository,
    private readonly mcpServers: IMcpServerRepository,
    private readonly policy: ITeammatePolicy,
    private readonly auditService: AuditService,
  ) {}

  async create(actor: IUser, input: TeammateCreateInput): Promise<TeammateRead> {
    this.assertManage(actor, actor.id);
    const data: TeammateWrite = {
      name: input.name,
      role: input.role,
      playbook: input.playbook,
      allowedTools: input.allowedTools,
      toolOverrides: input.toolOverrides ?? null,
      provider: input.provider,
      model: input.model,
      fallbackProvider: input.fallbackProvider ?? null,
      fallbackModel: input.fallbackModel ?? null,
      dailyTurnLimit: input.dailyTurnLimit ?? 50,
    };
    await this.assertTools(actor.id, input.name, data.allowedTools, data.toolOverrides);
    const row = await this.repo.runTransaction((tx) => this.repo.create(actor.id, data, tx));
    return toView(row);
  }

  async list(actor: IUser): Promise<TeammateRead[]> {
    this.assertManage(actor, actor.id);
    return (await this.repo.listLive(actor.id)).map(toView);
  }

  async get(actor: IUser, id: string): Promise<TeammateRead> {
    return toView(await this.findOwned(actor, id));
  }

  async update(actor: IUser, id: string, input: TeammateUpdateInput): Promise<TeammateRead> {
    const current = await this.findOwned(actor, id);
    const allowedTools = input.allowedTools ?? current.allowedTools;
    const toolOverrides = input.toolOverrides !== undefined ? input.toolOverrides : current.toolOverrides;
    await this.assertTools(actor.id, input.name ?? current.name, allowedTools, toolOverrides);

    const patch: Partial<TeammateWrite> = {};
    for (const k of Object.keys(input) as (keyof TeammateUpdateInput)[]) {
      if (input[k] !== undefined) (patch as Record<string, unknown>)[k] = input[k];
    }
    const alcadaMudou =
      stable(allowedTools) !== stable(current.allowedTools) || stable(toolOverrides) !== stable(current.toolOverrides);

    const row = await this.repo.runTransaction(async (tx) => {
      const updated = await this.repo.update(actor.id, id, patch, tx);
      if (alcadaMudou) {
        await this.auditService.append(tx, teammatesAuditScope(actor.id), {
          actorUserId: actor.id,
          eventType: TEAMMATE_ALCADA_CHANGED,
          targetType: 'Teammate',
          targetId: id,
          payload: {
            teammateId: id,
            allowedTools: stable(updated.allowedTools),
            toolOverrides: stable(updated.toolOverrides),
            previousAllowedTools: stable(current.allowedTools),
            previousToolOverrides: stable(current.toolOverrides),
          },
        });
      }
      return updated;
    });
    return toView(row);
  }

  async remove(actor: IUser, id: string): Promise<void> {
    await this.findOwned(actor, id);
    await this.repo.softDelete(actor.id, id);
  }

  private async findOwned(actor: IUser, id: string): Promise<ITeammate> {
    const row = await this.repo.findLiveById(actor.id, id);
    if (!row) throw new NotFoundError('Teammate não encontrado.');
    this.assertManage(actor, row.userId);
    return row;
  }

  /** Itens 11 e 12. Cada recusa nomeia o teammate pelo nome exibido e a ferramenta (régua A3). */
  private async assertTools(userId: string, teammateName: string, allowedTools: string[], toolOverrides: Record<string, string> | null): Promise<void> {
    const mcpIds = new Set<string>();
    for (const tool of allowedTools) {
      const mcp = MCP_TOOL_RE.exec(tool);
      if (mcp) {
        mcpIds.add(mcp[1]);
        continue;
      }
      if (!isRegistered(tool)) {
        throw new ValidationError(`Teammate "${teammateName}": ferramenta desconhecida "${tool}".`, { tool }, FERRAMENTA_INVALIDA);
      }
      if ((TOOL_CLASS[tool] as string) === 'PROIBIDA') {
        throw new ValidationError(`Teammate "${teammateName}": a ferramenta "${tool}" é proibida.`, { tool }, FERRAMENTA_INVALIDA);
      }
    }
    if (mcpIds.size > 0) {
      const live = await this.mcpServers.findLiveIds(userId, [...mcpIds]);
      for (const tool of allowedTools) {
        const mcp = MCP_TOOL_RE.exec(tool);
        if (mcp && !live.has(mcp[1])) {
          throw new ValidationError(`Teammate "${teammateName}": o servidor MCP da ferramenta "${tool}" não existe.`, { tool }, FERRAMENTA_INVALIDA);
        }
      }
    }
    for (const tool of Object.keys(toolOverrides ?? {})) {
      if (!allowedTools.includes(tool)) {
        throw new ValidationError(`Teammate "${teammateName}": alçada para "${tool}", que não está nas ferramentas permitidas.`, { tool }, ALCADA_INVALIDA);
      }
      if (isRegistered(tool) && (TOOL_CLASS[tool] as string) === 'PROIBIDA') {
        throw new ValidationError(`Teammate "${teammateName}": a alçada não afrouxa a ferramenta proibida "${tool}".`, { tool }, ALCADA_INVALIDA);
      }
    }
  }

  private assertManage(actor: IUser, ownerId: string): void {
    if (!this.policy.canManage(actor, ownerId)) throw new ForbiddenError('Sem permissão para gerenciar este teammate.');
  }
}

/** JSON com chaves ordenadas: comparação da alçada e valor do payload de auditoria (canonicalize faz `String(v)`). */
function stable(v: string[] | Record<string, string> | null): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return JSON.stringify([...v].sort());
  return JSON.stringify(Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))));
}

function toView(row: ITeammate): TeammateRead {
  return TeammateReadSchema.parse({
    id: row.id,
    name: row.name,
    role: row.role,
    playbook: row.playbook,
    allowedTools: row.allowedTools,
    toolOverrides: row.toolOverrides,
    provider: row.provider,
    model: row.model,
    fallbackProvider: row.fallbackProvider,
    fallbackModel: row.fallbackModel,
    dailyTurnLimit: row.dailyTurnLimit,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}
