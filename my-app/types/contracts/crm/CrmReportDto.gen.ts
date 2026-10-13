// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface ReportFilterInput {
field: string
op: ("eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte")
value: unknown
}
export type ReportDimensionInput = ({
type: "field"
field: string
label?: string
} | {
type: "period"
dateField: string
period: ("day" | "week" | "month" | "quarter" | "year")
label?: string
})
export type ReportMeasureInput = ({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
})
export interface ReportJoinInput {
leftField: string
rightSource: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
rightField: string
alias?: string
}
export interface ReportSortInput {
by: ("dimension" | "measure")
key?: string
dir?: ("asc" | "desc")
}
export interface ReportSpecInput {
source: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
/**
 * @maxItems 2
 */
joins?: {
leftField: string
rightSource: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
rightField: string
alias?: string
}[]
/**
 * @maxItems 10
 */
filters?: {
field: string
op: ("eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte")
value: unknown
}[]
/**
 * @maxItems 2
 */
dimensions?: ({
type: "field"
field: string
label?: string
} | {
type: "period"
dateField: string
period: ("day" | "week" | "month" | "quarter" | "year")
label?: string
})[]
/**
 * @minItems 1
 * @maxItems 4
 */
measures: [({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}), ...(({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}))[]]
sort?: {
by: ("dimension" | "measure")
key?: string
dir?: ("asc" | "desc")
}
limit?: number
convertTo?: "BRL"
}
export interface CreateCrmReportInput {
name: string
description?: string
kind: ("chart" | "table" | "kpi")
chartType: ("bar" | "line" | "area" | "pie" | "donut" | "table")
spec: {
source: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
/**
 * @maxItems 2
 */
joins?: {
leftField: string
rightSource: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
rightField: string
alias?: string
}[]
/**
 * @maxItems 10
 */
filters?: {
field: string
op: ("eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte")
value: unknown
}[]
/**
 * @maxItems 2
 */
dimensions?: ({
type: "field"
field: string
label?: string
} | {
type: "period"
dateField: string
period: ("day" | "week" | "month" | "quarter" | "year")
label?: string
})[]
/**
 * @minItems 1
 * @maxItems 4
 */
measures: [({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}), ...(({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}))[]]
sort?: {
by: ("dimension" | "measure")
key?: string
dir?: ("asc" | "desc")
}
limit?: number
convertTo?: "BRL"
}
}
export interface UpdateCrmReportInput {
name?: string
description?: string
kind?: ("chart" | "table" | "kpi")
chartType?: ("bar" | "line" | "area" | "pie" | "donut" | "table")
spec?: {
source: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
/**
 * @maxItems 2
 */
joins?: {
leftField: string
rightSource: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
rightField: string
alias?: string
}[]
/**
 * @maxItems 10
 */
filters?: {
field: string
op: ("eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte")
value: unknown
}[]
/**
 * @maxItems 2
 */
dimensions?: ({
type: "field"
field: string
label?: string
} | {
type: "period"
dateField: string
period: ("day" | "week" | "month" | "quarter" | "year")
label?: string
})[]
/**
 * @minItems 1
 * @maxItems 4
 */
measures: [({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}), ...(({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}))[]]
sort?: {
by: ("dimension" | "measure")
key?: string
dir?: ("asc" | "desc")
}
limit?: number
convertTo?: "BRL"
}
}
export interface RunCrmReportInput {
spec: {
source: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
/**
 * @maxItems 2
 */
joins?: {
leftField: string
rightSource: ("leads" | "crmOpportunities" | "leadActivities" | "leadProposals" | "crmAccounts" | "crmContacts")
rightField: string
alias?: string
}[]
/**
 * @maxItems 10
 */
filters?: {
field: string
op: ("eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte")
value: unknown
}[]
/**
 * @maxItems 2
 */
dimensions?: ({
type: "field"
field: string
label?: string
} | {
type: "period"
dateField: string
period: ("day" | "week" | "month" | "quarter" | "year")
label?: string
})[]
/**
 * @minItems 1
 * @maxItems 4
 */
measures: [({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}), ...(({
type: "count"
field?: string
alias?: string
} | {
type: "sum"
field: string
alias?: string
} | {
type: "avg"
field: string
alias?: string
}))[]]
sort?: {
by: ("dimension" | "measure")
key?: string
dir?: ("asc" | "desc")
}
limit?: number
convertTo?: "BRL"
}
timeZone?: string
}
export interface RunSavedCrmReportInput {
timeZone?: string
}
export interface ReportSeriesInput {
measure: string
points: {
name: string
value: number
recordIds?: string[]
tableSource?: string
}[]
}
export type CurrencyModeInput = (null | {
mode: "dimension"
field: string
} | {
mode: "filter"
field: string
value: ("BRL" | "USD" | "EUR")
} | {
mode: "undeclared"
})
export interface PtaxRateViewInput {
currency: ("USD" | "EUR")
side: "venda"
rate: number
rateDate: string
stale: boolean
source: "BCB_PTAX_FECHAMENTO"
}
export interface ConvertedViewInput {
target: "BRL"
referenceDate: string
rates: {
currency: ("USD" | "EUR")
side: "venda"
rate: number
rateDate: string
stale: boolean
source: "BCB_PTAX_FECHAMENTO"
}[]
series: {
measure: string
points: {
name: string
value: number
recordIds?: string[]
tableSource?: string
}[]
}[]
excluded: {
reason: ("NO_CURRENCY" | "UNDECLARED_CURRENCY" | "RATE_UNAVAILABLE")
measure?: string
currency?: string
rows: number
}[]
}
export interface RunCrmReportOutputInput {
series: {
measure: string
points: {
name: string
value: number
recordIds?: string[]
tableSource?: string
}[]
}[]
meta: {
rowsRead: number
truncated: false
currency: (null | {
mode: "dimension"
field: string
} | {
mode: "filter"
field: string
value: ("BRL" | "USD" | "EUR")
} | {
mode: "undeclared"
})
timeZone: string
}
converted?: {
target: "BRL"
referenceDate: string
rates: {
currency: ("USD" | "EUR")
side: "venda"
rate: number
rateDate: string
stale: boolean
source: "BCB_PTAX_FECHAMENTO"
}[]
series: {
measure: string
points: {
name: string
value: number
recordIds?: string[]
tableSource?: string
}[]
}[]
excluded: {
reason: ("NO_CURRENCY" | "UNDECLARED_CURRENCY" | "RATE_UNAVAILABLE")
measure?: string
currency?: string
rows: number
}[]
}
}
