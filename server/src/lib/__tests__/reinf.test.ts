/**
 * BE-INCR-EFD-REINF PR-1 — `lib/reinf.ts` contra o XSD OFICIAL (itens 2, 3, 4, 5, 6, 9, 10, 12; invariantes 2, 6, 7, 12).
 * Cada evento gerado, assinado com a chave de teste (F-REINF-6 a), valida no XSD do pacote [D06]; o mesmo XML sem
 * `ds:Signature` NÃO valida — prova que o validador lê a regra que motivou o fork.
 */
import { readdirSync } from 'fs';
import {
  __selfCheck,
  buildR1000,
  buildR4020,
  buildR4099,
  conteudoSha256R1000,
  EVENTOS_NAO_APLICAVEIS,
  EVENTOS_PLANEJADOS,
  EVENTOS_RETORNO,
  EVENTOS_SUPORTADOS,
  idEvento,
  MAX_EVENTOS_LOTE,
  ReinfLimiteXsdError,
  serializeLote,
  statusDoLoteNaConsulta,
  tpAmbReinf,
  valorReinf,
  type BeneficiarioPJ,
  type CabecalhoEvento,
  type ContribuinteR1000,
  type ReinfTransmissorPort,
} from '../reinf';
import { signReinfEventoForTest } from '../../../test/helpers/nfeSignature';
import { REINF_XSD_DIR, validarNoXsdReinf } from '../../../test/helpers/reinfXsd';

const C: ContribuinteR1000 = {
  cnpjRaiz: '11222333',
  classTrib: '99',
  indEscrituracao: 1,
  contato: { nome: 'Ana Contadora', cpf: '52998224725', foneCel: '11987654321', email: 'ana@contab.test' },
};
const ESTAB = '11222333000181';
let seq = 0;
const H = (): CabecalhoEvento => ({ tpAmb: 2, verProc: 'LUMINARIS-1.0.0', agora: '20260415103000', seq: ++seq });

/** Fisioterapia (15022): IR no reconhecimento + CSRF agregada em duas baixas ⇒ 3 infoPgto (caso adversarial do BRIEF §12). */
const FISIO: BeneficiarioPJ = {
  cnpj: '45997418000153',
  nome: 'Fisio Ltda',
  ref: 'cp-fisio',
  porNatureza: {
    '15022': [
      { dtFG: '2026-03-10', vlrBrutoCents: 100_000n, agregado: { baseCents: 50_000n, valorCents: 2_325n }, origemIds: ['c1', 'c2', 'c3'] },
      { dtFG: '2026-03-02', vlrBrutoCents: 100_000n, ir: { baseCents: 100_000n, valorCents: 1_500n }, origemIds: ['i1'] },
      { dtFG: '2026-03-25', vlrBrutoCents: 50_000n, agregado: { baseCents: 50_000n, valorCents: 2_325n }, origemIds: ['c4', 'c5', 'c6'] },
    ],
  },
};

describe('lib/reinf — base (item 2; L5, L8)', () => {
  it('selfCheck passa', () => expect(() => __selfCheck()).not.toThrow());

  it('invariante 12: id do evento com 36 caracteres, raiz completada com zeros à direita, formato REGRA_VALIDA_ID_EVENTO', () => {
    const id = idEvento('11222333', '20260415103000', 7);
    expect(id).toBe('ID1112223330000002026041510300000007');
    expect(id).toHaveLength(36);
    expect(id).toMatch(/^I{1}D{1}[0-9]{1}[0-9A-Z]{12}[0-9]{21}$/);
    expect(idEvento('12ABC345', '20260415103000', 1).slice(3, 17)).toBe('12ABC345000000'); // CNPJ alfanumérico
    expect(() => idEvento('1122233', '20260415103000', 1)).toThrow();
  });

  it('valores em centavos com vírgula decimal; negativo é bug', () => {
    expect([valorReinf(1n), valorReinf(100n), valorReinf(123456789n)]).toEqual(['0,01', '1,00', '1234567,89']);
    expect(() => valorReinf(-1n)).toThrow();
  });

  it('tpAmb vem do env REINF_TP_AMB (padrão 1)', () => {
    expect([tpAmbReinf({}), tpAmbReinf({ REINF_TP_AMB: '2' }), tpAmbReinf({ REINF_TP_AMB: '1' })]).toEqual([1, 2, 1]);
    expect(() => tpAmbReinf({ REINF_TP_AMB: '3' })).toThrow('REINF_TP_AMB');
  });
});

