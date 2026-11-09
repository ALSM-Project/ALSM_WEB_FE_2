import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamLeadProjectsPage } from '../pages/TeamLeadProjectsPage';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '@/features/admin/api/admin.api';

const mockProjects = [
  {
    id: 'proj-managed-01',
    name: 'General Ledger COBOL Migration',
    organizationId: 'org-fnx-prod',
    partnerId: 'partner-01',
    partnerName: 'Fintech Nexus International',
    conversionType: 'COBOL_TO_JAVA',
    targetFramework: 'Spring Boot 3.3',
    status: 'IN_PROGRESS',
    serviceType: 'MANAGED',
    contractNumber: 'ALSM-CTR-2026-9A52',
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
  {
    id: 'proj-self-service-99',
    name: 'Excluded Self-Service Experiment',
    organizationId: 'org-random',
    conversionType: 'BMS_DSPF_TO_FRONTEND',
    targetFramework: 'React 19',
    status: 'DRAFT',
    serviceType: 'SELF_SERVICE',
    screensTotal: 2,
    screensCompleted: 0,
    createdAt: '2026-10-11T00:00:00.000Z',
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

describe('TeamLeadProjectsPage - Managed Modernization Allocation', () => {
  beforeEach(() => {
    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mockProjects as any);
    vi.spyOn(partnersApi, 'getAssignableStaff').mockResolvedValue(mockStaff as any);
    vi.spyOn(adminApi, 'getOrganizations').mockResolvedValue([
      { id: 'org-fnx-prod', name: 'Fintech Nexus International' },
    ] as any);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders Employee Allocation with KPI metrics and only real Managed Modernization projects', async () => {
    render(<TeamLeadProjectsPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole('heading', { level: 1, name: /Employee Allocation/i })).toBeInTheDocument();
    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();
    expect(screen.getByText('Supervised Projects')).toBeInTheDocument();
    expect(screen.getAllByText('Awaiting Staff Allocation').length).toBeGreaterThan(0);
    expect(screen.getByText('Conversion Staff Assigned')).toBeInTheDocument();

    // Verify self-service projects without contracts are filtered out
    expect(screen.queryByText('Excluded Self-Service Experiment')).not.toBeInTheDocument();

    // Verify Open Workspace button is REMOVED
    expect(screen.queryByRole('link', { name: /Open Workspace/i })).not.toBeInTheDocument();
  });

  it('provides direct page links to Allocate Staff, Project Details, and Transfer', async () => {
    render(<TeamLeadProjectsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();

    // Allocate Staff links directly to detailed page (/team-lead/projects/:id/allocate)
    const allocateLink = screen.getByRole('link', { name: /Allocate Staff/i });
    expect(allocateLink).toHaveAttribute('href', '/team-lead/projects/proj-managed-01/allocate');

    // Detail button links directly to /partners/projects/:id
    const detailLink = screen.getByRole('link', { name: /Detail/i });
    expect(detailLink).toHaveAttribute('href', '/partners/projects/proj-managed-01');

    // Transfer button links to /team-lead/projects/:id/transfer
    const transferLink = screen.getByRole('link', { name: /^Transfer$/i });
    expect(transferLink).toHaveAttribute('href', '/team-lead/projects/proj-managed-01/transfer');
  });
});
