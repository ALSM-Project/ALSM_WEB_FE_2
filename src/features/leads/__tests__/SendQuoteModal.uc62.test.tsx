import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SendQuoteModal } from '../components/SendQuoteModal';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { leadsApi } from '../api/leads.api';
import type { Lead, SendQuoteResponse } from '../types/lead';

vi.mock('../api/leads.api', () => ({
  leadsApi: {
    getById: vi.fn(),
    notifyContact: vi.fn(),
    sendQuote: vi.fn(),
  },
}));

let mockPermissions = ['sales.leads.view', 'sales.leads.manage'];

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'sales-1', email: 'internal_sales@alsm.dev', isPlatformAdmin: false },
    isLoading: false,
    error: null,
    hasPermission: (key: string) => mockPermissions.includes(key),
  }),
}));

const mockLead: Lead = {
  id: '6ad586fe9f2215c9ebcac858',
  companyName: 'FinTech Dynamics Corp',
  contactName: 'Sarah Jenkins',
  contactEmail: 's.jenkins@fintechdynamics.com',
  contactPhone: '+1 (555) 234-5678',
  jobTitle: 'VP of Engineering',
  status: 'QUALIFIED',
  source: 'WEBSITE',
  priority: 'HIGH',
  estimatedValue: 60000,
  currency: 'VND',
  tags: ['Banking'],
  createdByUserId: 'user-1',
  createdByEmail: 'sales@alsm.dev',
  createdAt: '2026-10-16T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SendQuoteModal (UC-62 - Send Quote)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissions = ['sales.leads.view', 'sales.leads.manage'];
    vi.mocked(leadsApi.getById).mockResolvedValue(mockLead);
  });

  it('renders modal with lead information and default quote parameters', () => {
    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    expect(screen.getByText(/Send Modernization Quote/i)).toBeInTheDocument();
    expect(screen.getByText('FinTech Dynamics Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Core Platform Migration & Modernization')).toBeInTheDocument();
    expect(screen.getByDisplayValue('s.jenkins@fintechdynamics.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60000')).toBeInTheDocument();
  });

  it('validates empty plan name', async () => {
    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    const planInput = screen.getByLabelText(/Modernization Plan Name/i);
    fireEvent.change(planInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /Send Quote/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Plan name cannot be empty/i)).toBeInTheDocument();
    expect(leadsApi.sendQuote).not.toHaveBeenCalled();
  });

  it('validates non-positive amount', async () => {
    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    const amountInput = screen.getByLabelText(/Base Quote Amount/i);
    fireEvent.change(amountInput, { target: { value: '0' } });

    const submitBtn = screen.getByRole('button', { name: /Send Quote/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Quote amount must be a positive number greater than 0/i),
    ).toBeInTheDocument();
    expect(leadsApi.sendQuote).not.toHaveBeenCalled();
  });

  it('calculates live discount and displays approval notice when discount exceeds 15%', async () => {
    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    const discountInput = screen.getByLabelText(/Discount Percentage/i);
    fireEvent.change(discountInput, { target: { value: '20' } });

    // Warning alert should appear for > 15%
    expect(
      await screen.findByText(/Manager Approval Required \(Discount > 15%\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Discount Justification \/ Reason/i)).toBeInTheDocument();

    // Verify calculated final amount: 60,000 - 20% (12,000) = 48,000 VND.
    expect(screen.getByText('48.000 VND')).toBeInTheDocument();

    // Button text changes to "Submit for Approval"
    expect(screen.getByRole('button', { name: /Submit for Approval/i })).toBeInTheDocument();
  });

  it('requires justification reason when discount > 15%', async () => {
    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    const discountInput = screen.getByLabelText(/Discount Percentage/i);
    fireEvent.change(discountInput, { target: { value: '25' } });

    const submitBtn = screen.getByRole('button', { name: /Submit for Approval/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/Discounts above 15% require an explicit justification/i),
    ).toBeInTheDocument();
    expect(leadsApi.sendQuote).not.toHaveBeenCalled();
  });

  it('successfully submits quote and displays generated quote result', async () => {
    const mockResponse: SendQuoteResponse = {
      quote: {
        id: 'quote-101',
        requestId: '8c5f0e16-58f3-49b6-941d-f1cb39c53afd',
        quoteNumber: 'QT-2026-94812',
        planName: 'Core Platform Migration & Modernization',
        amount: 54000,
        discountPercent: 10,
        discountApproved: true,
        status: 'SENT',
        recipientEmail: 's.jenkins@fintechdynamics.com',
        expiresAt: '2026-11-26T00:00:00.000Z',
        pdfUrl: '/quotes/qt-2026-94812.pdf',
        createdAt: '2026-10-27T00:00:00.000Z',
      },
      lead: {
        ...mockLead,
        status: 'PROPOSAL',
      },
      message: 'Quote QT-2026-94812 successfully sent to s.jenkins@fintechdynamics.com',
    };

    vi.mocked(leadsApi.sendQuote).mockResolvedValue(mockResponse);

    const onSuccess = vi.fn();
    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} onSuccess={onSuccess} />);

    // Apply 10% discount
    const discountInput = screen.getByLabelText(/Discount Percentage/i);
    fireEvent.change(discountInput, { target: { value: '10' } });

    const submitBtn = screen.getByRole('button', { name: /Send Quote/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(leadsApi.sendQuote).toHaveBeenCalledWith(
        mockLead.id,
        expect.objectContaining({
          amount: 60000,
          discountPercent: 10,
          planName: 'Core Platform Migration & Modernization',
          recipientEmail: 's.jenkins@fintechdynamics.com',
          requestId: expect.stringMatching(/^[0-9a-f-]{36}$/i),
        }),
      );
    });

    expect(await screen.findByText(/Quote Successfully Processed!/i)).toBeInTheDocument();
    expect(screen.getByText('QT-2026-94812')).toBeInTheDocument();
    expect(screen.getByText('SENT TO CLIENT')).toBeInTheDocument();
    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
  });

  it('displays a safe failure message without exposing raw API details', async () => {
    vi.mocked(leadsApi.sendQuote).mockRejectedValue({
      response: { data: { message: 'Cannot send quote to a lead that is marked as LOST' } },
    });

    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    const submitBtn = screen.getByRole('button', { name: /Send Quote/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/We could not send the quote/i)).toBeInTheDocument();
    expect(screen.queryByText(/marked as LOST/i)).not.toBeInTheDocument();
  });

  it('blocks operation if user lacks sales.leads.manage permission', () => {
    mockPermissions = ['sales.leads.view']; // Missing manage permission

    renderWithClient(<SendQuoteModal lead={mockLead} onClose={vi.fn()} />);

    expect(screen.getByText(/Permission Required/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send Quote/i })).not.toBeInTheDocument();
  });

  it('blocks operation if lead is already in WON or LOST terminal status', () => {
    const wonLead: Lead = { ...mockLead, status: 'WON' };

    renderWithClient(<SendQuoteModal lead={wonLead} onClose={vi.fn()} />);

    expect(screen.getByText(/Cannot Send Quote to WON Lead/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Send Quote/i })).not.toBeInTheDocument();
  });

  it('triggers onSendQuote callback from LeadDetailModal', async () => {
    const onSendQuote = vi.fn();
    renderWithClient(
      <LeadDetailModal
        lead={mockLead}
        onClose={vi.fn()}
        onSendQuote={onSendQuote}
        onUpdateStatus={vi.fn()}
      />,
    );

    const sendQuoteBtn = screen.getByRole('button', { name: /Send Quote/i });
    expect(sendQuoteBtn).toBeInTheDocument();
    await waitFor(() => expect(sendQuoteBtn).toBeEnabled());

    fireEvent.click(sendQuoteBtn);
    expect(onSendQuote).toHaveBeenCalledWith(mockLead);
  });
});
