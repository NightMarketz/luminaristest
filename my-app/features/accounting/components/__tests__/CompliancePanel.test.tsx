import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { CompliancePanel, buildBatchItems, type MappingDraft } from '../CompliancePanel';
import type { UnmappedReferentialAccount } from '../../../../lib/services/referential.service';

// Stub the referential service so mounting the panel never touches the network.
// The panel fetches coverage only on an explicit "Carregar cobertura" click, so a
// bare mount stays inert — these stubs just keep the import graph offline.
vi.mock('../../../../lib/services/referential.service', () => ({
  referentialService: {
    getCoverage: vi.fn(),
    batchSet: vi.fn(),
    copyVersion: vi.fn(),
    importCatalog: vi.fn(),
  },
}));

// useAuth() throws outside an AuthProvider — mock it so the ADMIN-only catalog section
// (Fork F-COMP2-3 → a) can be toggled per test via `mockAuthUser`.
let mockAuthUser: { role: string } | null = { role: 'ADMIN' };
vi.mock('../../../../lib/context/AuthContext', () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

const acc = (accountId: string, name: string): UnmappedReferentialAccount => ({
  accountId,
  code: '1.1.1',
  name,
  nature: 'ASSET',
});

describe('buildBatchItems (A1a referential authoring)', () => {
  const accounts = [acc('a1', 'Caixa'), acc('a2', 'Banco'), acc('a3', 'Clientes')];

  it('sends only rows with a non-blank referential code', () => {
    const drafts: MappingDraft = {
      a1: { referentialCode: '1.01.01', label: 'Caixa RFB' },
      a2: { referentialCode: '', label: 'ignored' }, // blank code → skipped
      // a3 untouched → skipped (upsert omits, never deletes)
    };
    const items = buildBatchItems(drafts, accounts);
    expect(items).toEqual([{ accountId: 'a1', referentialCode: '1.01.01', label: 'Caixa RFB' }]);
  });

  it('falls back to the account name when the label is blank', () => {
    const drafts: MappingDraft = { a2: { referentialCode: '1.01.02', label: '  ' } };
    const items = buildBatchItems(drafts, accounts);
    expect(items).toEqual([{ accountId: 'a2', referentialCode: '1.01.02', label: 'Banco' }]);
  });

  it('trims code and label', () => {
    const drafts: MappingDraft = { a1: { referentialCode: '  1.01.01  ', label: '  Caixa  ' } };
    expect(buildBatchItems(drafts, accounts)).toEqual([
      { accountId: 'a1', referentialCode: '1.01.01', label: 'Caixa' },
    ]);
  });

  it('is empty when nothing was filled', () => {
    expect(buildBatchItems({}, accounts)).toEqual([]);
  });
});

// ── Render smoke: version picker mounts, coverage table stays hidden pre-load ──
describe('CompliancePanel (render)', () => {
  beforeEach(cleanup);

  it('renders the mapping section header and the load control', () => {
    render(<CompliancePanel unitId="u1" />);
    expect(screen.getByRole('heading', { name: /Mapeamento Referencial \(RFB\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Carregar cobertura/ })).toBeInTheDocument();
  });

  it('does not render the coverage table or copy-version section before a load', () => {
    render(<CompliancePanel unitId="u1" />);
    // "Copiar versão" only appears once a coverage version is loaded.
    expect(screen.queryByRole('heading', { name: /Copiar versão/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Salvar mapeamentos/ })).not.toBeInTheDocument();
  });
});

// ── Catálogo Referencial Oficial (RFB) — import, ADMIN-only visibility ─────────
describe('CompliancePanel — catalog import (Fork F-COMP2-3 → a: ADMIN-only)', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockAuthUser = { role: 'ADMIN' };
  });

  it('shows the catalog section to an ADMIN user', () => {
    render(<CompliancePanel unitId="u1" />);
    expect(
      screen.getByRole('heading', { name: /Catálogo Referencial Oficial \(RFB\)/ }),
    ).toBeInTheDocument();
  });

  it('hides the catalog section for a non-ADMIN user', () => {
    mockAuthUser = { role: 'STAFF' };
    render(<CompliancePanel unitId="u1" />);
    expect(
      screen.queryByRole('heading', { name: /Catálogo Referencial Oficial \(RFB\)/ }),
    ).not.toBeInTheDocument();
  });

  it('hides the catalog section when there is no authenticated user', () => {
    mockAuthUser = null;
    render(<CompliancePanel unitId="u1" />);
    expect(
      screen.queryByRole('heading', { name: /Catálogo Referencial Oficial \(RFB\)/ }),
    ).not.toBeInTheDocument();
  });

  it('pre-fills the layout version from the mapping "Versão" field (Fork F-COMP2-5 → b)', () => {
    render(<CompliancePanel unitId="u1" />);
    // Two "2026"-placeholder inputs exist: the mapping version field and the catalog
    // layout-version field. Typing in the first mirrors into the (still untouched) second.
    const [mappingVersionInput] = screen.getAllByPlaceholderText('2026');
    fireEvent.change(mappingVersionInput, { target: { value: '2027' } });
    const catalogInput = screen.getAllByPlaceholderText('2026')[1] as HTMLInputElement;
    expect(catalogInput.value).toBe('2027');
  });

  it('blocks the import client-side when the layout version is blank', async () => {
    const { referentialService } = await import('../../../../lib/services/referential.service');
    render(<CompliancePanel unitId="u1" />);
    const [, catalogVersionInput] = screen.getAllByPlaceholderText('2026');
    fireEvent.change(catalogVersionInput, { target: { value: '   ' } });

    const file = new File(['code,name,isAnalytic\n1,Caixa,true'], 'catalogo.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await waitFor(() => fireEvent.change(fileInput, { target: { files: [file] } }));

    expect(screen.getByText('Informe a versão do layout.')).toBeInTheDocument();
    expect(referentialService.importCatalog).not.toHaveBeenCalled();
  });

  it('imports the selected file with the typed layout version', async () => {
    const { referentialService } = await import('../../../../lib/services/referential.service');
    (referentialService.importCatalog as ReturnType<typeof vi.fn>).mockResolvedValue({
      layoutVersion: '2027',
      totalRows: 3,
      imported: 3,
      analyticCount: 2,
      syntheticCount: 1,
    });
    render(<CompliancePanel unitId="u1" />);
    const [, catalogVersionInput] = screen.getAllByPlaceholderText('2026');
    fireEvent.change(catalogVersionInput, { target: { value: '2027' } });

    const file = new File(['code,name,isAnalytic\n1,Caixa,true'], 'catalogo.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() =>
      expect(referentialService.importCatalog).toHaveBeenCalledWith('u1', '2027', file),
    );
  });

  it('shows the server error message (e.g. 403) via resolveError on failure', async () => {
    const { referentialService } = await import('../../../../lib/services/referential.service');
    (referentialService.importCatalog as ReturnType<typeof vi.fn>).mockRejectedValue({
      error: 'Admin role required to import the shared referential catalog',
      status: 403,
    });
    render(<CompliancePanel unitId="u1" />);
    const [, catalogVersionInput] = screen.getAllByPlaceholderText('2026');
    fireEvent.change(catalogVersionInput, { target: { value: '2027' } });

    const file = new File(['code,name,isAnalytic\n1,Caixa,true'], 'catalogo.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(
      await screen.findByText('Admin role required to import the shared referential catalog'),
    ).toBeInTheDocument();
  });

  it('always shows the silent-risk footer note (item 19)', () => {
    render(<CompliancePanel unitId="u1" />);
    expect(
      screen.getByText(/passa a validar o código contra este catálogo/),
    ).toBeInTheDocument();
  });
});
