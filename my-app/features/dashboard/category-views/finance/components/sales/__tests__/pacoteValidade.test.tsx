import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shim obrigatório (jsx "preserve" + runtime clássico) — nunca em código de produção.
(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, waitFor, fireEvent, within } from '@testing-library/react';
import SalesCreateModal from '../SalesCreateModal';
import SaleDetailPanel from '../SaleDetailPanel';
import { SalePaymentModal } from '../SaleActionModals';
import { packageBalancesService } from '@/lib/services/packageBalances.service';
import { packageAcceptancesService } from '@/lib/services/packageAcceptances.service';
import { FinanceService } from '../../../services/FinanceService';
import { notify } from '@/lib/notifications/notify';
import type { IDynamicTable } from '@/features/dashboard/components/shared/dynamic-tables.client';
import type { SaleRecord, SaleItemRecord } from '../../../types/sales.types';

/** FE-INCR-PACOTE-VALIDADE — itens 8, 10, 11, 12 e 13 do BRIEF. */

// `t` com interpolação do default (sem instância i18next o real devolve o default CRU, com `{{date}}`).
vi.mock('next-i18next', () => ({
    useTranslation: () => ({
        t: (_key: string, def?: unknown, opts?: Record<string, unknown>) =>
            String(typeof def === 'string' ? def : _key).replace(/\{\{(\w+)\}\}/g, (_m, k: string) => String(opts?.[k] ?? '')),
    }),
}));
vi.mock('@/lib/context/CurrencyContext', () => ({ useFormatCurrency: () => (v: number) => `R$ ${v.toFixed(2)}` }));
vi.mock('@/features/dashboard/shared/hooks/useRenderTypedValue', () => ({ useRenderTypedValue: () => (v: unknown) => String(v) }));
vi.mock('@/lib/notifications/notify', () => ({ notify: vi.fn() }));
vi.mock('@/lib/services/packageBalances.service', () => ({ packageBalancesService: { listBalances: vi.fn() } }));
vi.mock('@/lib/services/packageAcceptances.service', async (orig) => {
    const actual = await orig<typeof import('@/lib/services/packageAcceptances.service')>();
    return {
        ...actual,
        packageAcceptancesService: { getNotice: vi.fn(), create: vi.fn(), getBySale: vi.fn(), downloadReceipt: vi.fn() },
    };
});
vi.mock('../../../services/FinanceService', () => ({ FinanceService: { createSaleWithItems: vi.fn() } }));
// RelationSelector: um <input> que devolve o valor digitado (o seletor real busca tabelas).
vi.mock('@/features/dashboard/components/forms/RelationSelector', () => ({
    default: ({ name, onChange }: { name: string; onChange: (n: string, v: string) => void }) => (
        <input data-testid={`rel-${name}`} onChange={(e) => onChange(name, e.target.value)} />
    ),
}));
// Catálogo e itens: o que interessa aqui é o bloco de validade, não o seletor de itens.
vi.mock('../../../hooks/sales/usePackageCatalog', () => ({
    usePackageCatalog: () => ({ pkg1: { name: 'Pacote 10', price: 300, validityDays: 30, active: true } }),
}));
vi.mock('../create/SaleItemsManager', () => ({
    SaleItemsManager: ({ items, onAddItem, onUpdateItem }: { items: Array<{ id: string }>; onAddItem: () => void; onUpdateItem: (id: string, p: Record<string, unknown>) => void }) => (
        <div>
            <button onClick={onAddItem}>add-item</button>
            <button onClick={() => items[0] && onUpdateItem(items[0].id, { packageId: 'pkg1', unitPrice: 300 })}>pick-package</button>
        </div>
    ),
}));

const notice = (over: Record<string, unknown> = {}) => ({
    validityDays: 30,
    saleDate: '2026-11-25',
    expiresOn: '2026-12-26',
    textVersion: 'v1',
    text: 'VALIDADE DO PACOTE: texto legal do servidor.',
    textSha256: 'a'.repeat(64),
    ...over,
});

const field = (name: string, extra: Record<string, unknown> = {}) => ({ name, label: name, type: 'string', ...extra });
const salesTable = {
    id: 'tbl-sales',
    name: 'Sales',
    schema: { fields: [field('unitId', { relation: { targetTable: 'units' } }), field('customerId', { relation: { targetTable: 'customers' } })] },
} as unknown as IDynamicTable;
const itemsTable = { id: 'tbl-items', name: 'Items', schema: { fields: ['productId', 'serviceId', 'packageId'].map((n) => field(n)) } } as unknown as IDynamicTable;

beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(packageAcceptancesService.getNotice).mockResolvedValue(notice());
    vi.mocked(packageAcceptancesService.create).mockResolvedValue({ id: 'acc-1' } as never);
    vi.mocked(FinanceService.createSaleWithItems).mockResolvedValue('sale-9');
});

// ── item 8 — pagamento com saldo de pacote ───────────────────────────────────────────────────────────────────────────
describe('item 8 — saldo com validade no pagamento', () => {
    const bal = (id: string, expiresOn: string | null) => ({ id: `b-${id}`, customerId: 'c1', packageId: id, unitId: 'u1', balanceCents: 50000, expiresOn });
    const open = async (balances: ReturnType<typeof bal>[]) => {
        vi.mocked(packageBalancesService.listBalances).mockResolvedValue(balances);
        render(
            <SalePaymentModal sale={{ id: 's1', unitId: 'u1', customerId: 'c1', totalAmount: 100 } as SaleRecord} isOpen onClose={() => {}} onConfirm={async () => {}} />,
        );
        await waitFor(() => expect(packageBalancesService.listBalances).toHaveBeenCalled());
        fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Package Balance' } });
        await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(2));
        return screen.getAllByRole('combobox')[1] as HTMLSelectElement;
    };
    const option = (sel: HTMLSelectElement, value: string) => Array.from(sel.options).find((o) => o.value === value)!;

    it('válido: "vence em DD/MM/AAAA" e habilitado; o saldo escolhido mostra a validade em destaque (≥ 16px, semibold)', async () => {
        const sel = await open([bal('pkgValid1', '2999-12-31')]);
        expect(option(sel, 'pkgValid1').textContent).toContain('vence em 31/12/2999');
        expect(option(sel, 'pkgValid1').disabled).toBe(false);
        fireEvent.change(sel, { target: { value: 'pkgValid1' } });
        const strong = await screen.findByTestId('selected-balance-validity');
        expect(strong.textContent).toBe('Este saldo vence em 31/12/2999.');
        expect(strong.className).toMatch(/\btext-base\b/);
        expect(strong.className).toMatch(/\bfont-semibold\b/);
    });

    it('só saldos vencidos: a forma fica disponível e o vencido aparece desabilitado com "vencido em DD/MM/AAAA"', async () => {
        const sel = await open([bal('pkgOld0001', '2020-01-15')]);
        expect(option(sel, 'pkgOld0001').disabled).toBe(true);
        expect(option(sel, 'pkgOld0001').textContent).toContain('vencido em 15/01/2020');
    });

    it('sem nenhum saldo: a forma "Saldo de pacote" fica indisponível', async () => {
        vi.mocked(packageBalancesService.listBalances).mockResolvedValue([]);
        render(<SalePaymentModal sale={{ id: 's1', unitId: 'u1', customerId: 'c1', totalAmount: 100 } as SaleRecord} isOpen onClose={() => {}} onConfirm={async () => {}} />);
        await waitFor(() => expect(packageBalancesService.listBalances).toHaveBeenCalled());
        const method = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
        expect(Array.from(method.options).find((o) => o.value === 'Package Balance')?.disabled).toBe(true);
    });

    it('vencido ao lado de um válido: o vencido é a opção desabilitada, com a data', async () => {
        const sel = await open([bal('pkgOld0001', '2020-01-15'), bal('pkgValid1', '2999-12-31')]);
        expect(option(sel, 'pkgOld0001').disabled).toBe(true);
        expect(option(sel, 'pkgOld0001').textContent).toContain('vencido em 15/01/2020');
        expect(option(sel, 'pkgValid1').disabled).toBe(false);
    });

    it('sem validade: "sem validade", habilitado, e a frase em destaque diz que não tem validade', async () => {
        const sel = await open([bal('pkgFree001', null)]);
        expect(option(sel, 'pkgFree001').textContent).toContain('sem validade');
        expect(option(sel, 'pkgFree001').disabled).toBe(false);
        fireEvent.change(sel, { target: { value: 'pkgFree001' } });
        expect((await screen.findByTestId('selected-balance-validity')).textContent).toBe('Este saldo não tem validade.');
    });
});

