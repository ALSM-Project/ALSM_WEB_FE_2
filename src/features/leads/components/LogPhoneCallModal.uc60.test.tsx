import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogPhoneCallModal } from './LogPhoneCallModal';
import { leadsApi } from '../api/leads.api';
import type { Lead, LogPhoneCallResponse } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: { logPhoneCall: vi.fn() },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const lead: Lead = {
  id: '6ad586fe9f2215c9ebcac858',
  companyName: 'FPT Software',
  contactName: 'Cuong Nguyen',
  contactEmail: 'cuong@example.test',
  status: 'NEW',
  source: 'WEBSITE',
  priority: 'MEDIUM',
  currency: 'USD',
  tags: [],
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('LogPhoneCallModal (UC-60)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates the required outcome and summary before sending', async () => {
    render(<LogPhoneCallModal lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save call' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Complete the outcome');
    expect(leadsApi.logPhoneCall).not.toHaveBeenCalled();
  });

  it('submits once with an idempotency key and returns the saved lead', async () => {
    const onSuccess = vi.fn();
    const response: LogPhoneCallResponse = {
      call: {
        id: 'call-1',
        outcome: 'CONNECTED',
        durationMinutes: 12,
        summary: 'Discussed scope',
        performedByUserId: 'sales-1',
        performedByEmail: 'sales@alsm.dev',
        createdAt: '2026-10-29T10:00:00.000Z',
      },
      lead: { ...lead, status: 'CONTACTED', lastContactedAt: '2026-10-29T10:00:00.000Z' },
      replayed: false,
      message: 'Phone call logged successfully.',
    };
    vi.mocked(leadsApi.logPhoneCall).mockResolvedValue(response);
    render(<LogPhoneCallModal lead={lead} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Call outcome/), { target: { value: 'CONNECTED' } });
    fireEvent.change(screen.getByLabelText(/Call summary/), { target: { value: 'Discussed scope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save call' }));

    await waitFor(() => expect(leadsApi.logPhoneCall).toHaveBeenCalledTimes(1));
    expect(leadsApi.logPhoneCall).toHaveBeenCalledWith(
      lead.id,
      { outcome: 'CONNECTED', durationMinutes: 15, summary: 'Discussed scope' },
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
  });

  it('shows a safe permission message and lets staff retry', async () => {
    vi.mocked(leadsApi.logPhoneCall).mockRejectedValue({ response: { status: 403 } });
    render(<LogPhoneCallModal lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Call outcome/), { target: { value: 'NO_ANSWER' } });
    fireEvent.change(screen.getByLabelText(/Call summary/), { target: { value: 'No answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save call' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
    expect(screen.getByRole('button', { name: 'Save call' })).toBeEnabled();
  });
});
