import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserOffboardingApprovalPage } from '../pages/UserOffboardingApprovalPage';
import {
  offboardingApprovalApi,
  OffboardingRequestDto,
} from '../api/offboarding-approval.api';
import { rbacApi } from '@/features/rbac/api/rbac.api';

const mockRequests: OffboardingRequestDto[] = [
  {
    id: 'req-01',
    organizationId: 'org-1',
    teamId: 'team-01',
    teamName: 'Modernization Core Team',
    targetUserId: 'staff-01',
    targetUserName: 'Departing Staff Alice',
    targetUserEmail: 'alice@alsm.io',
    targetUserRoles: ['CONVERSION_STAFF'],
    requestedById: 'lead-01',
    requestedByName: 'Sarah Jenkins',
    requestedByEmail: 'sarah@alsm.io',
    transferToUserId: 'staff-02',
    transferToUserName: 'Successor Bob',
    reason: 'Contract completion',
    note: 'Handle outstanding migration modules',
    status: 'PENDING',
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'req-02',
    organizationId: 'org-1',
    teamId: 'team-01',
    teamName: 'Modernization Core Team',
    targetUserId: 'staff-03',
    targetUserName: 'Departing Staff Charlie',
    targetUserEmail: 'charlie@alsm.io',
    targetUserRoles: ['CONVERSION_STAFF'],
    requestedById: 'lead-01',
    requestedByName: 'Sarah Jenkins',
    requestedByEmail: 'sarah@alsm.io',
    reason: 'Department transfer',
    status: 'APPROVED',
    reviewedById: 'lead-01',
    reviewedByName: 'Sarah Jenkins',
    reviewedAt: '2026-10-26T14:30:00.000Z',
    reviewNote: 'All deliverables handed over',
    createdAt: '2026-10-24T08:00:00.000Z',
    updatedAt: '2026-10-26T14:30:00.000Z',
  },
];

const mockLiveDetail = {
  request: mockRequests[0],
  liveSummary: {
    activeSessionsCount: 2,
    apiKeysCount: 1,
    assignedProjects: [
      {
        id: 'proj-01',
        name: 'Core Banking BMS Modernization',
        status: 'ACTIVE',
        conversionType: 'BMS_DSPF_TO_FRONTEND',
        assignedStaffId: 'staff-01',
        assignedStaffName: 'Departing Staff Alice',
      },
    ],
    pendingJobsCount: 0,
    eligibleSuccessors: [
      {
        id: 'staff-02',
        fullName: 'Successor Bob',
        email: 'bob@alsm.io',
        roles: ['CONVERSION_STAFF'],
        activeProjectCount: 1,
      },
    ],
  },
  isAuthorizedToReview: true,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/team-lead/offboarding-approvals']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('UserOffboardingApprovalPage (UC-89 Screen S73)', () => {
  beforeEach(() => {
    vi.spyOn(offboardingApprovalApi, 'listRequests').mockResolvedValue(mockRequests);
    vi.spyOn(offboardingApprovalApi, 'getRequestDetails').mockResolvedValue(mockLiveDetail);
    vi.spyOn(offboardingApprovalApi, 'approveRequest').mockResolvedValue({
      request: { ...mockRequests[0], status: 'APPROVED' },
      executionResult: { success: true },
    });
    vi.spyOn(offboardingApprovalApi, 'rejectRequest').mockResolvedValue({
      ...mockRequests[0],
      status: 'REJECTED',
    });
    vi.spyOn(offboardingApprovalApi, 'createRequest').mockResolvedValue({
      ...mockRequests[0],
      id: 'req-03',
    });
    vi.spyOn(rbacApi, 'getAllUsers').mockResolvedValue([
      {
        id: 'staff-04',
        email: 'staff4@alsm.io',
        fullName: 'Staff Four',
        isPlatformAdmin: false,
        isActive: true,
        isLocked: false,
        roles: ['CONVERSION_STAFF'],
      },
    ]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders Screen S73 header, metrics, and offboarding requests table', async () => {
    render(<UserOffboardingApprovalPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/User Offboarding Approvals/i)).toBeInTheDocument();
    expect(screen.getByText(/S73/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Departing Staff Alice')).toBeInTheDocument();
      expect(screen.getByText('Departing Staff Charlie')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Modernization Core Team').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pending Review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approved/i).length).toBeGreaterThan(0);
  });

  it('opens Review & Impact modal displaying live resource allocations', async () => {
    render(<UserOffboardingApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Departing Staff Alice')).toBeInTheDocument();
    });

    const reviewButtons = screen.getAllByRole('button', { name: /Review Impact/i });
    fireEvent.click(reviewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Live Resource & Security Posture/i)).toBeInTheDocument();
      expect(screen.getByText('Core Banking BMS Modernization')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Active Sessions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/API Credentials/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Transferable Projects/i).length).toBeGreaterThan(0);
  });

  it('approves an offboarding request and triggers UC-83 execution', async () => {
    render(<UserOffboardingApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Departing Staff Alice')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /^Approve$/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/Approve User Offboarding/i)).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const confirmApproveBtn = screen.getByRole('button', {
      name: /Approve & Execute Offboarding/i,
    });
    fireEvent.click(confirmApproveBtn);

    await waitFor(() => {
      expect(offboardingApprovalApi.approveRequest).toHaveBeenCalledWith(
        'req-01',
        expect.objectContaining({
          transferToUserId: 'staff-02',
        }),
      );
    });
  });

  it('rejects an offboarding request with mandatory rejection reason', async () => {
    render(<UserOffboardingApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Departing Staff Alice')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByText(/Reject User Offboarding Request/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Explain why this request is rejected/i);
    fireEvent.change(textarea, {
      target: { value: 'Active deliverables required for current quarter release' },
    });

    const confirmRejectBtn = screen.getByRole('button', {
      name: /Reject Offboarding Request/i,
    });
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(offboardingApprovalApi.rejectRequest).toHaveBeenCalledWith(
        'req-01',
        expect.objectContaining({
          rejectionReason:
            'Active deliverables required for current quarter release',
        }),
      );
    });
  });
});
