import { z } from 'zod';

/**
 * Boundary (Zod) schemas for the analytics-definitions write endpoints.
 *
 * Why this exists: `analyticsDefinitionsController` was the only controller of the 34 that handed
 * `req.body` to `DynamicTableService` with no parse at the HTTP boundary (AV-L1 finding F2,
 * fingerprint `avl1-analyticsdefs-sem-parse-runtime`). The service DOES validate field values
 * against the preset schema underneath, so the defect was never "unvalidated writes" — it was that
 * a malformed body travelled two layers deep before dying, and the resulting error came from the
 * engine instead of the boundary.
 *
 * Shape mirrors the `analyticsDefinitions` preset in `presets/systems/CoreSystemPreset.ts`.
 * `scope` and `published` are preset-`required` but carry a `defaultValue`, and `version` is
 * preset-optional; all three are optional here because `DynamicTableService` applies `defaultValue`
 * via zod `.default()`, so demanding them at the boundary would reject bodies the engine accepts.
 *
 * `.strict()` per repo convention — a typo'd field fails loud instead of being silently dropped.
 *
 * KNOWN, DELIBERATE DIVERGENCE from the engine: the engine makes every non-required field
 * `.nullable()` (DynamicTableService.ts:1067-1072) and types `json` as `z.any()`, so it accepts an
 * explicit `null` where this schema accepts only absence, and accepts a bare primitive for
 * `pipeline`/`options`/`access` where this one requires an object or array. That is a boundary
 * deliberately tighter than the engine, not an oversight — but it is the one place this file does
 * NOT mirror the preset, so it is written down rather than left to be rediscovered.
 *
 * The rule is UNIFORM: every optional field here rejects an explicit `null`. Keeping it uniform is
 * what forced `DateTimeField` below to guard its input — a plain `z.coerce.date()` would have made
 * these two fields the exception, and silently, by turning `null` into the epoch instead of 400.
 *
 * No `@openapi` block here. Note the glob DOES cover this file — swagger-jsdoc reads
 * `src/features/**\/dtos/*.ts` (`routes/docs.ts:30` and `scripts/generate-openapi.js`), so a block
 * would render. It is omitted because `docs.paths.ts` already documents both request bodies as a
 * generic `{ type: object }` with no `$ref`, so nothing dangles; introducing a component schema and
 * repointing those paths at it is its own change, not part of this fix.
 */

const CHART_TYPES = ['bar', 'line', 'area', 'pie', 'donut', 'table'] as const;
const SCOPES = ['global', 'preset', 'table'] as const;

/** A preset `type: 'json'` field: object or array, never a bare primitive and never null. */
const JsonBlock = z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]);

/**
 * A preset `type: 'datetime'` field. The engine maps it to `z.coerce.date()`, but bare coercion
 * cannot be used at a boundary: `new Date(null)` is `1970-01-01`, so `{"createdAt": null}` would be
 * ACCEPTED and silently rewritten to the epoch — a wrong value written quietly, where every other
 * optional field in this schema answers 400. The union runs first, so `null`, booleans and arrays
 * are rejected before `new Date()` ever sees them; a numeric `0` still means the epoch, which is a
 * real timestamp the caller asked for and not an accident.
 */
const DateTimeField = z.union([z.string(), z.number(), z.date()]).pipe(z.coerce.date());

export const CreateAnalyticsDefinitionSchema = z
  .object({
    key: z.string().trim().min(1, { message: 'key is required.' }),
    title: z.string().trim().min(1, { message: 'title is required.' }),
    chartType: z.enum(CHART_TYPES),
    pipeline: JsonBlock,
    // Preset-required but defaulted by the engine — see the note above.
    scope: z.enum(SCOPES).optional(),
    version: z.number().int().optional(),
    published: z.boolean().optional(),
    // Preset-optional.
    presetKey: z.string().optional(),
    tableKey: z.string().optional(),
    options: JsonBlock.optional(),
    access: JsonBlock.optional(),
    // Follow the engine's own mapping for these types, so a bad value dies at the boundary instead
    // of two layers deeper: `relation` → `z.string().cuid()` and `datetime` → date coercion
    // (DynamicTableService.ts:1035/1039; 'datetime' is normalised to 'date' at :970). The datetime
    // side is `DateTimeField`, NOT a bare `z.coerce.date()` — see its comment for why.
    createdBy: z.string().cuid().optional(),
    createdAt: DateTimeField.optional(),
    updatedAt: DateTimeField.optional(),
  })
  .strict();
export type CreateAnalyticsDefinitionInput = z.infer<typeof CreateAnalyticsDefinitionSchema>;

/**
 * Update is a partial of create — the route is a PUT that the service applies as a patch, so
 * requiring the full body would break edits of a single field. An EMPTY body is still rejected:
 * a write request that changes nothing is a client bug, not a no-op worth accepting.
 */
export const UpdateAnalyticsDefinitionSchema = CreateAnalyticsDefinitionSchema.partial().refine(
  (body) => Object.keys(body).length > 0,
  { message: 'At least one field must be provided.' },
);
export type UpdateAnalyticsDefinitionInput = z.infer<typeof UpdateAnalyticsDefinitionSchema>;
