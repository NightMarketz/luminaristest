import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import SalesCreateModal, { PACKAGE_ISSUE_KEYS } from '../SalesCreateModal';
import type { IDynamicTable } from '@/features/dashboard/components/shared/dynamic-tables.client';
import type { PackageSaleIssue } from '../../../utils/packageSale';
import ptFinance from '../../../../../../../public/locales/pt/finance_view.json';
import enFinance from '../../../../../../../public/locales/en/finance_view.json';
import ptCommon from '../../../../../../../public/locales/pt/common.json';

/**
 * FIX-TESTES-VENDA-PACOTE-TEXTOS (docs/accounting/FIX-TESTES-VENDA-PACOTE-TEXTOS-brief.md), itens 1–3.
 * Os 5 avisos da venda de pacote pelo TEXTO pt que a tela mostra, não pelo código do problema.
 *
 * F-VPT-1 (a): o texto esperado sai do `public/locales/pt/finance_view.json` real. O vitest do my-app não sobe instância
 * i18next (vitest.setup.ts); o `t` abaixo resolve a chave nos JSON pt e, sem a chave, devolve a PRÓPRIA CHAVE (nunca o
 * texto padrão do 2º argumento). Assim uma chave errada no componente aparece como chave e o caso fica vermelho, em vez de
 * passar pelo fallback que repete o texto pt.
 * F-VPT-3 (a): as chaves vêm do `PACKAGE_ISSUE_KEYS` exportado pelo componente.
 */

type Dict = Record<string, unknown>;
const pt: Record<string, Dict> = { finance_view: ptFinance as Dict, common: ptCommon as Dict };
const en: Record<string, Dict> = { finance_view: enFinance as Dict };

function lookup(catalog: Record<string, Dict>, fullKey: string): string | undefined {
    const [ns, path] = fullKey.includes(':') ? fullKey.split(':', 2) : ['finance_view', fullKey];
    const v = path.split('.').reduce<unknown>((acc, k) => (acc && typeof acc === 'object' ? (acc as Dict)[k] : undefined), catalog[ns]);
    return typeof v === 'string' ? v : undefined;
}

function interpolate(text: string, opts: unknown): string {
    if (!opts || typeof opts !== 'object') return text;
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => String((opts as Dict)[k] ?? ''));
}

vi.mock('next-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defOrOpts?: unknown, opts?: unknown) => {
            const found = lookup(pt, key);
            return found === undefined ? key : interpolate(found, typeof defOrOpts === 'object' ? defOrOpts : opts);
        },
        i18n: { language: 'pt' },
    }),
}));

// RelationSelector real busca linhas na API; aqui é um campo de texto com o nome do campo como rótulo.
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({
    default: ({ name, value, onChange }: { name: string; value: string; onChange: (n: string, v: string) => void }) => (
        <input aria-label={name} value={value} onChange={e => onChange(name, e.target.value)} />
    ),
}));
// Formato pt-BR: o CurrencyInput relê o texto exibido com parseBRL no blur.
const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
vi.mock('@/lib/context/CurrencyContext', () => ({
    useFormatCurrency: () => brl,
}));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('../../../hooks/sales/usePackageCatalog', () => ({
    usePackageCatalog: () => ({
        pkgA: { name: 'Pacote A', price: 300, validityDays: null, active: true },
        pkgB: { name: 'Pacote B', price: 500, validityDays: null, active: true },
    }),
}));
vi.mock('../../../hooks/sales/useServicePriceIndex', () => ({ useServicePriceIndex: () => ({}) }));
// Pacote sem validade, aviso já carregado: a validade não trava o Finalizar e só o `canSubmit` decide.
vi.mock('../../../hooks/sales/useValidityNotice', () => ({
    useValidityNotice: () => ({
        state: { status: 'ready', notice: { validityDays: null, saleDate: '2026-11-04', expiresOn: null, textVersion: 'v1', text: null, textSha256: null } },
        reload: () => {},
    }),
}));
vi.mock('../../../services/FinanceService', () => ({
    FinanceService: { createSaleWithItems: vi.fn(async () => 'sale-1') },
}));

const rel = (name: string, targetTable: string) => ({ name, label: name, type: 'relation', relation: { targetTable } });
const table = (fields: unknown[]) => ({ id: 't', name: 't', schema: { fields } }) as unknown as IDynamicTable;
const saleItemsTable = table([rel('productId', 'products'), rel('serviceId', 'services'), rel('packageId', 'packages')]);
/** Tabela de vendas sem `aboveCatalogPrice` → a venda acima do catálogo vira `above_catalog_unsupported`. */
const salesTable = table([rel('unitId', 'units'), rel('customerId', 'customers')]);

