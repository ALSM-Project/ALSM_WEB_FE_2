import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PartnerProjectOverviewPage } from '../pages/staff/PartnerProjectOverviewPage';
import { partnersApi } from '../api/partners.api';

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
  initialRoute = '/partners/projects/proj-fnx-core'
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

describe('PartnerProjectOverviewPage', () => {
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
    expect(screen.getByText('Reassign')).toBeInTheDocument();
  });

  it('opens AssignStaffModal and allows assigning Team Lead and Conversion Staff', async () => {
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
