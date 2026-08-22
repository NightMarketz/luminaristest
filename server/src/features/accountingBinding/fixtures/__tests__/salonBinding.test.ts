import { AccountingBindingV1Schema } from '../../dtos/AccountingBindingDto';
import { computeCompiledFromHash } from '../../services/BindingCompileService';
import { SALON_BINDING_V1 } from '../salonBinding';

/**
 * Gate do fixture (Corpo C, item 10 do BRIEF) — insumo do golden test do Corpo D. Não repete a
 * asserção de shape genérico (`AccountingBindingV1Schema` já é testado em
 * `dtos/__tests__/AccountingBindingDto.test.ts`); prova o que É específico deste dado: os 5
 * sourceTypes classe-1, os accountCodes citados dos mappers, e que `caixa-por-metodo` cobre os 5
 * métodos que `SalonSaleSettledMapper.DEBIT_ACCOUNT_BY_METHOD` mapeia hoje.
 */
describe('SALON_BINDING_V1 — CONTROLE', () => {
  it('valida contra o AccountingBindingV1Schema — não é vacuidade, o módulo já falharia no import se não validasse', () => {
    expect(AccountingBindingV1Schema.safeParse(SALON_BINDING_V1).success).toBe(true);
  });

  it('sectorKey é beautySalon e bindingVersion é 1 (fixture de referência, não versão real)', () => {
    expect(SALON_BINDING_V1.sectorKey).toBe('beautySalon');
    expect(SALON_BINDING_V1.bindingVersion).toBe(1);
  });
});

describe('SALON_BINDING_V1 — cobertura dos 5 sourceTypes classe-1 (item 10 do BRIEF)', () => {
  const eventKeys = SALON_BINDING_V1.eventBindings.map((eb) => eb.eventKey);

  it('cobre exatamente os 5 sourceTypes dos mappers de produção — nem a mais nem a menos', () => {
    expect(eventKeys.sort()).toEqual(
      [
        'salon.package.sold',
        'salon.sale.cogs',
        'salon.sale.finalized',
        'salon.sale.returned',
        'salon.sale.settled',
      ].sort(),
    );
  });

  it('NÃO inclui subledger_command — a classe 2 (CrmReceivableBridge) fica fora do escopo v1 do salão', () => {
    const archetypeKeys = SALON_BINDING_V1.eventBindings.map((eb) => eb.archetypeKey);
    expect(archetypeKeys).not.toContain('subledger_command');
  });
});

describe('SALON_BINDING_V1 — accountCodes citados dos mappers, por eventKey', () => {
  const byEvent = (eventKey: string) =>
    SALON_BINDING_V1.eventBindings.find((eb) => eb.eventKey === eventKey)!;
  const codes = (eventKey: string) => byEvent(eventKey).roleSlots.map((r) => r.accountCode);

  it('salon.sale.finalized — 1.1.2 (D) / 3.1+3.3 (C), SalonSaleFinalizedMapper.ts + revenueSplit.ts', () => {
    expect(codes('salon.sale.finalized').sort()).toEqual(['1.1.2', '3.1', '3.3']);
    expect(byEvent('salon.sale.finalized').archetypeKey).toBe('revenue_recognition');
  });

  it('salon.sale.settled — os 4 códigos de DEBIT_ACCOUNT_BY_METHOD + 1.1.2, SalonSaleSettledMapper.ts:36-42', () => {
    const settled = byEvent('salon.sale.settled');
    const byRole = Object.fromEntries(settled.roleSlots.map((r) => [r.role, r.accountCode]));
    expect(byRole['caixa-por-metodo:Cash']).toBe('1.1.3');
    expect(byRole['caixa-por-metodo:Pix']).toBe('1.1.1');
    expect(byRole['caixa-por-metodo:Debit Card']).toBe('1.1.4');
    expect(byRole['caixa-por-metodo:Credit Card']).toBe('1.1.4');
    // Package Balance NUNCA cash (D1-Q10) — trava o mesmo invariante que o guard defensivo do mapper.
    expect(byRole['caixa-por-metodo:Package Balance']).toBe('2.1.1');
    expect(byRole['controle-recebível']).toBe('1.1.2');
    expect(settled.archetypeKey).toBe('settlement');
  });

  it('salon.sale.returned — 3.2 (D) / 1.1.2 (C), SalonSaleReturnedMapper.ts', () => {
    expect(codes('salon.sale.returned').sort()).toEqual(['1.1.2', '3.2']);
    expect(byEvent('salon.sale.returned').archetypeKey).toBe('reversal');
  });

  it('salon.package.sold — 1.1.2 (D) / 2.1.1 (C), SalonPackageSoldMapper.ts', () => {
    expect(codes('salon.package.sold').sort()).toEqual(['1.1.2', '2.1.1']);
    expect(byEvent('salon.package.sold').archetypeKey).toBe('performance_liability');
  });

  it('salon.sale.cogs — 4.2 (D) / 1.1.6 (C), SalonSaleCogsMapper.ts — costCents já em centavos', () => {
    expect(codes('salon.sale.cogs').sort()).toEqual(['1.1.6', '4.2']);
    expect(byEvent('salon.sale.cogs').archetypeKey).toBe('cogs');
    expect(byEvent('salon.sale.cogs').fieldSlots[0]).toMatchObject({
      slotName: 'costCents',
      transform: 'identity', // NÃO cents_from_reais — já é inteiro exato (moneyCentsExact)
    });
  });
});

