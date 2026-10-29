import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamLeadProjectsPage } from '../pages/TeamLeadProjectsPage';
import { partnersApi } from '@/features/partners/api/partners.api';

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
    assignedTeamLeadId: 'lead-01',
    assignedTeamLeadName: 'Sarah Jenkins',
    assignedStaffId: undefined,
    assignedStaffName: undefined,
    createdAt: '2026-10-10T00:00:00.000Z',
  },
];

const mockStaff = [
  { id: 'staff-01', fullName: 'Alex Mercer', email: 'alex@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 2 },
  { id: 'staff-02', fullName: 'David Chen', email: 'david@alsm.io', role: 'CONVERSION_STAFF', activeWorkload: 1 },
];

const createWrapper = () => {
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

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/team-lead/projects']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TeamLeadProjectsPage - Team Projects & Staff Allocation', () => {
  beforeEach(() => {
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mockProjects as any);
    vi.spyOn(partnersApi, 'getAssignableStaff').mockResolvedValue(mockStaff as any);
    vi.spyOn(partnersApi, 'assignProject').mockResolvedValue({
      ...mockProjects[0],
      assignedStaffId: 'staff-02',
      assignedStaffName: 'David Chen',
    } as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders Team Lead dashboard with KPI metrics and project roster', async () => {
    render(<TeamLeadProjectsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Team Modernization Projects & Staff Allocation')).toBeInTheDocument();
    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();
    expect(screen.getByText('Supervised Projects')).toBeInTheDocument();
    expect(screen.getAllByText('Awaiting Staff Allocation').length).toBeGreaterThan(0);
    expect(screen.getByText('Conversion Staff Assigned')).toBeInTheDocument();

    // Verify workspace launch buttons exist
    const workspaceLinks = screen.getAllByRole('link', { name: /Open Workspace/i });
    expect(workspaceLinks.length).toBeGreaterThan(0);
    expect(workspaceLinks[0]).toHaveAttribute('href', expect.stringContaining('/workspace'));
  });

  it('opens staff allocation modal and assigns Conversion Staff to project', async () => {
    const assignSpy = vi.spyOn(partnersApi, 'assignProject');

    render(<TeamLeadProjectsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();

    // Click Allocate/Reallocate Staff
    const allocateBtns = screen.getAllByRole('button', { name: /Allocate Staff|Reallocate Staff/i });
    expect(allocateBtns.length).toBeGreaterThan(0);
    fireEvent.click(allocateBtns[0]);

    // Modal appears
    expect(await screen.findByText('Allocate Conversion Staff to Project')).toBeInTheDocument();

    // Select staff member and write the briefing
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'staff-02' } });
    fireEvent.change(screen.getByPlaceholderText(/Focus on DSPF header validation/i), {
      target: { value: 'Balance screens first' },
    });

    // The engineer's load is shown next to the choice, in its colour
    expect(screen.getByTestId('staff-workload-badge')).toHaveTextContent(/David Chen/);

    // Submit
    const confirmBtn = screen.getByRole('button', { name: /Confirm Staff Allocation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ staffId: 'staff-02', staffNote: 'Balance screens first' })
      );
      expect(screen.queryByText('Allocate Conversion Staff to Project')).not.toBeInTheDocument();
    });
  });
});
