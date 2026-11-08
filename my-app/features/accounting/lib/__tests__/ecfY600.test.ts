import { describe, it, expect } from 'vitest';
import {
  emptyDirigente,
  emptySocio,
  qualifOptions,
  qualifRepLegOptions,
  retainForVigencias,
  toY600Payload,
  validateY600Draft,
  type DirigenteDraft,
  type SocioDraft,
  type ValoresDraft,
  type Y600Draft,
  type Y600Vigencia,
} from '../ecfY600';

/**
 * FE-INCR-ECF-Y600 PR-1 item 14 — um caso por código do `validateY600Draft`, os 4 casos do QUALIF (p. 574) e o
 * `toY600Payload` no contrato do `SocioEcfSchema`/`DirigenteEcfSchema` (chaves só do schema; um complemento por vigência).
 */

const vig = (o: Partial<Y600Vigencia> = {}): Y600Vigencia => ({
  partnerId: 'p1', nome: 'SOCIA', taxIdFinal: '4725', tipoPessoa: 'PF', residenteBrasil: true, participacaoBp: 10000,
  entradaEm: '2020-01-01', saidaEm: null, dtFimSoc: null, vigenteNoFim: true, ...o,
});
const zeros = (): ValoresDraft => ({ remTrab: '0', lucDiv: '0', jurCap: '0', demRend: '0', irRet: '0' });
const socio = (o: Partial<SocioDraft> = {}): SocioDraft => ({ ...emptySocio(), qualif: '02', valores: zeros(), ...o });
const dirigente = (o: Partial<DirigenteDraft> = {}): DirigenteDraft => ({
  ...emptyDirigente(), nome: 'DIRETORA', cpf: '39053344705', qualif: '11', dtAltSoc: '2024-03-01', valores: zeros(), ...o,
});
const draft = (socios: Record<string, SocioDraft> = { p1: socio() }, dirigentes: DirigenteDraft[] = []): Y600Draft => ({ socios, dirigentes });
const check = (d: Y600Draft, v: Y600Vigencia[] = [vig()]) => validateY600Draft(v, d, 2025);

describe('qualifOptions (R3, REGRA_Y600_QUALIF p. 574)', () => {
  it('devolve a lista de cada um dos 4 casos e nunca o 18', () => {
    expect(qualifOptions('PF', true)).toEqual(['01', '02', '09', '10', '11', '12', '13', '14', '15', '16', '17']);
    expect(qualifOptions('PJ', true)).toEqual(['03', '04']);
    expect(qualifOptions('PF', false)).toEqual(['05', '06', '14']);
    expect(qualifOptions('PJ', false)).toEqual(['07', '08']);
    for (const [t, r] of [['PF', true], ['PJ', true], ['PF', false], ['PJ', false]] as const) {
      expect(qualifOptions(t, r)).not.toContain('18');
    }
  });

  it('QUALIF_REP_LEG (R5, p. 573): PF 01..06, PJ só 01 e 06', () => {
    expect(qualifRepLegOptions('PF')).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(qualifRepLegOptions('PJ')).toEqual(['01', '06']);
  });
});

