// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface SavedTableViewConfigInput {
query?: string
fieldFilters?: {
[k: string]: string
}
sortConfig?: ({
field: string
direction: ("asc" | "desc")
} | null)
}
export interface CreateSavedTableViewInput {
tableId: string
name: string
config: {
query?: string
fieldFilters?: {
[k: string]: string
}
sortConfig?: ({
field: string
direction: ("asc" | "desc")
} | null)
}
}
export interface UpdateSavedTableViewInput {
tableId?: string
name?: string
config?: {
query?: string
fieldFilters?: {
[k: string]: string
}
sortConfig?: ({
field: string
direction: ("asc" | "desc")
} | null)
}
}
export interface SavedTableViewInput {
id: string
userId: string
tableId: string
name: string
config: {
query?: string
fieldFilters?: {
[k: string]: string
}
sortConfig?: ({
field: string
direction: ("asc" | "desc")
} | null)
}
createdAt: unknown
updatedAt: unknown
}
