/**
 * Registro dos submódulos opcionais do DP — BE-INCR-DP-F0-F1 itens 8, 9 e 11 (PR-1).
 *
 * Formato do `MODULE_REGISTRY` do motor (F-DP-6 → a), mas próprio do DP: os módulos do DP são Prisma, não tabelas de
 * preset, e o núcleo não está aqui porque é sempre ligado. Campos fora do molde, de propósito:
 * - `category`, `group`: o DP é uma categoria só, e o registro já é dela;
 * - `fixed`: não há base fixa — o núcleo é implícito, por isso dependência faltante RECUSA (não inclui sozinha);
 * - `tables`, `freeSelects`: o opcional não instala tabela de preset; mora em `features/<featureDir>/`.
 * Chaves `DP-<SUFIXO>` (F-DPB-2, dono, 02/11). O núcleo nunca importa `features/<featureDir>/` (regra D1 do check:arch).
 */
import { z } from 'zod';
import { dpConflictError, dpValidationError } from './erros';

export const DP_MODULE_KEYS = ['DP-PONTO', 'DP-PAG', 'DP-BEN', 'DP-ADM', 'DP-APP', 'DP-DES', 'DP-GED', 'DP-CAT', 'DP-BI'] as const;
export const dpModuleKeySchema = z.enum(DP_MODULE_KEYS);
export type DpModuleKey = z.infer<typeof dpModuleKeySchema>;

/** Portas do núcleo que um opcional pode prover. Só `JORNADA_APURADA` no F0 (D-3 do BRIEF). */
export const DP_PORT_KEYS = ['JORNADA_APURADA'] as const;
export type DpPortKey = (typeof DP_PORT_KEYS)[number];

export const dpModuleDefSchema = z
  .object({
    key: dpModuleKeySchema,
    name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
    aiDescription: z.string().min(1),
    dependsOn: z.array(dpModuleKeySchema),
    requiresOneOf: z.array(z.array(dpModuleKeySchema).min(2)).default([]),
    featureDir: z.string().regex(/^dp[A-Z][A-Za-z0-9]*$/),
    provides: z.array(z.enum(DP_PORT_KEYS)),
    disponivel: z.boolean(),
  })
  .strict();
export type DpModuleDef = z.infer<typeof dpModuleDefSchema>;
export type DpModuleRegistry = Readonly<Record<DpModuleKey, DpModuleDef>>;

/**
 * Item 8 — as 9 entradas da spec §2 (`docs/dp/SPEC-DP-2026-10-31-katz.md`). `aiDescription` = coluna "Entrega".
 * `dependsOn: []`: na spec cada opcional só "requer" peças do núcleo. `disponivel: false`: ainda sem implementação.
 */
export const DP_MODULE_REGISTRY: DpModuleRegistry = {
  'DP-PONTO': {
    key: 'DP-PONTO',
    name: { pt: 'Ponto e jornada', en: 'Timekeeping' },
    aiDescription: 'REP-P, tratamento, banco de horas, AFD/AEJ',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpPonto',
    provides: ['JORNADA_APURADA'],
    disponivel: false,
  },
  'DP-PAG': {
    key: 'DP-PAG',
    name: { pt: 'Pagamentos', en: 'Payments' },
    aiDescription: 'CNAB, Pix em lote, retorno bancário',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpPagamentos',
    provides: [],
    disponivel: false,
  },
  'DP-BEN': {
    key: 'DP-BEN',
    name: { pt: 'Benefícios', en: 'Benefits' },
    aiDescription: 'VT, VR/VA, saúde, fornecedores, faturas',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpBeneficios',
    provides: [],
    disponivel: false,
  },
  'DP-ADM': {
    key: 'DP-ADM',
    name: { pt: 'Admissão digital', en: 'Digital onboarding' },
    aiDescription: 'Coleta de dados, OCR, contrato assinado',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpAdmissao',
    provides: [],
    disponivel: false,
  },
  'DP-APP': {
    key: 'DP-APP',
    name: { pt: 'App do colaborador', en: 'Employee self-service' },
    aiDescription: 'API do app: holerite, férias, ponto, pedidos',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpApp',
    provides: [],
    disponivel: false,
  },
  'DP-DES': {
    key: 'DP-DES',
    name: { pt: 'Desempenho', en: 'Performance' },
    aiDescription: 'Fatos, contratos de desempenho, prova, simulação',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpDesempenho',
    provides: [],
    disponivel: false,
  },
  'DP-GED': {
    key: 'DP-GED',
    name: { pt: 'Documentos e GED', en: 'Documents' },
    aiDescription: 'Pasta digital, modelos, assinatura eletrônica, temporalidade',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpDocumentos',
    provides: [],
    disponivel: false,
  },
  'DP-CAT': {
    key: 'DP-CAT',
    name: { pt: 'Outras categorias', en: 'Special categories' },
    aiDescription: 'Intermitente, doméstico, rural, avulso, cooperado',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpCategorias',
    provides: [],
    disponivel: false,
  },
  'DP-BI': {
    key: 'DP-BI',
    name: { pt: 'Indicadores e BI', en: 'Analytics' },
    aiDescription: 'Relatórios gerenciais, exportação para BI',
    dependsOn: [],
    requiresOneOf: [],
    featureDir: 'dpIndicadores',
    provides: [],
    disponivel: false,
  },
};

