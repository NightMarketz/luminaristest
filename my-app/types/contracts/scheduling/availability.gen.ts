// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface AvailabilityQueryInput {
unitId: string
employeeId?: string
resourceId?: string
from: string
to: string
}
export interface AvailabilityResponseInput {
unrestricted: boolean
intervals: {
startAt: string
endAt: string
}[]
}
export interface FreeSlotsQueryInput {
unitId: string
employeeId?: string
resourceId?: string
from: string
to: string
serviceId?: string
durationMinutes?: number
stepMinutes?: number
}
export interface FreeSlotsResponseInput {
slots: {
employeeId: (string | null)
resourceId: (string | null)
startAt: string
endAt: string
}[]
}
