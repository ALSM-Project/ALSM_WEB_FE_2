import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateResourceTransferPage } from '../pages/CreateResourceTransferPage';
import { transferApprovalApi } from '../api/transfer-approval.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { workforceApi } from '@/shared/api/workforce.api';

const mockProjects = [
  {
    id: 'proj-01',
    name: 'Core Banking Modernization',
    assignedStaffId: 'staff-01',
    assignedStaffName: 'Alex Mercer',
    conversionType: 'COBOL_TO_JAVA',
    status: 'ACTIVE',
  },
  {
    id: 'proj-02',
    name: 'Card Services DSPF Migration',
    assignedStaffId: undefined,
    assignedStaffName: undefined,
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    status: 'ACTIVE',
  },
];

const mockStaffEmployees = [
  {
    id: 'mem-01',
    membershipId: 'mem-01',
    userId: 'staff-01',
    fullName: 'Alex Mercer',
    email: 'alex@alsm.io',
    employeeCode: 'ALSM-EMP-0001',
    department: 'Conversion Operations',
    teamName: 'Modernization Operations',
    role: 'Conversion Specialist',
    memberType: 'INTERNAL_EMPLOYEE',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    organizationId: 'org-alsm',
    activeWorkload: 3,
    maxCapacity: 5,
  },
  {
    id: 'mem-02',
    membershipId: 'mem-02',
    userId: 'staff-02',
    fullName: 'David Chen',
    email: 'david@alsm.io',
    employeeCode: 'ALSM-EMP-0002',
    department: 'Engineering',
    teamName: 'Conversion Operations',
    role: 'Conversion Staff',
    memberType: 'INTERNAL_EMPLOYEE',
    status: 'ACTIVE',
    employmentStatus: 'ACTIVE',
    organizationId: 'org-alsm',
    activeWorkload: 1,
    maxCapacity: 5,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/team-lead/resource-transfers/new']}>
        <Routes>
          <Route
            path="/team-lead/resource-transfers/new"
            element={children}
          />
          <Route
            path="/team-lead/resource-transfers/:transferId"
            element={<div>Transfer Detail Target Page</div>}
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

describe('CreateResourceTransferPage', () => {
  beforeEach(() => {
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mockProjects as any);
    vi.spyOn(workforceApi, 'searchWorkforce').mockImplementation(async (query) => {
      const q = (query.q || '').toLowerCase();
      const filtered = mockStaffEmployees.filter(
        (e) => e.fullName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q)
      );
      return {
        items: filtered as any,
        total: filtered.length,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
    });

    vi.spyOn(transferApprovalApi, 'createRequest').mockResolvedValue({
      id: 'req-new-99',
      organizationId: 'org-01',
      projectId: 'proj-01',
      projectName: 'Core Banking Modernization',
      targetAssigneeId: 'staff-02',
      targetAssigneeName: 'David Chen',
      requestedById: 'admin-01',
      requestedByName: 'System Admin',
      reason: 'Workload Balancing',
      note: 'Rebalancing sprint queue',
      status: 'PENDING',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders page header, return link, and searchable selectors', async () => {
    render(<CreateResourceTransferPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Initiate Resource Transfer Request' })
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by project name, ID, partner/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search internal staff by name/i)).toBeInTheDocument();
  });

  it('displays live project and staff previews when selections are made', async () => {
    render(<CreateResourceTransferPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by project name, ID, partner/i)).toBeInTheDocument();
    });

    // 1. Search and select project
    const projectInput = screen.getByPlaceholderText(/Search by project name, ID, partner/i);
    fireEvent.change(projectInput, { target: { value: 'Core' } });

    await waitFor(() => {
      expect(screen.getByText('Core Banking Modernization')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Core Banking Modernization'));

    // Verify Project Dossier card appeared
    await waitFor(() => {
      expect(screen.getByText(/COBOL → Spring Boot 3.3/i)).toBeInTheDocument();
      expect(screen.getByText('Change Project')).toBeInTheDocument();
    });

    // 2. Search and select target staff
    const staffInput = screen.getByPlaceholderText(/Search internal staff by name/i);
    fireEvent.change(staffInput, { target: { value: 'David' } });

    await waitFor(() => {
      expect(screen.getByText('David Chen')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('David Chen'));

    // Verify Staff Dossier card appeared
    await waitFor(() => {
      expect(screen.getByText('Change Employee')).toBeInTheDocument();
      expect(screen.getByText('#ALSM-EMP-0002')).toBeInTheDocument();
    });
  });

  it('submits valid transfer request and navigates to the new detail page', async () => {
    render(<CreateResourceTransferPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by project name, ID, partner/i)).toBeInTheDocument();
    });

    // 1. Select project
    const projectInput = screen.getByPlaceholderText(/Search by project name, ID, partner/i);
    fireEvent.change(projectInput, { target: { value: 'Core' } });

    await waitFor(() => {
      expect(screen.getByText('Core Banking Modernization')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Core Banking Modernization'));

    // 2. Select staff
    const staffInput = screen.getByPlaceholderText(/Search internal staff by name/i);
    fireEvent.change(staffInput, { target: { value: 'David' } });

    await waitFor(() => {
      expect(screen.getByText('David Chen')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('David Chen'));

    // 3. Set notes and submit
    const noteTextarea = screen.getByLabelText(/Technical Handover & Milestone Briefing/i);
    fireEvent.change(noteTextarea, { target: { value: 'Handover screen backlog' } });

    const submitButtons = screen.getAllByRole('button', { name: /Submit Transfer Request/i });
    fireEvent.click(submitButtons[0]);

    await waitFor(() => {
      expect(transferApprovalApi.createRequest).toHaveBeenCalledWith({
        projectId: 'proj-01',
        targetStaffId: 'staff-02',
        reason: 'Workload Balancing',
        note: 'Handover screen backlog',
      });
      expect(screen.getByText('Transfer Detail Target Page')).toBeInTheDocument();
    });
  });
});
