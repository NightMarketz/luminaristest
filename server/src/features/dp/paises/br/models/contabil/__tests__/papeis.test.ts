/** BE-INCR-DP-PONTE-RAZAO item 18 — todo papel de rubrica vem do catálogo fechado; rubrica sem papel reprova. */
import { DP_RUBRICAS_VALIDADAS } from '../../../../../models/rubricas/catalogo';
import { PAYROLL_ACCOUNT_ROLES } from '../../../../../models/payrollAccountRole';
import { PAPEIS_BR_SEM_CONTA, PAPEIS_CONTABEIS_BR, PAPEL_CONTABIL_POR_RUBRICA } from '../papeis';

const papel = (codigo: string) => (PAPEL_CONTABIL_POR_RUBRICA as Record<string, string>)[codigo];

describe('item 18 — papel contábil de cada rubrica', () => {
  it('toda rubrica do catálogo validado tem papel, e o mapa não tem rubrica fora do catálogo', () => {
    const catalogo = DP_RUBRICAS_VALIDADAS.map((r) => r.codigo).sort();
    expect(catalogo.filter((c) => papel(c) === undefined)).toEqual([]);
    expect(Object.keys(PAPEL_CONTABIL_POR_RUBRICA).sort()).toEqual(catalogo);
  });

  it('todo papel do mapa está num dos dois catálogos (centro ou borda), e os dois não se sobrepõem', () => {
    const conhecidos = new Set<string>([...PAYROLL_ACCOUNT_ROLES, ...PAPEIS_CONTABEIS_BR]);
    expect(conhecidos.size).toBe(PAYROLL_ACCOUNT_ROLES.length + PAPEIS_CONTABEIS_BR.length);
    for (const p of Object.values(PAPEL_CONTABIL_POR_RUBRICA)) expect(conhecidos.has(p)).toBe(true);
    for (const p of PAPEIS_BR_SEM_CONTA) expect(PAPEIS_CONTABEIS_BR).toContain(p);
  });

  it('regra do BRIEF: proventos de 101/103 ⇒ SALARIES_EXPENSE (salvo o adiantamento); 723 ⇒ pró-labore; 901 ⇒ bolsa', () => {
    for (const r of DP_RUBRICAS_VALIDADAS) {
      if (r.tipo !== 'PROVENTO') continue;
      const cats = new Set(r.categorias);
      if (r.codigo === 'ADIANTAMENTO') expect(papel(r.codigo)).toBe('SALARY_ADVANCES');
      else if (r.codigo === 'SALARIO_FAMILIA') expect(papel(r.codigo)).toBe('SALARIO_FAMILIA');
      else if (cats.has('723')) expect(papel(r.codigo)).toBe('OWNER_PAY_EXPENSE');
      else if (cats.has('901')) expect(papel(r.codigo)).toBe('INTERNSHIP_STIPEND_EXPENSE');
      else expect(papel(r.codigo)).toBe('SALARIES_EXPENSE');
    }
  });

  it('encargos sobre a provisão divididos (dono, 26/11): férias no centro, 13º na borda, sem o papel único antigo', () => {
    expect(PAYROLL_ACCOUNT_ROLES).toEqual(expect.arrayContaining(['VACATION_PROVISION_CHARGES', 'VACATION_CHARGES_EXPENSE']));
    expect(PAPEIS_CONTABEIS_BR).toEqual(expect.arrayContaining(['ENCARGOS_PROVISAO_13', 'DESPESA_ENCARGOS_13']));
    const todos: readonly string[] = [...PAYROLL_ACCOUNT_ROLES, ...PAPEIS_CONTABEIS_BR];
    expect(todos.filter((p) => p === 'PROVISION_CHARGES' || p === 'PROVISION_CHARGES_EXPENSE')).toEqual([]);
    // Papel de provisão não é papel de rubrica: nenhuma rubrica do catálogo cai nos encargos.
    const encargos = new Set(['VACATION_PROVISION_CHARGES', 'VACATION_CHARGES_EXPENSE', 'ENCARGOS_PROVISAO_13', 'DESPESA_ENCARGOS_13']);
    expect(Object.values(PAPEL_CONTABIL_POR_RUBRICA).filter((p) => encargos.has(p))).toEqual([]);
  });

  it('descontos nunca caem num papel de despesa do centro', () => {
    for (const r of DP_RUBRICAS_VALIDADAS.filter((x) => x.tipo === 'DESCONTO')) {
      expect(papel(r.codigo)).not.toMatch(/_EXPENSE$/);
    }
  });
});
