import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProjectsPage } from '../pages/AdminProjectsPage';
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

    expect(await screen.findByText(/(Team Lead Assignment|Project Allocation & Team Lead Assignment)/)).toBeInTheDocument();
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

  it('navigates to dedicated assign lead page when clicking Assign to Lead', async () => {
    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    // Wait for project row to render
    expect(await screen.findByText('General Ledger COBOL Migration')).toBeInTheDocument();

    // Click assign/reassign button on project
    const assignButtons = screen.getAllByRole('button', { name: /Assign to Lead|Reassign Lead/i });
    expect(assignButtons.length).toBeGreaterThan(0);
    fireEvent.click(assignButtons[0]);

    // Navigates to dedicated assignment detail page
    expect(mockNavigate).toHaveBeenCalledWith('/admin/projects/6650aa00aa00aa00aa00aa01/assign-lead');
  });
  it('renders Project & Category column with two-tier enterprise structure (Name + Category Badge + Monospace ID)', async () => {
    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    const nameEl = await screen.findByText('General Ledger COBOL Migration');
    expect(nameEl).toBeInTheDocument();
    expect(nameEl).toHaveClass('font-semibold');
    expect(nameEl).toHaveAttribute('title', 'General Ledger COBOL Migration');

    // Tier 2: Category badge with Unicode arrow
    const badge = screen.getByText('COBOL → Java');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('whitespace-nowrap');

    // Tier 2: Project ID in monospace with copy action
    const idButton = screen.getByTitle(/Project ID: 6650aa00aa00aa00aa00aa01/);
    expect(idButton).toBeInTheDocument();
    expect(idButton).toHaveClass('font-mono');

    // Click to copy
    const writeTextSpy = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: writeTextSpy },
    });

    fireEvent.click(idButton);
    expect(writeTextSpy).toHaveBeenCalledWith('6650aa00aa00aa00aa00aa01');
  });
  it('strictly excludes SELF_SERVICE projects from Web 2 project table and metrics', async () => {
    const mixedProjects = [
      {
        id: 'proj-ent-1',
        name: 'Enterprise Bank Modernization',
        organizationId: 'org-enterprise-1',
        partnerName: 'Enterprise Client',
        conversionType: 'COBOL_TO_JAVA',
        status: 'IN_PROGRESS',
      },
      {
        id: 'proj-self-2',
        name: 'Self Service Hobby Project',
        organizationId: 'org-self-2',
        conversionType: 'BMS_DSPF_TO_FRONTEND',
        status: 'ACTIVE',
      },
    ];

    const mockOrgs = [
      { id: 'org-enterprise-1', name: 'Enterprise Corp', type: 'ENTERPRISE', status: 'ACTIVE' },
      { id: 'org-self-2', name: 'Self Service User Org', type: 'SELF_SERVICE', status: 'TRIAL' },
    ];

    vi.spyOn(partnersApi, 'getProjects').mockResolvedValue(mixedProjects as any);
    vi.spyOn(adminApi, 'getOrganizations').mockResolvedValue(mockOrgs as any);

    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    // Enterprise project should be rendered
    expect(await screen.findByText('Enterprise Bank Modernization')).toBeInTheDocument();

    // Self-service project MUST be strictly excluded
    expect(screen.queryByText('Self Service Hobby Project')).not.toBeInTheDocument();
  });

  it('allows opening the New Enterprise Project modal and viewing Project Dossier', async () => {
    render(<AdminProjectsPage />, { wrapper: createWrapper() });

    await screen.findByText('General Ledger COBOL Migration');

    // Open New Enterprise Project modal
    const newProjectBtn = screen.getByRole('button', { name: /New Enterprise Project/i });
    fireEvent.click(newProjectBtn);

    expect(await screen.findByText('Create New Enterprise Modernization Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/CoreBanking-BMS-Migration/i)).toBeInTheDocument();

    // Close create modal
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

    // Open Project Dossier Modal
    const viewDetailsBtn = screen.getByTitle('View Project Details Dossier');
    fireEvent.click(viewDetailsBtn);

    expect(await screen.findByText('Enterprise Project Dossier')).toBeInTheDocument();
    expect(screen.getByText('Conversion & Verification Progress')).toBeInTheDocument();
  });
});
