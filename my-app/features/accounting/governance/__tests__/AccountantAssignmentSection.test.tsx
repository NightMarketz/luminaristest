import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

(globalThis as unknown as { React: typeof React }).React = React;
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { AccountantAssignmentSection } from '../AccountantAssignmentSection';
import { AcceptAssignmentModal } from '../AssignmentModals';
import {
  accountantAssignmentsService,
  type AccountantAssignmentView,
} from '../../../../lib/services/accountantAssignments.service';
import { accountingContactsService, type AccountingContact } from '../../../../lib/services/accountingContacts.service';

/**
 * FE-INCR-ACCOUNTANT-GOVERNANCE itens 13b e 13d — a seção do dono (convite / encerramento) e o aceite do contador.
 * i18n sem instância devolve o fallback SEM interpolar: o texto com `{{x}}` aparece cru nas asserções.
 */
vi.mock('../../../../lib/services/accountantAssignments.service', () => ({
  accountantAssignmentsService: { invite: vi.fn(), listByScope: vi.fn(), listMine: vi.fn(), accept: vi.fn(), end: vi.fn() },
}));
vi.mock('../../../../lib/services/accountingContacts.service', () => ({
  accountingContactsService: { listContacts: vi.fn() },
}));

const contact: AccountingContact = {
  id: 'c1', unitId: 'u1', name: 'Ana Contadora', email: 'ana@x.com', cpf: '000', phone: null,
  crcNumber: 'SP-123456/O-3', crcUf: 'SP', deletedAt: null,
};
const assignment = (over: Partial<AccountantAssignmentView>): AccountantAssignmentView => ({
  id: 'a1', unitId: 'u1', status: 'ACTIVE', accountingContactId: 'c1', accountantUserId: 'acc-1',
  crcNumber: 'SP-123456/O-3', crcUf: 'SP', activeFrom: '2026-10-01T12:00:00Z', activeUntil: null, endReason: null,
  createdAt: '2026-10-01T12:00:00Z', ...over,
});

describe('AccountantAssignmentSection (dono)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
    vi.mocked(accountingContactsService.listContacts).mockResolvedValue([contact]);
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([]);
  });

  it('13b: convite com e-mail inexistente mostra a mensagem do ACCOUNTANT_USER_NOT_FOUND, não o texto cru do servidor', async () => {
    vi.mocked(accountantAssignmentsService.invite).mockRejectedValue({ error: 'raw', code: 'ACCOUNTANT_USER_NOT_FOUND', status: 400 });
    render(<AccountantAssignmentSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Convidar/ }));
    const select = await screen.findByRole('combobox');
    await waitFor(() => expect(screen.getByRole('option', { name: /Ana Contadora/ })).toBeInTheDocument());
    fireEvent.change(select, { target: { value: 'c1' } });
    fireEvent.change(screen.getByLabelText(/E-mail do contador/), { target: { value: 'ninguem@x.com' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Convidar' }).slice(-1)[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não há usuário cadastrado com este e-mail/);
    expect(accountantAssignmentsService.invite).toHaveBeenCalledWith({ unitId: 'u1', accountingContactId: 'c1', accountantEmail: 'ninguem@x.com' });
  });

  it('13b: "Convidar" desabilita com convite PENDING e a PENDING aparece com o nome do contato', async () => {
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([assignment({ status: 'PENDING', activeFrom: null })]);
    render(<AccountantAssignmentSection unitId="u1" />);
    expect(await screen.findByTestId('assignment-pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Convidar/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar convite' })).toBeInTheDocument();
  });

  it('13b: encerrar sem motivo não envia; com motivo manda { reason } e recarrega', async () => {
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([assignment({})]);
    vi.mocked(accountantAssignmentsService.end).mockResolvedValue(assignment({ status: 'ENDED' }));
    render(<AccountantAssignmentSection unitId="u1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Encerrar atribuição' }));

    // Aviso do F-GOV-10 (a)/F-GOV-11 (a): encerrar devolve ao dono a reabertura e a assinatura.
    expect(await screen.findByText(/Encerrar devolve a você a reabertura e a assinatura/)).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Encerrar' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(accountantAssignmentsService.end).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'troca de contador' } });
    fireEvent.click(submit);
    await waitFor(() => expect(accountantAssignmentsService.end).toHaveBeenCalledWith('a1', { reason: 'troca de contador' }));
    await waitFor(() => expect(accountantAssignmentsService.listByScope).toHaveBeenCalledTimes(2));
  });

  it('o histórico lista a linha ENCERRADA com o motivo', async () => {
    vi.mocked(accountantAssignmentsService.listByScope).mockResolvedValue([assignment({ status: 'ENDED', endReason: 'fim do contrato', activeUntil: '2026-11-01T12:00:00Z' })]);
    render(<AccountantAssignmentSection unitId="u1" />);
    expect(await screen.findByText('fim do contrato')).toBeInTheDocument();
    expect(screen.getByTestId('assignment-history')).toHaveTextContent('SP-123456/O-3');
  });
});

describe('AcceptAssignmentModal (contador)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('13d: o botão só habilita com o checkbox; aceitar chama accept(id) — o corpo { declaresWrittenContract: true } é fixo no serviço', async () => {
    vi.mocked(accountantAssignmentsService.accept).mockResolvedValue(assignment({}));
    const onDone = vi.fn();
    render(<AcceptAssignmentModal assignmentId="a9" ownerEmail="dono@x.com" onClose={vi.fn()} onDone={onDone} />);
    const accept = screen.getByRole('button', { name: 'Aceitar' });
    expect(accept).toBeDisabled();
    fireEvent.click(accept);
    expect(accountantAssignmentsService.accept).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(accept).toBeEnabled();
    fireEvent.click(accept);
    await waitFor(() => expect(accountantAssignmentsService.accept).toHaveBeenCalledWith('a9'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('ASSIGNMENT_STATUS_CHANGED mostra "o convite mudou"', async () => {
    vi.mocked(accountantAssignmentsService.accept).mockRejectedValue({ error: 'raw', code: 'ASSIGNMENT_STATUS_CHANGED', status: 409 });
    render(<AcceptAssignmentModal assignmentId="a9" ownerEmail="dono@x.com" onClose={vi.fn()} onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/O convite mudou de estado/);
  });
});
