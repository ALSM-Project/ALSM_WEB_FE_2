import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceTransferDetailPage } from '../pages/ResourceTransferDetailPage';
import {
  transferApprovalApi,
  ResourceTransferRequestDto,
  TransferRequestDetailResponse,
} from '../api/transfer-approval.api';
import { partnersApi } from '@/features/partners/api/partners.api';

// Mock useAuth
vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'admin-01', fullName: 'System Admin', email: 'admin@alsm.io' },
    hasPermission: (perm: string) => perm === 'teams.manage',
  }),
}));

const mockPendingRequest: ResourceTransferRequestDto = {
  id: 'req-101',
  organizationId: 'org-enterprise-01',
  projectId: 'proj-bms-01',
  projectName: 'BMS Oracle Modernization Core',
  currentAssigneeId: 'staff-01',
  currentAssigneeName: 'Alice Johnson',
  targetAssigneeId: 'staff-02',
  targetAssigneeName: 'Bob Williams',
  targetAssigneeEmail: 'bob.williams@alsm.io',
  requestedById: 'lead-01',
  requestedByName: 'Sarah Jenkins',
  reason: 'Workload Balancing',
  note: 'Sprint capacity rebalance across active accounts.\nPlease review high-volume transaction screens first.',
  status: 'PENDING',
  createdAt: '2026-10-30T10:00:00.000Z',
  updatedAt: '2026-10-30T10:00:00.000Z',
};

const mockApprovedRequest: ResourceTransferRequestDto = {
  ...mockPendingRequest,
  id: 'req-102',
  status: 'APPROVED',
  reviewedById: 'admin-01',
  reviewedByName: 'System Admin',
  reviewedAt: '2026-10-31T15:30:00.000Z',
  reviewNote: 'Approved after capacity review in sprint planning.',
};

const mockPendingDetailResponse: TransferRequestDetailResponse = {
  request: mockPendingRequest,
  isValid: true,
  validationErrors: [],
  liveProject: {
    id: 'proj-bms-01',
    name: 'BMS Oracle Modernization Core',
    status: 'ACTIVE',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    assignedStaffId: 'staff-01',
    assignedStaffName: 'Alice Johnson',
    assignedTeamLeadId: 'lead-01',
    organizationId: 'org-enterprise-01',
    serviceType: 'MANAGED',
  },
};

const mockStaffRoster = [
  {
    id: 'staff-01',
    fullName: 'Alice Johnson',
    email: 'alice@alsm.io',
    role: 'Conversion Specialist',
    activeWorkload: 4,
  },
  {
    id: 'staff-02',
    fullName: 'Bob Williams',
    email: 'bob.williams@alsm.io',
    role: 'Conversion Staff',
    activeWorkload: 1,
  },
];