describe('validateY600Draft — um caso por código', () => {
  it('rascunho completo passa (controle dos negativos)', () => {
    expect(check(draft())).toBeNull();
    expect(check(draft({}, [dirigente()]), [])).toBeNull();
  });

  it('y600.semOcorrencia: sem vigência e sem dirigente (R7)', () => {
    expect(check(draft({}), [])).toBe('y600.semOcorrencia');
  });

  it('y600.qualifObrigatoria: vigência sem complemento ou sem QUALIF', () => {
    expect(check(draft({}))).toBe('y600.qualifObrigatoria');
    expect(check(draft({ p1: socio({ qualif: '' }) }))).toBe('y600.qualifObrigatoria');
    expect(check(draft({}, [dirigente({ qualif: '' })]), [])).toBe('y600.qualifObrigatoria');
  });

  it('y600.qualifIncoerente: QUALIF fora do caso, representante PJ fora de 01/06, dirigente fora de 10..17', () => {
    expect(check(draft({ p1: socio({ qualif: '03' }) }))).toBe('y600.qualifIncoerente');
    const pj = vig({ tipoPessoa: 'PJ' });
    expect(check(draft({ p1: socio({ qualif: '04', rep: { cpf: '52998224725', qualif: '02' } }) }), [pj])).toBe('y600.qualifIncoerente');
    expect(check(draft({}, [dirigente({ qualif: '02' })]), [])).toBe('y600.qualifIncoerente');
  });

  it('y600.valorObrigatorio: valor em branco é erro, nunca zero (R2)', () => {
    expect(check(draft({ p1: socio({ valores: { ...zeros(), irRet: '' } }) }))).toBe('y600.valorObrigatorio');
    expect(check(draft({ p1: socio({ valores: { ...zeros(), lucDiv: '   ' } }) }))).toBe('y600.valorObrigatorio');
  });

  it('y600.valorInvalido: texto, sinal ou separador solto', () => {
    for (const bad of ['abc', '-10', '10,', '1e3']) {
      expect(check(draft({ p1: socio({ valores: { ...zeros(), remTrab: bad } }) }))).toBe('y600.valorInvalido');
    }
  });

  it('y600.paisObrigatorio e y600.paisInvalido: só para não residente (R4)', () => {
    const ex = vig({ residenteBrasil: false });
    expect(check(draft({ p1: socio({ qualif: '06' }) }), [ex])).toBe('y600.paisObrigatorio');
    expect(check(draft({ p1: socio({ qualif: '06', pais: '105' }) }), [ex])).toBe('y600.paisInvalido');
    expect(check(draft({ p1: socio({ qualif: '06', pais: '24' }) }), [ex])).toBe('y600.paisInvalido');
    expect(check(draft({ p1: socio({ qualif: '06', pais: '249' }) }), [ex])).toBeNull();
  });

  it('y600.representanteIncompleto: CPF sem qualif ou qualif sem CPF (M12)', () => {
    expect(check(draft({ p1: socio({ rep: { cpf: '52998224725', qualif: '' } }) }))).toBe('y600.representanteIncompleto');
    expect(check(draft({ p1: socio({ rep: { cpf: '', qualif: '01' } }) }))).toBe('y600.representanteIncompleto');
  });

  it('y600.cpfInvalido: DV errado no representante ou no dirigente', () => {
    expect(check(draft({ p1: socio({ rep: { cpf: '52998224724', qualif: '01' } }) }))).toBe('y600.cpfInvalido');
    expect(check(draft({}, [dirigente({ cpf: '11111111111' })]), [])).toBe('y600.cpfInvalido');
  });

  it('y600.dtFimAntesDoInicio e y600.dtFimForaDoAno (R6, REGRA_DATA_FIM_SOC p. 574)', () => {
    expect(check(draft({}, [dirigente({ dtAltSoc: '2025-05-01', dtFimSoc: '2025-04-30' })]), [])).toBe('y600.dtFimAntesDoInicio');
    expect(check(draft({}, [dirigente({ dtFimSoc: '2026-01-01' })]), [])).toBe('y600.dtFimForaDoAno');
    expect(check(draft({}, [dirigente({ dtFimSoc: '2025-12-31' })]), [])).toBeNull();
  });

  it('y600.percVotInvalido: fora de 0..100 ou não numérico; vazio vale (R8)', () => {
    expect(check(draft({ p1: socio({ percVot: '101' }) }))).toBe('y600.percVotInvalido');
    expect(check(draft({ p1: socio({ percVot: 'x' }) }))).toBe('y600.percVotInvalido');
    expect(check(draft({ p1: socio({ percVot: '' }) }))).toBeNull();
  });
});

