/**
 * EFICIENCIA-FISCAL PR-4 itens 19–21 (BRIEF BE-INCR-EFICIENCIA-FISCAL; D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO #1–#4) —
 * alertas puros de salão-parceiro, interdependência e projeção, e os contratos Zod dos dados declarados.
 */
import { AlertaSimplesSchema, ChecklistParceriaSchema, SalaoParceriaContratoPatchSchema, SalaoParceriaContratoSchema } from '../../dtos/SimplesDto';
import { CreatePartnerSchema, OutraParticipacaoSchema } from '../../dtos/PartnerDto';
import {
  alertasDeInterdependencia,
  alertasDeParceria,
  alertasDeProjecao,
  contratoEmEfeitoNoMes,
  incisosDaParticipacao,
  receitaProjetadaDoAno,
  type ContratoParceria,
} from '../taxOptimizationAlertas';

const CNPJ_A = '11222333000181';
const CNPJ_B = '11444777000161';
const CHECK_OK = { clausulaLocacaoBemMovel: 'SIM', clausulaCusteio: 'SIM', nfseEmitidaPeloParceiro: 'SIM' } as const;
const contrato = (o: Partial<ContratoParceria> = {}): ContratoParceria => ({
  id: 'c1',
  profissionalContactId: 'emp-1',
  homologadoEm: '2026-01-10',
  vigenteDesde: '2026-01-10',
  vigenteAte: null,
  deletedAt: null,
  profissionalCnpj: CNPJ_A,
  checklistDeclarado: CHECK_OK,
  ...o,
});
const codigos = (as: ReadonlyArray<{ codigo: string }>) => as.map((a) => a.codigo).sort();

describe('item 19 — contratos dos dados declarados (I-19)', () => {
  const BASE = { unitId: 'u', profissionalContactId: 'emp-1', cotaSalaoBp: 4000, naturezaCota: 'GESTAO', homologadoEm: '2026-01-10', sindicato: 'Sind', vigenteDesde: '2026-01-10', vigenteAte: null };
  it('CNPJ e checklist são opcionais no POST e aceitos com DV certo', () => {
    expect(SalaoParceriaContratoSchema.safeParse(BASE).success).toBe(true);
    expect(SalaoParceriaContratoSchema.safeParse({ ...BASE, profissionalCnpj: CNPJ_A, checklistDeclarado: CHECK_OK }).success).toBe(true);
    expect(SalaoParceriaContratoPatchSchema.safeParse({ unitId: 'u', profissionalCnpj: null, checklistDeclarado: null }).success).toBe(true);
  });
  it('CNPJ com DV errado, resposta fora do enum ou chave extra no checklist → recusa', () => {
    expect(SalaoParceriaContratoSchema.safeParse({ ...BASE, profissionalCnpj: '11222333000182' }).success).toBe(false);
    expect(ChecklistParceriaSchema.safeParse({ ...CHECK_OK, clausulaCusteio: 'TALVEZ' }).success).toBe(false);
    expect(ChecklistParceriaSchema.safeParse({ ...CHECK_OK, extra: 'SIM' }).success).toBe(false);
  });
  it('os códigos novos são aceitos pelo contrato do alerta', () => {
    for (const codigo of ['PARCERIA_COTA_SEM_CONTRATO', 'PARCERIA_SEM_COTA', 'PARCEIRO_SEM_CNPJ', 'PARCERIA_CHECKLIST_INCOMPLETO', 'INTERDEPENDENCIA_SOCIO', 'INTERDEPENDENCIA_RECEITA_NAO_INFORMADA', 'PROJECAO_LIMITE_EPP', 'PROJECAO_SUBLIMITE_ICMS_ISS']) {
      expect(AlertaSimplesSchema.safeParse({ codigo, detalhe: 'x', severity: 'WARNING' }).success).toBe(true);
    }
  });
});

