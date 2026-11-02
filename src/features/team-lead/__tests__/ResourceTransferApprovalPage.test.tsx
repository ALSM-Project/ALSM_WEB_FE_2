import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceTransferApprovalPage } from '../pages/ResourceTransferApprovalPage';
import {
  transferApprovalApi,
  ResourceTransferRequestDto,
} from '../api/transfer-approval.api';

const mockRequests: ResourceTransferRequestDto[] = [
  {
    id: 'req-01',
    organizationId: 'org-1',
    projectId: 'proj-01',
    projectName: 'Core Banking BMS Modernization',
    currentAssigneeId: 'staff-01',
    currentAssigneeName: 'Alex Mercer',
    targetAssigneeId: 'staff-02',
    targetAssigneeName: 'David Chen',
    targetAssigneeEmail: 'david@alsm.io',
    requestedById: 'lead-01',
    requestedByName: 'Sarah Jenkins',
    reason: 'Workload Balancing',
    note: 'Handle high-priority transaction screens',
    status: 'PENDING',
    createdAt: '2026-10-25T10:00:00.000Z',
    updatedAt: '2026-10-25T10:00:00.000Z',
  },
  {
    id: 'req-02',
    organizationId: 'org-1',
    projectId: 'proj-02',
    projectName: 'Payments Gateway Migration',
    currentAssigneeId: 'staff-02',
    currentAssigneeName: 'David Chen',
    targetAssigneeId: 'staff-03',
    targetAssigneeName: 'Emily Watson',
    targetAssigneeEmail: 'emily@alsm.io',
    requestedById: 'lead-01',
    requestedByName: 'Sarah Jenkins',
    reason: 'Skill Alignment',
    note: 'Completed spring batch allocation',
    status: 'APPROVED',
    reviewedById: 'lead-01',
    reviewedByName: 'Sarah Jenkins',
    reviewedAt: '2026-10-26T14:30:00.000Z',
    reviewNote: 'Approved for Q4 release',
    createdAt: '2026-10-24T08:00:00.000Z',
    updatedAt: '2026-10-26T14:30:00.000Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/team-lead/resource-transfers']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('ResourceTransferApprovalPage (UC-88)', () => {
  beforeEach(() => {
    vi.spyOn(transferApprovalApi, 'listRequests').mockResolvedValue(mockRequests);
    vi.spyOn(transferApprovalApi, 'getRequestDetails').mockResolvedValue({
      request: mockRequests[0],
      isValid: true,
      validationErrors: [],
      liveProject: {
        id: 'proj-01',
        name: 'Core Banking BMS Modernization',
        status: 'ACTIVE',
        conversionType: 'BMS_DSPF_TO_FRONTEND',
        assignedStaffId: 'staff-01',
        assignedStaffName: 'Alex Mercer',
      },
    });
    vi.spyOn(transferApprovalApi, 'approveRequest').mockResolvedValue({
      success: true,
      request: { ...mockRequests[0], status: 'APPROVED' },
      project: { id: 'proj-01', name: 'Core Banking BMS Modernization' },
    });
    vi.spyOn(transferApprovalApi, 'rejectRequest').mockResolvedValue({
      success: true,
      request: { ...mockRequests[0], status: 'REJECTED' },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders page header, metrics, and transfer requests table', async () => {
    render(<ResourceTransferApprovalPage />, { wrapper: createWrapper() });

    expect(screen.getByText(/Resource Transfer Approvals/i)).toBeInTheDocument();
    expect(screen.getByText(/UC-88 Approve Resource Transfer/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS Modernization')).toBeInTheDocument();
      expect(screen.getByText('Payments Gateway Migration')).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Pending Review/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Approved/i).length).toBeGreaterThan(0);
  });

  it('opens request details modal with authoritative validation info', async () => {
    render(<ResourceTransferApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS Modernization')).toBeInTheDocument();
    });

    const detailsButtons = screen.getAllByRole('button', { name: /^Details$/i });
    fireEvent.click(detailsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Transfer Request Details & Validation Check/i)).toBeInTheDocument();
      expect(screen.getByText(/Authoritative Validation Passed/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Alex Mercer/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/David Chen/i).length).toBeGreaterThan(0);
    });
  });

  it('requires explicit confirmation checkbox before executing approval (UC-88)', async () => {
    render(<ResourceTransferApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS Modernization')).toBeInTheDocument();
    });

    const approveButton = screen.getByRole('button', { name: /^Approve$/i });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText(/Confirm Resource Transfer Approval \(UC-88\)/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Execute Approval/i });
    expect(submitBtn).toBeDisabled();

    // Check confirmation checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(transferApprovalApi.approveRequest).toHaveBeenCalledWith('req-01', expect.anything());
      expect(screen.getByText(/successfully approved/i)).toBeInTheDocument();
    });
  });

  it('supports rejecting a transfer request with mandatory reason', async () => {
    render(<ResourceTransferApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Core Banking BMS Modernization')).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /^Reject$/i });
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(screen.getByText(/Reject Resource Transfer Request/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/e\.g\. Proposed engineer has reached maximum capacity/i);
    fireEvent.change(textarea, { target: { value: 'Engineer workload exceeds quarterly limit' } });

    const confirmRejectBtn = screen.getByRole('button', { name: /Confirm Rejection/i });
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(transferApprovalApi.rejectRequest).toHaveBeenCalledWith('req-01', {
        reason: 'Engineer workload exceeds quarterly limit',
      });
      expect(screen.getByText(/has been rejected/i)).toBeInTheDocument();
    });
  });

  it('handles server error gracefully and displays error banner', async () => {
    vi.spyOn(transferApprovalApi, 'listRequests').mockRejectedValue(new Error('Network transport error'));
    render(<ResourceTransferApprovalPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Network transport error')).toBeInTheDocument();
    });
  });
});
