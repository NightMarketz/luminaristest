// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export type DateOnlyInput = string
export type InstantInput = string
export interface ResourceInput {
name: string
kind: string
unitId?: string
isActive?: boolean
}
export interface ScheduleExceptionInput {
employeeId?: string
resourceId?: string
unitId: string
kind: ("DAY_OFF" | "BLOCK" | "ABSENCE" | "HOLIDAY" | "EXTRA")
origin?: ("USER" | "HOLIDAY_CALENDAR" | "HR")
startAt: string
endAt: string
reason?: string
sourceType?: ("HOLIDAY" | "DP_ABSENCE")
sourceId?: string
}
export interface ScheduleInput {
employeeId?: string
resourceId?: string
unitId?: string
cycleLengthDays: number
cycleAnchorDate: string
validFrom: string
validTo?: (string | null)
origin?: ("DECLARED" | "ASSIGNED")
migratedFrom?: "workSchedule"
notes?: string
}
export interface ScheduleShiftInput {
scheduleId: string
dayOfCycle: number
startMinute: number
durationMinutes: number
}
