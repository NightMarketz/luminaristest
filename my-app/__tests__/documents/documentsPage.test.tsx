import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

const docs = vi.hoisted(() => ({ list: [] as Record<string, unknown>[] }));
const getDocuments = vi.hoisted(() => vi.fn(async () => ({ data: { documents: docs.list } })));

const i18nStable = vi.hoisted(() => ({ t: (_k: string, d?: unknown) => (typeof d === 'string' ? d : ((d as { defaultValue?: string })?.defaultValue ?? _k)) }));
vi.mock('next-i18next', () => ({ useTranslation: () => i18nStable }));
vi.mock('next-i18next/serverSideTranslations', () => ({ serverSideTranslations: vi.fn() }));
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../lib/hoc/withAuth', () => ({ default: (C: React.ComponentType) => C }));
vi.mock('../../lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../../lib/services/document.service', () => ({ DocumentService: { getDocuments, deleteDocument: vi.fn() } }));
vi.mock('../../lib/notifications/notify', () => ({ notify: vi.fn() }));

import DocumentsPage from '../../pages/documents/index';

const doc = (over: Record<string, unknown>) => ({
  id: 'd1', userId: 'u1', fileName: 'balanco.pdf', fileType: 'PDF', fileSize: 2048, status: 'COMPLETED',
  documentPurpose: 'DATA_ANALYSIS', summary: null, contextJson: { segredo: 1 }, textContent: 'TEXTO-INTERNO',
  uploadDate: '2026-11-01T10:00:00Z', processingDate: null, processingError: null,
  createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z', ...over,
});

// L-20261113-152233-632a
describe('Documentos', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); getDocuments.mockClear(); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('"Ver detalhes" não despeja o JSON do registro nem campos internos', async () => {
    docs.list = [doc({})];
    render(<DocumentsPage />);
    fireEvent.click(await screen.findByText('View Details'));
    const page = document.body.textContent ?? '';
    expect(page).not.toContain('TEXTO-INTERNO');
    expect(page).not.toContain('segredo');
    expect(page).not.toContain('"userId"');
    expect(page).toContain('balanco.pdf');
  });

  it('documento em PROCESSING é reconsultado sozinho até concluir', async () => {
    docs.list = [doc({ status: 'PROCESSING' })];
    render(<DocumentsPage />);
    await screen.findAllByText('balanco.pdf');
    const antes = getDocuments.mock.calls.length;
    docs.list = [doc({ status: 'COMPLETED' })];
    await act(async () => { await vi.advanceTimersByTimeAsync(6000); });
    expect(getDocuments.mock.calls.length).toBeGreaterThan(antes);
  });

  it('existe botão para atualizar a lista', async () => {
    docs.list = [doc({})];
    render(<DocumentsPage />);
    const btn = await screen.findByRole('button', { name: 'Refresh' });
    const antes = getDocuments.mock.calls.length;
    fireEvent.click(btn);
    await waitFor(() => expect(getDocuments.mock.calls.length).toBeGreaterThan(antes));
  });

  it('aba vazia não manda "Click Upload Document" quando já há documentos em outra aba', async () => {
    docs.list = [doc({ documentPurpose: 'DATA_ANALYSIS' })];
    render(<DocumentsPage />);
    fireEvent.click(await screen.findByText(/Knowledge Base/));
    await waitFor(() => expect(screen.queryByText('balanco.pdf')).toBeNull());
    expect(document.body.textContent).not.toContain('Click "Upload Document"');
  });
});
