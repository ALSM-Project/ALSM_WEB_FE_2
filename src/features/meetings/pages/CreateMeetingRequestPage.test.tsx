import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CreateMeetingRequestPage } from './CreateMeetingRequestPage';
import { meetingRequestsApi } from '../api/meeting-requests.api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSetCustomBreadcrumbs = vi.fn();
vi.mock('@/context/NavigationContext', () => ({
  useNavigation: () => ({
    setCustomBreadcrumbs: mockSetCustomBreadcrumbs,
    sidebarNav: [],
  }),
}));

vi.mock('../api/meeting-requests.api', () => ({
  meetingRequestsApi: {
    createMeetingRequest: vi.fn(),
  },
}));

vi.mock('@/features/crm/api/crm.api', () => ({
  crmApi: {
    getLeads: vi.fn().mockResolvedValue([
      {
        id: 'lead-vietcombank',
        companyName: 'Vietcombank Enterprise',
        contactName: 'Nguyen Van Lead',
        email: 'vcb@vietcombank.com.vn',
        phone: '+84 901 111 222',
        stage: 'WON',
      },
    ]),
    getLeadById: vi.fn(),
  },
}));

vi.mock('@/features/partners/api/partners.api', () => ({
  partnersApi: {
    getPartners: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/features/admin/api/admin.api', () => ({
  adminApi: {
    getOrganizations: vi.fn().mockResolvedValue([]),
  },
}));

describe('CreateMeetingRequestPage - Prefill from CRM Lead and Directory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (meetingRequestsApi.createMeetingRequest as any).mockResolvedValue({ id: 'req-new-123' });
  });

  it('renders correctly and sets custom breadcrumbs', async () => {
    render(
      <MemoryRouter initialEntries={['/sales/meeting-requests/new']}>
        <Routes>
          <Route path="/sales/meeting-requests/new" element={<CreateMeetingRequestPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('New Consultation & Meeting Request')).toBeInTheDocument();
    expect(mockSetCustomBreadcrumbs).toHaveBeenCalledWith([
      { label: 'Meeting Requests', path: '/sales/meeting-requests' },
      { label: 'New Consultation Request' },
    ]);
  });

  it('pre-fills contact details, topic, and dossier when passed query parameters from a Lead', async () => {
    const search = new URLSearchParams({
      leadId: 'lead-test-corp',
      companyName: 'Công Ty CP Công Nghệ Demo Toàn Trình',
      fullName: 'Nguyễn Văn Khách Hàng',
      email: 'khachhang.demo@alsm.io',
      phone: '0888775655',
      customerType: 'EXISTING_CUSTOMER',
      topic: 'Modernization Consultation & Technical Assessment - Công Ty CP Công Nghệ Demo Toàn Trình',
    }).toString();

    render(
      <MemoryRouter initialEntries={[`/sales/meeting-requests/new?${search}`]}>
        <Routes>
          <Route path="/sales/meeting-requests/new" element={<CreateMeetingRequestPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Verify auto-fill notification banner
    expect(await screen.findByText(/Pre-filled from CRM Lead:/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-populated from Lead/i)).toBeInTheDocument();

    // Verify input fields are pre-filled
    const fullNameInput = screen.getByLabelText(/Full Name \*/i) as HTMLInputElement;
    expect(fullNameInput.value).toBe('Nguyễn Văn Khách Hàng');

    const companyInput = screen.getByLabelText(/Company \/ Organization \*/i) as HTMLInputElement;
    expect(companyInput.value).toBe('Công Ty CP Công Nghệ Demo Toàn Trình');

    const emailInput = screen.getByLabelText(/Email Address \*/i) as HTMLInputElement;
    expect(emailInput.value).toBe('khachhang.demo@alsm.io');

    const phoneInput = screen.getByLabelText(/Phone Number/i) as HTMLInputElement;
    expect(phoneInput.value).toBe('0888775655');

    const topicInput = screen.getByLabelText(/Meeting Topic \/ Subject \*/i) as HTMLInputElement;
    expect(topicInput.value).toBe('Modernization Consultation & Technical Assessment - Công Ty CP Công Nghệ Demo Toàn Trình');

    // Verify dossier reflects the prefilled company
    expect(screen.getByText('Customer Relationship Dossier')).toBeInTheDocument();
    expect(screen.getAllByText('Công Ty CP Công Nghệ Demo Toàn Trình').length).toBeGreaterThanOrEqual(1);
  });

  it('submits valid request and navigates back to /sales/meeting-requests', async () => {
    const search = new URLSearchParams({
      leadId: 'lead-test-corp',
      companyName: 'Công Ty CP Công Nghệ Demo Toàn Trình',
      fullName: 'Nguyễn Văn Khách Hàng',
      email: 'khachhang.demo@alsm.io',
      phone: '0888775655',
      customerType: 'PROSPECT',
      topic: 'Modernization Consultation - Test',
    }).toString();

    render(
      <MemoryRouter initialEntries={[`/sales/meeting-requests/new?${search}`]}>
        <Routes>
          <Route path="/sales/meeting-requests/new" element={<CreateMeetingRequestPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const submitBtn = screen.getByRole('button', { name: /Submit Consultation Request/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(meetingRequestsApi.createMeetingRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Công Ty CP Công Nghệ Demo Toàn Trình',
          fullName: 'Nguyễn Văn Khách Hàng',
          email: 'khachhang.demo@alsm.io',
          phone: '0888775655',
          topic: 'Modernization Consultation - Test',
        }),
      );
      expect(mockNavigate).toHaveBeenCalledWith('/sales/meeting-requests');
    });
  });
});
