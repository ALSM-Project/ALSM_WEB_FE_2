import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LeadDetailPage } from '../pages/LeadDetailPage';
import { crmApi, LeadDto } from '../api/crm.api';
import { adminApi } from '@/features/admin/api/admin.api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', email: 'admin@alsm.com', fullName: 'System Admin' },
    hasPermission: () => true,
  }),
}));

const mockSetCustomBreadcrumbs = vi.fn();
vi.mock('@/context/NavigationContext', () => ({
  useNavigation: () => ({
    setCustomBreadcrumbs: mockSetCustomBreadcrumbs,
    sidebarNav: [],
  }),
}));

vi.mock('../api/crm.api', () => ({
  crmApi: {
    getLeadById: vi.fn(),
    updateLeadStage: vi.fn(),
    logInteraction: vi.fn(),
    scheduleDemo: vi.fn(),
    createQuote: vi.fn(),
    acceptQuote: vi.fn(),
    createContract: vi.fn(),
    sendContractForSignature: vi.fn(),
    simulateSignContract: vi.fn(),
    activateCustomer: vi.fn(),
  },
}));

vi.mock('@/features/admin/api/admin.api', () => ({
  adminApi: {
    getAuditLogs: vi.fn(),
  },
}));

const sampleLead: LeadDto = {
  id: 'lead-test-123',
  company: 'FPT Software Global',
  contactName: 'Hoang Nguyen',
  email: 'hoangndhde180837@fpt.edu.vn',
  phone: '+84 987 654 321',
  source: 'CONVERSATION',
  stage: 'QUALIFIED',
  score: 85,
  dealValue: 1000000,
  currency: 'VND',
  conversationId: 'conv-fpt-01',
  assignedToName: 'Sarah Jenkins',
  estimatedScreens: 20,
  estimatedPrograms: 5,
  createdAt: '2026-11-05T08:00:00Z',
  lastContactAt: '2026-11-05T10:30:00Z',
  interactions: [
    {
      id: 'int-1',
      type: 'EMAIL',
      summary: 'Converted from Customer Conversation: "Modernization Support & Inquiries - hoangndhde180837"',
      details: 'Customer inquiry via Web1 portal chat regarding legacy system conversion.',
      performedBy: 'admin@alsm.com',
      timestamp: '2026-11-05T08:00:00Z',
    },
  ],
  demos: [
    {
      id: 'demo-1',
      topic: 'CICS BMS to React 19 Walkthrough',
      scheduledAt: '2026-11-08T14:00:00Z',
      durationMinutes: 45,
      attendees: ['hoangndhde180837@fpt.edu.vn'],
      meetingLink: 'https://meet.google.com/alsm-demo-123',
      status: 'SCHEDULED',
      createdBy: 'Sarah Jenkins',
    },
  ],
  quotes: [
    {
      id: 'quote-1',
      quoteNumber: 'Q-2026-FPT-01',
      plan: 'Enterprise Tier 1',
      projectScope: '20 screens & 5 programs',
      basePrice: 1000000,
      discountPercent: 10,
      finalPrice: 900000,
      requiresApproval: false,
      approvalStatus: 'APPROVED',
      status: 'ACCEPTED',
      createdAt: '2026-11-05T09:00:00Z',
    },
  ],
  contracts: [
    {
      id: 'contract-1',
      contractNumber: 'CNT-2026-FPT-01',
      title: 'Enterprise Modernization Agreement - FPT Software',
      plan: 'Enterprise Tier 1',
      annualValue: 900000,
      status: 'FULLY_SIGNED',
      effectiveDate: '2026-11-05T00:00:00Z',
      docusignEnvelopeId: 'ENV-DOCUSIGN-FPT-01',
      createdAt: '2026-11-05T10:00:00Z',
    },
  ],
  payment: {
    required: false,
    amount: 1000000,
    status: 'WAIVED',
  },
  stageAudit: [
    {
      id: 'aud-1',
      fromStage: 'NEW',
      toStage: 'QUALIFIED',
      changedBy: 'Sarah Jenkins',
      timestamp: '2026-11-05T08:15:00Z',
      notes: 'Demo scheduled, qualification confirmed',
    },
  ],
  updatedAt: '2026-11-05T10:30:00Z',
};