describe('lib/reinf — cobertura dos 23 tipos (item 3; invariante 2)', () => {
  it('cada tipo do pacote XSD está em exatamente um conjunto', () => {
    const doPacote = readdirSync(REINF_XSD_DIR)
      .map((f) => /^(?:retorno-)?(R-\d{4})-/.exec(f)?.[1])
      .filter((t): t is string => !!t);
    expect(new Set(doPacote).size).toBe(23);
    const conjuntos = [EVENTOS_SUPORTADOS as readonly string[], Object.keys(EVENTOS_PLANEJADOS), Object.keys(EVENTOS_NAO_APLICAVEIS), EVENTOS_RETORNO as readonly string[]];
    for (const t of doPacote) expect([t, conjuntos.filter((c) => c.includes(t)).length]).toEqual([t, 1]);
    expect(conjuntos.flat().sort()).toEqual([...doPacote].sort());
    for (const fonte of Object.values(EVENTOS_NAO_APLICAVEIS)) expect(fonte.length).toBeGreaterThan(10);
  });
});

describe('lib/reinf — eventos no XSD oficial (item 5; invariante 7)', () => {
  const casos: [string, () => string][] = [
    ['R-1000', () => buildR1000(H(), C, 'inclusao', '2026-03').xml],
    ['R-1000', () => buildR1000(H(), { ...C, classTrib: '01', indEscrituracao: 0, contato: { nome: 'Ana', cpf: '52998224725', foneFixo: '1133334444' } }, 'alteracao', '2026-05').xml],
    ['R-4020', () => buildR4020(H(), C, ESTAB, FISIO, '2026-03').xml],
    ['R-4099', () => buildR4099(H(), C, '2026-03', 'FECHAMENTO', { nome: 'Ana', cpf: '52998224725', email: 'ana@contab.test' }).xml],
    ['R-4099', () => buildR4099(H(), C, '2026-03', 'REABERTURA').xml],
  ];
  it.each(casos)('%s assinado com a chave de teste valida no XSD', async (tipo, gerar) => {
    const r = await validarNoXsdReinf(signReinfEventoForTest(gerar()), tipo);
    expect(r).toEqual({ valid: true, errors: [] });
  });

  it('o mesmo XML sem ds:Signature NÃO valida (F-REINF-6 a)', async () => {
    const r = await validarNoXsdReinf(buildR4020(H(), C, ESTAB, FISIO, '2026-03').xml, 'R-4020');
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toContain('Signature');
  });

  it('o lote (envelope do envio assíncrono) valida no envioLoteEventosAssincrono-v1_00_00.xsd', async () => {
    const lote = serializeLote('11222333', [buildR1000(H(), C, 'inclusao', '2026-03'), buildR4020(H(), C, ESTAB, FISIO, '2026-03'), buildR4099(H(), C, '2026-03', 'FECHAMENTO')]);
    expect(await validarNoXsdReinf(lote.xml, 'envioLoteEventosAssincrono')).toEqual({ valid: true, errors: [] });
  });
});

describe('lib/reinf — R-4020 (item 6; L2, L7; invariante 6)', () => {
  it('um evento por beneficiário: 1 idePgto 15022 com 3 infoPgto em ordem de dtFG; IR e CSRF agregada; sem código de receita no XML', () => {
    const { xml } = buildR4020(H(), C, ESTAB, FISIO, '2026-03');
    expect(xml.match(/<idePgto>/g)).toHaveLength(1);
    expect([...xml.matchAll(/<dtFG>([^<]+)<\/dtFG>/g)].map((m) => m[1])).toEqual(['2026-03-02', '2026-03-10', '2026-03-25']);
    expect(xml).toContain('<infoPgto><dtFG>2026-03-02</dtFG><vlrBruto>1000,00</vlrBruto><retencoes><vlrBaseIR>1000,00</vlrBaseIR><vlrIR>15,00</vlrIR></retencoes></infoPgto>');
    expect(xml).toContain('<retencoes><vlrBaseAgreg>500,00</vlrBaseAgreg><vlrAgreg>23,25</vlrAgreg></retencoes>');
    expect(xml).toContain('<ideContri><tpInsc>1</tpInsc><nrInsc>11222333</nrInsc></ideContri>'); // L5
    expect(xml).toContain(`<nrInscEstab>${ESTAB}</nrInscEstab>`); // F-REINF-11 a
    expect(xml).not.toMatch(/170806|595207|codigoReceita/);
    expect(xml).toContain('<indRetif>1</indRetif>');
  });

  it('CSRF separada (2027: só CSLL) vai em vlrBaseCSLL/vlrCSLL', () => {
    const b: BeneficiarioPJ = { ...FISIO, porNatureza: { '15022': [{ dtFG: '2027-01-08', vlrBrutoCents: 198_000n, csll: { baseCents: 200_000n, valorCents: 2_000n }, origemIds: ['x'] }] } };
    const { xml } = buildR4020(H(), C, ESTAB, b, '2027-01');
    expect(xml).toContain('<retencoes><vlrBaseCSLL>2000,00</vlrBaseCSLL><vlrCSLL>20,00</vlrCSLL></retencoes>');
    expect(xml).not.toMatch(/vlrCofins|vlrPP|vlrAgreg/); // invariante 5
  });

  it('101 naturezas ⇒ erro nomeado (o XSD aceita 100)', () => {
    const porNatureza: BeneficiarioPJ['porNatureza'] = {};
    for (let i = 0; i < 101; i++) porNatureza[String(15001 + i)] = [{ dtFG: '2026-03-02', vlrBrutoCents: 1n, origemIds: [] }];
    let erro: unknown;
    try {
      buildR4020(H(), C, ESTAB, { ...FISIO, porNatureza }, '2026-03');
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ReinfLimiteXsdError);
    expect((erro as ReinfLimiteXsdError).code).toBe('REINF_NATUREZAS_ACIMA_DO_LIMITE');
  });
});

