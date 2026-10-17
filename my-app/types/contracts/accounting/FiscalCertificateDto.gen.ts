// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.
// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.
export interface UploadFiscalCertificateInput {
senha: string
}
export interface FiscalCertificateViewInput {
unitId: string
cnpjCertificado: string
notBefore: string
notAfter: string
diasParaVencer: number
fingerprintSha256: string
setAt: string
}
