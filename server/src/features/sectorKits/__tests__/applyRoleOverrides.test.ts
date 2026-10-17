/**
 * BE-INCR-KIT-SETOR PR-3, item 19 — `applyRoleOverrides` é pura: tabela de casos (sem ajuste = identidade; com
 * sub-chave; papel inexistente no binding = ignorado e listado em `unusedOverrides`).
 */
import type { EventBinding } from '@/features/accountingBinding/dtos/AccountingBindingDto';
import { applyRoleOverrides } from '@/features/sectorKits/services/applyRoleOverrides';
import { BEAUTY_SALON_KIT_V1 } from '@/features/sectorKits/kits/beautySalon/kit.v1';

const BINDINGS: EventBinding[] = BEAUTY_SALON_KIT_V1.binding.eventBindings;

/** `role → códigos` em todos os roleSlots — a fotografia que cada caso compara. */
function codesByRole(eventBindings: EventBinding[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const eb of eventBindings) for (const r of eb.roleSlots) (out[r.role] ??= []).push(r.accountCode);
  return out;
}

describe('applyRoleOverrides (item 19)', () => {
  it('sem ajuste: identidade', () => {
    const out = applyRoleOverrides(BINDINGS, []);
    expect(out.eventBindings).toEqual(BINDINGS);
    expect(out.unusedOverrides).toEqual([]);
  });

  it('troca o accountCode de TODO roleSlot do papel, e só dele', () => {
    const before = codesByRole(BINDINGS);
    const out = applyRoleOverrides(BINDINGS, [{ role: 'controle-recebível', accountCode: '1.1.9' }]);
    const after = codesByRole(out.eventBindings);
    expect(after['controle-recebível']).toEqual(['1.1.9', '1.1.9', '1.1.9', '1.1.9']); // 4 eventos usam o papel
    expect({ ...after, 'controle-recebível': [] }).toEqual({ ...before, 'controle-recebível': [] });
    expect(out.unusedOverrides).toEqual([]);
  });

  it('sub-chave: caixa-por-metodo:Pix é um papel próprio — não toca as outras sub-chaves', () => {
    const before = codesByRole(BINDINGS);
    const after = codesByRole(applyRoleOverrides(BINDINGS, [{ role: 'caixa-por-metodo:Pix', accountCode: '1.1.7' }]).eventBindings);
    expect(after['caixa-por-metodo:Pix']).toEqual(['1.1.7']);
    expect(after['caixa-por-metodo:Cash']).toEqual(before['caixa-por-metodo:Cash']);
    expect(after['caixa-por-metodo:Package Balance']).toEqual(before['caixa-por-metodo:Package Balance']);
  });

  it('papel que o binding não usa: ignorado e listado em unusedOverrides', () => {
    const out = applyRoleOverrides(BINDINGS, [
      { role: 'passivo-adiantamento', accountCode: '2.1.2' },
      { role: 'caixa-por-metodo', accountCode: '1.1.1' }, // papel-base sem sub-chave: o binding só usa sub-chaves
      { role: 'estoque', accountCode: '1.1.8' },
    ]);
    expect(out.unusedOverrides).toEqual(['passivo-adiantamento', 'caixa-por-metodo']);
    expect(codesByRole(out.eventBindings).estoque).toEqual(['1.1.8']);
  });

  it('não muta a entrada', () => {
    const snapshot = JSON.parse(JSON.stringify(BINDINGS));
    applyRoleOverrides(BINDINGS, [{ role: 'receita-serviço', accountCode: '3.5' }]);
    expect(BINDINGS).toEqual(snapshot);
  });
});
