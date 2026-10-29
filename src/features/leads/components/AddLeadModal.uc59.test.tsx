import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AddLeadModal } from './AddLeadModal';
import { leadsApi } from '../api/leads.api';
import type { CreateLeadResponse, Lead } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: {
    create: vi.fn(),
  },
}));

const createdLead = {
  id: '64b000000000000000000010',
  companyName: 'Example Bank',
  contactName: 'Alex Smith',
  contactEmail: 'alex@example.test',
  status: 'NEW',
} as Lead;

const createdResponse: CreateLeadResponse = {
  lead: createdLead,
  replayed: false,
  notificationSent: true,
  message: 'Lead created and contact notification email sent.',
};

const fillRequiredFields = () => {
  fireEvent.change(screen.getByLabelText('Company name'), { target: { value: 'Example Bank' } });
  fireEvent.change(screen.getByLabelText('Contact name'), { target: { value: 'Alex Smith' } });
  fireEvent.change(screen.getByLabelText('Contact email'), { target: { value: 'ALEX@EXAMPLE.TEST' } });
};

describe('AddLeadModal (UC-59)', () => {
  const create = vi.mocked(leadsApi.create);
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = () => render(
    <AddLeadModal isOpen onClose={onClose} onSuccess={onSuccess} />,
  );

  it('validates required details before calling the API', () => {
    renderModal();
    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    expect(screen.getByRole('alert')).toHaveTextContent('Company, contact name, and email are required.');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates the lead with a normalized email and an idempotency key, then reports success', async () => {
    create.mockResolvedValue(createdResponse);
    renderModal();
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText('Estimated value (VND)'), { target: { value: '125000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create lead' }));

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: 'Example Bank',
        contactName: 'Alex Smith',
        contactEmail: 'alex@example.test',
        estimatedValue: 125000,
        source: 'WEBSITE',
        priority: 'MEDIUM',
      }),
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    );
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(createdLead, true, createdResponse.message);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('reports a saved lead even when the email notification was not sent', async () => {
    create.mockResolvedValue({ ...createdResponse, notificationSent: false });
    renderModal();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create lead' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(createdLead, false, createdResponse.message);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents a second submission while the first request is processing', async () => {
    let resolveCreate!: (response: CreateLeadResponse) => void;
    create.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
    renderModal();
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Create lead' }));
    const loadingButton = await screen.findByRole('button', { name: 'Creating lead…' });
    expect(loadingButton).toBeDisabled();
    expect(create).toHaveBeenCalledTimes(1);

    resolveCreate(createdResponse);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('shows a safe duplicate error and keeps the form open for correction', async () => {
    create.mockRejectedValue({ response: { status: 409, data: { message: 'database details' } } });
    renderModal();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create lead' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/email already exists/i);
    expect(screen.queryByText('database details')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows a permission error without exposing server details', async () => {
    create.mockRejectedValue({ response: { status: 403, data: { message: 'sensitive internal message' } } });
    renderModal();
    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: 'Create lead' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not have permission/i);
    expect(screen.queryByText(/sensitive internal message/i)).not.toBeInTheDocument();
  });
});
