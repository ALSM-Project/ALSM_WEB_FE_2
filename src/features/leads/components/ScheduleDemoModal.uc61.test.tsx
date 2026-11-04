import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScheduleDemoModal } from './ScheduleDemoModal';
import { leadsApi } from '../api/leads.api';
import type { Lead, ScheduleDemoResponse } from '../types/lead';

const { hasPermissionMock } = vi.hoisted(() => ({ hasPermissionMock: vi.fn(() => true) }));

vi.mock('../api/leads.api', () => ({
  leadsApi: { scheduleDemo: vi.fn() },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ hasPermission: hasPermissionMock }),
}));

const lead: Lead = {
  id: '6ad586fe9f2215c9ebcac858',
  companyName: 'FPT Software',
  contactName: 'Cuong Nguyen',
  contactEmail: 'cuong@example.test',
  status: 'NEW',
  source: 'WEBSITE',
  priority: 'MEDIUM',
  currency: 'VND',
  tags: [],
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('ScheduleDemoModal (UC-61)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermissionMock.mockReturnValue(true);
  });

  it('rejects invalid attendee emails before making an API request', async () => {
    render(<ScheduleDemoModal lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Attendee emails/), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Schedule Demo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('valid attendee email addresses');
    expect(leadsApi.scheduleDemo).not.toHaveBeenCalled();
  });

  it('sends a future appointment once with an idempotency key and returns the persisted lead', async () => {
    const onSuccess = vi.fn();
    const response: ScheduleDemoResponse = {
      demo: {
        id: 'demo-1',
        title: 'Modernization Demo: FPT Software',
        scheduledAt: '2026-11-03T07:00:00.000Z',
        durationMinutes: 45,
        attendeeEmails: ['cuong@example.test'],
        status: 'SCHEDULED',
        scheduledByUserId: 'sales-1',
        scheduledByEmail: 'sales@alsm.dev',
        createdAt: '2026-10-29T10:00:00.000Z',
      },
      lead: { ...lead, status: 'QUALIFIED' },
      replayed: false,
      message: 'Demo scheduled successfully.',
    };
    vi.mocked(leadsApi.scheduleDemo).mockResolvedValue(response);
    render(<ScheduleDemoModal lead={lead} onClose={vi.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: 'Schedule Demo' }));

    await waitFor(() => expect(leadsApi.scheduleDemo).toHaveBeenCalledTimes(1));
    expect(leadsApi.scheduleDemo).toHaveBeenCalledWith(
      lead.id,
      expect.objectContaining({
        title: 'Modernization Demo: FPT Software',
        durationMinutes: 45,
        attendeeEmails: ['cuong@example.test'],
      }),
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
  });

  it('disables scheduling when the user lacks permission', () => {
    hasPermissionMock.mockReturnValue(false);
    render(<ScheduleDemoModal lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Schedule Demo' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('sales.leads.manage');
  });

  it('shows a safe error when the backend denies permission', async () => {
    vi.mocked(leadsApi.scheduleDemo).mockRejectedValue({ response: { status: 403 } });
    render(<ScheduleDemoModal lead={lead} onClose={vi.fn()} onSuccess={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Schedule Demo' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission');
  });
});
