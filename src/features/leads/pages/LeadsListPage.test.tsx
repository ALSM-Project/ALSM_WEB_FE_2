import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeadsListPage } from './LeadsListPage';
import { leadsApi } from '../api/leads.api';
import type { Lead, ListLeadsResponse } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: {
    getById: vi.fn(),
    list: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'sales@alsm.dev', isPlatformAdmin: false },
    isLoading: false,
    error: null,
    hasPermission: (key: string) => ['sales.leads.view', 'sales.leads.manage'].includes(key),
  }),
}));


const mockLeads: Lead[] = [
  {
    id: 'lead-1',
    companyName: 'FinTech Dynamics Corp',
    contactName: 'Sarah Jenkins',
    contactEmail: 's.jenkins@fintechdynamics.com',
    contactPhone: '+1 (555) 234-5678',
    jobTitle: 'VP of Engineering',
    status: 'QUALIFIED',
    source: 'WEBSITE',
    priority: 'HIGH',
    estimatedValue: 120000,
    currency: 'VND',
    notes: 'Looking to modernize AS400 core banking screens.',
    assignedToUserId: 'user-1',
    assignedToEmail: 'sales@alsm.dev',
    tags: ['Banking', 'AS400'],
    lastContactedAt: '2026-10-24T10:00:00.000Z',
    nextFollowUpAt: '2026-10-29T10:00:00.000Z',
    createdByUserId: 'user-1',
    createdByEmail: 'sales@alsm.dev',
    createdAt: '2026-10-16T00:00:00.000Z',
    updatedAt: '2026-10-24T00:00:00.000Z',
  },
  {
    id: 'lead-2',
    companyName: 'Apex Health Systems',
    contactName: 'Dr. Michael Chang',
    contactEmail: 'mchang@apexhealth.org',
    jobTitle: 'CMIO',
    status: 'NEW',
    source: 'REFERRAL',
    priority: 'CRITICAL',
    estimatedValue: 250000,
    currency: 'VND',
    notes: 'Urgent COBOL migration.',
    tags: ['Healthcare'],
    createdByUserId: 'user-2',
    createdByEmail: 'admin@alsm.dev',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z',
  },
];

const mockResponse: ListLeadsResponse = {
  items: mockLeads,
  total: 2,
  statusCounts: {
    NEW: 1,
    QUALIFIED: 1,
    PROPOSAL: 0,
    WON: 0,
    LOST: 0,
  },
};

describe('LeadsListPage (UC-58)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(leadsApi.getById).mockImplementation(async (id) => {
      const lead = mockLeads.find((item) => item.id === id);
      if (!lead) throw { response: { status: 404 } };
      return lead;
    });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LeadsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('renders page header and metric cards with lead data', async () => {
    vi.mocked(leadsApi.list).mockResolvedValueOnce(mockResponse);

    renderComponent();

    expect(screen.getByText('Leads (CRM)')).toBeInTheDocument();
    expect(
      screen.getByText(/Manage, filter, and track sales prospects/)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument();
      expect(screen.getByText('Apex Health Systems')).toBeInTheDocument();
    });

    // Check contact names
    expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    expect(screen.getByText('Dr. Michael Chang')).toBeInTheDocument();
  });

  it('displays empty state when no leads are found', async () => {
    vi.mocked(leadsApi.list).mockResolvedValueOnce({
      items: [],
      total: 0,
      statusCounts: {},
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No leads found')).toBeInTheDocument();
    });
  });

  it('opens detail modal when a lead row is clicked and closes on close button', async () => {
    vi.mocked(leadsApi.list).mockResolvedValueOnce(mockResponse);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument();
    });

    // Click on the row
    const row = screen.getByText('FinTech Dynamics Corp').closest('tr');
    expect(row).toBeInTheDocument();
    fireEvent.click(row!);

    // Verify detail modal opens
    await waitFor(() => {
      expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument();
      expect(
        screen.getByText('Looking to modernize AS400 core banking screens.')
      ).toBeInTheDocument();
      expect(screen.getByText('#Banking')).toBeInTheDocument();
      expect(screen.getByText('#AS400')).toBeInTheDocument();
    });
    expect(leadsApi.getById).toHaveBeenCalledWith('lead-1');

    // Click Close button
    const closeBtn = screen.getAllByRole('button', { name: 'Close' })[0];
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Lead ID: lead-1')).not.toBeInTheDocument();
    });
  });

  it('opens lead details from the keyboard on a focused row', async () => {
    vi.mocked(leadsApi.list).mockResolvedValueOnce(mockResponse);
    renderComponent();

    const row = await screen.findByRole('row', {
      name: 'View details for FinTech Dynamics Corp, Sarah Jenkins',
    });
    expect(row).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(row, { key: 'Enter' });

    await waitFor(() => expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument());
    expect(leadsApi.getById).toHaveBeenCalledWith('lead-1');
  });

  it('supports status filtering', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue(mockResponse);

    renderComponent();

    const statusSelect = document.getElementById('lead-status-filter') as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();

    fireEvent.change(statusSelect, { target: { value: 'QUALIFIED' } });

    await waitFor(() => {
      expect(leadsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'QUALIFIED' })
      );
    });
  });

  it('supports search input', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue(mockResponse);

    renderComponent();

    const searchInput = screen.getByPlaceholderText(
      /Search by company, contact name/i
    );
    fireEvent.change(searchInput, { target: { value: 'FinTech' } });

    await waitFor(() => {
      expect(leadsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'FinTech' })
      );
    });
  });
});