describe('LeadDetailPage - Redesigned Enterprise CRM Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (crmApi.getLeadById as any).mockResolvedValue(sampleLead);
    (adminApi.getAuditLogs as any).mockResolvedValue([
      {
        id: 'audit-be-1',
        actor: 'Sarah Jenkins',
        action: 'LEAD_STAGE_UPDATED',
        resourceType: 'LEAD',
        resourceId: 'lead-test-123',
        metadata: { oldStage: 'NEW', newStage: 'QUALIFIED' },
        timestamp: '2026-11-05T08:15:00Z',
        ipAddress: '192.168.1.10',
      },
    ]);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/sales/leads/lead-test-123']}>
        <Routes>
          <Route path="/sales/leads/:leadId" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('renders lead header with company name, score, primary contact, and rep', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('FPT Software Global').length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText(/Score: 85/i)).toBeInTheDocument();
    expect(screen.getAllByText('Hoang Nguyen').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('hoangndhde180837@fpt.edu.vn').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('+84 987 654 321').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sarah Jenkins').length).toBeGreaterThanOrEqual(1);

    // Verify breadcrumbs are configured properly
    await waitFor(() => {
      expect(mockSetCustomBreadcrumbs).toHaveBeenCalledWith([
        { label: 'Leads (CRM)', path: '/sales/leads' },
        { label: 'FPT Software Global' },
      ]);
    });
  });

  it('has no redundant Back button in header', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('FPT Software Global').length).toBeGreaterThanOrEqual(1);
    });

    // Ensure there is no "Back to Lead Directory" button
    expect(screen.queryByTitle(/Back to Lead Directory/i)).not.toBeInTheDocument();
  });

  it('navigates to dedicated Create Contract wizard when clicking Create Contract', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('FPT Software Global').length).toBeGreaterThanOrEqual(1);
    });

    const createContractBtns = screen.getAllByRole('button', { name: /Create Contract/i });
    expect(createContractBtns.length).toBeGreaterThan(0);
    fireEvent.click(createContractBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/sales/contracts/new?leadId=lead-test-123');
  });

  it('renders the 4 overview cards with commercial scope in VND and safe dates', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('FPT Software Global').length).toBeGreaterThanOrEqual(1);
    });

    // Deal Value formatted in VND
    expect(screen.getByText(/1\.000\.000/)).toBeInTheDocument();

    // Scope summary
    expect(screen.getByText(/20 screens • 5 programs/)).toBeInTheDocument();

    // No "Invalid Date" text anywhere in the entire document!
    expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
  });

  it('switches between workspace tabs properly', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('FPT Software Global').length).toBeGreaterThanOrEqual(1);
    });

    // 1. Activity tab (default)
    expect(screen.getByText(/Modernization Support & Inquiries/i)).toBeInTheDocument();

    // 2. Scheduled Demos tab
    fireEvent.click(screen.getByRole('button', { name: /Scheduled Demos/i }));
    await waitFor(() => {
      expect(screen.getByText('CICS BMS to React 19 Walkthrough')).toBeInTheDocument();
      expect(screen.getByText('Join Room')).toBeInTheDocument();
    });

    // 3. Quotes tab
    fireEvent.click(screen.getByRole('button', { name: /Quotes/i }));
    await waitFor(() => {
      expect(screen.getByText('Q-2026-FPT-01')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Tier 1')).toBeInTheDocument();
    });

    // 4. Contracts tab
    fireEvent.click(screen.getByRole('button', { name: /Contracts & E-Sign/i }));
    await waitFor(() => {
      expect(screen.getByText('CNT-2026-FPT-01')).toBeInTheDocument();
      expect(screen.getByText('FULLY SIGNED')).toBeInTheDocument();
    });

    // 5. Customer Activation tab
    const activationButtons = screen.getAllByRole('button', { name: /Customer Activation/i });
    fireEvent.click(activationButtons[activationButtons.length - 1]);
    await waitFor(() => {
      expect(screen.getByText(/Customer Activation & Organization Provisioning Workflow/i)).toBeInTheDocument();
      expect(screen.getByText('✓ Verified (Executed)')).toBeInTheDocument();
    });

    // 6. Audit Log tab
    fireEvent.click(screen.getByRole('button', { name: /Audit Log/i }));
    await waitFor(() => {
      expect(screen.getByText(/Immutable Audit Trail & Compliance Ledger/i)).toBeInTheDocument();
      expect(screen.getByText('LEAD STAGE UPDATED')).toBeInTheDocument();
    });
  });

  it('opens RequestLegalInfoModal and EditLeadModal from action buttons', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Request Legal Info')).toBeInTheDocument();
      expect(screen.getByText('Edit Lead Details')).toBeInTheDocument();
    });

    // 1. Open Request Legal Info Modal
    fireEvent.click(screen.getByText('Request Legal Info'));
    await waitFor(() => {
      expect(screen.getByText(/Request Legal Entity Information for Contract E-Signing/i)).toBeInTheDocument();
      expect(screen.getByText(/1-Click Copy Template/i)).toBeInTheDocument();
      expect(screen.getByText(/Send Direct Email/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Web Gmail/i)).toBeInTheDocument();
    });

    // 2. Open Edit Lead Modal from the button in request modal
    fireEvent.click(screen.getByText(/Customer Replied\? Enter Legal Info Now/i));
    await waitFor(() => {
      expect(screen.getByText(/Edit Lead & Legal Entity Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Enterprise Legal Entity/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Lead Details/i })).toBeInTheDocument();
    });
  });
});
