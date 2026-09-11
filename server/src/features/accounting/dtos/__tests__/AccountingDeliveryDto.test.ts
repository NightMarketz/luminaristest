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
  crcNumber: 'SP-123456/O-1',
  crcUf: 'SP' as const,
};

const validBuild = { unitId: 'unit-1', ecdJobId: 'job-ecd', ecfJobId: 'job-ecf', year: 2026 };

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
      // normalizeCrcNumber: caixa alta + trim, SEM tocar a pontuacao interna (o manual nao a define)
      expect(parsed.data.crcNumber).toBe('SP-123456/O-1');
    }
    expect(
      RegisterContactSchema.safeParse({ ...validContact, name: `${exact}y` }).success,
    ).toBe(false);
  });

  // ------------------------------------------------------------------ J930 campo 06 (IND_CRC)
  it('aceita IND_CRC em qualquer forma — o Manual da ECD NÃO declara formato para o campo 06', () => {
    for (const crcNumber of ['123456/O-1', 'SP123456', '1-RJ-000999']) {
      expect(RegisterContactSchema.safeParse({ ...validContact, crcNumber }).success).toBe(true);
    }
    // Presença e tamanho continuam valendo — vazio não passa.
    expect(RegisterContactSchema.safeParse({ ...validContact, crcNumber: '   ' }).success).toBe(false);
  });

  // ------------------------------------------------------------------ J930 campo 09 (UF_CRC)
  it('REGRA_TABELA_UF: aceita as 27 siglas e recusa o que está fora da tabela', () => {
    for (const crcUf of UF_CODES) {
      expect(RegisterContactSchema.safeParse({ ...validContact, crcUf }).success).toBe(true);
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
        'SP/1899/000123',
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

  // ---------------------------------------------------------------- Fork Novo A → (a)
  it('REQUIRES year — o job de origem não persiste ano, então ele não é derivável', () => {
    const { year: _dropped, ...withoutYear } = validBuild;
    expect(BuildDeliveryPackageSchema.safeParse(withoutYear).success).toBe(false);
  });

  it('rejects a non-integer / out-of-range year', () => {
    expect(BuildDeliveryPackageSchema.safeParse({ ...validBuild, year: 2026.5 }).success).toBe(false);
    expect(BuildDeliveryPackageSchema.safeParse({ ...validBuild, year: 1999 }).success).toBe(false);
    expect(BuildDeliveryPackageSchema.safeParse({ ...validBuild, year: 2101 }).success).toBe(false);
    expect(BuildDeliveryPackageSchema.safeParse({ ...validBuild, year: '2026' }).success).toBe(false);
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
