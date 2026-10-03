/**
 * PaymentAccountDto — contrato de entrada da conta de pagamento (BE-INCR-PAYMENT-PROVIDER PR-1, P1-3/P1-5/P1-6/P1-9).
 */
import {
  CreatePaymentAccountSchema,
  PaymentAccountConfigSchema,
  SetCredentialSchema,
  UpdatePaymentAccountSchema,
} from '@/features/accounting/dtos/PaymentAccountDto';
import { CREDENTIAL_SOURCE_NOT_SUPPORTED } from '@/features/accounting/models/PaymentAccount.model';

const base = {
  unitId: 'u1',
  provider: 'MERCADO_PAGO',
  label: 'MP loja',
  glAccountId: 'acc-1',
  config: { provider: 'MERCADO_PAGO', credentialSource: 'OWN' },
};

describe('CreatePaymentAccountSchema', () => {
  it('aceita o ramo MERCADO_PAGO/OWN e PRESERVA o discriminador (zod-strip-mata-discriminador)', () => {
    const r = CreatePaymentAccountSchema.parse(base);
    expect(r.config).toEqual({ provider: 'MERCADO_PAGO', credentialSource: 'OWN' });
  });

  it('OAUTH está no tipo mas é recusado com credential_source_not_supported (P1-5)', () => {
    const r = CreatePaymentAccountSchema.safeParse({ ...base, config: { provider: 'MERCADO_PAGO', credentialSource: 'OAUTH' } });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain(CREDENTIAL_SOURCE_NOT_SUPPORTED);
  });

  it('provedor desconhecido, chave extra e glAccountId ausente ⇒ 400', () => {
    expect(CreatePaymentAccountSchema.safeParse({ ...base, provider: 'BANK_CNAB' }).success).toBe(false);
    expect(CreatePaymentAccountSchema.safeParse({ ...base, config: { provider: 'BANK_CNAB', credentialSource: 'OWN' } }).success).toBe(false);
    expect(CreatePaymentAccountSchema.safeParse({ ...base, accessToken: 'x'.repeat(30) }).success).toBe(false);
    const { glAccountId: _g, ...semGl } = base;
    expect(CreatePaymentAccountSchema.safeParse(semGl).success).toBe(false);
  });

  it('a releitura de configJson passa pelo mesmo union', () => {
    expect(PaymentAccountConfigSchema.parse(JSON.parse(JSON.stringify(base.config)))).toEqual(base.config);
  });
});

describe('UpdatePaymentAccountSchema (P1-9)', () => {
  it('só label e status ACTIVE/DISABLED; glAccountId é imutável (chave extra ⇒ 400)', () => {
    expect(UpdatePaymentAccountSchema.safeParse({ unitId: 'u1', status: 'DISABLED' }).success).toBe(true);
    expect(UpdatePaymentAccountSchema.safeParse({ unitId: 'u1', label: 'novo' }).success).toBe(true);
    expect(UpdatePaymentAccountSchema.safeParse({ unitId: 'u1', glAccountId: 'acc-2' }).success).toBe(false);
    expect(UpdatePaymentAccountSchema.safeParse({ unitId: 'u1', status: 'CREDENTIAL_INVALID' }).success).toBe(false);
    expect(UpdatePaymentAccountSchema.safeParse({ unitId: 'u1', status: 'DRAFT' }).success).toBe(false);
  });

  it('patch vazio ⇒ 400 (não é aceito e ignorado)', () => {
    expect(UpdatePaymentAccountSchema.safeParse({ unitId: 'u1' }).success).toBe(false);
  });
});

describe('SetCredentialSchema (P1-6)', () => {
  it('exige accessToken ≥ 20 e webhookSecret ≥ 16; strict', () => {
    const ok = { unitId: 'u1', accessToken: 'APP_USR-'.padEnd(24, '0'), webhookSecret: 's'.repeat(16) };
    expect(SetCredentialSchema.safeParse(ok).success).toBe(true);
    expect(SetCredentialSchema.safeParse({ ...ok, accessToken: 'curto' }).success).toBe(false);
    expect(SetCredentialSchema.safeParse({ ...ok, webhookSecret: 'curto' }).success).toBe(false);
    expect(SetCredentialSchema.safeParse({ ...ok, credentialSource: 'OWN' }).success).toBe(false);
  });

  it('o 400 não ecoa o valor recebido (P1-7)', () => {
    const token = 'TOKEN-QUE-NAO-PODE-VAZAR';
    const r = SetCredentialSchema.safeParse({ unitId: 'u1', accessToken: token, webhookSecret: 'x' });
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.flatten())).not.toContain(token);
  });
});
