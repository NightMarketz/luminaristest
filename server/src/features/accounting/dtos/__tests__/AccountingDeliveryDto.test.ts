/**
 * CONTRATO DA FRONTEIRA — AccountingContactDto + AccountingDeliveryDto (BE-INCR-CONTADOR-DELIVERY).
 * Cobre a lógica fina que `dtoShapeSnapshot.test.ts` NÃO alcança: `.trim()`, `z.literal(true)` e os
 * limites de `year` são invisíveis ao `z.toJSONSchema()` (memória
 * dto-shape-snapshot-nao-cobre-logica-fina). A FORMA é do snapshot; o COMPORTAMENTO é daqui.
 */
import {
  RegisterContactSchema,
  UpdateContactSchema,
} from '../AccountingContactDto';
import {
  BuildDeliveryPackageSchema,
  ConfirmDeliverySchema,
  RetryDeliverySchema,
} from '../AccountingDeliveryDto';
import { ACCOUNTING_CONTACT_NAME_MAX_LENGTH, UF_CODES } from '../../models/AccountingContact.model';

const validContact = {
  unitId: 'unit-1',
  name: 'Contabilidade Silva',
  email: 'contato@exemplo.com.br',
  cpf: '52998224725',
  crcNumber: 'SP-123456/O-1',
  crcUf: 'SP' as const,
};

const validBuild = { unitId: 'unit-1', ecdJobId: 'job-ecd', ecfJobId: 'job-ecf' };

