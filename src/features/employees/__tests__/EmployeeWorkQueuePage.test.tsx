import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmployeeWorkQueuePage } from '../pages/EmployeeWorkQueuePage';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  queryClient.setQueryData(['currentUser'], {
    id: 'staff-01',
    fullName: 'Marcus Vance',
    email: 'converter@alsm.io',
    isPlatformAdmin: false,
    effectivePermissions: ['conversions.view', 'partner_project.view'],
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/my-work']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EmployeeWorkQueuePage - System Employee Modernization Workbench Queue', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders employee work queue with KPI metrics and project cards', async () => {
    render(<EmployeeWorkQueuePage />, { wrapper: createWrapper() });

    expect(await screen.findByText('My Assigned Work Queue')).toBeInTheDocument();
    expect(await screen.findByText('Core Banking Customer Portal')).toBeInTheDocument();
    expect(screen.getByText('Assigned Projects')).toBeInTheDocument();
    expect(screen.getByText('Screens & Programs')).toBeInTheDocument();
    expect(screen.getByText('Passed AI & AST Rules')).toBeInTheDocument();

    // Verify Open Workspace links exist
    const workspaceLinks = screen.getAllByRole('link', { name: /Open Workspace/i });
    expect(workspaceLinks.length).toBeGreaterThan(0);
    expect(workspaceLinks[0]).toHaveAttribute('href', expect.stringContaining('/workspace'));
  });

  it('toggles between Project View and Individual Asset View', async () => {
    render(<EmployeeWorkQueuePage />, { wrapper: createWrapper() });

    expect(await screen.findByText('Core Banking Customer Portal')).toBeInTheDocument();

    // Toggle to individual assets
    const assetViewBtn = screen.getByRole('button', { name: /By Individual Asset/i });
    fireEvent.click(assetViewBtn);

    // Asset table headers appear
    expect(await screen.findByText('Asset & Source File')).toBeInTheDocument();
    expect(screen.getByText('Validation State')).toBeInTheDocument();

    // Toggle back to projects
    const projectViewBtn = screen.getByRole('button', { name: /By Project/i });
    fireEvent.click(projectViewBtn);

    expect(await screen.findByText('Conversion Progress')).toBeInTheDocument();
  });
});
