/**
 * Porta pública da feature `accounting` para a conversão de código de conta do plano padrão para a forma posterior ao
 * leiaute 8 (`codigoPosL8`), que o referencial canônico dos kits de setor usa.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 *
 * O plano de contas padrão é dado do Brasil e vai para `accounting/paises/br/domain/` (F-MBE-6 a) quando existir a porta do
 * F-PBF1-7 do PAIS-NA-BORDA: no renome da `accounting` (27/11/2026) a pasta ficou, como etapa declarada (L-20261127-122628-dabb).
 * Quando ele mudar de pasta, muda só a linha de reexport abaixo: quem importa por aqui não vê a mudança.
 */
export { codigoPosL8 } from '../fixtures/ChartOfAccountsFixture';