describe('SALON_BINDING_V1 — slot `dimension` presente em todo eventBinding', () => {
  /**
   * Os 5 arquétipos de código (`archetypes/*.ts`, Corpo A) declaram um slot `dimension` em TODO
   * arquétipo (emenda 2, ADR §11) e `interpret.ts` (`resolveSlotValues`, Corpo D) lança
   * `ValidationError` se QUALQUER slot declarado não tiver um `fieldSlot` correspondente no
   * binding — não há exceção de "opcional" implementada nem em `ArchetypeSlotSpec` (sem campo
   * `optional`) nem no laço do intérprete. Sem esta entrada, o fixture não sobreviveria a
   * `interpret()`/à checagem #2 do validador real — não é redundância, é o que faz este dado ser
   * consumível de ponta a ponta pelos Corpos A/B/D.
   */
  it.each(SALON_BINDING_V1.eventBindings.map((eb) => eb.eventKey))(
    '%s carrega fieldSlot "dimension"',
    (eventKey) => {
      const eb = SALON_BINDING_V1.eventBindings.find((e) => e.eventKey === eventKey)!;
      const dimensionSlot = eb.fieldSlots.find((s) => s.slotName === 'dimension');
      expect(dimensionSlot).toBeDefined();
      expect(dimensionSlot!.transform).toBe('identity');
    },
  );
});

describe('SALON_BINDING_V1 — compiledFromHash é determinístico', () => {
  it('recalcular o hash do mesmo snapshot canônico produz o MESMO valor — controle de não-vacuidade incluso', () => {
    // Controle primeiro: dois inputs DIFERENTES produzem hashes DIFERENTES — sem isto, uma função
    // que sempre devolve a mesma string passaria no teste positivo abaixo por vacuidade.
    const hashA = computeCompiledFromHash({ a: 1 }, [{ code: '1.1.2', nature: 'Asset', acceptsEntries: true }]);
    const hashB = computeCompiledFromHash({ a: 2 }, [{ code: '1.1.2', nature: 'Asset', acceptsEntries: true }]);
    expect(hashA).not.toBe(hashB);

    // Positivo: mesmo conteúdo semântico, ORDEM de chave diferente no objeto e ORDEM diferente no
    // array do chart → mesmo hash (canonicalização, não serialização ingênua).
    const chartEmOrdem = [
      { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
      { code: '3.1', nature: 'Revenue', acceptsEntries: true },
    ];
    const chartForaDeOrdem = [chartEmOrdem[1], chartEmOrdem[0]];
    const h1 = computeCompiledFromHash({ x: 1, y: 2 }, chartEmOrdem);
    const h2 = computeCompiledFromHash({ y: 2, x: 1 }, chartForaDeOrdem);
    expect(h1).toBe(h2);
  });

  it('SALON_BINDING_V1.compiledFromHash bate com um recálculo independente do MESMO snapshot', () => {
    const recomputed = computeCompiledFromHash(
      {
        'salon.sale.finalized': ['amount', 'revenueByNature', 'dimension'],
        'salon.sale.settled': ['amount', 'paymentMethod', 'dimension'],
        'salon.sale.returned': ['amount', 'dimension'],
        'salon.package.sold': ['amount', 'dimension'],
        'salon.sale.cogs': ['costCents', 'dimension'],
      },
      [
        { code: '1.1.1', nature: 'Asset', acceptsEntries: true },
        { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
        { code: '1.1.3', nature: 'Asset', acceptsEntries: true },
        { code: '1.1.4', nature: 'Asset', acceptsEntries: true },
        { code: '1.1.6', nature: 'Asset', acceptsEntries: true },
        { code: '2.1.1', nature: 'Liability', acceptsEntries: true },
        { code: '3.1', nature: 'Revenue', acceptsEntries: true },
        { code: '3.2', nature: 'Revenue', acceptsEntries: true },
        { code: '3.3', nature: 'Revenue', acceptsEntries: true },
        { code: '4.2', nature: 'Expense', acceptsEntries: true },
      ],
    );
    expect(SALON_BINDING_V1.compiledFromHash).toBe(recomputed);
  });
});