const createWrapper = (initialRoute = '/team-lead/resource-transfers/req-101') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route
            path="/team-lead/resource-transfers/:transferId"
            element={children}
          />
          <Route
            path="/team-lead/resource-transfers"
            element={<div>Transfer Approvals List Page</div>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ResourceTransferDetailPage', () => {
  beforeEach(() => {
    vi.spyOn(transferApprovalApi, 'getRequestDetails').mockResolvedValue(mockPendingDetailResponse);
    vi.spyOn(partnersApi, 'getAssignableStaff').mockResolvedValue(mockStaffRoster as any);
    vi.spyOn(transferApprovalApi, 'approveRequest').mockResolvedValue({
      success: true,
      request: {
        ...mockPendingRequest,
        status: 'APPROVED',
        reviewedById: 'admin-01',
        reviewedByName: 'System Admin',
        reviewedAt: '2026-11-01T12:00:00.000Z',
        reviewNote: 'Rebalance approved successfully',
      },
      project: { id: 'proj-bms-01', name: 'BMS Oracle Modernization Core' },
    });
    vi.spyOn(transferApprovalApi, 'rejectRequest').mockResolvedValue({
      success: true,
      request: {
        ...mockPendingRequest,
        status: 'REJECTED',
        reviewedById: 'admin-01',
        reviewedByName: 'System Admin',
        reviewedAt: '2026-11-01T12:00:00.000Z',
        rejectionReason: 'Staff already reached quarterly cap',
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders page header, breadcrumbs, and request overview', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'BMS Oracle Modernization Core' })).toBeInTheDocument();
    });

    // Back button
    expect(screen.getByText('Back to Transfer Approvals')).toBeInTheDocument();

    // Header metadata
    expect(screen.getAllByText('req-101').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pending Review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sarah Jenkins').length).toBeGreaterThan(0);
  });

  it('renders Section A (Transfer Overview) with all required fields', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Transfer Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('Transfer Type')).toBeInTheDocument();
    expect(screen.getByText('Resource Reassignment')).toBeInTheDocument();
    expect(screen.getByText('Transfer Reason')).toBeInTheDocument();
    expect(screen.getAllByText('Workload Balancing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('proj-bms-01').length).toBeGreaterThan(0);
  });

  it('renders Section B (Assignment Information) with two-column comparison', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Assignment Information')).toBeInTheDocument();
    });

    // Current Assignee column
    expect(screen.getByText('Current Assignee')).toBeInTheDocument();
    expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0);
    expect(screen.getByText('Conversion Specialist')).toBeInTheDocument();

    // Proposed Successor column
    expect(screen.getByText('Proposed Successor')).toBeInTheDocument();
    expect(screen.getByText('Bob Williams')).toBeInTheDocument();
    expect(screen.getByText('Conversion Staff')).toBeInTheDocument();
    expect(screen.getByText('bob.williams@alsm.io')).toBeInTheDocument();
  });

  it('renders Section C (Briefing & Transition Notes) with line breaks preserved', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Briefing & Transition Notes')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Sprint capacity rebalance across active accounts/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Please review high-volume transaction screens first/i)
    ).toBeInTheDocument();
  });

  it('renders Section D (Project / Resource Context) with metadata from database', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Project / Resource Context')).toBeInTheDocument();
    });

    expect(screen.getByText('BMS DSPF TO FRONTEND')).toBeInTheDocument();
    expect(screen.getByText('MANAGED')).toBeInTheDocument();
    expect(screen.getAllByText('org-enterprise-01').length).toBeGreaterThan(0);
  });

  it('renders Section E (Approval Information & Audit History)', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Approval Information')).toBeInTheDocument();
    });

    expect(screen.getByText('Approval History')).toBeInTheDocument();
    expect(screen.getByText('Request Submitted')).toBeInTheDocument();
    expect(screen.getByText('Reviewer Actions')).toBeInTheDocument();
  });

  it('executes approval with confirmation modal and checkbox', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'BMS Oracle Modernization Core' })).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Resource Transfer Approval')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Execute Approval/i });
    expect(submitBtn).toBeDisabled();

    // Check confirmation checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(submitBtn).not.toBeDisabled();

    // Optional reviewer notes
    const textarea = screen.getByPlaceholderText(/e\.g\. Approved during sprint capacity reallocation/i);
    fireEvent.change(textarea, { target: { value: 'Rebalance approved for sprint 12' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(transferApprovalApi.approveRequest).toHaveBeenCalledWith('req-101', {
        note: 'Rebalance approved for sprint 12',
      });
      expect(screen.getByText(/successfully approved/i)).toBeInTheDocument();
      expect(screen.getByText(/Approved & Reassigned/i)).toBeInTheDocument();
    });
  });

  it('executes rejection with confirmation modal and mandatory reason', async () => {
    render(<ResourceTransferDetailPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'BMS Oracle Modernization Core' })).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByRole('button', { name: /Reject/i });
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Reject Resource Transfer Request')).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/e\.g\. Proposed engineer has reached maximum capacity/i);
    fireEvent.change(textarea, { target: { value: 'Capacity reached for this quarter' } });

    const confirmRejectBtn = screen.getByRole('button', { name: /Confirm Rejection/i });
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(transferApprovalApi.rejectRequest).toHaveBeenCalledWith('req-101', {
        reason: 'Capacity reached for this quarter',
      });
      expect(screen.getByText(/has been rejected/i)).toBeInTheDocument();
      expect(screen.getByText(/Transfer Request Rejected/i)).toBeInTheDocument();
    });
  });

  it('renders read-only mode without action buttons when request is already approved', async () => {
    vi.spyOn(transferApprovalApi, 'getRequestDetails').mockResolvedValue({
      request: mockApprovedRequest,
      isValid: false,
      validationErrors: ['Request is already in APPROVED status and cannot be modified'],
      liveProject: null,
    });

    render(<ResourceTransferDetailPage />, { wrapper: createWrapper('/team-lead/resource-transfers/req-102') });

    await waitFor(() => {
      expect(screen.getByText('Finalized (APPROVED)')).toBeInTheDocument();
    });

    // Should not have Approve or Reject buttons
    expect(screen.queryByRole('button', { name: /^Approve Transfer$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Reject Request$/i })).not.toBeInTheDocument();

    // Reviewer details shown in read-only
    expect(screen.getByText('System Admin')).toBeInTheDocument();
    expect(screen.getByText('Approved after capacity review in sprint planning.')).toBeInTheDocument();
  });

  it('handles not found / error state gracefully', async () => {
    vi.spyOn(transferApprovalApi, 'getRequestDetails').mockRejectedValue(new Error('Record not found'));

    render(<ResourceTransferDetailPage />, { wrapper: createWrapper('/team-lead/resource-transfers/non-existent') });

    await waitFor(() => {
      expect(screen.getByText('Transfer Request Unavailable')).toBeInTheDocument();
      expect(screen.getByText('Record not found')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Transfer Approvals/i })).toBeInTheDocument();
  });
});
