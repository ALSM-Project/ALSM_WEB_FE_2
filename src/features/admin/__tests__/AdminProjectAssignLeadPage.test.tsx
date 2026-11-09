import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProjectAssignLeadPage } from '../pages/AdminProjectAssignLeadPage';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '../api/admin.api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockProject = {
  id: 'proj-001',
  name: 'Core Banking BMS Modernization',
  organizationId: 'org-fnx',
  partnerId: 'org-fnx',
  partnerName: 'Fintech Nexus Ltd.',
  conversionType: 'BMS_TO_REACT',
  targetFramework: 'React 19 / TypeScript',
  status: 'IN_PROGRESS',
  screensTotal: 14,
  screensCompleted: 3,
  programsTotal: 0,
  programsCompleted: 0,
  assignedTeamLeadId: undefined,
  assignedTeamLeadName: undefined,
  assignedStaffId: undefined,
  assignedStaffName: undefined,
  scopeNotes: 'Migrate account enquiry and transaction posting screens.',
  createdAt: '2026-10-15T00:00:00.000Z',
};

const createWrapper = (initialEntry = '/admin/projects/proj-001/assign-lead') => {
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
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/projects/:projectId/assign-lead" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AdminProjectAssignLeadPage - Dedicated Allocation Details Page', () => {
  beforeEach(() => {
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue([mockProject] as any);
    vi.spyOn(partnersApi, 'assignProject').mockResolvedValue({
      ...mockProject,
      assignedTeamLeadId: 'lead-01',
      assignedTeamLeadName: 'Sarah Jenkins',
    } as any);
    vi.spyOn(adminApi, 'assignTeamLead').mockResolvedValue({ success: true });
    vi.spyOn(adminApi, 'getOrganizations').mockResolvedValue([
      { id: 'org-fnx', name: 'Fintech Nexus Ltd.', engagementType: 'MANAGED_MODERNIZATION' },
    ] as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders project dossier information and candidate roster', async () => {
    render(<AdminProjectAssignLeadPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Allocate Team Lead')).toBeInTheDocument();
    expect(screen.getAllByText('Core Banking BMS Modernization').length).toBeGreaterThan(0);
    expect(screen.getByText('BMS/DSPF → React 19')).toBeInTheDocument();
    expect(screen.getByText('Fintech Nexus Ltd.')).toBeInTheDocument();

    // Workload roster header
    expect(screen.getByText('Select Primary Team Lead')).toBeInTheDocument();
  });

  it('submits team lead allocation and redirects to admin projects page', async () => {
    render(<AdminProjectAssignLeadPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText('Core Banking BMS Modernization').length).toBeGreaterThan(0);
    });

    // Select candidate from dropdown
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'lead-01' } });

    // Fill briefing notes
    const briefingInput = screen.getByPlaceholderText(/Provide architectural briefing, delivery deadlines/i);
    fireEvent.change(briefingInput, { target: { value: 'High priority Q4 rollout.' } });

    // Submit form
    const submitBtn = screen.getAllByRole('button', { name: /Allocate to Team Lead/i })[0];
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.assignTeamLead).toHaveBeenCalledWith('proj-001', 'lead-01', 'High priority Q4 rollout.');
      expect(partnersApi.assignProject).toHaveBeenCalledWith('proj-001', expect.objectContaining({
        teamLeadId: 'lead-01',
      }));
    });
  });
});