describe('item 19 — alertasDeParceria', () => {
  it('contrato completo com a cota no mês ⇒ nenhum alerta', () => {
    expect(alertasDeParceria('2026-03', [{ dia: '2026-03-05', parceriaContratoId: 'c1', cotaProfissionalCents: 6000n }], [contrato()])).toEqual([]);
  });

  it('cota cujo contrato foi removido, saiu de vigência ou não estava homologado no dia ⇒ PARCERIA_COTA_SEM_CONTRATO (WARNING, soma das cotas)', () => {
    const removido = contrato({ id: 'c2', deletedAt: new Date('2026-03-20T00:00:00Z') });
    const vencido = contrato({ id: 'c3', vigenteAte: '2026-03-01' });
    const semHomolog = contrato({ id: 'c4', homologadoEm: '2026-03-10' });
    const as = alertasDeParceria(
      '2026-03',
      [
        { dia: '2026-03-05', parceriaContratoId: 'c2', cotaProfissionalCents: 1000n },
        { dia: '2026-03-05', parceriaContratoId: 'c3', cotaProfissionalCents: 2000n },
        { dia: '2026-03-05', parceriaContratoId: 'c4', cotaProfissionalCents: 3000n },
        { dia: '2026-03-05', parceriaContratoId: 'sumiu', cotaProfissionalCents: 4000n },
      ],
      [removido, vencido, semHomolog],
    );
    const a = as.find((x) => x.codigo === 'PARCERIA_COTA_SEM_CONTRATO')!;
    expect(a.severity).toBe('WARNING');
    expect(a.detalhe).toContain('R$ 100,00');
    expect(a.detalhe).toContain('4 linha(s)');
  });

  it('contrato em efeito sem cota no mês ⇒ PARCERIA_SEM_COTA (INFO); fora do mês não alerta', () => {
    expect(codigos(alertasDeParceria('2026-03', [], [contrato()]))).toEqual(['PARCERIA_SEM_COTA']);
    expect(alertasDeParceria('2025-12', [], [contrato()])).toEqual([]);
    expect(alertasDeParceria('2026-03', [], [contrato({ deletedAt: new Date() })])).toEqual([]);
  });

  it('sem CNPJ ⇒ PARCEIRO_SEM_CNPJ (WARNING, cita o § 7º como faculdade); checklist ausente ou com item ≠ SIM ⇒ PARCERIA_CHECKLIST_INCOMPLETO (INFO) listando os itens', () => {
    const linhas = [{ dia: '2026-03-05', parceriaContratoId: 'c1', cotaProfissionalCents: 1n }];
    const semCnpj = alertasDeParceria('2026-03', linhas, [contrato({ profissionalCnpj: null })]);
    expect(semCnpj.map((a) => [a.codigo, a.severity])).toEqual([['PARCEIRO_SEM_CNPJ', 'WARNING']]);
    expect(semCnpj[0].detalhe).toContain('§ 7º');
    expect(semCnpj[0].detalhe).toContain('permite');
    const parcial = alertasDeParceria('2026-03', linhas, [contrato({ checklistDeclarado: { ...CHECK_OK, clausulaCusteio: 'NAO_INFORMADO' } })]);
    expect(parcial.map((a) => [a.codigo, a.severity])).toEqual([['PARCERIA_CHECKLIST_INCOMPLETO', 'INFO']]);
    expect(parcial[0].detalhe).toContain('% de custeio');
    expect(parcial[0].detalhe).not.toContain('% de locação');
    expect(alertasDeParceria('2026-03', linhas, [contrato({ checklistDeclarado: null })])[0].detalhe).toContain('NFS-e emitida pelo parceiro');
  });

  it('contratoEmEfeitoNoMes: homologação no meio do mês conta; início depois do mês ou fim antes dele não', () => {
    expect(contratoEmEfeitoNoMes(contrato({ homologadoEm: '2026-03-31' }), '2026-03')).toBe(true);
    expect(contratoEmEfeitoNoMes(contrato({ vigenteDesde: '2026-04-01', homologadoEm: '2026-04-01' }), '2026-03')).toBe(false);
    expect(contratoEmEfeitoNoMes(contrato({ vigenteAte: '2026-02-28' }), '2026-03')).toBe(false);
    expect(contratoEmEfeitoNoMes(contrato({ homologadoEm: '2026-04-02' }), '2026-03')).toBe(false);
  });
});

describe('item 21 — projeção do ano (decisão #4)', () => {
  const EPP = 480_000_000n;
  const SUB = 360_000_000n;
  const lim = [
    { codigo: 'PROJECAO_LIMITE_EPP' as const, limiteCents: EPP },
    { codigo: 'PROJECAO_SUBLIMITE_ICMS_ISS' as const, limiteCents: SUB },
  ];

  it('receitaProjetadaDoAno: acumulado ÷ meses decorridos × meses do ano; no ano de início, sobre os meses de atividade', () => {
    expect(receitaProjetadaDoAno(150_000_000n, '2026-06', '2020-01')).toBe(300_000_000n);
    expect(receitaProjetadaDoAno(100_000_000n, '2026-06', '2026-04')).toBe(300_000_000n); // 3 meses → 9 meses de atividade
    expect(receitaProjetadaDoAno(1n, '2026-03', '2026-05')).toBeNull();
  });

  it('abaixo de 80% ⇒ nada; ≥ 80% e dentro do limite ⇒ WARNING "dentro do limite" com o artigo', () => {
    expect(alertasDeProjecao(100n, 287_000_000n, lim)).toEqual([]);
    const as = alertasDeProjecao(100n, 288_000_000n, lim);
    expect(as.map((a) => a.codigo)).toEqual(['PROJECAO_SUBLIMITE_ICMS_ISS']);
    expect(as[0].detalhe).toContain('dentro do limite');
    expect(as[0].detalhe).toContain('art. 13-A');
  });

  it('excesso projetado até 20% ⇒ efeitos em janeiro; acima de 20% ⇒ mês seguinte (LC 123 §§ 9º e 9º-A)', () => {
    const ate20 = alertasDeProjecao(100n, 576_000_000n, lim).find((a) => a.codigo === 'PROJECAO_LIMITE_EPP')!;
    expect(ate20.detalhe).toContain('janeiro do ano seguinte');
    expect(ate20.detalhe).toContain('§§ 9º e 9º-A');
    const acima = alertasDeProjecao(100n, 576_000_001n, lim).find((a) => a.codigo === 'PROJECAO_LIMITE_EPP')!;
    expect(acima.detalhe).toContain('mês seguinte ao excesso');
  });

  it('acumulado já acima do limite ⇒ sem projeção (o X14 já avisa o excesso); projeção nula ⇒ nada', () => {
    expect(alertasDeProjecao(SUB + 1n, 600_000_000n, lim).map((a) => a.codigo)).toEqual(['PROJECAO_LIMITE_EPP']);
    expect(alertasDeProjecao(1n, null, lim)).toEqual([]);
  });
});

