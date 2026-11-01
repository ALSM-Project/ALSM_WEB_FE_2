import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TransferProjectOwnershipPage } from '../pages/TransferProjectOwnershipPage';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '@/features/admin/api/admin.api';

const mockProjects = [
  {
    id: 'proj-transfer-101',
    name: 'Core Banking Modernization Suite',
    partnerId: 'partner-fintech',
    partnerName: 'FinTech Global Corp',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.0 / Java 21',
    status: 'ACTIVE',
    screensTotal: 4,
    screensCompleted: 2,
    programsTotal: 10,
    programsCompleted: 5,
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: 'staff-01',
    assignedStaffName: 'Alex Mercer',
    createdAt: '2026-10-15T00:00:00.000Z',
  },
];

const mockStaff = [
  { id: 'staff-01', fullName: 'Alex Mercer', email: 'alex@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 2 },
  { id: 'staff-02', fullName: 'David Chen', email: 'david@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 1 },
  { id: 'staff-03', fullName: 'Elena Rostova', email: 'elena@alsm.io', role: 'TEAM_LEAD', activeWorkload: 3 },
];

const createWrapper = (initialRoute = '/team-lead/projects/proj-transfer-101/transfer') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'lead-01',
    fullName: 'Sarah Jenkins',
    email: 'teamlead@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: ['teams.manage', 'projects.view'],
  });

  return ({ children }: { children?: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/team-lead/projects/:projectId/transfer" element={children} />
          <Route path="/team-lead/projects" element={<div>Projects List Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TransferProjectOwnershipPage - Dedicated Transfer Workflow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mockProjects as any);
    vi.spyOn(partnersApi, 'getAssignableStaff').mockResolvedValue(mockStaff as any);
    vi.spyOn(partnersApi, 'assignProject').mockResolvedValue({
      ...mockProjects[0],
      assignedStaffId: 'staff-02',
      assignedStaffName: 'David Chen',
      staffAssignmentNote: 'Transferred ownership to David Chen',
    } as any);
    vi.spyOn(adminApi, 'transferResource').mockResolvedValue({
      success: true,
      auditId: 'audit-12345',
      transferTimestamp: new Date().toISOString(),
    } as any);
  });

  it('renders Page Header, project overview summary and excludes current owner from eligible new assignees', async () => {
    render(<TransferProjectOwnershipPage />, { wrapper: createWrapper() });

    // Page Header
    expect(await screen.findByRole('heading', { level: 1, name: /Transfer Project Ownership/i })).toBeInTheDocument();
    expect(screen.getByText(/Transfer project responsibility to another eligible internal employee/i)).toBeInTheDocument();

    // Project Context Summary
    expect(screen.getAllByText('Core Banking Modernization Suite').length).toBeGreaterThan(0);
    expect(screen.getByText('FinTech Global Corp')).toBeInTheDocument();
    expect(screen.getByText('COBOL -> Java')).toBeInTheDocument();
    expect(screen.getAllByText('Alex Mercer').length).toBeGreaterThan(0);

    // Eligible new assignee dropdown should NOT include current owner Alex Mercer
    const select = screen.getByRole('combobox', { name: /New Assignee/i });
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/David Chen/i)).toBeInTheDocument();
    expect(screen.getByText(/Elena Rostova/i)).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Alex Mercer/i })).not.toBeInTheDocument();
  });

  it('updates Transfer Impact Assessment table when new assignee and scope are selected', async () => {
    render(<TransferProjectOwnershipPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Core Banking Modernization Suite')).toBeInTheDocument();

    // Select David Chen
    const assigneeSelect = screen.getByRole('combobox', { name: /New Assignee/i });
    fireEvent.change(assigneeSelect, { target: { value: 'staff-02' } });

    // Assessment table should show David Chen as new owner
    expect(screen.getAllByText('David Chen').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Active Tasks/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Review & AST Sign-Off/i)).toBeInTheDocument();
    expect(screen.getByText(/Project & Repository Access/i)).toBeInTheDocument();

    // Switch Scope to OWNERSHIP_ONLY
    const scopeSelect = screen.getByRole('combobox', { name: /Transfer Scope/i });
    fireEvent.change(scopeSelect, { target: { value: 'OWNERSHIP_ONLY' } });

    // In OWNERSHIP_ONLY, active tasks remain assigned to current staff and action badge says "Keep Assigned to Current Staff"
    expect(screen.getByText(/Keep Assigned to Current Staff/i)).toBeInTheDocument();
  });

  it('validates review step and confirmation checkbox before permitting transfer execution', async () => {
    render(<TransferProjectOwnershipPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Core Banking Modernization Suite')).toBeInTheDocument();

    // Execute button should initially be disabled
    const executeBtn = screen.getByRole('button', { name: /Execute Transfer/i });
    expect(executeBtn).toBeDisabled();

    // Select New Assignee
    const assigneeSelect = screen.getByRole('combobox', { name: /New Assignee/i });
    fireEvent.change(assigneeSelect, { target: { value: 'staff-02' } });

    // Click Review Transfer
    const reviewBtn = screen.getByRole('button', { name: /Review Transfer/i });
    fireEvent.click(reviewBtn);

    // Confirmation checkbox should now be interactable
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(executeBtn).toBeDisabled();

    // Check confirmation
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(executeBtn).not.toBeDisabled();

    // Execute transfer
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(partnersApi.assignProject).toHaveBeenCalledWith(
        'proj-transfer-101',
        expect.objectContaining({
          staffId: 'staff-02',
          staffName: 'David Chen',
          reason: expect.stringContaining('Workload Balancing'),
        })
      );
    });

    // Should display success feedback
    expect(await screen.findByText(/has been successfully transferred to David Chen/i)).toBeInTheDocument();
  });
});
