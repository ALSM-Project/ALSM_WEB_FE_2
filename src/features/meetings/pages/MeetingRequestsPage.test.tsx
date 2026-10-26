import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { meetingRequestsApi } from '../api/meeting-requests.api';
import { MeetingRequestsPage } from './MeetingRequestsPage';
import type { MeetingRequest } from '../types/meeting-request';

vi.mock('../api/meeting-requests.api', () => ({
  meetingRequestsApi: {
    listMeetingRequests: vi.fn(),
    getConsultationTypes: vi.fn(),
    getCalendarStatus: vi.fn(),
    createMeetingRequest: vi.fn(),
    assignSales: vi.fn(),
    proposeMeetingSlots: vi.fn(),
    confirmMeeting: vi.fn(),
    rescheduleMeeting: vi.fn(),
    cancelMeeting: vi.fn(),
    recordOutcome: vi.fn(),
    convertToOpportunity: vi.fn(),
    createEnterpriseQuote: vi.fn(),
    addInternalNote: vi.fn(),
  },
}));

const mockMeeting: MeetingRequest = {
  id: 'req-001',
  requestId: 'MTR-2026-0001',
  customer: {
    fullName: 'Nguyen Van A',
    companyName: 'Vietcombank Enterprise',
    email: 'a.nguyen@vietcombank.com.vn',
    phone: '+84901234567',
    customerType: 'PROSPECT',
  },
  topic: 'Core Banking BMS to React 19 Modernization',
  consultationType: 'SALES_SERVICE',
  priority: 'HIGH',
  status: 'NEW_REQUEST',
  requirements: {
    serviceMode: 'ALSM_MANAGED',
    legacySystemType: 'IBM 3270 BMS',
    estimatedScreens: 120,
    estimatedPrograms: 45,
    estimatedProjectScale: 'LARGE',
    businessRequirements: 'Migrate core banking screen maps deterministically.',
  },
  scheduling: {
    timezone: 'Asia/Ho_Chi_Minh',
    durationMinutes: 45,
    format: 'GOOGLE_MEET',
    calendarIntegrationStatus: 'CONNECTED',
    proposedSlots: [],
  },
  assignment: {},
  internalNotes: [],
  communicationHistory: [],
  meetingHistory: [
    {
      action: 'REQUEST_SUBMITTED',
      performedBy: 'a.nguyen@vietcombank.com.vn',
      timestamp: '2026-11-05T08:00:00.000Z',
    },
  ],
  createdAt: '2026-11-05T08:00:00.000Z',
  updatedAt: '2026-11-05T08:00:00.000Z',
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MeetingRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MeetingRequestsPage (Enterprise Consultation Management)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(meetingRequestsApi.listMeetingRequests).mockResolvedValue({
      items: [mockMeeting],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      statusCounts: { NEW_REQUEST: 1 },
      calendarIntegration: { isEnabled: true },
    });
    vi.mocked(meetingRequestsApi.getConsultationTypes).mockResolvedValue([
      {
        key: 'SALES_SERVICE',
        label: 'Sales & Service Consultation',
        description: 'Overview',
        recommendedDurationMinutes: 45,
      },
    ]);
  });

  it('renders page header and customer consultation requests', async () => {
    renderPage();

    expect(await screen.findByText('Meeting Requests')).toBeInTheDocument();
    expect(await screen.findByText('Vietcombank Enterprise')).toBeInTheDocument();
    expect(screen.getByText('MTR-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Core Banking BMS to React 19 Modernization')).toBeInTheDocument();
    expect(screen.getByText('NEW REQUEST')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('filters consultation requests by status tabs', async () => {
    renderPage();

    const pendingTab = await screen.findByRole('button', { name: /Pending Scheduling/ });
    fireEvent.click(pendingTab);

    expect(meetingRequestsApi.listMeetingRequests).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING_SCHEDULING' })
    );
  });

  it('opens detail drawer when clicking a consultation request row', async () => {
    renderPage();

    const row = await screen.findByText('Vietcombank Enterprise');
    fireEvent.click(row);

    expect(await screen.findByText('Legacy Architecture Scope')).toBeInTheDocument();
    expect(screen.getByText('IBM 3270 BMS')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
  });
});
