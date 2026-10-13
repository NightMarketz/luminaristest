/**
 * BE-INCR-KIT-SETOR PR-3, item 20 + §6 do BRIEF ("o executor extrai a tabela e a congela num teste"): a natureza
 * aceita por papel no gate do ajuste é a MESMA tabela do validador do binding (`ROLE_ALLOWED_NATURES`). Congelada
 * aqui; e cada papel que os kits publicados usam tem, no próprio kit, uma conta cuja natureza a tabela aceita — a
 * tabela não pode recusar o que o kit traz.
 */
import { ACCOUNT_ROLES } from '@/features/accountingBinding/models/types';
import { ROLE_ALLOWED_NATURES, baseRole } from '@/features/accountingBinding/services/BindingValidationService';
import { CANONICAL_ACCOUNTS } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import { KIT_REGISTRY } from '@/features/sectorKits/registry';

describe('tabela papel → natureza do ajuste (item 20)', () => {
  it('congelada: os 10 papéis e as naturezas de cada um', () => {
    expect(ROLE_ALLOWED_NATURES).toEqual({
      'controle-recebível': ['Asset'],
      'receita-serviço': ['Revenue'],
      'receita-revenda': ['Revenue'],
      'caixa-por-metodo': ['Asset', 'Liability'],
      'contra-receita': ['Revenue'],
      'passivo-diferido': ['Liability'],
      'passivo-adiantamento': ['Liability'],
      'custo-mercadoria-vendida': ['Expense'],
      estoque: ['Asset'],
      'receita-nao-uso': ['Revenue'],
    });
    expect(Object.keys(ROLE_ALLOWED_NATURES).sort()).toEqual([...ACCOUNT_ROLES].sort());
  });

  it('a conta que cada kit publicado traz para o papel tem natureza aceita pela tabela', () => {
    for (const versions of Object.values(KIT_REGISTRY)) {
      for (const kit of versions) {
        const chart = new Map([...CANONICAL_ACCOUNTS, ...kit.chartExtension].map((a) => [a.code, a.nature]));
        for (const eb of kit.binding.eventBindings) {
          for (const slot of eb.roleSlots) {
            const allowed = ROLE_ALLOWED_NATURES[baseRole(slot.role) as keyof typeof ROLE_ALLOWED_NATURES];
            expect({ kit: `${kit.kitKey} v${kit.kitVersion}`, role: slot.role, ok: allowed.includes(chart.get(slot.accountCode)!) }).toEqual({
              kit: `${kit.kitKey} v${kit.kitVersion}`,
              role: slot.role,
              ok: true,
            });
          }
        }
      }
    }
  });
});
