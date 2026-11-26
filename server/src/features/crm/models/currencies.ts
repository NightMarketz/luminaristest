/**
 * Moedas que o CRM aceita em proposta e oportunidade, e a moeda padrão.
 *
 * Mora em `models/` (folha, sem import) para que o model de outra feature a leia por
 * `crm/public/currencies.types.ts`: a `fx` deriva daqui as moedas cotadas pela PTAX. A `M4` só deixa esse arquivo ler
 * `models/` e `dtos/` da própria feature (ADR-MODULE-BOUNDARIES §11.9; dono, questionário, 25/11/2026: "crm/models/").
 */
export const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
export const DEFAULT_CURRENCY = 'BRL';