// ── itens 10 e 11 — bloco de validade e aceite na venda ──────────────────────────────────────────────────────────────
describe('itens 10 e 11 — venda de pacote: bloco de validade, checkbox e gravação do aceite', () => {
    const onCreated = vi.fn();
    const onClose = vi.fn();

    /** Abre o modal na variante Pacotes, com unidade e cliente, e vai à aba Itens com o pacote escolhido. */
    const openPackageSale = async () => {
        render(<SalesCreateModal isOpen onClose={onClose} salesTable={salesTable} saleItemsTable={itemsTable} stockIndex={{}} onCreated={onCreated} />);
        fireEvent.click(screen.getByText('Pacotes'));
        fireEvent.change(screen.getByTestId('rel-unitId'), { target: { value: 'u1' } });
        fireEvent.change(screen.getByTestId('rel-customerId'), { target: { value: 'c1' } });
        fireEvent.click(screen.getByText('Próximo'));
        fireEvent.click(screen.getByText('add-item'));
        fireEvent.click(screen.getByText('pick-package'));
        await screen.findByTestId('package-validity-notice');
    };
    const finalizeBtn = () => screen.getByText('Finalizar Venda').closest('button') as HTMLButtonElement;
    const draftBtn = () => screen.getByText('Salvar Rascunho').closest('button') as HTMLButtonElement;

    it('mostra o texto LITERAL do servidor numa caixa com borda, text-base e font-semibold', async () => {
        await openPackageSale();
        expect(packageAcceptancesService.getNotice).toHaveBeenCalledWith('u1', 'pkg1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
        const text = screen.getByTestId('package-validity-text');
        expect(text.textContent).toBe('VALIDADE DO PACOTE: texto legal do servidor.');
        expect(text.className).toMatch(/\btext-base\b/);
        expect(text.className).toMatch(/\bfont-semibold\b/);
        expect(screen.getByTestId('package-validity-notice').className).toMatch(/\bborder-2\b/);
        expect(screen.getByText('Válido até 26/12/2026')).toBeInTheDocument();
    });

    it('os dois botões ficam desabilitados sem o checkbox e habilitam com ele', async () => {
        await openPackageSale();
        expect(finalizeBtn().disabled).toBe(true);
        expect(draftBtn().disabled).toBe(true);
        fireEvent.click(screen.getByLabelText('Li este texto ao cliente e ele concordou'));
        expect(finalizeBtn().disabled).toBe(false);
        expect(draftBtn().disabled).toBe(false);
    });

    it('trocar a data refaz a busca e DESMARCA o aceite', async () => {
        await openPackageSale();
        fireEvent.click(screen.getByLabelText('Li este texto ao cliente e ele concordou'));
        expect(finalizeBtn().disabled).toBe(false);
        // volta ao Cabeçalho e muda a data
        vi.mocked(packageAcceptancesService.getNotice).mockResolvedValue(notice({ saleDate: '2026-11-26', expiresOn: '2026-12-27', textSha256: 'b'.repeat(64) }));
        fireEvent.click(screen.getByText('Cabeçalho'));
        const date = document.querySelector('input[type="date"]') as HTMLInputElement;
        fireEvent.change(date, { target: { value: '2026-11-26' } });
        fireEvent.click(screen.getByText('Próximo'));
        await waitFor(() => expect(packageAcceptancesService.getNotice).toHaveBeenLastCalledWith('u1', 'pkg1', '2026-11-26'));
        await screen.findByText('Válido até 27/12/2026');
        expect((screen.getByLabelText('Li este texto ao cliente e ele concordou') as HTMLInputElement).checked).toBe(false);
        expect(finalizeBtn().disabled).toBe(true);
    });

    it('pacote sem validade: mostra "Sem validade", sem checkbox e sem travar a venda', async () => {
        vi.mocked(packageAcceptancesService.getNotice).mockResolvedValue(notice({ validityDays: null, expiresOn: null, text: null, textSha256: null }));
        render(<SalesCreateModal isOpen onClose={onClose} salesTable={salesTable} saleItemsTable={itemsTable} stockIndex={{}} onCreated={onCreated} />);
        fireEvent.click(screen.getByText('Pacotes'));
        fireEvent.change(screen.getByTestId('rel-unitId'), { target: { value: 'u1' } });
        fireEvent.change(screen.getByTestId('rel-customerId'), { target: { value: 'c1' } });
        fireEvent.click(screen.getByText('Próximo'));
        fireEvent.click(screen.getByText('add-item'));
        fireEvent.click(screen.getByText('pick-package'));
        await screen.findByTestId('package-without-validity');
        expect(screen.queryByLabelText('Li este texto ao cliente e ele concordou')).toBeNull();
        expect(finalizeBtn().disabled).toBe(false);
    });

    it('falha ao carregar o texto TRAVA a venda (não se aceita o que não se viu)', async () => {
        vi.mocked(packageAcceptancesService.getNotice).mockRejectedValue({ error: 'x' });
        render(<SalesCreateModal isOpen onClose={onClose} salesTable={salesTable} saleItemsTable={itemsTable} stockIndex={{}} onCreated={onCreated} />);
        fireEvent.click(screen.getByText('Pacotes'));
        fireEvent.change(screen.getByTestId('rel-unitId'), { target: { value: 'u1' } });
        fireEvent.change(screen.getByTestId('rel-customerId'), { target: { value: 'c1' } });
        fireEvent.click(screen.getByText('Próximo'));
        fireEvent.click(screen.getByText('add-item'));
        fireEvent.click(screen.getByText('pick-package'));
        await screen.findByText('Tentar de novo');
        expect(finalizeBtn().disabled).toBe(true);
    });

    it('item 11 — ordem das chamadas: venda+itens PRIMEIRO, depois o aceite com versão + hash do texto mostrado', async () => {
        const order: string[] = [];
        vi.mocked(FinanceService.createSaleWithItems).mockImplementation(async () => { order.push('sale'); return 'sale-9'; });
        vi.mocked(packageAcceptancesService.create).mockImplementation(async () => { order.push('acceptance'); return { id: 'acc-1' } as never; });
        await openPackageSale();
        fireEvent.click(screen.getByLabelText('Li este texto ao cliente e ele concordou'));
        fireEvent.click(finalizeBtn());
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(order).toEqual(['sale', 'acceptance']);
        expect(packageAcceptancesService.create).toHaveBeenCalledWith({ unitId: 'u1', saleId: 'sale-9', textVersion: 'v1', textSha256: 'a'.repeat(64) });
        expect(onCreated).toHaveBeenCalled();
        expect(notify).not.toHaveBeenCalled();
    });

    it('item 11 — falha do aceite (ex.: 409 PACKAGE_NOTICE_CHANGED): a venda fica criada, aviso na tela e o modal fecha', async () => {
        vi.mocked(packageAcceptancesService.create).mockRejectedValue({ code: 'PACKAGE_NOTICE_CHANGED', status: 409 });
        await openPackageSale();
        fireEvent.click(screen.getByLabelText('Li este texto ao cliente e ele concordou'));
        fireEvent.click(finalizeBtn());
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(FinanceService.createSaleWithItems).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith(expect.stringContaining('aceite da validade não foi registrado'), 'warning', expect.any(String));
        expect(onCreated).toHaveBeenCalled();
    });
});

// ── itens 12 e 13 — detalhe da venda ─────────────────────────────────────────────────────────────────────────────────
describe('itens 12 e 13 — detalhe da venda de pacote', () => {
    const sale = { id: 's1', unitId: 'u1', customerId: 'c1', date: '2026-11-25', status: 'Finalized', paymentStatus: 'Pending', totalAmount: 300 } as SaleRecord;
    const item = { id: 'i1', saleId: 's1', type: 'Package', packageId: 'pkg1', quantity: 1, unitPrice: 300 } as SaleItemRecord;
    const panel = (s: SaleRecord = sale, items: SaleItemRecord[] = [item]) =>
        render(
            <SaleDetailPanel sale={s} table={null} items={items} computedSubtotal={0} isUpdating={null} productNameMap={{}} serviceNameMap={{}}
                packageNameMap={{ pkg1: 'Pacote 10' }} customerNameMap={{}} unitNameMap={{}} onUpdateSale={async () => {}}
                onRequestPay={() => {}} onRequestCancel={() => {}} onRequestReturn={() => {}} />,
        );
    const acceptance = {
        id: 'acc-1', saleId: 's1', customerId: 'c1', packageId: 'pkg1', saleDate: '2026-11-25', validityDays: 30, expiresOn: '2026-12-26',
        textVersion: 'v1', textShown: 'TEXTO GRAVADO NA VENDA', textSha256: 'a'.repeat(64), acceptedByUserId: 'user-77', acceptedByLabel: 'Bia (recepção)', acceptedAt: '2026-11-25T15:00:00.000Z',
    };

    beforeEach(() => vi.mocked(packageBalancesService.listBalances).mockResolvedValue([]));

    it('com aceite: mostra o texto GRAVADO em destaque e quem/quando/versão — sem o selo', async () => {
        vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(acceptance);
        panel();
        const text = await screen.findByTestId('package-validity-text');
        expect(text.textContent).toBe('TEXTO GRAVADO NA VENDA');
        expect(text.className).toMatch(/\btext-base\b/);
        expect(text.className).toMatch(/\bfont-semibold\b/);
        const rec = screen.getByTestId('package-acceptance-record').textContent ?? '';
        expect(rec).toContain('Bia (recepção)');
        expect(rec).not.toContain('user-77'); // o cuid não é "quem" (F-PP-2 a)
        expect(rec).toContain('texto v1');
        expect(screen.queryByTestId('package-acceptance-missing')).toBeNull();
        expect(packageAcceptancesService.getNotice).not.toHaveBeenCalled();
    });

    it('sem aceite: selo "Aceite não registrado" + o bloco de validade; "Registrar aceite" exige o checkbox e grava com o hash do texto mostrado', async () => {
        vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(null);
        panel();
        expect(await screen.findByTestId('package-acceptance-missing')).toBeInTheDocument();
        expect(screen.getByTestId('package-validity-text').textContent).toBe('VALIDADE DO PACOTE: texto legal do servidor.');
        fireEvent.click(screen.getByText('Registrar aceite'));
        const confirm = screen.getByText('Confirmar aceite').closest('button') as HTMLButtonElement;
        expect(confirm.disabled).toBe(true);
        fireEvent.click(screen.getByLabelText('Li este texto ao cliente e ele concordou'));
        expect(confirm.disabled).toBe(false);
        fireEvent.click(confirm);
        await waitFor(() => expect(packageAcceptancesService.create).toHaveBeenCalledWith({ unitId: 'u1', saleId: 's1', textVersion: 'v1', textSha256: 'a'.repeat(64) }));
        // depois de gravar, recarrega o aceite
        await waitFor(() => expect(packageAcceptancesService.getBySale).toHaveBeenCalledTimes(2));
    });

    it('pacote sem validade: sem selo e sem botão do PDF (o servidor recusaria)', async () => {
        vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(null);
        vi.mocked(packageAcceptancesService.getNotice).mockResolvedValue(notice({ validityDays: null, expiresOn: null, text: null, textSha256: null }));
        panel();
        await screen.findByTestId('package-without-validity');
        expect(screen.queryByTestId('package-acceptance-missing')).toBeNull();
        expect(screen.queryByText('Baixar comprovante (PDF)')).toBeNull();
    });

    it('item 13 — o botão "Baixar comprovante (PDF)" chama o download da venda certa', async () => {
        vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(acceptance);
        vi.mocked(packageAcceptancesService.downloadReceipt).mockResolvedValue(undefined);
        panel();
        await screen.findByTestId('package-validity-text');
        fireEvent.click(screen.getByText('Baixar comprovante (PDF)'));
        expect(packageAcceptancesService.downloadReceipt).toHaveBeenCalledWith('u1', 's1');
    });

    it('o saldo creditado que difere da validade da venda aparece ao lado (I4: junção na recompra)', async () => {
        vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(acceptance);
        vi.mocked(packageBalancesService.listBalances).mockResolvedValue([
            { id: 'b1', customerId: 'c1', packageId: 'pkg1', unitId: 'u1', balanceCents: 1, expiresOn: '2027-03-01' },
        ]);
        panel();
        expect(await screen.findByText(/vence em 01\/03\/2027/)).toBeInTheDocument();
    });

    it('a data da venda (ISO à meia-noite UTC, como o motor grava) aparece como o MESMO dia, sem recuar um dia em UTC-3', async () => {
        const prevTz = process.env.TZ;
        process.env.TZ = 'America/Sao_Paulo';
        try {
            vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(acceptance);
            panel({ ...sale, date: '2026-11-25T00:00:00.000Z' } as SaleRecord);
            await screen.findByTestId('package-validity-text');
            expect(screen.getByText('25/11/2026')).toBeInTheDocument();
            expect(screen.queryByText('24/11/2026')).toBeNull();
            // e a busca do notice/aceite usa o dia escrito, não o instante convertido
            expect(packageAcceptancesService.getBySale).toHaveBeenCalledWith('u1', 's1');
        } finally {
            if (prevTz === undefined) delete process.env.TZ; else process.env.TZ = prevTz;
        }
    });

    it('venda que não é de pacote não busca nada de validade', async () => {
        panel(sale, [{ id: 'i2', saleId: 's1', type: 'Service', serviceId: 'srv1', quantity: 1, unitPrice: 80 } as SaleItemRecord]);
        expect(screen.queryByTestId('package-sale-validity')).toBeNull();
        expect(packageAcceptancesService.getBySale).not.toHaveBeenCalled();
    });

    it('within: o bloco do detalhe fica dentro da seção de validade', async () => {
        vi.mocked(packageAcceptancesService.getBySale).mockResolvedValue(acceptance);
        panel();
        const section = await screen.findByTestId('package-sale-validity');
        expect(within(section).getByTestId('package-validity-notice')).toBeInTheDocument();
    });
});