describe('lib/reinf — R-1000, R-4099, lote (itens 4, 9, 10)', () => {
  it('R-1000: inclusão com iniValid; o hash do cadastro ignora id e hora (lacuna D)', () => {
    const a = buildR1000({ ...H(), agora: '20260415103000' }, C, 'inclusao', '2026-03');
    const b = buildR1000({ ...H(), agora: '20260501090000' }, C, 'inclusao', '2026-03');
    expect(a.xml).toContain('<inclusao><idePeriodo><iniValid>2026-03</iniValid></idePeriodo><infoCadastro><classTrib>99</classTrib><indEscrituracao>1</indEscrituracao><indDesoneracao>0</indDesoneracao><indAcordoIsenMulta>0</indAcordoIsenMulta>');
    expect(a.sha256).not.toBe(b.sha256);
    expect(conteudoSha256R1000(C)).toBe(conteudoSha256R1000({ ...C }));
    expect(conteudoSha256R1000(C)).not.toBe(conteudoSha256R1000({ ...C, classTrib: '01' }));
  });

  it('R-4099: fechRet 0 = fechamento (leiaute 2.1.2b, campo 18) no mesmo perApur', () => {
    const { xml } = buildR4099(H(), C, '2026-03', 'FECHAMENTO');
    expect(xml).toContain('<perApur>2026-03</perApur>');
    expect(xml).toContain('<infoFech><fechRet>0</fechRet></infoFech>');
    expect(xml).not.toContain('ideRespInf');
  });

  it('lote: mesmo dado + mesmo relógio ⇒ mesmo sha256; envelope com Id de cada evento; > 50 eventos ⇒ erro nomeado', () => {
    const gerar = () => {
      seq = 0;
      return serializeLote('11222333', [buildR4020(H(), C, ESTAB, FISIO, '2026-03'), buildR4099(H(), C, '2026-03', 'FECHAMENTO')]);
    };
    const [x, y] = [gerar(), gerar()];
    expect(x.sha256).toBe(y.sha256);
    expect(x.xml).toContain('<evento Id="ID1112223330000002026041510300000001"><Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evt4020PagtoBeneficiarioPJ/v2_01_02">');
    const muitos = Array.from({ length: MAX_EVENTOS_LOTE + 1 }, () => buildR4099(H(), C, '2026-03', 'FECHAMENTO'));
    expect(() => serializeLote('11222333', muitos)).toThrow(ReinfLimiteXsdError);
  });
});

describe('lib/reinf — porta de transmissão (item 12)', () => {
  it('o tipo da porta existe e o retorno mapeia para o status do lote', async () => {
    const porta: ReinfTransmissorPort = {
      enviarLote: async () => ({ protocolo: 'p1' }),
      consultar: async () => ({ status: 'ACEITO', recibos: [{ idEvento: 'ID1', nrRecibo: '1-01-2026-0001-1' }] }),
    };
    expect(statusDoLoteNaConsulta(await porta.consultar('p1'))).toBe('ACEITO');
    expect(statusDoLoteNaConsulta({ status: 'ACEITO', recibos: [{ idEvento: 'ID1', erros: ['x'] }] })).toBe('REJEITADO');
    expect(statusDoLoteNaConsulta({ status: 'EM_PROCESSAMENTO', recibos: [] })).toBeNull();
  });
});
