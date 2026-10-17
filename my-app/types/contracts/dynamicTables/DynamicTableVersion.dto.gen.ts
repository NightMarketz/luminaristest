// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface FieldDiffDtoInput {
field: string
label: string
kind: ("added" | "removed" | "changed")
before: unknown
after: unknown
}
export interface ListVersionsQueryDtoInput {
page?: number
limit?: number
}
export interface RowVersionDetailDtoInput {
version: number
op: ("BASELINE" | "CREATE" | "UPDATE" | "DELETE" | "RESTORE")
schemaVersion: number
actorUserId: (string | null)
origin: ("DIRECT" | "RULE" | "SYSTEM")
restoredFromVersion: (number | null)
createdAt: string
data: {
[k: string]: unknown
}
schema: {
[k: string]: unknown
}
}
export interface RowVersionDiffDtoInput {
from: (number | null)
to: (number | "current")
changes: {
field: string
label: string
kind: ("added" | "removed" | "changed")
before: unknown
after: unknown
}[]
}
export interface RowVersionListDtoInput {
data: {
version: number
op: ("BASELINE" | "CREATE" | "UPDATE" | "DELETE" | "RESTORE")
schemaVersion: number
actorUserId: (string | null)
origin: ("DIRECT" | "RULE" | "SYSTEM")
restoredFromVersion: (number | null)
createdAt: string
}[]
total: number
page: number
limit: number
}
export interface RowVersionMetaDtoInput {
version: number
op: ("BASELINE" | "CREATE" | "UPDATE" | "DELETE" | "RESTORE")
schemaVersion: number
actorUserId: (string | null)
origin: ("DIRECT" | "RULE" | "SYSTEM")
restoredFromVersion: (number | null)
createdAt: string
}
export interface RowVersionNumberParamsDtoInput {
tableId: string
dataId: string
version: number
}
export type RowVersionOpInput = ("BASELINE" | "CREATE" | "UPDATE" | "DELETE" | "RESTORE")
export interface RowVersionParamsDtoInput {
tableId: string
dataId: string
}
export interface SchemaVersionDetailDtoInput {
version: number
op: ("BASELINE" | "CREATE" | "UPDATE")
actorUserId: (string | null)
origin: ("DIRECT" | "RULE" | "SYSTEM")
createdAt: string
schema: {
[k: string]: unknown
}
}
export interface SchemaVersionDiffDtoInput {
from: (number | null)
to: (number | "current")
changes: {
field: string
label: string
kind: ("added" | "removed" | "changed")
before: unknown
after: unknown
}[]
}
export interface SchemaVersionListDtoInput {
data: {
version: number
op: ("BASELINE" | "CREATE" | "UPDATE")
actorUserId: (string | null)
origin: ("DIRECT" | "RULE" | "SYSTEM")
createdAt: string
}[]
total: number
page: number
limit: number
}
export interface SchemaVersionMetaDtoInput {
version: number
op: ("BASELINE" | "CREATE" | "UPDATE")
actorUserId: (string | null)
origin: ("DIRECT" | "RULE" | "SYSTEM")
createdAt: string
}
export interface SchemaVersionNumberParamsDtoInput {
tableId: string
version: number
}
export type SchemaVersionOpInput = ("BASELINE" | "CREATE" | "UPDATE")
export interface SchemaVersionParamsDtoInput {
tableId: string
}
export interface VersionDiffQueryDtoInput {
against?: ("current" | number)
}
export type VersionOriginInput = ("DIRECT" | "RULE" | "SYSTEM")