describe('UpdateLeadStatusModal (UC-66)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const renderPage = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LeadsListPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

  const waitForDetailAction = async (name: RegExp) => {
    const button = screen.getByRole('button', { name });
    await waitFor(() => expect(button).toBeEnabled());
    return button;
  };

  it('opens update status modal via detail modal Update Status button', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue({
      items: [mockLeads[0]],
      total: 1,
      statusCounts: { QUALIFIED: 1 },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument();
    });

    // Open detail modal
    fireEvent.click(screen.getByText('FinTech Dynamics Corp').closest('tr')!);

    await waitFor(() => {
      expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument();
    });

    // Click Update Status
    const updateBtn = await waitForDetailAction(/update status/i);
    fireEvent.click(updateBtn);

    // Detail modal closes, update status modal opens
    await waitFor(() => {
      expect(screen.getByText('Update Lead Status')).toBeInTheDocument();
    });
  });

  it('shows allowed status options for a QUALIFIED lead', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue({
      items: [mockLeads[0]], // QUALIFIED
      total: 1,
      statusCounts: { QUALIFIED: 1 },
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument());
    fireEvent.click(screen.getByText('FinTech Dynamics Corp').closest('tr')!);
    await waitFor(() => expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument());
    fireEvent.click(await waitForDetailAction(/update status/i));

    await waitFor(() => {
      expect(screen.getByText('Update Lead Status')).toBeInTheDocument();
    });

    // QUALIFIED allows: PROPOSAL, NEGOTIATION, LOST
    expect(screen.getByRole('button', { name: /proposal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /negotiation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lost/i })).toBeInTheDocument();
    // Should NOT show WON directly from QUALIFIED
    expect(screen.queryByRole('button', { name: /^won$/i })).not.toBeInTheDocument();
  });

  it('submits status update and shows success message', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue({
      items: [mockLeads[0]], // QUALIFIED
      total: 1,
      statusCounts: { QUALIFIED: 1 },
    });
    vi.mocked(leadsApi.updateStatus).mockResolvedValue({
      lead: { ...mockLeads[0], status: 'PROPOSAL' },
      updated: true,
      message: 'Lead status updated to PROPOSAL successfully',
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument());
    fireEvent.click(screen.getByText('FinTech Dynamics Corp').closest('tr')!);
    await waitFor(() => expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument());
    fireEvent.click(await waitForDetailAction(/update status/i));

    await waitFor(() => {
      expect(screen.getByText('Update Lead Status')).toBeInTheDocument();
    });

    // Select PROPOSAL
    fireEvent.click(screen.getByRole('button', { name: /proposal/i }));

    // Click submit
    const submitBtn = screen.getByRole('button', { name: /update status/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(leadsApi.updateStatus).toHaveBeenCalledWith('lead-1', {
        status: 'PROPOSAL',
        notes: 'Looking to modernize AS400 core banking screens.',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText('Lead status updated to PROPOSAL successfully')
      ).toBeInTheDocument();
    });
    expect(screen.getByText('Proposal', { selector: '#update-lead-status-modal span' })).toBeInTheDocument();
  });

  it('shows error message when update fails', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue({
      items: [mockLeads[0]],
      total: 1,
      statusCounts: { QUALIFIED: 1 },
    });
    vi.mocked(leadsApi.updateStatus).mockRejectedValue(
      Object.assign(new Error('Network error'), {
        response: { data: { message: 'Invalid status transition' } },
      })
    );

    renderPage();
    await waitFor(() => expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument());
    fireEvent.click(screen.getByText('FinTech Dynamics Corp').closest('tr')!);
    await waitFor(() => expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument());
    fireEvent.click(await waitForDetailAction(/update status/i));

    await waitFor(() => {
      expect(screen.getByText('Update Lead Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /proposal/i }));
    fireEvent.click(await waitForDetailAction(/update status/i));

    await waitFor(() => {
      expect(screen.getByText('Invalid status transition')).toBeInTheDocument();
    });
  });

  it('closes modal when cancel button is clicked', async () => {
    vi.mocked(leadsApi.list).mockResolvedValue({
      items: [mockLeads[0]],
      total: 1,
      statusCounts: { QUALIFIED: 1 },
    });

    renderPage();
    await waitFor(() => expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument());
    fireEvent.click(screen.getByText('FinTech Dynamics Corp').closest('tr')!);
    await waitFor(() => expect(screen.getByText('Lead ID: lead-1')).toBeInTheDocument());
    fireEvent.click(await waitForDetailAction(/update status/i));

    await waitFor(() => {
      expect(screen.getByText('Update Lead Status')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Update Lead Status')).not.toBeInTheDocument();
    });
  });
});