describe('toY600Payload', () => {
  it('dinheiro "1.234,56" vira 123456 centavos e o residente sai sem pais, voto e representante', () => {
    const { socios } = toY600Payload([vig()], draft({ p1: socio({ valores: { ...zeros(), remTrab: '1.234,56' } }) }));
    expect(socios).toEqual([
      { partnerId: 'p1', qualif: '02', valores: { remTrabCents: 123456, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } },
    ]);
  });

  it('não residente leva pais; voto % vira bp; representante completo sai com CPF só em dígitos', () => {
    const { socios } = toY600Payload(
      [vig({ residenteBrasil: false })],
      draft({ p1: socio({ qualif: '06', pais: ' 249 ', percVot: '33,3', rep: { cpf: '529.982.247-25', qualif: '01' } }) }),
    );
    expect(socios[0]).toEqual({
      partnerId: 'p1', qualif: '06', pais: '249', percCapVotBp: 3330,
      representanteLegal: { cpf: '52998224725', qualif: '01' },
      valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 },
    });
  });

  it('pais digitado para residente não sai (o servidor recusaria com ECF_Y600_PAIS_INCOERENTE)', () => {
    const { socios } = toY600Payload([vig()], draft({ p1: socio({ pais: '249' }) }));
    expect(socios[0]).not.toHaveProperty('pais');
  });

  it('um complemento por vigência da lista, mesmo com chave órfã no rascunho', () => {
    const { socios } = toY600Payload([vig()], draft({ p1: socio(), orfao: socio() }));
    expect(socios.map((s) => s.partnerId)).toEqual(['p1']);
  });

  it('nunca emite chave fora do schema (SocioEcfSchema/DirigenteEcfSchema .strict())', () => {
    const { socios, dirigentes } = toY600Payload(
      [vig({ residenteBrasil: false })],
      draft({ p1: socio({ qualif: '06', pais: '249', percVot: '50', rep: { cpf: '52998224725', qualif: '01' } }) }, [
        dirigente({ dtFimSoc: '2025-09-30', rep: { cpf: '52998224725', qualif: '03' } }),
      ]),
    );
    const SOCIO_KEYS = ['partnerId', 'qualif', 'pais', 'percCapVotBp', 'representanteLegal', 'valores'];
    const DIR_KEYS = ['nome', 'cpf', 'qualif', 'dtAltSoc', 'dtFimSoc', 'representanteLegal', 'valores'];
    const VAL_KEYS = ['remTrabCents', 'lucDivCents', 'jurCapCents', 'demRendCents', 'irRetCents'];
    for (const k of Object.keys(socios[0])) expect(SOCIO_KEYS).toContain(k);
    for (const k of Object.keys(dirigentes[0])) expect(DIR_KEYS).toContain(k);
    expect(Object.keys(socios[0].valores).sort()).toEqual([...VAL_KEYS].sort());
    expect(Object.keys(dirigentes[0].representanteLegal ?? {}).sort()).toEqual(['cpf', 'qualif']);
  });

  it('dirigente: aparado, CPF em dígitos, dtFimSoc e representante vazios omitidos', () => {
    const { dirigentes } = toY600Payload([], draft({}, [dirigente({ nome: ' DIRETORA ', cpf: '390.533.447-05' })]));
    expect(dirigentes).toEqual([
      { nome: 'DIRETORA', cpf: '39053344705', qualif: '11', dtAltSoc: '2024-03-01', valores: { remTrabCents: 0, lucDivCents: 0, jurCapCents: 0, demRendCents: 0, irRetCents: 0 } },
    ]);
  });
});

describe('retainForVigencias (item 8 — troca de ano)', () => {
  it('mantém o complemento dos partnerId que seguem na lista e os dirigentes; descarta os outros', () => {
    const d = draft({ p1: socio({ qualif: '01' }), p2: socio() }, [dirigente()]);
    const kept = retainForVigencias(d, [vig({ partnerId: 'p1' }), vig({ partnerId: 'p3' })]);
    expect(Object.keys(kept.socios)).toEqual(['p1']);
    expect(kept.socios.p1.qualif).toBe('01');
    expect(kept.dirigentes).toHaveLength(1);
  });
});
