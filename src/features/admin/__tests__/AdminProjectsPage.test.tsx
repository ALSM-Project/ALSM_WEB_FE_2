import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProjectsPage } from '../pages/AdminProjectsPage';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '../api/admin.api';

const mockProjects = [
  {
    id: '6650aa00aa00aa00aa00aa01',
    name: 'General Ledger COBOL Migration',
    organizationId: 'org-fnx-prod',
    partnerId: 'partner-01',
    partnerName: 'Fintech Nexus International',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.3',
    status: 'IN_PROGRESS',
    screensTotal: 0,
    screensCompleted: 0,
    programsTotal: 12,
    programsCompleted: 8,
    assignedTeamLeadId: undefined,
    assignedTeamLeadName: undefined,
    assignedStaffId: undefined,
    assignedStaffName: undefined,
    createdAt: '2026-10-10T00:00:00.000Z',
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-admin',
    fullName: 'System Administrator',
    email: 'admin@alsm.io',
    isPlatformAdmin: true,
    effectivePermissions: ['organizations.manage', 'projects.manage'],
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/projects']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AdminProjectsPage - Platform Project Allocation (UC-3.13.3)', () => {
  beforeEach(() => {
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mockProjects as any);
    vi.spyOn(partnersApi, 'assignProject').mockResolvedValue({
      ...mockProjects[0],
      assignedTeamLeadId: 'lead-01',
      assignedTeamLeadName: 'Sarah Jenkins',
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders unified project list with KPIs and allocation status filter', async () => {
    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Project Allocation & Team Lead Assignment')).toBeInTheDocument();
    expect(screen.getByText('Total Enterprise Projects')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Team Lead Allocation')).toBeInTheDocument();
    expect(screen.getByText('Partner-Assisted Engagements')).toBeInTheDocument();

    // Table headers and projects
    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();
    expect(screen.getByText('Project & Category')).toBeInTheDocument();
    expect(screen.getByText('Assigned Team Lead')).toBeInTheDocument();
    expect(screen.getByText('Allocated Staff')).toBeInTheDocument();
  });

  it('filters projects by Allocation status (All, Awaiting Lead, Assigned)', async () => {
    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();

    const awaitingButton = screen.getByRole('button', { name: /Awaiting Lead/i });
    expect(awaitingButton).toBeInTheDocument();
    fireEvent.click(awaitingButton);

    // Verify filter button active state
    expect(awaitingButton).toHaveClass('bg-amber-500');
  });

  it('opens assignment modal and successfully assigns Team Lead to project', async () => {
    const assignProjectSpy = vi.spyOn(partnersApi, 'assignProject');
    const adminAssignSpy = vi.spyOn(adminApi, 'assignTeamLead').mockResolvedValue({ success: true });

    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    // Wait for project row to render
    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();

    // Click assign/reassign button on project
    const assignButtons = screen.getAllByRole('button', { name: /Assign to Lead|Reassign Lead/i });
    expect(assignButtons.length).toBeGreaterThan(0);
    fireEvent.click(assignButtons[0]);

    // Modal opens
    expect(await screen.findByText(/Allocate Project to Team Lead|Reassign Project to Team Lead/i)).toBeInTheDocument();

    // Select lead and submit
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'lead-01' } });

    const submitBtn = screen.getByRole('button', { name: /Allocate to Team Lead|Confirm Reassignment/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Allocate Project to Team Lead|Reassign Project to Team Lead/i)).not.toBeInTheDocument();
      expect(assignProjectSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ teamLeadId: 'lead-01' })
      );
      expect(adminAssignSpy).toHaveBeenCalled();
    });
  });
});
