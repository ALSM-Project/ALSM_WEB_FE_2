import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerProjectOverviewPage } from '../pages/staff/PartnerProjectOverviewPage';
import { partnersApi } from '../api/partners.api';
import { apiClient } from '@/services/api/apiClient';
import { SERVER_PROJECT_ID, linkProjectToPartner, mockServer, serverProject } from './serverFixture';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const createWrapper = (
  permissions: string[] = [
    'partner.view',
    'partner_project.view',
    'partner_project.create',
    'partner_project.edit',
    'partner_project.manage_files',
    'partner_project.start_conversion',
    'conversion_result.review',
    'conversion_result.export',
    'conversion_result.notify_partner',
  ],
  initialRoute = `/partners/projects/${SERVER_PROJECT_ID}`
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'user-staff',
    email: 'staff@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: permissions,
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

/** The project already has a team lead (on the server) and a staff member (kept in this browser). */
function assignProjectFixture() {
  localStorage.setItem(
    'alsm_partner_project_links_v1',
    JSON.stringify({
      [SERVER_PROJECT_ID]: {
        partnerId: '6650cc00cc00cc00cc00cc01',
        partnerName: 'Fintech Nexus International',
        assignedTeamLeadName: 'Lena Lead',
        assignedStaffId: 'u-staff',
        assignedStaffName: 'Sam Staff',
      },
    }),
  );
  mockServer({ projects: [{ ...serverProject, assignedTeamLeadId: 'u-lead' }] });
}

describe('PartnerProjectOverviewPage', () => {
  beforeEach(() => {
    localStorage.clear();
    linkProjectToPartner();
    mockServer();
    vi.mocked(apiClient.post).mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders project header, 5-stage lifecycle stepper, and dual metric progress', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId"
          element={<PartnerProjectOverviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Header info
    expect(await screen.findByRole('heading', { name: 'Core Banking Customer Portal' })).toBeInTheDocument();
    expect(screen.getAllByText('Fintech Nexus International')[0]).toBeInTheDocument();
    expect(screen.getByText('BMS/DSPF -> React')).toBeInTheDocument();

    // Lifecycle stages in workflow stepper
    expect(screen.getByText('Scope Initialized')).toBeInTheDocument();
    expect(screen.getByText('Team Allocation')).toBeInTheDocument();
    expect(screen.getByText('Sources Uploaded')).toBeInTheDocument();
    expect(screen.getByText('AST Conversion')).toBeInTheDocument();
    expect(screen.getByText('Partner Export')).toBeInTheDocument();

    // Progress and Conversion Items summary
    expect(screen.getByText(/Conversion Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Conversion Items/i)).toBeInTheDocument();
  });

  it('displays assigned Team Lead and Conversion Staff with active workloads', async () => {
    assignProjectFixture();
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId"
          element={<PartnerProjectOverviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Core Banking Customer Portal' });

    // Team allocation card
    expect(screen.getByText('Staff Allocation & Ownership')).toBeInTheDocument();
    expect(screen.getByText('Assigned Team Lead')).toBeInTheDocument();
    expect(screen.getByText('Assigned Conversion Staff')).toBeInTheDocument();
    expect(screen.getAllByText('Lena Lead').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sam Staff').length).toBeGreaterThan(0);
    expect(screen.getByText('Reassign')).toBeInTheDocument();
  });

  it('shows the project as unassigned when nobody was assigned', async () => {
    render(
      <Routes>
        <Route path="/partners/projects/:projectId" element={<PartnerProjectOverviewPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Core Banking Customer Portal' });
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    expect(screen.getByText('Assign Staff')).toBeInTheDocument();
  });

  it('opens AssignStaffModal and allows assigning Team Lead and Conversion Staff', async () => {
    assignProjectFixture();
    const assignSpy = vi.spyOn(partnersApi, 'assignProject');

    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId"
          element={<PartnerProjectOverviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Core Banking Customer Portal' });

    const openModalBtn = screen.getByText('Reassign');
    fireEvent.click(openModalBtn);

    // Modal is opened
    expect(await screen.findByText('Team Project Assignment & Staff Allocation')).toBeInTheDocument();
    expect(screen.getByText(/Workload metrics indicate currently active projects/i)).toBeInTheDocument();

    // Confirm assignment
    const confirmBtn = screen.getByRole('button', { name: /Confirm Staff Assignment/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalled();
    });
  });

  it('provides direct workflow navigation buttons to upload sources and open workspace', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId"
          element={<PartnerProjectOverviewPage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Core Banking Customer Portal' });

    // Action buttons
    expect(screen.getByText('Upload Sources')).toBeInTheDocument();
    expect(screen.getByText('Open Workspace')).toBeInTheDocument();
  });
});
