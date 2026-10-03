// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface CreateAnalyticsDefinitionInput {
key: string
title: string
chartType: ("bar" | "line" | "area" | "pie" | "donut" | "table")
pipeline: ({
[k: string]: unknown
} | unknown[])
scope?: ("global" | "preset" | "table")
version?: number
published?: boolean
presetKey?: string
tableKey?: string
options?: ({
[k: string]: unknown
} | unknown[])
access?: ({
[k: string]: unknown
} | unknown[])
createdBy?: string
createdAt?: unknown
updatedAt?: unknown
}
export interface UpdateAnalyticsDefinitionInput {
key?: string
title?: string
chartType?: ("bar" | "line" | "area" | "pie" | "donut" | "table")
pipeline?: ({
[k: string]: unknown
} | unknown[])
scope?: ("global" | "preset" | "table")
version?: number
published?: boolean
presetKey?: string
tableKey?: string
options?: ({
[k: string]: unknown
} | unknown[])
access?: ({
[k: string]: unknown
} | unknown[])
createdBy?: string
createdAt?: unknown
updatedAt?: unknown
}
