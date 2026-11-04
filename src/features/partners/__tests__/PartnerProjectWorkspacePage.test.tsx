import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PartnerProjectWorkspacePage } from '../pages/staff/PartnerProjectWorkspacePage';
import { apiClient } from '@/services/api/apiClient';
import { SERVER_PROJECT_ID, linkProjectToPartner, mockServer } from './serverFixture';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const createWrapper = (
  permissions: string[] = [
    'partner_project.view',
    'partner_project.manage_files',
    'partner_project.start_conversion',
    'conversion_result.review',
    'conversion_result.export',
    'conversion_result.notify_partner',
  ]
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
      <MemoryRouter initialEntries={[`/partners/projects/${SERVER_PROJECT_ID}/workspace`]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('PartnerProjectWorkspacePage', () => {
  beforeEach(() => {
    localStorage.clear();
    linkProjectToPartner();
    mockServer();
    vi.mocked(apiClient.post).mockResolvedValue({
      packageName: 'core-banking-customer-portal-modernized-bundle-v1.zip',
      summary: { targetFramework: 'React 19', screensIncluded: 1, programsIncluded: 0, excludedItems: [] },
      metrics: { totalFiles: 10, totalLoc: 100, estimatedSizeKb: 4 },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders workspace with dual progress bar and conversion items', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/workspace"
          element={<PartnerProjectWorkspacePage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole('heading', { name: 'Core Banking Customer Portal' })).toBeInTheDocument();
    expect(screen.getAllByText(/CUSTINQ/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Run All Conversions')).toBeInTheDocument();
    expect(screen.getByText('Export Code Bundle')).toBeInTheDocument();
  });

  it('opens export dialog with bundle metrics and partner notification preview', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/workspace"
          element={<PartnerProjectWorkspacePage />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByRole('heading', { name: 'Core Banking Customer Portal' });
    const exportBtn = screen.getByText('Export Code Bundle');
    fireEvent.click(exportBtn);

    expect(await screen.findByText('Export Partner Modernization Bundle')).toBeInTheDocument();
    expect(screen.getByText(/Partner Email Notification Preview/i)).toBeInTheDocument();
    expect(screen.getByText('Generate & Notify Partner')).toBeInTheDocument();
  });

  it('hides export and run conversion buttons when user lacks permissions', async () => {
    render(
      <Routes>
        <Route
          path="/partners/projects/:projectId/workspace"
          element={<PartnerProjectWorkspacePage />}
        />
      </Routes>,
      { wrapper: createWrapper(['partner_project.view']) }
    );

    expect(await screen.findByRole('heading', { name: 'Core Banking Customer Portal' })).toBeInTheDocument();
    expect(screen.queryByText('Run All Conversions')).not.toBeInTheDocument();
    expect(screen.queryByText('Export Code Bundle')).not.toBeInTheDocument();
  });
});