const tx = (key: string) => {
    const v = lookup(pt, key);
    if (v === undefined) throw new Error(`chave ausente em public/locales/pt: ${key}`);
    return v;
};
const issueText = (issue: PackageSaleIssue) => tx(PACKAGE_ISSUE_KEYS[issue][0]);

function type(label: string, value: string, index = 0) {
    fireEvent.change(screen.getAllByLabelText(label)[index], { target: { value } });
}

function setPrice(from: number, to: string) {
    const input = screen.getByDisplayValue(brl(from));
    fireEvent.change(input, { target: { value: to } });
    fireEvent.blur(input);
}

/** Venda de pacote com unidade, cliente e um pacote A no preço do catálogo (sem problema), na aba Itens. */
function packageSale({ customer = true }: { customer?: boolean } = {}) {
    render(
        <SalesCreateModal isOpen onClose={() => {}} salesTable={salesTable} saleItemsTable={saleItemsTable} stockIndex={{}} onCreated={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: tx('finance_view:sales.modal.packages') }));
    type('unitId', 'u1');
    if (customer) type('customerId', 'c1');
    fireEvent.click(screen.getByRole('button', { name: tx('finance_view:sales.modal.btn_next') }));
    addPackage('pkgA');
}

function addPackage(packageId: string) {
    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(tx('finance_view:sales.items.add_package')) }).at(-1)!);
    const rows = screen.getAllByLabelText('packageId');
    fireEvent.change(rows[rows.length - 1], { target: { value: packageId } });
}

/** Um estado por código, uma falta por vez. */
const arrange: Record<PackageSaleIssue, () => void> = {
    customer_required: () => packageSale({ customer: false }),
    mixed_packages: () => { packageSale(); addPackage('pkgB'); },
    package_not_in_catalog: () => { packageSale(); type('packageId', 'pkgX'); },
    below_catalog: () => { packageSale(); setPrice(300, '299,99'); },
    above_catalog_unsupported: () => { packageSale(); setPrice(300, '320,00'); },
};

const tryFinalize = () => fireEvent.click(screen.getByRole('button', { name: tx('finance_view:sales.modal.btn_finalize') }));

/** Painel visível: a aba 0 tem o campo de observações; a aba 1 tem o botão de adicionar pacote. */
function visibleTab(): 0 | 1 | 'nenhuma' {
    const header = screen.queryByPlaceholderText(tx('finance_view:sales.modal.notes_placeholder'));
    const items = screen.queryAllByRole('button', { name: new RegExp(tx('finance_view:sales.items.add_package')) });
    if (header && items.length === 0) return 0;
    if (!header && items.length > 0) return 1;
    return 'nenhuma';
}

const ISSUES = Object.keys(PACKAGE_ISSUE_KEYS) as PackageSaleIssue[];

beforeEach(() => { cleanup(); vi.clearAllMocks(); });

describe('item 2 — paridade pt/en das chaves de PACKAGE_ISSUE_KEYS', () => {
    it('são exatamente os 5 códigos do BRIEF', () => {
        expect([...ISSUES].sort()).toEqual(
            ['above_catalog_unsupported', 'below_catalog', 'customer_required', 'mixed_packages', 'package_not_in_catalog'],
        );
    });

    it.each(ISSUES)('%s: a chave existe em pt e em en, sem valor vazio', issue => {
        const key = PACKAGE_ISSUE_KEYS[issue][0];
        expect(lookup(pt, key)?.trim(), `pt: ${key}`).toBeTruthy();
        expect(lookup(en, key)?.trim(), `en: ${key}`).toBeTruthy();
    });
});

describe('item 1 — ao tentar finalizar, a tela mostra o texto pt do aviso', () => {
    it.each(ISSUES)('%s', issue => {
        arrange[issue]();
        tryFinalize();
        expect(screen.queryAllByText(issueText(issue)), `texto pt de ${issue} na tela`).not.toHaveLength(0);
    });
});

describe('item 3 — ao tentar finalizar, a tela vai para a aba que resolve o aviso', () => {
    const expected: Record<PackageSaleIssue, 0 | 1> = {
        customer_required: 0,
        mixed_packages: 1,
        package_not_in_catalog: 1,
        below_catalog: 1,
        above_catalog_unsupported: 1,
    };
    it.each(ISSUES)('%s', issue => {
        arrange[issue]();
        tryFinalize();
        expect(visibleTab()).toBe(expected[issue]);
    });
});