describe('item 20 — interdependência (LC 123 art. 3º § 4º III, IV e V; decisão #3)', () => {
  const part = (o: Partial<Parameters<typeof incisosDaParticipacao>[1]> = {}) => ({ cnpj: CNPJ_B, participacaoBp: 500, empresaNoSimples: true, administrador: false, ...o });

  it('contrato do dado: CNPJ com DV, booleans obrigatórios, receita opcional, chave extra recusada; o sócio aceita a lista', () => {
    expect(OutraParticipacaoSchema.safeParse(part()).success).toBe(true);
    expect(OutraParticipacaoSchema.safeParse(part({ cnpj: '11444777000162' })).success).toBe(false);
    expect(OutraParticipacaoSchema.safeParse({ cnpj: CNPJ_B, participacaoBp: 1 }).success).toBe(false);
    expect(OutraParticipacaoSchema.safeParse({ ...part(), extra: 1 }).success).toBe(false);
    const socio = { unitId: 'u', nome: 'Ana', taxId: '52998224725', residenteBrasil: true, participacaoBp: 5000, entradaEm: '2026-01-01' };
    expect(CreatePartnerSchema.safeParse({ ...socio, outrasParticipacoes: [part({ receitaBrutaAnualCents: 100 })] }).success).toBe(true);
    expect(CreatePartnerSchema.safeParse({ ...socio, outrasParticipacoes: null }).success).toBe(true);
  });

  it('incisos: III só PF em empresa do Simples; IV > 10% em empresa fora; V administrador', () => {
    expect(incisosDaParticipacao({ tipoPessoa: 'PF' }, part())).toEqual(['III']);
    expect(incisosDaParticipacao({ tipoPessoa: 'PJ' }, part())).toEqual([]);
    expect(incisosDaParticipacao({ tipoPessoa: 'PF' }, part({ empresaNoSimples: false, participacaoBp: 1000 }))).toEqual([]);
    expect(incisosDaParticipacao({ tipoPessoa: 'PF' }, part({ empresaNoSimples: false, participacaoBp: 1001, administrador: true }))).toEqual(['IV', 'V']);
  });

  it('receita global acima de R$ 4,8 mi ⇒ INTERDEPENDENCIA_SOCIO (WARNING) com os incisos; abaixo ⇒ nada', () => {
    const socio = { id: 's1', nome: 'Ana', tipoPessoa: 'PF', outrasParticipacoes: [part({ receitaBrutaAnualCents: 200_000_000 })] };
    expect(alertasDeInterdependencia([socio], 280_000_000n, 480_000_000n)).toEqual([]);
    const as = alertasDeInterdependencia([socio], 280_000_001n, 480_000_000n);
    expect(as.map((a) => [a.codigo, a.severity])).toEqual([['INTERDEPENDENCIA_SOCIO', 'WARNING']]);
    expect(as[0].detalhe).toContain('§ 4º III');
  });

  it('a mesma empresa por dois sócios conta uma vez; sem receita informada ⇒ INFO pedindo o dado, sem afirmar vedação', () => {
    const p = part({ receitaBrutaAnualCents: 300_000_000 });
    const dois = [
      { id: 's1', nome: 'Ana', tipoPessoa: 'PF', outrasParticipacoes: [p] },
      { id: 's2', nome: 'Bia', tipoPessoa: 'PF', outrasParticipacoes: [p] },
    ];
    expect(alertasDeInterdependencia(dois, 100_000_000n, 480_000_000n)).toEqual([]);
    const semReceita = alertasDeInterdependencia([{ id: 's1', nome: 'Ana', tipoPessoa: 'PF', outrasParticipacoes: [part()] }], 100n, 480_000_000n);
    expect(semReceita.map((a) => [a.codigo, a.severity])).toEqual([['INTERDEPENDENCIA_RECEITA_NAO_INFORMADA', 'INFO']]);
    expect(semReceita[0].detalhe).toContain(CNPJ_B);
    expect(alertasDeInterdependencia([{ id: 's1', nome: 'Ana', tipoPessoa: 'PF', outrasParticipacoes: null }], 900_000_000n, 480_000_000n)).toEqual([]);
  });
});