describe('RegisterContactSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(RegisterContactSchema.safeParse(validContact).success).toBe(true);
  });

  it('rejects unknown keys (.strict — typo é 400, não descarte silencioso)', () => {
    expect(RegisterContactSchema.safeParse({ ...validContact, nome: 'x' }).success).toBe(false);
  });

  it('rejects a malformed e-mail', () => {
    expect(RegisterContactSchema.safeParse({ ...validContact, email: 'contato-arroba' }).success).toBe(false);
  });

  it('trims name/email/crc at the edge and applies .max to the TRIMMED name', () => {
    const exact = 'x'.repeat(ACCOUNTING_CONTACT_NAME_MAX_LENGTH);
    const parsed = RegisterContactSchema.safeParse({
      ...validContact,
      name: `  ${exact}  `,
      email: '  contato@exemplo.com.br  ',
      crcNumber: '  sp-123456/o-1  ',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe(exact);
      expect(parsed.data.email).toBe('contato@exemplo.com.br');
      expect(parsed.data.crcNumber).toBe('SP-123456/O-1');
    }
    expect(
      RegisterContactSchema.safeParse({ ...validContact, name: `${exact}y` }).success,
    ).toBe(false);
  });

  // ------------------------------------------------------------------ J930 campo 06 (IND_CRC) — máscara do CFC
  // Cédula 10/09 §6 F13 ("pode fazer máscara em todos os campos"): a fonte do formato é o Manual
  // de Registro do Sistema CFC/CRCs (`1UFXXXXXX/O-X`), não o manual da ECD (que não declara nenhum).
  it('normaliza as grafias usuais do número do CRC para UF-NNNNNN/O-D', () => {
    for (const [input, expected] of [
      ['SP-123456/O-1', 'SP-123456/O-1'],
      ['sp123456/o-1', 'SP-123456/O-1'],
      ['1SP123456/O-1', 'SP-123456/O-1'],
      ['CRC-SP 123456/O-1', 'SP-123456/O-1'],
      ['CRC/SP 123456/T-7', 'SP-123456/T-7'],
    ]) {
      const parsed = RegisterContactSchema.safeParse({ ...validContact, crcNumber: input });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.crcNumber).toBe(expected);
    }
  });

  it('recusa número de CRC fora do formato do CFC (e vazio)', () => {
    for (const crcNumber of ['123456/O-1', 'SP123456', '1-RJ-000999', 'SP-12345/O-1', 'SP-123456/X-1', '   ']) {
      expect(RegisterContactSchema.safeParse({ ...validContact, crcNumber }).success).toBe(false);
    }
  });

  it('cruza a UF embutida no número com crcUf — divergência é digitação errada, 400', () => {
    const bad = RegisterContactSchema.safeParse({ ...validContact, crcNumber: 'RJ-123456/O-1', crcUf: 'SP' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(JSON.stringify(bad.error.flatten())).toMatch(/diverge/);
    expect(RegisterContactSchema.safeParse({ ...validContact, crcNumber: 'RJ-123456/O-1', crcUf: 'RJ' }).success).toBe(true);
  });

  // ------------------------------------------------------------------ J930 campo 03 (IDENT_CPF_CNPJ)
  it('cpf: aceita com ou sem máscara, exige 11 dígitos com DV válido, recusa repetidos', () => {
    const ok = RegisterContactSchema.safeParse({ ...validContact, cpf: '529.982.247-25' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.cpf).toBe('52998224725');
    for (const cpf of ['52998224726', '11111111111', '5299822472', 'abc', '']) {
      expect(RegisterContactSchema.safeParse({ ...validContact, cpf }).success).toBe(false);
    }
  });

  // ------------------------------------------------------------------ J930 campo 08 (FONE)
  it('phone: opcional; aceita máscara e exige 10-11 dígitos', () => {
    const ok = RegisterContactSchema.safeParse({ ...validContact, phone: '(11) 99999-8888' });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.phone).toBe('11999998888');
    expect(RegisterContactSchema.safeParse({ ...validContact, phone: '999' }).success).toBe(false);
    expect(RegisterContactSchema.safeParse(validContact).success).toBe(true);
  });

  // ------------------------------------------------------------------ J930 campo 09 (UF_CRC)
  it('REGRA_TABELA_UF: aceita as 27 siglas e recusa o que está fora da tabela', () => {
    for (const crcUf of UF_CODES) {
      // o número carrega a mesma UF — o cruzamento UF×número é testado à parte
      const crcNumber = `${crcUf}-123456/O-1`;
      expect(RegisterContactSchema.safeParse({ ...validContact, crcUf, crcNumber }).success).toBe(true);
    }
    for (const crcUf of ['XX', 'sp', 'EX', '']) {
      expect(RegisterContactSchema.safeParse({ ...validContact, crcUf }).success).toBe(false);
    }
  });

  // ------------------------------------------------------------------ J930 campo 10 (NUM_SEQ_CRC)
  describe('REGRA_VALIDA_FORMATO_SEQUENCIAL_CRC — certidão UF/AAAA/NÚMERO', () => {
    it('aceita o formato do manual e normaliza caixa e espaço', () => {
      const parsed = RegisterContactSchema.safeParse({
        ...validContact,
        crcCertificate: ' sp/2026/000123 ',
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) expect(parsed.data.crcCertificate).toBe('SP/2026/000123');
    });

    it('recusa o que o PVA acusaria: UF fora da tabela, ano inválido, forma errada', () => {
      const ruins = [
        'XX/2026/000123',
        'SP/26/000123',
        'SP-2026-000123',
        '2026/SP/000123',
        'SP/2026/',
        'SP/2026/ABC',
      ];
      for (const crcCertificate of ruins) {
        expect(RegisterContactSchema.safeParse({ ...validContact, crcCertificate }).success).toBe(false);
      }
    });

    it('é opcional — o manual marca o campo 10 como não obrigatório', () => {
      expect(RegisterContactSchema.safeParse(validContact).success).toBe(true);
    });

    // ---------------------------------------------------------------- review F9
    // O manual diz só "yyyy corresponde ao ano" — 4 dígitos. Um piso (1990) e um teto (relógio da
    // máquina + 1) eram regra INVENTADA, exatamente o que o mesmo arquivo dá como razão para NÃO
    // mascarar o IND_CRC. E validador com `new Date()` dentro muda de veredito com a data.
    it('aceita qualquer ano de 4 dígitos — sem piso inventado e sem relógio dentro do validador', () => {
      for (const crcCertificate of ['SP/1989/000001', 'SP/2099/000001', 'RJ/1975/12']) {
        expect(RegisterContactSchema.safeParse({ ...validContact, crcCertificate }).success).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------- review F10
  it('UpdateContactSchema aceita null para LIMPAR a certidão e a validade (não só sobrescrever)', () => {
    const parsed = UpdateContactSchema.safeParse({
      unitId: 'unit-1',
      contactId: 'c-1',
      crcCertificate: null,
      crcCertificateValidUntil: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.crcCertificate).toBeNull();
      expect(parsed.data.crcCertificateValidUntil).toBeNull();
    }
  });

  // ------------------------------------------------------------------ J930 campo 11 (DT_CRC)
  it('a validade da certidão é data-only REAL (2026-02-30 não existe)', () => {
    expect(
      RegisterContactSchema.safeParse({ ...validContact, crcCertificateValidUntil: '2026-12-31' }).success,
    ).toBe(true);
    for (const bad of ['2026-02-30', '31/12/2026', '2026-13-01', '2026-12-31T00:00:00Z']) {
      expect(
        RegisterContactSchema.safeParse({ ...validContact, crcCertificateValidUntil: bad }).success,
      ).toBe(false);
    }
  });
});

describe('UpdateContactSchema', () => {
  it('accepts a partial update (todos os campos de conteúdo são opcionais)', () => {
    expect(
      UpdateContactSchema.safeParse({ unitId: 'unit-1', contactId: 'c-1', email: 'novo@x.com' }).success,
    ).toBe(true);
  });

  it('requires contactId (o path :id sozinho não basta — o controller compara os dois)', () => {
    expect(UpdateContactSchema.safeParse({ unitId: 'unit-1', email: 'novo@x.com' }).success).toBe(false);
  });
});

describe('BuildDeliveryPackageSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(BuildDeliveryPackageSchema.safeParse(validBuild).success).toBe(true);
  });

  // ---------------------------------------------------------------- Fork Novo A → (b), cédula 10/09 §6 F3
  it('NÃO aceita `year` — o período vem do job, nunca digitado (o furo F3 fechado no contrato)', () => {
    expect(BuildDeliveryPackageSchema.safeParse({ ...validBuild, year: 2026 }).success).toBe(false);
    expect(ConfirmDeliverySchema.safeParse({ ...validBuild, contactId: 'c', confirmed: true, year: 2026 }).success).toBe(false);
  });

  it('rejects unknown keys (.strict)', () => {
    expect(BuildDeliveryPackageSchema.safeParse({ ...validBuild, ano: 2026 }).success).toBe(false);
  });
});

describe('ConfirmDeliverySchema', () => {
  const validConfirm = { ...validBuild, contactId: 'contact-1', confirmed: true as const };

  it('accepts a well-formed confirmation', () => {
    expect(ConfirmDeliverySchema.safeParse(validConfirm).success).toBe(true);
  });

  // ---------------------------------------------------------------- D6 — confirmação explícita
  it('rejects confirmed:false AND a missing confirmed (nunca existe confirmação implícita)', () => {
    expect(ConfirmDeliverySchema.safeParse({ ...validConfirm, confirmed: false }).success).toBe(false);
    const { confirmed: _dropped, ...withoutFlag } = validConfirm;
    expect(ConfirmDeliverySchema.safeParse(withoutFlag).success).toBe(false);
  });

  it('requires contactId (o destinatário é escolhido, nunca inferido)', () => {
    const { contactId: _dropped, ...withoutContact } = validConfirm;
    expect(ConfirmDeliverySchema.safeParse(withoutContact).success).toBe(false);
  });
});

describe('RetryDeliverySchema', () => {
  it('accepts { unitId, deliveryId } e recusa chave desconhecida', () => {
    expect(RetryDeliverySchema.safeParse({ unitId: 'unit-1', deliveryId: 'd-1' }).success).toBe(true);
    expect(
      RetryDeliverySchema.safeParse({ unitId: 'unit-1', deliveryId: 'd-1', force: true }).success,
    ).toBe(false);
  });
});
