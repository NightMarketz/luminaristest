/**
 * Porta pública da feature `accounting` para a conversão de código de conta do plano padrão para a forma posterior ao
 * leiaute 8 (`codigoPosL8`), que o referencial canônico dos kits de setor usa.
 * Regra `M1` (ADR-MODULE-BOUNDARIES §10 e §11.8; dono, questionário, 25/11/2026: "Pagar as 29").
 *
 * O plano de contas padrão é dado do Brasil e vai para `accounting/paises/br/` no PR-3.x da `accounting` (F-MBE-6 a).
 * Quando ele mudar de pasta, muda só a linha de reexport abaixo: quem importa por aqui não vê a mudança.
 */
export { codigoPosL8 } from '../fixtures/ChartOfAccountsFixture';