/**
 * Item 9 (molde `assertRegistryInvariants`): chaves e `featureDir` únicos; `dependsOn`/`requiresOneOf` só citam chaves
 * do registro; sem ciclo (spec §3 regra 2, "ciclo → erro de build"); cada porta provida por no máximo um módulo.
 * Roda no carregamento deste arquivo, então registro inválido derruba o boot e os testes.
 */
export function assertDpRegistryInvariants(registry: Readonly<Record<string, DpModuleDef>>): void {
  const defs = Object.values(registry);
  const keys = new Set<string>();
  const dirs = new Set<string>();
  for (const d of defs) {
    if (keys.has(d.key)) throw new Error(`Registro do DP: chave duplicada '${d.key}'.`);
    if (dirs.has(d.featureDir)) throw new Error(`Registro do DP: featureDir duplicado '${d.featureDir}'.`);
    keys.add(d.key);
    dirs.add(d.featureDir);
  }
  const arestas = (d: DpModuleDef): string[] => [...d.dependsOn, ...d.requiresOneOf.flat()];
  for (const d of defs) {
    for (const alvo of arestas(d)) {
      if (!keys.has(alvo)) throw new Error(`Registro do DP: '${d.key}' cita '${alvo}', que não está no registro.`);
    }
  }
  const porKey = new Map(defs.map((d) => [d.key as string, d]));
  const estado = new Map<string, 'visitando' | 'feito'>();
  const visitar = (key: string, caminho: string[]): void => {
    if (estado.get(key) === 'feito') return;
    if (estado.get(key) === 'visitando') {
      throw new Error(`Registro do DP: ciclo de dependência ${[...caminho.slice(caminho.indexOf(key)), key].join(' → ')}.`);
    }
    estado.set(key, 'visitando');
    for (const alvo of arestas(porKey.get(key) as DpModuleDef)) visitar(alvo, [...caminho, key]);
    estado.set(key, 'feito');
  };
  for (const d of defs) visitar(d.key, []);
  const provedor = new Map<string, string>();
  for (const d of defs) {
    for (const porta of d.provides) {
      const outro = provedor.get(porta);
      if (outro) throw new Error(`Registro do DP: a porta '${porta}' é provida por '${outro}' e por '${d.key}'.`);
      provedor.set(porta, d.key);
    }
  }
}

assertDpRegistryInvariants(DP_MODULE_REGISTRY);

/**
 * Item 11 (molde `resolveModuleSelection`): pode ativar `pedido` dado o que já está ativo na competência de início?
 * - `disponivel: false` ⇒ 409 `DP_MODULE_UNAVAILABLE`;
 * - `dependsOn` ausente ⇒ 400 `DP_MODULE_MISSING_DEPENDENCY` com TODOS os faltantes (spec §3 regra 2);
 * - grupo de `requiresOneOf` sem nenhum ativo ⇒ 400 `DP_MODULE_REQUIRES_ONE_OF`.
 * Diferença declarada do molde: não há base fixa para incluir sozinha (o núcleo é implícito), então dependência
 * faltante recusa.
 */
export function resolveDpModuleActivation(
  pedido: DpModuleKey,
  ativosNaCompetencia: readonly DpModuleKey[],
  registry: DpModuleRegistry = DP_MODULE_REGISTRY,
): DpModuleDef {
  const def = registry[pedido];
  if (!def.disponivel) {
    throw dpConflictError('DP_MODULE_UNAVAILABLE', `O submódulo '${pedido}' ainda não está disponível para ativação.`);
  }
  const ativos = new Set(ativosNaCompetencia);
  const faltantes = def.dependsOn.filter((k) => !ativos.has(k));
  if (faltantes.length) {
    throw dpValidationError(
      'DP_MODULE_MISSING_DEPENDENCY',
      `O submódulo '${pedido}' exige ${faltantes.map((k) => `'${k}'`).join(', ')} ativo(s) na competência.`,
      { module: pedido, missingModules: faltantes },
    );
  }
  const gruposVazios = def.requiresOneOf.filter((g) => !g.some((k) => ativos.has(k)));
  if (gruposVazios.length) {
    throw dpValidationError(
      'DP_MODULE_REQUIRES_ONE_OF',
      `O submódulo '${pedido}' exige ao menos um de ${gruposVazios.map((g) => `[${g.join(', ')}]`).join(' e ')} ativo na competência.`,
      { module: pedido, groups: gruposVazios },
    );
  }
  return def;
}
