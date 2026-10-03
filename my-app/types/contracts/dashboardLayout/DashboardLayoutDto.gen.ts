// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface DashboardLayoutInput {
id: string
userId: string
name: string
isActive: boolean
type: ("GRID" | "LIST" | "CUSTOM")
config: {
columns: number
widgets: string[]
positions?: {
id: string
i: string
x: number
y: number
w: number
h: number
minW?: number
minH?: number
type: string
widgetConfig?: unknown
}[]
theme?: string
customSettings?: {
[k: string]: unknown
}
}
createdAt: unknown
updatedAt: unknown
}
export interface CreateDashboardLayoutInput {
name: string
type: ("GRID" | "LIST" | "CUSTOM")
config: {
columns: number
widgets: string[]
positions?: {
id: string
i: string
x: number
y: number
w: number
h: number
minW?: number
minH?: number
type: string
widgetConfig?: unknown
}[]
theme?: string
customSettings?: {
[k: string]: unknown
}
}
}
export interface UpdateDashboardLayoutInput {
name?: string
type?: ("GRID" | "LIST" | "CUSTOM")
config?: {
columns: number
widgets: string[]
positions?: {
id: string
i: string
x: number
y: number
w: number
h: number
minW?: number
minH?: number
type: string
widgetConfig?: unknown
}[]
theme?: string
customSettings?: {
[k: string]: unknown
}
}
}
