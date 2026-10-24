/**
 * FIX-CHAT-AGENTE lote A, §3.3 #14 do ACHADOS-2026-10-19 — o servidor grava dois estados de falha (`FAILED` no
 * upload assíncrono e no watchdog de PROCESSING; `ERROR` no pipeline), e a lista de documentos só agrupava `ERROR`:
 * um documento `FAILED` some do contador e fica sem selo.
 * Autorização: dono, chat, 2026-10-21 e 2026-10-22 ("Todos os 22 em série").
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock('@/lib/hoc/withAuth', () => ({ default: (c: unknown) => c }));
vi.mock('@/lib/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/lib/services/document.service', () => ({
  DocumentService: {
    getDocuments: vi.fn().mockResolvedValue({
      data: {
        documents: [
          { id: 'd1', fileName: 'contrato.pdf', status: 'FAILED', documentPurpose: 'KNOWLEDGE_BASE', fileType: 'PDF', fileSize: 10, createdAt: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z', summary: null },
        ],
      },
    }),
  },
}));

import DocumentListPage from '@/pages/documents/index';

describe('lista de documentos — documento FAILED', () => {
  it('conta no grupo de erro e mostra o selo de erro', async () => {
    render(<DocumentListPage />);

    expect(await screen.findByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Error \(1\)/)).toBeInTheDocument();
    expect(screen.getAllByText('Error')).toHaveLength(1);
  });
});
